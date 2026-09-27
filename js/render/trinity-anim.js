import { dessinerPerso, styleEntre, HAUTEUR, VALIDES, PIECES } from './trinity.js';
import { R_APPARITION as RA, R_DINGO as RD, R_DONALD as RO, TRINITE_DUREE, INCANTE, BRASIER_VOL } from '../data/trinite-reglages.js';

// ---------------------------------------------------------------------------
// TRINITÉ À L'ÉCRAN : Donald et Dingo dans le match.
//
// Tout vient des trois mockups validés — l'apparition (sora-trinity-anim),
// Dingo gardien (sora-trinity-dingo), Donald et le Brasier
// (sora-trinity-donald) — avec leurs réglages, repris tels quels dans
// data/trinite-reglages.js. Les gestes, les os et les effets sont les leurs,
// recopiés sans retouche : seule change la façon de savoir OÙ on en est, qui
// vient ici de la scène G.trinite au lieu d'une ligne de temps.
//
// Le rendu est une FONCTION DE LA SCÈNE : il ne garde rien d'une image à
// l'autre. L'invité, qui reçoit la scène de l'hôte, voit donc la même chose.
//
// On dessine dans le repère du monde tel que render() l'a posé (miroir de
// l'invité compris) : jamais de setTransform, sauf pour recopier un calque.
// ---------------------------------------------------------------------------

const S = 1.6;                           // une unité de jeu en pixels du monde, comme SCALE dans render.js
const ECH = { dingo: 60 * 1.3 / HAUTEUR.dingo, donald: 60 * .82 / HAUTEUR.donald };
const TAILLE = { dingo: 60 * 1.3, donald: 60 * .82 };
// Les positions du jeu sont celles du CENTRE d'un sprite de joueur : ses pieds
// tombent 30 unités plus bas (voir drawPlayer). Donald et Dingo se posent sur
// le même sol.
const PIEDS = 30 * S;

const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lisse = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const sortie = x => 1 - Math.pow(1 - clamp(x), 3);
const ressortRetour = (x, d) => { x = clamp(x); return 1 - Math.pow(1 - x, 2) * Math.cos(x * Math.PI * (1 + d * 1.6)) * (1 - x * .2); };
const alea = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const deg = d => d * Math.PI / 180;
const TAU = Math.PI * 2;

/* ===================== LES OS ===================== */
const PIV = Object.fromEntries(PIECES.map(p => [p.id, p.pivot]));
// Tourner une pièce autour d'une suite d'articulations (de la plus proche à la
// plus lointaine) revient à tourner autour de son pivot, puis à la déplacer :
// c'est ce que `pose` sait exprimer.
function autour(id, rotations) {
  const p = PIV[id], v = VALIDES.elements[id] || { dx: 0, dy: 0 };
  const x0 = p[0] + v.dx, y0 = p[1] + v.dy;
  let x = x0, y = y0, rot = 0;
  for (const [[jx, jy], a] of rotations) {
    const c = Math.cos(a), s = Math.sin(a), dx = x - jx, dy = y - jy;
    x = jx + dx * c - dy * s; y = jy + dx * s + dy * c; rot += a;
  }
  return { dx: x - x0, dy: y - y0, rot };
}
function tournePoint([x, y], rotations) {
  for (const [[jx, jy], a] of rotations) { const c = Math.cos(a), s = Math.sin(a), dx = x - jx, dy = y - jy; x = jx + dx * c - dy * s; y = jy + dx * s + dy * c; }
  return [x, y];
}
function ajoute(pose, id, q) {
  const o = pose[id] || (pose[id] = { dx: 0, dy: 0, rot: 0, ex: 1, ey: 1 });
  o.dx += q.dx || 0; o.dy += q.dy || 0; o.rot += q.rot || 0; o.ex *= q.ex || 1; o.ey *= q.ey || 1;
}
function melanger(a, b, k) {
  if (typeof a === 'number') return a + (b - a) * k;
  const o = {}; for (const c of Object.keys(a)) o[c] = melanger(a[c], b[c], k); return o;
}

/* ===================== DINGO ===================== */
const OS_DI = {
  arr: { hanche: [-8.5, -57], genou: [-10.3, -32], cheville: [-10, -9.5] },
  av: { hanche: [8.5, -57], genou: [10.5, -32], cheville: [11, -9.5] },
  taille: [0, -60], epauleAv: [9, -83], epauleArr: [-9, -83],
};
const CUISSE = { arr: ['dingo.pantalonArr', 'dingo.sangleArr', 'dingo.pocheCuisse'], av: ['dingo.pantalonAv', 'dingo.sangleAv'] };
const MOLLET = { arr: ['dingo.guetreArr', 'dingo.jambeArr', 'dingo.anneauArr'], av: ['dingo.guetreAv', 'dingo.jambeAv', 'dingo.anneauAv'] };
const PIED = { arr: ['dingo.chaussureArr'], av: ['dingo.chaussureAv'] };
const neutreDi = () => ({ jambes: { arr: { cuisse: 0, genou: 0, pied: 0 }, av: { cuisse: 0, genou: 0, pied: 0 } }, bras: { av: 0, arr: 0 },
  penche: 0, tete: 0, oreilles: 0, chapeau: 0, x: 0, y: 0, sx: 1, sy: 1, cligne: 0 });
