import { G, Mouse } from '../game/state.js';
import { ctx, W, H } from '../core/dom.js';
import { COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, GOAL_DEPTH, DISC_RADIUS, DISC_BIG_RADIUS, TARGET, DIVE_TIME, DIVE_RANGE, DASH_CATCH_MULT, DASH_GAP, CATCH_RADIUS } from '../core/constants.js';
import { dbg } from '../ui/admin.js';
import { options as optionsTraining } from '../ui/training.js';
import { centreDunk, centrePanier, ZONES } from '../game/zones.js';
import { TAU, lerp, clamp, gauss } from '../core/utils.js';
import { getMap } from '../data/maps.js';
import { getSkinId, drawSkinDisc } from '../data/skins.js';
import { LEG_SPRITE, LEG_SPRITE_SCALE, BELL_SPRITE, SIX_ORBES, SIX_DUREE, GUN_SPRITE, RASENGAN } from '../data/specials.js';

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

/* Salle d'entraînement : aucun décor, aucune animation. Juste un sol clair sur
   un fond anthracite et le strict minimum de lignes pour se repérer. Tout ce
   qui bouge ici, ce sont les joueurs et le disque — c'est le but. */
function drawCourtNu() {
  const th = getMap().theme;
  const cw = COURT.right - COURT.left, chh = COURT.bottom - COURT.top;

  ctx.fillStyle = th.bgOuter;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = th.floor;
  ctx.fillRect(COURT.left, COURT.top, cw, chh);

  ctx.strokeStyle = th.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(COURT.left, COURT.top, cw, chh);
  ctx.beginPath(); ctx.moveTo(CX, COURT.top); ctx.lineTo(CX, COURT.bottom); ctx.stroke();
  ctx.beginPath(); ctx.arc(CX, CY, 58, 0, TAU); ctx.stroke();

  // Cages : un simple volet par zone de points, sans effet lumineux.
  const m = getMap();
  for (const side of [1, 2]) {
    const x = side === 1 ? COURT.left : COURT.right;
    const gx = side === 1 ? x - GOAL_DEPTH : x;
    for (const z of m.zones) {
      ctx.fillStyle = z.color;
      ctx.globalAlpha = .5;
      ctx.fillRect(gx, CY + z.from, GOAL_DEPTH, z.to - z.from);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = th.goalStroke; ctx.lineWidth = 1;
      ctx.strokeRect(gx, CY + z.from, GOAL_DEPTH, z.to - z.from);
    }
    ctx.strokeStyle = th.goalStroke; ctx.lineWidth = 2;
    ctx.strokeRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
  }
}

/* ---------------------------------------------------------------------------
   Swag Frisbee Stadium. Une salle de basket de gala : parquet verni, gradins
   pleins, écran suspendu, projecteurs. Le public est engendré à la volée à
   partir de son indice — aucune donnée à stocker, et il reste identique d'une
   image à l'autre. */

// Pseudo-aléatoire stable : le même indice donne toujours le même spectateur.
function graine(i) { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); }

/* Gradins en escalier : chaque marche porte son nez éclairé, et l'ensemble
   s'éclaircit en descendant vers le parquet. Les tribunes du bas suivent la
   même logique à l'envers, pour que la lumière vienne toujours du terrain. */
function drawMarches(y0, hauteur, versLeBas) {
  const RANGS = 7, pas = hauteur / RANGS;
  for (let r = 0; r < RANGS; r++) {
    const k = versLeBas ? r : RANGS - 1 - r;      // 0 = le plus loin du terrain
    const y = y0 + r * pas;
    ctx.fillStyle = `rgba(255,255,255,${.04 + k * .012})`;
    ctx.fillRect(0, y, W, pas - 3);
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    ctx.fillRect(0, y + pas - 4, W, 1.6);
  }
}

/* Le public, en rangs serrés : buste et tête, comme une vraie tribune pleine.
   Il applaudit en rythme, se lève au but et lève les bras sur un Perfect Dive
   — toute l'ambiance passe par lui, sans un son de plus. */
