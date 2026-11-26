import { HexCoord, hexDistance } from './hex';

/**
 * O avião do hangar fica **trancado**. A chave está no quadro de chaves, no fundo do hangar.
 *
 * - O avião não se queima direto: o agente colado nele abre o menu de **inspecionar** e escolhe
 *   `olhar dentro` ou `queimar` (como o menu das portas).
 * - Abrir o menu já mostra o carimbo **Trancado** (sem a chave): a equipe sabe que o avião está
 *   trancado e as perguntas sobre a chave passam a existir no interrogatório (`PLANE_LOCKED`,
 *   ver `lockedClue`). Não precisa tocar em `olhar dentro`.
 * - `olhar dentro` sem a chave confirma que está trancado (e a equipe passa a reconhecer a chave
 *   no quadro: `tried`). Com a chave, abre.
 * - Tocar no quadro de chaves aproxima a câmera e rola percepção (uma vez por agente) — a não
 *   ser que a equipe já saiba qual é a chave (alguém tentou o avião, alguém já a viu, ou o piloto
 *   contou). Vendo a chave (`seesKey`), ela ganha o destaque; sem ver, continua lá e se pega com
 *   um toque, só não se destaca. Quem viu e deixou lá lembra disso (ver `witness`).
 */

/** Id do quadro de chaves (entra em `noticed` quando a equipe sabe qual é a chave). */
export const KEY_PANEL_ID = 'chave-aviao';

/** Pista: alguém olhou dentro do avião e o encontrou trancado (libera as perguntas da chave). */
export const PLANE_LOCKED = 'aviao-trancado';

/** Pista: a equipe pegou a chave (as perguntas sobre ela somem). */
export const KEY_TAKEN = 'chave-aviao-pega';

/** O quadro de chaves de um mapa: onde fica (o hexágono do móvel, colado na parede do fundo). */
export interface KeyPanel {
  spot: HexCoord;
}

/** O que a equipe sabe e fez com o avião e a chave. */
export interface PlaneState {
  /** Alguém já tentou olhar dentro do avião: sabe que aquela chave é a dele. */
  tried: boolean;
  /** A chave está com a equipe. */
  hasKey: boolean;
  /** Alguém contou onde está a chave (o piloto cedendo): a equipe a reconhece no quadro. */
  told: boolean;
  /** Quem viu a chave no quadro e não pegou, na ordem em que viram. */
  seenBy: readonly string[];
}

export const INITIAL_PLANE: PlaneState = { tried: false, hasKey: false, told: false, seenBy: [] };

/** Colado no quadro de chaves: dá para mexer nele. */
export const nextToPanel = (agent: HexCoord, panel: KeyPanel): boolean => hexDistance(agent, panel.spot) === 1;

/**
 * A equipe já reconhece a chave do avião no quadro (sem precisar de percepção): alguém tentou o
 * avião, o piloto contou ou alguém já a viu lá.
 */
export const keyKnown = (s: PlaneState): boolean => s.tried || s.told || s.seenBy.length > 0;

/** O zoom no quadro rola percepção: ainda não reconhece a chave e este agente não tentou antes. */
export const needsKeyRoll = (s: PlaneState, who: string, rolled: ReadonlySet<string>): boolean =>
  !s.hasKey && !keyKnown(s) && !rolled.has(who);

/** O agente, olhando o quadro de perto, vê a chave do avião (ela ganha o destaque). */
export const seesKey = (s: PlaneState, passedRoll: boolean): boolean => !s.hasKey && (keyKnown(s) || passedRoll);

/** Quem viu a chave e deixou lá (o primeiro a ver), para comentar quando o avião estiver trancado. */
export const witness = (s: PlaneState): string | null => (s.hasKey ? null : (s.seenBy[0] ?? null));

/**
 * Pista registrada ao inspecionar o avião (abrir o menu ou olhar dentro): sem a chave ele está
 * trancado (`PLANE_LOCKED`, que libera "Onde está a chave?"); com a chave, nenhuma.
 */
export const lockedClue = (s: PlaneState): string | null => (s.hasKey ? null : PLANE_LOCKED);

/** `olhar dentro`: com a chave abre; sem ela, está trancado. */
export const lookInside = (s: PlaneState): 'open' | 'locked' => (s.hasKey ? 'open' : 'locked');

/** Registra quem viu a chave e não pegou (uma vez só por agente). */
export const leftKey = (s: PlaneState, who: string): PlaneState =>
  s.seenBy.includes(who) ? s : { ...s, seenBy: [...s.seenBy, who] };

/** A fala de quem viu a chave e não pegou (aparece embaixo da tela, com o avatar dele). */
export const WITNESS_LINE = 'Eu vi uma chave no quadro dos fundos.';
