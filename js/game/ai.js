import { G } from './state.js';
import {
  COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, throwSpeed, TARGET,
  DIVE_RANGE, PERFECT_WINDOW, CATCH_RADIUS, DISC_RADIUS, DISC_BIG_RADIUS,
  DISC_SPEED, DASH_DIST, DASH_TIME
} from '../core/constants.js';
import { clamp, norm, approach } from '../core/utils.js';
// Tout le hasard de l'IA est semé : ses erreurs de lecture et ses hésitations
// sont des décisions de jeu. Deux machines qui simulent la même IA doivent la
// voir prendre les mêmes. C'est ce qui rend possible la reprise par l'IA quand
// un joueur se déconnecte, sans que les deux écrans partent chacun de leur côté.
import { gaussJeu, randJeu, aleaJeu } from '../core/alea.js';
import { throwDisc, doDive } from './actions.js';
import { startDash, cancelDash, doFeint } from './input.js';
import { trySpecial } from './specials.js';
import { SPECIALS } from '../data/specials.js';

// ===========================================================================
// L'ADVERSAIRE ORDINATEUR
//
// Le modèle est celui des CPU de Windjammers : l'ordinateur obéit EXACTEMENT
// aux mêmes règles que le joueur — même vitesse de course, même dash, même
// portée d'attrapé, même ralentissement pendant la charge — et ce qui fait sa
// force ou sa faiblesse, c'est sa tête. Il voit le tir partir avec un temps
// de réaction, il lit la trajectoire avec une erreur qui se corrige à mesure
// que le disque approche, il se place selon ce qu'il a appris de vous, et il
// se trompe davantage quand il a peur ou qu'il est sous pression.
//
// L'ancien comportement, mesuré au banc de tirs, laissait passer 85 % des
// tirs chargés par la bande en Normal : il courait à 64 % de la vitesse du
// joueur, ne se mettait en défense qu'à 350 px du disque, attendait au milieu
// de sa cage au lieu de fermer l'angle, et visait son coin à pile ou face.
//
// Ses trois états — posséder, défendre, se placer — se lisent dans `ai.state`
// (STRIKE, DEFEND, READY/RECOVER), que l'affichage de débogage montre.
// ===========================================================================

// ---------------------------------------------------------------------------
// Styles de jeu. Chaque personnage garde le même cerveau, mais penche d'un
// côté ou de l'autre. Toutes les valeurs vont de 0 à 1, 0,5 étant neutre.
//
//   agressivite : tire tôt et depuis près du filet, plutôt que de construire
//   ruse        : feintes et tirs par la bande
//   puissance   : s'engage sur des tirs chargés à fond
//   sangFroid   : résiste au stress ; bas = craque sous la pression
//   mobilite    : se sert du dash pour se replacer et intercepter
//   profondeur  : défend haut (loin de sa cage) ou bas (collé à la ligne)
//   plongeon    : se jette volontiers pour renvoyer
//   nervosite   : piétine et hésite en attendant
//
// Tirés des personnages eux-mêmes — leurs statistiques et ce qu'ils sont.
// Naruto fonce, Leon garde la tête froide, Isaac panique, Mamie mitraille,
// Chopper encaisse, Yuki file partout, Cyberleek et Flowser trompent.
// ---------------------------------------------------------------------------
const STYLES = {
  naruto:     { agressivite: .85, ruse: .45, puissance: .7, sangFroid: .35, mobilite: .85, profondeur: .7, plongeon: .6, nervosite: .6 },
  isaac:      { agressivite: .35, ruse: .5, puissance: .3, sangFroid: .2, mobilite: .45, profondeur: .3, plongeon: .5, nervosite: .85 },
  leon:       { agressivite: .5, ruse: .55, puissance: .75, sangFroid: .9, mobilite: .45, profondeur: .5, plongeon: .45, nervosite: .15 },
  jingle:     { agressivite: .55, ruse: .7, puissance: .5, sangFroid: .6, mobilite: .4, profondeur: .45, plongeon: .4, nervosite: .4 },
  cyberleek:  { agressivite: .45, ruse: .9, puissance: .35, sangFroid: .7, mobilite: .6, profondeur: .45, plongeon: .35, nervosite: .3 },
  mamie:      { agressivite: .8, ruse: .35, puissance: .45, sangFroid: .8, mobilite: .25, profondeur: .35, plongeon: .2, nervosite: .2 },
  chopper:    { agressivite: .6, ruse: .2, puissance: .9, sangFroid: .75, mobilite: .2, profondeur: .3, plongeon: .3, nervosite: .2 },
  yuki:       { agressivite: .6, ruse: .5, puissance: .3, sangFroid: .5, mobilite: .95, profondeur: .6, plongeon: .65, nervosite: .5 },
  yoshi:      { agressivite: .5, ruse: .4, puissance: .55, sangFroid: .5, mobilite: .55, profondeur: .5, plongeon: .6, nervosite: .55 },
  hollis:     { agressivite: .7, ruse: .6, puissance: .65, sangFroid: .45, mobilite: .6, profondeur: .6, plongeon: .5, nervosite: .45 },
  flowser:    { agressivite: .45, ruse: .75, puissance: .35, sangFroid: .65, mobilite: .5, profondeur: .4, plongeon: .4, nervosite: .35 },
  fricadelle: { agressivite: .55, ruse: .45, puissance: .6, sangFroid: .85, mobilite: .6, profondeur: .45, plongeon: .55, nervosite: .2 }
};
const STYLE_NEUTRE = { agressivite: .5, ruse: .5, puissance: .5, sangFroid: .5, mobilite: .5, profondeur: .5, plongeon: .5, nervosite: .5 };
const style = p => STYLES[p.ck] || STYLE_NEUTRE;

