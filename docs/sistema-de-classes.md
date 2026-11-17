# Sistema de classes (e modificadores por ação)

> Proposta de design · status: **rascunho para discussão** · nada aqui está implementado em `src/` ainda.

Primeira versão, propositalmente pequena: **duas classes** (Capitão e Agente) e uma regra geral
para dizer **qual atributo e qual perícia pesam em cada ação**. A ideia é que tudo continue
cabendo no que já existe: `GROUP_RULES` (`group.ts`), `DOOR_RULES` (`door.ts`), os atributos da
ficha (`stats.ts`) e o d20 das portas e da abordagem.

---

## 1. Mudança no grupo (vale para todos)

| | Hoje | Proposta |
|---|---|---|
| Bônus de movimento do grupo (`GROUP_RULES.moveBonus`) | +2 | **+1** |
| Movimento: grupo com o Capitão | — | **+2** (+1 do grupo, +1 do Capitão) |
| Raio de abordagem base (`APPROACH_RULES.surrenderRange`) | 2 | **3** |
| Bônus de intimidação do grupo (`GROUP_RULES.approachBonus`) | +2 | **+1** |
| Intimidação: grupo com o Capitão | — | **+2** (+1 do grupo, +1 do Capitão) |

Ou seja: agrupar continua valendo a pena, mas o grupo "cheio" (+2, como hoje) passa a depender
de ter um Capitão nele, tanto no movimento quanto na intimidação. O alcance da abordagem segue a mesma lógica e passa a ser individual
(ver 3.5).

---

## 2. Classes

Cada agente tem **uma** classe, que pode ser trocada no menu (ficha) antes da missão.
A equipe tem **um único Capitão**: o menu só deixa marcar um. Hoje são três personagens, então
a formação é sempre **1 Capitão + 2 Agentes** (Agentes não têm limite, se a equipe crescer). A classe dá
**habilidades** (regras que mudam uma ação) e/ou **perícias** (bônus fixo numa rolagem).

### 2.1 Capitão

| Habilidade | Efeito |
|---|---|
| **Comando** | Quando o Capitão é quem chama o "Agrupar", o encontro **não gasta movimento** de ninguém. Os pontos de encontro possíveis continuam limitados pelo movimento que ele ainda tem (o grupo precisa conseguir chegar lá); só o custo (`plan.cost`) vira 0. |
| **Liderança** | Enquanto o Capitão está no grupo, **todo o grupo** ganha +1 de movimento e +1 de intimidação, além do +1 normal do grupo em cada um. |

Regras de borda propostas:

- O +1 do Capitão **só vale agrupado** (Capitão sozinho não ganha nada de movimento nem de
  intimidação).
- **Um Capitão na equipe**: quem garante é o menu (marcar outro como Capitão tira a classe do
  anterior, que volta a ser Agente). Assim o jogo nunca precisa lidar com dois Capitães em campo
  e o grupo único que existe hoje no código continua bastando.
- "Comando" só vale quando o Capitão **lidera** o Agrupar (é a vez dele). Se outro agente chama
  o Agrupar e o Capitão só vem junto, o custo é o normal.

### 2.2 Agente

| Perícia | Efeito |
|---|---|
| **Gazua** (pick lock) | +6 na rolagem de destrancar uma porta. |

**Qualquer agente pode tentar destrancar.** A perícia dá vantagem, não exclusividade. Com a
fechadura padrão (`DOOR_RULES.lock = 12`), isso muda bastante a chance:

| Quem tenta | Precisa no d20 | Chance |
|---|---|---|
| Sem perícia | 12+ | 45% |
| Agente (+6) | 6+ | 75% |
| Agente, fechadura fácil (10) | 4+ | 85% |

> **Tradução de "picklocking":** sugestão **"Destrancar"** como nome da ação no menu da porta e
> **"Gazua"** como nome da perícia ("Gazua +6"). Alternativas: "Abrir fechadura", "Forçar
> fechadura" (mas "forçar" confunde com arrombar). O BG3 em português usa "Ferramentas de ladrão"
> para a proficiência e "Prestidigitação" para a perícia — longo demais para o nosso menu.

