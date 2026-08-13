import { $, showScreen } from '../core/dom.js';
import { G, Mouse, initMatch } from '../game/state.js';
import { DIFFS } from '../core/constants.js';
import { CHARS, ROSTER, portraitURL } from '../data/characters.js';
import { SPECIALS } from '../data/specials.js';
import { DISC_SKINS, getSkinId, setSkinId, drawSkinDisc } from '../data/skins.js';
import { getKey } from '../data/keymap.js';
import { sfx } from '../audio/audio.js';
import { addPopup } from '../game/fx.js';
import { requestLock } from '../game/input.js';
import { refreshKeysUI } from './keybind-ui.js';

let selCharPlayer = 'naruto', selCharCPU = 'leon', diffIdx = 1;
let modeJ2J = false;
let adminMode = false;

export function isAdminMode() { return adminMode; }
export function setAdminMode(v) { adminMode = v; G.adminMode = v; $('admin-panel').classList.toggle('visible', v); }

function pickPlayer(c) { selCharPlayer = c; sfx('move'); refreshSelect(); }
function pickCPU(c) { selCharCPU = c; sfx('move'); refreshSelect(); }
function changeDiff(d) { diffIdx = (diffIdx + d + DIFFS.length) % DIFFS.length; sfx('move'); refreshSelect(); }

export function refreshSelect() {
  const cpu = CHARS[selCharCPU];
  $('cpu-ico').textContent = cpu.icon;
  $('cpu-uni').textContent = cpu.universe;
  $('cpu-name').innerHTML = cpu.name.replace(/ /g, '<br>');
  $('cpu-img').src = portraitURL(selCharCPU);
  const player = CHARS[selCharPlayer];
  $('player-ico').textContent = player.icon;
  $('player-uni').textContent = player.universe;
  $('player-name').innerHTML = player.name.replace(/ /g, '<br>');
  $('player-img').src = portraitURL(selCharPlayer);
  $('diffName').textContent = DIFFS[diffIdx].label;
  const sp = SPECIALS[player.ult];
  $('specialInfo').innerHTML = `${player.icon} <b>${sp.name}</b> — ${sp.desc}`;
  renderSkinSelector();
}

export function selectScreenKey(code) {
  const i = ROSTER.indexOf(selCharPlayer), j = ROSTER.indexOf(selCharCPU);
  const left = getKey('moveLeft'), right = getKey('moveRight');
  if (code === 'ArrowLeft') pickCPU(ROSTER[(j + ROSTER.length - 1) % ROSTER.length]);
  else if (code === 'ArrowRight') pickCPU(ROSTER[(j + 1) % ROSTER.length]);
  else if (code === left) pickPlayer(ROSTER[(i + ROSTER.length - 1) % ROSTER.length]);
  else if (code === right) pickPlayer(ROSTER[(i + 1) % ROSTER.length]);
  else if (code === 'ArrowUp' || code === getKey('moveUp')) changeDiff(-1);
  else if (code === 'ArrowDown' || code === getKey('moveDown')) changeDiff(1);
  else if (code === 'Enter' || code === 'Space') { sfx('select'); doAct('fight'); }
  else if (code === getKey('pause')) doAct('back');
}

export function pauseGame() { Mouse.down = false; showScreen('pause'); }

export function doAct(act) {
  switch (act) {
    case 'play': sfx('select'); modeJ2J = false; showScreen('select'); refreshSelect(); break;
    case 'j2j': sfx('select'); modeJ2J = true; showScreen('select'); refreshSelect(); break;
    case 'options': sfx('select'); showScreen('options'); refreshKeysUI(); break;
    case 'back': sfx('select'); showScreen('title'); break;
    case 'fight': sfx('select'); showScreen(null); initMatch(false, selCharPlayer, selCharCPU, diffIdx, modeJ2J); requestLock(); $('admin-panel').classList.toggle('visible', adminMode); break;
    case 'resume': sfx('select'); showScreen(null); requestLock(); break;
    case 'restart': sfx('select'); showScreen(null); initMatch(false, G.matchChar, G.matchCPU, G.matchDiff, G.isJ2J); requestLock(); break;
    case 'rematch': sfx('select'); showScreen(null); initMatch(false, G.matchChar, G.matchCPU, G.matchDiff, G.isJ2J); requestLock(); break;
    case 'menu': sfx('select'); initMatch(true); showScreen('title'); $('admin-panel').classList.remove('visible'); break;
  }
}

export function renderSkinSelector() {
  const container = $('skinSelector');
  if (!container) return;
  container.innerHTML = '';
  DISC_SKINS.forEach(skin => {
    const btn = document.createElement('div');
    btn.className = 'skin-btn' + (skin.id === getSkinId() ? ' active' : '');
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    drawSkinDisc(c.getContext('2d'), 20, 20, 18, skin.id, 0);
    btn.appendChild(c);
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = skin.name;
    btn.appendChild(label);
    btn.addEventListener('click', () => {
      setSkinId(skin.id);
      renderSkinSelector();
      addPopup('🎨 Skin : ' + skin.name, '#ffd23e', 12);
    });
    container.appendChild(btn);
  });
}

$('cpuLeft').addEventListener('click', () => pickCPU(ROSTER[(ROSTER.indexOf(selCharCPU) + ROSTER.length - 1) % ROSTER.length]));
$('cpuRight').addEventListener('click', () => pickCPU(ROSTER[(ROSTER.indexOf(selCharCPU) + 1) % ROSTER.length]));
$('playerLeft').addEventListener('click', () => pickPlayer(ROSTER[(ROSTER.indexOf(selCharPlayer) + ROSTER.length - 1) % ROSTER.length]));
$('playerRight').addEventListener('click', () => pickPlayer(ROSTER[(ROSTER.indexOf(selCharPlayer) + 1) % ROSTER.length]));
$('diffL').addEventListener('click', () => changeDiff(-1));
$('diffR').addEventListener('click', () => changeDiff(1));

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const target = document.getElementById('tab-' + tab.dataset.tab);
    if (target) target.classList.add('active');
    if (tab.dataset.tab === 'keys') refreshKeysUI();
  });
});