const PAS = 1 / 60;
// Le temps qu'il faut à n'importe quel joueur pour se retourner et démarrer :
// l'accélération n'est pas instantanée (voir updatePlayerHuman, taux 13).
const DEMARRAGE = .09;
// Réaction supposée de l'ADVERSAIRE quand l'IA évalue ses propres tirs : elle
// joue contre quelqu'un qui réagit vite, pas contre un mannequin.
const REACTION_ADVERSE = .22;

const camp = p => p.side === 1 ? 1 : -1;                       // sens de l'attaque
const ligneDeBut = p => p.side === 1 ? COURT.left : COURT.right;
const butAdverse = p => p.side === 1 ? COURT.right : COURT.left;
const dansSonCamp = (p, x) => p.side === 1 ? x < CX - 8 : x > CX + 8;
const rayonAttrape = p => p.char.catchR * CATCH_RADIUS;

// ---------------------------------------------------------------------------
// Trajectoire du disque, avec les MÊMES règles que disc.js : rayon réel,
// rebonds haut et bas qui gardent 99 % de la vitesse, léger freinage de l'air.
// L'ancienne prédiction prenait un rayon de 9 px au lieu de 14 et se trompait
// donc de cinq pixels à chaque rebond — sur un tir par la bande, c'était
// exactement l'écart qui faisait rater la prise.
// Échantillonnée à chaque image, jusqu'à la ligne `xLimite`.
// ---------------------------------------------------------------------------
function trajectoire(x, y, vx, vy, grand, kurama, xLimite, tMax = 2.4) {
  const r = grand ? DISC_BIG_RADIUS : DISC_RADIUS;
  const sens = Math.sign(vx) || 1;
  const pts = [];
  let rebonds = 0;
  const freinage = Math.exp(-.08 * PAS);
  for (let t = PAS; t <= tMax; t += PAS) {
    if (!kurama) { vx *= freinage; vy *= freinage; }
    x += vx * PAS; y += vy * PAS;
    if (y < COURT.top + r) { y = COURT.top + r; vy = Math.abs(vy) * (kurama ? 1 : .99); rebonds++; }
    else if (y > COURT.bottom - r) { y = COURT.bottom - r; vy = -Math.abs(vy) * (kurama ? 1 : .99); rebonds++; }
    pts.push({ x, y, t, rebonds });
    if (sens * (x - xLimite) >= 0) break;
  }
  return pts;
}

// Conservée pour les autres modules qui voudraient une prédiction simple.
export function predictArrivalAtX(disc, targetX) {
  if (!disc || !disc.free || Math.abs(disc.vx) < 10) return null;
  const pts = trajectoire(disc.x, disc.y, disc.vx, disc.vy, disc.big, disc.kind === 'kurama', targetX, 10);
  const fin = pts[pts.length - 1];
  return fin ? { y: clamp(fin.y, COURT.top + 10, COURT.bottom - 10), t: fin.t } : null;
}

// Temps qu'il faut à un joueur pour venir à portée d'attrapé d'un point : il
// n'a pas besoin d'être DESSUS, seulement à portée de bras. Le dash, s'il est
// disponible, couvre DASH_DIST en DASH_TIME.
function tempsAtteinte(q, x, y, vitesse, dashDispo) {
  const dist = Math.max(0, Math.hypot(x - q.x, y - q.y) - rayonAttrape(q) * .8);
  let t = DEMARRAGE + dist / vitesse;
  if (dashDispo && dist > 40) t = Math.min(t, DEMARRAGE + DASH_TIME + Math.max(0, dist - DASH_DIST) / vitesse);
  return t;
}

const vitesseCourse = (p, D) => p.speed * D.speed * (p.charging ? .55 : 1) * (1 - (p.ralenti || 0));
const dashDisponible = p => p.dashT <= 0 && p.dashGap <= 0 && p.diveT <= 0 && p.diveDown <= 0;

