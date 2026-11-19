/**
 * Classes dos agentes (Capitão e Agente). Não confundir com a classe de NPC do interrogatório
 * (`NpcClass`, em `interrogation.ts`).
 *
 * A classe dá dois tipos de coisa, cada um com a sua tabela:
 * - **Perícias** (`SKILLS`): um número somado na rolagem de uma ação. Matriz perícia × classe.
 * - **Habilidades** (`ABILITIES`): regras que mudam como uma ação funciona, sem rolagem.
 *
 * A equipe tem **um Capitão só** (a ficha garante: marcar outro tira a classe do anterior);
 * os demais são Agentes.
 *
 * Só dados e funções puras (testadas em `agent-class.spec.ts`).
 */
import type { StatKey, Stats } from './stats';

export type AgentClass = 'capitao' | 'agente';
export const AGENT_CLASSES: readonly AgentClass[] = ['capitao', 'agente'];

export const CLASS_INFO: Readonly<Record<AgentClass, { name: string; blurb: string }>> = {
  capitao: { name: 'Capitão', blurb: 'Lidera o grupo. Só um por equipe.' },
  agente: { name: 'Agente', blurb: 'Agente de campo. Bom com fechaduras.' },
};

// ---------- perícias ----------

export type SkillKey = 'gazua';

export interface Skill {
  name: string;
  /** Ação em que o bônus entra (texto da ficha). */
  action: string;
  /** Bônus por classe (sem a classe na lista, 0: qualquer um pode tentar a ação). */
  byClass: Readonly<Partial<Record<AgentClass, number>>>;
}

export const SKILLS: Readonly<Record<SkillKey, Skill>> = {
  gazua: { name: 'Gazua', action: 'Destrancar', byClass: { agente: 6 } },
};

/** Bônus da perícia para a classe (0 se a classe não tem a perícia). */
export const skillBonus = (cls: AgentClass, skill: SkillKey): number => SKILLS[skill].byClass[cls] ?? 0;

/** Perícias da classe, com o bônus, para a ficha. */
export function classSkills(cls: AgentClass): { key: SkillKey; skill: Skill; bonus: number }[] {
  return (Object.keys(SKILLS) as SkillKey[])
    .map((key) => ({ key, skill: SKILLS[key], bonus: skillBonus(cls, key) }))
    .filter((s) => s.bonus !== 0);
}

// ---------- habilidades ----------

export type AbilityKey = 'comando' | 'lideranca';

export interface Ability {
  name: string;
  cls: AgentClass;
  kind: 'ativa' | 'passiva';
  /** Resumo de uma linha (ficha e mensagens). */
  summary: string;
}

export const ABILITIES: Readonly<Record<AbilityKey, Ability>> = {
  comando: {
    name: 'Comando',
    cls: 'capitao',
    kind: 'ativa',
    summary: 'Agrupar sem gastar movimento, uma vez por turno',
  },
  lideranca: {
    name: 'Liderança',
    cls: 'capitao',
    kind: 'passiva',
    summary: '+1 de movimento e +1 de intimidação para o grupo',
  },
};

export const CLASS_RULES = {
  /** Quantas vezes por turno o Comando deixa o Agrupar sem custo. */
  commandPerTurn: 1,
  /** O que a Liderança soma em cada atributo de quem está no grupo com o Capitão. */
  leadership: { vigor: 1, intimidacao: 1, iniciativa: 0, agilidade: 0 } satisfies Stats,
  /** Atributos com que cada classe começa, antes do ponto livre. */
  baseStats: {
    capitao: { vigor: 0, intimidacao: 0, iniciativa: 1, agilidade: 0 },
    agente: { vigor: 0, intimidacao: 0, iniciativa: 0, agilidade: 1 },
  } satisfies Record<AgentClass, Stats>,
} as const;

/** Base de atributos da classe (o ponto livre vem por cima). */
export const classBaseStats = (cls: AgentClass): Stats => CLASS_RULES.baseStats[cls];

export const hasAbility = (cls: AgentClass, ability: AbilityKey): boolean => ABILITIES[ability].cls === cls;

/** Habilidades da classe, para a ficha. */
export function classAbilities(cls: AgentClass): { key: AbilityKey; ability: Ability }[] {
  return (Object.keys(ABILITIES) as AbilityKey[])
    .filter((key) => hasAbility(cls, key))
    .map((key) => ({ key, ability: ABILITIES[key] }));
}

/** Bônus da Liderança num atributo (só com o Capitão no grupo). */
export const leadershipBonus = (key: StatKey, led: boolean): number => (led ? CLASS_RULES.leadership[key] : 0);

/**
 * Movimento gasto pelo Agrupar: o normal, ou 0 quando quem chama tem o Comando e ainda não o
 * usou neste turno.
 */
export function rallyCost(cost: number, cls: AgentClass, commandsUsed: number): number {
  return commandFree(cls, commandsUsed) ? 0 : cost;
}

/** O Comando ainda vale neste turno para essa classe. */
export const commandFree = (cls: AgentClass, commandsUsed: number): boolean =>
  hasAbility(cls, 'comando') && commandsUsed < CLASS_RULES.commandPerTurn;

/** Classe de um agente, sabendo quem é o Capitão da equipe. */
export const classOf = (id: string, captainId: string | null): AgentClass =>
  id === captainId ? 'capitao' : 'agente';
