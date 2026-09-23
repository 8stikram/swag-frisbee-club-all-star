// ---------------------------------------------------------------------------
// Case opening — on paie une caisse, une bande de tenues défile, elle s'arrête
// sur celle qu'on gagne.
//
// Deux modes : aléatoire, tirée dans tout le jeu, ou ciblée, tirée parmi les
// tenues d'un seul personnage. La seconde coûte plus cher parce qu'elle retire
// tout le hasard sur le PERSONNAGE — il ne reste que celui de la tenue. Les
// tarifs et leur raison sont plus bas, avec `PRIX`.
//
// Le tirage est fait avant la première image, comme à la roulette : la bande
// est construite AUTOUR du résultat, elle ne le décide pas. Une bande qui
// s'arrête « où elle veut » ferait dépendre le gain du nombre d'images par
// seconde, et rendrait le résultat impossible à arbitrer côté serveur.
//
// Le décor, le compteur et les effets sont ceux des autres tables du casino.
// ---------------------------------------------------------------------------
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { Compte, connecte, ajouterPieces } from '../reseau/compte.js';
import { sceau, message as messageCasino } from './casino.js';
import { secousse, flash, emettre, boiteDe } from './effets.js';
import { CHARS } from '../data/characters.js';
import { SKINS, estDebloque, offrirSkin } from '../data/skins-perso.js';
import { drawSkinDisc } from '../data/skins.js';
import { catalogue, possede, offrir } from '../data/inventaire.js';
import { imageDe } from '../ui/inventaire-visuels.js';

// --- Ce qu'on peut gagner ---------------------------------------------------
// Les tenues d'origine sont exclues : elles sont déjà acquises par tout le
// monde, et une caisse qui peut ne rien donner du tout n'est pas une caisse.
const skinsDe = ck => (SKINS[ck] || []).filter(s => !s.defaut).map(s => ({ ck, skin: s }));
const tousLesSkins = () => Object.keys(SKINS).flatMap(skinsDe);
// Une tenue déjà prise ne peut pas ressortir. Payer une caisse pour recevoir ce
// qu'on possède déjà, c'est payer pour rien — et au prix d'une caisse, ça se
// remarque à la première fois.
const nonPris = liste => liste.filter(e => !estDebloque(e.ck, e.skin.id));
// Un personnage sans tenue à débloquer ne peut pas être choisi : sa caisse
// ciblée serait plein tarif pour un résultat connu d'avance.
const persosOuvrables = () => Object.keys(SKINS).filter(ck => skinsDe(ck).length > 0 && CHARS[ck]);

// ---------------------------------------------------------------------------
// Une entrée de caisse, quelle que soit sa famille.
//
// La bande est un canvas : elle ne connaît ni tenues ni disques, seulement des
// cartons à dessiner. Chaque objet se ramène donc à la même fiche — un nom, une
// famille, une teinte, et de quoi le dessiner.
// ---------------------------------------------------------------------------
const NOM_FAMILLE = { tenue:'TENUE', disque:'DISQUE', dos:'DOS DE CARTES', banniere:'BANNIÈRE' };
const TEINTE_FAMILLE = { disque:'#3d7bff', dos:'#c0262f', banniere:'#22b383' };

const entreeTenue = (ck, s) => ({
  type:'tenue', id:`tenue:${ck}:${s.id}`, ck, sid:s.id, nom:s.nom,
  sous:(CHARS[ck] || {}).short || ck, teinte:(CHARS[ck] || {}).color || '#d4af37',
});
const entreeObjet = o => ({
  type:o.type, id:o.id, did:o.did || o.bid, nom:o.nom,
  sous:NOM_FAMILLE[o.type], teinte:TEINTE_FAMILLE[o.type] || '#d4af37',
});
// Ce qui se vend dans cette famille : ce qui se gagne au tutoriel ou qui est
// offert à tout le monde n'a rien à faire dans une caisse.
const objetsDe = type => catalogue().filter(o => o.type === type && o.source === 'direct').map(entreeObjet);

