# Build dos modelos 3D

`build-assets.mjs` gera os GLBs usados pelo jogo a partir dos pacotes originais da Quaternius.
Os pacotes não ficam no repositório (são ~140 MB); só o resultado otimizado vai para `public/assets/`.

## Passo a passo

1. Baixe a versão grátis (Standard) dos dois pacotes e descompacte:
   - Universal Base Characters: https://quaternius.itch.io/universal-base-characters
   - Universal Animation Library: https://quaternius.itch.io/universal-animation-library
2. Rode:

```bash
cd tools/assets
npm install
node build-assets.mjs \
  "/caminho/Universal Base Characters[Standard]" \
  "/caminho/Universal Animation Library[Standard]" \
  ../../public/assets
```

Para refazer só alguns personagens, acrescente `--only=ana,cacador` ao comando.

O build grava a **base** de cada personagem (corpo, cabelo, roupa pintada, acessórios simples).
O equipamento com volume entra num segundo passo, o **refit**:

```bash
node build-assets.mjs "<UBC>" "<UAL>" base   # só quando mudar corpo, cabelo ou roupa pintada
node refit.mjs                               # base/ → ../../public/assets (aceita --only=ana)
```

A pasta `base/` fica no repositório. Por isso dá para mexer no kit (`lib/kit.mjs`) e rodar só o
refit, **sem baixar os pacotes da Quaternius**.

## O que o script faz

- **Personagens (`characters/<id>/<id>.glb`)**, um por entrada de `characters.mjs`:
  - Parte de um dos dois corpos grátis (`Superhero_Female_FullBody` ou `Superhero_Male_FullBody`)
    e junta os penteados pedidos, religando o cabelo aos ossos do corpo. Penteado feito para a
    outra cabeça é ajustado à cabeça do corpo escolhido.
  - **Veste o corpo** (`lib/bake.mjs`). Os corpos vêm só de roupa íntima. Cada ponto da textura
    sabe onde fica no corpo, e as camadas do figurino (calça, camisa, colete, botas, xadrez,
    camuflagem, lama, pintura facial) decidem a cor dali. Onde há roupa, a malha é alisada e
    engrossada, para não parecer pintura no corpo. A pele é repintada no tom do personagem.
  - **Acessórios** (`lib/gear.mjs`): boné, chapéu, capacete, mochila, rádio, colar, motosserra,
    bateia e espingarda são geometria simples gerada por código, colorida por vértice e presa a
    um osso. Com chapéu, o cabelo acima da aba é removido.
  - Tinge o cabelo. A textura original é neutra, porque a versão paga tinge por shader.
  - Remove mapas de normal e de rugosidade, cores de vértice do corpo e UVs extras.
  - Textura do corpo em 1024 px (JPEG); cabelo em 512 px; malha comprimida com meshopt.
- **Clipes (`anims/humanoid-base.glb`):**
  - Pega `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop` e `Crouch_Idle_Loop` do arquivo sem root motion.
  - Renomeia para `idle`, `walk`, `run` e `crouch`.
  - Descarta o boneco e comprime as curvas.

## O que o refit faz (`refit.mjs` + `lib/kit.mjs`)

A roupa pintada dá a cor, mas não a silhueta: de cima, o corpo de super-herói aparecia por baixo
de tudo (glúteo, coxa, dedos do pé). O refit desfaz a quantização da base (`lib/glb-space.mjs`),
alisa as pernas debaixo da calça e acrescenta equipamento de verdade, em estilo cartoon
caprichado (formas gordinhas, bordas acolchoadas, luz pintada por vértice):

- **Faixas** (`Contour` + `band`): o corte do tronco, da coxa, da canela ou do braço é medido,
  alisado e vira uma casca com espessura. Placas do colete, faixa lateral, MOLLE, joelheiras,
  punho das luvas, cano das botas, cinto. Cada vértice copia os pesos do corpo, então a peça
  acompanha a animação.
- **Cascas da malha** (`shell`): luvas e botas copiam a malha da mão e do pé, alisada e
  empurrada para fora, com os pesos originais (os dedos da luva dobram junto).
- **Peças rígidas** presas a um osso: porta-carregadores, rádio com antena e PTT, coldre com
  pistola, bolsos cargo, bandeira do Brasil no braço, IBAMA em blocos nas costas, mochila,
  abafador de ouvido, bandoleira de cartuchos.
- **Proporções** (`lib/proportions.mjs`): cabeça, mãos e pés maiores e braços mais finos,
  feitos na malha (as animações gravam a escala dos ossos, então o esqueleto não pode mudar).
  `STYLE.proportions` em `characters.mjs` escolhe `none`, `sutil` ou `chibi`; para comparar sem
  mexer no arquivo: `node refit.mjs --proportions=chibi --out=/tmp/teste`.
- **Luz pintada**: cada peça clareia no topo, escurece na base e realça as quinas com um brilho
  somado (que aparece até em peça preta), como textura pintada à mão.

Peças disponíveis em `KIT` (`lib/kit.mjs`): `plateCarrier` (`style: 'vest'` para o colete de
campo leve), `radio`, `belt`, `kneePads`, `boots`, `gloves`, `holster`, `cargoPockets`,
`flagPatch`, `backpack`, `earMuffs`, `bandolier`. Cada personagem lista as suas em `kit`, em
`characters.mjs`. `KIT_DEBUG=1 node refit.mjs` mostra quantos triângulos cada peça custa.

## Criar ou mudar um personagem

Edite `characters.mjs`: corpo, tom de pele, penteado e cor, camadas do figurino, acessórios e
kit. Só o kit e os acessórios mudaram? Rode só `node refit.mjs`. Senão, rode o build e registre o modelo novo em `MODELS` (`src/app/game/character-model.ts`) e em
`public/assets/LICENSES.md`.

A lista dos pacotes e do que usamos de cada um está em `public/assets/README.md`.

O jogo carrega os GLBs comprimidos com o `MeshoptDecoder` do three.js (ver
`src/app/game/character-model.ts`).
