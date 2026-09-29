// ---------------------------------------------------------------------------
// LA SCÈNE COMMUNE aux deux rendus de la Station orbitale HD.
//
// A (pixel art) et B (vectoriel) lisent les mêmes mesures et placent chaque
// élément au même endroit : on compare une technique de dessin, pas deux
// compositions. Les mesures du terrain sont celles du jeu (data/maps.js,
// core/constants.js) : un rendu retenu ici se branche sans rien décaler.
//
// Ce qui change par rapport à la station actuelle, en une phrase : l'arène
// flotte en orbite au-dessus de la face nocturne d'une planète. On la voit à
// travers la vitre du terrain, villes allumées comprises, et le soleil se
// lève sur l'horizon, en haut, entre les deux portraits du HUD.
// ---------------------------------------------------------------------------

export const W = 960, H = 600;
export const COURT = { left: 70, right: 890, top: 84, bottom: 560 };
export const CX = 480, CY = 322;
export const BUT = { haut: 222, bas: 422, prof: 48 };
export const ZONES = [
  { from: -100, to: -26, points: 3 },
  { from: -26, to: 26, points: 5 },
  { from: 26, to: 100, points: 3 }
];

// Le châssis garde l'emprise de l'actuel (render.js, drawRig) : 26 px autour
// du terrain, coins arrondis de 26. Le relief est nouveau : le rebord du haut
// montre sa paroi intérieure (MUR), le rebord du bas sa face avant (FACE).
export const CHASSIS = { L: 44, T: 58, R: 916, B: 586, rayon: 26 };
export const MUR = 8, FACE = 10;

// L'horizon est un très grand cercle : 40 px du haut au centre, et il plonge
// derrière le châssis vers les bords, là où les portraits du HUD le cachent.
export const PLANETE = { cx: 480, cy: 2440, r: 2400 };
export function horizonY(x) {
  const dx = x - PLANETE.cx;
  return PLANETE.cy - Math.sqrt(PLANETE.r * PLANETE.r - dx * dx);
}
// Le lever de soleil, à droite du centre : le coin haut-droit est pris par le
// portrait du joueur 2 à partir de x = 710.
export const SOLEIL = { x: 600 };
SOLEIL.y = horizonY(SOLEIL.x);

// Coordonnées « au sol » de la planète sous un pixel de l'écran. La
// compression n'agit que près de l'horizon : sous le terrain, la planète reste
// presque à plat, sinon la vitre paraîtrait penchée sous les joueurs.
export function projeterSol(x, y) {
  const d = Math.max(0, y - horizonY(x));
  const v = d + 1400 * (1 / (d + 3) - 1 / 600);
  const s = 1 + 60 / (d + 3);
  return [(x - CX) * s, v, d];
}

// Rythme du châssis : des plaques de 96 px, symétriques autour du centre,
// chacune portant sa bande lumineuse. L'actuel les décalait de 24 px vers la
// gauche ; ici le joint central tombe sur la ligne médiane.
export const BANDES_H = [144, 240, 336, 432, 528, 624, 720, 816];   // centres, 44 px de long
export const JOINTS_H = [96, 192, 288, 384, 480, 576, 672, 768, 864];
export const BANDES_V = [144, 500];                                  // centres, 40 px de haut
export const BALISES = [[57, 71], [903, 71], [57, 573], [903, 573]];
// Projecteurs de l'hologramme, sous la paroi intérieure du haut.
export const PROJECTEURS = [];
for (let x = 118; x <= 842; x += 48) PROJECTEURS.push(x);

// Ailes solaires dans les marges, au-dessus et au-dessous des cages.
export const PANNEAUX = [
  { x: 5, y: 98, l: 32, h: 98 }, { x: 5, y: 448, l: 32, h: 98 },
  { x: 923, y: 98, l: 32, h: 98 }, { x: 923, y: 448, l: 32, h: 98 }
];
// La station mère, au loin : un anneau qui tourne, posé sur l'horizon.
export const ANNEAU = { cx: 338, cy: 40, rx: 58, ry: 9 };
export const SATELLITE = { x: 668, y: 15 };

