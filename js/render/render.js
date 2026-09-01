import { G, Mouse } from '../game/state.js';
import { ctx, W, H, viserCanvas } from '../core/dom.js';
import { COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, GOAL_DEPTH, DISC_RADIUS, DISC_BIG_RADIUS, TARGET, DIVE_TIME, DIVE_RANGE, DASH_CATCH_MULT, DASH_GAP, CATCH_RADIUS, applyMap } from '../core/constants.js';
import { dbg } from '../ui/admin.js';
import { options as optionsTraining } from '../ui/training.js';
import { centreDunk, centrePanier, ZONES } from '../game/zones.js';
import { TAU, lerp, clamp, gauss } from '../core/utils.js';
import { getMap, getMapId, setMapId } from '../data/maps.js';
import { getSkinId, drawSkinDisc, deformationDisque, tracerContour, teinteDeCharge, chaufferCouleur, avecAlpha } from '../data/skins.js';
import { LEG_SPRITE, LEG_SPRITE_SCALE, BELL_SPRITE, SIX_ORBES, SIX_DUREE, GUN_SPRITE, RASENGAN, PIRATAGE_DUREE, CHIEN_VIDEO, CHIEN_DUREE } from '../data/specials.js';
import { Reglages } from '../data/disc-fx.js';
import { rayonSables, centreSables, densiteTempete } from '../game/desert.js';
import { etiquetteJoueur, Partie, monJoueur, enMiroir, skinDuDisque } from '../reseau/partie.js';
import { Reseau } from '../reseau/connexion.js';

ctx.imageSmoothingEnabled = false;
const SCALE = 1.6;

// Un texte dessiné À L'INTÉRIEUR de la transformation miroir doit rester
// lisible : sans ce contre-basculement local, chaque lettre s'afficherait à
// l'envers. La position, elle, hérite correctement du miroir extérieur — on
// ne la touche pas, seule l'orientation locale du texte est annulée.
function texteMonde(txt, x, y) {
  if (!enMiroir()) { ctx.fillText(txt, x, y); return; }
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(-1, 1);
  ctx.fillText(txt, 0, 0);
  ctx.restore();
}
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

// Étoiles filantes de fond : elles n'existent que pendant que le disque
// Galaxie est en jeu. Dessinées avec les étoiles du décor, donc loin derrière
// l'action — elles doivent se remarquer sans jamais se disputer le regard.
function drawFilantes() {
  ctx.lineCap = 'round';
  for (const f of G.filantes) {
    const k = f.t / f.dur;
    ctx.globalAlpha = Math.sin(k * Math.PI) * .55;
    const g = ctx.createLinearGradient(f.x, f.y, f.x - f.vx * .12, f.y - f.vy * .12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, 'rgba(140,200,255,0)');
    ctx.strokeStyle = g; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.x - f.vx * .12, f.y - f.vy * .12);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt';
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
  texteMonde('SWAG FRISBEE STADIUM', CX, y + h / 2);

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
  texteMonde(ZONES.POINTS_PANIER, c.x, c.y);
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
    texteMonde('+1', c.x, c.y);
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
  texteMonde('SWAG FRISBEE', 0, -14);
  ctx.font = '700 20px "Archivo Black", sans-serif';
  texteMonde('CLUB', 0, 12);
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
      texteMonde(z.points, gx + GOAL_DEPTH / 2, CY + (z.from + z.to) / 2);
    }
    ctx.strokeStyle = th.goalStroke; ctx.lineWidth = 4;
    ctx.strokeRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
    drawPanier(side);
  }
  drawEcranGeant();
}

// ---------------------------------------------------------------------------
// DUNE DE RÂ — le terrain du désert, au crépuscule.
//
// Tout ce qui suit est décoratif sauf les sables mouvants et la tempête, qui
// sont des règles de jeu et vivent dans game/desert.js. Le rendu ne fait que
// les montrer ; il ne décide de rien.
// ---------------------------------------------------------------------------

// Éléments de décor semés une fois pour toutes. Les tirer au sort à chaque
// image les ferait grésiller sur place au lieu de tenir en place.
let decorDesert = null;
function semerDecor() {
  const r = makeRngHack(20250823);
  const cactus = [];
  // Deux de chaque côté, hors du terrain : purement décoratifs, ils ne doivent
  // jamais se retrouver sur une trajectoire.
  for (const cx of [COURT.left - 38, COURT.right + 38]) {
    cactus.push({ x: cx, y: COURT.top + 40 + r() * 40, ech: .9 + r() * .5, ph: r() * TAU });
    cactus.push({ x: cx, y: COURT.bottom - 40 - r() * 40, ech: .9 + r() * .5, ph: r() * TAU });
  }
  const palmiers = [];
  for (let i = 0; i < 6; i++) {
    palmiers.push({ x: 60 + r() * (W - 120), y: COURT.top - 6 - r() * 22, ech: .7 + r() * .5, ph: r() * TAU });
  }
  // Grain du sable : figé, sinon le sol scintille comme de la neige.
  const grains = [];
  for (let i = 0; i < 240; i++) {
    grains.push({ x: COURT.left + r() * (COURT.right - COURT.left), y: COURT.top + r() * (COURT.bottom - COURT.top), ph: r() * TAU, clair: r() > .5 });
  }
  // Trois touffes de paille, chacune à son rythme.
  const pailles = [];
  for (let i = 0; i < 3; i++) pailles.push({ v: 74 + r() * 60, y: .2 + r() * .6, r: 8 + r() * 6, ph: r() * 900 });
  // Cailloux du pourtour. Ils ne servent qu'à une chose : dire que le sable
  // autour du terrain n'est pas le sable du terrain.
  const cailloux = [];
  for (let i = 0; i < 90; i++) {
    const x = r() * W, y = COURT.top + r() * (H - COURT.top);
    // On les tient hors de l'aire de jeu, sinon ils passent sous les joueurs.
    if (x > COURT.left - 14 && x < COURT.right + 14 && y > COURT.top - 14 && y < COURT.bottom + 14) continue;
    cailloux.push({ x, y, r: 1.6 + r() * 3.4, clair: r() > .6 });
  }
  decorDesert = { cactus, palmiers, grains, pailles, cailloux };
}

function palmierDesert(g, th, x, y, ech, t, ph) {
  g.save(); g.translate(x, y); g.scale(ech, ech);
  g.rotate(Math.sin(t * 1.2 + ph) * .1);
  g.strokeStyle = th.pailleFonce; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(3, -18, 2, -34); g.stroke();
  g.fillStyle = th.vertFonce;
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * .62 + Math.sin(t * 1.8 + i + ph) * .08;
    g.save(); g.translate(2, -34); g.rotate(a);
    g.beginPath(); g.ellipse(14, 0, 14, 4.2, 0, 0, TAU); g.fill();
    g.restore();
  }
  g.restore();
}

function cactusDesert(g, th, x, y, ech, t, ph) {
  g.save(); g.translate(x, y); g.scale(ech, ech);
  g.rotate(Math.sin(t * 1.1 + ph) * .05);
  g.fillStyle = th.vertFonce;
  const rond = (bx, by, bw, bh) => { g.beginPath(); g.roundRect(bx, by, bw, bh, bw / 2); g.fill(); };
  rond(-5, -38, 10, 38);
  rond(-16, -30, 7, 17); rond(-16, -16, 18, 7);
  rond(10, -25, 7, 13); rond(-1, -19, 17, 7);
  g.fillStyle = 'rgba(255,255,255,.16)';
  rond(-4, -37, 3, 34);
  g.restore();
}

// La caravane. Le chameau est dessiné tourné vers la gauche — tête et cou à
// gauche, queue à droite — donc on le retourne quand il va vers la droite.
// Sans ça il traverse le terrain en marche arrière.
function chameauDesert(g, th, x, y, ech, t, versLaDroite) {
  g.save(); g.translate(x, y); g.scale(versLaDroite ? -ech : ech, ech);
  g.translate(0, Math.abs(Math.sin(t * 5)) * -1.6);
  g.fillStyle = th.chameau;
  g.beginPath(); g.ellipse(0, -14, 17, 8, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(-3, -22, 7, 5.6, 0, 0, TAU); g.fill();
  g.strokeStyle = th.chameau; g.lineWidth = 3.6; g.lineCap = 'round';
  g.beginPath(); g.moveTo(-15, -15); g.quadraticCurveTo(-22, -25, -20, -33); g.stroke();
  g.fillStyle = th.chameau;
  g.beginPath(); g.ellipse(-21, -34, 5, 3.6, -.3, 0, TAU); g.fill();
  g.strokeStyle = th.chameauFonce; g.lineWidth = 3;
  for (const [px, dec] of [[-9, 0], [-3, 1], [7, 1], [12, 0]]) {
    const sw = Math.sin(t * 5 + dec * Math.PI) * 3.4;
    g.beginPath(); g.moveTo(px, -8); g.lineTo(px + sw, 0); g.stroke();
  }
  g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(16, -16); g.lineTo(20, -10 + Math.sin(t * 5) * 2); g.stroke();
  g.restore();
}

// L'œil de Râ, en haut du ciel. Sa pupille balaie lentement le terrain : c'est
// la variante retenue, il regarde jouer.
function oeilDeRaDesert(g, th, x, y, r, t) {
  g.save(); g.translate(x, y); g.rotate(t * .3);
  g.fillStyle = th.soleilBord;
  for (let i = 0; i < 20; i++) {
    g.rotate(TAU / 20);
    g.beginPath(); g.moveTo(-r * .07, -r); g.lineTo(0, -r * 1.34); g.lineTo(r * .07, -r); g.closePath(); g.fill();
  }
  g.restore();
  g.fillStyle = th.soleil; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  g.strokeStyle = th.soleilBord; g.lineWidth = 2.4;
  g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();

  g.fillStyle = '#FFFFFF';
  g.beginPath(); g.ellipse(x, y - r * .05, r * .5, r * .3, 0, 0, TAU); g.fill();
  g.fillStyle = th.khol;
  g.beginPath(); g.arc(x + Math.sin(t * .9) * r * .16, y - r * .05, r * .14, 0, TAU); g.fill();
  g.strokeStyle = th.khol; g.lineWidth = Math.max(1.6, r * .09);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x - r * .52, y - r * .05);
  g.quadraticCurveTo(x, y - r * .52, x + r * .52, y - r * .05);
  g.stroke();
  // Le trait de fard et sa volute : sans eux on lit « un œil », pas « Râ ».
  g.beginPath(); g.moveTo(x + r * .5, y + r * .02); g.lineTo(x + r * .74, y + r * .42); g.stroke();
  g.beginPath();
  g.moveTo(x - r * .16, y + r * .14);
  g.quadraticCurveTo(x - r * .1, y + r * .5, x - r * .42, y + r * .46);
  g.stroke();
}

