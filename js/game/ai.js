import { G } from './state.js';
import { COURT, CY, GOAL_TOP, GOAL_BOTTOM, DASH_SPEED, throwSpeed } from '../core/constants.js';
import { clamp, norm, gauss, rand, approach } from '../core/utils.js';
import { dust, addPopup } from './fx.js';
import { onCatch, throwDisc } from './actions.js';

export function predictArrivalAtX(disc, targetX) {
  if (!disc || !disc.free) return null;
  let x = disc.x, y = disc.y, vx = disc.vx, vy = disc.vy;
  const dt = 1 / 60, maxSteps = 600, r = 9;
  if (Math.abs(vx) < 10) return null;
  for (let i = 0; i < maxSteps; i++) {
    x += vx * dt; y += vy * dt;
    if (y < COURT.top + r) { y = COURT.top + r; vy = -vy; }
    if (y > COURT.bottom - r) { y = COURT.bottom - r; vy = -vy; }
    if ((vx > 0 && x >= targetX) || (vx < 0 && x <= targetX)) {
      return { y: clamp(y, COURT.top + 10, COURT.bottom - 10), t: i * dt };
    }
  }
  return null;
}

export function getOpenCorner(side) {
  const y = (Math.random() < 0.5) ? GOAL_TOP + 10 : GOAL_BOTTOM - 10;
  return { x: side === 1 ? COURT.right : COURT.left, y };
}

export function getMirrorGoal(side, corner) {
  const wallY = (corner.y < CY) ? COURT.top : COURT.bottom;
  const reflectedY = wallY + (wallY - corner.y);
  return { x: side === 1 ? COURT.right : COURT.left, y: reflectedY };
}

