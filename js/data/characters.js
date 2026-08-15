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
const PAL_L = { L: '#6f4526', l: '#4e2f18', S: '#f0c090', s: '#cf9660', E: '#2c2a26', J: '#2e3c5c', j: '#202b44', V: '#9aa2ad', B: '#e8b83a', W: '#e8ecf2', D: '#222c44', K: '#171c2c' };
const PAL_I = { S: '#f7ddc0', s: '#d9b58d', E: '#14100c', T: '#7fd8ff' };

// Tête partagée par les 4 poses : tignasse en pics (sa signature), bandeau noir
// à plaque, moustaches d'1 px par joue.
const N_HEAD = ["...hH.HH.Hh.....", "..HHHHHHHHHH....", ".hHHHHHHHHHHh...", "..hHHHHHHHHh....", "..KKKKKKKKKK....", "..KKMMMMMMKK....", "..SSSSSSSSSS....", "..SESSSSESS.....", "..swSSSSSSws....", "...SSSSSSSS....."];
// Veste Shippuden : col et épaules noirs, fermeture éclair noire au centre,
// bande noire au-dessus de la ceinture, puis pantalon orange à bande blanche
// (jambe gauche) et sandales noires.
const N_IDLE_B = ["....KKKKKK......", "..KKKKKKKKKK....", ".SKKKKKKKKKKS...", ".SOOOOKKOOOOS...", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..KKK....KKK...."];
const N_RUN1_B = ["....KKKKKK......", "..KKKKKKKKKK....", ".SKKKKKKKKKK....", "...OOOKKOOOOS...", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "..PP......PP....", ".WW........PP...", ".PP........PP...", "KKK........KKK.."];
const N_RUN2_B = ["....KKKKKK......", "..KKKKKKKKKK....", "...KKKKKKKKKS...", ".SKOOOKKOOOO....", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..KKK....KKK...."];
const N_THROW_B = ["....KKKKKK......", "..KKKKKKKKKK....", "..KKKKKKKKKKSS..", "..OOOOKKOOOOSS..", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "..PP.....PP.....", "..WW......PP....", ".PPP......PPP...", ".KKK......KKK..."];

const L_HEAD = ["....lLLLLl......", "...LLLLLLLL.....", "..LLLLLLLLLL....", "..LlSSSSSSlL....", "..LSSSSSSSSL....", "..SSSSSSSSSS....", "..SESSSSESS.....", "..SSSSSSSSSS....", "...SSSSSSSS.....", "....WWWWWW......"];
const L_IDLE_B = ["..JJJJJJJJJJ....", ".SVVVVVVVVVJS...", ".SVVBVVVVVVJS...", ".SVVVVVVVVVJS...", "..JJJJJJJJJJ....", "..jJJJJJJJJj....", "...DD....DD.....", "...DD....DD.....", "..DDD....DDD....", "..KKK....KKK...."];
const L_RUN1_B = ["..JJJJJJJJJJ....", ".SJJJJJJJJJJ....", "...JJJJJJJJJS...", "..JJVVVVVVJJ....", "..jJJJJJJJJj....", "...JJJJJJJJ.....", "..DD......DD....", ".DD........DD...", ".DD........DD...", "KKK........KKK.."];
const L_RUN2_B = ["..JJJJJJJJJJ....", "...JJJJJJJJJS...", ".SJJJJJJJJJJ....", "..JJVVVVVVJJ....", "..jJJJJJJJJj....", "...JJJJJJJJ.....", "...DD....DD.....", "...DD....DD.....", "..DDD....DDD....", "..KKK....KKK...."];
const L_THROW_B = ["..JJJJJJJJJJ....", "..JJJJJJJJJJSS..", "..JJJJJJJJJJSS..", "..JJVVVVVVJJ....", "..jJJJJJJJJj....", "...JJJJJJJJ.....", "..DD.....DD.....", "..DD......DD....", ".DDD......DDD...", ".KKK......KKK..."];

const I_HEAD = ["................", "....SSSSSSSS....", "...SSSSSSSSSS...", "..SSSSSSSSSSSS..", "..SSSSSSSSSSSS..", "..SEESSSSSSEES..", "..SEESSSSSSEES..", "..SSTSSSSSSTSS..", "...SSSssssSSS...", "....SSSSSSSS....", ".....SSSSSS....."];
const I_IDLE_B = [".....SSSSSS.....", "....SSSSSSSS....", "...SSSSSSSSSS...", "..sSSSSSSSSSSs..", "..s.SSSSSSSS.s..", "....SSSSSSSS....", "....SS....SS....", "....SS....SS....", "...ss......ss...", "................"];
const I_RUN1_B = [".....SSSSSS.....", "....SSSSSSSS....", "..sSSSSSSSSSS...", "....SSSSSSSS.s..", "....SSSSSSSS....", "....SSSSSSSS....", "...SS......SS...", "..SS........SS..", "..ss........ss..", "................"];
const I_RUN2_B = [".....SSSSSS.....", "....SSSSSSSS....", "....SSSSSSSSs...", "..s.SSSSSSSS....", "....SSSSSSSS....", "....SSSSSSSS....", "....SS....SS....", "....SS....SS....", "...ss......ss...", "................"];
const I_THROW_B = [".....SSSSSS.....", "....SSSSSSSS....", "...SSSSSSSSSS...", "...SSSSSSSSSSss.", "...SSSSSSSSSSss.", "....SSSSSSSS....", "....SS....SS....", "...SS......SS...", "...ss......ss...", "................"];

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
