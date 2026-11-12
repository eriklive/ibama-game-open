// Elenco: quem é cada personagem e o que veste. O build (build-assets.mjs) lê esta lista.
//
// body:    'Female' | 'Male' (corpos Superhero_* dos Universal Base Characters)
// skin:    tom de pele (a textura base é repintada neste tom)
// hair:    penteados do pacote + cor (a textura deles é neutra)
// outfit:  camadas pintadas no corpo (ver lib/bake.mjs)
// gear:    acessórios gerados por código (ver lib/gear.mjs)

// uniforme de campo do Ibama: verde-oliva, colete com o nome em amarelo
const OLIVE = '#7d8856';
const OLIVE_DARK = '#525c3c';
const BLACK_VEST = { color: '#1a1c1e', text: 'IBAMA', textColor: '#f5c400' };
const BOOTS = { color: '#2a2422' };

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
    gear: [['radio']],
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
    gear: [['cap', { color: '#2b3622', patch: '#f5c400' }], ['radio']],
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
    gear: [['hat', { color: '#7b7750', band: '#3a4028', brim: 0.075, drop: 0.022, crown: 0.012, flat: 0.82 }], ['backpack', { color: '#3f4c30' }]],
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
    gear: [['necklace', { colors: ['#c8281e', '#f4efe2', '#1a1a1a', '#f4efe2', '#e0a81c', '#f4efe2'] }], ['radio']],
  },

  // ------------------------------- inimigos -------------------------------
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
  },
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
  },
];
