import { $, menuButtons, setSelIdx } from '../core/dom.js';
import { sfx } from '../audio/audio.js';

// ---------------------------------------------------------------------------
// Écran titre en tuiles (version D) : ce que le HTML et le CSS ne font pas
// seuls. Réglages validés dans mockups/menu-d.reglages.json, mockup
// mockups/menu-d.html.
//   - la phrase du bas, tirée au sort à chaque lancement ;
//   - l'arrivée des tuiles, que l'intro enchaîne sur sa fin ;
//   - le clic : la tuile s'enfonce, rebondit, jette un éclat, puis l'action part ;
//   - les modes à venir (BIENTÔT), qui refusent le clic.
// Les tuiles gardent leur data-act : c'est input.js qui déclenche l'action,
// comme pour tous les boutons du jeu.
// ---------------------------------------------------------------------------

const ecran = $('scr-title');

export const PHRASES = [
  ['MONTRE AU MONDE', 'QUI EST LE MEILLEUR !'],
  ['LE TERRAIN', 'T’APPARTIENT !'],
  ['CHAQUE LANCER', 'COMPTE !'],
  ['VISE HAUT,', 'FRAPPE FORT !'],
  ['DEVIENS UNE LÉGENDE', 'DU CLUB !'],
  ['LE DISQUE N’ATTEND', 'PERSONNE !'],
  ['UN VRAI CHAMPION', 'NE LÂCHE RIEN !'],
  ['AUJOURD’HUI,', 'C’EST TON JOUR !'],
  ['FAIS TREMBLER', 'LE TERRAIN !'],
  ['PERSONNE NE PEUT', 'T’ARRÊTER !'],
  ['LA VICTOIRE', 'SE MÉRITE !'],
  ['TON DISQUE,', 'TA LÉGENDE !'],
];
(function tirerPhrase() {
  const [a, b] = PHRASES[(Math.random() * PHRASES.length) | 0];
  const el = $('phraseTitre');
  if (!el) return;
  el.textContent = '';
  el.append(a, document.createElement('br'), b);
})();

// Réglages validés de l'arrivée et du clic.
export const R_MENU = { debutTuiles:.12, decalageTuiles:.07, dureeTuile:.46, rebond:1, ombre:6, forceClic:1 };

export function elementsMenu() {
  return {
    logo: ecran.querySelector('.mvLogo'), logoImg: ecran.querySelector('.logoImg'),
    perso: ecran.querySelector('.mvPerso'), heros: $('titleHero'), halo: ecran.querySelector('.halo'),
    tuiles: [...ecran.querySelectorAll('.rangModes .tuile')], petites: [...ecran.querySelectorAll('.rangPetites .tuile')],
    boutique: [...ecran.querySelectorAll('.rangBoutique .tuile')],
    aide: ecran.querySelector('.mvTuiles .hint'), bandeau: ecran.querySelector('.mvBandeau'),
    degrade: ecran.querySelector('.degradeBas'), barre: $('topBar'),
  };
}

/* ================= ARRIVÉE =================
   Des descriptions (élément, clés, départ, durée, courbe) relatives au départ
   des tuiles : l'intro les décale et les range dans sa propre chronologie.
   `logo` et `perso` peuvent lui être laissés : elle les fait voler. */
