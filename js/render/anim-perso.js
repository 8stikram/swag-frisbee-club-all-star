// ---------------------------------------------------------------------------
// Animation des personnages.
//
// Chaque perso tient dans un sprite de 16 × 20 : la tête sur les rangées 0-9,
// le torse sur 10-15, les jambes sur 16-19 (voir le gabarit des sprites). Au
// lieu de redessiner des images, on fait VIVRE ces trois morceaux : le corps
// s'écrase et s'étire, la tête prend du retard ou suit le disque, le tout
// rebondit sur ses appuis.
//
// Deux rendus, au choix :
//   - 'pixel'  : tout bouge par pixels entiers du sprite (1 pixel = 4,8 px à
//                l'écran). Un écrasement retire des rangées, un étirement en
//                ajoute. C'est la façon de Rivals of Aether : pas un seul
//                pixel déformé, mais des pas visibles.
//   - 'fluide' : les mêmes mouvements, continus, recalés sur les pixels de
//                l'ÉCRAN. Plus doux, plus cartoon — la façon de Windjammers —
//                au prix de pixels de tailles légèrement inégales pendant un
//                écrasement.
//
// Module sans dépendance : il reçoit un contexte 2D et une image, rien d'autre.
// Le hasard n'y entre pas — une pose ne dépend que du temps et des réglages.
// ---------------------------------------------------------------------------

const TETE = 10, TORSE = 6, JAMBES = 4;           // rangées : 0-9, 10-15, 16-19

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;
const lisse = x => x * x * (3 - 2 * x);

// Pose neutre : l'image telle qu'elle est dessinée.
export const POSE_NEUTRE = { dx: 0, dy: 0, sx: 1, sy: 1, teteDx: 0, teteDy: 0, penche: 0, appui: 1, haut: 0 };

// ---------------------------------------------------------------------------
// Les idles. Chaque variante est une fonction du temps qui rend une pose.
//   reg  : { amplitude, vitesse, suivi, tics } (1 = réglage de base)
//   info : { versDisque: {x, y} (écart en px d'écran, facultatif), graine }
// Unités de la pose : pixels du SPRITE pour les décalages, facteurs pour
// l'écrasement. `haut` (0-1) dit à quel point il a décollé, `appui` s'il
// touche le sol — l'ombre et la poussière s'en servent.
// ---------------------------------------------------------------------------
function respiration(t, reg) {
  const a = reg.amplitude, f = .5 * reg.vitesse;
  const b = Math.sin(TAU * f * t);
  // La tête suit la poitrine avec un léger retard : c'est ce décalage qui
  // fait « respirer » au lieu de « pulser ».
  const bt = Math.sin(TAU * f * t - .7);
  return { ...POSE_NEUTRE, sy: 1 + .04 * a * b, sx: 1 - .025 * a * b, teteDy: -.9 * a * bt };
}

function bondir(t, reg) {
  const a = reg.amplitude, f = 2.1 * reg.vitesse;
  const u = (t * f) % 1;
  const h = Math.sin(Math.PI * u);                         // hauteur 0 → 1 → 0
  // Au contact, il s'écrase (les genoux plient) ; en l'air, il s'étire un peu.
  const contact = u < .14 ? 1 - u / .14 : u > .9 ? (u - .9) / .1 : 0;
  const sy = 1 - .09 * a * lisse(contact) + .035 * a * h;
  const sx = 1 + .06 * a * lisse(contact) - .02 * a * h;
  // La tête arrive au sol après le corps.
  const hl = Math.sin(Math.PI * ((u + .92) % 1));
  return { ...POSE_NEUTRE, dy: -1.6 * a * h, sy, sx, teteDy: .7 * a * (hl - h), appui: contact > 0 ? 1 : 0, haut: h };
}

function garde(t, reg, info) {
  const r = respiration(t, { ...reg, amplitude: reg.amplitude * .8 });
  const a = reg.amplitude, f = .32 * reg.vitesse;
  // Le poids passe d'un pied sur l'autre : le haut du corps glisse, les pieds
  // restent plantés.
  const poids = Math.sin(TAU * f * t);
  const pose = { ...r, penche: .9 * a * poids };
  // Le regard suit le disque : la tête se tourne (glisse) vers lui.
  const v = info && info.versDisque;
  if (v && reg.suivi > 0) {
    pose.teteDx += reg.suivi * clamp(v.x / 220, -1, 1) * 1.1;
    pose.teteDy += reg.suivi * clamp(v.y / 260, -1, 1) * .8;
    pose.penche += reg.suivi * clamp(v.x / 300, -1, 1) * .6;
  }
  return pose;
}

