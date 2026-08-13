import { $, curScreen } from '../core/dom.js';
import { G, initMatch } from '../game/state.js';
import { COURT, CY, throwSpeed } from '../core/constants.js';
import { norm } from '../core/utils.js';
import { addPopup } from '../game/fx.js';
import { throwDisc } from '../game/actions.js';
import { doAct, pauseGame, isAdminMode, setAdminMode } from './menus.js';

let titleClicks = 0;
const titleEl = $('adminTitle');
titleEl.addEventListener('click', () => {
  titleClicks++;
  if (titleClicks === 5) {
    setAdminMode(!isAdminMode());
    titleClicks = 0;
    titleEl.style.color = isAdminMode() ? '#ffd23e' : '';
    setTimeout(() => { titleEl.style.color = ''; }, 500);
  }
});

function aimDirForAI() {
  const ai = G.p2.ai;
  const aimTarget = (ai.emaTarget.x && ai.emaTarget.y) ? ai.emaTarget : { x: (G.p2.side === 1 ? COURT.right : COURT.left), y: CY };
  return norm(aimTarget.x - G.p2.x, aimTarget.y - G.p2.y);
}

function giveDiscToAI() {
  if (G.disc.heldBy) G.disc.heldBy.holding = false;
  G.disc.heldBy = G.p2;
  G.p2.holding = true;
  G.disc.x = G.p2.x; G.disc.y = G.p2.y;
  G.disc.free = false;
}

function adminForceShoot() {
  if (!G.p2 || !G.p2.ai) { addPopup('❌ IA introuvable', '#ff5340', 12); return; }
  if (!G.p2.holding) giveDiscToAI();
  const ai = G.p2.ai;
  ai.state = 'STRIKE'; ai.forceShoot = true; G.p2.holdTimer = 5.0;
  const dir = aimDirForAI();
  const charge = Math.min(G.p2.charge + 0.5, 1);
  addPopup('💥 TIR IA FORCÉ !', '#ffd23e', 16, 0.8);
  throwDisc(G.p2, dir, throwSpeed(charge, G.p2.char.power));
  ai.state = 'RECOVER'; G.p2.holdTimer = 0; ai.forceShoot = false;
  ai.emaTarget.x = 0; ai.emaTarget.y = 0;
}

function adminGiveDisc() {
  if (!G.p2) { addPopup('❌ IA introuvable', '#ff5340', 12); return; }
  if (G.p2.holding) { addPopup('⚠️ IA a déjà le disque', '#9fb4dd', 12); return; }
  giveDiscToAI();
  addPopup('🎯 Disque donné à l\'IA', '#7bd66a', 14);
}

function adminReset() {
  if (!G.p2) return;
  initMatch(false, G.matchChar, G.matchCPU, G.matchDiff, G.isJ2J);
  addPopup('🔄 Match réinitialisé', '#ffd23e', 14);
}

function adminLogs() {
  console.log('[ADMIN] === STATS ===');
  console.log('Score:', G.p1.score, '-', G.p2.score);
  if (G.p2.ai) console.log('State IA:', G.p2.ai.state, 'holdTimer:', G.p2.holdTimer, 'charge:', G.p2.charge);
  console.log('Disc free:', G.disc.free, 'heldBy:', G.disc.heldBy ? G.disc.heldBy.char.short : 'none');
  console.log('Rally:', G.rally, 'maxRally:', G.maxRally);
}

function adminStats() {
  const msg = `Score: ${G.p1.score} - ${G.p2.score}\nIA state: ${G.p2.ai ? G.p2.ai.state : 'humain'}\nholdTimer: ${G.p2.holdTimer.toFixed(2)}\ncharge: ${G.p2.charge.toFixed(2)}\nRally: ${G.rally}\nmaxRally: ${G.maxRally}\nDisc: ${G.disc.free ? 'libre' : 'tenu par ' + G.disc.heldBy.char.short}`;
  addPopup('📊 ' + msg, '#cfe0ff', 10, 2);
  console.log('[ADMIN] Stats:', msg);
}

function adminTogglePause() {
  if (G.state === 'play' || G.state === 'serve') pauseGame();
  else if (curScreen === 'pause') doAct('resume');
}

function adminSlowmo() { G.timescale = 0.3; addPopup('🐢 Slowmo activé', '#35e0ff', 12); }
function adminNormal() { G.timescale = 1; addPopup('▶️ Vitesse normale', '#7bd66a', 12); }

$('admin-forceShoot').addEventListener('click', adminForceShoot);
$('admin-giveDisc').addEventListener('click', adminGiveDisc);
$('admin-reset').addEventListener('click', adminReset);
$('admin-logs').addEventListener('click', adminLogs);
$('admin-stats').addEventListener('click', adminStats);
$('admin-togglePause').addEventListener('click', adminTogglePause);
$('admin-slowmo').addEventListener('click', adminSlowmo);
$('admin-normal').addEventListener('click', adminNormal);
