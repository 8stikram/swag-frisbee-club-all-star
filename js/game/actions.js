import { G, Mouse, resetDisc, initMatch, comment } from './state.js';
import { Partie, monJoueur, etiquetteJoueur, jeSimule, signalerTirLocal, demanderSkipRejeu, skinDuJoueur } from '../reseau/partie.js';
import { enregistrerMatchComplet, ajouterPieces } from '../reseau/compte.js';
import {
  COURT, CX, CY, TARGET, GOAL_MID1, GOAL_MID2, throwSpeed,
  DIVE_TIME, DIVE_RANGE, DIVE_WHIFF_DOWN, DIVE_POWER,
  PERFECT_WINDOW, PERFECT_SPEED, DISC_RADIUS, DASH_THROW_WINDOW, METER_GAIN, DISC_SPEED,
  TIR_ANGLE_MIN
} from '../core/constants.js';
import { clamp, norm, gauss, pick, rand } from '../core/utils.js';
import { gaussJeu, randJeu, aleaJeu } from '../core/alea.js';
import { zoneByY } from '../data/maps.js';
import { CHARS } from '../data/characters.js';
import { sfx, setMuffled } from '../audio/audio.js';
import { burst, dust, ring, confetti, starBurst, addPopup, ondeDeBut, confettiNumerique, effetDeBut } from './fx.js';
import { $, cv, showScreen } from '../core/dom.js';
import { signalerPerfectDive } from './moves.js';
import { getSkinId, teinteDeCharge, chaufferCouleur } from '../data/skins.js';

// Commentaire personnalisé : varié, et cite le pseudo en ligne plutôt qu'un
// texte générique — en multi les deux joueurs sont de vraies personnes, pas
// un « P1 »/« CPU ». Même patron que commentUlti() dans data/specials.js.
function commentNom(p, cat, generiques, nommes) {
  const nom = Partie.active ? etiquetteJoueur(p) : null;
  comment(nom ? pick(nommes(nom)) : pick(generiques), undefined, cat);
}

export function setupServe(side) {
  // L'invité prédit le vol du disque, pas l'arbitrage. Le laisser remettre en
  // jeu lui ferait replacer les deux joueurs au centre avant que l'hôte n'ait
  // tranché — et si l'hôte tranche autrement, tout serait à défaire.
  if (!jeSimule()) return;
  // L'horloge du match repart à zéro à chaque remise en jeu, et c'est ce qui
  // rend le rejeu inoffensif pour la simulation. Le rejeu fait avancer `G.now`
  // pendant qu'il se déroule, et sa durée dépend de l'enregistrement — qui ne
  // recule jamais et peut donc différer d'une machine à l'autre après des
  // rembobinages. Sans cette remise à zéro, cet écart-là s'accumulerait dans
  // l'horloge et finirait par décaler les deux simulations. Ici, il est effacé
  // au début de chaque point : rien de ce qui lit `G.now` ne traverse une
  // remise en jeu — le disque est neuf, les compte-à-rebours aussi.
  G.now = 0;
  G.state = 'serve'; G.serveTo = side; G.depuisPrise = 0;
  G.decoys.length = 0; G.trail.length = 0; G.rally = 0; G.cine = null; G.leg = null;
  G.disc = resetDisc();
  for (const p of [G.p1, G.p2]) {
    p.x = p.home.x; p.y = CY;
    p.holding = false; p.charging = false; p.wasCharging = false; p.charge = 0;
    p.dashV = { x: 0, y: 0 }; p.vx = 0; p.vy = 0;
    p.throwCd = 0; p.stun = 0; p.ghosts.length = 0; p.forceFr = null; p.holdTimer = 0;
    if (p.ai) {
      p.ai.plan = null; p.ai.tracked = null; p.ai.miss = false; p.ai.hesT = 0;
      p.ai.state = 'READY'; p.ai.shootTimer = 0; p.ai.forceShoot = false;
    }
  }
  const server = side === 1 ? G.p1 : G.p2;
  server.holding = true; G.disc.heldBy = server;
  addPopup('SERVICE : ' + server.char.short, server.char.accent, 15, 1.4);
}

