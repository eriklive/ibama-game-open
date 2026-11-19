import { Injectable, signal } from '@angular/core';
import { AgentClass, classBaseStats, classOf } from './agent-class';
import { CHARACTERS } from './maps';
import { Loadout, STAT_KEYS, StatKey, Stats, ZERO_STATS, freePoints, sheetStats } from './stats';

const STORAGE_KEY = 'ibama.escalacao';
const CAPTAIN_KEY = 'ibama.capitao';

/** Capitão de quem nunca passou pela ficha: o primeiro da equipe. */
export const DEFAULT_CAPTAIN = CHARACTERS[0]?.id ?? null;

/**
 * Escalação da missão: os pontos que o jogador distribuiu na ficha de cada agente e quem é o
 * Capitão (os demais são Agentes; ver `agent-class.ts`). A ficha (tela de escalação) escreve
 * aqui e a partida lê. Fica guardada na sessão do navegador, para sobreviver a um recarregar
 * da página no meio da partida.
 */
@Injectable({ providedIn: 'root' })
export class RosterService {
  private readonly points = signal<Readonly<Record<string, Stats>>>(load());
  /** Quem é o Capitão (um só na equipe). */
  readonly captain = signal<string | null>(loadCaptain());

  /** Pontos distribuídos por agente (`ZERO_STATS` para quem não passou pela ficha). */
  spent(id: string): Stats {
    return this.points()[id] ?? ZERO_STATS;
  }

  /** Atributos de um agente em campo: base da classe + pontos (equipamento ainda não existe). */
  loadout(id: string): Loadout {
    return { attributes: sheetStats(this.spent(id), classBaseStats(this.classOf(id))) };
  }

  /** Classe do agente: Capitão ou Agente. */
  classOf(id: string): AgentClass {
    return classOf(id, this.captain());
  }

  /** Confirma a escalação inteira. */
  confirm(points: Readonly<Record<string, Stats>>, captain: string | null = this.captain()): void {
    this.points.set({ ...points });
    this.captain.set(captain);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(points));
      sessionStorage.setItem(CAPTAIN_KEY, captain ?? '');
    } catch {
      // sem armazenamento (modo privado): fica só na memória
    }
  }
}

function load(): Record<string, Stats> {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      Partial<Stats> & { velocidade?: number }
    >;
    const out: Record<string, Stats> = {};
    for (const [id, s] of Object.entries(raw ?? {})) {
      // escalações guardadas antes do Vigor chamavam o atributo de "velocidade"
      const src: Partial<Stats> = { ...s, vigor: s?.vigor ?? s?.velocidade };
      const v: Record<StatKey, number> = { ...ZERO_STATS };
      for (const k of STAT_KEYS) if (Number.isInteger(src[k]) && src[k]! >= 0) v[k] = src[k]!;
      // só aceita uma distribuição possível (sem gastar mais pontos do que há)
      out[id] = freePoints(v) >= 0 ? v : ZERO_STATS;
    }
    return out;
  } catch {
    return {};
  }
}

function loadCaptain(): string | null {
  try {
    const id = sessionStorage.getItem(CAPTAIN_KEY);
    return id && CHARACTERS.some((c) => c.id === id) ? id : DEFAULT_CAPTAIN;
  } catch {
    return DEFAULT_CAPTAIN;
  }
}