// ---------------------------------------------------------------------------
// L'humeur. Trois sources, choisies avec le joueur : la PRESSION du score, le
// STRESS des longs échanges et la PEUR des tirs chargés — plus la chance, qui
// se joue ailleurs (bourdes et plongeons désespérés). Le sang-froid du
// personnage en absorbe une partie.
//
// Et un équilibrage discret : quand l'écart se creuse, celui qui est mené
// retrouve un peu de réflexes et celui qui mène s'en relâche un peu. Il agit
// sur les CAPACITÉS (réaction, lecture), la pression sur les DÉCISIONS (prises
// de risque, précipitation) : les deux ne s'annulent pas.
// ---------------------------------------------------------------------------
function majHumeur(p, d, S, dt) {
  const h = d.humeur || (d.humeur = { stress: 0, scoreVu: p.score, scoreAdvVu: p.foe.score, rallyVu: 0 });
  // But encaissé : le coup au moral. But marqué : il se détend.
  if (p.foe.score > h.scoreAdvVu) h.stress = Math.min(1, h.stress + .3);
  if (p.score > h.scoreVu) h.stress = Math.max(0, h.stress - .25);
  h.scoreVu = p.score; h.scoreAdvVu = p.foe.score;
  h.stress = Math.max(0, h.stress - dt * .1);
  // Plus l'échange dure, plus chaque réception pèse.
  const rally = clamp((G.rally - 3) * .07, 0, .45);
  // Mené en fin de match, et d'autant plus que la fin approche.
  const ecart = p.foe.score - p.score;
  const avancement = Math.max(p.score, p.foe.score) / TARGET;
  const pression = clamp(ecart / 10, 0, 1) * (.4 + .6 * avancement);
  // La peur ne dure que le temps que l'adversaire arme un gros tir.
  const peur = (p.foe.charging && p.foe.charge > .6) ? (p.foe.charge - .6) * 2.5 : 0;
  const brut = clamp(h.stress + rally + pression * .5 + peur * .35, 0, 1);
  d.stress = brut * (1 - .6 * S.sangFroid);
  d.peur = peur * (1 - .5 * S.sangFroid);
  d.pression = pression;
  // L'équilibrage, borné à ±15 % : +1 quand le joueur mène largement.
  d.equilibre = (G.demo || !p.foe.human) ? 0 : clamp(ecart / 12, -1, 1);
  // `aggro` reste lu par l'affichage de débogage et relevé par actions.js
  // quand l'IA encaisse : on s'en sert comme d'une envie de revanche.
  if (d.aggro > 0) d.aggro = Math.max(0, d.aggro - dt * .8);
}

// Multiplicateurs qui en découlent.
const facteurReaction = d => (1 + .55 * d.stress) * (1 - .15 * d.equilibre);
const facteurLecture = d => (1 + .8 * d.stress) * (1 - .18 * d.equilibre);

// ---------------------------------------------------------------------------
// Les habitudes du joueur. À chaque tir adverse, on note où il arrive sur la
// ligne de but et s'il passe par la bande. Avec le temps, l'IA couvre d'avance
// ce qu'il fait le plus — c'est ce qui casse le farm d'un même tir répété, et
// c'est aussi ce qui la rend piégeable : un joueur qui a compris qu'elle anticipe
// peut changer de côté au dernier moment.
// ---------------------------------------------------------------------------
function noterTirAdverse(d, arriveeY, rebonds) {
  const m = d.habitudes || (d.habitudes = { cote: 0, bande: 0, n: 0 });
  const cote = clamp((arriveeY - CY) / ((GOAL_BOTTOM - GOAL_TOP) / 2), -1, 1);
  // Moyenne glissante : les derniers tirs comptent le plus.
  m.cote = m.cote * .75 + cote * .25;
  m.bande = m.bande * .75 + (rebonds > 0 ? 1 : 0) * .25;
  m.n++;
}

// ---------------------------------------------------------------------------
// Point de garde quand l'adversaire a le disque, ou va l'avoir. C'est la
// position de gardien de but : sur la droite qui va du centre de sa cage au
// tireur, à une profondeur qui dépend du style — ce qui ferme l'angle des tirs
// directs sans découvrir les tirs par la bande (d'où le rappel vers le centre).
// ---------------------------------------------------------------------------
function pointDeGarde(p, d, D, S, tireur) {
  const gx = ligneDeBut(p), sens = camp(p);
  let profondeur = 95 + S.profondeur * 110;
  // La peur fait reculer : face à une charge pleine, on se rapproche de sa cage.
  profondeur -= d.peur * 55;
  const dxTireur = Math.max(60, Math.abs(tireur.x - gx));
  const yAngle = CY + (tireur.y - CY) * clamp(profondeur / dxTireur, 0, 1);
  let y = CY + (yAngle - CY) * .55;
  // Ce qu'il a appris des tirs précédents : il se décale vers le côté favori,
  // d'autant plus que l'habitude est nette et qu'il est malin.
  const m = d.habitudes;
  if (m && m.n >= 3) y += m.cote * 42 * D.smart;
  // La flèche de charge de l'adversaire se VOIT à l'écran : un humain en tient
  // compte, et un bot aussi. Une anticipation partielle, qu'une feinte ou un
  // coup de poignet au dernier moment peut punir.
  const foe = p.foe;
  if (foe.charging && foe.cmd && (foe.cmd.visee.x || foe.cmd.visee.y)) {
    const v = throwSpeed(Math.max(.3, foe.charge), foe.char.power) * DISC_SPEED;
    const pts = trajectoire(foe.x, foe.y, foe.cmd.visee.x * v, foe.cmd.visee.y * v, false, false, gx + sens * profondeur, 1.6);
    const fin = pts[pts.length - 1];
    if (fin) y += (fin.y - y) * D.smart * (.25 + .35 * foe.charge);
  }
  return {
    x: gx + sens * profondeur,
    y: clamp(y, GOAL_TOP - 40, GOAL_BOTTOM + 40)
  };
}

