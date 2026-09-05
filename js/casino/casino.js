// ---------------------------------------------------------------------------
// Le casino. Un écran d'accueil tenu par un croupier diable, et quatre jeux
// qui se paient en pièces — celles gagnées sur le terrain, pas d'autres.
//
// Chaque jeu vivra dans son propre fichier de ce dossier et ne sera chargé
// qu'au moment où on l'ouvre : le casino ne doit rien coûter à quelqu'un qui
// ne vient jamais y jouer.
//
// Règle du lieu, valable pour tous les jeux à venir : aucun filet. À court de
// pièces, on retourne jouer des matchs. La maison ne fait pas crédit.
// ---------------------------------------------------------------------------
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { Compte, connecte } from '../reseau/compte.js';

const alea = (a, b) => a + Math.random() * (b - a);

// ---------------------------------------------------------------------------
// Les icônes des quatre jeux. En SVG plutôt qu'en images : à 96 px comme en
// plein écran, il ne doit y avoir aucun rééchantillonnage, et la couleur doit
// suivre la palette du casino.
// ---------------------------------------------------------------------------
const PIQUE = 'M0 -9 C-5 -2 -9 2 -4.5 5.6 C-2 7.4 0 6 .4 4 C.8 6 3 7.4 5.4 5.6 C9.6 2 5 -2 0 -9 Z';
const COEUR = 'M0 7 C-6 1.6 -9.5 -2 -6 -6 C-3.6 -8.6 -.8 -7 0 -4.6 C.8 -7 3.6 -8.6 6 -6 C9.5 -2 6 1.6 0 7 Z';

const DEFS = `<defs>
  <linearGradient id="casOr" x1="0" y1="0" x2=".3" y2="1">
    <stop offset="0" stop-color="#f8ecb0"/><stop offset=".45" stop-color="#d4af37"/>
    <stop offset="1" stop-color="#8a6a14"/></linearGradient>
  <linearGradient id="casOrClair" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#e8d9a8"/></linearGradient>
</defs>`;

// Petite carte à jouer, réutilisée par deux icônes sur quatre.
function carteSvg(x, y, l, h, rang, pip, couleur, rot) {
  return `<g transform="rotate(${rot} 50 88)">
    <rect x="${x}" y="${y}" width="${l}" height="${h}" rx="3"
          fill="url(#casOrClair)" stroke="#8a6a14" stroke-width="1.6"/>
    <text x="${x + 4}" y="${y + 12}" font-family="Georgia,serif" font-size="10"
          font-weight="bold" fill="${couleur}">${rang}</text>
    <g transform="translate(${x + l / 2} ${y + h / 2 + 3}) scale(1.15)" fill="${couleur}">
      <path d="${pip}"/></g></g>`;
}