function poseDingo(a) {
  const pose = {};
  for (const cote of ['arr', 'av']) {
    const j = a.jambes[cote], o = OS_DI[cote];
    const hanche = [o.hanche, j.cuisse], genou = [o.genou, j.genou], cheville = [o.cheville, j.pied];
    for (const id of CUISSE[cote]) ajoute(pose, id, autour(id, [hanche]));
    for (const id of MOLLET[cote]) ajoute(pose, id, autour(id, [genou, hanche]));
    for (const id of PIED[cote]) ajoute(pose, id, autour(id, [cheville, genou, hanche]));
  }
  const penche = [OS_DI.taille, a.penche];
  ajoute(pose, 'dingo.haut', autour('dingo.haut', [penche]));
  ajoute(pose, 'dingo.tete', autour('dingo.tete', [[PIV['dingo.tete'], a.tete], penche]));
  ajoute(pose, 'dingo.brasAv', autour('dingo.brasAv', [[OS_DI.epauleAv, a.bras.av], penche]));
  ajoute(pose, 'dingo.brasArr', autour('dingo.brasArr', [[OS_DI.epauleArr, a.bras.arr], penche]));
  for (const id of ['dingo.hanches', 'dingo.ceinture', 'dingo.boucle']) ajoute(pose, id, autour(id, [[OS_DI.taille, a.penche * .3]]));
  ajoute(pose, 'dingo.oreilleNuque', { rot: a.oreilles });
  ajoute(pose, 'dingo.oreilleMachoire', { rot: a.oreilles * .8 });
  ajoute(pose, 'dingo.chapeauD', { rot: a.chapeau });
  if (a.cligne > 0) for (const id of ['dingo.oeilG', 'dingo.oeilD']) ajoute(pose, id, { ey: 1 - .88 * a.cligne });
  ajoute(pose, 'dingo', { dx: a.x, dy: a.y, ex: a.sx, ey: a.sy });
  const b = tournePoint([12.5, -66], [[OS_DI.epauleAv, a.bras.av], penche]);
  const pieds = {};
  for (const cote of ['arr', 'av']) {
    const j = a.jambes[cote], o = OS_DI[cote];
    pieds[cote] = tournePoint([o.cheville[0] + (cote === 'av' ? 8 : -8), -1], [[o.cheville, j.pied], [o.genou, j.genou], [o.hanche, j.cuisse]]);
  }
  const monte = ([x, y]) => [x * a.sx + a.x, y * a.sy + a.y];
  return { pose, bouclier: monte(b), pieds: { arr: monte(pieds.arr), av: monte(pieds.av) } };
}
const cligneDi = t => { if (!RD.clignement) return 0; const p = (t + 1.3) % 2.9; return p < .14 ? Math.sin(p / .14 * Math.PI) : 0; };
function gardeDi(t) {
  const a = neutreDi(), r = Math.sin(t * 2.4) * RD.respiration, f = RD.flexion;
  for (const c of ['arr', 'av']) { a.jambes[c].cuisse = deg(-f * 2.2); a.jambes[c].genou = deg(f * 4.4); a.jambes[c].pied = deg(-f * 2.2); }
  a.y = f * .9 + r * .3; a.penche = deg(3 + r * .6);
  a.sy = 1 + .006 * r; a.sx = 1 - .004 * r;
  a.cligne = cligneDi(t);
  return a;
}
function courseDi(t) {
  const a = neutreDi(), phi = t / RD.cycle * TAU;
  for (const [c, psi] of [['av', 0], ['arr', Math.PI]]) {
    const s = Math.sin(phi + psi), j = a.jambes[c];
    j.cuisse = deg(-RD.cuisse * s);
    const releve = Math.pow(.5 + .5 * Math.cos(phi + psi + .7), 2);
    j.genou = deg(RD.genou * releve);
    j.pied = deg(-RD.pied * s * .6 - RD.genou * releve * .35);
  }
  a.bras.av = deg(RD.bras * Math.sin(phi));
  a.bras.arr = deg(-RD.bras * Math.sin(phi));
  const haut = 1 - Math.abs(Math.sin(phi));
  a.y = -RD.rebond * haut;
  const sq = RD.squash * (haut * 2 - 1);
  a.sy = 1 + sq * .8; a.sx = 1 - sq * .5;
  a.penche = deg(RD.penche + 2 * Math.sin(phi * 2));
  a.tete = deg(RD.tete * Math.sin(phi * 2 + .6));
  a.cligne = cligneDi(t);
  return a;
}
// Le coup de bouclier, avec son arrêt sur image. `t` : l'horloge du geste ;
// `horloge` : celle de la scène, qui fait respirer la garde dessous.
const COUP_ARME = RD.armeDuree, COUP_FRAPPE = COUP_ARME + RD.frappeDuree, COUP_ARRET = COUP_FRAPPE + RD.arret;
function coupDi(t, horloge) {
  const a = gardeDi(horloge);
  let bras = 0, tors = 0, pas = 0, crouch = 0, sx = 1, sy = 1;
  if (t < COUP_ARME) {
    const u = sortie(t / COUP_ARME);
    bras = RD.armeAngle * u; tors = -RD.torsion * .5 * u; crouch = 2.5 * u;
    sy = 1 - RD.squash * .9 * u; sx = 1 + RD.squash * .6 * u;
  } else if (t < COUP_FRAPPE) {
    const u = sortie((t - COUP_ARME) / RD.frappeDuree);
    bras = RD.armeAngle + (-RD.frappeAngle - RD.armeAngle) * u;
    tors = -RD.torsion * .5 + RD.torsion * 1.5 * u; pas = RD.pas * u; crouch = 2.5 * (1 - u);
    sy = 1 + RD.squash * .8 * u; sx = 1 - RD.squash * .5 * u;
  } else if (t < COUP_ARRET) {
    bras = -RD.frappeAngle; tors = RD.torsion; pas = RD.pas; sy = 1 + RD.squash * .8; sx = 1 - RD.squash * .5;
  } else {
    const u = (t - COUP_ARRET) / RD.retourDuree, k = ressortRetour(u, RD.depassement);
    bras = -RD.frappeAngle * (1 - k); tors = RD.torsion * (1 - k); pas = RD.pas * (1 - lisse(u));
    sy = 1 + RD.squash * .8 * (1 - k); sx = 1 - RD.squash * .5 * (1 - k);
  }
  a.bras.av = deg(bras); a.bras.arr = deg(-bras * .35);
  a.penche += deg(tors); a.x = pas; a.y += crouch; a.sx *= sx; a.sy *= sy;
  a.jambes.av.cuisse += deg(-pas * 3); a.jambes.av.genou += deg(pas * 2);
  return a;
}
const GESTES_DI = { garde: (u, t) => gardeDi(t), course: (u, t) => courseDi(t), coup: coupDi };

