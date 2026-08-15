// Registre des personnages. Pour ajouter un perso : une palette, ses lignes de sprite,
// puis une entrée dans CHARS + son id dans ROSTER. `ult` pointe vers une clé de data/specials.js.
export function buildSprite(rows, pal) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.') { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
}

// K : le noir du bandeau, de la veste et des sandales — un vrai noir, pas un bleu marine.
// P : l'orange du pantalon, volontairement plus terne que le O de la veste pour
//     que les deux se distinguent. w : les moustaches.
const PAL_N = { H: '#ffd23e', h: '#e2a71c', M: '#d9dfe8', S: '#f8c890', s: '#d99a63', w: '#c08050', E: '#173e8f', O: '#ff8c1a', o: '#d96b08', W: '#f2f2f5', K: '#1e1e24', P: '#e5730f' };
// K : le gilet pare-balles, la ceinture et les rangers. V : les manches gris clair
// et la boucle. W : le marquage R.P.D., découpé en 3 points pour lire 3 lettres.
// J est un bleu volontairement un peu clair : sans ça Leon devient une masse noire
// sur le fond spatial déjà sombre.
const PAL_L = { L: '#7a4f2c', l: '#4e2f18', S: '#f0c090', s: '#cf9660', E: '#2c2a26', J: '#42537d', j: '#26314d', V: '#b3bac6', B: '#e8b83a', W: '#eef1f6', D: '#2f3b59', K: '#1b1f2a' };
// Pas de contour noir : il dénaturait le jeu et rendait Isaac étranger aux deux
// autres persos. À la place, deux tons de peau foncée — 'a' pour tout le pourtour,
// 'b' réservé aux creux d'ombre (sous le cou, aisselles, entre les jambes).
// Le noir ne sert plus qu'aux yeux (E) et à la bouche (K) : sans eux, un visage
// sans cheveux ni vêtements n'a plus aucun trait. T : les larmes, permanentes.
const PAL_I = { S: '#f2cfcb', a: '#e2b8b4', b: '#c08c88', E: '#151013', T: '#8fd8e8', W: '#ffffff', K: '#151013' };

