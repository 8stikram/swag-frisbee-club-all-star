import { TAU, rand, gauss } from '../core/utils.js';

// Registre des skins de disque. Pour ajouter un skin : une entrée ici + un `case` dans drawSkinDisc.
export const DISC_SKINS = [
  { id: 'captain', name: 'Captain', emoji: '🛡️', colors: ['#0033a0', '#ffffff', '#d90000'] },
  { id: 'palestine_france', name: 'Palestine x France', emoji: '🇵🇸🇫🇷', colors: ['#000000', '#ffffff', '#009639', '#d90000', '#0033a0'] },
  { id: 'galaxy', name: 'Galaxie', emoji: '🌌', colors: ['#1a0033', '#4a00e0', '#8e2de2', '#00d4ff'] },
  { id: 'magma', name: 'Magma', emoji: '🌋', colors: ['#ff4500', '#ff8c00', '#ffd700', '#8b0000'] },
  { id: 'glitch', name: 'Glitch', emoji: '💠', colors: ['#ff00ff', '#00ffff', '#ff0000', '#00ff00', '#ffff00'] }
];

let currentSkinId = 'captain';

export function getSkinId() { return currentSkinId; }
export function setSkinId(id) { currentSkinId = id; saveSkin(); }
export function getSkin() { return DISC_SKINS.find(s => s.id === currentSkinId) || DISC_SKINS[0]; }
function loadSkin() { try { const s = localStorage.getItem('sbcbSkin'); if (s) currentSkinId = s; } catch (e) { } }
function saveSkin() { try { localStorage.setItem('sbcbSkin', currentSkinId); } catch (e) { } }
loadSkin();

export function drawSkinDisc(ctx, x, y, r, skinId, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.closePath();
  ctx.clip();

  switch (skinId) {
    case 'captain': {
      // Bouclier Captain America
      const grad = ctx.createRadialGradient(0, 0, r * 0.3, 0, 0, r);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#d90000');
      grad.addColorStop(0.6, '#ffffff');
      grad.addColorStop(0.8, '#0033a0');
      grad.addColorStop(1, '#0033a0');
      ctx.fillStyle = grad;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * TAU / 5;
        const a2 = a + TAU / 10;
        const outer = r * 0.4;
        const inner = r * 0.18;
        if (i === 0) ctx.moveTo(Math.cos(a) * outer, Math.sin(a) * outer);
        else ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
        ctx.lineTo(Math.cos(a2) * inner, Math.sin(a2) * inner);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'palestine_france': {
      const grad = ctx.createLinearGradient(-r, 0, r, 0);
      grad.addColorStop(0, '#000000');
      grad.addColorStop(0.15, '#000000');
      grad.addColorStop(0.25, '#ffffff');
      grad.addColorStop(0.35, '#ffffff');
      grad.addColorStop(0.45, '#009639');
      grad.addColorStop(0.55, '#009639');
      grad.addColorStop(0.65, '#d90000');
      grad.addColorStop(0.75, '#d90000');
      grad.addColorStop(0.85, '#0033a0');
      grad.addColorStop(1, '#0033a0');
      ctx.fillStyle = grad;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = '#d90000';
      ctx.beginPath();
      ctx.moveTo(-r, -r);
      ctx.lineTo(-r * 0.2, 0);
      ctx.lineTo(-r, r);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'galaxy': {
      const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#00d4ff');
      grad.addColorStop(0.3, '#8e2de2');
      grad.addColorStop(0.6, '#4a00e0');
      grad.addColorStop(1, '#1a0033');
      ctx.fillStyle = grad;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      for (let i = 0; i < 20; i++) {
        const a = rand(TAU), d = rand(r * 0.2, r * 0.9);
        const sx = Math.cos(a) * d, sy = Math.sin(a) * d;
        const sz = rand(1, 3);
        ctx.fillStyle = rand() > 0.7 ? '#ffd23e' : '#ffffff';
        ctx.globalAlpha = rand(0.3, 0.9);
        ctx.fillRect(sx, sy, sz, sz);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'magma': {
      const grad = ctx.createRadialGradient(0, r * 0.3, r * 0.1, 0, 0, r);
      grad.addColorStop(0, '#ffd700');
      grad.addColorStop(0.3, '#ff8c00');
      grad.addColorStop(0.6, '#ff4500');
      grad.addColorStop(1, '#8b0000');
      ctx.fillStyle = grad;
      ctx.fillRect(-r, -r, r * 2, r * 2);
      for (let i = 0; i < 12; i++) {
        const a = rand(TAU), d = rand(r * 0.2, r * 0.9);
        ctx.strokeStyle = rand() > 0.5 ? '#ffd700' : '#ff4500';
        ctx.globalAlpha = rand(0.2, 0.6);
        ctx.lineWidth = rand(1, 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const cx = Math.cos(a) * d, cy = Math.sin(a) * d;
        ctx.quadraticCurveTo(gauss() * r * 0.3, gauss() * r * 0.3, cx, cy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case 'glitch': {
      const cols = ['#ff00ff', '#00ffff', '#ff0000', '#00ff00', '#ffff00', '#ffffff'];
      for (let i = 0; i < 40; i++) {
        const xp = rand(-r, r), yp = rand(-r, r);
        const sz = rand(2, 6);
        ctx.fillStyle = cols[(Math.floor(rand(6)))];
        ctx.globalAlpha = rand(0.4, 0.9);
        ctx.fillRect(xp, yp, sz, sz);
      }
      for (let i = 0; i < 6; i++) {
        const yp = rand(-r, r);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = rand(0.1, 0.3);
        ctx.fillRect(-r, yp, r * 2, rand(1, 3));
      }
      ctx.globalAlpha = 1;
      break;
    }
    default: {
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
  }

  // Reflet
  const grad2 = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.05, -r * 0.1, -r * 0.1, r * 0.8);
  grad2.addColorStop(0, 'rgba(255,255,255,0.5)');
  grad2.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad2;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  ctx.restore();
}
