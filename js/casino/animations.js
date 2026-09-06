// ---------------------------------------------------------------------------
// Les transitions du casino : ce qui se passe entre le comptoir et une table.
//
// Cinq temps. La carte prend feu, le diable se dissout en fumée violette, le
// comptoir se fend et laisse voir un vortex, la caméra le traverse, et la table
// se pose de l'autre côté. Un fondu au noir aurait coûté trois lignes ; c'est
// justement le problème — on aurait changé d'écran au lieu d'entrer quelque
// part.
//
// Les systèmes partagés (particules, secousse, voiles, enchaînement des phases)
// vivent déjà dans `effets.js`, écrit pour les fins de main du blackjack. Ils
// sont réutilisés tels quels plutôt que redoublés ici : deux moteurs de
// particules dans le même casino, c'est deux réglages à tenir d'accord.
//
// L'API est passée par éléments et non par identifiants, pour que
// `mockups/casino-transitions.html` rejoue exactement les mêmes séquences sur
// une scène à lui.
// ---------------------------------------------------------------------------
import { sfx } from '../audio/audio.js';
import { enchainer, secousse, emettre, boiteDe, purger } from './effets.js';

// Le voile de transition est monté à la demande et gardé. Le déclarer dans
// index.html aurait marché aussi, mais il n'appartient à aucun écran : il passe
// AU-DESSUS de tous, et sa place dans le document n'aurait rien dit de ça.
const voiles = new WeakMap();

function voile(hote) {
  let v = voiles.get(hote);
  if (v && v.racine.isConnected) return v;
  const racine = document.createElement('div');
  racine.className = 'ctVoile hidden';
  racine.innerHTML = '<canvas class="ctVortex"></canvas><div class="ctFente"></div><div class="ctEclair"></div>';
  hote.appendChild(racine);
  v = {
    racine,
    canvas: racine.querySelector('canvas'),
    fente: racine.querySelector('.ctFente'),
    eclair: racine.querySelector('.ctEclair')
  };
  v.ctx = v.canvas.getContext('2d');
  voiles.set(hote, v);
  return v;
}

function calibrer(v, hote) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  v.l = hote.clientWidth; v.h = hote.clientHeight;
  v.canvas.width = v.l * dpr | 0; v.canvas.height = v.h * dpr | 0;
  v.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// --- Le vortex --------------------------------------------------------------
// Des bras de flamme et de fumée qui tournent en s'ouvrant, et des cartes qui
// s'en échappent. Dessiné plutôt que composé en DOM : une spirale qui grandit,
// ce sont des centaines de traits par image, et le DOM ne les tiendrait pas.
//
// La toile n'est jamais effacée complètement — on repasse un noir translucide
// par-dessus. C'est ce qui donne la traîne, à un dixième du coût d'un vrai flou
// de mouvement.
const alea = (a, b) => a + Math.random() * (b - a);