export function throwDisc(p, dir, speed, kind = 'normal') {
  const d = G.disc;
  // En mode Six Paths, Naruto ne lance plus de disque : il lance des Rasengan.
  // Tous les tirs passant par ici, il suffit de les requalifier au seuil — le
  // tir de l'ultime, lui, arrive déjà étiqueté et n'est pas concerné.
  if (kind === 'normal' && p.sixT > 0) kind = 'kurama';
  let bonus = 1;
  if (G.lungeBonus && G.lungeBonusTimer > 0 && p.human && !p.holding) {
    bonus = 1.6; G.lungeBonus = false; G.lungeBonusTimer = 0;
    burst(p.x + dir.x * 20, p.y + dir.y * 20, '#35e0ff', 10);
  }
  // Tous les tirs passent par ici — lancers, plongeons, Perfect Dive et
  // ultimes — donc un seul facteur suffit à régler la vitesse du disque.
  const finalSpeed = speed * bonus * DISC_SPEED;
  d.x = p.x + dir.x * 22; d.y = p.y + dir.y * 22;
  d.vx = dir.x * finalSpeed; d.vy = dir.y * finalSpeed;
  d.heldBy = null; d.free = true; d.thrower = p; d.thrownAt = G.now; d.bounced = false;
  d.rebondPropreCamp = false;    // remis à neuf à chaque nouveau vol, voir onBounce
  d.panierMarque = false;        // un panier par lancer, pas un par image
  d.kind = kind; d.stall = 0;
  d.big = (kind === 'kurama'); d.kSpeed = (kind === 'kurama') ? finalSpeed : 0;
  d.super = (kind === 'normal' && p.charge >= .98);
  p.holding = false; p.charging = false; p.wasCharging = false; p.charge = 0; p.fullFlash = false;
  p.throwCd = .32; p.throwPoseT = .28; p.stats.thrown++; p.holdTimer = 0;
  sfx(d.super ? 'superthrow' : 'throw');
  if (d.super) {
    // Le recul : la gerbe part vers l'ARRIÈRE, comme le souffle d'une arme.
    // Elle ne suit donc pas le disque et ne le masque jamais au moment précis
    // où il faut commencer à le suivre. Teintée du disque, jamais en rouge fixe.
    // `gauss`/`rand` de core/utils, jamais le tirage semé : les deux machines
    // engendrent cette gerbe chacune de leur côté, et le semé se décalerait.
    const chaud = chaufferCouleur(teinteDeCharge(skinDuJoueur(p)), .4);
    const axe = Math.atan2(-dir.y, -dir.x);
    for (let i = 0; i < 12; i++) {
      const a = axe + gauss() * .7, v = rand(120, 260);
      G.particles.push({
        x: p.x + dir.x * 18, y: p.y + dir.y * 18,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        life: .45, c: i % 3 ? chaud : '#ffffff', s: 3, g: 0
      });
    }
    G.shake = Math.max(G.shake, 4);
    commentNom(p, 'standard',
      ['QUELLE PUISSANCE !', 'IL Y VA À FOND !', 'CHARGE MAXIMALE !'],
      n => [`QUELLE PUISSANCE DE ${n} !`, `${n} CHARGE À BLOC !`, `${n} Y VA À FOND !`]);
  }
  if (p.human) {
    if (Mouse.y < GOAL_MID1) G.mem.t++;
    else if (Mouse.y > GOAL_MID2) G.mem.b++;
    else G.mem.m++;
  }
  // Le service est fini dès que le disque quitte la main : l'échange commence.
  // Sans cette bascule l'état restait bloqué sur 'serve' toute la partie, et
  // tout ce qui est conditionné à 'play' ne se déclenchait jamais — le contre
  // son camp n'était pas sanctionné, les commentaires se taisaient et la jauge
  // ne montait plus passivement.
  if (G.state === 'serve') G.state = 'play';
  G.idleT = 0;
  onThrowEvent(p);
}

// On ne tire que vers l'avant, c'est-à-dire vers la cage adverse. Viser
// derrière soi ne déclenche rien : le disque reste en main plutôt que d'être
// redirigé d'office, pour que le joueur garde la main sur son tir. Un disque
// peut toujours revenir dans sa propre cage par ricochet — c'est le risque des
// tirs par la bande, pas une visée en arrière.
export function viseVersAvant(p, dir) {
  const versAdversaire = p.side === 1 ? 1 : -1;
  return dir.x * versAdversaire > 0;
}

