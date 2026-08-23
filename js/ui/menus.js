import { $, showScreen, curScreen } from '../core/dom.js';
import { G, Mouse, initMatch } from '../game/state.js';
import { DIFFS } from '../core/constants.js';
import { CHARS, ROSTER } from '../data/characters.js';
import { SPECIALS } from '../data/specials.js';
import { DISC_SKINS, getSkinId, setSkinId, drawSkinDisc, getFavSkin, setFavSkin, skinDebloque, randomSkinId } from '../data/skins.js';
import { MAPS, setMapId, mapDebloquee } from '../data/maps.js';
import { getKey } from '../data/keymap.js';
import { MUSIC_TRACKS, getTrackId } from '../data/music.js';
import { sfx, playTrack, stopTrack, duckMusic } from '../audio/audio.js';
import { addPopup } from '../game/fx.js';
import { requestLock } from '../game/input.js';
import { refreshKeysUI } from './keybind-ui.js';
import { CHAPITRES, nbChapitresFaits, chapitreFait, tutoDejaPropose, marquerTutoPropose } from '../data/apprentissage.js';
import { lancerEntrainement } from './training.js';
import { lancerChapitre } from './tutoriel.js';
import { skinActif } from '../data/skins-perso.js';
import { ouvrirPanneauSkins, brancherSkins } from './skins-ui.js';
import { ouvrirEnLigne } from './online-ui.js';

let selCharPlayer = 'naruto', selCharCPU = 'leon', diffIdx = 1;
let modeJ2J = false;
let adminMode = false;

export function isAdminMode() { return adminMode; }
export function setAdminMode(v) { adminMode = v; G.adminMode = v; $('admin-panel').classList.toggle('visible', v); }

/* ---------- outils de dessin ---------- */
// ck à null : on garde le gabarit du canvas mais on ne dessine rien. C'est ce
// qui masque un camp tiré au sort — le « ? » posé par-dessus est translucide,
// il ne suffisait pas à cacher la silhouette.
function drawSprite(canvasEl, ck, scale) {
  // Le portrait porte le skin choisi pour ce personnage, pas sa tenue d'origine.
  const base = CHARS[ck || ROSTER[0]];
  const sk = ck ? skinActif(ck) : null;
  const src = (sk && base.skins && base.skins[sk] && base.skins[sk].idle) || base.frames.idle;
  canvasEl.width = src.width * scale;
  canvasEl.height = src.height * scale;
  const c = canvasEl.getContext('2d');
  c.clearRect(0, 0, canvasEl.width, canvasEl.height);
  if (!ck) return;
  c.imageSmoothingEnabled = false;
  c.drawImage(src, 0, 0, canvasEl.width, canvasEl.height);
}

