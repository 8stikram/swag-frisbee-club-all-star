import { G, Mouse, makePlayer, resetDisc } from '../game/state.js';
import { COURT, CY, CX, applyMap, throwSpeed } from '../core/constants.js';
import { setMapId, getMapId } from '../data/maps.js';
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { norm, clamp } from '../core/utils.js';
import { throwDisc, doDive } from '../game/actions.js';
import { startDash, cancelDash, doFeint } from '../game/input.js';
import { gestesDe, consommerPerfectDive, oublierGestes } from '../game/moves.js';
import { CHAPITRES_TUTO } from '../data/tutoriel.js';
import { CHAPITRES, marquerChapitreFait, tutoTermine } from '../data/apprentissage.js';
import { majTouches, construireTouches } from './training.js';
import { keys } from '../game/input.js';

// ---------------------------------------------------------------------------
// Moteur du tutoriel. Chaque étape suit toujours le même cycle : le jeu montre
// le geste, puis rend la main, puis compte les réussites. La validation est
// volontairement souple — on reconnaît le geste, jamais sa réussite — mais il
// faut le refaire trois fois : c'est ce qui transforme une manipulation en
// réflexe. Après cinq essais infructueux, un indice tombe et la démonstration
// est rejouée au ralenti.
// ---------------------------------------------------------------------------

const ECHECS_AVANT_INDICE = 5;

let etat = null;          // null = tutoriel inactif
let mapPrecedente = null;

export function enTutoriel() { return !!etat; }

export function lancerChapitre(idChapitre) {
  const chap = CHAPITRES_TUTO[idChapitre];
  if (!chap) return;
  mapPrecedente = getMapId();
  setMapId('dojo');
  applyMap();

  etat = {
    id: idChapitre, chap,
    iEtape: 0, phase: 'demo', t: 0,
    reussites: 0, echecs: 0, indiceVisible: false, ralenti: false
  };
  G.training = null;
  G.tuto = etat;
  G.demo = false;
  installer();
  showScreen(null);
  monterHud();
  demarrerEtape();
}

export function quitterTutoriel() {
  etat = null; G.tuto = null;
  demonterHud();
  if (mapPrecedente) { setMapId(mapPrecedente); applyMap(); }
  showScreen('learn');
}

function etapeCourante() { return etat.chap.etapes[etat.iEtape]; }

function installer() {
  G.p1 = makePlayer('naruto', 1, true, 1);
  G.p2 = makePlayer('leon', 2, false, 0);
  G.p1.foe = G.p2; G.p2.foe = G.p1;
  oublierGestes(G.p1);
  G.disc = resetDisc();
  G.state = 'play';
  G.particles.length = 0; G.popups.length = 0; G.trail.length = 0;
  G.decoys.length = 0; G.banner = null; G.cine = null; G.leg = null; G.bell = null;
  G.timescale = 1; G.shake = 0;
  Mouse.x = CX; Mouse.y = CY;
  placerDisqueEnMain();
}

function placerDisqueEnMain() {
  G.disc = resetDisc();
  G.disc.heldBy = G.p1; G.p1.holding = true;
  G.p1.x = COURT.left + 180; G.p1.y = CY;
  G.p2.x = COURT.right - 180; G.p2.y = CY;
}

// --- Cycle d'une étape ------------------------------------------------------
function demarrerEtape() {
  const e = etapeCourante();
  etat.reussites = 0; etat.echecs = 0;
  etat.indiceVisible = false;
  etat.t = 0;
  etat.phase = e.demo ? 'demo' : 'essai';
  etat.ralenti = false;
  G.timescale = 1;
  preparerDecor(e);
  majPanneauTuto();
  if (etat.phase === 'demo') jouerDemo(e.demo);
}

// Le partenaire ne joue jamais un vrai match ici : il fait exactement ce qu'il
// faut pour que l'étape ait un sens, lentement et sans surprise.
function preparerDecor(e) {
  placerDisqueEnMain();
  if (e.partenaire === 'sert' || e.partenaire === 'tire') {
    G.disc.heldBy = G.p2; G.p2.holding = true; G.p1.holding = false;
  }
}