export function arriveeMenu({ logo = true, perso = true } = {}) {
  const h = elementsMenu(), A = [], k = R_MENU.rebond;
  const add = (el, kf, depart, duree, easing = 'linear') => { if (el) A.push({ el, kf, depart, duree, easing }); };
  if (logo) add(h.logo, [{ opacity:0, transform:'translateY(-4cqh) scale(1.5)' }, { opacity:1, transform:`scale(${1 - .05 * k})`, offset:.6 },
    { opacity:1, transform:'none' }], -.12, .5, 'cubic-bezier(.2,.9,.3,1)');
  if (perso) add(h.perso, [{ opacity:0, transform:'translateX(55cqw) scale(1.06)' }, { opacity:1, transform:`translateX(${-1.5 * k}cqw) scale(1)`, offset:.7 },
    { opacity:1, transform:'none' }], -.02, .6, 'cubic-bezier(.2,.8,.3,1)');
  const T = R_MENU.debutTuiles, D = R_MENU.dureeTuile, dec = R_MENU.decalageTuiles;
  const pop = [{ opacity:0, transform:'translateY(4cqh) scale(.55) rotate(-7deg)' },
    { opacity:1, transform:`translateY(${-.6 * k}cqh) scale(${1 + .07 * k}) rotate(${1.5 * k}deg)`, offset:.62 }, { opacity:1, transform:'none' }];
  h.tuiles.forEach((t, i) => {
    const d = T + i * dec;
    add(t, pop, d, D, 'cubic-bezier(.2,.8,.3,1)');
    add(t.querySelector('.ico'), [{ transform:'scale(0) rotate(-90deg)' }, { transform:`scale(${1 + .25 * k}) rotate(${10 * k}deg)`, offset:.6 },
      { transform:'none' }], d + .12, .42, 'cubic-bezier(.2,.8,.3,1)');
    add(t.querySelector('.bientot'), [{ scale:'0' }, { scale:`${1 + .3 * k}`, offset:.6 }, { scale:'1' }], d + .26, .34, 'ease-out');
  });
  // Le bouton large arrive juste après les modes, avant les petites tuiles :
  // il est entre les deux à l'écran, il l'est aussi dans le temps.
  const apresModes = T + h.tuiles.length * dec + D * .35;
  h.boutique.forEach((t, j) => {
    const d = apresModes + j * dec;
    add(t, pop, d, D * .9, 'cubic-bezier(.2,.8,.3,1)');
    add(t.querySelector('.ico'), [{ transform:'scale(0) rotate(-90deg)' }, { transform:`scale(${1 + .25 * k}) rotate(${10 * k}deg)`, offset:.6 },
      { transform:'none' }], d + .1, .4, 'cubic-bezier(.2,.8,.3,1)');
  });
  const apresBoutique = apresModes + h.boutique.length * dec + D * .25;
  h.petites.forEach((t, j) => {
    add(t, [{ opacity:0, transform:'translateY(3cqh)' }, { opacity:1, transform:`translateY(${-.4 * k}cqh)`, offset:.7 }, { opacity:1, transform:'none' }],
      apresBoutique + j * dec * .8, .36, 'cubic-bezier(.2,.9,.3,1)');
  });
  const fin = apresBoutique + h.petites.length * dec * .8 + .2;
  add(h.aide, [{ opacity:0 }, { opacity:1 }], fin, .3);
  add(h.degrade, [{ opacity:0 }, { opacity:1 }], T, .5);
  add(h.bandeau, [{ opacity:0, transform:'translateY(3cqh)' }, { opacity:1, transform:'none' }], T + .18, .5, 'cubic-bezier(.2,.9,.3,1)');
  add(h.barre, [{ opacity:0, transform:'translateY(-3cqh)' }, { opacity:1, transform:'none' }], T + .25, .4, 'cubic-bezier(.2,.9,.3,1)');
  return A;
}
export function dureeArrivee(A) { return Math.max(...A.map(a => a.depart + a.duree)); }

// L'arrivée seule, quand l'intro a été passée : tout se monte d'un coup.
export function jouerArriveeMenu() {
  const A = arriveeMenu();
  return A.map(d => d.el.animate(d.kf, { delay:(d.depart + .15) * 1000, duration:d.duree * 1000, easing:d.easing, fill:'backwards' }));
}

/* ================= CLICS =================
   Appui : la tuile s'enfonce dans son ombre. Relâché : rebond, éclat blanc,
   anneau, l'icône saute, quelques éclats jaunes. L'action (data-act) part un
   court instant après, le temps que le geste se voie. */
