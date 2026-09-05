// ---------------------------------------------------------------------------
// Effets partagés des fins de main : échelle de temps, secousse de caméra,
// voiles plein écran et système de particules.
//
// Ce module ne connaît aucun jeu. Il reçoit un élément hôte — l'écran du
// blackjack en jeu, la scène du mockup en atelier — et travaille dedans. C'est
// ce qui permet à `mockups/blackjack-fins.html` de jouer exactement les mêmes
// séquences que la table : le banc d'essai ne peut pas diverger de ce qu'il
// teste s'il exécute le même code.
// ---------------------------------------------------------------------------

// --- Échelle de temps -------------------------------------------------------
// Une scène en DOM n'a pas d'horloge de simulation à ralentir : les cartes sont
// animées par le compositeur, pas par nous. Le facteur pilote donc les deux
// seules choses sur lesquelles on a la main — la simulation des particules, et
// une classe qui allonge la durée des animations en cours (voir `.bjRalenti`
// dans style.css). Le reste de l'impression de ralenti vient de ce que l'œil
// lit comme tel : un lent rapprochement de la table, une vignette qui se ferme.
//
// Les durées des phases, elles, restent en temps réel. La spec les donne en
// horloge murale — « phase 1 : 0,4 s, dont 0,3 s de ralenti » — et les diviser
// par le facteur faisait durer cette phase une seconde et demie : le drame
// devenait de l'attente.
export const Temps = { facteur: 1 };

let retourNormal = null;

export function ralentir(hote, facteur, dureeReelle) {
  clearTimeout(retourNormal);
  Temps.facteur = facteur;
  if (hote) hote.classList.add('bjRalenti');
  retourNormal = setTimeout(() => {
    Temps.facteur = 1;
    if (hote) hote.classList.remove('bjRalenti');
  }, dureeReelle);
}

export function vitesseNormale(hote) {
  clearTimeout(retourNormal);
  Temps.facteur = 1;
  if (hote) hote.classList.remove('bjRalenti');
}

// Enchaîne des étapes [[attente en ms, fonction], ...]. L'attente est comptée
// AVANT la fonction. Renvoie de quoi tout annuler — quitter la table au milieu
// d'une séquence ne doit pas laisser des minuteries écrire dans un écran caché.
export function enchainer(etapes) {
  let minuterie = null, i = 0, annule = false;
  const suivant = () => {
    if (annule || i >= etapes.length) return;
    const [attente, fn] = etapes[i++];
    minuterie = setTimeout(() => {
      if (annule) return;
      fn();
      suivant();
    }, attente);
  };
  suivant();
  return () => { annule = true; clearTimeout(minuterie); };
}

// --- Secousse de caméra -----------------------------------------------------
// Amortissement quadratique : l'amplitude tombe vite au début puis s'éteint en
// douceur. Un amortissement linéaire donne une vibration qui « traîne », et on
// entend la fin de l'animation au lieu du choc.
//
// Le léger agrandissement n'est pas cosmétique : l'écran a `overflow:hidden` et
// occupe toute la scène, donc le déplacer laisse voir le vide sur les bords.
// Trois pour cent suffisent à couvrir vingt pixels de débattement.
export function secousse(hote, intensite, duree) {
  if (!hote || intensite <= 0) return;
  const debut = performance.now();
  const marge = 1 + Math.min(.06, intensite / 320);
  const pas = () => {
    const t = (performance.now() - debut) / duree;
    if (t >= 1) { hote.style.transform = ''; return; }
    const a = intensite * (1 - t) * (1 - t);
    const x = (Math.random() * 2 - 1) * a, y = (Math.random() * 2 - 1) * a;
    hote.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${marge})`;
    requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
}

// --- Voiles plein écran -----------------------------------------------------
// Un div jetable plutôt qu'un élément permanent qu'on rallume : deux flashs qui
// se chevauchent doivent s'additionner, et une classe posée deux fois sur le
// même élément ne redémarre pas son animation.
function voile(hote, classe, duree) {
  if (!hote) return null;
  const v = document.createElement('div');
  v.className = classe;
  hote.appendChild(v);
  setTimeout(() => v.remove(), duree);
  return v;
}

export const flash = (hote, teinte, duree = 160) => {
  const v = voile(hote, 'bjEffetFlash ' + teinte, duree + 60);
  if (v) v.style.animationDuration = duree + 'ms';
};

// Vignettage coloré : il monte, tient, puis s'efface. C'est la seule couche qui
// reste visible plusieurs secondes, donc elle porte sa durée elle-même.
export const vignetteTeintee = (hote, teinte, duree) => {
  const v = voile(hote, 'bjEffetVignette ' + teinte, duree + 80);
  if (v) v.style.animationDuration = duree + 'ms';
};

// Aberration chromatique : un vrai décalage des canaux, par filtre SVG. Deux
// voiles teintés posés par-dessus auraient coûté moins cher, mais ils colorent
// l'image au lieu de la dédoubler — et c'est le dédoublement qu'on reconnaît.
// Le filtre force un repaint complet de l'écran à chaque image : c'est pour ça
// qu'il ne dure qu'un demi-battement, et seulement au bust.
let filtreInstalle = false;
function installerFiltre() {
  if (filtreInstalle || document.getElementById('bjFiltreRvb')) { filtreInstalle = true; return; }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<defs><filter id="bjFiltreRvb" x="-4%" y="-4%" width="108%" height="108%">
      <feOffset in="SourceGraphic" dx="3" dy="0" result="dR"/>
      <feColorMatrix in="dR" type="matrix" result="cR"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
      <feOffset in="SourceGraphic" dx="-3" dy="1" result="dB"/>
      <feColorMatrix in="dB" type="matrix" result="cB"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
      <feColorMatrix in="SourceGraphic" type="matrix" result="cV"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
      <feBlend in="cR" in2="cV" mode="screen" result="rv"/>
      <feBlend in="rv" in2="cB" mode="screen"/>
    </filter></defs>`;
  document.body.appendChild(svg);
  filtreInstalle = true;
}