export function doThrowHuman(p) {
  if (!p.holding) return;
  // La visée vient de la fiche d'intentions, jamais de la souris. Un joueur
  // distant n'a pas de curseur sur cette machine : son tir partait donc vers
  // le curseur de l'hôte, c'est-à-dire n'importe où.
  const c = p.cmd;
  const dir = (c && (c.visee.x || c.visee.y))
    ? norm(c.visee.x, c.visee.y)
    : norm(Mouse.x - p.x, Mouse.y - p.y);
  // Le refus de viser en arrière est décidé APRÈS ce point : c'est ce qui
  // permet à l'invité d'ouvrir sa fenêtre d'arbitrage au bon moment, sur un
  // tir qui part réellement — et pas sur un geste que l'hôte va refuser comme
  // lui vient de le faire, avec la même règle et la même visée.
  if (!viseVersAvant(p, dir)) return;
  // Pas assez vers l'avant pour être un vrai tir : viseVersAvant laisse
  // passer n'importe quelle composante avant, même minuscule, donc un tir
  // presque vertical la satisfaisait tout en restant piégé dans son propre
  // camp — voir TIR_ANGLE_MIN. Seul le TIR l'exige : la feinte et les
  // ultimes gardent leurs propres règles, elles ne rejoignent jamais le mur
  // assez fort pour y rester coincées de la même façon.
  const versAdversaire = p.side === 1 ? 1 : -1;
  if (dir.x * versAdversaire <= TIR_ANGLE_MIN) { sfx('deny'); return; }
  // Le geste le plus important du jeu, et jusqu'ici le seul dont l'invité
  // payait l'aller-retour en entier : le disque quittait sa main plus de cent
  // millisecondes après qu'il ait relâché le bouton. Il part maintenant tout
  // de suite, ici, et l'hôte tranche derrière — d'où la fenêtre pendant
  // laquelle son état, qui décrit un disque encore en main, ne s'applique pas.
  if (!jeSimule() && p === monJoueur()) signalerTirLocal();
  p.face = dir.x >= 0 ? 1 : -1;
  // Dash Throw : attraper pendant un dash puis tirer dans la foulée envoie le
  // disque à pleine puissance sans avoir eu besoin de charger.
  if (p.dashThrowT > 0) {
    p.dashThrowT = 0; p.charge = 1;
    p.stats.dashThrows++;
    addPopup('DASH THROW !', '#35e0ff', 15, .8, p.y - 56);
    burst(p.x + dir.x * 24, p.y + dir.y * 24, '#35e0ff', 14);
    G.shake = Math.max(G.shake, 6);
    throwDisc(p, dir, throwSpeed(1, p.char.power));
    return;
  }
  throwDisc(p, dir, throwSpeed(p.charge, p.char.power));
}

// Plongeon : purement défensif. Il ne rattrape jamais le disque, il le repousse
// très fort. Déclenché dans le vide, le joueur tombe et reste vulnérable.
export function doDive(p, aim) {
  const d = G.disc;
  p.diveT = DIVE_TIME; p.diveHit = false;
  p.diveDir = aim;
  p.face = aim.x >= 0 ? 1 : -1;
  p.charging = false; p.wasCharging = false; p.charge = 0;
  p.dashV.x += aim.x * 300; p.dashV.y += aim.y * 300;
  // Poussière projetée au point d'impact au sol, devant le joueur — le dash,
  // lui, en soulève derrière ses pieds. Les deux actions se distinguent ainsi
  // même sans regarder la pose.
  dust(p.x + aim.x * 26, p.y + 22, 12);
  sfx('dash');

  // Le plongeon se coupe en deux, et la coupure est exactement celle du reste
  // du jeu en ligne : l'ÉLAN appartient au joueur, le CONTACT à l'arbitre.
  // Tout ce qui précède est l'élan — la pose, la poussée, la poussière — et
  // l'invité le joue à l'image de l'appui, sans attendre personne. Ce qui
  // suit décide si le disque est renvoyé, à quelle vitesse, et si le joueur
  // reste au sol : trois conséquences partagées, que l'hôte tranche seul et
  // renvoie une vingtaine de millisecondes plus tard. Les prédire ferait
  // repartir le disque deux fois pour un seul plongeon — la correction que ce
  // jeu supporte le moins.
  if (!jeSimule()) return;

  const inRange = d.free && Math.hypot(d.x - p.x, d.y - p.y) < DIVE_RANGE + DISC_RADIUS;
  // Un disque qui ne vient pas vers nous n'est pas une menace à contrer — ni
  // notre propre disque tout juste lâché (il repart forcément dans l'autre
  // sens), ni un disque immobile ou qui s'éloigne. Sans cette condition, se
  // plonger dessus déclenchait quand même le CONTRE : un double-clic — lâcher
  // le disque puis se replonger dessus dans la foulée — suffisait à le
  // relancer une seconde fois, plus fort qu'un tir chargé à fond (DIVE_POWER),
  // sans une image de charge. Gratuit, offensif, et tout ce que ce geste
  // n'est pas censé être : « purement défensif ».
  const closing = inRange && (d.x - p.x) * d.vx + (d.y - p.y) * d.vy < 0;
  if (!inRange || !closing) {
    // Whiff : rien à contrer, le joueur reste au sol un instant — que le
    // disque ait été hors de portée ou simplement pas une menace.
    p.diveDown = DIVE_WHIFF_DOWN;
    return;
  }
  p.diveHit = true;
  // Perfect Dive : le disque doit être sur le point d'arriver, pas seulement
  // se rapprocher. Sans cette seconde condition, un disque lent qui vient tout
  // juste d'amorcer sa route vers nous déclencherait le parry alors qu'il est
  // encore loin.
  const dist = Math.hypot(d.x - p.x, d.y - p.y);
  const tti = dist / Math.max(1, Math.hypot(d.vx, d.vy));
  if (tti <= PERFECT_WINDOW && dist < DIVE_RANGE) perfectDive(p);
  else {
    throwDisc(p, aim, DIVE_POWER * p.char.power);
    burst(d.x, d.y, p.char.accent, 16);
    G.shake = Math.max(G.shake, 7);
    addPopup('CONTRE !', '#ffd23e', 13, .7, p.y - 56);
  }
}

