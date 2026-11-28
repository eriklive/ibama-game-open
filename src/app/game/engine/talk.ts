/**
 * Interrogatório no motor: a conversa com um suspeito rendido é uma sessão no estado
 * (`GameState.talk`), e cada pergunta é uma ação com o d20 escondido e o sorteio da fala já
 * resolvidos. O que o suspeito entrega (pista, esconderijo, comparsa) e o que vai para a
 * caderneta saem do motor, iguais para todos.
 *
 * As regras e os textos continuam em `../interrogation.ts` e `../npc-dialogue.ts`.
 */
import { CHASE_RULES } from '../chase';
import { rollDie } from '../dice';
import { HexCoord, hexKey, hexesInRange } from '../hex';
import {
  Answer,
  Clues,
  DialogueMemory,
  EMPTY_MEMORY,
  INTERROGATION_RULES,
  NoteKind,
  askQuestion,
  hasDialogue,
  inAura,
  itemClue,
  noteKind,
  questionCost,
} from '../interrogation';
import { npcClass } from '../npc-dialogue';
import { statBreakdown } from '../stats';
import { GameState, World, activeAgent, findEnemy, loadoutOf, solidOf } from './state';

/** Uma anotação da caderneta de campo (vai para o relatório da operação). */
export interface FieldNoteData {
  readonly id: number;
  readonly suspect: string;
  readonly text: string;
  readonly kind: NoteKind;
  /** 0 pergunta, 1 réplica, 2 tréplica. */
  readonly depth: number;
}

/** A conversa aberta agora. */
export interface TalkSession {
  readonly enemy: string;
  /** Perguntas já feitas nesta conversa (a primeira gasta o movimento). */
  readonly asked: number;
  /** O comparsa escondido que o suspeito entregou nesta conversa (aparece ao encerrar). */
  readonly reveal: string | null;
}

export type TalkAction =
  /** O agente da vez abre a conversa com o rendido `enemy` (colado nele). */
  | { readonly type: 'startTalk'; readonly agent: string; readonly enemy: string }
  /** Pergunta `key`: `roll` é o d20 escondido do suspeito e `draw`, o sorteio da fala ([0, 1)). */
  | {
      readonly type: 'ask';
      readonly agent: string;
      readonly enemy: string;
      readonly key: string;
      readonly roll: number;
      readonly draw: number;
    }
  /** Encerra a conversa; se o suspeito entregou alguém, ele aparece em `revealAt`. */
  | { readonly type: 'endTalk'; readonly revealAt?: HexCoord }
  /** A equipe anota uma pista vista em campo (o avião trancado, por exemplo). */
  | { readonly type: 'noteClue'; readonly clue: string };

export const TALK_ACTIONS: ReadonlySet<string> = new Set<TalkAction['type']>([
  'startTalk',
  'ask',
  'endTalk',
  'noteClue',
]);

type AskAct = Extract<TalkAction, { type: 'ask' }>;

/** O que a equipe sabe e libera perguntas: as pistas anotadas e os achados. */
export const cluesOf = (state: Pick<GameState, 'found' | 'clueLog'>): Clues =>
  new Set([...state.found.map(itemClue), ...state.clueLog]);

export const memoryOf = (state: GameState, enemy: string): DialogueMemory =>
  state.dialogues[enemy] ?? EMPTY_MEMORY;

/**
 * Intimidação de quem conversa: só o ponto do agente (atributo + equipamento, sem grupo), e +2
 * se o suspeito foi agarrado numa perseguição (abalado).
 */
export function talkIntimidation(state: GameState, agent: string, enemy: string): number {
  const own = statBreakdown(loadoutOf(state, agent), 'intimidacao', false).total;
  return own + (findEnemy(state, enemy)?.shaken ? CHASE_RULES.shakenBonus : 0);
}

/** A pergunta `key`, com o d20 e o sorteio da fala vindos de `rng`. */
export const planAsk = (state: GameState, key: string, rng: () => number): AskAct => ({
  type: 'ask',
  agent: activeAgent(state),
  enemy: state.talk?.enemy ?? '',
  key,
  roll: rollDie(INTERROGATION_RULES.die, rng),
  draw: rng(),
});

/** O que a pergunta dá (a fala, o resultado, a réplica liberada), o mesmo que o motor aplica. */
export function askResult(
  state: GameState,
  act: AskAct,
): {
  memory: DialogueMemory;
  answer: Answer;
  pools: ReadonlyMap<string, readonly string[]>;
} | null {
  const enemy = findEnemy(state, act.enemy);
  const cls = npcClass(enemy?.npc);
  if (!enemy || !hasDialogue(cls)) return null;
  return askQuestion(cls, memoryOf(state, act.enemy), act.key, {
    die: () => act.roll,
    rng: () => act.draw,
    clues: cluesOf(state),
    intimidation: talkIntimidation(state, act.agent, act.enemy),
    pools: new Map(Object.entries(state.linePools)),
  });
}

