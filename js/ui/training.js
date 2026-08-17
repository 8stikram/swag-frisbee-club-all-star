import { G, Mouse, makePlayer, resetDisc } from '../game/state.js';
import { COURT, CY, applyMap, DIFFS } from '../core/constants.js';
import { CHARS, ROSTER } from '../data/characters.js';
import { getKey } from '../data/keymap.js';
import { setMapId, getMapId } from '../data/maps.js';
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { throwDisc, dropDisc } from '../game/actions.js';
import { keys } from '../game/input.js';
import { norm, clamp } from '../core/utils.js';

// ---------------------------------------------------------------------------
// Entraînement libre. Un terrain nu, un partenaire réglable, aucun score : on
// vient ici pour répéter un geste, pas pour gagner. Le mode réutilise le moteur
// de match tel quel — seules les règles de but et le pilotage du partenaire
// changent, via le drapeau G.training que la boucle et les actions consultent.
// ---------------------------------------------------------------------------

export const NIVEAUX = [
  { id: 'inoffensif', nom: 'INOFFENSIF', desc: 'Il ne fait rien. Le terrain est à toi.' },
  { id: 'facile', nom: 'FACILE', desc: 'Il renvoie mollement, sans chercher à te piéger.' },
  { id: 'normal', nom: 'NORMAL', desc: 'Il joue comme un adversaire ordinaire.' },
  { id: 'difficile', nom: 'DIFFICILE', desc: 'Il vise les coins, feinte et plonge.' }
];

// Réglages par défaut : un partenaire lisible, qui rend la balle, et aucun
// calque de debug — on les allume quand on en a besoin.
const defauts = {
  persoJoueur: 'naruto',
  persoDummy: 'leon',
  niveau: 'facile',
  renvoiAuto: true,      // le partenaire remet le disque dans tes pieds
  trajectoires: false,
  hitboxes: false,
  panneauOuvert: true
};

export const options = { ...defauts };

let mapPrecedente = null;

export function lancerEntrainement() {
  mapPrecedente = getMapId();
  setMapId('dojo');
  applyMap();

  G.training = { demandeReset: false, histoire: [], glisse: null };
  G.demo = false;
  installerJoueurs();
  showScreen(null);
  monterHud();
  sfx('select');
}

export function quitterEntrainement() {
  G.training = null;
  demonterHud();
  if (mapPrecedente) { setMapId(mapPrecedente); applyMap(); }
  showScreen('learn');
}

export function enEntrainement() { return !!G.training; }

// (Re)crée les deux personnages à leur place de départ. Sert aussi bien au
// lancement qu'au reset et au changement de personnage en cours de séance.
function installerJoueurs() {
  G.p1 = makePlayer(options.persoJoueur, 1, true, 1);
  G.p2 = makePlayer(options.persoDummy, 2, false, niveauVersDiff());
  G.p1.foe = G.p2; G.p2.foe = G.p1;
  G.disc = resetDisc();
  G.disc.heldBy = G.p1; G.p1.holding = true;
  G.state = 'serve';
  G.particles.length = 0; G.popups.length = 0; G.trail.length = 0;
  G.decoys.length = 0; G.banner = null; G.cine = null; G.leg = null; G.bell = null;
  G.timescale = 1; G.shake = 0;
  Mouse.x = COURT.left + 160; Mouse.y = CY;
}

// Le niveau du partenaire se traduit dans la table de difficulté du jeu.
// « Inoffensif » n'y figure pas : il est traité à part, en gelant son IA.
function niveauVersDiff() {
  const i = NIVEAUX.findIndex(n => n.id === options.niveau);
  return Math.max(0, Math.min(2, i - 1));
}

export function resetEntrainement() {
  installerJoueurs();
  if (G.training) { G.training.demandeReset = false; G.training.histoire.length = 0; }
  sfx('move');
}

export function changerPerso(camp, ck) {
  if (!ROSTER.includes(ck)) return;
  if (camp === 'joueur') options.persoJoueur = ck; else options.persoDummy = ck;
  installerJoueurs();
  majPanneau();
}

