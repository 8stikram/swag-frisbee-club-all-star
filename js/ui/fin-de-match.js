import { $, showScreen, curScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { getKey } from '../data/keymap.js';
import { Partie, annoncerChoixFin, quandChoixFinAdversaire } from '../reseau/partie.js';
import { Compte, connecte } from '../reseau/compte.js';

// ---------------------------------------------------------------------------
// Écran de fin de match, en trois phases : le résultat, les stats des deux
// joueurs, puis les boutons seuls. Tout ce qui s'y voit a été réglé dans les
// mockups (voir css/fin-de-match.css) ; ce fichier ne fait que le dérouler.
//
// Le déroulé avance tout seul, avec les durées validées dans les mockups, et
// ESPACE ou un clic le fait avancer tout de suite.
//
// Il ne connaît pas le jeu : gameOver() lui passe les deux joueurs. Et il ne
// lance aucune action lui-même — REVANCHE, MENU et CHANGEZ DE PERSO remontent
// à menus.js par quandChoixFinal(). L'importer d'ici fermerait un cycle, et un
// cycle d'import a déjà cassé la production une fois.
// ---------------------------------------------------------------------------

const scene = $('scr-over');

// Durées validées (mockups/fin-de-match-*.reglages.json), en millisecondes.
const D = {
  entreeResultat: 650,   // flash et arrivée du résultat
  attenteResultat: 1600, // le résultat reste affiché, puis part vers les stats
  vol: 1000, volTexte: 900, decalAdversaire: 120, revelCentre: 380,
  entree: 750, decalage: 90, compte: 1300,
  lecture: 3500,         // les stats restent lisibles, puis laissent la place aux boutons
  sortie: 700,
  voteSuspense: 900, voteVerdict: 1400, voteAccord: 900, voteAnnonce: 1400
};
const PIECES = { victoire: 10, defaite: 5 };

/* ================= SPRITES AU PIXEL PRÈS =================
   Les canvas gardent la résolution des sprites (16×20) et le navigateur les
   agrandit. Pour que chaque pixel ait exactement la même taille à l'écran,
   l'agrandissement doit être ENTIER en pixels physiques — échelles des parents
   et densité d'écran comprises : ajusterPixels() arrondit chaque sprite au
   multiple entier le plus proche de la taille voulue. */
// hauteur voulue (cqh) : lignes : colonnes
const PIXELS = { finHero: '84:20:16', finCarteSprite: '16.25:20:16', finSpriteJoueur: '13:20:16', finSpriteAdversaire: '13:20:16' };

function dessine(canvas, source) {
  canvas.width = 16; canvas.height = 20;
  const g = canvas.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 16, 20);
  if (source) g.drawImage(source, 0, 0);
}
function echelleCumulee(el) {
  let s = 1;
  for (let n = el; n && n !== scene; n = n.parentElement) {
    const v = parseFloat(getComputedStyle(n).scale);
    if (!isNaN(v)) s *= v;
  }
  return s;
}
function ajusterPixels() {
  if (scene.classList.contains('hidden')) return;
  const dpr = window.devicePixelRatio || 1, cqh = scene.clientHeight / 100;
  const cibles = [...Object.entries(PIXELS).map(([id, def]) => [$(id), def]),
    ...[...scene.querySelectorAll('canvas[data-pixel]')].map(c => [c, c.dataset.pixel])];
  for (const [el, def] of cibles) {
    if (!el) continue;
    const [hCqh, lignes, colonnes] = def.split(':').map(Number);
    const A = echelleCumulee(el);
    const n = Math.max(1, Math.round(hCqh * cqh * A * dpr / lignes));
    el.style.height = (n * lignes / (A * dpr)) + 'px';
    el.style.width = (n * colonnes / (A * dpr)) + 'px';
  }
}
new ResizeObserver(() => ajusterPixels()).observe(scene);

// Icône du CPU : un petit robot gris, dessiné au pixel.
const ROBOT = {
  rows: ['.....RR.....', '.....KK.....', '..KKKKKKKK..', '..KGGGGGGK..', '..KGCGGCGK..', '..KGCGGCGK..',
         '..KGGGGGGK..', '..KGDDDDGK..', '..KGGGGGGK..', '..KKKKKKKK..', '...KGGGGK...', '..KKKKKKKK..'],
  pal: { K: '#2b2f36', G: '#b9bfc9', C: '#35e0ff', D: '#4a505b', R: '#e5384f' }
};
function robotCanvas() {
  const c = document.createElement('canvas');
  c.width = 12; c.height = 12; c.dataset.pixel = '6.5:12:12';
  const g = c.getContext('2d');
  ROBOT.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { g.fillStyle = ROBOT.pal[ch]; g.fillRect(x, y, 1, 1); } }));
  return c;
}