// Éclaircit une couleur vers le blanc pour que le noir des contours reste lisible dessus.
function pale(hex, w) {
  const n = parseInt(hex.slice(1), 16);
  const m = v => Math.round(v + (255 - v) * w);
  return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`;
}

// Remplit les filigranes déclarés en HTML via data-wm.
function buildWatermarks() {
  document.querySelectorAll('.watermark[data-wm]').forEach(el => {
    const txt = (el.dataset.wm + ' ').repeat(3);
    el.innerHTML = Array.from({ length: 6 }, () => `<div class="line">${txt}</div>`).join('');
  });
}

// Chaque bouton de menu reçoit une seconde icône identique à droite : le
// libellé se retrouve centré entre les deux, sans toucher au HTML de chaque
// bouton. On enveloppe au passage le texte pour pouvoir le centrer.
function mirrorButtonIcons() {
  document.querySelectorAll('.mbtn').forEach(b => {
    const ico = b.querySelector(':scope > .ico');
    if (!ico || b.querySelectorAll(':scope > .ico').length > 1) return;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    [...b.childNodes].forEach(n => { if (n !== ico) lbl.appendChild(n); });
    b.appendChild(lbl);
    b.appendChild(ico.cloneNode(true));
  });
}

// Bouton plein écran de l'écran titre.
(function () {
  const b = $('fsBtn');
  if (!b) return;
  b.addEventListener('click', e => {
    e.stopPropagation();
    // On met le cadre du jeu en plein écran, pas la page entière : c'est le
    // carré de jeu qu'on veut voir occuper tout l'écran.
    if (document.fullscreenElement) document.exitFullscreen();
    else $('stage').requestFullscreen().catch(() => { });
  });
})();

/* ---------- écran titre ---------- */
function renderTitleHero() {
  const ck = ROSTER[(Math.random() * ROSTER.length) | 0];
  drawSprite($('titleHero'), ck, 16);
}

/* ---------- sélection des personnages ----------
   Le choix est séquentiel : 1P d'abord, puis 2P/CPU. Tant que 1P n'a pas
   validé, le côté adverse reste verrouillé, et inversement. Échap revient en
   arrière tant que le second joueur n'a pas validé. */
let turn = 1;              // 1 = au tour de 1P, 2 = au tour de 2P/CPU, 0 = terminé
let lockedP1 = false, lockedP2 = false;
let rndP1 = false, rndP2 = false;   // camp tiré au sort : masqué jusqu'au match

export function resetSelectTurn() {
  turn = 1; lockedP1 = lockedP2 = false; rndP1 = rndP2 = false;
  previewP1 = previewP2 = false;
}

// Disque préféré : le bouton ouvre un panneau où l'on VOIT les disques, plutôt
// que de les faire défiler à l'aveugle par leur nom.
(function () {
  const b = $('favSkin'), panel = $('skinPanel');
  if (!b || !panel) return;

  const label = () => {
    const f = getFavSkin();
    b.textContent = f ? ((DISC_SKINS.find(s => s.id === f) || {}).name || f) : 'ALÉATOIRE';
  };

  function buildPanel() {
    panel.innerHTML = '';
    const fav = getFavSkin();
    // Case « aléatoire » en tête, puis un aperçu dessiné de chaque disque.
    const rnd = document.createElement('button');
    rnd.className = 'skinCell rnd' + (fav ? '' : ' on');
    rnd.innerHTML = '<span class="qm">?</span><em>Aléatoire</em>';
    rnd.addEventListener('click', e => { e.stopPropagation(); setFavSkin(null); sfx('select'); label(); buildPanel(); renderDisc(); });
    panel.appendChild(rnd);

    for (const s of DISC_SKINS) {
      const libre = skinDebloque(s);
      const cell = document.createElement('button');
      // Un disque encore verrouillé reste visible mais grisé et cadenassé :
      // il donne une raison de faire le tutoriel. L'infobulle dit comment.
      cell.className = 'skinCell' + (fav === s.id ? ' on' : '') + (libre ? '' : ' locked');
      if (!libre) cell.title = s.aide || 'Récompense à débloquer.';
      const cv = document.createElement('canvas');
      cv.width = cv.height = 72;
      drawSkinDisc(cv.getContext('2d'), 36, 36, 32, s.id, 0);
      cell.appendChild(cv);
      const em = document.createElement('em'); em.textContent = s.name;
      cell.appendChild(em);
      if (!libre) {
        const c = document.createElement('span');
        c.className = 'skinLock'; c.textContent = '🔒';
        cell.appendChild(c);
        const aide = document.createElement('span');
        aide.className = 'skinAide'; aide.textContent = s.aide || 'Récompense à débloquer.';
        cell.appendChild(aide);
      }
      cell.addEventListener('click', e => {
        e.stopPropagation();
        if (!libre) { sfx('deny'); return; }
        setFavSkin(s.id); sfx('select'); label(); buildPanel(); renderDisc();
      });
      panel.appendChild(cell);
    }
  }

  b.addEventListener('click', e => {
    e.stopPropagation();
    const ouvert = panel.classList.toggle('hidden');
    if (!ouvert) buildPanel();
    sfx('move');
  });
  label();
})();

// « Clac » doux de validation : deux notes courtes et rondes, sans agressivité.
function clac() { sfx('select'); }

// Présélection : le clic sur une case ne fait que proposer un personnage. Rien
// n'est figé tant que le joueur n'a pas appuyé sur VALIDER sous son nom.
let previewP1 = false, previewP2 = false;

// Un clic suffit : le personnage est choisi et verrouillé dans la foulée, et
// la main passe aussitôt au camp suivant. Il n'y a plus d'étape de
// confirmation à part — on revient en arrière avec RETOUR si on s'est trompé.
function preselect(ck) {
  if (turn === 1) { selCharPlayer = ck; previewP1 = true; rndP1 = false; }
  else if (turn === 2) { selCharCPU = ck; previewP2 = true; rndP2 = false; }
  else return;
  validate(turn);
}

function preselectRandom() {
  const pick = ROSTER[(Math.random() * ROSTER.length) | 0];
  if (turn === 1) { selCharPlayer = pick; previewP1 = true; rndP1 = true; }
  else if (turn === 2) { selCharCPU = pick; previewP2 = true; rndP2 = true; }
  else return;
  validate(turn);
}

// Verrouille le choix et passe la main au camp suivant.
function validate(side) {
  if (side === 1) { if (!previewP1 || lockedP1) return; lockedP1 = true; turn = 2; }
  else { if (!previewP2 || lockedP2) return; lockedP2 = true; turn = 0; }
  clac();
  refreshSelect();
  punchHero(side);
}

// Pose ou retire le grand « ? » par-dessus le portrait d'un côté.
function showRandomMask(i, on) {
  const box = document.querySelectorAll('.scr-select .side .heroBox')[i];
  if (!box) return;
  let m = box.querySelector('.rndMark');
  if (on && !m) { m = document.createElement('div'); m.className = 'rndMark'; m.textContent = '?'; box.appendChild(m); }
  else if (!on && m) m.remove();
}

function punchHero(side) {
  const box = document.querySelectorAll('.scr-select .side .heroBox')[side === 1 ? 0 : 1];
  if (!box) return;
  box.classList.remove('punch');
  void box.offsetWidth;              // relance l'animation
  box.classList.add('punch');
}

// Échap : le joueur en cours revient sur son choix, tant que 2P n'a pas validé.
export function undoSelect() {
  if (turn === 0 && lockedP2) { lockedP2 = false; turn = 2; sfx('deny'); refreshSelect(); return true; }
  if (turn === 2 && lockedP1) { lockedP1 = false; turn = 1; sfx('deny'); refreshSelect(); return true; }
  return false;
}

function pickPlayer(c) { selCharPlayer = c; sfx('move'); refreshSelect(); }
function pickCPU(c) { selCharCPU = c; sfx('move'); refreshSelect(); }
function changeDiff(d) { diffIdx = (diffIdx + d + DIFFS.length) % DIFFS.length; sfx('move'); refreshSelect(); }

// ch à null : barres vides et grises, pour ne pas trahir un camp tiré au sort
// — un profil de statistiques identifie un personnage aussi sûrement qu'un nom.
function renderStats(el, ch) {
  const rows = ch
    ? [['VITESSE', ch.stats.spd, '#5df08a'], ['PUISSANCE', ch.stats.pow, '#ff5f6d'], ['CONTRÔLE', ch.stats.ctl, '#35e0ff']]
    : [['VITESSE', 0, '#6b7280'], ['PUISSANCE', 0, '#6b7280'], ['CONTRÔLE', 0, '#6b7280']];
  el.innerHTML = rows.map(([label, val, col]) =>
    `<div class="statRow"><span class="lbl">${label}</span>` +
    `<div class="bar"><i style="width:${val / 5 * 100}%;background:${col}"></i></div></div>`
  ).join('');
}

function renderCharGrid() {
  const grid = $('charGrid');
  grid.innerHTML = '';
  for (const ck of ROSTER) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    const cv = document.createElement('canvas');
    drawSprite(cv, ck, 5);
    cell.appendChild(cv);
    // Contour dessiné + tag de la couleur du camp, posé à la validation.
    // Un camp tiré au sort ne pose son étiquette que sur la case « ? » : la
    // poser aussi sur le personnage réellement tiré vendait la mèche.
    if (lockedP1 && !rndP1 && selCharPlayer === ck) markPicked(cell, 'p1', '1P');
    if (lockedP2 && !rndP2 && selCharCPU === ck) markPicked(cell, modeJ2J ? 'p2' : 'cpu', modeJ2J ? '2P' : 'CPU');
    // Cliquer un personnage ouvre ses tenues, et c'est en choisissant la tenue
    // qu'on arrête son choix. Le personnage et sa tenue sont une seule
    // décision : les séparer en deux gestes faisait oublier le second, et on
    // partait au match avec la tenue de la partie précédente.
    cell.addEventListener('click', () => {
      if (turn !== 1 && turn !== 2) return;
      sfx('move');
      ouvrirPanneauSkins(turn, ck, { auChoix: () => preselect(ck) });
    });
    grid.appendChild(cell);
  }
  // Case aléatoire : ne tire que pour le camp dont c'est le tour, et le
  // personnage reste masqué derrière un « ? » jusqu'au lancement du match.
  const rnd = document.createElement('div');
  rnd.className = 'cell rndCell';
  rnd.innerHTML = '<span class="qm">?</span>';
  rnd.title = 'Personnage aléatoire';
  if (lockedP1 && rndP1) markPicked(rnd, 'p1', '1P');
  if (lockedP2 && rndP2) markPicked(rnd, modeJ2J ? 'p2' : 'cpu', modeJ2J ? '2P' : 'CPU');
  rnd.addEventListener('click', preselectRandom);
  grid.appendChild(rnd);
  grid.classList.toggle('locked', turn === 0);
}

function markPicked(cell, kind, label) {
  cell.classList.add('picked', 'pick-' + kind);
  const ring = document.createElement('i');
  ring.className = 'pickRing';
  cell.appendChild(ring);
  const tag = document.createElement('span');
  tag.className = 'pickTag';
  tag.innerHTML = '<span>' + label + '</span>';
  cell.appendChild(tag);
}

export function refreshSelect() {
  const p1 = CHARS[selCharPlayer], p2 = CHARS[selCharCPU];
  // Un camp tiré au sort est masqué de bout en bout jusqu'au coup d'envoi :
  // sprite, univers, statistiques, ultime et couleur d'ambiance. Chacun de ces
  // détails suffisait à reconnaître le personnage malgré le « ? ».
  $('selUni1').textContent = rndP1 ? '???' : p1.universe;
  $('selUni2').textContent = rndP2 ? '???' : p2.universe;
  $('selName1').textContent = rndP1 ? '???' : p1.short;
  $('selName2').textContent = rndP2 ? '???' : p2.short;
  drawSprite($('selHero1'), rndP1 ? null : selCharPlayer, 12);
  drawSprite($('selHero2'), rndP2 ? null : selCharCPU, 12);
  showRandomMask(0, rndP1);
  showRandomMask(1, rndP2);

  // Plus de grisage : le camp en cours se lit au bandeau clignotant et aux
  // contours posés sur les cases. COMBATTRE n'apparaît qu'une fois les deux
  // camps verrouillés — avant, il n'y a rien à lancer.
  const fight = $('fightBtn');
  if (fight) fight.classList.toggle('hidden', !(lockedP1 && lockedP2));
  const hint = $('turnHint');
  if (hint) {
    hint.className = 'turnHint ' + (turn === 1 ? 'p1' : turn === 2 ? 'p2' : 'done');
    hint.textContent = turn === 1 ? 'AU TOUR DE 1P'
      : turn === 2 ? (modeJ2J ? 'AU TOUR DE 2P' : 'AU TOUR DU CPU') : '';
  }
  renderStats($('selStats1'), rndP1 ? null : p1);
  renderStats($('selStats2'), rndP2 ? null : p2);
  renderCharGrid();

  const sp = rndP1 ? null : SPECIALS[p1.ult];
  $('specialName').textContent = sp ? sp.name : '???';
  $('specialDesc').textContent = sp ? sp.desc : 'Tirage au sort — révélé au coup d\'envoi.';
  $('diffName').textContent = DIFFS[diffIdx].label;

  // Halos + fond en dégradé de la couleur J1 vers celle de J2. Un camp masqué
  // vire au gris neutre : sa couleur d'ambiance le désignait aussi sûrement.
  const NEUTRE = '#6b7280';
  const c1 = rndP1 ? NEUTRE : p1.color, c2 = rndP2 ? NEUTRE : p2.color;
  $('selGlow1').style.background = c1;
  $('selGlow2').style.background = c2;
  document.querySelector('.bg-select').style.background =
    `linear-gradient(100deg, ${pale(c1, .55)} 0%, ${pale(c1, .44)} 26%, ` +
    `${pale(c2, .44)} 74%, ${pale(c2, .55)} 100%)`;
}

export function selectScreenKey(code) {
  const i = ROSTER.indexOf(selCharPlayer), j = ROSTER.indexOf(selCharCPU);
  if (code === 'ArrowLeft') pickCPU(ROSTER[(j + ROSTER.length - 1) % ROSTER.length]);
  else if (code === 'ArrowRight') pickCPU(ROSTER[(j + 1) % ROSTER.length]);
  else if (code === getKey('moveLeft')) pickPlayer(ROSTER[(i + ROSTER.length - 1) % ROSTER.length]);
  else if (code === getKey('moveRight')) pickPlayer(ROSTER[(i + 1) % ROSTER.length]);
  else if (code === 'ArrowUp' || code === getKey('moveUp')) changeDiff(-1);
  else if (code === 'ArrowDown' || code === getKey('moveDown')) changeDiff(1);
  else if (code === 'KeyR') {
    selCharPlayer = ROSTER[(Math.random() * ROSTER.length) | 0];
    selCharCPU = ROSTER[(Math.random() * ROSTER.length) | 0];
    sfx('select'); refreshSelect();
  }
  else if (code === 'Enter' || code === 'Space') { sfx('select'); doAct('fight'); }
  // Échap revient sur le choix en cours tant que le second joueur n'a pas
  // validé ; sinon seulement, il quitte l'écran.
  else if (code === getKey('pause')) { if (!undoSelect()) doAct('back'); }
}

/* ---------- carrousel de disque ---------- */
// Le carrousel se recalcule à l'ouverture : un disque débloqué en cours de
// session doit y apparaître sans relancer le jeu.
let DISC_CHOICES = [];
let discIdx = 0;
function majChoixDisques() {
  DISC_CHOICES = [...DISC_SKINS.filter(skinDebloque).map(s => ({ id: s.id, name: s.name })),
                  { id: '__random', name: 'ALÉATOIRE' }];
  discIdx = Math.max(0, DISC_CHOICES.findIndex(c => c.id === getSkinId()));
}
majChoixDisques();

// Peint une case du carrousel (grande au centre, petites sur les côtés).
function paintDiscSlot(el, choice, size) {
  el.innerHTML = '';
  el.classList.toggle('rnd', choice.id === '__random');
  if (choice.id === '__random') {
    el.textContent = '?';
  } else {
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    drawSkinDisc(cv.getContext('2d'), size / 2, size / 2, size / 2 - 2, choice.id, 0);
    el.appendChild(cv);
  }
}

function renderDisc() {
  const n = DISC_CHOICES.length;
  const ch = DISC_CHOICES[discIdx];
  paintDiscSlot($('discView'), ch, 90);
  paintDiscSlot($('discLeft'), DISC_CHOICES[(discIdx - 1 + n) % n], 56);
  paintDiscSlot($('discRight'), DISC_CHOICES[(discIdx + 1) % n], 56);
  if (ch.id !== '__random') setSkinId(ch.id);
  $('discName').textContent = ch.name;
}
function cycleDisc(d) {
  discIdx = (discIdx + d + DISC_CHOICES.length) % DISC_CHOICES.length;
  sfx('move'); renderDisc();
}
// Un skin "aléatoire" doit être résolu au moment de lancer le match.
function resolveSkin() {
  // Même règle que pour les terrains : le tirage ne donne jamais un disque
  // encore verrouillé. randomSkinId() n'ouvre que ce qui est débloqué.
  if (DISC_CHOICES[discIdx].id === '__random') setSkinId(randomSkinId());
}

/* ---------- sélection du terrain ---------- */
// La salle d'entraînement est un décor de travail, pas un terrain de match :
// elle est écartée de la sélection. Le terrain secret n'y entre qu'une fois
// gagné — la liste se recalcule donc à chaque ouverture de l'écran.
let MAP_CHOICES = [];
function majChoixTerrains() {
  // Les terrains verrouillés restent dans la liste, cadenassés : les cacher
  // reviendrait à ne donner aucune raison de les gagner.
  MAP_CHOICES = [...MAPS.filter(m => !m.horsSelection),
                 { id: '__random', name: 'ALÉATOIRE' }];
  if (mapIdx >= MAP_CHOICES.length) mapIdx = 0;
  // On peut s'arrêter sur un terrain verrouillé : c'est là qu'on lit comment le
  // gagner. Renvoyer d'office au premier terrain rendait la flèche droite
  // inutilisable — on rebondissait sur le cadenas sans jamais atteindre ce qui
  // vient après — et masquait la marche à suivre. Le lancement, lui, reste
  // fermé : bouton JOUER caché, Entrée refusée, vignette non cliquable.
}

function verrouille(c) { return !!(c && c.id !== '__random' && !mapDebloquee(c)); }
let mapIdx = 0;

// Mini-rendu proportionnel du vrai terrain (données de data/maps.js).
function drawArena(cv, map, big) {
  const ctx = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  const t = map.theme;
  const grd = ctx.createRadialGradient(W / 2, H / 2, H * 0.12, W / 2, H / 2, H * 0.9);
  grd.addColorStop(0, t.bgInner); grd.addColorStop(1, t.bgOuter);
  ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

  const m = Math.min(W, H) * (big ? 0.1 : 0.14);
  const L = m, R = W - m, T = m * 0.7, B = H - m * 0.7;
  ctx.fillStyle = t.floor; ctx.fillRect(L, T, R - L, B - T);
  ctx.strokeStyle = t.line; ctx.lineWidth = big ? 2 : 1;
  ctx.strokeRect(L, T, R - L, B - T);
  ctx.beginPath(); ctx.moveTo((L + R) / 2, T); ctx.lineTo((L + R) / 2, B); ctx.stroke();
  ctx.beginPath(); ctx.arc((L + R) / 2, (T + B) / 2, (B - T) * 0.16, 0, Math.PI * 2); ctx.stroke();

  const cy = (T + B) / 2, goalW = (R - L) * 0.05;
  const goalH = (B - T) * (map.goal.height / (map.court.bottom - map.court.top));
  const scale = (B - T) / (map.court.bottom - map.court.top);
  for (const side of [0, 1]) {
    const gx = side === 0 ? L - goalW : R;
    ctx.fillStyle = t.goalFill; ctx.strokeStyle = t.goalStroke; ctx.lineWidth = big ? 2 : 1;
    ctx.fillRect(gx, cy - goalH / 2, goalW, goalH);
    ctx.strokeRect(gx, cy - goalH / 2, goalW, goalH);
    for (const z of map.zones) {
      ctx.fillStyle = z.color; ctx.globalAlpha = .55;
      ctx.fillRect(gx, cy + z.from * scale, goalW, (z.to - z.from) * scale);
    }
    ctx.globalAlpha = 1;
  }
}

function renderMapThumbs() {
  const row = $('mapThumbs');
  row.innerHTML = '';
  MAP_CHOICES.forEach((c, i) => {
    const ferme = verrouille(c);
    const el = document.createElement('div');
    el.className = 'thumb' + (i === mapIdx ? ' on' : '') + (ferme ? ' locked' : '');
    if (ferme) el.title = c.aide || 'Terrain à débloquer.';
    if (c.id === '__random') {
      el.innerHTML = '<div class="rndFace">?</div><div class="label">ALÉATOIRE</div>';
    } else {
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 160;
      drawArena(cv, c, false);
      el.appendChild(cv);
      const label = document.createElement('div'); label.className = 'label'; label.textContent = c.name;
      el.appendChild(label);
      if (ferme) {
        const lock = document.createElement('span');
        lock.className = 'mapLock'; lock.textContent = '🔒';
        el.appendChild(lock);
      }
    }
    // On peut regarder un terrain verrouillé, pas le choisir.
    el.addEventListener('click', () => {
      if (ferme) { sfx('deny'); return; }
      mapIdx = i; sfx('move'); refreshMaps();
    });
    row.appendChild(el);
  });
}

export function refreshMaps() {
  majChoixTerrains();
  const c = MAP_CHOICES[mapIdx];
  $('mapName').textContent = c.name;
  const big = $('mapPreview');
  const bg = $('mapsBg');
  if (c.id === '__random') {
    const g = big.getContext('2d');
    g.clearRect(0, 0, big.width, big.height);
    g.fillStyle = '#0d0f16'; g.fillRect(0, 0, big.width, big.height);
    g.fillStyle = '#fff'; g.font = '700 120px "Archivo Black", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('?', big.width / 2, big.height / 2 + 10);
    bg.style.background = 'radial-gradient(120cqh 90cqh at 50% 42%,rgba(36,22,54,.94) 0%,rgba(18,10,28,.95) 55%,rgba(4,2,6,.96) 100%)';
    bg.style.setProperty('--accent', '#c86bff');
  } else {
    drawArena(big, c, true);
    const t = c.theme;
    bg.style.background = `radial-gradient(120cqh 90cqh at 50% 42%, ${t.bgInner} 0%, ${t.bgOuter} 68%, #020408 100%)`;
    bg.style.setProperty('--accent', t.goalStroke);
    // Chaque terrain a son OST : la choisir la met en route d'office. Le joueur
    // reste libre d'en changer juste en dessous, son choix n'est pas écrasé.
    if (c.ost && !musicTouchee) selectTrack(c.ost);
  }
  // Terrain encore à gagner : aperçu éteint, cadenas, et la marche à suivre.
  const ferme = verrouille(c);
  $('mapName').textContent = ferme ? '🔒 ' + c.name : c.name;
  big.classList.toggle('locked', ferme);
  const aide = $('mapAide');
  if (aide) {
    aide.textContent = ferme ? (c.aide || 'Terrain à débloquer.') : '';
    aide.classList.toggle('hidden', !ferme);
  }
  const go = document.querySelector('.mapGoBtn');
  if (go) go.classList.toggle('hidden', ferme);
  renderMapThumbs();
}