// De quoi dessiner une entrée : un sprite pour une tenue, un disque peint une
// fois, une image pour un dos ou une bannière (ce sont des SVG).
const disquesPeints = new Map();
function dessinDe(e) {
  if (e.type === 'tenue') return sprite(e.ck, e.sid);
  if (e.type === 'disque') {
    if (!disquesPeints.has(e.did)) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 96;
      try { drawSkinDisc(cv.getContext('2d'), 48, 48, 44, e.did, 0); } catch (err) { }
      disquesPeints.set(e.did, cv);
    }
    return disquesPeints.get(e.did);
  }
  const img = imageDe(e.type, e.did);
  return img && img.complete && img.naturalWidth ? img : null;
}
// Les images des dos et bannières se décodent : on les demande avant que la
// bande parte, sinon les premières cartes défilent vides.
function prechauffer(entrees) {
  const attentes = [];
  for (const e of entrees) {
    if (e.type !== 'dos' && e.type !== 'banniere') continue;
    const img = imageDe(e.type, e.did);
    if (img && !img.complete) attentes.push(new Promise(ok => { img.onload = ok; img.onerror = ok; }));
  }
  return Promise.all(attentes);
}

// Ce qui peut tomber, et ce qui défile. Les deux diffèrent volontairement : la
// bande montre aussi ce qu'on possède déjà, sinon une famille à laquelle il ne
// reste qu'un objet ferait défiler soixante fois la même carte.
const bassinDeFamille = type => objetsDe(type).filter(e => !possede(e.id));
function bassinGagnant() {
  if (C.mode === 'perso') return nonPris(skinsDe(C.perso)).map(e => entreeTenue(e.ck, e.skin));
  if (C.mode === 'alea') return nonPris(tousLesSkins()).map(e => entreeTenue(e.ck, e.skin));
  return bassinDeFamille(C.mode);
}
function bassinVisuel() {
  if (C.mode === 'perso') return skinsDe(C.perso).map(e => entreeTenue(e.ck, e.skin));
  if (C.mode === 'alea') return tousLesSkins().map(e => entreeTenue(e.ck, e.skin));
  return objetsDe(C.mode);
}

// Le prix d'une caisse se lit contre celui de la boutique : cent pièces pour un
// chroma, deux cents pour une tenue complète. Une caisse doit revenir moins
// cher que l'achat direct — c'est ce qu'on paie en renonçant à choisir.
//
// La caisse ciblée a DEUX prix, et ce n'est pas un raffinement gratuit. À prix
// unique, elle devenait un piège chez Yoshi, Hollis et Flowser, qui n'ont que
// des chromas : on aurait payé cent soixante pièces pour recevoir à coup sûr
// quelque chose qui s'achète cent. Le prix suit donc ce qu'il reste vraiment à
// gagner chez ce personnage.
// Les trois autres familles ont chacune leur caisse. Même règle : moins cher
// que la boutique, où l'on choisit. Un disque vaut 50, un dos et une bannière
// de 100 à 250.
const PRIX = { alea: 90, perso: 160, persoChroma: 80, disque: 25, dos: 130, banniere: 150 };

// Ce que coûte une caisse ciblée sur `ck` : le tarif plein tant qu'une tenue
// complète peut encore en sortir, le tarif chroma quand il n'en reste plus.
const prixCiblee = ck =>
  nonPris(skinsDe(ck)).some(e => !e.skin.chroma) ? PRIX.perso : PRIX.persoChroma;

const prixCaisse = () => C.mode === 'perso' ? prixCiblee(C.perso) : (PRIX[C.mode] ?? PRIX.alea);

const sprite = (ck, id) => {
  const c = CHARS[ck];
  if (!c) return null;
  return (c.skins && c.skins[id] && c.skins[id].idle) || c.frames.idle;
};