// Renvoi parfait : visé automatiquement vers le but adverse, à vitesse fulgurante,
// avec ralenti, flash et secousse. Aucun son neuf : on réutilise ceux du jeu.
function perfectDive(p) {
  // Le jeu est seul à connaître sa fenêtre : il le signale à l'observateur de
  // gestes, que le tutoriel interroge.
  signalerPerfectDive(p);
  p.stats.perfects++;
  const gx = p.side === 1 ? COURT.right : COURT.left;
  const dir = norm(gx - p.x, CY - p.y);
  throwDisc(p, dir, PERFECT_SPEED * p.char.power);
  G.disc.super = true;
  p.meter = clamp(p.meter + 30 * METER_GAIN, 0, 100);
  G.timescale = .3; G.tsTimer = .3;
  G.zoom = { t: 0, dur: .45, x: p.x, y: p.y };
  G.flash = .35;
  G.shake = Math.max(G.shake, 18);
  G.banner = { text: 'PERFECT DIVE !', color: '#35e0ff', t: 0, dur: 1.1 };
  burst(p.x, p.y, '#ffffff', 26); burst(p.x, p.y, '#35e0ff', 22);
  starBurst(p.x, p.y); ring(p.x, p.y, '#35e0ff');
  sfx('perfect'); commentNom(p, 'defense',
    ['QUEL RENVOI !', 'QUEL RÉFLEXE !', 'PERFECT DIVE !'],
    n => [`QUEL RENVOI DE ${n} !`, `${n} SORT LE GRAND JEU !`, `${n} AVEC LE PERFECT DIVE !`]);
}

export function onThrowEvent(thrower) {
  const foe = thrower.foe;
  if (foe.ai) {
    const D = foe.ai.diff;
    // Semé : le temps de réaction de l'IA, sa décision de rater et de combien
    // décident qui marque. C'est du match, pas du décor. Tiré au hasard libre,
    // deux machines ne jouaient pas contre le même adversaire — et rejouer une
    // image n'en redonnait pas le même résultat, ce qui interdit tout
    // rembobinage. La dernière fuite du partage jeu/cosmétique, avec aiDodges.
    foe.ai.reactAt = G.now + D.react * (0.8 + randJeu(.5));
    foe.ai.miss = aleaJeu() < D.miss;
    foe.ai.missOff = (aleaJeu() < .5 ? -1 : 1) * (90 + randJeu(80));
    foe.ai.tracked = null;
    foe.ai.plan = null;
  }
}

