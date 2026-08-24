import { G } from './state.js';
import { etatAlea, poserEtatAlea } from '../core/alea.js';

// ---------------------------------------------------------------------------
// Photographier la simulation, et la remettre exactement où elle était.
//
// C'est la fondation du rembobinage symétrique : sans elle, aucune des deux
// machines ne peut revenir en arrière pour rejouer une image avec la vraie
// intention de l'autre. Le rembobinage du chantier 9 ne figeait qu'UN joueur et
// sa physique ; ici il faut le match entier, parce que plus personne ne fait
// foi et que tout doit pouvoir être recalculé des deux côtés.
//
// Règle de tri, et elle décide de tout : on fige ce qui CHANGE LE MATCH, jamais
// ce qui le décore. Les particules, les traînées, les images fantômes, les
// étoiles, la secousse et le flash restent dehors — ils se recréent seuls et
// leur nombre dépend des options graphiques de chacun. Les y mettre coûterait
// cher et, pire, ferait diverger deux machines qui n'ont pas les mêmes réglages.
//
// L'état du hasard EST dedans, évidemment : rejouer une image doit retirer les
// mêmes nombres que la première fois.
//
// Ce module n'importe que l'état et le hasard : il ne peut fermer aucun cycle.
// ---------------------------------------------------------------------------

// Champs scalaires d'un joueur qui pèsent sur la simulation. Énumérés une seule
// fois, et lus par les trois fonctions : on ne peut pas en oublier un ici sans
// que l'empreinte le dise aussitôt.
const CHAMPS_JOUEUR = [
  'x', 'y', 'vx', 'vy', 'face', 'holding', 'charging', 'wasCharging', 'charge', 'fullFlash',
  'throwCd', 'throwPoseT', 'lunge', 'lungeCd', 'dashCd', 'walk', 'moving', 'meter', 'score',
  'speed', 'stun', 'ghostT', 'holdTimer', 'dashT', 'dashGap', 'dashThrowT', 'dashEnding',
  'cancelCatchT', 'feintT', 'feintCd', 'diveT', 'diveDown', 'diveHit', 'dizzy',
  'sixT', 'sixA', 'viseT', 'tirTenu', 'dashTenu', 'bouclierT', 'piratage', 'feintSwish'
];
// Couples x/y du joueur : élan de dash, direction de dash, de feinte, de plongeon.
const VECTEURS_JOUEUR = ['dashV', 'dashDir', 'feintDir', 'diveDir'];

const CHAMPS_DISQUE = [
  'x', 'y', 'vx', 'vy', 'kind', 'spin', 'age', 'thrownAt', 'bounced', 'stall',
  'free', 'big', 'kSpeed', 'super', 'wobble', 'panierMarque'
];

// `lastCatchIdx` n'y est PAS, et c'est un choix qui a demandé deux essais.
// C'est un index dans le tampon du rejeu, donc il appartient à l'enregistrement
// et non à la simulation — or ce tampon glisse et ne recule jamais (voir
// capture()). Le figer sans figer le tampon qu'il indexe créait justement le
// désaccord : après un rembobinage qui traversait une réception, il valait 240
// d'un côté et 234 de l'autre. Les deux vont ensemble : ni l'un ni l'autre ne
// recule.
const CHAMPS_MATCH = [
  'state', 'now', 'timescale', 'tsTimer', 'goalT', 'cdT', 'cdN', 'serveTo',
  'rally', 'maxRally', 'idleT', 'pendingServe', 'prochainCercle', 'depuisPrise',
  'startCom', 'lungeBonus', 'lungeBonusTimer', 'aDashe'
];