function drawRangs(y0, hauteur, calme, leve) {
  const cols = getMap().theme.crowdColors;
  const RANGS = 5;
  for (let r = 0; r < RANGS; r++) {
    const y = y0 + hauteur * (.14 + r * .19);
    for (let x = 6; x < W; x += 13) {
      const i = r * 991 + x;
      const saut = Math.sin(G.now * 3 + i) * 1.6 * calme;
      const debout = leve * 5;
      // Assez présent pour faire une foule, assez transparent pour laisser
      // deviner les marches derrière : à pleine opacité, les gradins
      // disparaissaient complètement sous les spectateurs.
      ctx.globalAlpha = .34 + r * .07;
      ctx.fillStyle = cols[(graine(i + 7) * cols.length) | 0];
      ctx.fillRect(x, y + saut - debout, 7, 9);
      ctx.beginPath(); ctx.arc(x + 3.5, y - 3 + saut - debout, 3.2, 0, TAU); ctx.fill();
      // Bras levés quand la salle s'enflamme.
      if (leve > .25) {
        ctx.fillRect(x - 1.5, y - 8 + saut - debout, 1.5, 6);
        ctx.fillRect(x + 7, y - 8 + saut - debout, 1.5, 6);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawGradins() {
  const th = getMap().theme;
  const hautH = COURT.top - 8;
  const basY = COURT.bottom + 8, basH = H - basY;

  ctx.fillStyle = '#141824';
  ctx.fillRect(0, 0, W, hautH);
  ctx.fillRect(0, basY, W, basH);
  drawMarches(0, hautH, true);
  drawMarches(basY, basH, false);

  const but = Math.max(G.goalFlash[0], G.goalFlash[1]);
  const surprise = G.zoom ? 1 : 0;
  const calme = G.training ? .35 : 1;          // moins agité à l'entraînement
  const leve = Math.min(1, but + surprise) * calme;
  drawRangs(0, hautH, calme, leve);
  drawRangs(basY, basH, calme, leve);
}

/* Écran géant suspendu. Il se loge dans la bande libre entre le bandeau de
   score et le parquet : plus haut, il passait derrière le HUD et on n'en
   voyait qu'une tranche. Le score est déjà lisible en haut, l'écran affiche
   donc surtout le nom de la salle. */
function drawEcranGeant() {
  const l = 236, h = 26, x = CX - l / 2, y = COURT.top - h - 6;
  ctx.save();
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(x, y, l, h);
  ctx.strokeStyle = `rgba(53,224,255,${.5 + Math.sin(G.now * 3) * .22})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, l, h);

  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = Math.sin(G.now * 2.4) > -.3 ? '#35e0ff' : '#1b6b80';
  ctx.font = '700 11px "Archivo Black", sans-serif';
  ctx.fillText('SWAG FRISBEE STADIUM', CX, y + h / 2);

  // Petits témoins lumineux qui défilent, comme un bandeau à LED.
  ctx.fillStyle = 'rgba(255,210,62,.8)';
  for (let i = 0; i < 6; i++) {
    const px = x + 8 + ((G.now * 60 + i * 42) % (l - 16));
    ctx.fillRect(px, y + 2, 3, 2);
    ctx.fillRect(px, y + h - 4, 3, 2);
  }
  ctx.restore();
}

/* Panier monté sur son bras articulé. Il est avancé sur le terrain, au-dessus
   de la cage : c'est une vraie cible à cinq points, il faut donc pouvoir y
   faire passer le disque par-dessus la défense. Le poteau vient toujours du
   bord le plus proche, jamais par-dessus le parquet. */
function drawPanier(side) {
  const vers = side === 1 ? 1 : -1;            // 1 = poteau à gauche
  const c = centrePanier(side);
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(vers, 1);                          // miroir pour le côté droit

  // Bras qui part du bord du terrain le plus proche. Dans le repère miroité,
  // ce bord est toujours à gauche : une seule valeur suffit pour les deux
  // côtés. En mesurant depuis COURT.left pour tout le monde, le bras du panier
  // de droite traversait tout le terrain.
  const recul = -(side === 1 ? c.x - COURT.left : COURT.right - c.x);
  ctx.strokeStyle = '#8b94a6'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(recul, 30); ctx.lineTo(recul, -34); ctx.lineTo(-26, -34); ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(recul, -12); ctx.lineTo(-28, -30); ctx.stroke();

  ctx.fillStyle = '#f2f4f8'; ctx.fillRect(-28, -44, 52, 34);
  ctx.strokeStyle = '#20263a'; ctx.lineWidth = 3; ctx.strokeRect(-28, -44, 52, 34);
  ctx.strokeStyle = '#e5384f'; ctx.lineWidth = 2; ctx.strokeRect(-14, -32, 24, 16);
  ctx.restore();

  // L'anneau, dessiné hors du miroir pour que le chiffre reste lisible.
  const pulse = .55 + Math.sin(G.now * 3) * .2;
  ctx.save();
  ctx.strokeStyle = `rgba(255,140,31,${pulse + .3})`;
  ctx.fillStyle = `rgba(255,140,31,.14)`;
  ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(c.x, c.y, ZONES.RAYON_PANIER, 0, TAU);
  ctx.fill(); ctx.stroke();
  // Filet suggéré par quelques mailles sous l'anneau.
  ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.4;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(c.x + i * 8, c.y + ZONES.RAYON_PANIER * .7);
    ctx.lineTo(c.x + i * 4, c.y + ZONES.RAYON_PANIER + 14);
    ctx.stroke();
  }
  ctx.fillStyle = '#ff8c1f';
  ctx.font = '700 14px "Archivo Black", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(ZONES.POINTS_PANIER, c.x, c.y);
  ctx.restore();
}

/* Cercles bonus et zone de dunk, dessinés à même le parquet. */
function drawZonesSol() {
  if (!getMap().zonesSol) return;
  const vif = G.training ? 1.35 : 1;          // plus lisibles à l'entraînement

  for (const side of [1, 2]) {
    const c = centreDunk(side);
    const vers = side === 1 ? 1 : -1;
    ctx.save();
    ctx.strokeStyle = `rgba(255,210,62,${.5 * vif})`;
    ctx.fillStyle = `rgba(255,210,62,${.07 * vif})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(c.x, c.y, ZONES.DUNK_RAYON, -Math.PI / 2 * vers, Math.PI / 2 * vers, vers < 0);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  for (const c of G.cercles) {
    // Apparition et disparition en fondu, pour qu'ils ne surgissent pas.
    const k = Math.min(1, c.t / .25) * Math.min(1, (ZONES.DUREE - c.t) / .5);
    const pulse = 1 + Math.sin(G.now * 6) * .06;
    ctx.save();
    ctx.globalAlpha = Math.max(0, k) * vif;
    ctx.fillStyle = 'rgba(93,240,138,.16)';
    ctx.strokeStyle = 'rgba(93,240,138,.9)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(c.x, c.y, ZONES.RAYON * pulse, 0, TAU);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(93,240,138,.95)';
    ctx.font = '700 13px "Archivo Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+1', c.x, c.y);
    ctx.restore();
  }
}

function drawCourtStade() {
  const th = getMap().theme;
  const cw = COURT.right - COURT.left, chh = COURT.bottom - COURT.top;

  ctx.fillStyle = th.bgOuter;
  ctx.fillRect(0, 0, W, H);
  drawGradins();

  // Parquet : lattes à peine suggérées — en pleine opacité elles rayaient le
  // sol comme un tapis — puis la nappe de lumière des projecteurs.
  ctx.fillStyle = th.floor;
  ctx.fillRect(COURT.left, COURT.top, cw, chh);
  ctx.globalAlpha = .3;
  ctx.fillStyle = th.floorClair;
  for (let x = COURT.left; x < COURT.right; x += 26) ctx.fillRect(x, COURT.top, 13, chh);
  ctx.globalAlpha = 1;
  const halo = ctx.createRadialGradient(CX, CY, 40, CX, CY, Math.max(cw, chh) * .62);
  halo.addColorStop(0, 'rgba(255,244,214,.3)');
  halo.addColorStop(1, 'rgba(255,244,214,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(COURT.left, COURT.top, cw, chh);

  ctx.save();
  ctx.beginPath(); ctx.rect(COURT.left, COURT.top, cw, chh); ctx.clip();

  // Logo peint au centre, comme sur un vrai parquet.
  ctx.save();
  ctx.globalAlpha = .16;
  ctx.translate(CX, CY);
  ctx.fillStyle = '#2a1a0c';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '700 30px "Archivo Black", sans-serif';
  ctx.fillText('SWAG FRISBEE', 0, -14);
  ctx.font = '700 20px "Archivo Black", sans-serif';
  ctx.fillText('CLUB', 0, 12);
  ctx.restore();

  // Raquettes peintes, sous le marquage : c'est ce qui donne au parquet sa
  // couleur d'équipe et ancre les deux camps.
  ctx.fillStyle = 'rgba(47,107,255,.45)';
  ctx.fillRect(COURT.left + 6, CY - 68, 108, 136);
  ctx.fillRect(COURT.right - 6 - 108, CY - 68, 108, 136);

  // Marquage de basket : touche, médiane, rond central et arcs à 3 points.
  ctx.strokeStyle = th.line; ctx.lineWidth = 3;
  ctx.strokeRect(COURT.left + 6, COURT.top + 6, cw - 12, chh - 12);
  ctx.beginPath(); ctx.moveTo(CX, COURT.top); ctx.lineTo(CX, COURT.bottom); ctx.stroke();
  ctx.beginPath(); ctx.arc(CX, CY, 62, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.arc(CX, CY, 14, 0, TAU); ctx.stroke();
  for (const side of [1, 2]) {
    const x = side === 1 ? COURT.left + 6 : COURT.right - 6;
    const vers = side === 1 ? 1 : -1;
    ctx.beginPath();
    ctx.arc(x, CY, 168, -Math.PI / 2 * vers, Math.PI / 2 * vers, vers < 0);
    ctx.stroke();
    // Raquette.
    ctx.strokeRect(side === 1 ? COURT.left + 6 : COURT.right - 6 - 108, CY - 68, 108, 136);
  }
  drawZonesSol();
  ctx.restore();

  // Cages chromées, avec leurs volets de points.
  const m = getMap();
  for (const side of [1, 2]) {
    const x = side === 1 ? COURT.left : COURT.right;
    const gx = side === 1 ? x - GOAL_DEPTH : x;
    for (const z of m.zones) {
      ctx.fillStyle = z.color; ctx.globalAlpha = .45;
      ctx.fillRect(gx, CY + z.from, GOAL_DEPTH, z.to - z.from);
      ctx.globalAlpha = 1;
      // Sa valeur écrite dans chaque volet : on sait où viser sans deviner.
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = '700 17px "Archivo Black", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(z.points, gx + GOAL_DEPTH / 2, CY + (z.from + z.to) / 2);
    }
    ctx.strokeStyle = th.goalStroke; ctx.lineWidth = 4;
    ctx.strokeRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
    drawPanier(side);
  }
  drawEcranGeant();
}

function drawCourt() {
  if (getMap().style === 'stade') { drawCourtStade(); return; }
  if (getMap().style === 'nu') { drawCourtNu(); return; }
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
    // Les fantômes de dash s'effacent vite : le plus proche reste léger, les
    // plus anciens deviennent quasi invisibles. La courbe au cube accentue
    // franchement l'écart, là où une décroissance linéaire donnait une bouillie
    // de silhouettes toutes aussi opaques les unes que les autres.
    const k = clamp(g.life / .55, 0, 1);
    ctx.globalAlpha = k * k * k * .22;
    ctx.translate(g.x, g.y - 30 * SCALE);
    if (g.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -24 * SCALE, 0, 48 * SCALE, 60 * SCALE);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// Les six orbes du mode Six Paths : un anneau régulier qui tourne lentement,
// centré sur le buste — au-dessus des jambes, pas autour des pieds. Elles
// s'ouvrent et se referment avec la durée restante, pour que l'entrée et la
// sortie du mode se voient sans avoir à lire une jauge.
function dessinerOrbes(p) {
  const c = p.char;
  // Le buste occupe les rangées 10 à 15 du sprite : son milieu tombe ici.
  const cy = p.y - 30 * SCALE + 13 * 3 * SCALE;
  // Montée à l'apparition, repli à la fin.
  const k = Math.min(1, (SIX_DUREE - p.sixT) * 3.5, p.sixT * 2.2);
  if (k <= 0) return;
  const R = SIX_ORBES.rayon * SCALE * k;
  for (let i = 0; i < SIX_ORBES.n; i++) {
    const a = p.sixA + (i * TAU) / SIX_ORBES.n;
    // Ellipse écrasée : le terrain est vu de haut, un cercle parfait ferait
    // flotter les orbes au lieu de tourner autour de lui.
    const x = p.x + Math.cos(a) * R;
    const y = cy + Math.sin(a) * R * .42;
    const r = 4.6 * SCALE * k;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.2);
    halo.addColorStop(0, 'rgba(120,90,180,.5)');
    halo.addColorStop(1, 'rgba(120,90,180,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#15111f';
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    // Reflet unique, décalé en haut à gauche : sans lui l'orbe est un trou noir
    // plat et on ne voit pas qu'elle tourne.
    ctx.fillStyle = 'rgba(190,170,255,.55)';
    ctx.beginPath(); ctx.arc(x - r * .32, y - r * .34, r * .3, 0, TAU); ctx.fill();
  }
  void c;
}

function drawPlayer(p) {
  const c = p.char;
  drawGhosts(p);
  drawShadow(p.x, p.y, 17 * SCALE);
  let fr = p.forceFr;
  if (!fr) {
    fr = 'idle';
    // Le plongeon a sa propre pose : sans elle il réutilisait celle du dash et
    // les deux actions étaient impossibles à distinguer.
    // Les poses tiennent un peu au-delà de l'action : le dash ne dure que
    // 0,17 s, la pose passait trop vite pour être perçue. dashGap et feintCd
    // servent de rémanence sans rien changer au gameplay.
    // Bras tendu du Tir Matilda : la pose de lancer tient le temps de la visée,
    // sinon elle passait en deux images et on ne voyait jamais Leon mettre en joue.
    if (p.viseT > 0) fr = 'throw';
    else if (p.diveT > 0 || p.diveDown > 0) fr = 'dive';
    else if (p.dashT > 0 || p.dashGap > DASH_GAP - .28) fr = 'dash';
    else if (p.holding && (p.charging || p.throwPoseT > 0)) fr = 'throw';
    else if (p.moving) fr = (Math.floor(p.walk) % 2) ? 'run1' : 'run2';
  }
  // Les six orbes passent AVANT le sprite : elles gravitent derrière lui, elles
  // ne doivent jamais recouvrir ni son corps ni le disque qu'il tient.
  if (p.sixT > 0) dessinerOrbes(p);
  // p.frames porte le skin choisi ; il retombe sur la tenue d'origine si le
  // personnage n'en a pas d'autre. Pendant l'ultime, la tenue Six Paths passe
  // devant tout le reste : c'est un état, pas un choix du joueur.
  const jeu = (p.sixT > 0 && c.sixpaths) ? c.sixpaths : (p.frames || c.frames);
  const img = jeu[fr] || c.frames[fr];
  ctx.save();
  ctx.translate(p.x, p.y - 30 * SCALE);
  if (p.face < 0) ctx.scale(-1, 1);
  // Plongeon : le perso bascule à l'horizontale. Après un plongeon dans le vide
  // il reste à plat au sol le temps de se relever — c'est le risque du whiff.
  // Le plongeon bascule vers l'avant pour que la tête parte la première, comme
  // une tête au corner : c'est elle qui va chercher le disque.
  if (p.diveT > 0) ctx.rotate(-0.62 * Math.min(1, p.diveT / DIVE_TIME));
  else if (p.diveDown > 0) ctx.rotate(-0.75);
  if (p.charging && !G.replay) ctx.translate(gauss() * p.charge * 2.4, gauss() * p.charge * 2.4);
  if (p.stun > 0) ctx.rotate(Math.sin(G.now * 14) * .12);
  // Jingle Bells : sa tête-cloche n'est pas posée sur ses épaules, elle
  // lévite. On dessine donc le corps sans elle, puis la tête par-dessus avec
  // un décalage propre — elle flotte, oscille et prend du retard sur les
  // déplacements, ce qui se voit surtout quand il court ou dashe.
  if (p.ck === 'jingle' && !G.replay) {
    // On découpe la pose courante en deux au lieu de piocher dans une frame
    // figée : sinon son corps restait planté en position debout pendant qu'il
    // courait ou dashait. OR vaut 9 car seules ces rangées sont en or — la
    // dixième porte l'écharpe, qui appartient aux épaules et ne doit donc pas
    // s'envoler avec la cloche.
    const OR = 9, LIGNE = 3 * SCALE;
    ctx.drawImage(img, 0, OR, 16, 20 - OR,
      -24 * SCALE, OR * LIGNE, 48 * SCALE, (20 - OR) * LIGNE);
    // Retard sur le mouvement + oscillation lente et rotation légère.
    p.bellLag = p.bellLag || { x: 0, y: 0, a: 0 };
    const vx = p.vx + p.dashV.x, vy = p.vy + p.dashV.y;
    p.bellLag.x += (-vx * .012 - p.bellLag.x) * .18;
    p.bellLag.y += (-vy * .010 - p.bellLag.y) * .18;
    p.bellLag.a += (clamp(-vx * .0006, -.22, .22) - p.bellLag.a) * .15;
    // Pendant son ultime, sa tête est justement partie devenir la cloche
    // géante devant sa cage : il reste donc décapité le temps du sort.
    const enUlti = G.bell && G.bell.owner === p;
    if (!enUlti) {
      const flot = Math.sin(G.now * 2.4 + p.side) * 2.4;
      ctx.save();
      ctx.translate(p.bellLag.x * SCALE, p.bellLag.y * SCALE + flot - 6);
      ctx.rotate(p.bellLag.a + Math.sin(G.now * 1.7) * .05);
      ctx.drawImage(img, 0, 0, 16, OR, -24 * SCALE, 0, 48 * SCALE, OR * LIGNE);
      ctx.restore();
    }
  } else {
    ctx.drawImage(img, -24 * SCALE, 0, 48 * SCALE, 60 * SCALE);
  }
  ctx.restore();
  // Le pistolet, posé au bout du bras tendu et orienté dans l'axe du tir. Il
  // vient après le sprite : c'est la main qui le tient, il passe donc devant.
  if (p.viseT > 0) {
    const l = 8 * 3 * SCALE, h = 8 * 3 * SCALE;
    ctx.save();
    ctx.translate(p.x + p.face * 20 * SCALE, p.y + 5 * SCALE);
    if (p.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(GUN_SPRITE, 0, 0, 8, 8, -l / 2, -h / 2, l, h);
    ctx.restore();
  }
  if (p.charging && p.charge > 0 && !G.replay) {
    const col = p.charge >= 1 ? '#ff5340' : c.accent;
    const r = 32 * SCALE;
    ctx.strokeStyle = col;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * p.charge);
    ctx.stroke();
    // Petite flèche posée sur l'anneau de charge, dans la direction visée :
    // l'adversaire voit où part le tir, ce qui donne tout leur sens au dash et
    // à la feinte pour le prendre de vitesse.
    const aim = p.human && !p.ai
      ? Math.atan2(Mouse.y - p.y, Mouse.x - p.x)
      : (p.ai && p.ai.emaTarget && p.ai.emaTarget.x
        ? Math.atan2(p.ai.emaTarget.y - p.y, p.ai.emaTarget.x - p.x)
        : (p.face >= 0 ? 0 : Math.PI));
    ctx.save();
    ctx.translate(p.x + Math.cos(aim) * r, p.y + Math.sin(aim) * r);
    ctx.rotate(aim);
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(11, 0); ctx.lineTo(-5, -7); ctx.lineTo(-5, 7);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
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
    // Le tir du mode Six Paths part en bleu Rasengan. La tenue et les orbes
    // restent dorées : c'est au moment du tir, et à ce moment-là seulement,
    // que le chakra prend cette couleur.
    drawDiscObj(d.x, d.y, d.spin, 1, RASENGAN, r);
    ctx.strokeStyle = 'rgba(90,210,255,.85)'; ctx.lineWidth = 3;
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
    ctx.drawImage((p.frames || c.frames).idle, 0, 0, 16, 20, alignRight ? x + 150 : x + 6, 8, 24, 30);
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
  const r = G.replay;
  // Les bandes s'ouvrent au début et se referment en fin de replay, jusqu'à
  // masquer complètement l'écran avant le retour au jeu.
  let band = 54;
  if (r && r.closing > 0) band = 54 + (H / 2 - 54) * Math.min(1, r.closing / .3);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, band);
  ctx.fillRect(0, H - band, W, band);
  if (r && r.closing > 0) return;       // pendant la fermeture, plus aucun texte

  ctx.fillStyle = '#fff';
  ctx.font = '14px "Archivo Black", system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('REPLAY', 48, 33);
  // Hint discret, centré en bas, qui clignote très légèrement.
  const a = .55 + .25 * Math.sin(G.now * 4);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')';
  ctx.font = '11px "Archivo Black", system-ui, sans-serif';
  ctx.fillText('CLIQUE POUR PASSER', CX, H - 20);
}

/* Cloche de Minuit : la tête de Jingle, devenue géante, se balance devant sa
   cage. Elle est dessinée à la main plutôt qu'agrandie depuis le sprite, pour
   rester nette à cette taille. */
function drawBell() {
  const b = G.bell;
  // L'image se charge de façon asynchrone : tant qu'elle n'est pas prête on ne
  // dessine rien plutôt que de risquer un drawImage sur une image vide.
  if (!BELL_SPRITE.complete || !BELL_SPRITE.naturalWidth) return;
  const k = Math.min(1, b.t / .4);                 // apparition
  const fin = Math.min(1, (b.dur - b.t) / .5);     // disparition
  const a = Math.min(k, fin);
  const R = 58 * (0.8 + 0.2 * k);

  // Trajet de la tête : elle quitte les épaules de Jingle et rejoint la cage
  // en grossissant, au lieu d'apparaître d'un coup à destination.
  const vol = Math.min(1, b.t / .45);
  const e = 1 - Math.pow(1 - vol, 3);
  // Elle finit centrée pile au milieu de la cage — c'est de ce point que
  // partent le halo et les ondes.
  const ox = b.owner ? b.owner.x + (b.x - b.owner.x) * e : b.x;
  const oy = b.owner ? (b.owner.y - 30) + (b.y - (b.owner.y - 30)) * e : b.y;
  // Un peu plus courte que la cage, pour la garder lisible sans l'avaler.
  const bh = (GOAL_BOTTOM - GOAL_TOP) * .88 * (0.35 + 0.65 * e);
  const bw = bh * (BELL_SPRITE.naturalWidth / BELL_SPRITE.naturalHeight);

  ctx.save();
  ctx.globalAlpha = a;

  // Halo doré, plus intense au moment où elle sonne.
  const halo = ctx.createRadialGradient(ox, oy, 8, ox, oy, R * 2.2);
  halo.addColorStop(0, `rgba(245,197,66,${.34 + b.ring * .4})`);
  halo.addColorStop(1, 'rgba(245,197,66,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(ox, oy, R * 2.2, 0, TAU); ctx.fill();

  // Ondes sonores à chaque coup, tracées avant la cloche pour qu'elles semblent
  // en émaner plutôt que de lui passer devant.
  if (b.ring > .02) {
    ctx.strokeStyle = `rgba(255,233,160,${b.ring * .8})`;
    ctx.lineWidth = 3;
    for (const m of [1.3, 1.7, 2.1]) {
      ctx.beginPath(); ctx.arc(ox, oy, R * m * (1 + (1 - b.ring) * .4), 0, TAU); ctx.stroke();
    }
  }

  // Elle pivote sur son anneau, comme une cloche vraiment suspendue : en la
  // faisant tourner sur son centre, le balancement ressemblait à une toupie.
  const ANCRE = .12;                               // hauteur de l'anneau dans l'image
  ctx.translate(ox, oy - bh * (.5 - ANCRE));
  ctx.rotate(b.bal * .2 * vol);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(BELL_SPRITE, -bw / 2, -bh * ANCRE, bw, bh);

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Calques de debug, pilotés par les interrupteurs du panneau admin. Ils sont
// dessinés en espace écran, après la caméra, pour rester lisibles.
// ---------------------------------------------------------------------------
let fpsT = 0, fpsN = 0, fpsVal = 0, fpsLast = 0;

function drawDebug() {
  if (!G.p1) return;
  // L'entraînement dispose des mêmes calques que le panneau admin, pilotés par
  // ses propres cases à cocher : c'est le même besoin, autant réutiliser.
  const traj = dbg.traj || (G.training && optionsTraining.trajectoires);
  const hitbox = dbg.hitbox || (G.training && optionsTraining.hitboxes);

  // Trajectoire prédite du disque : on simule ses rebonds à l'avance.
  if (traj && G.disc && G.disc.free) {
    let x = G.disc.x, y = G.disc.y, vx = G.disc.vx, vy = G.disc.vy;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,210,62,.75)'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let i = 0; i < 220; i++) {
      x += vx / 60; y += vy / 60;
      if (y < COURT.top + 9) { y = COURT.top + 9; vy = -vy; }
      if (y > COURT.bottom - 9) { y = COURT.bottom - 9; vy = -vy; }
      ctx.lineTo(x, y);
      if (x < COURT.left - 20 || x > COURT.right + 20) break;
    }
    ctx.stroke(); ctx.restore();
  }

  // Intentions de l'IA : sa cible courante et son état.
  if (dbg.ia && G.p2 && G.p2.ai) {
    const a = G.p2.ai;
    ctx.save();
    if (a.target) {
      ctx.strokeStyle = 'rgba(53,224,255,.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(G.p2.x, G.p2.y); ctx.lineTo(a.target.x, a.target.y); ctx.stroke();
      ctx.beginPath(); ctx.arc(a.target.x, a.target.y, 8, 0, TAU); ctx.stroke();
    }
    ctx.fillStyle = '#35e0ff';
    ctx.font = '11px Consolas, monospace'; ctx.textAlign = 'center';
    ctx.fillText(a.state + ' · aggro ' + a.aggro.toFixed(1), G.p2.x, G.p2.y - 60);
    ctx.restore();
  }

  // Hitboxes : rayon d'attrapé de chaque joueur, élargi pendant un dash.
  if (hitbox) {
    ctx.save();
    ctx.lineWidth = 2;
    for (const p of [G.p1, G.p2]) {
      if (!p) continue;
      const bonus = (p.dashT > 0 || p.cancelCatchT > 0) ? DASH_CATCH_MULT : 1;
      ctx.strokeStyle = bonus > 1 ? 'rgba(93,240,138,.9)' : 'rgba(255,255,255,.55)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.char.catchR * CATCH_RADIUS * bonus, 0, TAU); ctx.stroke();
      if (p.diveT > 0) {
        ctx.strokeStyle = 'rgba(255,83,64,.9)';
        ctx.beginPath(); ctx.arc(p.x, p.y, DIVE_RANGE, 0, TAU); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Compteur d'images et charge par image.
  if (dbg.fps) {
    const now = performance.now();
    if (fpsLast) { fpsT += now - fpsLast; fpsN++; }
    fpsLast = now;
    if (fpsT > 400) { fpsVal = Math.round(1000 / (fpsT / fpsN)); fpsT = 0; fpsN = 0; }
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(6, 6, 132, 44);
    ctx.fillStyle = fpsVal >= 55 ? '#5df08a' : (fpsVal >= 30 ? '#ffd23e' : '#ff5340');
    ctx.font = '13px Consolas, monospace'; ctx.textAlign = 'left';
    ctx.fillText(fpsVal + ' fps', 14, 24);
    ctx.fillStyle = '#9fb4dd'; ctx.font = '10px Consolas, monospace';
    ctx.fillText('particules ' + G.particles.length + ' · trail ' + G.trail.length, 14, 40);
    ctx.restore();
  }
}

export function render() {
  ctx.save();
  if (G.shake > 0.3) ctx.translate(gauss() * G.shake, gauss() * G.shake);
  // Caméra du replay : serrée sur le lanceur avant le tir, elle suit ensuite le
  // disque, puis se resserre encore à l'approche du but.
  // Caméra du replay : la position et le zoom sont lissés dans la boucle de
  // jeu (voir loop.js), on ne fait ici que borner le cadrage au terrain.
  if (G.replay && !G.replay.closing && G.replay.cam) {
    const c = G.replay.cam, z = c.z;
    const cx = clamp(c.x, W / (2 * z), W - W / (2 * z));
    const cy = clamp(c.y, H / (2 * z), H - H / (2 * z));
    ctx.translate(W / 2, H / 2);
    ctx.scale(z, z);
    ctx.translate(-cx, -cy);
  }
  // Zoom caméra du Perfect Dive : on grossit autour du plongeur puis on
  // revient, en gardant le cadrage dans les limites du terrain.
  if (G.zoom) {
    const k = Math.min(1, G.zoom.t / G.zoom.dur);
    // Courbe adoucie aux deux extrémités : le zoom monte et redescend en
    // douceur au lieu de démarrer et de finir sèchement.
    const amt = Math.pow(Math.sin(k * Math.PI), 1.6) * .16;
    const z = 1 + amt;
    ctx.translate(G.zoom.x, G.zoom.y);
    ctx.scale(z, z);
    ctx.translate(-G.zoom.x, -G.zoom.y);
  }
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
  if (G.bell) drawBell();
  drawParticles();
  // Pas de HUD à l'entraînement : il n'y a ni score ni objectif à suivre, et le
  // bandeau mangerait la place de l'historique des actions.
  if (G.p1 && !G.demo && !G.training) drawHUD();
  if (G.p1 && !G.demo) drawCrosshair();
  drawTexts();
  drawCommentator();
  ctx.restore();
  // Les bandes et le logo REPLAY sont en espace écran : dessinés dans la
  // transformation caméra, ils auraient été zoomés avec le terrain.
  if (G.replay) drawReplayOverlay();
  drawDebug();
  // Flash du Perfect Dive, appliqué hors zoom pour couvrir tout l'écran.
  // Plafonné à 1 : la transformation Six Paths pousse la valeur bien au-delà
  // pour blanchir complètement l'écran, et redescend ensuite par le même chemin.
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, G.flash * .55).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}
