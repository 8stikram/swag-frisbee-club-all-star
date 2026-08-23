import { TAU, rand, gauss } from '../core/utils.js';

// ---------------------------------------------------------------------------
// Effets propres à chaque disque.
//
// Un seul endroit décrit ce que fait chaque disque : la couleur de sa traînée,
// ce qu'il sème en vol, et ce qui se passe au rebond. Le jeu ne connaît que ce
// tableau — ajouter un disque revient à ajouter une entrée, sans toucher au
// moteur.
//
// Trois règles tiennent tout le fichier :
//   • purement visuel, aucun son, aucune incidence sur le jeu ;
//   • lisible en vue de dessus, donc des formes larges et peu de détail fin ;
//   • sobre en nombre de particules, parce qu'un téléphone doit suivre.
//
// Le plafond global compte plus que chaque effet pris isolément : c'est leur
// accumulation qui fait ramer, jamais un rebond tout seul.
// ---------------------------------------------------------------------------
export const MAX_PARTICULES = 50;

// Réglages du joueur, modifiables dans les options graphiques. Les ombres n'ont
// rien à voir avec les disques, mais elles vivent ici pour la même raison que
// les deux autres : ce fichier n'importe que des outils, donc n'importe qui peut
// le lire sans risquer une boucle d'imports.
export const Reglages = { intensite: 1, particules: true, ombres: 'moyenne' };

export function chargerReglagesFX() {
  try {
    const i = localStorage.getItem('sbcbFxIntensite');
    if (i !== null) Reglages.intensite = Math.max(0, Math.min(1, parseFloat(i)));
    const p = localStorage.getItem('sbcbFxParticules');
    if (p !== null) Reglages.particules = p !== '0';
    const o = localStorage.getItem('sbcbFxOmbres');
    if (o === 'faible' || o === 'moyenne' || o === 'elevee') Reglages.ombres = o;
  } catch (e) { }
}
export function setOmbresFX(v) {
  Reglages.ombres = v;
  try { localStorage.setItem('sbcbFxOmbres', v); } catch (e) { }
}
export function setIntensiteFX(v) {
  Reglages.intensite = Math.max(0, Math.min(1, v));
  try { localStorage.setItem('sbcbFxIntensite', String(Reglages.intensite)); } catch (e) { }
}
export function setParticulesFX(v) {
  Reglages.particules = !!v;
  try { localStorage.setItem('sbcbFxParticules', v ? '1' : '0'); } catch (e) { }
}
chargerReglagesFX();

// Combien de particules émettre, une fois l'intensité appliquée. Rend un
// entier : un « 2,4 particules » deviendrait 2 à chaque fois, et l'intensité
// n'aurait plus d'effet fin — on tire donc la fraction au sort.
function combien(n) {
  if (!Reglages.particules || Reglages.intensite <= 0) return 0;
  const exact = n * Reglages.intensite;
  const entier = Math.floor(exact);
  return entier + (Math.random() < exact - entier ? 1 : 0);
}

const p = (x, y, vx, vy, life, c, s, g, type) =>
  ({ x, y, vx, vy, life, c, s, g: g || 0, type });

// --- Effets réutilisables ---------------------------------------------------
// Une gerbe en couronne : la base de presque tous les rebonds.
function couronne(sortie, x, y, cols, n, vitesse, taille, vie) {
  for (let i = 0; i < combien(n); i++) {
    const a = rand(TAU), v = rand(vitesse * .5, vitesse);
    sortie.push(p(x, y, Math.cos(a) * v, Math.sin(a) * v,
      rand(vie * .6, vie), cols[(Math.random() * cols.length) | 0], rand(taille * .6, taille), 0));
  }
}
// Une spirale : les particules partent en tournant autour du point d'impact.
function spirale(sortie, x, y, cols, n, rayon, vie) {
  for (let i = 0; i < combien(n); i++) {
    const a = (i / n) * TAU + rand(.4);
    const v = rayon * rand(.6, 1.2);
    sortie.push(p(x, y, Math.cos(a) * v, Math.sin(a) * v,
      rand(vie * .6, vie), cols[i % cols.length], rand(2, 4), 0, 'star'));
  }
}