/* ===================== DONALD ===================== */
const OS_DO = {
  arr: { hanche: [-6.5, -25], cheville: [-8.5, -5] },
  av: { hanche: [6.5, -25], cheville: [8.5, -5] },
  bassin: [0, -24], epauleAv: [12, -60], epauleArr: [-11.5, -61],
  poignee: [36.3, -54.5],           // la main qui tient le bâton
  pointe: [45.7, -81.6],            // le haut du bâton, d'où part le sort
  queue: [-18, -42], charniere: [10, -69],
};
const JAMBE = { arr: 'donald.jambeArr', av: 'donald.jambeAv' }, PATTE = { arr: 'donald.patteArr', av: 'donald.patteAv' };
const neutreDo = () => ({ jambes: { arr: { cuisse: 0, pied: 0 }, av: { cuisse: 0, pied: 0 } }, bras: { av: 0, arr: 0 },
  baton: 0, dandine: 0, tete: 0, bec: 0, queue: 0, pli: 0, tirette: 0, x: 0, y: 0, sx: 1, sy: 1, cligne: 0, charge: 0 });
function poseDonald(a) {
  const pose = {};
  for (const cote of ['arr', 'av']) {
    const j = a.jambes[cote], o = OS_DO[cote];
    ajoute(pose, JAMBE[cote], autour(JAMBE[cote], [[o.hanche, j.cuisse]]));
    ajoute(pose, PATTE[cote], autour(PATTE[cote], [[o.cheville, j.pied], [o.hanche, j.cuisse]]));
  }
  const dandine = [OS_DO.bassin, a.dandine];
  ajoute(pose, 'donald.corpsD', autour('donald.corpsD', [dandine]));
  ajoute(pose, 'donald.tenue', autour('donald.tenue', [dandine]));
  ajoute(pose, 'donald.tete', autour('donald.tete', [[PIV['donald.tete'], a.tete], dandine]));
  ajoute(pose, 'donald.brasAv', autour('donald.brasAv', [[OS_DO.epauleAv, a.bras.av], dandine]));
  ajoute(pose, 'donald.brasArr', autour('donald.brasArr', [[OS_DO.epauleArr, a.bras.arr], dandine]));
  ajoute(pose, 'donald.baton', autour('donald.baton', [[OS_DO.poignee, a.baton]]));
  ajoute(pose, 'donald.queue', autour('donald.queue', [[OS_DO.queue, a.queue]]));
  ajoute(pose, 'donald.becBas', autour('donald.becBas', [[OS_DO.charniere, a.bec]]));
  ajoute(pose, 'donald.langue', autour('donald.langue', [[OS_DO.charniere, a.bec * .6]]));
  ajoute(pose, 'donald.bonnetPli', { rot: a.pli });
  ajoute(pose, 'donald.tirette', { rot: a.tirette });
  if (a.cligne > 0) for (const id of ['donald.oeilG', 'donald.oeilD']) ajoute(pose, id, { ey: 1 - .9 * a.cligne });
  ajoute(pose, 'donald', { dx: a.x, dy: a.y, ex: a.sx, ey: a.sy });
  const p = tournePoint(OS_DO.pointe, [[OS_DO.poignee, a.baton], [OS_DO.epauleAv, a.bras.av], dandine]);
  return { pose, pointe: [p[0] * a.sx + a.x, p[1] * a.sy + a.y] };
}
const cligneDo = t => { if (!RO.clignement) return 0; const p = (t + .7) % 3.3; return p < .13 ? Math.sin(p / .13 * Math.PI) : 0; };
function gardeDo(t) {
  const a = neutreDo(), r = Math.sin(t * 2.6) * RO.respiration;
  a.y = r * .25; a.sy = 1 + .008 * r; a.sx = 1 - .005 * r;
  // il tapote du pied avant, impatient, par petites rafales
  if (RO.tapote) { const p = t % 1.6; if (p < .5) a.jambes.av.pied = deg(-12 * Math.max(0, Math.sin(p / .5 * Math.PI * 3))); }
  a.queue = deg(4 * Math.sin(t * 3.1));
  a.cligne = cligneDo(t);
  return a;
}
function trotteDo(t) {
  const a = neutreDo(), phi = t / RO.cycle * TAU, s = Math.sin(phi);
  a.jambes.av.cuisse = deg(-RO.jambes * s); a.jambes.arr.cuisse = deg(RO.jambes * s);
  a.jambes.av.pied = deg(RO.pied * s * .6 + RO.pied * Math.max(0, Math.cos(phi)) * .6);
  a.jambes.arr.pied = deg(-RO.pied * s * .6 + RO.pied * Math.max(0, -Math.cos(phi)) * .6);
  const haut = 1 - Math.abs(s);
  a.y = -RO.rebond * haut;
  const sq = RO.squash * (haut * 2 - 1); a.sy = 1 + sq * .8; a.sx = 1 - sq * .5;
  // le dandinement du canard : tout le haut bascule d'un pied sur l'autre
  a.dandine = deg(RO.dandine * s);
  a.bras.av = deg(-RO.brasTrot * s * .5); a.bras.arr = deg(RO.brasTrot * s);
  a.queue = deg(RO.queue * Math.sin(phi * 2 + .5));
  a.tete = deg(-RO.dandine * .4 * s);
  a.cligne = cligneDo(t);
  return a;
}
// Le bâton est tenu par le bras : tourner le bras le fait basculer avec lui.
// On le redresse donc à part — levé, il reste pointé vers le ciel ; pointé,
// il vise le disque (environ 70° à droite de la verticale).
const VISEE = 70;
function incanteDo(t, horloge) {
  const P = INCANTE, a = gardeDo(horloge), A = RO.armeAngle;
  a.jambes.av.pied = 0;
  let bras = 0, arr = 0, baton = 0, bec = 0, charge = 0, sx = 1, sy = 1, y = 0;
  if (t < P.arme) {
    const u = sortie(t / RO.armeDuree);
    bras = -A * u; baton = A * u; arr = -45 * u; bec = RO.bec * .4 * u; charge = .3 * u;
    sy = 1 - RO.squash * u; sx = 1 + RO.squash * .6 * u; y = 1.5 * u;
  } else if (t < P.tour) {
    const u = (t - P.arme) / RO.tourDuree;
    bras = -A + 6 * Math.sin(u * Math.PI * 4); arr = -45 - 10 * Math.sin(u * TAU);
    baton = A + 360 * RO.tours * lisse(u); bec = RO.bec * (.7 + .3 * Math.sin(u * Math.PI * 6)); charge = .3 + .7 * u;
    sy = 1 - RO.squash * (1 - u) + RO.squash * .5 * u; sx = 1 + RO.squash * .6 * (1 - u); y = 1.5 * (1 - u) - 2 * Math.sin(u * Math.PI);
  } else if (t < P.lancer) {
    const u = sortie((t - P.tour) / RO.lancerDuree);
    bras = -A + (RO.lancerAngle + A) * u; baton = A + (VISEE - RO.lancerAngle - A) * u; arr = -45 + 60 * u; bec = RO.bec; charge = 1;
    sy = 1 + RO.squash * u; sx = 1 - RO.squash * .6 * u;
  } else {
    const u = (t - P.lancer) / RO.retourDuree, k = ressortRetour(u, RO.depassement);
    bras = RO.lancerAngle * (1 - k); baton = (VISEE - RO.lancerAngle) * (1 - k); arr = 15 * (1 - k);
    bec = RO.bec * (1 - lisse(u * 1.5)); charge = 1 - lisse(u * 2);
    sy = 1 + RO.squash * (1 - k); sx = 1 - RO.squash * .6 * (1 - k);
  }
  a.bras.av = deg(bras); a.bras.arr = deg(arr); a.baton = deg(baton); a.bec = deg(bec); a.charge = charge;
  a.sx *= sx; a.sy *= sy; a.y += y;
  return a;
}
const GESTES_DO = { garde: (u, t) => gardeDo(t), trotte: (u, t) => trotteDo(t), incante: incanteDo };