export function aberration(hote, duree = 420) {
  if (!hote) return;
  installerFiltre();
  hote.classList.add('bjAberre');
  setTimeout(() => hote.classList.remove('bjAberre'), duree);
}

// --- Particules -------------------------------------------------------------
// Un canvas par hôte, créé à la demande et gardé ensuite. Les paillettes du
// comptoir sont en DOM parce qu'elles se comptent par dizaines ; ici une seule
// fin peut en cracher deux cents avec gravité, friction et rotation, et le
// canvas évite deux cents recalculs de style par image.
const systemes = new WeakMap();

function systeme(hote) {
  let s = systemes.get(hote);
  if (s) return s;
  const canvas = document.createElement('canvas');
  canvas.className = 'bjParticules';
  hote.appendChild(canvas);
  s = { canvas, ctx: canvas.getContext('2d'), parts: [], tourne: false, dernier: 0 };
  systemes.set(hote, s);
  return s;
}

function calibrer(s, hote) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const l = hote.clientWidth, h = hote.clientHeight;
  if (s.canvas.width !== (l * dpr | 0) || s.canvas.height !== (h * dpr | 0)) {
    s.canvas.width = l * dpr | 0;
    s.canvas.height = h * dpr | 0;
  }
  s.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  s.l = l; s.h = h;
}

const alea = (a, b) => a + Math.random() * (b - a);
const pioche = t => t[(Math.random() * t.length) | 0];

// Chaque genre décrit UNE particule ; le nombre et la zone d'émission viennent
// de l'appelant. Les couleurs sont celles de la direction artistique du casino
// (or, braise, obsidienne) — pas des couleurs vives d'écran de score.
const GENRES = {
  // Confettis dorés : ils tombent du haut, tournent, et frottent l'air.
  confetti: () => ({
    vx: alea(-40, 40), vy: alea(20, 90), g: 420, frein: .4,
    rot: alea(0, 6.28), vrot: alea(-7, 7),
    taille: alea(4, 9), allonge: alea(1.6, 3), vie: alea(1.5, 2.6),
    couleur: pioche(['#f6e27a', '#d4af37', '#fff3b8', '#e8c565']), forme: 'rect'
  }),
  // Feu : ça monte, ça ralentit, ça rétrécit. Gravité négative parce qu'une
  // flamme est plus légère que l'air qu'elle traverse.
  feu: () => ({
    vx: alea(-55, 55), vy: alea(-190, -80), g: -60, frein: 1.5,
    rot: 0, vrot: 0,
    taille: alea(4, 11), allonge: 1, vie: alea(.5, 1),
    couleur: pioche(['#fff3c2', '#ffb03a', '#ff6a12', '#e02a08']), forme: 'lueur'
  }),
  // Fumée : elle monte lentement, grossit, et se dissout.
  fumee: () => ({
    vx: alea(-26, 26), vy: alea(-70, -28), g: -12, frein: .8,
    rot: 0, vrot: 0, gonfle: alea(14, 30),
    taille: alea(8, 18), allonge: 1, vie: alea(1.1, 2),
    couleur: pioche(['#2a2028', '#3a2f3a', '#181418']), forme: 'lueur',
    // La fumée est le seul genre qui assombrit : en composition additive, du
    // gris foncé ÉCLAIRCIT l'image au lieu de la voiler.
    sombre: true
  }),
  // Bleu de l'égalité : ça ne tombe pas et ça ne monte pas vraiment. Ça flotte.
  bleu: () => ({
    vx: alea(-30, 30), vy: alea(-34, -6), g: 6, frein: .5,
    rot: 0, vrot: 0,
    taille: alea(2.5, 5.5), allonge: 1, vie: alea(1.2, 2.2),
    couleur: pioche(['#8fd8ff', '#4a90e2', '#c8ecff']), forme: 'lueur'
  }),
  // Traînée d'un jeton en vol : des éclats minuscules qui s'éteignent vite.
  trainee: () => ({
    vx: alea(-30, 30), vy: alea(-30, 30), g: 90, frein: 2.2,
    rot: 0, vrot: 0,
    taille: alea(1.5, 3.5), allonge: 1, vie: alea(.25, .55),
    couleur: '#f6e27a', forme: 'lueur'
  })
};

