import { G, Mouse } from '../game/state.js';
import { ctx, W, H } from '../core/dom.js';
import { COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, GOAL_DEPTH, DISC_RADIUS, DISC_BIG_RADIUS, TARGET } from '../core/constants.js';
import { TAU, lerp, clamp, gauss } from '../core/utils.js';
import { getMap } from '../data/maps.js';
import { getSkinId, drawSkinDisc } from '../data/skins.js';
import { LEG_SPRITE, LEG_SPRITE_SCALE } from '../data/specials.js';

ctx.imageSmoothingEnabled = false;
const SCALE = 1.6;
const LEG_W = LEG_SPRITE.width * LEG_SPRITE_SCALE;
const LEG_H = LEG_SPRITE.height * LEG_SPRITE_SCALE;

function drawStars() {
  for (const s of G.stars) {
    const bright = 0.5 + 0.5 * Math.sin(s.twinkle);
    ctx.globalAlpha = bright;
    ctx.fillStyle = s.color || '#ffffff';
    ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

/* Nébuleuse de fond : nappes colorées diffuses, posées avant les étoiles.
   Positions figées (pas d'aléatoire par image) pour qu'elle ne clignote pas. */
const NEBULA = [
  { x: .22, y: .18, r: .42, c: '120,70,190' },
  { x: .34, y: .10, r: .30, c: '60,110,220' },
  { x: .78, y: .74, r: .40, c: '150,60,160' },
  { x: .88, y: .30, r: .26, c: '40,120,190' },
  { x: .10, y: .82, r: .28, c: '90,50,150' }
];
function drawNebula() {
  for (const n of NEBULA) {
    const g = ctx.createRadialGradient(n.x * W, n.y * H, 0, n.x * W, n.y * H, n.r * W);
    g.addColorStop(0, `rgba(${n.c},.30)`);
    g.addColorStop(.55, `rgba(${n.c},.10)`);
    g.addColorStop(1, `rgba(${n.c},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

/* Silhouettes de la station au loin, très sombres, pour habiter le vide. */
function drawStationBackdrop() {
  const th = getMap().theme;
  ctx.save();
  ctx.globalAlpha = .5;
  ctx.fillStyle = th.hull;
  ctx.strokeStyle = th.hullEdge;
  ctx.lineWidth = 1;
  // Module en haut à droite, avec bras et antenne.
  ctx.fillRect(W - 210, 8, 150, 26); ctx.strokeRect(W - 210, 8, 150, 26);
  ctx.fillRect(W - 150, 34, 30, 22); ctx.strokeRect(W - 150, 34, 30, 22);
  ctx.fillRect(W - 60, 14, 52, 14); ctx.strokeRect(W - 60, 14, 52, 14);
  ctx.beginPath(); ctx.moveTo(W - 120, 8); ctx.lineTo(W - 112, -6); ctx.stroke();
  // Antenne parabolique.
  ctx.beginPath(); ctx.ellipse(W - 128, 4, 13, 7, -.4, 0, TAU); ctx.fill();
  // Module en bas à gauche.
  ctx.fillRect(30, H - 40, 120, 22); ctx.strokeRect(30, H - 40, 120, 22);
  ctx.fillRect(70, H - 18, 26, 18); ctx.strokeRect(70, H - 18, 26, 18);
  // Hublots allumés.
  ctx.globalAlpha = .8;
  ctx.fillStyle = 'rgba(53,224,255,.5)';
  for (let i = 0; i < 6; i++) ctx.fillRect(W - 200 + i * 24, 16, 8, 5);
  for (let i = 0; i < 4; i++) ctx.fillRect(42 + i * 26, H - 33, 8, 5);
  ctx.restore();
}

/* Drones-caméras : ils gravitent autour de l'arène et remplacent le public.
   Chacun tourne sur sa petite orbite, avec un feu de position qui clignote. */
function drawDrones() {
  const th = getMap().theme;
  for (const d of G.crowd) {
    const a = G.now * d.speed + d.ph;
    const x = d.x + Math.cos(a) * d.orbit;
    const y = d.y + Math.sin(a * 1.3) * d.orbit * .5;
    const s = d.s;

    // Faisceau de la caméra, orienté vers le terrain.
    const toCourt = Math.atan2(CY - y, CX - x);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(toCourt);
    const beam = ctx.createLinearGradient(0, 0, s * 7, 0);
    beam.addColorStop(0, 'rgba(53,224,255,.22)');
    beam.addColorStop(1, 'rgba(53,224,255,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(s * 7, -s * 1.6); ctx.lineTo(s * 7, s * 1.6);
    ctx.closePath(); ctx.fill();
    ctx.restore();

    // Fuselage sombre + verrière.
    ctx.fillStyle = th.hull;
    ctx.beginPath(); ctx.ellipse(x, y, s, s * .62, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = th.hullEdge; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(x, y, s, s * .62, 0, 0, TAU); ctx.stroke();

    // Feu de position clignotant.
    const blink = .45 + .55 * Math.sin(G.now * 3 + d.blink);
    ctx.globalAlpha = blink;
    ctx.fillStyle = d.c;
    ctx.beginPath(); ctx.arc(x, y - s * .1, s * .34, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/* Plateforme de la station : châssis métallique épais à coins arrondis,
   avec bandes lumineuses encastrées et panneaux techniques. */
function drawRig() {
  const th = getMap().theme;
  const B = 26;                              // épaisseur du châssis
  const L = COURT.left - B, R = COURT.right + B;
  const T = COURT.top - B, Bo = COURT.bottom + B;
  const rad = 26;

  // Corps du châssis : anneau entre le contour extérieur arrondi et le terrain.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(L, T, R - L, Bo - T, rad);
  ctx.rect(COURT.right, COURT.top, -(COURT.right - COURT.left), COURT.bottom - COURT.top); // trou (sens inverse)
  ctx.fillStyle = th.hull;
  ctx.fill('evenodd');
  ctx.restore();

  // Arêtes.
  ctx.strokeStyle = th.hullEdge; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(L, T, R - L, Bo - T, rad); ctx.stroke();
  ctx.strokeRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);

  // Plaques de blindage sur les longs côtés.
  ctx.fillStyle = th.deckLight;
  ctx.strokeStyle = th.deckLine; ctx.lineWidth = 1;
  for (let x = COURT.left + 10; x < COURT.right - 40; x += 96) {
    for (const y of [T + 5, COURT.bottom + 5]) {
      ctx.fillRect(x, y, 62, B - 10);
      ctx.strokeRect(x, y, 62, B - 10);
    }
  }

  // Bandes lumineuses encastrées dans le châssis, qui respirent.
  const pulse = .55 + .45 * Math.sin(G.now * 1.5);
  ctx.fillStyle = `rgba(53,224,255,${.5 + pulse * .45})`;
  ctx.shadowColor = th.holo; ctx.shadowBlur = 10;
  for (let x = COURT.left + 80; x < COURT.right - 60; x += 96) {
    ctx.fillRect(x, T + 9, 44, 5);
    ctx.fillRect(x, COURT.bottom + B - 14, 44, 5);
  }
  for (let y = COURT.top + 40; y < COURT.bottom - 30; y += 92) {
    ctx.fillRect(L + 9, y, 5, 40);
    ctx.fillRect(COURT.right + B - 14, y, 5, 40);
  }
  ctx.shadowBlur = 0;

  // Feux de balisage aux quatre coins.
  const blink = .5 + .5 * Math.sin(G.now * 2.2);
  for (const [cx2, cy2] of [[L + 13, T + 13], [R - 13, T + 13], [L + 13, Bo - 13], [R - 13, Bo - 13]]) {
    ctx.fillStyle = `rgba(255,210,62,${.3 + blink * .55})`;
    ctx.beginPath(); ctx.arc(cx2, cy2, 4, 0, TAU); ctx.fill();
  }
}

/* Intensité de la projection : stable en jeu, elle ne se dérègle qu'au but. */
function holoFlicker() {
  const goal = Math.max(G.goalFlash[0], G.goalFlash[1]);
  if (goal <= 0.02) return 1;
  // Décrochage franc pendant la seconde qui suit le but.
  const jitter = Math.sin(G.now * 47) > .3 ? 1 : .55;
  return (1 + goal * .5) * jitter;
}

function drawCourt() {
  const th = getMap().theme;
  const cw = COURT.right - COURT.left, chh = COURT.bottom - COURT.top;

  // 1. Le vide et les étoiles, visibles partout — y compris à travers le terrain.
  const grd = ctx.createRadialGradient(CX, CY, 100, CX, CY, 560);
  grd.addColorStop(0, th.bgInner);
  grd.addColorStop(1, th.bgOuter);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  drawNebula();
  drawStars();
  drawStationBackdrop();
  drawDrones();

  const I = holoFlicker();
  const goal = Math.max(G.goalFlash[0], G.goalFlash[1]);

  // 2. Halo diffus de la projection, très léger.
  const halo = ctx.createRadialGradient(CX, CY, 40, CX, CY, Math.max(cw, chh) * .7);
  halo.addColorStop(0, `rgba(53,224,255,${.1 * I})`);
  halo.addColorStop(1, 'rgba(53,224,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(COURT.left - 40, COURT.top - 40, cw + 80, chh + 80);

  ctx.save();
  ctx.beginPath();
  ctx.rect(COURT.left, COURT.top, cw, chh);
  ctx.clip();

  // 3. Cinq ondulations qui serpentent sur la surface, décalées entre elles.
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const phase = G.now * (.5 + i * .07) + i * 1.3;
    const baseY = COURT.top + chh * ((i + .5) / 5);
    const amp = 14 + i % 2 * 6;
    const alpha = (.16 + .1 * Math.sin(G.now * 1.1 + i)) * I;
    ctx.strokeStyle = `rgba(127,233,255,${alpha})`;
    ctx.beginPath();
    for (let x = COURT.left; x <= COURT.right; x += 12) {
      const t = (x - COURT.left) / cw;
      const y = baseY + Math.sin(t * Math.PI * 2.4 + phase) * amp;
      x === COURT.left ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 4. Lignes de jeu, en trait lumineux fin.
  ctx.save();
  ctx.shadowColor = th.holo;
  ctx.shadowBlur = 10 * I;
  ctx.strokeStyle = `rgba(127,233,255,${.8 * I})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(COURT.left, COURT.top, cw, chh);
  ctx.setLineDash([9, 7]);
  ctx.beginPath(); ctx.moveTo(CX, COURT.top); ctx.lineTo(CX, COURT.bottom); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(CX, CY, 58, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(CX, CY, 10, 0, TAU); ctx.stroke();
  ctx.restore();

  // 5. Dérèglement au but : la projection se dédouble en rouge/cyan.
  if (goal > 0.02) {
    ctx.save();
    ctx.globalAlpha = goal * .45;
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = '#ff3b5c'; ctx.lineWidth = 2;
    ctx.strokeRect(COURT.left + 5 * goal, COURT.top, cw, chh);
    ctx.strokeStyle = '#7fe9ff';
    ctx.strokeRect(COURT.left - 5 * goal, COURT.top, cw, chh);
    ctx.restore();
  }

  drawRig();
  drawGoalSide(1);
  drawGoalSide(2);
}

/* But = baie ouverte sur le vide : une brèche dans le châssis qui donne
   directement sur l'espace (on voit les étoiles au fond), fermée par un
   rideau de lumière que le disque traverse. Trois volets marqués 3/5/3
   encadrent l'ouverture. */
function drawGoalSide(side) {
  const m = getMap(), th = m.theme;
  const x = side === 1 ? COURT.left : COURT.right;
  const gx = side === 1 ? x - GOAL_DEPTH : x;
  const flash = G.goalFlash[side === 1 ? 0 : 1];
  const I = holoFlicker();
  const gh = GOAL_BOTTOM - GOAL_TOP;

  // 1. La brèche : on efface le châssis pour laisser voir le vide derrière.
  ctx.save();
  ctx.beginPath();
  ctx.rect(gx - 6, GOAL_TOP, GOAL_DEPTH + 6, gh);
  ctx.clip();
  const void_ = ctx.createLinearGradient(gx, 0, gx + GOAL_DEPTH, 0);
  const deep = side === 1 ? 0 : 1;
  void_.addColorStop(deep, 'rgba(2,3,8,1)');
  void_.addColorStop(1 - deep, 'rgba(6,10,22,.9)');
  ctx.fillStyle = void_;
  ctx.fillRect(gx - 6, GOAL_TOP, GOAL_DEPTH + 6, gh);
  // Étoiles visibles au fond de la baie.
  for (let i = 0; i < 14; i++) {
    const sx = gx + ((i * 37) % GOAL_DEPTH);
    const sy = GOAL_TOP + ((i * 53) % gh);
    const tw = .35 + .65 * Math.abs(Math.sin(G.now * 1.4 + i));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#fff';
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
  ctx.restore();

  // 2. Volets de sécurité : trois segments marqués, alignés sur les zones,
  //    avec la valeur affichée directement dans la baie.
  ctx.textAlign = 'center';
  for (const z of m.zones) {
    const y1 = CY + z.from, y2 = CY + z.to;
    const or = z.points >= 5;
    // Rail lumineux qui borde le volet, côté terrain.
    ctx.fillStyle = or ? `rgba(255,210,62,${(.55 + flash * .35) * I})` : `rgba(53,224,255,${(.4 + flash * .3) * I})`;
    const railX = side === 1 ? x - 5 : x;
    ctx.fillRect(railX, y1 + 2, 5, (y2 - y1) - 4);
    // Séparateurs métalliques entre volets.
    ctx.fillStyle = th.hullEdge;
    ctx.fillRect(gx - 6, y1 - 1, GOAL_DEPTH + 6, 2);
    ctx.fillRect(gx - 6, y2 - 1, GOAL_DEPTH + 6, 2);

    // Valeur de la zone, gravée au fond de la baie. textBaseline='middle'
    // centre verticalement de façon fiable, quelle que soit la taille.
    ctx.save();
    ctx.shadowColor = or ? '#ffd23e' : '#35e0ff';
    ctx.shadowBlur = 10 * I;
    ctx.fillStyle = or ? '#ffe98a' : '#bff0ff';
    const size = Math.max(12, Math.min(20, (y2 - y1) - 18));
    ctx.font = `700 ${size}px "Archivo Black", system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(String(z.points), gx + GOAL_DEPTH / 2, (y1 + y2) / 2);
    ctx.restore();
  }

  // 3. Encadrement métallique de la baie.
  ctx.fillStyle = th.hull;
  ctx.fillRect(gx - 8, GOAL_TOP - 14, GOAL_DEPTH + 14, 14);
  ctx.fillRect(gx - 8, GOAL_BOTTOM, GOAL_DEPTH + 14, 14);
  ctx.strokeStyle = th.hullEdge; ctx.lineWidth = 2;
  ctx.strokeRect(gx - 8, GOAL_TOP - 14, GOAL_DEPTH + 14, 14);
  ctx.strokeRect(gx - 8, GOAL_BOTTOM, GOAL_DEPTH + 14, 14);
  ctx.fillStyle = th.deckLight;
  for (let i = 0; i < 4; i++) {
    const bx = gx - 4 + i * (GOAL_DEPTH + 6) / 3;
    ctx.fillRect(bx, GOAL_TOP - 11, 8, 8);
    ctx.fillRect(bx, GOAL_BOTTOM + 3, 8, 8);
  }

  // 4. Rideau de lumière vertical à l'entrée de la baie.
  ctx.save();
  const curtain = ctx.createLinearGradient(x - 14, 0, x + 14, 0);
  curtain.addColorStop(0, 'rgba(127,233,255,0)');
  curtain.addColorStop(.5, `rgba(127,233,255,${.3 * I})`);
  curtain.addColorStop(1, 'rgba(127,233,255,0)');
  ctx.fillStyle = curtain;
  ctx.fillRect(x - 14, GOAL_TOP, 28, gh);
  ctx.shadowColor = th.holo; ctx.shadowBlur = 16 * I;
  ctx.strokeStyle = `rgba(180,245,255,${.95 * I})`;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, GOAL_TOP); ctx.lineTo(x, GOAL_BOTTOM); ctx.stroke();
  ctx.restore();

  if (flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${flash * .22})`;
    ctx.fillRect(gx - 6, GOAL_TOP, GOAL_DEPTH + 6, gh);
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
    ctx.font = '8px "Archivo Black", system-ui, sans-serif';
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
  if (L.phase === 'shadow') {
    const k = clamp(L.t / .55, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(G.now * 16);
    ctx.save();
    ctx.globalAlpha = .35 + k * .4;
    ctx.fillStyle = '#ff6a7a';
    ctx.beginPath();
    ctx.ellipse(L.x, L.yTarget, (LEG_W * .55) * k, (LEG_W * .22) * k, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `rgba(255,106,122,${.5 + pulse * .4})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(L.x, L.yTarget, (LEG_W * .55) * k + 4, (LEG_W * .22) * k + 2, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  } else if (L.phase === 'fall') {
    const k = clamp(L.t / .16, 0, 1);
    const y = lerp(L.yTarget - 420, L.yTarget - LEG_H * .3, k);
    drawLegSprite(L.x, y, 1);
    // Traînée de vitesse.
    for (let i = 1; i <= 3; i++) {
      const ty = lerp(L.yTarget - 420, L.yTarget - LEG_H * .3, clamp(k - i * .08, 0, 1));
      drawLegSprite(L.x, ty, .18 / i);
    }
  } else if (L.phase === 'impact') {
    const k = clamp(L.t / .4, 0, 1);
    drawLegSprite(L.x, L.yTarget - LEG_H * .3 * (1 - k), 1 - k, 1 + k * .3);
  }
}

function drawLegSprite(x, y, alpha, squash = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(1, squash);
  ctx.drawImage(LEG_SPRITE, -LEG_W / 2, -LEG_H, LEG_W, LEG_H);
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
    ctx.font = '10px "Archivo Black", system-ui, sans-serif';
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.fillText(c.short + ' ' + c.icon, alignRight ? x + 144 : x + 36, 20);
    ctx.fillStyle = '#fff';
    ctx.font = '20px "Archivo Black", system-ui, sans-serif';
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
      ctx.font = '9px "Archivo Black", system-ui, sans-serif';
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
  ctx.font = '10px "Archivo Black", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PREMIER À ' + TARGET, CX, 29);
  if (G.rally >= 4) {
    ctx.fillStyle = '#7bd66a';
    ctx.font = '9px "Archivo Black", system-ui, sans-serif';
    ctx.fillText('ÉCHANGE ×' + G.rally, CX, 56);
  }
  if (G.state === 'serve') {
    const server = G.serveTo === 1 ? G.p1 : G.p2;
    ctx.fillStyle = '#fff';
    ctx.font = '11px "Archivo Black", system-ui, sans-serif';
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
  ctx.font = '11px "Archivo Black", system-ui, sans-serif';
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
    ctx.font = `${p.size * lerp(1.4, 1, Math.min(1, k / .15))}px "Archivo Black", system-ui, sans-serif`;
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
    ctx.font = '32px "Archivo Black", system-ui, sans-serif';
    ctx.fillText(b.text, CX, CY + 4);
    ctx.globalAlpha = 1;
  }
  if (G.state === 'countdown' && G.cdN >= 0) {
    const n = Math.max(0, Math.ceil(G.cdT / .9));
    const txt = n > 0 ? String(n) : 'GO !';
    ctx.fillStyle = n > 0 ? '#ffd23e' : '#7bd66a';
    ctx.font = `${n > 0 ? 74 : 54}px "Archivo Black", system-ui, sans-serif`;
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
  ctx.font = '14px "Archivo Black", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('REPLAY', 48, 33);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  ctx.font = '12px "Archivo Black", system-ui, sans-serif';
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