const ICONES = {
  blackjack: `<svg viewBox="0 0 100 100">${DEFS}
    <g transform="translate(0 -6)">${carteSvg(28, 20, 30, 44, 'A', PIQUE, '#1a1a22', -20)}
    ${carteSvg(42, 20, 30, 44, 'A', COEUR, '#c0182e', 18)}</g>
    <text x="50" y="92" text-anchor="middle" font-family="Russo One,sans-serif"
          font-size="21" fill="url(#casOr)">21</text></svg>`,
  // Les alternances rouge/noir sont un pointillé sur un anneau épais : douze
  // secteurs dessinés à la main auraient dérivé les uns par rapport aux autres.
  roulette: `<svg viewBox="0 0 100 100">${DEFS}
    <circle cx="50" cy="50" r="40" fill="none" stroke="url(#casOr)" stroke-width="3.5"/>
    <circle cx="50" cy="50" r="34" fill="#140406"/>
    <circle cx="50" cy="50" r="26.5" fill="none" stroke="#241014" stroke-width="15"/>
    <circle cx="50" cy="50" r="26.5" fill="none" stroke="#8f1226" stroke-width="15" stroke-dasharray="10.4 10.4"/>
    <circle cx="50" cy="50" r="34" fill="none" stroke="url(#casOr)" stroke-width="1.6"/>
    <circle cx="50" cy="50" r="19" fill="none" stroke="url(#casOr)" stroke-width="1.6"/>
    <circle cx="50" cy="50" r="15" fill="#2a1218" stroke="url(#casOr)" stroke-width="2"/>
    <path d="M50 35 L50 65 M35 50 L65 50 M39.4 39.4 L60.6 60.6 M60.6 39.4 L39.4 60.6"
          stroke="url(#casOr)" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="50" cy="50" r="4.6" fill="url(#casOr)"/>
    <circle cx="50" cy="23" r="4" fill="#fffaf0"/></svg>`,
  poker: `<svg viewBox="0 0 100 100">${DEFS}
    ${carteSvg(38, 16, 25, 40, '10', PIQUE, '#1a1a22', -34)}
    ${carteSvg(38, 14, 25, 40, 'J', PIQUE, '#1a1a22', -17)}
    ${carteSvg(38, 13, 25, 40, 'Q', PIQUE, '#1a1a22', 0)}
    ${carteSvg(38, 14, 25, 40, 'K', PIQUE, '#1a1a22', 17)}
    ${carteSvg(38, 16, 25, 40, 'A', PIQUE, '#1a1a22', 34)}</svg>`,
  caisses: `<svg viewBox="0 0 100 100">${DEFS}
    <path d="M22 52 C22 33 78 33 78 52 Z" fill="#331620" stroke="url(#casOr)" stroke-width="2.6"/>
    <rect x="22" y="52" width="56" height="30" rx="3" fill="#2a1218" stroke="url(#casOr)" stroke-width="2.6"/>
    <path d="M22 60 H78" stroke="url(#casOr)" stroke-width="2.2"/>
    <path d="M34 34 L34 82 M66 34 L66 82" stroke="url(#casOr)" stroke-width="1.6" opacity=".75"/>
    <rect x="44" y="55" width="12" height="15" rx="2.5" fill="url(#casOr)"/>
    <circle cx="50" cy="62" r="2.2" fill="#2a1218"/>
    <text x="50" y="30" text-anchor="middle" font-family="Russo One,sans-serif"
          font-size="26" fill="#fffaf0">?</text>
    <g fill="#fffaf0">
      <path d="M16 30 l1.6 4.2 4.2 1.6 -4.2 1.6 -1.6 4.2 -1.6 -4.2 -4.2 -1.6 4.2 -1.6 z"/>
      <path d="M84 26 l1.3 3.4 3.4 1.3 -3.4 1.3 -1.3 3.4 -1.3 -3.4 -3.4 -1.3 3.4 -1.3 z"/>
    </g></svg>`
};

// Les textes gardent la règle plutôt qu'une accroche : on mise de vraies pièces
// ici, et il n'y a pas de filet. Savoir à quoi on s'engage prime.
const JEUX = [
  { id: 'blackjack', nom: 'BLACKJACK', desc: 'Six jeux mélangés. Le croupier tire jusqu\'à 17.' },
  { id: 'roulette', nom: 'ROULETTE', desc: 'Européenne, un seul zéro. Tapis complet.' },
  { id: 'poker', nom: 'POKER', desc: 'Texas Hold\'em en tête-à-tête contre la maison.' },
  { id: 'caisses', nom: 'CASE OPENING', desc: 'Tenues et dos de cartes, tirés au sort.' }
];

