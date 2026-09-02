import { G, comment } from './state.js';
import { W, curScreen } from '../core/dom.js';
import { CX, METER_GAIN } from '../core/constants.js';
import { lerp, gauss, rand, pick, clamp } from '../core/utils.js';
import { getMap } from '../data/maps.js';
import { updatePlayerHuman, updatePlayer2, integratePlayer } from './input.js';
import { doThrowHuman } from './actions.js';
import { majCommandes, appliquerActions } from './commandes.js';
import { updateAI } from './ai.js';
import { updateDisc, updateDecoys } from './disc.js';
import { updateLeg, updateBell, updateHack, updateRafale, updateGrappin, updateChien, updateRuee, launchCine } from './specials.js';
import { updateDesert } from './desert.js';
import { SIX_ORBES } from '../data/specials.js';
import { updateFX } from './fx.js';
import { capture, applySnap } from './replay.js';
import { setupServe, afterGoal, startReplay, endReplay, finishReplay, gameOver } from './actions.js';
import { sfx, setDemoMuted } from '../audio/audio.js';
import { render } from '../render/render.js';
import { updateTraining, pilotageDummy } from '../ui/training.js';
import { updateTutoriel, enTutoriel } from '../ui/tutoriel.js';
import { updateZones } from './zones.js';
import { majReseau, lisserAffichage, Partie, surSimulationJoueur } from '../reseau/partie.js';

// partie.js a besoin de rejouer updatePlayerHuman+integratePlayer pour
// rembobiner le joueur invité, mais ne peut pas les importer directement :
// input.js importe déjà Partie depuis partie.js, et l'inverse fermerait un
// cycle. loop.js a les deux bouts, donc c'est lui qui fait la liaison — même
// patron que surCoupDEnvoi ou surMessage, déjà utilisé dans partie.js.
surSimulationJoueur((p, dt) => { updatePlayerHuman(p, dt); integratePlayer(p, dt); });

