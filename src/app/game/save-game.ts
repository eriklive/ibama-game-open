/**
 * Saves da partida, guardados na sessão do navegador (`sessionStorage`): somem quando a aba
 * fecha, mas sobrevivem a um recarregar da página.
 *
 * - **Automático**: no começo da vez de cada agente (fim do turno anterior, inimigos incluídos)
 *   a partida inteira vira um `SaveState`. Ao abrir a página de novo, o jogo volta direto nele.
 * - **Slots**: o menu de pausa copia o estado do automático (o começo do turno atual) para um
 *   dos slots, e qualquer save carrega de volta.
 *
 * O estado é sempre o de um começo de vez (antes de rolar o movimento): nada de animação no
 * meio, dados na mesa ou zoom aberto. Carregar = remontar o tabuleiro e rolar de novo.
 */
import { Injectable, signal } from '@angular/core';
import type { Door } from './door';
import type { EnemyState } from './enemies';
import type { HexCoord } from './hex';
import type { DialogueMemory } from './interrogation';
import type { Stats } from './stats';

/** Versão do formato: um save de outra versão é ignorado (o jogo muda rápido). */
export const SAVE_VERSION = 1;
export const AUTOSAVE_KEY = 'ibama.save.auto';
export const SLOT_KEY = (n: number) => `ibama.save.slot.${n}`;
/** Quantos slots o menu oferece. */
export const SLOT_COUNT = 3;

/** Id de um save: `auto` ou o número do slot. */
export type SaveId = 'auto' | number;

/** Uma anotação da caderneta de campo (o mesmo que `FieldNote`, da tela da partida). */
export interface SavedNote {
  id: number;
  suspect: string;
  text: string;
  kind: string;
  depth: number;
}

/** A partida num começo de vez. Só dados simples (`Map`/`Set` viram listas). */
export interface SaveState {
  version: number;
  /** Quando foi salvo (`Date.now()`). */
  savedAt: number;
  mapId: string;
  /** Nome do mapa, para a lista de saves. */
  mapName: string;
  /** Rodada (o "Turno N" do bilhete), para a lista de saves. */
  round: number;
  /** Quem joga agora (nome), para a lista de saves. */
  activeName: string;

  /** Escalação: pontos de cada agente e o Capitão. */
  roster: { points: Record<string, Stats>; captain: string | null };

  turn: number;
  activeIndex: number;
  positions: [string, HexCoord][];
  group: string[];
  groupLine: string[];
  enemies: EnemyState[];
  doors: [string, Door][];
  burned: string[];
  noticed: string[];
  found: string[];
  noticeRolled: string[];
  seenAgents: string[];
  ranThisRound: string[];
  caughtThisRound: string[];
  dialogues: [string, DialogueMemory][];
  linePools: [string, string[]][];
  clueLog: string[];
  fieldNotes: SavedNote[];
  hasKey: boolean;
  keySeenBy: string[];
  planeNote: string | null;
  breakInUntil: number;
}

/** Resumo de um save para a tela do menu. */
export interface SaveSummary {
  id: SaveId;
  mapId: string;
  mapName: string;
  round: number;
  activeName: string;
  savedAt: number;
}

const keyOf = (id: SaveId) => (id === 'auto' ? AUTOSAVE_KEY : SLOT_KEY(id));

/** Lê um save cru; qualquer coisa estranha (versão velha, JSON quebrado) vira `null`. */
export function parseSave(raw: string | null): SaveState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<SaveState>;
    if (
      !s ||
      s.version !== SAVE_VERSION ||
      typeof s.mapId !== 'string' ||
      !Array.isArray(s.positions)
    )
      return null;
    return s as SaveState;
  } catch {
    return null;
  }
}

export const summaryOf = (id: SaveId, s: SaveState): SaveSummary => ({
  id,
  mapId: s.mapId,
  mapName: s.mapName,
  round: s.round,
  activeName: s.activeName,
  savedAt: s.savedAt,
});

/** "26/11 18:40": quando um save foi feito, curto. */
export function savedAtLabel(t: number): string {
  const d = new Date(t);
  const two = (n: number) => String(n).padStart(2, '0');
  return `${two(d.getDate())}/${two(d.getMonth() + 1)} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function sessionStore(): Store | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Os saves da sessão. A lista (`summaries`) é um sinal: o menu se atualiza quando o automático
 * grava no fim do turno ou um slot é sobrescrito.
 */
@Injectable({ providedIn: 'root' })
export class SaveGames {
  private readonly store: Store | null;
  private readonly version = signal(0);

  constructor() {
    this.store = sessionStore();
  }

  /** Dá para salvar (sem armazenamento, no modo privado de alguns navegadores, não dá). */
  get supported(): boolean {
    return !!this.store;
  }

  read(id: SaveId): SaveState | null {
    try {
      return parseSave(this.store?.getItem(keyOf(id)) ?? null);
    } catch {
      return null;
    }
  }

  write(id: SaveId, state: SaveState): boolean {
    try {
      this.store?.setItem(keyOf(id), JSON.stringify(state));
      this.version.update((v) => v + 1);
      return !!this.store;
    } catch {
      // cota cheia ou armazenamento bloqueado
      return false;
    }
  }

  clear(id: SaveId): void {
    try {
      this.store?.removeItem(keyOf(id));
    } catch {
      // nada a fazer
    }
    this.version.update((v) => v + 1);
  }

  /** Automático e slots, na ordem do menu (`null` = vazio). */
  summaries(): { auto: SaveSummary | null; slots: { slot: number; save: SaveSummary | null }[] } {
    this.version();
    const auto = this.read('auto');
    return {
      auto: auto && summaryOf('auto', auto),
      slots: Array.from({ length: SLOT_COUNT }, (_, i) => {
        const s = this.read(i + 1);
        return { slot: i + 1, save: s && summaryOf(i + 1, s) };
      }),
    };
  }
}
