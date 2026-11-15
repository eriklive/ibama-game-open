// Elenco: quem é cada personagem e o que veste. O build (build-assets.mjs) lê esta lista.
//
// body:    'Female' | 'Male' (corpos Superhero_* dos Universal Base Characters)
// skin:    tom de pele (a textura base é repintada neste tom)
// hair:    penteados do pacote + cor (a textura deles é neutra)
// outfit:  camadas pintadas no corpo (ver lib/bake.mjs)
// gear:    acessórios gerados por código (ver lib/gear.mjs)
// kit:     equipamento com volume (colete, joelheiras, luvas, botas...), aplicado por refit.mjs
//          sobre a saída do build (ver lib/kit.mjs)

// Estilo do elenco todo. `proportions`: 'none' | 'sutil' | 'chibi' (lib/proportions.mjs);
// um personagem pode ter o seu próprio `proportions`.
// `contactShadow`: sombra de contato gravada nas cores (lib/ao.mjs).
export const STYLE = { proportions: 'chibi', contactShadow: false };

// uniforme de campo do Ibama: verde-oliva, colete com o nome em amarelo
const OLIVE = '#7d8856';
const OLIVE_DARK = '#525c3c';
const BLACK_VEST = { color: '#1a1c1e', text: 'IBAMA', textColor: '#f5c400' };
const BOOTS = { color: '#2a2422' };

// kit tático dos agentes de campo: colete de placas preto com IBAMA amarelo nas costas
const AGENT_KIT = ({ holster = true, gloves = '#1f2124' } = {}) => [
  // placas grafite, bolsos um tom acima: preto puro some de cima e vira uma mancha só
  ['plateCarrier', { color: '#2a2e33', webbing: '#1a1c1f', textColor: '#f5c400', pouchColor: '#3d434a' }],
  ['radio'],
  ['belt', { pouchCount: 2 }],
  ['kneePads', { color: '#23262a' }],
  ['boots', { color: '#24201e', sole: '#121110' }],
  ['gloves', { color: gloves }],
  ...(holster ? [['holster']] : []),
  ['cargoPockets', { color: OLIVE_DARK, sides: holster ? ['l'] : ['l', 'r'] }],
  ['flagPatch'],
];

export const CHARACTERS = [
  // ------------------------------- agentes -------------------------------
  {
    id: 'ana',
    body: 'Female',
    skin: '#b9825f',
    hair: { styles: ['Hair_Buns'], color: '#3a2416' },
    outfit: {
      pants: { color: OLIVE_DARK, cargo: true },
      boots: BOOTS,
      shirt: { color: OLIVE, sleeve: 0.56 },
      belt: '#1c1c1c',
      vest: BLACK_VEST,
    },
    gear: [],
    kit: AGENT_KIT(),
  },
  {
    id: 'bruno',
    body: 'Male',
    skin: '#6a4631',
    hair: { styles: ['Hair_Buzzed', 'Hair_Beard'], color: '#17120f' },
    outfit: {
      pants: { color: OLIVE_DARK, cargo: true },
      boots: BOOTS,
      shirt: { color: OLIVE, sleeve: 0.3 },
      belt: '#1c1c1c',
      vest: BLACK_VEST,
    },
    gear: [['cap', { color: '#2b3622', patch: '#f5c400' }]],
    kit: AGENT_KIT({ holster: false }),
  },
  {
    id: 'clara',
    body: 'Female',
    skin: '#dcaa86',
    hair: { styles: ['Hair_Long'], color: '#8a4a22' },
    outfit: {
      pants: { color: OLIVE_DARK, cargo: true },
      boots: { color: '#5a4026' },
      shirt: { color: OLIVE, sleeve: 0.95 },
      belt: '#3a2a1a',
      // colete cáqui de analista, com o nome escuro
      vest: { color: '#a89a6c', text: 'IBAMA', textColor: '#1f2a16' },
    },
    gear: [['hat', { color: '#7b7750', band: '#3a4028', brim: 0.075, drop: 0.022, crown: 0.012, flat: 0.82 }]],
    // analista: colete de campo leve, mochila, sem luvas
    kit: [
      ['plateCarrier', { style: 'vest', color: '#a89a6c', textColor: '#1f2a16', pouchColor: '#9a8c5e', pouches: 2 }],
      ['radio', { side: 'r' }],
      ['belt', { color: '#3a2a1a', pouches: '#6b5a3a', pouchCount: 1 }],
      ['backpack', { color: '#3f4c30' }],
      ['boots', { color: '#5a4026', sole: '#2a1d12', cuff: '#6b4c2e' }],
      ['cargoPockets', { color: OLIVE_DARK }],
      ['flagPatch'],
    ],
  },
  {
    id: 'kaua',
    body: 'Male',
    skin: '#a56b47',
    hair: { styles: ['Hair_Long'], color: '#0e0c0b' },
    outfit: {
      pants: { color: OLIVE_DARK, cargo: true },
      boots: BOOTS,
      shirt: { color: OLIVE, sleeve: 0.3 },
      belt: '#1c1c1c',
      vest: BLACK_VEST,
      // urucum no rosto e braçadeira trançada
      facePaint: { color: '#b3261a' },
      armband: { color: '#d9c7a0', accent: '#b3261a', at: 0.46 },
    },
    gear: [['necklace', { colors: ['#c8281e', '#f4efe2', '#1a1a1a', '#f4efe2', '#e0a81c', '#f4efe2'] }]],
    kit: AGENT_KIT({ gloves: '#2a2620' }),
  },

  // ------------------------------- inimigos -------------------------------
  {
    id: 'garimpeiro',
    body: 'Male',
    skin: '#8c5c3e',
    hair: { styles: ['Hair_Buzzed'], color: '#15110e' },
    outfit: {
      pants: { color: '#3d4a5c', short: 0.02 },
      boots: { color: '#23211f', top: 0.43 },
      shirt: { color: '#e4decb', tank: true, dirt: '#9a7a52', untucked: true },
      mud: { color: '#7d5f3e', top: 0.7 },
    },
    gear: [['hat', { color: '#d8b968', band: '#5a3a22', brim: 0.13, drop: 0.012, crown: 0.045, flat: 0.72 }], ['bateia']],
    // galochas de borracha
    kit: [['boots', { color: '#23211f', sole: '#111', top: 0.43, cuff: '#2e2b28', laces: false }]],
  },
  {
    // segundo garimpeiro: o da pá. Manga longa contra o sol, lenço no pescoço, galocha amarela.
    // Criado no refit a partir do molde do caçador (TEMPLATES): a roupa nova cobre a antiga.
    id: 'garimpeiro-pa',
    from: 'cacador',
    body: 'Male',
    skin: '#a8714c',
    hair: { styles: ['Hair_Buzzed', 'Hair_Beard'], color: '#2a1d14' },
    outfit: {
      pants: { color: '#5d574a' },
      boots: { color: '#d9a520', top: 0.42 },
      shirt: { color: '#3f6f8f', sleeve: 1.0, untucked: true, dirt: '#8a6a44' },
      mud: { color: '#7d5f3e', top: 0.62, strength: 0.85 },
    },
    gear: [['cap', { color: '#e07a1f' }]],
    kit: [
      ['boots', { color: '#d9a520', sole: '#3a2e10', top: 0.42, cuff: '#e6b434', laces: false }],
      ['bandana', { color: '#b8322a' }],
      ['shovel'],
      ['cargoPockets', { color: '#4e493d' }],
    ],
  },
  {
    // piloto do avião do garimpo: camisa clara de botão, dragonas, óculos de aviador, headset
    // no pescoço, luvas de couro. Molde: madeireiro (a camisa nova cobre a xadrez).
    id: 'piloto',
    from: 'madeireiro',
    body: 'Male',
    skin: '#d9a882',
    hair: { styles: ['Hair_SimpleParted', 'Hair_Beard'], color: '#3b2a1c' },
    outfit: {
      pants: { color: '#2b3448' },
      boots: { color: '#141414', top: 0.13 },
      shirt: { color: '#dfe6ea', sleeve: 0.6, buttons: true },
      belt: '#151515',
      gloves: '#5a3c26',
    },
    gear: [['cap', { color: '#1f2a44', patch: '#d4a017' }]],
    kit: [
      ['aviators'],
      ['headset'],
      ['epaulets', { color: '#1f2a44', stripe: '#d4a017' }],
      ['shirtPocket', { color: '#d3dbe0' }],
      ['belt', { color: '#151515', buckle: '#c9a54a', pouchCount: 0 }],
      ['gloves', { color: '#5a3c26', cuff: '#4a3020', knuckles: false }],
      ['boots', { color: '#161616', sole: '#0c0c0c', top: 0.13, cuff: '#222', laces: false }],
    ],
  },
];