// ---------------------------------------------------------------------------
// Les objets posés sur le comptoir.
// ---------------------------------------------------------------------------
const OBJETS = {
  // Vrai tumbler : large, bas, à fond épais.
  verre: `<svg viewBox="0 0 70 62">
    <defs><linearGradient id="casWsk" x1="0" y1="0" x2=".4" y2="1">
      <stop offset="0" stop-color="#ffb648"/><stop offset="1" stop-color="#a5490c"/></linearGradient></defs>
    <path d="M12 26 L58 26 L55 50 C55 54 15 54 15 50 Z" fill="url(#casWsk)" opacity=".92"/>
    <path d="M12 26 L58 26 L57 33 L13 33 Z" fill="#2a1206" opacity=".22"/>
    <path d="M9 14 L61 14 L56 52 C56 57 14 57 14 52 Z" fill="rgba(210,235,255,.13)"
          stroke="rgba(225,245,255,.62)" stroke-width="2.2"/>
    <path d="M14 50 L56 50 L55 55 C55 58 15 58 15 55 Z" fill="rgba(210,235,255,.3)"
          stroke="rgba(225,245,255,.55)" stroke-width="1.6"/>
    <path d="M16 18 L19 50" stroke="rgba(255,255,255,.5)" stroke-width="2.6" stroke-linecap="round"/>
    <rect x="22" y="24" width="14" height="12" rx="2.5" fill="rgba(235,250,255,.55)"
          stroke="rgba(255,255,255,.75)" stroke-width="1.2" transform="rotate(-13 29 30)"/>
    <rect x="36" y="32" width="13" height="11" rx="2.5" fill="rgba(235,250,255,.46)"
          stroke="rgba(255,255,255,.68)" stroke-width="1.2" transform="rotate(15 42 37)"/>
    <ellipse cx="35" cy="58" rx="24" ry="3.6" fill="#000" opacity=".5"/>
  </svg>`,
  cendrier: `<svg viewBox="0 0 90 60">
    <ellipse cx="45" cy="46" rx="30" ry="10" fill="#1b1016" stroke="#6b5330" stroke-width="2"/>
    <ellipse cx="45" cy="43" rx="23" ry="7" fill="#0c0609"/>
    <ellipse cx="45" cy="52" rx="30" ry="7" fill="#241722"/>
    <g transform="rotate(-13 45 40)">
      <rect x="34" y="34" width="40" height="8" rx="4" fill="#5a3419"/>
      <rect x="34" y="34" width="12" height="8" rx="4" fill="#3d2210"/>
      <rect x="60" y="34" width="7" height="8" rx="3" fill="#7a4a22"/>
      <circle cx="76" cy="38" r="4.4" fill="#ff7a1e"/>
      <circle cx="76" cy="38" r="2.2" fill="#ffe08a"/>
    </g>
  </svg>`,
  // Pile de jetons : la tranche de chacun est visible, sinon l'empilement se
  // lit comme une flaque.
  jetons: `<svg viewBox="0 0 70 56">
    <g transform="translate(35 44)">
      <path d="M-24 0 A24 8 0 0 0 24 0 L24 -7 A24 8 0 0 1 -24 -7 Z" fill="#6b1220" stroke="#d4af37" stroke-width="1.8"/>
      <path d="M-24 -8 A24 8 0 0 0 24 -8 L24 -15 A24 8 0 0 1 -24 -15 Z" fill="#14090e" stroke="#d4af37" stroke-width="1.8"/>
      <path d="M-24 -16 A24 8 0 0 0 24 -16 L24 -23 A24 8 0 0 1 -24 -23 Z" fill="#a5801e" stroke="#f6e27a" stroke-width="1.8"/>
      <ellipse cy="-24" rx="24" ry="8" fill="#c9a032" stroke="#f6e27a" stroke-width="2"/>
      <ellipse cy="-24" rx="13" ry="4.2" fill="none" stroke="#6b4d10" stroke-width="1.5"/>
    </g>
    <ellipse cx="35" cy="50" rx="26" ry="4" fill="#000" opacity=".5"/>
  </svg>`,
  bouteille: `<svg viewBox="0 0 54 120">
    <defs><linearGradient id="casBtl" x1="0" y1="0" x2=".5" y2="1">
      <stop offset="0" stop-color="#c8253c"/><stop offset=".55" stop-color="#7a0d1e"/>
      <stop offset="1" stop-color="#3a040d"/></linearGradient></defs>
    <path d="M22 8 L32 8 L32 34 C32 40 44 48 44 62 L44 104 C44 110 40 112 34 112
             L20 112 C14 112 10 110 10 104 L10 62 C10 48 22 40 22 34 Z"
          fill="url(#casBtl)" stroke="#4a0a14" stroke-width="2"/>
    <rect x="20" y="2" width="14" height="9" rx="2" fill="#d4af37" stroke="#8a6a14" stroke-width="1.4"/>
    <path d="M24 12 L30 12 L30 33 L24 33 Z" fill="rgba(255,255,255,.18)"/>
    <rect x="11" y="66" width="32" height="28" rx="2" fill="#f2e3b4" stroke="#8a6a14" stroke-width="1.6"/>
    <path d="M27 71 l2.4 5.6 6 .6 -4.6 4 1.4 6 -5.2 -3.2 -5.2 3.2 1.4 -6 -4.6 -4 6 -.6 Z" fill="#a5801e"/>
    <path d="M15 88 H39" stroke="#a5801e" stroke-width="1.4"/>
    <path d="M15 50 C15 44 20 40 20 36" stroke="rgba(255,255,255,.35)" stroke-width="2.4"
          fill="none" stroke-linecap="round"/>
    <ellipse cx="27" cy="114" rx="20" ry="4" fill="#000" opacity=".5"/>
  </svg>`,
  grimoire: `<svg viewBox="0 0 100 66">
    <defs><radialGradient id="casPage">
      <stop offset="0" stop-color="#ffeaa0" stop-opacity=".85"/>
      <stop offset="1" stop-color="#ffca4a" stop-opacity="0"/></radialGradient></defs>
    <ellipse cx="50" cy="26" rx="34" ry="20" fill="url(#casPage)"/>
    <path d="M50 24 C38 16 20 16 8 22 L8 52 C20 46 38 46 50 54 Z" fill="#efe0b6" stroke="#8a6a14" stroke-width="2"/>
    <path d="M50 24 C62 16 80 16 92 22 L92 52 C80 46 62 46 50 54 Z" fill="#f6ead0" stroke="#8a6a14" stroke-width="2"/>
    <path d="M8 22 L8 56 C20 50 38 50 50 58 L50 54 C38 46 20 46 8 52 Z" fill="#5a3a12"/>
    <path d="M92 22 L92 56 C80 50 62 50 50 58 L50 54 C62 46 80 46 92 52 Z" fill="#6b4718"/>
    <g stroke="#a08040" stroke-width="1.4" opacity=".8" stroke-linecap="round">
      <path d="M16 28 H40 M16 34 H38 M16 40 H41"/>
      <path d="M60 28 H84 M62 34 H84 M60 40 H83"/>
    </g>
  </svg>`
};

