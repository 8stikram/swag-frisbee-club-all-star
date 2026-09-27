// ---------------------------------------------------------------------------
// DONALD ET DINGO, l'ultime TRINITY de Sora — le dessin vectoriel.
//
// Tout vient de l'atelier (mockups/sora-trinity-reglage.html) : les pièces, les
// palettes et les réglages VALIDÉS par l'utilisateur le 27/09/2026 (trait D,
// gardés dans mockups/sora-trinity-reglage.reglages.json). Ce fichier est
// RÉGÉNÉRÉ depuis l'atelier : on ne retouche pas une pièce ici, on la retouche
// là-bas et on renvoie les réglages.
//
// Usage : dessinerPerso(g, 'dingo' | 'donald', { style, pose }) peint le
// personnage dans son propre repère — pieds en (0, 0), regard vers +x, en
// unités de dessin (HAUTEUR[perso] de haut). À l'appelant de placer et mettre
// à l'échelle. `style` : un des STYLES, ou styleEntre(k) pour un mélange entre
// D (k = 0) et le liseré lumineux des invoqués E (k = 1). `pose` : des
// décalages { id: { dx, dy, rot, ex, ey } } ajoutés aux réglages, pour animer.
// ---------------------------------------------------------------------------

/* ===================== LES COULEURS ===================== */
const DI = {
  noir: '#1d1b22', noirO: '#0b0a0e', museau: '#f3c79c', museauO: '#d39c6c', nez: '#131115', nezReflet: '#6a6670',
  dent: '#fbf8ee', dentO: '#d8d2c0', bouche: '#6d1a22', langue: '#e56b78',
  oeilBlanc: '#ffffff', oeilOmbre: '#e6e6ee', pupille: '#121216',
  chapeau: '#f5b52a', chapeauO: '#cc8616', bande: '#23357a', bandeO: '#141f4d',
  lunette: '#e0782a', lunetteO: '#a84e12', verre: '#f7dcae', meche: '#141216',
  pull: '#9ad12e', pullO: '#5f9419', rayure: '#77ad20', gilet: '#3a3c46', giletO: '#23242b',
  pocheG: '#7b8292', pocheGO: '#565c6b', ceinture: '#1b1b20', boucle: '#c9ced8', boucleO: '#8d939f',
  pantalon: '#f5b925', pantalonO: '#cc8a12', sangle: '#8a5a2a', sangleO: '#5e3b19', revers: '#d8841c', reversO: '#a85c10',
  manchette: '#e0892a', manchetteO: '#b0601a', manchetteRaie: '#f6f0e4', gant: '#fafafa', gantO: '#d2d3db',
  chaussure: '#8c6c3e', chaussureO: '#5c4524', semelle: '#3b3a3e', embout: '#bcc1ca', emboutO: '#868c96',
  anneau: '#ece4bf', anneauO: '#bdb28a',
  bouclierOr: '#f2c23a', bouclierOrO: '#c38d1a', bouclierBleu: '#3f7fe0', bouclierBleuO: '#2a58b0',
  bouclierClair: '#86cdf0', bouclierClairO: '#57a6d2', metal: '#4a4c55', metalO: '#2a2b33', metalReflet: '#aab0bc'
};
const DO = {
  plume: '#f8f8fc', plumeO: '#c3cde2', bec: '#f7b21c', becO: '#cf7f0a', becReflet: '#ffd466',
  bouche: '#7e2228', langue: '#e8707a', oeilBlanc: '#ffffff', oeilOmbre: '#d6e4ff', pupille: '#121216',
  veste: '#27399a', vesteO: '#161f5e', cape: '#3f63d8', capeO: '#2645a6', lisereJaune: '#f2c230', lisereClair: '#78d4f4',
  poche: '#6d5fd8', pocheO: '#4a3fae', zip: '#c9ced8', zipO: '#8d939f',
  bonnet: '#3866d6', bonnetO: '#2146a4', bande: '#1b2c74', bandeO: '#101a4a', bracelet: '#e3ad26', braceletO: '#a87612',
  manche: '#2e2320', bague: '#e8ecf2', bagueO: '#aab0bb', pommeau: '#e0a020', pommeauO: '#a86f0e',
  eclair: '#2f5fd6', eclairO: '#1c3c9a', eclairBord: '#dfe8ff', chapeauMage: '#b07a2a', chapeauMageO: '#74491a'
};
const PAL = { dingo: DI, donald: DO };

/* ===================== LES OUTILS DE DESSIN ===================== */
function blob(pts) {
  const p = new Path2D(), n = pts.length, P = i => pts[(i + n) % n];
  p.moveTo(P(0)[0], P(0)[1]);
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P(i - 1), [x1, y1] = P(i), [x2, y2] = P(i + 1), [x3, y3] = P(i + 2);
    p.bezierCurveTo(x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2);
  }
  p.closePath();
  const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
  return { p, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
}
function ell(cx, cy, rx, ry, rot = 0) {
  const p = new Path2D(); p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  const r = Math.max(rx, ry);
  return { p, bb: rot ? [cx - r, cy - r, cx + r, cy + r] : [cx - rx, cy - ry, cx + rx, cy + ry] };
}
function rect(x, y, w, h, r = 0) { const p = new Path2D(); p.roundRect(x, y, w, h, r); return { p, bb: [x, y, x + w, y + h] }; }
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',') + ')'; };