export function onCatch(p, sp, dirx, diry) {
  // Trouvé en vérifiant 8a et 8b ensemble, pas en les testant séparément :
  // updateDisc tourne désormais chez l'invité, et son test de proximité
  // géométrique appelle onCatch tout seul, sans savoir que la réception est
  // une décision qui ne lui appartient pas. Sans cette garde, une réception
  // à peine décalée d'un ou deux pixels — la position PRÉDITE de l'adversaire
  // n'est jamais tout à fait exacte — pouvait faire jouer un « PERFECT CATCH ! »
  // et un ralenti que l'hôte n'a jamais décidés, corrigés d'un coup à l'image
  // suivante. Le disque continue simplement de voler jusqu'au prochain paquet
  // — au pire une vingtaine de millisecondes à 60 Hz — plutôt que de risquer
  // un effet que personne n'a réellement déclenché.
  if (!jeSimule()) return;
  const d = G.disc;
  // Mesuré avant que le recul de l'attrapé ne vienne gonfler dashV.
  const enDash = Math.hypot(p.dashV.x, p.dashV.y) > 130 || p.lunge > 0;
  const kb = clamp(sp * .22, 26, 260);
  p.dashV.x += (dirx || 0) * kb; p.dashV.y += (diry || 0) * kb * .4;
  dust(p.x, p.y + 18, Math.min(10, 2 + sp / 200));
  d.heldBy = p; d.free = false; d.vx = 0; d.vy = 0; d.kind = 'normal'; d.big = false; d.super = false;
  G.trail.length = 0;
  p.holding = true; p.charge = 0; p.stats.catches++;
  if (enDash) p.stats.dashCatches++;
  // Se relancer le disque dans son propre camp — un rebond sur son propre
  // mur ou plafond, jamais dans un vrai échange — ne rapporte rien à la
  // reprise. Sans cette garde, la jauge d'ultime se remplissait tout seul,
  // en boucle, sans le moindre adversaire impliqué. La récupération reste
  // sinon inchangée : on la reprend en main normalement, seule la jauge
  // est concernée.
  const soiMeme = p === d.thrower && d.rebondPropreCamp;
  if (!soiMeme) p.meter = clamp(p.meter + 12 * METER_GAIN, 0, 100);
  p.holdTimer = 0;
  G.rally++; G.maxRally = Math.max(G.maxRally, G.rally); G.idleT = 0;
  G.lastCatchIdx = G.rec.length;   // point de départ du prochain replay
  G.depuisPrise = 0;               // et son minutage, lui, est de la simulation
  // Attrapé pendant un dash (ou juste après un Cancel Dash) : le joueur a un
  // court instant pour déclencher un Dash Throw, tir instantané à pleine
  // puissance. S'il ne clique pas, il garde simplement le disque en main.
  if (p.dashT > 0 || p.cancelCatchT > 0) p.dashThrowT = DASH_THROW_WINDOW;
  sfx('catch'); ring(p.x, p.y, p.char.accent);
  // Captain : un bouclier apparaît un instant autour de celui qui attrape.
  // Attaché au joueur et pas au disque, parce que le disque vient de quitter
  // le terrain pour sa main — c'est lui qu'on regarde à cet instant.
  if (skinDuJoueur(p) === 'captain') p.bouclierT = .45;
  if (sp > 780) {
    // 14 (était 20) : une réception à 780+ px/s reste la plus généreuse du
    // jeu, mais 32 au total (12 + 20) sur un seul geste rapprochait trop vite
    // de l'ultime suivant pour ce qui reste une réception, pas un but.
    if (!soiMeme) p.meter = clamp(p.meter + 14 * METER_GAIN, 0, 100);
    addPopup('PERFECT CATCH !', '#ffffff', 14, .9, p.y - 56);
    G.timescale = .3; G.tsTimer = .18; sfx('perfect');
    G.shake = Math.max(G.shake, 7);
    commentNom(p, 'defense',
      ['INCROYABLE ARRÊT !', 'QUELLE RÉCEPTION !', 'IL NE LÂCHE RIEN !'],
      n => [`INCROYABLE ARRÊT DE ${n} !`, `${n} NE LAISSE RIEN PASSER !`, `QUELLE RÉCEPTION DE ${n} !`]);
  } else if (sp > 420) { G.shake = Math.max(G.shake, 3); }
  // Pas de pseudo ici : l'échange oppose les deux joueurs, il n'y a pas un
  // seul nom à mettre en avant.
  if (G.rally === 6) comment(pick(['QUEL ÉCHANGE !', 'ÇA SE BAT DUR !', 'PERSONNE NE CÈDE !']), undefined, 'standard');
  if (p.ai) p.ai.plan = null;
}

export function dropDisc(p) {
  const d = G.disc;
  d.heldBy = null; d.free = true; d.x = p.x; d.y = p.y;
  // Semé : la dispersion du disque lâché décide où il repart, donc qui le
  // récupère. C'est un résultat de match, pas un effet.
  d.vx = gaussJeu() * 140; d.vy = gaussJeu() * 140;
  d.thrownAt = G.now - 1; d.thrower = null; d.kind = 'normal'; d.big = false; d.super = false;
  p.holding = false; p.charging = false; p.wasCharging = false; p.charge = 0; p.throwCd = .7; p.holdTimer = 0;
}

export function ownFoul(p) {
  // Jamais chez l'invité : retirer un point est une décision d'arbitre.
  if (!jeSimule()) return;
  // Aucune sanction pendant l'apprentissage : on y vient pour essayer.
  if (G.training || G.tuto) { setupServe(p.foe.side); return; }
  p.score = Math.max(0, p.score - 1);
  G.shake = 10; sfx('whistle');
  addPopup('FAUTE ! −1 POINT', '#ff5340', 20, 1.5);
  commentNom(p, 'standard',
    ['OH LA FAUTE !', 'ARBITRE, SIFFLET !', 'ÇA NE VA PAS SE PASSER COMME ÇA !'],
    n => [`FAUTE DE ${n} !`, `${n} PERD LE CONTRÔLE !`, `AÏE, FAUTE POUR ${n} !`]);
  burst(p.side === 1 ? COURT.left : COURT.right, p.y, '#ff5340', 18);
  setupServe(p.foe.side);
}

