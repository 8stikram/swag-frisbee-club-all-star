import { $, showScreen } from '../core/dom.js';
import { G, Mouse, initMatch } from '../game/state.js';
import { DIFFS } from '../core/constants.js';
import { CHARS, ROSTER } from '../data/characters.js';
import { SPECIALS } from '../data/specials.js';
import { DISC_SKINS, getSkinId, setSkinId, drawSkinDisc } from '../data/skins.js';
import { MAPS, setMapId } from '../data/maps.js';
import { getKey } from '../data/keymap.js';
import { MUSIC_TRACKS, getTrackId } from '../data/music.js';
import { sfx, playTrack, stopTrack } from '../audio/audio.js';
import { addPopup } from '../game/fx.js';
import { requestLock } from '../game/input.js';
import { refreshKeysUI } from './keybind-ui.js';

let selCharPlayer = 'naruto', selCharCPU = 'leon', diffIdx = 1;
let modeJ2J = false;
let adminMode = false;

export function isAdminMode() { return adminMode; }
export function setAdminMode(v) { adminMode = v; G.adminMode = v; $('admin-panel').classList.toggle('visible', v); }

/* ---------- outils de dessin ---------- */
function drawSprite(canvasEl, ck, scale) {
  const src = CHARS[ck].frames.idle;
  canvasEl.width = src.width * scale;
  canvasEl.height = src.height * scale;
  const c = canvasEl.getContext('2d');
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
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => { });
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
}

// « Clac » doux de validation : deux notes courtes et rondes, sans agressivité.
function clac() { sfx('select'); }

function validate(side, ck, isRandom) {
  if (side === 1) { selCharPlayer = ck; lockedP1 = true; rndP1 = !!isRandom; turn = 2; }
  else { selCharCPU = ck; lockedP2 = true; rndP2 = !!isRandom; turn = 0; }
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
  if (lockedP2) return false;
  if (turn === 2 && lockedP1) { lockedP1 = false; rndP1 = false; turn = 1; sfx('deny'); refreshSelect(); return true; }
  return false;
}

function pickPlayer(c) { selCharPlayer = c; sfx('move'); refreshSelect(); }
function pickCPU(c) { selCharCPU = c; sfx('move'); refreshSelect(); }
function changeDiff(d) { diffIdx = (diffIdx + d + DIFFS.length) % DIFFS.length; sfx('move'); refreshSelect(); }

function renderStats(el, ch) {
  const rows = [['VITESSE', ch.stats.spd, '#5df08a'], ['PUISSANCE', ch.stats.pow, '#ff5f6d'], ['CONTRÔLE', ch.stats.ctl, '#35e0ff']];
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
    if (lockedP1 && selCharPlayer === ck) markPicked(cell, 'p1', '1P');
    if (lockedP2 && selCharCPU === ck) markPicked(cell, modeJ2J ? 'p2' : 'cpu', modeJ2J ? '2P' : 'CPU');
    cell.addEventListener('click', () => {
      if (turn === 1) validate(1, ck);
      else if (turn === 2) validate(2, ck);
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
  rnd.addEventListener('click', () => {
    const pick = ROSTER[(Math.random() * ROSTER.length) | 0];
    if (turn === 1) validate(1, pick, true);
    else if (turn === 2) validate(2, pick, true);
  });
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
  $('selUni1').textContent = p1.universe;
  $('selUni2').textContent = p2.universe;
  // Un camp tiré au sort reste caché derrière un « ? » arc-en-ciel : la
  // révélation n'a lieu qu'au lancement du match.
  $('selName1').textContent = rndP1 ? '???' : p1.short;
  $('selName2').textContent = rndP2 ? '???' : p2.short;
  drawSprite($('selHero1'), selCharPlayer, 12);
  drawSprite($('selHero2'), selCharCPU, 12);
  showRandomMask(0, rndP1);
  showRandomMask(1, rndP2);

  // Tour de choix : côté verrouillé grisé, bandeau clignotant mis à jour.
  const sides = document.querySelectorAll('.scr-select .side');
  if (sides[0]) sides[0].classList.toggle('locked', turn === 2);
  if (sides[1]) sides[1].classList.toggle('locked', turn === 1);
  const hint = $('turnHint');
  if (hint) {
    hint.className = 'turnHint ' + (turn === 1 ? 'p1' : turn === 2 ? 'p2' : 'done');
    hint.textContent = turn === 1 ? 'AU TOUR DE 1P'
      : turn === 2 ? (modeJ2J ? 'AU TOUR DE 2P' : 'AU TOUR DU CPU') : '';
  }
  renderStats($('selStats1'), p1);
  renderStats($('selStats2'), p2);
  renderCharGrid();

  const sp = SPECIALS[p1.ult];
  $('specialName').textContent = sp.name;
  $('specialDesc').textContent = sp.desc;
  $('diffName').textContent = DIFFS[diffIdx].label;

  // Halos + fond en dégradé de la couleur J1 vers celle de J2.
  $('selGlow1').style.background = p1.color;
  $('selGlow2').style.background = p2.color;
  document.querySelector('.bg-select').style.background =
    `linear-gradient(100deg, ${pale(p1.color, .55)} 0%, ${pale(p1.color, .44)} 26%, ` +
    `${pale(p2.color, .44)} 74%, ${pale(p2.color, .55)} 100%)`;
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
const DISC_CHOICES = [...DISC_SKINS.map(s => ({ id: s.id, name: s.name })), { id: '__random', name: 'ALÉATOIRE' }];
let discIdx = Math.max(0, DISC_CHOICES.findIndex(c => c.id === getSkinId()));

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
  if (DISC_CHOICES[discIdx].id === '__random') {
    setSkinId(DISC_SKINS[(Math.random() * DISC_SKINS.length) | 0].id);
  }
}

/* ---------- sélection du terrain ---------- */
const MAP_CHOICES = [...MAPS, { id: '__random', name: 'ALÉATOIRE' }];
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
    const el = document.createElement('div');
    el.className = 'thumb' + (i === mapIdx ? ' on' : '');
    if (c.id === '__random') {
      el.innerHTML = '<div class="rndFace">?</div><div class="label">ALÉATOIRE</div>';
    } else {
      const cv = document.createElement('canvas'); cv.width = 160; cv.height = 160;
      drawArena(cv, c, false);
      el.appendChild(cv);
      const label = document.createElement('div'); label.className = 'label'; label.textContent = c.name;
      el.appendChild(label);
    }
    el.addEventListener('click', () => { mapIdx = i; sfx('move'); refreshMaps(); });
    row.appendChild(el);
  });
}