// Trois modes pour les mêmes fonctions de dessin :
//  - normal : on peint ;
//  - MESURE : on relève la boîte de la pièce et les couleurs qu'elle emploie ;
//  - PIOCHE : on peint la pièce d'une couleur unique dans un calque caché, pour
//    savoir au pixel près laquelle est sous la souris.
let ST = null, MESURE = null, PIOCHE = null;
function noter(g, bb, marge = 0) {
  if (!MESURE) return;
  const m = g.getTransform();
  for (const [x, y] of [[bb[0] - marge, bb[1] - marge], [bb[2] + marge, bb[1] - marge], [bb[2] + marge, bb[3] + marge], [bb[0] - marge, bb[3] + marge]]) {
    const q = m.transformPoint({ x, y });
    MESURE.bb[0] = Math.min(MESURE.bb[0], q.x); MESURE.bb[1] = Math.min(MESURE.bb[1], q.y);
    MESURE.bb[2] = Math.max(MESURE.bb[2], q.x); MESURE.bb[3] = Math.max(MESURE.bb[3], q.y);
  }
}
function couleur(c) { if (MESURE && c) MESURE.couleurs.add(c); return c; }
function part(g, f, c, s) {
  noter(g, f.bb, ST.trait / 2); couleur(c); couleur(s);
  if (PIOCHE) { g.fillStyle = PIOCHE; g.fill(f.p); g.lineWidth = Math.max(ST.trait, .6) + 1; g.strokeStyle = PIOCHE; g.stroke(f.p); return; }
  const { p, bb } = f;
  if (ST.halo) { g.save(); g.shadowColor = ST.halo; g.shadowBlur = ST.haloFlou; g.fillStyle = c; g.fill(p); g.restore(); }
  if (ST.ombre === 'rim' && s) {
    g.save(); g.clip(p); g.fillStyle = s; g.fill(p);
    g.translate(ST.rim, -ST.rim); g.fillStyle = c; g.fill(p); g.restore();
  } else if (ST.ombre === 'degrade' && s) {
    const d = g.createLinearGradient(bb[2], bb[1], bb[0], bb[3]);
    d.addColorStop(0, mix(c, '#ffffff', .18)); d.addColorStop(.55, c); d.addColorStop(1, s);
    g.fillStyle = d; g.fill(p);
  } else { g.fillStyle = c; g.fill(p); }
  if (ST.trait > 0) { g.lineWidth = ST.trait; g.strokeStyle = ST.couleurTrait; g.lineJoin = 'round'; g.stroke(p); }
}
function chemin(pts) { const p = new Path2D(); p.moveTo(...pts[0]); for (let i = 1; i < pts.length; i++) p.lineTo(...pts[i]); return p; }
function bbPts(pts) { const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
function tube(g, pts, w, c) {
  noter(g, bbPts(pts), w / 2 + ST.trait); couleur(c);
  const p = chemin(pts);
  g.lineCap = 'round'; g.lineJoin = 'round';
  if (PIOCHE) { g.strokeStyle = PIOCHE; g.lineWidth = w + ST.trait * 2 + 1; g.stroke(p); return; }
  if (ST.halo) { g.save(); g.shadowColor = ST.halo; g.shadowBlur = ST.haloFlou; g.strokeStyle = c; g.lineWidth = w; g.stroke(p); g.restore(); }
  if (ST.trait > 0) { g.strokeStyle = ST.couleurTrait; g.lineWidth = w + ST.trait * 2; g.stroke(p); }
  g.strokeStyle = c; g.lineWidth = w; g.stroke(p);
}
function ligne(g, pts, w, c) {
  noter(g, bbPts(pts), w / 2); couleur(c);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = PIOCHE || c; g.lineWidth = PIOCHE ? w + 1.5 : w; g.stroke(chemin(pts));
}
function oeil(g, P, cx, cy, rx, ry, px, py, pr) {
  part(g, ell(cx, cy, rx, ry), P.oeilBlanc, P.oeilOmbre);
  if (PIOCHE) return;
  couleur(P.pupille);
  g.fillStyle = P.pupille; g.beginPath(); g.ellipse(px, py, pr * .8, pr, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = P.oeilBlanc; g.beginPath(); g.arc(px + pr * .3, py - pr * .45, pr * .32, 0, Math.PI * 2); g.fill();
}

/* ===================== LES PIÈCES ===================== */
// Chaque pièce se dessine dans le repère de son personnage : pieds en (0, 0),
// regard vers la droite (+x) comme les sprites du jeu. Les pièces sont rangées
// dans des DOSSIERS par catégorie (tête › chapeau, visage…, haut, bras, bas,
// pieds). Un dossier est aussi un groupe qu'on peut déplacer, étirer et
// tourner d'un bloc — autour de son pivot : le cou pour la tête, l'épaule pour
// un bras. Le bâton et le bouclier sont DANS le dossier du bras qui les tient,
// donc ils le suivent.
//
// L'ordre de déclaration des pièces est leur ordre d'empilement : la première
// est tout au fond, la dernière devant tout.
const NOEUDS = [];
const dossier = (perso, parent, id, nom, pivot) => NOEUDS.push({ id, nom, perso, parent, groupe: true, pivot });
const piece = (perso, parent, id, nom, f, pivot) => NOEUDS.push({ id, nom, perso, parent, f, pivot });

/* =============================== DINGO =============================== */
// Grand échalas : longues jambes noires, pantalon bouffant, pull vert et gilet
// sombre, long cou, et une tête au museau très long sous un haut chapeau jaune.
const DINGO_H = 136;
dossier('dingo', null, 'dingo', 'DINGO', [0, 0]);
dossier('dingo', 'dingo', 'dingo.brasArr', 'Bras arrière', [-9, -83]);
dossier('dingo', 'dingo', 'dingo.pieds', 'Pieds');
dossier('dingo', 'dingo', 'dingo.bas', 'Bas — pantalon et ceinture');
dossier('dingo', 'dingo', 'dingo.haut', 'Haut — pull et gilet');
dossier('dingo', 'dingo', 'dingo.tete', 'Tête', [3, -96]);
dossier('dingo', 'dingo.tete', 'dingo.crane', 'Crâne et oreilles', [5, -106]);
dossier('dingo', 'dingo.tete', 'dingo.visage', 'Visage', [18, -100]);
dossier('dingo', 'dingo.tete', 'dingo.chapeauD', 'Chapeau', [5, -114]);
dossier('dingo', 'dingo', 'dingo.brasAv', 'Bras avant et bouclier', [9, -83]);

// --- bras arrière (tout au fond) : un bras long et fin
piece('dingo', 'dingo.brasArr', 'dingo.brasArr.manche', 'manche', g => {
  tube(g, [[-9, -83], [-16, -73], [-17, -64]], 5.8, DI.pull);
  ligne(g, [[-13.8, -76.5], [-15.6, -74]], .7, DI.rayure); });
piece('dingo', 'dingo.brasArr', 'dingo.brasArr.manchette', 'manchette rayée', g => {
  part(g, ell(-17, -62.6, 3.8, 1.9, .1), DI.manchette, DI.manchetteO);
  ligne(g, [[-20.2, -62.9], [-13.8, -62.3]], .8, DI.manchetteRaie); });
piece('dingo', 'dingo.brasArr', 'dingo.brasArr.gant', 'gant', g => {
  part(g, blob([[-21.5, -59.5], [-18, -61.8], [-13.5, -59.8], [-13, -55.3], [-15.5, -52.3], [-19.5, -52.8], [-22.5, -55.8]]), DI.gant, DI.gantO);
  ligne(g, [[-18.5, -56.3], [-18, -53.8]], .6, DI.gantO); });
// --- l'oreille qui pend sous la mâchoire, côté opposé : derrière tout le haut
piece('dingo', 'dingo.crane', 'dingo.oreilleMachoire', 'oreille sous la mâchoire', g => {
  part(g, blob([[11, -101], [15, -98.5], [16, -91], [18.8, -82], [15.8, -80.2], [13.5, -86.5], [11.5, -95]]), DI.noir, DI.noirO); }, [13, -99]);
// --- pieds
for (const [cote, s] of [['Arr', -1], ['Av', 1]]) {
  const x = 7.5 * s;
  piece('dingo', 'dingo.pieds', 'dingo.jambe' + cote, 'jambe ' + (s < 0 ? 'arrière' : 'avant'), g => {
    tube(g, [[x, -33], [x - .5 * s, -9]], 2.6, DI.noir); }, [x, -33]);
  piece('dingo', 'dingo.pieds', 'dingo.anneau' + cote, 'anneau de cheville ' + (s < 0 ? 'arrière' : 'avant'), g => {
    part(g, ell(x - .5 * s, -9.3, 4, 1.8, 0), DI.anneau, DI.anneauO); });
}
piece('dingo', 'dingo.pieds', 'dingo.chaussureArr', 'chaussure arrière', g => {
  part(g, blob([[-4, -9], [-13, -9.5], [-22, -7], [-31, -4], [-32, 0], [-2.5, 0], [-2, -4]]), DI.chaussure, DI.chaussureO);
  part(g, rect(-32.5, -1.8, 31, 2.4, 1), DI.semelle, null);
  part(g, blob([[-32, -4], [-26, -7.5], [-23, -4], [-24.5, -.6], [-32, -.6]]), DI.embout, DI.emboutO);
  ligne(g, [[-12, -8.8], [-9, -4.5]], .7, DI.chaussureO); });
piece('dingo', 'dingo.pieds', 'dingo.chaussureAv', 'chaussure avant', g => {
  part(g, blob([[4, -9], [13, -9.5], [22, -7], [31.5, -4], [33, 0], [2.5, 0], [2, -4]]), DI.chaussure, DI.chaussureO);
  part(g, rect(1.5, -1.8, 32, 2.4, 1), DI.semelle, null);
  part(g, blob([[33, -4], [27, -7.5], [24, -4], [25.5, -.6], [33, -.6]]), DI.embout, DI.emboutO);
  ligne(g, [[12, -8.8], [9, -4.5]], .7, DI.chaussureO); });
// --- bas : taille fine, puis le pantalon bouffe jusqu'aux revers
piece('dingo', 'dingo.bas', 'dingo.hanches', 'hanches', g => {
  part(g, blob([[-12, -62], [11.5, -62], [13.5, -53], [-13.5, -53]]), DI.pantalon, DI.pantalonO); });
piece('dingo', 'dingo.bas', 'dingo.pantalonArr', 'jambe de pantalon arrière', g => {
  part(g, blob([[-13, -58], [-1.5, -58], [0, -47], [-2, -38], [-4.5, -32], [-12, -31.5], [-16.8, -36], [-17.2, -48]]), DI.pantalon, DI.pantalonO);
  ligne(g, [[-8.5, -52], [-10, -40]], .7, DI.pantalonO); });
piece('dingo', 'dingo.bas', 'dingo.pantalonAv', 'jambe de pantalon avant', g => {
  part(g, blob([[.5, -58], [12, -58], [16.4, -48], [16, -36], [11.8, -31.5], [4.5, -32], [2, -38], [1, -47]]), DI.pantalon, DI.pantalonO);
  ligne(g, [[9.5, -52], [11, -40]], .7, DI.pantalonO); });
piece('dingo', 'dingo.bas', 'dingo.pocheCuisse', 'poche de cuisse', g => {
  part(g, rect(-12.2, -51, 5.6, 5, 1), DI.pantalonO, null); ligne(g, [[-11.7, -49.8], [-7.1, -49.8]], .6, DI.boucle); });
for (const [cote, x] of [['Arr', -17.4], ['Av', 14]]) {
  piece('dingo', 'dingo.bas', 'dingo.sangle' + cote, 'sangle ' + (cote === 'Arr' ? 'arrière' : 'avant'), g => {
    part(g, rect(x, -47.5, 3.4, 8, 1), DI.sangle, DI.sangleO);
    part(g, ell(x + 1.7, -45.5, .75, .75), DI.boucle, null); part(g, ell(x + 1.7, -41.5, .75, .75), DI.boucle, null); });
}
for (const [cote, x] of [['Arr', -8.6], ['Av', 8.4]]) {
  piece('dingo', 'dingo.bas', 'dingo.guetre' + cote, 'revers bouffant ' + (cote === 'Arr' ? 'arrière' : 'avant'), g => {
    part(g, blob([[x - 6.8, -33], [x, -35.3], [x + 6.8, -33], [x + 7, -28.6], [x, -26.9], [x - 7, -28.6]]), DI.revers, DI.reversO);
    ligne(g, [[x - 5, -31], [x + 5, -31]], .6, DI.reversO); });
}
piece('dingo', 'dingo.bas', 'dingo.ceinture', 'ceinture', g => { part(g, rect(-13, -63.5, 25.5, 4.6, 1.5), DI.ceinture, null); });
piece('dingo', 'dingo.bas', 'dingo.boucle', 'boucle', g => {
  part(g, rect(1, -64.6, 8, 6.8, 1.2), DI.boucle, DI.boucleO); part(g, rect(2.9, -62.7, 4.2, 3, .6), DI.ceinture, null); });
// --- haut : un torse étroit
piece('dingo', 'dingo.haut', 'dingo.pull', 'pull rayé', g => {
  part(g, blob([[-9, -87], [9, -87], [11, -76], [11.5, -62], [-11.5, -62], [-11, -76]]), DI.pull, DI.pullO);
  for (const x of [-10, -8.8, 8.4, 9.8]) ligne(g, [[x, -84], [x, -64]], .7, DI.rayure); });
piece('dingo', 'dingo.haut', 'dingo.giletG', 'gilet — pan gauche', g => {
  part(g, blob([[-7.8, -86.5], [-1.5, -86.5], [-1.5, -64.5], [-8.3, -66.2]]), DI.gilet, DI.giletO); });
piece('dingo', 'dingo.haut', 'dingo.giletD', 'gilet — pan droit', g => {
  part(g, blob([[2.5, -86.5], [7.8, -86.5], [8.3, -66.2], [2.5, -64.5]]), DI.gilet, DI.giletO); });
piece('dingo', 'dingo.haut', 'dingo.pochesGilet', 'poches du gilet', g => {
  part(g, rect(-7.2, -78, 4.4, 5, 1), DI.pocheG, DI.pocheGO); part(g, rect(3.4, -80, 4.4, 6, 1), DI.pocheG, DI.pocheGO);
  part(g, rect(-7, -71, 4.2, 3, .8), DI.pocheG, DI.pocheGO); });
piece('dingo', 'dingo.haut', 'dingo.fermeture', 'fermeture éclair', g => {
  ligne(g, [[.5, -87], [.5, -64]], 1.2, DI.boucle);
  for (let y = -85; y < -65; y += 2.4) ligne(g, [[-.4, y], [1.4, y + 1.2]], .45, DI.pull); });
piece('dingo', 'dingo.haut', 'dingo.cou', 'cou', g => { tube(g, [[1.5, -89], [3, -97]], 2.8, DI.noir); }, [1.5, -89]);
piece('dingo', 'dingo.haut', 'dingo.colRoule', 'col roulé', g => {
  part(g, blob([[-4.8, -91], [5.8, -91], [6.8, -86.5], [-5.8, -86.5]]), DI.pull, DI.pullO);
  ligne(g, [[-4.3, -89], [5.8, -89]], .6, DI.rayure); });
// --- tête : crâne, oreille côté nuque, visage, chapeau
piece('dingo', 'dingo.crane', 'dingo.crane.dome', 'crâne', g => {
  part(g, blob([[-5, -101], [-6, -108], [-2, -114], [5, -116.5], [12, -115], [16, -110], [16, -104], [11, -100], [3, -98.5]]), DI.noir, DI.noirO); });
piece('dingo', 'dingo.crane', 'dingo.oreilleNuque', 'oreille côté nuque', g => {
  part(g, blob([[-2.5, -107], [-7.5, -103], [-10.5, -94], [-12, -84], [-10, -79.5], [-6.5, -84], [-4.5, -95], [-.5, -103]]), DI.noir, DI.noirO); }, [-3, -105]);
piece('dingo', 'dingo.visage', 'dingo.machoire', 'mâchoire du bas', g => {
  part(g, blob([[7, -97], [15, -96.5], [22, -96], [24.5, -94.5], [21.5, -90.8], [14, -89.6], [8, -90.8], [5, -94]]), DI.museau, DI.museauO); }, [7, -96]);
piece('dingo', 'dingo.visage', 'dingo.bouche', 'intérieur de la bouche', g => {
  part(g, blob([[8, -96.6], [22, -96.2], [21, -93.6], [14, -92.3], [9, -93.3]]), DI.bouche, null); });
piece('dingo', 'dingo.visage', 'dingo.langue', 'langue', g => {
  part(g, blob([[11, -93.9], [18.5, -94.1], [17.5, -92.6], [12.2, -92.5]]), DI.langue, null); });
piece('dingo', 'dingo.visage', 'dingo.masque', 'masque et museau', g => {
  part(g, blob([[2, -104], [6, -103.2], [10, -103.6], [15, -104.2], [20, -102.6], [27, -100.6], [32.5, -99.6], [34.5, -97.6], [31.8, -95.8], [24, -96], [16, -96.4], [8, -96.6], [3, -98.6], [1, -101.5]]), DI.museau, DI.museauO); });
piece('dingo', 'dingo.visage', 'dingo.dents', 'dents', g => {
  part(g, rect(15.2, -96.8, 2.4, 3.2, .5), DI.dent, DI.dentO); part(g, rect(18, -96.6, 2.4, 3, .5), DI.dent, DI.dentO); });
piece('dingo', 'dingo.visage', 'dingo.nez', 'nez', g => {
  part(g, ell(33.8, -99.8, 3.9, 3.1, -.15), DI.nez, null);
  if (!PIOCHE) { couleur(DI.nezReflet); g.fillStyle = DI.nezReflet; g.beginPath(); g.ellipse(34.8, -101, 1.2, .7, -.3, 0, Math.PI * 2); g.fill(); } });
piece('dingo', 'dingo.visage', 'dingo.oeilD', 'œil droit (le plus loin)', g => { oeil(g, DI, 12.9, -107.3, 3.3, 5, 14.2, -106, 1.6); });
piece('dingo', 'dingo.visage', 'dingo.oeilG', 'œil gauche (le plus proche)', g => { oeil(g, DI, 7.2, -107.8, 3.7, 5.4, 8.8, -106.4, 1.8); });
piece('dingo', 'dingo.chapeauD', 'dingo.chapeau', 'chapeau', g => {
  // un haut cône au bout arrondi, à peine penché vers l'arrière, comme sur les rendus KH3
  part(g, blob([[-2, -113], [-1.4, -120], [-.4, -126.5], [1.2, -131.5], [3.6, -134.6], [6.6, -134.2], [8.6, -130.8], [9.8, -125.5], [10.8, -119.5], [12, -113]]), DI.chapeau, DI.chapeauO);
  ligne(g, [[3, -132], [3.6, -125], [4.4, -118]], .7, DI.chapeauO); }, [5, -114]);
piece('dingo', 'dingo.chapeauD', 'dingo.bandeChapeau', 'bande du chapeau', g => {
  part(g, blob([[-3, -115.8], [5, -117.8], [12.5, -116.2], [12.8, -112.5], [5, -114], [-3, -112.3]]), DI.bande, DI.bandeO); });
piece('dingo', 'dingo.chapeauD', 'dingo.lunettes', "lunettes d'aviateur", g => {
  ligne(g, [[3, -115.2], [14.5, -114.5]], 1, DI.lunetteO);
  part(g, ell(7.2, -115.5, 3.4, 3.4), DI.lunette, DI.lunetteO); part(g, ell(7.2, -115.5, 2, 2), DI.verre, null);
  part(g, ell(12, -115.1, 2.9, 3), DI.lunette, DI.lunetteO); part(g, ell(12, -115.1, 1.7, 1.8), DI.verre, null); });
piece('dingo', 'dingo.chapeauD', 'dingo.meches', 'mèches', g => {
  // trois mèches qui jaillissent vers l'avant, au niveau des lunettes
  ligne(g, [[12.5, -117.5], [16, -121], [19.5, -123.8]], .75, DI.meche);
  ligne(g, [[13, -116.5], [17.5, -118.2], [22.5, -119]], .75, DI.meche);
  ligne(g, [[13, -115.3], [18, -115.4], [23, -114.8]], .75, DI.meche); }, [12, -116]);
// --- bras avant et bouclier (devant tout)
piece('dingo', 'dingo.brasAv', 'dingo.brasAv.manche', 'manche', g => {
  tube(g, [[9, -83], [17, -73], [13.5, -67]], 5.8, DI.pull); ligne(g, [[13.6, -77.5], [15.8, -74.5]], .7, DI.rayure); });
piece('dingo', 'dingo.brasAv', 'dingo.brasAv.manchette', 'manchette rayée', g => {
  part(g, ell(12.8, -66.4, 1.9, 3.8, .35), DI.manchette, DI.manchetteO); });
piece('dingo', 'dingo.brasAv', 'dingo.brasAv.gant', 'gant', g => {
  part(g, blob([[7, -69.5], [11, -70.5], [13.5, -66.5], [12, -62], [8, -61.5], [5.5, -65]]), DI.gant, DI.gantO); });
// le bouclier du chevalier : anneau doré, bande bleue, anneau doré, fond bleu
// clair, et l'emblème tête de Mickey en trois disques de métal cerclés d'or.
// Vu de trois quarts, il est aplati en largeur.
piece('dingo', 'dingo.brasAv', 'dingo.bouclier', 'BOUCLIER', g => {
  g.save(); g.translate(11, -67); g.scale(.82, 1);
  part(g, ell(0, 0, 15.5, 15.5), DI.bouclierOr, DI.bouclierOrO);
  part(g, ell(0, 0, 13.7, 13.7), DI.bouclierBleu, DI.bouclierBleuO);
  part(g, ell(0, 0, 12.1, 12.1), DI.bouclierOr, DI.bouclierOrO);
  part(g, ell(0, 0, 10.9, 10.9), DI.bouclierClair, DI.bouclierClairO);
  for (const [x, y, r] of [[-6.3, -6.2, 3.7], [6.3, -6.2, 3.7], [0, 1.3, 6.9]]) {
    part(g, ell(x, y, r, r), DI.bouclierOr, DI.bouclierOrO);
    part(g, ell(x, y, r - .9, r - .9), DI.metal, DI.metalO);
    if (!PIOCHE) { couleur(DI.metalReflet); g.fillStyle = DI.metalReflet; g.globalAlpha = .55;
      g.beginPath(); g.ellipse(x + r * .15, y - r * .3, r * .38, r * .26, 0, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  }
  g.restore(); }, [11, -67]);

/* =============================== DONALD =============================== */
// Corps blanc en poire, grande tête ronde, deux grands yeux collés, long bec,
// bonnet bleu mou posé en arrière, veste marine et petite cape bordée d'or.
const DONALD_H = 105;
dossier('donald', null, 'donald', 'DONALD', [0, 0]);
dossier('donald', 'donald', 'donald.brasArr', 'Bras arrière', [-10, -60]);
dossier('donald', 'donald', 'donald.corpsD', 'Corps et queue');
dossier('donald', 'donald', 'donald.pattes', 'Pattes');
dossier('donald', 'donald', 'donald.tenue', 'Tenue — veste et cape');
dossier('donald', 'donald', 'donald.tete', 'Tête', [3, -64]);
dossier('donald', 'donald.tete', 'donald.craneD', 'Crâne', [4, -80]);
dossier('donald', 'donald.tete', 'donald.visage', 'Visage', [18, -76]);
dossier('donald', 'donald.tete', 'donald.bonnetD', 'Bonnet', [4, -95]);
dossier('donald', 'donald', 'donald.brasAv', 'Bras avant et bâton', [12, -60]);

// --- bras arrière : il part d'une épaule étroite
piece('donald', 'donald.brasArr', 'donald.brasArr.manche', 'manche', g => { tube(g, [[-10, -60], [-18, -51]], 6.5, DO.veste); });
piece('donald', 'donald.brasArr', 'donald.brasArr.bras', 'bras', g => { tube(g, [[-18, -51], [-19.5, -41]], 4.8, DO.plume); });
piece('donald', 'donald.brasArr', 'donald.brasArr.bracelet', 'bracelet doré', g => {
  part(g, rect(-22.8, -43.2, 6.8, 3.4, 1.2), DO.bracelet, DO.braceletO); });
piece('donald', 'donald.brasArr', 'donald.brasArr.main', 'main', g => {
  part(g, blob([[-23.5, -39], [-19.5, -40.5], [-15.5, -38.5], [-15, -34.5], [-18, -32], [-22, -32.5], [-24.3, -35.5]]), DO.plume, DO.plumeO); });
// --- corps et queue : une POIRE, étroite sous la tête et large en bas
piece('donald', 'donald.corpsD', 'donald.queue', 'queue', g => {
  part(g, blob([[-20, -44], [-31, -52], [-29, -44.5], [-38, -41.5], [-30, -36.5], [-35.5, -31.5], [-24, -30.5], [-20, -32.5]]), DO.plume, DO.plumeO); }, [-20, -38]);
// --- pattes
for (const [cote, s] of [['Arr', -1], ['Av', 1]]) {
  piece('donald', 'donald.pattes', 'donald.jambe' + cote, 'jambe ' + (s < 0 ? 'arrière' : 'avant'), g => {
    tube(g, [[6.5 * s, -25], [8.5 * s, -5]], 4.2, DO.bec); }, [6.5 * s, -25]);
}
piece('donald', 'donald.pattes', 'donald.patteArr', 'patte arrière', g => {
  part(g, blob([[-5.5, -6.5], [-15, -6.5], [-24, -4.5], [-30, -1.8], [-28.5, .6], [-22, .2], [-15, 1.2], [-8, .6], [-2, 0]]), DO.bec, DO.becO);
  ligne(g, [[-12, -3.5], [-20, -1]], .6, DO.becO); ligne(g, [[-10, -2.5], [-15, .4]], .6, DO.becO); });
piece('donald', 'donald.pattes', 'donald.patteAv', 'patte avant', g => {
  part(g, blob([[3.5, -6.5], [14, -6.5], [24, -4.5], [31, -1.8], [30, .6], [23, .2], [15, 1.2], [7, .6], [0, 0]]), DO.bec, DO.becO);
  ligne(g, [[11, -3.5], [21, -1]], .6, DO.becO); ligne(g, [[9, -2.5], [15, .4]], .6, DO.becO); });
piece('donald', 'donald.corpsD', 'donald.corps', 'corps', g => {
  part(g, blob([[-14, -52], [-8, -60], [3, -62], [13, -59], [19, -49], [22.5, -38], [21, -27.5], [13, -20], [0, -17.8], [-12.5, -20], [-21.5, -27.5], [-23.5, -38]]), DO.plume, DO.plumeO); });
// --- tenue : la veste s'évase de l'épaule étroite jusqu'au bas du ventre
piece('donald', 'donald.tenue', 'donald.veste', 'veste', g => {
  part(g, blob([[-9.5, -64], [11.5, -64], [15, -57], [19, -48], [21.5, -39.5], [15, -34.5], [7, -36.8], [-1.5, -34], [-10, -36.8], [-18.5, -35], [-21.5, -42.5], [-16, -55]]), DO.veste, DO.vesteO); });
piece('donald', 'donald.tenue', 'donald.lisere', 'liseré bleu clair', g => {
  ligne(g, [[-18.5, -35.3], [-10, -37.1], [-1.5, -34.3], [7, -37.1], [15, -34.8], [21.5, -39.8]], 1.2, DO.lisereClair);
  ligne(g, [[-3, -61], [-4, -35]], .9, DO.lisereClair); ligne(g, [[7.5, -61], [8.5, -37]], .9, DO.lisereClair); });
piece('donald', 'donald.tenue', 'donald.poches', 'poches', g => {
  part(g, rect(-15, -48, 8, 6.5, 1.5), DO.poche, DO.pocheO); part(g, rect(9.5, -48, 8, 6.5, 1.5), DO.poche, DO.pocheO);
  ligne(g, [[-14.5, -46.6], [-7.5, -46.6]], .7, DO.lisereJaune); ligne(g, [[10, -46.6], [17, -46.6]], .7, DO.lisereJaune); });
piece('donald', 'donald.tenue', 'donald.fermeture', 'fermetures éclair', g => {
  ligne(g, [[-1, -61], [-1.8, -35]], 1.2, DO.zip); ligne(g, [[4.5, -61], [5.2, -37.5]], 1.2, DO.zip);
  part(g, rect(-3.2, -36.5, 2.8, 4, .6), DO.zip, DO.zipO); part(g, rect(3.8, -38.8, 2.8, 4, .6), DO.zip, DO.zipO); });
piece('donald', 'donald.tenue', 'donald.cape', 'petite cape', g => {
  part(g, blob([[-12.5, -63.5], [-5.5, -67.2], [10.5, -67.2], [15.5, -63.5], [17, -57.5], [9, -55.8], [2, -57.8], [-5.5, -55.8], [-14.5, -57.5]]), DO.cape, DO.capeO); });
piece('donald', 'donald.tenue', 'donald.bordureCape', 'bordure dorée de la cape', g => {
  ligne(g, [[-14.5, -57.5], [-5.5, -55.8], [2, -57.8], [9, -55.8], [17, -57.5]], 1.4, DO.lisereJaune); });
piece('donald', 'donald.tenue', 'donald.col', 'col montant', g => {
  part(g, blob([[-6, -69], [8.5, -69], [9.5, -64.5], [-7, -64.5]]), DO.veste, DO.vesteO);
  ligne(g, [[-6.5, -68.7], [9, -68.7]], .9, DO.lisereJaune); });
piece('donald', 'donald.tenue', 'donald.fermoir', 'fermoir argent', g => {
  part(g, rect(-.5, -66, 8, 2.6, .8), DO.zip, DO.zipO); part(g, rect(2.2, -67, 2.6, 4.6, .6), DO.zip, DO.zipO); });
// --- tête : crâne, visage, bonnet
piece('donald', 'donald.bonnetD', 'donald.bonnetPli', 'pli qui retombe', g => {
  part(g, blob([[-7.5, -99], [-16.5, -97], [-21, -89], [-18.5, -82], [-12.5, -84], [-10, -91]]), DO.bonnet, DO.bonnetO); }, [-9, -95]);
piece('donald', 'donald.craneD', 'donald.crane', 'crâne', g => {
  part(g, blob([[-11, -79], [-9, -90], [-1, -97], [10, -97], [18, -91], [21, -81], [19, -72], [12, -66], [2, -64], [-7, -68]]), DO.plume, DO.plumeO); });
piece('donald', 'donald.visage', 'donald.becBas', 'bec du bas', g => {
  part(g, blob([[10, -70.5], [20, -70], [30, -68.8], [34.5, -66.8], [30.5, -64.8], [19, -65.4], [11, -67.5]]), DO.bec, DO.becO); }, [11, -69]);
piece('donald', 'donald.visage', 'donald.bouche', 'intérieur du bec', g => {
  part(g, blob([[12, -71.2], [26, -70.8], [30.5, -69.2], [22, -67.8], [13, -68.8]]), DO.bouche, null); });
piece('donald', 'donald.visage', 'donald.langue', 'langue', g => {
  part(g, blob([[15, -69.8], [22.5, -69.5], [20.5, -68.1], [15.8, -68.4]]), DO.langue, null); });
piece('donald', 'donald.visage', 'donald.becHaut', 'bec du haut', g => {
  part(g, blob([[6, -75.8], [12, -77.6], [22, -76.6], [32, -74.9], [39.2, -73.8], [41.2, -71.5], [37.5, -70], [26, -70.8], [15, -71.2], [7, -72.6]]), DO.bec, DO.becO);
  ligne(g, [[14, -75.5], [30, -73.6]], .6, DO.becReflet); }, [8, -74]);
piece('donald', 'donald.visage', 'donald.oeilD', 'œil droit (le plus loin)', g => { oeil(g, DO, 16, -84.2, 4, 6.6, 17.8, -83.4, 2); });
piece('donald', 'donald.visage', 'donald.oeilG', 'œil gauche (le plus proche)', g => { oeil(g, DO, 9, -85, 4.6, 7.2, 11.2, -84.2, 2.3); });
piece('donald', 'donald.bonnetD', 'donald.bonnet', 'bonnet', g => {
  part(g, blob([[-11, -89], [-8, -99], [1, -104.5], [12, -103.5], [20, -97], [21, -91.5], [10, -93.5], [-2, -92.5]]), DO.bonnet, DO.bonnetO); }, [4, -95]);
piece('donald', 'donald.bonnetD', 'donald.fermetureBonnet', 'fermeture du bonnet', g => {
  ligne(g, [[-7, -98.5], [1, -102.3], [11.5, -101.5], [18.5, -96.5]], 1.3, DO.lisereClair);
  for (const [x, y] of [[-3, -100.6], [2, -102], [7, -102.2], [12, -101.2], [16, -98.6]]) ligne(g, [[x - .6, y - .6], [x + .6, y + .6]], .5, DO.bonnetO); });
piece('donald', 'donald.bonnetD', 'donald.bandeBonnet', 'bande sur le front', g => {
  part(g, blob([[-11, -90.5], [-1, -94.6], [11, -95.2], [21, -92.6], [20.6, -89.4], [10, -91.6], [-1, -91], [-10, -87.4]]), DO.bande, DO.bandeO); });
piece('donald', 'donald.bonnetD', 'donald.tirette', 'tirette', g => {
  ligne(g, [[-18, -83], [-19, -78.5]], .9, DO.zip); part(g, rect(-21, -79, 4, 5.5, .8), DO.zip, DO.zipO);
  part(g, rect(-20, -77.8, 2, 2.2, .3), DO.zipO, null); }, [-18, -83]);
// --- bras avant et bâton (devant tout)
// le bâton du mage, tenu levé devant lui : manche sombre, bagues blanches,
// pommeau doré, éclair bleu en zigzag et chapeau de sorcier plié au sommet.
piece('donald', 'donald.brasAv', 'donald.baton', 'BÂTON', g => {
  g.save(); g.translate(31, -30); g.rotate(.2288);
  part(g, rect(-1.9, -3.5, 3.8, 4.5, 1.2), DO.pommeau, DO.pommeauO);
  part(g, rect(-1.7, -6, 3.4, 2.4, .6), DO.bague, DO.bagueO);
  tube(g, [[0, -6], [0, -45]], 2.5, DO.manche);
  part(g, rect(-1.9, -47.5, 3.8, 2.6, .6), DO.bague, DO.bagueO);
  part(g, blob([[-2, -47.5], [3, -47.5], [4.2, -52], [-.6, -54.5], [5, -60], [1, -61], [-4.2, -55], [.6, -52.5]]), DO.eclair, DO.eclairO);
  ligne(g, [[3, -47.5], [4.2, -52], [-.6, -54.5], [5, -60]], .6, DO.eclairBord);
  part(g, ell(1.5, -61, 7.2, 2.2), DO.chapeauMage, DO.chapeauMageO);
  part(g, blob([[-3.5, -61.5], [6.5, -61.5], [4.5, -67], [10, -73], [3.5, -71], [-.5, -66]]), DO.chapeauMage, DO.chapeauMageO);
  part(g, rect(-3.2, -63.4, 9.4, 1.6, .4), DO.manche, null);
  g.restore(); }, [36.8, -55]);
piece('donald', 'donald.brasAv', 'donald.brasAv.manche', 'manche', g => { tube(g, [[12, -60], [25, -51]], 6.5, DO.veste); });
piece('donald', 'donald.brasAv', 'donald.brasAv.bras', 'bras', g => { tube(g, [[25, -51], [34.5, -54.5]], 4.8, DO.plume); });
piece('donald', 'donald.brasAv', 'donald.brasAv.bracelet', 'bracelet doré', g => {
  g.save(); g.translate(30.2, -52.8); g.rotate(-1.2);
  part(g, rect(-1.7, -3.4, 3.4, 6.8, 1.2), DO.bracelet, DO.braceletO);
  g.restore(); });
piece('donald', 'donald.brasAv', 'donald.brasAv.main', 'main', g => {
  part(g, blob([[33, -60], [37.5, -60.2], [40.5, -56.5], [39.5, -52], [35, -50.5], [32, -53], [32.5, -57]]), DO.plume, DO.plumeO);
  ligne(g, [[36.5, -58.5], [38.5, -55.5]], .6, DO.plumeO); });

const PAR_ID = Object.fromEntries(NOEUDS.map(n => [n.id, n]));
const PIECES_ = NOEUDS.filter(n => !n.groupe);
const parentDe = n => (n.parent ? PAR_ID[n.parent] : null);
const enfants = n => NOEUDS.filter(q => q.parent === n.id);

/* ===================== LES STYLES DU TRAIT ===================== */
export const STYLES = {
  A: { nom: 'A · contour fin, ombre au bord', trait: 1.1, couleurTrait: '#2a1c26', ombre: 'rim', rim: 1.6 },
  B: { nom: 'B · sans contour, volume doux', trait: 0, ombre: 'degrade' },
  C: { nom: 'C · gros contour cartoon', trait: 2.2, couleurTrait: '#141018', ombre: 'aucune' },
  D: { nom: 'D · aplats ombrés, sans contour', trait: 0, ombre: 'rim', rim: 2.2 },
  E: { nom: 'E · invoqués, liseré lumineux', trait: 1, couleurTrait: '#fff4c8', ombre: 'rim', rim: 1.6, halo: 'rgba(255,214,90,.85)', haloFlou: 9 },
};

// Un mélange entre D (k = 0, le trait validé) et E (k = 1, les invoqués) : le
// liseré clair et le halo doré montent avec k, l'ombre au bord s'affine.
export function styleEntre(k) {
  k = Math.max(0, Math.min(1, k));
  if (k <= 0) return STYLES.D;
  return { trait: STYLES.E.trait * k, couleurTrait: STYLES.E.couleurTrait, ombre: 'rim',
           rim: STYLES.D.rim + (STYLES.E.rim - STYLES.D.rim) * k,
           halo: 'rgba(255,214,90,' + (.85 * k).toFixed(3) + ')', haloFlou: STYLES.E.haloFlou * k };
}

/* ===================== LES RÉGLAGES VALIDÉS ===================== */
export const VALIDES = {"atelier": "trinity", "style": "D", "elements": {"dingo.brasArr.manchette": {"dx": 0, "dy": 0, "ex": 0.79, "ey": 1, "rot": 0}, "dingo.brasArr.gant": {"dx": 0, "dy": -2, "ex": 1, "ey": 1, "rot": 0}, "dingo.oreilleMachoire": {"dx": -1, "dy": -1, "ex": 1, "ey": 1, "rot": 0}, "dingo.jambeArr": {"dx": -2.5, "dy": -0.5, "ex": 2.13, "ey": 1, "rot": -5}, "dingo.jambeAv": {"dx": 3.5, "dy": 0, "ex": 2.01, "ey": 1, "rot": 10}, "dingo.chaussureAv": {"dx": 1, "dy": 0, "ex": 1, "ey": 1, "rot": 0}, "dingo.hanches": {"dx": 0, "dy": 0, "ex": 0.74, "ey": 1, "rot": 0}, "dingo.pantalonArr": {"dx": 0, "dy": 0, "ex": 0.61, "ey": 1, "rot": 7}, "dingo.pantalonAv": {"dx": 0, "dy": 0, "ex": 0.62, "ey": 1, "rot": -5}, "dingo.pocheCuisse": {"dx": 1, "dy": 1, "ex": 1, "ey": 1, "rot": 0}, "dingo.sangleArr": {"dx": 1.5, "dy": -3, "ex": 1, "ey": 1, "rot": 14}, "dingo.sangleAv": {"dx": -2, "dy": -2.5, "ex": 1, "ey": 1, "rot": -12}, "dingo.guetreArr": {"dx": -2, "dy": -1, "ex": 0.52, "ey": 0.82, "rot": 0}, "dingo.guetreAv": {"dx": 1.5, "dy": -1, "ex": 0.58, "ey": 0.97, "rot": 0}, "dingo.ceinture": {"dx": 0, "dy": 0, "ex": 0.89, "ey": 1, "rot": 0}, "dingo.boucle": {"dx": -4.5, "dy": 0.5, "ex": 0.76, "ey": 0.76, "rot": 0}, "dingo.pull": {"dx": 0, "dy": 0, "ex": 0.83, "ey": 1, "rot": 0}, "dingo.giletG": {"dx": -3, "dy": 2, "ex": 0.95, "ey": 1, "rot": 0}, "dingo.giletD": {"dx": 1.5, "dy": 2, "ex": 1, "ey": 1, "rot": 0}, "dingo.pochesGilet": {"dx": -1, "dy": 0, "ex": 1.34, "ey": 1, "rot": 0}, "dingo.fermeture": {"dx": 0, "dy": 2, "ex": 1, "ey": 1.06, "rot": 0}, "dingo.cou": {"dx": -2, "dy": -1.5, "ex": 1.58, "ey": 1, "rot": -7}, "dingo.crane.dome": {"dx": 0, "dy": 1, "ex": 1, "ey": 1.2, "rot": 0}, "dingo.oreilleNuque": {"dx": 1, "dy": -1, "ex": 1, "ey": 1, "rot": 0}, "dingo.machoire": {"dx": 4, "dy": -7, "ex": 1.31, "ey": 1.31, "rot": 7}, "dingo.bouche": {"dx": 9, "dy": -2, "ex": 0.95, "ey": 1, "rot": 0}, "dingo.langue": {"dx": 9, "dy": -3, "ex": 1.21, "ey": 1.21, "rot": 0}, "dingo.dents": {"dx": 7.5, "dy": -0.5, "ex": 1, "ey": 1, "rot": 0}, "dingo.nez": {"dx": 1, "dy": 1, "ex": 0.55, "ey": 0.55, "rot": 0}, "dingo.oeilD": {"dx": 1, "dy": 0, "ex": 1, "ey": 1, "rot": 0}, "dingo.oeilG": {"dx": 1, "dy": 1, "ex": 1, "ey": 1, "rot": 0}, "dingo.bandeChapeau": {"dx": 0, "dy": -5, "ex": 0.75, "ey": 0.78, "rot": -4}, "dingo.lunettes": {"dx": 0, "dy": 0, "ex": 1, "ey": 1, "rot": -10}, "dingo.meches": {"dx": -1, "dy": 5, "ex": 0.73, "ey": 0.71, "rot": -46}, "dingo.brasAv.manchette": {"dx": 0, "dy": 0, "ex": 1.07, "ey": 0.69, "rot": 82}, "dingo.brasAv.gant": {"dx": 1.5, "dy": 2, "ex": 1, "ey": 1, "rot": 0}, "dingo.bouclier": {"dx": 1.5, "dy": 1, "ex": 1, "ey": 1, "rot": 0}, "donald.brasArr": {"dx": -1.5, "dy": -1, "ex": 1, "ey": 1, "rot": -2}, "donald.tenue": {"dx": 2.5, "dy": -3.5, "ex": 0.86, "ey": 0.78, "rot": 0}, "donald.brasArr.manche": {"dx": 2.5, "dy": -0.5, "ex": 0.81, "ey": 0.69, "rot": 14}, "donald.brasArr.bras": {"dx": 2.5, "dy": -3.5, "ex": 0.65, "ey": 0.72, "rot": 0}, "donald.brasArr.bracelet": {"dx": 2.5, "dy": -5.5, "ex": 0.63, "ey": 0.63, "rot": 9}, "donald.brasArr.main": {"dx": 2.5, "dy": -8, "ex": 0.61, "ey": 0.61, "rot": 0}, "donald.queue": {"dx": 5, "dy": 5.5, "ex": 1, "ey": 1, "rot": 0}, "donald.corps": {"dx": 2, "dy": -0.5, "ex": 0.79, "ey": 1.05, "rot": 8}, "donald.veste": {"dx": 0, "dy": 6, "ex": 0.97, "ey": 1, "rot": 0}, "donald.lisere": {"dx": -2.5, "dy": 2.5, "ex": 1.04, "ey": 1.04, "rot": 0}, "donald.poches": {"dx": -1.5, "dy": 1, "ex": 1, "ey": 1, "rot": 0}, "donald.fermeture": {"dx": -1.5, "dy": -2, "ex": 1, "ey": 1, "rot": 0}, "donald.cape": {"dx": 0, "dy": 2, "ex": 1, "ey": 1, "rot": 0}, "donald.col": {"dx": 0, "dy": 4, "ex": 1, "ey": 0.94, "rot": 0}, "donald.fermoir": {"dx": -2.5, "dy": 4, "ex": 0.76, "ey": 0.76, "rot": 0}, "donald.bonnetPli": {"dx": -8, "dy": 8, "ex": 0.7, "ey": 0.7, "rot": -150}, "donald.bonnet": {"dx": 0, "dy": -1, "ex": 1, "ey": 1, "rot": 1}, "donald.fermetureBonnet": {"dx": -7.5, "dy": 0, "ex": 0.78, "ey": 0.78, "rot": -49}, "donald.tirette": {"dx": -1, "dy": -2, "ex": 1, "ey": 1, "rot": 0}, "donald.baton": {"dx": -0.5, "dy": 0.5, "ex": 1.09, "ey": 0.87, "rot": 0}, "donald.brasAv.manche": {"dx": 0, "dy": 0, "ex": 0.89, "ey": 0.89, "rot": 16}, "donald.brasAv.bras": {"dx": -1, "dy": 1.5, "ex": 1.05, "ey": 0.83, "rot": 0}, "donald.brasAv.bracelet": {"dx": 2.5, "dy": 0.5, "ex": 0.83, "ey": 0.83, "rot": 43}, "donald.brasAv.main": {"dx": 0.5, "dy": 0.5, "ex": 1, "ey": 1, "rot": 0}}, "ordre": {"dingo": ["dingo.brasArr.manche", "dingo.brasArr.manchette", "dingo.brasArr.gant", "dingo.oreilleMachoire", "dingo.jambeArr", "dingo.anneauArr", "dingo.jambeAv", "dingo.anneauAv", "dingo.chaussureArr", "dingo.chaussureAv", "dingo.hanches", "dingo.pantalonArr", "dingo.pantalonAv", "dingo.pocheCuisse", "dingo.sangleArr", "dingo.sangleAv", "dingo.guetreArr", "dingo.guetreAv", "dingo.ceinture", "dingo.pull", "dingo.colRoule", "dingo.giletG", "dingo.giletD", "dingo.pochesGilet", "dingo.fermeture", "dingo.cou", "dingo.crane.dome", "dingo.boucle", "dingo.oreilleNuque", "dingo.machoire", "dingo.bouche", "dingo.langue", "dingo.oeilD", "dingo.dents", "dingo.masque", "dingo.nez", "dingo.oeilG", "dingo.chapeau", "dingo.bandeChapeau", "dingo.lunettes", "dingo.meches", "dingo.brasAv.manche", "dingo.brasAv.manchette", "dingo.brasAv.gant", "dingo.bouclier"], "donald": ["donald.queue", "donald.brasArr.manche", "donald.brasArr.bras", "donald.brasArr.bracelet", "donald.brasArr.main", "donald.jambeArr", "donald.jambeAv", "donald.patteArr", "donald.patteAv", "donald.corps", "donald.veste", "donald.lisere", "donald.poches", "donald.fermeture", "donald.brasAv.manche", "donald.cape", "donald.bordureCape", "donald.col", "donald.fermoir", "donald.bonnetPli", "donald.crane", "donald.becBas", "donald.bouche", "donald.langue", "donald.becHaut", "donald.oeilD", "donald.oeilG", "donald.bonnet", "donald.fermetureBonnet", "donald.bandeBonnet", "donald.tirette", "donald.baton", "donald.brasAv.bras", "donald.brasAv.bracelet", "donald.brasAv.main"]}};
export const HAUTEUR = { dingo: DINGO_H, donald: DONALD_H };

/* ===================== MESURE ET PIVOTS ===================== */
// Chaque pièce est dessinée une fois sans transformation pour relever sa
// boîte ; les pivots par défaut (centre de la boîte) en découlent.
const etat = {};
const neutre = () => ({ dx: 0, dy: 0, ex: 1, ey: 1, rot: 0 });
NOEUDS.forEach(n => { etat[n.id] = neutre(); n.piv = n.pivot || null; });
{
  const mesureCv = document.createElement('canvas').getContext('2d');
  // Comme l'atelier : on mesure avec le trait A. Les marges du trait entrent
  // dans les boîtes, donc dans les pivots ; mesurer autrement déplacerait les
  // pièces tournées ou mises à l'échelle autour de leur centre.
  ST = STYLES.A;
  for (const n of PIECES_) {
    MESURE = { bb: [Infinity, Infinity, -Infinity, -Infinity], couleurs: new Set() };
    mesureCv.setTransform(1, 0, 0, 1, 0, 0);
    n.f(mesureCv);
    n.box = MESURE.bb;
  }
  MESURE = null;
  const boiteDans = n => {
    if (!n.groupe) return n.box;
    const bb = [Infinity, Infinity, -Infinity, -Infinity];
    for (const e of enfants(n)) {
      const b = boiteDans(e);
      bb[0] = Math.min(bb[0], b[0]); bb[1] = Math.min(bb[1], b[1]); bb[2] = Math.max(bb[2], b[2]); bb[3] = Math.max(bb[3], b[3]);
    }
    return bb;
  };
  for (const n of [...NOEUDS].reverse()) if (!n.piv) { const b = boiteDans(n); n.piv = [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
}
for (const [id, v] of Object.entries(VALIDES.elements)) {
  if (etat[id]) etat[id] = { dx: v.dx, dy: v.dy, ex: v.ex, ey: v.ey, rot: (v.rot || 0) * Math.PI / 180 };
}
const CACHES = new Set(VALIDES.caches || []);
const ORDRE = {};
for (const p of ['dingo', 'donald']) {
  const tous = PIECES_.filter(n => n.perso === p).map(n => n.id);
  const l = ((VALIDES.ordre || {})[p] || []).filter(id => tous.includes(id));
  ORDRE[p] = [...l, ...tous.filter(id => !l.includes(id))];
}
for (const [p, c] of Object.entries(VALIDES.couleurs || {})) Object.assign(p === 'dingo' ? DI : DO, c);

function locale(n, pose) {
  const v = etat[n.id], q = pose && pose[n.id], p = n.piv;
  const dx = v.dx + (q && q.dx || 0), dy = v.dy + (q && q.dy || 0);
  const rot = v.rot + (q && q.rot || 0), ex = v.ex * (q && q.ex || 1), ey = v.ey * (q && q.ey || 1);
  return new DOMMatrix().translate(p[0] + dx, p[1] + dy).rotate(rot * 180 / Math.PI).scale(ex, ey).translate(-p[0], -p[1]);
}
function monde(n, pose) {
  let m = locale(n, pose);
  for (let q = parentDe(n); q; q = parentDe(q)) m = locale(q, pose).multiply(m);
  return m;
}
const visible = n => { for (let q = n; q; q = parentDe(q)) if (CACHES.has(q.id)) return false; return true; };

/* ===================== LE DESSIN ===================== */
export function dessinerPerso(g, perso, { style = STYLES.D, pose = null } = {}) {
  ST = style;
  for (const id of ORDRE[perso]) {
    const n = PAR_ID[id];
    if (!visible(n)) continue;
    const m = monde(n, pose);
    g.save(); g.transform(m.a, m.b, m.c, m.d, m.e, m.f);
    n.f(g);
    g.restore();
  }
}
// Les identifiants des pièces et des dossiers, pour animer par `pose`.
export const PIECES = NOEUDS.map(n => ({ id: n.id, nom: n.nom, perso: n.perso, groupe: !!n.groupe, parent: n.parent || null, pivot: n.piv }));