// ---------------------------------------------------------------------------
// Défense : où intercepter un disque qui arrive.
//
// Parmi les points de la trajectoire situés dans son camp et atteignables à
// temps, il choisit le plus proche de SA ligne de défense préférée — ni le
// premier (il se jetterait au filet et serait perdu s'il le manquait), ni le
// dernier (il attendrait sur sa ligne de but, comme avant). S'il n'en atteint
// aucun, il vise la ligne de but : c'est le désespoir, et la place de la chance.
// ---------------------------------------------------------------------------
function choisirInterception(p, d, D, S, pts, vitesse) {
  const xPref = ligneDeBut(p) + camp(p) * (80 + S.profondeur * 120);
  const dash = dashDisponible(p);
  const jugement = d.jugement || 1;
  let meilleur = null, meilleurEcart = Infinity;
  for (const pt of pts) {
    if (!dansSonCamp(p, pt.x)) continue;
    if (tempsAtteinte(p, pt.x, pt.y, vitesse, dash) * jugement > pt.t) continue;
    const ecart = Math.abs(pt.x - xPref);
    if (ecart < meilleurEcart) { meilleurEcart = ecart; meilleur = pt; }
  }
  if (meilleur) return { ...meilleur, sur: true };
  const fin = pts[pts.length - 1];
  return fin ? { ...fin, sur: false } : null;
}

// ---------------------------------------------------------------------------
// Attaque : le choix du tir.
//
// Six tirs candidats — chaque coin, en direct ou par l'une des deux bandes —
// évalués contre la position RÉELLE du défenseur : pour chacun, de combien il
// serait en retard au meilleur point d'interception. L'IA tire ensuite au
// sort parmi eux en favorisant les meilleurs, d'autant plus nettement qu'elle
// est lucide : un bot malin et calme trouve presque toujours l'ouverture, un
// bot stressé se trompe de côté. Ses penchants (ruse, puissance) pèsent aussi.
// ---------------------------------------------------------------------------
function candidatsTir(p) {
  const gx = butAdverse(p) + camp(p) * 30;
  const out = [];
  for (const c of [GOAL_TOP + 18, GOAL_BOTTOM - 18]) {
    out.push({ type: 'direct', vise: { x: gx, y: c }, but: c });
    out.push({ type: 'bande', vise: { x: gx, y: 2 * (COURT.top + DISC_RADIUS) - c }, but: c });
    out.push({ type: 'bande', vise: { x: gx, y: 2 * (COURT.bottom - DISC_RADIUS) - c }, but: c });
  }
  return out;
}

// De combien le défenseur arrive trop tard sur ce tir (positif = tir gagnant).
function retardDefenseur(p, cand, charge) {
  const foe = p.foe;
  const dir = norm(cand.vise.x - p.x, cand.vise.y - p.y);
  if (dir.x * camp(p) <= .05) return -1;          // on ne tire que vers l'avant
  const v = throwSpeed(charge, p.char.power) * DISC_SPEED;
  const pts = trajectoire(p.x + dir.x * 22, p.y + dir.y * 22, dir.x * v, dir.y * v, false, false, butAdverse(p), 2.4);
  const fin = pts[pts.length - 1];
  if (!fin || fin.y < GOAL_TOP || fin.y > GOAL_BOTTOM) return -1;   // le tir ne cadre pas
  const vFoe = foe.speed * (foe.ai ? foe.ai.diff.speed : 1);
  // Sa meilleure chance : le point où il a le plus d'avance sur le disque.
  let avance = -Infinity;
  for (const pt of pts) {
    if (!dansSonCamp(foe, pt.x)) continue;
    const a = pt.t - (REACTION_ADVERSE + tempsAtteinte(foe, pt.x, pt.y, vFoe, dashDisponible(foe)));
    if (a > avance) avance = a;
  }
  return avance === -Infinity ? .5 : -avance;
}

function choisirTir(p, d, D, S, charge, lucidite) {
  const cands = candidatsTir(p);
  const scores = cands.map(c => {
    let s = retardDefenseur(p, c, charge);
    if (c.type === 'bande') s += (S.ruse - .5) * .12;
    return s;
  });
  // Tirage pondéré (softmax). La « température » dit à quel point il s'écarte
  // du meilleur choix : faible = lucide, élevée = au petit bonheur.
  const T = .035 + .13 * (1 - D.smart) + .08 * d.stress + (1 - lucidite) * .1;
  const m = Math.max(...scores);
  const poids = scores.map(s => Math.exp((s - m) / T));
  let tirage = aleaJeu() * poids.reduce((a, b) => a + b, 0);
  for (let i = 0; i < cands.length; i++) { tirage -= poids[i]; if (tirage <= 0) return { ...cands[i], score: scores[i] }; }
  return { ...cands[0], score: scores[0] };
}