// `boite` est en coordonnées de l'hôte : {x, y, l, h}. Passer un rectangle
// plutôt qu'un point évite d'appeler la fonction une fois par carte.
export function emettre(hote, genre, boite, n, teinte) {
  if (!hote || !GENRES[genre]) return;
  const s = systeme(hote);
  calibrer(s, hote);
  for (let i = 0; i < n; i++) {
    const p = GENRES[genre]();
    p.x = boite.x + Math.random() * boite.l;
    p.y = boite.y + Math.random() * boite.h;
    p.vieMax = p.vie;
    if (teinte) p.couleur = teinte;
    s.parts.push(p);
  }
  if (!s.tourne) { s.tourne = true; s.dernier = performance.now(); requestAnimationFrame(() => image(s, hote)); }
}

// Boîte d'un élément, ramenée dans le repère de l'hôte.
export function boiteDe(hote, el) {
  const r = el.getBoundingClientRect(), h = hote.getBoundingClientRect();
  return { x: r.left - h.left, y: r.top - h.top, l: r.width, h: r.height };
}

function image(s, hote) {
  const t = performance.now();
  // Plafonné à 50 ms : revenir sur l'onglet après une pause ferait avancer la
  // simulation d'un coup et toutes les particules disparaîtraient d'un bloc.
  const dt = Math.min((t - s.dernier) / 1000, .05) * Temps.facteur;
  s.dernier = t;
  calibrer(s, hote);
  const c = s.ctx;
  c.clearRect(0, 0, s.l, s.h);
  c.globalCompositeOperation = 'lighter';

  for (let i = s.parts.length - 1; i >= 0; i--) {
    const p = s.parts[i];
    p.vie -= dt;
    if (p.vie <= 0) { s.parts.splice(i, 1); continue; }
    p.vy += p.g * dt;
    p.vx -= p.vx * p.frein * dt;
    p.vy -= p.vy * p.frein * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
    if (p.gonfle) p.taille += p.gonfle * dt;

    const k = p.vie / p.vieMax;
    c.globalCompositeOperation = p.sombre ? 'source-over' : 'lighter';
    c.globalAlpha = Math.min(1, k * 1.6);
    c.fillStyle = p.couleur;
    if (p.forme === 'rect') {
      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.fillRect(-p.taille / 2, -p.taille * p.allonge / 2, p.taille, p.taille * p.allonge);
      c.restore();
    } else {
      const r = p.taille * (p.forme === 'lueur' ? (.4 + k * .6) : 1);
      const d = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, Math.max(r, .5));
      d.addColorStop(0, p.couleur);
      d.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = d;
      c.beginPath(); c.arc(p.x, p.y, Math.max(r, .5), 0, 6.2832); c.fill();
    }
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';

  if (s.parts.length) requestAnimationFrame(() => image(s, hote));
  else { s.tourne = false; c.clearRect(0, 0, s.l, s.h); }
}

// Vide tout : appelé en quittant la table, pour qu'une fin en cours ne
// continue pas de tourner derrière un écran caché.
export function purger(hote) {
  const s = systemes.get(hote);
  if (s) s.parts.length = 0;
  if (hote) {
    hote.style.transform = '';
    hote.classList.remove('bjAberre');
    for (const v of hote.querySelectorAll('.bjEffetFlash, .bjEffetVignette')) v.remove();
  }
  vitesseNormale(hote);
}
