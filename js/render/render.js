import { G, Mouse } from '../game/state.js';
import { ctx, W, H } from '../core/dom.js';
import { COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, GOAL_DEPTH, DISC_RADIUS, DISC_BIG_RADIUS, TARGET } from '../core/constants.js';
import { TAU, lerp, clamp, gauss } from '../core/utils.js';
import { getMap } from '../data/maps.js';
import { getSkinId, drawSkinDisc } from '../data/skins.js';

ctx.imageSmoothingEnabled = false;
const SCALE = 1.6;

function drawStars() {
  for (const s of G.stars) {
    const bright = 0.5 + 0.5 * Math.sin(s.twinkle);
    ctx.globalAlpha = bright;
    ctx.fillStyle = s.color || '#ffffff';
    ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

function drawCrowd() {
  for (const p of G.crowd) {
    // Ola : une vague de lumière qui balaie la foule sur l'axe X, portée par G.waveX.
    const waveBoost = clamp(1 - Math.abs(p.x - G.waveX) / 90, 0, 1);
    const bob = Math.sin(G.now * 3 + p.ph) * (p.s * 0.5) - waveBoost * p.s * 1.8;
    ctx.globalAlpha = 0.55 + waveBoost * 0.45;
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.s / 2, p.y + bob - p.s / 2, p.s, p.s);
  }
  ctx.globalAlpha = 1;
}

function drawCourt() {
  const th = getMap().theme;
  const grd = ctx.createRadialGradient(CX, CY, 100, CX, CY, 500);
  grd.addColorStop(0, th.bgInner);
  grd.addColorStop(1, th.bgOuter);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  drawStars();
  drawCrowd();
  ctx.fillStyle = th.floor;
  ctx.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);
  ctx.strokeStyle = th.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);
  ctx.beginPath(); ctx.moveTo(CX, COURT.top); ctx.lineTo(CX, COURT.bottom); ctx.stroke();
  ctx.beginPath(); ctx.arc(CX, CY, 58, 0, TAU); ctx.stroke();
  drawGoalSide(1);
  drawGoalSide(2);
}