// ---------------------------------------------------------------------------
// La boucle de décision, appelée à chaque image pour chaque joueur ordinateur.
// ---------------------------------------------------------------------------
export function updateAI(p, dt) {
  const d = p.ai, D = d.diff, S = style(p), foe = p.foe, disc = G.disc;
  if (!foe || !disc) return;
  majHumeur(p, d, S, dt);
  if (p.stun > 0) { d.target = { x: p.x, y: p.y }; p.vx = approach(p.vx, 0, 20, dt); p.vy = approach(p.vy, 0, 20, dt); return; }
  if (p.diveDown > 0) { p.vx = approach(p.vx, 0, 12, dt); p.vy = approach(p.vy, 0, 12, dt); return; }

  // Ultime : jauge pleine, il tente de le lancer, avec un empressement qui
  // dépend de la difficulté. Coupé pendant la démo par trySpecial() lui-même.
  if (p.meter >= 100 && !G.cine && (G.state === 'play' || G.state === 'serve')) {
    const u = SPECIALS[p.char.ult];
    if (u && (!u.needsDisc || p.holding) && aleaJeu() < D.special * dt) trySpecial(p);
  }

  // Désorienté par un ultime adverse (voir specials.js) : il ne décide plus
  // rien le temps que ça dure, et dérive au hasard.
  if (d.hesT > 0) {
    d.hesT -= dt;
    if (!d.hes || aleaJeu() < dt * 3) d.hes = { x: gaussJeu() * 90, y: gaussJeu() * 110 };
    p.vx = approach(p.vx, d.hes.x, 6, dt); p.vy = approach(p.vy, d.hes.y, 6, dt);
    return;
  }

  // Un nouveau tir adverse vient de partir : on le lit une fois pour toutes —
  // son erreur de lecture, sa bourde éventuelle — et on note l'habitude.
  // Reconnu à son numéro (le compteur de tirs du lanceur) et non à son heure :
  // l'horloge du match repart de zéro à chaque engagement, et deux tirs lâchés
  // au même instant après l'engagement passaient pour le même tir — l'IA
  // gardait alors la lecture du précédent.
  if (disc.free && disc.thrower === foe && d.tirLu !== foe.stats.thrown) {
    d.tirLu = foe.stats.thrown;
    const pts = trajectoire(disc.x, disc.y, disc.vx, disc.vy, disc.big, disc.kind === 'kurama', ligneDeBut(p));
    const fin = pts[pts.length - 1];
    if (fin) noterTirAdverse(d, fin.y, fin.rebonds);
    const rebonds = fin ? fin.rebonds : 0;
    // L'erreur de lecture est tirée une fois par tir : c'est ce qui rend
    // l'intention du bot lisible, et c'est une erreur qui se corrige à mesure
    // que le disque approche — elle coûte du temps, pas forcément le point.
    d.erreurLecture = gaussJeu() * D.err * .45 * (1 + .55 * rebonds) * facteurLecture(d);
    // La bourde : une lecture franchement fausse, qui ne se rattrape pas. Plus
    // fréquente sous le stress, plus rare quand il est mené de loin.
    d.bourde = aleaJeu() < D.miss * (.55 + d.stress) * (1 - .3 * d.equilibre);
    d.bourdeOffset = (aleaJeu() < .5 ? -1 : 1) * (120 + randJeu(100));
    d.reactAt = G.now + D.react * (.8 + randJeu(.5)) * facteurReaction(d);
    // Le pari. Avant même le départ du tir, un humain devine souvent un côté
    // et s'y penche — c'est ce qui donne tout leur prix à la visée et aux
    // feintes. S'il a deviné juste, rien ne change ; s'il s'est trompé, il doit
    // d'abord se retourner, et repart en retard.
    const parie = aleaJeu() < (1 - D.smart) * .55 * (.6 + S.nervosite) + d.stress * .2;
    if (parie && fin) {
      const cotePari = aleaJeu() < .5 ? -1 : 1;
      const coteReel = fin.y < CY ? -1 : 1;
      if (cotePari !== coteReel) d.reactAt += .1 + randJeu(.14);
      d.pari = { x: ligneDeBut(p) + camp(p) * 110, y: CY + cotePari * 70 };
    } else d.pari = null;
    // Le jugement des distances : chaque tir, il s'estime un peu plus ou un peu
    // moins rapide qu'il ne l'est. Trop confiant, il file intercepter un point
    // qu'il n'atteindra pas ; trop prudent, il attend sur sa ligne.
    d.jugement = 1 + gaussJeu() * .14 * (1 - D.smart) * (1 + d.stress);
    d.plongeonAnticipe = false;
    d.interception = null;
  }

  const vitesse = vitesseCourse(p, D);
  let target;
  // Disque perdu sans l'avoir lancé — but, faute, interception pendant une
  // feinte : la prochaine possession doit repartir d'un plan neuf.
  if (!p.holding) d.avaitDisque = false;

  if (p.holding) {
    target = attaquer(p, d, D, S, dt);
  } else {
    const arrive = disc.free && disc.thrower === foe && camp(p) * disc.vx < -20;
    const lent = disc.free && Math.hypot(disc.vx, disc.vy) < 220;
    if (arrive && !lent) {
      target = defendre(p, d, D, S, vitesse);
    } else if (disc.free && dansSonCamp(p, disc.x) && (lent || camp(p) * disc.vx <= 0)) {
      // Un disque mort ou ralenti dans son camp : il va le chercher.
      d.state = 'STRIKE';
      target = { x: disc.x + disc.vx * .15, y: disc.y + disc.vy * .15 };
      if (dashDisponible(p) && Math.hypot(target.x - p.x, target.y - p.y) > 150 && aleaJeu() < S.mobilite * 4 * dt) {
        startDash(p, norm(target.x - p.x, target.y - p.y));
      }
    } else {
      target = seReplacer(p, d, D, S, dt);
    }
    d.emaTarget.x = 0; d.emaTarget.y = 0;
  }

  // Une IA ne traverse jamais le filet : sa cible est bornée à SON camp.
  const minX = p.side === 1 ? COURT.left + 22 : CX + 20;
  const maxX = p.side === 1 ? CX - 20 : COURT.right - 22;
  target.x = clamp(target.x, minX, maxX);
  target.y = clamp(target.y, COURT.top + 18, COURT.bottom - 18);
  d.target = target;

  // Le déplacement, avec les réglages exacts du joueur : même vitesse de
  // pointe, même accélération, même ralentissement pendant la charge.
  const dx = target.x - p.x, dy = target.y - p.y, dist = Math.hypot(dx, dy);
  const arrete = dist < 5;
  const tx = arrete ? 0 : dx / dist * vitesse, ty = arrete ? 0 : dy / dist * vitesse;
  // Près de la cible il ralentit au lieu de la dépasser et de revenir.
  const freine = clamp(dist / 40, .25, 1);
  p.vx = approach(p.vx, tx * freine, arrete ? 5 : 13, dt);
  p.vy = approach(p.vy, ty * freine, arrete ? 5 : 13, dt);
  if (!p.holding) p.face = (foe.x > p.x) ? 1 : -1;

  if (disc.free && !p.holding && p.throwCd <= 0 && p.diveT <= 0) plonger(p, d, D, S, dt);
}