function resolveMap() {
  const c = MAP_CHOICES[mapIdx];
  if (c.id !== '__random') { setMapId(c.id); return; }
  // ALÉATOIRE ne tire que parmi les terrains réellement proposés : piocher dans
  // la liste brute sortait la salle d'entraînement, et offrait la récompense du
  // tutoriel à qui ne l'avait pas gagnée.
  const libres = MAPS.filter(m => !m.horsSelection && mapDebloquee(m));
  setMapId(libres[(Math.random() * libres.length) | 0].id);
}

export function mapsScreenKey(code) {
  if (code === 'ArrowLeft') { mapIdx = (mapIdx + MAP_CHOICES.length - 1) % MAP_CHOICES.length; sfx('move'); refreshMaps(); }
  else if (code === 'ArrowRight') { mapIdx = (mapIdx + 1) % MAP_CHOICES.length; sfx('move'); refreshMaps(); }
  // On ne lance pas un terrain qu'on n'a pas encore gagné.
  else if (code === 'Enter' || code === 'Space') {
    if (verrouille(MAP_CHOICES[mapIdx])) { sfx('deny'); return; }
    sfx('select'); doAct('startMatch');
  }
  else if (code === getKey('pause')) { sfx('select'); showScreen('select'); }
}

/* ---------- choix de la musique ----------
   Les pistes viennent de data/music.js — en ajouter une là suffit à
   l'ajouter ici. "Aucune" (id null) coupe la musique sans couper les SFX. */