---

## 3. Modificadores por ação: como o Baldur's Gate faz

- **BG1/BG2 (AD&D 2ª ed.)**: "Abrir fechaduras" é uma **perícia de ladrão em %**. O jogador
  distribui pontos nela a cada nível, e a **Destreza** dá um ajuste pequeno por cima (Des 16:
  +5%, Des 9: −10%, etc.). Ou seja: a perícia é o principal; o atributo é tempero.
- **BG3 (D&D 5ª ed.)**: toda checagem é **d20 + modificador do atributo + proficiência** (se a
  classe/antecedente é proficiente) contra uma dificuldade (CD). Destrancar = Destreza
  (Prestidigitação) + proficiência em ferramentas de ladrão; o Ladino tem *Especialização* e soma
  a proficiência **em dobro**. Arrombar/forçar = Força (Atletismo). Intimidar = Carisma
  (Intimidação).

O modelo do BG3 é exatamente o que você descreveu e encaixa no nosso d20: **cada ação declara,
opcionalmente, um atributo e uma perícia**, e a rolagem soma o que existir.

### 3.1 Regra geral proposta

```
total = d20 + atributo da ação (se houver) + perícia da classe (se houver) + equipamento
passa se total ≥ dificuldade
```

| Ação | Atributo | Perícia (classe) | Dificuldade |
|---|---|---|---|
| Arrombar | **Força** | — | 3 (encostada) / 12 (trancada) |
| Destrancar | **Destreza** | Gazua +6 (Agente) | fechadura da porta (padrão 12) |
| Interrogar / conversar | **Intimidação** só da ficha (soma à CD do NPC) | — | 8 / 12 / 14 (branch do interrogatório) |
| Abordar | **Intimidação** (vira alcance, não rolagem do agente) | — | raio = 3 + intimidação (ver 3.5) |
| Mover | **Vigor** (hoje "Velocidade") | — (ver bônus de movimentação, 3.4) | — |

Em código seria só uma tabela, algo como:

```ts
const ACTION_CHECKS: Record<ActionKey, { stat?: StatKey; skill?: SkillKey }> = {
  arrombar:   { stat: 'forca' },
  destrancar: { stat: 'destreza', skill: 'gazua' },
  abordar:    { stat: 'intimidacao' },
};
```

e `doorNeed` / `resolveDoor` passariam a receber o modificador (hoje é d20 puro ≥ `need`).

### 3.2 Interrogar: já resolvido na branch `claude/interrogatorio-v1`

O interrogatório tem regras próprias (`INTERROGATION_RULES` em `interrogation.ts`) e não entra
neste sistema por enquanto. Resumo do que ele faz, para não conflitar:

- O NPC rola 1d20 escondido (+ `mod` da classe de NPC) e resiste se tirar **mais que** a CD.
  CDs: pergunta 8, réplica 12, tréplica 14.
- Cada ponto de intimidação do agente que conversa **soma 1 à CD**.
- Usa só a intimidação **da ficha** do agente: o bônus do grupo e o do arrombamento ficam de
  fora, de propósito.

Como o Capitão não dá bônus pessoal (só bônus de grupo), as classes **não mudam o
interrogatório**. Ver o impacto completo na seção 5.

### 3.3 O problema da Destreza (e da Força)

Hoje a ficha só tem **Velocidade** e **Intimidação**, com 1 ponto para distribuir. Opções:

1. **Adicionar Força e Destreza à ficha** (recomendado a médio prazo). Fica igual ao BG3 e cada
   ação de porta ganha um atributo natural. Custo: com só 1 ponto, quatro atributos diluem a
   escolha — provavelmente o número de pontos (`STAT_RULES.points`) precisa subir para 2–3.
2. **Por enquanto, não ligar a atributo nenhum** (recomendado agora). Destrancar usa só a
   perícia (Agente +6) e arrombar fica no d20 puro. A tabela `ACTION_CHECKS` já nasce com o campo
   `stat` opcional, e quando Força/Destreza existirem é só preencher.
