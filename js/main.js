import { showScreen } from './core/dom.js';
import { initMatch } from './game/state.js';
import { frame } from './game/loop.js';
import { refreshSelect, brancherApercuTerrain } from './ui/menus.js';
import { peindreTerrain } from './render/render.js';
import { lancerIntro } from './ui/intro.js';
import { brancherDos } from './casino/cartes.js';
import { equipeDe } from './data/inventaire.js';
import { dosHTML } from './ui/inventaire-visuels.js';
import './game/input.js';
import './ui/keybind-ui.js';
import './ui/admin.js';
import './ui/online-ui.js';
import './ui/profil-ui.js';
import './ui/amis-ui.js';
import './ui/compte-pop.js';
import './ui/cadrage.js';
import './ui/alerte.js';

// L'écran de choix du terrain peint ses vignettes avec le moteur de rendu.
// Branché ici plutôt qu'importé là-bas : voir brancherApercuTerrain().
brancherApercuTerrain(peindreTerrain);

// Le dos de cartes acheté à la boutique s'applique aux tables du casino. Le
// carton (casino/cartes.js) ne dépend de rien exprès : c'est ici qu'on lui dit
// où regarder.
brancherDos(() => {
  const id = (equipeDe('dos') || 'dos:runes').split(':')[1];
  return id === 'runes' ? null : dosHTML(id);
});

initMatch(true);
showScreen('title');
refreshSelect();
requestAnimationFrame(frame);

// Séquence d'ouverture, jouée une fois avant le menu.
lancerIntro();

console.log('=== Swag Frisbee Club All Star ===');
console.log('5 clics sur le titre pour le Mode Admin.');
console.log('Options → Touches pour personnaliser.');