/* ===================== LES GESTES FONDUS ===================== */
// L'état d'un personnage `recul` secondes plus tôt. La garde et la course ont
// l'horloge de la scène ; le coup et l'incantation, la leur. Pendant le fondu,
// le geste précédent CONTINUE de bouger au lieu de se figer.
function etat(o, T, gestes, transition, recul = 0) {
  const t = T.t - recul, u = Math.max(0, o.gT - recul);
  let a = (gestes[o.geste] || gestes.garde)(u, t);
  if (transition > 0 && u < transition && o.prec && gestes[o.prec]) {
    const aPrec = gestes[o.prec](o.precT + u, t);
    a = melanger(aPrec, a, lisse(u / transition));
  }
  return a;
}
// Le ballant : oreilles, chapeau et tête suivent la VITESSE du corps avec un
// temps de retard, échantillonnée dans le passé.
function dingoAvecBallant(D, T) {
  const a = etat(D, T, GESTES_DI, RD.transition);
  const dt = .05, lag = .07;
  const b = etat(D, T, GESTES_DI, RD.transition, lag), c = etat(D, T, GESTES_DI, RD.transition, lag + dt);
  const vy = (b.y - c.y) / dt, vp = (b.penche - c.penche) / dt, vx = (b.x - c.x) / dt;
  a.oreilles += deg(RD.oreilles * RD.ressort * clamp(vy / 60 - vp * .6 - vx / 50, -1.2, 1.2)) + deg(RD.oreilles * .15 * Math.sin(T.t * 3));
  a.chapeau += deg(RD.chapeau * RD.ressort * clamp(vy / 70 - vp * .8 - vx / 60, -1.2, 1.2));
  a.tete += deg(3 * RD.ressort * clamp(vy / 80, -1, 1));
  return a;
}
function donaldAvecBallant(O, T) {
  const a = etat(O, T, GESTES_DO, RO.transition);
  const dt = .04, lag = .06;
  const b = etat(O, T, GESTES_DO, RO.transition, lag), c = etat(O, T, GESTES_DO, RO.transition, lag + dt);
  const vy = (b.y - c.y) / dt, vd = (b.dandine - c.dandine) / dt;
  a.pli += deg(RO.bonnet * RO.ressort * clamp(vy / 40 - vd * .5, -1.2, 1.2));
  a.tirette += deg(RO.bonnet * 1.3 * RO.ressort * clamp(vy / 35 - vd * .7, -1.3, 1.3));
  a.tete += deg(2 * RO.ressort * clamp(vy / 60, -1, 1));
  return a;
}

