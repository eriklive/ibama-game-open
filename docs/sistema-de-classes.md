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
| Grupo com um Capitão | — | **+2** (+1 do grupo, +1 do Capitão) |
| Raio de abordagem base (`APPROACH_RULES.surrenderRange`) | 2 | **3** |
| Bônus de intimidação do grupo (`GROUP_RULES.approachBonus`) | +2 | **+1** |

Ou seja: agrupar continua valendo a pena, mas o grupo "cheio" (+2, como hoje) passa a depender
de ter um Capitão nele. O alcance da abordagem segue a mesma lógica e passa a ser individual
(ver 3.6).

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
| **Liderança** | Enquanto o Capitão está no grupo, **todo o grupo** ganha +1 de movimento, além do +1 normal do grupo. |

Regras de borda propostas:

- O +1 do Capitão **só vale agrupado** (Capitão sozinho não ganha nada de movimento).
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
| Interrogar / conversar | **Intimidação** (do agente, vira penalidade do NPC) | — | a definir |
| Abordar | **Intimidação** (vira alcance, não rolagem do agente) | — | raio = 3 + intimidação (ver 3.6) |
| Mover | **Vigor** (hoje "Velocidade") | — (ver bônus de movimentação, 3.4) | — |

Em código seria só uma tabela, algo como:

```ts
const ACTION_CHECKS: Record<ActionKey, { stat?: StatKey; skill?: SkillKey }> = {
  arrombar:   { stat: 'forca' },
  destrancar: { stat: 'destreza', skill: 'gazua' },
  interrogar: { stat: 'intimidacao' },
};
```

e `doorNeed` / `resolveDoor` passariam a receber o modificador (hoje é d20 puro ≥ `need`).

### 3.2 Interrogar: a intimidação vira penalidade do NPC

Quem rola é o **NPC** (resistir ao interrogatório); a intimidação do agente entra **subtraindo**:

```
NPC resiste se d20 − intimidação do agente ≥ dificuldade
```

É o mesmo formato do teste de fuga da abordagem (`passesEscape`: dado + modificador ≥ CD), então
reaproveita a UI de rolagem. Exemplo: CD 10, agente com intimidação +2 → o NPC precisa de 12+
(45%) em vez de 10+ (55%). Se o grupo der intimidação (hoje dá +2 no alcance), vale decidir se
também entra aqui.

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

## 3.6 Abordagem: alcance individual pela intimidação

O alcance da abordagem deixa de ter um bônus fixo grande do grupo e passa a vir da intimidação de
cada agente, do mesmo jeito que o movimento vem do Vigor:

```
raio de abordagem = 3 + intimidação do agente + bônus de intimidação   (nunca abaixo de 1)
```

- **Intimidação do agente**: o atributo da ficha (−5 … +5).
- **Bônus de intimidação** (soma por fora, como o bônus de movimentação): grupo (+1), arrombamento
  (+1 para a equipe por alguns turnos, já existe em `BREAK_IN_RULES`), equipamento no futuro.
- As outras faixas continuam presas ao raio: rolagem até raio + 3, fuga até raio + 4.

| Agente | Intimidação | Agrupado? | Raio | Rolagem até | Fuga até |
|---|---|---|---|---|---|
| Padrão | 0 | não | 3 | 6 | 7 |
| Padrão | 0 | sim | 4 | 7 | 8 |
| Com ponto em intimidação | +1 | sim | 5 | 8 | 9 |
| Hoje (para comparar) | 0 | sim | 4 | 7 | 8 |

Um agente que não investe em intimidação fica no mesmo alcance de hoje quando agrupado, e um que
investe passa a se destacar. Cada agente pode ter um alcance diferente conforme a sua função.

## 3.5 Organização: tabela de perícias + tabela de habilidades

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
| Liderança | Capitão | passiva | Capitão está no grupo | +1 no bônus de movimentação do grupo | Não se aplica: 1 Capitão na equipe |

A tabela de ações (3.1) vira o índice que liga as duas: cada ação diz qual atributo e qual
perícia somam e quais habilidades mexem nela, sem guardar números de classe.

---

## 4. Perguntas em aberto

1. O Capitão dá +1 de **intimidação** ao grupo, como dá de movimento? (Hoje: não; só movimento.)
2. "Comando" deveria valer também para **desagrupar/reagrupar** no mesmo turno, ou só uma vez por
   turno?
3. Interrogar: qual a **dificuldade base** e o que o NPC entrega quando falha (pista, localização
   de item, rendição)?
4. Vigor faz mais alguma coisa além do movimento já nesta versão (ex.: custo de carregar
   equipamento pesado), ou começa só como o novo nome da Velocidade?

### Decidido

- Bônus de grupo: +1 de movimento e +1 de intimidação. Raio de abordagem base 3.
- Qualquer agente pode destrancar; o Agente tem Gazua +6.
- A classe é trocada no menu. Um Capitão por equipe (o menu só permite um); hoje: 1 Capitão + 2 Agentes.