// ---------------------------------------------------------------------------
function defendre(p, d, D, S, vitesse) {
  const disc = G.disc;
  d.state = 'DEFEND';
  // Tant qu'il n'a pas « vu » le tir partir, il continue ce qu'il faisait —
  // ou il suit son pari, s'il en a fait un.
  if (G.now < d.reactAt) return d.pari || d.target || { x: p.x, y: p.y };
  // La trajectoire se relit en continu : un disque dévié, une cloche, un
  // leurre peuvent l'avoir changée depuis le départ.
  const pts = trajectoire(disc.x, disc.y, disc.vx, disc.vy, disc.big, disc.kind === 'kurama', ligneDeBut(p));
  const cible = choisirInterception(p, d, D, S, pts, vitesse);
  if (!cible) return seReplacer(p, d, D, S, 0);
  // L'erreur se réduit à mesure que le disque approche, sans jamais tout à fait
  // disparaître. La bourde, elle, ne se rattrape pas.
  const resteRel = clamp(cible.t / .6, .25, 1);
  let y = cible.y + (d.erreurLecture || 0) * resteRel;
  if (d.bourde) y += d.bourdeOffset * Math.max(resteRel, .8);
  d.interception = cible;
  const t = { x: cible.x, y };
  // S'il ne sera pas à l'heure en courant, il dashe — plus volontiers s'il est
  // mobile, et toujours s'il est à la dernière extrémité.
  const dist = Math.hypot(t.x - p.x, t.y - p.y);
  const tCourse = DEMARRAGE + Math.max(0, dist - rayonAttrape(p) * .8) / vitesse;
  if (dashDisponible(p) && dist > 70 && tCourse > cible.t * .9) {
    const envie = cible.sur ? .35 + .6 * S.mobilite : .9;
    if (aleaJeu() < envie * D.dash * 12 * PAS) startDash(p, norm(t.x - p.x, t.y - p.y));
  }
  // Dash parti dans la mauvaise direction (le disque s'éloigne de sa course) :
  // il plante les freins, comme le joueur peut le faire.
  if (p.dashT > 0) {
    const dd = norm(p.dashDir.x, p.dashDir.y), vers = norm(t.x - p.x, t.y - p.y);
    if (dd.x * vers.x + dd.y * vers.y < .2 && aleaJeu() < D.smart * .5) cancelDash(p);
  }
  return t;
}

// ---------------------------------------------------------------------------
function seReplacer(p, d, D, S, dt) {
  const foe = p.foe, disc = G.disc;
  d.state = (d.state === 'STRIKE' || d.state === 'DEFEND') ? 'RECOVER' : 'READY';
  // Où sera le tireur : celui qui a le disque, ou celui vers qui il file.
  const tireur = disc.heldBy === foe ? foe
    : (disc.free && camp(p) * disc.vx > 0 ? { x: foe.x, y: disc.y + (foe.y - disc.y) * .5 } : foe);
  // Une décision humaine ne se reprend pas à chaque image : il réévalue son
  // placement par petites touches, quelques fois par seconde, et piétine un
  // peu entre deux — plus ou moins selon son tempérament.
  d.prochaineDecision = d.prochaineDecision || 0;
  if (!d.garde || G.now >= d.prochaineDecision) {
    d.garde = pointDeGarde(p, d, D, S, tireur);
    const pietine = 5 + 16 * S.nervosite * (1 + d.stress);
    d.garde.x += gaussJeu() * pietine * .6;
    d.garde.y += gaussJeu() * pietine;
    d.prochaineDecision = G.now + .12 + randJeu(.18) * (1 + d.stress);
  }
  // Il se replace en courant, et en dashant s'il est très loin.
  if (dt && dashDisponible(p)) {
    const loin = Math.hypot(d.garde.x - p.x, d.garde.y - p.y);
    if (loin > 170 && aleaJeu() < S.mobilite * D.dash * 1.5 * dt) startDash(p, norm(d.garde.x - p.x, d.garde.y - p.y));
  }
  if (disc.heldBy === foe) return marquage(p, d, D, S, d.garde);
  d.marquage = null;
  return { x: d.garde.x, y: d.garde.y };
}