/* ===================== L'APPARITION ET LE DÉPART ===================== */
function apparition(t, retard) {
  const ta = t - retard;
  const o = { visible: false, k: 1, blanc: 0, echelle: 1, alpha: 1, montee: 0, etire: 1, dissous: 0 };
  if (ta < RA.apparition) return o;
  o.visible = true;
  const tp = ta - RA.apparition;
  // le rebond : il sort un peu petit, dépasse, puis se pose
  if (tp < RA.popDuree) {
    const u = tp / RA.popDuree;
    o.echelle = u < .55 ? .72 + (RA.pop - .72) * sortie(u / .55) : RA.pop + (1 - RA.pop) * lisse((u - .55) / .45);
  }
  o.blanc = RA.blanchiment * (1 - sortie(tp / RA.blanchimentDuree));
  o.k = 1 - lisse((ta - RA.transitionDebut) / RA.transitionDuree);
  // le départ : D -> E, puis dissolution
  const td = ta - TRINITE_DUREE;
  if (td > 0) {
    o.k = Math.max(o.k, lisse(td / RA.retourE));
    const tq = td - RA.retourE;
    if (tq > 0) {
      const u = clamp(tq / RA.dissolution);
      o.dissous = u; o.alpha = 1 - lisse(u); o.montee = RA.montee * sortie(u); o.etire = 1 + .3 * u;
      o.blanc = Math.max(o.blanc, .7 * lisse(u * 1.4));
      if (u >= 1) o.visible = false;
    }
  }
  return o;
}
// L'éclat : un disque de lumière blanche et dorée, un anneau qui s'élargit et
// des rayons qui tournent, centré à mi-hauteur du personnage. En unités de jeu.
function eclat(g, cx, cy, t) {
  if (t < 0) return;
  const monte = clamp(t / RA.flashOuverture), tombe = t > RA.flashOuverture ? clamp((t - RA.flashOuverture) / RA.flashExtinction) : 0;
  const force = RA.flashIntensite * (t < RA.flashOuverture ? sortie(monte) : 1 - lisse(tombe));
  if (force <= 0) return;
  const r = RA.flashRayon * (.35 + .65 * sortie(monte) + .25 * tombe);
  g.save(); g.translate(cx, cy); g.scale(S, S); g.globalCompositeOperation = 'lighter';
  const d = g.createRadialGradient(0, 0, 0, 0, 0, r);
  d.addColorStop(0, 'rgba(255,255,240,' + force + ')');
  d.addColorStop(.35, 'rgba(255,226,120,' + force * .8 + ')');
  d.addColorStop(1, 'rgba(255,190,60,0)');
  g.fillStyle = d; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,236,160,' + force * .7 + ')'; g.lineCap = 'round';
  for (let i = 0; i < RA.flashRayons; i++) {
    const a = i / RA.flashRayons * TAU + t * 1.8;
    const r0 = r * .25, r1 = r * (.9 + .35 * alea(i + 3));
    g.lineWidth = 1.6 + 1.4 * alea(i);
    g.beginPath(); g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1); g.stroke();
  }
  const ra = RA.flashRayon * (.4 + .7 * sortie(t / (RA.flashOuverture + RA.flashExtinction)));
  g.strokeStyle = 'rgba(255,240,190,' + force * .6 + ')'; g.lineWidth = 2;
  g.beginPath(); g.arc(0, 0, ra, 0, TAU); g.stroke();
  g.restore();
}
// Les étincelles de la dissolution : elles montent depuis la silhouette.
function etincellesDepart(g, x, y, qui, s) {
  if (s.dissous <= 0 || RA.etincelles <= 0) return;
  const h = TAILLE[qui], graine = qui === 'donald' ? 500 : 0;
  g.save(); g.translate(x, y); g.scale(S, S); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < RA.etincelles; i++) {
    const dep = alea(i * 3 + graine), vie = clamp((s.dissous - dep * .4) / .6);
    if (vie <= 0 || vie >= 1) continue;
    const px = (alea(i * 7 + 1) - .5) * h * .55, y0 = -h * alea(i * 11 + 2);
    const py = y0 - vie * (18 + 30 * alea(i * 13 + 3)), a = (1 - vie) * .9;
    const r = 1.2 + 1.6 * alea(i * 17 + 4);
    const d = g.createRadialGradient(px, py, 0, px, py, r * 2.4);
    d.addColorStop(0, 'rgba(255,248,210,' + a + ')'); d.addColorStop(1, 'rgba(255,200,80,0)');
    g.fillStyle = d; g.beginPath(); g.arc(px, py, r * 2.4, 0, TAU); g.fill();
  }
  g.restore();
}