// Un tic de temps en temps : il s'arme (écrasement), se redresse d'un coup
// (étirement, la tête qui monte), puis se repose en oscillant. Chez Leon, c'est
// l'épaule qui remonte pour ajuster la veste ; chez les autres, le même geste
// se lit comme un « allez ! ».
function tic(tau, a) {
  if (tau < 0 || tau > .7) return null;
  if (tau < .13) { const k = lisse(tau / .13); return { sy: 1 - .09 * a * k, sx: 1 + .05 * a * k, teteDy: .8 * a * k }; }
  if (tau < .28) { const k = lisse((tau - .13) / .15); return { sy: 1 - .09 * a + .19 * a * k, sx: 1 + .05 * a - .08 * a * k, teteDy: .8 * a - 2.4 * a * k }; }
  const k = (tau - .28) / .42, amort = Math.exp(-4 * k) * Math.cos(k * 9);
  return { sy: 1 + .1 * a * amort, sx: 1 - .03 * a * amort, teteDy: -1.6 * a * amort };
}

function showoff(t, reg, info) {
  const pose = garde(t, reg, info);
  const periode = 6 / Math.max(.2, reg.tics), g = (info && info.graine) || 0;
  // Période un peu irrégulière : un tic réglé comme une horloge se remarque.
  const n = Math.floor((t + g) / periode);
  const decale = ((Math.sin(n * 12.9898 + g) * 43758.5453) % 1 + 1) % 1 * periode * .35;
  const tc = tic((t + g) - n * periode - decale, reg.amplitude);
  if (tc) { pose.sy *= tc.sy; pose.sx *= tc.sx; pose.teteDy += tc.teteDy; }
  return pose;
}

export const IDLES = { respiration, bondir, garde, showoff };

export function poseIdle(variante, t, reg, info) {
  const f = IDLES[variante];
  return f ? f(t, { amplitude: 1, vitesse: 1, suivi: 1, tics: 1, ...reg }, info) : POSE_NEUTRE;
}

// Réglage validé pour le jeu (mockups/anim-idle.reglages.json, 25/09/2026) :
// la garde active, en rendu fluide, discrète. `tics` n'agit que sur la
// variante « showoff » : il est gardé tel qu'il a été envoyé.
export const IDLE_JEU = {
  variante: 'garde', rendu: 'fluide', ombre: true,
  reglages: { amplitude: .3, vitesse: .8, suivi: .6, tics: .3 }
};

// ---------------------------------------------------------------------------
// Dessin. L'origine du contexte est posée AU SOL, au milieu des pieds ; le
// miroir (regard à gauche) est déjà appliqué par l'appelant. `e` = taille d'un
// pixel du sprite à l'écran. `depuis` : première rangée du sprite à dessiner —
// Jingle Bells passe 9, sa tête-cloche est dessinée à part, en lévitation.
//
// LA TÊTE NE DÉCOLLE JAMAIS DU CORPS. Elle peut glisser de côté ou s'enfoncer
// un peu dans les épaules (on baisse les yeux, on rentre la tête), mais tout
// décalage vers le HAUT est ignoré : la tête monterait au-dessus du torse et
// laisserait un trou au cou — elle « flottait » dans la première version. La
// règle vit ici plutôt que dans chaque variante, pour valoir pour toutes.
// ---------------------------------------------------------------------------
export function dessinerCorps(g, img, pose, mode, e, depuis = 0) {
  if (mode === 'pixel') return dessinerPixel(g, img, pose, e, depuis);
  return dessinerFluide(g, img, pose, e, depuis);
}

