# Jogo do Ibama (aberto)

Protótipo do jogo tático por turnos em que agentes do Ibama atuam contra crimes
ambientais. Esta versão é o **teste de movimentação e turnos**: um tabuleiro 3D de
hexágonos azuis, em perspectiva, com três personagens que se revezam.

## Como jogar o teste

1. Na tela inicial, toque em **Campo de teste** (o único mapa disponível) e em **Iniciar**.
2. Há **3 personagens** (Ana, Bruno e Clara), cada um com o seu turno, em rodadas sem fim.
3. No início de cada turno são rolados **2d4**: a soma é o movimento daquele turno.
4. Os hexágonos claros mostram até onde dá para ir (contornando os outros personagens).
   Toque num hexágono para destacá-lo (fica amarelo): o caminho até ele brilha e flutua,
   mostrando por onde o personagem vai passar. **Toque de novo** no destino para
   confirmar — ou use o botão **Confirmar**. Dá para andar várias vezes no mesmo turno
   enquanto sobrar movimento; o custo é o número de passos.
5. Quando o movimento acaba, a vez passa sozinha; **Passar a vez** encerra antes.
6. Toque numa peça no tabuleiro ou num retrato no topo para ver aquele personagem. Quem
   está na vez ganha um anel amarelo e o retrato fica destacado como **Na vez**.
7. Ana, Bruno e Clara são personagens 3D animados (ficam parados respirando e correm pelo
   caminho), de pé sobre um disco com a cor de cada um.

## Inimigos (primeira iteração)

O mapa de teste tem **paredes** (prismas cinza: ninguém passa e ninguém enxerga através
delas) e **três inimigos** (madeireiro, garimpeiro e caçador, cada um com seu modelo 3D sobre
uma base vermelha; o corpo mostra para onde olham).

- Depois da Clara vem o **turno inimigo**: quem está em patrulha anda 2 passos pela rota.
- Os hexágonos **avermelhados** são o cone de visão dos inimigos em patrulha (3
  hexágonos, 120° à frente). Entrar nele — mesmo só de passagem — ou ser alcançado por
  ele faz o inimigo **avistar** o agente: a base fica laranja, aparece um **!** e ele para.
- Em alerta, no turno inimigo ele **corre** 4 passos rumo à borda mais próxima. Se
  chegar a uma borda, **foge** do mapa. Agentes, paredes e outros inimigos bloqueiam o
  caminho: cercando as saídas, ele fica **encurralado**.

### Abordagem

Na vez de um agente, o botão **Abordar** (com o número de inimigos no raio) mostra a
abordagem antes de confirmar: hexágonos **verdes** são a zona de rendição (até 2
hexágonos) e os **laranja**, o resto do raio (até 4). O painel lista quem se rende e quem
vai tentar correr. **Abordar!** confirma; tocar no tabuleiro ou em **Cancelar** desiste.

- Inimigos a até 2 hexágonos **se rendem**: a base fica branca, eles se agacham com uma bandeira branca, param de
  agir e continuam ocupando o hexágono. Vale também para quem já estava em alerta.
- Inimigos entre 3 e 4 hexágonos são **alertados** e tentam correr no turno inimigo.
- A distância é em linha reta: por enquanto, paredes não abafam o grito.
- Abordar **encerra a vez** do agente. Se o movimento acabar com inimigos no raio, a vez
  não passa sozinha, para dar tempo de abordar.
- Quando ninguém mais age (todos rendidos ou fugidos), aparece o resultado.

Os números ficam em `ENEMY_RULES` e `APPROACH_RULES` (`src/app/game/enemies.ts`); paredes e
rotas de patrulha ficam no mapa (`maps.ts`).

### Agrupar

Na vez de um agente, o botão **Agrupar** reúne a equipe: os hexágonos claros são os **pontos de
encontro** possíveis — lugares que todos alcançam com o movimento que resta a quem está na vez.
Toque num ponto para ver o caminho e toque de novo (ou em **Agrupar!**) para confirmar: quem está
na vez vai até o ponto e os outros param em volta dele. Gasta-se o caminho mais longo entre todos.

- Agrupados, os agentes **andam juntos**: quando um deles anda, os outros seguem o rastro logo
  atrás. Quem não consegue acompanhar (caminho bloqueado) sai do grupo.
- Juntos, cada agente ganha **+2 de movimento** na rolagem do seu turno.
- **Desagrupar** desfaz o grupo e cada um volta a andar por conta própria.

O bônus fica em `GROUP_RULES` (`src/app/game/group.ts`).

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
`_` piso, `D` porta, `~` terra batida, `=` asfalto, `:` pátio, `A` avião e a carga (ver abaixo) — basta editar as linhas para mudar o mapa.
O hangar (chapa ondulada, portão, arcos do telhado, postes e lâmpadas) e o avião são montados por código em
`scenery.ts`. O avião é um modelo provisório, a ser trocado pelo Cessna 152 escolhido.

Arraste para mover a câmera; use pinça (ou a roda do mouse) para aproximar.

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
| □ | Abordar |
| △ | Passar a vez |
| Share | Agrupar / desagrupar |
| L1 / R1 | Personagem anterior / seguinte |
| Touchpad / R3 | Volta para quem está na vez |
| Analógico direito | Move a câmera |
| R2 / L2 | Aproxima / afasta |
| Options | Mostra ou esconde a legenda dos comandos |

Na tela inicial, o direcional escolhe o mapa e ✕ inicia. O controle vibra quando um inimigo avista
um agente e na abordagem (Chrome/Edge). No Chrome/Edge o DualShock 4 chega com o mapeamento
"standard"; no Firefox/Linux, sem ele, o jogo usa o mapeamento do driver. Outros controles (Xbox,
genéricos) também funcionam, com as letras A/B/X/Y. Leitura e mapeamento em
`src/app/game/gamepad.ts` (funções puras testadas) e `gamepad.service.ts`.

## Modelos dos personagens

Há sete modelos em `public/assets/characters/`: quatro agentes do Ibama (Ana, Bruno, Clara e
Kauã) e três inimigos (madeireiro, garimpeiro e caçador). Todos saem de `tools/assets`, a partir
dos corpos CC0 da Quaternius: o elenco (corpo, pele, cabelo, roupa, acessórios) fica em
`tools/assets/characters.mjs` e o catálogo usado pelo jogo, em `MODELS`
(`src/app/game/character-model.ts`). O Kauã está no catálogo, mas ainda não entra na partida:
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
