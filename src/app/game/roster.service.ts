import { Injectable, signal } from '@angular/core';
import { Loadout, STAT_KEYS, StatKey, Stats, ZERO_STATS, freePoints, sheetStats } from './stats';

const STORAGE_KEY = 'ibama.escalacao';

/**
 * Escalação da missão: os pontos que o jogador distribuiu na ficha de cada agente.
 * A ficha (tela de escalação) escreve aqui e a partida lê. Fica guardada na sessão do
 * navegador, para sobreviver a um recarregar da página no meio da partida.
 */
@Injectable({ providedIn: 'root' })
export class RosterService {
  private readonly points = signal<Readonly<Record<string, Stats>>>(load());

  /** Pontos distribuídos por agente (`ZERO_STATS` para quem não passou pela ficha). */
  spent(id: string): Stats {
    return this.points()[id] ?? ZERO_STATS;
  }

  /** Atributos de um agente em campo (equipamento ainda não existe). */
  loadout(id: string): Loadout {
    return { attributes: sheetStats(this.spent(id)) };
  }

  /** Confirma a escalação inteira. */
  confirm(points: Readonly<Record<string, Stats>>): void {
    this.points.set({ ...points });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(points));
    } catch {
      // sem armazenamento (modo privado): fica só na memória
    }
  }
}

function load(): Record<string, Stats> {
  try {
    const raw = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Record<
      string,
      Partial<Stats>
    >;
    const out: Record<string, Stats> = {};
    for (const [id, s] of Object.entries(raw ?? {})) {
      const v: Record<StatKey, number> = { ...ZERO_STATS };
      for (const k of STAT_KEYS) if (Number.isInteger(s?.[k]) && s[k]! >= 0) v[k] = s[k]!;
      // só aceita uma distribuição possível (sem gastar mais pontos do que há)
      out[id] = freePoints(v) >= 0 ? v : ZERO_STATS;
    }
    return out;
  } catch {
    return {};
  }
}