const MUSIC_CHOICES = [...MUSIC_TRACKS, { id: null, name: 'Aucune musique' }];
let musicIdx = Math.max(0, MUSIC_CHOICES.findIndex(t => t.id === getTrackId()));

// Vrai dès que le joueur touche au sélecteur : à partir de là, changer de
// terrain n'écrase plus son choix de musique.
let musicTouchee = false;

function renderMusic() {
  const c = MUSIC_CHOICES[musicIdx];
  $('musicName').textContent = c.name;
  if (c.id) playTrack(c.id); else stopTrack();
}

// Les écrans de navigation ont leur propre thème : la piste choisie pour le
// match ne prend le relais qu'au coup d'envoi. L'écran des terrains fait
// exception, il la joue en aperçu pour qu'on puisse la choisir à l'oreille.
// playTrack() relance la lecture depuis le début : on ne l'appelle donc que si
// la piste change vraiment, sinon la musique repartirait à chaque écran.
const PISTE_MENU = 'menu-ost';
function musiqueDeMenu() {
  if (getTrackId() !== PISTE_MENU) playTrack(PISTE_MENU);
}
// Piste retenue pour le match, lancée au coup d'envoi.
function musiqueDuMatch() {
  const c = MUSIC_CHOICES[musicIdx];
  if (!c.id) { stopTrack(); return; }
  if (getTrackId() !== c.id) playTrack(c.id);
}
// Retient la piste d'un terrain sans la lancer : on est encore dans les menus,
// qui gardent leur propre thème. Elle ne se fera entendre qu'au coup d'envoi —
// ou tout de suite si le joueur va la chercher lui-même avec les flèches.
function selectTrack(id) {
  const i = MUSIC_CHOICES.findIndex(t => t.id === id);
  if (i < 0) return;
  musicIdx = i;
  $('musicName').textContent = MUSIC_CHOICES[i].name;
}
function cycleMusic(d) {
  musicIdx = (musicIdx + d + MUSIC_CHOICES.length) % MUSIC_CHOICES.length;
  musicTouchee = true;
  sfx('move'); renderMusic();
}