// Moldes: bases que não entram no jogo (ficam em tools/assets/base/characters/<id>), mas servem de
// ponto de partida para personagens novos sem os pacotes da Quaternius (campo `from`). O refit
// precisa saber com que pele e figurino o molde foi pintado, para trocar a pele e cobrir a
// roupa antiga.
export const TEMPLATES = Object.fromEntries([
  {
    id: 'madeireiro',
    body: 'Male',
    skin: '#c48f6c',
    hair: { styles: ['Hair_SimpleParted', 'Hair_Beard'], color: '#4a2e1a' },
    outfit: {
      pants: { color: '#34486a', fade: '#7f95b5' },
      boots: { color: '#6a4424' },
      shirt: { color: '#a52f27', pattern: 'plaid', plaid: '#1d1414', sleeve: 0.56, untucked: true, buttons: true },
      gloves: '#b08a4a',
    },
    gear: [['hardHat', { color: '#e9b216' }], ['chainsaw']],
    kit: [
      ['earMuffs', { color: '#d6411c' }],
      ['gloves', { color: '#b08a4a', knuckles: false, cuff: '#8a6a34' }],
      ['boots', { color: '#6a4424', sole: '#2a1a10', cuff: '#7a5230', laces: true }],
      ['belt', { color: '#3a2a1a', buckle: '#b8a070', pouchCount: 0 }],
    ],
  },
  {
    id: 'cacador',
    body: 'Male',
    skin: '#d4a281',
    hair: { styles: ['Hair_Buzzed', 'Hair_Beard'], color: '#6b5236' },
    outfit: {
      pants: { color: '#4d5a36', pattern: 'camo' },
      boots: { color: '#4a3220' },
      shirt: { color: '#4d5a36', pattern: 'camo', sleeve: 0.95 },
      belt: '#3a2a1a',
      sling: { color: '#5a3e24' },
    },
    gear: [['cap', { color: '#3c4829' }], ['shotgun']],
    kit: [
      ['bandolier'],
      ['belt', { color: '#3a2a1a', buckle: '#8a7a5a', pouches: '#4a3a24', pouchCount: 2 }],
      ['boots', { color: '#4a3220', sole: '#1e140c', cuff: '#5a3e28' }],
      ['cargoPockets', { color: '#4d5a36' }],
    ],
  },
].map((t) => [t.id, t]));