// L'IA se copie en bloc plutôt que champ par champ. Énumérer ses champs a été
// essayé et s'est révélé faux dès le premier test : `emaTarget`, `target`,
// `aim` et `hes` manquaient, et la visée repartait donc différemment après un
// rembobinage. Sa forme bouge trop pour une liste tenue à la main. Seul `diff`
// est écarté — c'est le réglage de difficulté, partagé et jamais modifié.
function clonerIA(a) {
  const o = {};
  for (const k of Object.keys(a)) {
    if (k === 'diff') continue;
    const v = a[k];
    o[k] = (v && typeof v === 'object') ? { ...v } : v;
  }
  return o;
}
function restaurerIA(a, o) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (v && typeof v === 'object' && a[k] && typeof a[k] === 'object') Object.assign(a[k], v);
    else a[k] = (v && typeof v === 'object') ? { ...v } : v;
  }
}

// Un joueur se désigne par son côté, jamais par sa référence : une photo doit
// pouvoir se relire sans dépendre des objets vivants du moment.
const cote = p => (p === G.p1 ? 1 : (p === G.p2 ? 2 : 0));
const parCote = c => (c === 1 ? G.p1 : (c === 2 ? G.p2 : null));

function figerJoueur(p) {
  const o = {};
  for (const k of CHAMPS_JOUEUR) o[k] = p[k];
  for (const v of VECTEURS_JOUEUR) o[v] = { x: p[v].x, y: p[v].y };
  const c = p.cmd;
  o.cmd = {
    depX: c.dep.x, depY: c.dep.y,
    viseeX: c.visee.x, viseeY: c.visee.y,
    viseeDashX: c.viseeDash.x, viseeDashY: c.viseeDash.y,
    tir: c.tir, dash: c.dash, angle: c.angle,
    plongeon: c.plongeon, feinte: c.feinte, special: c.special, annuleDash: c.annuleDash
  };
  o.stats = { ...p.stats };
  // L'IA n'existe pas en ligne, mais elle existe en solo et après une reprise :
  // son humeur fait partie du match, pas du décor.
  o.ai = p.ai ? clonerIA(p.ai) : null;
  return o;
}

function restaurerJoueur(p, o) {
  for (const k of CHAMPS_JOUEUR) p[k] = o[k];
  for (const v of VECTEURS_JOUEUR) { p[v].x = o[v].x; p[v].y = o[v].y; }
  const c = p.cmd, s = o.cmd;
  c.dep.x = s.depX; c.dep.y = s.depY;
  c.visee.x = s.viseeX; c.visee.y = s.viseeY;
  c.viseeDash.x = s.viseeDashX; c.viseeDash.y = s.viseeDashY;
  c.tir = s.tir; c.dash = s.dash; c.angle = s.angle;
  c.plongeon = s.plongeon; c.feinte = s.feinte; c.special = s.special; c.annuleDash = s.annuleDash;
  Object.assign(p.stats, o.stats);
  if (p.ai && o.ai) restaurerIA(p.ai, o.ai);
}

// Les mises en scène qui INFLIGENT quelque chose — la jambe qui écrase, la
// cloche qui étourdit, le piratage qui inverse — sont du match. Leurs
// références à un joueur deviennent un côté le temps de la photo.
function figerScene(o) {
  if (!o) return null;
  const c = { ...o };
  for (const k of ['caster', 'owner', 'cible', 'p']) if (k in c) c[k] = cote(o[k]);
  return c;
}
function degelerScene(c, champs) {
  if (!c) return null;
  const o = { ...c };
  for (const k of champs) if (k in o) o[k] = parCote(o[k]);
  return o;
}

