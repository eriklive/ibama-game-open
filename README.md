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

### Mapa do aeroporto

O mapa **Aeroporto** (44×38) é o primeiro mapa "de verdade". O **hangar** fica ao norte, com um
portão largo (12 hexágonos) e duas portas nos fundos. A **pista é um rastro de terra** de 6 hexágonos de
largura, com sulcos de pneu, que sai do meio do portão e corta a mata de sul a norte. Por dentro cabem quatro aviões lado a lado (cada um ocupa
4 colunas × 3 fileiras); por enquanto há um só, parado no meio. Dois postes de luz ficam do lado
de fora, nos cantos da frente, e duas lâmpadas pendem do telhado. A equipe começa numa
clareira no canto sudoeste e avança pelas trilhas da mata ou pela pista.

Os blocos de **árvores** (de vários tipos e tamanhos) e o **avião** funcionam como paredes: ninguém
passa e os inimigos não enxergam através deles.

O terreno é desenhado em texto em `maps.ts` (`parseLayout`): `.` grama, `T` árvores, `#` parede,
`_` piso, `D` porta, `~` terra batida, `=` asfalto, `:` pátio e `A` avião — basta editar as linhas para mudar o mapa.
O hangar (chapa ondulada, portão, arcos do telhado, postes e lâmpadas) e o avião são montados por código em
`scenery.ts`. O avião é um modelo provisório, a ser trocado pelo Cessna 152 escolhido.

Arraste para mover a câmera; use pinça (ou a roda do mouse) para aproximar.

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
- Grid hexagonal "flat-top" com offset odd-q (`src/app/game/hex.ts`)
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