export function changerNiveau(id) {
  if (!NIVEAUX.some(n => n.id === id)) return;
  options.niveau = id;
  if (G.p2 && G.p2.ai) G.p2.ai.diff = DIFFS[niveauVersDiff()];
  majPanneau();
}

// --- Pilotage du partenaire -------------------------------------------------
// Renvoie true quand ce module a pris la main sur le personnage, pour que la
// boucle n'aille pas lancer l'IA normale par-dessus.
export function pilotageDummy(p, dt) {
  if (!G.training || p !== G.p2) return false;

  // Inoffensif : il reste planté là. Utile pour travailler une visée ou un
  // enchaînement sans jamais être dérangé.
  if (options.niveau === 'inoffensif') {
    p.vx = 0; p.vy = 0;
    if (p.holding) rendreLeDisque(p);
    return true;
  }
  // Aux autres niveaux l'IA joue normalement ; on ne fait qu'intercepter la
  // remise en jeu quand le renvoi automatique est demandé.
  if (p.holding && options.renvoiAuto) { rendreLeDisque(p); return false; }
  if (p.holding && !options.renvoiAuto) {
    // Renvoi coupé : il garde le disque un instant puis le laisse tomber sur
    // place. Au joueur d'aller le rechercher.
    p.attenteRenvoi = (p.attenteRenvoi || 0) + dt;
    if (p.attenteRenvoi > .6) { p.attenteRenvoi = 0; dropDisc(p); }
    return false;
  }
  p.attenteRenvoi = 0;
  return false;
}

// Remet le disque dans les pieds du joueur, à vitesse modérée : c'est une
// relance d'entraînement, pas une tentative de marquer.
function rendreLeDisque(p) {
  p.attenteRenvoi = (p.attenteRenvoi || 0) + 1 / 60;
  if (p.attenteRenvoi < .45) return;
  p.attenteRenvoi = 0;
  const c = G.p1;
  const dir = norm(c.x - p.x, c.y - p.y);
  throwDisc(p, dir, 620);
}

// --- Boucle -----------------------------------------------------------------
export function updateTraining(dt) {
  const t = G.training;
  if (!t) return;

  // Un but ne compte pas ici : on laisse juste le temps de voir le message.
  if (t.demandeReset) {
    t.delaiReset = (t.delaiReset || 0) + dt;
    if (t.delaiReset > .5) { t.delaiReset = 0; resetEntrainement(); }
  }

  // La barre des touches suit l'état réel des entrées, image par image.
  majTouches(keys, Mouse.down);

  // Le volet s'ouvre à l'arrivée pour montrer ce qu'on peut régler, puis se
  // referme dès qu'on joue : il couvre la cage adverse, on ne peut pas
  // travailler son tir avec ça devant les yeux.
  if (options.panneauOuvert && !t.aJoue && (keys.size > 0 || Mouse.down)) {
    t.aJoue = true;
    basculerPanneau(false);
  }

  // Actions du joueur repérées à la volée, sans toucher au code de jeu : on
  // observe des bascules d'état plutôt que d'aller poser des appels partout.
  const p = G.p1;
  if (p) {
    if (p.dashT > 0 && !t.vuDash) { t.vuDash = true; noterAction('DASH'); }
    if (p.dashT <= 0) t.vuDash = false;
    if (p.cancelCatchT > 0 && !t.vuCancel) { t.vuCancel = true; noterAction('CANCEL DASH'); }
    if (p.cancelCatchT <= 0) t.vuCancel = false;
    if (p.feintT > 0 && !t.vuFeinte) { t.vuFeinte = true; noterAction('FEINTE DE TIR'); }
    if (p.feintT <= 0) t.vuFeinte = false;
    if (p.diveT > 0 && !t.vuPlongeon) { t.vuPlongeon = true; noterAction('PLONGEON'); }
    if (p.diveT <= 0) t.vuPlongeon = false;
    if (p.holding && !t.vuTenue) { t.vuTenue = true; noterAction(p.dashThrowT > 0 ? 'ATTRAPÉ EN DASH' : 'ATTRAPÉ'); }
    if (!p.holding && t.vuTenue) { t.vuTenue = false; noterAction(p.charge > .95 ? 'TIR CHARGÉ' : 'TIR'); }
  }

  // Le partenaire suit la souris quand on le fait glisser.
  if (t.glisse && G.p2) {
    G.p2.x = clamp(Mouse.x, COURT.left + 20, COURT.right - 20);
    G.p2.y = clamp(Mouse.y, COURT.top + 20, COURT.bottom - 20);
    G.p2.vx = 0; G.p2.vy = 0;
  }
}