export function figerEtat() {
  const d = G.disc, e = { alea: etatAlea() };
  for (const k of CHAMPS_MATCH) e[k] = G[k];
  e.p1 = figerJoueur(G.p1);
  e.p2 = figerJoueur(G.p2);
  e.disc = {};
  for (const k of CHAMPS_DISQUE) e.disc[k] = d[k];
  e.disc.heldBy = cote(d.heldBy);
  e.disc.thrower = cote(d.thrower);
  e.winner = cote(G.winner);
  e.cercles = G.cercles.map(c => ({ x: c.x, y: c.y, t: c.t }));
  e.decoys = G.decoys.map(o => ({ ...o, thrower: cote(o.thrower) }));
  e.leg = figerScene(G.leg);
  e.bell = figerScene(G.bell);
  e.hack = figerScene(G.hack);
  e.cine = figerScene(G.cine);
  e.tempete = G.tempete ? { ...G.tempete } : null;
  e.mem = { ...G.mem };
  // Le tampon du rejeu n'est PAS figé : il glisse, donc ce qui en sort est
  // perdu et le tronquer ne le remet pas juste. Il n'avance simplement plus
  // pendant un rembobinage — voir capture() dans replay.js.
  // Le curseur du rejeu. Trouvé par le test, jamais deviné : pendant un rejeu
  // ce sont `G.rec[idx]` qui pilotent les joueurs et le disque, donc un
  // rembobinage qui laisse le curseur où il est fait repartir la scène d'un
  // autre endroit — quinze pixels d'écart sur chaque joueur, quarante sur le
  // disque, et tout le match dérive derrière.
  e.replay = G.replay ? { ...G.replay, cam: G.replay.cam ? { ...G.replay.cam } : null } : null;
  return e;
}

export function restaurerEtat(e) {
  poserEtatAlea(e.alea);
  for (const k of CHAMPS_MATCH) G[k] = e[k];
  restaurerJoueur(G.p1, e.p1);
  restaurerJoueur(G.p2, e.p2);
  const d = G.disc;
  for (const k of CHAMPS_DISQUE) d[k] = e.disc[k];
  d.heldBy = parCote(e.disc.heldBy);
  d.thrower = parCote(e.disc.thrower);
  G.winner = parCote(e.winner);
  G.cercles.length = 0;
  for (const c of e.cercles) G.cercles.push({ x: c.x, y: c.y, t: c.t });
  G.decoys.length = 0;
  for (const o of e.decoys) G.decoys.push({ ...o, thrower: parCote(o.thrower) });
  G.leg = degelerScene(e.leg, ['caster']);
  G.bell = degelerScene(e.bell, ['owner']);
  G.hack = degelerScene(e.hack, ['cible']);
  G.cine = degelerScene(e.cine, ['p']);
  G.tempete = e.tempete ? { ...e.tempete } : null;
  Object.assign(G.mem, e.mem);
  G.replay = e.replay ? { ...e.replay, cam: e.replay.cam ? { ...e.replay.cam } : null } : null;
}

// ---------------------------------------------------------------------------
// Empreinte de l'état, en un seul entier.
//
// C'est l'outil de vérification, et il se suffit à lui-même : figer un état,
// avancer, restaurer, ré-avancer — si l'empreinte finale diffère, c'est qu'un
// champ manque à la photo ou qu'un hasard libre s'est glissé dans la physique.
// Le test dit donc à la fois « la simulation est déterministe » et « la photo
// est complète », sans qu'on ait à les distinguer.
//
// Les flottants sont arrondis au centième : deux machines peuvent différer sur
// le dernier bit d'un cosinus sans que le match en soit changé, et une
// empreinte qui hurlerait pour ça ne servirait à rien.
// ---------------------------------------------------------------------------
function melanger(h, n) {
  h ^= Math.imul(n | 0, 0x27d4eb2d);
  h = (h << 13) | (h >>> 19);
  return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

function avaler(h, v) {
  if (v === null || v === undefined) return melanger(h, 0);
  if (typeof v === 'boolean') return melanger(h, v ? 1 : 2);
  if (typeof v === 'number') return melanger(h, Math.round(v * 100));
  if (typeof v === 'string') { for (let i = 0; i < v.length; i++) h = melanger(h, v.charCodeAt(i)); return h; }
  if (Array.isArray(v)) { h = melanger(h, v.length); for (const x of v) h = avaler(h, x); return h; }
  for (const k of Object.keys(v).sort()) { h = avaler(h, k); h = avaler(h, v[k]); }
  return h;
}

export function empreinte(e) { return (avaler(0x9e3779b9, e || figerEtat()) >>> 0).toString(16); }