// ---------------------------------------------------------------------------
// Sceaux magiques du fond. Un anneau, une couronne de crans, un pentacle
// inscrit et des runes sur le cercle. Tout est calculé : cinq sceaux, c'est
// cinq fois la même trigonométrie, et la recopier serait cinq occasions de se
// tromper d'un sommet.
// ---------------------------------------------------------------------------
const RUNES_SCEAU = 'ᚦᚱᚲᛉᛊᛗᛞᛖᚷᚹᛚᛏ';

export function sceau(rayon, branches, nbRunes) {
  const pt = (r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [(r * Math.cos(a)).toFixed(2), (r * Math.sin(a)).toFixed(2)];
  };
  // On relie un sommet sur deux : c'est ce qui donne l'étoile d'un seul trait.
  // Les relier à la suite ne donnerait qu'un polygone.
  const sommets = [];
  for (let i = 0; i < branches; i++) sommets.push(pt(rayon * .74, i * 360 / branches));
  const ordre = [];
  for (let i = 0, j = 0; i < branches; i++, j = (j + 2) % branches) ordre.push(sommets[j]);
  const etoile = 'M' + ordre.map(p => p.join(' ')).join(' L') + ' Z';

  let crans = '';
  for (let i = 0; i < 36; i++) {
    const [x1, y1] = pt(rayon * .88, i * 10), [x2, y2] = pt(rayon * .94, i * 10);
    crans += `M${x1} ${y1} L${x2} ${y2} `;
  }

  let runes = '';
  for (let i = 0; i < nbRunes; i++) {
    const [x, y] = pt(rayon * .62, i * 360 / nbRunes);
    const g = RUNES_SCEAU[(Math.random() * RUNES_SCEAU.length) | 0];
    runes += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
              font-size="${(rayon * .13).toFixed(1)}" fill="#ff9b3d" opacity=".75">${g}</text>`;
  }

  return `<svg viewBox="${-rayon} ${-rayon} ${rayon * 2} ${rayon * 2}">
    <circle class="trait" r="${rayon * .97}" stroke-width="1.1"/>
    <circle class="trait" r="${rayon * .86}" stroke-width=".6"/>
    <circle class="lueur" r="${rayon * .5}" stroke-width="1"
            style="animation-duration:${alea(5, 9).toFixed(1)}s;animation-delay:${-alea(0, 6).toFixed(1)}s"/>
    <path class="trait" d="${crans}" stroke-width=".7" opacity=".65"/>
    <path class="lueur" d="${etoile}" stroke-width="1"
          style="animation-duration:${alea(4, 8).toFixed(1)}s;animation-delay:${-alea(0, 5).toFixed(1)}s"/>
    ${runes}
  </svg>`;
}

// ---------------------------------------------------------------------------
// Particules du fond. Un seul canvas pour trois familles : braises qui montent,
// volutes violettes sur les côtés, pièces d'or qui dérivent.
//
// La boucle ne tourne QUE pendant que l'écran du casino est ouvert : le jeu
// fait déjà tourner un match de démo derrière les menus, et deux boucles de
// rendu pour un écran qu'on ne regarde pas, c'est de la batterie brûlée.
// ---------------------------------------------------------------------------
let cv = null, ctx = null, L = 0, H = 0, particules = [], boucle = null, derniere = 0;

function taillerCanvas() {
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  L = r.width; H = r.height;
  cv.width = L * dpr; cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function neuveBraise() {
  return { type: 'braise', x: alea(0, L), y: H + alea(0, 60), r: alea(.8, 2.4),
           vy: alea(-.35, -.14), vx: alea(-.12, .12), vie: 0, duree: alea(6, 13),
           teinte: alea(18, 38) };
}
function neuveFumee() {
  // Les volutes restent sur les bords : au centre, elles voileraient le diable.
  const gauche = Math.random() < .5;
  return { type: 'fumee', x: gauche ? alea(-40, L * .22) : alea(L * .78, L + 40),
           y: alea(H * .15, H), r: alea(28, 62), vy: alea(-.22, -.06),
           vx: alea(-.09, .09), vie: 0, duree: alea(9, 17), phase: alea(0, 6.3) };
}
function neuvePiece() {
  return { type: 'piece', x: alea(0, L), y: alea(-40, H * .3), r: alea(4, 9),
           vy: alea(.12, .34), vx: alea(-.06, .06), vie: 0, duree: alea(11, 20),
           tour: alea(0, 6.3), vTour: alea(.012, .035) };
}

function semer() {
  particules = [];
  // Les pièces dominent : c'est le motif du lieu. La fumée du canvas reste
  // discrète, la vraie volute étant en CSS derrière le diable — deux sources
  // de fumée empâtaient le fond.
  for (let i = 0; i < 16; i++) { const p = neuveBraise(); p.vie = alea(0, p.duree); particules.push(p); }
  for (let i = 0; i < 4; i++) { const p = neuveFumee(); p.vie = alea(0, p.duree); particules.push(p); }
  for (let i = 0; i < 26; i++) { const p = neuvePiece(); p.vie = alea(0, p.duree); particules.push(p); }
}

// Fondu d'entrée et de sortie : une particule qui apparaît d'un coup se
// remarque, et c'est exactement ce qu'on ne veut pas d'un fond.
function opacite(p) {
  const t = p.vie / p.duree;
  if (t < .18) return t / .18;
  if (t > .8) return (1 - t) / .2;
  return 1;
}

function dessiner(dt) {
  ctx.clearRect(0, 0, L, H);
  for (let i = 0; i < particules.length; i++) {
    const p = particules[i];
    p.vie += dt;
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    if (p.vie >= p.duree) {
      particules[i] = p.type === 'braise' ? neuveBraise()
        : p.type === 'fumee' ? neuveFumee() : neuvePiece();
      continue;
    }
    const o = opacite(p);
    if (p.type === 'braise') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      g.addColorStop(0, `hsla(${p.teinte},100%,66%,${o * .95})`);
      g.addColorStop(1, `hsla(${p.teinte},100%,50%,0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.284); ctx.fill();
    } else if (p.type === 'fumee') {
      const ond = Math.sin(p.vie * .7 + p.phase) * 14;
      const g = ctx.createRadialGradient(p.x + ond, p.y, 0, p.x + ond, p.y, p.r);
      g.addColorStop(0, `rgba(150,70,225,${o * .17})`);
      g.addColorStop(1, 'rgba(120,40,200,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x + ond, p.y, p.r, 0, 6.284); ctx.fill();
    } else {
      // Le pincement horizontal fait tourner la pièce sur elle-même, sans
      // recourir à une vraie rotation 3D pour un disque de huit pixels.
      p.tour += p.vTour * dt * 60;
      const larg = Math.abs(Math.cos(p.tour)) * p.r + .6;
      ctx.save();
      ctx.globalAlpha = o * .5;
      const g = ctx.createLinearGradient(p.x - larg, p.y - p.r, p.x + larg, p.y + p.r);
      g.addColorStop(0, '#fff3b8'); g.addColorStop(.5, '#d4af37'); g.addColorStop(1, '#7a5510');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, larg, p.r, 0, 0, 6.284); ctx.fill();
      ctx.restore();
    }
  }
}