/* ---------- skins ----------
   Le grand portrait de chaque camp ouvre le choix des skins. On ne l'ouvre
   que pour un camp déjà verrouillé et non tiré au sort : sinon on dévoilerait
   un personnage encore secret. */
(function cablerPortraits() {
  const boites = document.querySelectorAll('.scr-select .side .heroBox');
  boites.forEach((box, i) => {
    box.addEventListener('click', () => {
      const camp = i + 1;
      const aleatoire = camp === 1 ? rndP1 : rndP2;
      if (aleatoire) { sfx('deny'); return; }
      const ck = camp === 1 ? selCharPlayer : selCharCPU;
      box.classList.remove('punchSkin'); void box.offsetWidth; box.classList.add('punchSkin');
      sfx('select');
      ouvrirPanneauSkins(camp, ck);
    });
  });
  // Changer de skin redessine tout de suite portraits et grille.
  brancherSkins(() => refreshSelect());
})();

/* ---------- apprentissage ---------- */
function ouvrirApprentissage() {
  const p = $('tutoProg');
  if (p) p.textContent = nbChapitresFaits() + ' / ' + CHAPITRES.length + ' chapitres';
  majMusiqueCarte();
  showScreen('learn');
}

// Choix de la musique de l'entraînement, sous les deux cartes : elle vaut pour
// la séance et se règle avant d'entrer.
let musTrIdx = 0;
function majMusiqueCarte() {
  const el = $('musTrNom');
  if (el) el.textContent = MUSIC_CHOICES[musTrIdx].name;
}
(function cablerMusiqueCarte() {
  const bouger = d => {
    musTrIdx = (musTrIdx + d + MUSIC_CHOICES.length) % MUSIC_CHOICES.length;
    sfx('move'); majMusiqueCarte();
  };
  const prev = $('musTrPrev'), next = $('musTrNext');
  if (prev) prev.addEventListener('click', () => bouger(-1));
  if (next) next.addEventListener('click', () => bouger(1));
})();

