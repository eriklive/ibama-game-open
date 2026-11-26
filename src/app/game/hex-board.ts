import * as THREE from 'three';
import { COVER_HEIGHT, GameMap, Ground, HexRect, StructureKind, doorWall, doorsOf, inStructure, playArea, structureView } from './maps';
import { HEX_STEP, HexArea, HexCoord, hexDistance, hexKey, hexNeighbors, hexToWorld, reachableHexes, sameHex, worldToHex } from './hex';
import { APPROACH_FX, waveArrival, waveBump, waveDuration } from './approach-fx';
import { CharacterRig, ClipName, LegPose, METER, ModelDef, Pose, restLeg, restPose } from './character-model';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { CHASE_SLOWMO, slowmoFov, slowmoRate } from './chase-slowmo';
import { wallFloorShape } from './house-plan';
import { HANGAR_INTERIOR, HANGAR_ROOF, HOUSE_ROOF, buildCover, buildFuelProps, buildHangar, buildHouse, buildPlane } from './scenery';
import { PropInfo } from './prop-models';
import { RENDER_PROFILES, RenderProfile } from './render-settings';
import { Terrain } from './world';
import { WorldStream, forestFloor, rutPieces } from './world-stream';
import { StaticShadow, castsMovingShadow } from './static-shadow';
import { HexTile, TILT_HIDDEN, TileField } from './tile-field';
import { Door, commonDoors, isOpen, seeThroughDoors } from './door';
import { lineOfSight } from './enemies';
import { DoorPush, DoorViews } from './door-view';
import { SPOTLIGHT_LAYER, Spotlight } from './spotlight';
import { OUTLINE_LAYER, TargetOutline } from './target-outline';
import { AuraLayer, AuraStyle, AuraTextures, createAuraTextures, splitHot } from './aura-layer';
import { BASE_PITCH, INTRO, ScreenEllipse, easeInOutCubic, introZoom } from './mission-intro';

const HEX_SIZE = 1;
const HEX_HEIGHT = 0.35;
const HEX_GAP = 0.94; // raio visível em relação ao espaçamento → deixa uma fresta entre os hexágonos

/** Peças com modelo 3D: velocidade da corrida entre hexágonos (3,6 m/s ≈ 2,8 hex/s). */
const RUN_SPEED = 3.6 * METER;
/** Raio (em hexágonos) em que um garimpeiro não rendido faz o agente se abrigar na carga baixa. */
const COVER_THREAT_RANGE = 6;
/** Com um rendido a até tantos passos (contornando paredes), o agente não se abaixa na cobertura. */
const COVER_SURRENDERED_RANGE = 2;

/**
 * Câmera de perseguição (relativa ao agente, olhando para o inimigo): atrás e acima dele, mira à
 * frente. Em retrato ela recua e sobe para o inimigo caber na mesma tela. O FOV abre um pouco.
 */
const CHASE_CAMERA = {
  back: 4.4,
  height: 2.5,
  portraitBack: 6.2,
  portraitHeight: 3.6,
  aim: 7,
  aimHeight: 0.9,
  side: 0.8,
  fovBoost: 8,
  /** Quanto a névoa fecha (fração do raio de visão) com a câmera rasante. */
  viewCut: 0.5,
} as const;
/** Tempo (s) que um personagem leva para correr de um hexágono ao vizinho (marca os passos). */
/** Vista do tablet de abordagem (ver `frameRing`). */
/** Virada do Modo Corrida (ver `setFlip`): largura da faixa de hexágonos de pé (mundo). */
export const RUNNER_FLIP = { width: 2.6 } as const;

const RING_VIEW = {
  /** Quanto a câmera sobe em relação à de jogo (graus)... */
  extraPitch: 40,
  /** ...sem passar de quase de cima (90 deixa a câmera sem "para cima"). */
  maxPitch: 88,
  /** Folga entre o raio e a borda da tela do tablet (px). */
  margin: 22,
  /** Velocidade da transição (maior, mais rápida). */
  rate: 4.5,
};

export const SECONDS_PER_HEX = (HEX_STEP * HEX_SIZE) / RUN_SPEED;
/** Meia altura do disco da base: o disco apoia no hexágono e o modelo fica de pé sobre ele. */
const BASE_TOP = 0.07;

/** Paleta "mata" (B1 · Ficha de campo). */
const COLORS = {
  background: 0x2f4526,
  outline: 0x1c2a17,
  hexA: 0x3b5530,
  hexB: 0x425d35,
  hexC: 0x4a663b,
  selected: 0xffd43b,
  path: 0xfff4c2,
  activeRing: 0xffd23f,
  focusRing: 0xffffff,
  cursor: 0xa9e4ff,
  wall: 0x56626a,
  wallTop: 0x7d8a90,
  enemy: 0xc8323c,
  enemyAlert: 0xff8a1f,
  enemySurrendered: 0xe9eef0,
  approachSurrender: 0x8fe08a,
  approachRoll: 0xf5e663,
  approachFlee: 0xffb067,
  aura: 0x9dff8f,
  /** Chão "low poly" além do raio carregado: só uma cor de mata fechada sob a névoa. */
  farGround: 0x1f3a1c,
};

/**
 * Auras do tabuleiro (ver `aura-layer.ts`): luz pousada sobre o chão, que mantém a sua cor.
 * Só o que é interativo (queimar, interrogar) ganha cortina; com o agente dentro, ela cresce.
 */
const AURAS = {
  /** Até onde o agente da vez anda: azul-céu (o mesmo do cursor) com contorno claro. */
  reach: { color: 0xa9e4ff, edge: 0xe6f8ff, fill: 0.3, rim: 1, wall: 0.3, wallOpacity: 0.4, breathe: { speed: 3, amount: 0.12 } },
  /**
   * Alcance dentro de uma aura de ação (a brasa do avião, o âmbar de um rendido): um hexágono azul
   * menor por cima, com contorno próprio e cortina baixa. A aura de baixo continua aparecendo em
   * volta: o hexágono fica "dividido" — dá para andar até ele e, ali, interagir.
   */
  reachOver: {
    color: 0xa9e4ff, edge: 0xffffff, fill: 0.75, rim: 1, wall: 0.35, wallOpacity: 0.75, inset: 0.58,
    breathe: { speed: 3, amount: 0.2 },
  },
  /** Hexágonos vistos pelos inimigos: véu vermelho, sem cortina e sem respirar (é aviso, não convite). */
  vision: { color: 0xe0503c, edge: 0xff8a70, fill: 0.5, rim: 0.9 },
  /** Em volta do que se pode queimar (o avião, os suprimentos): brasa. */
  burn: { color: 0xff5a26, edge: 0xffc08a, fill: 0.8, rim: 1, wall: 1, wallOpacity: 0.8, breathe: { speed: 3.2, amount: 0.15 } },
  burnHot: { color: 0xff6a33, edge: 0xffd2a8, fill: 1, rim: 1, wall: 1.3, wallOpacity: 0.95, breathe: { speed: 4.5, amount: 0.12 } },
  /**
   * Em volta do suspeito rendido com diálogo: âmbar, parado (sem cortina nem respiração; quem chama
   * para o toque é o contorno amarelo no próprio modelo, ver `setNpcTargets`).
   */
  talk: { color: 0xffa83a, edge: 0xffe8b8, fill: 0.8, rim: 1 },
  talkHot: { color: 0xffb347, edge: 0xfff0d0, fill: 1, rim: 1 },
  /** Rendido sem diálogo: âmbar apagado, parado. */
  talkMuted: { color: 0xa79a80, edge: 0xc9bea6, fill: 0.35, rim: 0.5 },
} satisfies Record<string, AuraStyle>;

/** Milissegundos por quadro que a montagem de blocos em segundo plano pode gastar. */
const STREAM_BUDGET_MS = 4;
/** Salto do quadro da sombra do sol, em unidades do mundo. */
const SHADOW_STEP = 8;
/** Opacidade das paredes que tapam um personagem na vista normal. */
const WALL_FADE_ALPHA = 0.25;
/** Altura acima da qual a linha câmera–personagem já passou das copas (topo da mata, ~9,4 m). */
const TREE_FADE_TOP = 12.5;
/** Distância (centro do hexágono vizinho até a linha) em que a copa ainda tapa a visão. */
const TREE_FADE_REACH = 1.7;

/** Índice estável (0..2) para sortear um dos três tons de um chão (vale para coordenadas negativas). */
const tone = (h: HexCoord): number => (((h.col * 31 + h.row * 17) % 3) + 3) % 3;

const dimmed = new THREE.Color();
/** Escurece um tom (chão de cenário, fora da missão). */
const dim = (hex: number): number => dimmed.set(hex).multiplyScalar(0.82).getHex();

const WALL_HEIGHT = 0.9;

/** Tons do chão por tipo de terreno (três variações, sorteadas pela posição). */
const GROUND: Record<Ground, [number, number, number]> = {
  grass: [0x4f9a4a, 0x478f44, 0x57a552],
  runway: [0x4a5258, 0x444c52, 0x50585e],
  apron: [0x8d9498, 0x858c90, 0x959ca0],
  floor: [0xc9b48f, 0xc1ac87, 0xd1bc97],
  dirt: [0xa47b4b, 0x9a7244, 0xad8554],
};

export interface BoardUnit {
  id: string;
  color: number;
  start: HexCoord;
  /** Modelo 3D; enquanto carrega (ou se falhar) a peça simples continua no lugar. */
  model?: ModelDef;
}

export interface BoardEnemy {
  id: string;
  start: HexCoord;
  /** Ângulo para onde olha, no plano XZ (atan2(dz, dx)). */
  facing: number;
  /** Modelo 3D; enquanto carrega (ou se falhar) a peça simples continua no lugar. */
  model?: ModelDef;
  /** Começa fora do tabuleiro (escondido): aparece com `revealEnemy`. */
  hidden?: boolean;
}

/** Peça que anda pelo tabuleiro (agente ou inimigo). */
interface Mover {
  hex: HexCoord;
  group: THREE.Group;
  shadow: THREE.Mesh;
  hop: number;
  /** Muda quando a peça é recolocada à força: interrompe a animação em curso. */
  epoch: number;
  rig?: CharacterRig;
}

interface UnitView extends Mover {
  id: string;
  hitbox: THREE.Mesh;
  /** 0 = parado, 1 = flutuando (personagem da vez); interpolado para suavizar a troca. */
  lift: number;
  /** Peças da miniatura que somem quando o modelo 3D chega (miolo e alça de frente). */
  pieceOnly: THREE.Object3D[];
  /** Direção para onde o modelo olha (rad em torno de Y; 0 = +Z, de frente para a câmera). */
  yaw: number;
  /** Altura do chão sob o modelo, suavizada (o pulo soma `hop` por cima). */
  ground?: number;
}

interface EnemyView extends Mover {
  id: string;
  /** Para onde a peça aponta agora e para onde está girando. */
  facing: number;
  facingGoal: number;
  alert: boolean;
  surrendered: boolean;
  bodyMaterial: THREE.MeshStandardMaterial;
  alertSprite: THREE.Sprite;
  flagSprite: THREE.Sprite;
  /** 1 = no tabuleiro, 0 = sumiu (fugiu); anima a saída. */
  presence: number;
  gone: boolean;
  /** Altura de repouso do grupo (muda quando o modelo 3D substitui a peça). */
  baseY: number;
  /** Altura do "!" sobre a cabeça. */
  signY: number;
  /** Correndo entre hexágonos: o clipe de corrida tem prioridade sobre o do estado. */
  running?: boolean;
  /** Instante (relógio do tabuleiro) do susto com a abordagem: um pulinho no lugar. */
  startleAt?: number;
  /**
   * Pose de rendido, escolhida quando ele se rende: alterna pela ordem de rendição (o primeiro
   * fica de pé, o segundo ajoelhado...), para a cena nunca repetir a mesma pose lado a lado.
   */
  cuffPose?: 'cuffed' | 'kneel';
  /** Olhando de um lado para o outro (susto do arrombamento): gira em volta de `base`. */
  scan?: { base: number; phase: number };
  /** Posição de largada (vai correr): o corpo se inclina e encolhe; `stanceMix` anima a entrada e a saída. */
  stance?: boolean;
  stanceMix?: number;
}

/**
 * Chute de arrombamento (chute frontal, de empurrar), feito à mão por cima do `idle`. O clipe
 * `kick` (a joelhada `Melee_Knee` da UAL) não entra: ele começa levando a perna para trás e, somado
 * às poses, a perna recuava antes de subir. A perna do chute vai no espaço do corpo
 * (`CharacterRig.leg`: `hip`, `knee`, `ankle`); o resto (perna de apoio, tronco, braços) na camada
 * local (`POSE_BONES`), onde `thigh`, `calf` e `foot` ficam em 0.
 *
 * Do repouso o pé sai do chão direto para a frente e para cima: o joelho sobe (`lift`) até o peito,
 * dobrado, com a ponta do pé puxada para cima (`chamber`); no slow ele segura lá em cima, um pouco
 * mais alto e com o corpo atrás (`coil`); aí a perna estica reto para a frente, na altura da
 * fechadura, e a sola bate chapada na porta (`strike`). Quando a porta cede, a perna vai junto
 * (`through`); quando aguenta, ela recolhe (`recoil`); depois o pé desce e volta à base.
 *
 * Até o impacto o pé nunca recua: da base (`KICK_LEG_IDLE`) ao recolher, `hip` e o ângulo da canela
 * (`hip - knee`) só crescem de uma pose para a próxima (a mistura é em linha reta), e no golpe a
 * canela gira toda para a frente enquanto a coxa desce até a horizontal (conferido renderizando o
 * modelo de lado, quadro a quadro).
 */
type KickFrame = Pose & Omit<LegPose, 'weight'>;
type KickStage = 'lift' | 'chamber' | 'coil' | 'strike' | 'through' | 'recoil';
const kickFrame = (leg: Omit<LegPose, 'weight'>, body: Partial<Pose>): KickFrame => ({ ...restPose(), ...body, ...leg });
const KICK_POSES: Record<KickStage, KickFrame> = {
  lift: kickFrame({ hip: 0.9, knee: 1.15, ankle: 0.35 }, { thighL: -0.08, calfL: 0.16, spine: -0.04, armR: 0.3, foreR: 0.9, armL: 0.35, foreL: 1.0 }),
  chamber: kickFrame({ hip: 2.0, knee: 1.6, ankle: 0.6 }, { thighL: -0.16, calfL: 0.32, spine: -0.12, armR: 0.55, foreR: 1.35, armL: 0.65, foreL: 1.45 }),
  coil: kickFrame({ hip: 2.15, knee: 1.75, ankle: 0.7 }, { thighL: -0.2, calfL: 0.4, spine: -0.26, armR: 0.25, foreR: 1.25, armL: 0.8, foreL: 1.45 }),
  strike: kickFrame({ hip: 1.7, knee: 0.05, ankle: 0.15 }, { thighL: -0.08, calfL: 0.16, spine: -0.32, armR: -0.55, foreR: 0.7, armL: 0.8, foreL: 1.1 }),
  through: kickFrame({ hip: 1.55, knee: 0.1, ankle: 0.1 }, { thighL: -0.04, calfL: 0.08, spine: -0.18, armR: -0.4, foreR: 0.8, armL: 0.6, foreL: 1.2 }),
  recoil: kickFrame({ hip: 1.65, knee: 1.4, ankle: 0.4 }, { thighL: -0.12, calfL: 0.24, spine: -0.15, armR: 0.1, foreR: 1.1, armL: 0.7, foreL: 1.3 }),
};
/**
 * A perna do chute parada como no `idle` (a de trás, um pouco atrás e com o joelho solto): é de
 * onde a subida começa e onde a descida termina, para a troca entre o clipe e a pose não esticar
 * a perna nem afundar o pé no chão.
 */
const KICK_LEG_IDLE: Omit<LegPose, 'weight'> = { hip: -0.05, knee: 0.25, ankle: 0.3 };
/** Distância da porta para chutar: a perna esticada, com o tranco do corpo, chega na folha. */
const KICK_REACH = 1.15;

/** Posição de largada de quem resistiu ao arrombamento: inclinado, joelhos dobrados, braços prontos. */
const BOLT_STANCE: Pose = { thigh: -0.45, calf: 0.55, foot: 0.15, thighL: 0.22, calfL: 0.3, spine: 0.45, armR: -0.7, foreR: 1.3, armL: 0.8, foreL: 1.4 };

/** Mistura duas poses (`t` de 0 a 1) e escreve em `out`. */
function mixPose(out: Pose, a: Pose, b: Pose, t: number): void {
  for (const k in out) {
    const key = k as keyof Pose;
    out[key] = a[key] + (b[key] - a[key]) * t;
  }
}

/** Giro máximo da câmera para mostrar uma porta ao lado do agente da vez (ver `doorYawGoal`). */
const DOOR_CAMERA_YAW = THREE.MathUtils.degToRad(45);

/** Giro da câmera com o agente da vez dentro da casa ou junto de uma porta dela: 25° para a esquerda. */
const HOUSE_CAMERA_YAW = THREE.MathUtils.degToRad(-25);

/** Gira um vetor do plano XZ em volta de +Y. */
const yawTurn = (v: THREE.Vector3, a: number): THREE.Vector3 =>
  new THREE.Vector3(v.x * Math.cos(a) + v.z * Math.sin(a), 0, -v.x * Math.sin(a) + v.z * Math.cos(a));

/** Prefixo do id de alvo dos NPCs rendidos tocáveis (`npc:<id do inimigo>`, ver `setNpcTargets`). */
export const NPC_TARGET = 'npc:';

/** Diferença angular em (-π, π]. */
const angleDelta = (from: number, to: number): number =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));

/** Uma chama ou um rolo de fumaça: sobe do ponto de base e some, em ciclo. */
interface FireParticle {
  sprite: THREE.Sprite;
  smoke: boolean;
  base: THREE.Vector3;
  /** Fase inicial (0..1), para as partículas não andarem juntas. */
  offset: number;
  /** Ciclos por segundo. */
  speed: number;
  size: number;
  /** Quanto sobe num ciclo. */
  rise: number;
}

interface Fire {
  /** O que vai na cena (embrulho do interior da estrutura, quando o alvo está dentro dela). */
  holder: THREE.Object3D;
  group: THREE.Group;
  particles: FireParticle[];
  /** Clarão no chão que tremula (no lugar de uma luz de verdade). */
  glow: THREE.Mesh;
  /** Malhas que escureceram e o material original de cada uma. */
  charred: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[] }[];
  born: number;
}

/**
 * Vista de inspeção: o mesmo enquadramento da cena da porta (arrombar / abrir fechadura).
 * A câmera gira 45° a partir da de sempre, para o lado do agente, desce para 30° e chega
 * perto, mirando entre o objeto e o agente.
 */
const INSPECT_CAM = {
  /** Inclinação (a câmera de sempre fica a 55°). */
  pitch: THREE.MathUtils.degToRad(30),
  /** Distância até o ponto mirado (multiplicada em retrato, como a câmera de sempre). */
  dist: 7.2,
  /** Teto do multiplicador de retrato. */
  portraitMax: 2.1,
  /** Giro a partir da câmera de sempre. */
  turn: Math.PI / 4,
  /** Ponto mirado: do objeto até o agente (0 = objeto, 1 = agente), e altura. */
  towardAgent: 0.45,
  aimHeight: 1.15,
  /** Rapidez da ida e da volta (taxa exponencial por segundo). */
  blendRate: 5,
  /**
   * Enquadramento de duas pessoas em pé (interrogatório): a câmera fica de lado para a dupla
   * (`side` = quanto puxa para a câmera de sempre) e afasta até caber `width` × `height`
   * (unidades do mundo) na faixa de cima da tela, acima da papelada.
   */
  pair: { width: 4.4, height: 3.3, aimHeight: 1.25, side: 0.45, top: 0.09, minDist: 6 },
} as const;

/**
 * Zoom num móvel (ver `HexBoard.propCloseUp`): a câmera fica de frente para ele, quase na
 * altura dos olhos, e chega até a caixa de foco do móvel caber (com folga) no que a papelada
 * não cobre, um pouco acima do meio.
 */
const PROP_CAM = {
  /** Inclinação (de frente, quase na horizontal). */
  pitch: THREE.MathUtils.degToRad(12),
  /** Giro para longe do lado em que o agente está (ele não tapa a vista). */
  turn: THREE.MathUtils.degToRad(8),
  /** Folga em volta da caixa de foco. */
  margin: 1.1,
  /** Faixa livre de cima (fração da altura da tela) e distância mínima. */
  top: 0.06,
  minDist: 1.2,
  /**
   * Quem está na frente do móvel some no zoom: mais de `clearance` à frente dele e até `aside`
   * além da largura dele, de lado (unidades do mundo).
   */
  clearance: 0.4,
  aside: 1.6,
} as const;

/**
 * Close-up no próprio tabuleiro (ver `HexBoard.closeUp`): `object` mira entre um objeto e o
 * agente (inspeção do móvel); `pair` enquadra o agente e outra pessoa em pé, de lado
 * (interrogatório). `insets` diz quanto da tela a papelada cobre (frações da altura, embaixo,
 * e da largura, à direita): a dupla fica no meio do que sobra. `faceEnemy` vira esse inimigo
 * para o agente.
 */
export interface CloseUpOptions {
  frame?: 'object' | 'pair';
  insets?: CloseUpInsets;
  faceEnemy?: string;
  /** Oculta o que ficar entre a câmera e quem está em close-up (o avião, por exemplo). Padrão: sim. */
  hideOccluders?: boolean;
}

export interface CloseUpInsets {
  bottom: number;
  right: number;
}

interface CloseUpView {
  target: THREE.Vector3;
  dir: THREE.Vector3;
  /** `prop`: zoom num móvel (ver `propCloseUp`), com `fit` (largura e altura a enquadrar). */
  frame: 'object' | 'pair' | 'prop';
  fit?: { w: number; h: number };
  insets: CloseUpInsets;
  /** Pontos (mundo) que a câmera precisa enxergar: o agente e o objeto / a pessoa. */
  subjects: THREE.Vector3[];
  /** Estruturas em que a dupla está (o telhado já some; as paredes não esmaecem). */
  rooms: Set<THREE.Object3D>;
  hideOccluders: boolean;
}

/** Cenário esmaecendo no close-up: materiais originais e as cópias translúcidas. */
interface OccluderFade {
  alpha: number;
  hide: boolean;
  meshes: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; clones: THREE.Material[]; base: Map<THREE.Material, number> }[];
}