// ---------------------------------------------------------------------------
// Le registre. `trainee` donne la couleur du sillage, `vol` ce que le disque
// sème en volant, `rebond` ce qu'il projette en touchant un mur.
// ---------------------------------------------------------------------------
export const FX_DISQUES = {
  // Patriotique : sillage tricolore et petites étoiles en spirale.
  captain: {
    trainee: ['#c2131a', '#f2f2f2', '#1b3f94'],
    vol(d, out) {
      if (combien(.35)) {
        const a = d.spin * 2, r = 14;
        out.push(p(d.x + Math.cos(a) * r, d.y + Math.sin(a) * r,
          gauss() * 20, gauss() * 20, .4, '#ffffff', 2, 0, 'star'));
      }
    },
    rebond(d, out) { spirale(out, d.x, d.y, ['#f2f2f2', '#c2131a', '#1b3f94'], 10, 150, .5); }
  },

  // Keffieh : sillage en damier noir et blanc, olivier au rebond.
  palestine: {
    trainee: ['#000000', '#ffffff'],
    vol(d, out) {
      if (combien(.3)) {
        out.push(p(d.x + gauss() * 8, d.y + gauss() * 8, gauss() * 12, gauss() * 12,
          .45, Math.random() < .5 ? '#0b0b0b' : '#f4f4f4', 3, 0));
      }
    },
    // Quatre pétales seulement : la sobriété fait partie du disque.
    rebond(d, out) { couronne(out, d.x, d.y, ['#2f7d32', '#5aa84f', '#8fc98a'], 4, 130, 4, .7); }
  },

  // Ciel : fines étoiles filantes, éclat blanc au rebond.
  israel: {
    trainee: ['#bcdcff', '#0038b8'],
    vol(d, out) {
      if (combien(.3)) {
        out.push(p(d.x + gauss() * 10, d.y + gauss() * 10, gauss() * 26, gauss() * 26,
          .5, '#cfe7ff', 2, 0, 'star'));
      }
    },
    rebond(d, out) { spirale(out, d.x, d.y, ['#ffffff', '#bcdcff', '#0038b8'], 8, 140, .5); }
  },

  // Cosmique : poussière d'étoile aspirée, mini-explosion de galaxies.
  galaxy: {
    trainee: ['#e2a8ff', '#8ee7ff', '#7b3fe4'],
    vol(d, out) {
      // Aspirées vers le disque plutôt que projetées : c'est ce qui donne
      // l'impression d'un champ gravitationnel, sans rien calculer de tel.
      if (combien(.5)) {
        const a = rand(TAU), r = rand(20, 34);
        const x = d.x + Math.cos(a) * r, y = d.y + Math.sin(a) * r;
        out.push(p(x, y, -Math.cos(a) * 55, -Math.sin(a) * 55, .45,
          ['#ffffff', '#8ee7ff', '#e2a8ff', '#ffb3e6'][(Math.random() * 4) | 0], 2, 0, 'star'));
      }
    },
    rebond(d, out) { spirale(out, d.x, d.y, ['#ffffff', '#8ee7ff', '#e2a8ff', '#7b3fe4'], 12, 170, .8); }
  },

  // Volcan : flammèches, cendres qui montent, éruption au rebond.
  magma: {
    trainee: ['#ff8c1a', '#ffd23e'],
    vol(d, out) {
      if (combien(.55)) {
        out.push(p(d.x + gauss() * 9, d.y + gauss() * 9, gauss() * 22, -rand(20, 60),
          .4, Math.random() < .7 ? '#ff7a12' : '#ffd23e', rand(2, 4), -60));
      }
      // Les cendres, elles, sont sombres et retombent : ce sont elles qui
      // donnent le poids, les flammèches ne font que la lumière.
      if (combien(.2)) {
        out.push(p(d.x + gauss() * 12, d.y + gauss() * 12, gauss() * 18, -rand(10, 40),
          .8, '#3a2a24', 2, 120));
      }
    },
    rebond(d, out) { couronne(out, d.x, d.y, ['#ffd23e', '#ff7a12', '#e03a00'], 12, 220, 5, .6); }
  },

  // Bug numérique : le disque perd des pixels, qui s'éparpillent au rebond.
  glitch: {
    trainee: ['#ff2fb9', '#12d0ff', '#00ffa3'],
    vol(d, out) {
      if (combien(.4)) {
        out.push(p(d.x + gauss() * 11, d.y + gauss() * 11, gauss() * 30, gauss() * 30,
          .35, ['#ff2fb9', '#12d0ff', '#00ffa3', '#ffe600'][(Math.random() * 4) | 0], 3, 0));
      }
    },
    rebond(d, out) { couronne(out, d.x, d.y, ['#ff2fb9', '#12d0ff', '#00ffa3', '#ffe600'], 12, 200, 4, .5); }
  },

  // Copie d'examen : poussière de craie, et la gomme qui rebondit avec.
  vingt: {
    trainee: ['#fdfaf0', '#d81f26'],
    vol(d, out) {
      if (combien(.3)) {
        out.push(p(d.x + gauss() * 9, d.y + gauss() * 9, gauss() * 14, gauss() * 14,
          .5, ['#ffffff', '#ffc0cb', '#bfe8c8', '#bcdcff'][(Math.random() * 4) | 0], 2, 40));
      }
    },
    rebond(d, out) {
      couronne(out, d.x, d.y, ['#ffffff', '#ffc0cb', '#bcdcff'], 8, 120, 3, .5);
      // La gomme : une seule particule, lourde, qui retombe. Elle fait tout le
      // sel de l'effet — en mettre plusieurs le rendrait juste bruyant.
      if (combien(1)) out.push(p(d.x, d.y, gauss() * 90, -rand(120, 200), .9, '#ff8fa3', 5, 700));
    }
  }
};

