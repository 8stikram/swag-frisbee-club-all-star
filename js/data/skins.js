import { TAU } from '../core/utils.js';

// Registre des skins de disque. Pour ajouter un skin : une entrée ici + un `case` dans drawSkinDisc.
export const DISC_SKINS = [
  { id: 'captain', name: 'Captain', colors: ['#0033a0', '#ffffff', '#d90000'] },
  { id: 'palestine', name: 'Palestine', colors: ['#000000', '#ffffff', '#009639', '#ce1126'] },
  { id: 'israel', name: 'Israël', colors: ['#ffffff', '#0038b8'] },
  { id: 'galaxy', name: 'Galaxie', colors: ['#1a0033', '#4a00e0', '#8e2de2', '#00d4ff'] },
  { id: 'magma', name: 'Magma', colors: ['#2a1410', '#ff4500', '#ffd700'] },
  { id: 'glitch', name: 'Glitch', colors: ['#ff00ff', '#00ffff', '#ff0000', '#00ff00'] }
];

// Disque préféré, réglable dans les options et conservé d'une session à l'autre.
// `null` signifie « aléatoire » : c'est le comportement par défaut, un disque
// différent étant tiré à chaque ouverture du site.
let favSkinId = null;
export function getFavSkin() { return favSkinId; }
export function setFavSkin(id) {
  favSkinId = id;
  try { localStorage.setItem('sbcbFavSkin', id || '__random'); } catch (e) { }
  if (id) { currentSkinId = id; saveSkin(); }
}
export function randomSkinId() { return DISC_SKINS[(Math.random() * DISC_SKINS.length) | 0].id; }

let currentSkinId = 'captain';

export function getSkinId() { return currentSkinId; }
export function setSkinId(id) { currentSkinId = id; saveSkin(); }
export function getSkin() { return DISC_SKINS.find(s => s.id === currentSkinId) || DISC_SKINS[0]; }
function loadSkin() {
  try {
    const s = localStorage.getItem('sbcbSkin');
    // Un skin retiré du registre (ancienne sauvegarde) ne doit pas casser l'affichage.
    if (s && DISC_SKINS.some(k => k.id === s)) currentSkinId = s;
  } catch (e) { }
}
function saveSkin() { try { localStorage.setItem('sbcbSkin', currentSkinId); } catch (e) { } }
loadSkin();

// Au démarrage : si un disque préféré est enregistré on l'applique, sinon on en
// tire un au hasard — le disque de base est volontairement aléatoire.
(function initSkin() {
  let s = null;
  try { s = localStorage.getItem('sbcbFavSkin'); } catch (e) { }
  if (s && s !== '__random' && DISC_SKINS.some(k => k.id === s)) {
    favSkinId = s; currentSkinId = s;
  } else {
    favSkinId = null; currentSkinId = randomSkinId();
  }
})();

/* Générateur pseudo-aléatoire déterministe : les motifs (étoiles, veines de lave)
   doivent rester identiques d'une image à l'autre, sinon le disque scintille. */
function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Dessine un drapeau à bandes horizontales, découpé au disque par le clip appelant. */
function stripes(ctx, r, bands) {
  const h = (r * 2) / bands.length;
  bands.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(-r, -r + i * h, r * 2, h + 1);
  });
}

