import { Injectable, signal } from '@angular/core';

export type RenderMode = 'normal' | 'performance' | 'ultra';

/**
 * Quanto do mundo fica montado na memória e quanto a câmera enxerga, em passos de
 * hexágono a partir do centro.
 *
 * - `loadRadius`: raio sempre pré-renderizado em volta do centro de carregamento
 *   (no normal, 5 do miolo + 60 em volta = 65 → um diâmetro de 130 hexágonos).
 * - `viewRadius`: até onde a câmera enxerga (névoa e plano de corte). Quando o centro da
 *   tela se afasta mais que `loadRadius - viewRadius` do centro de carregamento, o centro
 *   é recalculado e o que entrou no raio é montado aos poucos, em segundo plano.
 */
export interface RenderProfile {
  mode: RenderMode;
  label: string;
  hint: string;
  loadRadius: number;
  viewRadius: number;
  /** Teto da densidade de pixels (telas "retina" pesam o dobro ou mais). */
  maxPixelRatio: number;
  shadows: boolean;
}

export const RENDER_PROFILES: Record<RenderMode, RenderProfile> = {
  normal: {
    mode: 'normal',
    label: 'Normal',
    hint: 'Pré-carrega 65 hexágonos em volta · enxerga até 40',
    loadRadius: 65,
    viewRadius: 40,
    maxPixelRatio: 2,
    shadows: true,
  },
  performance: {
    mode: 'performance',
    label: 'Desempenho',
    hint: 'Pré-carrega 30 hexágonos · enxerga até 20',
    loadRadius: 30,
    viewRadius: 20,
    maxPixelRatio: 1.5,
    shadows: true,
  },
  ultra: {
    mode: 'ultra',
    label: 'Ultra desempenho',
    hint: 'Pré-carrega 20 hexágonos · enxerga até 10 · sem sombras',
    loadRadius: 20,
    viewRadius: 10,
    maxPixelRatio: 1,
    shadows: false,
  },
};

const STORAGE_KEY = 'ibama.renderMode';

/** Modo de renderização escolhido no menu; fica guardado no navegador. */
@Injectable({ providedIn: 'root' })
export class RenderSettings {
  readonly mode = signal<RenderMode>(this.load());

  profile(): RenderProfile {
    return RENDER_PROFILES[this.mode()];
  }

  set(mode: RenderMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // sem armazenamento (aba anônima, por exemplo): vale só nesta sessão
    }
  }

  private load(): RenderMode {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v && v in RENDER_PROFILES) return v as RenderMode;
    } catch {
      // idem
    }
    return 'normal';
  }
}

/**
 * Modo Corrida: o horizonte da pista inteiro, em qualquer modo (o garimpeiro nunca some na
 * névoa). Pré-carrega o mapa de corrida quase todo e enxerga longe; densidade de pixels e
 * sombras continuam as do modo escolhido.
 */
export const RUNNER_VIEW = { loadRadius: 90, viewRadius: 60 } as const;

export function runnerProfile(p: RenderProfile): RenderProfile {
  return {
    ...p,
    loadRadius: Math.max(p.loadRadius, RUNNER_VIEW.loadRadius),
    viewRadius: Math.max(p.viewRadius, RUNNER_VIEW.viewRadius),
  };
}