/* ================= STATS ================= */
const svg = inner => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const ICONES = {
  trophee: svg('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.6 3.6M16 6h2.5a2.5 2.5 0 0 1-2.6 3.6"/><path d="M12 13v3.5M8.5 20h7M10 16.5h4"/>'),
  chrono:  svg('<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V10M10 2.5h4M18.4 7.1l1.4-1.4"/>'),
  disque:  svg('<ellipse cx="12" cy="11" rx="9" ry="3.6"/><path d="M3 11v1.6c0 2 4 3.6 9 3.6s9-1.6 9-3.6V11"/>'),
  eclair:  svg('<path d="M13 2.5L5.5 13.5h5.5l-1 8 7.5-11h-5.5z"/>'),
  echange: svg('<path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/>'),
  croix:   svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  sablier: svg('<path d="M6.5 3h11M6.5 21h11"/><path d="M8 3v2.5c0 2.8 4 4.2 4 6.5s-4 3.7-4 6.5V21M16 3v2.5c0 2.8-4 4.2-4 6.5s4 3.7 4 6.5V21"/>'),
  cible:   svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
};
// mieux : -1 quand c'est la plus petite valeur qui est la meilleure
const STATS = [
  { id: 'score',      label: 'Score final',       icone: 'trophee', mieux: 1 },
  { id: 'attrapes',   label: 'Attrapes réussies', icone: 'disque',  mieux: 1 },
  { id: 'speciaux',   label: 'Spéciaux utilisés', icone: 'eclair',  mieux: 1 },
  { id: 'fautes',     label: 'Fautes',            icone: 'croix',   mieux: -1 },
  { id: 'possession', label: 'Possession',        icone: 'sablier', mieux: 1, temps: true },
  { id: 'precision',  label: 'Précision',         icone: 'cible',   mieux: 1, pourcent: true },
];
const COMMUNES = [
  { id: 'duree',   label: 'DURÉE',       icone: 'chrono', temps: true },
  { id: 'echange', label: 'ÉCHANGE MAX', icone: 'echange' },
];
const fmtTemps = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const fmt = (st, v) => st.temps ? fmtTemps(v) : st.pourcent ? Math.round(v) + '%' : st.pieces ? '+' + Math.round(v) : String(Math.round(v));

// Ce que le match a compté pour un joueur. La précision rapporte les buts aux
// tirs : sur tous les disques lancés, combien ont fini au fond.
function statsDe(p) {
  const s = p.stats || {};
  return {
    score: p.score | 0, attrapes: s.catches | 0, speciaux: s.specials | 0, fautes: s.fautes | 0,
    possession: s.possession || 0,
    precision: s.thrown ? 100 * (s.buts | 0) / s.thrown : 0
  };
}

(function construireLignes() {
  for (const hote of [$('finStatsJoueur'), $('finStatsAdversaire')]) {
    STATS.forEach((st, i) => {
      const l = document.createElement('div');
      l.className = 'pLigne'; l.dataset.stat = st.id; l.style.setProperty('--i', i);
      l.innerHTML = `<span class="pIcone">${ICONES[st.icone]}</span><span class="pLabel">${st.label}</span>`
        + `<span class="pValeur"><span class="pMieux" title="meilleure valeur">▲</span><span class="pValeurTxt"></span></span>`
        + `<span class="pBarre"><i></i></span>`;
      hote.appendChild(l);
    });
    const p = document.createElement('div');
    p.className = 'pLigne pPieces'; p.dataset.stat = 'pieces'; p.style.setProperty('--i', STATS.length);
    p.innerHTML = `<span class="pIcone"><span class="pieceMini"></span></span><span class="pLabel">Pièces gagnées</span>`
      + `<span class="pValeur"><span class="pValeurTxt"></span></span><span class="pBarre"><i></i></span>`;
    hote.appendChild(p);
  }
  for (const st of COMMUNES) {
    const c = document.createElement('div');
    c.className = 'cStat'; c.dataset.stat = st.id;
    c.innerHTML = `<span class="cIcone">${ICONES[st.icone]}</span><span class="cValeur"></span><span class="cLabel">${st.label}</span>`;
    $('finStatsCommunes').appendChild(c);
  }
})();

/* ================= LE MATCH QUI VIENT DE FINIR ================= */
let M = null;   // { mode, victoire, heros, adversaire, stats, identites, pieces, duree, echangeMax }

// Qui est qui, et comment le montrer. Un joueur avec un compte porte les
// couleurs, la photo et la bannière de son profil ; le CPU, le J2 local et le
// joueur sans compte sont en gris métal.
function identites(d) {
  const profilLocal = connecte() ? Compte.profil : null;
  const local = p => profilLocal
    ? { style: 'profil', pseudo: profilLocal.pseudo || 'P1', avatar: profilLocal.avatar, banniere: profilLocal.banniere,
        couleur1: profilLocal.couleur1, couleur2: profilLocal.couleur2 }
    : { style: 'metal', pseudo: p.side === 1 ? 'P1' : 'P2', initiales: p.side === 1 ? 'P1' : 'P2' };
  if (d.mode === 'enligne') {
    const a = Partie.adversaire || {};
    return {
      heros: { ...local(d.heros), role: d.heros.side === 1 ? 'JOUEUR 1' : 'JOUEUR 2', badge: d.heros.side === 1 ? 'P1' : 'P2' },
      adversaire: { style: 'profil', role: 'ADVERSAIRE', pseudo: a.pseudo || 'ADVERSAIRE', avatar: a.avatar, banniere: a.banniere,
        couleur1: a.couleur1 || '#ff5f6d', couleur2: a.couleur2 || '#ffc371' }
    };
  }
  if (d.mode === 'j2j') {
    // Le vainqueur tient le premier rôle ; chacun garde son étiquette de camp.
    const qui = p => p.side === 1
      ? { ...local(p), role: 'JOUEUR 1', badge: 'P1' }
      : { style: 'metal', role: 'JOUEUR 2', pseudo: 'J2', initiales: 'J2', badge: 'J2' };
    return { heros: qui(d.heros), adversaire: qui(d.adversaire) };
  }
  return {
    heros: { ...local(d.heros), role: 'JOUEUR 1', badge: 'P1' },
    adversaire: { style: 'metal', role: 'ORDINATEUR', pseudo: 'CPU', robot: true }
  };
}