function star(ctx, cx, cy, outer, inner, points, rot) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawSkinDisc(ctx, x, y, r, skinId, spin) {
  ctx.save();
  ctx.translate(x, y);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.closePath();
  ctx.clip();

  switch (skinId) {
    /* ---------- Bouclier de Captain America : anneaux concentriques + étoile ---------- */
    case 'captain': {
      const rings = [
        [1.00, '#c2131a'], // rouge extérieur
        [0.80, '#f2f2f2'], // blanc
        [0.62, '#c2131a'], // rouge
        [0.44, '#f2f2f2'], // blanc
        [0.30, '#1b3f94']  // bleu central
      ];
      for (const [k, col] of rings) {
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(0, 0, r * k, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = '#f2f2f2';
      star(ctx, 0, 0, r * 0.26, r * 0.11, 5, -Math.PI / 2 + spin * 0.15);
      // Rainures entre les anneaux, pour le relief métallique.
      ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = Math.max(1, r * 0.03);
      for (const [k] of rings) { ctx.beginPath(); ctx.arc(0, 0, r * k, 0, TAU); ctx.stroke(); }
      break;
    }

    /* ---------- Drapeau palestinien ---------- */
    case 'palestine': {
      stripes(ctx, r, ['#000000', '#ffffff', '#009639']);
      ctx.fillStyle = '#ce1126';
      ctx.beginPath();
      ctx.moveTo(-r, -r); ctx.lineTo(-r * 0.1, 0); ctx.lineTo(-r, r);
      ctx.closePath(); ctx.fill();
      break;
    }

    /* ---------- Drapeau israélien ---------- */
    case 'israel': {
      ctx.fillStyle = '#ffffff'; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.fillStyle = '#0038b8';
      const bh = r * 0.28;
      ctx.fillRect(-r, -r * 0.72, r * 2, bh);
      ctx.fillRect(-r, r * 0.44, r * 2, bh);
      // Étoile de David : deux triangles équilatéraux superposés.
      ctx.strokeStyle = '#0038b8'; ctx.lineWidth = Math.max(1.5, r * 0.09);
      const rad = r * 0.42;
      for (const off of [0, Math.PI]) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = off - Math.PI / 2 + (i * TAU) / 3;
          const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.stroke();
      }
      break;
    }

    /* ---------- Nébuleuse type skin galaxie ---------- */
    case 'galaxy': {
      const base = ctx.createRadialGradient(-r * .25, -r * .3, r * .05, 0, 0, r * 1.15);
      base.addColorStop(0, '#ffffff');
      base.addColorStop(.12, '#8ee7ff');
      base.addColorStop(.34, '#7b3fe4');
      base.addColorStop(.62, '#3a0ca3');
      base.addColorStop(1, '#0b0221');
      ctx.fillStyle = base; ctx.fillRect(-r, -r, r * 2, r * 2);

      // Volutes de nébuleuse, tournant avec le disque.
      ctx.save();
      ctx.rotate(spin * 0.3);
      const rng = makeRng(1337);
      for (let i = 0; i < 7; i++) {
        const a = rng() * TAU, d = rng() * r * .7;
        const rad = r * (.22 + rng() * .3);
        const g = ctx.createRadialGradient(Math.cos(a) * d, Math.sin(a) * d, 0, Math.cos(a) * d, Math.sin(a) * d, rad);
        const tint = i % 2 ? 'rgba(226,120,255,' : 'rgba(90,200,255,';
        g.addColorStop(0, tint + '.55)');
        g.addColorStop(1, tint + '0)');
        ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);
      }
      ctx.restore();

      // Champ d'étoiles fixe (motif déterministe).
      const rs = makeRng(99);
      for (let i = 0; i < 46; i++) {
        const a = rs() * TAU, d = Math.sqrt(rs()) * r * .95;
        const sz = Math.max(0.7, rs() * r * .07);
        ctx.globalAlpha = .35 + rs() * .65;
        ctx.fillStyle = rs() > .78 ? '#ffe9a8' : '#ffffff';
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, sz, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    /* ---------- Lave en fusion : plaques de roche + fissures incandescentes ---------- */
    case 'magma': {
      // Lueur de fond : la lave transparaît sous la croûte.
      const glow = ctx.createRadialGradient(0, 0, r * .08, 0, 0, r);
      glow.addColorStop(0, '#fff3b0');
      glow.addColorStop(.28, '#ffb020');
      glow.addColorStop(.6, '#e03a00');
      glow.addColorStop(1, '#7a1500');
      ctx.fillStyle = glow; ctx.fillRect(-r, -r, r * 2, r * 2);

      // Croûte de roche : blocs irréguliers éparpillés, séparés par des
      // fissures où la lave transparaît (référence Lava Hound).
      ctx.save();
      ctx.rotate(spin * 0.25);
      const rng = makeRng(4242);
      const chunks = [];
      // Semis de centres sur plusieurs couronnes, pour couvrir tout le disque.
      for (const ring of [0, .34, .62, .86]) {
        const count = ring === 0 ? 1 : Math.round(4 + ring * 7);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU + rng() * .6;
          chunks.push({ x: Math.cos(a) * r * ring, y: Math.sin(a) * r * ring, s: r * (.2 + rng() * .16) });
        }
      }
      for (const c of chunks) {
        const pts = 6 + ((rng() * 3) | 0);
        ctx.beginPath();
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * TAU;
          const rad = c.s * (.68 + rng() * .5);
          const px = c.x + Math.cos(a) * rad, py = c.y + Math.sin(a) * rad;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        const shade = 24 + Math.floor(rng() * 26);
        ctx.fillStyle = `rgb(${shade + 16},${shade + 4},${shade - 2})`;
        ctx.fill();
        // Liseré chaud : le bord du bloc chauffé par la lave en dessous.
        ctx.strokeStyle = 'rgba(255,140,30,.55)';
        ctx.lineWidth = Math.max(1, r * .028);
        ctx.stroke();
      }
      ctx.restore();

      // Braises qui ressortent au centre.
      const re = makeRng(7);
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const a = re() * TAU, d = re() * r * .8;
        const sz = r * (.03 + re() * .05);
        ctx.fillStyle = re() > .5 ? 'rgba(255,200,60,.9)' : 'rgba(255,110,20,.85)';
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, sz, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
      break;
    }

    /* ---------- Datamosh : blocs déplacés, bavures et séparation RVB ---------- */
    case 'glitch': {
      // Image source : dégradé net que l'on va « casser ».
      const g = ctx.createLinearGradient(-r, -r, r, r);
      g.addColorStop(0, '#12d0ff'); g.addColorStop(.5, '#7b2ff7'); g.addColorStop(1, '#ff2fb9');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2);

      // Le motif change dans le temps : c'est le seul skin où le bruit est voulu.
      const t = Math.floor((spin || 0) * 6);
      const rng = makeRng(t * 2654435761);

      // Bandes horizontales décalées, façon macrobloc figé.
      const bands = 9;
      for (let i = 0; i < bands; i++) {
        const by = -r + (i / bands) * r * 2;
        const bh = (r * 2) / bands;
        const dx = (rng() - .5) * r * .9;
        if (rng() > .45) {
          ctx.save();
          ctx.beginPath(); ctx.rect(-r, by, r * 2, bh); ctx.clip();
          ctx.globalAlpha = .85;
          ctx.fillStyle = ['#12d0ff', '#7b2ff7', '#ff2fb9', '#00ffa3'][(rng() * 4) | 0];
          ctx.fillRect(-r + dx, by, r * 2, bh);
          ctx.restore();
        }
      }

      // Séparation des canaux : deux copies teintées, légèrement décalées.
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = .5;
      ctx.fillStyle = '#ff0040';
      ctx.fillRect(-r + r * .07, -r, r * 2, r * 2);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-r - r * .07, -r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;

      // Petits blocs de compression épars.
      for (let i = 0; i < 16; i++) {
        const bx = -r + rng() * r * 2, by = -r + rng() * r * 2;
        const bw = r * (.08 + rng() * .3), bh = r * (.04 + rng() * .12);
        ctx.globalAlpha = .3 + rng() * .5;
        ctx.fillStyle = ['#ffffff', '#000000', '#00ffa3', '#ff2fb9'][(rng() * 4) | 0];
        ctx.fillRect(bx, by, bw, bh);
      }
      ctx.globalAlpha = 1;

      // Lignes de balayage.
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      for (let yy = -r; yy < r; yy += Math.max(2, r * .12)) ctx.fillRect(-r, yy, r * 2, 1);
      break;
    }

    default: {
      ctx.fillStyle = '#ffd23e';
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
  }

  // Reflet commun : donne le volume du disque.
  const gloss = ctx.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.05, -r * 0.1, -r * 0.1, r * 0.95);
  gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
  gloss.addColorStop(0.45, 'rgba(255,255,255,0.08)');
  gloss.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gloss;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  // Ombre interne au bord, pour détacher le disque du fond.
  const edge = ctx.createRadialGradient(0, 0, r * 0.72, 0, 0, r);
  edge.addColorStop(0, 'rgba(0,0,0,0)');
  edge.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = edge;
  ctx.fillRect(-r, -r, r * 2, r * 2);

  ctx.restore();
}