// Tête partagée par les 4 poses : tignasse en pics (sa signature), bandeau noir
// à plaque, moustaches d'1 px par joue.
// Les yeux sont volontairement décalés d'un pixel à droite du centre de la tête :
// sans ça le visage regarde à gauche en permanence et le miroir horizontal
// (render.js, p.face) ne se lit pas. Sprite naturel = tourné vers la droite.
const N_HEAD = ["...hH.HH.Hh.....", "..HHHHHHHHHH....", ".hHHHHHHHHHHh...", "..hHHHHHHHHh....", "..KKKKKKKKKK....", "..KKMMMMMMKK....", "..SSSSSSSSSS....", "..SSSESSSSES....", "..swSSSSSSws....", "...SSSSSSSS....."];
// Veste Shippuden : col et épaules noirs, fermeture éclair noire au centre,
// bande noire au-dessus de la ceinture, puis pantalon orange à bande blanche
// (jambe gauche) et sandales noires.
const N_IDLE_B = ["....KKKKKK......", "..KKKKKKKKKK....", ".SKKKKKKKKKKS...", ".SOOOOKKOOOOS...", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..KKK....KKK...."];
const N_RUN1_B = ["....KKKKKK......", "..KKKKKKKKKK....", ".SKKKKKKKKKK....", "...OOOKKOOOOS...", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "..PP......PP....", ".WW........PP...", ".PP........PP...", "KKK........KKK.."];
const N_RUN2_B = ["....KKKKKK......", "..KKKKKKKKKK....", "...KKKKKKKKKS...", ".SKOOOKKOOOO....", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..KKK....KKK...."];
const N_THROW_B = ["....KKKKKK......", "..KKKKKKKKKK....", "..KKKKKKKKKKSS..", "..OOOOKKOOOOSS..", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "..PP.....PP.....", "..WW......PP....", ".PPP......PPP...", ".KKK......KKK..."];

// Tête partagée : coupe à raie au milieu, les cheveux encadrent le visage des deux côtés.
// Yeux décalés d'un pixel à droite, même raison que pour Naruto : c'est ce qui
// rend le miroir horizontal lisible quand il se tourne vers la souris.
const L_HEAD = ["....lLLLLl......", "...LLLLLLLL.....", "..LLLLLLLLLL....", "..LLLLllLLLL....", "..LLSSSSSSLL....", "..LSSSSSSSSL....", "..SSSESSSSES....", "..SSSSSSSSSS....", "...SSSSSSSS.....", "....JJJJJJ......"];
// Gilet pare-balles noir montant jusqu'aux épaules, R.P.D. en 3 points, ceinture
// dégagée sous le gilet, protège-genoux à la largeur de la jambe (sans déborder).
const L_IDLE_B = ["..KKKKKKKKKB....", ".VKKKKKKKKKKV...", ".VKKWKWKWKKKV...", ".SKKKKKKKKKKS...", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "...DD....DD.....", "...KK....KK.....", "...DD....DD.....", "..KKK....KKK...."];
const L_RUN1_B = ["..KKKKKKKKKB....", ".VKKKKKKKKKK....", "...KWKWKWKKKV...", "..KKKKKKKKKKS...", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "..DD......DD....", "..KK......KK....", ".DD........DD...", "KKK........KKK.."];
const L_RUN2_B = ["..KKKKKKKKKB....", "...KKKKKKKKKV...", ".VKKWKWKWKKK....", "..KKKKKKKKKKS...", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "...DD....DD.....", "...KK....KK.....", "...DD....DD.....", "..KKK....KKK...."];
const L_THROW_B = ["..KKKKKKKKKB....", "..KKKKKKKKKKVV..", "..KKWKWKWKKKVV..", "..KKKKKKKKKK....", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "..DD.....DD.....", "..KK.....KK.....", ".DDD......DDD...", ".KKK......KKK..."];

// Grosse tête ronde entièrement cernée de noir, yeux à reflet blanc, larmes permanentes.
// Isaac sert de gabarit de référence pour tout nouveau perso : tête sur 10 lignes,
// corps sur 10 lignes, largeur maximale 12 px (colonnes 1 à 12), bras jusqu'aux
// colonnes 1 et 12, jambes aux colonnes 3-4 et 9-10 — comme Naruto et Leon.
const I_HEAD = ["....aaaaaa......", "..aaSSSSSSaa....", ".aSSSSSSSSSSa...", ".aSSSSSSSSSSa...", ".aSSSSSSSSSSa...", ".aSSWESSSWESa...", ".aSSEESSSEESa...", ".aSSTSKKSTSSa...", "..aSTSSSSTSa....", "...bbbbbbbb....."];
// Les 'b' ne marquent que les trois creux d'ombre : haut du torse (sous le cou),
// aisselles et entrejambe. La dernière ligne perd ses pixels de coin pour arrondir
// les pieds, qui formaient sinon deux blocs carrés bien plus lourds que ceux des autres.
const I_IDLE_B = ["....bbbbbb......", "..aaSSSSSSaa....", ".aSSSSSSSSSSa...", ".aSSSSSSSSSSa...", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "...aa....aa....."];
const I_RUN1_B = ["....bbbbbb......", "..aaSSSSSSaa....", ".aSSSSSSSSSa....", "..aSSSSSSSSSa...", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", ".aSSb....bSSa...", ".aSSb....bSSa...", "..aa......aa...."];
const I_RUN2_B = ["....bbbbbb......", "..aaSSSSSSaa....", "..aSSSSSSSSSa...", ".aSSSSSSSSSa....", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "...aa....aa....."];
const I_THROW_B = ["....bbbbbb......", "..aaSSSSSSaa....", ".aSSSSSSSSSSaa..", ".aSSSSSSSSSSaa..", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "...aa....aa....."];

export const ROSTER = ['naruto', 'isaac', 'leon'];

export const CHARS = {
  naruto: {
    name: 'NARUTO UZUMAKI', short: 'NARUTO', icon: '🍥', universe: 'KONOHA',
    speed: 352, power: .95, catchR: 27, chargeT: .72,
    color: '#ff8c1a', accent: '#ffd23e',
    stats: { spd: 5, pow: 3, ctl: 4 },
    ult: 'kurama',
    frames: {
      idle: buildSprite([...N_HEAD, ...N_IDLE_B], PAL_N),
      run1: buildSprite([...N_HEAD, ...N_RUN1_B], PAL_N),
      run2: buildSprite([...N_HEAD, ...N_RUN2_B], PAL_N),
      throw: buildSprite([...N_HEAD, ...N_THROW_B], PAL_N)
    }
  },
  isaac: {
    name: 'ISAAC', short: 'ISAAC', icon: '💧', universe: 'LE SOUS-SOL',
    speed: 330, power: .88, catchR: 30, chargeT: .8,
    color: '#7fd8ff', accent: '#bfe9ff',
    stats: { spd: 4, pow: 2, ctl: 5 },
    ult: 'leg',
    frames: {
      idle: buildSprite([...I_HEAD, ...I_IDLE_B], PAL_I),
      run1: buildSprite([...I_HEAD, ...I_RUN1_B], PAL_I),
      run2: buildSprite([...I_HEAD, ...I_RUN2_B], PAL_I),
      throw: buildSprite([...I_HEAD, ...I_THROW_B], PAL_I)
    }
  },
  leon: {
    name: 'LEON S. KENNEDY', short: 'LEON', icon: '🚔', universe: 'RACCOON CITY',
    speed: 306, power: 1.18, catchR: 31, chargeT: 1.0,
    color: '#3f8fe0', accent: '#9fe8ff',
    stats: { spd: 3, pow: 5, ctl: 4 },
    ult: 'matilda',
    frames: {
      idle: buildSprite([...L_HEAD, ...L_IDLE_B], PAL_L),
      run1: buildSprite([...L_HEAD, ...L_RUN1_B], PAL_L),
      run2: buildSprite([...L_HEAD, ...L_RUN2_B], PAL_L),
      throw: buildSprite([...L_HEAD, ...L_THROW_B], PAL_L)
    }
  }
};

export function portraitURL(ck) {
  const f = CHARS[ck].frames.idle;
  const c = document.createElement('canvas');
  c.width = f.width * 6; c.height = f.height * 6;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(f, 0, 0, c.width, c.height);
  return c.toDataURL();
}