// Les pièces que chacun vient de gagner, ou null s'il n'en gagne pas : le CPU,
// le JcJ local et un joueur sans compte n'en rapportent jamais.
function piecesDe(d) {
  const gain = gagne => gagne ? PIECES.victoire : PIECES.defaite;
  if (d.mode === 'j2j') return { heros: null, adversaire: null };
  return {
    heros: connecte() ? gain(d.victoire) : null,
    adversaire: d.mode === 'enligne' && Partie.adversaire && Partie.adversaire.id ? gain(!d.victoire) : null
  };
}

function poserAvatar(hote, id) {
  hote.innerHTML = '';
  if (id.robot) { hote.appendChild(robotCanvas()); return; }
  if (id.avatar) { const im = new Image(); im.src = id.avatar; im.alt = ''; hote.appendChild(im); return; }
  hote.textContent = id.initiales || (id.pseudo || '?')[0].toUpperCase();
}

function remplirPanneau(cote, joueur, id, gagnant) {
  const suffixe = cote === 'g' ? 'Joueur' : 'Adversaire';
  const pan = $('finPan' + suffixe);
  pan.classList.toggle('metal', id.style === 'metal');
  pan.classList.toggle('gagnant', gagnant);
  pan.classList.toggle('perdant', !gagnant);
  if (id.style === 'profil') {
    pan.style.setProperty('--p1', id.couleur1 || '#35e0ff');
    pan.style.setProperty('--p2', id.couleur2 || '#7b2ff7');
  }
  const ban = id.style === 'profil' && id.banniere ? `url("${id.banniere}")` : 'none';
  $('finBan' + suffixe).style.backgroundImage = ban;
  $('finBanFond' + suffixe).style.backgroundImage = ban;
  poserAvatar($('finAv' + suffixe), id);
  $('finRole' + suffixe).textContent = id.role;
  $('finPseudo' + suffixe).textContent = id.pseudo;
  dessine($('finSprite' + suffixe), joueur.frames.idle);
  $('finIssue' + suffixe).textContent = gagnant ? 'VICTOIRE' : 'DÉFAITE';
}

function remplirStats() {
  const j = M.stats.heros, a = M.stats.adversaire;
  for (const st of STATS) {
    const vj = j[st.id], va = a[st.id], max = Math.max(vj, va) || 1;
    for (const [hote, v, autre] of [[$('finStatsJoueur'), vj, va], [$('finStatsAdversaire'), va, vj]]) {
      const l = hote.querySelector(`[data-stat="${st.id}"]`);
      l.querySelector('.pValeurTxt').textContent = fmt(st, v);
      l.querySelector('.pBarre i').style.setProperty('--r', (v / max).toFixed(3));
      l.classList.toggle('meilleur', Math.round(v) !== Math.round(autre) && (st.mieux > 0 ? v > autre : v < autre));
    }
  }
  const maxPieces = Math.max(M.pieces.heros ?? 0, M.pieces.adversaire ?? 0) || 1;
  for (const [hote, n] of [[$('finStatsJoueur'), M.pieces.heros], [$('finStatsAdversaire'), M.pieces.adversaire]]) {
    const l = hote.querySelector('[data-stat="pieces"]');
    l.classList.toggle('sansPieces', n === null);
    l.querySelector('.pValeurTxt').textContent = n === null ? '—' : '+' + n;
    l.querySelector('.pBarre i').style.setProperty('--r', ((n ?? 0) / maxPieces).toFixed(3));
  }
  const communes = { duree: M.duree, echange: M.echangeMax };
  for (const st of COMMUNES) $('finStatsCommunes').querySelector(`[data-stat="${st.id}"] .cValeur`).textContent = fmt(st, communes[st.id]);
}

