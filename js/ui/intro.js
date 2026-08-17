import { $ } from '../core/dom.js';
import { CHARS, ROSTER } from '../data/characters.js';
import { initAudio, sfx } from '../audio/audio.js';
import { proposerTutoSiPremiereFois } from './menus.js';

// ---------------------------------------------------------------------------
// Séquence d'ouverture, jouée une fois au chargement. Chaque plan se résume à
// une classe posée sur l'écran : la chorégraphie vit dans le CSS, le minutage
// ici. Un clic ou une touche saute directement au menu, à n'importe quel
// moment — l'intro ne doit jamais retenir un joueur pressé.
// ---------------------------------------------------------------------------
const scr = $('scr-intro');
let phase = 0;            // 0 = pas commencée, 5 = attend le clic, 9 = terminée
let timers = [];

const plan = n => { scr.className = 'screen scr-intro p' + n; phase = n; };
const plus_tard = (ms, fn) => timers.push(setTimeout(fn, ms));

// Faisceaux de projecteurs convergeant vers le centre, allumés en cascade.
function poserFaisceaux() {
  const box = $('introBeams');
  box.innerHTML = '';
  const angles = [-52, -34, -17, 0, 17, 34, 52, -66, 66];
  angles.forEach((a, i) => {
    const b = document.createElement('i');
    b.style.setProperty('--a', a + 'deg');
    b.style.animationDelay = (i * 0.18) + 's';
    box.appendChild(b);
  });
}

function poserParticules() {
  const box = $('introParts');
  box.innerHTML = '';
  for (let i = 0; i < 34; i++) {
    const p = document.createElement('i');
    p.style.left = (Math.random() * 100) + '%';
    p.style.top = (Math.random() * 100) + '%';
    p.style.animationDelay = (Math.random() * 3) + 's';
    p.style.animationDuration = (2.2 + Math.random() * 2) + 's';
    box.appendChild(p);
  }
}

// Le personnage invoqué est tiré au sort, et c'est le MÊME qui reste sur
// l'écran titre : on dessine les deux d'un coup pour qu'ils ne divergent pas.
// Le tirage se refait à chaque chargement.
function dessinerHeros() {
  const ck = ROSTER[(Math.random() * ROSTER.length) | 0];
  const src = CHARS[ck].frames.idle;
  for (const [id, k] of [['introHero', 18], ['titleHero', 16]]) {
    const cv = $(id);
    if (!cv) continue;
    cv.width = src.width * k; cv.height = src.height * k;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, cv.width, cv.height);
  }
}

// Éclat ponctuel : une gerbe d'étincelles projetée depuis le centre, utilisée
// aux moments forts (allumage des projecteurs, invocation, clic).
function etincelles(n, force) {
  const box = $('introParts');
  for (let i = 0; i < n; i++) {
    const p = document.createElement('i');
    const a = Math.random() * Math.PI * 2;
    const d = 6 + Math.random() * force;
    p.style.left = '50%'; p.style.top = '48%';
    p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
    p.style.animation = 'none';
    p.style.transition = 'transform .7s cubic-bezier(.1,.8,.3,1),opacity .7s ease-out';
    box.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translate(${Math.cos(a) * d}cqh,${Math.sin(a) * d}cqh) scale(.2)`;
      p.style.opacity = '0';
    });
    setTimeout(() => p.remove(), 800);
  }
}

// Menu : les boutons arrivent en décalé, puis le logo revient en fondu.
function ouvrirMenu() {
  const btns = [...document.querySelectorAll('#scr-title .menu .mbtn')];
  btns.forEach((b, i) => {
    b.classList.remove('slideIn');
    void b.offsetWidth;
    b.style.animationDelay = (i * 0.11) + 's';
    b.classList.add('slideIn');
  });
  const logo = document.querySelector('#scr-title .logo');
  if (logo) {
    logo.classList.remove('fadeIn');
    void logo.offsetWidth;
    logo.style.animationDelay = (btns.length * 0.11 + 0.15) + 's';
    logo.classList.add('fadeIn');
  }
}

function terminer() {
  if (phase === 9) return;
  phase = 9;
  timers.forEach(clearTimeout); timers = [];
  scr.className = 'screen scr-intro done';
  ouvrirMenu();
  // Tout premier lancement : on propose le tutoriel une seule fois, une fois
  // l'introduction passée pour ne pas lui couper la parole.
  proposerTutoSiPremiereFois();
}

// Le clic sur le personnage (plan 5) enchaîne sur son glissement à droite ;
// n'importe quel autre clic saute la séquence.
// Délai de grâce : un clic ou une touche parasite au tout premier instant du
// chargement sautait la séquence avant même qu'elle ne commence.
let debut = 0;
const GRACE = 700;

function auClic(e) {
  initAudio();
  if (phase === 9) return;
  if (performance.now() - debut < GRACE) return;
  if (phase === 5) {
    sfx('select');
    etincelles(18, 22);            // impulsion lumineuse au clic
    plan(6);                       // le héros glisse vers sa place
    plus_tard(1150, () => { plan(7); terminer(); });
    return;
  }
  terminer();
}

export function lancerIntro() {
  debut = performance.now();
  poserFaisceaux();
  poserParticules();
  dessinerHeros();

  scr.addEventListener('click', auClic);
  window.addEventListener('keydown', e => {
    if (phase === 9) return;
    e.preventDefault();
    auClic(e);
  }, { once: false });

  // Minutage resserré : la séquence complète tient en ~6 s au lieu de 10.
  // Plan 1 : logo en fondu, zoom continu sur le fond arc-en-ciel.
  plan(1);
  // Plan 2 : tout s'estompe jusqu'au noir.
  plus_tard(2200, () => plan(2));
  // Plan 3 : les projecteurs s'allument un à un et convergent.
  plus_tard(2900, () => { plan(3); sfx('whistle'); });
  // Chaque projecteur qui s'allume projette quelques étincelles.
  [0, 320, 640, 960].forEach(t => plus_tard(3000 + t, () => etincelles(5, 14)));
  // Plan 4 : explosion de lumière, le personnage se matérialise.
  plus_tard(4700, () => { plan(4); sfx('special'); etincelles(26, 30); });
  plus_tard(4950, () => etincelles(14, 20));
  // Plan 5 : il attend, l'invite clignote.
  plus_tard(6100, () => plan(5));
}
