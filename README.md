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

### Mapa do aeroporto

O mapa **Aeroporto** (32×26) é o primeiro mapa "de verdade": o terminal fica ao norte, com a
entrada da frente virada para o pátio e para a pista longa, e duas portas nos fundos. A equipe
começa ao sul, do outro lado da pista, e avança por trilhas e clareiras na mata. Os blocos de
**árvores** (de vários tipos e tamanhos) funcionam como paredes: ninguém
passa e os inimigos não enxergam através deles.

O mapa é desenhado em texto em `maps.ts` (`parseLayout`): `.` grama, `T` árvores, `#` parede,
`_` piso, `D` porta, `=` pista e `:` pátio — basta editar as linhas para mudar o terreno.

Arraste para mover a câmera; use pinça (ou a roda do mouse) para aproximar.

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