// --- Démonstrations ---------------------------------------------------------
// Le jeu exécute lui-même le geste avec le personnage du joueur : c'est la même
// mécanique que celle qu'on demandera ensuite, pas une animation à part.
function jouerDemo(nom) {
  const p = G.p1;
  const versCage = norm(COURT.right - p.x, CY - p.y);
  Mouse.x = COURT.right - 30; Mouse.y = CY;
  switch (nom) {
    case 'tir':
      if (p.holding) throwDisc(p, versCage, throwSpeed(.3, p.char.power));
      break;
    case 'tirCharge':
      if (p.holding) throwDisc(p, versCage, throwSpeed(1, p.char.power));
      break;
    case 'dash':
      startDash(p, versCage);
      break;
    case 'cancelDash':
      startDash(p, versCage);
      etat.aAnnuler = .09;             // on freine juste après le départ
      break;
    case 'feinte':
      if (p.holding) doFeint(p, versCage);
      break;
    case 'plongeon':
      p.holding = false;
      doDive(p, versCage);
      break;
    case 'dashThrow':
      startDash(p, versCage);
      etat.aTirer = .2;
      break;
  }
  etat.dureeDemo = 1.5;
}

// --- Boucle -----------------------------------------------------------------
export function updateTutoriel(dt) {
  if (!etat) return;
  majTouches(keys, Mouse.down);
  etat.t += dt;

  // Suites différées d'une démonstration (freiner, tirer après la ruée).
  if (etat.aAnnuler !== undefined) {
    etat.aAnnuler -= dt;
    if (etat.aAnnuler <= 0) { delete etat.aAnnuler; cancelDash(G.p1); }
  }
  if (etat.aTirer !== undefined) {
    etat.aTirer -= dt;
    if (etat.aTirer <= 0) {
      delete etat.aTirer;
      if (G.p1.holding) throwDisc(G.p1, norm(COURT.right - G.p1.x, CY - G.p1.y), throwSpeed(1, G.p1.char.power));
    }
  }

  // Un but pendant un exercice ne compte pas : on replace simplement le décor
  // de l'étape en cours, sans interrompre ce que le joueur est en train
  // d'apprendre.
  if (etat.demandeReset) {
    etat.delaiReset = (etat.delaiReset || 0) + dt;
    if (etat.delaiReset > .5) {
      etat.delaiReset = 0; etat.demandeReset = false;
      G.state = 'play';
      preparerDecor(etapeCourante());
    }
  }

  pilotagePartenaire(dt);

  if (etat.phase === 'demo') {
    if (etat.t > etat.dureeDemo) {
      etat.phase = 'essai'; etat.t = 0;
      etat.ralenti = false; G.timescale = 1;
      preparerDecor(etapeCourante());
      oublierGestes(G.p1);
      majPanneauTuto();
    }
    return;
  }

  if (etat.phase === 'fini') return;

  // Essai : on lit les gestes du joueur et on compte.
  const e = etapeCourante();
  const faits = gestesDe(G.p1);
  if (consommerPerfectDive(G.p1)) faits.push('perfectDive');

  if (faits.includes(e.geste)) reussite();
  else if (faits.length && !faits.includes(e.geste)) tenterEchec(faits);
}

// Un geste différent de celui demandé compte comme un essai manqué — sauf les
// déplacements, qui accompagnent tout et ne sont jamais une erreur.
function tenterEchec(faits) {
  if (faits.every(f => f === 'bouge' || f === 'attrape')) return;
  etat.echecs++;
  if (etat.echecs >= ECHECS_AVANT_INDICE && !etat.indiceVisible) {
    etat.indiceVisible = true;
    etat.phase = 'demo'; etat.t = 0;
    etat.ralenti = true;
    G.timescale = .35; G.tsTimer = 99;      // démonstration au ralenti
    const e = etapeCourante();
    preparerDecor(e);
    if (e.demo) jouerDemo(e.demo);
    else { etat.dureeDemo = 1.2; }
    majPanneauTuto();
  }
}

function reussite() {
  const e = etapeCourante();
  etat.reussites++;
  flashValidation(etat.reussites >= e.repetitions);
  majPanneauTuto();
  if (etat.reussites >= e.repetitions) etapeSuivante();
  else setTimeout(() => { if (etat) preparerDecor(etapeCourante()); }, 500);
}

function etapeSuivante() {
  if (etat.iEtape + 1 < etat.chap.etapes.length) {
    etat.iEtape++;
    setTimeout(() => { if (etat) demarrerEtape(); }, 700);
  } else {
    etat.phase = 'fini';
    marquerChapitreFait(etat.id);
    majPanneauTuto();
    setTimeout(() => { if (etat) finChapitre(); }, 900);
  }
}

function finChapitre() {
  const tout = tutoTermine();
  quitterTutoriel();
  if (tout) annoncerRecompenses();
}

