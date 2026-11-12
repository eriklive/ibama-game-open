# Esqueletos, animação e movimentação no tabuleiro

> Proposta técnica · status: **rascunho para discussão** · nada aqui está implementado em `src/` ainda.

Hoje os personagens são peças de placeholder (disco + anel + "alça" frontal) montadas em
`HexBoard.buildUnit` e animadas à mão em `HexBoard.loop` (flutuação, giro de quem está na vez) e
`HexBoard.hopTo` (pulinho de 260 ms por hexágono). Este documento propõe como trocar isso por
modelos 3D riggados e animados, no estilo "chunky"/estilizado (Fortnite, For The King 2), usando
por enquanto **assets abertos (CC0)** enquanto não temos modelador no time.

O ponto de integração que **não muda**: a tela (`GameScreen.confirm`) continua chamando
`await board.moveUnit(id, path)` com o caminho de `pathTo` (sem a origem) e só libera a próxima
fase quando a Promise resolve. Toda a troca acontece dentro de `HexBoard`.

---

## 1. Padrão de esqueleto

### 1.1 Convenção escolhida: humanoide no padrão "UE Mannequin" (nomes da Quaternius UAL)

Adotamos **um único esqueleto humanoide canônico**, com a nomenclatura do manequim da Unreal
(a mesma da *Quaternius Universal Animation Library* e dos *Ultimate/Modular Characters*).
Motivos:

- A UAL é CC0 e traz um volume grande de animações prontas nesse esqueleto — é a nossa principal
  fonte de clipes enquanto não houver animador.
- Nomes simples, sem prefixo (`hand_r` em vez de `mixamorig:RightHand`), estáveis entre
  ferramentas e fáceis de usar como chave no código.
- Mixamo é compatível por retarget, mas **não é CC0**: os termos da Adobe permitem usar em jogos,
  mas não redistribuir os arquivos soltos — e o repositório é aberto. Mixamo fica só para testes
  locais, nunca commitado (ver Perguntas em aberto).

Ossos **obrigatórios** (o resto — dedos, twist, IK helpers — é opcional e ignorado se faltar):

| Grupo  | Ossos                                                                 |
|--------|-----------------------------------------------------------------------|
| Raiz   | `root` (no chão, entre os pés, sem animação de translação)            |
| Tronco | `pelvis`, `spine_01`, `spine_02`, `spine_03`, `neck_01`, `head`       |
| Braços | `clavicle_l/r`, `upperarm_l/r`, `lowerarm_l/r`, `hand_l/r`            |
| Pernas | `thigh_l/r`, `calf_l/r`, `foot_l/r`, `ball_l/r`                       |

Regras:

- **Lado** sempre em sufixo minúsculo `_l` / `_r`. Ao importar de outras fontes (KayKit usa
  outro rig, Mixamo usa `mixamorig:*`), renomear/retargetar **offline** para este padrão.
- **Máx. ~65 ossos** por personagem e **4 influências por vértice** (limite confortável para
  skinning em GPU de celular).
- **Escala**: modelos exportados em metros, glTF padrão (**+Y para cima, frente em +Z**). Em
  Three.js isso significa que `rotation.y = atan2(dx, dz)` faz o personagem olhar para a direção
  `(dx, dz)` — a mesma convenção da "alça" (`nub` em `z = +0.42`) da peça atual.
- **Altura no tabuleiro**: o hexágono tem raio 1 (`HEX_SIZE`), distância entre centros vizinhos
  √3 ≈ 1,73. Um humano de 1,8 m fica grande demais; normalizamos na carga para **~1,15 unidade**
  de altura (escala calculada pela bounding box do bind pose e guardada no manifesto, ver §2).
  Proporções "chunky" (cabeça grande) ajudam a leitura nessa escala.
- **Origem** do modelo no chão, centrada entre os pés; o bind pose pode ser T ou A, mas **todo o
  catálogo usa o mesmo** (A-pose da UAL).

### 1.2 Sockets (pontos de encaixe)

Sockets são **nós vazios filhos de ossos**, exportados no GLB com prefixo `socket_`:

