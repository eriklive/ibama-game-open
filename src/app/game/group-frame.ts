/**
 * Enquadramento de um grupo de pontos no chão (o agente e o que ele vai queimar): para onde a
 * câmera de jogo vai e quanto aproxima para todos caberem juntos no meio da tela, com folga.
 *
 * É a mesma câmera de `HexBoard.placePerspective`: inclinada `pitchDeg` graus, olhando de +Z,
 * afastada `distPerZoom * zoom` do ponto que mira, e mirando `lead` à frente (+Z) do alvo — o
 * que deixa o alvo um pouco acima do centro, longe do painel de baixo. Conta pura (sem Three),
 * para dar para testar.
 */

export interface GroundPoint {
  x: number;
  z: number;
}

export interface FrameCamera {
  /** Campo de visão vertical (graus). */
  fovDeg: number;
  /** Proporção da tela (largura / altura). */
  aspect: number;
  /** Inclinação da câmera (graus acima do chão; 90 = de cima). */
  pitchDeg: number;
  /** Distância da câmera até o ponto que mira, por unidade de zoom. */
  distPerZoom: number;
  /** Quanto a câmera mira à frente (+Z, para baixo na tela) do alvo. */
  lead: number;
}

export interface FrameOptions {
  /** Folga em volta dos pontos (unidades do mundo). */
  padding: number;
  /** Fração da tela (0–1) que o grupo pode ocupar: o resto sobra para a interface. */
  fill: number;
  /** Zoom mínimo (mais perto) e máximo (mais longe) permitidos. */
  minZoom: number;
  maxZoom: number;
}

export const GROUP_FRAME: FrameOptions = {
  padding: 1.3,
  fill: 0.8,
  minZoom: 0.55,
  maxZoom: 3,
};

export interface GroupFrame {
  /** Alvo da câmera (o que entra em `camGoal`): o meio da caixa dos pontos. */
  x: number;
  z: number;
  zoom: number;
}

const rad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Meio da caixa dos pontos (com a folga) e o menor zoom que deixa a caixa inteira dentro da
 * fração `fill` da tela. `null` sem pontos.
 */
export function frameGroup(
  points: readonly GroundPoint[],
  cam: FrameCamera,
  opts: FrameOptions = GROUP_FRAME,
): GroupFrame | null {
  if (!points.length) return null;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x);
    z0 = Math.min(z0, p.z); z1 = Math.max(z1, p.z);
  }
  const x = (x0 + x1) / 2;
  const z = (z0 + z1) / 2;
  const halfW = (x1 - x0) / 2 + opts.padding;
  const halfD = (z1 - z0) / 2 + opts.padding;

  // Por unidade de distância da câmera até o ponto que mira (tudo cresce junto com ela):
  // meia largura visível no chão e quanto se enxerga à frente (para longe) e atrás (para perto).
  const fill = Math.min(1, Math.max(0.05, opts.fill));
  const half = rad(cam.fovDeg) / 2;
  const pitch = rad(cam.pitchDeg);
  const width = Math.tan(half) * Math.max(0.05, cam.aspect) * fill;
  const h = Math.sin(pitch);
  const mid = h / Math.tan(pitch);
  // o raio de cima da tela pode nem chegar ao chão (câmera rasa): não limita
  const far = pitch - half * fill > 0 ? h / Math.tan(pitch - half * fill) - mid : Infinity;
  const near = mid - h / Math.tan(pitch + half * fill);

  // o alvo fica `lead` atrás de onde a câmera mira: a caixa vai `lead` mais longe num lado
  const dist = Math.max(halfW / width, (halfD + cam.lead) / far, (halfD - cam.lead) / near, 0);
  const zoom = Math.min(opts.maxZoom, Math.max(opts.minZoom, dist / cam.distPerZoom));
  return { x, z, zoom };
}