function image(t) {
  // La boucle se coupe d'elle-même dès que l'écran n'est plus affiché. Câbler
  // un arrêt sur chaque sortie possible — retour, Échap, bouton du haut —
  // aurait laissé un chemin oublié faire tourner le rendu dans le vide.
  const ecran = $('scr-casino');
  if (!ecran || ecran.classList.contains('hidden')) { boucle = null; return; }
  const dt = Math.min((t - derniere) / 1000, .05);
  derniere = t;
  dessiner(dt);
  boucle = requestAnimationFrame(image);
}

function demarrerFond() {
  if (!cv || boucle) return;
  taillerCanvas();
  if (!particules.length) semer();
  derniere = performance.now();
  boucle = requestAnimationFrame(image);
}

// ---------------------------------------------------------------------------
// Le compteur de pièces. Les chiffres sont des rouleaux : chaque colonne porte
// 0-9 répétés et se translate. Le nombre de tours fait la vitesse ressentie —
// c'est lui qui donne la machine à sous, pas la durée de l'animation.
//
// Sept copies, et l'on se repose toujours sur celle du milieu après chaque
// défilement : sans ce retour au centre, deux pertes de suite finissaient en
// bout de rouleau et la seconde ne défilait plus.
// ---------------------------------------------------------------------------
const SERIES = 7, SERIE_REPOS = 3;
let solde = 0, minuteries = [];

