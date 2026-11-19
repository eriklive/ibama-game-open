import { Component, computed, input, output, signal } from '@angular/core';
import { LEVEL_LABEL, NpcClass, QuestionOption } from '../../game/interrogation';

/** Conversa em close-up (modo diálogo): com quem, as perguntas (cartões) e os balões. */
export interface InterrogationView {
  enemyId: string;
  /** Nome do suspeito no balão ("Piloto", "Caseiro Jô"). */
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
  /** Perguntas feitas nesta entrada (a primeira gasta o movimento). */
  asked: number;
  /** Alguém escondido foi entregue: aparece no mapa ao encerrar. */
  reveal: string | null;
}

/**
 * Papelada do modo diálogo (tom de interrogatório), por cima do close-up do tabuleiro: a rubrica (classe e traço) no
 * canto, o balão do agente, o balão do suspeito (no canto de baixo), os cartões de pergunta
 * (réplica e tréplica recuadas, com o carimbo; as já feitas riscadas, com "Perguntado") e
 * **Encerrar**. Só mostra texto: a rolagem do
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
  /**
   * Todos os cartões, na ordem: as perguntas já feitas continuam (marcadas, bloqueadas) para o
   * jogador ver o histórico; `openIndex` é a posição entre as ainda abertas (a do controle).
   */
  protected readonly cards = computed(() => {
    let n = 0;
    return this.view().options.map((option) => ({ option, openIndex: option.done ? -1 : n++ }));
  });
  protected readonly openCount = computed(() => this.view().options.filter((o) => !o.done).length);
  protected readonly doneCount = computed(() => this.view().options.length - this.openCount());
  /**
   * As já feitas ficam dobradas numa linha só ("✓ 3 já perguntadas"), para as abertas caberem
   * no celular deitado; um toque desdobra o histórico.
   */
  protected readonly showDone = signal(false);
  /** Cartões na tela: com o histórico dobrado, só as perguntas abertas. */
  protected readonly shown = computed(() =>
    this.showDone() ? this.cards() : this.cards().filter((c) => !c.option.done),
  );
  /** A última fala completa, para o leitor de tela (o balão vai aparecendo letra a letra). */
  protected readonly live = computed(() => {
    const v = this.view();
    const sl = v.suspectLine;
    if (!sl || sl.thinking || sl.text !== sl.full) return '';
    return `${v.suspect}: ${sl.full}${sl.tell ? ` (${sl.tell})` : ''}`;
  });
}