// La piste est passée à l'entraînement au lancement plutôt que lue depuis
// training.js : cela éviterait un import croisé entre les deux modules.
function jouerMusiqueEntrainement() {
  const id = MUSIC_CHOICES[musTrIdx].id;
  if (!id) { stopTrack(); return; }
  if (getTrackId() !== id) playTrack(id);
}

// Les chapitres se présentent dans l'ordre conseillé, mais rien n'oblige à le
// suivre : chacun est jouable seul, et ceux déjà faits portent leur coche.
function ouvrirChapitres() {
  const wrap = $('chapWrap');
  if (wrap) {
    wrap.innerHTML = '';
    CHAPITRES.forEach((c, i) => {
      const fait = chapitreFait(c.id);
      const b = document.createElement('button');
      b.className = 'chapCard' + (fait ? ' fait' : '');
      b.style.animationDelay = (i * .06) + 's';
      b.innerHTML = '<span class="num">' + c.num + '</span>'
        + '<span class="nom">' + c.nom + '</span>'
        + '<span class="desc">' + c.desc + '</span>'
        + (fait ? '<span class="coche">✓</span>' : '');
      b.addEventListener('click', () => { sfx('select'); lancerChapitre(c.id); });
      wrap.appendChild(b);
    });
  }
  const n = nbChapitresFaits();
  const bar = $('chapBar'), txt = $('chapProgTxt');
  if (bar) bar.style.width = Math.round(100 * n / CHAPITRES.length) + '%';
  if (txt) txt.textContent = n + ' / ' + CHAPITRES.length + ' CHAPITRES';
  showScreen('chap');
}

