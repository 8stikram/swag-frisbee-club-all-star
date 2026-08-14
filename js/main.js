import { showScreen } from './core/dom.js';
import { initMatch } from './game/state.js';
import { frame } from './game/loop.js';
import { refreshSelect } from './ui/menus.js';
import './game/input.js';
import './ui/keybind-ui.js';
import './ui/admin.js';

initMatch(true);
showScreen('title');
refreshSelect();
requestAnimationFrame(frame);

console.log('=== Swag Frisbee Club All Star ===');
console.log('5 clics sur le titre pour le Mode Admin.');
console.log('Options → Touches pour personnaliser.');