/**
 * Encerrar a conversa: se o suspeito entregou alguém, acha onde ele aparece (no lugar dele ou
 * no hexágono livre mais perto).
 */
export function planEndTalk(
  state: GameState,
  world: World,
): Extract<TalkAction, { type: 'endTalk' }> {
  const id = state.talk?.reveal;
  const e = id ? findEnemy(state, id) : undefined;
  if (!e || e.status !== 'hidden') return { type: 'endTalk' };
  const taken = new Set(
    [
      ...Object.values(state.positions),
      ...state.enemies
        .filter((o) => o.status !== 'hidden' && o.status !== 'fled')
        .map((o) => o.hex),
    ].map(hexKey),
  );
  const solid = solidOf(state, world);
  const free = (h: HexCoord) => !taken.has(hexKey(h)) && !solid.has(hexKey(h));
  let hex = e.hex;
  for (let r = 0; r < 4 && !free(hex); r++)
    hex = hexesInRange(e.hex, r + 1, world.area).find(free) ?? hex;
  return { type: 'endTalk', revealAt: { ...hex } };
}

export function validateTalk(state: GameState, action: TalkAction): string | null {
  switch (action.type) {
    case 'startTalk': {
      if (state.talk) return 'já há uma conversa aberta';
      if (action.agent !== activeAgent(state)) return 'só quem está na vez conversa';
      const e = findEnemy(state, action.enemy);
      if (!e || e.status !== 'surrendered') return 'só se conversa com quem se rendeu';
      if (!hasDialogue(npcClass(e.npc))) return `${e.name} não tem o que dizer`;
      const at = state.positions[action.agent];
      if (!at || !inAura(at, e.hex)) return 'longe do suspeito';
      return state.movesLeft < INTERROGATION_RULES.moveCost
        ? 'movimento insuficiente para conversar'
        : null;
    }
    case 'ask':
      if (!state.talk || state.talk.enemy !== action.enemy)
        return 'não há conversa aberta com esse suspeito';
      if (action.agent !== activeAgent(state)) return 'só quem está na vez pergunta';
      if (
        !Number.isInteger(action.roll) ||
        action.roll < 1 ||
        action.roll > INTERROGATION_RULES.die
      )
        return 'd20 inválido';
      if (!(action.draw >= 0 && action.draw < 1)) return 'sorteio da fala inválido';
      return askResult(state, action) ? null : 'pergunta já feita, oculta ou inexistente';
    case 'endTalk':
      return state.talk ? null : 'não há conversa aberta';
    case 'noteClue':
      return action.clue ? null : 'pista vazia';
  }
}

const add = (list: readonly string[], item: string): readonly string[] =>
  list.includes(item) ? list : [...list, item];

export function applyTalk(state: GameState, action: TalkAction): GameState {
  switch (action.type) {
    case 'startTalk':
      return { ...state, talk: { enemy: action.enemy, asked: 0, reveal: null } };
    case 'ask': {
      const res = askResult(state, action)!;
      const talk = state.talk!;
      const suspect = findEnemy(state, action.enemy)!;
      const out = res.answer.outcome;
      // entregou alguém: o comparsa escondido aparece ao encerrar
      const hiddenId = suspect.reveals;
      const reveal =
        out.reveal && hiddenId && findEnemy(state, hiddenId)?.status === 'hidden'
          ? hiddenId
          : talk.reveal;
      const nextId = state.fieldNotes.reduce((n, note) => Math.max(n, note.id), 0) + 1;
      return {
        ...state,
        dialogues: { ...state.dialogues, [action.enemy]: res.memory },
        linePools: Object.fromEntries([...res.pools].map(([k, v]) => [k, [...v]])),
        // a primeira pergunta de cada conversa gasta o movimento
        movesLeft: Math.max(0, state.movesLeft - questionCost(talk.asked)),
        talk: { ...talk, asked: talk.asked + 1, reveal },
        fieldNotes: [
          ...state.fieldNotes,
          {
            id: nextId,
            suspect: suspect.name,
            text: out.note,
            kind: noteKind(out),
            depth: res.answer.option.depth,
          },
        ],
        // entregou um esconderijo (ou o quadro de chaves): conta como percebido
        noticed: out.notices ? add(state.noticed, out.notices) : state.noticed,
        // pista nova: pode liberar perguntas (neste e em outros suspeitos)
        clueLog: out.clue ? add(state.clueLog, out.clue) : state.clueLog,
      };
    }
    case 'endTalk': {
      const talk = state.talk!;
      const enemies = state.enemies.map((e) => {
        // o abalado vale só para a primeira conversa
        if (e.id === talk.enemy && talk.asked && e.shaken) return { ...e, shaken: false };
        if (action.revealAt && e.id === talk.reveal && e.status === 'hidden') {
          return { ...e, status: 'patrol' as const, hex: { ...action.revealAt } };
        }
        return e;
      });
      return { ...state, enemies, talk: null };
    }
    case 'noteClue':
      return { ...state, clueLog: add(state.clueLog, action.clue) };
  }
}