function vortex(v, cx, cy, t, ouverture, cartes) {
  const c = v.ctx;
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = 'rgba(6,2,8,.19)';
  c.fillRect(0, 0, v.l, v.h);

  c.globalCompositeOperation = 'lighter';
  const rMax = Math.max(v.l, v.h) * .78 * ouverture;
  for (let b = 0; b < 5; b++) {
    const phase = t * 5.4 + b * 1.2566;
    c.beginPath();
    for (let k = 0; k <= 34; k++) {
      const p = k / 34;
      const a = phase + p * 5.6;
      const r = rMax * (.08 + p * .92);
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .74;
      k ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    const g = c.createLinearGradient(cx - rMax, cy, cx + rMax, cy);
    g.addColorStop(0, b % 2 ? 'rgba(180,80,255,.95)' : 'rgba(255,160,40,1)');
    g.addColorStop(1, b % 2 ? 'rgba(90,20,160,0)' : 'rgba(180,40,10,0)');
    c.strokeStyle = g;
    c.lineWidth = 7 + 11 * (1 - t % 1);
    c.stroke();
  }

  // Le cœur : un puits blanc qui s'ouvre au centre.
  const noyau = c.createRadialGradient(cx, cy, 0, cx, cy, rMax * .34);
  noyau.addColorStop(0, `rgba(255,246,214,${.5 * ouverture})`);
  noyau.addColorStop(.45, `rgba(212,120,255,${.32 * ouverture})`);
  noyau.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = noyau;
  c.beginPath(); c.arc(cx, cy, rMax * .34, 0, 6.2832); c.fill();

  // Les cartes aspirées. Elles montrent leur dos bordeaux : ce sont celles du
  // comptoir qui partent avec nous.
  c.globalCompositeOperation = 'source-over';
  for (const k of cartes) {
    const a = k.a0 + t * k.vit;
    const r = k.r0 + rMax * k.ecart * t;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * .74;
    c.save();
    c.translate(x, y);
    c.rotate(a * 1.7 + k.rot);
    c.globalAlpha = Math.max(0, 1 - t * .85);
    c.fillStyle = '#4a0a0a';
    c.strokeStyle = '#d4af37';
    c.lineWidth = 1.6;
    c.beginPath(); c.roundRect(-11, -16, 22, 32, 3); c.fill(); c.stroke();
    c.fillStyle = 'rgba(246,226,122,.85)';
    c.beginPath(); c.arc(0, 0, 4, 0, 6.2832); c.fill();
    c.restore();
  }
  c.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Entrée : du comptoir vers une table
//
// `carte` est le bouton cliqué (il prend feu), `diable` le personnage à
// dissoudre, `comptoir` le meuble qui se fend. Tous facultatifs : le banc
// d'essai n'en fournit qu'une partie, et la séquence doit tenir quand même.
// ---------------------------------------------------------------------------
export function transitionVersJeu(opts, arrivee) {
  const { hote, carte, diable, comptoir, variante = 'table' } = opts;
  if (!hote) { arrivee && arrivee(); return () => { }; }

  const v = voile(hote);
  calibrer(v, hote);
  v.racine.classList.remove('hidden');
  v.eclair.className = 'ctEclair';
  v.ctx.clearRect(0, 0, v.l, v.h);

  // Le vortex s'ouvre là où se trouve la carte cliquée, pas au centre de
  // l'écran : c'est de CE bouton qu'on part.
  const b = carte ? boiteDe(hote, carte) : { x: v.l / 2 - 40, y: v.h * .62, l: 80, h: 80 };
  const cx = b.x + b.l / 2, cy = b.y + b.h / 2;

  const cartes = [];
  for (let i = 0; i < 9; i++)
    cartes.push({ a0: alea(0, 6.28), r0: alea(10, 40), vit: alea(3.5, 7), ecart: alea(.5, 1), rot: alea(0, 3) });

  let anim = null, debut = 0, refuse = false;
  const DEBUT_VORTEX = 600, FIN_VORTEX = 1500;

  const boucle = maintenant => {
    if (!debut) debut = maintenant;
    const ms = maintenant - debut;
    const t = Math.min(1, Math.max(0, (ms - DEBUT_VORTEX) / (FIN_VORTEX - DEBUT_VORTEX)));
    // Le vortex naît sur la carte cliquée puis glisse vers le centre de l'écran.
    // Laissé sur la carte — qui est en bas — sa moitié basse tombe hors cadre et
    // on ne voit qu'un bandeau. Ce glissement est aussi ce qui donne la
    // sensation d'y plonger plutôt que de le regarder.
    const gx = cx + (v.l / 2 - cx) * t, gy = cy + (v.h * .52 - cy) * t;
    vortex(v, gx, gy, ms / 1000, t, cartes);
    if (ms < FIN_VORTEX + 260) anim = requestAnimationFrame(boucle);
  };

  const annuler = enchainer([
    // Phase 1 — la carte s'enflamme et l'écran encaisse le clic.
    [0, () => {
      sfx('casinoFeu');
      secousse(hote, 3, 120);
      if (carte) {
        carte.classList.add('enFeu');
        emettre(hote, 'feu', { x: b.x, y: b.y + b.h * .5, l: b.l, h: b.h * .5 }, 26);
      }
    }],
    [140, () => { if (carte) emettre(hote, 'feu', { x: b.x, y: b.y, l: b.l, h: b.h }, 18); }],

    // Phase 2 — le diable part en fumée violette.
    [160, () => {
      sfx('ctPoof');
      if (diable) {
        diable.classList.add('ctDissout');
        const d = boiteDe(hote, diable);
        emettre(hote, 'fumee', { x: d.x + d.l * .2, y: d.y + d.h * .25, l: d.l * .6, h: d.h * .5 }, 30, '#3a1050');
      }
    }],

    // Phase 3 — le comptoir se fend, le vortex s'ouvre, la caméra plonge.
    [300, () => {
      sfx('ctPortail');
      v.fente.style.left = (cx / v.l * 100) + '%';
      v.fente.classList.add('ouvre');
      if (comptoir) comptoir.classList.add('ctFend');
      hote.classList.add('ctPlonge');
      anim = requestAnimationFrame(boucle);
    }],

    // Phase 4 — la traversée. L'éclair reste discret : à pleine opacité il
    // efface le vortex qu'on a mis une seconde à ouvrir.
    [600, () => {
      sfx('bjWhoosh');
      v.eclair.className = 'ctEclair passe ' + variante;
      secousse(hote, 6, 300);
    }],

    // Phase 5 — on est de l'autre côté. C'est ici que l'écran change, sous le
    // voile, pour que personne ne voie la bascule.
    [300, () => {
      // La table peut refuser de s'ouvrir — pas assez de pièces pour s'asseoir,
      // par exemple. Elle le dit en renvoyant `false`, et on referme aussitôt au
      // lieu de célébrer une arrivée qui n'a pas eu lieu.
      refuse = arrivee ? arrivee() === false : false;
      if (carte) carte.classList.remove('enFeu');
      if (diable) diable.classList.remove('ctDissout');
      if (comptoir) comptoir.classList.remove('ctFend');
      hote.classList.remove('ctPlonge');
    }],
    [60, () => {
      v.racine.classList.add('sort');
      if (refuse) return;
      // Braises résiduelles sur la table qui vient d'apparaître : la salle
      // qu'on quitte laisse quelque chose derrière elle.
      const dest = document.querySelector('.screen:not(.hidden) .bjTapis, .screen:not(.hidden) .rlTapis');
      const cible = dest ? dest.closest('.screen') : null;
      if (cible) {
        cible.classList.add('ctPose');
        emettre(cible, 'fumee', { x: 0, y: cible.clientHeight * .5, l: cible.clientWidth, h: cible.clientHeight * .4 }, 16, '#2a1040');
        setTimeout(() => cible.classList.remove('ctPose'), 700);
      }
      sfx('bjDing');
    }],
    [420, () => {
      cancelAnimationFrame(anim);
      v.racine.classList.add('hidden');
      v.racine.classList.remove('sort');
      v.fente.classList.remove('ouvre');
      v.ctx.clearRect(0, 0, v.l, v.h);
      purger(hote);
    }]
  ]);

  return () => { annuler(); cancelAnimationFrame(anim); v.racine.classList.add('hidden'); };
}

// ---------------------------------------------------------------------------
// Retour : de la table vers le comptoir. Court exprès — on rentre, on ne part
// pas à l'aventure, et une sortie aussi cérémonieuse que l'entrée finirait par
// peser au bout de trois allers-retours.
// ---------------------------------------------------------------------------
export function transitionRetour(hote, arrivee) {
  if (!hote) { arrivee && arrivee(); return; }
  const v = voile(hote);
  calibrer(v, hote);
  v.racine.classList.remove('hidden');
  v.ctx.clearRect(0, 0, v.l, v.h);
  v.eclair.className = 'ctEclair retour';
  sfx('ctRetour');
  setTimeout(() => { if (arrivee) arrivee(); }, 300);
  setTimeout(() => {
    v.racine.classList.add('sort');
    setTimeout(() => {
      v.racine.classList.add('hidden');
      v.racine.classList.remove('sort');
      v.eclair.className = 'ctEclair';
    }, 320);
  }, 320);
}
