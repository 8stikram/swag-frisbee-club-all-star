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

/* ---------- écran titre ---------- */
function renderTitleHero() {
  const ck = ROSTER[(Math.random() * ROSTER.length) | 0];
  drawSprite($('titleHero'), ck, 16);
}

/* ---------- sélection des personnages ---------- */
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
    if (selCharPlayer === ck) { cell.classList.add('sel1'); const t = document.createElement('span'); t.className = 'tag t1'; t.textContent = '1P'; cell.appendChild(t); }
    if (selCharCPU === ck) { cell.classList.add('sel2'); const t = document.createElement('span'); t.className = 'tag t2'; t.textContent = '2P'; cell.appendChild(t); }
    cell.addEventListener('click', () => pickPlayer(ck));
    cell.addEventListener('contextmenu', e => { e.preventDefault(); pickCPU(ck); });
    grid.appendChild(cell);
  }
  // Case aléatoire : tire les deux camps d'un coup.
  const rnd = document.createElement('div');
  rnd.className = 'cell rndCell';
  rnd.innerHTML = '<span class="qm">?</span>';
  rnd.title = 'Personnages aléatoires';
  rnd.addEventListener('click', () => {
    selCharPlayer = ROSTER[(Math.random() * ROSTER.length) | 0];
    selCharCPU = ROSTER[(Math.random() * ROSTER.length) | 0];
    sfx('select'); refreshSelect();
  });
  grid.appendChild(rnd);
}

export function refreshSelect() {
  const p1 = CHARS[selCharPlayer], p2 = CHARS[selCharCPU];
  $('selUni1').textContent = p1.universe;
  $('selUni2').textContent = p2.universe;
  $('selName1').textContent = p1.short;
  $('selName2').textContent = p2.short;
  drawSprite($('selHero1'), selCharPlayer, 12);
  drawSprite($('selHero2'), selCharCPU, 12);
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
  else if (code === getKey('pause')) doAct('back');
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
    case 'play': sfx('select'); modeJ2J = false; showScreen('select'); refreshSelect(); break;
    case 'j2j': sfx('select'); modeJ2J = true; showScreen('select'); refreshSelect(); break;
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