/* ===================== PEINDRE UN PERSONNAGE ===================== */
// Pendant la dissolution, le personnage est peint à part puis recopié d'un
// bloc avec sa transparence : peint en direct, ses pièces se verraient à
// travers les unes des autres.
let calque = null;
function surCalque(g, peindre, alpha) {
  if (alpha >= 1) { peindre(g); return; }
  const W = g.canvas.width, H = g.canvas.height;
  if (!calque || calque.width !== W || calque.height !== H) { calque = document.createElement('canvas'); calque.width = W; calque.height = H; }
  const q = calque.getContext('2d');
  q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, W, H);
  q.setTransform(g.getTransform());
  peindre(q);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha *= alpha; g.drawImage(calque, 0, 0); g.restore();
}
// Place le personnage, pieds en (x, y), tourné vers `face`, et le peint dans
// l'état de son apparition. Renvoie un convertisseur de son repère de dessin
// vers le monde, pour poser les effets au bon endroit.
function peindre(g, qui, x, y, face, pose, s) {
  const e = ECH[qui] * S, sx = face * e * s.echelle / s.etire, sy = e * s.echelle * s.etire, y0 = y - s.montee * S;
  surCalque(g, q => {
    q.save(); q.translate(x, y0); q.scale(sx, sy);
    dessinerPerso(q, qui, { style: styleEntre(s.k), pose, blanc: s.blanc });
    q.restore();
  }, s.alpha);
  return ([px, py]) => ({ x: x + px * sx, y: y0 + py * sy });
}
// Donald et Dingo regardent l'adversaire, comme Sora dans les mockups.
const faceDe = T => (T.owner && T.owner.side === 1 ? 1 : -1);
function ombre(g, x, y, rx, ry, a) {
  g.save(); g.globalAlpha *= a; g.fillStyle = '#000';
  g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.fill(); g.restore();
}

/* ===================== DINGO À L'ÉCRAN ===================== */
// La poussière des pas : à chaque pose de pied pendant la course, une petite
// bouffée qui s'étale et s'efface, laissée là où Dingo était.
function poussiere(g, D, T, face, e) {
  if (RD.poussiere <= 0 || D.geste !== 'course') return;
  const demi = RD.cycle / 2;
  for (let k = 0; k < 8; k++) {
    const n = Math.floor(T.t / demi) - k, tc = n * demi, age = T.t - tc;
    if (age < 0 || age > .5 || age > D.gT) continue;
    const cote = n % 2 ? 'arr' : 'av';
    const { pieds } = poseDingo(etat(D, T, GESTES_DI, RD.transition, age));
    const px = D.x + face * pieds[cote][0] * ECH.dingo * S, py = D.y + PIEDS - D.vy * age - .5 * ECH.dingo * S;
    for (let i = 0; i < RD.poussiere; i++) {
      const ang = Math.PI + (alea(n * 17 + i) - .5) * 1.6, v = (8 + 14 * alea(n * 31 + i)) * e;
      const x = px + face * Math.cos(ang) * v * age * 2.2, y = py - Math.abs(Math.sin(ang)) * v * age * .9 - age * 6 * e;
      const rr = (1.2 + 2 * alea(n * 7 + i)) * e * (1 + age * 2.5);
      g.fillStyle = 'rgba(210,200,180,' + (.45 * (1 - age / .5)) + ')';
      g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
    }
  }
}
// La traînée du bouclier pendant la frappe : quelques positions passées.
function traineeBouclier(g, D, T, vers, e) {
  if (RD.trainee <= 0 || D.geste !== 'coup') return;
  const pts = [], fin = COUP_FRAPPE + .3 * (RD.arret + .16);
  for (let i = 0; i < 8; i++) {
    const u = D.gT - i * .012;
    if (u < COUP_ARME || u >= fin) break;
    pts.push(vers(poseDingo(etat(D, T, GESTES_DI, RD.transition, i * .012)).bouclier));
  }
  if (pts.length < 2) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
  for (let i = 1; i < pts.length; i++) {
    const v = 1 - i / pts.length;
    g.strokeStyle = 'rgba(160,210,255,' + (.6 * v * RD.trainee) + ')'; g.lineWidth = e * 14 * v;
    g.beginPath(); g.moveTo(pts[i - 1].x, pts[i - 1].y); g.lineTo(pts[i].x, pts[i].y); g.stroke();
  }
  g.restore();
}
// L'impact : anneau de choc, étincelles, éclat sur le bouclier.
function impact(g, k, p, face, e) {
  if (k <= 0) return;
  const v = 1 - k;
  g.save(); g.globalCompositeOperation = 'lighter';
  const r = e * 14 * (.6 + v * 1.2);
  const d = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  d.addColorStop(0, 'rgba(255,255,240,' + k + ')'); d.addColorStop(.4, 'rgba(150,210,255,' + k * .75 + ')'); d.addColorStop(1, 'rgba(80,140,255,0)');
  g.fillStyle = d; g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.fill();
  if (RD.anneau > 0) {
    g.strokeStyle = 'rgba(200,230,255,' + k * .9 + ')'; g.lineWidth = e * 1.6 * k;
    g.beginPath(); g.arc(p.x, p.y, e * 10 * RD.anneau * (.4 + v * 2.2), 0, TAU); g.stroke();
  }
  g.strokeStyle = 'rgba(255,240,190,' + k + ')'; g.lineCap = 'round';
  for (let i = 0; i < RD.etincelles; i++) {
    const a0 = -1.1 + (alea(i * 3) - .5) * 2.6, ang = face > 0 ? a0 : Math.PI - a0;
    const l0 = e * (4 + v * 22 * (.6 + alea(i))), l1 = l0 + e * 5 * k;
    g.lineWidth = e * .9 * k;
    g.beginPath(); g.moveTo(p.x + Math.cos(ang) * l0, p.y + Math.sin(ang) * l0); g.lineTo(p.x + Math.cos(ang) * l1, p.y + Math.sin(ang) * l1); g.stroke();
  }
  g.restore();
}
function dessinerDingo(g, T) {
  const D = T.dingo, s = apparition(T.t, 0), face = faceDe(T), y = D.y + PIEDS;
  eclat(g, D.x, y - TAILLE.dingo * .5 * S, T.t);
  if (!s.visible) return;
  const a = dingoAvecBallant(D, T), cp = poseDingo(a);
  ombre(g, D.x, y, 26 * S * s.echelle, 3 * S, .25 * s.alpha);
  poussiere(g, D, T, face, S * .8);
  const vers = peindre(g, 'dingo', D.x, y, face, cp.pose, s);
  traineeBouclier(g, D, T, vers, S * .75);
  const ti = T.t - D.impact;
  if (ti >= 0) impact(g, clamp(1 - ti / (RD.arret + .16)), vers(cp.bouclier), face, S);
  etincellesDepart(g, D.x, y, 'dingo', s);
}