function construireRouleaux(texte) {
  const zone = $('casRouleaux');
  if (!zone) return;
  zone.innerHTML = '';
  for (const c of texte) {
    const r = document.createElement('div'); r.className = 'casRouleau';
    const b = document.createElement('div'); b.className = 'casBande';
    for (let s = 0; s < SERIES; s++) for (let d = 0; d <= 9; d++) {
      const e = document.createElement('span'); e.textContent = d; b.appendChild(e);
    }
    r.appendChild(b); zone.appendChild(r);
    poser(b, +c, SERIE_REPOS);
  }
}

function poser(bande, chiffre, serie, anime) {
  if (!anime) bande.style.transition = 'none';
  // Exprimé dans l'unité même qui définit la hauteur d'un chiffre : aucune
  // mesure, donc rien à rater si la mise en page n'est pas encore faite.
  bande.style.transform = `translateY(calc(var(--hChiffre) * ${-(serie * 10 + chiffre)}))`;
  bande.dataset.chiffre = chiffre;
  if (!anime) { void bande.offsetHeight; bande.style.transition = ''; }
}

function arreterRoulement() {
  for (const t of minuteries) clearTimeout(t);
  minuteries = [];
  const c = $('casCristal');
  if (c) c.classList.remove('gagne', 'perd', 'flash');
  $('scr-casino')?.classList.remove('secoue');
}
const plusTard = (fn, ms) => { minuteries.push(setTimeout(fn, ms)); };

// `cible` donne le point de départ : le cristal pour le compteur, une carte
// pour le survol et le clic. Des div jetables plutôt qu'un canvas — quatre
// cartes qui crachent quinze points, le DOM encaisse sans qu'on ait à tenir
// une seconde boucle de rendu.
export function paillettes(cible, n, couleurs, sens, etale) {
  // L'écran d'accueil ET les tables se servent d'ici : on remonte à l'écran
  // qui contient la cible plutôt que de viser le casino en dur, sinon les
  // paillettes d'une table iraient s'animer sur un écran caché.
  const ecran = cible && cible.closest('.screen');
  if (!cible || !ecran) return;
  const r = cible.getBoundingClientRect(), s = ecran.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const p = document.createElement('div');
    p.className = 'casPaillette';
    const t = 3 + Math.random() * 5;
    const couleur = couleurs[(Math.random() * couleurs.length) | 0];
    p.style.cssText = `width:${t}px;height:${t * (Math.random() < .5 ? 1 : 2.2)}px;` +
      `background:${couleur};color:${couleur};` +
      `left:${r.left - s.left + Math.random() * r.width}px;` +
      `top:${r.top - s.top + r.height * .5}px;box-shadow:0 0 6px currentColor;`;
    ecran.appendChild(p);
    const dx = (Math.random() - .5) * etale, dy = sens * (40 + Math.random() * 110);
    p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
               { transform: `translate(${dx}px,${dy}px) rotate(${(Math.random() - .5) * 540}deg)`, opacity: 0 }],
      { duration: 700 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.4,1)' })
      .onfinish = () => p.remove();
  }
}

function voile(genre) {
  const ecran = $('scr-casino');
  if (!ecran) return;
  const v = document.createElement('div');
  v.className = 'casVoile ' + genre;
  ecran.appendChild(v);
  setTimeout(() => v.remove(), 800);
}

function runesRouges() {
  const cristal = $('casCristal'), ecran = $('scr-casino');
  if (!cristal || !ecran) return;
  const r = cristal.getBoundingClientRect(), s = ecran.getBoundingClientRect();
  ['⛧', '☠', '⛧', '✚'].forEach((g, i) => {
    const e = document.createElement('div');
    e.className = 'casRuneRouge';
    e.textContent = g;
    e.style.left = (r.left - s.left + (i / 3) * r.width) + 'px';
    e.style.top = (r.top - s.top - 10) + 'px';
    e.style.animationDelay = (i * 90) + 'ms';
    ecran.appendChild(e);
    setTimeout(() => e.remove(), 1300);
  });
}