// Où la tête se retrouve par rapport à la pose neutre, en px d'écran. Sert à
// qui dessine une tête à part (la cloche de Jingle) : elle suit le corps.
export function decalageTete(p, mode, e) {
  if (mode === 'pixel') {
    const n = clamp(Math.round((p.sy - 1) * 20), -2, 2);
    return { x: clamp(Math.round(p.teteDx + p.penche * .5), -2, 2) * e,
      y: (Math.round(p.dy) - Math.max(0, n) + Math.max(0, -n) + clamp(Math.round(p.teteDy), 0, 2)) * e };
  }
  const hj = JAMBES * e, yJ = p.dy * e - hj * (1 + (p.sy - 1) * .5);
  return { x: (p.teteDx + p.penche * .5) * e, y: yJ - TORSE * e * p.sy + Math.max(0, p.teteDy) * e + (hj + TORSE * e) };
}

// Pixel pur : tout en pixels entiers du sprite.
function dessinerPixel(g, img, p, e, depuis) {
  const dy = Math.round(p.dy);
  // Écrasement / étirement en rangées entières : un écrasement fait descendre
  // le haut du corps dans les jambes (les genoux plient), un étirement le
  // soulève et répète la rangée du haut des jambes pour combler.
  const n = clamp(Math.round((p.sy - 1) * 20), -2, 2);
  const penche = clamp(Math.round(p.penche), -1, 1);
  const tx = clamp(Math.round(p.teteDx + p.penche * .5), -2, 2);
  const ty = clamp(Math.round(p.teteDy), 0, 2);            // jamais vers le haut
  const x0 = -8 * e, sol = dy * e;
  // Jambes : plantées au sol.
  g.drawImage(img, 0, TETE + TORSE, 16, JAMBES, x0, sol - JAMBES * e, 16 * e, JAMBES * e);
  // Rallonge d'étirement : la rangée du haut des jambes, répétée.
  for (let i = 0; i < n; i++) g.drawImage(img, 0, TETE + TORSE, 16, 1, x0, sol - (JAMBES + 1 + i) * e, 16 * e, e);
  const hautJambes = sol - (JAMBES + Math.max(0, n)) * e + Math.max(0, -n) * e;
  // Torse : ses deux rangées du haut suivent le penché, le reste reste droit.
  const yTorse = hautJambes - TORSE * e;
  g.drawImage(img, 0, TETE + 2, 16, TORSE - 2, x0, yTorse + 2 * e, 16 * e, (TORSE - 2) * e);
  g.drawImage(img, 0, TETE, 16, 2, x0 + penche * e, yTorse, 16 * e, 2 * e);
  // Tête (ou ce qu'il en reste à dessiner, à partir de `depuis`).
  if (depuis < TETE) g.drawImage(img, 0, depuis, 16, TETE - depuis,
    x0 + tx * e, yTorse - (TETE - depuis) * e + ty * e, 16 * e, (TETE - depuis) * e);
}

// Fluide : les mêmes mouvements, continus, recalés sur les pixels de l'écran.
function dessinerFluide(g, img, p, e, depuis) {
  const R = Math.round;
  const sol = p.dy * e;
  const lc = 16 * e * p.sx;                               // largeur du corps
  const hj = JAMBES * e, ht = TORSE * e * p.sy;
  // Les jambes ne s'écrasent qu'à moitié : ce sont les genoux qui plient, pas
  // les pieds qui s'aplatissent.
  const hjs = hj * (1 + (p.sy - 1) * .5);
  const yJ = sol - hjs, yT = yJ - ht;
  g.drawImage(img, 0, TETE + TORSE, 16, JAMBES, R(-lc / 2), R(yJ), R(lc), R(sol) - R(yJ));
  const dxT = p.penche * e * .5;
  g.drawImage(img, 0, TETE, 16, TORSE, R(-lc / 2 + dxT), R(yT), R(lc), R(yJ) - R(yT));
  // La tête garde sa taille (les têtes de dessin animé ne s'écrasent pas) :
  // c'est le contraste avec le corps qui rend l'écrasement lisible. Son bas
  // est calé sur le haut du torse, arrondi de la même façon : pas un pixel
  // d'écran d'écart entre les deux, quelle que soit la pose.
  if (depuis >= TETE) return;
  const xH = -8 * e + (p.teteDx + p.penche * .5) * e;
  const bas = R(yT + Math.max(0, p.teteDy) * e), haut = R(yT + Math.max(0, p.teteDy) * e - (TETE - depuis) * e);
  g.drawImage(img, 0, depuis, 16, TETE - depuis, R(xH), haut, 16 * e, bas - haut);
}