/* ===================== DONALD À L'ÉCRAN ===================== */
// Le cercle magique au sol pendant l'incantation : deux anneaux de braise qui
// tournent en sens contraire, des runes, une lueur.
function cercle(g, cx, cy, e, charge, t) {
  if (charge <= 0 || RO.cercle <= 0) return;
  const r = RO.cercle * e * (.6 + .4 * sortie(charge));
  g.save(); g.globalCompositeOperation = 'lighter';
  g.translate(cx, cy); g.scale(1, .32);
  const d = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.1);
  d.addColorStop(0, 'rgba(255,150,40,' + .35 * charge + ')'); d.addColorStop(1, 'rgba(255,90,20,0)');
  g.fillStyle = d; g.beginPath(); g.arc(0, 0, r * 1.1, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,190,80,' + .9 * charge + ')'; g.lineWidth = e * 1.2;
  g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  g.beginPath(); g.arc(0, 0, r * .72, 0, TAU); g.stroke();
  g.lineWidth = e * .8;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * TAU + t * 1.6, b = a + .18;
    g.beginPath(); g.moveTo(Math.cos(a) * r * .78, Math.sin(a) * r * .78); g.lineTo(Math.cos(b) * r * .94, Math.sin(b) * r * .94); g.stroke();
  }
  for (let i = 0; i < 3; i++) {
    const a = i / 3 * TAU - t * 2.2;
    g.beginPath(); g.moveTo(Math.cos(a) * r * .72, Math.sin(a) * r * .72);
    g.lineTo(Math.cos(a + 2.1) * r * .72, Math.sin(a + 2.1) * r * .72); g.stroke();
  }
  g.restore();
}
// Les étincelles du bâton pendant l'incantation.
function scintille(g, p, e, charge, t) {
  if (charge <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const d = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, e * 6 * charge);
  d.addColorStop(0, 'rgba(255,240,180,' + .9 * charge + ')'); d.addColorStop(.5, 'rgba(255,140,40,' + .5 * charge + ')'); d.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = d; g.beginPath(); g.arc(p.x, p.y, e * 6 * charge, 0, TAU); g.fill();
  for (let i = 0; i < 7; i++) {
    const a = t * (3 + alea(i) * 3) + i, rr = e * (3 + 4 * alea(i + 9)) * charge;
    g.fillStyle = 'rgba(255,230,150,' + .8 * charge + ')'; g.beginPath(); g.arc(p.x + Math.cos(a) * rr, p.y + Math.sin(a) * rr, e * .5, 0, TAU); g.fill();
  }
  g.restore();
}
function dessinerDonald(g, T) {
  const O = T.donald, s = apparition(T.t, RA.decalage), face = faceDe(T), y = O.y + PIEDS;
  eclat(g, O.x, y - TAILLE.donald * .5 * S, T.t - RA.decalage);
  if (!s.visible) return;
  const a = donaldAvecBallant(O, T), cp = poseDonald(a);
  ombre(g, O.x, y, 17 * S * s.echelle, 2.6 * S, .22 * s.alpha);
  cercle(g, O.x, y, S, a.charge * s.alpha, T.t);
  const vers = peindre(g, 'donald', O.x, y, face, cp.pose, s);
  scintille(g, vers(cp.pointe), S, a.charge * s.alpha, T.t);
  etincellesDepart(g, O.x, y, 'donald', s);
}

