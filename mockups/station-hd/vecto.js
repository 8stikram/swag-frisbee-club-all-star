// ---------------------------------------------------------------------------
// B — LA STATION ORBITALE EN VECTORIEL DÉTAILLÉ.
//
// La technique du jeu actuel (formes lisses, dégradés, lueurs floues), mais
// avec la composition de la version A : même planète, même lever de soleil,
// même châssis, mêmes cages. La planète est calculée par les mêmes fonctions
// que A, en couleur continue et sans trame, à demi-résolution puis lissée :
// c'est ce qui la fait lire comme une peinture et non comme des pixels.
// ---------------------------------------------------------------------------
import { fbm, hacher, lisse } from '../_pixelart.js';
import {
  W, H, COURT, CX, CY, BUT, ZONES, CHASSIS, MUR, FACE, horizonY, SOLEIL,
  BANDES_H, JOINTS_H, BANDES_V, BALISES, PROJECTEURS, PANNEAUX, ANNEAU, SATELLITE,
  DRONES, positionDrone, vaisseau, filante
} from './scene.js';
import { couleurCiel, champPlanete, couleurPlanete, lumiereVille } from './pixel.js';

const TAU = Math.PI * 2;
const K = CHASSIS;
const cyan = a => `rgba(53,224,255,${a})`;
const cyanClair = a => `rgba(160,240,255,${a})`;
const or = a => `rgba(255,204,58,${a})`;

function toile(l, h) { const c = document.createElement('canvas'); c.width = l; c.height = h; return c; }

