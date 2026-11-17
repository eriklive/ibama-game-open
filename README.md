# Jogo do Ibama (aberto)

Protótipo do jogo tático por turnos em que agentes do Ibama atuam contra crimes
ambientais. Esta versão é o **teste de movimentação e turnos**: um tabuleiro 3D de
hexágonos azuis, em perspectiva, com três personagens que se revezam.

## Como jogar o teste

1. Na tela inicial, toque em **Campo de teste** (o único mapa disponível) e em **Iniciar**.
2. Antes da partida vem a **ficha do agente** (escalação): distribua o ponto de cada agente e
   toque em **Confirmar escalação** (ver [Ficha do agente](#ficha-do-agente-atributos)).
3. Há **3 personagens** (Ana, Bruno e Clara), cada um com o seu turno, em rodadas sem fim.
4. No início de cada turno são rolados **2d4**: a soma **mais a velocidade** do agente (e +2 se
   estiver agrupado) é o movimento daquele turno.
5. Os hexágonos claros mostram até onde dá para ir (contornando os outros personagens).
   Toque num hexágono para destacá-lo (fica amarelo): o caminho até ele brilha e flutua,
   mostrando por onde o personagem vai passar. **Toque de novo** no destino para
   confirmar — ou use o botão **Confirmar**. Dá para andar várias vezes no mesmo turno
   enquanto sobrar movimento; o custo é o número de passos.
6. Quando o movimento acaba, a vez passa sozinha; **Passar a vez** encerra antes.
7. Toque numa peça no tabuleiro ou num retrato no topo para ver aquele personagem. Quem
   está na vez ganha um anel amarelo e o retrato fica destacado como **Na vez**. Cada retrato
   mostra a velocidade e a intimidação do agente em campo (em verde quando o grupo soma o bônus);
   o de quem está na vez mostra também o alcance da abordagem.
8. Ana, Bruno e Clara são personagens 3D animados (ficam parados respirando e correm pelo
   caminho), de pé sobre um disco com a cor de cada um.

## Ficha do agente (atributos)

Entre escolher o mapa e começar, a tela **Ficha do agente** (`#/escalacao/<mapa>`) mostra cada
agente: abas com a foto 3x4 (ponto **amarelo** = ponto livre, **verde** = distribuído), o
**modelo 3D** real do personagem (arraste ou use o botão para girar) com seis espaços de
equipamento ainda **em breve** (cabeça, tronco, mãos, arma, costas, pés) e a ficha em papel.

- **Velocidade:** cada ponto vale **+1 de movimento** no turno (somado aos 2d4).
- **Intimidação:** cada ponto vale **+1 no raio de abordagem** (a zona de rendição). A zona de
  rolagem e a de fuga se afastam junto.
- Cada atributo vai de **−5 a +5** numa régua centrada no 0 (positivo enche em verde para a
  direita, negativo em vermelho para a esquerda; o tracejado mostra onde o ponto livre pode
  entrar). Todo agente começa com 0 nos dois.
- Cada agente tem **1 ponto** para pôr em **um** dos dois atributos. Dá para tirar só o ponto que
  você colocou: pelo jogador, o mínimo é 0. O lado negativo fica para penalidades (peso,
  equipamento).
- **Total em campo:** atributo + equipamento (por enquanto, nenhum) + **grupo**. Enquanto os
  agentes estão **agrupados**, cada um ganha **+2 de velocidade** (movimento) e **+2 de alcance**
  na abordagem; separou, perdeu.
- **Anterior / Próximo agente** passam pelas fichas; no último, **Confirmar escalação** começa a
  partida com esses atributos (a escolha fica guardada na sessão do navegador e vale também para
  "Recomeçar"). Com controle: L1/R1 trocam de agente, cima/baixo escolhem o atributo,
  esquerda/direita tiram/põem o ponto, ✕ avança e ○ volta ao início.
- Larga (≥ 900 px), a tela usa o layout "web" (abas na lateral); estreita, o de celular.

As regras ficam em `src/app/game/stats.ts` (`STAT_RULES`, `APPROACH_SCALING`, funções puras
testadas); o bônus do grupo, em `GROUP_RULES` (`group.ts`). Para a intimidação também aumentar a
zona de rendição, troque `APPROACH_SCALING.surrender` para `true`. A tela fica em
`src/app/screens/roster/` e o visualizador 3D em `src/app/game/agent-viewer.ts`.

## Inimigos (primeira iteração)

O mapa de teste tem **paredes** (prismas cinza: ninguém passa e ninguém enxerga através
delas) e **três inimigos** (dois garimpeiros e o piloto do avião do garimpo, cada um com seu modelo 3D sobre
uma base vermelha; o corpo mostra para onde olham).

- Depois da Clara vem o **turno inimigo**: quem está em patrulha anda 2 passos pela rota.
- Os hexágonos **avermelhados** são o cone de visão dos inimigos em patrulha (3
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

- **Verde, raio de abordagem:** **2 + intimidação** do agente, **+2** enquanto ele estiver
  agrupado, nunca menor que 1. Quem está nele se rende.
- **Amarelo, zona de rolagem (3 hexágonos):** cada suspeito rola **d20 + modificador** e passa
  no teste com **8 ou mais**. O modificador é **−1** no hexágono mais perto da abordagem, **0** no
  meio e **+1** no mais perto da fuga (60%, 65% e 70% de escapar). Passou: não se rende, fica em
  alerta e corre no turno inimigo. Falhou: se rende.
- **Laranja, zona de fuga (1 hexágono):** fica em alerta e corre, sem rolar.

Sem bônus, as faixas são 1–2, 3–5 e 6. O painel mostra a conta (base · intimidação · grupo), as
faixas e quantos se rendem, rolam e vão correr. Os números ficam em `APPROACH_RULES`
(`src/app/game/enemies.ts`). O botão
**Abordar** só aparece com algum suspeito dentro do raio de quem está na vez. A decisão fica em
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
na vez vai até o ponto e os outros param em volta dele. Gasta-se o caminho mais longo entre todos.

- A partida **começa com a equipe agrupada** (os três saem juntos do ponto de partida).
- Agrupados, os agentes **andam juntos**: quando um deles anda, os outros seguem o rastro logo
  atrás. Quem não consegue acompanhar (caminho bloqueado) sai do grupo.
- Juntos, cada agente ganha **+2 de movimento** na rolagem do seu turno e **+2 de alcance** na
  abordagem. Desagrupou, perdeu os dois.
- **Desagrupar** desfaz o grupo e cada um volta a andar por conta própria.

Os bônus ficam em `GROUP_RULES` (`moveBonus` e `approachBonus`, em `src/app/game/group.ts`).

### Mapa do aeroporto

O mapa **Aeroporto** (desenho de 44×38, com a missão num círculo — ver abaixo) é o primeiro mapa "de verdade". O **hangar** fica ao norte, com um
portão largo (12 hexágonos) e duas portas nos fundos. A **pista é um rastro de terra** de 6 hexágonos de
largura, com sulcos de pneu, que sai do meio do portão e corta a mata de sul a norte. Por dentro cabem quatro aviões lado a lado (cada um ocupa
4 colunas × 3 fileiras); por enquanto há um só, parado no meio. Dois postes de luz ficam do lado
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
  carga baixa, o agente fica agachado.
- **Decoração** (galões de gasolina e botijão): não bloqueia nada.

A carga é desenhada no texto do mapa (`B` caixotes, `M` papelão, `S` sacos, `G` gaiolas, `f` galões) e
a altura de cada tipo fica em `COVER_HEIGHT` (`maps.ts`). Os modelos são montados por código em
`scenery.ts` (`buildCover`, `buildFuelProps`).

O terreno é desenhado em texto em `maps.ts` (`parseLayout`): `.` grama, `T` árvores, `#` parede,
`_` piso, `D` porta, `~` terra batida, `=` asfalto, `:` pátio, `A` avião, a carga (ver abaixo), os suprimentos do garimpo (`R`) e os móveis da casa (`m`, `P`) — basta editar as linhas para mudar o mapa.
O hangar (chapa ondulada, portão, teto em arco, postes e lâmpadas) e o avião são montados por código em
`scenery.ts`. O **teto** (chapa, oitões e arcos) cobre o hangar visto de fora e some assim que um agente entra
(o vão do portão já conta); a carga, o avião e as lâmpadas de dentro só são desenhados quando há um agente a até
6 hexágonos do hangar (`structureView` em `maps.ts`). O avião é um modelo provisório, a ser trocado pelo Cessna 152 escolhido.

Arraste para mover a câmera; use pinça (ou a roda do mouse) para aproximar.

### Casa do Garimpeiro Jô e testes de percepção (d20)

A leste da pista, numa clareira, fica a **casa** dos garimpeiros: dois cômodos de 5 × 5 hexágonos, de
tábuas e com telhado de chapa enferrujada (que some quando um agente entra, como o do hangar). Entra-se
pela porta do oeste, que dá para a pista; uma divisória com porta separa os cômodos.

- **Cômodo 1:** o **Garimpeiro Jô** come parado na mesa, **de costas para a entrada**. Ele não anda no
  turno inimigo, mas o cone de visão dele cobre a porta do cômodo 2: entre por trás e **aborde** (a até 2
  hexágonos ele se rende). Quem passa pela porta do meio sem rendê-lo é avistado.
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
seguinte, **Apreender a arma escondida**, cumprido ao inspecionar e achar a arma. Também há **Render o Garimpeiro
Jô**. Passos assim usam `after` no objetivo (só aparece depois do objetivo com aquele id); `notice` cumpre ao
reparar num esconderijo. As regras dos testes ficam em `SEARCH_RULES` (`src/app/game/search.ts`); a casa, o esconderijo
e os objetivos ficam no mapa (`house`, `hidden`, `objectives` em `maps.ts`). No desenho em texto, `m` é a
mesa (cobertura baixa) e `P` a prateleira (alta); os modelos são montados em `scenery.ts` (`buildHouse`).
Um inimigo com rota de um ponto só fica parado; `facing` no mapa diz para onde ele olha.

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
| □ | Abordar: toque abre a prévia, segurar aborda direto (sem ninguém no raio: queimar o alvo ou inspecionar) |
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