// --- État -------------------------------------------------------------------
// La poussière qui tourne autour de la tenue révélée, tant qu'elle est à
// l'écran.
let halo = null;

const C = {
  solde: 0,
  mode: null,        // 'alea' | 'perso'
  perso: null,       // clé du personnage, en mode ciblé
  bande: [],         // les tenues qui défilent
  gagne: null,
  ouvre: false,
  anim: null,
  sauter: false
};

// ---------------------------------------------------------------------------
// Navigation entre les quatre écrans
// ---------------------------------------------------------------------------
function montrer(etape) {
  for (const e of document.querySelectorAll('#scr-caisses .coEtape'))
    e.classList.toggle('hidden', !e.classList.contains(etape));
}

function majSolde() {
  const el = $('coSoldeVal');
  if (el) el.textContent = C.solde;
}

// ---------------------------------------------------------------------------
// La confirmation
//
// Une caisse se paie avant de savoir ce qu'elle contient : c'est le seul geste
// du casino qui vide le compte sans rien montrer d'abord, et il mérite qu'on
// le confirme.
// ---------------------------------------------------------------------------
let confirmer = null;
function demander(texte, suite) {
  $('coConfirmeTexte').textContent = texte;
  $('coConfirme').classList.remove('hidden');
  confirmer = suite;
}
function fermerConfirme() {
  $('coConfirme').classList.add('hidden');
  confirmer = null;
}

// ---------------------------------------------------------------------------
// La grille des personnages
// ---------------------------------------------------------------------------
function construireGrille() {
  const g = $('coPersos');
  if (!g || g.children.length) return;
  for (const ck of persosOuvrables()) {
    const p = CHARS[ck];
    const d = document.createElement('button');
    d.className = 'coPerso';
    d.style.setProperty('--teinte', p.color);
    const cv = document.createElement('canvas');
    const src = p.frames.idle;
    cv.width = src.width; cv.height = src.height;
    cv.getContext('2d').drawImage(src, 0, 0);
    d.appendChild(cv);
    const n = document.createElement('b');
    // Le nombre de tenues encore à prendre : sans lui, on paie sans savoir s'il
    // reste quoi que ce soit à gagner chez ce personnage.
    const restant = nonPris(skinsDe(ck)).length;
    // Le prix figure sur la vignette : il change d'un personnage à l'autre, et
    // le découvrir seulement dans la confirmation serait une surprise.
    n.innerHTML = `${p.short}<em>${restant ? restant + ' à prendre · ' + prixCiblee(ck) : 'tout est pris'}</em>`;
    d.appendChild(n);
    // Épuisé : on l'affiche quand même, éteint. Le retirer de la grille ferait
    // disparaître un personnage sans qu'on comprenne pourquoi.
    if (!restant) { d.classList.add('epuise'); d.disabled = true; }
    d.addEventListener('click', () => {
      sfx('select');
      demander(`Ouvrir une caisse pour ${p.short} à ${prixCiblee(ck)} pièces ?`, () => {
        C.mode = 'perso'; C.perso = ck;
        lancerOuverture();
      });
    });
    g.appendChild(d);
  }
}

// ---------------------------------------------------------------------------
// La bande
// ---------------------------------------------------------------------------
const LARGEUR = 132, ECART = 12, PAS = LARGEUR + ECART;
const INDEX_GAGNANT = 52;      // sur soixante : il en reste huit à droite
const NB_CARTES = 60;

function tirer() {
  const bassin = bassinGagnant();
  return bassin[(Math.random() * bassin.length) | 0];
}

function construireBande(gagne) {
  const bassin = bassinVisuel();
  const b = [];
  for (let i = 0; i < NB_CARTES; i++) b.push(bassin[(Math.random() * bassin.length) | 0]);
  b[INDEX_GAGNANT] = gagne;
  return b;
}