export function updateAI(p, dt) {
  const d = p.ai, D = d.diff, foe = p.foe, disc = G.disc;
  if (p.stun > 0) { d.target = { x: p.x, y: p.y }; return; }
  const attackSign = p.side === 2 ? -1 : 1;
  const hasDisc = p.holding;
  if (hasDisc) {
    if (d.state !== 'STRIKE') { d.state = 'STRIKE'; d.stateTimer = 0; }
  } else {
    const puckInOwn = (attackSign * disc.x) < 0;
    const puckIncoming = (attackSign * disc.vx) < -15;
    const puckOutgoing = (attackSign * disc.vx) > 15;
    const distToPuck = Math.hypot(disc.x - p.x, disc.y - p.y);
    let newState = d.state;
    if (puckIncoming && !hasDisc && distToPuck < 350) newState = 'DEFEND';
    else if (puckOutgoing && !hasDisc && puckInOwn) newState = 'RECOVER';
    else if (!hasDisc && !puckInOwn) newState = 'READY';
    else if (d.aggro > 0 && puckInOwn && distToPuck < 350) newState = 'STRIKE';
    else newState = 'READY';
    if (newState !== d.state) { if (d.stateTimer < 0.15) newState = d.state; else d.stateTimer = 0; }
    else d.stateTimer += dt;
    d.state = newState;
  }
  if (d.hesT > 0) d.hesT -= dt;
  if (d.hesT <= 0 && Math.random() < 0.005) { d.hesT = 0.2 + rand(0.3); d.hes = { x: gauss() * 40, y: gauss() * 50 }; }
  let target = { x: p.x, y: p.y };
  switch (d.state) {
    case 'DEFEND': {
      const pred = predictArrivalAtX(disc, p.side === 1 ? COURT.left + 80 : COURT.right - 80);
      if (pred) {
        let err = gauss() * D.err * 0.4;
        if (d.miss) err += d.missOff * 0.4;
        let ty = pred.y + err;
        const m = G.mem, tot = m.t + m.m + m.b;
        if (tot >= 4) {
          const fav = (m.t * (GOAL_TOP + 34) + m.m * CY + m.b * (GOAL_BOTTOM - 34)) / tot;
          ty += (fav - ty) * Math.min(0.25, tot * 0.02);
        }
        target.y = clamp(ty, COURT.top + 20, COURT.bottom - 20);
        target.x = p.side === 1 ? COURT.left + 60 : COURT.right - 60;
        if (d.aggro > 0) target.x += p.side === 1 ? 30 : -30;
      } else { target = { x: p.home.x, y: CY + Math.sin(G.now * 1.2 + p.side) * 20 }; }
      break;
    }
    case 'STRIKE': {
      const corner = getOpenCorner(p.side);
      let aimPoint;
      if (Math.random() < 0.45 || d.aggro > 3) { aimPoint = getMirrorGoal(p.side, corner); } else { aimPoint = corner; }
      const rawX = aimPoint.x, rawY = aimPoint.y + gauss() * D.err * 0.4;
      d.emaTarget.x = d.emaTarget.x || rawX;
      d.emaTarget.y = d.emaTarget.y || rawY;
      const alpha = 0.3;
      d.emaTarget.x = alpha * rawX + (1 - alpha) * d.emaTarget.x;
      d.emaTarget.y = alpha * rawY + (1 - alpha) * d.emaTarget.y;
      target = { x: d.emaTarget.x, y: d.emaTarget.y };
      if (d.aggro < 4) d.aggro += dt * 0.3;
      break;
    }
    case 'RECOVER': {
      target = { x: p.home.x, y: CY + Math.sin(G.now * 1.0 + p.side) * 15 };
      if (Math.hypot(p.x - target.x, p.y - target.y) < 30) d.state = 'READY';
      break;
    }
    case 'READY':
    default: { target = { x: p.home.x, y: CY + Math.sin(G.now * 1.5 + p.side) * 30 }; break; }
  }
  target.x = clamp(target.x, COURT.left + 30, COURT.right - 30);
  target.y = clamp(target.y, COURT.top + 20, COURT.bottom - 20);
  d.target = target;
  const dx = d.target.x - p.x, dy = d.target.y - p.y, dist = Math.hypot(dx, dy);
  const speedFactor = D.speed * 0.85;
  const spd = p.speed * speedFactor * (d.aggro > 0 ? 1.08 : 1);
  if (d.state === 'STRIKE' && dist > 160 && p.dashCd <= 0 && Math.random() < D.smart * 0.25 + 0.05) {
    const dd = norm(dx, dy);
    p.dashV.x = dd.x * DASH_SPEED * 0.8; p.dashV.y = dd.y * DASH_SPEED * 0.8;
    p.dashCd = 0.9; dust(p.x, p.y + 20, 5);
  }
  let tx = 0, ty = 0;
  if (dist > 6) { tx = dx / dist * spd; ty = dy / dist * spd; }
  if (d.hesT > 0) { tx += d.hes.x * 0.15; ty += d.hes.y * 0.15; }
  p.vx = approach(p.vx, tx, 9, dt);
  p.vy = approach(p.vy, ty, 9, dt);
  p.face = (foe.x > p.x) ? 1 : -1;
  if (disc.free && !p.holding && p.throwCd <= 0 && p.stun <= 0) {
    const dd = Math.hypot(disc.x - p.x, disc.y - p.y);
    if (dd < p.char.catchR * 1.05) { onCatch(p, Math.hypot(disc.vx, disc.vy), 0, 0); }
    else if (dd < 50 && p.lungeCd <= 0 && Math.random() < D.smart * 0.3) { p.lunge = 0.12; p.lungeCd = 0.7; }
  }
  if (d.state === 'STRIKE' && p.holding) {
    p.holdTimer += dt;
    const aimTarget = (d.emaTarget.x && d.emaTarget.y) ? d.emaTarget : { x: (p.side === 1 ? COURT.right : COURT.left), y: CY };
    const threshold = (G.p1.score + G.p2.score > 5) ? 0.4 : 0.8;
    if (p.holdTimer > threshold || d.forceShoot) {
      p.charging = true;
      p.charge += dt / p.char.chargeT * (d.aggro > 3 ? 1.1 : 0.9);
      if (p.charge >= Math.max(0.1, D.smart * 0.25) || p.holdTimer > 1.2) {
        const aimDir = norm(aimTarget.x - p.x, aimTarget.y - p.y);
        addPopup('💥 TIR IA !', '#ffd23e', 14, 0.6, p.y - 80);
        throwDisc(p, aimDir, throwSpeed(p.charge, p.char.power));
        d.state = 'RECOVER';
        p.holdTimer = 0;
        d.forceShoot = false;
        d.emaTarget.x = 0; d.emaTarget.y = 0;
      }
    }
    if (p.holdTimer > 1.8) {
      const aimDir = norm(aimTarget.x - p.x, aimTarget.y - p.y);
      addPopup('💥 TIR FORCÉ !', '#ff5340', 14, 0.6, p.y - 80);
      throwDisc(p, aimDir, throwSpeed(Math.min(p.charge + 0.3, 1), p.char.power));
      d.state = 'RECOVER';
      p.holdTimer = 0;
      d.forceShoot = false;
      d.emaTarget.x = 0; d.emaTarget.y = 0;
    }
  }
}
