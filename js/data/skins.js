import { TAU } from '../core/utils.js';
import { forcageTuto } from './deverrouillage.js';

// Registre des skins de disque. Pour ajouter un skin : une entrée ici + un `case` dans drawSkinDisc.
export const DISC_SKINS = [
  { id: 'captain', name: 'Captain', colors: ['#0033a0', '#ffffff', '#d90000'] },
  { id: 'palestine', name: 'Palestine', colors: ['#000000', '#ffffff', '#009639', '#ce1126'] },
  { id: 'israel', name: 'Israël', colors: ['#ffffff', '#0038b8'] },
  { id: 'galaxy', name: 'Galaxie', colors: ['#1a0033', '#4a00e0', '#8e2de2', '#00d4ff'] },
  { id: 'magma', name: 'Magma', colors: ['#2a1410', '#ff4500', '#ffd700'] },
  { id: 'glitch', name: 'Glitch', colors: ['#ff00ff', '#00ffff', '#ff0000', '#00ff00'] },
  { id: 'chaptele', name: 'Chaptèle', colors: ['#2a1a4a', '#c9a227', '#f2e2b0'] },
  { id: 'pharaon', name: 'Pharaon', colors: ['#1b3a6b', '#d4af37', '#e8d5a3'] },
  { id: 'gelatine', name: 'Gélatine', colors: ['#ff5fa2', '#ffe14d', '#5ce1a0'] },
  { id: 'pegasus', name: 'Pegasus', colors: ['#1a2a5e', '#ffffff', '#ffd9f0'] },
  // Récompense du tutoriel. `verrou` nomme la condition à remplir : le sélecteur
  // l'affiche grisé et cadenassé tant qu'elle ne l'est pas, plutôt que de le
  // cacher — on ne convoite pas ce qu'on ignore.
  {
    id: 'vingt', name: '20/20', verrou: 'tuto',
    aide: 'Termine les 5 chapitres du tutoriel pour le débloquer.',
    colors: ['#fdfaf0', '#c8d8e8', '#d81f26']
  }
];

// Vrai quand le skin est jouable. Le déblocage vit dans data/apprentissage.js,
// importé à la demande pour ne pas lier ce registre au reste au chargement.
export function skinDebloque(skin) {
  if (!skin || !skin.verrou) return true;
  if (skin.verrou === 'tuto') {
    // Forçage du panneau admin : session seulement, jamais sauvegardé.
    const f = forcageTuto();
    if (f !== null) return f;
    return tutoEstTermine();
  }
  return true;
}
let _tuto = null;
function tutoEstTermine() {
  if (!_tuto) return false;
  return _tuto();
}
// Branché une fois au démarrage par apprentissage.js, pour éviter un cycle.
export function brancherVerrouTuto(fn) { _tuto = fn; }

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
// Le tirage au sort ne pioche que dans ce qui est débloqué : recevoir une
// récompense qu'on n'a pas gagnée lui retirerait tout son sens.
export function skinsJouables() { return DISC_SKINS.filter(skinDebloque); }
export function randomSkinId() {
  const libres = skinsJouables();
  return libres[(Math.random() * libres.length) | 0].id;
}

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

// Horloge des animations de face. On lit l'horloge directement plutôt que
// G.now : ce fichier est importé par actions.js, donc importer state.js d'ici
// fermerait une boucle. Une pulsation de lumière n'a de toute façon pas besoin
// du temps de jeu, elle n'a aucune incidence sur la partie.
const horloge = () => performance.now() / 1000;

// Contour du disque. Rond pour tout le monde sauf la Gélatine, qui tremble en
// permanence — son contour fait partie de son identité, pas seulement sa face.
export function deformationDisque(id) {
  if (id !== 'gelatine') return null;
  const t = horloge();
  return a => 1 + Math.sin(a * 5 + t * 6) * .045 + Math.sin(a * 3 - t * 4) * .03;
}