/* ================= EFFETS ================= */
const COUL = ['#ffd23e', '#5df08a', '#2f6bff', '#e5384f', '#ffffff', '#ff8c1a'];
function confettis() {
  const h = $('finConfettis');
  h.innerHTML = '';
  for (let i = 0; i < 40; i++) {
    const c = document.createElement('div'); c.className = 'conf';
    c.style.left = Math.random() * 100 + '%';
    c.style.background = COUL[i % COUL.length];
    c.style.animationDuration = (1.6 + Math.random() * 1.6) + 's';
    c.style.animationDelay = (Math.random() * -2) + 's';
    h.appendChild(c);
  }
}
(function fumee() {
  const h = $('finFumee');
  for (let i = 0; i < 10; i++) {
    const b = document.createElement('div'); b.className = 'fumeeBulle';
    const s = 18 + Math.random() * 38;
    b.style.width = s + 'px'; b.style.height = s + 'px'; b.style.left = Math.random() * 100 + '%';
    b.style.animationDuration = (4 + Math.random() * 3) + 's';
    b.style.animationDelay = (Math.random() * -5) + 's';
    h.appendChild(b);
  }
})();
(function etincelles() {
  const h = $('finEtincelles');
  for (let i = 0; i < 16; i++) {
    const e = document.createElement('div'); e.className = 'etoile';
    e.style.left = (40 + Math.random() * 55) + '%'; e.style.top = Math.random() * 100 + '%';
    e.style.animationDelay = (Math.random() * -1.4) + 's';
    h.appendChild(e);
  }
})();

// Un nom trop long passerait sous le perso : on réduit la police jusqu'à ce
// qu'il tienne dans l'espace à sa gauche.
function ajusterNom() {
  const nom = $('finNom');
  nom.style.fontSize = '';
  const place = scene.clientWidth * .55 / echelleCumulee(nom);
  if (nom.offsetWidth > place) nom.style.fontSize = (7 * place / nom.offsetWidth).toFixed(2) + 'cqh';
}

/* ================= DÉROULÉ ================= */
// resultat → transition → stats → sortie → boutons
let etape = 'ferme';
let minuteurs = [], animations = [];
const plus = (ms, fn) => minuteurs.push(setTimeout(fn, ms));
const anime = (el, images, options) => { const a = el.animate(images, options); animations.push(a); return a; };
const CLASSES_TRANSITION = ['voirP1', 'cacheP2', 'rev-g', 'rev-c', 'rev-d', 'cache-hero', 'sortieP2'];
const racinesStats = () => [$('finTitre'), $('finPanJoueur'), $('finCentre'), $('finPanAdversaire')];
const ZONES = { g: () => [$('finPanJoueur')], c: () => [$('finTitre'), $('finCentre')], d: () => [$('finPanAdversaire')] };

function finTransition() {
  minuteurs.forEach(clearTimeout); minuteurs = [];
  animations.forEach(a => a.cancel()); animations = [];
  scene.classList.remove(...CLASSES_TRANSITION);
  for (const p of [$('finPanJoueur'), $('finPanAdversaire')]) {
    p.classList.remove('atterrit'); p.style.animationDuration = ''; p.style.transformOrigin = '';
  }
}
function relancerAnim(el) { el.classList.remove('entree'); void el.offsetWidth; el.classList.add('entree'); }
function reveler(zone) { scene.classList.add('rev-' + zone); ZONES[zone]().forEach(relancerAnim); }

// Branché au premier écran de fin, pas au chargement : partie.js peut ne pas
// avoir fini de s'évaluer quand ce fichier-ci l'est (les deux vivent dans le
// même cercle d'imports que game/state.js).
let reseauBranche = false;

export function afficherFinDeMatch(d) {
  if (!reseauBranche) {
    reseauBranche = true;
    quandChoixFinAdversaire(choix => { if (curScreen === 'over') voter('lui', choix); });
  }
  finTransition();
  reinitVote();
  generation++;
  adversaireParti = false;
  selection = -1;
  const ids = identites(d);
  M = {
    mode: d.mode, victoire: d.victoire, heros: d.heros, adversaire: d.adversaire,
    identites: ids, pieces: piecesDe(d),
    stats: { heros: statsDe(d.heros), adversaire: statsDe(d.adversaire) },
    duree: d.duree || 0, echangeMax: d.echangeMax | 0
  };

  showScreen('over');
  scene.dataset.phase = '1';
  scene.dataset.entree = 'glisse';
  scene.classList.toggle('victoire', d.victoire);
  scene.classList.toggle('defaite', !d.victoire);
  scene.classList.remove('piecesVolent');

  // Phase 1
  dessine($('finHero'), d.heros.frames.idle);
  dessine($('finCarteSprite'), d.adversaire.frames.idle);
  $('finNom').textContent = (d.heros.char.short || '').toUpperCase();
  $('finIssueTexte').textContent = $('finIssueLueur').textContent = d.victoire ? 'VICTOIRE' : 'DÉFAITE';
  $('finBadge').textContent = ids.heros.badge;
  $('finPieces').textContent = M.pieces.heros === null ? '' : '+' + M.pieces.heros + ' 🪙';
  $('finPiecesVol').style.visibility = M.pieces.heros === null ? 'hidden' : '';
  $('finCarteRole').textContent = ids.adversaire.role;
  $('finCarteNom').textContent = ids.adversaire.pseudo;
  const tp = $('finAureoleTexte');
  tp.textContent = ((d.victoire ? 'VICTOIRE' : 'DÉFAITE') + ' • ').repeat(6);
  tp.setAttribute('textLength', (2 * Math.PI * 44).toFixed(2));   // cercle de rayon 44 : ni trou ni chevauchement
  tp.setAttribute('lengthAdjust', 'spacingAndGlyphs');
  if (d.victoire) confettis();

  // Phase 2, remplie d'avance et cachée
  remplirPanneau('g', d.heros, ids.heros, d.victoire);
  remplirPanneau('d', d.adversaire, ids.adversaire, !d.victoire);
  remplirStats();

  ajusterPixels();
  ajusterNom();
  etape = 'resultat';
  for (const el of [$('finNomPos'), $('finBadgePos'), $('finHeroBloc'), $('finCarte')]) relancerAnim(el);
  scene.classList.remove('entree', 'tremble'); void scene.offsetWidth; scene.classList.add('entree', 'tremble');
  plus(D.entreeResultat + D.attenteResultat, lancerTransition);
}