// Au tout premier lancement, on propose le tutoriel une seule fois. Appelé par
// l'introduction quand elle rend la main, pour ne pas passer devant elle.
export function proposerTutoSiPremiereFois() {
  if (tutoDejaPropose()) return false;
  marquerTutoPropose();
  showScreen('firstrun');
  return true;
}

/* ---------- navigation ---------- */
export function pauseGame() { Mouse.down = false; duckMusic(true); showScreen('pause'); }

function startMatch() {
  resolveSkin();
  resolveMap();
  musiqueDuMatch();
  showScreen(null);
  initMatch(false, selCharPlayer, selCharCPU, diffIdx, modeJ2J);
  requestLock();
  $('admin-panel').classList.toggle('visible', adminMode);
}

export function doAct(act) {
  switch (act) {
    case 'play': sfx('select'); modeJ2J = false; musiqueDeMenu(); resetSelectTurn(); showScreen('select'); refreshSelect(); break;
    case 'j2j': sfx('select'); modeJ2J = true; musiqueDeMenu(); resetSelectTurn(); showScreen('select'); refreshSelect(); break;
    case 'options': sfx('select'); musiqueDeMenu(); showScreen('options'); refreshKeysUI(); break;
    case 'online': sfx('select'); musiqueDeMenu(); ouvrirEnLigne(); break;
    case 'learn': sfx('select'); musiqueDeMenu(); ouvrirApprentissage(); break;
    case 'training': sfx('select'); jouerMusiqueEntrainement(); lancerEntrainement(); break;
    case 'tuto': sfx('select'); musiqueDeMenu(); ouvrirChapitres(); break;
    // Refuser le tutoriel au premier lancement ne doit se demander qu'une fois.
    case 'skipTuto': sfx('select'); marquerTutoPropose(); showScreen('title'); break;
    case 'back': sfx('select'); musiqueDeMenu(); showScreen('title'); break;
    case 'fight': sfx('select'); showScreen('maps'); refreshMaps(); break;
    case 'startMatch': sfx('select'); startMatch(); break;
    case 'resume': sfx('select'); duckMusic(false); showScreen(null); requestLock(); break;
    case 'restart': sfx('select'); showScreen(null); initMatch(false, G.matchChar, G.matchCPU, G.matchDiff, G.isJ2J); requestLock(); break;
    case 'rematch': sfx('select'); showScreen(null); initMatch(false, G.matchChar, G.matchCPU, G.matchDiff, G.isJ2J); requestLock(); break;
    case 'changeChar': sfx('select'); initMatch(true); showScreen('select'); refreshSelect(); $('admin-panel').classList.remove('visible'); break;
    case 'menu': sfx('select'); initMatch(true); showScreen('title'); renderTitleHero(); $('admin-panel').classList.remove('visible'); break;
  }
}