// Ciel et planète, à demi-résolution, sans trame.
function peindrePlanete() {
  const l = W / 2, h = H / 2;
  const c = toile(l, h), g = c.getContext('2d');
  const img = g.createImageData(l, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
    const X = x * 2 + 1, Y = y * 2 + 1;
    let r, v, b;
    if (Y < horizonY(X)) [r, v, b] = couleurCiel(X, Y);
    else [r, v, b] = couleurPlanete(X, Y, champPlanete(X, Y));
    const i = (y * l + x) * 4;
    d[i] = r; d[i + 1] = v; d[i + 2] = b; d[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const out = toile(W, H), og = out.getContext('2d');
  og.imageSmoothingEnabled = true; og.imageSmoothingQuality = 'high';
  og.filter = 'blur(1.2px)';
  og.drawImage(c, 0, 0, W, H);
  og.filter = 'none';
  // Villes : points doux, en mode lumière.
  og.globalCompositeOperation = 'lighter';
  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    if (y < horizonY(x) + 2) continue;
    const f = champPlanete(x, y);
    const lv = lumiereVille(x, y, f);
    if (lv <= 0) continue;
    // Sous la vitre, la teinte du verre les éteint aux deux tiers.
    const sous = x >= COURT.left && x < COURT.right && y >= COURT.top && y < COURT.bottom;
    if (sous && lv < .5) continue;
    const gr = og.createRadialGradient(x, y, 0, x, y, 2.2 + lv * 1.6);
    gr.addColorStop(0, `rgba(255,214,140,${(sous ? .16 : .45) * lv})`);
    gr.addColorStop(1, 'rgba(255,150,60,0)');
    og.fillStyle = gr;
    og.fillRect(x - 5, y - 5, 10, 10);
  }
  og.globalCompositeOperation = 'source-over';
  return out;
}

function cheminChassis(g) {
  g.beginPath();
  g.roundRect(K.L, K.T, K.R - K.L, K.B - K.T, K.rayon);
  g.rect(COURT.right, COURT.top, -(COURT.right - COURT.left), COURT.bottom - COURT.top);
}

function peindreFond() {
  const c = toile(W, H), g = c.getContext('2d');
  g.drawImage(peindrePlanete(), 0, 0);

  // Atmosphère : trois traits de plus en plus fins et clairs le long de l'horizon.
  const arc = (lw, style, flou) => {
    g.save(); g.strokeStyle = style; g.lineWidth = lw; g.shadowColor = style; g.shadowBlur = flou;
    g.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = horizonY(x); x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.restore();
  };
  arc(10, 'rgba(60,140,230,.18)', 18);
  arc(3, 'rgba(110,200,255,.5)', 8);
  arc(1.2, 'rgba(230,250,255,.9)', 4);
  // Soleil : halo large, cœur, traînée horizontale.
  const sy = SOLEIL.y;
  let gr = g.createRadialGradient(SOLEIL.x, sy, 0, SOLEIL.x, sy, 120);
  gr.addColorStop(0, 'rgba(255,240,200,.9)'); gr.addColorStop(.15, 'rgba(255,180,90,.55)');
  gr.addColorStop(.5, 'rgba(230,90,90,.15)'); gr.addColorStop(1, 'rgba(120,40,120,0)');
  g.save(); g.translate(SOLEIL.x, sy); g.scale(1, .32); g.translate(-SOLEIL.x, -sy);
  g.fillStyle = gr; g.fillRect(SOLEIL.x - 130, sy - 130, 260, 260); g.restore();
  gr = g.createLinearGradient(SOLEIL.x - 260, 0, SOLEIL.x + 260, 0);
  gr.addColorStop(0, 'rgba(255,220,160,0)'); gr.addColorStop(.5, 'rgba(255,245,220,.8)'); gr.addColorStop(1, 'rgba(255,220,160,0)');
  g.fillStyle = gr; g.fillRect(SOLEIL.x - 260, sy - 1, 520, 2);

  // Étoiles, dans le ciel.
  for (let i = 0; i < 700; i++) {
    const x = hacher(i, 1, 9) * W, y = hacher(i, 2, 9) * 60;
    if (y > horizonY(x) - 5) continue;
    const k = hacher(i, 3, 9);
    g.fillStyle = `rgba(230,240,255,${.25 + k * .6})`;
    g.beginPath(); g.arc(x, y, .5 + k * 1.1, 0, TAU); g.fill();
    if (k > .96) {
      g.strokeStyle = 'rgba(220,235,255,.5)'; g.lineWidth = .8;
      g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.moveTo(x, y - 5); g.lineTo(x, y + 5); g.stroke();
    }
  }

  // La station mère.
  const A = ANNEAU;
  g.save();
  g.lineWidth = 3;
  gr = g.createLinearGradient(A.cx - A.rx, 0, A.cx + A.rx, 0);
  gr.addColorStop(0, '#0b1120'); gr.addColorStop(.7, '#26344f'); gr.addColorStop(1, '#ffae60');
  g.strokeStyle = gr;
  g.beginPath(); g.ellipse(A.cx, A.cy, A.rx - 1, A.ry - 1, 0, 0, TAU); g.stroke();
  g.fillStyle = '#131c2e'; g.fillRect(A.cx - 5, A.cy - 10, 10, 18);
  g.fillStyle = '#ffae60'; g.fillRect(A.cx + 4, A.cy - 10, 1.5, 18);
  g.strokeStyle = '#1a2438'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(A.cx - A.rx + 3, A.cy); g.lineTo(A.cx + A.rx - 3, A.cy); g.stroke();
  g.restore();

  // Vitre du terrain : teinte, halo du bord, grille de points.
  g.fillStyle = 'rgba(8,34,68,.45)';
  g.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);
  g.save();
  g.beginPath(); g.rect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top); g.clip();
  g.shadowColor = cyan(.6); g.shadowBlur = 14; g.strokeStyle = cyan(.35); g.lineWidth = 6;
  g.strokeRect(COURT.left - 3, COURT.top - 3, COURT.right - COURT.left + 6, COURT.bottom - COURT.top + 6);
  g.restore();
  g.fillStyle = 'rgba(80,170,220,.28)';
  for (let y = CY % 20; y < COURT.bottom; y += 20) for (let x = CX % 20; x < COURT.right; x += 20) {
    if (x > COURT.left && y > COURT.top) { g.beginPath(); g.arc(x, y, .9, 0, TAU); g.fill(); }
  }
  g.strokeStyle = 'rgba(80,170,220,.22)'; g.lineWidth = 1;
  g.beginPath(); g.arc(CX, CY, 18, 0, TAU); g.stroke();
  g.beginPath(); g.ellipse(CX, CY, 32, 7, -.1, 0, TAU); g.stroke();
  for (const px of PROJECTEURS) {
    gr = g.createLinearGradient(0, COURT.top, 0, COURT.top + 16);
    gr.addColorStop(0, cyan(.28)); gr.addColorStop(1, cyan(0));
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(px - 2, COURT.top); g.lineTo(px + 2, COURT.top); g.lineTo(px + 9, COURT.top + 16); g.lineTo(px - 9, COURT.top + 16); g.fill();
  }

  // Ailes solaires.
  for (const p of PANNEAUX) {
    const gauche = p.x < CX;
    g.fillStyle = '#2a3b5a';
    for (const by of [p.y + 20, p.y + p.h - 24]) g.fillRect(gauche ? p.x + p.l : K.R, by, (gauche ? K.L : p.x) - (gauche ? p.x + p.l : K.R), 3);
    gr = g.createLinearGradient(p.x, p.y, p.x + p.l, p.y + p.h);
    gr.addColorStop(0, '#1d3a80'); gr.addColorStop(1, '#0a1636');
    g.fillStyle = '#2a3b5a'; g.beginPath(); g.roundRect(p.x, p.y, p.l, p.h, 2); g.fill();
    g.fillStyle = gr; g.fillRect(p.x + 2, p.y + 2, p.l - 4, p.h - 4);
    g.strokeStyle = 'rgba(5,11,30,.9)'; g.lineWidth = 1;
    for (let x = p.x + 12; x < p.x + p.l - 2; x += 10) { g.beginPath(); g.moveTo(x, p.y + 2); g.lineTo(x, p.y + p.h - 2); g.stroke(); }
    for (let y = p.y + 14; y < p.y + p.h - 2; y += 12) { g.beginPath(); g.moveTo(p.x + 2, y); g.lineTo(p.x + p.l - 2, y); g.stroke(); }
  }

  // Châssis : dégradé du haut vers le bas, biseau clair, arête sombre.
  g.save();
  gr = g.createLinearGradient(0, K.T, 0, K.B);
  gr.addColorStop(0, '#2d4062'); gr.addColorStop(.12, '#1f2c46'); gr.addColorStop(.88, '#1b2740'); gr.addColorStop(1, '#141d31');
  g.fillStyle = gr; cheminChassis(g); g.fill('evenodd');
  // Face avant, sous le rebord du bas.
  gr = g.createLinearGradient(0, K.B - 4, 0, K.B + FACE);
  gr.addColorStop(0, '#16213a'); gr.addColorStop(1, '#070b16');
  g.fillStyle = gr;
  g.beginPath(); g.roundRect(K.L, K.B - K.rayon * 2, K.R - K.L, K.rayon * 2 + FACE, [0, 0, K.rayon, K.rayon]); g.rect(K.R, K.B - K.rayon * 2, -(K.R - K.L), K.rayon * 2); g.fill('evenodd');
  g.restore();
  g.save(); cheminChassis(g); g.clip('evenodd');
  g.strokeStyle = 'rgba(140,175,225,.55)'; g.lineWidth = 2;
  g.beginPath(); g.roundRect(K.L + 1.5, K.T + 1.5, K.R - K.L - 3, K.B - K.T - 3, K.rayon - 1.5); g.stroke();
  // Paroi intérieure du rebord du haut.
  gr = g.createLinearGradient(0, COURT.top - MUR, 0, COURT.top);
  gr.addColorStop(0, '#22324f'); gr.addColorStop(1, '#0b111f');
  g.fillStyle = gr; g.fillRect(COURT.left, COURT.top - MUR, COURT.right - COURT.left, MUR);
  g.fillStyle = 'rgba(130,165,215,.5)'; g.fillRect(COURT.left, COURT.top - MUR, COURT.right - COURT.left, 1);
  // Joints et rivets.
  g.strokeStyle = 'rgba(8,12,22,.9)'; g.lineWidth = 1;
  for (const x of JOINTS_H) {
    for (const [y0, y1] of [[K.T + 3, COURT.top - MUR - 1], [COURT.bottom + 3, K.B - 3]]) {
      g.beginPath(); g.moveTo(x + .5, y0); g.lineTo(x + .5, y1); g.stroke();
      for (const ry of [y0 + 3, y1 - 3]) for (const rx of [x - 5, x + 6]) {
        const rg = g.createRadialGradient(rx - .5, ry - .5, 0, rx, ry, 1.8);
        rg.addColorStop(0, '#9fb6da'); rg.addColorStop(1, '#1a2438');
        g.fillStyle = rg; g.beginPath(); g.arc(rx, ry, 1.6, 0, TAU); g.fill();
      }
    }
  }
  // Logements des bandes.
  g.fillStyle = '#05080f';
  for (const cx of BANDES_H) for (const y of [K.T + 5, COURT.bottom + 9]) { g.beginPath(); g.roundRect(cx - 24, y, 48, 9, 3); g.fill(); }
  for (const cy of BANDES_V) for (const x of [K.L + 8, COURT.right + 9]) { g.beginPath(); g.roundRect(x, cy - 22, 9, 44, 3); g.fill(); }
  // Rayures de danger.
  for (const [y0, y1] of [[BUT.haut - 40, BUT.haut - 18], [BUT.bas + 18, BUT.bas + 40]]) {
    for (const x0 of [K.L + 4, COURT.right + 3]) {
      g.save(); g.beginPath(); g.roundRect(x0, y0, 19, y1 - y0, 2); g.clip();
      g.fillStyle = '#0a0f1b'; g.fillRect(x0, y0, 19, y1 - y0);
      g.fillStyle = '#e0a41e';
      for (let k = -30; k < 40; k += 8) { g.beginPath(); g.moveTo(x0 + k, y0); g.lineTo(x0 + k + 4, y0); g.lineTo(x0 + k + 4 - 30, y1 + 10); g.lineTo(x0 + k - 30, y1 + 10); g.fill(); }
      g.restore();
    }
  }
  g.fillStyle = 'rgba(120,150,200,.55)';
  g.font = '7px "Archivo Black", system-ui, sans-serif';
  g.textAlign = 'left'; g.fillText('SFC ARENA 07', COURT.left + 14, COURT.bottom + 17);
  g.textAlign = 'right'; g.fillText('STELLAR ORBITAL STATION', COURT.right - 14, COURT.bottom + 17);
  g.restore();
  // Écusson central.
  gr = g.createRadialGradient(CX - 2, K.T + 8, 1, CX, K.T + 10, 6);
  gr.addColorStop(0, '#ffe7a0'); gr.addColorStop(.5, '#c98e1c'); gr.addColorStop(1, '#4a3008');
  g.fillStyle = gr; g.beginPath(); g.arc(CX, K.T + 10, 5.5, 0, TAU); g.fill();

  // Cages : puits sombre, cadres, séparateurs, chiffres lumineux.
  for (const cote of [1, 2]) {
    const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right;
    gr = g.createLinearGradient(gx, 0, gx + BUT.prof, 0);
    gr.addColorStop(cote === 1 ? 0 : 1, 'rgba(1,2,6,.92)'); gr.addColorStop(cote === 1 ? 1 : 0, 'rgba(1,2,6,.35)');
    g.fillStyle = gr; g.fillRect(gx, BUT.haut, BUT.prof, BUT.bas - BUT.haut);
    const x0 = cote === 1 ? gx - 8 : gx - 6, l = BUT.prof + 14;
    for (const y of [BUT.haut - 16, BUT.bas]) {
      gr = g.createLinearGradient(0, y, 0, y + 16);
      gr.addColorStop(0, '#3a5078'); gr.addColorStop(.2, '#223250'); gr.addColorStop(1, '#131c30');
      g.fillStyle = gr; g.beginPath(); g.roundRect(x0, y, l, 16, 2); g.fill();
      g.strokeStyle = '#05070e'; g.lineWidth = 1; g.stroke();
      for (let i = 0; i < 3; i++) { g.fillStyle = '#9a1826'; g.fillRect(x0 + 11 + i * 18, y + 7, 3, 1.5); }
    }
    const xm = cote === 1 ? x0 : x0 + l - 6;
    gr = g.createLinearGradient(xm, 0, xm + 6, 0);
    gr.addColorStop(0, '#4d6992'); gr.addColorStop(1, '#101727');
    g.fillStyle = gr; g.fillRect(xm, BUT.haut, 6, BUT.bas - BUT.haut);
    for (const z of ZONES) {
      for (const yy of [CY + z.from, CY + z.to]) {
        if (yy === BUT.haut || yy === BUT.bas) continue;
        gr = g.createLinearGradient(0, yy - 2, 0, yy + 2);
        gr.addColorStop(0, '#6f86ad'); gr.addColorStop(1, '#0a0f1b');
        g.fillStyle = gr; g.fillRect(gx, yy - 2, BUT.prof, 4);
      }
      const o = z.points >= 5;
      g.save();
      g.shadowColor = o ? '#ffd23e' : '#35e0ff'; g.shadowBlur = 12;
      g.fillStyle = o ? '#ffe98a' : '#bff0ff';
      g.font = '700 20px "Archivo Black", system-ui, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(z.points), gx + BUT.prof / 2 - (cote === 1 ? 3 : -3), CY + (z.from + z.to) / 2);
      g.restore();
    }
  }
  return c;
}

