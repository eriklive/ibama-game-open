/**
 * Investigação no motor: percepção (reparar num móvel ou na cabine do avião), pegar o que foi
 * achado (a arma, o GPS, o rádio, a chave do avião) e deixar a chave no quadro.
 *
 * As regras continuam em `../search.ts` e `../plane.ts`; aqui elas viram ações sobre o
 * `GameState`. O d20 da percepção vem sorteado dentro da ação (`planNotice`). Onde fica cada
 * móvel é do mapa: quem decide se dá para rolar ou pegar é a tela (como o resto da
 * investigação, ela migra com o mapa para o servidor).
 */
import { rollDie } from '../dice';
import { KEY_PANEL_ID, leftKey } from '../plane';
import { SEARCH_RULES, beats } from '../search';
import { GameState, activeAgent } from './state';

export type EvidenceAction =
  /** `agent` rolou percepção no móvel (ou na cabine) `spot`; `roll` é o d20 já sorteado. */
  | {
      readonly type: 'notice';
      readonly agent: string;
      readonly spot: string;
      readonly roll: number;
    }
  /**
   * TRANSITÓRIO: a equipe passa a saber de `spot` sem rolar (um suspeito contou no
   * interrogatório). Some quando o interrogatório migrar para o motor.
   */
  | { readonly type: 'markNoticed'; readonly spot: string }
  /** O agente da vez pega `item` (um achado, ou `KEY_PANEL_ID` para a chave do avião). */
  | { readonly type: 'take'; readonly agent: string; readonly item: string }
  /** O agente viu a chave no quadro e deixou lá (vai lembrar disso quando o avião estiver trancado). */
  | { readonly type: 'leaveKey'; readonly agent: string };

export const EVIDENCE_ACTIONS: ReadonlySet<string> = new Set<EvidenceAction['type']>([
  'notice',
  'markNoticed',
  'take',
  'leaveKey',
]);

/** Já rolou percepção ali (cada agente rola uma vez por móvel). */
export const noticeKey = (spot: string, agent: string): string => `${spot}:${agent}`;

/** A rolagem de percepção de `agent` em `spot`, com o d20 sorteado por `rng`. */
export const planNotice = (
  agent: string,
  spot: string,
  rng: () => number,
): Extract<EvidenceAction, { type: 'notice' }> => ({
  type: 'notice',
  agent,
  spot,
  roll: rollDie(SEARCH_RULES.die, rng),
});

/** Passou na percepção: tirou mais que o alvo. */
export const noticePasses = (roll: number): boolean => beats(roll, SEARCH_RULES.notice);

export function validateEvidence(state: GameState, action: EvidenceAction): string | null {
  switch (action.type) {
    case 'notice':
      if (!state.positions[action.agent]) return `agente desconhecido: ${action.agent}`;
      if (state.noticeRolled.includes(noticeKey(action.spot, action.agent)))
        return 'já rolou percepção aqui';
      if (state.noticed.includes(action.spot)) return 'a equipe já reparou nisso';
      if (!Number.isInteger(action.roll) || action.roll < 1 || action.roll > SEARCH_RULES.die)
        return 'd20 inválido';
      return null;
    case 'markNoticed':
      return null;
    case 'take':
      if (action.agent !== activeAgent(state)) return 'só quem está na vez pega';
      if (action.item === KEY_PANEL_ID) return state.hasKey ? 'a chave já está com a equipe' : null;
      return state.found.includes(action.item) ? 'já foi pego' : null;
    case 'leaveKey':
      if (!state.positions[action.agent]) return `agente desconhecido: ${action.agent}`;
      return state.hasKey ? 'a chave já está com a equipe' : null;
  }
}

const add = (list: readonly string[], item: string): readonly string[] =>
  list.includes(item) ? list : [...list, item];

export function applyEvidence(state: GameState, action: EvidenceAction): GameState {
  switch (action.type) {
    case 'notice': {
      const rolled = {
        ...state,
        noticeRolled: add(state.noticeRolled, noticeKey(action.spot, action.agent)),
      };
      return noticePasses(action.roll)
        ? { ...rolled, noticed: add(state.noticed, action.spot) }
        : rolled;
    }
    case 'markNoticed':
      return { ...state, noticed: add(state.noticed, action.spot) };
    case 'take':
      // a chave vai com a equipe: ninguém mais "viu e deixou lá"
      if (action.item === KEY_PANEL_ID) return { ...state, hasKey: true, keySeenBy: [] };
      return { ...state, found: add(state.found, action.item) };
    case 'leaveKey':
      return {
        ...state,
        keySeenBy: leftKey({ hasKey: state.hasKey, seenBy: state.keySeenBy }, action.agent).seenBy,
      };
  }
}
