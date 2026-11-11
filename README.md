# Jogo do Ibama (aberto)

Protótipo do jogo tático por turnos em que agentes do Ibama atuam contra crimes
ambientais. Esta versão é o **teste de movimentação**: um tabuleiro 3D vazio de
hexágonos azuis, em perspectiva, com um jogador flutuante.

## Como jogar o teste

1. Na tela inicial, toque em **Campo de teste** (o único mapa disponível) e em **Iniciar**.
2. Os hexágonos claros mostram o alcance: até **2 hexágonos** em qualquer direção.
3. Toque num hexágono claro para destacá-lo (fica amarelo) e toque em **Confirmar**.
4. Depois de **3 movimentos** o teste termina; dá para jogar de novo ou voltar ao início.

Arraste para mover a câmera; use pinça (ou a roda do mouse) para aproximar.

## Tecnologia

- Angular 22 (componentes standalone, signals, zoneless)
- Three.js para a cena 3D (`src/app/game/hex-board.ts`)
- Grid hexagonal "flat-top" com offset odd-q (`src/app/game/hex.ts`)
- Mapas e regras do teste em `src/app/game/maps.ts` (`MOVE_RANGE`, `MOVES_PER_TEST`)

## Desenvolvimento

```bash
npm install
npm start        # http://localhost:4200
npm run build    # saída em dist/ibama-game/browser (pode ser servida estaticamente)
```

O roteamento usa hash (`#/jogo/...`), então o build funciona em qualquer
hospedagem estática.
