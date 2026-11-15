# Direção de arte dos personagens

> Status: **em uso**. A primeira rodada (equipamento com volume) está em `tools/assets/lib/kit.mjs`
> e nos personagens de `public/assets/characters/`. As próximas rodadas estão no fim.

## A ideia em uma frase

**Uma versão cartoon de agentes de campo realistas, que não pareça barata.** As referências de
agentes servem para saber *o que* o personagem veste e carrega. As referências estilizadas servem
para saber *como* desenhar isso. Nunca copiamos uma nem outra: traduzimos.

## As referências

As imagens não ficam no repositório: são obras de terceiros e o repositório é público. Aqui fica
o que cada uma ensina. Quem tiver as imagens pode guardá-las fora do git.

### Agentes (realistas: ler com cuidado)

Pacote comercial **"Modular Tactical Soldier"** (renders em Unreal Engine 5): soldado modular com
capacete, óculos de visão noturna, balaclava, colete de placas, mochila, luvas, joelheiras,
coldre de perna, um fuzil e uma pistola riggados.

O que tiramos dele:

- **Silhueta por camadas.** O personagem lê como "equipado" porque cada peça tem espessura:
  colete sobre a camisa, bolsos sobre o colete, joelheira sobre a calça, cano da bota sobre a
  barra. Nada é só pintado.
- **Vocabulário de equipamento.** Colete de placas com alças largas nos ombros, fileiras de
  MOLLE, porta-carregadores na barriga, rádio no alto do peito, cinto com bolsinhos, coldre
  de perna (drop leg), joelheiras com placa dura, luvas com punho, botas de cano com sola grossa,
  distintivo de bandeira no braço.
- **Valor antes de cor.** Os renders são quase monocromáticos e ainda assim legíveis, porque
  peças vizinhas têm tons diferentes (placa, bolsos e fitas em três cinzas).

O que **não** tiramos:

- **Militarização.** O Ibama é fiscalização ambiental, não tropa de assalto. Nada de balaclava
  de caveira, visão noturna, fuzil na mão nem pose de combate. Arma, quando aparece, é a pistola
  no coldre. A identidade vem do "IBAMA" amarelo, do verde-oliva e da bandeira do Brasil.
- **Realismo de material.** Sem tecido com dobras finas, desgaste fotográfico nem mapas de
  normal: na escala do tabuleiro isso vira ruído.
- **Proporções reais.** O corpo de 8 cabeças fica pequeno e magro visto de cima.

### Estilo (cartoon pintado à mão)

Modelos do Sketchfab (tag `handpainted`):

- **"SuperSushi! - Lowpoly Stylized Food..."**: barco-restaurante em forma de peixe. Formas
  exageradas e curvas, contorno forte, cores saturadas sobre base neutra.
- **"Cut Fish"**: peixe cortado sobre tábua. Luz e sombra pintadas na própria cor, quinas
  realçadas, poucos polígonos bem usados.
- **"Still life, Based on Heathe..."**: natureza-morta (bolo, limões, faca). Pinceladas
  visíveis, gradiente de luz de cima para baixo, contato escuro onde os objetos se tocam.
- **"Zaculeu, The Master Architect"**: busto de guerreiro maia. Prova de que estilizado pode ser
  rico: muitos detalhes, mas agrupados em massas grandes e legíveis, com acabamento metálico
  pintado.

O que tiramos delas:

- **Formas gordinhas e arredondadas.** Quinas chanfradas, bordas acolchoadas, volumes
  exagerados (bota maior, joelheira mais gorda, colete mais espesso que na vida real).
- **Luz pintada na cor.** Cada peça clareia no topo, escurece na base, e as quinas ganham um
  brilho de desgaste. Isso funciona mesmo com a iluminação simples do tabuleiro.
- **Detalhe agrupado.** Poucos elementos, cada um grande o bastante para ser lido de cima:
  melhor três bolsos claros do que dez costuras.

## Regras práticas

1. **Volume, não pintura.** Se a peça tem espessura na vida real (colete, bolso, joelheira, bota,
   luva), ela é geometria. A textura pintada fica para o que é plano (camisa, calça, padrão).
2. **Leitura de cima.** A câmera do jogo olha de cima e de longe. Ombros, cabeça e costas são a
   vitrine: alças largas, nome nas costas, bandeira no alto do braço, chapéu e boné bem visíveis.
3. **Três tons por grupo.** Placa, bolsos e fitas em três valores do mesmo tom. Preto puro vira
   mancha: o colete é grafite (`#2a2e33`), os bolsos um tom acima.
4. **Quina brilha, base escurece.** Toda peça passa por `Kit.paint` (gradiente vertical e
   realce somado nas quinas, que aparece até em peça preta).
5. **Exagero de miniatura.** Pés, mãos e equipamento um pouco maiores que o real; detalhes
   finos (antena, cabo do PTT, cadarço) só se forem grossos o bastante para sobreviver de cima.
6. **Cada personagem com uma marca.** Ana: coque e coldre. Bruno: boné com distintivo. Clara:
   chapéu, colete cáqui e mochila. Kauã: urucum e colar. Inimigos com cor de ofício e uma cor de cabeça
   própria, para distinguir de cima: garimpeiro da bateia (chapéu de palha, regata, galocha
   preta), garimpeiro da pá (boné laranja, manga longa azul, lenço, galocha amarela) e piloto
   (boné azul-marinho, camisa clara com dragonas, óculos de aviador, headset).
7. **Orçamento.** Até ~35 mil triângulos por personagem e um draw call para todo o equipamento
   (`KIT_DEBUG=1 node refit.mjs` mostra o custo de cada peça).

## Onde isso está no código

| Da referência | Peça | Onde |
|---|---|---|
| Colete de placas, MOLLE, porta-carregadores, nome nas costas | `plateCarrier` | `tools/assets/lib/kit.mjs` |
| Colete de campo leve (analista) | `plateCarrier` com `style: 'vest'` | idem |
| Rádio no peito com antena e PTT | `radio` | idem |
| Cinto com bolsinhos | `belt` | idem |
| Joelheiras com placa dura | `kneePads` | idem |
| Botas de cano, sola grossa | `boots` | idem |
| Luvas com punho | `gloves` | idem |
| Coldre de perna com pistola | `holster` | idem |
| Bolsos cargo | `cargoPockets` | idem |
| Distintivo de bandeira no braço | `flagPatch` (Brasil) | idem |
| Mochila | `backpack` | idem |
| Luz pintada à mão | `Kit.paint` | idem |
| Calça sem músculo aparente | `relaxLegs` | idem |

Quem usa o quê fica em `kit`, em `tools/assets/characters.mjs`. O passo a passo para gerar os
modelos está em `tools/assets/README.md`.

## Próximas rodadas

1. **Proporções chibi.** O corpo ainda é de super-herói (ombros largos, braços musculosos).
   Cabeça e mãos maiores, tronco mais curto e braços mais finos, deformando ossos e malha no
   refit. É o que mais aproxima das referências estilizadas.
2. **Sombreamento dos personagens.** Luz em degraus suaves e brilho de contorno só nos
   personagens, para que se destaquem do tabuleiro.
3. **Rosto e cabelo.** Sobrancelhas mais marcadas, olhos um pouco maiores, cabelo em mechas
   grossas (como o coque da Ana, mas para todos).
4. **Contato escuro.** Escurecer o equipamento onde encosta no corpo (oclusão por vértice), como
   nas naturezas-mortas pintadas.
