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

## O que o script faz

- **Personagem (`characters/ana/ana.glb`):**
  - Junta o corpo `Superhero_Female_FullBody` com o cabelo `Hair_Buns`, religando o cabelo aos
    ossos do corpo.
  - Tinge o cabelo de castanho. A textura original é neutra, porque a versão paga tinge por shader.
  - Remove cores de vértice e UVs extras. A cor de vértice faria o three.js tingir o modelo.
  - Reduz as texturas para 1024 px em JPEG.
  - Comprime a malha com meshopt.
- **Clipes (`anims/humanoid-base.glb`):**
  - Pega `Idle_Loop`, `Walk_Loop` e `Jog_Fwd_Loop` do arquivo sem root motion.
  - Renomeia para `idle`, `walk` e `run`.
  - Descarta o boneco e comprime as curvas.

O jogo carrega os GLBs comprimidos com o `MeshoptDecoder` do three.js (ver
`src/app/game/character-model.ts`).
