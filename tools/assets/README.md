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
  - Pega `Idle_Loop`, `Walk_Loop` e `Jog_Fwd_Loop` do arquivo sem root motion.
  - Renomeia para `idle`, `walk` e `run`.
  - Descarta o boneco e comprime as curvas.

## Criar ou mudar um personagem

Edite `characters.mjs`: corpo, tom de pele, penteado e cor, camadas do figurino e acessórios.
Rode o build e registre o modelo novo em `MODELS` (`src/app/game/character-model.ts`) e em
`public/assets/LICENSES.md`.

O jogo carrega os GLBs comprimidos com o `MeshoptDecoder` do three.js (ver
`src/app/game/character-model.ts`).