export function refreshMaps() {
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
  }
  renderMapThumbs();
}

function resolveMap() {
  const c = MAP_CHOICES[mapIdx];
  setMapId(c.id === '__random' ? MAPS[(Math.random() * MAPS.length) | 0].id : c.id);
}

export function mapsScreenKey(code) {
  if (code === 'ArrowLeft') { mapIdx = (mapIdx + MAP_CHOICES.length - 1) % MAP_CHOICES.length; sfx('move'); refreshMaps(); }
  else if (code === 'ArrowRight') { mapIdx = (mapIdx + 1) % MAP_CHOICES.length; sfx('move'); refreshMaps(); }
  else if (code === 'Enter' || code === 'Space') { sfx('select'); doAct('startMatch'); }
  else if (code === getKey('pause')) { sfx('select'); showScreen('select'); }
}

/* ---------- choix de la musique ----------
   Les pistes viennent de data/music.js — en ajouter une là suffit à
   l'ajouter ici. "Aucune" (id null) coupe la musique sans couper les SFX. */
const MUSIC_CHOICES = [...MUSIC_TRACKS, { id: null, name: 'Aucune musique' }];
let musicIdx = Math.max(0, MUSIC_CHOICES.findIndex(t => t.id === getTrackId()));

function renderMusic() {
  const c = MUSIC_CHOICES[musicIdx];
  $('musicName').textContent = c.name;
  if (c.id) playTrack(c.id); else stopTrack();
}
function cycleMusic(d) {
  musicIdx = (musicIdx + d + MUSIC_CHOICES.length) % MUSIC_CHOICES.length;
  sfx('move'); renderMusic();
}

/* ---------- navigation ---------- */
export function pauseGame() { Mouse.down = false; showScreen('pause'); }

function startMatch() {
  resolveSkin();
  resolveMap();
  showScreen(null);
  initMatch(false, selCharPlayer, selCharCPU, diffIdx, modeJ2J);
  requestLock();
  $('admin-panel').classList.toggle('visible', adminMode);
}

export function doAct(act) {
  switch (act) {
    case 'play': sfx('select'); modeJ2J = false; resetSelectTurn(); showScreen('select'); refreshSelect(); break;
    case 'j2j': sfx('select'); modeJ2J = true; resetSelectTurn(); showScreen('select'); refreshSelect(); break;
    case 'options': sfx('select'); showScreen('options'); refreshKeysUI(); break;
    case 'back': sfx('select'); showScreen('title'); break;
    case 'fight': sfx('select'); showScreen('maps'); refreshMaps(); break;
    case 'startMatch': sfx('select'); startMatch(); break;
    case 'resume': sfx('select'); showScreen(null); requestLock(); break;
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