function reducedMotionQuery(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Alvo tocado uma vez (ver `HexBoard.setTargetAim`): quem vai andar, para onde e por onde, e o
 * balão que fica sobre o alvo.
 */
export interface TargetAim {
  id: string;
  unitId: string;
  /** Hexágono colado no alvo onde o agente vai parar. */
  dest: HexCoord;
  /** Caminho até `dest`, sem a origem. */
  path: readonly HexCoord[];
  label: string;
  /**
   * Longe demais (o movimento não alcança): caminho e fantasma em cinza, balão cinza com
   * cadeado, sem o contorno amarelo nem o saltinho de quem vai sair.
   */
  locked?: boolean;
  /**
   * O que a interface põe por cima do tabuleiro (cartões, placar, botões), em coordenadas da
   * janela: o balão desce pelo alvo até sair de baixo disso (ver `placeAimLabel`).
   */
  avoid?: () => readonly DOMRect[];
}

/** Efeitos do alvo tocado uma vez: fantasma no destino, pontos no caminho e balão. */
interface AimFx {
  key: string;
  unitId: string;
  ghost: THREE.Object3D;
  ghostMat: THREE.Material;
  curve: THREE.Curve<THREE.Vector3> | null;
  length: number;
  dots: THREE.Sprite[];
  label: THREE.Sprite;
  /** Onde o balão prefere ficar (em cima do alvo) e o ponto mais baixo na tela (a frente do alvo, no chão). */
  labelTop: THREE.Vector3;
  labelLow: THREE.Vector3;
  avoid?: () => readonly DOMRect[];
  /** Longe demais: tudo em cinza e o agente não saltita. */
  locked: boolean;
  /** `prefers-reduced-motion`: nada corre nem saltita. */
  calm: boolean;
}

export interface HexBoardCallbacks {
  /** Toque num hexágono vazio (ou fora do tabuleiro, com `null`). */
  onHexTap(hex: HexCoord | null): void;
  /** Toque numa peça de personagem (ou no hexágono em que ela está). */
  onUnitTap(id: string): void;
  /** Toque direto num alvo com contorno (o avião, os suprimentos): ver `setTargetOutlines`. */
  onTargetTap?(id: string): void;
  /**
   * Toque no zoom de um móvel (ver `propCloseUp`): `item` na peça destacável (a chave do avião,
   * a arma), `other` no resto do móvel.
   */
  onPropTap?(part: 'item' | 'other'): void;
}

/**
 * Cena 3D do tabuleiro: hexágonos em prisma, câmera em perspectiva inclinada
 * (vista "de cima e de trás"), peças dos personagens e entrada por toque/mouse
 * (tocar seleciona, arrastar move a câmera, pinça ou roda do mouse aproxima).
 *
 * O tabuleiro só desenha e anima: as regras (turnos, dados, alcance) ficam na tela.
 */
export class HexBoard {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  private readonly raycaster = new THREE.Raycaster();
  /** Chão da missão (instanciado); `tiles` é o índice por `hexKey`. */
  private field!: TileField;
  private get tiles(): ReadonlyMap<string, HexTile> {
    return this.field.tiles;
  }
  private readonly units = new Map<string, UnitView>();
  /** Hexágonos colados em carga baixa: quem para ali fica agachado. */
  private readonly crouchSpots = new Set<string>();
  /** Paredes fixas do mapa (cortam a linha de visão da ameaça para a cobertura). */
  private sightWalls = new Set<string>();
  /** Agentes agachados numa porta (pick lock): a reavaliação da cobertura não os levanta. */
  private readonly doorCrouch = new Set<string>();
  /** Agentes já avistados por algum inimigo (ver `setSeenAgents`): não se abaixam na cobertura. */
  private seenAgents = new Set<string>();
  private readonly enemies = new Map<string, EnemyView>();
  private readonly activeMarker: THREE.Mesh;
  private readonly focusMarker: THREE.Mesh;
  /** Cursor do controle: contorno hexagonal sobre o hexágono apontado. */
  private readonly cursorMarker: THREE.Mesh;
  private cursor: HexCoord | null = null;
  private readonly clock = new THREE.Clock();
  private readonly resizeObserver: ResizeObserver;
  private frameId = 0;
  /** Região jogável (círculo da missão ou retângulo do mapa de teste). */
  private readonly area: HexArea;
  /** Mundo por raio: blocos de chão e mata montados em volta do centro de carregamento. */
  private readonly stream: WorldStream;
  private profile: RenderProfile = RENDER_PROFILES.normal;
  /** Na perseguição, a névoa fica onde está (`CHASE_CAMERA.viewCut` não vale): o mapa de corrida. */
  private readonly wideChase: boolean;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 2.2);
  /** Chão "low poly" que acompanha o centro de carregamento (o que fica além do raio). */
  private farGround?: THREE.Mesh;
  /** Cenário esmaecido por estar entre a câmera e o close-up (ver `hideOccluders`). */
  private readonly occluders = new Map<THREE.Object3D, OccluderFade>();
  /** Paredes das estruturas (sem telhado nem interior), candidatas a esmaecer na vista normal. */
  private readonly wallMeshes: THREE.Object3D[] = [];
  /** Peças dos telhados, que esmaecem como as paredes enquanto o telhado está no lugar. */
  private readonly roofMeshes: { mesh: THREE.Object3D; roof: THREE.Object3D }[] = [];
  /**
   * Cópias do telhado e das paredes das estruturas na camada do contorno (ver `TargetOutline`):
   * com o telhado no lugar, o alvo que ele (ou a parede) cobre fica sem contorno.
   */
  private readonly shellOccluders: { copy: THREE.Mesh; mesh: THREE.Object3D; roof: THREE.Object3D }[] = [];
  private treeFadeClock = 0;
  private occlusionClock = 0;
  /** Peças grandes de cenário (hangar, avião): somem fora do raio carregado. */
  private readonly scenery: { object: THREE.Object3D; center: THREE.Vector3; radius: number }[] = [];
  /**
   * Estruturas (hangar, casa): o telhado some quando um agente entra e o que fica dentro
   * (carga, avião, lâmpadas, móveis) só aparece com um agente por perto.
   */
  private readonly structures: { kind: StructureKind; rect: HexRect; doors: HexCoord[]; object: THREE.Object3D; roof?: THREE.Object3D; interior: THREE.Object3D[] }[] = [];
  /** Folhas das portas comuns (ver `DoorViews`). */
  private doorViews?: DoorViews;
  /**
   * Câmera de cena da porta: gira 45° e aproxima, enquadrando a porta e o agente, com a
   * vista deslocada para a esquerda das fichas de ação. `cineBlend` vai de 0 (câmera de
   * sempre) a 1 (cena) e volta.
   */
  private cine: { target: THREE.Vector3; dir: THREE.Vector3; offsetPx: number; zoom: number } | null = null;
  private cineLast: { target: THREE.Vector3; dir: THREE.Vector3; offsetPx: number; zoom: number } | null = null;
  private cineBlend = 0;
  /**
   * Câmera de perseguição: desce e encosta nas costas do agente, olhando para o inimigo que ele
   * persegue. `chaseBlend` vai de 0 (câmera de sempre) a 1 (atrás do agente) e volta.
   */
  private chase: { unitId: string; enemyId?: string; look?: THREE.Vector3 } | null = null;
  private chaseLast: { unitId: string; enemyId?: string; look?: THREE.Vector3 } | null = null;
  private chaseBlend = 0;
  /**
   * Slow da escolha de alvo (ver `setChaseSlowmo`): 0 normal, 1 no fundo. Anda em rampa linear, com os
   * tempos da fita da música, e dá a velocidade da animação de quem corre e o zoom.
   */
  private slowmo = 0;
  private slowmoGoal = 0;
  /**
   * Slow da cena inteira (o chute na porta, a rolagem de quem reage ao arrombamento): todo mundo
   * desacelera junto, com as rampas da perseguição. Ver `setSceneSlowmo`.
   */
  private sceneSlow = 0;
  private sceneSlowGoal = 0;
  /**
   * Ajuste fino da cena da porta (ver `zoomOnDoor` e `tiltCineTo`): para onde puxar o olhar, quanto,
   * o zoom por cima do da cena e a inclinação (giro em volta do alvo e rolagem). `cineAim` persegue
   * `cineAimGoal` devagar.
   */
  private cineAimGoal: { point: THREE.Vector3 | null; mix: number; zoom: number; yaw: number; roll: number } = {
    point: null,
    mix: 0,
    zoom: 1,
    yaw: 0,
    roll: 0,
  };
  private readonly cineAim = { point: new THREE.Vector3(), mix: 0, zoom: 1, yaw: 0, roll: 0 };
  /** Rolagem da câmera neste quadro (a cena da porta inclina para quem reage). */
  private cineRollNow = 0;
  /** Números de dano que sobem da porta ("−2"). */
  private readonly floaters: { sprite: THREE.Sprite; born: number; from: THREE.Vector3 }[] = [];
  private readonly chaseDir = new THREE.Vector3(0, 0, 1);

  /** Afastamento atual da cena (1 = padrão); acompanha `cine.zoom` devagar (ver `setCineZoom`). */
  private cineZoom = 1;
  /** Estado das portas comuns: fechadas, mantêm o telhado e escondem o interior. */
  private doorStates: ReadonlyMap<string, Door> = new Map();
  /** Falas em balão sobre a cabeça dos inimigos (some sozinha em `until`, no relógio do tabuleiro). */
  private readonly speeches = new Map<string, { sprite: THREE.Sprite; until: number }>();
  /** Modelo do avião e da carga por hexágono: o que escurece quando pega fogo. */
  private planeModel?: THREE.Object3D;
  private readonly cargoModels = new Map<string, THREE.Object3D>();
  /** Móveis com zoom (o quadro de chaves, o armário), por hexágono: ver `propCloseUp`. */
  private readonly props = new Map<string, PropInfo>();
  /** O móvel em zoom agora (os toques vão para `onPropTap`). */
  private propOpen: PropInfo | null = null;
  /** Peças destacadas (a percepção passou): brilham e pulsam. */
  private readonly glowing = new Set<PropInfo>();
  /** Peça sendo pega: sobe e some (ver `takePropItem`). */
  private taking: { info: PropInfo; t0: number; y: number } | null = null;
  /** Personagens escondidos por taparem a vista do zoom no móvel. */
  private readonly propHidden = new Set<string>();
  /** Alvos da missão (queimar): um ícone de chama flutua sobre cada um até ele queimar. */
  private readonly targets = new Map<string, { sprite: THREE.Sprite; center: THREE.Vector3; height: number }>();
  /**
   * Alvos tocáveis (o avião, os suprimentos): os modelos (para o toque) e os contornos que
   * pulsam em volta deles, mostrando que dá para tocar.
   */
  private readonly outlined = new Map<
    string,
    { models: THREE.Object3D[]; hulls: THREE.Mesh[]; /** Criado só para o alvo (sai junto com ele). */ owned?: THREE.Object3D[] }
  >();
  /**
   * NPCs rendidos tocáveis (ver `setNpcTargets`), pelo id do inimigo: `talk` = tem interação
   * (contorno amarelo); sem, só o toque. `rig` lembra se o contorno já pegou o modelo 3D.
   */
  private readonly npcTargets = new Map<string, { talk: boolean; rig: boolean }>();
  /** Balões passageiros sobre um alvo ("Nenhuma interação"), ver `flashTargetLabel`. */
  private readonly flashes = new Map<string, { fx: Pick<AimFx, 'label' | 'labelTop' | 'labelLow' | 'avoid'>; until: number; span: number }>();
  /** Contorno de desenho animado dos alvos tocáveis (ver `TargetOutline`). */
  private readonly targetOutline: TargetOutline;
  /** Alvo tocado uma vez, esperando o segundo toque (ou `null`). */
  private armedTarget: string | null = null;
  /** Efeitos do alvo tocado uma vez (ver `setTargetAim`). */
  private aimFx: AimFx | null = null;
  private aimDotTex?: THREE.Texture;
  private aimDotLockedTex?: THREE.Texture;
  /** Contornos acesos (a tela apaga nos close-ups e quando não é a vez de escolher). */
  private outlinesOn = false;
  /** Incêndios acesos: chamas, fumaça e luz que tremula, e os materiais trocados pelos queimados. */
  private readonly fires = new Map<string, Fire>();
  private flameTex?: THREE.Texture;
  private smokeTex?: THREE.Texture;
  private glowTex?: THREE.Texture;
  /** Posições dos agentes na última conferência da estrutura (refaz só quando alguém anda). */
  private structureKey = '';
  /** Estado do que faz sombra no último redesenho do mapa de sombras. */
  private shadowKey = '';
  private readonly staticShadow: StaticShadow;
  private aura?: { wall: THREE.Mesh; ring: THREE.Mesh };
  /** Camadas de luz das auras, de baixo para cima (ver `refreshAuras`). */
  private readonly auraTextures: AuraTextures = createAuraTextures();
  private readonly auras: Record<keyof typeof AURAS, AuraLayer>;
  /** Posições x dos sulcos da pista de terra (a continuação no mundo usa as mesmas). */
  private ruts: number[] = [];

  private reachable = new Set<string>();
  private vision = new Set<string>();
  /** Aura de interrogatório (ver `setInterrogationAura`). */
  private interrogationAura = new Set<string>();
  private interrogationHot = new Set<string>();
  private interrogationMuted = new Set<string>();
  /** Aura de ação em volta do avião (ver `setActionAura`). */
  private actionAura = new Set<string>();
  private actionHot = new Set<string>();
  /** Pré-visualização da abordagem: zona de rendição, zona de rolagem e zona de fuga. */
  private approach: { surrender: Set<string>; roll: Set<string>; flee: Set<string> } | null = null;
  /** Escala de cinza do modo de abordagem (ver `setSpotlight`). */
  private spotlight!: Spotlight;
  private spot: { lit: THREE.Object3D[]; zone: THREE.InstancedMesh | null; tiles: HexTile[] } | null = null;
  /** Etiqueta que só aparece no quadro de aquecimento do destaque (fica na cena para o shader não ser descartado). */
  private readonly warmLabel: THREE.Sprite;
  /** Pede um quadro de aquecimento do destaque (ver `warmSpotlight`). */
  private spotWarmDue = true;
  /** Etiquetas sobre os suspeitos (desenhadas por cima, depois do cinza). */
  private readonly labelScene = new THREE.Scene();
  private readonly labels = new Map<string, THREE.Sprite>();
  /** Onda de voz da abordagem: sai do agente e acende os hexágonos do raio. */
  private wave: { from: HexCoord; start: number; end: number } | null = null;
  private waveRing?: THREE.Mesh;
  private selected: HexCoord | null = null;
  /** Caminho até o destino (sem a origem, com o destino), na ordem em que será percorrido. */
  private path: string[] = [];
  private activeId: string | null = null;
  /** Giro (rad, em volta de +Y) da câmera para ver de frente a porta ao lado do agente da vez. */
  private doorYaw = 0;
  /** Trecho reto de parede de cada porta (chaves dos hexágonos), ver `doorRun`. */
  private readonly doorRuns = new Map<string, Set<string>>();
  private focusId: string | null = null;
  private moving = false;
  private inputEnabled = true;
  private disposed = false;
  /** Desenha a cada quadro (ver `setRendering`). */
  private rendering = true;
  /** Câmera de perseguição segue a direção do agente (ver `setChaseFollow`). */
  private chaseFollow = false;

  // câmera
  private readonly camTarget = new THREE.Vector3();
  private readonly camGoal = new THREE.Vector3();
  private zoom = 1;
  /** Inclinação da câmera de jogo (graus acima do chão); a abertura da missão sobe para `INTRO.pitch`. */
  private pitchDeg = BASE_PITCH;
  /**
   * Abertura da missão em curso (ver `frameIntro`): enquanto durar, arrastar, pinça, roda e
   * controle não mexem na câmera. `move` é a câmera andando em linha reta (com zoom e
   * inclinação juntos); sem ele, a câmera fica parada no enquadramento.
   */
  private intro: {
    zoomBack: number;
    move: {
      from: THREE.Vector3;
      to: THREE.Vector3;
      zoom: [number, number];
      pitch: [number, number];
      ms: number;
      t0: number;
      done: () => void;
    } | null;
  } | null = null;
  /**
   * Close-up (ver `closeUp`): ponto mirado e direção (do ponto até a câmera, no chão).
   * `inspectBlend` vai de 0 (câmera de sempre) a 1 (close-up) e volta.
   */
  private inspect: CloseUpView | null = null;
  /** Vista do tablet de abordagem (ver `frameRing`); `ringLast` segura a saída da transição. */
  private ring: { target: THREE.Vector3; zoom: number; pitch: number } | null = null;
  private ringLast: { target: THREE.Vector3; zoom: number; pitch: number } | null = null;
  private ringBlend = 0;
  private inspectLast: CloseUpView | null = null;
  private inspectBlend = 0;
  /** Deslocamento da vista neste quadro (px): a cena da porta empurra para o lado, o close-up para cima. */
  private readonly viewShift = { x: 0, y: 0 };
  private readonly bounds = { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  /** Mundo semiaberto: a câmera passeia num círculo (centro e raio no plano do mundo). */
  private worldBounds: { x: number; z: number; r: number } | null = null;

  // ponteiros
  private readonly pointers = new Map<number, { x: number; y: number }>();
  private tapStart: { x: number; y: number; t: number } | null = null;
  private dragged = false;
  private pinchDist = 0;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly map: GameMap,
    units: BoardUnit[],
    private readonly callbacks: HexBoardCallbacks,
    extras: { walls?: HexCoord[]; enemies?: BoardEnemy[]; profile?: RenderProfile; transparent?: boolean; wideChase?: boolean } = {},
  ) {
    // o mapa de corrida enxerga a pista inteira atrás do agente (a névoa não fecha mais perto)
    this.wideChase = !!extras.wideChase;
    // transparente: o mapa de corrida, desenhado por cima do tabuleiro na virada (ver `setFlip`)
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: !!extras.transparent });
    if (extras.transparent) this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap saiu do three.js: ele troca sozinho para PCF na primeira sombra, o que
    // recompila os shaders já prontos (inclusive os aquecidos para a abordagem)
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // contagem por quadro (a sombra móvel faz um `render` dentro do outro)
    this.renderer.info.autoReset = false;
    this.staticShadow = new StaticShadow(this.renderer, this.scene, this.sun);
    this.spotlight = new Spotlight(this.renderer, this.scene, this.camera);
    this.targetOutline = new TargetOutline(this.renderer, this.scene, this.camera);
    // etiqueta escondida para o aquecimento do destaque (ver `warmSpotlight`)
    this.warmLabel = this.labelSprite('…', 'roll');
    this.warmLabel.visible = false;
    this.warmLabel.frustumCulled = false;
    this.labelScene.add(this.warmLabel);
    this.area = playArea(map);

    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.background, 22, 48);

    this.setupLights();
    this.buildBoard();
    this.sightWalls = new Set((extras.walls ?? []).map(hexKey));
    this.buildWalls(extras.walls ?? []);
    this.buildPlane(map.plane ?? []);
    this.buildCargo();
    this.buildAura();
    this.auras = this.buildAuraLayers();
    this.stream = this.buildStream();
    for (const u of units) this.buildUnit(u);
    for (const e of extras.enemies ?? []) this.buildEnemy(e);
    this.activeMarker = this.buildMarker(COLORS.activeRing, 0.62, 0.09);
    this.focusMarker = this.buildMarker(COLORS.focusRing, 0.72, 0.05);
    this.cursorMarker = this.buildCursor();

    const first = units[0]?.start ?? { col: 0, row: 0 };
    this.camTarget.copy(this.worldOf(first));
    this.camGoal.copy(this.camTarget);
    this.paintTiles();
    this.applyProfile(extras.profile ?? RENDER_PROFILES.normal);
    // monta já o que a câmera vê; o resto do raio chega em segundo plano
    this.stream.update(this.camTarget.x, this.camTarget.z, 0);
    this.stream.warmUp();

    this.bindInput();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.loop();
  }

  // ---------- API pública ----------

  get busy(): boolean {
    return this.moving;
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
  }

  /**
   * Modo de renderização: raio pré-renderizado, raio de visão, densidade de pixels e
   * sombras. Pode mudar no meio da partida (o mundo é remontado em segundo plano).
   */
  setProfile(profile: RenderProfile): void {
    this.applyProfile(profile);
  }

  /** Números do carregamento por raio (para o menu). */
  renderStats(): {
    chunks: number; pending: number; loadRadius: number; viewRadius: number; tiles: number;
    calls: number; triangles: number;
  } {
    let tiles = 0;
    for (const t of this.tiles.values()) if (t.visible) tiles++;
    // do último quadro (inclui o passe de sombras)
    const { calls, triangles } = this.renderer.info.render;
    return { ...this.stream.stats(), tiles, calls, triangles };
  }

  /** Personagem da vez: flutua e ganha o anel amarelo. */
  setActive(id: string | null): void {
    this.activeId = id;
  }

  /** Personagem em foco (anel branco) — a câmera vai até ele. */
  focus(id: string | null, moveCamera = true): void {
    this.focusId = id;
    const u = id ? this.units.get(id) : undefined;
    // na vista de inspeção (e na abertura da missão) a câmera fica travada
    if (u && moveCamera && !this.inspect && !this.intro) {
      this.camGoal.copy(this.worldOf(u.hex));
      this.clampGoal();
    }
  }

  /** Hexágonos destacados como destino possível. */
  setReachable(keys: Iterable<string>): void {
    this.reachable = new Set(keys);
    this.refreshAuras();
  }

  /** Destino escolhido e o caminho até ele (sem a origem), que brilha e flutua. */
  setSelected(hex: HexCoord | null, path: HexCoord[] = []): void {
    this.selected = hex;
    this.path = hex ? path.map(hexKey) : [];
    this.paintTiles();
  }

  /** Hexágonos vistos pelos inimigos (véu vermelho). */
  setVision(keys: Iterable<string>): void {
    this.vision = new Set(keys);
    this.refreshAuras();
  }

  /**
   * Aura de diálogo: hexágonos em volta dos suspeitos rendidos com diálogo (luz âmbar com cortina).
   * `hot` são os da aura em que o agente da vez está (aquela aura inteira acende); `muted`, a aura
   * apagada (sem cortina nem pulso) dos rendidos sem diálogo.
   */
  setInterrogationAura(keys: Iterable<string>, hot: Iterable<string> = [], muted: Iterable<string> = []): void {
    const aura = new Set(keys);
    const warm = new Set(hot);
    const dim = new Set([...muted].filter((k) => !aura.has(k)));
    const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((k) => b.has(k));
    if (same(aura, this.interrogationAura) && same(warm, this.interrogationHot) && same(dim, this.interrogationMuted)) return;
    this.interrogationAura = aura;
    this.interrogationHot = warm;
    this.interrogationMuted = dim;
    this.refreshAuras();
  }

  /**
   * Aura em volta de um objeto com ação (o avião, os suprimentos): luz de brasa com cortina. `hot` são
   * os em que o agente da vez está — ali o botão de ação aparece e aquela aura inteira acende.
   */
  setActionAura(keys: Iterable<string>, hot: Iterable<string> = []): void {
    const aura = new Set(keys);
    const warm = new Set(hot);
    const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((k) => b.has(k));
    if (same(aura, this.actionAura) && same(warm, this.actionHot)) return;
    this.actionAura = aura;
    this.actionHot = warm;
    this.refreshAuras();
  }

  /** Mostra (ou esconde, com `null`) as zonas da abordagem. */
  setApproachZones(zones: { surrender: Iterable<string>; roll: Iterable<string>; flee: Iterable<string> } | null): void {
    this.approach = zones && { surrender: new Set(zones.surrender), roll: new Set(zones.roll), flee: new Set(zones.flee) };
    this.paintTiles();
  }

  /**
   * Modo de abordagem: o tabuleiro fica em cinza, menos os personagens de `units` (o da vez),
   * os inimigos de `labels` (cada um com uma etiqueta: se rende, rola ou corre) e os hexágonos de
   * `hexes` (o raio). `null` devolve a cor.
   */
  setSpotlight(
    spot: {
      units: readonly string[];
      labels: readonly { id: string; text: string; tone: 'surrender' | 'roll' | 'flee' }[];
      hexes: Iterable<string>;
    } | null,
  ): void {
    // desfaz o destaque anterior
    if (this.spot) {
      for (const o of this.spot.lit) o.layers.disable(SPOTLIGHT_LAYER);
      if (this.spot.zone) {
        this.scene.remove(this.spot.zone);
        this.spot.zone.geometry.dispose();
        (this.spot.zone.material as THREE.Material).dispose();
      }
      this.spot = null;
    }
    for (const sprite of this.labels.values()) {
      this.labelScene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.labels.clear();
    this.spotlight.set(!!spot);
    if (!spot) return;

    const lit: THREE.Object3D[] = [];
    const light = (root: THREE.Object3D) =>
      root.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        o.layers.enable(SPOTLIGHT_LAYER);
        lit.push(o);
      });
    for (const id of spot.units) {
      const u = this.units.get(id);
      if (u) light(u.group);
    }
    if (spot.units.includes(this.activeId ?? '')) light(this.activeMarker);
    for (const l of spot.labels) {
      const e = this.enemies.get(l.id);
      if (!e) continue;
      light(e.group);
      const sprite = this.labelSprite(l.text, l.tone);
      this.labels.set(l.id, sprite);
      this.labelScene.add(sprite);
    }
    // o raio: prismas só na camada do destaque, por cima dos hexágonos do chão
    const tiles = [...spot.hexes].map((k) => this.tiles.get(k)).filter((t): t is HexTile => !!t);
    let zone: THREE.InstancedMesh | null = null;
    if (tiles.length) {
      zone = new THREE.InstancedMesh(this.field.prism.clone(), new THREE.MeshBasicMaterial(), tiles.length);
      zone.layers.set(SPOTLIGHT_LAYER);
      zone.frustumCulled = false;
      this.scene.add(zone);
    }
    this.spot = { lit, zone, tiles };
    this.updateSpotlight();
  }

  /**
   * Onda de voz da abordagem: um anel sai de `from` e cada hexágono das zonas da abordagem
   * pula e brilha quando ela chega (as zonas precisam estar mostradas). `radius` é o alcance
   * da abordagem de quem gritou (cresce com a intimidação e com o grupo).
   */
  playApproachWave(from: HexCoord, radius?: number): void {
    const start = this.clock.elapsedTime;
    this.wave = { from: { ...from }, start, end: start + waveDuration(radius) };
    if (!this.waveRing) {
      // anel fino de raio 1 (escalado a cada quadro), deitado no chão
      this.waveRing = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1, 64),
        new THREE.MeshBasicMaterial({ color: 0xfff6d6, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
      );
      this.waveRing.rotation.x = -Math.PI / 2;
      this.waveRing.renderOrder = 5;
      this.scene.add(this.waveRing);
    }
    const p = this.worldOf(from);
    this.waveRing.position.set(p.x, 0.35, p.z);
    this.waveRing.visible = false;
  }

  /** Susto com a abordagem: o inimigo dá um pulinho no lugar. */
  startleEnemy(id: string): void {
    const e = this.enemies.get(id);
    if (e) e.startleAt = this.clock.elapsedTime;
  }

  /** Leva a câmera até um hexágono. */
  focusHex(hex: HexCoord): void {
    if (this.intro) return;
    this.camGoal.copy(this.worldOf(hex));
    this.clampGoal();
  }

  /**
   * Leva a câmera até o centro de um objeto que ocupa vários hexágonos (o avião, os suprimentos)
   * ou de um só (um NPC). Como `focus`, não mexe na câmera travada da inspeção nem da abertura.
   */
  focusArea(hexes: readonly HexCoord[]): void {
    if (!hexes.length || this.inspect || this.intro) return;
    const c = new THREE.Vector3();
    for (const h of hexes) c.add(this.worldOf(h));
    this.camGoal.copy(c.divideScalar(hexes.length));
    this.clampGoal();
  }

  /** Mostra (ou esconde, com `null`) o cursor do controle. */
  setCursor(hex: HexCoord | null): void {
    this.cursor = hex && this.tiles.has(hexKey(hex)) ? hex : null;
  }

  /**
   * Close-up no próprio tabuleiro, no mesmo enquadramento da cena da porta (arrombar / abrir
   * fechadura): a câmera desce para 30° e chega perto. Serve para a inspeção e o interrogatório.
   *
   * - `frame: 'object'` (inspeção): gira 45° a partir da câmera de sempre, para o lado em que o
   *   agente está, mirando entre o `target` (o móvel — um hexágono ou o próprio objeto 3D) e o
   *   agente.
   * - `frame: 'pair'` (interrogatório): fica de lado para o agente e a pessoa em `target`,
   *   mirando entre os dois, e afasta até os dois caberem em pé na faixa de cima da tela.
   *
   * O agente `agentId` vira para o `target` (e `faceEnemy`, para o agente). Enquanto durar, o
   * jogador não mexe na câmera (arrastar, pinça, roda e controle são ignorados) e o tabuleiro
   * ignora os toques. `endCloseUp` volta, suave, para a câmera de sempre.
   */
  closeUp(agentId: string, target: HexCoord | THREE.Object3D, opts: CloseUpOptions = {}): void {
    const u = this.units.get(agentId);
    if (!u) return;
    const frame = opts.frame ?? 'object';
    const agent = this.worldOf(u.hex);
    const center = target instanceof THREE.Object3D
      ? target.getWorldPosition(new THREE.Vector3()).setY(0)
      : this.worldOf(target);
    const c = INSPECT_CAM;
    // de que lado do objeto o agente está
    const n = agent.clone().sub(center).setY(0);
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
    n.normalize();
    const turn = yawTurn;
    // a câmera de sempre olha de +Z
    const home = new THREE.Vector3(0, 0, 1);
    let aim: THREE.Vector3;
    let dir: THREE.Vector3;
    if (frame === 'pair') {
      // de lado para a dupla (perpendicular à linha entre os dois), puxando para a câmera de sempre
      aim = center.clone().lerp(agent, 0.5).setY(this.groundAt(agent.x, agent.z) + c.pair.aimHeight);
      const side = [turn(n, Math.PI / 2), turn(n, -Math.PI / 2)].sort((a, b) => b.dot(home) - a.dot(home))[0];
      dir = side.addScaledVector(home, c.pair.side).normalize();
    } else {
      aim = center.clone().lerp(agent, c.towardAgent).setY(this.groundAt(agent.x, agent.z) + c.aimHeight);
      // 45° para um lado, o do agente
      const options = [turn(home, c.turn), turn(home, -c.turn)].sort((a, b) => b.dot(n) - a.dot(n));
      dir = options[0].dot(n) > 0.1 ? options[0] : turn(n, c.turn);
    }
    const chest = (p: THREE.Vector3) => p.clone().setY(this.groundAt(p.x, p.z) + 1);
    this.inspect = {
      target: aim,
      dir,
      frame,
      insets: opts.insets ?? { bottom: 0, right: 0 },
      subjects: [chest(agent), chest(center)],
      rooms: new Set(
        this.structures
          .filter((st) => inStructure(u.hex, st.rect) || inStructure(worldToHex(center.x, center.z, HEX_SIZE), st.rect))
          .map((st) => st.object),
      ),
      hideOccluders: opts.hideOccluders ?? true,
    };
    this.occlusionClock = 0;
    this.inspectLast = this.inspect;
    if (reducedMotionQuery()) this.inspectBlend = 1;
    // o agente vira para o objeto (ou para a pessoa); a pessoa, para o agente
    u.yaw = Math.atan2(center.x - agent.x, center.z - agent.z);
    if (opts.faceEnemy) {
      const e = this.enemies.get(opts.faceEnemy);
      if (e) e.facingGoal = Math.atan2(agent.z - center.z, agent.x - center.x);
    }
    this.pointers.clear();
    this.tapStart = null;
    this.pinchDist = 0;
  }

  /** Sai do close-up: a câmera volta, suave, para a de sempre. */
  endCloseUp(): void {
    if (!this.inspect) return;
    this.inspect = null;
    this.propOpen = null;
    if (reducedMotionQuery()) this.inspectBlend = 0;
  }

  /**
   * Zoom num móvel (o quadro de chaves, o armário do caseiro): a câmera fica de frente para
   * ele, quase na altura dos olhos, e aproxima até a caixa de foco caber no que a papelada não
   * cobre (`insets`). Gira um pouco para longe do agente `agentId`, e quem ainda tapar a vista
   * some enquanto durar. Como em `closeUp`, a câmera fica travada; os toques no móvel vão para
   * `onPropTap`. Devolve `false` se o hexágono não tem móvel com zoom.
   */
  propCloseUp(agentId: string, hex: HexCoord, insets: CloseUpInsets = { bottom: 0, right: 0 }): boolean {
    const model = this.cargoModels.get(hexKey(hex));
    const info = this.props.get(hexKey(hex));
    const u = this.units.get(agentId);
    if (!model || !info || !u) return false;
    model.updateWorldMatrix(true, true);
    const box = info.focus.clone().applyMatrix4(model.matrixWorld);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const facing = info.facing.clone().transformDirection(model.matrixWorld).setY(0).normalize();
    const side = new THREE.Vector3(-facing.z, 0, facing.x);
    const agent = this.worldOf(u.hex);
    const away = -(Math.sign(agent.clone().sub(center).dot(side)) || 1);
    const dir = facing.clone().multiplyScalar(Math.cos(PROP_CAM.turn)).addScaledVector(side, away * Math.sin(PROP_CAM.turn));
    this.inspect = {
      target: center,
      dir,
      frame: 'prop',
      fit: { w: Math.abs(size.x * side.x) + Math.abs(size.z * side.z), h: size.y },
      insets,
      subjects: [center],
      rooms: new Set(this.structures.filter((st) => inStructure(hex, st.rect)).map((st) => st.object)),
      hideOccluders: true,
    };
    this.propOpen = info;
    this.occlusionClock = 0;
    this.inspectLast = this.inspect;
    if (reducedMotionQuery()) this.inspectBlend = 1;
    u.yaw = Math.atan2(center.x - agent.x, center.z - agent.z);
    this.pointers.clear();
    this.tapStart = null;
    this.pinchDist = 0;
    return true;
  }

  /** Liga (ou apaga) o destaque da peça do móvel em `hex`: contorno amarelo e brilho que pulsam. */
  setPropHighlight(hex: HexCoord, on: boolean): void {
    const info = this.props.get(hexKey(hex));
    if (!info) return;
    info.glow.visible = on && info.item.visible;
    if (info.glow.visible) this.glowing.add(info);
    else this.unglow(info);
  }

  private unglow(info: PropInfo): void {
    this.glowing.delete(info);
    info.glow.visible = false;
    (info.item.material as THREE.MeshStandardMaterial).emissive.setRGB(0, 0, 0);
  }

  /** A peça do móvel em `hex` foi pega: sobe um pouco, encolhe e some (sem animação, some já). */
  takePropItem(hex: HexCoord): void {
    const info = this.props.get(hexKey(hex));
    if (!info || !info.item.visible) return;
    this.unglow(info);
    if (reducedMotionQuery()) {
      info.item.visible = false;
      return;
    }
    this.taking = { info, t0: performance.now(), y: info.item.position.y };
  }

  /** Recomeço: as peças voltam para os móveis, sem destaque. */
  resetProps(): void {
    this.finishTaking();
    for (const info of this.props.values()) {
      this.unglow(info);
      info.item.visible = true;
    }
  }

  /** Anima a peça sendo pega e o pulso do destaque (a cada quadro). */
  private updateProps(t: number): void {
    if (this.taking) {
      const k = Math.min(1, (performance.now() - this.taking.t0) / 520);
      const item = this.taking.info.item;
      item.position.y = this.taking.y + Math.sin(k * Math.PI * 0.5) * 0.25;
      item.scale.setScalar(1 - k * k * 0.85);
      if (k >= 1) this.finishTaking();
    }
    if (!this.glowing.size) return;
    const a = 0.5 + Math.sin(t * 5) * 0.5;
    for (const info of this.glowing) {
      const glow = info.glow.material as THREE.MeshBasicMaterial;
      glow.opacity = 0.55 + a * 0.45;
      glow.color.setRGB(1, 0.8 + a * 0.15, 0.15 + a * 0.4);
      (info.item.material as THREE.MeshStandardMaterial).emissive.setRGB(0.16 + a * 0.2, 0.12 + a * 0.15, 0.01);
    }
  }

  private finishTaking(): void {
    const tk = this.taking;
    if (!tk) return;
    this.taking = null;
    tk.info.item.visible = false;
    tk.info.item.position.y = tk.y;
    tk.info.item.scale.setScalar(1);
  }

  /**
   * No zoom de um móvel, o personagem `group` está na frente dele, dentro do quadro (de lado,
   * até um pouco além da largura do móvel): some enquanto durar, para o móvel ficar limpo.
   */
  private blocksProp(group: THREE.Object3D): boolean {
    const v = this.inspect;
    if (v?.frame !== 'prop' || !v.fit || this.inspectBlend < 0.15) return false;
    const rel = group.position.clone().sub(v.target).setY(0);
    const dir = v.dir.clone().setY(0).normalize();
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    return rel.dot(dir) > PROP_CAM.clearance && Math.abs(rel.dot(side)) < v.fit.w / 2 + PROP_CAM.aside;
  }

  /** Muda o que a papelada cobre durante o close-up (ao girar o celular, por exemplo). */
  setCloseUpInsets(insets: CloseUpInsets): void {
    if (this.inspect) this.inspect.insets = insets;
  }

  /** Se a câmera está travada no close-up. */
  get inspecting(): boolean {
    return !!this.inspect;
  }

  /**
   * Enquadra um grupo de hexágonos (quem aborda e os suspeitos): a câmera vai para o meio
   * deles e afasta o que for preciso para todos caberem na tela (nunca aproxima).
   */
  frameHexes(hexes: readonly HexCoord[]): void {
    if (this.inspect) return;
    if (!hexes.length) return;
    const pts = hexes.map((h) => this.worldOf(h));
    const mid = pts.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    const spread = Math.max(...pts.map((p) => Math.max(Math.abs(p.x - mid.x) / 1.9, Math.abs(p.z - mid.z))));
    this.setZoom(Math.max(this.zoom, (spread + 2) / 3));
    this.camGoal.copy(mid);
    // a fita do topo cobre mais que o painel de baixo: o enquadramento desce um pouco
    this.camGoal.z -= 0.9;
    this.clampGoal();
  }

  /**
   * Vista do tablet de abordagem: a câmera sobe `RING_VIEW.extraPitch` graus (até quase de cima)
   * e enquadra o raio inteiro (`radius` hexágonos em volta de `center`) dentro de `rect` (px do
   * canvas, a tela do tablet). Chega e sai em transição; `null` volta à câmera de jogo.
   */
  frameRing(center: HexCoord | null, radius = 0, rect?: { x: number; y: number; w: number; h: number }): void {
    if (!center || !rect || rect.w < 40 || rect.h < 40) {
      if (this.ring) this.ringLast = this.ring;
      this.ring = null;
      return;
    }
    const pitch = Math.min(BASE_PITCH + RING_VIEW.extraPitch, RING_VIEW.maxPitch);
    const c = this.worldOf(center);
    const r = (radius + 0.5) * HEX_STEP * HEX_SIZE;
    const pts = Array.from({ length: 32 }, (_, i) => {
      const a = (i / 32) * Math.PI * 2;
      return new THREE.Vector3(c.x + Math.cos(a) * r, BASE_TOP, c.z + Math.sin(a) * r);
    });
    const m = RING_VIEW.margin;
    const area = { x: rect.x + m, y: rect.y + m, w: Math.max(20, rect.w - 2 * m), h: Math.max(20, rect.h - 2 * m) };
    const target = c.clone().setY(0);
    let zoom = this.zoom;
    const look = new THREE.Vector3();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const box = () => {
      this.placePerspective(target, zoom, pitch, look);
      this.camera.lookAt(look);
      this.camera.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of pts) {
        const q = p.clone().project(this.camera);
        const sx = ((q.x + 1) / 2) * w;
        const sy = ((1 - q.y) / 2) * h;
        x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
        y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
      }
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
    };
    // aproxima / afasta até o raio caber, depois centraliza na tela do tablet (algumas voltas)
    for (let i = 0; i < 6; i++) {
      let b = box();
      zoom = THREE.MathUtils.clamp(zoom * Math.max(b.w / area.w, b.h / area.h), 0.3, 12);
      b = box();
      target.x += (b.cx - (area.x + area.w / 2)) * ((2 * r) / b.w);
      target.z += (b.cy - (area.y + area.h / 2)) * ((2 * r) / b.h);
    }
    this.ring = { target, zoom, pitch };
    if (reducedMotionQuery()) this.ringBlend = 1;
  }

  /** Desloca a câmera só o necessário para o hexágono ficar longe das bordas da tela. */
  keepInView(hex: HexCoord): void {
    if (this.inspect || this.intro) return;
    const p = this.worldOf(hex);
    const portrait = this.camera.aspect < 1;
    const mx = (portrait ? 1.6 : 4) * this.zoom;
    const mz = (portrait ? 2.6 : 2.2) * this.zoom;
    this.camGoal.x = THREE.MathUtils.clamp(this.camGoal.x, p.x - mx, p.x + mx);
    this.camGoal.z = THREE.MathUtils.clamp(this.camGoal.z, p.z - mz, p.z + mz);
    this.clampGoal();
  }

  /** Arrasta a câmera (em unidades de tela: x direita, y baixo), proporcional ao zoom. */
  panBy(dx: number, dy: number): void {
    if (this.inspect || this.intro || this.ring) return;
    this.camGoal.x += dx * this.zoom;
    this.camGoal.z += dy * this.zoom * 1.3;
    this.clampGoal();
  }

  /** Aproxima (< 1) ou afasta (> 1) a câmera. */
  zoomBy(factor: number): void {
    if (this.inspect || this.intro || this.ring) return;
    this.setZoom(this.zoom * factor);
  }

  // ---------- abertura da missão (ver `mission-intro.ts`) ----------

  /**
   * Põe a câmera alta (`INTRO.pitch`) e afastada sobre os retângulos (as estruturas com
   * objetivo), com folga, e chega devagar (`INTRO.settleMs`). O zoom passa do limite do
   * jogador: só a abertura enxerga tanto. Resolve quando a câmera para.
   */
  frameIntro(rects: readonly HexRect[]): Promise<void> {
    const corners = rects.flatMap((r) =>
      [r.cols[0], r.cols[1]].flatMap((col) => [r.rows[0], r.rows[1]].map((row) => this.worldOf({ col, row }))),
    );
    const box = new THREE.Box3().setFromPoints(corners).expandByScalar(HEX_SIZE);
    const center = box.getCenter(new THREE.Vector3()).setY(0);
    const size = box.getSize(new THREE.Vector3());
    const portrait = this.camera.aspect < 1 ? 1 / Math.max(this.camera.aspect, 0.45) : 1;
    const zoom = introZoom(size.x, size.z, this.camera.aspect, this.camera.fov, 11.5 * Math.min(portrait, 2.3));
    const zoomBack = this.intro?.zoomBack ?? this.zoom;
    this.intro = { zoomBack, move: null };
    this.camGoal.copy(center);
    this.camTarget.copy(center);
    this.pitchDeg = INTRO.pitch;
    const from = reducedMotionQuery() ? zoom : zoom * INTRO.settleFrom;
    return this.introMove(center, from, zoom, INTRO.pitch, INTRO.settleMs);
  }

  /**
   * Leva a câmera da abertura até o hexágono `to` (a equipe) em linha reta, sem passar de
   * hexágono em hexágono, voltando ao zoom de antes e à inclinação de jogo no caminho.
   * Com "menos movimento", corta direto.
   */
  async panFromIntro(to: HexCoord): Promise<void> {
    if (!this.intro) return;
    if (reducedMotionQuery()) return this.skipIntro(to);
    await this.introMove(this.worldOf(to), this.zoom, this.intro.zoomBack, BASE_PITCH, INTRO.panMs);
    this.intro = null;
    this.clampGoal();
  }

  /** Encerra a abertura na hora, com a câmera de jogo sobre `to`. */
  skipIntro(to: HexCoord): void {
    const intro = this.intro;
    if (!intro) return;
    intro.move?.done();
    this.intro = null;
    this.zoom = intro.zoomBack;
    this.pitchDeg = BASE_PITCH;
    this.camGoal.copy(this.worldOf(to));
    this.clampGoal();
    this.camTarget.copy(this.camGoal);
  }

  /**
   * Elipse em volta de cada retângulo na tela (px do canvas): os cantos do chão e do alto
   * (`tops`, a altura de cada estrutura) projetados, com folga para o traço não encostar.
   */
  introEllipses(rects: readonly HexRect[], tops: readonly number[]): ScreenEllipse[] {
    this.updateCamera(0);
    this.camera.updateMatrixWorld();
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    return rects.map((r, i) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const col of r.cols)
        for (const row of r.rows)
          for (const y of [0, tops[i] ?? 0]) {
            const p = this.worldOf({ col, row });
            p.y = y;
            p.project(this.camera);
            const sx = ((p.x + 1) / 2) * w;
            const sy = ((1 - p.y) / 2) * h;
            x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
            y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
          }
      // a elipse que passa pelos cantos de um retângulo tem semieixos √2 maiores; um pouco
      // menos deixa o traço "abraçar" a estrutura sem sobrar tanto
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, rx: ((x1 - x0) / 2) * 1.15, ry: ((y1 - y0) / 2) * 1.2 };
    });
  }

  private introMove(to: THREE.Vector3, zoomFrom: number, zoomTo: number, pitchTo: number, ms: number): Promise<void> {
    const intro = this.intro;
    if (!intro) return Promise.resolve();
    intro.move?.done();
    return new Promise((resolve) => {
      intro.move = {
        from: this.camTarget.clone(),
        to: to.clone(),
        zoom: [zoomFrom, zoomTo],
        pitch: [this.pitchDeg, pitchTo],
        ms: Math.max(1, ms),
        t0: performance.now(),
        done: resolve,
      };
      this.zoom = zoomFrom;
    });
  }

  /**
   * Um passo da câmera da abertura: posição, zoom e inclinação juntos, na mesma curva. Conta
   * pelo relógio (não pelo `dt` do quadro, que tem teto): dura o mesmo em aparelho lento.
   */
  private stepIntro(): void {
    const m = this.intro?.move;
    if (!m) return;
    const t = Math.min(1, (performance.now() - m.t0) / m.ms);
    const e = easeInOutCubic(t);
    this.camTarget.lerpVectors(m.from, m.to, e);
    this.camGoal.copy(this.camTarget);
    this.zoom = THREE.MathUtils.lerp(m.zoom[0], m.zoom[1], e);
    this.pitchDeg = THREE.MathUtils.lerp(m.pitch[0], m.pitch[1], e);
    if (t >= 1) {
      this.intro!.move = null;
      m.done();
    }
  }

  /** Recoloca os inimigos (sem animação): posição, direção, alerta e presença. */
  placeEnemies(
    states: Iterable<{ id: string; hex: HexCoord; facing: number; alert: boolean; surrendered: boolean; gone: boolean }>,
  ): void {
    for (const st of states) {
      const e = this.enemies.get(st.id);
      if (!e) continue;
      e.epoch++;
      e.hop = 0;
      e.hex = { ...st.hex };
      const p = this.worldOf(st.hex);
      e.group.position.x = p.x;
      e.group.position.z = p.z;
      e.facing = e.facingGoal = st.facing;
      e.gone = st.gone;
      e.presence = st.gone ? 0 : 1;
      this.setEnemyAlert(st.id, st.alert);
      this.setEnemySurrendered(st.id, st.surrendered);
    }
  }

  /** Vira o inimigo para um ângulo (com animação). */
  setEnemyFacing(id: string, facing: number): void {
    const e = this.enemies.get(id);
    if (e) e.facingGoal = facing;
  }

  /** Inimigo em alerta: fica laranja e mostra um "!" sobre a cabeça. */
  setEnemyAlert(id: string, alert: boolean): void {
    const e = this.enemies.get(id);
    if (!e) return;
    e.alert = alert;
    if (alert) e.surrendered = false;
    this.paintEnemy(e);
  }

  /** Inimigo rendido: fica branco, abaixado, com uma bandeira branca. */
  setEnemySurrendered(id: string, surrendered: boolean): void {
    const e = this.enemies.get(id);
    if (!e) return;
    e.surrendered = surrendered;
    if (surrendered) {
      e.alert = false;
      e.stance = false;
      e.scan = undefined;
    }
    if (surrendered && !e.cuffPose) {
      const before = [...this.enemies.values()].filter((o) => o.cuffPose).length;
      e.cuffPose = before % 2 ? 'kneel' : 'cuffed';
    }
    this.paintEnemy(e);
    this.refreshCover();
  }

  private paintEnemy(e: EnemyView): void {
    // com modelo 3D, o rendido fica algemado (a peça simples só mostra a bandeira branca)
    if (!e.running) e.rig?.play(this.enemyRestClip(e), 0.3);
    e.rig?.setCuffed(e.surrendered);
    e.bodyMaterial.color.set(e.surrendered ? COLORS.enemySurrendered : e.alert ? COLORS.enemyAlert : COLORS.enemy);
    e.alertSprite.visible = e.alert;
    e.flagSprite.visible = e.surrendered && !e.rig;
  }

  /**
   * Clipe parado do inimigo: rendido fica algemado, de pé ou ajoelhado (`cuffPose`).
   */
  private enemyRestClip(e: EnemyView): ClipName {
    return e.surrendered ? (e.cuffPose ?? 'cuffed') : 'idle';
  }

  /**
   * Anda com o inimigo pelo caminho, virando para cada passo. `onStep` roda a cada
   * hexágono alcançado; se devolver `false` o inimigo para ali.
   */
  async moveEnemy(id: string, path: HexCoord[], onStep?: (hex: HexCoord) => boolean | void, speed = 1): Promise<void> {
    const e = this.enemies.get(id);
    if (!e || this.moving || !path.length) return;
    this.moving = true;
    const epoch = e.epoch;
    e.running = true;
    e.stance = false;
    e.scan = undefined;
    for (const step of path) {
      const from = this.worldOf(e.hex);
      const to = this.worldOf(step);
      e.facingGoal = Math.atan2(to.z - from.z, to.x - from.x);
      if (e.rig) {
        e.rig.matchSpeed('run', RUN_SPEED * speed);
        e.rig.play('run', 0.15);
        await this.runTo(e, step, RUN_SPEED * speed);
      } else await this.hopTo(e, step, 300 / speed);
      if (e.epoch !== epoch) break;
      e.hex = step;
      if (onStep?.(step) === false) break;
    }
    e.running = false;
    e.rig?.play(this.enemyRestClip(e), 0.3);
    this.moving = false;
    this.refreshCover();
  }

  /**
   * Inimigo escondido aparece no tabuleiro (entregue no interrogatório): surge em `hex`, olhando
   * para `facing`, com um susto e o "!" de alerta.
   */
  revealEnemy(id: string, hex: HexCoord, facing: number): void {
    const e = this.enemies.get(id);
    if (!e) return;
    e.epoch++;
    e.hex = { ...hex };
    const p = this.worldOf(hex);
    e.group.position.x = p.x;
    e.group.position.z = p.z;
    e.facing = e.facingGoal = facing;
    e.gone = false;
    if (reducedMotionQuery()) e.presence = 1;
    else e.startleAt = this.clock.elapsedTime;
    this.refreshCover();
  }

  /** O inimigo sai do tabuleiro (fugiu). */
  async removeEnemy(id: string): Promise<void> {
    const e = this.enemies.get(id);
    if (!e) return;
    e.gone = true;
    this.refreshCover();
    await new Promise((r) => setTimeout(r, 450));
  }

  /** Coloca todas as peças nas posições dadas (sem animação). */
  placeUnits(positions: ReadonlyMap<string, HexCoord>): void {
    for (const [id, hex] of positions) {
      const u = this.units.get(id);
      if (!u) continue;
      u.epoch++;
      u.hop = 0;
      u.hex = { ...hex };
      u.rig?.play(this.restClip(u), 0);
      const p = this.worldOf(hex);
      u.group.position.x = p.x;
      u.group.position.z = p.z;
    }
    if (this.focusId) this.focus(this.focusId);
  }

  /**
   * Anda com a peça pelo caminho (passo a passo, sem a origem). Resolve ao terminar.
   * `onStep` roda a cada hexágono alcançado.
   */
  async moveUnit(id: string, path: HexCoord[], onStep?: (hex: HexCoord) => void): Promise<void> {
    await this.moveUnits(id, new Map([[id, path]]), (_, hex) => onStep?.(hex));
  }

  /**
   * Anda com várias peças ao mesmo tempo (o grupo). O caminho aceso e a câmera acompanham
   * o líder; `onStep` roda a cada hexágono alcançado por qualquer uma delas.
   */
  async moveUnits(
    leaderId: string,
    paths: ReadonlyMap<string, HexCoord[]>,
    onStep?: (id: string, hex: HexCoord) => void,
  ): Promise<void> {
    const walks = [...paths].filter(([id, p]) => this.units.has(id) && p.length);
    if (this.moving || !walks.length) return;
    this.moving = true;
    // o caminho do líder continua aceso durante a caminhada e cada hexágono "pousa" quando a peça passa
    const lead = paths.get(leaderId) ?? [];
    this.selected = lead.at(-1) ?? null;
    this.path = lead.map(hexKey);
    this.reachable.clear();
    this.refreshAuras();
    this.paintTiles();
    await Promise.all(
      walks.map(([id, path]) => this.walk(this.units.get(id)!, path, id === leaderId, (hex) => onStep?.(id, hex))),
    );
    this.selected = null;
    this.path = [];
    this.paintTiles();
    this.moving = false;
  }

  private async walk(u: UnitView, path: HexCoord[], leader: boolean, onStep: (hex: HexCoord) => void): Promise<void> {
    u.rig?.matchSpeed('run', RUN_SPEED);
    u.rig?.play('run', 0.15);
    const epoch = u.epoch;
    for (const step of path) {
      if (u.rig) {
        const from = u.group.position;
        const to = this.worldOf(step);
        u.yaw = Math.atan2(to.x - from.x, to.z - from.z);
        await this.runTo(u, step, RUN_SPEED, leader);
      } else await this.hopTo(u, step, 260, leader);
      if (u.epoch !== epoch) break;
      u.hex = step;
      if (leader) {
        this.path.shift();
        this.paintTiles();
      }
      onStep(step);
    }
    if (u.rig) u.rig.play(this.restClip(u), 0.3);
  }

  // ---------- portas ----------

  /** Estado das portas (cadeado, tábuas, aberta ou fechada). `instant` pula a animação. */
  setDoors(doors: ReadonlyMap<string, Door>, instant = false): void {
    this.doorViews?.setStates(doors, instant);
    this.doorStates = doors;
    this.refreshCover();
    // abrir ou fechar uma porta muda o que se vê da estrutura: reavalia no próximo quadro
    this.structureKey = '';
  }

  /** Empurra a folha da porta a partir do agente (ela abre para o outro lado). */
  pushDoor(door: HexCoord, unitId: string, mode: DoorPush): void {
    const u = this.units.get(unitId);
    if (u) this.doorViews?.push(hexKey(door), u.group.position, mode);
  }

  /**
   * Cena da porta: a câmera gira 45° e aproxima até enquadrar a porta e o agente.
   * `offsetPx` empurra a cena para a esquerda (metade da largura das fichas na direita).
   */
  focusDoor(door: HexCoord, unitId: string, offsetPx: number): void {
    const center = this.doorViews?.centerOf(hexKey(door));
    if (center) this.focusAt(center, unitId, offsetPx, 1);
  }

  /**
   * Cena de um objeto grande (o avião): como `focusDoor`, enquadrando os hexágonos dele e o
   * agente. `zoom` afasta a câmera (1 = padrão).
   */
  focusSpot(hexes: readonly HexCoord[], unitId: string, offsetPx: number, zoom = 1): void {
    if (!hexes.length) return;
    this.cineZoom = zoom;
    this.focusAt(this.centerOf(hexes), unitId, offsetPx, zoom);
  }

  /** Afasta (ou aproxima) a câmera da cena aberta, devagar. */
  setCineZoom(zoom: number): void {
    if (this.cine) this.cine.zoom = zoom;
  }

  private focusAt(center: THREE.Vector3, unitId: string, offsetPx: number, zoom: number): void {
    const u = this.units.get(unitId);
    if (!u) return;
    const agent = u.group.position.clone().setY(0);
    // em retrato sobra pouca largura à esquerda das fichas: o quadro puxa mais para o agente
    const target = center.clone().setY(0).lerp(agent, this.camera.aspect < 1 ? 0.6 : 0.35).setY(1.75);
    // de que lado do alvo o agente está; a câmera fica do lado dele, 45° para um lado
    const n = agent.clone().sub(center).setY(0);
    if (n.lengthSq() < 1e-6) n.set(0, 0, 1);
    n.normalize();
    const turn = (v: THREE.Vector3, a: number) =>
      new THREE.Vector3(v.x * Math.cos(a) + v.z * Math.sin(a), 0, -v.x * Math.sin(a) + v.z * Math.cos(a));
    // gira 45° a partir da câmera de sempre (que olha de +Z), para o lado em que o alvo aparece de frente
    const home = new THREE.Vector3(0, 0, 1);
    const options = [turn(home, Math.PI / 4), turn(home, -Math.PI / 4)].sort((a, b) => b.dot(n) - a.dot(n));
    const dir = options[0].dot(n) > 0.1 ? options[0] : turn(n, Math.PI / 4);
    this.cine = { target, dir, offsetPx, zoom };
    this.cineLast = this.cine;
    this.focusId = unitId;
  }

  /** Volta para a câmera de sempre. */
  releaseDoorFocus(): void {
    this.cine = null;
    this.resetCineAim();
  }

  /** Arrombamento: a câmera da cena fecha na porta (o agente continua no quadro). */
  zoomOnDoor(door: HexCoord): void {
    const center = this.doorViews?.centerOf(hexKey(door));
    const u = this.focusId ? this.units.get(this.focusId) : undefined;
    if (!center || !this.cine) return;
    // a porta no centro, puxando um pouco para o agente: o pé e a folha cabem juntos
    if (u) center.lerp(u.group.position, 0.3);
    this.cineAimGoal = { point: center.setY(1.25), mix: 0.75, zoom: 0.66, yaw: 0, roll: 0 };
  }

  /**
   * Inclina a câmera da cena de leve para quem reage ao arrombamento: o olhar puxa até ele, a
   * câmera gira um pouco em volta do alvo e rola para o lado dele.
   */
  tiltCineTo(hex: HexCoord): void {
    const c = this.cine;
    if (!c) return;
    const p = this.worldOf(hex).setY(1.4);
    const to = p.clone().sub(c.target).setY(0);
    // direita da câmera, que olha ao longo de −dir
    const right = new THREE.Vector3(c.dir.z, 0, -c.dir.x);
    const side = Math.sign(to.dot(right)) || 1;
    const zoom = THREE.MathUtils.clamp(0.8 + to.length() * 0.05, 0.85, 1.2);
    this.cineAimGoal = { point: p, mix: 0.55, zoom, yaw: -side * 0.13, roll: -side * 0.05 };
  }

  /** Desfaz o zoom na porta e a inclinação: volta ao enquadramento do menu da porta. */
  resetCineAim(): void {
    this.cineAimGoal = { point: null, mix: 0, zoom: 1, yaw: 0, roll: 0 };
  }

  /**
   * Slow da cena: `true` desacelera todo mundo (animações, giros, o próprio chute) e fecha um
   * pouco o campo de visão; `false` volta rápido, no gesto. Mesmas rampas da perseguição.
   */
  setSceneSlowmo(on: boolean): void {
    this.sceneSlowGoal = on && !reducedMotionQuery() ? 1 : 0;
  }

  /** Velocidade da cena agora (1 = normal; no fundo do slow, `CHASE_SLOWMO.rate`). */
  private sceneRate(): number {
    return slowmoRate(this.sceneSlow);
  }

  /** Como `tween`, mas no tempo da cena: desacelera junto com o slow. */
  private sceneTween(ms: number, fn: (t: number) => void): Promise<void> {
    let last = performance.now();
    let t = 0;
    return new Promise((resolve) => {
      const step = (now: number) => {
        t = this.disposed || ms <= 0 ? 1 : Math.min(1, t + ((now - last) / ms) * this.sceneRate());
        last = now;
        fn(t);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * Número de dano que sobe da porta, como no RPG ("−2": a resistência que o chute tirou).
   * Pula, sobe e some em pouco mais de um segundo.
   */
  floatDoorDamage(door: HexCoord, text: string): void {
    const center = this.doorViews?.centerOf(hexKey(door));
    if (!center) return;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 160;
    const g = c.getContext('2d');
    if (g) {
      g.font = '900 118px "Permanent Marker", Impact, "Arial Black", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 16;
      g.strokeStyle = '#2a0c06';
      g.strokeText(text, 128, 84);
      g.fillStyle = '#ff5a3c';
      g.fillText(text, 128, 84);
      g.lineWidth = 3;
      g.strokeStyle = '#ffd0a8';
      g.strokeText(text, 128, 84);
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    sprite.renderOrder = 12;
    // nasce na altura da folha, do lado de quem chutou, e sobe até o alto da porta
    const u = this.focusId ? this.units.get(this.focusId) : undefined;
    if (u) center.add(u.group.position.clone().sub(center).setY(0).setLength(0.25));
    const from = center.setY(2.1 * METER * 0.68);
    sprite.position.copy(from);
    sprite.scale.set(0, 0, 1);
    this.scene.add(sprite);
    this.floaters.push({ sprite, born: this.clock.elapsedTime, from });
  }

  /** Sobe, pulsa e apaga os números de dano. */
  private updateFloaters(t: number): void {
    const LIFE = 1.35;
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      const age = t - f.born;
      if (age >= LIFE) {
        f.sprite.removeFromParent();
        f.sprite.material.map?.dispose();
        f.sprite.material.dispose();
        this.floaters.splice(i, 1);
        continue;
      }
      const k = age / LIFE;
      // estoura grande e assenta (0,15 s), depois só sobe e apaga no fim
      const pop = age < 0.15 ? (age / 0.15) * 1.3 : age < 0.3 ? 1.3 - ((age - 0.15) / 0.15) * 0.3 : 1;
      const h = 0.75 * pop;
      f.sprite.scale.set(h * 1.6, h, 1);
      f.sprite.position.set(f.from.x, f.from.y + (1 - (1 - k) ** 2) * 0.9, f.from.z);
      f.sprite.material.opacity = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
    }
  }

  /** Atualiza o deslocamento da cena (a largura das fichas mudou, por exemplo, ao girar o celular). */
  setDoorFocusOffset(offsetPx: number): void {
    if (this.cine) this.cine.offsetPx = offsetPx;
  }

  /** O agente sai do centro do hexágono e para colado na porta, de frente para ela. */
  async stepToDoor(unitId: string, door: HexCoord, dist: number): Promise<void> {
    const u = this.units.get(unitId);
    const spot = u && this.doorViews?.frontOf(hexKey(door), u.group.position, dist);
    if (!u || !spot) return;
    const center = this.doorViews!.centerOf(hexKey(door))!;
    u.yaw = Math.atan2(center.x - u.group.position.x, center.z - u.group.position.z);
    await this.slide(u, spot, 'walk', 1.7);
  }

  /** Volta ao centro do hexágono, de costas (sem tirar os olhos da porta). */
  async stepBack(unitId: string): Promise<void> {
    const u = this.units.get(unitId);
    if (!u) return;
    await this.slide(u, this.worldOf(u.hex), 'walk', 1.7, true);
  }

  /** Agacha (pick lock) ou levanta. */
  crouchAtDoor(unitId: string, down: boolean): void {
    const u = this.units.get(unitId);
    if (!u) return;
    if (down) this.doorCrouch.add(unitId);
    else this.doorCrouch.delete(unitId);
    u.rig?.play(down ? 'crouch' : this.restClip(u), down ? 0.35 : 0.45);
  }

  /** De quão longe da porta o agente chuta (ver `KICK_REACH`). */
  kickReach(_unitId: string): number {
    return KICK_REACH;
  }

  /**
   * Chutão na porta (ver `KICK_POSES`): do repouso o joelho sobe direto até o peito, com o pé
   * puxado para cima; no meio do gesto a cena entra em slow (`onSlow` roda nessa hora: é quando a
   * tela gira o d20) e ele segura o joelho lá em cima, com o corpo atrás, enquanto a promessa de
   * `onSlow` não termina. Quando ela termina, o slow acaba no gesto e a perna estica: a sola do pé
   * bate na porta em velocidade cheia (`onImpact`, uma vez só). `through` diz se a porta cede (a
   * perna e o corpo vão junto) ou aguenta (a perna recolhe). Tudo por cima do `idle`, sem o clipe
   * `kick`: a perna do chute só segue as poses, sem outro movimento misturado.
   */
  async kick(
    unitId: string,
    opts: { onSlow?: () => Promise<void> | void; onImpact: () => void; through?: boolean },
  ): Promise<void> {
    const u = this.units.get(unitId);
    if (!u) {
      await opts.onSlow?.();
      return opts.onImpact();
    }
    const pose = u.rig?.pose ?? restPose();
    const leg = u.rig?.leg ?? restLeg();
    const rest: KickFrame = { ...restPose(), ...KICK_LEG_IDLE };
    const cur: KickFrame = { ...rest };
    // escreve a mistura de `a` e `b` no corpo (camada local) e na perna do chute
    const mix = (a: KickFrame, b: KickFrame, t: number) => {
      for (const k in cur) {
        const key = k as keyof KickFrame;
        cur[key] = a[key] + (b[key] - a[key]) * t;
      }
      for (const k in pose) pose[k as keyof Pose] = cur[k as keyof Pose];
      leg.hip = cur.hip;
      leg.knee = cur.knee;
      leg.ankle = cur.ankle;
    };
    const pos = u.group.position;
    const fwd = new THREE.Vector3(Math.sin(u.yaw), 0, Math.cos(u.yaw));
    const start = pos.clone();
    const lunge = (d: number) => {
      pos.x = start.x + fwd.x * d;
      pos.z = start.z + fwd.z * d;
    };
    const easeOut = (t: number) => 1 - (1 - t) * (1 - t);
    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
    const lerp = THREE.MathUtils.lerp;
    const P = KICK_POSES;
    // a perna fica só com as poses: quem estava agachado na cobertura (ou andando) volta ao `idle`
    u.rig?.play('idle', 0.15);
    try {
      // 1. o pé sai do chão e o joelho sobe direto até o peito (passando por `lift`, sem recuar);
      // a perna sai do `idle` para a pose logo no começo da subida
      let held: Promise<void> | undefined;
      await this.sceneTween(340, (t) => {
        const e = easeOut(t);
        if (e < 0.45) mix(rest, P.lift, e / 0.45);
        else mix(P.lift, P.chamber, (e - 0.45) / 0.55);
        leg.weight = easeOut(Math.min(1, t / 0.2));
        u.hop = -0.03 * e;
        // no meio do gesto a cena desacelera e a tela rola o d20
        if (!held && t >= 0.45 && opts.onSlow) {
          this.setSceneSlowmo(true);
          held = Promise.resolve(opts.onSlow());
        }
      });
      leg.weight = 1;
      // 2. segura o joelho no peito no slow até o d20 parar: sobe mais um pouco, o corpo pende para trás
      if (held) {
        let done = false;
        void held.then(() => (done = true));
        const t0 = performance.now();
        await new Promise<void>((resolve) => {
          const step = (now: number) => {
            if (this.disposed || done) return resolve();
            const p = Math.min(1, (now - t0) / 900);
            mix(P.chamber, P.coil, easeInOut(p));
            // tremidinha de quem está com a perna no ar, carregando o golpe
            pose.thighL += Math.sin(now / 55) * 0.012 * p;
            u.hop = -0.03 - 0.01 * p;
            requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
        await held;
        this.setSceneSlowmo(false);
      }
      // 3. a perna estica reto para a frente, rápido, e a sola bate na porta com o corpo atrás
      const from = { ...cur };
      const hop0 = u.hop;
      await this.tween(110, (t) => {
        const e = t * t;
        mix(from, P.strike, e);
        u.hop = lerp(hop0, -0.02, e);
        lunge(0.12 * e);
      });
      opts.onImpact();
      // 4. a porta cede (a perna atravessa) ou aguenta (a perna recolhe, o corpo volta)
      const hit = opts.through ? P.through : P.recoil;
      await this.tween(180, (t) => {
        const e = easeOut(t);
        mix(P.strike, hit, e);
        lunge(opts.through ? 0.12 + 0.2 * e : 0.12 * (1 - e));
      });
      // 5. o pé desce e volta à base (a perna devolvida ao `idle` no fim da descida)
      const end = { ...cur };
      const endAt = opts.through ? 0.32 : 0;
      const hop = u.hop;
      await this.tween(420, (t) => {
        const e = easeInOut(t);
        mix(end, rest, e);
        leg.weight = 1 - easeInOut(Math.max(0, (t - 0.4) / 0.6));
        u.hop = hop * (1 - e);
        lunge(endAt * (1 - e));
      });
    } finally {
      this.setSceneSlowmo(false);
      Object.assign(pose, restPose());
      Object.assign(leg, restLeg());
      u.hop = 0;
      lunge(0);
      u.rig?.play(this.restClip(u), 0.3);
    }
  }

  /** Posição na tela (px, relativa ao canvas) de um ponto acima da cabeça do inimigo; `null` longe da tela. */
  enemyHeadOnScreen(id: string): { x: number; y: number } | null {
    const e = this.enemies.get(id);
    if (!e || !e.group.visible) return null;
    const p = e.group.position.clone();
    p.y = e.signY + 0.15;
    p.project(this.camera);
    // um pouco fora do quadro (a cabeça acima da borda na cena da porta) ainda conta: o balão
    // fica preso dentro da tela
    if (p.z > 1 || Math.abs(p.x) > 1.4 || Math.abs(p.y) > 1.6) return null;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const clamp = THREE.MathUtils.clamp;
    return { x: clamp(((p.x + 1) / 2) * w, 90, w - 90), y: clamp(((1 - p.y) / 2) * h, 70, h - 10) };
  }

  /** Ponto do mundo na tela (px do canvas), sem prender à borda; `null` atrás da câmera. */
  private worldOnScreen(x: number, y: number, z: number): { x: number; y: number } | null {
    const p = new THREE.Vector3(x, y, z).project(this.camera);
    if (p.z > 1) return null;
    return { x: ((p.x + 1) / 2) * this.canvas.clientWidth, y: ((1 - p.y) / 2) * this.canvas.clientHeight };
  }

  /**
   * Meio do corpo de uma peça (suspeito ou agente) na tela, em px do canvas, sem prender à borda
   * (o tablet do auto de abordagem rabisca por cima dele); `null` se não há peça ou está atrás da câmera.
   */
  pieceOnScreen(id: string): { x: number; y: number } | null {
    const e = this.enemies.get(id);
    if (e) {
      const p = e.group.position;
      return this.worldOnScreen(p.x, p.y + Math.max(0.3, (e.signY - 0.45) * 0.5), p.z);
    }
    const u = this.units.get(id);
    if (u) {
      const p = u.group.position;
      return this.worldOnScreen(p.x, p.y + 0.5, p.z);
    }
    return null;
  }

  /** Alcance da abordagem (`radius` hexágonos em volta de `center`), no chão, projetado na tela. */
  groundRingOnScreen(center: HexCoord, radius: number, steps = 64): { x: number; y: number }[] {
    const c = hexToWorld(center, HEX_SIZE);
    const r = (radius + 0.5) * HEX_STEP * HEX_SIZE;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const p = this.worldOnScreen(c.x + Math.cos(a) * r, BASE_TOP, c.z + Math.sin(a) * r);
      if (p) pts.push(p);
    }
    return pts;
  }

  /**
   * Balão de fala sobre a cabeça do inimigo (bilhete de papel com letra de caneta, como a HUD),
   * desenhado na cena: acompanha a cabeça e fica por cima de tudo. Some depois de `ms`.
   */
  speak(enemyId: string, text: string, ms = 3400): void {
    const e = this.enemies.get(enemyId);
    if (!e) return;
    this.silence(enemyId);
    const { texture, aspect } = this.speechTexture(text);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true }));
    const h = 0.8;
    sprite.scale.set(h * aspect, h, 1);
    sprite.center.set(0.5, 0);
    // logo acima do chapéu (o "!" do alerta fica mais alto)
    sprite.position.y = e.signY - 0.25;
    sprite.renderOrder = 11;
    e.group.add(sprite);
    this.speeches.set(enemyId, { sprite, until: this.clock.elapsedTime + ms / 1000 });
  }

  /** Tira o balão de fala do inimigo. */
  silence(enemyId: string): void {
    const sp = this.speeches.get(enemyId);
    if (!sp) return;
    sp.sprite.removeFromParent();
    sp.sprite.material.map?.dispose();
    sp.sprite.material.dispose();
    this.speeches.delete(enemyId);
  }

  /** Bilhete com rabinho e o texto em até duas linhas (Permanent Marker, a letra de caneta da HUD). */
  private speechTexture(text: string): { texture: THREE.Texture; aspect: number } {
    const font = '44px "Permanent Marker", "Comic Sans MS", cursive';
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const lines: string[] = [];
    if (g) {
      g.font = font;
      // quebra em até duas linhas de no máximo ~420 px
      let line = '';
      for (const word of text.split(' ')) {
        const next = line ? `${line} ${word}` : word;
        if (line && g.measureText(next).width > 420) {
          lines.push(line);
          line = word;
        } else line = next;
      }
      lines.push(line);
    }
    const textW = g ? Math.max(...lines.map((l) => g.measureText(l).width)) : 300;
    const pad = 26;
    const lineH = 54;
    const tail = 26;
    c.width = Math.ceil(textW + pad * 2);
    c.height = Math.ceil(lines.length * lineH + pad * 1.4 + tail);
    if (g) {
      const w = c.width;
      const boxH = c.height - tail;
      g.fillStyle = 'rgba(0, 0, 0, 0.35)';
      g.fillRect(6, 8, w - 6, boxH - 8);
      g.fillStyle = '#f7f2e4';
      g.fillRect(0, 0, w - 6, boxH - 8);
      g.beginPath();
      g.moveTo(w / 2 - 14, boxH - 9);
      g.lineTo(w / 2 + 4, boxH - 9);
      g.lineTo(w / 2 - 4, c.height - 2);
      g.closePath();
      g.fill();
      g.fillStyle = '#23201a';
      g.font = font;
      g.textAlign = 'center';
      g.textBaseline = 'top';
      lines.forEach((l, i) => g.fillText(l, (w - 6) / 2, pad * 0.6 + i * lineH));
    }
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    return { texture, aspect: c.width / c.height };
  }

  /** Vira o inimigo para o agente (quem comenta o arrombamento olha para quem chutou). */
  enemyLookAt(enemyId: string, unitId: string): void {
    const e = this.enemies.get(enemyId);
    const u = this.units.get(unitId);
    if (!e || !u) return;
    const d = u.group.position.clone().sub(e.group.position);
    e.facingGoal = Math.atan2(d.z, d.x);
  }

  /**
   * Susto do arrombamento: o inimigo vira para a porta e dá um passo para trás, num pulinho
   * (no tempo da cena: no slow, o passo desacelera junto).
   */
  async enemyFlinch(id: string, door: HexCoord): Promise<void> {
    const e = this.enemies.get(id);
    const center = this.doorViews?.centerOf(hexKey(door)) ?? this.worldOf(door);
    if (!e) return;
    const from = e.group.position.clone();
    const away = from.clone().sub(center).setY(0);
    if (away.lengthSq() < 1e-6) away.set(0, 0, 1);
    away.normalize();
    e.facingGoal = Math.atan2(-away.z, -away.x);
    e.startleAt = this.clock.elapsedTime;
    const epoch = e.epoch;
    await this.sceneTween(300, (t) => {
      if (e.epoch !== epoch) return;
      const k = 1 - (1 - t) ** 3;
      e.group.position.x = from.x + away.x * 0.42 * k;
      e.group.position.z = from.z + away.z * 0.42 * k;
      e.hop = Math.sin(Math.PI * t) * 0.07;
    });
    if (e.epoch === epoch) e.hop = 0;
  }

  /** Liga (ou desliga) o olhar de um lado para o outro do inimigo, a partir de para onde ele olha agora. */
  enemyLookAround(id: string, on: boolean): void {
    const e = this.enemies.get(id);
    if (!e) return;
    // com o clipe `look`, cabeça e tronco giram de verdade; sem ele, o corpo todo vira de leve
    if (e.rig?.has('look')) {
      if (on) {
        e.rig.play('look', 0.3);
        // dois lados no tempo da cena (o loop do clipe é lento: olha, espera, olha)
        e.rig.setTimeScale('look', 2.2);
      } else if (e.rig.isPlaying('look')) e.rig.play(this.enemyRestClip(e), 0.3);
      return;
    }
    if (on) e.scan ??= { base: e.facingGoal, phase: 0 };
    else if (e.scan) {
      e.facingGoal = e.scan.base;
      e.scan = undefined;
    }
  }

  /**
   * Resistiu ao arrombamento: vira de costas para a porta e entra em posição de correr (fica
   * assim até a vez dele, quando sai correndo).
   */
  enemyBolt(id: string, door: HexCoord): void {
    const e = this.enemies.get(id);
    if (!e) return;
    const center = this.doorViews?.centerOf(hexKey(door)) ?? this.worldOf(door);
    e.scan = undefined;
    e.facingGoal = Math.atan2(e.group.position.z - center.z, e.group.position.x - center.x);
    e.stance = true;
  }

  /** Anda em linha reta até `to` com um clipe; `backwards` mantém a direção e toca o clipe ao contrário. */
  private async slide(u: UnitView, to: THREE.Vector3, clip: 'walk', speed: number, backwards = false): Promise<void> {
    const from = u.group.position.clone();
    const dist = Math.hypot(to.x - from.x, to.z - from.z);
    if (dist < 0.02) return;
    const rig = u.rig;
    rig?.play(clip, 0.2);
    rig?.setTimeScale(clip, backwards ? -1 : 1);
    await this.tween((dist / speed) * 1000, (t) => {
      u.group.position.x = from.x + (to.x - from.x) * t;
      u.group.position.z = from.z + (to.z - from.z) * t;
    });
    rig?.setTimeScale(clip, 1);
    rig?.play(this.restClip(u), 0.25);
  }

  /** Anima de 0 a 1 em `ms` (para na hora se o tabuleiro for desmontado). */
  private tween(ms: number, fn: (t: number) => void): Promise<void> {
    const start = performance.now();
    return new Promise((resolve) => {
      const step = (now: number) => {
        const t = this.disposed || ms <= 0 ? 1 : Math.min(1, (now - start) / ms);
        fn(t);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /**
   * Mistura a câmera com a da cena da porta (ver `focusDoor`), como a inspeção: ajusta a
   * posição e `look`, desloca a vista para a esquerda das fichas e devolve a distância.
   */
  /**
   * Liga ou desliga (`null`) a câmera de perseguição. Ela olha para o inimigo `enemyId`; sem
   * ele, para o ponto médio dos hexágonos de `lookAt` (a escolha entre dois que fogem).
   */
  setChaseCamera(unitId: string | null, enemyId?: string, lookAt?: readonly HexCoord[]): void {
    const u = unitId ? this.units.get(unitId) : undefined;
    if (unitId && u && (enemyId || lookAt?.length)) {
      const e = enemyId ? this.enemies.get(enemyId) : undefined;
      const look = lookAt?.length
        ? lookAt.reduce((acc, h) => acc.add(this.worldOf(h)), new THREE.Vector3()).divideScalar(lookAt.length)
        : undefined;
      const toward = e ? e.group.position : look;
      // começa olhando para lá, sem girar do nada; na escolha, o agente também vira para eles
      if (toward) this.chaseDir.copy(toward).sub(u.group.position).setY(0).normalize();
      if (look && this.chaseDir.lengthSq() > 0) u.yaw = Math.atan2(this.chaseDir.x, this.chaseDir.z);
      this.chase = this.chaseLast = { unitId, enemyId, look };
    } else {
      this.chase = null;
      this.slowmoGoal = this.slowmo = 0;
      // a câmera de sempre volta para quem perseguiu
      if (this.chaseLast) {
        const u = this.units.get(this.chaseLast.unitId);
        if (u) this.camGoal.copy(this.worldOf(u.hex));
      }
    }
  }

  /**
   * Slow da perseguição: `true` desacelera o agente e o inimigo (animação e passos caem para
   * `CHASE_SLOWMO.rate`, como a fita da música) e a câmera fecha um pouco; `false` volta rápido
   * e abre a câmera. Quem decide quando é a tela (a escolha de alvo e a iniciativa que vem dela).
   */
  setChaseSlowmo(on: boolean): void {
    this.slowmoGoal = on ? 1 : 0;
  }

  /**
   * Fim da corrida: os dois param nos hexágonos dados (encaixam no centro), no repouso, e o
   * agente encara quem perseguiu.
   */
  endChaseRun(unitId: string, unitHex: HexCoord, enemyId: string, enemyHex: HexCoord): void {
    const u = this.units.get(unitId);
    const e = this.enemies.get(enemyId);
    for (const m of [u, e]) {
      if (!m) continue;
      m.epoch++;
      m.hop = 0;
      m.group.rotation.z = m.group.rotation.x = 0;
    }
    if (u) {
      u.hex = { ...unitHex };
      const p = this.worldOf(unitHex);
      u.group.position.x = p.x;
      u.group.position.z = p.z;
      u.rig?.play(this.restClip(u), 0.3);
    }
    if (e) {
      e.hex = { ...enemyHex };
      const p = this.worldOf(enemyHex);
      e.group.position.x = p.x;
      e.group.position.z = p.z;
      e.running = false;
      e.rig?.play(this.enemyRestClip(e), 0.3);
    }
    if (u && e) {
      const d = e.group.position.clone().sub(u.group.position);
      if (d.lengthSq() > 0.01) u.yaw = Math.atan2(d.x, d.z);
    }
  }

  /** Velocidade da animação de `id` agora: só quem está na perseguição desacelera. */
  private animRate(id: string): number {
    const scene = this.sceneRate();
    const c = this.chaseLast;
    if (!c || (c.unitId !== id && c.enemyId !== id)) return scene;
    return Math.min(scene, slowmoRate(this.slowmo));
  }

  // ---------- Modo Corrida ----------

  /**
   * Céu de fundo. Sem ele, num tabuleiro transparente, o que não foi desenhado deixa ver o
   * tabuleiro de baixo (a virada do Modo Corrida).
   */
  setBackdrop(on: boolean): void {
    this.scene.background = on ? new THREE.Color(COLORS.background) : null;
  }

  /** Liga e desliga o desenho (o tabuleiro tático dorme enquanto a corrida cobre a tela). */
  setRendering(on: boolean): void {
    this.rendering = on;
  }

  /**
   * A virada do Modo Corrida: uma onda reta que sai de `origin` na direção `dir` e está a `front`
   * (mundo) dele. `sai`: o tabuleiro que vai embora — até a onda, nada (recortado); logo depois
   * dela, os hexágonos ficam de pé, virando; longe, no lugar. `entra`: o que chega — até a onda,
   * no lugar; logo antes dela, virando; depois, nada. Os dois, um por cima do outro com a mesma
   * câmera, trocam o mapa na frente do agente. `null` desfaz.
   */
  setFlip(f: { origin: { x: number; z: number }; dir: { x: number; z: number }; front: number; mode: 'sai' | 'entra' } | null): void {
    const field = this.field;
    if (!f) {
      this.renderer.clippingPlanes = [];
      for (const t of field.list) field.setTilt(t, 0);
      return;
    }
    const n = new THREE.Vector3(f.dir.x, 0, f.dir.z).normalize();
    field.tiltAxis.set(n.z, 0, -n.x);
    const o = n.x * f.origin.x + n.z * f.origin.z;
    const w = RUNNER_FLIP.width;
    this.renderer.clippingPlanes = [
      f.mode === 'sai' ? new THREE.Plane(n.clone(), -o - f.front) : new THREE.Plane(n.clone().negate(), o + f.front),
    ];
    for (const t of field.list) {
      const s = n.x * t.x + n.z * t.z - o;
      const a =
        f.mode === 'sai'
          ? s < f.front ? TILT_HIDDEN : s > f.front + w ? 0 : (1 - (s - f.front) / w) * (Math.PI / 2)
          : s > f.front ? TILT_HIDDEN : s < f.front - w ? 0 : ((s - (f.front - w)) / w) * (Math.PI / 2);
      field.setTilt(t, a);
    }
  }

  /** A câmera de perseguição já encostada (sem a descida): o mapa de corrida nasce assim. */
  snapChaseCamera(): void {
    if (this.chase) this.chaseBlend = 1;
    const u = this.chase && this.units.get(this.chase.unitId);
    if (u && this.chaseFollow) this.chaseDir.set(Math.sin(u.yaw), 0, Math.cos(u.yaw));
  }

  /**
   * A câmera de perseguição olha para onde o agente corre (e não para o inimigo): no Modo Corrida,
   * com curvas, o inimigo some atrás da esquina e a câmera não pode olhar através da parede.
   */
  setChaseFollow(on: boolean): void {
    this.chaseFollow = on;
  }

  /**
   * Põe um corredor do Modo Corrida (ver `runner.ts`): no ponto do mundo, virado para o norte,
   * com a altura do pulo (`hop`) e o clipe. `lean` inclina o corpo (tropeço); `runAnim` é a
   * velocidade do clipe de corrida. O agente leva a câmera e o raio carregado junto.
   */
  runnerPose(
    who: 'unit' | 'enemy',
    id: string,
    pose: {
      x: number;
      z: number;
      yaw: number;
      hop: number;
      /** Clipe em loop (e o de reserva, se o gesto não tem animação). */
      clip: ClipName;
      /** Gesto percorrido no tempo da regra: pulo, deslize, tropeço (`CharacterRig.scrub`). */
      gesture?: { clip: ClipName; t: number };
      /** Inclinação para o lado (rad) quando o gesto não tem animação. */
      lean?: number;
      /** Inclinação para dentro da curva (rad), o "drift": soma com tudo. */
      bank?: number;
      /** Velocidade do clipe em loop. */
      runAnim?: number;
    },
  ): void {
    const m = who === 'unit' ? this.units.get(id) : this.enemies.get(id);
    if (!m) return;
    m.group.position.x = pose.x;
    m.group.position.z = pose.z;
    m.hop = pose.hop;
    const animated = !!pose.gesture && !!m.rig?.scrub(pose.gesture.clip, pose.gesture.t);
    m.group.rotation.z = (animated ? 0 : (pose.lean ?? 0)) + (pose.bank ?? 0);
    if (!animated) {
      m.rig?.setTimeScale(pose.clip, pose.runAnim ?? 1);
      m.rig?.play(pose.clip, 0.12);
    }
    const hex = worldToHex(pose.x, pose.z, HEX_SIZE);
    m.hex = hex;
    // na corrida, de frente para onde o caminho vai (a curva já vem suave do caminho)
    if (who === 'unit') {
      m.group.rotation.y = pose.yaw;
      (m as UnitView).yaw = pose.yaw;
      this.camGoal.set(pose.x, 0, pose.z);
      this.camTarget.copy(this.camGoal);
    } else {
      const e = m as EnemyView;
      // o garimpeiro mede o ângulo no chão como atan2(dz, dx) (o modelo dele já vem girado 90°
      // dentro do grupo) e o grupo gira para −facing; o caminho mede como atan2(dx, dz). O grupo
      // gira aqui mesmo, para nenhum quadro sair com o ângulo do caminho (ele de lado)
      e.facing = e.facingGoal = Math.atan2(Math.cos(pose.yaw), Math.sin(pose.yaw));
      e.group.rotation.y = -e.facing;
      // na corrida ele nunca para: pintar o estado não pode trocar o clipe por cima do gesto
      e.running = true;
    }
  }

  /** Objetos soltos na cena (os do mapa de corrida, ver `runner-props.ts`). */
  addProps(objects: readonly THREE.Object3D[]): void {
    for (const o of objects) this.scene.add(o);
  }

  /**
   * O avião do mapa: centro em `x` (mundo) e afundado `sink` (pousado de barriga, nivelado: o
   * trem de pouso some sob o piso).
   */
  posePlane(x: number, z: number, sink: number): void {
    const pl = this.planeModel;
    if (!pl) return;
    pl.updateWorldMatrix(true, false);
    const wp = new THREE.Vector3().setFromMatrixPosition(pl.matrixWorld);
    pl.position.x += x - wp.x;
    pl.position.z += z - wp.z;
    pl.rotation.z = 0;
    pl.position.y = -sink;
  }

  /** Vira o agente para o inimigo (a "cabeça" da escolha de alvo). */
  faceEnemy(unitId: string, enemyId: string): void {
    const u = this.units.get(unitId);
    const e = this.enemies.get(enemyId);
    if (!u || !e) return;
    const d = e.group.position.clone().sub(u.group.position);
    if (d.lengthSq() > 0.01) u.yaw = Math.atan2(d.x, d.z);
  }

  private blendChase(dt: number, look: THREE.Vector3, dist: number): number {
    const goal = this.chase ? 1 : 0;
    // ~0,8 s para descer ou subir
    this.chaseBlend += (goal - this.chaseBlend) * (1 - Math.exp(-dt * 3.6));
    if (Math.abs(goal - this.chaseBlend) < 0.002) this.chaseBlend = goal;
    const c = this.chase ?? this.chaseLast;
    // o zoom do slow acompanha a fita: mesma rampa, mesma proporção (sem ele em "menos movimento")
    const zoomRate = reducedMotionQuery() ? 1 : slowmoRate(Math.max(this.slowmo, this.sceneSlow));
    const fov = slowmoFov(40 + CHASE_CAMERA.fovBoost * this.chaseBlend, zoomRate);
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    const u = c && this.units.get(c.unitId);
    if (!c || !u || this.chaseBlend <= 0) return dist;
    const e = c.enemyId ? this.enemies.get(c.enemyId) : undefined;
    // olha para ele (ou para o ponto escolhido, ou para onde o agente corre); suave, para o
    // zigue-zague do grid não balançar
    const want = this.chaseFollow
      ? new THREE.Vector3(Math.sin(u.yaw), 0, Math.cos(u.yaw))
      : e && !e.gone
      ? e.group.position.clone().sub(u.group.position).setY(0)
      : c.look
        ? c.look.clone().sub(u.group.position).setY(0)
        : new THREE.Vector3(Math.sin(u.yaw), 0, Math.cos(u.yaw));
    if (want.lengthSq() > 0.01) this.chaseDir.lerp(want.normalize(), 1 - Math.exp(-dt * 3)).normalize();
    const portrait = this.camera.aspect < 1;
    const back = portrait ? CHASE_CAMERA.portraitBack : CHASE_CAMERA.back;
    const height = portrait ? CHASE_CAMERA.portraitHeight : CHASE_CAMERA.height;
    const p = u.group.position;
    // um pouco para a direita do agente: ele fica à esquerda e o inimigo aparece ao lado dele
    const right = new THREE.Vector3(-this.chaseDir.z, 0, this.chaseDir.x);
    const pos = new THREE.Vector3(p.x, height, p.z)
      .addScaledVector(this.chaseDir, -back)
      .addScaledVector(right, CHASE_CAMERA.side);
    const target = new THREE.Vector3(p.x, CHASE_CAMERA.aimHeight, p.z)
      .addScaledVector(this.chaseDir, CHASE_CAMERA.aim)
      .addScaledVector(right, CHASE_CAMERA.side * 0.3);
    const k = this.chaseBlend * this.chaseBlend * (3 - 2 * this.chaseBlend);
    this.camera.position.lerp(pos, k);
    look.lerp(target, k);
    return THREE.MathUtils.lerp(dist, back + CHASE_CAMERA.aim, k);
  }

  private blendCine(dt: number, look: THREE.Vector3, dist: number): number {
    const goal = this.cine ? 1 : 0;
    this.cineBlend += (goal - this.cineBlend) * (1 - Math.exp(-dt * 5));
    if (Math.abs(goal - this.cineBlend) < 0.002) this.cineBlend = goal;
    this.cineRollNow = 0;
    // zoom na porta / inclinação para quem reage: persegue o pedido devagar (~0,6 s)
    const g = this.cineAimGoal;
    const a = this.cineAim;
    const ka = 1 - Math.exp(-dt * 3.4);
    if (g.point) {
      if (a.mix < 0.01) a.point.copy(g.point);
      else a.point.lerp(g.point, ka);
    }
    a.mix += ((g.point ? g.mix : 0) - a.mix) * ka;
    a.zoom += (g.zoom - a.zoom) * ka;
    a.yaw += (g.yaw - a.yaw) * ka;
    a.roll += (g.roll - a.roll) * ka;
    const c = this.cine ?? this.cineLast;
    if (!c || this.cineBlend <= 0) return dist;
    const e = this.cineBlend * this.cineBlend * (3 - 2 * this.cineBlend);
    const portrait = this.camera.aspect < 1 ? 1 / Math.max(this.camera.aspect, 0.45) : 1;
    // perto o bastante para ver o chute, longe o bastante para caber quem está do outro lado
    // da porta (e o balão de fala sobre a cabeça dele)
    this.cineZoom += (c.zoom - this.cineZoom) * (1 - Math.exp(-dt * 2.5));
    const near = 8.8 * Math.min(portrait, 2.1) * this.cineZoom * a.zoom;
    const pitch = THREE.MathUtils.degToRad(31);
    const target = a.mix > 0.001 ? c.target.clone().lerp(a.point, a.mix) : c.target;
    const dir = Math.abs(a.yaw) > 1e-4 ? yawTurn(c.dir, a.yaw) : c.dir;
    const pos = target
      .clone()
      .addScaledVector(dir, Math.cos(pitch) * near)
      .setY(target.y + Math.sin(pitch) * near);
    this.camera.position.lerp(pos, e);
    look.lerp(target, e);
    this.cineRollNow = a.roll * e;
    this.viewShift.x += c.offsetPx * e;
    return THREE.MathUtils.lerp(dist, near, e);
  }


  dispose(): void {
    this.disposed = true;
    this.clearAimFx();
    cancelAnimationFrame(this.frameId);
    for (const u of [...this.units.values(), ...this.enemies.values()]) u.rig?.dispose();
    this.resizeObserver.disconnect();
    this.unbindInput();
    this.stream.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.staticShadow.dispose();
    this.auraTextures.fill.dispose();
    this.auraTextures.fade.dispose();
    this.setSpotlight(null);
    this.spotlight.dispose();
    this.targetOutline.dispose();
    this.warmLabel.material.map?.dispose();
    this.warmLabel.material.dispose();
    this.renderer.dispose();
  }

  // ---------- construção da cena ----------

  private setupLights(): void {
    this.scene.add(new THREE.HemisphereLight(0xdff4ff, 0x1a3a44, 1.6));
    // o sol acompanha a câmera: a sombra cobre só a região em volta do centro da tela
    const sun = this.sun;
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    // cobre 30 em volta do centro da tela mesmo com o quadro atrasado meio salto
    const ext = 30 * HEX_SIZE + SHADOW_STEP / 2;
    Object.assign(sun.shadow.camera, { left: -ext, right: ext, top: ext, bottom: -ext, near: 1, far: 70 });
    this.scene.add(sun, sun.target);
  }

  private buildBoard(): void {
    const geo = new THREE.CylinderGeometry(HEX_SIZE * HEX_GAP, HEX_SIZE * HEX_GAP, HEX_HEIGHT, 6);
    geo.rotateY(Math.PI / 6); // vértice apontando para +X → hexágono "flat-top"
    geo.translate(0, -HEX_HEIGHT / 2, 0); // topo em y = 0
    const palette = [COLORS.hexA, COLORS.hexB, COLORS.hexC];
    const trees = new Set((this.map.trees ?? []).map(hexKey));
    this.field = new TileField(
      this.area.hexes,
      geo,
      HEX_SIZE,
      (coord) => {
        const ground = this.map.ground?.get(hexKey(coord));
        return trees.has(hexKey(coord)) ? forestFloor(coord) : (ground ? GROUND[ground] : palette)[tone(coord)];
      },
      new THREE.LineBasicMaterial({ color: COLORS.outline }),
    );
    this.scene.add(this.field.root);
    this.buildRunwayMarks();
    this.buildDirtTrack();

    const last = hexToWorld({ col: this.map.cols - 1, row: this.map.rows - 1 }, HEX_SIZE);
    Object.assign(this.bounds, { minX: 0, maxX: last.x, minZ: 0, maxZ: last.z + HEX_SIZE });
    const { mission, world } = this.map;
    if (mission && world) {
      const c = hexToWorld(mission.center, HEX_SIZE);
      this.worldBounds = { x: c.x, z: c.z, r: world.radius * HEX_STEP * HEX_SIZE };
    }

    // "mesa" escura sob o tabuleiro; no mundo aberto, o chão "low poly" além do raio
    // carregado (acompanha o centro de carregamento, ver `applyStreamVisibility`)
    const c = this.boardCenter();
    const span = this.worldBounds ? 1 : Math.max(last.x, last.z) + 30;
    const base = new THREE.Mesh(
      new THREE.CircleGeometry(span, 48),
      new THREE.MeshStandardMaterial({ color: this.worldBounds ? COLORS.farGround : 0x1f2f19, roughness: 1 }),
    );
    base.rotation.x = -Math.PI / 2;
    base.position.set(c.x, -HEX_HEIGHT - 0.01, c.z);
    base.receiveShadow = true;
    this.scene.add(base);
    if (this.worldBounds) this.farGround = base;
  }

  /**
   * Blocos do mundo (chão de cenário e toda a mata, inclusive a de dentro da missão),
   * montados só dentro do raio carregado.
   */
  private buildStream(): WorldStream {
    const { map } = this;
    const trees = new Set((map.trees ?? []).map(hexKey));
    const wb = this.worldBounds;
    const terrain = (h: HexCoord): Terrain | null => {
      if (wb) {
        const p = hexToWorld(h, HEX_SIZE);
        if (Math.hypot(p.x - wb.x, p.z - wb.z) > wb.r) return null;
        return map.world!.terrain(h);
      }
      // mapa sem mundo: só o retângulo (o chão é todo da missão; aqui entram as árvores)
      if (h.col < 0 || h.row < 0 || h.col >= map.cols || h.row >= map.rows) return null;
      return { ground: map.ground?.get(hexKey(h)) ?? 'grass', tree: trees.has(hexKey(h)) };
    };
    let box = { minCol: 0, maxCol: map.cols - 1, minRow: 0, maxRow: map.rows - 1 };
    if (wb && map.mission) {
      const span = Math.ceil(map.world!.radius * 1.2) + 1;
      const c = map.mission.center;
      box = { minCol: c.col - span, maxCol: c.col + span, minRow: c.row - span, maxRow: c.row + span };
    }
    const stream = new WorldStream({
      hexSize: HEX_SIZE,
      prism: this.field.prism,
      outline: new THREE.LineBasicMaterial({ color: COLORS.outline }),
      terrain,
      isMission: (h) => this.tiles.has(hexKey(h)),
      box,
      // fora da missão o chão fica um pouco mais escuro: a área jogável se destaca
      groundColor: (h, t) => dim(t.tree ? forestFloor(h) : GROUND[t.ground][tone(h)]),
      ruts: this.ruts,
    });
    stream.onRecenter = () => this.applyStreamVisibility();
    this.scene.add(stream.root);
    return stream;
  }

  /** Mostra só o que está dentro do raio carregado: hexágonos da missão, hangar, avião. */
  private applyStreamVisibility(): void {
    const s = this.stream;
    for (const tile of this.field.list) this.field.setVisible(tile, s.inLoadRadius(tile.x, tile.z));
    for (const sc of this.scenery) sc.object.visible = s.inLoadRadius(sc.center.x, sc.center.z, sc.radius / (HEX_STEP * HEX_SIZE));
    if (this.farGround) {
      this.farGround.position.x = s.center.x;
      this.farGround.position.z = s.center.z;
      const r = (this.profile.loadRadius + this.profile.viewRadius) * HEX_STEP * HEX_SIZE * 1.5;
      this.farGround.scale.setScalar(r);
    }
  }

  private applyProfile(profile: RenderProfile): void {
    this.profile = profile;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.maxPixelRatio));
    this.sun.castShadow = profile.shadows;
    this.stream?.setRadii(profile.loadRadius, profile.viewRadius);
    this.setZoom(this.zoom);
    this.resize();
    // tamanho da tela e sombras mudaram: o destaque aquece de novo
    this.spotWarmDue = true;
  }

  /** Camadas de luz das auras, na ordem em que se empilham (a de baixo primeiro). */
  private buildAuraLayers(): Record<keyof typeof AURAS, AuraLayer> {
    const order: (keyof typeof AURAS)[] = ['reach', 'vision', 'talkMuted', 'burn', 'talk', 'burnHot', 'talkHot', 'reachOver'];
    const layers = {} as Record<keyof typeof AURAS, AuraLayer>;
    order.forEach((name, i) => {
      const layer = new AuraLayer(AURAS[name], this.auraTextures, 6 + i * 3);
      this.scene.add(layer.root);
      layers[name] = layer;
    });
    return layers;
  }

  /**
   * Redistribui os hexágonos entre as camadas de luz. As camadas somam: um hexágono do alcance
   * que também está numa aura interativa fica com o véu dela e, por cima, um hexágono azul menor
   * (`reachOver`); o contorno azul continua passando por fora de tudo (e por fora dos aliados, em
   * vez de abrir um buraco em volta deles).
   */
  private refreshAuras(): void {
    const known = (keys: Iterable<string>) => [...keys].filter((k) => this.tiles.has(k));
    const burn = splitHot(known(this.actionAura), this.actionHot);
    const talk = splitHot(known(this.interrogationAura), this.interrogationHot);
    const covered = new Set([...this.actionAura, ...this.interrogationAura]);
    const reach = known(this.reachable);
    const occupied = [...this.units.values()].map((u) => hexKey(u.hex));
    this.auras.reach.set(
      reach.filter((k) => !covered.has(k)),
      reach.length ? [...occupied, ...reach.filter((k) => covered.has(k))] : [],
    );
    // o alcance que cai numa aura de ação não some: ganha o hexágono azul menor por cima dela
    this.auras.reachOver.set(reach.filter((k) => covered.has(k)));
    this.auras.vision.set(known(this.vision));
    this.auras.talkMuted.set(known(this.interrogationMuted));
    this.auras.burn.set(burn.cold);
    this.auras.burnHot.set(burn.hot);
    this.auras.talk.set(talk.cold);
    this.auras.talkHot.set(talk.hot);
  }

  /**
   * Aura verde-clara em volta da área da missão: uma cortina de luz que some para cima,
   * com uma faixa acesa no chão, marcando até onde se joga.
   */
  private buildAura(): void {
    const mission = this.map.mission;
    if (!mission) return;
    const c = hexToWorld(mission.center, HEX_SIZE);
    // passa por fora dos hexágonos da borda (centro a até `radius` passos + meio hexágono)
    const r = mission.radius * HEX_STEP * HEX_SIZE + HEX_SIZE * 0.95;
    const fade = document.createElement('canvas');
    fade.width = 4;
    fade.height = 128;
    const g = fade.getContext('2d');
    if (g) {
      const grad = g.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, '#000');
      grad.addColorStop(0.65, '#444');
      grad.addColorStop(1, '#fff');
      g.fillStyle = grad;
      g.fillRect(0, 0, 4, 128);
    }
    const alphaMap = new THREE.CanvasTexture(fade);
    const height = 2.2;
    const wall = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, height, 256, 1, true),
      new THREE.MeshBasicMaterial({
        color: COLORS.aura, alphaMap, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      }),
    );
    wall.position.set(c.x, height / 2 - 0.05, c.z);
    wall.renderOrder = 5;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.35, r + 0.2, 256),
      new THREE.MeshBasicMaterial({
        color: COLORS.aura, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(c.x, 0.03, c.z);
    ring.renderOrder = 5;
    this.scene.add(wall, ring);
    this.aura = { wall, ring };
  }

  private buildWalls(walls: HexCoord[]): void {
    if (!walls.length) return;
    const r = HEX_SIZE * HEX_GAP * 0.92;
    const geo = new THREE.CylinderGeometry(r * 0.9, r, WALL_HEIGHT, 6);
    geo.rotateY(Math.PI / 6);
    geo.translate(0, WALL_HEIGHT / 2, 0);
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({ color: COLORS.outline });
    const mats = [
      new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: COLORS.wallTop, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: COLORS.wall, roughness: 0.95 }),
    ];
    const wallKeys = new Set(walls.map(hexKey));
    const doorKeys = new Set((this.map.doors ?? []).map(hexKey));
    const split = new Set<string>();
    for (const { kind, rect, windows } of this.map.structures ?? []) {
      const built = kind === 'hangar' ? buildHangar(rect, wallKeys, HEX_SIZE) : buildHouse(rect, wallKeys, HEX_SIZE, doorKeys, windows);
      if (kind === 'house') {
        const nodes = [...walls, ...(this.map.doors ?? [])].filter((h) => inStructure(h, rect));
        for (const k of this.splitHouseFloor(rect, nodes)) split.add(k);
      }
      const roof = built.getObjectByName(kind === 'hangar' ? HANGAR_ROOF : HOUSE_ROOF);
      const lamps = built.getObjectByName(HANGAR_INTERIOR);
      this.structures.push({ kind, rect, doors: doorsOf(this.map, rect), object: built, roof, interior: lamps ? [lamps] : [] });
      const shell: THREE.Mesh[] = [];
      roof?.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh) return;
        this.roofMeshes.push({ mesh: o, roof });
        shell.push(o as THREE.Mesh);
      });
      for (const child of built.children) {
        if (child === roof || child === lamps) continue;
        child.traverse((o) => {
          if (!(o as THREE.Mesh).isMesh) return;
          this.wallMeshes.push(o);
          shell.push(o as THREE.Mesh);
        });
      }
      // cópias que tapam o contorno enquanto o telhado está no lugar (filhas das peças)
      for (const mesh of roof ? shell : []) {
        const copy = new THREE.Mesh(mesh.geometry, this.targetOutline.occluder);
        copy.layers.set(OUTLINE_LAYER);
        copy.castShadow = copy.receiveShadow = false;
        // antes dos alvos na máscara: a profundidade já está lá quando eles são desenhados
        copy.renderOrder = -10;
        copy.userData['outline'] = true;
        mesh.add(copy);
        this.shellOccluders.push({ copy, mesh, roof: roof! });
      }
      this.addScenery(built);
    }
    const common = commonDoors(this.map.doors ?? []);
    if (common.length && this.structures.length) {
      this.doorViews = new DoorViews(common, this.structures.map((st) => st.rect), HEX_SIZE);
      this.scene.add(this.doorViews.group);
    }
    const inHangar = (h: HexCoord): boolean => this.structures.some((st) => inStructure(h, st.rect));
    for (const h of walls) {
      const tile = this.tiles.get(hexKey(h));
      if (!tile) continue;
      if (!split.has(hexKey(h))) tile.baseColor.set(0x3b4a50);
      if (inHangar(h)) continue; // a parede da estrutura é desenhada inteira, não por hexágono
      const wall = new THREE.Mesh(geo, mats);
      wall.castShadow = true;
      wall.receiveShadow = true;
      wall.add(new THREE.LineSegments(edges, lineMat));
      // um pouco de variação de altura para parecer pedra/tronco
      wall.scale.y = 0.85 + ((h.col * 13 + h.row * 7) % 5) * 0.07;
      this.field.attach(tile, wall);
    }
  }

  /**
   * Piso dos hexágonos de parede da casa: a parede (reta) corta cada um deles, então o hexágono
   * fica com o chão do entorno (a cor dele) e, por cima, a parte de dentro com o piso da casa
   * (ver `wallFloorShape`). Os recortes se repetem: meio a meio nas laterais, faixas de 1/4 e
   * 3/4 no fundo e na frente, as quinas nos cantos. As portas e as divisórias ficam inteiras
   * de piso. Devolve os hexágonos pintados.
   */
  private splitHouseFloor(rect: HexRect, nodes: readonly HexCoord[]): string[] {
    const done: string[] = [];
    const shapes = new Map<string, THREE.BufferGeometry>();
    const material = new THREE.MeshStandardMaterial({ roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const pieces = new Map<THREE.BufferGeometry, { tile: HexTile; local: THREE.Matrix4; color: THREE.Color }[]>();
    const isDoor = (h: HexCoord) => this.map.doors?.some((d) => sameHex(d, h));
    for (const h of nodes) {
      const tile = this.tiles.get(hexKey(h));
      if (!tile) continue;
      const floor = new THREE.Color(GROUND.floor[tone(h)]);
      const { shape, fraction } = wallFloorShape(h, rect, HEX_SIZE, HEX_SIZE * HEX_GAP * 0.985);
      if (fraction > 0.999 || isDoor(h)) {
        tile.baseColor.copy(floor);
      } else {
        // o chão do entorno: o de um vizinho fora da casa (grama, na clareira)
        const out = hexNeighbors(h).find((n) => !inStructure(n, rect));
        const ground = (out && this.map.ground?.get(hexKey(out))) || 'grass';
        tile.baseColor.set(GROUND[ground === 'floor' ? 'grass' : ground][tone(h)]);
        if (shape.length >= 3) {
          const k = shape.map((p) => `${p.x.toFixed(3)},${p.z.toFixed(3)}`).join(' ');
          let geo = shapes.get(k);
          if (!geo) {
            // leque a partir do primeiro vértice (o recorte é convexo), virado para cima
            const pos: number[] = [];
            for (let i = 1; i + 1 < shape.length; i++) {
              const [a, b, c] = [shape[0], shape[i], shape[i + 1]];
              const up = (b.z - a.z) * (c.x - a.x) - (b.x - a.x) * (c.z - a.z) > 0;
              const [p, q] = up ? [b, c] : [c, b];
              pos.push(a.x, 0, a.z, p.x, 0, p.z, q.x, 0, q.z);
            }
            geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
            geo.computeVertexNormals();
            shapes.set(k, geo);
          }
          const list = pieces.get(geo) ?? [];
          // um pouco acima do topo do hexágono (sem brigar com ele na sombra), dentro do contorno
          list.push({ tile, local: new THREE.Matrix4().makeTranslation(0, 0.006, 0), color: floor });
          pieces.set(geo, list);
        }
      }
      tile.color.copy(tile.baseColor);
      this.field.mark(tile);
      done.push(hexKey(h));
    }
    for (const [geo, items] of pieces) this.field.addDecals(geo, material, items);
    return done;
  }

  /** Carga do hangar (cobertura) e decoração solta; cada peça sobe junto com o seu hexágono. */
  private buildCargo(): void {
    for (const c of this.map.cover ?? []) {
      const tile = this.tiles.get(hexKey(c));
      if (!tile) continue;
      tile.baseColor.set(0xa8987a);
      const model = buildCover(c.kind, c.col * 31 + c.row * 17, c.col);
      this.cargoModels.set(hexKey(c), model);
      const prop = model.userData['prop'] as PropInfo | undefined;
      if (prop) this.props.set(hexKey(c), prop);
      this.field.attach(tile, this.housed(c, model));
    }
    for (const h of this.map.props ?? []) {
      const tile = this.tiles.get(hexKey(h));
      if (tile) this.field.attach(tile, this.housed(h, buildFuelProps(h.col * 13 + h.row * 7)));
    }
    const low = new Set((this.map.cover ?? []).filter((c) => COVER_HEIGHT[c.kind] === 'low').map(hexKey));
    for (const key of low) {
      const [col, row] = key.split(',').map(Number);
      for (const n of hexNeighbors({ col, row })) this.crouchSpots.add(hexKey(n));
    }
  }

  /**
   * Parado ao lado de carga baixa, o agente fica agachado atrás dela — mas só se houver
   * um garimpeiro não rendido a até `COVER_THREAT_RANGE` hexágonos, sem parede no meio.
   * Não se abaixa se já foi visto por um inimigo (esconder não adianta mais) nem se há um
   * rendido a até `COVER_SURRENDERED_RANGE` hexágonos de caminho (contornando paredes):
   * está de pé cuidando dele.
   */
  private restClip(u: UnitView): 'idle' | 'crouch' {
    if (!this.crouchSpots.has(hexKey(u.hex)) || this.seenAgents.has(u.id)) return 'idle';
    const walls = this.coverWalls();
    return this.threatNear(u.hex, walls) && !this.surrenderedNear(u.hex, walls) ? 'crouch' : 'idle';
  }

  /** Paredes para a cobertura: as fixas e as portas fechadas. */
  private coverWalls(): ReadonlySet<string> {
    const closed = [...this.doorStates.values()].filter((d) => !isOpen(d)).map((d) => hexKey(d.hex));
    return closed.length ? new Set([...this.sightWalls, ...closed]) : this.sightWalls;
  }

  /** Algum inimigo à vista (não rendido, no tabuleiro) a até `COVER_THREAT_RANGE` hexágonos. */
  private threatNear(hex: HexCoord, walls: ReadonlySet<string>): boolean {
    for (const e of this.enemies.values()) {
      if (e.gone || e.surrendered) continue;
      if (hexDistance(hex, e.hex) <= COVER_THREAT_RANGE && lineOfSight(hex, e.hex, walls)) return true;
    }
    return false;
  }

  /** Algum rendido (no tabuleiro) a até `COVER_SURRENDERED_RANGE` passos, sem atravessar parede. */
  private surrenderedNear(hex: HexCoord, walls: ReadonlySet<string>): boolean {
    const near = [...this.enemies.values()].filter(
      (e) => !e.gone && e.surrendered && hexDistance(hex, e.hex) <= COVER_SURRENDERED_RANGE,
    );
    if (!near.length) return false;
    const reach = reachableHexes(hex, COVER_SURRENDERED_RANGE, this.area, walls);
    return near.some((e) => reach.has(hexKey(e.hex)));
  }

  /**
   * Agentes já avistados por algum inimigo: não se abaixam mais na cobertura. A lista vem
   * inteira (o jogo zera ao recomeçar a partida).
   */
  setSeenAgents(ids: Iterable<string>): void {
    this.seenAgents = new Set(ids);
    this.refreshCover();
  }

  /** Reavalia a pose de quem está parado (a ameaça mudou: rendeu, fugiu, andou, porta). */
  private refreshCover(): void {
    for (const u of this.units.values()) {
      if (!u.rig || this.doorCrouch.has(u.id)) continue;
      if (u.rig.isPlaying('idle') || u.rig.isPlaying('crouch')) u.rig.play(this.restClip(u), 0.35);
    }
  }

  /**
   * Avião estacionado: centrado no retângulo dos hexágonos que ocupa (o desenho tem a forma do
   * avião, então a média puxaria o modelo para o lado da asa), com o nariz para o sul (o portão).
   * O piso debaixo dele fica com a cor do resto do hangar.
   */
  private buildPlane(hexes: HexCoord[]): void {
    if (!hexes.length) return;
    const box = new THREE.Box3();
    for (const h of hexes) box.expandByPoint(this.worldOf(h));
    const plane = buildPlane();
    plane.scale.setScalar(2); // avião com o dobro do tamanho (cabe em 8 × 6 hexágonos, ver `maps.ts`)
    this.planeModel = plane;
    const holder = this.housed(hexes[0], plane);
    holder.position.copy(box.getCenter(new THREE.Vector3()));
    this.addScenery(holder);
  }

  /**
   * Objeto que fica dentro da estrutura: entra na lista do interior e vai embrulhado num
   * grupo, para o "longe demais" não brigar com a visibilidade do raio carregado (que
   * liga e desliga o embrulho). Fora da estrutura, devolve o próprio objeto.
   */
  private housed(hex: HexCoord, object: THREE.Object3D): THREE.Object3D {
    const st = this.structures.find((s) => inStructure(hex, s.rect));
    if (!st) return object;
    st.interior.push(object);
    return new THREE.Group().add(object);
  }

  /**
   * O hexágono fica debaixo de um telhado que está no lugar (nenhum agente dentro da
   * estrutura nem perto de uma porta aberta dela): o jogador não enxerga o que acontece ali.
   */
  isCovered(hex: HexCoord): boolean {
    const agents = [...this.units.values()].map((u) => u.hex);
    return this.structures.some((st) => st.roof && inStructure(hex, st.rect) && structureView(st.rect, agents, this.seeThrough(st.doors)).roof);
  }

  /** Põe o inimigo num hexágono na hora (sem animação), virado para onde ia. */
  jumpEnemy(id: string, hex: HexCoord): void {
    const e = this.enemies.get(id);
    if (!e) return;
    const from = this.worldOf(e.hex);
    const to = this.worldOf(hex);
    e.epoch++;
    e.hop = 0;
    e.hex = { ...hex };
    e.group.position.x = to.x;
    e.group.position.z = to.z;
    if (from.distanceToSquared(to) > 0) e.facing = e.facingGoal = Math.atan2(to.z - from.z, to.x - from.x);
    this.refreshCover();
  }

  /** Teto e interior das estruturas conforme a posição dos agentes (ver `structureView`). */
  private updateStructure(): void {
    if (!this.structures.length) return;
    let key = '';
    for (const u of this.units.values()) key += `${u.hex.col},${u.hex.row};`;
    if (key === this.structureKey) return;
    this.structureKey = key;
    const agents = [...this.units.values()].map((u) => u.hex);
    for (const st of this.structures) {
      const view = structureView(st.rect, agents, this.seeThrough(st.doors));
      if (st.roof) st.roof.visible = view.roof;
      // com o telhado no lugar, o interior nem é desenhado (nada vaza pelas frestas)
      for (const o of st.interior) o.visible = view.interior && (!st.roof || !view.roof);
    }
  }

  /** Portas da estrutura que revelam o interior: só as abertas (e os portões). */
  private seeThrough(doors: readonly HexCoord[]): HexCoord[] {
    return seeThroughDoors(doors, this.doorStates);
  }

  // ---------- fogo (missão: queimar o avião e os suprimentos) ----------

  /**
   * Marca os alvos da missão: um ícone de chama flutua sobre o meio de cada um (visto de
   * longe, através do telhado). Alvos que já queimaram ficam sem ícone.
   */
  setBurnTargets(targets: readonly { id: string; hexes: HexCoord[] }[]): void {
    for (const t of this.targets.values()) this.scene.remove(t.sprite);
    this.targets.clear();
    for (const t of targets) {
      if (!t.hexes.length) continue;
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.targetTexture(), depthTest: false }));
      sprite.scale.set(0.9, 0.9, 1);
      sprite.renderOrder = 10;
      this.scene.add(sprite);
      const center = this.centerOf(t.hexes);
      this.targets.set(t.id, { sprite, center, height: t.hexes.length > 4 ? 3.4 : 2.6 });
    }
  }

  /** Modelos (avião, carga e móveis, folha da porta) que ocupam esses hexágonos. */
  private modelsOn(hexes: readonly HexCoord[]): Set<THREE.Object3D> {
    const models = new Set<THREE.Object3D>();
    const planeKeys = new Set((this.map.plane ?? []).map(hexKey));
    for (const h of hexes) {
      const key = hexKey(h);
      for (const m of this.doorViews?.modelsOf(key) ?? []) models.add(m);
      if (planeKeys.has(key) && this.planeModel) models.add(this.planeModel);
      const cargo = this.cargoModels.get(key);
      if (cargo) models.add(cargo);
    }
    return models;
  }

  /**
   * Alvos que dá para tocar direto (o avião, os suprimentos, as portas fechadas, o quadro de
   * chaves, o móvel com algo percebido): cada peça do modelo ganha uma cópia na camada do
   * contorno, e a silhueta delas ganha um contorno de desenho animado que respira (ver
   * `TargetOutline`). Tocar no modelo chama `onTargetTap`. Alvos que pegam fogo perdem o
   * contorno (ver `ignite`).
   */
  setTargetOutlines(targets: readonly { id: string; hexes: readonly HexCoord[] }[]): void {
    for (const id of [...this.outlined.keys()]) if (!id.startsWith(NPC_TARGET)) this.dropOutline(id);
    for (const t of targets) {
      const models = [...this.modelsOn(t.hexes)];
      if (!models.length) continue;
      const hulls: THREE.Mesh[] = [];
      for (const model of models) {
        model.updateWorldMatrix(true, true);
        const meshes: THREE.Mesh[] = [];
        model.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.userData['noOutline']) return;
          if (m.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh && !(m as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(m);
        });
        // malha juntada (o quadro de chaves, o armário): o contorno sai só das peças da silhueta
        const pieces = meshes.flatMap((mesh) =>
          ((mesh.userData['outlineParts'] as THREE.BufferGeometry[] | undefined) ?? [mesh.geometry]).map((geo) => ({ mesh, geo })),
        );
        for (const { mesh, geo } of pieces) {
          // cópia da peça só na camada do contorno: forma a silhueta na máscara (ver `TargetOutline`)
          const hull = new THREE.Mesh(geo, this.targetOutline.mask);
          hull.layers.set(OUTLINE_LAYER);
          hull.castShadow = hull.receiveShadow = false;
          hull.userData['outline'] = true;
          hull.visible = this.outlinesOn;
          mesh.add(hull);
          hulls.push(hull);
        }
      }
      this.outlined.set(t.id, { models, hulls });
    }
    const armed = this.armedTarget;
    this.armedTarget = null;
    this.setArmedTarget(armed);
  }

  /**
   * Alvo tocado uma vez (o caminho até ele já está marcado, o segundo toque anda até lá): o
   * contorno dele engrossa e vira amarelo intenso. `null` volta todos ao amarelo fino.
   */
  setArmedTarget(id: string | null): void {
    if (id === this.armedTarget) return;
    this.armedTarget = id;
    for (const [tid, o] of this.outlined) {
      const on = tid === id;
      for (const h of o.hulls) h.material = on ? this.targetOutline.armedMask : this.targetOutline.mask;
    }
  }

  /**
   * Alvo tocado uma vez: além do contorno amarelo (`setArmedTarget`), mostra que o agente vai
   * andar até lá — um fantasma dele no destino, olhando para o alvo; pontos que correm pelo
   * caminho; um balão sobre o alvo; e o próprio agente
   * vira para o alvo e saltita no lugar. `null` apaga tudo.
   */
  setTargetAim(aim: TargetAim | null): void {
    const key = aim ? `${aim.id}|${aim.unitId}|${hexKey(aim.dest)}|${aim.path.map(hexKey).join(';')}|${aim.label}|${aim.locked ? 1 : 0}` : '';
    if (key === (this.aimFx?.key ?? '')) return;
    this.clearAimFx();
    this.setArmedTarget(aim && !aim.locked ? aim.id : null);
    const target = aim && this.outlined.get(aim.id);
    const u = aim && this.units.get(aim.unitId);
    if (!aim || !target || !u) return;

    const box = new THREE.Box3();
    for (const m of target.models) box.expandByObject(m);
    const center = box.getCenter(new THREE.Vector3());
    const lift = (h: HexCoord, dy: number) => {
      const p = this.worldOf(h);
      p.y = this.groundAt(p.x, p.z) + BASE_TOP + dy;
      return p;
    };

    // fantasma: cópia translúcida do agente, parado no destino e de frente para o alvo
    const locked = !!aim.locked;
    const ghostMat = new THREE.MeshBasicMaterial({
      color: locked ? 0xa3a7ad : 0xffe27a,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      toneMapped: false,
    });
    const body = u.rig ? cloneSkinned(u.rig.object) : u.group.clone(true);
    if (!u.rig) {
      body.position.set(0, 0.3, 0);
      body.rotation.set(0, 0, 0);
    }
    body.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = ghostMat;
      m.castShadow = m.receiveShadow = false;
      m.renderOrder = 4;
    });
    const ghost = new THREE.Group();
    ghost.add(body);
    const spot = lift(aim.dest, 0);
    ghost.position.copy(spot);
    ghost.rotation.y = Math.atan2(center.x - spot.x, center.z - spot.z);
    this.scene.add(ghost);

    // caminho: pontos amarelos que correm do agente até o destino
    const points = [u.hex, ...aim.path].map((h) => lift(h, 0.12));
    const curve = points.length > 1 ? new THREE.CatmullRomCurve3(points, false, 'centripetal') : null;
    const length = curve ? curve.getLength() : 0;
    const dots: THREE.Sprite[] = [];
    if (curve) {
      this.aimDotTex ??= this.glowTexture([
        [0, 'rgba(255,255,255,1)'],
        [0.35, 'rgba(255,226,110,0.95)'],
        [1, 'rgba(255,200,40,0)'],
      ]);
      this.aimDotLockedTex ??= this.glowTexture([
        [0, 'rgba(235,236,238,1)'],
        [0.35, 'rgba(170,174,180,0.9)'],
        [1, 'rgba(130,134,140,0)'],
      ]);
      const dotTex = locked ? this.aimDotLockedTex : this.aimDotTex;
      const count = Math.max(3, Math.min(40, Math.round(length * 1.6)));
      for (let i = 0; i < count; i++) {
        const dot = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: dotTex, transparent: true, depthWrite: false, toneMapped: false }),
        );
        dot.scale.setScalar(0.42);
        dot.renderOrder = 5;
        dot.userData['phase'] = i / count;
        this.scene.add(dot);
        dots.push(dot);
      }
    }

    // balão sobre o alvo: "Toque de novo para ir · 3 passos". Se o alto do alvo cai debaixo da
    // interface (cartões, placar), o balão desce pelo alvo até a frente dele (o lado de baixo da tela)
    const label = this.labelSprite(aim.label, locked ? 'locked' : 'aim');
    const { labelTop, labelLow } = this.labelSpots(box);
    label.position.copy(labelTop);
    this.labelScene.add(label);

    // o agente vira para o alvo, pronto para sair
    u.yaw = Math.atan2(center.x - u.group.position.x, center.z - u.group.position.z);

    this.aimFx = {
      key,
      unitId: u.id,
      ghost,
      ghostMat,
      curve,
      length,
      dots,
      label,
      labelTop,
      labelLow,
      avoid: aim.avoid,
      locked,
      calm: reducedMotionQuery(),
    };
    this.placeAimLabel(this.aimFx);
  }

  private clearAimFx(): void {
    const fx = this.aimFx;
    if (!fx) return;
    this.aimFx = null;
    fx.ghost.removeFromParent();
    fx.ghostMat.dispose();
    for (const d of fx.dots) {
      d.removeFromParent();
      d.material.dispose();
    }
    this.labelScene.remove(fx.label);
    fx.label.material.map?.dispose();
    fx.label.material.dispose();
  }

  /** Anima os efeitos do alvo tocado uma vez (pontos correndo, fantasma respirando). */
  private updateAimFx(t: number): void {
    const fx = this.aimFx;
    if (!fx) return;
    const calm = fx.calm;
    if (fx.curve) {
      // ~2,2 unidades por segundo, os pontos somem nas pontas
      const speed = calm ? 0 : 2.2 / Math.max(fx.length, 0.01);
      for (const d of fx.dots) {
        const k = ((d.userData['phase'] as number) + t * speed) % 1;
        fx.curve.getPointAt(k, d.position);
        d.material.opacity = Math.min(1, Math.sin(Math.PI * k) * 1.6);
      }
    }
    const pulse = 0.5 + Math.sin(t * 4) * 0.5;
    (fx.ghostMat as THREE.MeshBasicMaterial).opacity = 0.28 + pulse * 0.2;
    this.placeAimLabel(fx);
  }

  /**
   * Põe o balão do alvo tocado onde dá para ler: em cima do alvo quando cabe; se ali ele fica
   * debaixo da interface (`avoid`) ou sai da tela, desce pelo alvo até a frente dele. Na
   * horizontal, fica sempre inteiro dentro da tela (a ponta continua apontando para o alvo).
   */
  private placeAimLabel(fx: Pick<AimFx, 'label' | 'labelTop' | 'labelLow' | 'avoid'>): void {
    const canvas = this.renderer.domElement.getBoundingClientRect();
    if (!canvas.width || !canvas.height) return;
    this.camera.updateMatrixWorld();
    const proj = this.camera.projectionMatrix.elements;
    // `sizeAttenuation: false`: o tamanho do balão na tela não depende da distância
    const w = (fx.label.scale.x * proj[0] * canvas.width) / 2;
    const h = (fx.label.scale.y * proj[5] * canvas.height) / 2;
    const margin = 8;
    const avoid = (fx.avoid?.() ?? []).filter((r) => r.width > 0 && r.height > 0);
    const toScreen = (p: THREE.Vector3) => {
      const n = p.clone().project(this.camera);
      return { n, x: canvas.left + ((n.x + 1) / 2) * canvas.width, y: canvas.top + ((1 - n.y) / 2) * canvas.height };
    };
    const clampX = (x: number) =>
      Math.min(Math.max(x, canvas.left + margin + w / 2), canvas.right - margin - w / 2);
    const free = (x: number, y: number) =>
      y - h >= canvas.top + margin &&
      y <= canvas.bottom - margin &&
      !avoid.some((r) => x + w / 2 > r.left && x - w / 2 < r.right && y > r.top && y - h < r.bottom);
    const p = new THREE.Vector3();
    let spot: { n: THREE.Vector3; x: number; y: number } | null = null;
    for (let i = 0; i <= 10; i++) {
      p.lerpVectors(fx.labelTop, fx.labelLow, i / 10);
      const s = toScreen(p);
      s.x = clampX(s.x);
      if (free(s.x, s.y)) {
        spot = s;
        break;
      }
    }
    if (!spot) {
      // nada livre pelo alvo: fica na frente dele, mas abaixo do que estiver em cima
      spot = toScreen(p.copy(fx.labelLow));
      spot.x = clampX(spot.x);
      for (const r of avoid) {
        if (spot.x + w / 2 > r.left && spot.x - w / 2 < r.right && spot.y > r.top && spot.y - h < r.bottom && r.top < canvas.top + canvas.height / 2)
          spot.y = Math.max(spot.y, r.bottom + h + margin);
      }
    }
    // volta para o mundo na mesma profundidade
    const n = spot.n;
    n.x = ((spot.x - canvas.left) / canvas.width) * 2 - 1;
    n.y = 1 - ((spot.y - canvas.top) / canvas.height) * 2;
    fx.label.position.copy(n.unproject(this.camera));
  }

  /** Saltinho no lugar do agente que vai andar até o alvo tocado (pronto para sair). */
  private readyBounce(id: string, t: number): number {
    if (this.aimFx?.unitId !== id || this.aimFx.calm || this.aimFx.locked) return 0;
    return Math.abs(Math.sin(t * 6)) * 0.07;
  }

  /**
   * Onde vai o balão de um alvo: em cima dele (`labelTop`) ou, se ali fica debaixo da interface,
   * descendo até a frente dele, no chão (`labelLow`). Ver `placeAimLabel`.
   */
  private labelSpots(box: THREE.Box3): { labelTop: THREE.Vector3; labelLow: THREE.Vector3 } {
    const center = box.getCenter(new THREE.Vector3());
    const labelTop = new THREE.Vector3(center.x, box.max.y + 0.35, center.z);
    const toCam = new THREE.Vector3(this.camera.position.x - center.x, 0, this.camera.position.z - center.z);
    if (toCam.lengthSq() < 1e-6) toCam.set(0, 0, 1);
    toCam.normalize();
    const size = box.getSize(new THREE.Vector3());
    const reach = (Math.abs(toCam.x) * size.x + Math.abs(toCam.z) * size.z) / 2;
    const labelLow = new THREE.Vector3(center.x + toCam.x * reach, box.min.y + 0.4, center.z + toCam.z * reach);
    return { labelTop, labelLow };
  }

  /**
   * Balão passageiro sobre um alvo tocável (ex.: "Nenhuma interação" no NPC rendido sem nada a
   * dizer): aparece em cinza, fica ~`ms` (2 s) e some aos poucos. Um novo balão no mesmo alvo troca o
   * anterior. `avoid` faz o balão desviar da interface, como o do alvo tocado.
   */
  flashTargetLabel(id: string, text: string, opts: { ms?: number; avoid?: () => readonly DOMRect[] } = {}): void {
    const target = this.outlined.get(id);
    if (!target) return;
    this.dropFlash(id);
    const box = new THREE.Box3();
    for (const m of target.models) box.expandByObject(m);
    if (box.isEmpty()) return;
    const label = this.labelSprite(text, 'muted');
    label.material.transparent = true;
    const spots = this.labelSpots(box);
    label.position.copy(spots.labelTop);
    this.labelScene.add(label);
    const span = opts.ms ?? 2000;
    const fx = { label, ...spots, avoid: opts.avoid };
    this.flashes.set(id, { fx, until: performance.now() + span, span });
    this.placeAimLabel(fx);
  }

  private dropFlash(id: string): void {
    const f = this.flashes.get(id);
    if (!f) return;
    this.flashes.delete(id);
    this.labelScene.remove(f.fx.label);
    f.fx.label.material.map?.dispose();
    f.fx.label.material.dispose();
  }

  /** Balões passageiros: seguem desviando da interface e somem no fim (os últimos 300 ms). */
  private updateFlashes(): void {
    if (!this.flashes.size) return;
    const now = performance.now();
    for (const [id, f] of this.flashes) {
      const left = f.until - now;
      if (left <= 0) {
        this.dropFlash(id);
        continue;
      }
      f.fx.label.material.opacity = Math.min(1, left / 300);
      this.placeAimLabel(f.fx);
    }
  }

  /**
   * NPCs rendidos que dá para tocar (como o avião, ver `setTargetOutlines`): o id do alvo é
   * `npc:<id do inimigo>` (`onTargetTap`). Com interação (`talk`), o modelo ganha um contorno
   * amarelo que acompanha a animação e engrossa quando tocado uma vez (`setTargetAim`); sem
   * interação, não tem contorno, mas o toque vale do mesmo jeito (a tela mostra o balão com
   * `flashTargetLabel`). Quem sai da lista perde o toque e o contorno.
   */
  setNpcTargets(targets: readonly { id: string; talk: boolean }[]): void {
    const want = new Map(targets.map((t) => [t.id, t.talk]));
    for (const id of [...this.npcTargets.keys()]) {
      if (want.has(id)) continue;
      this.npcTargets.delete(id);
      this.dropFlash(NPC_TARGET + id);
      this.dropOutline(NPC_TARGET + id);
    }
    for (const [id, talk] of want) {
      const e = this.enemies.get(id);
      const had = this.npcTargets.get(id);
      if (!e || (had && had.talk === talk && had.rig === !!e.rig)) continue;
      this.buildNpcTarget(e, talk);
    }
  }

  /** Monta (ou refaz) o toque e o contorno de um NPC rendido. */
  private buildNpcTarget(e: EnemyView, talk: boolean): void {
    const key = NPC_TARGET + e.id;
    const armed = this.armedTarget === key;
    this.dropOutline(key);
    this.npcTargets.set(e.id, { talk, rig: !!e.rig });
    // área de toque: um cilindro do tamanho do personagem (não desenha, mas o raio o acerta)
    const height = Math.max(0.6, e.signY - 0.45 - BASE_TOP);
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, height, 10),
      new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 }),
    );
    hitbox.position.y = BASE_TOP + height / 2;
    hitbox.renderOrder = -2;
    e.group.add(hitbox);
    const hulls: THREE.Mesh[] = [];
    if (talk) {
      const root = e.rig?.object ?? e.group;
      const meshes: THREE.Mesh[] = [];
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m !== hitbox && !m.userData['outline'] && (e.rig || m.visible) && m !== e.shadow) meshes.push(m);
      });
      for (const mesh of meshes) {
        const skin = mesh as THREE.SkinnedMesh;
        let hull: THREE.Mesh;
        if (skin.isSkinnedMesh) {
          // mesma malha e mesmo esqueleto: o contorno se mexe junto com o clipe
          const s = new THREE.SkinnedMesh(skin.geometry, this.targetOutline.mask);
          s.bindMode = skin.bindMode;
          s.bind(skin.skeleton, skin.bindMatrix);
          hull = s;
        } else {
          hull = new THREE.Mesh(mesh.geometry, this.targetOutline.mask);
        }
        hull.frustumCulled = false;
        hull.castShadow = hull.receiveShadow = false;
        hull.renderOrder = -1;
        hull.layers.set(OUTLINE_LAYER);
        hull.userData['outline'] = true;
        hull.visible = this.outlinesOn;
        hull.raycast = () => {};
        mesh.add(hull);
        hulls.push(hull);
      }
    }
    this.outlined.set(key, { models: [hitbox], hulls, owned: [hitbox] });
    if (armed) {
      this.armedTarget = null;
      this.setArmedTarget(key);
    }
  }

  /** Acende ou apaga os contornos dos alvos (o toque neles só vale aceso). */
  showTargetOutlines(on: boolean): void {
    if (this.outlinesOn === on) return;
    this.outlinesOn = on;
    for (const o of this.outlined.values()) for (const h of o.hulls) h.visible = on;
  }

  private dropOutline(id: string): void {
    const o = this.outlined.get(id);
    if (!o) return;
    if (this.aimFx?.key.startsWith(`${id}|`)) this.clearAimFx();
    for (const h of o.hulls) h.removeFromParent();
    for (const x of o.owned ?? []) {
      x.removeFromParent();
      (x as THREE.Mesh).geometry?.dispose();
    }
    this.outlined.delete(id);
  }

  /** Alvo com contorno debaixo do toque (o mais perto da câmera), ou `null`. */
  private targetHit(): { id: string; point: THREE.Vector3 } | null {
    let best: { id: string; point: THREE.Vector3; distance: number } | null = null;
    for (const [id, o] of this.outlined) {
      const hit = this.raycaster.intersectObjects(o.models, true).find((h) => h.object.visible);
      if (hit && (!best || hit.distance < best.distance)) best = { id, point: hit.point, distance: hit.distance };
    }
    return best;
  }

  /**
   * Ateia fogo num alvo: o modelo escurece (materiais trocados por cópias queimadas) e
   * nascem chamas, fumaça e uma luz alaranjada que tremula. O fogo não apaga sozinho.
   */
  ignite(id: string, hexes: readonly HexCoord[]): void {
    if (this.fires.has(id) || !hexes.length) return;
    const target = this.targets.get(id);
    if (target) target.sprite.visible = false;

    this.dropOutline(id);
    const models = this.modelsOn(hexes);
    // o fade do close-up troca os materiais: volta aos originais antes de queimar
    for (const o of [...this.occluders.keys()]) {
      for (const model of models) {
        let inside = false;
        model.traverseAncestors((a) => (inside ||= a === o));
        if (inside || model === o) this.releaseFade(o);
      }
    }
    const charred: Fire['charred'] = [];
    const soot = new THREE.Color(0x1b1714);
    for (const model of models) {
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const burn = (m: THREE.Material): THREE.Material => {
          const c = m.clone() as THREE.MeshStandardMaterial;
          if (c.color) c.color.lerp(soot, 0.82);
          c.map = null;
          if ('roughness' in c) c.roughness = 1;
          if ('metalness' in c) c.metalness = 0;
          c.needsUpdate = true;
          return c;
        };
        charred.push({ mesh, original: mesh.material });
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map(burn) : burn(mesh.material);
      });
    }

    const group = new THREE.Group();
    const flameMat = new THREE.SpriteMaterial({
      map: (this.flameTex ??= this.glowTexture([[0, '#fff6c9'], [0.25, '#ffc24a'], [0.6, 'rgba(255,90,20,0.75)'], [1, 'rgba(180,30,0,0)']])),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });
    const smokeMat = new THREE.SpriteMaterial({
      map: (this.smokeTex ??= this.glowTexture([[0, 'rgba(70,66,62,0.9)'], [0.55, 'rgba(60,56,52,0.5)'], [1, 'rgba(50,48,46,0)']])),
      depthWrite: false,
      transparent: true,
    });
    const particles: FireParticle[] = [];
    const big = hexes.length > 4;
    const perHex = big ? 3 : 7;
    const rnd = (i: number) => {
      const x = Math.sin(i * 12.9898 + hexes.length * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    let n = 0;
    for (const h of hexes) {
      const c = this.worldOf(h);
      for (let k = 0; k < perHex; k++, n++) {
        const smoke = k % 3 === 2;
        const sprite = new THREE.Sprite(smoke ? smokeMat.clone() : flameMat.clone());
        group.add(sprite);
        particles.push({
          sprite,
          smoke,
          base: new THREE.Vector3(c.x + (rnd(n) - 0.5) * 0.9, (big ? 0.5 : 0.3) + rnd(n + 7) * 0.5, c.z + (rnd(n + 3) - 0.5) * 0.8),
          offset: rnd(n + 11),
          speed: smoke ? 0.22 + rnd(n + 5) * 0.12 : 0.9 + rnd(n + 5) * 0.7,
          size: smoke ? 1.1 + rnd(n + 9) * 0.6 : (big ? 0.55 : 0.75) + rnd(n + 9) * 0.45,
          rise: smoke ? 3.2 + rnd(n + 13) * 1.2 : 0.9 + rnd(n + 13) * 0.6,
        });
      }
    }
    // clarão alaranjado no chão: faz o papel da luz do fogo sem acender uma luz de verdade
    // (uma luz nova no meio da partida obrigaria a recompilar todos os materiais da cena)
    const center = this.centerOf(hexes);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: (this.glowTex ??= this.glowTexture([[0, 'rgba(255,150,50,0.85)'], [0.5, 'rgba(255,110,30,0.35)'], [1, 'rgba(255,80,20,0)']])),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.set(center.x, 0.06, center.z);
    glow.scale.setScalar(big ? 6 : 3.6);
    group.add(glow);

    const holder = this.housed(hexes[0], group);
    this.scene.add(holder);
    // o interior da estrutura é reavaliado no próximo quadro (o fogo novo entra junto)
    this.structureKey = '';
    this.fires.set(id, { holder, group, particles, glow, charred, born: this.clock.elapsedTime });
  }

  /** Apaga todos os incêndios e devolve os modelos ao normal (usado ao recomeçar). */
  clearFires(): void {
    for (const fire of this.fires.values()) {
      for (const { mesh, original } of fire.charred) {
        const burned = mesh.material;
        mesh.material = original;
        (Array.isArray(burned) ? burned : [burned]).forEach((m) => m.dispose());
      }
      this.scene.remove(fire.holder);
      for (const st of this.structures) st.interior = st.interior.filter((o) => o !== fire.group);
      for (const p of fire.particles) p.sprite.material.dispose();
      fire.glow.geometry.dispose();
      (fire.glow.material as THREE.Material).dispose();
    }
    this.fires.clear();
    for (const t of this.targets.values()) t.sprite.visible = true;
  }

  private centerOf(hexes: readonly HexCoord[]): THREE.Vector3 {
    const c = new THREE.Vector3();
    for (const h of hexes) c.add(this.worldOf(h));
    return c.divideScalar(hexes.length || 1);
  }

  /** Mancha redonda com degradê (chama, fumaça). */
  private glowTexture(stops: [number, string][]): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    if (g) {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      for (const [at, color] of stops) grad.addColorStop(at, color);
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Chama laranja num círculo escuro com borda vermelha: "queimar aqui". */
  private targetTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#0b1d24';
      g.strokeStyle = '#e8492f';
      g.lineWidth = 8;
      g.beginPath();
      g.arc(64, 64, 56, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      const flame = (scale: number, color: string) => {
        g.save();
        g.translate(64, 98);
        g.scale(scale, scale);
        g.fillStyle = color;
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(-30, 0, -34, -30, -14, -52);
        g.bezierCurveTo(-12, -36, -4, -34, -2, -40);
        g.bezierCurveTo(-6, -58, 6, -70, 10, -76);
        g.bezierCurveTo(12, -58, 34, -44, 30, -20);
        g.bezierCurveTo(28, -6, 16, 0, 0, 0);
        g.fill();
        g.restore();
      };
      flame(1, '#ff7a1a');
      flame(0.55, '#ffd43b');
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Anima chamas (sobem, encolhem e somem), fumaça (sobe devagar e se espalha) e a luz. */
  private updateFires(t: number): void {
    for (const fire of this.fires.values()) {
      // o fogo "pega" aos poucos no primeiro segundo e meio
      const grow = Math.min(1, (t - fire.born) / 1.5);
      (fire.glow.material as THREE.MeshBasicMaterial).opacity = (0.75 + Math.sin(t * 13) * 0.12 + Math.sin(t * 7.3) * 0.1) * grow;
      for (const p of fire.particles) {
        const life = (t * p.speed + p.offset) % 1;
        const s = p.size * (p.smoke ? 0.6 + life * 1.2 : 1 - life * 0.75) * grow;
        p.sprite.scale.set(s, s * (p.smoke ? 1 : 1.35), 1);
        const drift = p.smoke ? life * 0.6 : Math.sin(t * 6 + p.offset * 9) * 0.06;
        p.sprite.position.set(p.base.x + drift, p.base.y + life * p.rise, p.base.z - (p.smoke ? life * 0.3 : 0));
        p.sprite.material.opacity = Math.sin(Math.PI * life) * (p.smoke ? 0.55 : 0.95);
      }
    }
    for (const target of this.targets.values()) {
      if (!target.sprite.visible) continue;
      target.sprite.position.set(target.center.x, target.height + Math.sin(t * 2.6) * 0.1, target.center.z);
    }
  }

  private addScenery(object: THREE.Object3D): void {
    this.scene.add(object);
    object.updateMatrixWorld(true);
    const sphere = new THREE.Box3().setFromObject(object).getBoundingSphere(new THREE.Sphere());
    this.scenery.push({ object, center: sphere.center, radius: sphere.radius });
  }

  /** Faixa central da pista: traços brancos nas colunas pares da fileira do meio. */
  private buildRunwayMarks(): void {
    const ground = this.map.ground;
    if (!ground) return;
    const isRunway = (col: number, row: number) => ground.get(hexKey({ col, row })) === 'runway';
    const geo = new THREE.BoxGeometry(HEX_SIZE * 1.1, 0.02, 0.14);
    const mat = new THREE.MeshStandardMaterial({ color: 0xe9eef0, roughness: 0.9 });
    const dashes: { tile: HexTile; local: THREE.Matrix4 }[] = [];
    for (const tile of this.field.list) {
      const { col, row } = tile.coord;
      if (col % 2 || !isRunway(col, row) || !isRunway(col, row - 1) || !isRunway(col, row + 1)) continue;
      dashes.push({ tile, local: new THREE.Matrix4().makeTranslation(0, 0.011, 0) });
    }
    this.field.addDecals(geo, mat, dashes);
  }

  /**
   * Pista de terra: dois sulcos de pneu escuros correndo de norte a sul pelo meio do
   * rastro. Cada hexágono de terra recebe o pedaço de sulco que passa por ele (e sobe
   * junto quando o hexágono se ergue).
   */
  private buildDirtTrack(): void {
    const ground = this.map.ground;
    if (!ground) return;
    const dirt = this.field.list.filter((t) => ground.get(hexKey(t.coord)) === 'dirt');
    if (!dirt.length) return;
    const xs = dirt.map((t) => t.x);
    const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
    // a continuação da pista no mundo de fora usa as mesmas linhas
    this.ruts.push(mid - HEX_SIZE * 1.1, mid + HEX_SIZE * 1.1);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6b4c2c, roughness: 1 });
    const geo = new THREE.BoxGeometry(1, 0.02, 1);
    const pieces: { tile: HexTile; local: THREE.Matrix4 }[] = [];
    for (const tile of dirt) {
      // peças relativas ao centro do hexágono (que sobem junto quando ele flutua)
      const toLocal = new THREE.Matrix4().makeTranslation(-tile.x, 0, 0);
      for (const m of rutPieces(this.ruts, tile.x, 0, HEX_SIZE * HEX_GAP)) pieces.push({ tile, local: m.premultiply(toLocal) });
    }
    this.field.addDecals(geo, mat, pieces);
  }

  private buildEnemy(enemy: BoardEnemy): void {
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: COLORS.enemy, roughness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3a1014, roughness: 0.6 });
    // corpo hexagonal + "cabeça" e um nariz apontando para onde olha (+X local)
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.3, 6), bodyMaterial);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), bodyMaterial);
    head.position.y = 0.3;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 16), dark);
    nose.rotation.z = -Math.PI / 2;
    nose.position.set(0.42, 0.08, 0);
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.24), dark);
    eyes.position.set(0.18, 0.34, 0);
    group.add(body, head, nose, eyes);
    for (const m of [body, head, nose]) castsMovingShadow(m);
    // base redonda que aparece sob o modelo 3D e mostra a cor do estado (alerta, rendido)
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, BASE_TOP * 2, 40), bodyMaterial);
    disc.visible = false;
    castsMovingShadow(disc);
    group.add(disc);

    const alertSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.bangTexture(), depthTest: false }));
    alertSprite.scale.set(0.6, 0.6, 1);
    alertSprite.position.y = 1.05;
    alertSprite.visible = false;
    alertSprite.renderOrder = 10;
    const flagSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flagTexture(), depthTest: false }));
    flagSprite.scale.set(0.7, 0.7, 1);
    flagSprite.position.y = 1.0;
    flagSprite.visible = false;
    flagSprite.renderOrder = 10;
    group.add(alertSprite, flagSprite);
    this.scene.add(group);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(shadow);

    const p = this.worldOf(enemy.start);
    group.position.set(p.x, 0.15, p.z);
    this.enemies.set(enemy.id, {
      id: enemy.id,
      hex: { ...enemy.start },
      group,
      shadow,
      hop: 0,
      epoch: 0,
      facing: enemy.facing,
      facingGoal: enemy.facing,
      alert: false,
      surrendered: false,
      bodyMaterial,
      alertSprite,
      flagSprite,
      presence: 1,
      gone: false,
      baseY: 0.15,
      signY: 1.05,
    });
    if (enemy.hidden) {
      const view = this.enemies.get(enemy.id)!;
      view.gone = true;
      view.presence = 0;
    }
    if (enemy.model) this.attachEnemyModel(this.enemies.get(enemy.id)!, enemy.model, [body, head, nose, eyes], disc);
  }

  /** Troca a peça do inimigo pelo personagem animado, de pé sobre uma base da cor do estado. */
  private async attachEnemyModel(
    e: EnemyView,
    def: ModelDef,
    piece: THREE.Object3D[],
    disc: THREE.Object3D,
  ): Promise<void> {
    const rig = await this.loadRig(e.id, def);
    if (!rig) return;
    // o grupo aponta +X para onde o inimigo olha; o modelo tem a frente em +Z
    rig.object.rotation.y = Math.PI / 2;
    rig.object.position.y = BASE_TOP;
    e.group.add(rig.object);
    for (const o of piece) o.visible = false;
    disc.visible = true;
    e.baseY = BASE_TOP;
    e.signY = BASE_TOP + def.height + 0.45;
    e.alertSprite.scale.set(0.9, 0.9, 1);
    e.rig = rig;
    // com o modelo, a algema mostra quem se rendeu: a bandeira branca fica só na peça simples
    e.flagSprite.visible = false;
    rig.play(this.enemyRestClip(e), 0);
    rig.setCuffed(e.surrendered);
    // rendido tocável: o contorno passa da peça simples para o modelo
    const npc = this.npcTargets.get(e.id);
    if (npc) this.buildNpcTarget(e, npc.talk);
    // o destaque aquece de novo com o personagem animado (ver `warmSpotlight`)
    this.spotWarmDue = true;
  }

  private async loadRig(id: string, def: ModelDef): Promise<CharacterRig | null> {
    try {
      const rig = await CharacterRig.load(def);
      if (!this.disposed) return rig;
      rig.dispose();
    } catch (err) {
      console.warn(`Modelo de ${id} não carregou; mantendo a peça simples.`, err);
    }
    return null;
  }

  /** Bandeira branca (desenhada num canvas). */
  private flagTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      g.lineJoin = 'round';
      g.strokeStyle = '#0b1d24';
      g.lineWidth = 10;
      // mastro
      g.beginPath();
      g.moveTo(34, 14);
      g.lineTo(34, 118);
      g.stroke();
      // pano ondulado
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.moveTo(34, 16);
      g.bezierCurveTo(60, 4, 80, 30, 112, 18);
      g.lineTo(112, 66);
      g.bezierCurveTo(80, 78, 60, 52, 34, 64);
      g.closePath();
      g.fill();
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** Balão amarelo com "!" (desenhado num canvas). */
  private bangTexture(): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    if (g) {
      g.fillStyle = '#ffd23f';
      g.strokeStyle = '#0b1d24';
      g.lineWidth = 10;
      g.beginPath();
      g.arc(64, 64, 52, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#0b1d24';
      g.font = 'bold 84px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('!', 64, 70);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  private buildUnit(unit: BoardUnit): void {
    const group = new THREE.Group();
    const body = new THREE.Color(unit.color);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 0.14, 40),
      new THREE.MeshStandardMaterial({ color: body, roughness: 0.5 }),
    );
    const light = body.clone().lerp(new THREE.Color(0xffffff), 0.55);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.07, 12, 40),
      new THREE.MeshStandardMaterial({ color: light, roughness: 0.4 }),
    );
    ring.rotation.x = Math.PI / 2;
    const dot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.16, 24),
      new THREE.MeshStandardMaterial({ color: light, roughness: 0.4 }),
    );
    // alça que marca a "frente" da peça — mostra a rotação de quem está na vez
    const nub = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.22),
      new THREE.MeshStandardMaterial({ color: light, roughness: 0.4 }),
    );
    nub.position.set(0, 0, 0.42);
    group.add(disc, ring, dot, nub);
    for (const m of [disc, ring]) castsMovingShadow(m);

    // área de toque generosa (invisível) para facilitar selecionar com o dedo
    const hitbox = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 0.6, 12),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    // o hexágono da peça também conta como toque nela (ver handleTap), então a caixa
    // só precisa cobrir a própria peça, sem roubar toques dos hexágonos de trás
    hitbox.userData['unitId'] = unit.id;
    group.add(hitbox);
    this.scene.add(group);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    this.scene.add(shadow);

    const p = this.worldOf(unit.start);
    group.position.set(p.x, 0.3, p.z);
    const view: UnitView = {
      id: unit.id, hex: { ...unit.start }, group, shadow, hitbox, lift: 0, hop: 0, epoch: 0,
      pieceOnly: [dot, nub], yaw: 0,
    };
    this.units.set(unit.id, view);
    if (unit.model) this.attachModel(view, unit.model);
  }

  /** Troca o miolo da peça pelo personagem animado, que fica de pé sobre o disco. */
  private async attachModel(u: UnitView, def: ModelDef): Promise<void> {
    const rig = await this.loadRig(u.id, def);
    if (!rig) return;
    rig.object.position.y = BASE_TOP;
    u.group.add(rig.object);
    for (const o of u.pieceOnly) o.visible = false;
    // a área de toque passa a cobrir o corpo todo
    u.hitbox.scale.set(0.8, def.height / 0.6, 0.8);
    u.hitbox.position.y = def.height / 2;
    rig.play(this.restClip(u), 0);
    u.rig = rig;
    // o destaque aquece de novo com o personagem animado (ver `warmSpotlight`)
    this.spotWarmDue = true;
  }

  private buildMarker(color: number, radius: number, tube: number): THREE.Mesh {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 10, 48),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    this.scene.add(m);
    return m;
  }

  private buildCursor(): THREE.Mesh {
    // anel com 6 segmentos: vértices em ±X, como os hexágonos "flat-top"
    const m = new THREE.Mesh(
      new THREE.RingGeometry(HEX_SIZE * HEX_GAP * 0.8, HEX_SIZE * HEX_GAP, 6),
      new THREE.MeshBasicMaterial({ color: COLORS.cursor, transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
    );
    m.rotation.x = -Math.PI / 2;
    m.visible = false;
    this.scene.add(m);
    return m;
  }

  // ---------- estado / pintura ----------

  private paintTiles(): void {
    for (const [key, tile] of this.tiles) {
      const isSel = sameHex(tile.coord, this.selected);
      const onPath = !isSel && this.path.includes(key);
      const zone = this.approach?.surrender.has(key)
        ? COLORS.approachSurrender
        : this.approach?.roll.has(key)
          ? COLORS.approachRoll
          : this.approach?.flee.has(key)
            ? COLORS.approachFlee
            : null;
      // alcance, visão e auras não pintam: são luz por cima (ver `refreshAuras`)
      tile.color.set(zone ?? (isSel ? COLORS.selected : onPath ? COLORS.path : tile.baseColor));
      tile.emissive.set(isSel ? 0x6b5200 : onPath ? 0x5a4a14 : 0x000000);
      tile.lift = isSel ? 0.2 : onPath ? 0.1 : 0;
    }
    this.field.markAll();
  }

  // ---------- peças ----------

  private worldOf(h: HexCoord): THREE.Vector3 {
    const p = hexToWorld(h, HEX_SIZE);
    return new THREE.Vector3(p.x, 0, p.z);
  }

  private hopTo(u: Mover, h: HexCoord, duration = 260, follow = true): Promise<void> {
    const from = u.group.position.clone();
    const to = this.worldOf(h);
    if (follow) {
      this.camGoal.copy(to);
      this.clampGoal();
    }
    const start = performance.now();
    const epoch = u.epoch;
    return new Promise((resolve) => {
      const step = (now: number) => {
        if (u.epoch !== epoch) return resolve();
        const t = Math.min(1, (now - start) / duration);
        const e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        u.group.position.x = from.x + (to.x - from.x) * e;
        u.group.position.z = from.z + (to.z - from.z) * e;
        u.hop = Math.sin(Math.PI * t) * 0.6;
        if (t < 1) requestAnimationFrame(step);
        else {
          u.hop = 0;
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  /** Corre em linha reta até o hexágono, em velocidade constante (quem chama vira a peça). */
  /** `rate`: velocidade do tempo agora (o slow da perseguição; 1 = normal). */
  /** `progress`: chamado a cada quadro com o andamento do trecho (0..1), para o arco do pulo. */
  private runTo(
    u: Mover,
    h: HexCoord,
    speed: number,
    follow = true,
    rate: () => number = () => 1,
    progress?: (t: number) => void,
  ): Promise<void> {
    const from = u.group.position.clone();
    const to = this.worldOf(h);
    if (follow) {
      this.camGoal.copy(to);
      this.clampGoal();
    }
    const duration = (Math.hypot(to.x - from.x, to.z - from.z) / speed) * 1000;
    let last = performance.now();
    let t = 0;
    const epoch = u.epoch;
    return new Promise((resolve) => {
      const step = (now: number) => {
        if (u.epoch !== epoch) return resolve();
        t = this.disposed || duration <= 0 ? 1 : Math.min(1, t + ((now - last) / duration) * rate());
        last = now;
        u.group.position.x = from.x + (to.x - from.x) * t;
        u.group.position.z = from.z + (to.z - from.z) * t;
        progress?.(t);
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }

  /** Altura do topo do hexágono sob um ponto (os hexágonos do caminho flutuam). */
  private groundAt(x: number, z: number): number {
    const tile = this.tiles.get(hexKey(worldToHex(x, z, HEX_SIZE)));
    return tile ? tile.y : 0;
  }

  // ---------- câmera / loop ----------

  private boardCenter(): THREE.Vector3 {
    if (this.map.mission) {
      const c = hexToWorld(this.map.mission.center, HEX_SIZE);
      return new THREE.Vector3(c.x, 0, c.z);
    }
    const last = hexToWorld({ col: this.map.cols - 1, row: this.map.rows - 1 }, HEX_SIZE);
    return new THREE.Vector3(last.x / 2, 0, last.z / 2);
  }

  private resize(): void {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private updateCamera(dt: number): void {
    const look = new THREE.Vector3();
    let dist = this.updatePerspectiveCamera(dt, look);
    this.viewShift.x = this.viewShift.y = 0;
    dist = this.blendInspect(dt, look, dist);
    dist = this.blendCine(dt, look, dist);
    dist = this.blendChase(dt, look, dist);
    this.camera.lookAt(look);
    if (Math.abs(this.cineRollNow) > 1e-4) this.camera.rotateZ(this.cineRollNow);
    this.updateOccluders(dt);
    // a cena da porta empurra a vista para a esquerda das fichas; o close-up, para cima da papelada
    const { x: vx, y: vy } = this.viewShift;
    if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
      this.camera.setViewOffset(this.canvas.clientWidth, this.canvas.clientHeight, vx, vy, this.canvas.clientWidth, this.canvas.clientHeight);
    } else if (this.camera.view?.enabled) this.camera.clearViewOffset();

    // A câmera enxerga no máximo `viewRadius` passos em volta do centro da tela: a névoa
    // fecha ali e o plano de corte descarta o resto (o que nem chega a ser desenhado).
    // na perseguição a câmera rasante enxergaria mata demais: a névoa fecha mais perto
    const cut = this.wideChase ? 0 : CHASE_CAMERA.viewCut;
    const view = this.profile.viewRadius * HEX_STEP * HEX_SIZE * (1 - cut * this.chaseBlend);
    const fog = this.scene.fog as THREE.Fog;
    fog.far = dist + view;
    fog.near = dist + view * 0.45;
    const far = fog.far + 4;
    if (Math.abs(this.camera.far - far) > 0.5) {
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }

    // o sol (e o quadro da sombra) acompanha o centro da tela em saltos de SHADOW_STEP:
    // entre um salto e outro a sombra não é redesenhada (ver `shadowDue`)
    const sx = Math.round(this.camTarget.x / SHADOW_STEP) * SHADOW_STEP;
    const sz = Math.round(this.camTarget.z / SHADOW_STEP) * SHADOW_STEP;
    this.sun.position.set(sx - 8, 16, sz + 6);
    this.sun.target.position.set(sx, 0, sz);
  }

  /**
   * No close-up, esmaece o cenário (o avião, por exemplo) que cruza a linha entre a câmera e
   * o agente / o objeto / a pessoa, e o traz de volta quando sai do caminho. A detecção
   * confere uns poucos raios, umas dez vezes por segundo; o fade roda a cada quadro.
   */
  private updateOccluders(dt: number): void {
    const v = this.inspect;
    const closeUp = !!v?.hideOccluders && this.inspectBlend >= 0.3;
    if (closeUp || !v) {
      this.occlusionClock -= dt;
      if (this.occlusionClock <= 0) {
        this.occlusionClock = 0.1;
        const blockers = closeUp ? this.sceneryBlockers(v!) : this.wallBlockers();
        for (const o of blockers) {
          if (!this.occluders.has(o)) this.occluders.set(o, this.fadeEntry(o));
        }
        for (const [o, e] of this.occluders) e.hide = blockers.has(o);
      }
    } else {
      for (const e of this.occluders.values()) e.hide = false;
    }
    if (!this.occluders.size) return;

    // no close-up o que tapa some de vez; na vista normal a parede fica translúcida
    const floor = closeUp ? 0 : WALL_FADE_ALPHA;
    const k = 1 - Math.exp(-dt * 9);
    for (const [o, e] of this.occluders) {
      e.alpha += ((e.hide ? floor : 1) - e.alpha) * k;
      if (e.hide && Math.abs(e.alpha - floor) < 0.02) e.alpha = floor;
      if (!e.hide && e.alpha > 0.97) e.alpha = 1;
      if (e.alpha === 1) {
        this.releaseFade(o);
        continue;
      }
      o.visible = e.alpha > 0;
      for (const m of e.meshes) for (const c of m.clones) c.opacity = (m.base.get(c) ?? 1) * e.alpha;
    }
  }

  /**
   * Vista normal: paredes das estruturas (hangar, casa) que cruzam a linha entre a câmera e
   * um personagem (agente ou inimigo à vista). O telhado que ainda está no lugar (ver
   * `structureView`) também esmaece quando tapa alguém do lado de fora — a câmera rasante da
   * perseguição, por exemplo, passa por cima dele. Com o telhado no lugar o interior nem é
   * desenhado, então esmaecê-lo não entrega quem está escondido lá dentro.
   */
  private wallBlockers(): Set<THREE.Object3D> {
    const blockers = new Set<THREE.Object3D>();
    const targets = [...this.wallMeshes];
    for (const r of this.roofMeshes) if (r.roof.visible) targets.push(r.mesh);
    if (!targets.length) return blockers;
    const origin = this.camera.position;
    for (const p of this.characterPoints(true)) {
      const dir = p.clone().sub(origin);
      const len = dir.length();
      this.raycaster.set(origin, dir.divideScalar(len));
      this.raycaster.near = 0;
      this.raycaster.far = len - 0.4;
      for (const hit of this.raycaster.intersectObjects(targets, false)) blockers.add(hit.object);
    }
    this.raycaster.far = Infinity;
    return blockers;
  }

  /**
   * Peito de cada personagem à vista (agentes e inimigos que não sumiram). Para as paredes
   * (`walls`), o inimigo dentro de uma estrutura ainda fechada (telhado no lugar) não conta:
   * esmaecer a parede entregaria quem está escondido lá dentro.
   */
  private characterPoints(walls = false): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    for (const u of this.units.values()) points.push(u.group.position.clone().setY(1.3));
    for (const e of this.enemies.values()) {
      if (e.presence <= 0.05) continue;
      if (walls && this.structures.some((st) => st.roof?.visible && inStructure(e.hex, st.rect))) continue;
      points.push(e.group.position.clone().setY(1.3));
    }
    return points;
  }

  /**
   * Árvores que esmaecem: as que cruzam a linha entre a câmera e um personagem (na vista
   * normal e no close-up) e as que tapariam o alcance de movimento de quem está na vez.
   * A linha sai do chão e do peito de cada um e vai até a câmera; para quando passa da
   * altura das copas. Confere umas dez vezes por segundo.
   */
  private updateTreeFade(dt: number): void {
    this.treeFadeClock -= dt;
    if (this.treeFadeClock > 0) return;
    this.treeFadeClock = 0.1;
    const cam = this.camera.position;
    const faded = new Set<string>();
    const reach = TREE_FADE_REACH;
    const near = new THREE.Vector3();
    const walk = (from: THREE.Vector3): void => {
      const dir = cam.clone().sub(from);
      const len = dir.length();
      if (len < 1e-3) return;
      dir.divideScalar(len);
      for (let d = 0; d <= len; d += 0.6) {
        near.copy(from).addScaledVector(dir, d);
        if (near.y > TREE_FADE_TOP) break;
        const h = worldToHex(near.x, near.z, HEX_SIZE);
        faded.add(hexKey(h));
        // copas largas: o vizinho cujo centro passa perto da linha também tapa
        for (const n of hexNeighbors(h)) {
          const c = this.worldOf(n);
          if (Math.hypot(c.x - near.x, c.z - near.z) < reach) faded.add(hexKey(n));
        }
      }
    };
    const v = this.inspect;
    if (v && this.inspectBlend >= 0.3) {
      for (const p of v.subjects) {
        walk(p);
        walk(p.clone().setY(0.1));
      }
    } else {
      for (const p of this.characterPoints()) {
        walk(p);
        walk(p.clone().setY(0.1));
      }
      for (const k of this.reachable) {
        const [col, row] = k.split(',').map(Number);
        walk(this.worldOf({ col, row }).setY(0.05));
      }
    }
    this.stream.setFadedTrees(faded);
  }

  /** Close-up: cenário inteiro (o avião, uma estrutura) entre a câmera e quem está em foco. */
  private sceneryBlockers(v: NonNullable<HexBoard['inspect']>): Set<THREE.Object3D> {
    const origin = this.camera.position;
    const blockers = new Set<THREE.Object3D>();
    for (const sc of this.scenery) {
      if (v.rooms.has(sc.object)) continue;
      if (!sc.object.visible && !this.occluders.has(sc.object)) continue;
      for (const p of v.subjects) {
        const dir = p.clone().sub(origin);
        const len = dir.length();
        // o que está colado em quem está em foco (o móvel inspecionado) não conta
        if (len < 1) continue;
        this.raycaster.set(origin, dir.divideScalar(len));
        this.raycaster.near = 0;
        this.raycaster.far = len - 0.8;
        const hits = this.raycaster.intersectObject(sc.object, true);
        if (hits.some((h) => this.shownUnder(h.object, sc.object))) {
          blockers.add(sc.object);
          break;
        }
      }
    }
    this.raycaster.far = Infinity;
    return blockers;
  }

  /**
   * Se a peça é desenhada (ela e os pais até `root`; o próprio `root` pode estar escondido
   * pelo fade). O raio acerta também o que está invisível, como o telhado recolhido.
   */
  private shownUnder(object: THREE.Object3D, root: THREE.Object3D): boolean {
    for (let o: THREE.Object3D | null = object; o && o !== root; o = o.parent) if (!o.visible) return false;
    return true;
  }

  /** A peça (ou um pai dela) está esmaecida, mais transparente que opaca (ver `updateOccluders`). */
  private fadedOut(object: THREE.Object3D): boolean {
    for (let o: THREE.Object3D | null = object; o; o = o.parent) if ((this.occluders.get(o)?.alpha ?? 1) <= 0.5) return true;
    return false;
  }

  /** Fim do fade: materiais originais de volta, cópias descartadas, visível conforme o raio carregado. */
  private releaseFade(object: THREE.Object3D): void {
    const e = this.occluders.get(object);
    if (!e) return;
    this.occluders.delete(object);
    for (const m of e.meshes) {
      m.mesh.material = m.original;
      for (const c of m.clones) c.dispose();
    }
    const sc = this.scenery.find((s) => s.object === object);
    object.visible = !sc || this.stream.inLoadRadius(sc.center.x, sc.center.z, sc.radius / (HEX_STEP * HEX_SIZE));
  }

  /** Troca os materiais do objeto por cópias translúcidas (os originais ficam guardados). */
  private fadeEntry(object: THREE.Object3D): OccluderFade {
    const meshes: OccluderFade['meshes'] = [];
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      // as cópias do contorno (camada própria) ficam como estão
      if (!mesh.isMesh || mesh.userData['outline']) return;
      const original = mesh.material;
      const base = new Map<THREE.Material, number>();
      const clone = (m: THREE.Material): THREE.Material => {
        const c = m.clone();
        base.set(c, m.opacity);
        c.transparent = true;
        c.depthWrite = false;
        return c;
      };
      const clones = Array.isArray(original) ? original.map(clone) : [clone(original)];
      mesh.material = Array.isArray(original) ? clones : clones[0];
      meshes.push({ mesh, original, clones, base });
    });
    return { alpha: 1, hide: true, meshes };
  }

  /**
   * Mistura a câmera de sempre com a do close-up (ver `closeUp`), como a cena da porta.
   * Ajusta a posição da câmera e `look`; devolve a distância até o ponto mirado.
   */
  private blendInspect(dt: number, look: THREE.Vector3, dist: number): number {
    const goal = this.inspect ? 1 : 0;
    this.inspectBlend += (goal - this.inspectBlend) * (1 - Math.exp(-dt * INSPECT_CAM.blendRate));
    if (Math.abs(goal - this.inspectBlend) < 0.002) this.inspectBlend = goal;
    const v = this.inspect ?? this.inspectLast;
    if (!v || this.inspectBlend <= 0) return dist;
    const b = this.inspectBlend;
    const e = b * b * (3 - 2 * b);
    const c = INSPECT_CAM;
    let near: number;
    if (v.frame === 'pair') {
      // afasta até a dupla caber em pé (altura) e lado a lado (largura) no que a papelada não cobre
      const band = Math.max(0.3, 1 - v.insets.bottom - c.pair.top);
      const wide = Math.max(0.35, 1 - v.insets.right);
      const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const byHeight = c.pair.height / band / (2 * tanH);
      const byWidth = c.pair.width / (0.92 * wide) / (Math.max(this.camera.aspect, 0.3) * 2 * tanH);
      near = Math.max(c.pair.minDist, byHeight, byWidth);
      // o meio da área livre fica no meio da tela: a vista sobe (e vai para a esquerda)
      const mid = c.pair.top + band / 2;
      this.viewShift.y += (0.5 - mid) * this.canvas.clientHeight * e;
      this.viewShift.x += (v.insets.right / 2) * this.canvas.clientWidth * e;
    } else if (v.frame === 'prop' && v.fit) {
      // aproxima até a caixa de foco caber (altura e largura) no que a papelada não cobre
      const band = Math.max(0.3, 1 - v.insets.bottom - PROP_CAM.top);
      const wide = Math.max(0.35, 1 - v.insets.right);
      const tanH = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      const byHeight = (v.fit.h * PROP_CAM.margin) / band / (2 * tanH);
      const byWidth = (v.fit.w * PROP_CAM.margin) / wide / (Math.max(this.camera.aspect, 0.3) * 2 * tanH);
      near = Math.max(PROP_CAM.minDist, byHeight, byWidth);
      const mid = PROP_CAM.top + band / 2;
      this.viewShift.y += (0.5 - mid) * this.canvas.clientHeight * e;
      this.viewShift.x += (v.insets.right / 2) * this.canvas.clientWidth * e;
    } else {
      const portrait = this.camera.aspect < 1 ? 1 / Math.max(this.camera.aspect, 0.45) : 1;
      near = c.dist * Math.min(portrait, c.portraitMax);
    }
    const pitch = v.frame === 'prop' ? PROP_CAM.pitch : c.pitch;
    const pos = v.target
      .clone()
      .addScaledVector(v.dir, Math.cos(pitch) * near)
      .setY(v.target.y + Math.sin(pitch) * near);
    this.camera.position.lerp(pos, e);
    look.lerp(v.target, e);
    return THREE.MathUtils.lerp(dist, near, e);
  }

  /**
   * Câmera normal: perspectiva inclinada que segue `camGoal`. Põe a câmera no lugar, escreve
   * em `look` para onde ela olha e devolve a distância até o alvo.
   */
  private updatePerspectiveCamera(dt: number, look: THREE.Vector3): number {
    const k = 1 - Math.exp(-dt * 6);
    this.stepIntro();
    this.camTarget.lerp(this.camGoal, k);
    // vista do tablet de abordagem (ver `frameRing`): mistura os parâmetros, não as posições
    const goal = this.ring ? 1 : 0;
    this.ringBlend += (goal - this.ringBlend) * (1 - Math.exp(-dt * RING_VIEW.rate));
    if (Math.abs(goal - this.ringBlend) < 0.002) this.ringBlend = goal;
    const v = this.ring ?? this.ringLast;
    if (v && this.ringBlend > 0) {
      const e = easeInOutCubic(this.ringBlend);
      return this.placePerspective(
        new THREE.Vector3().lerpVectors(this.camTarget, v.target, e),
        THREE.MathUtils.lerp(this.zoom, v.zoom, e),
        THREE.MathUtils.lerp(this.pitchDeg, v.pitch, e),
        look,
      );
    }
    this.ringLast = null;
    this.doorYaw += (this.doorYawGoal() - this.doorYaw) * (1 - Math.exp(-dt * 2.5));
    if (Math.abs(this.doorYaw) < 1e-4) this.doorYaw = 0;
    return this.placePerspective(this.camTarget, this.zoom, this.pitchDeg, look, this.doorYaw);
  }

  /**
   * Agente da vez junto do trecho reto de parede de uma porta (a porta ou qualquer hexágono da
   * mesma parede, ver `doorRun`): a câmera gira um pouco para o lado em que ele está, para a
   * porta não ficar de quina (as portas das paredes laterais somem de frente).
   */
  private doorYawGoal(): number {
    const u = this.activeId ? this.units.get(this.activeId) : undefined;
    if (!u) return 0;
    const near = new Set([u.hex, ...hexNeighbors(u.hex)].map(hexKey));
    const byWall = (key: string): boolean => {
      for (const k of this.doorRun(key)) if (near.has(k)) return true;
      return false;
    };
    // casa: um giro só, de toda a parede da porta de entrada até sair, que mostra as portas e os cômodos
    for (const st of this.structures) {
      if (st.kind !== 'house') continue;
      if (inStructure(u.hex, st.rect) || st.doors.some((d) => byWall(hexKey(d)))) return HOUSE_CAMERA_YAW;
    }
    const doors = this.doorViews;
    if (!doors) return 0;
    let best: { yaw: number; d: number } | null = null;
    for (const key of doors.keys()) {
      if (!byWall(key)) continue;
      const center = doors.centerOf(key)!;
      const normal = doors.normalOf(key)!;
      const away = u.group.position.clone().sub(center).setY(0);
      // a normal virada para o lado do agente: a câmera vai para esse lado
      const n = normal.multiplyScalar(Math.sign(away.dot(normal)) || 1);
      // porta de frente para a câmera (ou de costas, que um giro leve não resolve): fica como está
      if (n.z < -0.5) continue;
      const yaw = THREE.MathUtils.clamp(Math.atan2(n.x, n.z), -DOOR_CAMERA_YAW, DOOR_CAMERA_YAW);
      const d = away.lengthSq();
      if (!best || d < best.d) best = { yaw, d };
    }
    return best?.yaw ?? 0;
  }

  /** Trecho reto de parede da porta (chaves dos hexágonos), ver `doorWall`. */
  private doorRun(key: string): Set<string> {
    let run = this.doorRuns.get(key);
    if (!run) {
      const [col, row] = key.split(',').map(Number);
      run = new Set(doorWall(this.map, { col, row }).map(hexKey));
      this.doorRuns.set(key, run);
    }
    return run;
  }

  /** Põe a câmera inclinada `pitchDeg` sobre `target`, afastada conforme `zoom`; devolve a distância. */
  private placePerspective(target: THREE.Vector3, zoom: number, pitchDeg: number, look: THREE.Vector3, yaw = 0): number {
    // Em retrato a câmera recua para enxergar o mesmo número de colunas.
    const portrait = this.camera.aspect < 1 ? 1 / Math.max(this.camera.aspect, 0.45) : 1;
    const dist = 11.5 * zoom * Math.min(portrait, 2.3);
    const pitch = THREE.MathUtils.degToRad(pitchDeg);
    // mira um pouco "abaixo" do jogador: ele fica acima do centro e o painel inferior não cobre o alcance
    const lead = this.camera.aspect < 1 ? 1.4 : 0.3;
    const back = yawTurn(new THREE.Vector3(0, 0, 1), yaw);
    look.set(target.x, target.y, target.z).addScaledVector(back, lead);
    this.camera.position.copy(look).addScaledVector(back, Math.cos(pitch) * dist).setY(target.y + Math.sin(pitch) * dist);
    return dist;
  }

  /**
   * Sol e cenário (mata, hangar, paredes) são estáticos: a parte estática do mapa de
   * sombras só é redesenhada quando o quadro do sol salta, quando blocos do mundo entram
   * ou saem, ou quando o teto do hangar aparece ou some. Nos outros quadros só a sombra
   * de quem se mexe é desenhada por cima da estática (ver `StaticShadow`).
   */
  private shadowDue(): boolean {
    if (!this.sun.castShadow) return false;
    const p = this.sun.target.position;
    // teto e interior de cada estrutura (hangar, casa): aparecer ou sumir muda a sombra
    const views = this.structures.map((st) => `${st.roof?.visible}/${st.interior[0]?.visible}`).join(',');
    const key = `${p.x},${p.z};${this.stream.version};${views};${this.profile.mode}`;
    if (key === this.shadowKey) return false;
    this.shadowKey = key;
    this.staticShadow.invalidate();
    return true;
  }

  private loop = (): void => {
    this.frameId = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.1);
    // o tabuleiro tático dorme enquanto o mapa de corrida cobre a tela (ver `setRendering`)
    if (!this.rendering) return;
    const t = this.clock.elapsedTime;
    // slow da curva: rampa linear, com os tempos da fita
    if (this.slowmo !== this.slowmoGoal) {
      const ramp = this.slowmoGoal > this.slowmo ? CHASE_SLOWMO.slowRamp : CHASE_SLOWMO.resumeRamp;
      const step = dt / ramp;
      this.slowmo = this.slowmoGoal > this.slowmo ? Math.min(1, this.slowmo + step) : Math.max(0, this.slowmo - step);
    }
    if (this.sceneSlow !== this.sceneSlowGoal) {
      const ramp = this.sceneSlowGoal > this.sceneSlow ? CHASE_SLOWMO.slowRamp : CHASE_SLOWMO.resumeRamp;
      const step = dt / ramp;
      this.sceneSlow =
        this.sceneSlowGoal > this.sceneSlow ? Math.min(1, this.sceneSlow + step) : Math.max(0, this.sceneSlow - step);
    }
    const sceneRate = this.sceneRate();

    const bob = Math.sin(t * 2.4) * 0.08;
    const lk = 1 - Math.exp(-dt * 8);
    // monta em segundo plano o que entrou no raio (e muda o centro, se a câmera foi longe)
    // (na vista do tablet de abordagem, em volta de para onde a câmera foi)
    const sc = this.ring && this.ringBlend > 0.5 ? this.ring.target : this.camTarget;
    this.stream.update(sc.x, sc.z, STREAM_BUDGET_MS);
    this.updateStructure();

    for (const u of this.units.values()) {
      const active = u.id === this.activeId;
      u.group.visible = u.shadow.visible =
        this.stream.inLoadRadius(u.group.position.x, u.group.position.z) && !this.blocksProp(u.group);
      if (u.rig) {
        // personagem com modelo: fica de pé sobre o hexágono (acompanha a flutuação do caminho)
        // e vira suavemente para onde vai; quem está na vez é marcado só pelo anel
        u.rig.update(dt * this.animRate(u.id));
        const ground = this.groundAt(u.group.position.x, u.group.position.z) + BASE_TOP;
        u.ground = u.ground === undefined ? ground : u.ground + (ground - u.ground) * (1 - Math.exp(-dt * 14));
        u.group.position.y = u.ground + u.hop + this.readyBounce(u.id, t);
        const turn = Math.atan2(Math.sin(u.yaw - u.group.rotation.y), Math.cos(u.yaw - u.group.rotation.y));
        u.group.rotation.y += turn * (1 - Math.exp(-dt * 12));
        u.shadow.position.set(u.group.position.x, u.ground - BASE_TOP + 0.01, u.group.position.z);
        u.shadow.scale.setScalar(1.1);
        continue;
      }
      u.lift += ((active ? 1 : 0) - u.lift) * lk;
      // quem está na vez flutua e gira; os outros descansam baixos e parados
      const float = 0.3 + u.lift * (0.45 + bob);
      u.group.position.y = float + u.hop + this.readyBounce(u.id, t);
      if (active) u.group.rotation.y += dt * 0.8;
      u.shadow.position.set(u.group.position.x, 0.01, u.group.position.z);
      u.shadow.scale.setScalar(1 - (float - 0.3 + u.hop) * 0.6);
    }

    for (const e of this.enemies.values()) {
      // olhando de um lado para o outro (o susto do arrombamento)
      if (e.scan) {
        e.scan.phase += dt * sceneRate * 4.4;
        e.facingGoal = e.scan.base + Math.sin(e.scan.phase) * 0.75;
      }
      // posição de largada: entra e sai em ~0,15 s
      const mixGoal = e.stance ? 1 : 0;
      const mix0 = e.stanceMix ?? 0;
      if (mix0 !== mixGoal) {
        const m = mix0 + (mixGoal - mix0) * (1 - Math.exp(-dt * sceneRate * 9));
        e.stanceMix = Math.abs(m - mixGoal) < 0.002 ? mixGoal : m;
        if (e.rig) mixPose(e.rig.pose, restPose(), BOLT_STANCE, e.stanceMix);
      }
      e.rig?.update(dt * this.animRate(e.id));
      e.facing += angleDelta(e.facing, e.facingGoal) * (1 - Math.exp(-dt * 12 * sceneRate));
      e.group.rotation.y = -e.facing;
      e.presence += ((e.gone ? 0 : 1) - e.presence) * (1 - Math.exp(-dt * 7));
      const visible = e.presence > 0.02 && this.stream.inLoadRadius(e.group.position.x, e.group.position.z);
      e.group.visible = e.shadow.visible = visible;
      // ao fugir, a peça encolhe e afunda
      e.group.scale.setScalar(Math.max(0.001, e.presence));
      const jitter = e.alert ? Math.abs(Math.sin(t * 9)) * 0.06 : 0;
      // rendido fica abaixado
      const crouch = e.surrendered && !e.rig ? -0.08 : 0;
      const startle = e.startleAt === undefined ? 0 : waveBump(t - e.startleAt, 0.32) * 0.4;
      const stance = (e.stanceMix ?? 0) * (-0.05 + Math.abs(Math.sin(t * 7)) * 0.025);
      e.group.position.y = e.baseY + crouch + e.hop + startle + jitter + stance - (1 - e.presence) * 0.5;
      e.alertSprite.position.y = e.signY + Math.sin(t * 6) * 0.06;
      e.shadow.position.set(e.group.position.x, 0.01, e.group.position.z);
      e.shadow.scale.setScalar(Math.max(0.001, e.presence * (1 - e.hop * 0.6)));
    }

    this.updateMarker(this.activeMarker, this.activeId, 0.03, 1 + Math.sin(t * 4) * 0.06);
    this.updateMarker(
      this.focusMarker,
      this.focusId !== this.activeId ? this.focusId : null,
      0.04,
      1 + Math.sin(t * 5) * 0.04,
    );

    const cursorTile = this.cursor ? this.tiles.get(hexKey(this.cursor)) : undefined;
    this.cursorMarker.visible = !!cursorTile;
    if (cursorTile) {
      this.cursorMarker.position.set(cursorTile.x, cursorTile.y + 0.03, cursorTile.z);
      this.cursorMarker.scale.setScalar(1 + Math.sin(t * 6) * 0.03);
    }

    for (const layer of Object.values(this.auras)) layer.update(t);
    const tk = 1 - Math.exp(-dt * 12);
    const field = this.field;
    const wave = this.updateWave(t);
    for (const [key, tile] of this.tiles) {
      const step = this.path.length ? this.path.indexOf(key) : -1;
      const isSel = this.selected !== null && sameHex(tile.coord, this.selected);
      let goal = tile.lift;
      let changed = false;
      if (step >= 0 && !isSel) {
        // caminho: brilho quente que "corre" da peça até o destino, e uma onda de flutuação
        const wave = Math.sin(t * 5 - step * 0.9);
        const glow = 0.4 + wave * 0.12;
        tile.emissive.setRGB(glow, glow * 0.8, glow * 0.25);
        goal = tile.lift + wave * 0.035;
        changed = true;
      } else if (isSel) {
        goal = tile.lift + Math.sin(t * 3) * 0.03;
      } else if (this.approach && (this.approach.surrender.has(key) || this.approach.roll.has(key) || this.approach.flee.has(key))) {
        // na onda de voz, o hexágono pula e acende quando ela chega; antes, só pulsa
        const hit = wave ? waveBump(t - wave.start - waveArrival(hexDistance(wave.from, tile.coord))) : 0;
        const g = wave ? 0.04 + hit * 0.45 : 0.08 + Math.sin(t * 4) * 0.06;
        tile.emissive.setRGB(g, g * 0.85, g * 0.45);
        goal = tile.lift + hit * 0.3;
        if (hit) tile.y = goal;
        changed = true;
      }
      const diff = goal - tile.y;
      if (diff !== 0) {
        tile.y = Math.abs(diff) < 1e-3 ? goal : tile.y + diff * tk;
        changed = true;
      }
      if (changed) field.mark(tile);
    }
    // só o que mudou neste quadro vai para a placa de vídeo
    field.flush();

    this.updateProps(t);
    if (this.outlinesOn && this.outlined.size) {
      this.updateAimFx(t);
    }
    this.updateFlashes();

    if (this.aura) {
      const glow = 0.5 + Math.sin(t * 1.6) * 0.12;
      (this.aura.wall.material as THREE.MeshBasicMaterial).opacity = glow;
      (this.aura.ring.material as THREE.MeshBasicMaterial).opacity = glow + 0.1;
    }

    this.updateFires(t);
    this.updateFloaters(t);
    this.doorViews?.update(dt);
    for (const [id, sp] of this.speeches) if (t >= sp.until) this.silence(id);

    this.updateCamera(dt);
    this.updateTreeFade(dt);
    const shadow = this.shadowDue();
    // a mata que só faz sombra (fora da tela) entra apenas no quadro que redesenha a sombra
    this.stream.cull(this.camera, shadow ? this.sun : undefined);
    this.renderer.info.reset();
    this.updateSpotlight();
    if (this.spotWarmDue && !this.spot) this.warmSpotlight();
    this.spotlight.render(dt);
    if (this.outlinesOn && this.outlined.size) {
      // respira devagar: dá para tocar; o tocado uma vez pulsa rápido, quase branco no pico
      const t = this.clock.elapsedTime;
      const hulls = [...this.outlined.values()].flatMap((o) => o.hulls);
      // estrutura fechada tapa o contorno; aberta, ou a peça esmaecida (tapando alguém, ou a
      // estrutura no close-up), não
      for (const o of this.shellOccluders) o.copy.visible = o.roof.visible && !this.fadedOut(o.mesh);
      this.targetOutline.render(hulls, 0.5 + Math.sin(t * 2.5) * 0.5, this.armedTarget ? 0.5 + Math.sin(t * 7) * 0.5 : 0);
    }
    if (this.labels.size || this.aimFx || this.flashes.size) {
      this.renderer.autoClear = false;
      this.renderer.render(this.labelScene, this.camera);
      this.renderer.autoClear = true;
    }
  };

  /**
   * Quadro de aquecimento do modo de abordagem: desenha o destaque uma vez, com os
   * personagens na camada do destaque e uma etiqueta visível, logo antes do quadro normal
   * (que cobre tudo). Assim a GPU já tem prontos os shaders e os estados de desenho que o
   * destaque usa, e abrir a abordagem não engasga. Roda no começo e quando um personagem
   * animado termina de carregar.
   */
  private warmSpotlight(): void {
    this.spotWarmDue = false;
    const lit: THREE.Object3D[] = [];
    const light = (root: THREE.Object3D) =>
      root.traverse((o) => {
        if (!(o as THREE.Mesh).isMesh || o.layers.isEnabled(SPOTLIGHT_LAYER)) return;
        o.layers.enable(SPOTLIGHT_LAYER);
        lit.push(o);
      });
    for (const u of this.units.values()) light(u.group);
    for (const e of this.enemies.values()) light(e.group);
    // um raio de um hexágono só, como o de `setSpotlight`
    const zone = new THREE.InstancedMesh(this.field.prism, new THREE.MeshBasicMaterial(), 1);
    zone.layers.set(SPOTLIGHT_LAYER);
    zone.frustumCulled = false;
    this.scene.add(zone);
    this.warmLabel.visible = true;
    try {
      this.spotlight.warm();
      this.renderer.autoClear = false;
      this.renderer.render(this.labelScene, this.camera);
    } finally {
      this.renderer.autoClear = true;
      this.warmLabel.visible = false;
      for (const o of lit) o.layers.disable(SPOTLIGHT_LAYER);
      this.scene.remove(zone);
      zone.material.dispose();
      zone.dispose();
    }
  }

  /** Acompanha o destaque: o raio sobe e desce com os hexágonos e as etiquetas seguem os suspeitos. */
  private updateSpotlight(): void {
    const zone = this.spot?.zone;
    if (zone && this.spot) {
      const m = new THREE.Matrix4();
      this.spot.tiles.forEach((t, i) => zone.setMatrixAt(i, m.makeTranslation(t.x, t.y + 0.002, t.z)));
      zone.instanceMatrix.needsUpdate = true;
    }
    for (const [id, sprite] of this.labels) {
      const e = this.enemies.get(id);
      if (!e) continue;
      sprite.visible = e.group.visible;
      sprite.position.set(e.group.position.x, e.group.position.y + e.signY - 0.2, e.group.position.z);
    }
  }

  /** Etiqueta de um suspeito no modo de abordagem ("se rende" em verde, "rola" em amarelo, "corre" em laranja). */
  private labelSprite(text: string, tone: 'surrender' | 'roll' | 'flee' | 'aim' | 'locked' | 'muted'): THREE.Sprite {
    const font = 'bold 40px "Special Elite", "Courier New", monospace';
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const pad = 22;
    const tip = 14;
    // "longe demais": cadeado à esquerda do texto
    const icon = tone === 'locked' ? 40 : 0;
    let width = 240;
    if (g) {
      g.font = font;
      width = Math.ceil(g.measureText(text).width) + pad * 2 + icon;
    }
    c.width = width;
    c.height = 64 + tip;
    if (g) {
      g.fillStyle =
        tone === 'surrender' ? '#2f7a3e' : tone === 'roll' ? '#8a6d0f' : tone === 'aim' ? '#ffd23a' : tone === 'locked' || tone === 'muted' ? '#c4c7cc' : '#c4621a';
      g.beginPath();
      g.roundRect(0, 0, width, 64, 12);
      g.moveTo(width / 2 - tip, 64);
      g.lineTo(width / 2, 64 + tip);
      g.lineTo(width / 2 + tip, 64);
      g.fill();
      g.font = font;
      g.fillStyle = tone === 'aim' ? '#2a2100' : tone === 'locked' || tone === 'muted' ? '#26282b' : '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(text, (width + icon) / 2, 34);
      if (icon) this.drawLock(g, pad, 14, g.fillStyle as string);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, depthTest: false, depthWrite: false, sizeAttenuation: false }),
    );
    // tamanho fixo na tela (cerca de 6% da altura), qualquer que seja o zoom
    const h = 0.045;
    sprite.scale.set((h * c.width) / c.height, h, 1);
    // a ponta do balão fica em cima da cabeça
    sprite.center.set(0.5, 0);
    return sprite;
  }

  /** Cadeado fechado (alça + corpo com o buraco da chave) num quadrado de ~30 px a partir de (x, y). */
  private drawLock(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
    g.save();
    g.strokeStyle = g.fillStyle = color;
    g.lineWidth = 4.5;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(x + 7, y + 15);
    g.lineTo(x + 7, y + 10);
    g.arc(x + 15, y + 10, 8, Math.PI, 0);
    g.lineTo(x + 23, y + 15);
    g.stroke();
    g.beginPath();
    g.roundRect(x + 2, y + 14, 26, 21, 4);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    g.beginPath();
    g.arc(x + 15, y + 22.5, 3, 0, Math.PI * 2);
    g.fill();
    g.fillRect(x + 13.75, y + 23, 2.5, 6);
    g.restore();
  }

  /** Anel da onda de voz; devolve a onda em andamento (ou `null` quando acabou). */
  private updateWave(t: number): { from: HexCoord; start: number } | null {
    const w = this.wave;
    const ring = this.waveRing;
    if (!w || t >= w.end) {
      this.wave = null;
      if (ring) ring.visible = false;
      return null;
    }
    if (ring) {
      const radius = (t - w.start - APPROACH_FX.waveDelay) * APPROACH_FX.waveSpeed;
      const max = (w.end - w.start - APPROACH_FX.waveDelay) * APPROACH_FX.waveSpeed;
      ring.visible = radius > 0;
      ring.scale.setScalar(Math.max(0.01, (radius + 0.5) * HEX_STEP * HEX_SIZE));
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - Math.min(1, Math.max(0, radius / max)));
    }
    return w;
  }

  private updateMarker(m: THREE.Mesh, id: string | null, y: number, scale: number): void {
    const u = id ? this.units.get(id) : undefined;
    m.visible = !!u;
    if (!u) return;
    m.position.set(u.group.position.x, y, u.group.position.z);
    m.scale.setScalar(scale);
  }

  // ---------- entrada (touch / mouse) ----------

  private bindInput(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  private unbindInput(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel);
    this.canvas.removeEventListener('wheel', this.onWheel);
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.pointers.size === 1) {
      this.tapStart = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.dragged = false;
    } else {
      this.tapStart = null;
      this.pinchDist = this.currentPinchDistance();
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const prev = this.pointers.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    this.pointers.set(e.pointerId, cur);
    // vista de inspeção: a câmera fica travada
    if (this.inspect) {
      if (this.tapStart && Math.hypot(cur.x - this.tapStart.x, cur.y - this.tapStart.y) > 10) this.dragged = true;
      return;
    }

    if (this.pointers.size >= 2) {
      const d = this.currentPinchDistance();
      if (this.pinchDist > 0 && d > 0) this.setZoom(this.zoom * (this.pinchDist / d));
      this.pinchDist = d;
      return;
    }

    if (this.tapStart && Math.hypot(cur.x - this.tapStart.x, cur.y - this.tapStart.y) > 10) {
      this.dragged = true;
    }
    if (this.dragged) {
      // arrastar desloca a câmera (proporcional à distância atual)
      const h = this.canvas.clientHeight || 1;
      const scale = (22 * this.zoom) / h;
      this.camGoal.x -= (cur.x - prev.x) * scale;
      this.camGoal.z -= (cur.y - prev.y) * scale * 1.3;
      this.clampGoal();
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const wasTap = this.pointers.size === 1 && this.tapStart && !this.dragged &&
      performance.now() - this.tapStart.t < 600;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchDist = 0;
    if (wasTap) this.handleTap(e.clientX, e.clientY);
    if (this.pointers.size === 0) this.tapStart = null;
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.tapStart = null;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.inspect) return;
    this.setZoom(this.zoom * (e.deltaY > 0 ? 1.1 : 0.9));
  };

  private currentPinchDistance(): number {
    const pts = [...this.pointers.values()];
    return pts.length < 2 ? 0 : Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  private setZoom(z: number): void {
    // mapas grandes deixam afastar mais, até o limite do raio de visão do modo escolhido
    // (a névoa acompanha a distância da câmera, ver `updateCamera`)
    const byMap = this.worldBounds ? Infinity : Math.max(1.8, Math.max(this.map.cols, this.map.rows) / 11);
    const byView = Math.max(1.1, (this.profile.viewRadius * HEX_STEP * HEX_SIZE * 0.7) / 11.5);
    this.zoom = THREE.MathUtils.clamp(z, 0.55, Math.min(byMap, byView));
  }

  private clampGoal(): void {
    const w = this.worldBounds;
    if (w) {
      // no mundo aberto a câmera passeia por um círculo um pouco menor que o mundo
      const r = Math.max(0, w.r - this.profile.viewRadius * HEX_STEP * HEX_SIZE * 0.5);
      const dx = this.camGoal.x - w.x;
      const dz = this.camGoal.z - w.z;
      const d = Math.hypot(dx, dz);
      if (d > r && d > 0) {
        this.camGoal.x = w.x + (dx / d) * r;
        this.camGoal.z = w.z + (dz / d) * r;
      }
      return;
    }
    const b = this.bounds;
    this.camGoal.x = THREE.MathUtils.clamp(this.camGoal.x, b.minX, b.maxX);
    this.camGoal.z = THREE.MathUtils.clamp(this.camGoal.z, b.minZ, b.maxZ);
  }

  private handleTap(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    // no close-up só o móvel em zoom responde, mesmo com o resto travado
    if (this.moving || (!this.inputEnabled && !this.inspect)) return;

    // zoom num móvel: a peça destacável (pela área de toque, um pouco maior que ela) ou o resto
    const prop = this.inspect?.frame === 'prop' ? this.propOpen : null;
    if (prop) {
      if (prop.item.visible && !this.taking && this.raycaster.intersectObject(prop.hit, false).length) {
        this.callbacks.onPropTap?.('item');
        return;
      }
      const body = prop.item.parent;
      const hits = body ? this.raycaster.intersectObject(body, true) : [];
      if (hits.some((h) => h.object !== prop.hit && h.object.visible && !h.object.userData['outline'])) this.callbacks.onPropTap?.('other');
      return;
    }

    if (this.inspect) return;
    // peças primeiro: tocar perto da peça (ou no hexágono dela) seleciona o personagem
    const hitboxes = [...this.units.values()].map((u) => u.hitbox);
    const unitHit = this.raycaster.intersectObjects(hitboxes, false)[0];
    if (unitHit) {
      this.callbacks.onUnitTap(unitHit.object.userData['unitId'] as string);
      return;
    }
    // alvo com contorno (o avião, os suprimentos): o toque no modelo vale como tocar nele
    // (menos no destino já escolhido, para o segundo toque ainda confirmar o movimento)
    if (this.outlinesOn && this.callbacks.onTargetTap) {
      const target = this.targetHit();
      const below = target && worldToHex(target.point.x, target.point.z, HEX_SIZE);
      if (target && !(below && sameHex(below, this.selected))) {
        this.callbacks.onTargetTap(target.id);
        return;
      }
      // NPC rendido tocável: o hexágono dele também vale como tocar nele
      const floor = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
      const under = floor && worldToHex(floor.x, floor.z, HEX_SIZE);
      const npc = under && [...this.npcTargets.keys()].find((id) => {
        const e = this.enemies.get(id);
        return e && !e.gone && sameHex(e.hex, under);
      });
      if (npc) {
        this.callbacks.onTargetTap(NPC_TARGET + npc);
        return;
      }
    }
    // Os hexágonos do caminho flutuam: o toque vale tanto para onde o hexágono aparece
    // (malha) quanto para onde ele fica em repouso (plano y = 0). O destino já escolhido
    // ganha o desempate, para o segundo toque confirmar mesmo na borda do hexágono.
    const meshHex = this.field.pick(this.raycaster);
    const ground = this.raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), new THREE.Vector3());
    const groundHex = ground ? worldToHex(ground.x, ground.z, HEX_SIZE) : undefined;
    const onBoard = (h?: HexCoord) => !!h && this.tiles.has(hexKey(h));
    const hex = [meshHex, groundHex].find((h) => onBoard(h) && sameHex(h!, this.selected)) ??
      (onBoard(groundHex) ? groundHex : meshHex);
    const owner = hex && [...this.units.values()].find((u) => sameHex(u.hex, hex));
    if (owner) this.callbacks.onUnitTap(owner.id);
    else this.callbacks.onHexTap(hex ?? null);
  }
}
