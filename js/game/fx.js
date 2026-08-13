import { G } from './state.js';
import { CY } from '../core/constants.js';
import { TAU, rand, gauss } from '../core/utils.js';

export function burst(x, y, c, n) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), s = rand(60, 340);
    G.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.3, .8), c, s: rand(2, 5), g: 300 });
  }
}
export function dust(x, y, n) {
  for (let i = 0; i < n; i++) G.particles.push({ x: x + gauss() * 10, y, vx: gauss() * 60, vy: -rand(20, 90), life: .4, c: '#cfe0ff', s: 2, g: 0 });
}
export function ring(x, y, c) { G.particles.push({ x, y, vx: 0, vy: 0, life: .4, c, s: 2, g: 0, type: 'ring' }); }
export function confetti(x, y) {
  const cols = ['#ff8c1a', '#35e0ff', '#ffd23e', '#ff5340', '#7bd66a'];
  for (let i = 0; i < 50; i++) G.particles.push({ x, y, vx: gauss() * 260, vy: -rand(100, 420), life: rand(.6, 1.4), c: cols[(rand(5)) | 0], s: rand(2, 5), g: 520 });
}
export function starBurst(x, y) {
  const cols = ['#ffd23e', '#ffffff', '#ff8c1a', '#35e0ff', '#ff5340'];
  for (let i = 0; i < 40; i++) {
    const a = rand(TAU), sp = rand(80, 300);
    G.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(.8, 1.8), c: cols[(rand(5)) | 0], s: rand(4, 9), g: 0, type: 'star' });
  }
}
export function addPopup(text, color, size = 18, dur = 1, y) {
  G.popups.push({ text, color, size, dur, t: 0, y: y === undefined ? CY - 90 : y });
}

export function updateFX(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    if (p.type === 'star') { p.x += p.vx * dt; p.y += p.vy * dt; }
    else { p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
  }
  if (G.particles.length > 450) G.particles.splice(0, G.particles.length - 450);
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const p = G.popups[i];
    p.t += dt;
    if (p.t > p.dur) G.popups.splice(i, 1);
  }
  if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
  if (G.comment) { G.comment.t += dt; if (G.comment.t > G.comment.dur) G.comment = null; }
  G.shake *= Math.exp(-6 * dt);
  G.goalFlash[0] = Math.max(0, G.goalFlash[0] - dt * 2);
  G.goalFlash[1] = Math.max(0, G.goalFlash[1] - dt * 2);
  if (G.lungeBonusTimer > 0) G.lungeBonusTimer -= dt; else G.lungeBonus = false;
}