export function scoreGoal(scorer, y) {
  // Le score n'est jamais prédit. L'invité voit son disque franchir la ligne et
  // ne compte rien : c'est l'état de l'hôte qui, une vingtaine de millisecondes
  // plus tard, marque le point et déclenche la mise en scène. On préfère ce
  // délai minuscule à un but affiché puis repris.
  if (!jeSimule()) return;
  // À l'entraînement comme au tutoriel, un but n'est qu'un repère : on le
  // signale brièvement et on remet en place, sans compteur ni mise en scène.
  // Il n'y a rien à gagner ici, et surtout rien à perdre : sans cette garde le
  // partenaire finissait par remporter la partie en plein apprentissage.
  if (G.training || G.tuto) {
    addPopup('BUT !', '#ffd23e', 20, .55, y);
    sfx('goal');
    burst(scorer.side === 1 ? COURT.right : COURT.left, y, '#ffd23e', 20);
    if (G.training) G.training.demandeReset = true;
    else G.tuto.demandeReset = true;
    return;
  }
  const pts = zoneByY(y);
  // Repéré AVANT d'ajouter les points : c'est l'écart qui existait pendant
  // tout l'échange qui vient de se jouer, pas celui qu'on vient de créer.
  const deficitAvant = scorer.score - scorer.foe.score;
  scorer.score += pts;
  scorer.stats.buts++;
  if (pts >= 5) scorer.stats.z5++; else scorer.stats.z3++;
  scorer.meter = clamp(scorer.meter + 25 * METER_GAIN, 0, 100);
  scorer.foe.meter = clamp(scorer.foe.meter + 15 * METER_GAIN, 0, 100);
  G.state = 'goal'; G.goalT = 1.1; G.timescale = .28; G.tsTimer = .5;
  // Toute la mise en scène est dans fx.js : l'invité en ligne ne compte pas les
  // points et ne passe jamais ici, il doit pouvoir la rejouer de son côté.
  effetDeBut(scorer.side, y, scorer.char.color, scorer.char.accent || scorer.char.color, pts, scorer.char.short);
  sfx('goal');
  // Commentaire "légendaire" : soit une grosse remontée (mené d'au moins 5,
  // et ce point remet à égalité ou devant), soit le point de la victoire
  // alors que l'adversaire restait dans le coup jusqu'au bout. Remplace le
  // commentaire de but classique plutôt que de s'y ajouter — les deux
  // parleraient du même point.
  const remontada = deficitAvant <= -5 && scorer.score - scorer.foe.score >= 0;
  const finClutch = scorer.score >= TARGET && scorer.foe.score >= TARGET - 3;
  if (remontada || finClutch) {
    commentNom(scorer, 'legendary',
      remontada
        ? ['QUELLE REMONTADA !', 'IL REVIENT DE NULLE PART !', 'RETOURNEMENT TOTAL !']
        : ['FINISH DE LÉGENDE !', 'IL CLUTCH LE MATCH !', 'VICTOIRE ARRACHÉE !'],
      n => remontada
        ? [`QUELLE REMONTADA DE ${n} !`, `${n} REVIENT DE NULLE PART !`, `${n} RENVERSE TOUT !`]
        : [`${n} SIGNE UN FINISH DE LÉGENDE !`, `${n} CLUTCH LE MATCH !`, `${n} ARRACHE LA VICTOIRE !`]);
  } else if (scorer.ai) { comment(pick(["L'IA EST EN FEU !", "L'IA FRAPPE FORT !", "LE CPU PUNIT !"]), undefined, 'but'); }
  else if (pts === 5) {
    commentNom(scorer, 'but',
      ['ZONE 5 ! QUEL SNIPER !', 'EN PLEINE LUCARNE !', 'MAGNIFIQUE !'],
      n => [`ZONE 5 POUR ${n} ! QUEL SNIPER !`, `${n} EN PLEINE LUCARNE !`, `${n}, MAGNIFIQUE !`]);
  } else {
    commentNom(scorer, 'but',
      ['QUEL TIR !', 'BEAU LANCER !', 'DIRECT AU BUT !'],
      n => [`QUEL TIR DE ${n} !`, `BEAU LANCER DE ${n} !`, `${n}, DIRECT AU BUT !`]);
  }
  if (scorer.foe.ai) { scorer.foe.ai.aggro = 9; }
  if (scorer.score >= TARGET) G.winner = scorer;
  G.pendingServe = scorer.foe.side;
}

export function afterGoal() { if (G.winner) gameOver(); else setupServe(G.pendingServe); }

// Durée du rejeu, EN IMAGES et bornée. Elle se déduit du temps écoulé depuis la
// dernière prise — une donnée de simulation, qui recule avec un rembobinage —
// et non de la longueur du tampon d'enregistrement, qui ne recule jamais. La
// nuance décide de la synchronisation : deux machines qui n'ont pas fait les
// mêmes rembobinages n'ont pas le même tampon, donc n'y passaient pas le même
// nombre d'images, et tout le match se décalait derrière le rejeu.
const REJEU_MIN = 60, REJEU_MAX = 200;