// ---------------------------------------------------------------------------
// Marquage : tant que l'adversaire garde le disque, un humain ne reste pas
// planté devant sa cage. Il change d'intention toutes les demi-secondes —
// monter presser le tireur, le suivre en miroir, se pencher d'un côté pour
// l'inviter à tirer de l'autre — et ne tient jamais en place. Quand la charge
// démarre, il lit la menace et se replie : celui qui presse trop haut se fait
// punir s'il réagit tard, et c'est exactement l'ouverture qu'on doit chercher.
// ---------------------------------------------------------------------------
function marquage(p, d, D, S, garde) {
  const foe = p.foe, sens = camp(p);
  let m = d.marquage;
  if (!m || G.now >= m.jusqua || G.now < m.depuis) {
    const r = aleaJeu(), presse = .25 + .6 * S.agressivite;
    m = d.marquage = {
      mode: r < presse * .6 ? 'presse' : r < .72 ? 'ombre' : 'penche',
      depuis: G.now,
      jusqua: G.now + .45 + randJeu(.75),
      avance: (60 + randJeu(120)) * (.5 + S.agressivite),
      penche: (aleaJeu() < .5 ? -1 : 1) * (40 + randJeu(55)),
      phase: m ? m.phase : randJeu(6.28)
    };
  }
  const repli = foe.charging ? clamp(foe.charge * (1.2 + D.smart), 0, 1) : 0;
  let x = garde.x, y = garde.y;
  if (m.mode === 'presse') x += sens * m.avance * (1 - repli);
  if (m.mode !== 'penche') y += (foe.y - y) * .45 * (1 - .6 * repli);
  else y += m.penche * (1 - repli);
  // Le balancement d'appui, plus ample chez les nerveux et les mobiles.
  const amp = 10 + 22 * S.nervosite + 12 * S.mobilite;
  y += Math.sin(G.now * (2.2 + 1.5 * S.nervosite) + m.phase) * amp;
  x += Math.sin(G.now * 1.3 + m.phase * 2) * amp * .5 * sens;
  return { x, y };
}

// ---------------------------------------------------------------------------
// Plongeon. Il ne rattrape jamais le disque — il le renvoie (voir doDive).
// Un joueur bien placé préfère attraper ; on plonge quand on ne sera PAS à
// portée, en visant le Perfect Dive si on en est capable. Et deux écarts
// humains : se jeter trop tôt de peur devant un tir chargé à fond, et le
// plongeon désespéré, qui passe parfois.
// ---------------------------------------------------------------------------
function plonger(p, d, D, S, dt) {
  const disc = G.disc;
  const dd = Math.hypot(disc.x - p.x, disc.y - p.y);
  const sp = Math.hypot(disc.vx, disc.vy);
  const closing = (disc.x - p.x) * disc.vx + (disc.y - p.y) * disc.vy < 0;
  if (!closing || disc.thrower !== p.foe) return;
  const tti = dd / Math.max(1, sp);
  const mor = clamp(1 + (p.score - p.foe.score) * .03, .75, 1.3);
  // Où le disque passera par rapport à lui : s'il passe à portée de bras, il
  // l'attrape (disc.js s'en charge), inutile de plonger.
  const passe = d.interception ? Math.hypot(d.interception.x - p.x, d.interception.y - p.y) : dd;
  const aPortee = passe < rayonAttrape(p) * .85;
  const renvoi = norm(butAdverse(p) - p.x, (aleaJeu() < .5 ? GOAL_TOP + 20 : GOAL_BOTTOM - 20) - p.y);
  // La peur : face à un tir chargé à fond, il peut partir trop tôt — et
  // tomber dans le vide. C'est ce que la charge doit faire à un adversaire.
  if (disc.super && !d.plongeonAnticipe && tti < .45 && tti > .22) {
    d.plongeonAnticipe = true;
    if (aleaJeu() < d.peur * .5 + d.stress * .25 * (1 - D.smart)) { doDive(p, renvoi); return; }
  }
  if (dd >= DIVE_RANGE + 26) return;
  if (aPortee && !(D.parry > 0 && tti <= PERFECT_WINDOW && aleaJeu() < D.parry * mor * .35)) return;
  // Hors de portée de bras mais à portée de plongeon : il se jette. Le Perfect
  // Dive pour qui sait l'attendre, un plongeon franc pour les autres.
  const viseParry = D.parry > 0 && aleaJeu() < D.parry * mor;
  const go = viseParry ? tti <= PERFECT_WINDOW * 1.5
    : aleaJeu() < (D.dive * mor * (.6 + S.plongeon)) * 6 * dt;
  if (go) doDive(p, renvoi);
}