const DELAI_ACTION = 170;
const appuis = new WeakMap();
function presser(t) {
  const o = R_MENU.ombre;
  appuis.set(t, t.animate([{ transform:'none' }, { transform:`translate(${o - 1}px,${o - 1}px) scale(.97)`, boxShadow:'1px 1px 0 #111318' }],
    { duration:70, easing:'ease-out', fill:'forwards' }));
}
function relacher(t) {
  const a = appuis.get(t);
  if (a) { a.cancel(); appuis.delete(t); }
}
function animerClic(t) {
  relacher(t);
  const f = R_MENU.forceClic, o = R_MENU.ombre;
  t.animate([{ transform:`translate(${o - 1}px,${o - 1}px) scale(${1 - .04 * f})` },
    { transform:`translate(-2px,-2px) scale(${1 + .06 * f})`, offset:.45 }, { transform:'none' }],
    { duration:420, easing:'cubic-bezier(.2,.8,.3,1)' });
  t.querySelector('.eclat')?.animate([{ opacity:.75 }, { opacity:0 }], { duration:280, easing:'ease-out' });
  t.querySelector('.ico')?.animate([{ transform:'none' }, { transform:`scale(${1 + .35 * f}) rotate(-14deg)`, offset:.35 }, { transform:'none' }],
    { duration:440, easing:'cubic-bezier(.2,.8,.3,1)' });
  const anneau = document.createElement('span');
  anneau.className = 'anneauClic';
  t.appendChild(anneau);
  anneau.animate([{ transform:'scale(1)', opacity:.9 }, { transform:`scale(${1 + .16 * f},${1 + .4 * f})`, opacity:0 }],
    { duration:440, easing:'cubic-bezier(.1,.7,.3,1)' }).finished.then(() => anneau.remove(), () => anneau.remove());
  for (let i = 0; i < 7; i++) {
    const e = document.createElement('span');
    e.className = 'etincelle';
    t.appendChild(e);
    const ang = (i / 7) * Math.PI * 2 + Math.random() * .6, dist = (9 + Math.random() * 7) * f;
    e.animate([{ transform:'translate(0,0) scale(1) rotate(0deg)', opacity:1 },
      { transform:`translate(${Math.cos(ang) * dist * 1.9}cqh,${Math.sin(ang) * dist}cqh) scale(.2) rotate(${180 + Math.random() * 180}deg)`, opacity:0 }],
      { duration:420 + Math.random() * 160, easing:'cubic-bezier(.1,.8,.3,1)' }).finished.then(() => e.remove(), () => e.remove());
  }
}
function animerRefus(t) {
  t.animate([{ transform:'none' }, { transform:'translateX(-6px) rotate(-1deg)' }, { transform:'translateX(6px) rotate(1deg)' },
    { transform:'translateX(-5px)' }, { transform:'translateX(4px)' }, { transform:'none' }], { duration:380, easing:'ease-out' });
  t.querySelector('.ico')?.animate([{ transform:'none' }, { transform:'rotate(-18deg)' }, { transform:'rotate(16deg)' }, { transform:'rotate(-10deg)' },
    { transform:'none' }], { duration:420, easing:'ease-out' });
  t.querySelector('.bientot')?.animate([{ scale:'1' }, { scale:'1.3', offset:.3 }, { scale:'1' }], { duration:380, easing:'ease-out' });
}

(function brancherTuiles() {
  let relance = false, enCours = false;
  const tuiles = [...ecran.querySelectorAll('.tuile')];
  for (const t of tuiles) {
    t.addEventListener('pointerdown', () => { if (!t.classList.contains('verrou')) presser(t); });
    t.addEventListener('pointerleave', () => relacher(t));
    // Survol souris et sélection clavier restent d'accord, comme pour les .mbtn.
    t.addEventListener('mouseenter', () => setSelIdx('title', menuButtons('title').indexOf(t)));
  }
  // Intercepté avant input.js (phase de capture) : on joue le geste, puis on
  // relance le clic pour que l'action parte. Au clavier, activateMenu() clique
  // la tuile sélectionnée : même chemin.
  ecran.addEventListener('click', e => {
    const t = e.target.closest('.tuile');
    if (!t || relance) return;
    e.stopPropagation();
    if (t.classList.contains('verrou')) { sfx('deny'); animerRefus(t); return; }
    if (enCours) return;
    enCours = true;
    animerClic(t);
    setTimeout(() => { relance = true; t.click(); relance = false; enCours = false; }, DELAI_ACTION);
  }, true);
})();