// Effet par défaut, pour un disque qui n'a pas encore le sien : une traînée
// dorée et rien d'autre. Mieux vaut rien que quelque chose qui jure.
const PAR_DEFAUT = { trainee: ['#ffd23e'], vol() { }, rebond() { } };

export function fxDe(id) { return FX_DISQUES[id] || PAR_DEFAUT; }

// Couleur du sillage : elle change au fil du vol pour les disques qui ont
// plusieurs teintes, ce qui donne un dégradé le long de la traînée.
export function couleurTrainee(id, spin) {
  const c = fxDe(id).trainee;
  return c[Math.abs(Math.floor(spin * 3)) % c.length];
}

// Le plafond ne compte que les particules du disque, marquées d'un drapeau.
// Le compter sur le total serait pire, pas mieux : pendant les confettis d'un
// but, le disque n'émettrait plus rien du tout, et c'est précisément le moment
// où il traverse le terrain.
function combienDeja(particules) {
  let n = 0;
  for (const q of particules) if (q.fx) n++;
  return n;
}

function verser(out, particules) {
  let place = MAX_PARTICULES - combienDeja(particules);
  for (const q of out) {
    if (place <= 0) break;
    q.fx = true;
    particules.push(q);
    place--;
  }
}

export function semerEnVol(id, d, particules) {
  if (!Reglages.particules) return;
  const out = [];
  fxDe(id).vol(d, out);
  if (out.length) verser(out, particules);
}

export function eclatDeRebond(id, d, particules) {
  if (!Reglages.particules) return;
  const out = [];
  fxDe(id).rebond(d, out);
  if (out.length) verser(out, particules);
}