3. **Reaproveitar Velocidade como "Agilidade"** e ligar o destrancar nela. Barato, mas mistura
   correr com mão leve, e força o jogador a escolher entre os dois sem querer.

Recomendação: **opção 2 agora, opção 1 quando as classes estiverem testadas.** A perícia +6 do
Agente já carrega a diferença que importa; a Destreza seria o "tempero" (como no BG1/BG2).

### 3.4 Movimento: atributo Vigor + bônus de movimentação

Proposta: renomear **Velocidade → Vigor** e separar duas coisas que hoje andam juntas:

- **Vigor** é o atributo da ficha (−5 … +5). É o "modificador" do movimento, do mesmo jeito que
  Força é o de arrombar. Mais tarde pode pesar em outras coisas físicas (aguentar carga,
  perseguir, resistir a cansaço) — "Velocidade" só serviria para andar.
- **Bônus de movimentação** é tudo o que vem de fora do personagem e soma por cima: grupo (+1),
  Liderança do Capitão (+1), equipamento (botas, peso negativo), efeitos temporários.

```
movimento do turno = 2d4 + Vigor + bônus de movimentação   (nunca abaixo de 0)
```

| Fonte | Entra como | Valor |
|---|---|---|
| Ficha | Vigor | −5 … +5 |
| Grupo | bônus de movimentação | +1 |
| Capitão no grupo (Liderança) | bônus de movimentação | +1 |
| Equipamento / peso | bônus de movimentação | a definir (pode ser negativo) |

Vantagens:

- Bate com o BG3: lá o deslocamento base vem da raça e **não** de um atributo; o que muda o
  movimento são **bônus** (talento *Móvel*, magia *Passos Largos*, *Disparada*, peso). Aqui o
  Vigor faz o papel da "base pessoal" e o resto é bônus — mesma leitura para o jogador.
- Encaixa no código: `statBreakdown` já separa `attribute`, `equipment` e `group`. Basta trocar
  `group` por um `bonus` genérico (lista de fontes, para a UI mostrar "+1 grupo, +1 Capitão") e
  a chave `velocidade` por `vigor`.
- O teto −5 … +5 vale **só para o Vigor**; os bônus somam por fora (como já acontece com o grupo
  hoje), então o Capitão nunca "desperdiça" bônus num agente com Vigor +5.

Ficha resultante (médio prazo): **Vigor, Força, Destreza, Intimidação** — um atributo por
família de ação (mover, arrombar, destrancar, abordar/interrogar).

---

### 3.5 Abordagem: alcance individual pela intimidação

O alcance da abordagem deixa de ter um bônus fixo grande do grupo e passa a vir da intimidação de
cada agente, do mesmo jeito que o movimento vem do Vigor:

```
raio de abordagem = 3 + intimidação do agente + bônus de intimidação   (nunca abaixo de 1)
```

- **Intimidação do agente**: o atributo da ficha (−5 … +5).
- **Bônus de intimidação** (soma por fora, como o bônus de movimentação): grupo (+1), Capitão no
  grupo (+1), arrombamento
  (+1 para a equipe por alguns turnos, já existe em `BREAK_IN_RULES`), equipamento no futuro.
- As outras faixas continuam presas ao raio: rolagem até raio + 3, fuga até raio + 4.

| Agente | Intimidação | Agrupado? | Raio | Rolagem até | Fuga até |
|---|---|---|---|---|---|
| Padrão | 0 | não | 3 | 6 | 7 |
| Padrão | 0 | sim | 4 | 7 | 8 |
| Padrão | 0 | sim, com o Capitão | 5 | 8 | 9 |
| Com ponto em intimidação | +1 | sim, com o Capitão | 6 | 9 | 10 |
| Hoje (para comparar) | 0 | sim | 4 | 7 | 8 |

