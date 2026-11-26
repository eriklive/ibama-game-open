# Jogo do Ibama (aberto)

Protótipo do jogo tático por turnos em que agentes do Ibama atuam contra crimes
ambientais. Esta versão é o **teste de movimentação e turnos**: um tabuleiro 3D de
hexágonos azuis, em perspectiva, com três personagens que se revezam.

## Como jogar o teste

1. Na tela inicial, toque em **Campo de teste** (o único mapa disponível) e em **Iniciar**.
2. Antes da partida vem a **ficha do agente** (escalação): escolha o **Capitão**, distribua o ponto de
   cada agente e toque em **Confirmar escalação** (ver [Ficha do agente](#ficha-do-agente-atributos)).
3. Há **3 personagens** (Ana, Bruno e Clara), cada um com o seu turno, em rodadas sem fim.
4. No início de cada turno são rolados **2d4**: a soma **mais o vigor** do agente (e +1 se
   estiver agrupado, +1 a mais com o Capitão no grupo) é o movimento daquele turno.
5. Um brilho azul-claro com contorno branco mostra até onde dá para ir (contornando os outros
   personagens). As auras não pintam o chão: são luz por cima dele (ver [Auras](#auras)).
   Toque num hexágono para destacá-lo (fica amarelo): o caminho até ele brilha e flutua,
   mostrando por onde o personagem vai passar. **Toque de novo** no destino para
   confirmar — ou use o botão **Confirmar**. Dá para andar várias vezes no mesmo turno
   enquanto sobrar movimento; o custo é o número de passos.
6. Quando o movimento acaba, a vez passa sozinha; **Passar a vez** encerra antes.
7. Toque numa peça no tabuleiro ou num retrato no topo para ver aquele personagem. Tocar uma
   vez num objeto interagível (o avião, os suprimentos, um garimpeiro rendido) também leva a
   câmera até ele, deixando-o no centro da tela (`HexBoard.focusArea`). Quem
   está na vez ganha um anel amarelo e o retrato fica destacado como **Na vez**. Cada retrato
   mostra o vigor e a intimidação do agente em campo (em verde quando o grupo soma o bônus);
   o de quem está na vez mostra também o alcance da abordagem.
8. Ana, Bruno e Clara são personagens 3D animados (ficam parados respirando e correm pelo
   caminho), de pé sobre um disco com a cor de cada um.

## Ficha do agente (atributos)

Entre escolher o mapa e começar, a tela **Ficha do agente** (`#/escalacao/<mapa>`) mostra cada
agente: abas com a foto 3x4 (ponto **amarelo** = ponto livre, **verde** = distribuído), o
**modelo 3D** real do personagem (arraste ou use o botão para girar) com seis espaços de
equipamento ainda **em breve** (cabeça, tronco, mãos, arma, costas, pés) e a ficha em papel.

- **Classe:** cada agente é **Capitão** ou **Agente**. A equipe tem **um Capitão só** (de início,
  a Ana): marcar outro como Capitão devolve o anterior para Agente. A ficha lista o que a classe dá:
  - **Capitão** — habilidades **Comando** (o Agrupar dele não gasta movimento, uma vez por turno) e
    **Liderança** (com ele no grupo, todos ganham **+1 de movimento** e **+1 de intimidação**).
  - **Agente** — perícia **Gazua +6** no **Destrancar** (qualquer um pode tentar; o Agente tem
    vantagem).
- **Vigor:** cada ponto vale **+1 de movimento** no turno (somado aos 2d4).
- **Intimidação:** cada ponto vale **+1 no raio de abordagem** (a zona de rendição). A zona de
  rolagem e a de fuga se afastam junto.
- **Iniciativa** e **Agilidade** (perseguição; regras em `src/app/game/chase.ts` e `runner.ts`):
  a iniciativa soma no raio de perseguição e no d20 para arrancar (8 ou mais); a agilidade dos
  suspeitos soma no d20 deles em cada obstáculo da corrida. A agilidade dos agentes **ainda não tem
  uso** (era o pulo do caixote da perseguição antiga, que saiu). A **classe dá a base**: Capitão
  começa com **+1 de iniciativa**, Agente com **+1 de agilidade**.
- Cada atributo vai de **−5 a +5** numa régua centrada no 0 (positivo enche em verde para a
  direita, negativo em vermelho para a esquerda; o tracejado mostra onde o ponto livre pode
  entrar). Todo agente começa com 0, mais a base da classe.
- Cada agente tem **1 ponto** para pôr em **um** dos quatro atributos. Dá para tirar só o ponto que
  você colocou: pelo jogador, o mínimo é 0. O lado negativo fica para penalidades (peso,
  equipamento).
- **Total em campo:** atributo + equipamento (por enquanto, nenhum) + **grupo**. Enquanto os
  agentes estão **agrupados**, cada um ganha **+1 de vigor** (movimento) e **+1 de intimidação**
  (alcance da abordagem), e mais **+1** em cada com o Capitão no grupo; separou, perdeu. Grupo e
  Liderança não somam em iniciativa nem agilidade: a perseguição é individual.
- **Anterior / Próximo agente** passam pelas fichas; no último, **Confirmar escalação** começa a
  partida com esses atributos (a escolha fica guardada na sessão do navegador e vale também para
  "Recomeçar"). Com controle: L1/R1 trocam de agente, cima/baixo escolhem o atributo,
  esquerda/direita tiram/põem o ponto, △ torna o agente Capitão, ✕ avança e ○ volta ao início.
- Larga (≥ 900 px), a tela usa o layout "web" (abas na lateral); estreita, o de celular.

As regras ficam em `src/app/game/stats.ts` (`STAT_RULES`, `APPROACH_SCALING`, funções puras
testadas); o bônus do grupo, em `GROUP_RULES` (`group.ts`); as classes (perícias, habilidades e
`CLASS_RULES`), em `src/app/game/agent-class.ts` — o desenho completo está em
`docs/sistema-de-classes.md`. Para a intimidação também aumentar a
zona de rendição, troque `APPROACH_SCALING.surrender` para `true`. A tela fica em
`src/app/screens/roster/` e o visualizador 3D em `src/app/game/agent-viewer.ts`.

## Inimigos (primeira iteração)

O mapa de teste tem **paredes** (prismas cinza: ninguém passa e ninguém enxerga através
delas) e **três inimigos** (dois garimpeiros e o piloto do avião do garimpo, cada um com seu modelo 3D sobre
uma base vermelha; o corpo mostra para onde olham).

- Depois da Clara vem o **turno inimigo**: quem está em patrulha anda 2 passos pela rota.
- Os hexágonos sob um **véu vermelho** são o cone de visão dos inimigos em patrulha (3
  hexágonos, 120° à frente). Entrar nele — mesmo só de passagem — ou ser alcançado por
  ele faz o inimigo **avistar** o agente: a base fica laranja, aparece um **!** e ele para.
- Em alerta, no turno inimigo ele **corre** 4 passos rumo à borda mais próxima. Se
  chegar a uma borda, **foge** do mapa. Agentes, paredes e outros inimigos bloqueiam o
  caminho: cercando as saídas, ele fica **encurralado**.

### Abordagem

Na vez de um agente, um toque no botão **Abordar** (com o número de inimigos no raio) abre o
**modo de abordagem**, e nada acontece até confirmar. O tabuleiro fica em **escala de cinza**:
só ficam em cor quem está na vez, os suspeitos no raio (cada um com uma etiqueta: *se rende*,
*X% de escapar* ou *vai correr*; o alvo da missão ganha um *alvo!*) e o próprio raio. A câmera
enquadra todos eles. São três faixas, uma logo depois da outra:

- **Verde, raio de abordagem:** **3 + intimidação** do agente, **+1** enquanto ele estiver
  agrupado e **+1** com o Capitão no grupo, nunca menor que 1. Quem está nele se rende.
- **Amarelo, zona de rolagem (3 hexágonos):** cada suspeito rola **d20 + modificador** e passa
  no teste com **8 ou mais**. O modificador é **−1** no hexágono mais perto da abordagem, **0** no
  meio e **+1** no mais perto da fuga (60%, 65% e 70% de escapar). Passou: não se rende, fica em
  alerta e corre no turno inimigo. Falhou: se rende.
- **Laranja, zona de fuga (1 hexágono):** fica em alerta e corre, sem rolar.

Sem bônus, as faixas são 1–3, 4–6 e 7. O painel mostra a conta (base · intimidação · grupo · Capitão), as
faixas e quantos se rendem, rolam e vão correr. Os números ficam em `APPROACH_RULES`
(`src/app/game/enemies.ts`). O botão
**Abordar** só aparece com algum suspeito dentro do raio de quem está na vez **e com acesso direto** a
ele: parede, porta fechada ou carga alta no meio do caminho tiram o suspeito da abordagem (e das
faixas pintadas). Um arrombamento recente soma **+1 de intimidação** (ver [Portas](#portas)). A decisão fica em
dois botões separados: o carimbo **Abordar!** (embaixo, à direita; ✕ no controle) confirma e o
botão **vermelho** de **Cancelar** (na esquerda; ○ no controle) desiste. Tocar no tabuleiro não
faz nada nesse modo. O cinza é um passe de pós-processamento (`src/app/game/spotlight.ts`).

Ao abordar, uma **onda de voz** sai do agente: cada hexágono do raio pula e acende quando ela
passa, e cada suspeito leva um susto e reage (rende-se ou fica em alerta) quando a onda chega
até ele, então quem está mais perto reage primeiro. Em seguida aparece o **auto de abordagem**:
uma ficha com a foto de cada suspeito, carimbo verde **Rendido** ou círculo vermelho **Vai
correr**, com a conta do d20 de quem rolou. Ela fica na tela até o jogador tocar em **Fechar** (✕ no controle); só então a vez passa. Os tempos
ficam em `APPROACH_FX` (`src/app/game/approach-fx.ts`).

- Quem **se rende**: a base fica branca, ele se agacha com uma bandeira branca, para de agir e
  continua ocupando o hexágono. Vale também para quem já estava em alerta.
- Quem passou no teste e ainda não fugiu pode ser abordado de novo e rola outra vez.
- A distância é em linha reta: por enquanto, paredes não abafam o grito.
- Abordar **encerra a vez** do agente. Se o movimento acabar com inimigos no raio, a vez
  não passa sozinha, para dar tempo de abordar.
- Quando ninguém mais age (todos rendidos ou fugidos), aparece o resultado.

Os números ficam em `ENEMY_RULES` e `APPROACH_RULES` (`src/app/game/enemies.ts`; o raio de cada
agente sai de `approachRulesFor`, em `stats.ts`); paredes e
rotas de patrulha ficam no mapa (`maps.ts`).

### Agrupar

Na vez de um agente, o botão **Agrupar** reúne a equipe: os hexágonos claros são os **pontos de
encontro** possíveis — lugares que todos alcançam com o movimento que resta a quem está na vez.
Toque num ponto para ver o caminho e toque de novo (ou em **Agrupar!**) para confirmar: quem está
na vez vai até o ponto e os outros param em volta dele. Gasta-se o caminho mais longo entre todos —
a não ser que quem chama seja o **Capitão**: com o **Comando**, o primeiro Agrupar do turno dele não
gasta movimento (o ponto ainda precisa estar ao alcance).

- A partida **começa com a equipe agrupada** (os três saem juntos do ponto de partida).
- Agrupados, os agentes **andam juntos**: quando um deles anda, os outros seguem o rastro logo
  atrás. Quem não consegue acompanhar (caminho bloqueado) sai do grupo.
- **Fila do grupo:** quando a vez de um agente agrupado começa, ele **vai para a frente da fila**
  (troca de lugar com o primeiro); quando a vez acaba, ele **vai para o fim** e os de trás andam uma vaga
  para a frente. Assim ninguém começa a vez no fim da fila perdendo passos (`toFront` / `toBack`).
- Juntos, cada agente ganha **+1 de movimento** na rolagem do seu turno e **+1 de intimidação**
  (alcance da abordagem); com o Capitão no grupo, **+1 a mais** em cada (Liderança). Desagrupou,
  perdeu tudo.
- **Desagrupar** desfaz o grupo e cada um volta a andar por conta própria.

Os bônus ficam em `GROUP_RULES` (`moveBonus` e `approachBonus`, em `src/app/game/group.ts`).

### Abertura da missão (tutorial, passo 1)

Em **todo início de partida** num mapa com objetivos dentro de estruturas (no Aeroporto: o hangar e a
casa), inclusive ao **Recomeçar**, a abertura vem antes da primeira rolagem de dados:

1. A câmera começa **alta e afastada**: inclinação de **85°** (a de jogo é 55°) e zoom que cabe todas
   as estruturas com objetivo, acima do limite que o jogador alcança. Chega devagar, com faixas de
   cinema; a papelada (HUD) fica escondida.
2. O mapa escurece, menos as estruturas, e a **caneta vermelha** circula cada uma, com o nome e os
   objetivos que ficam nela ("Hangar · Queimar o avião…"). A anotação vai para o lado que tiver espaço
   sem cobrir o botão nem a outra estrutura (no celular, em cima ou embaixo).
3. O botão grande **Iniciar missão** espera o toque; o tabuleiro não responde enquanto isso.
4. A câmera desce em **linha reta** (não de hexágono em hexágono) até quem está na vez, voltando ao
   zoom e à inclinação de jogo no caminho (2,6 s), e a vez começa com a rolagem de sempre.

**Pular** (canto de cima) corta direto para o passo 4 já concluído. Teclado: Enter inicia, Esc pula;
controle: ✕ inicia, ○ pula. Com "menos movimento" no sistema, sem animação nem pan. No meio da
partida, o menu tem **Rever objetivos da missão**, que circula só os objetivos ainda em aberto. Os objetivos que dependem de outro (`after`,
como "Apreender a arma") só entram depois de liberados.

As regras ficam em `src/app/game/mission-intro.ts` (o que circular, `INTRO`, traço de caneta e lugar da
anotação, testados em `mission-intro.spec.ts`); a câmera, em `HexBoard` (`frameIntro`, `panFromIntro`,
`skipIntro`, `introEllipses`); a camada, em `src/app/ui/mission-intro/`.

### Mapa do aeroporto

O mapa **Aeroporto** (desenho de 44×38, com a missão num círculo — ver abaixo) é o primeiro mapa "de verdade". O **hangar** fica ao norte, com um
portão largo (12 hexágonos) e duas portas nos fundos. A **pista é um rastro de terra** de 6 hexágonos de
largura, com sulcos de pneu, que sai do meio do portão e corta a mata de sul a norte. O avião é grande (ocupa
8 colunas × 6 fileiras); há um só, parado no lado oeste do hangar. Dois postes de luz ficam do lado
de fora, nos cantos da frente, e duas lâmpadas pendem do telhado. A equipe começa numa
clareira no canto sudoeste e avança pelas trilhas da mata ou pela pista.

Os blocos de **árvores** (de vários tipos e tamanhos) e o **avião** funcionam como paredes: ninguém
passa e os inimigos não enxergam através deles.

### Cobertura no hangar

O hangar tem carga empilhada para os agentes se esconderem e planejarem a aproximação:

- **Cobertura alta** (caixotes de madeira e caixas de papelão de "amido de milho"): funciona como
  parede. Ninguém passa e ninguém enxerga através.
- **Cobertura baixa** (sacos no palete e gaiolas vazias): ninguém passa, mas o inimigo enxerga por
  cima. Só não vê o agente que está **colado nela, do lado de lá** (o último hexágono antes dele, na
  linha do olhar, é a carga). O cone vermelho já mostra essa "sombra" atrás da carga. Parado ao lado de
  carga baixa, o agente fica agachado. Na fuga, a carga baixa (e a mesa) é obstáculo: a rota travada
  dá a volta nela.
- **Decoração** (galões de gasolina e botijão): não bloqueia nada.

A carga é desenhada no texto do mapa (`B` caixotes, `M` papelão, `S` sacos, `G` gaiolas, `f` galões) e
a altura de cada tipo fica em `COVER_HEIGHT` (`maps.ts`). Os modelos são montados por código em
`scenery.ts` (`buildCover`, `buildFuelProps`).

O terreno é desenhado em texto em `maps.ts` (`parseLayout`): `.` grama, `T` árvores, `#` parede,
`_` piso, `D` porta, `~` terra batida, `=` asfalto, `:` pátio, `A` avião, a carga (ver abaixo), os suprimentos do garimpo (`R`) e os móveis da casa (`m`, `P`) — basta editar as linhas para mudar o mapa.
O hangar (chapa ondulada, portão, teto em arco, postes e lâmpadas) e o avião são montados por código em
`scenery.ts`. O **teto** (chapa, oitões e arcos) cobre o hangar visto de fora e some assim que um agente entra
ou chega a até 2 hexágonos do portão ou de uma porta **aberta**: porta fechada mantém o teto e esconde o interior
(ver [Portas](#portas)). A carga, o avião e as lâmpadas de dentro só são desenhados quando há um agente a até
6 hexágonos do hangar e o teto está aberto (`structureView` em `maps.ts`). O avião é um modelo provisório, a ser trocado pelo Cessna 152 escolhido.

Arraste para mover a câmera; use pinça (ou a roda do mouse) para aproximar.

**Escala:** tudo está em metros reais (o hexágono mede 1,5 m de ponta a ponta; `METER` em
`character-model.ts`). Os personagens têm a altura real (1,68–1,78 m), as portas 2,1 m, as paredes da
casa 2,7 m e as do hangar 5 m (o arco do telhado chega a 9 m), os postes 7 m e a mata 4–8 m
(`TREE_HEIGHT` em `world-stream.ts`).

**Esmaecimento:** o que fica entre a câmera e um personagem esmaece para não tapar a visão. As árvores
na frente de agentes e inimigos, e as que cobririam o alcance de movimento de quem está na vez, ficam
translúcidas; as paredes do hangar e da casa também. Um inimigo dentro de uma estrutura ainda fechada não
faz a parede esmaecer, para não entregar quem está escondido. No close-up vale a mesma regra para as
árvores (`updateTreeFade` e `wallBlockers` em `hex-board.ts`).

### Casa do Caseiro Jô e testes de percepção (d20)

A leste da pista, numa clareira, fica a **casa** dos garimpeiros: dois cômodos de 5 × 5 hexágonos, de
tábuas e com telhado de chapa enferrujada (que some quando um agente entra, como o do hangar). Entra-se
pela porta do oeste, que dá para a pista; uma divisória com porta separa os cômodos.

- **Cômodo 1:** o **Caseiro Jô** come parado na mesa, **de costas para a entrada**. Ele não anda no
  turno inimigo, mas o cone de visão dele cobre a porta do cômodo 2: entre por trás e **aborde** (a até 2
  hexágonos ele se rende). A porta do meio está **trancada** (ver [Portas](#portas)); quem passa por ela
  sem rendê-lo é avistado.
- **Cômodo 2:** ao entrar (mesmo só de passagem), cada agente rola **percepção** uma vez — um **d20** que
  aparece numa ficha no canto esquerdo da tela. Tirando **mais que 6**, ele repara em algo na
  **prateleira** da parede do leste, que ganha uma lupa. O resultado fica na ficha até o jogador tocar
  em **Continuar** (✕ no controle); só então o jogo segue.
- Colado na prateleira percebida, **toque na lupa** (que pulsa; □ no controle, quando não há ninguém
  para abordar): a câmera faz o mesmo enquadramento da cena da porta (arrombar / abrir fechadura) —
  gira 45° para o lado do agente, desce para 30° e chega perto, mirando entre a prateleira e o
  agente, que vira para ela — e fica **travada** (arrastar, pinça e roda não mexem nela). A HUD some;
  sobram o bilhete e os botões de sempre: o carimbo **Inspecionar** (✕/□, ou a lupa de novo) rola o
  d20 e **Cancelar** (○) volta ao normal sem gastar nada. Tirando **mais que 4**, acha a **arma
  escondida**, que é apreendida. Se falhar, o d20 fica com o resultado, o bilhete diz que falhou e
  dá para tentar **De novo!** ali mesmo ou **Fechar**. **Cada rolagem gasta 1 de movimento.**
  Longe da prateleira, tocar na lupa avisa que é
  preciso chegar colado nela.
- Se os três agentes falharem na percepção, a arma fica sem ser encontrada.

Os **objetivos** da missão ficam num bilhete embaixo da pilha de suspeitos. Da casa, de início, aparece só
**Investigar a casa**: quando alguém repara na prateleira (percepção), ele fica cumprido (✓) e surge o passo
seguinte, **Apreender a arma escondida**, cumprido ao inspecionar e achar a arma. Também há **Render o Caseiro
Jô**. Passos assim usam `after` no objetivo (só aparece depois do objetivo com aquele id); `notice` cumpre ao
reparar num esconderijo. As regras dos testes ficam em `SEARCH_RULES` (`src/app/game/search.ts`); a casa, o esconderijo
e os objetivos ficam no mapa (`house`, `hidden`, `objectives` em `maps.ts`). No desenho em texto, `m` é a
mesa (cobertura baixa) e `P` a prateleira (alta); os modelos são montados em `scenery.ts` (`buildHouse`).
Um inimigo com rota de um ponto só fica parado; `facing` no mapa diz para onde ele olha.

### Portas

As portas comuns (um `D` sozinho no desenho do mapa) têm folha de verdade e quatro estados. Fechada,
a porta bloqueia a passagem e a visão como uma parede. Fileiras de `D` (o portão do hangar) ficam
sempre abertas.

| Estado | Como passa |
| --- | --- |
| **Aberta** | Passa direto |
| **Encostada** (fechada, sem tranca) | Abrir, destrancar (abre sozinha) ou arrombar tirando **3+** no d20 |
| **Trancada** | Destrancar tirando a **fechadura** da porta (12 por padrão; **6** para o Agente, com a Gazua +6) ou arrombar tirando **12+** |
| **Bloqueada** | Nunca abre (até ser desbloqueada): dá para tentar, mas nunca passa |

- Colado numa porta fechada, ela ganha um **losango amarelo**. Tocar na porta (ou no papel **Porta**, ou
  □ no controle) abre o **menu da porta**: a câmera gira 45° e aproxima até enquadrar a porta e o agente,
  a papelada da HUD sai e as ações entram em fichas na direita: **Arrombar**, **Destrancar** e **Abrir**.
  A ficha que depende de rolagem traz o **d20** com o número a tirar; as outras, um círculo vazio.
- **Arrombar** é um chute: o agente encosta, o d20 gira na ficha da esquerda e para quando o pé bate. Se
  passar, a porta abre com força para dentro, bate na parede e fica **arrombada** (aberta para sempre); se
  não, só treme. Arrombar uma porta que **não estava trancada** faz o inimigo mais perto (a até 4
  hexágonos) olhar para o agente e soltar uma fala num balão ("Precisava disso não, senhor.", "Pô, a porta
  tava aberta!").
- **Arrombar com sucesso** (a porta cede) assusta quem está do outro lado:
  - a **equipe toda** ganha **+1 de intimidação** (alcance da abordagem) por **5 turnos**, contando o
    atual. A fita no topo mostra o bônus e quantos turnos faltam;
  - quem está **no cômodo arrombado** a até **3 hexágonos** da porta se **rende na hora**, a não ser que
    resista: rola um d20 e precisa tirar **19** (colado na porta), **18** (a 2) ou **17** (a 3). Quem
    resiste entra em alerta e tenta correr;
  - quem está **mais longe** no cômodo tenta correr, mas só se tiver **atitude**: d20 **mais que 12**.
    Sem atitude, fica parado onde está;
  - cada rolagem aparece na ficha do d20 (o verde é sempre o que é bom para a equipe). Chutar uma porta
    que já estava aberta não assusta ninguém (só rende a fala do morador).
- **Destrancar** gasta **1 de movimento**: o agente se agacha, o d20 rola enquanto ele mexe na fechadura e,
  dando certo ou não, ele se levanta. Porta sem tranca abre sozinha (precisa de 0). Qualquer um pode
  tentar; o **Agente** soma a perícia **Gazua +6** (o número a tirar já aparece descontado, nunca abaixo de 1).
- **Abrir** empurra a folha: só abre a encostada.
- Porta **fechada** (encostada, trancada ou bloqueada) mantém o **telhado** no lugar e o interior escondido,
  mesmo com o agente colado nela. O telhado só sai quando a porta abre (ou com alguém lá dentro).
- Nas portas, passa quem tira **pelo menos** o número (12 = 12 ou mais).
- No aeroporto: a entrada da casa está encostada; a divisória, trancada; nos fundos do hangar, a porta do
  oeste está trancada (fechadura 10) e a do leste, bloqueada (`doorStates` no mapa; sem entrada, a porta
  começa encostada).

As regras ficam em `src/app/game/door.ts` (`DOOR_RULES`, funções puras testadas), as folhas e o indicador em
`door-view.ts`. A biblioteca de clipes não tem chute: a perna é dobrada à mão por cima do `idle`
(`CharacterRig.pose`); o destrancar usa o `crouch`.

### Modo diálogo (interrogatório)

Todo suspeito **rendido** tem um **raio de conversa** de 1 hexágono (sem nada pintado no chão: quem
mostra que dá para conversar é o contorno amarelo no modelo). Com o agente da vez nele, aparece o papel
**Conversar** (□ no controle, quando não há ninguém para abordar, nada para queimar nem para
inspecionar), **a qualquer momento e quantas vezes quiser**. Se a classe do suspeito não tem diálogo
(o segurança), o papel aparece **bloqueado** ("sem diálogo").
Quem não se rendeu não conversa.

- **Toque direto no rendido** (o mesmo sistema do avião): quem tem o que falar ganha um **contorno
  amarelo** pulsante no próprio modelo (acompanha a pose de algemado). Tocar nele, colado, abre a
  conversa; de longe, marca o caminho mais curto até a aura (contorno grosso, fantasma do agente no
  destino, pontos correndo e o balão "Toque de novo para ir · N passos") e o segundo toque anda até lá e
  já abre a conversa. O caminho precisa deixar sobrando o movimento da primeira pergunta; sem isso, o
  caminho aparece em cinza com "Longe demais para interagir". Quem **não tem interação** fica sem
  contorno e, ao toque, mostra o balão cinza **"Nenhuma interação"** sobre a cabeça. O hexágono do
  rendido também vale como tocar nele. No tabuleiro: `setNpcTargets` (alvos `npc:<id>`) e
  `flashTargetLabel` (balão passageiro, reaproveitável para outros alvos); na tela, `tapTargetOf` diz
  de onde cada alvo age e o que acontece. Caso de teste: **Rendidos: tocar para conversar**
  (`?caso=rendidos-interacao`).

- **Close-up:** a câmera faz o mesmo enquadramento da inspeção e das portas (desce para 30° e chega
  perto), mas de lado para a dupla: agente em pé e suspeito na pose de rendido, na faixa de cima
  da tela. Faixas pretas, vinheta, a HUD sai e a papelada entra com o "slap". Encerrar volta a câmera.
- O suspeito abre com a **postura e a fala de entrada** da classe; ao voltar, com uma **fala de
  retomada** ("De novo, doutor?"). As perguntas ficam em cartões de papel (sempre com "Tem mais
  gente com vocês?"), com o tom de interrogatório. A pergunta do agente sai num balão; a resposta,
  no balão do canto de baixo.
- **Memória por suspeito:** pergunta feita uma vez fica **bloqueada para sempre**, seja qual for a
  resposta, e continua na lista riscada, com o carimbo **Perguntado** (o histórico). As que faltam
  seguem disponíveis em qualquer conversa futura; uma **réplica** liberada e não feita também fica lá.
- **Rolagem escondida** (como no Baldur's Gate 3): a pergunta pode ter CD e o suspeito rola um d20 que
  o jogador não vê (nada de dado, número ou CD na tela). Passa quem tira **mais que** a CD (`beats`).
  Passou: resposta evasiva. Falhou: confissão ou resposta com um **sinal** de mentira (entre
  parênteses, em itálico, e o suspeito dá um tranco). Cada desfecho pode ter várias falas (sorteia uma).
- **CDs:** pergunta **8**, réplica **12**, tréplica **14**, e a **intimidação do agente que conversa
  soma +1 por ponto** (atributo + equipamento da ficha, sem o bônus do grupo nem o do arrombamento):
  quanto mais intimidador, mais fácil o suspeito ceder.
- **Réplica e tréplica:** quando o suspeito **passa** numa pergunta que tem réplica, surge logo abaixo
  o cartão **Réplica** (o agente insiste); passando nela e havendo tréplica, surge a **Tréplica**. Cada
  nível tem a sua mentira, mas a **verdade é uma só**: cedendo em qualquer nível, o suspeito dá a mesma
  resposta e a cadeia acaba. O jogador tem até 3 chances de arrancar a verdade. Por enquanto só o
  piloto ("O que você carregava no avião?") e o caseiro ("Tem arma na casa?" e "De quem é essa
  arma?") têm cadeia.
- **Perguntas que surgem e somem com pistas:** uma pergunta pode exigir uma pista da missão
  (`requires`) e pode sumir quando outra aparece (`hiddenWhen`, menos para quem já a fez). Achar a
  arma na prateleira da casa (inspeção, pista `item:arma`) libera **"De quem é essa arma?"** para
  todos os suspeitos com diálogo. O piloto não sabe; os garimpeiros também não, e cada um responde
  com uma fala de um **pool compartilhado** (a fala usada sai do pool, sem repetição entre eles;
  acabou, "Não sei."). O caseiro tem três chances de ceder (pergunta, réplica e tréplica); resistindo
  à tréplica, o agente fecha com "Claro. A arma entrou sozinha e foi se esconder na prateleira."
  (fecho `closing`: sem cartão, sem rolagem, sem resposta). Se ceder, confessa que é dele: a pista `dono-arma` faz a pergunta sumir de quem ainda não a fez (quem já fez continua
  vendo o cartão como "Perguntado"). Responder "não sei" não fecha a pergunta para os outros.
- **Confissão que entrega o esconderijo:** se o caseiro confessar em "Tem arma na casa?" ("Tem sim, tá
  no quartinho de trás."), a arma da prateleira conta como **já percebida**: ninguém precisa rolar
  percepção no quarto de trás, a lupa aparece e **Investigar a casa** fica cumprido. Achar e apreender
  a arma ainda pede a inspeção (d20). No dado, é `notices: '<id do esconderijo>'` na resposta.
- **Custo:** como a inspeção, a **primeira pergunta de cada conversa gasta 1 de movimento** (entrar e
  sair sem perguntar não gasta) e a vez continua. Ficam em `INTERROGATION_RULES` (`moveCost`,
  `endsTurn`).
- **Caderneta de campo:** cada resposta vira uma anotação (*declarou*, *sinal* ou *confessou*), que sai
  no **relatório da operação**; ao encerrar, um telegrama resume.
- **Entregar alguém:** uma resposta pode revelar uma unidade escondida no mapa (`reveal` na resposta,
  `reveals` e `hidden` no mapa). O suporte está pronto, mas o Aeroporto não usa: lá, "tem mais
  gente?" só vira anotação.
- Com controle: direcional escolhe o cartão, ✕ pergunta, ○ encerra.

Os diálogos são dados: as classes de NPC (garimpeiro, piloto, caseiro, caçador, pescador e segurança,
que é calado e não tem diálogo; no Aeroporto, o Jô é o **caseiro**), com traço de personalidade, fala de entrada e de retomada, `mod` (0, ainda sem uso)
e a árvore de perguntas, ficam em `src/app/game/npc-dialogue.ts` (o topo do arquivo explica como
adicionar NPC, pergunta e pista). Para ligar uma classe a um suspeito, use `npc` no inimigo do mapa
(`maps.ts`); `hidden: true` deixa um inimigo escondido e `reveals` diz quem o suspeito pode entregar.
As regras (CDs, intimidação, raio da aura, custo), a memória por NPC e as pistas ficam em
`src/app/game/interrogation.ts`; a papelada em `src/app/ui/interrogation/` e a câmera em
`HexBoard.closeUp` (a mesma da inspeção, com `frame: 'pair'`).

### Missão principal: queimar o avião e os suprimentos

O objetivo principal no Aeroporto é **queimar o avião** e a **pilha de suprimentos do garimpo** (caixotes
sob lona verde, tambores azuis de diesel e mangueira, no fundo do hangar, à direita do avião). Um ícone de
chama flutua sobre cada alvo até ele queimar, e os dois aparecem no topo do bilhete de objetivos com a
etiqueta **principal**.

- Colado no alvo, aparece **Queimar** (□ no controle, quando não há ninguém para abordar). O bilhete
  mostra quem está vigiando a até **5 hexágonos** e vai ver o fogo; **Queimar!** confirma.
- O alvo escurece, pega fogo (chamas, fumaça e clarão no chão) e continua bloqueando a passagem.
  Queimar **encerra a vez** do agente.
- Quem estava vigiando perto vê as chamas e entra em **alerta** (vai tentar correr no turno inimigo).
- **Queimar o avião libera o fim da operação:** aparece a etiqueta vermelha **Encerrar operação** no canto
  de baixo, à esquerda (L3 no controle). Ela só funciona na vez de um agente.
- Tocar nela abre o **relatório**: objetivos cumpridos, suspeitos rendidos/fugidos/à solta e o turno. Se
  ainda falta objetivo principal, um aviso diz que a missão fica incompleta. **Continuar** volta ao jogo;
  **Encerrar** fecha a operação com o carimbo do resultado: **Missão cumprida** (os dois principais),
  **parcial** (só um) ou **fracassada**. Daí dá para jogar de novo ou voltar ao início.

As regras ficam em `BURN_RULES` (`src/app/game/burn.ts`) e os objetivos/resultado em `src/app/game/mission.ts`
(`primary` marca o objetivo principal, `unlocksEnd` o que libera o encerramento). No mapa, `burnables`
lista os alvos e a pilha é desenhada com `R` no texto (`buildCover` em `scenery.ts`). O fogo é montado em
`hex-board.ts` (`ignite`, `clearFires`, `setBurnTargets`).

### Avião trancado e quadro de chaves

O avião do hangar está **trancado**; a chave fica no **quadro de chaves**, na parede do fundo do hangar
(cobertura alta, `K` no esboço). Regras em `game/plane.ts`:

- **Avião:** colado nele, aparece **Inspecionar** (no lugar de Queimar). O menu (como o das portas) tem
  **Olhar dentro** e **Queimar**. Sem a chave, o menu já abre com o carimbo **Trancado**, e isso basta para
  liberar, nos interrogatórios, a pergunta **"Onde está a chave?"** (some quando a equipe pega a chave). Olhar
  dentro só dá um leve zoom out e o aviso "O avião está trancado" (e a equipe passa a reconhecer a chave no quadro).
- **Diálogos:** os dois ajudantes do hangar (garimpeiros) respondem "Não sei não.". O piloto pode mentir
  (pergunta → réplica "O avião abre por digital? Cadê a chave?"): mente "Não sei não." / "…" e, cedendo, diz
  **"No painel ali atrás."**, o que faz a equipe reconhecer a chave no quadro.
- **Quadro de chaves:** quem mexe nele rola **percepção** (d20, uma vez por agente): passando, vê a chave do avião
  e escolhe **Pegar** ou **Deixar**; falhando, não vê nada. Não rola se alguém já tentou o avião, se o piloto contou
  ou se alguém já viu a chave lá.
- **Quem viu e deixou:** ao olhar dentro do avião trancado, esse agente comenta embaixo da tela, com o avatar
  dele: "Eu vi uma chave no quadro dos fundos."

### Mundo semiaberto: área da missão

No Aeroporto, a **missão é um círculo** de 26 hexágonos de raio em volta do meio do mapa, marcado
por uma **aura verde-clara** (uma cortina de luz com uma faixa acesa no chão). Só se joga dentro
dele: alcance, visão, patrulha e abordagem usam a área circular, e os inimigos em alerta **fogem
pela borda do círculo**. O círculo passa um pouco do desenho em texto: o que cai fora do desenho
continua a borda (a pista de terra segue, as trilhas avançam alguns hexágonos e somem na mata);
as pontas dos cantos do desenho ficam de fora, como cenário.

Em volta da missão há **100 hexágonos de mata** (só cenário, com clareiras e a pista de terra
continuando para o sul) para a câmera passear. O chão de fora é um pouco mais escuro, para a área
jogável se destacar. A área é configurada em `maps.ts` (`openWorld(..., { center, radius }, margem)`,
em `world.ts`); o mapa de teste continua retangular (`playArea` devolve o retângulo).

### Renderização por raio e menu de desempenho

Só existe na cena o que está a até um **raio pré-renderizado** do centro de carregamento; a câmera
enxerga no máximo o **raio de visão** (a névoa fecha ali e o plano de corte descarta o resto). Quando o
centro da tela se afasta mais que *raio pré-renderizado − raio de visão* do centro de carregamento, o
centro é recalculado: o que saiu do raio é descartado e o que entrou é montado **em segundo plano**,
alguns blocos por quadro (até 4 ms), do mais perto para o mais longe — o bloco antigo só sai quando o
novo está pronto, então não aparecem buracos. Além do raio fica só um chão liso de mata ("low poly").

O botão **☰** (topo, à direita) abre o **menu**, com três modos (a escolha fica guardada no navegador):

| Modo | Pré-renderiza (raio) | Câmera enxerga até | Extras |
| --- | --- | --- | --- |
| Normal | 65 hexágonos (5 do miolo + 60; diâmetro de 130) | 40 | — |
| Desempenho | 30 | 20 | densidade de pixels até 1,5× |
| Ultra desempenho | 20 | 10 | densidade 1×, sem sombras |

No **Modo Corrida** o mapa de corrida pré-renderiza 90 e enxerga 60 hexágonos em qualquer modo
(`runnerProfile`), e a névoa não fecha mais perto na câmera rasante: o horizonte inteiro da pista
aparece e o garimpeiro nunca some na névoa. A densidade de pixels e as sombras são as do modo.

O submenu **Tutoriais** reabre as lousas táticas (**Abordagem** e **Interrogatório**), que também abrem
sozinhas na primeira vez que a situação aparece (`game/tactical-board.ts`). A do interrogatório
mostra o toque no rendido: um toque marca o caminho até o raio de conversa, o segundo anda até lá e
abre a conversa.

O menu também mostra quantos blocos estão carregados e se ainda há algum sendo montado. Como tudo é
desenhado em poucas malhas instanciadas — o chão da missão (cor, brilho e flutuação por hexágono),
e cada bloco de 12 × 12 hexágonos do mundo (chão, contornos, troncos, copas, pinheiros e sulcos) —,
o número de chamadas de desenho fica baixo mesmo com a câmera afastada. Código: `world-stream.ts`
(blocos e fila), `tile-field.ts` (chão da missão), `render-settings.ts` (modos) e `hex-board.ts`.

### Controle (DualShock 4)

Dá para jogar com o controle do PS4 (por USB ou Bluetooth), pela Gamepad API do navegador. O
navegador só enxerga o controle depois do **primeiro botão apertado** com a página aberta. Com o
controle conectado, aparece um **cursor** (contorno azul) no tabuleiro e os botões da tela ganham o
símbolo correspondente.

| Botão | Ação |
| --- | --- |
| Direcional / analógico esquerdo | Move o cursor; sobre um hexágono claro, já mostra o caminho |
| ✕ | Confirma (movimento, abordagem); sobre um agente, mostra aquele agente |
| ○ | Cancela |
| □ | Abordar: toque abre a prévia, segurar aborda direto (sem ninguém no raio: queimar o alvo, inspecionar, conversar ou abrir o menu da porta) |
| No modo diálogo | direcional escolhe a pergunta, ✕ pergunta, ○ encerra |
| No menu da porta | ✕ arromba, □ destranca, △ abre, ○ volta |
| L3 | Encerrar a operação (depois de queimar o avião) |
| △ | Passar a vez |
| Share | Agrupar / desagrupar |
| L1 / R1 | Personagem anterior / seguinte |
| Touchpad / R3 | Volta para quem está na vez |
| Analógico direito | Move a câmera |
| R2 / L2 | Aproxima / afasta |
| Options | Mostra ou esconde a legenda dos comandos |

Na tela inicial, o direcional escolhe o mapa e ✕ inicia; na ficha do agente, L1/R1 trocam de agente, o direcional mexe nos pontos e ✕ avança. O controle vibra quando um inimigo avista
um agente e na abordagem (Chrome/Edge). No Chrome/Edge o DualShock 4 chega com o mapeamento
"standard"; no Firefox/Linux, sem ele, o jogo usa o mapeamento do driver. Outros controles (Xbox,
genéricos) também funcionam, com as letras A/B/X/Y. Leitura e mapeamento em
`src/app/game/gamepad.ts` (funções puras testadas) e `gamepad.service.ts`.

## Perseguição (em construção)

Regras em `src/app/game/chase.ts` (funções puras, testadas em `chase.spec.ts`). Só há perseguição
nos mapas com **Modo Corrida** (por enquanto, o Aeroporto); nos outros, quem corre só foge para a
borda. O que já está no jogo:

1. **Gatilho.** No turno inimigo, antes de um suspeito em alerta correr, os agentes que chegam até
   ele andando no máximo **4 + vigor + iniciativa** hexágonos podem ir atrás. Aparece o carimbo
   **Perseguir?** com cada agente possível (e a chance de arrancar) e **Deixar fugir**. Com
   controle: ✕ manda o primeiro, ○ deixa fugir.
2. **Iniciativa.** Só o agente rola: **d20 + iniciativa ≥ 8**. Falhou: hesita e ele foge normal.
   **Crítico:** d20 natural 20 deixa o agente 10% mais rápido a corrida inteira; 1 (falha crítica), se ele ainda arrancar, 5% mais lento.
   Uma perseguição por vez; quem já correu nesta rodada não vai de novo.
   **Voz de prisão:** quem foge de uma abordagem não espera o turno inimigo. Ao fechar o auto de
   abordagem, ele foge na hora, ainda no turno de quem abordou. O primeiro a rolar é o agente que
   abordou (carimbo "Voz de prisão"; basta ter caminho até ele, sem limite de raio). Se ele
   hesitar, rolam um por vez os outros agentes que estão no **alcance do grito** de quem deu a
   voz (as três faixas da abordagem, contadas de onde ele abordou, com linha de visão; quem está
   fora dele não vai), do mais
   perto do suspeito ao mais longe (carimbo "Reforço"), até alguém arrancar ou o jogador deixar
   fugir; ninguém foi, ele corre para a borda como no turno inimigo. Com vários fugindo, eles fogem em sequência (o mais perto
   de quem abordou primeiro), sempre depois de terminar a perseguição do anterior; quem arrancou
   atrás de um não vai atrás do próximo. Quem fugiu na hora não corre de novo no turno inimigo
   daquela rodada. Só depois disso a vez passa.
3. **Rota travada.** A fuga dele até a saída (borda) mais próxima, sem limite de hexágonos. Ele
   evita o que os agentes enxergam (até 20 hexágonos em linha reta, sem parede, árvore ou porta
   fechada no meio): cada hexágono à vista custa 6 passos a mais, então ele prefere correr por
   dentro das construções ou pela mata a atravessar a pista à vista. Passa por portas que ele
   consegue usar (bloqueada é parede). Chegou à borda: some do mapa e a perseguição acaba.
4. **A corrida.** A perseguição sai do tabuleiro e vira o [Modo Corrida](#modo-corrida-aeroporto).
   **Correr!** (C, □), quantas vezes quiser: d20 + vigor vira o bônus de velocidade (%) por 5 s; acabou, 3 s de recarga e pode rolar outro d20.
   **Crítico:** d20 natural 20 dá o gás e ainda +5% de velocidade até o fim da corrida (acumula com o da iniciativa). 1 é **tropeço**: sem gás, o agente cai (animação de tropeço) e perde 0,5 s; depois, a recarga normal.
   Só o agente acelera.
5. **Fim.** Distância 0: **agarrou**. Ele se rende **abalado**: +2 a favor do agente no próximo
   interrogatório (some depois da primeira conversa ou no fim da rodada seguinte). Rota no fim: ele
   escapa (e sai do mapa, se chegou à borda). Perseguir não custa nada ao agente.

**Música.** A faixa da perseguição (`public/assets/sounds/perseguicao.mp3`, 11,9 s em loop) entra
quando a perseguição começa, num barramento próprio (`musica`), e o ambiente abafa. Na escolha de
alvo (e na iniciativa que vem logo depois dela) a fita cai para o **ultra slow** (velocidade ×0,25, o tom cai junto) e volta no gesto; quanto
mais perto do suspeito, mais aberta a faixa (passa-baixa). Some no fim. Os números ficam em
`CHASE_MUSIC` (`sound.service.ts`).

**Câmera.** Ao arrancar, a câmera desce (~0,8 s) e encosta nas costas do agente, um pouco à
direita, olhando para o suspeito (atrás 4,4 · altura 2,5 · mira 7 à frente; em retrato, atrás 6,2 ·
altura 3,6). O FOV abre um pouco e a névoa fecha mais perto. A HUD de papel some (fica o placar
embaixo). No fim a câmera sobe de volta. Os números ficam em `CHASE_CAMERA` (`hex-board.ts`).

**Dois fugindo (`decisao:alvo`).** No começo do turno inimigo, se um agente está no raio de dois ou
mais suspeitos em alerta, ele escolhe qual perseguir: a câmera desce atrás dele olhando para o meio
deles, tudo fica cinza (menos eles, com a etiqueta **esquerda**/**direita**) e a faixa entra em
ultra slow. O 1º toque numa metade da tela (ou seta, ou A/D, ou direcional) vira o agente para
aquele suspeito; o 2º no mesmo lado (ou ✕, Enter, o botão "vai atrás") confirma. **Deixar os dois**
(○, Esc) desiste. Depois da iniciativa e da perseguição, o outro segue a fila normal: é oferecido
aos agentes que ainda não correram. A pose animada de indecisão (cabeça varrendo, tronco para trás)
ainda não existe: por enquanto o agente só vira o corpo.

### Modo Corrida (Aeroporto)

No Aeroporto, a perseguição sai do tabuleiro e vira uma **corrida com curvas**, no
estilo do Temple Run: o agente corre sempre no meio da pista.

1. **A virada.** A câmera desce nas costas do agente, como sempre. Uma onda sai dos pés dele
   para a frente: os hexágonos do tático ficam de pé e somem, e os do **mapa de corrida** chegam
   virando, como cartas. A onda leva 0,75 s e a corrida não para. São dois tabuleiros, um por cima do
   outro, com a mesma câmera (`HexBoard.setFlip`, `setBackdrop`, `setRendering`).
2. **Qual mapa** (`runnerStart`, em `src/app/game/runner-maps.ts`). A rota travada da fuga decide:
   - se passa por dentro do hangar, **mapa A**: pista de terra → pátio → hangar → porta dos fundos →
     mata;
   - se contorna o hangar, **mapa B**: pista → pátio → por fora, colado na parede leste do hangar →
     mata.
3. **Qual lado.** Depende de onde o garimpeiro está no tático:
   - **à direita** do meio do hangar: no mapa A, a pista passa à direita do avião, **vira à esquerda**
     por trás dele e sai pela porta dos fundos do oeste **virando à direita** (2 curvas no hangar);
   - **à esquerda**: tudo espelhado.

   A mata espelha junto. Ela tem **8 curvas**: vai para um lado, sobe, volta e sobe, duas vezes (o caminho ficou ~50% mais longo quando a corrida acelerou: ~294 fileiras no A, ~280 no B).
4. **Onde começa.** A zona tática em que o suspeito estava escolhe a zona de largada: pista (com 2
   hexágonos de beira), pátio, hangar, fundos ou mata. **Fora da pista é sempre o trecho de mata.**
   Da casa, por enquanto, também vai para a mata.
5. **Os mapas de corrida** são gerados em volta de um **caminho** de trechos retos ligados por
   esquinas de 90° (`runner-path.ts`). A pista tem a largura de 3 faixas (a 3 unidades uma da
   outra), mas os dois correm sempre na do meio; a carga alta nas faixas de fora é só cenário.
   - Dentro do hangar, a pista é um corredor entre duas paredes de caixas.
   - O avião, pousado de barriga, fica colado na pista e a asa (a 1,57 m) passa por cima do meio
     dela: é preciso deslizar.
   - A porta dos fundos é do tamanho da pista.
6. **A corrida** (`RunnerRace`, em `src/app/game/runner.ts`). Os dois correm a 8,25 fileiras/s e o
   agente corre sozinho, sempre no meio da pista (não há troca de faixa). O jogador só faz os
   gestos:

   | Gesto | Teclado | Toque | Controle | Para quê |
   |---|---|---|---|---|
   | **Virar** (perto da curva) | ←/→ ou A/D | arrastar para o lado | direcional ou analógico | as esquinas |
   | Pular | ↑, W ou espaço | arrastar para cima | ✕ | tora, galões, sacos, gaiolas, caixote baixo |
   | Deslizar | ↓ ou S | arrastar para baixo | ○ | lona, galho, asa do avião |

   - **Curva:** a 7 fileiras da esquina (~0,85 s), aparece "← Curva à esquerda!" e ←/→ vira. Longe de
     uma curva, ←/→ não faz nada. O agente **não vira sozinho**: até o jogador virar, ele corre reto
     para a esquina. Se não virar, ou virar para o lado errado, ele **bate na curva** e perde **2
     hexágonos**; aí encaixa no caminho e segue. A câmera acompanha a direção do agente
     (`setChaseFollow`).
   - **Bater num obstáculo** (passar sem o gesto certo): o agente tropeça e perde **1 hexágono**.
   - **O garimpeiro** também corre no meio e vira sempre. Em cada obstáculo ele rola **d20 + agilidade ≥ 8**; se falhar, tropeça e o agente ganha 1 hexágono.
   - **Correr!** (C, □) continua igual. A animação de corrida toca 1,575× a velocidade do clipe.
   - **Distância 0: agarrou.** Ele se rende, abalado.
   - **Ele chegou ao fim do caminho: fugiu.**
7. **A volta** (`tacticalIndex`). Onde cada um parou na corrida vira um hexágono da pista tática (o
   caminho até ele e a rota de fuga). A onda volta, de longe até os pés, e o tabuleiro reaparece com
   os dois ali.

Os números ficam em `RUNNER_RULES` (`runner.ts`) e `RUNNER_TRANSITION` (`runner-session.ts`). Os
objetos próprios da corrida (tora, galho, lona, galões) ficam em `runner-props.ts`. O laboratório
`#/lab?m=A|B&v=direita|esquerda` (ou `m=tatico`) monta os mapas sozinhos para renders (`src/app/lab/`).

## Auras

As auras do tabuleiro são **luz por cima do chão**, não tinta: o hexágono mantém a cor do terreno
(mata, terra, piso do hangar) e a aura é uma camada semitransparente pousada sobre ele, em até três
partes: um **véu** (mais forte na borda que no centro), um **contorno** contínuo só na fronteira da
região e, no que é interativo, uma **cortina** de luz baixa que some para cima.

| Aura | Cor | Cortina | Com o agente dentro |
|---|---|---|---|
| Alcance de movimento | azul-claro (o do cursor), contorno branco | baixa | — |
| Visão dos inimigos | véu vermelho | não | — |
| Queimar (avião, suprimentos) | brasa | sim | aquela aura inteira acende e a cortina cresce |

As camadas se somam: um hexágono do alcance dentro de uma aura de queimar fica com o véu da brasa, e o
contorno azul continua passando por fora de tudo. Os hexágonos dos aliados contam como dentro do
alcance, então o contorno não abre buracos em volta deles. Destino, caminho e as zonas da abordagem
continuam pintando o hexágono (são escolha do jogador, não aura). Código em
`src/app/game/aura-layer.ts`; estilos em `AURAS`, no `hex-board.ts`.

## Som

Sem falas por enquanto: passos, portas, fogo, dados, interface e o ambiente da mata. Os sons foram
desenhados num caderno de som e quase todos são **sintetizados em código** com Web Audio
(`src/app/game/audio/`), sem arquivo. Os arquivos são o alerta de avistado
(`public/assets/sounds/alerta-inimigo.mp3`) e a faixa da perseguição
(`public/assets/sounds/perseguicao.mp3`; ver [Perseguição](#perseguição-em-construção)).

- **Menu → Som → Sons do jogo** liga e desliga (fica guardado no navegador). O áudio começa no
  primeiro toque ou tecla, como os navegadores exigem.
- **Cinco canais** (`BUS_VOLUMES` em `audio/engine.ts`): Ambiente, Mundo, Passos, Interface e Estados.
- **O ouvinte é o agente da vez:** o volume cai com a distância em hexágonos (cheio até 4, depois
  −3 dB por hexágono; `audio/positional.ts`). Inimigos debaixo de um telhado só se ouvem até
  5 hexágonos, abafados.
- **Passos pelo chão** (`audio/footsteps.ts`): terra, asfalto, pátio, mato; o piso `_` é concreto
  no hangar e tábua na casa. O grupo soa como um passo mais cheio (só o líder pisa); inimigos
  usam galocha.
- **Ambiente em três níveis** (`audio/ambience.ts`): o **bioma** (mata de terra firme: coro de
  insetos, copa, brisa, cigarra, pássaros, gotas, galhos; há uma vaga reservada para animais), a
  **zona** (hangar e casa abafam o lado de fora e somam o próprio som) e o **estado do jogo**
  (avião queimado soma o fogo distante e espanta os pássaros; o modo abordagem abafa tudo).
  Novos biomas e interiores entram como dados.
- **Eventos** (`audio/sounds.ts`, ids como `porta.gazua` e `ini.rende`): turno, dados (o tamanho
  do dado decide o peso), testes, portas, inimigos, abordagem, agrupar, inspeção, caderneta, chave
  e fogo. Ao **Queimar**, a gasolina e as riscadas de fósforo tocam antes de o fogo pegar (com som
  ligado, o fogo pega ~3,4 s depois). A rolagem escondida do interrogatório não faz som nenhum.
- O serviço que o jogo usa é `Sound` (`src/app/game/sound.service.ts`).

## Modelos dos personagens

Há sete modelos em `public/assets/characters/`: quatro agentes do Ibama (Ana, Bruno, Clara e
Kauã) e três inimigos (o garimpeiro da bateia, o garimpeiro da pá e o piloto). Todos saem de `tools/assets`, a partir
dos corpos CC0 da Quaternius: o elenco (corpo, pele, cabelo, roupa, acessórios e equipamento)
fica em `tools/assets/characters.mjs` e o catálogo usado pelo jogo, em `MODELS`
(`src/app/game/character-model.ts`).

O estilo é uma versão cartoon de agentes de campo realistas: equipamento com volume de verdade
(colete de placas, joelheiras, luvas, botas, coldre), formas arredondadas e luz pintada à mão.
As referências e as regras estão em `docs/direcao-de-arte.md`. O Kauã está no catálogo, mas ainda não entra na partida:
para isso falta uma entrada em `CHARACTERS` e uma posição inicial por mapa (`maps.ts`).

## Tecnologia

- Angular 22 (componentes standalone, signals, zoneless)
- Three.js para a cena 3D (`src/app/game/hex-board.ts`)
- Grid hexagonal "flat-top" com offset odd-q (`src/app/game/hex.ts`), com áreas jogáveis retangulares
  ou circulares (`rectArea`, `circleArea`)
- Mapas, personagens e regras em `src/app/game/maps.ts` (`CHARACTERS`, `MOVE_DICE`)
- Dados em `src/app/game/dice.ts`; alcance com obstáculos em `hex.ts` (`reachableHexes`, `pathTo`)
- Inimigos (visão, patrulha, fuga) em `src/app/game/enemies.ts`, como funções puras testadas
- Personagens 3D em `src/app/game/character-model.ts` (GLB + animações); modelos em `public/assets/`
  (licenças em `public/assets/LICENSES.md`, build em `tools/assets/`). Proposta completa em
  `docs/esqueletos-e-movimentacao.md`

## Desenvolvimento

```bash
npm install
npm start        # http://localhost:4200
npm run build    # saída em dist/ibama-game/browser (pode ser servida estaticamente)
```

O roteamento usa hash (`#/jogo/...`), então o build funciona em qualquer
hospedagem estática.

## Métricas de acesso

O Google Tag Manager (`GTM-5RSTJ8MV`) é carregado em `src/index.html` com o **modo de
consentimento**: até o jogador tocar em **Aceitar** no aviso de cookies
(`src/app/ui/consent/consent-banner.ts`), o Analytics não grava cookies. A escolha fica em
`localStorage['ibama.analytics']`.

Como o roteamento usa hash, cada troca de tela é enviada ao `dataLayer` como o evento
`virtual_page_view`, com `page_path` sem o `#` (ex.: `/ibama-game-open/escalacao/teste-12x12`),
`page_location` e `page_title` (`src/app/game/analytics.ts`). Eventos do jogo podem ser
enviados com `Analytics.event('nome', { ... })`.