let FOND = null;
export function creerVecto() {
  if (!FOND) FOND = peindreFond();
  const cible = toile(W, H), g = cible.getContext('2d');

  function image(t, but) {
    g.drawImage(FOND, 0, 0);
    const I = but > .02 ? (Math.sin(t * 47) > .3 ? 1 : .55) : 1;

    // Étoile filante, navette, satellite, fenêtres de l'anneau.
    const fil = filante(t);
    if (fil) {
      const gr = g.createLinearGradient(fil.x, fil.y, fil.x - 12, fil.y - 3);
      gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(160,200,255,0)');
      g.strokeStyle = gr; g.lineWidth = 1.4; g.beginPath(); g.moveTo(fil.x, fil.y); g.lineTo(fil.x - 12, fil.y - 3); g.stroke();
    }
    const nav = vaisseau(t);
    if (nav) {
      g.fillStyle = '#394f74'; g.beginPath(); g.ellipse(nav.x + 3, nav.y + 1, 4, 1.6, 0, 0, TAU); g.fill();
      const gr = g.createLinearGradient(nav.x + 7, 0, nav.x + 17, 0);
      gr.addColorStop(0, 'rgba(255,200,120,.9)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
      g.fillStyle = gr; g.fillRect(nav.x + 7, nav.y, 10, 2);
    }
    const A = ANNEAU;
    for (let i = 0; i < 26; i++) {
      const a = i / 26 * TAU + t * .12;
      if (Math.sin(a) < .05) continue;
      g.fillStyle = i % 5 === 0 ? '#ffcc3a' : '#7ae8ff';
      g.beginPath(); g.arc(A.cx + Math.cos(a) * (A.rx - 1.5), A.cy + Math.sin(a) * (A.ry - 1), .9, 0, TAU); g.fill();
    }
    const sx = SATELLITE.x + Math.sin(t * .2) * 3;
    g.fillStyle = '#1f3a80'; g.fillRect(sx, SATELLITE.y, 4, 5); g.fillRect(sx + 11, SATELLITE.y, 4, 5);
    g.fillStyle = '#4d6992'; g.fillRect(sx + 5, SATELLITE.y + 1, 5, 3);
    if (Math.sin(t * 3) > .6) { g.fillStyle = '#ff6452'; g.beginPath(); g.arc(sx + 7.5, SATELLITE.y - .5, 1, 0, TAU); g.fill(); }

    // Hologramme : ondes, balayage.
    g.save();
    g.beginPath(); g.rect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top); g.clip();
    g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const phase = t * (.5 + i * .07) + i * 1.3;
      const baseY = COURT.top + (COURT.bottom - COURT.top) * ((i + .5) / 5);
      const amp = 14 + (i % 2) * 6;
      g.strokeStyle = cyanClair((.14 + .08 * Math.sin(t * 1.1 + i)) * I);
      g.beginPath();
      for (let x = COURT.left; x <= COURT.right; x += 10) {
        const u = (x - COURT.left) / (COURT.right - COURT.left);
        const y = baseY + Math.sin(u * Math.PI * 2.4 + phase) * amp;
        x === COURT.left ? g.moveTo(x, y) : g.lineTo(x, y);
      }
      g.stroke();
    }
    const bal = COURT.top + ((t * 60) % ((COURT.bottom - COURT.top) + 240)) - 120;
    const gb = g.createLinearGradient(0, bal - 14, 0, bal + 2);
    gb.addColorStop(0, cyan(0)); gb.addColorStop(.85, cyan(.1)); gb.addColorStop(1, cyanClair(.3));
    g.fillStyle = gb; g.fillRect(COURT.left, bal - 14, COURT.right - COURT.left, 16);
    if (but > .02) { g.fillStyle = cyan(.08 * but); g.fillRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top); }
    g.restore();

    // Lignes du terrain, en trait lumineux.
    const lignes = (dx, style) => {
      g.strokeStyle = style; g.lineWidth = 2;
      g.strokeRect(COURT.left + 1 + dx, COURT.top + 1, COURT.right - COURT.left - 2, COURT.bottom - COURT.top - 2);
      g.setLineDash([9, 7]);
      g.beginPath(); g.moveTo(CX + dx, COURT.top); g.lineTo(CX + dx, COURT.bottom); g.stroke();
      g.setLineDash([]);
      g.beginPath(); g.arc(CX + dx, CY, 58, 0, TAU); g.stroke();
      g.beginPath(); g.arc(CX + dx, CY, 10, 0, TAU); g.stroke();
    };
    g.save(); g.shadowColor = '#35e0ff'; g.shadowBlur = 10 * I;
    lignes(0, cyanClair(.85 * I));
    g.restore();
    if (but > .02) {
      g.save(); g.globalCompositeOperation = 'screen'; g.globalAlpha = but * .5;
      lignes(5 * but, '#ff3b5c'); lignes(-5 * but, '#7fe9ff');
      g.restore();
    }

    // Bandes lumineuses, lentilles, balises.
    const pulse = .55 + .45 * Math.sin(t * 1.5);
    g.save();
    g.shadowColor = '#35e0ff'; g.shadowBlur = 8 + pulse * 6;
    g.fillStyle = `rgba(150,240,255,${.7 + pulse * .3})`;
    for (const cx of BANDES_H) for (const y of [K.T + 7, COURT.bottom + 11]) { g.beginPath(); g.roundRect(cx - 22, y, 44, 5, 2.5); g.fill(); }
    for (const cy of BANDES_V) for (const x of [K.L + 10, COURT.right + 11]) { g.beginPath(); g.roundRect(x, cy - 20, 5, 40, 2.5); g.fill(); }
    g.shadowBlur = 6;
    for (const px of PROJECTEURS) { g.beginPath(); g.ellipse(px, COURT.top - 3, 3, 1.3, 0, 0, TAU); g.fill(); }
    g.restore();
    const blink = .5 + .5 * Math.sin(t * 2.2);
    for (const [bx, by] of BALISES) {
      g.fillStyle = '#2a3b5a'; g.beginPath(); g.arc(bx, by, 5.5, 0, TAU); g.fill();
      g.strokeStyle = '#05070e'; g.lineWidth = 1; g.stroke();
      const gr = g.createRadialGradient(bx, by, 0, bx, by, 11);
      gr.addColorStop(0, or(.35 + blink * .6)); gr.addColorStop(.3, or(.25 * blink)); gr.addColorStop(1, or(0));
      g.fillStyle = gr; g.fillRect(bx - 11, by - 11, 22, 22);
      g.fillStyle = blink > .5 ? '#ffe89a' : '#6e4a0c'; g.beginPath(); g.arc(bx, by, 2.8, 0, TAU); g.fill();
    }

    // Rideaux des cages et rails.
    for (const cote of [1, 2]) {
      const x = cote === 1 ? COURT.left : COURT.right;
      const gx = cote === 1 ? COURT.left - BUT.prof : COURT.right;
      const gr = g.createLinearGradient(x - 14, 0, x + 14, 0);
      gr.addColorStop(0, cyanClair(0)); gr.addColorStop(.5, cyanClair(.32 * I)); gr.addColorStop(1, cyanClair(0));
      g.fillStyle = gr; g.fillRect(x - 14, BUT.haut, 28, BUT.bas - BUT.haut);
      g.save();
      g.shadowColor = '#35e0ff'; g.shadowBlur = 16 * I;
      g.strokeStyle = `rgba(190,248,255,${.95 * I})`; g.lineWidth = 3;
      g.beginPath();
      for (let y = BUT.haut; y <= BUT.bas; y += 4) {
        const w = Math.sin(y * .31 + t * 7) * Math.sin(y * .07 - t * 2.3) * 1.2;
        y === BUT.haut ? g.moveTo(x + w, y) : g.lineTo(x + w, y);
      }
      g.stroke(); g.restore();
      for (const z of ZONES) {
        const o = z.points >= 5;
        g.save(); g.shadowColor = o ? '#ffd23e' : '#35e0ff'; g.shadowBlur = 8;
        g.fillStyle = o ? `rgba(255,210,62,${.8 * I})` : `rgba(110,230,255,${.75 * I})`;
        g.beginPath(); g.roundRect(cote === 1 ? x - 5 : x + 1, CY + z.from + 3, 4, z.to - z.from - 6, 2); g.fill();
        g.restore();
      }
      if (but > .02) { g.fillStyle = `rgba(255,255,255,${but * .25})`; g.fillRect(gx, BUT.haut, BUT.prof, BUT.bas - BUT.haut); }
    }

    // Reflet sur les ailes solaires.
    for (const p of PANNEAUX) {
      g.save(); g.beginPath(); g.rect(p.x + 2, p.y + 2, p.l - 4, p.h - 4); g.clip();
      const pos = ((t * 22) % 260) - 60;
      const gr = g.createLinearGradient(p.x + pos - 12, p.y, p.x + pos + 12, p.y + 20);
      gr.addColorStop(0, 'rgba(110,160,255,0)'); gr.addColorStop(.5, 'rgba(140,185,255,.45)'); gr.addColorStop(1, 'rgba(110,160,255,0)');
      g.translate(0, 0); g.fillStyle = gr;
      g.beginPath(); g.moveTo(p.x + pos - 10, p.y); g.lineTo(p.x + pos + 10, p.y); g.lineTo(p.x + pos + 10 - p.h * .55 * 1.8, p.y + p.h); g.lineTo(p.x + pos - 10 - p.h * .55 * 1.8, p.y + p.h); g.fill();
      g.restore();
    }

    // Drones et faisceaux.
    for (const d of DRONES) {
      const [x, y] = positionDrone(d, t);
      const ang = Math.atan2(CY - y, CX - x);
      g.save(); g.translate(x, y); g.rotate(ang);
      const gr = g.createLinearGradient(0, 0, 46, 0);
      gr.addColorStop(0, cyan(.3)); gr.addColorStop(1, cyan(0));
      g.fillStyle = gr; g.beginPath(); g.moveTo(2, 0); g.lineTo(46, -11); g.lineTo(46, 11); g.fill();
      g.restore();
      g.fillStyle = '#2a3b5a';
      for (const [ox, oy] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) { g.beginPath(); g.ellipse(x + ox, y + oy, 2.6, 1.1, 0, 0, TAU); g.fill(); }
      const gb = g.createLinearGradient(0, y - 3, 0, y + 3);
      gb.addColorStop(0, '#6f86ad'); gb.addColorStop(1, '#141d31');
      g.fillStyle = gb; g.beginPath(); g.ellipse(x, y, 5, 3.4, 0, 0, TAU); g.fill();
      g.fillStyle = '#9ff3ff'; g.beginPath(); g.arc(x, y + .8, 1.2, 0, TAU); g.fill();
      if (Math.sin(t * 3 + d.ph) > 0) {
        g.fillStyle = d.feu === 'r' ? '#ff6452' : '#ffcc3a';
        g.beginPath(); g.arc(x, y - 3, 1, 0, TAU); g.fill();
      }
    }
    return cible;
  }
  return { image };
}