export function startReplay() {
  // Le rejeu appartient à l'hôte, comme le but qui l'a déclenché. L'invité en
  // montait un DEUXIÈME, avec son propre enregistrement, pendant que l'hôte lui
  // envoyait déjà le sien image par image — et les deux ne duraient pas la même
  // chose. Quand celui de l'hôte finissait le premier, l'état reçu repassait à
  // « serve », la boucle cessait d'entrer dans la branche du rejeu, et l'objet
  // G.replay de l'invité restait là pour toujours : bandes noires collées à
  // l'écran, son étouffé, et surtout input.js qui avale tous les clics et la
  // barre d'espace dans skipReplay() — le joueur ne contrôlait plus rien.
  // L'invité ne tient donc plus qu'un drapeau d'affichage, posé et retiré par
  // l'état de l'hôte lui-même (voir appliquerEtat).
  if (!jeSimule()) return;
  const n = G.rec.length;
  if (n < 12) { afterGoal(); return; }
  // Durée adaptative : on remonte jusqu'à l'instant où le buteur a pris le
  // disque, plutôt que d'utiliser un nombre d'images fixe. On borne quand même
  // pour éviter un replay interminable sur une possession très longue.
  // Combien d'images le rejeu va durer : décidé par la simulation, identique
  // des deux côtés. Ce qu'on MONTRE pendant ce temps vient du tampon local,
  // qui peut différer de quelques images — c'est du décor, pas du match.
  const duree = clamp(G.depuisPrise, REJEU_MIN, REJEU_MAX);
  let start = Math.max(0, Math.min(n - 12, n - duree));
  // Repère du tir : première image où le disque n'est plus tenu.
  let shot = start;
  for (let i = start; i < n; i++) { if (!G.rec[i].held) { shot = i; break; } }
  G.replay = { idx: start, end: n - 1, shot, speed: 1, closing: 0, restant: duree };
  G.state = 'replay'; sfx('replay');
  setMuffled(true);
  G.p1.ghosts.length = 0; G.p2.ghosts.length = 0;
}

// Fin du replay : les bandes se referment sur un léger flash avant le retour au
// jeu. Le son redevient normal.
export function endReplay() {
  // Un rejeu d'affichage n'a pas de fin à décider ici : c'est l'hôte qui la
  // décide, et son état la transmettra.
  if (!G.replay || G.replay.distant) return;
  G.replay.closing = .001;      // amorce l'animation de fermeture
}
export function finishReplay() {
  G.replay = null;
  setMuffled(false);
  G.flash = Math.max(G.flash, .22);
  afterGoal();
}
// « CLIQUE POUR PASSER » doit dire vrai des deux côtés. Chez l'hôte on coupe
// tout de suite ; chez l'invité on le demande, et l'hôte coupe pour les deux —
// le rejeu se passe donc au premier des deux qui appuie, sans que personne
// n'attende l'autre.
export function skipReplay() {
  if (G.replay && G.replay.distant) { demanderSkipRejeu(); return; }
  endReplay();
}

function drawOverSprite(canvasEl, ck, scale) {
  const src = CHARS[ck].frames.idle;
  canvasEl.width = src.width * scale;
  canvasEl.height = src.height * scale;
  const c = canvasEl.getContext('2d');
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, canvasEl.width, canvasEl.height);
}

// Titre en perspective dégressive : une lettre par span, taille décroissante.
function buildPerspectiveTitle(el, text) {
  el.innerHTML = '';
  const n = text.length, maxSize = 31, minSize = 9;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0;
    const span = document.createElement('span');
    span.textContent = text[i];
    span.style.fontSize = (maxSize - (maxSize - minSize) * t).toFixed(2) + 'cqh';
    el.appendChild(span);
  }
}

function spawnConfetti() {
  const wrap = $('confettiWrap');
  if (wrap.childElementCount) return; // déjà généré
  const cols = ['#ff8c1f', '#f5e63d', '#5df08a', '#35e0ff', '#ff3b5c', '#c86bff'];
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.className = 'confetti';
    el.style.left = Math.random() * 100 + '%';
    el.style.background = cols[(Math.random() * cols.length) | 0];
    el.style.animationDelay = (Math.random() * 3.4) + 's';
    wrap.appendChild(el);
  }
}

// Stats détaillées par joueur, ouvertes au clic sur un portrait.
let overDetail = {};
function openOverDetail(who) {
  const s = overDetail[who];
  if (!s) return;
  $('vicDetailName').textContent = CHARS[s.ck].short + ' — ' + s.tag;
  $('dButs').textContent = s.buts;
  $('dAttrapes').textContent = s.catches;
  $('d5pt').textContent = s.z5;
  $('d3pt').textContent = s.z3;
  $('dUltimes').textContent = s.specials;
  $('dDash').textContent = s.dashCatches;
  $('vicDetailScrim').classList.add('open');
}
$('vicPortrait').addEventListener('click', () => openOverDetail('winner'));
$('vicLoserCol').addEventListener('click', () => openOverDetail('loser'));
$('vicDetailClose').addEventListener('click', () => $('vicDetailScrim').classList.remove('open'));
$('vicDetailScrim').addEventListener('click', e => {
  if (e.target.id === 'vicDetailScrim') e.currentTarget.classList.remove('open');
});