// Point d'entrée du compteur. C'est cette fonction que les jeux appelleront
// quand ils feront gagner ou perdre des pièces.
export function majPieces(montant) {
  arreterRoulement();
  const cristal = $('casCristal'), ecran = $('scr-casino');
  if (!cristal) return;
  const gain = montant > 0;
  const avant = solde;
  solde = Math.max(0, solde + montant);

  // On construit d'emblée les colonnes du plus large des deux nombres, en
  // affichant l'ancienne valeur complétée de zéros : la colonne du millier
  // existe donc AVANT le défilement et peut rouler comme les autres.
  const largeur = Math.max(String(solde).length, String(avant).length);
  construireRouleaux(String(avant).padStart(largeur, '0'));

  const bandes = [...cristal.querySelectorAll('.casBande')];
  const cible = String(solde).padStart(largeur, '0');
  cristal.classList.add(gain ? 'gagne' : 'perd');
  ecran?.classList.add('secoue');
  voile(gain ? 'gain' : 'perte');
  if (!gain) runesRouges();

  // Gagner fait descendre la bande, perdre la fait remonter : le sens du
  // défilement dit ce qui vient d'arriver avant même qu'on lise le chiffre.
  const serieVisee = gain ? SERIE_REPOS + 2 : SERIE_REPOS - 2;
  bandes.forEach((b, i) => {
    // Les rouleaux s'arrêtent l'un après l'autre, comme sur une vraie machine.
    plusTard(() => poser(b, +cible[i], serieVisee, true), i * 110);
  });

  const fin = 900 + bandes.length * 110 + (gain ? 0 : 600);
  plusTard(() => {
    cristal.classList.add('flash');
    plusTard(() => cristal.classList.remove('flash'), 110);
    if (gain) paillettes(cristal, 26, ['#f6e27a', '#d4af37', '#7bff9d', '#fff'], -1, 220);
    else paillettes(cristal, 16, ['#3a2b2b', '#5a4040', '#8a2020'], 1, 120);
  }, fin);

  plusTard(() => {
    cristal.classList.remove('gagne', 'perd');
    ecran?.classList.remove('secoue');
    // Le zéro de tête d'un nombre qui a rétréci (1010 → 990) doit disparaître.
    if (String(solde).length !== largeur) construireRouleaux(String(solde));
    // Sinon retour silencieux au centre : c'est le même glyphe une série plus
    // loin, donc le saut est invisible, et le roulement suivant a de nouveau
    // de la course des deux côtés.
    else for (const b of bandes) poser(b, +b.dataset.chiffre, SERIE_REPOS);
  }, fin + 700);
}

// ---------------------------------------------------------------------------
// Ouverture de l'écran.
// ---------------------------------------------------------------------------
export function ouvrirCasino() {
  rafraichirSolde();
  showScreen('casino');
  demarrerFond();
}

// Le solde est affiché en permanence dans le cristal : dans un endroit où l'on
// dépense, ne pas savoir ce qu'on a est une faute de conception, pas du
// suspense.
export function rafraichirSolde() {
  const dedans = connecte() && Compte.profil;
  const avis = $('casinoSolde');
  if (avis) {
    avis.classList.toggle('hidden', !!dedans);
    avis.textContent = 'CONNECTE-TOI POUR JOUER';
  }
  solde = dedans ? (Compte.profil.pieces || 0) : 0;
  construireRouleaux(String(solde));
}

let effacer = null;
function message(texte) {
  const el = $('casinoMsg');
  if (!el) return;
  el.textContent = texte;
  el.classList.remove('hidden', 'pop');
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout(effacer);
  effacer = setTimeout(() => el.classList.add('hidden'), 2600);
}

// La carte s'enfonce, éclate en blanc, crache du feu, puis ouvre son jeu. Ce
// n'est pas qu'un effet : ça occupe l'attente pendant que le module du jeu se
// charge, et ça laisse le bruitage aller au bout.
function allumer(carte, jeu) {
  if (carte.classList.contains('enfonce')) return;
  if (!connecte()) { sfx('deny'); message('Connecte-toi : les pièces vivent sur ton compte.'); return; }
  sfx('casinoFeu');
  carte.classList.add('enfonce');
  setTimeout(() => {
    carte.classList.remove('enfonce');
    carte.classList.add('flash');
    setTimeout(() => carte.classList.remove('flash'), 110);
    paillettes(carte, 14, ['#ff8a1e', '#ff4d18', '#f6e27a'], -1, 180);
    $('scr-casino')?.classList.add('secoue');
    setTimeout(() => $('scr-casino')?.classList.remove('secoue'), 240);
    ouvrirJeu(jeu);
  }, 100);
}