/* ---------- câblage ---------- */
buildWatermarks();
mirrorButtonIcons();
renderTitleHero();
renderDisc();
renderMusic();

$('discPrev').addEventListener('click', () => cycleDisc(-1));
$('discNext').addEventListener('click', () => cycleDisc(1));
$('musicPrev').addEventListener('click', () => cycleMusic(-1));
$('musicNext').addEventListener('click', () => cycleMusic(1));
$('discLeft').addEventListener('click', () => cycleDisc(-1));
$('discRight').addEventListener('click', () => cycleDisc(1));
$('diffL').addEventListener('click', () => changeDiff(-1));
$('diffR').addEventListener('click', () => changeDiff(1));

// Le clic droit sert à choisir le perso du CPU : on neutralise le menu contextuel.
$('scr-select').addEventListener('contextmenu', e => e.preventDefault());

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const target = $('tab-' + tab.dataset.tab);
    if (target) target.classList.add('active');
    if (tab.dataset.tab === 'keys') refreshKeysUI();
  });
});

// Bouton retour de la barre du haut. Il remonte d'un cran selon l'ecran, comme
// le ferait Echap : chaque ecran sait ou il doit ramener.
(function cablerRetour() {
  const b = $('btnRetour');
  if (!b) return;
  b.addEventListener('click', async () => {
    sfx('select');
    if (curScreen === 'chap') { doAct('learn'); return; }
    if (curScreen === 'maps') { showScreen('select'); refreshSelect(); return; }
    // En ligne, il remonte d'abord d'un panneau : quitter l'écran entier parce
    // qu'on voulait sortir du classement serait un cran de trop.
    if (curScreen === 'online') {
      const { panneauOuvert, montrerPanneau } = await import('./profil-ui.js');
      const ou = panneauOuvert();
      if (ou === 'onEtapeHote' || ou === 'onEtapeInvite') { montrerPanneau('onChoixArene'); return; }
      if (ou && ou !== 'onChoix') { montrerPanneau('onChoix'); return; }
    }
    doAct('back');
  });
})();