// Les drones-caméras remplacent toujours le public. Moins nombreux que les
// 26 de l'actuel : à cette finesse chacun se voit, et vingt-six faisaient
// un essaim qui brouillait les marges.
export const DRONES = [
  { x: 432, y: 15, orbite: 6, vit: .7, ph: 0, feu: 'r' },
  { x: 528, y: 22, orbite: 5, vit: .9, ph: 1.7, feu: 'o' },
  { x: 704, y: 27, orbite: 6, vit: .6, ph: 3.1, feu: 'r' },
  { x: 24, y: 150, orbite: 5, vit: .8, ph: .6, feu: 'o' },
  { x: 936, y: 150, orbite: 5, vit: .75, ph: 2.2, feu: 'r' },
  { x: 24, y: 496, orbite: 5, vit: .85, ph: 4.4, feu: 'r' },
  { x: 936, y: 496, orbite: 5, vit: .65, ph: 5.1, feu: 'o' },
  { x: 300, y: 593, orbite: 4, vit: .7, ph: 2.9, feu: 'o' },
  { x: 660, y: 593, orbite: 4, vit: .8, ph: .3, feu: 'r' }
];
export function positionDrone(d, t) {
  const a = t * d.vit + d.ph;
  return [d.x + Math.cos(a) * d.orbite, d.y + Math.sin(a * 1.3) * d.orbite * .5];
}

// Le vaisseau qui passe au loin, et l'étoile filante : des évènements rares,
// pour que le décor vive sans jamais appeler l'œil pendant un échange.
export function vaisseau(t) {
  const P = 19, k = (t % P) / 9;
  if (k > 1) return null;
  return { x: 760 - k * 520, y: 11 + k * 5, k };
}
export function filante(t) {
  const P = 7.3, k = (t % P) / .7;
  if (k > 1) return null;
  const n = Math.floor(t / P);
  const x0 = 280 + ((n * 173) % 380), y0 = 4 + ((n * 37) % 14);
  return { x: x0 + k * 70, y: y0 + k * 16, k };
}

// Effet de but : 1 au moment du but, retombe en une seconde.
export function effetBut(t, tBut) {
  if (tBut === null) return 0;
  const k = (t - tBut);
  return k < 0 || k > 1.1 ? 0 : Math.max(0, 1 - k / 1.1);
}

