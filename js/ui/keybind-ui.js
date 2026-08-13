import { $ } from '../core/dom.js';
import { ACTION_NAMES, DEFAULT_KEYS, keyMap, getKey, setKey, saveKeyMap, resetKeyMap, getKeyDisplay } from '../data/keymap.js';
import { addPopup } from '../game/fx.js';

let capturingAction = null;
let captureListener = null;

export function isCapturing() { return capturingAction !== null; }

export function refreshKeysUI() {
  const grid = $('keysGrid');
  if (!grid) return;
  grid.innerHTML = '';
  for (const action in ACTION_NAMES) {
    const row = document.createElement('div');
    row.className = 'keys-row';
    const actLabel = document.createElement('span');
    actLabel.className = 'action';
    actLabel.textContent = ACTION_NAMES[action];
    const keySpan = document.createElement('span');
    keySpan.className = 'key';
    keySpan.textContent = getKeyDisplay(getKey(action));
    keySpan.dataset.action = action;
    const btn = document.createElement('button');
    btn.className = 'kbtn';
    btn.textContent = 'Modifier';
    btn.dataset.action = action;
    btn.addEventListener('click', () => startCapture(action));
    row.appendChild(actLabel); row.appendChild(keySpan); row.appendChild(btn);
    grid.appendChild(row);
  }
}

function startCapture(action) {
  if (capturingAction) stopCapture();
  capturingAction = action;
  document.querySelectorAll('.keys-row .key').forEach(el => el.classList.toggle('capturing', el.dataset.action === action));
  document.querySelectorAll('.keys-row .kbtn').forEach(b => { b.disabled = true; b.style.opacity = '0.5'; });
  addPopup('Appuie sur une touche pour ' + ACTION_NAMES[action], '#ffd23e', 12, 1.5);
  if (captureListener) window.removeEventListener('keydown', captureListener, true);
  captureListener = e => {
    e.preventDefault(); e.stopPropagation();
    const code = e.code;
    if (code === 'Escape') { stopCapture(); addPopup('Annulé', '#9fb4dd', 11, 0.8); return; }
    const conflict = setKey(action, code);
    if (conflict) { showConflictPopup(action, conflict, code); stopCapture(); }
    else { stopCapture(); refreshKeysUI(); addPopup('✅ Touche modifiée !', '#7bd66a', 11, 0.8); }
  };
  window.addEventListener('keydown', captureListener, true);
}

function stopCapture() {
  if (captureListener) { window.removeEventListener('keydown', captureListener, true); captureListener = null; }
  capturingAction = null;
  document.querySelectorAll('.keys-row .key').forEach(el => el.classList.remove('capturing'));
  document.querySelectorAll('.keys-row .kbtn').forEach(b => { b.disabled = false; b.style.opacity = '1'; });
}

function showConflictPopup(action, conflictAction, newKey) {
  const popup = $('conflictPopup');
  $('conflictMsg').innerHTML = `La touche <b>${getKeyDisplay(newKey)}</b> est déjà utilisée par <b>${ACTION_NAMES[conflictAction]}</b>.`;
  popup.classList.add('visible');
  $('conflictReplace').onclick = () => {
    popup.classList.remove('visible');
    keyMap[action] = newKey;
    keyMap[conflictAction] = DEFAULT_KEYS[conflictAction];
    saveKeyMap();
    refreshKeysUI();
    addPopup('✅ Conflit résolu !', '#7bd66a', 11, 0.8);
  };
  $('conflictCancel').onclick = () => {
    popup.classList.remove('visible');
    addPopup('❌ Modification annulée', '#9fb4dd', 11, 0.8);
    refreshKeysUI();
  };
}

$('resetKeys').addEventListener('click', () => {
  if (confirm('Réinitialiser toutes les touches par défaut ?')) {
    resetKeyMap();
    addPopup('↺ Touches réinitialisées', '#ffd23e', 12);
    refreshKeysUI();
  }
});