// --- Partenaire -------------------------------------------------------------
function pilotagePartenaire(dt) {
  const d = G.p2;
  if (!d) return;
  d.vx = 0; d.vy = 0;
  const e = etapeCourante();
  if (!e) return;

  if (e.partenaire === 'sert' || e.partenaire === 'renvoie') {
    // Il remet le disque en jeu, doucement, droit sur le joueur.
    if (d.holding) {
      etat.attente = (etat.attente || 0) + dt;
      if (etat.attente > .9) {
        etat.attente = 0;
        throwDisc(d, norm(G.p1.x - d.x, G.p1.y - d.y), 520);
      }
    } else etat.attente = 0;
  } else if (e.partenaire === 'tire') {
    // Il tire vers la cage du joueur, lentement : de quoi s'exercer à défendre.
    if (d.holding) {
      etat.attente = (etat.attente || 0) + dt;
      if (etat.attente > 1.1) {
        etat.attente = 0;
        throwDisc(d, norm(COURT.left - d.x, CY - d.y), 560);
      }
    } else etat.attente = 0;
  }
  // 'fige' : il ne fait rien du tout.

  // Le disque perdu revient tout seul, pour ne jamais bloquer une étape.
  if (G.disc.free && Math.hypot(G.disc.vx, G.disc.vy) < 40) {
    etat.mort = (etat.mort || 0) + dt;
    if (etat.mort > 1.4) { etat.mort = 0; preparerDecor(e); }
  } else etat.mort = 0;
}

// --- Retours visuels --------------------------------------------------------
function flashValidation(etapeFinie) {
  sfx(etapeFinie ? 'perfect' : 'count');
  G.flash = Math.max(G.flash || 0, etapeFinie ? .5 : .28);
  const el = $('tuCoche');
  if (el) {
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }
}

// --- Panneau d'instructions -------------------------------------------------
function majPanneauTuto() {
  if (!etat) return;
  const e = etapeCourante();
  const prog = $('tuProg'), txt = $('tuTexte'), ind = $('tuIndice'),
        pts = $('tuPoints'), ph = $('tuPhase');

  if (prog) {
    const num = CHAPITRES.find(c => c.id === etat.id);
    prog.textContent = 'CHAPITRE ' + (num ? num.num : '?') + '/' + CHAPITRES.length
      + ' · ÉTAPE ' + (etat.iEtape + 1) + '/' + etat.chap.etapes.length;
  }
  if (etat.phase === 'fini') {
    if (txt) txt.textContent = 'Chapitre terminé.';
    if (ph) ph.textContent = 'BRAVO';
    if (ind) ind.classList.add('hidden');
    if (pts) pts.innerHTML = '';
    return;
  }
  if (txt) txt.textContent = e.texte;
  if (ph) ph.textContent = etat.phase === 'demo'
    ? (etat.ralenti ? 'REGARDE AU RALENTI' : 'REGARDE') : 'À TOI';
  if (ind) {
    ind.textContent = e.indice;
    ind.classList.toggle('hidden', !etat.indiceVisible);
  }
  if (pts) {
    pts.innerHTML = '';
    for (let i = 0; i < e.repetitions; i++) {
      const b = document.createElement('i');
      if (i < etat.reussites) b.className = 'ok';
      pts.appendChild(b);
    }
  }
}

function monterHud() {
  const h = $('tuHud');
  if (h) h.classList.remove('hidden');
  const t = $('trHud');           // la barre des touches vient du training
  if (t) t.classList.remove('hidden');
  construireTouches();            // sans ça la barre reste vide
  const p = $('trPanel'); if (p) p.classList.add('ferme');
  const b = $('trToggle'); if (b) b.classList.add('hidden');
  const hi = $('trHist'); if (hi) hi.classList.add('hidden');
}
function demonterHud() {
  const h = $('tuHud'); if (h) h.classList.add('hidden');
  const t = $('trHud'); if (t) t.classList.add('hidden');
  const b = $('trToggle'); if (b) b.classList.remove('hidden');
  const hi = $('trHist'); if (hi) hi.classList.remove('hidden');
}

// --- Récompenses ------------------------------------------------------------
function annoncerRecompenses() {
  const el = $('tuLoot');
  if (!el) return;
  el.classList.remove('hidden');
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  sfx('win');
}

export function fermerRecompenses() {
  const el = $('tuLoot');
  if (el) el.classList.add('hidden');
}

// Repli d'un cran du panneau, comme demandé.
(function cabler() {
  const b = $('tuToggle'), pan = $('tuPanel');
  if (b && pan) b.addEventListener('click', () => {
    const ferme = pan.classList.toggle('ferme');
    b.textContent = ferme ? '›' : '‹';
    sfx('move');
  });
  const l = $('tuLootBtn');
  if (l) l.addEventListener('click', () => { fermerRecompenses(); sfx('select'); });
})();