Um agente que não investe em intimidação fica no mesmo alcance de hoje quando agrupado, e um que
investe passa a se destacar. Cada agente pode ter um alcance diferente conforme a sua função.

### 3.6 Organização: tabela de perícias + tabela de habilidades

- **Perícia** é um número somado numa rolagem de uma ação (Gazua +6 no Destrancar).
- **Habilidade** é uma regra que muda como uma ação funciona, sem número de rolagem (Comando,
  Liderança).

**Tabela de perícias** (matriz perícia × classe; classe nova = coluna nova):

| Perícia | Ação | Atributo da ação | Capitão | Agente |
|---|---|---|---|---|
| Gazua | Destrancar | Destreza | — | +6 |

**Tabela de habilidades** (lista; uma linha por habilidade):

| Habilidade | Classe | Tipo | Quando vale | Efeito | Acumula? |
|---|---|---|---|---|---|
| Comando | Capitão | ativa | Capitão chama o Agrupar na vez dele | Encontro custa 0 de movimento | — |
| Liderança | Capitão | passiva | Capitão está no grupo | +1 de movimento e +1 de intimidação para o grupo | Não se aplica: 1 Capitão na equipe |

A tabela de ações (3.1) vira o índice que liga as duas: cada ação diz qual atributo e qual
perícia somam e quais habilidades mexem nela, sem guardar números de classe.

---

## 4. Perguntas em aberto

1. "Comando" deveria valer também para **desagrupar/reagrupar** no mesmo turno, ou só uma vez por
   turno?
2. Vigor faz mais alguma coisa além do movimento já nesta versão (ex.: custo de carregar
   equipamento pesado), ou começa só como o novo nome da Velocidade?

### Decidido

- Bônus de grupo: +1 de movimento e +1 de intimidação. Raio de abordagem base 3.
- Liderança do Capitão: +1 de movimento e +1 de intimidação para o grupo.
- Interrogatório fica com as regras da branch `claude/interrogatorio-v1`.
- Qualquer agente pode destrancar; o Agente tem Gazua +6.
- A classe é trocada no menu. Um Capitão por equipe (o menu só permite um); hoje: 1 Capitão + 2 Agentes.

---

## 5. Impacto da branch `claude/interrogatorio-v1`

Revisado na versão de 17/11/2026 (commit `db035a6`, já com a `main` atual).

**Regras: sem conflito.** O interrogatório lê só a intimidação da ficha
(`statBreakdown(..., 'intimidacao', false)`), então nem o novo bônus do grupo nem a Liderança
mudam a CD. Se um dia quisermos que o Capitão ajude a interrogar, é uma habilidade nova (ex.:
"Pressão: +1 na CD quando o Capitão está a até 1 hexágono"), não uma mudança na Liderança.

**Nome: conflito de vocabulário.** A branch já usa **classe** para os NPCs (`NpcClass`,
`npcClass()`, campo `EnemySpawn.npc`, variável `cls`). No código, as nossas devem ter outro nome
para não confundir: `AgentClass` / `agent-class.ts` (e `role` como campo do personagem). Na tela
pode continuar "Classe", porque a classe de NPC não aparece para o jogador.

**Código: conflitos de merge esperados.** A branch mexe bastante em `game-screen.ts` (+383
linhas), justamente onde as classes vão entrar:

- `fieldStats` e o detalhamento do raio de abordagem (base, intimidação, grupo) ganharam campos
  novos (`groupApproachBonus`). A Liderança precisa entrar nesse detalhamento como uma linha
  "Capitão +1".
- Textos que repetem os números de hoje e vão ficar errados quando os valores mudarem: o comentário
  "+2 enquanto estiver agrupado" e a mensagem "Equipe agrupada! Juntos: +… de movimento e +… de
  alcance" (esta usa as constantes, mas precisa citar o Capitão).
- `door.ts` e `enemies.ts` só ganharam o estado `hidden`; não tocam no que vamos mudar.

**Ordem recomendada:** esperar a branch do interrogatório entrar na `main` e só então implementar
as classes em cima dela.