// ---------------------------------------------------------------------------
// Possession : se placer, choisir son tir, charger, feinter, tirer.
// ---------------------------------------------------------------------------
function attaquer(p, d, D, S, dt) {
  const foe = p.foe;
  d.state = 'STRIKE';
  // Le plan se refait aussi quand il a disparu sous nos pieds : onCatch
  // (actions.js) l'efface à chaque attrapé, et un disque qui part puis revient
  // entre deux décisions de l'IA — l'ultime de Naruto, un renvoi collé — ne
  // lui laissait jamais voir qu'elle l'avait lâché. Elle gardait alors
  // « avaitDisque » et plantait sur un plan vide (trouvé au banc d'équilibrage).
  if (!d.avaitDisque || !d.plan) {
    // Le plan se décide à la prise du disque.
    d.avaitDisque = true;
    p.holdTimer = 0;
    // Charge visée : les puissants s'engagent sur des tirs pleins. Mené de loin,
    // il tente davantage le gros coup ; sous stress, il se précipite.
    const superTir = aleaJeu() < (.15 + .5 * S.puissance) * (.6 + .6 * D.smart) + d.pression * .25;
    d.chargeVisee = superTir ? .97 : clamp(.28 + S.puissance * .35 + gaussJeu() * .1 - d.stress * .15, .15, .8);
    // Temps de décision avant de commencer à charger : court pour les agressifs,
    // plus court encore quand il panique.
    d.tempsDecision = clamp(.75 - .7 * S.agressivite + randJeu(.3) - d.stress * .2, .06, .9);
    d.veutFeinter = aleaJeu() < (.1 + .55 * S.ruse) * D.smart;
    d.plan = choisirTir(p, d, D, S, d.chargeVisee, .6);
    // L'imprécision du poignet est tirée ici, pas au lâcher : elle fait partie
    // de la visée affichée, et le disque part exactement où pointe la flèche.
    d.bruit = gaussJeu() * D.err * .22 * (1 + d.stress);
    d.relu = false;
    d.emaTarget.x = d.plan.vise.x; d.emaTarget.y = d.plan.vise.y + d.bruit;
    // Où il va se poster pour tirer : près du filet pour les agressifs, plus
    // en retrait pour les posés, et du côté qui ouvre l'angle.
    const recul = 80 + (1 - S.agressivite) * 190;
    d.poste = {
      x: CX - camp(p) * recul,
      y: clamp(p.y + (CY - foe.y) * .35 + gaussJeu() * 40, COURT.top + 60, COURT.bottom - 60)
    };
  }
  p.holdTimer += dt;
  p.face = camp(p);
  // La visée affichée (la flèche) tourne vers le plan à vitesse de poignet :
  // un changement d'avis se VOIT, comme la souris d'un joueur qui se ravise.
  const e = d.emaTarget;
  e.x = approach(e.x, d.plan.vise.x, 14, dt);
  e.y = approach(e.y, d.plan.vise.y + d.bruit, 14, dt);
  const plan = d.plan;

  // Feinte : seulement si le défenseur couvre le tir prévu — feinter dans le
  // vide ne trompe personne. Après la feinte, il repart sur le meilleur tir.
  if (d.veutFeinter && p.feintT <= 0 && p.feintCd <= 0 && p.holdTimer > d.tempsDecision && plan.score < 0) {
    d.veutFeinter = false;
    doFeint(p, norm(plan.vise.x - p.x, plan.vise.y - p.y));
    d.plan = choisirTir(p, d, D, S, d.chargeVisee, .9);
  }

  const doitTirer = d.forceShoot || p.holdTimer > 2.4;
  if (p.feintT <= 0 && (p.holdTimer > d.tempsDecision || doitTirer)) {
    p.charging = true;
    p.charge = Math.min(1, p.charge + dt / p.char.chargeT * (p.feintBoostT > 0 ? 4 : 1));
    // Pendant la charge, il regarde une fois où est le défenseur — un bon
    // joueur change de côté s'il voit l'ouverture. La flèche pivote alors sous
    // les yeux du défenseur, qui peut le lire s'il est attentif.
    if (!d.relu && p.charge >= d.chargeVisee * .55) {
      d.relu = true;
      if (aleaJeu() < D.smart) d.plan = choisirTir(p, d, D, S, d.chargeVisee, 1);
    }
    const aVise = Math.abs(e.x - d.plan.vise.x) + Math.abs(e.y - d.plan.vise.y - d.bruit) < 12;
    if ((p.charge >= d.chargeVisee && aVise) || doitTirer || p.holdTimer > 1.9) {
      // Il lâche dans la direction affichée, au pixel près.
      const dir = norm(e.x - p.x, e.y - p.y);
      throwDisc(p, dir, throwSpeed(p.charge, p.char.power));
      d.avaitDisque = false;
      d.forceShoot = false;
      d.emaTarget.x = 0; d.emaTarget.y = 0;
      d.state = 'RECOVER';
      return { x: p.x, y: p.y };
    }
  }
  return { x: d.poste.x, y: d.poste.y };
}