// Trace le contour, déformé ou non. Partagé avec le rendu, pour que le liseré
// suive exactement la silhouette découpée.
export function tracerContour(ctx, cx, cy, r, deform) {
  ctx.beginPath();
  if (!deform) { ctx.arc(cx, cy, r, 0, TAU); return; }
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU, rr = r * deform(a);
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function drawSkinDisc(ctx, x, y, r, skinId, spin) {
  const T = horloge();
  ctx.save();
  ctx.translate(x, y);
  tracerContour(ctx, 0, 0, r, deformationDisque(skinId));
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
      // Reflet qui balaie la surface : le bouclier est en métal poli, et c'est
      // le seul mouvement qu'on lui donne — les anneaux, eux, restent nets.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const bx = ((T * .6) % 2 - .5) * r * 2.4;
      const eclat = ctx.createLinearGradient(bx - r * .4, -r, bx + r * .4, r);
      eclat.addColorStop(0, 'rgba(255,255,255,0)');
      eclat.addColorStop(.5, 'rgba(255,255,255,.5)');
      eclat.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = eclat; ctx.fillRect(-r, -r, r * 2, r * 2);
      ctx.restore();
      break;
    }

    /* ---------- Drapeau palestinien : au vent, chevron qui respire ---------- */
    case 'palestine': {
      // Le drapeau flotte : chaque colonne est décalée par une onde qui court
      // de la hampe vers le bord libre. L'amplitude croît avec la distance à la
      // hampe, comme sur un vrai drapeau — sinon il ondule comme une nappe.
      const bandes = ['#000000', '#ffffff', '#009639'], h = (r * 2) / 3;
      for (let px = -r; px <= r; px += 2) {
        const k = (px / r + 1) / 2;
        const dy = Math.sin(k * 6 - T * 3.4) * r * .11 * k;
        bandes.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(px, -r + i * h + dy, 3, h + 1); });
      }
      // Le chevron rouge avance et recule très lentement : il respire, il ne
      // flotte pas — c'est la partie rigide du drapeau.
      const pointe = .1 + .28 * (.5 + .5 * Math.sin(T * 1.1));
      ctx.fillStyle = '#ce1126';
      ctx.beginPath();
      ctx.moveTo(-r, -r); ctx.lineTo(r * pointe, 0); ctx.lineTo(-r, r);
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
      const rad = r * 0.42;
      const tracerEtoile = (lw, col) => {
        ctx.strokeStyle = col; ctx.lineWidth = lw;
        for (const off of [0, Math.PI]) {
          ctx.beginPath();
          for (let i = 0; i < 3; i++) {
            const a = off - Math.PI / 2 + (i * TAU) / 3;
            const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
            i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.stroke();
        }
      };
      tracerEtoile(Math.max(1.5, r * 0.09), '#0038b8');
      // L'étoile s'illumine par à-coups. Un second tracé plus fin en mode
      // « lighter » par-dessus le premier : le bleu reste lisible au creux de
      // la pulsation, alors qu'un simple changement de couleur l'effacerait.
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (.5 + .5 * Math.sin(T * 2.6)) * .8;
      tracerEtoile(Math.max(1.5, r * 0.07), '#9fd4ff');
      ctx.restore();
      break;
    }

    /* ---------- Galaxie spiralée : noyau brillant et bras qui tournent ---------- */
    case 'galaxy': {
      // Vide intersidéral. Le fond reste sombre presque partout : c'est ce qui
      // laisse les bras ressortir. Un fond déjà clair les noierait.
      const base = ctx.createRadialGradient(0, 0, r * .04, 0, 0, r * 1.1);
      base.addColorStop(0, '#fff6d8');
      base.addColorStop(.10, '#ffd9a0');
      base.addColorStop(.26, '#8b5bd6');
      base.addColorStop(.55, '#2b0f63');
      base.addColorStop(1, '#07021a');
      ctx.fillStyle = base; ctx.fillRect(-r, -r, r * 2, r * 2);

      // Champ d'étoiles du fond : il ne tourne pas avec les bras, sinon tout
      // bouge ensemble et plus rien ne donne la rotation. En revanche il
      // scintille, chaque étoile à sa propre phase.
      const rs = makeRng(99);
      for (let i = 0; i < 34; i++) {
        const a = rs() * TAU, d = Math.sqrt(rs()) * r * .98, ph = rs() * TAU;
        ctx.globalAlpha = .25 + .7 * (.5 + .5 * Math.sin(T * 3 + ph));
        ctx.fillStyle = rs() > .8 ? '#ffe9a8' : '#ffffff';
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(.6, rs() * r * .055), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Les bras. Ils tournent plus lentement que le disque (facteur .35) :
      // à la même vitesse ils paraîtraient peints dessus, alors qu'on veut
      // une galaxie qui tourne pour son propre compte.
      // Deux termes, et c'est voulu : la galaxie tourne pour son propre compte
      // (T) même disque en main, et suit en partie la rotation du disque en vol
      // (spin) sans jamais coller à elle.
      ctx.save();
      ctx.rotate(spin * .35 + T * .25);
      ctx.globalCompositeOperation = 'lighter';
      const BRAS = 2, PAS = 26, TORSION = 2.5;
      const teintes = ['#ffffff', '#bfe9ff', '#8ee7ff', '#c9a0ff', '#ff9ad5'];
      for (let b = 0; b < BRAS; b++) {
        const depart = (b / BRAS) * TAU;
        const rb = makeRng(4200 + b * 77);
        for (let i = 1; i <= PAS; i++) {
          const t = i / PAS;
          // Spirale logarithmique : l'angle croît plus vite près du centre,
          // ce qui donne l'enroulement serré au cœur et lâche au bord.
          const ang = depart + Math.log(1 + t * 6) * TORSION;
          const dist = r * (.14 + t * .82);
          // Épaisseur du bras : il s'élargit et s'estompe vers l'extérieur.
          const eparpille = r * .10 * t;
          const grains = t < .5 ? 2 : 3;
          for (let k = 0; k < grains; k++) {
            const ja = ang + (rb() - .5) * .34 * (1 - t * .5);
            const jd = dist + (rb() - .5) * eparpille * 2;
            ctx.globalAlpha = (1 - t * .72) * .8;
            ctx.fillStyle = teintes[(rb() * teintes.length) | 0];
            ctx.beginPath();
            ctx.arc(Math.cos(ja) * jd, Math.sin(ja) * jd, Math.max(.55, r * (.075 - t * .045)), 0, TAU);
            ctx.fill();
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.restore();

      // Noyau : un halo par-dessus les bras, pour qu'ils semblent en sortir
      // plutôt que passer devant. Il bat, comme un phare au centre.
      const bat = .5 + .5 * Math.sin(T * 3);
      const coeur = ctx.createRadialGradient(0, 0, 0, 0, 0, r * (.28 + bat * .16));
      coeur.addColorStop(0, 'rgba(255,255,255,' + (.7 + bat * .28).toFixed(2) + ')');
      coeur.addColorStop(.35, 'rgba(255,226,160,' + (.5 + bat * .22).toFixed(2) + ')');
      coeur.addColorStop(1, 'rgba(255,180,90,0)');
      ctx.fillStyle = coeur; ctx.fillRect(-r, -r, r * 2, r * 2);
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
      // La croûte s'ouvre et se referme : les blocs s'écartent du centre, la
      // lave transparaît entre eux, puis tout se resserre.
      const ouverture = .5 + .5 * Math.sin(T * 1.6);
      ctx.save();
      ctx.rotate(spin * 0.25 + T * .12);
      const rng = makeRng(4242);
      const chunks = [];
      // Semis de centres sur plusieurs couronnes, pour couvrir tout le disque.
      for (const ring of [0, .34, .62, .86]) {
        const count = ring === 0 ? 1 : Math.round(4 + ring * 7);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * TAU + rng() * .6;
          chunks.push({ x: Math.cos(a) * r * ring, y: Math.sin(a) * r * ring, s: r * (.2 + rng() * .16), a });
        }
      }
      for (const c of chunks) {
        // Chaque bloc s'écarte le long de son propre rayon : la fissure part
        // ainsi du centre, au lieu de faire glisser toute la croûte d'un côté.
        const ecart = ouverture * r * .16;
        const cx = c.x + Math.cos(c.a) * ecart, cy = c.y + Math.sin(c.a) * ecart;
        const pts = 6 + ((rng() * 3) | 0);
        ctx.beginPath();
        for (let i = 0; i < pts; i++) {
          const a = (i / pts) * TAU;
          const rad = c.s * (.68 + rng() * .5);
          const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
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
      // Bulles de lave : elles gonflent puis crèvent, chacune à son rythme.
      // Cinq positions fixes, mais des phases décalées — on en voit toujours
      // trois ou quatre à la fois, jamais toutes ensemble.
      const rb = makeRng(9);
      for (let i = 0; i < 5; i++) {
        const a = rb() * TAU, d = rb() * r * .7, ph = rb(), chaud = rb() > .5;
        const k = (ph + T * .55) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI);
        ctx.fillStyle = chaud ? '#ffd23e' : '#ff7a12';
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, r * .05 + k * r * .1, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
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
      // Deux sources : l'horloge, pour qu'il grésille aussi à l'arrêt — dans le
      // menu, spin vaut zéro et le disque restait une image morte — et la
      // rotation, qui le fait s'emballer quand le tir part fort.
      const t = Math.floor(T * 6 + (spin || 0) * 6);
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

    /* ---------- 20/20 : une copie d'examen, la note au stylo rouge ---------- */
    case 'vingt': {
      // Papier légèrement crème, comme une feuille de classeur.
      ctx.fillStyle = '#fdfaf0';
      ctx.fillRect(-r, -r, r * 2, r * 2);

      // Réglure bleue horizontale, puis la marge verticale rouge.
      ctx.strokeStyle = 'rgba(120,160,200,.55)';
      ctx.lineWidth = Math.max(1, r * .035);
      for (let yy = -r + r * .28; yy < r; yy += r * .26) {
        ctx.beginPath(); ctx.moveTo(-r, yy); ctx.lineTo(r, yy); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(216,31,38,.5)';
      ctx.beginPath(); ctx.moveTo(-r * .52, -r); ctx.lineTo(-r * .52, r); ctx.stroke();

      // La note, écrite par-dessus et légèrement de travers. Elle pulse comme
      // une correction qu'on repasse au stylo — jamais jusqu'à disparaître,
      // sinon le disque n'a plus rien à montrer au creux du battement.
      ctx.save();
      ctx.rotate(-.14);
      ctx.globalAlpha = .55 + .45 * (.5 + .5 * Math.sin(T * 4));
      ctx.fillStyle = '#d81f26';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 ' + (r * .86).toFixed(1) + 'px "Archivo Black", sans-serif';
      ctx.fillText('20', 0, -r * .12);
      ctx.font = '700 ' + (r * .42).toFixed(1) + 'px "Archivo Black", sans-serif';
      ctx.fillText('/20', 0, r * .42);
      ctx.restore();
    }
      break;

    /* ---------- Chaptèle : une lettrine enluminée sur parchemin ---------- */
    case 'chaptele': {
      // Parchemin sombre plutôt que clair : l'or ne brille que sur du foncé,
      // et c'est l'or qu'on doit voir de loin.
      const fond = ctx.createRadialGradient(0, 0, r * .1, 0, 0, r);
      fond.addColorStop(0, '#4a2f6e');
      fond.addColorStop(.6, '#2a1a4a');
      fond.addColorStop(1, '#160d2c');
      ctx.fillStyle = fond; ctx.fillRect(-r, -r, r * 2, r * 2);

      // Rinceaux dorés : des arcs qui se dessinent puis se rétractent, comme
      // sous la plume du copiste, en tournant lentement sur eux-mêmes.
      const pousse = .5 + .5 * Math.sin(T * 1.3);
      ctx.save();
      ctx.rotate(spin * .18 + T * .2);
      ctx.strokeStyle = 'rgba(201,162,39,.75)';
      ctx.lineWidth = Math.max(1, r * .06);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * r * .58, Math.sin(a) * r * .58, r * .3, a + 1.2, a + 1.2 + 3 * pousse);
        ctx.stroke();
      }
      ctx.restore();

      // Cadre doré, sans lettre au centre : l'enluminure se suffit, et une
      // initiale se lirait mal à la taille d'un disque en vol.
      ctx.strokeStyle = '#c9a227'; ctx.lineWidth = Math.max(1.5, r * .1);
      ctx.beginPath(); ctx.arc(0, 0, r * .74, 0, TAU); ctx.stroke();
      break;
    }

    /* ---------- Pharaon : lapis et or, hiéroglyphes qui s'allument ---------- */
    case 'pharaon': {
      ctx.fillStyle = '#1b3a6b'; ctx.fillRect(-r, -r, r * 2, r * 2);
      // Bandes d'or horizontales : le pectoral égyptien, lisible de haut.
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(-r, -r * .86, r * 2, r * .2);
      ctx.fillRect(-r, r * .66, r * 2, r * .2);

      // Les glyphes s'allument à tour de rôle : un seul brille à la fois,
      // sinon le disque devient un sapin de Noël.
      const glyphes = ['𓂀', '𓆃', '𓊖', '𓋹', '𓁹', '𓃭'];
      const vif = Math.floor(T * 2.2) % glyphes.length;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = (r * .34).toFixed(1) + 'px serif';
      for (let i = 0; i < glyphes.length; i++) {
        const a = (i / glyphes.length) * TAU + spin * .12 + T * .3;
        const gx = Math.cos(a) * r * .52, gy = Math.sin(a) * r * .52;
        ctx.fillStyle = i === vif ? '#fff3c4' : 'rgba(212,175,55,.6)';
        ctx.fillText(glyphes[i], gx, gy);
      }
      // Œil d'Horus au centre : la paupière s'ouvre et se ferme. C'est le seul
      // point fixe du disque, donc c'est lui qu'on regarde — le scarabée, muet,
      // ne donnait rien à voir.
      const ouv = Math.abs(Math.sin(T * .9));
      ctx.fillStyle = '#e8d5a3';
      ctx.beginPath(); ctx.ellipse(0, 0, r * .42, r * .26 * ouv + r * .02, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1b3a6b';
      ctx.beginPath(); ctx.arc(0, 0, Math.max(0, r * .12 * ouv), 0, TAU); ctx.fill();
      // Le trait de khôl qui descend de l'œil : c'est lui qui fait lire
      // « Horus » plutôt que « œil » tout court.
      ctx.strokeStyle = '#d4af37'; ctx.lineWidth = Math.max(1, r * .045);
      ctx.beginPath(); ctx.moveTo(r * .40, r * .06); ctx.lineTo(r * .60, r * .24); ctx.stroke();
      break;
    }

    /* ---------- Gélatine : un bonbon translucide, reflets de fruit ---------- */
    case 'gelatine': {
      // Le translucide se joue sur un dégradé très clair au centre et saturé
      // au bord : c'est ce qui fait « on voit à travers » sans transparence.
      const gel = ctx.createRadialGradient(-r * .3, -r * .35, r * .05, 0, 0, r * 1.05);
      gel.addColorStop(0, '#fffdf2');
      gel.addColorStop(.24, '#ffe14d');
      gel.addColorStop(.58, '#ff8fbe');
      gel.addColorStop(1, '#e0247a');
      ctx.fillStyle = gel; ctx.fillRect(-r, -r, r * 2, r * 2);

      // Quartiers de fruit en suspension, qui tournent avec le disque.
      ctx.save();
      ctx.rotate(spin * .4 + T * .35);
      const rf = makeRng(555);
      for (let i = 0; i < 5; i++) {
        const a = rf() * TAU, d = rf() * r * .6;
        const sz = r * (.12 + rf() * .12);
        ctx.fillStyle = ['rgba(92,225,160,.75)', 'rgba(255,120,60,.7)', 'rgba(255,255,255,.6)'][(rf() * 3) | 0];
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * d, Math.sin(a) * d, sz, sz * .7, a, 0, TAU); ctx.fill();
      }
      ctx.restore();

      // Bulles d'air qui remontent et crèvent en haut. Le tremblement, lui, est
      // dans le contour (voir deformationDisque) : c'est ce qui fait « gelée »
      // plutôt que « bille », et il fallait le sortir d'ici pour que le liseré
      // du rendu suive la même silhouette.
      const rbu = makeRng(31);
      for (let i = 0; i < 8; i++) {
        const bx = (rbu() - .5) * r * 1.5, ph = rbu(), taille = r * (.035 + rbu() * .05);
        const k = (ph + T * .32) % 1;
        ctx.globalAlpha = Math.sin(k * Math.PI) * .75;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.beginPath(); ctx.arc(bx, r * .9 - k * r * 1.8, taille, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      break;
    }

    /* ---------- Pegasus : une aile déployée sur un ciel étoilé ---------- */
    case 'pegasus': {
      const ciel = ctx.createLinearGradient(0, -r, 0, r);
      ciel.addColorStop(0, '#0d1638');
      ciel.addColorStop(.55, '#1a2a5e');
      ciel.addColorStop(1, '#4a3a7a');
      ctx.fillStyle = ciel; ctx.fillRect(-r, -r, r * 2, r * 2);

      const re = makeRng(808);
      for (let i = 0; i < 20; i++) {
        const a = re() * TAU, d = Math.sqrt(re()) * r * .95;
        ctx.globalAlpha = .4 + re() * .6;
        ctx.fillStyle = re() > .8 ? '#ffd9f0' : '#ffffff';
        ctx.beginPath(); ctx.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(.6, re() * r * .05), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;

      // La constellation du cheval se relie point par point, puis repart de
      // zéro. Elle passe derrière l'aile : c'est le ciel, pas un décor collé.
      const sommets = [[-.55, .1], [-.3, -.2], [-.05, -.42], [.25, -.3], [.45, .02], [.3, .35], [-.02, .3], [-.3, .42]];
      const tracés = Math.min(sommets.length, Math.floor(((T * .8) % 1.6) * sommets.length));
      if (tracés > 1) {
        ctx.strokeStyle = 'rgba(255,217,240,.8)';
        ctx.lineWidth = Math.max(1, r * .022);
        ctx.beginPath();
        for (let i = 0; i < tracés; i++) {
          const px = sommets[i][0] * r, py = sommets[i][1] * r;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < tracés; i++) {
        ctx.beginPath(); ctx.arc(sommets[i][0] * r, sommets[i][1] * r, r * .04, 0, TAU); ctx.fill();
      }

      // L'aile : une silhouette pleine, pas un semis de plumes. Les rémiges
      // partent toutes d'une même épaule et s'allongent vers la pointe — c'est
      // ce point de départ commun qui fait lire « aile » plutôt que « tache ».
      // L'aile bat : l'éventail des rémiges s'ouvre et se referme. On fait
      // varier l'ouverture et non l'angle global — une aile qui pivoterait en
      // bloc ressemblerait à une aiguille de montre.
      const battement = .55 + .45 * (.5 + .5 * Math.sin(T * 3.4));
      ctx.save();
      ctx.rotate(spin * .22);
      const ex = -r * .46, ey = r * .30;          // épaule, en bas à gauche
      const REMIGES = 7;
      ctx.fillStyle = 'rgba(255,255,255,.94)';
      for (let i = 0; i < REMIGES; i++) {
        const k = i / (REMIGES - 1);
        const a = -1.42 + k * 1.15 * battement;   // éventail vers le haut-droite
        const len = r * (.72 + k * .52);
        const px = ex + Math.cos(a) * len, py = ey + Math.sin(a) * len;
        ctx.save();
        ctx.translate((ex + px) / 2, (ey + py) / 2);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, len * .5, r * (.10 - k * .028), 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      // Couvertures : la rangée courte qui masque la base des rémiges et donne
      // l'épaisseur de l'épaule.
      ctx.fillStyle = 'rgba(230,240,255,.95)';
      for (let i = 0; i < 4; i++) {
        const a = -1.30 + (i / 3) * .95;
        const len = r * .40;
        ctx.save();
        ctx.translate(ex + Math.cos(a) * len * .5, ey + Math.sin(a) * len * .5);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, len * .5, r * .085, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
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