/* ===================== LE SORT ET LE FEU ===================== */
function boule(g, x, y, r, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  const d = g.createRadialGradient(x, y, 0, x, y, r * 2.2);
  d.addColorStop(0, 'rgba(255,255,230,1)'); d.addColorStop(.3, 'rgba(255,200,80,.95)'); d.addColorStop(.65, 'rgba(255,110,30,.6)'); d.addColorStop(1, 'rgba(200,40,10,0)');
  g.fillStyle = d; g.beginPath(); g.arc(x, y, r * 2.2 * (1 + .08 * Math.sin(t * 40)), 0, TAU); g.fill();
  g.restore();
}
function eclatFeu(g, x, y, e, k) {
  if (k <= 0) return;
  const v = 1 - k;
  g.save(); g.globalCompositeOperation = 'lighter';
  const r = e * 16 * (.5 + v * 1.4);
  const d = g.createRadialGradient(x, y, 0, x, y, r);
  d.addColorStop(0, 'rgba(255,250,220,' + k + ')'); d.addColorStop(.4, 'rgba(255,160,50,' + k * .8 + ')'); d.addColorStop(1, 'rgba(230,60,20,0)');
  g.fillStyle = d; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,210,120,' + k * .9 + ')'; g.lineWidth = e * 1.4 * k;
  g.beginPath(); g.arc(x, y, e * 10 * (.4 + v * 2), 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,220,140,' + k + ')'; g.lineCap = 'round';
  for (let i = 0; i < RO.etincelles; i++) {
    const a = alea(i * 5) * TAU, l0 = e * (3 + v * 20 * (.6 + alea(i))), l1 = l0 + e * 4 * k;
    g.lineWidth = e * .8 * k;
    g.beginPath(); g.moveTo(x + Math.cos(a) * l0, y + Math.sin(a) * l0); g.lineTo(x + Math.cos(a) * l1, y + Math.sin(a) * l1); g.stroke();
  }
  g.restore();
}
// Une flamme : quelques langues qui montent et vacillent autour d'un point.
function flammes(g, x, y, r, t, force, graine) {
  if (force <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter';
  const d = g.createRadialGradient(x, y, 0, x, y, r * 2.6);
  d.addColorStop(0, 'rgba(255,200,90,' + .7 * force + ')'); d.addColorStop(1, 'rgba(255,80,20,0)');
  g.fillStyle = d; g.beginPath(); g.arc(x, y, r * 2.6, 0, TAU); g.fill();
  for (let i = 0; i < 9; i++) {
    const cyc = (t * (1.6 + alea(graine + i) * 1.2) + alea(graine + i * 3)) % 1;
    const fx = x + (alea(graine + i * 7) - .5) * r * 1.8 + Math.sin(t * 9 + i) * r * .15;
    const fy = y - cyc * r * 2.4, fr = r * (.55 + .4 * alea(i + graine)) * (1 - cyc);
    const k = force * (1 - cyc);
    const f = g.createRadialGradient(fx, fy, 0, fx, fy, fr);
    f.addColorStop(0, 'rgba(255,245,200,' + k + ')'); f.addColorStop(.45, 'rgba(255,150,40,' + k * .8 + ')'); f.addColorStop(1, 'rgba(220,50,20,0)');
    g.fillStyle = f; g.beginPath(); g.arc(fx, fy, fr, 0, TAU); g.fill();
  }
  g.restore();
}
// Brasier : la boule de feu en arc, de la pointe du bâton (là où elle était
// au LANCER, même si le bâton bouge ensuite) jusqu'au disque de Sora, puis
// l'embrasement. `cible` : où est le disque.
function dessinerBrasier(g, T, cible) {
  const O = T.donald;
  if (!(O.lancer >= 0)) return;
  const tl = T.t - O.lancer;
  if (tl < 0) return;
  if (tl < BRASIER_VOL) {
    const cp = poseDonald(incanteDo(INCANTE.lancer, O.lancer)), e = ECH.donald * S, face = faceDe(T);
    const pointe = { x: O.x + face * cp.pointe[0] * e, y: O.y + PIEDS + cp.pointe[1] * e };
    const pos = u => ({ x: pointe.x + (cible.x - pointe.x) * u, y: pointe.y + (cible.y - pointe.y) * u - Math.sin(u * Math.PI) * RO.arc * S });
    const u = sortie(tl / BRASIER_VOL);
    for (let i = 1; i <= 10; i++) {
      const q = pos(clamp(u - i * .035)), k = (1 - i / 11) * RO.trainee;
      if (k > 0) boule(g, q.x, q.y, RO.boule * S * .45 * k, T.t);
    }
    const p = pos(u); boule(g, p.x, p.y, RO.boule * S * .5, T.t);
    return;
  }
  const ti = tl - BRASIER_VOL;
  if (ti < RO.arret + .3) eclatFeu(g, cible.x, cible.y, S * .6, clamp(1 - (ti - RO.arret) / .3));
}
// La traînée de feu du tir parfait : des flammes posées le long du chemin
// réellement parcouru (G.trail), rebonds compris, tous les `pas` pixels.
function traineeDeFeu(g, d, trail, t) {
  const pts = [{ x: d.x, y: d.y }];
  for (let i = trail.length - 1; i >= 0; i--) pts.push(trail[i]);
  const pas = 6 * S;
  let reste = pas, n = 0;
  for (let i = 1; i < pts.length && n < 14; i++) {
    const a = pts[i - 1], b = pts[i], l = Math.hypot(b.x - a.x, b.y - a.y);
    let s = reste;
    while (s <= l && n < 14) {
      n++;
      const k = s / l, v = 1 - n / 15;
      flammes(g, a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, S * 3.2 * v * RO.trainee, t + n * .05, .55 * v * RO.trainee, n * 13);
      s += pas;
    }
    reste = s - l;
  }
}

/* ===================== CE QUE render() APPELLE ===================== */
// Donald et Dingo se rangent avec les joueurs, triés par leurs pieds : chacun
// passe devant ce qui est plus haut sur le terrain que lui.
export function acteursTrinite(T) {
  if (!T) return [];
  return [
    { y: T.dingo.y, dessiner: g => dessinerDingo(g, T) },
    { y: T.donald.y, dessiner: g => dessinerDonald(g, T) },
  ];
}
// Le sort de Donald et le disque en feu, par-dessus les joueurs : en main de
// Sora quand Donald l'a embrasé, en vol après le tir parfait.
export function dessinerFeuTrinite(g, T, d, trail, t) {
  if (T) dessinerBrasier(g, T, d.heldBy === T.owner ? { x: d.x, y: d.y } : { x: T.owner.x + T.owner.face * 20, y: T.owner.y });
  if (d.heldBy ? d.heldBy.triniteFeu : d.kind === 'trinite') {
    if (!d.heldBy) traineeDeFeu(g, d, trail, t);
    flammes(g, d.x, d.y - S, S * 3.6 * RO.flammes, t, RO.flammes, 5);
  }
}