/* ---------- Phase 1 → phase 2 : l'aspiration ----------
   Le perso rétrécit et vole se ranger dans la case de son panneau. Au moment
   exact où son vol se termine (promesse `finished`, pas une minuterie), le
   vrai sprite apparaît à la même place et à la même taille — le relais ne se
   voit pas. Le nom rejoint le pseudo, VICTOIRE la pastille et « +10 » la ligne
   des pièces, en fondu enchaîné à la même taille de lettres. La carte adverse
   s'efface sur place : deux vols croisés au milieu faisaient brouillon. */

// Trajet d'un vol : `volant` porte l'animation (origine en haut à gauche) et
// `repere`, l'une de ses parties, doit arriver pile sur `cible` — même point
// d'alignement (ax : g/c/d, ay : h/c/b) et même taille, d'après les hauteurs
// ou d'après la taille de police pour un texte. L'inclinaison du repère est
// ignorée à la mesure : elle est retirée pendant le vol.
function trajet(volant, repere, cible, { police = false, ax = 'g', ay = 'h' } = {}) {
  const avant = repere.style.transform;
  repere.style.transform = 'none';
  const V = volant.getBoundingClientRect(), R = repere.getBoundingClientRect(), C = cible.getBoundingClientRect();
  repere.style.transform = avant;
  const s = echelleCumulee(volant);
  const taille = el => parseFloat(getComputedStyle(el).fontSize) * echelleCumulee(el);
  const e = police ? taille(cible) / taille(repere) : C.height / R.height;
  const point = r => [ax === 'g' ? r.left : ax === 'c' ? r.left + r.width / 2 : r.right,
                      ay === 'h' ? r.top : ay === 'c' ? r.top + r.height / 2 : r.bottom];
  const [rx, ry] = point(R), [cx, cy] = point(C);
  return { tx: (cx - V.left) / s - e * (rx - V.left) / s, ty: (cy - V.top) / s - e * (ry - V.top) / s, e, w: V.width / s, h: V.height / s };
}
const COURBE_VOL = 'cubic-bezier(.65,0,.35,1)';
function voler(volant, repere, cible, duree, delai, opts = {}) {
  const t = trajet(volant, repere, cible, opts);
  const fin = `translate(${t.tx}px,${t.ty}px) scale(${t.e})`;
  // élan : léger gonflement autour du centre avant de partir
  const images = opts.elan
    ? [{ transform: 'translate(0px,0px) scale(1)' }, { transform: `translate(${-t.w * .015}px,${-t.h * .015}px) scale(1.03)`, offset: .1 }, { transform: fin }]
    : [{ transform: 'translate(0px,0px) scale(1)' }, { transform: fin }];
  return anime(volant, images, { duration: duree, delay: delai, easing: COURBE_VOL, fill: 'forwards' });
}
// entre la révélation d'un panneau et la fin de son dernier compteur
const msStats = () => D.entree + STATS.length * D.decalage + 250 + D.compte;