// --- Glisser-déposer du partenaire ------------------------------------------
const RAYON_PRISE = 40;

export function tenterPriseDummy(x, y) {
  if (!G.training || !G.p2) return false;
  if (Math.hypot(x - G.p2.x, y - G.p2.y) > RAYON_PRISE) return false;
  G.training.glisse = true;
  return true;
}
export function lacherDummy() {
  if (G.training) G.training.glisse = null;
}
export function dummyEnDeplacement() { return !!(G.training && G.training.glisse); }

// --- Panneau de réglages ----------------------------------------------------
let ongletActif = 'diff';

function vignettePerso(ck, actif, onClic) {
  const b = document.createElement('button');
  b.className = 'trPerso' + (actif ? ' on' : '');
  b.title = CHARS[ck].short;
  const src = CHARS[ck].frames.idle;
  const cv = document.createElement('canvas');
  cv.width = src.width * 3; cv.height = src.height * 3;
  const g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, cv.width, cv.height);
  b.appendChild(cv);
  b.addEventListener('click', onClic);
  return b;
}

function groupe(titre) {
  const d = document.createElement('div');
  d.className = 'trGroupe';
  const s = document.createElement('span');
  s.textContent = titre;
  d.appendChild(s);
  return d;
}

function bouton(libelle, desc, actif, onClic) {
  const b = document.createElement('button');
  b.className = 'trOpt' + (actif ? ' on' : '');
  b.innerHTML = libelle + (desc ? '<em>' + desc + '</em>' : '');
  b.addEventListener('click', () => { onClic(); sfx('move'); });
  return b;
}

export function majPanneau() {
  const corps = $('trBody');
  if (!corps) return;
  corps.innerHTML = '';

  if (ongletActif === 'diff') {
    const g = groupe('NIVEAU DU PARTENAIRE');
    for (const n of NIVEAUX) {
      g.appendChild(bouton(n.nom, n.desc, options.niveau === n.id, () => changerNiveau(n.id)));
    }
    corps.appendChild(g);

    const gj = groupe('TON PERSONNAGE');
    const rj = document.createElement('div'); rj.className = 'trPersos';
    for (const ck of ROSTER) {
      rj.appendChild(vignettePerso(ck, options.persoJoueur === ck, () => changerPerso('joueur', ck)));
    }
    gj.appendChild(rj); corps.appendChild(gj);

    const gd = groupe('SON PERSONNAGE');
    const rd = document.createElement('div'); rd.className = 'trPersos';
    for (const ck of ROSTER) {
      rd.appendChild(vignettePerso(ck, options.persoDummy === ck, () => changerPerso('dummy', ck)));
    }
    gd.appendChild(rd); corps.appendChild(gd);

  } else if (ongletActif === 'conf') {
    const g = groupe('REMISE EN JEU');
    g.appendChild(bouton('RENVOI AUTOMATIQUE',
      'Il te renvoie le disque dans les pieds dès qu\'il l\'attrape.',
      options.renvoiAuto, () => { options.renvoiAuto = true; majPanneau(); }));
    g.appendChild(bouton('RENVOI COUPÉ',
      'Il garde le disque puis le laisse tomber. À toi d\'aller le chercher.',
      !options.renvoiAuto, () => { options.renvoiAuto = false; majPanneau(); }));
    corps.appendChild(g);

  } else {
    const g = groupe('CALQUES');
    g.appendChild(bouton('TRAJECTOIRES',
      'Trace le chemin du disque, rebonds compris.',
      options.trajectoires, () => { options.trajectoires = !options.trajectoires; majPanneau(); }));
    g.appendChild(bouton('HITBOXES',
      'Montre les zones d\'attrapé et de plongeon.',
      options.hitboxes, () => { options.hitboxes = !options.hitboxes; majPanneau(); }));
    corps.appendChild(g);
  }
}