| Socket            | Osso-pai  | Uso                                              |
|-------------------|-----------|--------------------------------------------------|
| `socket_hand_r`   | `hand_r`  | ferramenta principal (rádio, GPS, câmera, arma)   |
| `socket_hand_l`   | `hand_l`  | item secundário (prancheta, lanterna)             |
| `socket_head`     | `head`    | chapéu, capacete, boné do Ibama                   |
| `socket_back`     | `spine_03`| mochila, colete                                   |

Se um modelo vier sem sockets, o código cria o nó em runtime sob o osso com um offset padrão
(tabela no manifesto). Props são GLBs estáticos anexados com `socket.add(prop)` — sem skinning.

### 1.3 Animações de fontes diferentes num esqueleto só

Três caminhos, nesta ordem de preferência:

1. **Esqueleto compartilhado por nome (padrão).** Clipes do Three.js se ligam aos ossos **pelo
   nome do nó** (`hand_r.quaternion`). Se todos os humanoides têm os mesmos nomes e o mesmo bind
   pose, um único arquivo `anims/humanoid-base.glb` (só esqueleto + clipes) serve para todos:
   carregamos os clipes uma vez e criamos `mixer.clipAction(clip)` em cada personagem. Zero
   retarget em runtime.
2. **Retarget offline no Blender** para fontes de outro rig (KayKit, Mixamo para testes, captura
   própria): importar, retargetar para o rig canônico (Rokoko Retargeting ou constraints "Copy
   Rotation" + bake), exportar só os clipes. O resultado entra no mesmo `humanoid-base.glb` ou num
   `anims/humanoid-<pacote>.glb`.
3. **`SkeletonUtils.retargetClip` em runtime** apenas como ferramenta de protótipo/debug: é caro,
   sensível a diferenças de bind pose e o resultado não é cacheável entre sessões.

Em todos os casos, **tracks de posição só no `pelvis`** (balanço vertical); tracks de posição em
`root` são removidas na exportação (ver "in-place" em §4).

### 1.4 Personagens não-humanoides (fauna, drones, veículos)

O jogo é sobre crime ambiental: fauna e máquinas são tão importantes quanto agentes. Em vez de um
esqueleto universal, usamos **famílias**, todas com o **mesmo vocabulário de clipes** (§3), para
que a máquina de estados e o `MovementController` sejam os mesmos:

| Família     | Exemplos                                  | Esqueleto                                   | Fonte de clipes                  |
|-------------|-------------------------------------------|---------------------------------------------|----------------------------------|
| `humanoid`  | agentes, madeireiros, garimpeiros         | canônico (§1.1)                             | biblioteca compartilhada         |
| `quadruped` | onça, capivara, tamanduá, tatu, gado      | próprio do modelo (`root`, `pelvis`, coluna, 4 pernas, cauda) | **embutidos no GLB do bicho** |
| `bird`      | arara, gavião, tucano                     | próprio (asas, cauda)                       | embutidos                        |
| `reptile`   | jacaré, sucuri, tartaruga                 | próprio (coluna longa)                      | embutidos                        |
| `rigid`     | drone, caminhão madeireiro, trator, balsa, lancha | **sem skin**: hierarquia de nós (`wheel_*`, `rotor_*`, `body`) | procedural no código + clipes de nó opcionais |

- Animais da Quaternius (ex.: *Ultimate Animated Animals*) já vêm com clipes próprios; mapeamos os
  nomes deles para o nosso vocabulário no manifesto, sem retarget.
- Veículos e drones não têm `walk`: o "clipe" de locomoção é procedural (girar rodas em função da
  velocidade, inclinar o drone na direção do movimento, balanço da balsa). O `CharacterRig` expõe
  a mesma interface; só a implementação muda.
- Vale para todos: frente em +Z, origem no chão, escala normalizada pelo "tamanho em hexágonos"
  declarado no manifesto (uma onça ocupa 1 hex; um caminhão pode ocupar 1 hex visualmente
  "transbordando" — ver Perguntas em aberto sobre unidades multi-hex).

---

## 2. Pipeline de assets

### 2.1 Formato e layout

Formato único: **glTF binário (`.glb`)**. Tudo em `public/` (o Angular serve `public/` na raiz,
então a URL é `assets/...`):

```
public/assets/
  characters/
    ana/ana.glb              # malha + esqueleto canônico, sem clipes (ou só "idle" de fallback)
    bruno/bruno.glb
  fauna/
    onca/onca.glb            # malha + esqueleto próprio + clipes embutidos
  vehicles/
    caminhao-madeireiro/caminhao-madeireiro.glb
  anims/
    humanoid-base.glb        # só esqueleto + clipes compartilhados
  props/
    radio.glb  gps.glb  chapeu-ibama.glb
  textures/
    palette.png              # atlas de paleta compartilhado
  LICENSES.md                # origem, autor e licença de cada arquivo (obrigatório)
```

Fontes `.blend` ficam **fora** de `public/` (ex.: `art-src/`, possivelmente via Git LFS) para não
irem no build.

Manifesto tipado em `src/app/game/assets.ts` (sketch em §4.6) liga `Character.id` → modelo,
família, escala, mapeamento de nomes de clipes e sockets.

### 2.2 Compressão

- **meshopt** (`EXT_meshopt_compression`) como padrão: comprime geometria **e animação**, decodifica
  rápido e o decoder é pequeno (`three/examples/jsm/libs/meshopt_decoder.module.js`). Draco só
  comprime geometria e o decoder WASM é maior — dispensável para modelos low-poly.
- Pipeline com `@gltf-transform/cli`, por exemplo:
  `gltf-transform optimize in.glb out.glb --compress meshopt --texture-compress webp`
  (inclui dedup, prune, resample de keyframes e quantização).
- KTX2/Basis só se as texturas crescerem; com paleta isso não deve acontecer.

### 2.3 Estilo de textura

- **Paleta/gradiente**: a maioria dos packs CC0 (Quaternius, Kenney, KayKit) usa uma textura
  pequena de cores com UVs "colapsadas" em cada swatch. Padronizamos **um `palette.png` de
  256×256** compartilhado → um material para quase tudo, poucos draw calls, recolorir = trocar UV
  ou a textura.
- Variação por personagem (cor do colete de Ana/Bruno/Clara = `Character.color`) via material
  clonado com `color` multiplicado, ou um segundo swatch reservado para "cor do time".
- Material: `MeshStandardMaterial` (roughness alta, metalness 0) para casar com a iluminação atual;
  avaliar `MeshToonMaterial` + contorno depois.

### 2.4 Orçamentos (web mobile)

| Item                          | Triângulos     | Ossos | Texturas            |
|-------------------------------|----------------|-------|---------------------|
| Agente jogável                | 3k – 6k        | ≤ 65  | paleta compartilhada |
| NPC humano / fauna            | 1,5k – 4k      | ≤ 50  | paleta              |
| Veículo / drone               | 2k – 5k        | 0     | paleta              |
| Prop de mão / chapéu          | < 500          | 0     | paleta              |
| **Cena inteira**              | **< 150k**     | —     | < 10 draw calls por personagem |

Com a câmera atual (pitch 55°, distância ~11,5) LOD de malha é dispensável no mapa 12×12. Para
mapas grandes (27×11 do Hangar) o primeiro "LOD" é desligar sombra e reduzir a taxa do mixer
(atualizar a cada 2 frames) para quem está fora da tela.

### 2.5 Carregamento

- `GLTFLoader` + `setMeshoptDecoder(MeshoptDecoder)`, **um loader por app**.
- Cache de **Promise por URL** (`Map<string, Promise<GLTF>>`) — várias peças pedindo o mesmo GLB
  disparam um único download.
- Cada instância no tabuleiro = `SkeletonUtils.clone(gltf.scene)` (o `clone()` comum quebra o
  vínculo malha↔esqueleto). Geometria e materiais são compartilhados entre clones; clipes também.
- O `HexBoard` é criado de forma síncrona hoje; manter a peça placeholder visível até o GLB chegar
  e trocar quando carregar (sem bloquear o primeiro turno). Falha de carga = fica o placeholder.
- `dispose()` do board: liberar geometrias/materiais **do cache** só quando a tela de jogo sai,
  não a cada clone (hoje `dispose` percorre a cena e libera tudo — precisa ajustar para não
  liberar recursos compartilhados duas vezes).

---

## 3. Conjunto de animações

### 3.1 Clipes mínimos e nomes

Nomes canônicos em **`snake_case` minúsculo**. O manifesto mapeia nomes da fonte
(ex.: `"Walk_Loop"` → `walk`) para os nossos; o código só conhece os canônicos.

| Clipe          | Loop | Uso                                                        | Obrigatório |
|----------------|------|------------------------------------------------------------|-------------|
| `idle`         | sim  | parado, fora da vez                                        | sim         |
| `idle_alert`   | sim  | personagem da vez aguardando escolha (substitui o giro/flutuação) | sim |
| `walk`         | sim  | deslocamento curto (≤ 2 hex)                               | sim         |
| `run`          | sim  | deslocamento longo (≥ 3 hex)                               | sim         |
| `turn_l/turn_r`| não  | virar no lugar > 90° antes de andar                        | não         |
| `hop`          | não  | pulo de hex (modo "peça de tabuleiro", fauna pequena)       | não         |
| `step_up/step_down` | não | desnível entre hexágonos (§4.4)                         | não         |
| `interact`     | não  | ação genérica (vistoriar, apreender, conversar)            | sim         |
| `use_tool`     | não  | usar item do `socket_hand_r` (rádio, câmera, GPS)          | não         |
| `hit`          | não  | levar dano / ser surpreendido                              | sim         |
| `ko`           | não, segura último frame | nocaute                                 | sim         |
| `get_up`       | não  | voltar do `ko`                                             | não         |
| `celebrate`    | não  | missão cumprida, fim de turno bom                          | não         |

Faltando um clipe opcional, cai num fallback declarado (`turn_l` → giro procedural, `run` →
`walk` com `timeScale` maior, `hop` → `walk`).

### 3.2 Mixer e transições

- **Um `AnimationMixer` por personagem**, atualizado no `loop` existente do `HexBoard` com o mesmo
  `dt` (já limitado a 0,1 s).
- Uma ação "base" de locomoção ativa por vez; ações one-shot (`interact`, `hit`) por cima com
  `crossFadeTo` e volta automática ao estado anterior no evento `finished` do mixer.
- Durações de crossfade:

| De → Para                    | Fade     |
|------------------------------|----------|
| idle ↔ idle_alert            | 0,30 s   |
| idle → walk/run              | 0,15 s   |
| walk/run → idle              | 0,20 s (começa ~0,2 s antes de chegar ao último hex) |
| walk ↔ run                   | 0,25 s com `syncWith` (mantém fase dos passos) |
| qualquer → hit               | 0,05 s   |
| qualquer → ko                | 0,10 s   |

- `walk`/`run` ajustam `timeScale = velocidadeAtual / velocidadeNativaDoClipe` para o pé não
  "escorregar" (a velocidade nativa de cada clipe fica no manifesto, medida uma vez).

### 3.3 Máquina de estados

```
            setActive(id)                 moveUnit(path)
   Idle ─────────────────▶ Alert ─────────────────────▶ Locomotion ──chegou──▶ Alert
    ▲  ◀─────────────────    │                            (walk|run|hop)
    │   setActive(outro)     │ ação (interact/use_tool)
    │                        ▼
    │                     Action ──finished──▶ (estado anterior)
    │
   Hit ──finished──▶ (anterior)          KO ──get_up──▶ Idle
```

Estados pequenos e explícitos (`'idle' | 'alert' | 'locomotion' | 'action' | 'hit' | 'ko'`); `hit` e
`ko` podem interromper qualquer estado, `locomotion` só sai por fim de caminho ou `ko`.

---

## 4. Movimento no tabuleiro

### 4.1 Do caminho à trajetória

`pathTo` devolve os hexágonos **sem a origem**. O `MovementController` monta os pontos
`[origem, ...path]` em coordenadas de mundo (`hexToWorld`, `HEX_SIZE`).

- **Recomendação: curva Catmull-Rom centrípeta** (`THREE.CatmullRomCurve3(points, false,
  'centripetal')`) percorrida por **comprimento de arco** (`getPointAt(u)`), com velocidade
  constante. Fica orgânico e evita o "para-e-anda" do `hopTo` atual.
- Por que é seguro: um caminho mínimo em grade hexagonal nunca faz curva de 120° (se fizesse, havia
  atalho), só segue reto ou vira 60°. A centrípeta não faz laço e o "corte de canto" é pequeno, fica
  dentro dos hexágonos do caminho — não atravessa hex bloqueado.
- **Segmentos retos** ficam como modo alternativo (`style: 'hop'`): mantém o pulinho por hex que já
  existe, bom para leitura tática, fauna pequena e `prefers-reduced-motion`.
- Melhoria relacionada (fora deste doc): desempate no BFS de `reachableHexes` preferindo vizinhos
  na linha de `hexLine`, para evitar zigue-zagues entre caminhos de mesmo custo.

### 4.2 Velocidade e duração

- Unidade de design: **hexágonos por segundo**. `walk` ≈ **1,6 hex/s**, `run` ≈ **2,6 hex/s**
  (1 hex = √3 ≈ 1,73 unidades). Caminhos de 1–2 hex usam `walk`; ≥ 3 usam `run`.
- O máximo de movimento é 8 (2d4) → ~3 s correndo. Aceleração/desaceleração em ~0,15 s nas pontas
  (velocidade em rampa, não easing por hex).
- `prefers-reduced-motion` (já detectado em `GameScreen`): passar `speedScale: 3` ou `style: 'hop'`
  curto; a tela não precisa saber.

### 4.3 Rotação

- Só yaw. Alvo = `atan2(tangente.x, tangente.z)` da curva no ponto atual (olhar um pouco à frente,
  `u + 0.05`, deixa a virada antecipada e natural).
- Suavização: `quaternion.slerp(alvo, 1 - exp(-dt * 12))` — o mesmo estilo de amortecimento
  exponencial que o `loop` já usa para câmera e hexágonos.
- Se a primeira direção difere > 90° da atual: virar no lugar antes (clipe `turn_l/r` ou giro de
  0,2 s) e só então acelerar.
- Ao parar: manter a última direção (não voltar a olhar para a câmera). O giro contínuo de quem
  está na vez (`rotation.y += dt * 0.8`) sai; o destaque passa a ser `idle_alert` + anel amarelo.

### 4.4 Altura e terreno

- Hoje os hexágonos sobem/descem visualmente (caminho flutua 0,1, destino 0,2, com onda). O
  personagem deve **pisar no topo do hex sob ele**: `y = alturaDoHex(worldToHex(x, z))`, lida de
  `tile.mesh.position.y`, interpolada entre o hex atual e o próximo pela fração do segmento.
- Quando houver elevação real por hex (morro, barranco, margem de rio), o mapa ganha
  `height: number` por hex. Regra: |Δh| ≤ 0,25 → rampa suave na curva; > 0,25 → arco parabólico
  com `step_up`/`step_down` (ou `hop`) naquele segmento. Diferença acima do limite da regra de jogo
  vira bloqueio no `reachableHexes`, não problema de animação.
- O efeito "o hex pousa quando a peça passa" (`this.path.shift()` em `moveUnit`) continua: o
  controller emite `onEnterHex(hex)` quando cruza a meia-distância entre dois centros.

### 4.5 Pés, root motion, câmera e entrada

- **Animações in-place** (sem root motion). O código é dono da posição; o clipe só anima o corpo.
  Root motion casaria mal com caminhos discretos de hex, com o ajuste de `timeScale` e com clipes de
  fontes diferentes. Exportar com a translação horizontal de `root`/`pelvis` zerada.
- **Pés**: topos de hex são planos, então **sem IK na v1**; o deslizamento é controlado pelo
  `timeScale` (§3.2). IK de dois ossos (`CCDIKSolver` dos exemplos do Three) só se surgirem rampas
  reais, e apenas no `idle`.
- **Câmera**: em vez de `camGoal.copy(destinoDoHop)` a cada hex, o controller atualiza `camGoal`
  para a posição do personagem **mais um pequeno avanço na direção da tangente** (~0,6 unidade) a
  cada frame; o amortecimento de `updateCamera` já suaviza. Arrastar a câmera durante a caminhada
  continua permitido (só toque de seleção é bloqueado).
- **Entrada**: mantém-se o contrato atual — `HexBoard.moving` = `true` durante o movimento
  (`handleTap` já ignora toques), a tela está em `phase = 'walking'` e só sai disso quando a
  Promise de `moveUnit` resolve. Nada muda em `GameScreen`.

### 4.6 Sketches de interface (não implementar ainda)

```ts
// src/app/game/assets.ts — manifesto
export type RigFamily = 'humanoid' | 'quadruped' | 'bird' | 'reptile' | 'rigid';
export type ClipName =
  | 'idle' | 'idle_alert' | 'walk' | 'run' | 'turn_l' | 'turn_r' | 'hop'
  | 'step_up' | 'step_down' | 'interact' | 'use_tool' | 'hit' | 'ko' | 'get_up' | 'celebrate';

export interface ModelDef {
  url: string;                                 // 'assets/characters/ana/ana.glb'
  family: RigFamily;
  /** GLB extra com os clipes (humanoides); ausente = clipes embutidos no próprio modelo. */
  clipLibrary?: string;                        // 'assets/anims/humanoid-base.glb'
  /** Nome na fonte → nome canônico. */
  clipMap: Partial<Record<ClipName, string>>;
  /** Velocidade nativa (unidades/s) dos clipes de locomoção, para casar o timeScale. */
  clipSpeed?: Partial<Record<'walk' | 'run', number>>;
  heightInUnits: number;                       // altura final no tabuleiro (ex.: 1.15)
  sockets?: Partial<Record<SocketName, { bone: string; offset?: [number, number, number] }>>;
  tint?: string[];                             // nomes de materiais que recebem Character.color
}
export type SocketName = 'hand_r' | 'hand_l' | 'head' | 'back';

// maps.ts — Character ganha só uma referência opcional (placeholder continua funcionando)
// export interface Character { ...; model?: string; }   // chave em MODELS

export interface AssetLibrary {
  load(def: ModelDef): Promise<CharacterRig>;   // cache por URL + SkeletonUtils.clone
  loadProp(url: string): Promise<THREE.Object3D>;
  dispose(): void;
}
```

```ts
// src/app/game/character-rig.ts
export interface PlayOptions { fade?: number; loop?: boolean; timeScale?: number; then?: ClipName }

export interface CharacterRig {
  readonly root: THREE.Group;                   // o que entra no lugar de UnitView.group
  readonly family: RigFamily;
  readonly mixer: THREE.AnimationMixer | null;  // null para 'rigid' sem clipes
  has(clip: ClipName): boolean;
  play(clip: ClipName, opts?: PlayOptions): void;
  /** Para locomoção: ajusta timeScale/rodas/rotores pela velocidade real (unidades/s). */
  setLocomotionSpeed(speed: number): void;
  attach(socket: SocketName, prop: THREE.Object3D | null): void;
  update(dt: number): void;
  dispose(): void;
}
```

```ts
// src/app/game/movement.ts
export interface MoveOptions {
  style?: 'curve' | 'hop';                      // padrão 'curve'
  speedScale?: number;                          // reduced motion, acelerar IA
  onEnterHex?(hex: HexCoord, index: number): void;
}

export interface MovementController {
  readonly active: boolean;
  /** Origem + caminho de pathTo (sem a origem). Resolve ao parar no último hex. */
  start(rig: CharacterRig, from: HexCoord, path: HexCoord[], opts?: MoveOptions): Promise<void>;
  /** Chamado pelo loop do HexBoard; devolve a posição para a câmera seguir. */
  update(dt: number): THREE.Vector3 | null;
  cancel(): void;                               // ex.: dispose no meio do caminho
}

/** Fornecido pelo HexBoard: altura atual do topo do hex (inclui a flutuação do caminho). */
export type GroundHeight = (hex: HexCoord) => number;
```

Integração em `HexBoard` (resumo): `UnitView` ganha `rig?: CharacterRig`; `buildUnit` cria o
placeholder e dispara `assets.load(...)` para trocá-lo; `moveUnit` passa a delegar para
`movement.start(...)` (mantendo `moving`, `selected`, `path` e `paintTiles` como hoje, via
`onEnterHex`); `loop` chama `rig.update(dt)` e `movement.update(dt)` e só aplica
flutuação/giro em unidades **sem** rig.

---

## 5. Roteiro em fases

1. **Um GLB no lugar de uma peça.** Baixar um humanoide CC0 da Quaternius já no esqueleto UAL,
   colocar em `public/assets/characters/ana/`, registrar em `LICENSES.md`. `GLTFLoader` +
   `SkeletonUtils.clone`, escala normalizada, só `idle` tocando. Bruno e Clara seguem como peças.
2. **Biblioteca de clipes + máquina de estados.** `anims/humanoid-base.glb` com o conjunto mínimo,
   `CharacterRig` com `idle`/`idle_alert`/`walk`/`run`, crossfades. Personagem da vez sai do giro.
3. **MovementController.** Catmull-Rom por arco, rotação com slerp, `timeScale` casado, câmera
   seguindo, `onEnterHex` mantendo o efeito dos hexágonos. `moveUnit` mantém a assinatura.
   Modo `hop` como fallback e para `prefers-reduced-motion`.
4. **Pipeline e orçamentos.** Script `npm run assets` com gltf-transform (meshopt + webp), paleta
   compartilhada, checagem automática de ossos/triângulos/nomes obrigatórios (falha no CI).
5. **Três agentes + sockets.** Ana/Bruno/Clara com modelos e cores do time, chapéu e rádio via
   sockets, `interact`/`hit`/`celebrate` ligados a eventos de jogo (quando existirem).
6. **Fauna e veículos.** Uma onça (`quadruped`, clipes embutidos) e um caminhão madeireiro
   (`rigid`, rodas procedurais) no mapa do Hangar, usando a mesma máquina de estados.
7. **Terreno com altura.** `height` por hex no `GameMap`, `step_up/step_down`, regra de desnível
   no `reachableHexes`.

---

## 6. Perguntas em aberto

- **Escala**: 1,15 unidade de altura para humanos lê bem com a câmera atual? Fauna grande (onça,
  anta) e veículos ocupam 1 hex ou precisamos de unidades multi-hex (afeta `reachableHexes` e
  `blocked`)?
- **Curva ou pulinho como padrão?** O pulinho por hex é mais "tabuleiro" e legível para contar
  casas; a curva é mais "For The King 2". Sugestão: curva para humanos, pulinho opcional nas
  configurações.
- **Mixamo**: aceitamos usar só localmente, ou proibimos para não arriscar commit acidental num repo
  aberto? (Proposta: proibido em `public/`; CI checa prefixo `mixamorig`.)
- **Arquivos fonte**: `.blend` no repo com Git LFS, num repo separado de arte, ou só os GLBs?
- **Estilo de material**: `MeshStandardMaterial` como hoje ou toon + contorno (mais "chunky", custa
  um passe a mais no celular)?
- **Movimento parcial**: hoje dá para gastar o movimento em vários trechos no mesmo turno — a
  animação de parada/arranque entre trechos deve ser curta (alert) ou contínua?
- **Diversidade e identidade**: os agentes devem usar uniforme/identidade visual do Ibama? Há
  restrições de uso da marca num projeto aberto? E representatividade (tons de pele, corpos) — os
  packs CC0 cobrem pouco; vale priorizar o primeiro modelo próprio aí.
- **Orçamento de download**: limite total de assets para o primeiro carregamento no celular (ex.:
  < 5 MB antes do primeiro turno)?
