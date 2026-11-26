import { HexCoord, hexDistance } from './hex';
import type { HexRect } from './maps';

/**
 * O avião do hangar fica **trancado**. A chave está no quadro de chaves, no fundo do hangar.
 *
 * - O avião não se queima direto: o agente colado nele abre o menu de **inspecionar** e escolhe
 *   `olhar dentro` ou `queimar` (como o menu das portas).
 * - Abrir o menu já mostra o carimbo **Trancado** (sem a chave): a equipe sabe que o avião está
 *   trancado e as perguntas sobre a chave passam a existir no interrogatório (`PLANE_LOCKED`,
 *   ver `lockedClue`). Não precisa tocar em `olhar dentro`. Com a chave, abre.
 * - O quadro de chaves só fica tocável (com o contorno) depois de percebido: quem anda pelo
 *   fundo do hangar (`KeyPanel.room`) rola percepção, uma vez por agente (ver `search.ts`), ou o
 *   piloto conta onde está a chave. Os dois põem `KEY_PANEL_ID` entre os percebidos.
 * - Tocar no quadro aproxima a câmera, com a chave do avião destacada; tocar nela pega. Quem
 *   abriu o quadro e deixou a chave lá lembra disso (ver `witness`).
 */

/** Id do quadro de chaves (entra em `noticed` quando a equipe repara nele ou o piloto conta). */
export const KEY_PANEL_ID = 'chave-aviao';

/** Pista: alguém olhou dentro do avião e o encontrou trancado (libera as perguntas da chave). */
export const PLANE_LOCKED = 'aviao-trancado';

/** Pista: a equipe pegou a chave (as perguntas sobre ela somem). */
export const KEY_TAKEN = 'chave-aviao-pega';

/** O quadro de chaves de um mapa. */
export interface KeyPanel {
  /** O hexágono do móvel, colado na parede do fundo. */
  spot: HexCoord;
  /** Onde se rola percepção para reparar nele (o fundo do hangar; colunas e fileiras, inclusive). */
  room: HexRect;
}

/** O que a equipe fez com a chave. */
export interface PlaneState {
  /** A chave está com a equipe. */
  hasKey: boolean;
  /** Quem viu a chave no quadro e não pegou, na ordem em que viram. */
  seenBy: readonly string[];
}

export const INITIAL_PLANE: PlaneState = { hasKey: false, seenBy: [] };

/** Colado no quadro de chaves: dá para mexer nele. */
export const nextToPanel = (agent: HexCoord, panel: Pick<KeyPanel, 'spot'>): boolean => hexDistance(agent, panel.spot) === 1;

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