// --- Historique des actions -------------------------------------------------
const MAX_HIST = 10;

// Les déplacements n'y figurent pas : ils noieraient tout le reste.
export function noterAction(texte) {
  if (!G.training) return;
  const h = G.training.histoire;
  h.unshift({ texte, t: performance.now() });
  if (h.length > MAX_HIST) h.length = MAX_HIST;
  dessinerHistorique();
}

function dessinerHistorique() {
  const el = $('trHist');
  if (!el || !G.training) return;
  const maintenant = performance.now();
  el.innerHTML = '';
  for (const a of G.training.histoire) {
    const i = document.createElement('i');
    i.textContent = a.texte;
    if (maintenant - a.t < 400) i.className = 'frais';
    el.appendChild(i);
  }
}

// --- Affichage des touches --------------------------------------------------
let touchesEl = null;
const TOUCHES = [
  { act: 'moveUp', label: '↑' }, { act: 'moveLeft', label: '←' },
  { act: 'moveDown', label: '↓' }, { act: 'moveRight', label: '→' },
  { act: 'dash', label: 'DASH' }, { act: 'feint', label: 'FEINTE' },
  { act: '__clic', label: 'CLIC' }
];

function construireTouches() {
  const el = $('trInputs');
  if (!el) return;
  el.innerHTML = '';
  touchesEl = {};
  for (const t of TOUCHES) {
    const b = document.createElement('b');
    b.textContent = t.label;
    el.appendChild(b);
    touchesEl[t.act] = b;
  }
}

// Appelé à chaque image : la barre doit coller à ce que fait vraiment le joueur.
export function majTouches(enfoncees, clic) {
  if (!touchesEl) return;
  for (const t of TOUCHES) {
    const actif = t.act === '__clic' ? clic : enfoncees.has(getKey(t.act));
    touchesEl[t.act].classList.toggle('on', !!actif);
  }
}

// --- Montage / démontage de la surcouche ------------------------------------
function monterHud() {
  const hud = $('trHud');
  if (!hud) return;
  hud.classList.remove('hidden');
  construireTouches();
  majPanneau();
  dessinerHistorique();
  // On arrive volet ouvert : c'est le moment où l'on découvre les réglages.
  basculerPanneau(true);
}
function demonterHud() {
  const hud = $('trHud');
  if (hud) hud.classList.add('hidden');
}

// Onglets et bouton d'escamotage : câblés une seule fois.
(function cablerPanneau() {
  const tabs = document.querySelectorAll('.trTab');
  tabs.forEach(t => t.addEventListener('click', () => {
    ongletActif = t.dataset.tab;
    tabs.forEach(o => o.classList.toggle('on', o === t));
    sfx('move');
    majPanneau();
  }));
  const bascule = $('trToggle');
  if (bascule) bascule.addEventListener('click', () => { basculerPanneau(!options.panneauOuvert); sfx('move'); });
})();

export function basculerPanneau(ouvert) {
  options.panneauOuvert = ouvert;
  const panneau = $('trPanel'), bascule = $('trToggle');
  if (panneau) panneau.classList.toggle('ferme', !ouvert);
  if (bascule) {
    bascule.classList.toggle('decale', !ouvert);
    bascule.textContent = ouvert ? '☰' : '⚙';
    bascule.title = ouvert ? 'Masquer les réglages' : 'Afficher les réglages';
  }
}