function drawCourtDesert() {
  const m = getMap(), th = m.theme;
  const cw = COURT.right - COURT.left, chh = COURT.bottom - COURT.top;
  if (!decorDesert) semerDecor();
  const D = decorDesert;
  const t = G.now;

  // 1. Le ciel, du haut de l'écran à l'horizon seulement. Étendu jusqu'en bas,
  // le dégradé passait derrière le terrain et sur les côtés : on se retrouvait
  // à jouer au milieu d'un ciel, ce qui n'a aucun sens en vue de dessus.
  const horizon = COURT.top - 26;
  const ciel = ctx.createLinearGradient(0, 0, 0, horizon);
  th.ciel.forEach((c, i) => ciel.addColorStop(i / (th.ciel.length - 1), c));
  ctx.fillStyle = ciel; ctx.fillRect(0, 0, W, horizon);

  // 1b. Le désert autour du terrain : du sable lui aussi, mais nettement plus
  // sombre et parsemé de cailloux. C'est ce contraste qui dit où l'on joue —
  // sans lui, l'aire de jeu n'a plus de limite lisible.
  ctx.fillStyle = th.sableOmbre;
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.globalAlpha = .35;
  ctx.strokeStyle = th.sableFonce; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const y = horizon + ((i * 61) % (H - horizon));
    const x = (i * 137) % W;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 40 + (i % 4) * 16, y + 4); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // 2. L'œil de Râ, bas sur l'horizon comme un soleil couchant.
  oeilDeRaDesert(ctx, th, W * .78, COURT.top - 44, 30, t);

  // 3. Les pyramides et les palmiers, derrière le terrain.
  const base = COURT.top - 4;
  ctx.fillStyle = th.sableOmbre;
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= W; x += 14) ctx.lineTo(x, base - 20 - Math.sin(x / W * 5) * 12);
  ctx.lineTo(W, base); ctx.closePath(); ctx.fill();
  for (const [px, larg, haut] of [[W * .17, 62, 74], [W * .30, 40, 46], [W * .58, 34, 40]]) {
    ctx.fillStyle = th.pierre;
    ctx.beginPath(); ctx.moveTo(px, base - haut); ctx.lineTo(px - larg, base); ctx.lineTo(px + larg, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.pierreOmbre;
    ctx.beginPath(); ctx.moveTo(px, base - haut); ctx.lineTo(px + larg, base); ctx.lineTo(px, base); ctx.closePath(); ctx.fill();
  }
  for (const p of D.palmiers) palmierDesert(ctx, th, p.x, p.y, p.ech, t, p.ph);

  // 4. La caravane traverse au-dessus du terrain, toutes les 20 à 25 secondes.
  const CYCLE = 23, PASSAGE = 9;
  const phase = t % CYCLE;
  if (phase < PASSAGE) {
    for (let i = 0; i < 3; i++) {
      const k = (phase / PASSAGE) - i * .07;
      if (k < 0 || k > 1) continue;
      chameauDesert(ctx, th, -50 + k * (W + 100), COURT.top - 14, .8, t + i * .4, true);
    }
  }

  // 5. Le sable du terrain : dunes ondulées, puis grain fin par-dessus.
  ctx.fillStyle = th.floor;
  ctx.fillRect(COURT.left, COURT.top, cw, chh);
  ctx.save();
  ctx.beginPath(); ctx.rect(COURT.left, COURT.top, cw, chh); ctx.clip();
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? th.sableClair : th.sableFonce;
    ctx.globalAlpha = .42;
    ctx.beginPath();
    for (let x = COURT.left; x <= COURT.right; x += 10) {
      const y = COURT.top + chh * ((i + .5) / 6) + Math.sin((x - COURT.left) / cw * 5 + t * .45 + i) * 16;
      x === COURT.left ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.lineTo(COURT.right, COURT.bottom); ctx.lineTo(COURT.left, COURT.bottom);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const gr of D.grains) {
    ctx.globalAlpha = .1 + .18 * (.5 + .5 * Math.sin(t * 2 + gr.ph));
    ctx.fillStyle = gr.clair ? th.sableClair : th.sableOmbre;
    ctx.fillRect(gr.x, gr.y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // 6. Les sables mouvants, un demi-cercle devant chaque cage. Le sable y est
  // plus sombre que le terrain sans l'être franchement, et les anneaux restent
  // légers : ils doivent se voir sans attirer l'œil plus que le disque.
  const R = rayonSables();
  for (const side of [1, 2]) {
    const c = centreSables(side);
    // Le demi-cercle doit toujours s'ouvrir VERS le terrain. Le centre étant
    // posé sur la ligne de cage, c'est le sens de parcours qui décide de la
    // moitié dessinée : à droite, un sens inversé l'envoyait entièrement hors
    // du terrain et la zone n'apparaissait pas.
    const d0 = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(c.x, c.y, R, d0, d0 + Math.PI); ctx.closePath(); ctx.clip();
    ctx.fillStyle = th.sableFonce; ctx.globalAlpha = .62;
    ctx.fillRect(c.x - R, c.y - R, R * 2, R * 2);
    ctx.globalAlpha = 1;
    for (let i = 0; i < 4; i++) {
      const k = 1 - ((i / 4 + t * .3) % 1);
      ctx.globalAlpha = Math.sin(k * Math.PI) * .28;
      ctx.strokeStyle = i % 2 ? th.or : th.sableClair; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(c.x, c.y, R * k, 0, TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Liseré pointillé plutôt qu'un trait plein : la limite se lit, mais elle
    // ne cercle pas la zone comme un obstacle solide.
    ctx.strokeStyle = th.or; ctx.lineWidth = 2; ctx.globalAlpha = .75;
    ctx.setLineDash([7, 6]);
    ctx.beginPath(); ctx.arc(c.x, c.y, R, d0, d0 + Math.PI); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
  }

  // 7. La paille qui roule et rebondit sur les bosses du sable.
  for (const p of D.pailles) {
    const x = ((t * p.v + p.ph) % (cw + 90)) - 45 + COURT.left;
    const y = COURT.top + chh * p.y;
    const saut = Math.abs(Math.sin(t * 4.4 + p.ph)) * 18;
    ctx.fillStyle = 'rgba(70,45,25,.18)';
    ctx.beginPath(); ctx.ellipse(x, y, p.r - saut * .28, 3.5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y - p.r - saut); ctx.rotate(t * 6);
    ctx.strokeStyle = th.paille; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    const rp = makeRngHack(Math.round(p.ph));
    for (let i = 0; i < 11; i++) {
      const a = rp() * TAU, l = p.r * (.55 + rp() * .5);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * l, Math.sin(a) * l);
      ctx.lineTo(Math.cos(a + 2.2) * l * .8, Math.sin(a + 2.2) * l * .8);
      ctx.stroke();
    }
    ctx.strokeStyle = th.pailleFonce; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(0, 0, p.r * .74, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // 8. Les bordures : pas de mur, un bourrelet de dune de part et d'autre.
  for (const [by, sens] of [[COURT.top, -1], [COURT.bottom, 1]]) {
    ctx.fillStyle = th.sableFonce;
    ctx.beginPath();
    ctx.moveTo(COURT.left, by + sens * 22);
    for (let x = COURT.left; x <= COURT.right; x += 12) ctx.lineTo(x, by + Math.sin((x - COURT.left) / cw * 6 + t * .6) * 5);
    ctx.lineTo(COURT.right, by + sens * 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.sableClair; ctx.globalAlpha = .55;
    ctx.beginPath();
    for (let x = COURT.left; x <= COURT.right; x += 12) ctx.lineTo(x, by + sens * 4 + Math.sin((x - COURT.left) / cw * 6 + t * .6) * 5);
    ctx.lineTo(COURT.right, by + sens * 12); ctx.lineTo(COURT.left, by + sens * 12);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 9. Cailloux du pourtour, puis les cactus des coins. Tous hors terrain.
  for (const p of D.cailloux) {
    ctx.fillStyle = p.clair ? th.sableFonce : th.rocheFonce;
    ctx.globalAlpha = p.clair ? .7 : .45;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * .7, 0, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const c of D.cactus) cactusDesert(ctx, th, c.x, c.y, c.ech, t, c.ph);

  // 10. Lignes de jeu et cages.
  ctx.strokeStyle = th.line; ctx.lineWidth = 3;
  ctx.strokeRect(COURT.left, COURT.top, cw, chh);
  ctx.setLineDash([12, 10]);
  ctx.beginPath(); ctx.moveTo(CX, COURT.top); ctx.lineTo(CX, COURT.bottom); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(CX, CY, 62, 0, TAU); ctx.stroke();
  drawZonesDesert(th);
  drawGoalsDesert(th);
}

function drawZonesDesert(th) {
  for (const side of [1, 2]) {
    const gx = side === 1 ? COURT.left : COURT.right - GOAL_DEPTH;
    for (const z of getMap().zones) {
      ctx.fillStyle = z.color;
      ctx.globalAlpha = .2;
      ctx.fillRect(gx, CY + z.from, GOAL_DEPTH, z.to - z.from);
      ctx.globalAlpha = 1;
      ctx.fillStyle = th.khol;
      ctx.font = 'bold 15px "Archivo Black", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      texteMonde(String(z.points), gx + GOAL_DEPTH / 2, CY + (z.from + z.to) / 2);
    }
  }
  ctx.textBaseline = 'alphabetic';
}

function drawGoalsDesert(th) {
  for (const side of [1, 2]) {
    const gx = side === 1 ? COURT.left - 6 : COURT.right - GOAL_DEPTH + 6;
    ctx.fillStyle = th.goalFill;
    ctx.fillRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
    ctx.strokeStyle = th.goalStroke; ctx.lineWidth = 4;
    ctx.strokeRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
  }
}

// Le voile de la tempête, posé par-dessus tout le terrain. Il s'épaissit et
// s'éclaircit avec la densité calculée par game/desert.js — le rendu ne décide
// ni du moment ni de la durée.
function drawTempete() {
  const k = densiteTempete();
  if (k <= 0) return;
  const th = getMap().theme;
  ctx.save();
  ctx.fillStyle = th.tempete;
  ctx.globalAlpha = k * .42;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
  const r = makeRngHack(4242);
  for (let i = 0; i < 150; i++) {
    const x = (r() * W + G.now * 150) % W, y = r() * H;
    ctx.globalAlpha = k * (.2 + r() * .4);
    ctx.fillStyle = '#F5E4C0';
    ctx.fillRect(x, y, 2.5, 2.5);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ---------------------------------------------------------------------------
// PÔLE NORD — le terrain de Jingle Bells, une veillée de Noël sous l'aurore.
//
// Ses huit pièces ont été choisies séparément dans mockups/pole-nord.html —
// sol givré, marquage creusé, cages en sucre d'orge, sapins décorés, aurore en
// vague, flocons étoilés, lutins, lampions — puis accordées entre elles dans
// mockups/pole-nord-final.html. Sans cet accord elles se mangeaient : le givre
// du sol et les flocons dessinaient deux fois la même étoile, le marquage
// creusé disparaissait sur un sol blanc déjà couvert de blanc, quatre sources
// de rouge et de vert se disputaient l'œil, et les halos des lampions lavaient
// la glace juste là où le disque doit rester lisible.
//
// Terrain de décor : aucune règle propre, la glace ne glisse pas. Rien ici ne
// décide de quoi que ce soit, donc rien n'a besoin d'être semé ni synchronisé.
// ---------------------------------------------------------------------------

// La finition retenue (D · nuit profonde du mockup d'assemblage). Chaque valeur
// corrige une collision précise ; les changer fait passer d'une finition du
// mockup à l'autre sans toucher une ligne de dessin.
const NOEL = {
  givre: .42,      // fougères de givre plus grandes, donc plus rares
  degager: 1,      // balayage du givre le long des lignes
  sillon: 2,       // contraste du marquage creusé
  flocons: .45,    // densité des cristaux qui tombent
  discipline: 1,   // le rouge et le blanc rayés n'existent qu'aux cages
  nuit: 1,         // pourtour éteint, aire de jeu éclairée
  chaleur: .25     // réchauffement de la glace
};

// Mélange de deux couleurs. Il rend de l'hexadécimal et non du rgb() parce
// qu'on l'imbrique — chaleur PUIS nuit sur la même teinte — et qu'il doit donc
// savoir relire sa propre sortie.
function melangeNoel(a, b, k) {
  const lire = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = lire(a), B = lire(b);
  return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * k)))
    .toString(16).padStart(2, '0')).join('');
}

// Sapins et spectateurs, placés une fois pour toutes. Tout vient de graine() :
// aucun tirage au sort, donc rien à semer entre deux machines et rien qui
// grésille d'une image à l'autre.
let decorNoel = null;
function semerNoel() {
  const sapins = [], lutins = [];
  for (let x = 6; x < W; x += 44) sapins.push({ x, y: COURT.top - 2, grand: true });
  for (let y = COURT.top + 34; y < COURT.bottom - 10; y += 62) {
    sapins.push({ x: 30, y, grand: false });
    sapins.push({ x: W - 30, y, grand: false });
  }
  for (let x = 26; x < W; x += 66) sapins.push({ x, y: H - 4, grand: false });
  for (let x = 10; x < W; x += 17) lutins.push({ x, y: COURT.top - 3, h: 15 });
  for (let x = 8; x < W; x += 21) lutins.push({ x, y: H - 5, h: 22 });
  for (let y = COURT.top + 22; y < COURT.bottom; y += 27) {
    lutins.push({ x: 24 + graine(y) * 22, y, h: 16 });
    lutins.push({ x: W - 24 - graine(y + 3) * 22, y, h: 16 });
  }
  decorNoel = { sapins, lutins };
}

function sapinNoel(x, y, ech, couleur, balance) {
  const l = ech * .42;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(balance) * .012);
  ctx.fillStyle = '#5e3a20';
  ctx.fillRect(-ech * .045, -ech * .16, ech * .09, ech * .16);
  ctx.fillStyle = couleur;
  for (let e = 0; e < 3; e++) {
    const bas = -ech * (.12 + e * .27), haut = -ech * (.46 + e * .27), larg = l * (1 - e * .26);
    ctx.beginPath();
    ctx.moveTo(0, haut); ctx.lineTo(-larg, bas); ctx.lineTo(larg, bas);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// Le halo compte autant que le point : c'est lui qui fait la lumière.
function ampouleNoel(x, y, col, intensite, taille) {
  ctx.globalAlpha = .18 * intensite;
  ctx.fillStyle = col;
  ctx.beginPath(); ctx.arc(x, y, 5.5 * taille, 0, TAU); ctx.fill();
  ctx.globalAlpha = intensite;
  ctx.beginPath(); ctx.arc(x, y, 1.9 * taille, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

// Une nappe d'aurore : bande ondulante peinte en dégradé, posée en « screen »
// pour qu'elle éclaire le ciel au lieu de le couvrir.
function nappeAurore(rgb, alpha, y0, hauteur, amp, vitesse) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createLinearGradient(0, y0 - hauteur, 0, y0 + hauteur * .4);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(.45, `rgba(${rgb},${alpha})`);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, y0 + hauteur * .4);
  for (let x = 0; x <= W; x += 16) ctx.lineTo(x, y0 + Math.sin(x / 150 + G.now * vitesse) * amp);
  ctx.lineTo(W, -hauteur); ctx.lineTo(0, -hauteur);
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// Le marquage : touche, médiane, rond central. Tracé une fois, peint deux fois
// — une fois en blanc pour balayer le givre, une fois en creux par-dessus.
function tracerMarquageNoel() {
  const cw = COURT.right - COURT.left, chh = COURT.bottom - COURT.top;
  ctx.beginPath();
  ctx.rect(COURT.left + 6, COURT.top + 6, cw - 12, chh - 12);
  ctx.moveTo(CX, COURT.top + 6); ctx.lineTo(CX, COURT.bottom - 6);
  ctx.moveTo(CX + 58, CY); ctx.arc(CX, CY, 58, 0, TAU);
  ctx.moveTo(CX + 13, CY); ctx.arc(CX, CY, 13, 0, TAU);
}

// Cage en sucre d'orge. Le rouge et blanc rayé ne sert QUE là : c'est ce qui
// en fait la cible la plus lisible du terrain. Les volets de points se lisent
// au travers, comme partout ailleurs.
function drawCageNoel(side) {
  const m = getMap(), th = m.theme;
  const gx = side === 1 ? COURT.left - GOAL_DEPTH : COURT.right;
  const GH = (GOAL_BOTTOM - GOAL_TOP) / 2;

  ctx.fillStyle = melangeNoel('#0d1a2c', '#050c16', NOEL.nuit);
  ctx.fillRect(gx, GOAL_TOP, GOAL_DEPTH, GOAL_BOTTOM - GOAL_TOP);
  for (const z of m.zones) {
    ctx.fillStyle = z.color; ctx.globalAlpha = .38;
    ctx.fillRect(gx, CY + z.from, GOAL_DEPTH, z.to - z.from);
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = '700 17px "Archivo Black", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    texteMonde(z.points, gx + GOAL_DEPTH / 2, CY + (z.from + z.to) / 2);
  }

  ctx.save();
  ctx.translate(side === 1 ? COURT.left : COURT.right, CY);
  ctx.scale(side === 1 ? 1 : -1, 1);
  ctx.lineCap = 'butt'; ctx.lineWidth = 16;
  for (const y of [-GH, GH]) {
    ctx.save(); ctx.translate(0, y);
    ctx.strokeStyle = '#fdfdfd';
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-GOAL_DEPTH - 10, 0); ctx.stroke();
    ctx.strokeStyle = th.rouge; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -G.now * 18;
    ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-GOAL_DEPTH - 10, 0); ctx.stroke();
    ctx.restore();
  }
  ctx.strokeStyle = '#fdfdfd'; ctx.setLineDash([]); ctx.lineWidth = 14;
  ctx.beginPath(); ctx.moveTo(-GOAL_DEPTH - 10, -GH); ctx.lineTo(-GOAL_DEPTH - 10, GH); ctx.stroke();
  ctx.strokeStyle = th.rouge; ctx.setLineDash([10, 14]); ctx.lineDashOffset = G.now * 18;
  ctx.beginPath(); ctx.moveTo(-GOAL_DEPTH - 10, -GH); ctx.lineTo(-GOAL_DEPTH - 10, GH); ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawCourtNoel() {
  const m = getMap(), th = m.theme;
  const cw = COURT.right - COURT.left, chh = COURT.bottom - COURT.top;
  const t = G.now, horizon = COURT.top - 2;
  if (!decorNoel) semerNoel();
  const D = decorNoel;

  // 1. Le ciel, du haut de l'écran à l'horizon seulement — comme à Dune de Râ.
  // Étendu plus bas, le dégradé passerait derrière le terrain, ce qui n'a
  // aucun sens en vue de dessus.
  const ciel = ctx.createLinearGradient(0, 0, 0, horizon);
  ciel.addColorStop(0, melangeNoel(th.cielHaut, '#01030a', NOEL.nuit));
  ciel.addColorStop(1, melangeNoel(th.cielBas, '#070f1e', NOEL.nuit));
  ctx.fillStyle = ciel;
  ctx.fillRect(0, 0, W, horizon);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 90; i++) {
    ctx.globalAlpha = (.35 + .65 * Math.abs(Math.sin(t * (.6 + graine(i + 5)) + i))) * .8;
    ctx.fillRect(graine(i) * W, graine(i + 31) * (horizon - 4), 1, 1);
  }
  ctx.globalAlpha = 1;
  nappeAurore(th.aurore, .45, horizon * .62, 52, 13, .35);
  // La seconde nappe est réduite à un liseré : à pleine opacité elle faisait
  // une deuxième aurore et le ciel devenait bavard.
  nappeAurore(th.aurore2, NOEL.discipline ? .12 : .32, horizon * .44, 40, 17, .5);

  // 2. La neige autour du terrain, nettement plus sombre que celle de l'aire de
  // jeu : c'est ce contraste qui dit où l'on joue.
  const dehors = ctx.createLinearGradient(0, horizon, 0, H);
  dehors.addColorStop(0, melangeNoel(th.dehorsHaut, '#0c1526', NOEL.nuit));
  dehors.addColorStop(1, melangeNoel(th.dehorsBas, '#060b14', NOEL.nuit));
  ctx.fillStyle = dehors;
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.globalAlpha = .3;
  for (let i = 0; i < 130; i++) {
    ctx.fillStyle = graine(i + 600) > .5 ? 'rgba(200,220,250,.5)' : 'rgba(60,84,120,.6)';
    ctx.fillRect(graine(i + 400) * W, horizon + graine(i + 500) * (H - horizon), 2, 2);
  }
  ctx.globalAlpha = 1;

  // 3. La forêt de sapins, décorée. En hiérarchie de couleur les boules passent
  // toutes à l'or et au rouge : le cyan et le vert restent au ciel.
  const vert = melangeNoel(th.sapin, '#08251a', NOEL.nuit * .8);
  const boules = NOEL.discipline ? [th.or, th.rouge, '#ffe9a8'] : [th.or, th.rouge, '#35e0ff', '#5df08a'];
  D.sapins.forEach((p, i) => {
    const h = (p.grand ? 58 : 38) + graine(i) * 18;
    sapinNoel(p.x, p.y, h, vert, t + i);
    for (let b = 0; b < 5; b++) {
      ampouleNoel(p.x + Math.sin(b * 2.1 + i) * h * .16, p.y - h * .18 - b * h * .15,
        boules[(b + i) % boules.length], (.55 + Math.sin(t * 3 + i + b) * .4) * .8, .8);
    }
    ctx.fillStyle = th.or;
    ctx.beginPath(); ctx.arc(p.x, p.y - h * .94, 2.6, 0, TAU); ctx.fill();
  });

  // 4. Les lutins. Rabattus et rapetissés pour ne pas rivaliser avec les cages,
  // mais ils sautent plus haut au but — toute l'ambiance passe par eux.
  const but = Math.max(G.goalFlash[0], G.goalFlash[1]);
  const calme = G.training ? .4 : 1;
  const vertL = '#175c3a', rougeL = '#8f2436';
  D.lutins.forEach((p, i) => {
    const h = p.h * .82;
    const saut = Math.abs(Math.sin(t * 4 + i * 1.7)) * h * .24 * calme * (1 + but * 1.8);
    ctx.save();
    ctx.translate(p.x, p.y - saut);
    ctx.globalAlpha = .65;
    ctx.fillStyle = i % 2 ? vertL : rougeL;
    ctx.fillRect(-h * .17, -h * .55, h * .34, h * .55);
    ctx.fillStyle = '#b39a80';
    ctx.beginPath(); ctx.arc(0, -h * .66, h * .16, 0, TAU); ctx.fill();
    ctx.fillStyle = i % 2 ? rougeL : vertL;
    ctx.beginPath();
    ctx.moveTo(-h * .17, -h * .74); ctx.lineTo(h * .17, -h * .74);
    ctx.lineTo(h * .05, -h * 1.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.or;
    ctx.beginPath(); ctx.arc(h * .05, -h * 1.1, h * .06, 0, TAU); ctx.fill();
    ctx.fillStyle = i % 2 ? vertL : rougeL;
    const bras = Math.sin(t * 6 + i) * h * .2;
    ctx.fillRect(-h * .28, -h * .55 + bras, h * .11, h * .3);
    ctx.fillRect(h * .17, -h * .55 - bras, h * .11, h * .3);
    ctx.globalAlpha = 1;
    ctx.restore();
  });

  // 5. La glace givrée. `givre` ne coupe pas les fougères au hasard : il les
  // rend plus grandes et plus rares, pour qu'on lise un motif au lieu d'un
  // grouillement — et surtout pour qu'elles ne se confondent plus avec les
  // flocons qui tombent, qui dessinent exactement la même étoile.
  ctx.fillStyle = melangeNoel(melangeNoel(th.givre, th.givreChaud, NOEL.chaleur),
    '#b8c8de', NOEL.nuit * .45);
  ctx.fillRect(COURT.left, COURT.top, cw, chh);

  ctx.save();
  ctx.beginPath(); ctx.rect(COURT.left, COURT.top, cw, chh); ctx.clip();

  const nGivre = Math.round(6 + 16 * NOEL.givre), grossir = 1 + (1 - NOEL.givre) * .9;
  ctx.strokeStyle = `rgba(255,255,255,${.35 + .5 * NOEL.givre})`;
  ctx.lineCap = 'round';
  for (let i = 0; i < nGivre; i++) {
    const x = COURT.left + 10 + graine(i) * (cw - 20);
    const y = COURT.top + 10 + graine(i + 13) * (chh - 20);
    const branches = 5 + ((graine(i + 2) * 3) | 0), R = (12 + graine(i + 4) * 16) * grossir;
    for (let b = 0; b < branches; b++) {
      const a = b / branches * TAU + graine(i) * 3;
      ctx.lineWidth = 1.3 * grossir;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); ctx.stroke();
      ctx.lineWidth = .8 * grossir;
      for (const k of [.4, .7]) {
        const mx = x + Math.cos(a) * R * k, my = y + Math.sin(a) * R * k;
        ctx.beginPath();
        ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a + .9) * R * .26, my + Math.sin(a + .9) * R * .26);
        ctx.moveTo(mx, my); ctx.lineTo(mx + Math.cos(a - .9) * R * .26, my + Math.sin(a - .9) * R * .26);
        ctx.stroke();
      }
    }
  }

  // 6. Le marquage creusé. Le balayage est ce qui le sauve : sur un sol blanc
  // déjà couvert de motifs blancs, un sillon seul ne se voit pas. On dégage le
  // givre le long du tracé avant de creuser — c'est aussi ce qu'on ferait
  // vraiment sur un terrain enneigé.
  if (NOEL.degager > 0) {
    ctx.strokeStyle = `rgba(255,255,255,${.55 * NOEL.degager})`;
    ctx.lineWidth = 20 * NOEL.degager; tracerMarquageNoel(); ctx.stroke();
    ctx.strokeStyle = `rgba(232,240,251,${.7 * NOEL.degager})`;
    ctx.lineWidth = 12 * NOEL.degager; tracerMarquageNoel(); ctx.stroke();
  }
  ctx.lineWidth = 7;
  ctx.strokeStyle = `rgba(74,102,146,${.32 * NOEL.sillon})`;
  tracerMarquageNoel(); ctx.stroke();
  ctx.save(); ctx.translate(0, 2);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, .55 * NOEL.sillon)})`;
  tracerMarquageNoel(); ctx.stroke();
  ctx.restore();

  // 7. La nappe chaude des lampions sur la glace : c'est elle qui ramène l'œil
  // au centre une fois le pourtour éteint.
  const nappe = ctx.createRadialGradient(CX, CY, 40, CX, CY, Math.max(cw, chh) * .62);
  nappe.addColorStop(0, `rgba(255,228,180,${.16 * NOEL.nuit + .1 * NOEL.chaleur})`);
  nappe.addColorStop(1, 'rgba(255,228,180,0)');
  ctx.fillStyle = nappe;
  ctx.fillRect(COURT.left, COURT.top, cw, chh);
  ctx.restore();

  drawCageNoel(1);
  drawCageNoel(2);

  // 8. Les lampions. Leurs halos sont coupés au bord du terrain : sans ça, huit
  // taches chaudes débordent sur la glace et lui font perdre son contraste
  // exactement là où le disque doit rester lisible.
  const piquets = [];
  for (let x = 46; x < W; x += 118) { piquets.push([x, COURT.top - 6]); piquets.push([x, H - 10]); }
  piquets.push([26, CY - 90], [26, CY + 90], [W - 26, CY - 90], [W - 26, CY + 90]);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.rect(COURT.left, COURT.top, cw, chh);   // le terrain devient un trou
  ctx.clip('evenodd');
  piquets.forEach(([x, y], i) => {
    ctx.globalAlpha = .16 * (.62 + Math.sin(t * 2.2 + i) * .3) * (1 + NOEL.nuit * .8);
    ctx.fillStyle = th.chaud;
    ctx.beginPath(); ctx.arc(x, y - 32, 26 + NOEL.nuit * 14, 0, TAU); ctx.fill();
  });
  ctx.globalAlpha = 1;
  ctx.restore();

  piquets.forEach(([x, y], i) => {
    const v = .62 + Math.sin(t * 2.2 + i) * .3;
    ctx.fillStyle = '#3a2a1c';
    ctx.fillRect(x - 1.6, y - 26, 3.2, 26);
    ctx.fillRect(x - 7, y - 42, 14, 3);
    ctx.fillStyle = `rgba(255,190,100,${v})`;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 39); ctx.lineTo(x + 6, y - 39);
    ctx.lineTo(x + 4, y - 26); ctx.lineTo(x - 4, y - 26);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#3a2a1c'; ctx.lineWidth = 1.4; ctx.stroke();
  });

  // 9. Le vignettage : on éteint les bords pour que rien n'attire l'œil hors du
  // terrain.
  const vig = ctx.createRadialGradient(CX, CY, cw * .34, CX, CY, cw * .78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, `rgba(2,5,12,${.55 * NOEL.nuit})`);
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

// Les flocons étoilés, posés par-dessus tout — joueurs et disque compris. Ils
// sont nettement plus petits et plus rares que le givre du sol : à taille égale
// les deux couches d'étoiles se confondaient et l'image devenait illisible.
function drawNeigeNoel() {
  if (getMap().style !== 'noel') return;
  const t = G.now, n = Math.round(34 * NOEL.flocons), taille = .55 + .45 * NOEL.flocons;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const v = 20 + graine(i) * 18, R = (3.4 + graine(i + 2) * 4) * taille;
    const x = (graine(i) * W + Math.sin(t * .6 + i) * 14 + W) % W;
    const y = (graine(i + 7) * H + t * v) % H;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (.5 + graine(i + 4)) + i);
    ctx.globalAlpha = (.45 + graine(i + 9) * .45) * (.6 + .4 * NOEL.flocons);
    ctx.lineWidth = 1.1;
    for (let b = 0; b < 3; b++) {
      ctx.rotate(Math.PI / 3);
      ctx.beginPath(); ctx.moveTo(-R, 0); ctx.lineTo(R, 0); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(R * .55, 0); ctx.lineTo(R * .8, -R * .3);
      ctx.moveTo(R * .55, 0); ctx.lineTo(R * .8, R * .3);
      ctx.moveTo(-R * .55, 0); ctx.lineTo(-R * .8, -R * .3);
      ctx.moveTo(-R * .55, 0); ctx.lineTo(-R * .8, R * .3);
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/* Peint le VRAI terrain d'une map dans un canvas quelconque. L'écran de choix
   s'en sert pour ses vignettes et son grand aperçu : jusqu'ici il redessinait
   un rectangle générique à partir de sept couleurs de thème, si bien que le
   Pôle Nord et Dune de Râ y avaient la même tête à la teinte près — tout le
   travail de peinture n'apparaissait nulle part au moment du choix.

   Le terrain se dessine toujours en 960×600 hors écran, puis on le réduit :
   les peintres lisent COURT et W/H, ils ne savent pas dessiner à une autre
   échelle. On bascule la map le temps du dessin et on la remet aussitôt —
   c'est synchrone, donc aucune image du jeu ne peut s'intercaler. */
const apercuCv = document.createElement('canvas');
apercuCv.width = W; apercuCv.height = H;
const apercuCtx = apercuCv.getContext('2d');

export function peindreTerrain(cible, mapId) {
  // La CSS étire le canvas jusqu'à son cadre. Si sa résolution interne n'a pas
  // le même format, tout ce qu'on y peint est écrasé — le cadre du grand
  // aperçu fait près de 3:1 pour un terrain en 16/10. On accorde d'abord la
  // résolution au cadre, puis on fait tenir le terrain dedans sans le déformer.
  const lAff = cible.clientWidth, hAff = cible.clientHeight;
  if (lAff > 0 && hAff > 0) {
    const voulu = Math.max(1, Math.round(cible.width * hAff / lAff));
    if (Math.abs(voulu - cible.height) > cible.height * .02) cible.height = voulu;
  }
  const avant = getMapId();
  setMapId(mapId);
  applyMap();
  // Relevé pendant que la map visée est active : après le finally, getMap()
  // aura repris l'ancienne et on peindrait les bandes avec sa couleur.
  const fond = getMap().theme.bgOuter;
  viserCanvas(apercuCtx);
  try {
    apercuCtx.clearRect(0, 0, W, H);
    drawCourt();
  } finally {
    viserCanvas();          // sans quoi le jeu continuerait de peindre hors écran
    setMapId(avant);
    applyMap();
  }
  // Le terrain entier, jamais rogné : c'est justement dans les bandes du haut
  // et du bas que vivent le décor qui distingue les maps — le ciel et les
  // pyramides de Dune de Râ, les sapins du Pôle Nord, les gradins du stadium.
  // Un cadrage « remplir » les coupait tous les deux.
  const g = cible.getContext('2d');
  const k = Math.min(cible.width / W, cible.height / H);
  const lc = W * k, hc = H * k;
  g.fillStyle = fond;
  g.fillRect(0, 0, cible.width, cible.height);
  g.imageSmoothingEnabled = true;
  g.drawImage(apercuCv, (cible.width - lc) / 2, (cible.height - hc) / 2, lc, hc);
}

function drawCourt() {
  if (getMap().style === 'noel') { drawCourtNoel(); return; }
  if (getMap().style === 'desert') { drawCourtDesert(); return; }
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
  if (G.filantes.length) drawFilantes();
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
    texteMonde(String(z.points), gx + GOAL_DEPTH / 2, (y1 + y2) / 2);
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
  // « Faible » supprime l'ombre : c'est le seul réglage qui enlève vraiment du
  // travail au GPU. « Élevée » lui ajoute un flou, qui coûte cher mais pose
  // bien mieux les joueurs au sol.
  const q = Reglages.ombres;
  if (q === 'faible') return;
  const k = (x - CX) / CX;
  if (q === 'elevee') { ctx.shadowColor = 'rgba(0,0,20,.5)'; ctx.shadowBlur = 8; }
  ctx.fillStyle = 'rgba(0,0,20,.33)';
  ctx.beginPath();
  ctx.ellipse(x + k * 13, y + 26, r * (1 + Math.abs(k) * .55), r * .36, 0, 0, TAU);
  ctx.fill();
  if (q === 'elevee') ctx.shadowBlur = 0;
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

// Bouclier du disque Captain : les anneaux du bouclier, dessinés autour du
// joueur qui vient d'attraper. Il grandit et s'efface — un anneau de taille
// fixe passerait pour un élément d'interface.
function drawBouclier(p) {
  const k = p.bouclierT / .45;
  const r = 27 + (1 - k) * 15;
  ctx.save();
  ctx.globalAlpha = k * .9;
  ctx.lineWidth = 3;
  // Les trois anneaux tiennent dans la couronne extérieure. Répartis jusqu'au
  // centre comme sur le vrai bouclier, les deux plus petits tombaient sur le
  // sprite et s'y délavaient : il ne restait qu'un cercle rouge.
  const anneaux = [[1, '#c2131a'], [.85, '#f2f2f2'], [.70, '#1b3f94']];
  for (const [f, col] of anneaux) {
    ctx.strokeStyle = col;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * f, 0, TAU); ctx.stroke();
  }
  ctx.restore();
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
    // Une seule source pour tout le monde : la fiche d'intentions. Avant, seul
    // le joueur à la souris avait une flèche juste — le deuxième joueur, qui
    // n'a pas de curseur, en a bien plus besoin encore.
    const aim = (p.cmd && (p.cmd.visee.x || p.cmd.visee.y))
      ? Math.atan2(p.cmd.visee.y, p.cmd.visee.x)
      : (p.face >= 0 ? 0 : Math.PI);
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
    texteMonde(etiquetteJoueur(p), p.x, p.y - 48 * SCALE);
  }
  // Le bouclier passe par-dessus le joueur. Dessiné dessous, le sprite en
  // masquait deux anneaux sur trois et il ne restait qu'un arc rouge.
  if (p.bouclierT > 0) drawBouclier(p);
  // Piraté : deux flèches opposées au-dessus de la tête, et un décrochage
  // rouge/cyan par intermittence. Le compte à rebours est visible — savoir
  // combien de temps ça dure fait partie de ce qu'on peut jouer.
  if (p.piratage > 0) drawMarqueHack(p);
}

function drawMarqueHack(p) {
  const y = p.y - 52 * SCALE;
  ctx.save();
  // Décrochage RVB sur le sprite, une image sur trois environ.
  if (Math.sin(G.now * 19) > .55) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .3;
    ctx.fillStyle = '#ff0040'; ctx.fillRect(p.x - 16 + 3, p.y - 30, 32, 56);
    ctx.fillStyle = '#00e5ff'; ctx.fillRect(p.x - 16 - 3, p.y - 30, 32, 56);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // Deux chevrons tête-bêche : le symbole de l'inversion, lisible sans texte.
  ctx.strokeStyle = VERT_HACK; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x - 5, y - 1); ctx.lineTo(p.x, y - 6); ctx.lineTo(p.x + 5, y - 1);
  ctx.moveTo(p.x - 5, y + 3); ctx.lineTo(p.x, y + 8); ctx.lineTo(p.x + 5, y + 3);
  ctx.stroke();
  // Jauge du temps restant, sous les chevrons.
  const l = 26, k = p.piratage / PIRATAGE_DUREE;
  ctx.fillStyle = 'rgba(4,16,8,.7)';
  ctx.fillRect(p.x - l / 2, y + 12, l, 3);
  ctx.fillStyle = VERT_HACK;
  ctx.fillRect(p.x - l / 2, y + 12, l * k, 3);
  ctx.restore();
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
  } else {
    const id = skinDuDisque();   // le disque du lanceur, pas le sien
    // La charge en main : elle monte avec le porteur et prévient l'adversaire
    // qu'un tir chargé arrive. En vol, `d.super` prend le relais à fond.
    const porteur = d.heldBy;
    const enCharge = (porteur && porteur.charging) ? clamp(porteur.charge, 0, 1) : 0;
    // Gélatine : le disque tremble après un rebond. On étire sur un axe et on
    // écrase sur l'autre, à volume constant — c'est ce qui fait « élastique »
    // plutôt que « qui grandit ».
    if (d.wobble > 0) {
      const k = 1 + Math.sin(d.wobble * 26) * d.wobble * .28;
      ctx.save();
      ctx.translate(d.x, d.y); ctx.scale(k, 1 / k); ctx.translate(-d.x, -d.y);
    }
    // Les deux arcs passent DERRIÈRE le disque : devant, ils barreraient le
    // motif qu'on cherche justement à préserver.
    if (d.super) arcsDeCharge(d.x, d.y, r, id);
    drawSkinDisc(ctx, d.x, d.y, r, id, d.spin);
    // L'embrasement se pose SUR la face au lieu de la remplacer : c'est tout
    // l'intérêt d'avoir choisi un skin.
    if (d.super) braiseDeCharge(d.x, d.y, r, id);
    if (enCharge > 0) etincellesDeCharge(d.x, d.y, r, id, enCharge);
    // Glitch : le disque se dédouble en rouge et cyan par intermittence,
    // 0,1 s toutes les 2 s. Un décalage permanent deviendrait sa forme
    // normale et ne surprendrait plus personne.
    if (id === 'glitch' && (G.now % 2) < .1) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = .45;
      ctx.beginPath(); ctx.arc(d.x + 3, d.y, r, 0, TAU); ctx.fillStyle = '#ff0040'; ctx.fill();
      ctx.beginPath(); ctx.arc(d.x - 3, d.y, r, 0, TAU); ctx.fillStyle = '#00e5ff'; ctx.fill();
      ctx.restore();
    }
    // Le liseré suit la silhouette réelle : la Gélatine n'est pas ronde, un
    // cercle tracé par-dessus trahirait tout de suite la découpe.
    if (d.super) {
      // Double liseré : un trait large et sourd dans la teinte du disque, puis
      // le trait fin blanc par-dessus. C'est ce décalage qui donne l'épaisseur,
      // un seul trait paraît toujours plat.
      ctx.strokeStyle = avecAlpha(teinteDeCharge(id), .5);
      ctx.lineWidth = 6;
      tracerContour(ctx, d.x, d.y, r, deformationDisque(id));
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,.3)';
    }
    ctx.lineWidth = 1.5;
    tracerContour(ctx, d.x, d.y, r, deformationDisque(id));
    ctx.stroke();
    if (d.wobble > 0) ctx.restore();
    // 20/20 : une formule s'inscrit brièvement à côté du disque en vol.
    if (id === 'vingt' && d.free) drawFormule(d);
  }
}

/* ---------------------------------------------------------------------------
   Les trois calques de la charge, retenus sur mockups/disque-charge.html
   (1B 2B 3B, plus 7D pour la montée en main). Aucun n'écrit une couleur en
   dur : tout part de la teinte du disque, sans quoi on referait le rond rouge
   identique pour tout le monde.
   --------------------------------------------------------------------------- */

// Deux arcs opposés qui tournent. Opposés et non seuls : la silhouette reste
// symétrique quelle que soit leur position, donc le disque paraît centré.
function arcsDeCharge(x, y, r, id) {
  ctx.save();
  ctx.strokeStyle = avecAlpha(chaufferCouleur(teinteDeCharge(id), .4), .75);
  ctx.lineWidth = 2.4;
  for (const o of [0, Math.PI]) {
    ctx.beginPath();
    ctx.arc(x, y, r + 5, G.now * 9 + o, G.now * 9 + o + 1.9);
    ctx.stroke();
  }
  ctx.restore();
}

// La braise : le disque rougeoie sur son pourtour et reste net au centre. Le
// motif central, celui qui identifie le disque, est donc intégralement
// préservé — c'est ce qui distingue cet embrasement du rond rouge d'avant.
function braiseDeCharge(x, y, r, id) {
  const t = teinteDeCharge(id);
  ctx.save();
  tracerContour(ctx, x, y, r, deformationDisque(id));
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, r * .35, x, y, r);
  g.addColorStop(0, avecAlpha(t, 0));
  g.addColorStop(.7, avecAlpha(t, .5));
  g.addColorStop(1, avecAlpha(chaufferCouleur(t, .7), .95));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// La montée en charge, disque en main : cinq étincelles aspirées vers lui
// depuis l'extérieur. Elles ne touchent pas un pixel du motif, et le mouvement
// rentrant est assez rare dans le jeu pour se remarquer tout de suite.
function etincellesDeCharge(x, y, r, id, charge) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = avecAlpha(chaufferCouleur(teinteDeCharge(id), .7), .9 * charge);
  for (let i = 0; i < 5; i++) {
    const a = G.now * 3 + (i / 5) * TAU;
    const ph = 1 - ((G.now * 1.4 + i * .2) % 1);
    const dd = r + 4 + ph * 18;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * dd, y + Math.sin(a) * dd, 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// Les formules du disque 20/20. Elles changent toutes les 1,2 s et ne durent
// que 0,3 s : assez pour être lues, trop peu pour encombrer.
const FORMULES = ['a²+b²', '∫f(x)dx', 'πr²', 'x=-b/2a', 'E=mc²', '√2', 'cos²+sin²=1'];
function drawFormule(d) {
  const cycle = 1.2, visible = .3;
  const phase = G.now % cycle;
  if (phase > visible) return;
  const idx = Math.floor(G.now / cycle) % FORMULES.length;
  const a = (1 - phase / visible) * .85;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = '#d81f26';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 11px "Archivo Black", sans-serif';
  texteMonde(FORMULES[idx], d.x, d.y - 22 - (1 - a) * 8);
  ctx.restore();
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
    // Les confettis de but vivent trois secondes : à pleine opacité ils
    // masqueraient le jeu tout ce temps. On les garde volontairement pâles.
    const a = p.doux ? clamp(p.life, 0, 1) * .5 : clamp(p.life * 2.5, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
  }
  ctx.globalAlpha = 1;
}

// L'onde de but : un demi-cercle qui s'ouvre vers le terrain depuis la cage.
// Deux traits, un large et pâle derrière un fin et vif — c'est ce décalage qui
// donne l'épaisseur, un seul arc paraît plat.
function drawOndesBut() {
  for (const o of G.ondesBut) {
    const k = o.t / o.dur;
    const r = 40 + k * 620;
    const a = (1 - k) * (1 - k);
    const d = o.sens > 0 ? 0 : Math.PI;
    ctx.globalAlpha = a * .28;
    ctx.strokeStyle = o.c; ctx.lineWidth = 14;
    ctx.beginPath(); ctx.arc(o.x, o.y, r, d - Math.PI / 2, d + Math.PI / 2, o.sens < 0); ctx.stroke();
    ctx.globalAlpha = a * .8;
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(o.x, o.y, r, d - Math.PI / 2, d + Math.PI / 2, o.sens < 0); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Éclaircit une couleur vers le blanc (mockup hud-jauge-score-final.html) :
// sert au dégradé de l'étiquette nom/score et au fond très clair du portrait.
function paleHUD(hex, w) {
  const n = parseInt(hex.slice(1), 16);
  const m = v => Math.round(v + (255 - v) * w);
  return `rgb(${m((n >> 16) & 255)},${m((n >> 8) & 255)},${m(n & 255)})`;
}

// Hexagone à pointe (mockup piste E) : coins coupés en haut-gauche/bas-droite
// pour un camp, en haut-droite/bas-gauche pour l'autre (la pointe regarde
// toujours vers le centre du terrain).
function hexPathHUD(x, y, w, h, mirror, cut) {
  ctx.beginPath();
  if (!mirror) {
    ctx.moveTo(x + w * cut, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h * (1 - cut));
    ctx.lineTo(x + w * (1 - cut), y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h * cut);
  } else {
    ctx.moveTo(x, y); ctx.lineTo(x + w * (1 - cut), y); ctx.lineTo(x + w, y + h * cut);
    ctx.lineTo(x + w, y + h); ctx.lineTo(x + w * cut, y + h); ctx.lineTo(x, y + h * (1 - cut));
  }
  ctx.closePath();
}

// Portrait du HUD (mockup hud-jauge-score-final.html, cadre retenu) :
// bordure noire épaisse + lueur externe noire (ombre) + lueur interne blanche
// posée EN MODE 'screen' par-dessus le sprite (donc visible sur le perso,
// contrairement à un simple fond clair) + fond très clair teinté du perso.
function drawHexPortrait(p, x, y, s, mirror) {
  const c = p.char, border = 5, bob = Math.sin(G.now * 2.4 + p.side) * 1.6, breathe = 1 + Math.sin(G.now * 1.85 + p.side) * .015;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 9;
  ctx.fillStyle = '#111318';
  hexPathHUD(x, y, s, s, mirror, .2); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
  hexPathHUD(x + border, y + border, s - border * 2, s - border * 2, mirror, .2);
  ctx.fillStyle = paleHUD(c.color, .88);
  ctx.fill();
  ctx.save();
  ctx.clip();
  const img = (p.frames || c.frames).idle, sw = 16, sh = 16; // tête + haut du torse : jambes coupées
  const scale = (s - border * 2) * breathe / sw, dw = sw * scale, dh = sh * scale;
  const dx = x + border + (s - border * 2 - dw) / 2, dy = y + border - (dh - (s - border * 2)) / 2 + bob;
  ctx.drawImage(img, 0, 0, sw, sh, dx, dy, dw, dh);
  // Lueur interne : mode 'screen' pour éclaircir le perso plutôt que le recouvrir.
  ctx.globalCompositeOperation = 'screen';
  const g = ctx.createRadialGradient(x + s / 2, y + s / 2, s * .18, x + s / 2, y + s / 2, s * .62);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.85)');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, s, s);
  ctx.restore(); // lève le clip + le mode 'screen'
  ctx.restore(); // lève l'ombre externe
}

function drawHUD() {
  ctx.textAlign = 'left';
  const S = 72;
  const panel = (p, edgeX, alignRight) => {
    const c = p.char;
    const hexX = alignRight ? edgeX - S : edgeX;
    drawHexPortrait(p, hexX, 8, S, alignRight);
    const infoX = alignRight ? hexX - 10 : hexX + S + 10;
    ctx.textAlign = alignRight ? 'right' : 'left';
    // Étiquette nom + score, dégradé clair de la couleur du perso (piste A).
    ctx.font = '11px "Archivo Black", system-ui, sans-serif';
    const label = c.short + ' · ' + p.score;
    const tw = ctx.measureText(label).width + 16;
    const tx = alignRight ? infoX - tw : infoX;
    const grad = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    grad.addColorStop(0, c.color); grad.addColorStop(1, paleHUD(c.color, .45));
    ctx.fillStyle = grad;
    ctx.fillRect(tx, 10, tw, 20);
    ctx.strokeStyle = '#111318'; ctx.lineWidth = 2.5;
    ctx.strokeRect(tx, 10, tw, 20);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(label, tx + tw / 2, 25);
    // Jauge d'ultime : agrandie, reflet qui balaie en continu, halo fixe (pas de
    // clignotement dur) qui respire doucement une fois pleine.
    const bw = 150, bh = 16, by = 34, bx = alignRight ? infoX - bw : infoX;
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx, by, bw, bh);
    const full = p.meter >= 100;
    ctx.fillStyle = full ? '#ffffff' : c.color;
    ctx.fillRect(bx, by, bw * p.meter / 100, bh);
    // Reflet diagonal qui balaie la jauge, façon .bar i des menus.
    ctx.save();
    ctx.beginPath(); ctx.rect(bx, by, bw * p.meter / 100, bh); ctx.clip();
    const shineX = bx + ((G.now * 70) % (bw + 60)) - 60;
    const shine = ctx.createLinearGradient(shineX, 0, shineX + 40, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)'); shine.addColorStop(.5, 'rgba(255,255,255,.55)'); shine.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shine;
    ctx.fillRect(bx, by, bw, bh);
    ctx.restore();
    if (full) {
      ctx.save();
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6 + Math.sin(G.now * 3.4) * 3;
      ctx.strokeStyle = '#111318'; ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    } else {
      ctx.strokeStyle = '#111318'; ctx.lineWidth = 3;
      ctx.strokeRect(bx, by, bw, bh);
    }
    // En ligne on nomme les deux joueurs sous leur jauge. Hors ligne on garde
    // le seul repère utile, le « J2 » du second clavier.
    const etiq = Partie.active ? etiquetteJoueur(p) : (G.isJ2J && p.side === 2 ? 'J2' : null);
    if (etiq) {
      ctx.fillStyle = Partie.active ? c.accent : '#35e0ff';
      ctx.font = '9px "Archivo Black", system-ui, sans-serif';
      ctx.textAlign = alignRight ? 'right' : 'left';
      ctx.fillText(etiq, alignRight ? bx + bw : bx, by + bh + 12);
    }
  };
  // En vue miroir, celui qui occupe le côté gauche de CET écran n'est plus
  // forcément G.p1 : c'est toujours son propre joueur qui doit s'y trouver.
  const [gauche, droite] = enMiroir() ? [G.p2, G.p1] : [G.p1, G.p2];
  panel(gauche, 14, false);
  panel(droite, W - 14, true);

  // ----- Bandeau central (mockup hud-bandeau-central-final.html) -----
  ctx.textAlign = 'center';
  ctx.font = '11px "Archivo Black", system-ui, sans-serif';
  const label = 'PREMIER À ' + TARGET;
  const pw = ctx.measureText(label).width + 28, ph = 20, px = CX - pw / 2, py = 8;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.roundRect(px, py, pw, ph, ph / 2); ctx.fill();
  ctx.strokeStyle = '#111318'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = '#111318';
  ctx.fillText(label, CX, py + 14);

  // Ping de la liaison : barres de signal + texte, sans cadre (piste D). Il
  // n'était pas affiché avant parce qu'il n'était pas mesuré : `mesurerPing`
  // n'avait aucun appelant et la valeur restait à zéro.
  if (Partie.active) {
    const ms = Reseau.ping | 0;
    const col = ms === 0 ? '#9aa0ac' : (ms < 60 ? '#7bd66a' : (ms < 120 ? '#ffd23e' : '#ff5340'));
    const bx0 = CX - 20, by0 = py + ph + 12;
    ctx.fillStyle = col;
    [[0, 4], [4, 6], [8, 8]].forEach(([dx, h]) => ctx.fillRect(bx0 + dx, by0 - h, 3, h));
    ctx.fillStyle = '#eaf2ff';
    ctx.font = '9px "Archivo Black", system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(ms === 0 ? '— MS' : ms + ' MS', bx0 + 14, by0);
    ctx.textAlign = 'center';
  }

  // Compteur d'échange : grand chiffre lumineux qui respire doucement en
  // continu (jamais figé, mais sans clignoter dur — piste D).
  if (G.rally >= 4) {
    const ry = py + ph + 40, breathe = 1 + Math.sin(G.now * 3.5) * .07;
    ctx.save();
    ctx.translate(CX, ry); ctx.scale(breathe, breathe);
    ctx.shadowColor = 'rgba(255,210,80,.85)'; ctx.shadowBlur = 14 + Math.sin(G.now * 3.5) * 6;
    ctx.fillStyle = '#ffe27a';
    ctx.font = '26px "Archivo Black", system-ui, sans-serif';
    ctx.fillText('×' + G.rally, 0, 0);
    ctx.restore();
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
  // Le joueur de CETTE machine, pas celui de gauche : côté invité, le viseur
  // affichait la couleur du joueur d'en face, jamais la sienne.
  const p = monJoueur();
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
/* Rafale de Mamie : chaque balle est un trait orienté selon SA propre
   direction (b.a), figée au tir — jamais selon la visée courante, sinon la
   rafale entière pivoterait avec la souris. */
function drawBalles() {
  ctx.save();
  for (const b of G.balles) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.a);
    ctx.fillStyle = 'rgba(255,226,140,.35)';
    ctx.fillRect(-16, -3, 22, 6);
    ctx.fillStyle = '#ffb020';
    ctx.fillRect(-7, -2, 14, 4);
    ctx.restore();
  }
  ctx.restore();
}

/* Crochet de Chopper : la chaîne et son crochet, de la main jusqu'au disque.
   La chaîne pend sous son propre poids — le mou est fort à l'aller, quand elle
   se déroule, et nul pendant la traction, quand elle est sous tension. Un
   segment rigide était ce qui trahissait le plus l'animation. */
function drawGrappin() {
  const g = G.grappin;
  const p = g.owner;
  if (!p) return;
  const mainX = p.x + p.face * 14, mainY = p.y - 18;
  // Pendant l'armement le crochet est encore dans la main, en arrière.
  const enMain = g.phase === 'arme' || g.phase === 'fenetre';
  const hx = enMain ? mainX - p.face * 18 : g.hx;
  const hy = enMain ? mainY + 4 : g.hy;
  const mou = g.phase === 'vol' ? 22 : g.phase === 'accroche' ? 4 : 8;

  const d = Math.hypot(hx - mainX, hy - mainY);
  const n = Math.max(2, Math.round(d / 11));
  const mx = (mainX + hx) / 2, my = (mainY + hy) / 2 + mou;
  const pt = u => ({
    x: (1 - u) * (1 - u) * mainX + 2 * (1 - u) * u * mx + u * u * hx,
    y: (1 - u) * (1 - u) * mainY + 2 * (1 - u) * u * my + u * u * hy
  });
  ctx.save();
  ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = 2.4;
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = pt(u), b = pt(Math.min(1, u + .05));
    ctx.beginPath();
    ctx.ellipse(a.x, a.y, 4.2, 2.6, Math.atan2(b.y - a.y, b.x - a.x), 0, Math.PI * 2);
    ctx.stroke();
  }
  // Le crochet s'oriente sur sa vitesse, pas sur la cible : c'est ce qui le
  // rend crédible quand la chaîne se ravale en courbe.
  const q = pt(.92);
  ctx.translate(hx, hy);
  ctx.rotate(Math.atan2(hy - q.y, hx - q.x));
  ctx.strokeStyle = '#c8ccd4'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(3, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(3, -8, 8, Math.PI * .5, Math.PI * 1.75); ctx.stroke();
  ctx.fillStyle = '#e8eaef';
  ctx.beginPath(); ctx.moveTo(9, -13); ctx.lineTo(16, -18); ctx.lineTo(10, -7); ctx.fill();
  ctx.restore();

  // Fenêtre de contrôle : un anneau qui bat autour du disque en main, pour
  // qu'on lise qu'on a la main sur la relance et pas que l'ultime s'est arrêté.
  if (g.phase === 'fenetre') {
    const bat = .5 + .5 * Math.sin(g.t * 18);
    ctx.save();
    ctx.strokeStyle = `rgba(232,194,58,${.25 + .4 * bat})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(mainX, mainY, 17 + bat * 5, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

/* Le chien de Yuki. La vidéo est détourée image par image : son fond vert est
   sombre et désaturé, donc le test porte sur la TEINTE et non sur un rapport
   entre canaux — un seuil du type « vert > rouge × 1,25 » laisse passer ce
   vert-là. Les pixels sans teinte (delta faible) sont écartés d'emblée : c'est
   la fourrure blanche du chien, et la confondre avec du décor était l'erreur
   qui avait fait conclure que la vidéo n'avait pas de fond vert.

   Le détourage se fait sur une toile réduite puis agrandie : à pleine
   résolution ce serait presque un million de pixels à parcourir soixante fois
   par seconde, pour un chien qui est de toute façon flou en plein écran. */
const chienToile = document.createElement('canvas');
const chienCtx = chienToile.getContext('2d', { willReadFrequently: true });
const CHIEN_LARGEUR = 400;

function drawChien() {
  const c = G.chien;
  if (!c) return;
  // Seul l'ADVERSAIRE est aveuglé : la machine de Yuki ne dessine rien. En
  // solo contre l'IA, c'est donc invisible pour le joueur qui l'a lancé —
  // c'est le sens de l'ultime, et l'IA le subit par son hésitation (voir
  // updateChien).
  if (monJoueur() === c.owner) return;
  const v = CHIEN_VIDEO;
  if (!v.videoWidth || v.readyState < 2) return;

  if (chienToile.width !== CHIEN_LARGEUR) {
    chienToile.width = CHIEN_LARGEUR;
    chienToile.height = Math.round(CHIEN_LARGEUR * v.videoHeight / v.videoWidth);
  }
  chienCtx.drawImage(v, 0, 0, chienToile.width, chienToile.height);
  const img = chienCtx.getImageData(0, 0, chienToile.width, chienToile.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), delta = mx - mn;
    if (delta < .06) continue;                    // sans teinte : c'est le chien
    let h;
    if (mx === r) h = 60 * (((g - b) / delta) % 6);
    else if (mx === g) h = 60 * ((b - r) / delta + 2);
    else h = 60 * ((r - g) / delta + 4);
    if (h < 0) h += 360;
    if (h > 95 && h < 175) d[i + 3] = 0;          // vert : effacé
  }
  chienCtx.putImageData(img, 0, 0);

  // Plein écran, en espace écran : le chien ne fait pas partie du monde, il
  // est posé devant. Il s'efface en fin d'ultime plutôt que de disparaître
  // d'un coup, sinon le terrain revient comme une gifle.
  const reste = c.dur - c.t;
  ctx.save();
  ctx.globalAlpha = reste < .35 ? reste / .35 : 1;
  const ech = Math.max(W / chienToile.width, H / chienToile.height);
  const w = chienToile.width * ech, h = chienToile.height * ech;
  ctx.drawImage(chienToile, (W - w) / 2, (H - h) / 2, w, h);
  ctx.restore();
}

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
  // Aussi haute que la cage : le blocage couvre maintenant tout le but (voir
  // clocheBloque() dans disc.js), et la dessiner plus courte qu'avant aurait
  // laissé croire à une brèche en haut et en bas qui n'existe plus.
  const bh = (GOAL_BOTTOM - GOAL_TOP) * (0.35 + 0.65 * e);
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
// Piratage de Cyberleek. Un terminal s'ouvre sur la moitié de terrain de la
// victime — pas au centre de l'écran : on doit voir tout de suite QUI est
// piraté, et un panneau centré aurait laissé le doute une seconde de trop.
// ---------------------------------------------------------------------------
const VERT_HACK = '#5df08a';

function drawHack() {
  const h = G.hack;
  const k = h.t / h.dur;
  // Il s'ouvre vite et se referme vite, en restant lisible au milieu.
  const ouv = Math.min(1, k * 6) * Math.min(1, (1 - k) * 5);
  if (ouv <= 0) return;
  const cible = h.cible;
  // Déjà en espace écran (px se calcule à partir de W, pas d'une position du
  // terrain) : c'est le bon côté d'ÉCRAN qu'il faut trouver, pas le côté
  // monde. En vue miroir, le côté 1 (normalement à gauche) apparaît à droite.
  const gauche = !cible || (enMiroir() ? cible.side !== 1 : cible.side === 1);
  const pw = Math.min(360, W * .42), ph = 176;
  const px = gauche ? W * .06 : W - W * .06 - pw;
  const py = H * .5 - ph / 2;

  ctx.save();
  ctx.translate(px + pw / 2, py + ph / 2);
  ctx.scale(1, ouv);
  ctx.translate(-(px + pw / 2), -(py + ph / 2));

  ctx.fillStyle = 'rgba(4,10,8,.92)';
  ctx.fillRect(px, py, pw, ph);
  ctx.strokeStyle = VERT_HACK; ctx.lineWidth = 2;
  ctx.strokeRect(px + .5, py + .5, pw - 1, ph - 1);

  // Barre de titre : elle nomme la cible, c'est la lecture la plus rapide.
  ctx.fillStyle = VERT_HACK;
  ctx.fillRect(px, py, pw, 18);
  ctx.fillStyle = '#041008';
  ctx.font = 'bold 11px Consolas, "Courier New", monospace';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('$CYBERLEEK — root@' + ((cible && cible.char.short) || 'CIBLE'), px + 8, py + 9);

  // Les lignes tombent l'une après l'autre. La dernière clignote : c'est la
  // seule qui dit ce que le joueur va subir.
  ctx.font = '11px Consolas, "Courier New", monospace';
  ctx.textBaseline = 'top';
  h.lignes.forEach((l, i) => {
    if (h.t < l.a) return;
    const finale = i === h.lignes.length - 1;
    if (finale && Math.sin(h.t * 22) < 0) return;
    ctx.fillStyle = finale ? '#ffffff' : (l.texte.startsWith('>') ? VERT_HACK : 'rgba(93,240,138,.6)');
    ctx.fillText(l.texte, px + 8, py + 26 + i * 16);
  });

  // Curseur de saisie, et bandes de parasites qui traversent le panneau.
  if (Math.sin(h.t * 14) > 0) {
    ctx.fillStyle = VERT_HACK;
    ctx.fillRect(px + 8, py + 26 + h.lignes.length * 16, 7, 11);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const by = py + ((h.t * (140 + i * 90) + i * 61) % ph);
    ctx.fillStyle = 'rgba(93,240,138,.14)';
    ctx.fillRect(px, by, pw, 3);
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

// Pluie de caractères sur la moitié de terrain du joueur piraté. Elle dure tout
// l'effet et sert de rappel : sans elle, six secondes après le terminal, on ne
// sait plus pourquoi on court à l'envers.
const GLYPHES_HACK = '01¥$#%&@/\\<>[]{}=+*';
const COLONNES_HACK = 15, TRAINEE_HACK = 5;
function drawPluieHack(p) {
  const gauche = p.side === 1;
  const x0 = gauche ? COURT.left : CX, x1 = gauche ? CX : COURT.right;
  const haut = COURT.top, bas = COURT.bottom, hauteur = bas - haut;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0, haut, x1 - x0, hauteur); ctx.clip();
  ctx.font = '13px Consolas, "Courier New", monospace';
  ctx.textAlign = 'center';
  const rng = makeRngHack(p.side * 7717);
  for (let c = 0; c < COLONNES_HACK; c++) {
    const cx = x0 + (c + .5) * ((x1 - x0) / COLONNES_HACK) + (rng() - .5) * 10;
    const ph = rng(), vit = .28 + rng() * .3;
    const tete = ((ph + G.now * vit) % 1.25) * hauteur;
    // Une colonne, c'est une tête claire suivie d'une traînée qui s'éteint.
    // Des glyphes isolés ne se lisaient pas : c'est la traînée qui fait la
    // pluie, pas le nombre de caractères.
    for (let j = 0; j < TRAINEE_HACK; j++) {
      const cy = haut + tete - j * 15;
      if (cy < haut || cy > bas) continue;
      ctx.globalAlpha = (1 - j / TRAINEE_HACK) * .5;
      ctx.fillStyle = j === 0 ? '#ffffff' : VERT_HACK;
      texteMonde(GLYPHES_HACK[(Math.floor(G.now * 7 + c * 5 + j * 3) % GLYPHES_HACK.length)], cx, cy);
    }
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
// Générateur figé : les colonnes de pluie doivent rester aux mêmes abscisses
// d'une image à l'autre, sinon la pluie grésille au lieu de tomber.
function makeRngHack(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
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
  // Le monde — terrain, joueurs, disque, particules, viseur — se dessine dans
  // son propre repère, séparé de celui du zoom/tremblement ci-dessus. C'est ce
  // qui permet à l'invité de le voir en miroir sans que ça déborde sur le HUD,
  // qui reste toujours en espace écran, jamais retourné.
  ctx.save();
  if (enMiroir()) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  drawCourt();
  // La pluie de code tombe sur le sol du camp piraté, donc sous les joueurs et
  // sous le disque : elle habille le terrain, elle ne masque jamais l'action.
  for (const p of [G.p1, G.p2]) if (p && p.piratage > 0) drawPluieHack(p);
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
  if (G.balles.length) drawBalles();
  if (G.grappin) drawGrappin();
  if (G.ondesBut.length) drawOndesBut();
  drawParticles();
  // Le viseur suit la souris EN ESPACE MONDE (Mouse.x/y sont déjà corrigés à
  // la capture, voir input.js) : il doit donc rester dans ce même repère pour
  // que le miroir le replace au bon endroit à l'écran, comme n'importe quel
  // autre objet du monde.
  if (G.p1 && !G.demo) drawCrosshair();
  ctx.restore();
  // Pas de HUD à l'entraînement : il n'y a ni score ni objectif à suivre, et le
  // bandeau mangerait la place de l'historique des actions.
  if (G.p1 && !G.demo && !G.training) drawHUD();
  drawTexts();
  drawCommentator();
  ctx.restore();
  // Les bandes et le logo REPLAY sont en espace écran : dessinés dans la
  // transformation caméra, ils auraient été zoomés avec le terrain.
  if (G.replay) drawReplayOverlay();
  drawTempete();
  // La neige du Pôle Nord, comme la tempête de sable : en espace écran, donc
  // par-dessus tout, et jamais retournée chez l'invité.
  drawNeigeNoel();
  // Le chien passe après tout le reste, HUD compris : il aveugle vraiment.
  // En espace écran comme la tempête, donc jamais retourné chez l'invité.
  if (G.chien) drawChien();
  if (G.hack) drawHack();
  drawDebug();
  // Flash du Perfect Dive, appliqué hors zoom pour couvrir tout l'écran.
  // Plafonné à 1 : la transformation Six Paths pousse la valeur bien au-delà
  // pour blanchir complètement l'écran, et redescend ensuite par le même chemin.
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(1, G.flash * .55).toFixed(3) + ')';
    ctx.fillRect(0, 0, W, H);
  }
}
