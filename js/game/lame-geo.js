// ---------------------------------------------------------------------------
// La géométrie de l'épée du SUSANO SSJ ROSE, partagée par le dessin
// (render/susanoo.js) et la zone de touche (game/specials.js).
//
// C'est la règle de l'ultime : ce qu'on VOIT toucher est ce qui touche. Les
// deux côtés lisent donc le même angle, calculé ici, et la même lame.
//
// Module pur, sans aucune dépendance : il ne peut fermer aucun cycle.
// ---------------------------------------------------------------------------

// L'épaule du bras d'épée, relevée sur le dessin réglé : 74 px devant l'axe du
// Susanoo et 161 au-dessus de ses pieds, lesquels sont 18 px derrière le
// Gardien et 44 px sous son centre.
const EPAULE_AVANT = 74 - 18, EPAULE_HAUT = 161 - 44;
// La lame, mesurée depuis l'épaule : le bras (58 px), puis la fricadelle de 10
// à 170 px du poing, à l'échelle réglée de 1,08. Soit de 69 à 242 px.
export const LAME_DEBUT = 69, LAME_FIN = 242;
export const LAME_DEMI = 14;          // demi-épaisseur de la fricadelle
// Le coup : un temps d'armé très court (le clic doit se sentir immédiat), la
// coupe — seule phase qui touche —, puis le retour au repos.
export const COUP_ARME = .05, COUP_COUPE = .12, COUP_RETOUR = .35;
// L'arc balayé : visé au sol à LAME_VISEE px du Gardien, sur ±COUP_ARC autour
// de la direction visée, toujours de haut en bas.
export const LAME_VISEE = 150, COUP_ARC = 1.2;
// Au repos, l'épée est dressée derrière lui (l'angle du dessin réglé).
const REPOS_LOCAL = -1.15;

const sens = p => (p.side === 1 ? 1 : -1);
export function epauleLame(p) {
  const d = sens(p);
  return { x: (p.susX ?? p.x) + EPAULE_AVANT * d, y: (p.susY ?? p.y) - EPAULE_HAUT };
}
// Un angle du repère du dessin (tourné vers la droite) vers le monde, et retour.
export const versMonde = (p, a) => (sens(p) > 0 ? a : Math.PI - a);
const repos = p => versMonde(p, REPOS_LOCAL);

// Plus court chemin entre deux angles.
function melange(a, b, k) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * k;
}
const easeOut = k => 1 - Math.pow(1 - k, 3);
const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;

// L'angle de la lame pendant la COUPE, à l'avancée k (0 à 1) : elle vise un
// point qui balaie l'arc au sol, de haut en bas quel que soit le camp.
export function angleCoupe(p, k) {
  const E = epauleLame(p), vise = p.lameVise || 0;
  const phi = vise - sens(p) * COUP_ARC + sens(p) * 2 * COUP_ARC * k;
  const tx = p.x + Math.cos(phi) * LAME_VISEE, ty = p.y + Math.sin(phi) * LAME_VISEE;
  return Math.atan2(ty - E.y, tx - E.x);
}

// L'angle de la lame en MONDE à tout instant, et la traînée à peindre.
// `p.lameCoupT` : temps depuis le clic (grand = pas de coup en cours).
export function etatLame(p) {
  const t = p.lameCoupT ?? 9;
  if (t < COUP_ARME) {
    return { ang: melange(repos(p), angleCoupe(p, 0), easeOut(t / COUP_ARME)), trace: 0, coupe: false };
  }
  if (t < COUP_ARME + COUP_COUPE) {
    const k = (t - COUP_ARME) / COUP_COUPE;
    return { ang: angleCoupe(p, k), trace: k, coupe: true, k };
  }
  const r = t - COUP_ARME - COUP_COUPE;
  if (r < COUP_RETOUR) {
    return { ang: melange(angleCoupe(p, 1), repos(p), easeInOut(r / COUP_RETOUR)), trace: Math.max(0, 1 - r / .2), coupe: false };
  }
  return { ang: repos(p), trace: 0, coupe: false };
}

// La lame réduite à un segment, en monde.
export function segmentLame(p, ang) {
  const E = epauleLame(p), c = Math.cos(ang), s = Math.sin(ang);
  return { x0: E.x + c * LAME_DEBUT, y0: E.y + s * LAME_DEBUT, x1: E.x + c * LAME_FIN, y1: E.y + s * LAME_FIN };
}
export function distanceSegment(sg, x, y) {
  const vx = sg.x1 - sg.x0, vy = sg.y1 - sg.y0;
  const k = Math.max(0, Math.min(1, ((x - sg.x0) * vx + (y - sg.y0) * vy) / (vx * vx + vy * vy)));
  return Math.hypot(x - (sg.x0 + vx * k), y - (sg.y0 + vy * k));
}
