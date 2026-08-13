export const DEFAULT_KEYS = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  dash: 'ShiftLeft',
  charge: 'Space',
  pause: 'Escape'
};

export const ACTION_NAMES = {
  moveUp: '⬆ Monter',
  moveDown: '⬇ Descendre',
  moveLeft: '⬅ Gauche',
  moveRight: '➡ Droite',
  dash: '💨 Dash',
  charge: '⚡ Charger / Plongée',
  pause: '⏸ Pause'
};

const KEY_DISPLAY = {
  'ShiftLeft': 'Shift G', 'ShiftRight': 'Shift D',
  'ControlLeft': 'Ctrl G', 'ControlRight': 'Ctrl D',
  'AltLeft': 'Alt G', 'AltRight': 'Alt D',
  'MetaLeft': 'Cmd G', 'MetaRight': 'Cmd D',
  'Space': 'Espace', 'Escape': 'Échap',
  'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→',
  'KeyW': 'W', 'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D',
  'KeyK': 'K', 'KeyM': 'M', 'KeyP': 'P'
};

export function getKeyDisplay(code) { return KEY_DISPLAY[code] || code.replace('Key', '').replace('Digit', '') || code; }

export let keyMap = {};

export function loadKeyMap() {
  try {
    const s = localStorage.getItem('sbcbKeyMap');
    if (s) { const p = JSON.parse(s); keyMap = { ...DEFAULT_KEYS, ...p }; }
    else keyMap = { ...DEFAULT_KEYS };
  } catch (e) { keyMap = { ...DEFAULT_KEYS }; }
}
export function saveKeyMap() { try { localStorage.setItem('sbcbKeyMap', JSON.stringify(keyMap)); } catch (e) { } }
export function getKey(a) { return keyMap[a] || DEFAULT_KEYS[a]; }
export function setKey(a, c) {
  for (const k in keyMap) { if (k !== a && keyMap[k] === c) return k; }
  keyMap[a] = c; saveKeyMap(); return null;
}
export function resetKeyMap() { keyMap = { ...DEFAULT_KEYS }; saveKeyMap(); }
loadKeyMap();