export function update(dt) {
  setDemoMuted(G.demo);
  // L'hôte vient d'annoncer la fin du match : l'invité monte son écran final,
  // avec le vainqueur reçu. Avant, rien ne réagissait à l'état « over » de son
  // côté — la partie s'arrêtait sans un mot, puis la liaison se fermait.
  if (Partie.finDeMatch) { Partie.finDeMatch = false; gameOver(); return; }
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
    // L'invité a demandé à couper : l'hôte le fait pour les deux, puisque
    // c'est lui qui déroule le rejeu.
    if (Partie.skipDemande) { Partie.skipDemande = false; endReplay(); }
    // L'invité ne déroule aucun rejeu : le sien n'est qu'un drapeau
    // d'affichage (voir startReplay et appliquerEtat). Il continue simplement
    // de montrer ce que l'hôte lui envoie, qui est précisément le rejeu en
    // train de se dérouler.
    if (!r || r.distant) {
      updateFX(dt);
      lisserAffichage(dt);
      majReseau();
      return;
    }
    // Fermeture des bandes noires en fin de replay (ou après un skip).
    if (r.closing > 0) {
      r.closing += dt;
      if (r.closing > .3) { finishReplay(); }
      updateFX(dt);
      majReseau();
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
    // La FIN se décide au compteur d'images, pas en arrivant au bout du
    // tampon : c'est ce qui garantit que les deux machines passent exactement
    // le même nombre d'images dans le rejeu, même si leurs enregistrements
    // diffèrent de quelques images. Ce qu'on montre suit le tampon local et
    // s'arrête sur sa dernière image s'il est plus court — du décor.
    r.restant--;
    if (r.restant <= 0) { G.shake = Math.max(G.shake, 12); endReplay(); }
    else { applySnap(G.rec[Math.min(G.rec.length - 1, Math.floor(r.idx))]); }
    updateFX(dt);
    // On continue d'emettre pendant le replay : l'hote y deplace les joueurs
    // image par image, donc l'invite voit le meme replay sans rien enregistrer.
    // Sans cet envoi, sa liaison restait ouverte mais muette et son ecran se
    // figeait jusqu'a la remise en jeu.
    majReseau();
    return;
  }
  updateLeg(wdt);
  updateBell(wdt);
  updateHack(wdt);
  updateRafale(wdt);
  updateGrappin(wdt);
  updateChien(wdt);
  updateRuee(wdt);
  updateDesert(wdt);
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
      // Images écoulées depuis la dernière prise : c'est ce qui donnera sa
      // durée au rejeu, et ça se compte dans la simulation pour reculer avec
      // elle en cas de rembobinage.
      G.depuisPrise++;
      // Les fiches d'intentions se remplissent d'abord, une fois pour toutes :
      // ensuite le jeu ne consulte plus qu'elles.
      majCommandes(wdt);
      // L'invité ne simule rien du tout : c'est l'hôte qui fait foi. Il remplit
      // quand même sa fiche — c'est la seule chose qu'il envoie — puis s'arrête
      // là et se contente d'afficher ce qu'on lui renvoie. Le laisser calculer
      // en parallèle ferait lutter sa physique contre celle d'en face, et les
      // deux écrans finiraient par ne plus être d'accord sur qui a attrapé.
      if (Partie.active && Partie.role === 'invite') {
        // Il ne simule rien du match — mais il simule SON personnage, tout de
        // suite, avec exactement le code que l'hôte fera tourner sur la même
        // fiche. Sans ça il attendrait un aller-retour complet avant de se voir
        // bouger. L'écart éventuel est mesuré et résorbé au retour de l'état.
        // Ses gestes ponctuels partent d'ici, à l'image de l'appui : plongeon,
        // feinte, annulation de dash. Placés exactement où l'hôte les place
        // dans sa propre boucle — avant le déplacement, et sans dépendre de
        // G.cine, qui n'écarte que le plongeon et le fait déjà lui-même — pour
        // que les deux simulations restent superposables geste pour geste.
        // Le plongeon n'y joue que son élan et sa pose : le contact avec le
        // disque reste arbitré en face (voir doDive).
        if (G.p2 && G.p2.cmd) appliquerActions(G.p2);
        if (G.p2 && !G.cine) {
          updatePlayerHuman(G.p2, wdt);
          integratePlayer(G.p2, wdt);
        }
        // Le disque vole ici aussi, avec exactement la même physique que chez
        // l'hôte. C'est le changement qui compte le plus pour l'invité : le
        // disque est le centre du jeu, et il le voyait jusqu'ici avec le retard
        // du tampon d'interpolation. Il le voit maintenant à l'image près.
        //
        // Il n'arbitre toujours rien. Les buts, les contres son camp et la
        // remise en jeu se refusent chez lui — le score reste une décision de
        // l'hôte, et un but affiché puis repris serait pire que vingt
        // millisecondes d'attente.
        updateDisc(wdt);
        break;
      }
      // Gestes ponctuels : plongeon, feinte, ultime. Le joueur à la souris les
      // déclenche par ses événements ; tout autre joueur — le second clavier
      // aujourd'hui, un joueur distant demain — passe par ici.
      for (const p of [G.p1, G.p2]) if (p && p.cmd) appliquerActions(p);
      // Le tir part au relâchement de la charge. On guette ce relâchement sur
      // la fiche d'intentions et non sur l'événement de la souris : un joueur
      // distant n'en produit aucun sur cette machine, et son tir ne partait
      // tout simplement jamais. Le joueur local, lui, tire toujours par son
      // événement — d'une image plus tôt — et retombe ici sans rien déclencher,
      // puisque doThrowHuman refuse un joueur qui n'a plus le disque.
      for (const p of [G.p1, G.p2]) {
        if (!p || !p.cmd) continue;
        if (p.tirTenu && !p.cmd.tir && p.holding && p.wasCharging) doThrowHuman(p);
        p.tirTenu = !!p.cmd.tir;
      }
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

// ---------------------------------------------------------------------------
// Cadence de simulation, découplée de l'affichage.
//
// Le jeu avançait auparavant d'un pas égal au temps écoulé, plafonné à 33 ms.
// Ce plafond est un garde-fou classique, mais il a un effet qu'on ne voit pas
// en le lisant : sous trente images par seconde, la simulation n'avance plus
// que de 33 ms pendant que 50, 60 ou 80 ms s'écoulent réellement. Le jeu passe
// au ralenti. Personne ne le décrit comme tel — on dit « ça lague ».
//
// En ligne, c'est pire qu'un défaut de confort : les deux machines ne ralentissent
// pas au même moment ni de la même façon, donc elles cessent de simuler le même
// match. C'est une source de divergence permanente et invisible.
//
// Le pas est donc fixe. L'affichage suit comme il peut, la simulation avance
// toujours de 1/60 par tranche, et le temps en trop est jeté plutôt que distendu.
const PAS = 1 / 60;
// Au-delà, on renonce à rattraper : un onglet en arrière-plan ou un point d'arrêt
// laisse des écarts de plusieurs secondes, et les rejouer d'un bloc ferait
// traverser le terrain au disque en une image.
const RETARD_MAX = .25;
// Nombre de tranches par image. Cinq laisse la simulation tenir sa cadence
// jusqu'à douze images par seconde ; en dessous, on accepte enfin de ralentir,
// parce qu'à ce stade la machine ne suit plus de toute façon.
const PAS_MAX = 5;

let lastT = 0, accu = 0;
export function frame(t) {
  requestAnimationFrame(frame);
  let ecoule = (t - lastT) / 1000;
  if (!lastT || !isFinite(ecoule) || ecoule < 0) ecoule = PAS;
  lastT = t;
  if (ecoule > RETARD_MAX) ecoule = RETARD_MAX;
  accu += ecoule;
  const playing = curScreen === null;
  // L'ecran en ligne laisse voir le match : le fond y est translucide, autant
  // que ce soit le jeu qui l'anime plutot qu'un decor invente.
  const demoBehind = ['title', 'select', 'options', 'online'].includes(curScreen);
  const jouer = playing || demoBehind;
  // On vide l'accumulateur même quand rien ne tourne : sinon le temps passé
  // dans les menus s'y entasserait et le match repartirait par une rafale.
  let n = 0;
  while (accu >= PAS && n < PAS_MAX) {
    accu -= PAS; n++;
    if (jouer) update(PAS);
  }
  if (n >= PAS_MAX) accu = 0;
  render();
}