function drawGoalSide(side) {
  const m = getMap(), th = m.theme;
  const x = side === 1 ? COURT.left : COURT.right;
  const gx = side === 1 ? x - GOAL_DEPTH : x;
  const flash = G.goalFlash[side === 1 ? 0 : 1];
  ctx.fillStyle = th.goalFill;
  ctx.fillRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
  ctx.strokeStyle = th.goalStroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
  ctx.font = '10px "Press Start 2P",monospace';
  ctx.textAlign = 'center';
  for (const z of m.zones) {
    const y1 = CY + z.from, y2 = CY + z.to;
    ctx.fillStyle = z.color;
    ctx.globalAlpha = .5 + flash * .2;
    ctx.fillRect(gx + 4, y1 + 4, GOAL_DEPTH - 8, y2 - y1 - 8);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillText(String(z.points), gx + GOAL_DEPTH / 2, (y1 + y2) / 2 + 4);
  }
  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * .15})`;
    ctx.fillRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
  }
}

function drawShadow(x, y, r) {
  const k = (x - CX) / CX;
  ctx.fillStyle = 'rgba(0,0,20,.33)';
  ctx.beginPath();
  ctx.ellipse(x + k * 13, y + 26, r * (1 + Math.abs(k) * .55), r * .36, 0, 0, TAU);
  ctx.fill();
}

function drawGhosts(p) {
  const c = p.char;
  for (const g of p.ghosts) {
    const img = c.frames[g.fr];
    ctx.save();
    ctx.globalAlpha = clamp(g.life / .55, 0, 1) * .35;
    ctx.translate(g.x, g.y - 30 * SCALE);
    if (g.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -24 * SCALE, 0, 48 * SCALE, 60 * SCALE);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawPlayer(p) {
  const c = p.char;
  drawGhosts(p);
  drawShadow(p.x, p.y, 17 * SCALE);
  let fr = p.forceFr;
  if (!fr) {
    fr = 'idle';
    if (p.holding && (p.charging || p.throwPoseT > 0)) fr = 'throw';
    else if (p.moving) fr = (Math.floor(p.walk) % 2) ? 'run1' : 'run2';
  }
  const img = c.frames[fr];
  ctx.save();
  ctx.translate(p.x, p.y - 30 * SCALE);
  if (p.face < 0) ctx.scale(-1, 1);
  if (p.charging && !G.replay) ctx.translate(gauss() * p.charge * 2.4, gauss() * p.charge * 2.4);
  if (p.stun > 0) ctx.rotate(Math.sin(G.now * 14) * .12);
  ctx.drawImage(img, -24 * SCALE, 0, 48 * SCALE, 60 * SCALE);
  ctx.restore();
  if (p.charging && p.charge > 0 && !G.replay) {
    ctx.strokeStyle = p.charge >= 1 ? '#ff5340' : c.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 32 * SCALE, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge);
    ctx.stroke();
  }
  if (p.human && !G.demo && !G.replay) {
    ctx.fillStyle = c.accent;
    ctx.font = '8px "Press Start 2P",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(G.isJ2J && p.side === 2 ? 'J2' : 'P1', p.x, p.y - 48 * SCALE);
  }
}

function drawTrail() {
  const n = G.trail.length;
  for (let i = 0; i < n; i++) {
    const t = G.trail[i];
    const k = (i + 1) / n;
    ctx.globalAlpha = k * .5;
    ctx.fillStyle = t.c;
    const s = 3 + k * 5;
    ctx.fillRect(t.x - s / 2, t.y - s / 2, s, s);
  }
  ctx.globalAlpha = 1;
}

function drawDisc() {
  const d = G.disc;
  const r = d.big ? DISC_BIG_RADIUS : DISC_RADIUS;
  drawTrail();
  if (!d.heldBy) drawShadow(d.x, d.y - 12, r + 2);
  if (d.kind === 'kurama') {
    drawDiscObj(d.x, d.y, d.spin, 1, '#ff8c1a', r);
    ctx.strokeStyle = 'rgba(255,140,26,.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(d.x, d.y, r + 8 + Math.sin(G.now * 20) * 4, G.now * 9, G.now * 9 + 4.2); ctx.stroke();
  } else if (d.super) {
    drawDiscObj(d.x, d.y, d.spin, 1, '#ff5340', r);
    ctx.strokeStyle = 'rgba(255,83,64,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(d.x, d.y, r + 4 + Math.sin(G.now * 24) * 2, G.now * 12, G.now * 12 + 4.6); ctx.stroke();
  } else {
    drawSkinDisc(ctx, d.x, d.y, r, getSkinId(), d.spin);
    ctx.strokeStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, TAU); ctx.stroke();
  }
}

function drawDiscObj(x, y, spin, alpha = 1, tint = null, r) {
  if (!r) r = DISC_RADIUS;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  const sq = Math.abs(Math.cos(spin));
  if (tint) { ctx.shadowColor = tint; ctx.shadowBlur = 18; }
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 0, r + 2, (r + 2) * Math.max(.35, sq), 0, 0, TAU); ctx.fill();
  const gr = ctx.createRadialGradient(-r * .4, -r * .4 * sq, 1, 0, 0, r);
  gr.addColorStop(0, 'rgba(255,255,255,.95)');
  gr.addColorStop(.4, tint || '#ff8c1a');
  gr.addColorStop(1, tint || '#ff8c1a');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.ellipse(0, 0, r - 2, (r - 2) * Math.max(.3, sq), 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(0, 0, r - 3, (r - 3) * Math.max(.3, sq), 0, Math.PI * 1.05, Math.PI * 1.55); ctx.stroke();
  ctx.restore();
}

function drawDecoys() {
  // Même look que le vrai disque Matilda : le leurre doit tromper l'œil.
  for (const o of G.decoys) {
    drawShadow(o.x, o.y - 12, DISC_RADIUS + 2);
    drawDiscObj(o.x, o.y, G.now * 6, 1, '#8dff6a', DISC_RADIUS);
  }
}

function drawLeg() {
  const L = G.leg;
  if (!L) return;
  const legW = 46, legH = 130;
  if (L.phase === 'shadow') {
    const k = clamp(L.t / .55, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(G.now * 16);
    ctx.save();
    ctx.globalAlpha = .35 + k * .4;
    ctx.fillStyle = '#ff6a7a';
    ctx.beginPath();
    ctx.ellipse(L.x, L.yTarget, (legW * .55) * k, (legW * .22) * k, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,106,122,${.5 + pulse * .4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(L.x, L.yTarget, (legW * .55) * k + 4, (legW * .22) * k + 2, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  } else if (L.phase === 'fall') {
    const k = clamp(L.t / .16, 0, 1);
    const y = lerp(L.yTarget - 420, L.yTarget - legH * .3, k);
    drawLegSprite(L.x, y, 1);
    // Traînée de vitesse.
    for (let i = 1; i <= 3; i++) {
      const ty = lerp(L.yTarget - 420, L.yTarget - legH * .3, clamp(k - i * .08, 0, 1));
      drawLegSprite(L.x, ty, .18 / i);
    }
  } else if (L.phase === 'impact') {
    const k = clamp(L.t / .4, 0, 1);
    drawLegSprite(L.x, L.yTarget - legH * .3 * (1 - k), 1 - k, 1 + k * .3);
  }
}

function drawLegSprite(x, y, alpha, squash = 1) {
  const legW = 46, legH = 130;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(1, squash);
  ctx.fillStyle = '#f0c090';
  ctx.fillRect(-legW / 2, -legH, legW, legH * .8);
  ctx.fillStyle = '#e8b8d0';
  ctx.fillRect(-legW / 2 - 3, -legH * .28, legW + 6, legH * .22);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-legW / 2 - 5, -legH * .09, legW + 10, legH * .16);
  ctx.strokeStyle = 'rgba(0,0,0,.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(-legW / 2, -legH, legW, legH * .8);
  ctx.restore();
}

function drawParticles() {
  for (const p of G.particles) {
    const a = clamp(p.life * 2.5, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  }
  ctx.globalAlpha = 1;
}

function drawHUD() {
  ctx.textAlign = 'left';
  const panel = (p, x, alignRight) => {
    const c = p.char;
    ctx.drawImage(c.frames.idle, 0, 0, 16, 20, alignRight ? x + 150 : x + 6, 8, 24, 30);
    ctx.fillStyle = c.accent;
    ctx.font = '10px "Press Start 2P",monospace';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillText(c.short + ' ' + c.icon, alignRight ? x + 144 : x + 36, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Press Start 2P",monospace';
    ctx.fillText(String(p.score), alignRight ? x + 144 : x + 36, 44);
    const bx = alignRight ? x - 60 : x + 36;
    ctx.fillStyle = '#0a1430';
    ctx.fillRect(bx, 52, 180, 9);
    ctx.fillStyle = p.meter >= 100 ? (Math.sin(G.now * 10) > 0 ? '#ffffff' : c.accent) : c.color;
    ctx.fillRect(bx, 52, 180 * p.meter / 100, 9);
    ctx.strokeStyle = '#3d5ba6';
    ctx.lineWidth = 2;
    ctx.strokeRect(bx, 52, 180, 9);
    if (G.isJ2J && p.side === 2) {
      ctx.fillStyle = '#35e0ff';
      ctx.font = '9px "Press Start 2P",monospace';
      ctx.fillText('J2', alignRight ? bx + 190 : bx - 10, 68);
    }
  };
  panel(G.p1, 16, false);
  panel(G.p2, W - 16 - 210, true);
  ctx.fillStyle = '#0d1936';
  ctx.fillRect(CX - 78, 10, 156, 30);
  ctx.strokeStyle = '#ffd23e';
  ctx.lineWidth = 2;
  ctx.strokeRect(CX - 78, 10, 156, 30);
  ctx.fillStyle = '#ffd23e';
  ctx.font = '10px "Press Start 2P",monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PREMIER À ' + TARGET, CX, 29);
  if (G.rally >= 4) {
    ctx.fillStyle = '#7bd66a';
    ctx.font = '9px "Press Start 2P",monospace';
    ctx.fillText('ÉCHANGE ×' + G.rally, CX, 56);
  }
  if (G.state === 'serve') {
    const server = G.serveTo === 1 ? G.p1 : G.p2;
    ctx.fillStyle = '#fff';
    ctx.font = '11px "Press Start 2P",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(server.human ? 'À toi de servir !' : 'L\'IA va servir...', CX, COURT.bottom - 14);
  }
}

function drawCommentator() {
  const c = G.comment;
  if (!c) return;
  const a = Math.min(1, c.t / .15) * (c.t > c.dur - .3 ? Math.max(0, (c.dur - c.t) / .3) : 1);
  ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(5,10,26,.82)';
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = '#ffd23e';
  ctx.fillRect(0, H - 30, W, 2);
  ctx.font = '11px "Press Start 2P",monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eaf2ff';
  ctx.fillText('🎙  ' + c.text, CX, H - 11);
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  for (const p of G.popups) {
    const k = p.t / p.dur, a = k > .7 ? 1 - (k - .7) / .3 : 1;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.font = `${p.size * lerp(1.4, 1, Math.min(1, k / .15))}px "Press Start 2P",monospace`;
    ctx.fillText(p.text, CX, p.y);
    ctx.globalAlpha = 1;
  }
  if (G.banner) {
    const b = G.banner, k = b.t / b.dur, a = k > .75 ? 1 - (k - .75) / .25 : 1;
    ctx.globalAlpha = a * .85;
    ctx.fillStyle = 'rgba(5,10,26,.75)';
    ctx.fillRect(0, CY - 46, W, 72);
    ctx.globalAlpha = a;
    ctx.fillStyle = b.color;
    ctx.font = '32px "Press Start 2P",monospace';
    ctx.fillText(b.text, CX, CY + 4);
    ctx.globalAlpha = 1;
  }
  if (G.state === 'countdown' && G.cdN >= 0) {
    const n = Math.max(0, Math.ceil(G.cdT / .9));
    const txt = n > 0 ? String(n) : 'GO !';
    ctx.fillStyle = n > 0 ? '#ffd23e' : '#7bd66a';
    ctx.font = `${n > 0 ? 74 : 54}px "Press Start 2P",monospace`;
    const frac = (G.cdT / .9) % 1;
    ctx.save();
    ctx.translate(CX, CY + 30);
    ctx.scale(1 + frac * .25, 1 + frac * .25);
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }
}

function drawCrosshair() {
  if (G.demo || G.replay) return;
  const p = G.p1;
  if (!p) return;
  const x = Mouse.x, y = Mouse.y;
  const col = p.holding ? p.char.accent : '#ffffff';
  ctx.strokeStyle = col;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.stroke();
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
}

function drawReplayOverlay() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, 54);
  ctx.fillRect(0, H - 54, W, 54);
  ctx.fillStyle = '#fff';
  ctx.font = '14px "Press Start 2P",monospace';
  ctx.textAlign = 'left';
  ctx.fillText('REPLAY', 48, 33);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.font = '12px "Press Start 2P",monospace';
  ctx.fillText('CLIC / ESPACE POUR SKIP', CX, H - 14);
}

export function render() {
  ctx.save();
  if (G.shake > 0.3) ctx.translate(gauss() * G.shake, gauss() * G.shake);
  drawCourt();
  if (G.leg && G.leg.phase === 'shadow') drawLeg();
  drawDecoys();
  if (G.p1) {
    const ps = [G.p1, G.p2].sort((a, b) => a.y - b.y);
    let drewDisc = false;
    for (const p of ps) {
      if (!drewDisc && G.disc.y < p.y) { drawDisc(); drewDisc = true; }
      drawPlayer(p);
    }
    if (!drewDisc) drawDisc();
  }
  if (G.leg && G.leg.phase !== 'shadow') drawLeg();
  drawParticles();
  if (G.p1 && !G.demo) { drawHUD(); drawCrosshair(); }
  drawTexts();
  drawCommentator();
  if (G.replay) drawReplayOverlay();
  ctx.restore();
}
