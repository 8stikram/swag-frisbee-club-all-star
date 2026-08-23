import { G, comment } from './state.js';
import { W, curScreen } from '../core/dom.js';
import { CX, METER_GAIN } from '../core/constants.js';
import { lerp, gauss, rand, pick, clamp } from '../core/utils.js';
import { getMap } from '../data/maps.js';
import { updatePlayerHuman, updatePlayer2, integratePlayer } from './input.js';
import { majCommandes, appliquerActions } from './commandes.js';
import { updateAI } from './ai.js';
import { updateDisc, updateDecoys } from './disc.js';
import { updateLeg, updateBell, updateHack, launchCine } from './specials.js';
import { SIX_ORBES } from '../data/specials.js';
import { updateFX } from './fx.js';
import { capture, applySnap } from './replay.js';
import { setupServe, afterGoal, startReplay, endReplay, finishReplay } from './actions.js';
import { sfx, setDemoMuted } from '../audio/audio.js';
import { render } from '../render/render.js';
import { updateTraining, pilotageDummy } from '../ui/training.js';
import { updateTutoriel, enTutoriel } from '../ui/tutoriel.js';
import { updateZones } from './zones.js';
import { majReseau, lisserAffichage, Partie } from '../reseau/partie.js';

export function update(dt) {
  setDemoMuted(G.demo);
  // Mise en scène du Perfect Dive : le zoom et le flash vivent en temps réel,
  // pas en temps de jeu, pour rester lisibles pendant le ralenti.
  if (G.zoom) { G.zoom.t += dt; if (G.zoom.t >= G.zoom.dur) G.zoom = null; }
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.2);
  if (G.tsTimer > 0) { G.tsTimer -= dt; } else G.timescale = lerp(G.timescale, 1, .2);
  const wdt = dt * G.timescale;
  G.now += wdt;
  G.waveX += dt * 260;
  if (G.waveX > W + 160) G.waveX = -160;
  for (const s of G.stars) {
    s.twinkle += dt * s.speed;
    if (G.state === 'goal' && Math.random() < 0.02) { s.color = pick(['#ffd23e', '#ff8c1a', '#35e0ff', '#ff5340', '#7bd66a']); }
    else if (G.state !== 'goal') { s.color = getMap().theme.starColor; }
  }
  // Mode Six Paths : la tenue dorée, l'anneau d'orbes et les braises. Le temps
  // s'écoule en temps de jeu — un ralenti doit aussi ralentir les orbes, sinon
  // elles se mettent à filer pendant que tout le reste rampe.
  for (const p of [G.p1, G.p2]) {
    if (!p) continue;
    if (p.viseT > 0) p.viseT = Math.max(0, p.viseT - wdt);
    if (p.bouclierT > 0) p.bouclierT = Math.max(0, p.bouclierT - wdt);
    // Le piratage ne s'écoule que balle en jeu, comme le mode Six Paths : sinon
    // un but et sa remise en jeu en dévoreraient la moitié sans que l'adversaire
    // n'ait eu à jouer une seule action de travers.
    if (p.piratage > 0 && (G.state === 'play' || G.state === 'serve')) p.piratage = Math.max(0, p.piratage - wdt);
    if (!(p.sixT > 0)) continue;
    // Le compte à rebours ne tourne que balle en jeu. Sinon un but, son replay
    // et la remise en jeu dévoraient la moitié de la forme sans qu'on ait pu
    // s'en servir — le joueur l'a gagnée pour jouer avec, pas pour la regarder
    // s'écouler pendant un ralenti.
    if (G.state === 'play' || G.state === 'serve') p.sixT = Math.max(0, p.sixT - wdt);
    p.sixA = (p.sixA || 0) + wdt * SIX_ORBES.vitesse;
    // Braises qui s'élèvent autour de lui (variante « particules »).
    if (Math.random() < .55) G.particles.push({
      x: p.x + gauss() * 22, y: p.y - rand(0, 30), vx: gauss() * 18, vy: -rand(30, 90),
      life: .55, c: Math.random() < .5 ? '#ffd23e' : '#ffe89a', s: 2, g: 0
    });
  }
  if (G.cine) {
    const c = G.cine;
    c.t += dt;
    const p = c.p;
    // Particules de la transformation : dorées comme la tenue. L'orange qu'il y
    // avait ici venait de Kurama et jurait avec le manteau doré.
    if (Math.random() < .5) G.particles.push({ x: p.x + gauss() * 34, y: p.y - 20 + gauss() * 40, vx: gauss() * 40, vy: -rand(40, 140), life: .5, c: Math.random() < .5 ? '#ffe89a' : '#ffd23e', s: 3, g: 0 });
    if (!c.launched && c.t >= 0.4) { c.launched = true; launchCine(c); }
    if (c.t > 1.3) G.cine = null;
  }
  if (G.state === 'replay') {
    const r = G.replay;
    // Fermeture des bandes noires en fin de replay (ou après un skip).
    if (r.closing > 0) {
      r.closing += dt;
      if (r.closing > .3) { finishReplay(); }
      updateFX(dt);
      return;
    }
    // Vitesse normale, puis ralenti au moment du tir et à l'approche du but.
    // La transition est progressive : basculer d'un coup de 1× à 0,28× donnait
    // une cassure brutale au lieu d'un effet de ralenti.
    const prochesDuBut = r.idx > r.end - 30;
    const prochesDuTir = Math.abs(r.idx - r.shot) < 14;
    const cible = (prochesDuBut || prochesDuTir) ? .28 : 1;
    r.speed = lerp(r.speed, cible, 1 - Math.exp(-6 * dt));
    r.idx += dt * 60 * r.speed;

    // Caméra lissée : la cible et le facteur de zoom changent par paliers selon
    // la phase, mais on s'en approche progressivement. Sauter d'un cadrage à
    // l'autre donnait des à-coups au lieu d'un mouvement de caméra.
    const avantTir = r.idx < r.shot;
    const suivi = avantTir ? (G.disc.x < CX ? G.p1 : G.p2) : G.disc;
    const zCible = prochesDuBut ? 1.55 : (avantTir ? 1.35 : 1.18);
    if (!r.cam) r.cam = { x: suivi.x, y: suivi.y, z: 1 };
    const k = 1 - Math.exp(-5 * dt);
    r.cam.x = lerp(r.cam.x, suivi.x, k);
    r.cam.y = lerp(r.cam.y, suivi.y, k);
    r.cam.z = lerp(r.cam.z, zCible, k);
    if (r.idx >= r.end) { G.shake = Math.max(G.shake, 12); endReplay(); }
    else { applySnap(G.rec[Math.floor(r.idx)]); }
    updateFX(dt);
    return;
  }
  updateLeg(wdt);
  updateBell(wdt);
  updateHack(wdt);
  for (const p of [G.p1, G.p2]) p.meter = clamp(p.meter + (G.state === 'play' ? 1.5 * METER_GAIN : 0) * wdt, 0, 100);
  switch (G.state) {
    case 'countdown': {
      G.cdT -= dt;
      const n = Math.ceil(G.cdT / .9);
      if (n !== G.cdN) {
        G.cdN = n;
        if (n > 0 && n <= 3) sfx('count');
        if (n <= 0) {
          sfx('go');
          if (!G.startCom && !G.demo) { G.startCom = true; comment('PREMIER À 35 — BON MATCH !'); }
        }
      }
      if (G.cdT <= -.4) setupServe(1);
      break;
    }
    case 'serve':
    case 'play': {
      // Les fiches d'intentions se remplissent d'abord, une fois pour toutes :
      // ensuite le jeu ne consulte plus qu'elles.
      majCommandes(wdt);
      // L'invité ne simule rien du tout : c'est l'hôte qui fait foi. Il remplit
      // quand même sa fiche — c'est la seule chose qu'il envoie — puis s'arrête
      // là et se contente d'afficher ce qu'on lui renvoie. Le laisser calculer
      // en parallèle ferait lutter sa physique contre celle d'en face, et les
      // deux écrans finiraient par ne plus être d'accord sur qui a attrapé.
      if (Partie.active && Partie.role === 'invite') break;
      // Gestes ponctuels : plongeon, feinte, ultime. Le joueur à la souris les
      // déclenche par ses événements ; tout autre joueur — le second clavier
      // aujourd'hui, un joueur distant demain — passe par ici.
      for (const p of [G.p1, G.p2]) if (p && p.cmd) appliquerActions(p);
      for (const p of [G.p1, G.p2]) {
        const locked = G.cine && G.cine.p === p && !G.cine.launched;
        if (!locked) {
          if (p.human && !G.isJ2J) updatePlayerHuman(p, wdt);
          else if (p.human && G.isJ2J && p.side === 1) updatePlayerHuman(p, wdt);
          else if (p.human && G.isJ2J && p.side === 2) { /* géré par updatePlayer2 */ }
          // À l'entraînement le partenaire a ses propres règles : elles peuvent
          // remplacer l'IA (mode inoffensif) ou seulement s'y ajouter.
          else if (pilotageDummy(p, wdt)) { /* pris en charge par l'entraînement */ }
          // Le tutoriel pilote entièrement le partenaire : il doit rester lent
          // et prévisible, une IA normale rendrait les étapes impraticables.
          else if (enTutoriel()) { p.vx = 0; p.vy = 0; }
          else updateAI(p, wdt);
        } else { p.vx = 0; p.vy = 0; }
        integratePlayer(p, wdt);
      }
      if (G.isJ2J) updatePlayer2(wdt);
      updateTraining(wdt);
      updateTutoriel(wdt);
      updateZones(wdt);
      updateDisc(wdt);
      updateDecoys(wdt);
      if (G.state === 'play') {
        G.idleT += dt;
        if (G.idleT > 7 && !G.comment) {
          comment(pick(['LE PUBLIC RETIENT SON SOUFFLE...', 'QUEL MATCH !', 'LA PRESSION MONTE...', 'PERSONNE NE LÂCHE RIEN !']));
          G.idleT = 0;
        }
      }
      break;
    }
    case 'goal': {
      G.goalT -= dt;
      updateDecoys(wdt);
      if (G.goalT <= 0) {
        // Replay après chaque but, plus seulement quand l'échange a été long.
        if (!G.demo) startReplay();
        else afterGoal();
      }
      break;
    }
  }
  capture();
  updateFX(dt);
  // L'invité rapproche son image de ce qu'on lui a dit, puis chacun envoie ce
  // qu'il doit à l'autre bout de la liaison.
  lisserAffichage(dt);
  majReseau();
}

let lastT = 0;
export function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(.033, (t - lastT) / 1000 || .016);
  lastT = t;
  const playing = curScreen === null;
  // L'ecran en ligne laisse voir le match : le fond y est translucide, autant
  // que ce soit le jeu qui l'anime plutot qu'un decor invente.
  const demoBehind = ['title', 'select', 'options', 'online'].includes(curScreen);
  if (playing || demoBehind) update(dt);
  render();
}