function lancerTransition() {
  if (etape !== 'resultat') return;
  finTransition();
  etape = 'transition';
  scene.dataset.phase = '2';
  scene.classList.add('voirP1', 'cacheP2');

  // 1. tout mesurer au repos : aucune animation d'entrée ne doit décaler les
  // cibles ni les points de départ. Celles du résultat sont terminées d'office
  // — un onglet en arrière-plan ne les fait pas avancer, alors que la minuterie
  // qui lance ce passage, elle, continue de tourner.
  for (const a of [...scene.getAnimations(), ...scene.querySelector('.finP1').getAnimations({ subtree: true }),
    ...scene.querySelector('.finFlash').getAnimations()]) {
    if (a.effect && a.effect.getComputedTiming().iterations !== Infinity) a.finish();
  }
  racinesStats().forEach(el => el.classList.remove('entree'));
  scene.dataset.entree = 'deploiement';
  ajusterPixels();
  const panJ = $('finPanJoueur'), panA = $('finPanAdversaire');
  const lignePieces = $('finStatsJoueur').querySelector('[data-stat="pieces"] .pValeurTxt');
  const avecPieces = M.pieces.heros !== null;
  // chaque panneau se déploie autour de la case de son perso, qui ne bouge donc
  // pas, et finit de se déployer bien avant l'atterrissage
  for (const [pan, sprite] of [[panJ, $('finSpriteJoueur')], [panA, $('finSpriteAdversaire')]]) {
    const rp = pan.getBoundingClientRect(), rs = sprite.getBoundingClientRect(), sp = echelleCumulee(pan);
    pan.style.transformOrigin = `${(rs.left + rs.width / 2 - rp.left) / sp}px ${(rs.top + rs.height / 2 - rp.top) / sp}px`;
    pan.style.animationDuration = Math.min(D.entree, 700) + 'ms';
  }
  panJ.classList.add('atterrit');
  scene.classList.toggle('piecesVolent', avecPieces);

  // 2. la phase 1 se vide : auréole, étincelles et badge s'effacent, la carte adverse aussi...
  anime($('finAureole'), [{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' });
  anime($('finEtincelles'), [{ opacity: 1 }, { opacity: 0 }], { duration: 350, fill: 'forwards' });
  anime($('finBadgePos'), [{ transform: 'translate(0px,0px)', opacity: 1 }, { transform: 'translate(-5cqh,-7cqh)', opacity: 0 }],
    { duration: 450, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' });
  anime($('finCartePos'), [{ opacity: 1, transform: 'translate(0px,0px)' }, { opacity: 0, transform: 'translate(0px,2cqh)' }],
    { duration: 380, easing: 'cubic-bezier(.4,0,.7,.4)', fill: 'forwards' });
  // ... et le perso s'envole vers son panneau
  voler($('finHeroPos'), $('finHero'), $('finSpriteJoueur'), D.vol, 0, { elan: true })
    .finished.then(() => { panJ.classList.remove('atterrit'); scene.classList.add('cache-hero'); }).catch(() => {});

  // 3. les textes se redressent en volant et se fondent dans leur place
  const textes = [
    [$('finNomVol'), $('finNom'), $('finPseudoJoueur'), 90, { police: true, ax: 'g', ay: 'c' }, true],
    [$('finIssueVol'), $('finIssue'), $('finIssueJoueur'), 150, { police: true, ax: 'c', ay: 'c' }, true],
  ];
  if (avecPieces) {
    lignePieces.textContent = '+' + M.pieces.heros;
    textes.push([$('finPiecesVol'), $('finPieces'), lignePieces, 210, { police: true, ax: 'g', ay: 'c' }, false]);
  }
  for (const [volant, repere, cible, delai, opts, penche] of textes) {
    voler(volant, repere, cible, D.volTexte, delai, opts);
    if (penche) anime(repere, [{ transform: 'skewX(-9deg) rotate(-6deg)' }, { transform: 'skewX(0deg) rotate(0deg)' }],
      { duration: D.volTexte, delay: delai, easing: COURBE_VOL, fill: 'forwards' });
    anime(volant, [{ opacity: 1 }, { opacity: 1, offset: .6 }, { opacity: 0 }], { duration: D.volTexte, delay: delai, fill: 'forwards' });
    anime(cible, [{ opacity: 0 }, { opacity: 0, offset: .6 }, { opacity: 1 }], { duration: D.volTexte, delay: delai, fill: 'both' });
  }

  // 4. révélations : les panneaux tout de suite (ils se déploient sous le vol), titre et centre ensuite
  reveler('g');
  plus(D.decalAdversaire, () => reveler('d'));
  plus(D.revelCentre, () => reveler('c'));
  lancerCompteurs({ g: 0, c: D.revelCentre, d: D.decalAdversaire }, { piecesDirect: true });
  // Fin du relais : le calque du résultat disparaît. Rien ici ne relance une
  // animation CSS des stats, sinon elle repartirait de zéro sous les yeux.
  plus(D.vol + D.decalAdversaire + 80, () => {
    animations.forEach(a => a.cancel()); animations = [];
    scene.classList.remove('voirP1', 'cacheP2', 'rev-g', 'rev-c', 'rev-d', 'cache-hero');
    panJ.classList.remove('atterrit');
  });
  plus(1080 + msStats(), () => { etape = 'stats'; plus(D.lecture, versFinale); });
}

// ESPACE pendant l'aspiration : on saute directement aux stats posées.
function stabiliserStats() {
  finTransition();
  generation++;
  scene.dataset.phase = '2';
  for (const a of scene.querySelector('.finP2').getAnimations({ subtree: true })) {
    if (a.effect && a.effect.getComputedTiming().iterations !== Infinity) a.finish();
  }
  remplirStats();
  etape = 'stats';
  plus(D.lecture, versFinale);
}

/* ---------- Phase 2 → boutons : les stats repartent sur les côtés ---------- */
function versFinale() {
  if (etape !== 'stats') return;
  finTransition();
  etape = 'sortie';
  scene.classList.add('sortieP2');
  plus(D.sortie * .5, entrerBoutons);
  plus(D.sortie + 50, () => scene.classList.remove('sortieP2'));
}
function entrerBoutons() {
  scene.dataset.phase = '3';
  etape = 'boutons';
  debutBoutons = performance.now();
  relancerAnim($('finaux'));
  if (M.mode !== 'enligne') return;
  // Ce que l'adversaire a déjà décidé pendant qu'on lisait ses stats.
  if (Partie.choixFinAdversaire) voter('lui', Partie.choixFinAdversaire);
  else if (adversaireParti) menuTransmis('lui', true);
}

// ESPACE ou clic : on passe à la suite sans attendre.
function passer() {
  if (etape === 'resultat') lancerTransition();
  else if (etape === 'transition') stabiliserStats();
  else if (etape === 'stats') versFinale();
  else if (etape === 'sortie') {
    finTransition();
    for (const a of scene.querySelector('.finP2').getAnimations({ subtree: true })) a.cancel();
    entrerBoutons();
  }
}

/* ---------- Compteurs ---------- */
let generation = 0;
// decal : retard (ms) de chaque zone. piecesDirect : « +10 » arrive en volant, il ne compte pas.
function lancerCompteurs(decal, opts = {}) {
  const gen = ++generation;
  const items = [];
  for (const [cote, hote, zone] of [['heros', $('finStatsJoueur'), 'g'], ['adversaire', $('finStatsAdversaire'), 'd']]) {
    const s = M.stats[cote];
    STATS.forEach((st, i) => items.push({ el: hote.querySelector(`[data-stat="${st.id}"] .pValeurTxt`), cible: s[st.id], st,
      debut: decal[zone] + D.entree + i * D.decalage + 150 }));
    const n = M.pieces[cote], elPieces = hote.querySelector('[data-stat="pieces"] .pValeurTxt');
    if (n !== null && opts.piecesDirect && cote === 'heros') elPieces.textContent = '+' + n;
    else if (n !== null) items.push({ el: elPieces, cible: n, st: { pieces: true }, debut: decal[zone] + D.entree + STATS.length * D.decalage + 250 });
  }
  const communes = { duree: M.duree, echange: M.echangeMax };
  for (const st of COMMUNES) items.push({ el: $('finStatsCommunes').querySelector(`[data-stat="${st.id}"] .cValeur`), cible: communes[st.id], st,
    debut: decal.c + D.entree * .6 + 200 });
  for (const it of items) it.el.textContent = fmt(it.st, 0);
  const t0 = performance.now();
  const tick = now => {
    if (gen !== generation) return;
    let encore = false;
    for (const it of items) {
      const t = (now - t0 - it.debut) / D.compte;
      if (t < 1) encore = true;
      const k = t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 3);
      it.el.textContent = fmt(it.st, it.cible * k);
    }
    if (encore) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ================= BOUTONS ET VOTE EN LIGNE =================
   Hors ligne, un clic décide seul. En ligne, c'est comme le choix du terrain :
   chacun clique un bouton, son avatar s'y pose et l'autre le voit aussitôt. Le
   clic est définitif. Si les deux choix diffèrent, l'ordre tranche — MENU passe
   avant CHANGEZ DE PERSO, qui passe avant REVANCHE : face-à-face puis verdict,
   sans hasard, donc sans roulette. MENU n'attend personne, il gagne quoi que
   l'autre choisisse. Pas de minuteur : personne ne peut bloquer l'autre, MENU
   restant toujours possible. */
const PRIORITE = ['menu', 'perso', 'revanche'];
const NOM_BOUTON = { revanche: 'REVANCHE', menu: 'MENU', perso: 'CHANGEZ DE PERSO' };
const vote = { moi: null, lui: null, fini: false, minuteurs: [] };
let adversaireParti = false, debutBoutons = 0, selection = -1;
const apres = (ms, fn) => vote.minuteurs.push(setTimeout(fn, ms));
const boutons = () => [...$('finaux').querySelectorAll('.fbtn')];
const boutonFinal = choix => $('finaux').querySelector(`[data-fin="${choix}"]`);
const pseudoDe = qui => M.identites[qui === 'moi' ? 'heros' : 'adversaire'].pseudo;

let surChoixFinal = null;
export function quandChoixFinal(fn) { surChoixFinal = fn; }

function executer(choix) {
  vote.fini = true;
  if (surChoixFinal) surChoixFinal(choix);
}

// Même badge que le vote de terrain : la photo si le profil en a une, sinon l'initiale.
function badgeVote(qui) {
  const id = M.identites[qui === 'moi' ? 'heros' : 'adversaire'];
  const b = document.createElement('div');
  b.className = 'badgeVote' + (qui === 'lui' ? ' sien' : '');
  if (id.avatar) { const im = new Image(); im.src = id.avatar; im.alt = ''; b.appendChild(im); }
  else b.textContent = ((id.pseudo || '?')[0] || '?').toUpperCase();
  b.title = id.pseudo || '';
  return b;
}

function reinitVote() {
  vote.minuteurs.forEach(clearTimeout); vote.minuteurs = [];
  vote.moi = vote.lui = null; vote.fini = false;
  scene.querySelectorAll('.badgeVote, .annonceVote, .faceAFace').forEach(e => e.remove());
  $('finaux').classList.remove('aVote');
  boutons().forEach(b => b.classList.remove('choisi', 'accord', 'sel'));
  $('finAttente').classList.add('hidden');
  $('finAttente').classList.remove('pret');
}

function majVote() {
  for (const qui of ['moi', 'lui']) {
    const deja = $('finaux').querySelector(qui === 'lui' ? '.badgeVote.sien' : '.badgeVote:not(.sien)');
    if (vote[qui] && !deja) boutonFinal(vote[qui]).parentElement.appendChild(badgeVote(qui));
  }
  if (vote.moi) { boutonFinal(vote.moi).classList.add('choisi'); $('finaux').classList.add('aVote'); }
  const n = (vote.moi ? 1 : 0) + (vote.lui ? 1 : 0), p = $('finAttente');
  p.classList.toggle('hidden', n === 0);
  p.classList.toggle('pret', n === 2);
  p.textContent = n === 2 ? 'PRÊTS 2/2' : vote.moi ? 'EN ATTENTE… 1/2' : `${pseudoDe('lui').toUpperCase()} A CHOISI · 1/2`;
}

function voter(qui, choix) {
  if (etape !== 'boutons' || vote.fini || vote[qui] || !NOM_BOUTON[choix]) return;
  if (M.mode !== 'enligne') { executer(choix); return; }
  vote[qui] = choix;
  if (qui === 'moi') { sfx('select'); annoncerChoixFin(choix); }
  majVote();
  if (choix === 'menu') { menuTransmis(qui); return; }
  if (vote.moi && vote.lui) trancher();
}

// MENU gagne d'office : celui qui le choisit part aussitôt, l'autre est prévenu et suit.
function menuTransmis(qui, parti) {
  vote.fini = true;
  if (qui === 'moi') { executer('menu'); return; }
  const a = document.createElement('div');
  a.className = 'annonceVote';
  a.textContent = `${pseudoDe('lui').toUpperCase()} ${parti ? 'EST PARTI' : 'A CHOISI MENU'}`;
  scene.appendChild(a);
  apres(D.voteAnnonce, () => executer('menu'));
}

function trancher() {
  vote.fini = true;
  if (vote.moi === vote.lui) {
    boutonFinal(vote.moi).classList.add('accord');
    apres(D.voteAccord, () => executer(vote.moi));
    return;
  }
  const gagnant = PRIORITE.indexOf(vote.moi) < PRIORITE.indexOf(vote.lui) ? vote.moi : vote.lui;
  const perdant = gagnant === vote.moi ? vote.lui : vote.moi;
  const f = document.createElement('div');
  f.className = 'faceAFace';
  f.innerHTML = '<div class="faceTitre">CHOIX…<span class="faceSous"></span></div><div class="faceRangee"></div>';
  const caseDe = qui => {
    const c = document.createElement('div');
    c.className = 'faceCase'; c.dataset.choix = vote[qui];
    const b = boutonFinal(vote[qui]).cloneNode(true);
    b.classList.remove('choisi', 'accord', 'sel');
    c.append(b, badgeVote(qui));
    return c;
  };
  const vs = document.createElement('div');
  vs.className = 'faceVs'; vs.textContent = 'VS';
  f.querySelector('.faceRangee').append(caseDe('moi'), vs, caseDe('lui'));
  scene.appendChild(f);
  apres(D.voteSuspense, () => {
    f.querySelector(`.faceCase[data-choix="${gagnant}"]`).classList.add('gagnant');
    f.querySelector('.faceTitre').firstChild.textContent = NOM_BOUTON[gagnant];
    f.querySelector('.faceSous').textContent = `passe avant ${NOM_BOUTON[perdant]}`;
    apres(D.voteVerdict, () => executer(gagnant));
  });
}

// La liaison est tombée pendant l'écran de fin : c'est un départ, donc un MENU.
// Pendant les stats, on attend les boutons pour le dire.
export function adversairePartiEnFin() {
  if (!M || M.mode !== 'enligne' || vote.fini) return;
  adversaireParti = true;
  if (etape === 'boutons' && !vote.lui) menuTransmis('lui', true);
}

/* ---------- Clavier et souris ---------- */
function majSelection() { boutons().forEach((b, i) => b.classList.toggle('sel', i === selection)); }

// Les flèches choisissent un bouton, ENTRÉE ou ESPACE le valident — seulement
// après avoir choisi, et pas dans la foulée de leur arrivée : sinon la pression
// qui fait défiler les phases lancerait une revanche par accident.
export function toucheFinDeMatch(code) {
  if (etape !== 'boutons') { if (code === 'Space' || code === 'Enter') passer(); return; }
  const haut = code === 'ArrowUp' || code === getKey('moveUp');
  const bas = code === 'ArrowDown' || code === getKey('moveDown');
  if (haut || bas) {
    selection = selection < 0 ? (bas ? 0 : 2) : (selection + (bas ? 1 : 2)) % 3;
    majSelection(); sfx('move');
    return;
  }
  if ((code === 'Enter' || code === 'Space') && selection >= 0 && performance.now() - debutBoutons > 400) {
    voter('moi', boutons()[selection].dataset.fin);
  }
}

scene.addEventListener('click', () => { if (etape !== 'boutons') passer(); });
$('finaux').addEventListener('click', e => {
  const b = e.target.closest('.fbtn');
  if (!b) return;
  e.stopPropagation();
  voter('moi', b.dataset.fin);
});
// La souris reprend la main : plus de liseré clavier sous le curseur.
$('finaux').addEventListener('mouseover', e => {
  if (e.target.closest('.fbtn') && selection >= 0) { selection = -1; majSelection(); }
});