// ---------------------------------------------------------------------------
// Yuki, tel que l'atelier persos-hd l'a envoyé (64×80, pose d'attente).
// ---------------------------------------------------------------------------
export const YUKI = {
  lignes: [
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '................................................................',
    '.........................................E......................',
    '.........................................E......................',
    '..................................E.....CE......................',
    '..................................CE....CCE.....................',
    '..................................CE....DCE.....................',
    '..................................CRE..DCCE.....................',
    '..................................CRBE.DCCC.....................',
    '..................................CRRECBDDCE....................',
    '..................................CRSBCBBBDE....................',
    '..................................CAABBBBCCCED..................',
    '.................................CBABBBDDDDDCDE.................',
    '.................................CBBBBCcdBdcDAACCE..............',
    '.................................CBBBCCcdddcAAAAAACE............',
    '.................................CBBBBBBBBBBBBBBBBBCDab.........',
    '................................CBBBBBBBBBCCBBBBBCDDZZb.........',
    '................................CBBBBBBBBCDUDCCCCDEEEEE.........',
    '...............................CBBBBBBBBCCDUUkkUkkUk............',
    '...............................CBBBBBBCCCDDCVVhVVhV.............',
    '..............................CBBBBBBCCCCEDDCUUkUUk.............',
    '..............................DDDBCDDCCCCCEEDDCCCDDE............',
    '..............................CBDCDABDCDCCCDEEEEEEEE...V........',
    '.............................CAAADBBBBDBDDD..E...U...U.V........',
    '.......................CCCIICABABBBBBBBCBCCD.....UeCeUCU........',
    '......................CBBBCIIBBBBBBBBBCCCCCD.....CeBeBeU........',
    '......................CBBBCIGICIBBBCCCCD.IHHH....CBBBBeE........',
    '.....................CBBBBCCIGIGDDDDDDDDDDDGGH..DABBBBCC........',
    '.....................CBBBCCCOOIIDBBjAAABBBDGGGGDDCCBBCCE........',
    '.....................CBBBCCDDDDDBBAABBBBBBDGGGHHDDCCCCD.........',
    '....................CBBBBCDBBBBCeUVBhCABBBDGGGHHDBDDDD..........',
    '....................CBBBBDBBBBCCCBBBhCABBBDDGGHHDBBDD...........',
    '....................CBBBBDBBBBCCCeUVCCCBBBDDGGHDBBBBBE..........',
    '...................CBBBCCDBBBCCCCCAACBCBBBDDGGHDBBBBBE..........',
    '...................CBBCBBDBBBCCCUCCCBBBCCDCDGHHDBBBBCE..........',
    '...................CBBBCCCCBCCCCeUVBBBBBBCCDIIIDBBBBCE..........',
    '..................CBBBCCCCCDDDDDAABBBBBBCCCDGHDBBBBCCE..........',
    '..................CBCCCCCDDIGGHDDBBBDCDABDCDGHDBBBCCCE..........',
    '..................CCCCCDDIIGGHIDADDDCDADDCCDGHEBBCCCE...........',
    '..................ECCCDDIFGGHHIDABBCCDABBCCDGJ.EEEEE............',
    '............CCE....EEE.IFGGHHHDACBBCDCCBBCCDGJ..................',
    '...........CBBE.........IGGHHHDAACCBCDACCCDGHJ..................',
    '...........CBBBE........IGHHHIDBABBCCDABBCDGJ...................',
    '...........CABBBE.......JIIIIIDBCBBCDCCBBDEJ....................',
    '...........CABBBBE......CJJJJJCBACCBCDACCCDD....................',
    '...........EBBBBBE.....CAADDDDDDABBCCDADDDD.....................',
    '...........CBBBBBBCE...CAABMMMMMEEEEEEEMMMM.....................',
    '...........CBBBBBBBBCCCBBBKLLLLLMMMMMMMLLLL.....................',
    '...........EBBBBBBBBBBBBBIMMMLLLLLMMLLLLLLLM....................',
    '............CBBBBBBBBBBBDDDDDMLLLLLLMLLLLMDBE...................',
    '............EBBBBBBBBBBBBAABCDJLLLLLMLLMJDCBBE..................',
    '.............CBBBBBBBBBBEAABCCDMLLLMLLMDCCBBBBE.................',
    '.............EBBBBBBBBCCCCABBCCDMMLLLJDCCBBBBBCE................',
    '..............EEEEBBBCCCCCABBBCCCCMMMDCCCBBBBCCE................',
    '..................EBBBBCCCABBBCCCCE.ECCCCBBBBCCCE...............',
    '...................EEBCEECABBBBCCCE..ECCBBBBBCCCE...............',
    '.....................EE..CBBBBBCCCE...ECBBBBBCCCE...............',
    '.........................CBBBBBCCCE....CBBBBCCCE................',
    '........................CBBBBBCCCE....CBBBBBCCEE................',
    '.......................CABBBBCCCEE....CBBBBCCE..................',
    '.......................CABBBCCCE.....CBBBBCCE...................',
    '......................CABBBCCCE.....CABBBCCE....................',
    '.....................CABBBBCCE......CBBBBCCE....................',
    '.....................CBBBBCCE.......CBBBCCE.....................',
    '.....................CBBBCCE.......EBBBBCCE.....................',
    '.....................EBBBCCE........CBBCCE......................',
    '......................EBBCE.........EEBCCE......................',
    '.......................CBCE...........CBBCE.....................',
    '.......................CBBCE..........EBBCE.....................',
    '.......................CBCCE...........CBCBE....................',
    '.......................CBBBBCCCE.......EBBBBCCCE................',
    '.......................CBBBBBBCCE.......CBBBBBCCE...............',
    '.......................EBBCCCCeCCg......EBBCCCeCeg..............',
    '........................EEEEEEgEg.g......EEEEEEgg.g.............'
  ],
  couleurs: {
    A: '#ffffff', B: '#e8edf4', C: '#bec8d6', D: '#8f9cb2', E: '#4c586e', F: '#62666f', G: '#34363e',
    H: '#23252b', I: '#16171b', J: '#060608', K: '#3a3a40', L: '#1e1e22', M: '#161618', O: '#f4f6fa',
    R: '#e6a0aa', S: '#c07882', U: '#b82838', V: '#8a1626', Z: '#24262c', a: '#18191d', b: '#050506',
    c: '#8fd0ff', d: '#4a9ad8', e: '#c8202c', g: '#2a0206', h: '#e8e8e0', j: '#6a6f78', k: '#e0ddd1'
  },
  couleurHUD: '#7ab8ea'
};