let ctx = null, larg = 0, haut = 0;
function calibrer() {
  const cv = $('coBande');
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  larg = cv.clientWidth; haut = cv.clientHeight;
  cv.width = larg * dpr | 0; cv.height = haut * dpr | 0;
  ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function dessinerBande(decalage, eclat) {
  if (!ctx) return;
  ctx.clearRect(0, 0, larg, haut);
  const cy = haut / 2, h = Math.min(haut * .82, 168), w = h * .78;
  const centre = larg / 2;

  // On ne dessine que ce qui traverse l'écran : à soixante cartes et un sprite
  // chacune, tout redessiner à chaque image coûterait dix fois plus pour rien.
  const premier = Math.max(0, Math.floor((decalage - centre) / PAS) - 1);
  const dernier = Math.min(C.bande.length - 1, Math.ceil((decalage + centre) / PAS) + 1);

  for (let i = premier; i <= dernier; i++) {
    const e = C.bande[i];
    if (!e) continue;
    const x = centre + i * PAS - decalage;
    const gagnante = eclat && i === INDEX_GAGNANT;

    ctx.save();
    ctx.translate(x, cy);
    if (gagnante) { ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = 40; }

    // Le carton : fond sombre, liseré d'or, et un trait de la couleur du
    // personnage en bas. C'est ce trait qu'on lit en défilant, pas le nom.
    ctx.fillStyle = gagnante ? '#2a1c08' : '#12060f';
    ctx.strokeStyle = gagnante ? '#fff3c2' : 'rgba(212,175,55,.6)';
    ctx.lineWidth = gagnante ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;

    // Une bannière est large et basse : elle se dessine à plat, sans quoi elle
    // rétrécirait au point de ne plus rien montrer.
    const src = dessinDe(e);
    if (src) {
      const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
      const boite = e.type === 'banniere' ? { l:w * .9, h:h * .3 } : { l:w * .7, h:h * .56 };
      const ech = Math.min(boite.l / sw, boite.h / sh);
      const yHaut = e.type === 'banniere' ? -h * .16 : -h * .38;
      ctx.imageSmoothingEnabled = e.type !== 'tenue';
      ctx.drawImage(src, -sw * ech / 2, yHaut, sw * ech, sh * ech);
      ctx.imageSmoothingEnabled = false;
    }

    ctx.fillStyle = '#f6e27a';
    ctx.font = `700 ${Math.round(h * .085)}px 'Russo One', sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(e.sous, 0, h * .30);
    ctx.fillStyle = 'rgba(253,246,224,.75)';
    ctx.font = `${Math.round(h * .068)}px 'DotGothic16', monospace`;
    ctx.fillText(e.nom.slice(0, 16), 0, h * .385);

    ctx.fillStyle = e.teinte;
    ctx.fillRect(-w / 2 + 6, h / 2 - 9, w - 12, 5);
    ctx.restore();
  }
}

const easeOut = t => 1 - Math.pow(1 - t, 4);

function lancerOuverture() {
  fermerConfirme();
  const prix = prixCaisse();
  if (prix > C.solde) { sfx('deny'); messageCo('Pas assez de pièces.'); return; }

  // Le tirage se fait AVANT le débit. Une caisse qui n'a plus rien à donner ne
  // doit pas d'abord prendre les pièces pour l'annoncer ensuite.
  C.gagne = tirer();
  if (!C.gagne) {
    sfx('deny');
    messageCo(C.mode === 'perso' ? 'Tu as déjà toutes ses tenues.'
      : C.mode === 'alea' ? 'Tu as déjà toutes les tenues du jeu.'
      : 'Tu as déjà tout ce que cette caisse contient.');
    return;
  }
  C.bande = construireBande(C.gagne);
  C.ouvre = true;
  C.sauter = false;
  cranSansEclat = 0;
  montrer('ouverture');

  // La caisse s'ouvre avant que la bande parte : un éclair, de la fumée
  // violette, une secousse. Sans ce battement, on clique sur OUI et la bande
  // défile déjà — on n'a rien ouvert du tout, on a juste changé d'écran.
  const ecran = $('scr-caisses');
  if (ecran) {
    sfx('ctPoof');
    flash(ecran, 'or', 200);
    secousse(ecran, 4, 300);
    const centre = { x: ecran.clientWidth * .35, y: ecran.clientHeight * .35,
                     l: ecran.clientWidth * .3, h: ecran.clientHeight * .3 };
    emettre(ecran, 'fumee', centre, 26, '#3a1050');
    emettre(ecran, 'trainee', centre, 30, '#f6e27a');
  }

  requestAnimationFrame(() => {
    calibrer();
    // La bande démarre APRÈS l'ouverture, pas pendant : les deux ensemble et
    // l'un mange l'autre. Les dos et bannières, eux, se décodent d'abord — une
    // image qui arrive en cours de route ferait défiler des cartes vides.
    Promise.race([prechauffer(C.bande), new Promise(ok => setTimeout(ok, 900))])
      .then(() => setTimeout(() => { if (C.ouvre) animer(prix); }, 420));
  });
}

function animer(prix) {
  const DUREE = 3500;
  const debut = performance.now();
  // La bande s'arrête quand la carte gagnante est centrée. Un petit dépassement
  // sur les dix derniers pour cent, puis retour : arrivée pile au but, elle se
  // fige au lieu de se poser.
  const fin = INDEX_GAGNANT * PAS;
  const depart = -larg * .6;
  let dernierIndex = -1;

  const pas = maintenant => {
    const brut = Math.min(1, (maintenant - debut) / DUREE);
    const t = C.sauter ? 1 : brut;
    const e = easeOut(t);
    let d = depart + (fin - depart) * e;
    if (t > .9 && t < 1) d += Math.sin((t - .9) / .1 * Math.PI) * 26;

    // Un cran à chaque carte qui franchit la ligne. C'est ce cliquetis qui fait
    // le ralentissement : sans lui, la bande ralentit sans qu'on l'entende.
    const idx = Math.round(d / PAS);
    if (idx !== dernierIndex) {
      dernierIndex = idx;
      if (t < 1) { sfx('coCran'); pulserLigne(); }
    }

    dessinerBande(d, t >= 1);
    if (t < 1) C.anim = requestAnimationFrame(pas);
    else { C.anim = null; C.sauter = false; conclure(prix); }
  };
  C.anim = requestAnimationFrame(pas);
}

let cranSansEclat = 0;
function pulserLigne() {
  const l = $('coLigne');
  if (!l) return;
  l.classList.remove('cran');
  void l.offsetWidth;
  l.classList.add('cran');
  // Des éclats d'or à la ligne, mais pas à chaque cran : au début la bande
  // défile si vite qu'on en cracherait quarante par seconde, et il n'en
  // resterait qu'un brouillard. Un cran sur trois, et tous à la fin — quand ils
  // deviennent rares, ils redeviennent lisibles.
  if (cranSansEclat++ % 3) return;
  const ecran = $('scr-caisses');
  if (ecran) emettre(ecran, 'trainee', boiteDe(ecran, l), 3, '#f6e27a');
}

// ---------------------------------------------------------------------------
// Le résultat
// ---------------------------------------------------------------------------
// Donne l'objet gagné. Une tenue passe par son registre (skins-perso.js), qui la
// synchronise depuis toujours ; les autres par l'inventaire.
function donner(e) {
  if (e.type === 'tenue') offrirSkin(e.ck, e.sid);
  else offrir(e.id);
}

function conclure(prix) {
  const ecran = $('scr-caisses');
  const gagne = C.gagne;

  sfx('coGain');
  flash(ecran, 'or', 160);
  secousse(ecran, 5, 340);
  emettre(ecran, 'confetti', { x: 0, y: -30, l: ecran.clientWidth, h: 20 }, 34);

  // On débite d'abord : c'est le serveur qui décide si le solde suffit, jamais
  // le navigateur. La tenue n'est offerte qu'une fois le débit accepté — sinon
  // une coupure réseau au mauvais moment la donnerait gratuitement.
  C.solde = Math.max(0, C.solde - prix);
  majSolde();
  if (connecte()) {
    ajouterPieces(-prix).then(s => {
      if (s !== null && s !== undefined) { C.solde = s; majSolde(); }
      donner(gagne);
    }).catch(() => messageCo('Le débit n\'est pas passé : l\'objet reste à prendre.'));
  } else donner(gagne);

  setTimeout(reveler, 620);
}

function reveler() {
  const e = C.gagne;
  montrer('revele');
  C.ouvre = false;

  const carte = $('coCarte');
  carte.style.setProperty('--teinte', e.teinte);
  carte.dataset.famille = e.type;
  const cv = carte.querySelector('canvas');
  const src = dessinDe(e);
  const g = cv.getContext('2d');
  if (src) {
    // Un sprite garde ses pixels nets ; un disque, un dos ou une bannière sont
    // des dessins lisses qu'on redimensionne. Les images se peignent à leur
    // taille naturelle, agrandie : le canvas suit les proportions de l'objet.
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const k = e.type === 'tenue' ? 1 : (e.type === 'banniere' ? 3 : 2);
    cv.width = sw * k; cv.height = sh * k;
    g.imageSmoothingEnabled = e.type !== 'tenue';
    g.drawImage(src, 0, 0, cv.width, cv.height);
  } else { cv.width = 8; cv.height = 8; }
  // Pour une tenue, le nom du perso en gros et celui de la tenue dessous ; pour
  // le reste, le nom de l'objet en gros et sa famille dessous.
  carte.querySelector('.coNom').textContent = e.type === 'tenue' ? e.sous : e.nom;
  carte.querySelector('.coSkin').textContent = e.type === 'tenue' ? e.nom : e.sous;
  // Toujours neuf : le tirage exclut ce qu'on possède déjà.
  carte.querySelector('.coEtat').textContent = e.type === 'tenue' ? 'NOUVELLE TENUE' : 'NOUVEL OBJET';

  const ecran = $('scr-caisses');
  emettre(ecran, 'confetti', boiteDe(ecran, carte), 26);
  setTimeout(() => emettre(ecran, 'confetti', boiteDe(ecran, carte), 18), 260);

  // La tenue flotte ensuite dans une poussière d'or et de violet, quelques
  // secondes. Un jet unique retombe et la carte se retrouve seule au milieu
  // d'un écran vide juste au moment où l'on veut la regarder.
  clearInterval(halo);
  let restant = 14;
  halo = setInterval(() => {
    if (--restant < 0 || !ecran.isConnected || carte.offsetParent === null) { clearInterval(halo); return; }
    const b = boiteDe(ecran, carte);
    emettre(ecran, 'trainee', { x: b.x - 14, y: b.y - 14, l: b.l + 28, h: b.h + 28 }, 2,
            restant % 2 ? '#f6e27a' : '#c99cf0');
  }, 180);
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
let effaceMsg = null;
function messageCo(texte) {
  const el = $('coMsg');
  if (!el) return;
  el.textContent = texte;
  el.classList.remove('hidden');
  clearTimeout(effaceMsg);
  effaceMsg = setTimeout(() => el.classList.add('hidden'), 2800);
}

// ---------------------------------------------------------------------------
// Ouverture
// ---------------------------------------------------------------------------
export function ouvrirCaisses() {
  if (!connecte()) { messageCasino('Connecte-toi : les pièces vivent sur ton compte.'); return false; }
  C.solde = (Compte.profil && Compte.profil.pieces) || 0;
  // La caisse la moins chère fixe le seuil : inutile de refuser l'entrée à qui
  // a de quoi s'offrir un disque.
  const seuil = Math.min(PRIX.alea, PRIX.persoChroma, PRIX.disque, PRIX.dos, PRIX.banniere);
  if (C.solde < seuil) {
    messageCasino(`Il te faut au moins ${seuil} pièces pour une caisse.`);
    return false;
  }
  C.mode = null; C.perso = null; C.ouvre = false;
  fermerConfirme();
  majSolde();
  montrer('choix');
  showScreen('caisses');
  return true;
}

// ---------------------------------------------------------------------------
// Câblage
// ---------------------------------------------------------------------------
(function cabler() {
  if (!$('coAlea')) return;

  const zone = $('coSceaux');
  if (zone) for (const [classe, branches, runes] of [['a', 5, 8], ['b', 7, 7], ['c', 5, 12]]) {
    const d = document.createElement('div');
    d.className = 'casSceau ' + classe;
    d.innerHTML = sceau(50, branches, runes);
    zone.appendChild(d);
  }

  $('coAlea').addEventListener('click', () => {
    sfx('select');
    demander(`Confirmer l'ouverture pour ${PRIX.alea} pièces ?`, () => {
      C.mode = 'alea'; C.perso = null;
      lancerOuverture();
    });
  });
  $('coCiblee').addEventListener('click', () => {
    sfx('select');
    construireGrille();
    montrer('persos');
  });
  // Les trois caisses de disques, dos et bannières. Rien à choisir de plus : on
  // confirme le prix et la bande part.
  for (const b of document.querySelectorAll('#scr-caisses .coCaisse[data-caisse]')) {
    b.addEventListener('click', () => {
      const famille = b.dataset.caisse, nom = b.querySelector('b').textContent.toLowerCase();
      sfx('select');
      if (!bassinDeFamille(famille).length) { sfx('deny'); messageCo(`Tu as déjà tout : ${nom}.`); return; }
      demander(`Ouvrir une caisse de ${nom} pour ${PRIX[famille]} pièces ?`, () => {
        C.mode = famille; C.perso = null;
        lancerOuverture();
      });
    });
  }

  $('coOui').addEventListener('click', () => { const s = confirmer; fermerConfirme(); if (s) s(); });
  for (const id of ['coNon', 'coConfirme'])
    $(id).addEventListener('click', ev => { if (ev.target === $(id)) { sfx('select'); fermerConfirme(); } });
  $('coNon').addEventListener('click', () => { sfx('select'); fermerConfirme(); });

  $('coRetourChoix').addEventListener('click', () => { sfx('select'); montrer('choix'); });
  $('coSkip').addEventListener('click', () => { if (C.anim) C.sauter = true; });
  $('coEncore').addEventListener('click', () => {
    sfx('select');
    if (prixCaisse() > C.solde) { messageCo('Pas assez de pièces.'); return; }
    // Une famille qu'on vient de vider ne donne plus rien : on le dit ici,
    // plutôt que de laisser lancerOuverture() refuser après le clic.
    if (!bassinGagnant().length) { sfx('deny'); messageCo('Tu as déjà tout ce que cette caisse contient.'); return; }
    lancerOuverture();
  });
  $('coRetour').addEventListener('click', () => {
    sfx('select');
    // La grille se refait : les compteurs « à prendre » viennent de changer.
    $('coPersos').innerHTML = '';
    montrer('choix');
  });

  // Espace coupe l'animation, comme partout ailleurs dans le casino.
  window.addEventListener('keydown', ev => {
    if (ev.code !== 'Space') return;
    if ($('scr-caisses').classList.contains('hidden')) return;
    ev.preventDefault();
    if (C.anim) C.sauter = true;
  }, true);

  window.addEventListener('resize', () => {
    if ($('scr-caisses').classList.contains('hidden') || !C.ouvre) return;
    calibrer();
  });
})();
