import { Component, computed, input, output } from '@angular/core';
import { LEVEL_LABEL, NpcClass, QuestionOption } from '../../game/interrogation';

/** Interrogatório em close-up: quem é interrogado, as perguntas (cartões) e os balões. */
export interface InterrogationView {
  enemyId: string;
  /** Nome do suspeito no balão ("Piloto", "Garimpeiro Jô"). */
  suspect: string;
  cls: NpcClass;
  options: QuestionOption[];
  /** Balão do agente: a pergunta (o texto vai aparecendo). */
  agentLine: string | null;
  /** Balão do suspeito (no canto de baixo): rubrica, fala e o sinal de mentira. */
  suspectLine: {
    text: string;
    full: string;
    posture?: string;
    tell?: string;
    thinking: boolean;
  } | null;
  /** Falando: os cartões ficam travados. */
  busy: boolean;
  /** Perguntas já feitas (a primeira gasta o movimento). */
  asked: number;
  /** Alguém escondido foi entregue: aparece no mapa ao encerrar. */
  reveal: string | null;
}

/**
 * Papelada do interrogatório, por cima do close-up do tabuleiro: a rubrica (classe e traço) no
 * canto, o balão do agente, o balão do suspeito (no canto de baixo), os cartões de pergunta
 * (réplica e tréplica recuadas, com o carimbo) e **Encerrar**. Só mostra texto: a rolagem do
 * suspeito é escondida (nada de dado, número ou CD).
 */
@Component({
  selector: 'app-interrogation-panel',
  templateUrl: './interrogation-panel.html',
  styleUrl: './interrogation-panel.css',
})
export class InterrogationPanel {
  readonly view = input.required<InterrogationView>();
  /** Nome do agente que pergunta. */
  readonly agent = input.required<string>();
  /** Cartão destacado pelo controle (índice entre as perguntas abertas); `-1` sem controle. */
  readonly pick = input(-1);
  /** Símbolos do controle (✕ e ○), vazios sem controle. */
  readonly confirmGlyph = input('');
  readonly cancelGlyph = input('');
  /** Movimento que a primeira pergunta gasta. */
  readonly moveCost = input(0);

  readonly ask = output<string>();
  readonly end = output<void>();

  protected readonly levelLabel = LEVEL_LABEL;
  protected readonly open = computed(() => this.view().options.filter((o) => !o.done));
  /** A última fala completa, para o leitor de tela (o balão vai aparecendo letra a letra). */
  protected readonly live = computed(() => {
    const v = this.view();
    const sl = v.suspectLine;
    if (!sl || sl.thinking || sl.text !== sl.full) return '';
    return `${v.suspect}: ${sl.full}${sl.tell ? ` (${sl.tell})` : ''}`;
  });
}