const COINS_VICTOIRE = 10, COINS_DEFAITE = 5;

// Crédite les pièces gagnées à la fin d'un vrai match, contre un bot ou en
// ligne. Le JcJ local n'en rapporte pas — deux personnes sur un canapé
// s'offriraient des pièces à volonté. Une victoire en ligne compte comme une
// victoire solo.
function recompenserMatch(aGagne) {
  // Celui qui regarde l'écran, pas le joueur de gauche : côté invité, le
  // gain se juge sur SA partie, pas sur celle de son adversaire.
  const p = monJoueur();
  if (!p || !p.human || (G.isJ2J && !Partie.active)) return;
  const montant = aGagne ? COINS_VICTOIRE : COINS_DEFAITE;
  const vp = $('vicPieces');
  if (vp) vp.classList.add('hidden');
  // Rien ne se passe si le compte n'est pas connecté : les pièces vivent côté
  // serveur, il n'y a pas de solde local à faire semblant d'avoir.
  ajouterPieces(montant).then(solde => {
    if (solde === null || !vp) return;
    vp.textContent = '+' + montant + ' 🪙';
    vp.classList.remove('hidden');
  }).catch(() => { });
}

export function gameOver() {
  G.state = 'over';
  if (G.demo) { initMatch(true); return; }
  if (document.pointerLockElement === cv) document.exitPointerLock();
  const winner = G.winner, loser = winner.foe;
  const winnerIsP1 = winner === G.p1;
  // Ai-je gagné, MOI qui regarde cet écran ? Ce n'est pas « le joueur de
  // gauche a-t-il gagné » : en ligne, l'invité tient celui de droite, et il
  // s'entendait donc jouer la fanfare de la victoire en ayant perdu.
  const jaiGagne = Partie.active ? winner === monJoueur() : winnerIsP1;
  sfx(jaiGagne ? 'win' : 'lose');
  recompenserMatch(jaiGagne);
  // Match en ligne : chacun enregistre le sien, de son point de vue. Seuls les
  // matchs en ligne comptent au classement — sinon il suffirait de battre l'IA
  // en très facile en boucle pour trôner en tête.
  if (Partie.active) {
    const moi = Partie.role === 'hote' ? G.p1 : G.p2;
    const adv = Partie.adversaire || {};
    enregistrerMatchComplet({
      adversaireId: adv.id, adversairePseudo: adv.pseudo,
      score: moi.score, scoreAdv: moi.foe.score,
      perso: moi.ck, persoAdv: moi.foe.ck, mode: 'en_ligne',
      // Duree reelle du match, pour la moyenne affichee sur le profil.
      duree: G.debutMatch ? (performance.now() - G.debutMatch) / 1000 : null
    }).catch(() => { /* le classement peut attendre, pas la fin de match */ });
  }

  buildPerspectiveTitle($('vicName'), winner.char.short);
  // L'écran met en scène le vainqueur — son nom, son portrait en grand — mais
  // le verdict s'énonce du point de vue de CELUI QUI REGARDE. Il affichait
  // « VICTOIRE » à tout le monde, y compris au perdant, qui se retrouvait à
  // fêter la victoire de l'autre sans qu'on lui dise jamais qu'il avait perdu.
  $('vicOutcome').textContent = jaiGagne ? 'VICTOIRE' : 'DÉFAITE';
  drawOverSprite($('vicPortrait'), winner.ck, 18);
  drawOverSprite($('vicLoserPortrait'), loser.ck, 8);

  const flag = $('vicFlag'), loserTag = $('vicLoserTag');
  flag.textContent = etiquetteJoueur(winner);
  loserTag.textContent = etiquetteJoueur(loser);
  // La couleur vive marque le camp de celui qui regarde l'écran — même
  // question que plus haut, donc même réponse : `jaiGagne`, calculé une fois.
  flag.className = 'bigFlag ' + (jaiGagne ? 'red' : 'gray');
  loserTag.className = 'flag ' + (jaiGagne ? 'gray' : 'red');

  // Les chiffres du bas sont CEUX DE CELUI QUI REGARDE. En dur sur G.p1, ils
  // affichaient à l'invité les réceptions et les ultimes de son adversaire.
  const moiStats = monJoueur();
  $('vicCatch').textContent = moiStats.stats.catches;
  $('vicSpec').textContent = moiStats.stats.specials;
  $('vicRally').textContent = G.maxRally;

  overDetail = {
    winner: { ck: winner.ck, tag: flag.textContent, ...winner.stats },
    loser: { ck: loser.ck, tag: loserTag.textContent, ...loser.stats }
  };

  spawnConfetti();
  $('confettiWrap').style.display = jaiGagne ? 'block' : 'none';
  $('vicDetailScrim').classList.remove('open');
  showScreen('over');
}