// Chaque jeu est chargé au moment où on l'ouvre, jamais avant : le casino ne
// doit rien coûter à quelqu'un qui n'y entre pas. Tant qu'un module n'existe
// pas, on le dit plutôt que d'ouvrir un écran vide.
async function ouvrirJeu(jeu) {
  if (jeu.id === 'blackjack') {
    const { ouvrirBlackjack } = await import('./blackjack.js');
    ouvrirBlackjack();
    return;
  }
  message(jeu.nom + ' — pas encore ouvert. Le diable finit d\'installer la table.');
}

// La carte s'incline VERS la souris. L'axe X est piloté par la position
// verticale et inversement : c'est ce croisement qui donne un objet regardé de
// biais, et non une image qui glisse.
let dernierSurvol = 0;
function brancherSurvol(carte) {
  carte.addEventListener('pointermove', ev => {
    const r = carte.getBoundingClientRect();
    const px = (ev.clientX - r.left) / r.width - .5;
    const py = (ev.clientY - r.top) / r.height - .5;
    carte.style.transform =
      `perspective(900px) rotateX(${-py * 6}deg) rotateY(${px * 6}deg) scale(1.06)`;
  });
  carte.addEventListener('pointerenter', () => {
    // Garde-fou : balayer la rangée fait entrer dans quatre cartes en un
    // geste, et sans ce délai on entendrait quatre clics d'affilée.
    const t = performance.now();
    if (t - dernierSurvol > 90) { dernierSurvol = t; sfx('casinoSurvol'); }
    paillettes(carte, 4, ['#f6e27a', '#d4af37'], -1, 90);
  });
  carte.addEventListener('pointerleave', () => { carte.style.transform = ''; });
}

// ---------------------------------------------------------------------------
// Construction de l'écran, une fois pour toutes au chargement.
// ---------------------------------------------------------------------------
(function construire() {
  const grille = $('casinoJeux');
  if (!grille) return;

  for (const jeu of JEUX) {
    const carte = document.createElement('button');
    carte.className = 'casinoCard';
    carte.dataset.jeu = jeu.id;
    carte.innerHTML = `<span class="casinoIco">${ICONES[jeu.id]}</span>` +
                      `<b>${jeu.nom}</b><em>${jeu.desc}</em>`;
    carte.addEventListener('click', () => allumer(carte, jeu));
    brancherSurvol(carte);
    grille.appendChild(carte);
  }

  for (const [id, svg] of Object.entries(OBJETS)) {
    const e = document.querySelector(`[data-objet="${id}"]`);
    if (e) e.innerHTML = svg;
  }
  // La fumée appartient au cigare : elle part de sa braise, pas du cendrier.
  const cendrier = document.querySelector('[data-objet="cendrier"]');
  if (cendrier) {
    const f = document.createElement('div');
    f.className = 'casFumeeCigare';
    f.innerHTML = '<i></i><i></i><i></i>';
    cendrier.appendChild(f);
  }

  const rivets = $('casRivets');
  if (rivets) for (let i = 0; i < 22; i++) rivets.appendChild(document.createElement('i'));

  // Chaque flamme a sa cadence et son retard : réglées ensemble, elles
  // battraient à l'unisson et se liraient comme un clignotant.
  const flammes = $('casFlammes');
  if (flammes) for (let i = 0; i < 17; i++) {
    const f = document.createElement('i');
    f.style.left = (i * 6 + alea(-1.6, 1.6)) + '%';
    f.style.height = alea(6, 11) + 'cqh';
    f.style.width = alea(3, 5.5) + 'cqh';
    f.style.animationDuration = alea(.8, 1.7) + 's';
    f.style.animationDelay = -alea(0, 2) + 's';
    flammes.appendChild(f);
  }

  const zoneSceaux = $('casSceaux');
  if (zoneSceaux) for (const [classe, branches, runes] of
    [['a', 5, 8], ['b', 7, 7], ['c', 5, 12], ['d', 5, 6], ['e', 7, 6]]) {
    const d = document.createElement('div');
    d.className = 'casSceau ' + classe;
    d.innerHTML = sceau(50, branches, runes);
    zoneSceaux.appendChild(d);
  }

  cv = $('casCanvas');
  if (cv) {
    ctx = cv.getContext('2d');
    new ResizeObserver(taillerCanvas).observe(cv);
  }
  construireRouleaux('0');
})();