export function canvasYuki() {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 80;
  const g = c.getContext('2d');
  YUKI.lignes.forEach((l, y) => {
    for (let x = 0; x < l.length; x++) {
      const ch = l[x];
      if (ch !== '.') { g.fillStyle = YUKI.couleurs[ch]; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
}

// ---------------------------------------------------------------------------
// La petite chorégraphie : deux Yuki qui se replacent, un disque qui part en
// bande, se fait attraper, repart droit. De quoi juger la lisibilité du
// disque et des persos sur le sol — c'est le premier critère d'un terrain.
// ---------------------------------------------------------------------------
const TENUE = .75, VOL1 = 1.15, VOL2 = .95;
const CYCLE = TENUE * 2 + VOL1 + VOL2;
function joueur(t, cote) {
  if (cote === 1) return { x: 252 + 70 * Math.sin(t * .63), y: CY + 120 * Math.sin(t * .81 + 1), face: 1 };
  return { x: 706 + 64 * Math.sin(t * .72 + 2), y: CY + 128 * Math.sin(t * .69 + .5), face: -1 };
}
const main = p => ({ x: p.x + 24 * p.face, y: p.y - 18 });
export function choregraphie(t) {
  const p1 = joueur(t, 1), p2 = joueur(t, 2);
  const c = t % CYCLE, debut = t - c;
  let d;
  if (c < TENUE) d = { ...main(p1), tenu: 1 };
  else if (c < TENUE + VOL1) {
    // Tir en bande : il touche le mur du haut à mi-course.
    const k = (c - TENUE) / VOL1;
    const a = main(joueur(debut + TENUE, 1)), b = main(joueur(debut + TENUE + VOL1, 2));
    const m = { x: (a.x + b.x) / 2, y: COURT.top + 16 };
    d = k < .5
      ? { x: a.x + (m.x - a.x) * k * 2, y: a.y + (m.y - a.y) * k * 2 }
      : { x: m.x + (b.x - m.x) * (k - .5) * 2, y: m.y + (b.y - m.y) * (k - .5) * 2 };
  } else if (c < TENUE * 2 + VOL1) d = { ...main(p2), tenu: 2 };
  else {
    const k = (c - TENUE * 2 - VOL1) / VOL2;
    const a = main(joueur(debut + TENUE * 2 + VOL1, 2)), b = main(joueur(debut + CYCLE, 1));
    d = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k + Math.sin(k * Math.PI) * 40 };
  }
  d.spin = t * 9;
  return { p1, p2, d };
}

// L'ombre et le sprite, placés comme render.js place les persos : l'image
// 64×80 prend la place des 16×20 d'aujourd'hui (48 × 60 × SCALE 1,6), soit
// 1,2 px de canevas par pixel de sprite.
export function dessinerJoueurs(ctx, etat, spr) {
  for (const p of [etat.p1, etat.p2]) {
    ctx.fillStyle = 'rgba(0,0,20,.33)';
    ctx.beginPath(); ctx.ellipse(p.x, p.y + 27, 20, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.imageSmoothingEnabled = false;
  for (const p of [etat.p1, etat.p2]) {
    ctx.save();
    ctx.translate(Math.round(p.x), Math.round(p.y - 30 * 1.6));
    if (p.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(spr, -38.4, -18, 76.8, 96);
    ctx.restore();
  }
}

// Le disque du jeu, skin Captain, tel que data/skins.js le dessine.
export function dessinerDisque(ctx, etat, t) {
  const { d } = etat;
  const r = 14;
  if (!d.tenu) {
    ctx.fillStyle = 'rgba(0,0,20,.33)';
    ctx.beginPath(); ctx.ellipse(d.x, d.y + 14, r + 2, (r + 2) * .36, 0, 0, Math.PI * 2); ctx.fill();
    // Traîne : quelques disques fantômes.
    for (let i = 1; i <= 5; i++) {
      const e = choregraphie(t - i * .022).d;
      if (e.tenu) break;
      ctx.globalAlpha = .16 * (1 - i / 6);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(e.x, e.y, r * (1 - i * .08), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.clip();
  for (const [k, col] of [[1, '#c2131a'], [.8, '#f2f2f2'], [.62, '#c2131a'], [.44, '#f2f2f2'], [.3, '#1b3f94']]) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#f2f2f2';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + d.spin * .15 + i * Math.PI / 5, rr = i % 2 ? r * .11 : r * .26;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI * 2); ctx.stroke();
}

// Le HUD du match, recopié de render.js (drawHUD) : portraits hexagonaux,
// étiquettes et jauges, rappel du score en bas à gauche. Il couvre les coins
// du haut ; c'est pour ça que tout ce qui compte du décor vit entre les deux.
function hexa(ctx, x, y, w, h, miroir, k) {
  ctx.beginPath();
  if (!miroir) {
    ctx.moveTo(x + w * k, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * (1 - k));
    ctx.lineTo(x + w * (1 - k), y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h * k);
  } else {
    ctx.moveTo(x, y); ctx.lineTo(x + w * (1 - k), y); ctx.lineTo(x + w, y + h * k);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x + w * k, y + h); ctx.lineTo(x, y + h * (1 - k));
  }
  ctx.closePath();
}
export function dessinerHUD(ctx, spr, t) {
  const S = 72, coul = YUKI.couleurHUD;
  const pale = 'rgb(236,244,252)';
  const panneau = (bordX, droite, score, jauge) => {
    const hx = droite ? bordX - S : bordX;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 9;
    ctx.fillStyle = '#111318'; hexa(ctx, hx, 8, S, S, droite, .2); ctx.fill();
    ctx.restore();
    ctx.save();
    hexa(ctx, hx + 5, 13, S - 10, S - 10, droite, .2);
    ctx.fillStyle = pale; ctx.fill(); ctx.clip();
    ctx.imageSmoothingEnabled = false;
    const bob = Math.sin(t * 2.4 + (droite ? 2 : 1)) * 1.6;
    // Tête et haut du torse : un carré de 34 px de sprite, autour du museau.
    ctx.save();
    if (droite) { ctx.translate(hx + S / 2, 0); ctx.scale(-1, 1); ctx.translate(-(hx + S / 2), 0); }
    ctx.drawImage(spr, 22, 8, 36, 36, hx + 5, 13 + bob, S - 10, S - 10);
    ctx.restore();
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(hx + S / 2, 8 + S / 2, S * .18, hx + S / 2, 8 + S / 2, S * .62);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.85)');
    ctx.fillStyle = g; ctx.fillRect(hx, 8, S, S);
    ctx.restore();
    const ix = droite ? hx - 10 : hx + S + 10;
    ctx.font = '11px "Archivo Black", system-ui, sans-serif';
    const lab = 'YUKI · ' + score;
    const tw = ctx.measureText(lab).width + 16, tx = droite ? ix - tw : ix;
    const gr = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    gr.addColorStop(0, coul); gr.addColorStop(1, '#c6e0f6');
    ctx.fillStyle = gr; ctx.fillRect(tx, 10, tw, 20);
    ctx.strokeStyle = '#111318'; ctx.lineWidth = 2.5; ctx.strokeRect(tx, 10, tw, 20);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(lab, tx + tw / 2, 25);
    const bw = 150, bx = droite ? ix - bw : ix;
    ctx.fillStyle = '#fff'; ctx.fillRect(bx, 34, bw, 16);
    ctx.fillStyle = coul; ctx.fillRect(bx, 34, bw * jauge, 16);
    ctx.strokeStyle = '#111318'; ctx.lineWidth = 3; ctx.strokeRect(bx, 34, bw, 16);
  };
  panneau(14, false, 12, .62);
  panneau(W - 14, true, 9, .35);
  ctx.font = '10px "Archivo Black", system-ui, sans-serif';
  const lab = 'PREMIER À 35';
  const pw = ctx.measureText(lab).width + 22, ph = 18, px = 14, py = H - 14 - ph;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
  ctx.strokeStyle = '#111318'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#111318'; ctx.textAlign = 'center';
  ctx.fillText(lab, px + pw / 2, py + 12.5);
  ctx.textAlign = 'left';
}
