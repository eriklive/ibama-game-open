import { HexCoord, hexKey, hexNeighbors, hexToWorld } from './hex';
import { PlaneState, lookInside } from './plane';

/**
 * Entrar no avião (issue #125). Com a chave, `olhar dentro` não é mais só um aviso: o agente
 * anda até a porta da cabine (lado oeste, atrás da asa), a câmera vai junto, a porta abre e só
 * então o interior é montado (ver `buildPlaneInterior` em `prop-models.ts`). Lá dentro:
 *
 * - um cockpit básico e gasto: manche (volante de avião), banco do piloto rasgado e remendado;
 * - um **GPS** preso no painel, atrás do manche, e um **rádio** preso no teto: os dois se tocam
 *   e se pegam (vão para os achados da equipe, como a arma do armário) e somem da cabine;
 * - o fundo da fuselagem vazio: tiraram tudo para levar combustível.
 *
 * **Sair do avião** desmonta o interior e devolve a câmera. Aqui fica só a regra (as etapas, o
 * que ainda está lá e onde fica a porta); o tabuleiro desenha e a tela amarra.
 */

/** Uma peça da cabine que se pega. */
export interface CabinItem {
  /** Id do achado (entra em `found`, como os esconderijos). */
  id: string;
  /** Com artigo, para as frases ("o GPS"). */
  name: string;
  /** Rótulo curto do botão ("GPS"). */
  short: string;
  /** O que se vê dela na cabine. */
  glimpse: string;
  /** Aviso quando é pega. */
  seized: string;
}

export const CABIN_GPS = 'gps-aviao';
export const CABIN_RADIO = 'radio-aviao';

/** As peças da cabine, na ordem em que o controle pega (✕). */
export const CABIN_ITEMS: readonly CabinItem[] = [
  {
    id: CABIN_GPS,
    name: 'o GPS',
    short: 'GPS',
    glimpse: 'Um GPS portátil preso no painel, atrás do manche, com rotas salvas.',
    seized: 'GPS apreendido: as rotas do garimpo ficam com a equipe.',
  },
  {
    id: CABIN_RADIO,
    name: 'o rádio',
    short: 'rádio',
    glimpse: 'Um rádio amador preso no teto da cabine, com o microfone pendurado.',
    seized: 'Rádio apreendido: acabou a conversa com o garimpo.',
  },
];

/** O que se ouve ao tocar no resto da cabine (gira a cada toque). */
export const CABIN_CLUTTER: readonly string[] = [
  'O banco do piloto está rasgado, remendado com fita.',
  'O manche está gasto onde as mãos seguram. Metade dos mostradores não funciona.',
  'O fundo do avião está vazio: tiraram os bancos para levar galões de combustível.',
];

/** Etapas da entrada: andar até a porta, abrir, ficar dentro, sair. */
export type CabinStage = 'outside' | 'approaching' | 'opening' | 'inside' | 'leaving';

export interface CabinState {
  stage: CabinStage;
  /** Quem entrou (fora: `null`). */
  agent: string | null;
  /** Quantos toques no resto da cabine (escolhe a frase de `CABIN_CLUTTER`). */
  pokes: number;
}

export const INITIAL_CABIN: CabinState = { stage: 'outside', agent: null, pokes: 0 };

export type CabinEvent =
  | { type: 'enter'; agent: string }
  | { type: 'arrived' }
  | { type: 'opened' }
  | { type: 'poke' }
  | { type: 'leave' }
  | { type: 'closed' }
  | { type: 'reset' };

/** Avança as etapas; um evento fora de hora não muda nada. */
export function cabinStep(s: CabinState, e: CabinEvent): CabinState {
  switch (e.type) {
    case 'enter':
      return s.stage === 'outside' ? { stage: 'approaching', agent: e.agent, pokes: 0 } : s;
    case 'arrived':
      return s.stage === 'approaching' ? { ...s, stage: 'opening' } : s;
    case 'opened':
      return s.stage === 'opening' ? { ...s, stage: 'inside' } : s;
    case 'poke':
      return s.stage === 'inside' ? { ...s, pokes: s.pokes + 1 } : s;
    case 'leave':
      return s.stage === 'inside' ? { ...s, stage: 'leaving' } : s;
    case 'closed':
    case 'reset':
      return INITIAL_CABIN;
  }
}

/** O interior só existe (é montado e desenhado) com alguém dentro. */
export const cabinBuilt = (s: CabinState): boolean => s.stage === 'inside';

/** Dá para entrar: o avião abre com a chave e ainda não queimou. */
export const canEnterPlane = (plane: PlaneState, burned: boolean): boolean => !burned && lookInside(plane) === 'open';

/** As peças que ainda estão na cabine (as pegas foram para `found`). */
export const cabinItemsLeft = (found: ReadonlySet<string>): CabinItem[] => CABIN_ITEMS.filter((i) => !found.has(i.id));

/** A peça da cabine com esse id, se ainda estiver lá. */
export const cabinItem = (id: string, found: ReadonlySet<string>): CabinItem | null =>
  cabinItemsLeft(found).find((i) => i.id === id) ?? null;

/** Frase do toque no resto da cabine. */
export const cabinClutter = (s: CabinState): string => CABIN_CLUTTER[s.pokes % CABIN_CLUTTER.length];

/** Texto da ficha da cabine conforme o que sobrou. */
export function cabinSummary(found: ReadonlySet<string>): string {
  const left = cabinItemsLeft(found);
  if (!left.length) return 'Não sobrou nada de valor: o fundo do avião está vazio.';
  return `${left.map((i) => i.glimpse).join(' ')} Toque para pegar.`;
}

/**
 * Porta da cabine em relação ao centro do avião (unidades do mundo, com o avião na escala do
 * mapa): do lado oeste (−X), um pouco à frente do meio (o nariz aponta para +Z). Mesmo desenho
 * de `buildPlane` (`scenery.ts`), dobrado.
 */
export const CABIN_DOOR_OFFSET = { x: -1.05, z: 0.75 } as const;

/** Centro (mundo, hexágono de tamanho 1) do retângulo dos hexágonos do avião, como o tabuleiro o põe. */
export function planeCenter(hexes: readonly HexCoord[]): { x: number; z: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const h of hexes) {
    const w = hexToWorld(h, 1);
    minX = Math.min(minX, w.x);
    maxX = Math.max(maxX, w.x);
    minZ = Math.min(minZ, w.z);
    maxZ = Math.max(maxZ, w.z);
  }
  return { x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 };
}

/**
 * Hexágono onde o agente para para entrar: colado no avião, livre (`blocked` traz paredes,
 * carga, inimigos e os outros agentes) e o mais perto da porta da cabine. `null` se não há.
 */
export function planeDoorSpot(hexes: readonly HexCoord[], blocked: ReadonlySet<string>): HexCoord | null {
  if (!hexes.length) return null;
  const plane = new Set(hexes.map(hexKey));
  const c = planeCenter(hexes);
  const door = { x: c.x + CABIN_DOOR_OFFSET.x, z: c.z + CABIN_DOOR_OFFSET.z };
  let best: { h: HexCoord; d: number } | null = null;
  const seen = new Set<string>();
  for (const p of hexes) {
    for (const n of hexNeighbors(p)) {
      const k = hexKey(n);
      if (seen.has(k) || plane.has(k) || blocked.has(k)) continue;
      seen.add(k);
      const w = hexToWorld(n, 1);
      const d = Math.hypot(w.x - door.x, w.z - door.z);
      if (!best || d < best.d) best = { h: n, d };
    }
  }
  return best?.h ?? null;
}
