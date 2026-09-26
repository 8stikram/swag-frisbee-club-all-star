// ---------------------------------------------------------------------------
// TEMPLE DE LA FRICADELLE — la nef du Gardien Éternel, au cœur du Ch'Nord.
// Le terrain du Gardien Éternel de la Fricadelle, dont data/characters.js dit
// déjà l'univers.
//
// Un vrai temple, premier degré, d'une culture inventée : le plan d'un temple
// antique bâti en brique et en ardoise du Nord. On joue DANS la nef — l'idole
// au fond dans son abside, les bas-côtés le long des touches, l'escalier de la
// crypte en bas. Chaque pièce a été choisie parmi quatre dans
// mockups/temple-fricadelle.html, où l'on peut encore voir les variantes
// écartées et relire les mesures qui les ont départagées. La recette retenue :
// la gloire irradiante, la fricadelle dressée, les braseros et leurs gardes,
// les bouches de four, le damier, l'escalier de la crypte.
//
// Il vit dans son propre fichier, comme Raccoon City, pour ne pas verser
// quelques centaines de lignes de plus dans render.js.
//
// LE MODÈLE DE LUMIÈRE, relevé sur de vraies nefs de brique. Deux sources :
// l'idole en haut — c'est l'or qui éclaire, en éventail —, la lueur de la
// crypte en bas. Le milieu du terrain est donc le plus sombre, et les deux
// camps reçoivent exactement la même chose. Jamais de noir neutre : l'ombre
// d'une église de brique est brun-rouge. Les feux — braseros, fours,
// torchères — n'éclairent que leur mètre carré.
// ---------------------------------------------------------------------------
import { ctx, W, H } from '../../core/dom.js';
import { COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, GOAL_DEPTH } from '../../core/constants.js';
import { TAU } from '../../core/utils.js';
import { G } from '../../game/state.js';
import { getMap, getMapId } from '../../data/maps.js';
import { enMiroir } from '../../reseau/partie.js';
import { copieExacte, peindreHorsEcran, memoiserSprite } from '../calques.js';

const graine = i => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };
const alea = (i, a, b) => a + graine(i) * (b - a);

/* Les matières, nommées, déclinées ombre / moyen / clair. L'or est celui du
   Gardien, repris ligne pour ligne de data/characters.js. */
const MAT = {
  noirChaud:'#140d0e',
  briqueOmbre:'#3a2420', brique:'#6d4a40', briqueClaire:'#9a6a58',
  pierreOmbre:'#3a332e', pierre:'#6e6259', pierreClaire:'#9f8f80',
  marbre:'#b8aea0', marbreSombre:'#2a2426',
  ardoise:'#2a2f35',
  orOmbre:'#6d3f12', or:'#e8a94a', orVif:'#f7d488',
  bronze:'#7a4f26', bronzeClair:'#b8823f',
  ferArete:'#5d575b', bois:'#4a3526',
  blancArmure:'#f2f4f8', combinaison:'#1b1d24',
  feu:'#ff9a2e', braise:'#c2410c',
  rose:'#ff7fd0', roseSombre:'#c24f9a'
};

function hx(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function tt(h, a){ const [r,g,b] = hx(h); return `rgba(${r},${g},${b},${a})`; }
function mel(a, b, k){
  k = Math.max(0, Math.min(1, k));
  const A = hx(a), B = hx(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

/* La géométrie suit la fiche de la map au lieu d'être recopiée : changer
   goal.height ou le terrain dans maps.js désaccorderait sinon tout le dessin.
   Tenue à jour au début de chaque image par accorder(). */
let BANDE = 84, SEUIL = 560, GOAL_D = 48, GH = 100, SOL_IDOLE = 77;
let POCHES = [];
function accorder(){
  BANDE = COURT.top; SEUIL = COURT.bottom;
  GOAL_D = GOAL_DEPTH; GH = (GOAL_BOTTOM - GOAL_TOP) / 2;
  SOL_IDOLE = BANDE - 7;
  // Les deux poches libres de chaque bas-côté, au-dessus et au-dessous de la cage.
  POCHES = [{ y0: COURT.top + 4, y1: CY - GH - 10 }, { y0: CY + GH + 10, y1: COURT.bottom - 2 }];
}

/* Un texte peint dans le monde doit rester lisible chez l'invité, qui voit le
   terrain en miroir : on annule le retournement sur place. */
function texte(c, txt, x, y){
  if (!enMiroir()) { c.fillText(txt, x, y); return; }
  c.save(); c.translate(x, y); c.scale(-1, 1); c.fillText(txt, 0, 0); c.restore();
}

function appareil(c, x, y, w, h, o = {}){
  const hb = o.hb || 6, lb = o.lb || 16, base = o.base || MAT.brique;
  const a0 = o.a0 ?? .08, a1 = o.a1 ?? .17;
  c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
  let rang = 0;
  for (let yy = y; yy < y + h; yy += hb, rang++){
    const dec = rang % 2 ? 0 : lb / 2;
    for (let xx = x - dec; xx < x + w; xx += lb){
      c.fillStyle = tt(base, a0 + graine(xx * 1.7 + yy * 3.1) * (a1 - a0));
      c.fillRect(xx, yy + .8, lb - 1.3, hb - 1.6);
    }
  }
  c.restore();
}

function arche(c, x, lg, yHaut, yBas){
  const r = lg / 2, yN = yHaut + r;
  c.beginPath();
  c.moveTo(x - r, yBas); c.lineTo(x - r, yN);
  c.arc(x, yN, r, Math.PI, 0);
  c.lineTo(x + r, yBas); c.closePath();
}

function lueur(c, x, y, r, col, a){
  c.save(); c.globalCompositeOperation = 'screen';
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, tt(col, a)); g.addColorStop(.32, tt(col, a * .42)); g.addColorStop(1, tt(col, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

function flamme(c, x, y, t, s, k = 1){
  const v = .5 + Math.sin(t * 9 + s * 2.3) * .28 + Math.sin(t * 14.7 + s) * .22;
  c.save(); c.globalCompositeOperation = 'screen';
  c.fillStyle = tt(MAT.feu, .8);
  c.beginPath(); c.ellipse(x, y - 3 * k, 2.2 * k, (4 + v * 2.4) * k, Math.sin(t * 3 + s) * .14, 0, TAU); c.fill();
  c.fillStyle = tt('#fff1c2', .92);
  c.beginPath(); c.ellipse(x, y - 2.2 * k, .95 * k, (1.9 + v) * k, 0, 0, TAU); c.fill();
  c.restore();
  return v;
}

function palOr(e){
  return { clair: mel(MAT.orOmbre, MAT.orVif, .22 + e * .78), moyen: mel(MAT.orOmbre, MAT.or, .28 + e * .72),
           sombre: mel(MAT.noirChaud, MAT.orOmbre, .55 + e * .45), grain: MAT.orOmbre };
}

function fricadelle(c, x, y, lg, ht, pal, s){
  c.save(); c.translate(x, y);
  c.beginPath(); c.roundRect(-lg / 2, -ht, lg, ht, lg / 2);
  c.fillStyle = pal.moyen; c.fill();
  c.save(); c.clip();
  // Le modelé d'un cylindre : une bande claire au tiers, jamais sur le bord.
  const g = c.createLinearGradient(-lg / 2, 0, lg / 2, 0);
  g.addColorStop(0, tt(pal.sombre, .9)); g.addColorStop(.3, tt(pal.clair, .7));
  g.addColorStop(.46, tt(pal.clair, .25)); g.addColorStop(.8, tt(pal.sombre, .55));
  g.addColorStop(1, tt(pal.sombre, .95));
  c.fillStyle = g; c.fillRect(-lg / 2, -ht, lg, ht);
  // La peau grenue, plus serrée dans l'ombre.
  const n = Math.max(6, Math.round(lg * ht / 34));
  for (let i = 0; i < n; i++){
    const px = alea(s * 3 + i, -lg * .44, lg * .44), py = alea(s * 5 + i, -ht * .95, -ht * .05);
    c.fillStyle = tt(pal.grain, .12 + graine(s + i * 1.3) * .22);
    c.beginPath(); c.ellipse(px, py, .7 + graine(i + s) * lg * .05, .6, 0, 0, TAU); c.fill();
  }
  // Le pli de cuisson.
  c.strokeStyle = tt(pal.grain, .5); c.lineWidth = Math.max(.8, lg * .065);
  c.beginPath(); c.moveTo(lg * .08, -ht * .93);
  c.bezierCurveTo(lg * .22, -ht * .66, -lg * .02, -ht * .38, lg * .12, -ht * .07); c.stroke();
  c.strokeStyle = tt(pal.clair, .35); c.lineWidth = Math.max(.6, lg * .03);
  c.beginPath(); c.moveTo(lg * .02, -ht * .92);
  c.bezierCurveTo(lg * .16, -ht * .65, -lg * .08, -ht * .38, lg * .06, -ht * .08); c.stroke();
  c.restore();
  // Les deux bouts, plus cuits.
  c.fillStyle = tt(pal.grain, .4);
  c.beginPath(); c.ellipse(0, -ht + lg * .16, lg * .3, lg * .12, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0, -lg * .14, lg * .3, lg * .1, 0, 0, TAU); c.fill();
  c.restore();
}

function fricadelleCouchee(c, x, y, L, E, pal, s, ang = 0){
  c.save(); c.translate(x, y); c.rotate(ang + Math.PI / 2);
  fricadelle(c, 0, L / 2, E, L, pal, s);
  c.restore();
}

function socle(c, x, ySol, lg, n, e = .5){
  for (let k = 0; k < n; k++){
    const w = lg + (n - 1 - k) * 22, y = ySol - (k + 1) * 7;
    c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .3 + e * .4 - k * .06);
    c.fillRect(x - w / 2, y, w, 7);
    c.fillStyle = tt(MAT.pierreClaire, .12 + e * .18); c.fillRect(x - w / 2, y, w, 1.6);
    c.fillStyle = tt(MAT.noirChaud, .55); c.fillRect(x - w / 2, y + 5.6, w, 1.4);
  }
}

function garde(c, x, y, h, t, i, dir){
  const souffle = Math.sin(t * 1.3 + i) * h * .008;
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.fillStyle = tt(MAT.noirChaud, .5);
  c.beginPath(); c.ellipse(0, 0, h * .28, h * .06, 0, 0, TAU); c.fill();
  // La hallebarde, derrière lui.
  c.fillStyle = MAT.bois; c.fillRect(h * .22, -h * 1.12, h * .045, h * 1.12);
  c.fillStyle = MAT.ferArete;
  c.beginPath(); c.moveTo(h * .245, -h * 1.26); c.lineTo(h * .29, -h * 1.1); c.lineTo(h * .2, -h * 1.1); c.closePath(); c.fill();
  c.fillStyle = tt('#c8ccd4', .8);
  c.beginPath(); c.moveTo(h * .24, -h * 1.08); c.quadraticCurveTo(h * .44, -h * 1.02, h * .26, -h * .9); c.closePath(); c.fill();
  c.translate(0, souffle);
  // Jambes, bottes.
  c.fillStyle = MAT.combinaison;
  c.fillRect(-h * .13, -h * .36, h * .1, h * .36); c.fillRect(h * .03, -h * .36, h * .1, h * .36);
  c.fillStyle = MAT.blancArmure; c.fillRect(-h * .14, -h * .1, h * .12, h * .1); c.fillRect(h * .02, -h * .1, h * .12, h * .1);
  // Torse, plastron blanc, ceinture dorée.
  c.fillStyle = MAT.combinaison; c.beginPath(); c.roundRect(-h * .17, -h * .68, h * .34, h * .34, h * .04); c.fill();
  c.fillStyle = MAT.blancArmure; c.fillRect(-h * .13, -h * .64, h * .26, h * .19);
  c.fillStyle = tt(MAT.noirChaud, .25); c.fillRect(-h * .13, -h * .5, h * .26, h * .05);
  c.fillStyle = MAT.or; c.fillRect(-h * .17, -h * .38, h * .34, h * .05);
  // Les épaulières : deux fricadelles dorées couchées.
  fricadelleCouchee(c, -h * .19, -h * .66, h * .16, h * .08, palOr(.7), i);
  fricadelleCouchee(c, h * .19, -h * .66, h * .16, h * .08, palOr(.7), i + 3);
  // La main sur la hampe.
  c.fillStyle = MAT.blancArmure; c.fillRect(h * .17, -h * .56, h * .08, h * .07);
  // Le casque blanc, visière noire, les yeux roses du Susanoo.
  c.fillStyle = MAT.blancArmure; c.beginPath(); c.roundRect(-h * .12, -h * .92, h * .24, h * .24, h * .07); c.fill();
  c.fillStyle = MAT.combinaison; c.fillRect(-h * .09, -h * .82, h * .19, h * .06);
  c.fillStyle = tt(MAT.rose, .85); c.fillRect(-h * .05, -h * .81, h * .035, h * .03); c.fillRect(h * .04, -h * .81, h * .035, h * .03);
  c.fillStyle = tt(MAT.noirChaud, .22); c.fillRect(-h * .12, -h * .92, h * .06, h * .24);
  c.restore();
}

function solDamier(c){
  const L = COURT.left, R = COURT.right, T = COURT.top, B = COURT.bottom;
  const nx = 14, ny = 8, dw = (R - L) / nx, dh = (B - T) / ny;
  c.fillStyle = MAT.noirChaud; c.fillRect(L, T, R - L, B - T);
  for (let j = 0; j < ny; j++){
    for (let i = 0; i < nx; i++){
      const x = L + i * dw, y = T + j * dh, s = i * 17 + j * 5, noir = (i + j) % 2;
      // Mesuré au premier réglage : 63 % d'ombre profonde, des cases noires qui
      // trouaient le sol. Les deux valeurs sont rapprochées vers la pierre.
      const base = noir ? mel(MAT.marbreSombre, MAT.pierreOmbre, .4 + graine(s) * .2)
                        : mel(MAT.marbre, MAT.pierreOmbre, .66 + graine(s) * .1);
      c.fillStyle = base; c.fillRect(x + .8, y + .8, dw - 1.6, dh - 1.6);
      // Les veines : deux courbes lâches, qui traversent la case d'un bord à l'autre.
      c.save(); c.beginPath(); c.rect(x + .8, y + .8, dw - 1.6, dh - 1.6); c.clip();
      c.strokeStyle = noir ? tt(MAT.marbre, .07) : tt(MAT.pierreOmbre, .28); c.lineWidth = .9;
      for (let k = 0; k < 2; k++){
        const a = graine(s * 3 + k);
        c.beginPath(); c.moveTo(x, y + a * dh);
        c.bezierCurveTo(x + dw * .3, y + graine(s + k) * dh, x + dw * .6, y + graine(s * 7 + k) * dh, x + dw, y + (1 - a) * dh);
        c.stroke();
      }
      c.restore();
      c.fillStyle = tt(MAT.pierreClaire, noir ? .04 : .1); c.fillRect(x + .8, y + .8, dw - 1.6, 1.2);
      c.fillStyle = tt(MAT.noirChaud, .4); c.fillRect(x + .8, y + dh - 2, dw - 1.6, 1.2);
    }
  }
}

function marquage(c, sansMediane){
  const L = COURT.left, R = COURT.right, T = COURT.top, B = COURT.bottom;
  const filet = (x, y, w, h) => {
    c.fillStyle = tt(MAT.noirChaud, .7); c.fillRect(x - 1, y - 1, w + 2, h + 2);
    c.fillStyle = tt(MAT.or, .36); c.fillRect(x, y, w, h);
  };
  filet(L + 3, T + 3, R - L - 6, 2); filet(L + 3, B - 5, R - L - 6, 2);
  if (!sansMediane) filet(CX - 1.5, T, 3, B - T);
  c.strokeStyle = tt(MAT.noirChaud, .7); c.lineWidth = 5;
  c.beginPath(); c.arc(CX, CY, 62, 0, TAU); c.stroke();
  c.strokeStyle = tt(MAT.or, .34); c.lineWidth = 2.2;
  c.beginPath(); c.arc(CX, CY, 62, 0, TAU); c.stroke();
}

function murBasCotes(c, clair = 0){
  for (const [x0, x1] of [[0, COURT.left], [COURT.right, W]]){
    c.fillStyle = mel(MAT.briqueOmbre, MAT.noirChaud, .18 - clair); c.fillRect(x0, 0, x1 - x0, H);
    appareil(c, x0, 0, x1 - x0, H, { base: MAT.brique, a0: .06 + clair * .2, a1: .15 + clair * .3 });
  }
  for (const x of [COURT.left - 5, COURT.right]){
    c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .45); c.fillRect(x, COURT.top, 5, COURT.bottom - COURT.top);
    c.fillStyle = tt(MAT.pierreClaire, .2); c.fillRect(x + (x < CX ? 4 : 0), COURT.top, 1, COURT.bottom - COURT.top);
  }
}

function chaquePoche(fn){
  let n = 0;
  for (const cote of [0, 1]){
    for (const p of POCHES){
      const dir = cote ? -1 : 1;
      fn(cote ? W : 0, dir, p, n++);
    }
  }
}

const flancsBraseros = {
  fixe(c){
    murBasCotes(c);
    chaquePoche((xb, dir, p) => {
      const x = xb + dir * 24, y = p.y0 + 58;
      // Le trépied de bronze.
      c.strokeStyle = MAT.bronze; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x - 10, y + 30); c.moveTo(x, y); c.lineTo(x + 10, y + 30);
      c.moveTo(x, y); c.lineTo(x, y + 33); c.stroke();
      c.fillStyle = tt(MAT.noirChaud, .45); c.beginPath(); c.ellipse(x, y + 32, 14, 4, 0, 0, TAU); c.fill();
      // La vasque.
      c.fillStyle = MAT.bronze;
      c.beginPath(); c.moveTo(x - 15, y - 6); c.quadraticCurveTo(x, y + 12, x + 15, y - 6); c.closePath(); c.fill();
      c.fillStyle = MAT.bronzeClair; c.fillRect(x - 16, y - 8, 32, 3);
      c.fillStyle = tt(MAT.noirChaud, .4); c.fillRect(x - 16, y - 5, 32, 1);
    });
  },
  anime(c, t){
    chaquePoche((xb, dir, p, n) => {
      // Les braises dans la vasque.
      const x = xb + dir * 24, y = p.y0 + 58;
      for (let k = 0; k < 6; k++){
        c.fillStyle = tt(k % 2 ? MAT.braise : '#7a1e0a', .9);
        c.fillRect(x - 12 + k * 4, y - 9 - graine(n * 7 + k) * 3, 4, 3);
      }
      garde(c, xb + dir * 52, p.y1 - 8, 42, t, n, dir);
    });
  },
  lueurs(c, t){
    chaquePoche((xb, dir, p, n) => {
      const x = xb + dir * 24, y = p.y0 + 48;
      const v = .85 + Math.sin(t * 5 + n) * .08 + Math.sin(t * 11.3 + n * 2) * .07;
      lueur(c, x, y, 86, MAT.feu, .36 * v);
      for (let k = 0; k < 5; k++) flamme(c, x - 10 + k * 5, y + 1 - (k % 2) * 2, t, n * 9 + k, 1.5 + (k === 2) * .7);
      // Les escarbilles qui montent et s'éteignent.
      c.save(); c.globalCompositeOperation = 'screen';
      for (let k = 0; k < 7; k++){
        const q = (t * .5 + graine(n * 13 + k)) % 1;
        c.fillStyle = tt('#ffc070', (1 - q) * .8);
        c.fillRect(x + Math.sin(t * 2 + k * 3) * 6 + alea(n + k, -8, 8), y - 6 - q * 46, 1.4, 1.4);
      }
      c.restore();
    });
  }
};

const NICHE = 196;

function abside(c){
  const g = c.createLinearGradient(0, 0, 0, BANDE);
  g.addColorStop(0, MAT.noirChaud); g.addColorStop(.4, MAT.briqueOmbre);
  g.addColorStop(1, mel(MAT.brique, MAT.briqueOmbre, .5));
  c.fillStyle = g; c.fillRect(0, 0, W, BANDE);
  appareil(c, 0, 22, W, BANDE - 22, { a0: .07, a1: .18 });
  // La frise sculptée sous la voûte : le glyphe de la fricadelle, répété.
  // C'est la signature de la culture inventée — un motif qu'on retrouve
  // gravé, pas une décoration empruntée.
  c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .35); c.fillRect(0, 14, W, 9);
  c.fillStyle = tt(MAT.pierreClaire, .16); c.fillRect(0, 14, W, 1.2);
  for (let x = 10; x < W; x += 20){
    c.fillStyle = tt(MAT.noirChaud, .5);
    c.beginPath(); c.roundRect(x - 1.6, 15.5, 3.2, 6, 1.6); c.fill();
    c.fillRect(x + 5, 17.6, 1.5, 1.5); c.fillRect(x - 6.5, 17.6, 1.5, 1.5);
  }
  const v = c.createLinearGradient(0, 0, 0, 16);
  v.addColorStop(0, MAT.noirChaud); v.addColorStop(1, tt(MAT.ardoise, .5));
  c.fillStyle = v; c.fillRect(0, 0, W, 14);

  // Les deux portes basses du chœur.
  for (const dx of [-306, 306]){
    arche(c, CX + dx, 58, 42, BANDE - 6); c.fillStyle = MAT.noirChaud; c.fill();
    c.strokeStyle = tt(MAT.briqueClaire, .22); c.lineWidth = 4; c.stroke();
  }
  // Les pilastres qui rythment le mur.
  for (const dx of [-168, 168, -440, 440]){
    c.fillStyle = mel(MAT.briqueOmbre, MAT.brique, .35); c.fillRect(CX + dx - 7, 23, 14, BANDE - 29);
    c.fillStyle = tt(MAT.briqueClaire, .14); c.fillRect(CX + dx - 7, 23, 2, BANDE - 29);
    c.fillStyle = tt(MAT.noirChaud, .4); c.fillRect(CX + dx + 5, 23, 2, BANDE - 29);
  }
  // La niche, creusée : noire au pied, un peu plus claire dans le cul-de-four.
  arche(c, CX, NICHE, -64, BANDE - 6);
  c.fillStyle = MAT.noirChaud; c.fill();
  const cf = c.createLinearGradient(0, 0, 0, BANDE);
  cf.addColorStop(0, tt(MAT.brique, .24)); cf.addColorStop(1, tt(MAT.brique, 0));
  c.fillStyle = cf; c.fill();
  // Le double rouleau de brique de l'arc.
  c.save();
  arche(c, CX, NICHE + 10, -69, BANDE - 6); c.strokeStyle = mel(MAT.brique, MAT.briqueClaire, .3); c.lineWidth = 8; c.stroke();
  arche(c, CX, NICHE + 22, -75, BANDE - 6); c.strokeStyle = tt(MAT.noirChaud, .55); c.lineWidth = 2; c.stroke();
  c.restore();
  // Le bandeau de pierre au pied du mur, qui ferme la bande.
  c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .55); c.fillRect(0, BANDE - 7, W, 7);
  c.fillStyle = tt(MAT.pierreClaire, .22); c.fillRect(0, BANDE - 7, W, 1.6);
  c.fillStyle = tt(MAT.noirChaud, .6); c.fillRect(0, BANDE - 1.4, W, 1.4);
}


const idoleDressee = {
  peindre(c, t, e){
    socle(c, CX, SOL_IDOLE, 46, 3, e);
    fricadelle(c, CX, SOL_IDOLE - 21, 30, 56, palOr(e), 11);
    // Le ruban sacré qui la ceint, noué d'or.
    c.fillStyle = mel(MAT.roseSombre, MAT.rose, e * .4);
    c.fillRect(CX - 15, SOL_IDOLE - 50, 30, 5);
    c.fillStyle = tt(MAT.noirChaud, .3); c.fillRect(CX - 15, SOL_IDOLE - 46, 30, 1);
    c.fillStyle = mel(MAT.orOmbre, MAT.orVif, e);
    c.beginPath(); c.arc(CX + 7, SOL_IDOLE - 47.5, 3, 0, TAU); c.fill();
    c.fillRect(CX + 6, SOL_IDOLE - 46, 2, 8); c.fillRect(CX + 9, SOL_IDOLE - 46, 2, 6);
    // Deux torchères de pierre.
    for (const dx of [-66, 66]){
      c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .45); c.fillRect(CX + dx - 5, SOL_IDOLE - 28, 10, 28);
      c.fillStyle = tt(MAT.pierreClaire, .18); c.fillRect(CX + dx - 5, SOL_IDOLE - 28, 2, 28);
      c.fillStyle = MAT.bronze; c.fillRect(CX + dx - 8, SOL_IDOLE - 32, 16, 5);
    }
  },
  lueurs(c, t){
    for (const dx of [-66, 66]){
      lueur(c, CX + dx, SOL_IDOLE - 36, 36, MAT.feu, .34);
      flamme(c, CX + dx - 3, SOL_IDOLE - 33, t, dx, 1.3); flamme(c, CX + dx + 3, SOL_IDOLE - 33, t, dx + 5, 1.1);
    }
  }
};

const lumGloire = {
  eclat: () => 1,
  avant(c, t){
    const bat = .85 + Math.sin(t * .9) * .15;
    c.save(); c.globalCompositeOperation = 'screen';
    // La gloire : des rayons pointus plantés derrière la statue.
    for (let k = 0; k < 22; k++){
      const a = Math.PI + k / 21 * Math.PI, L = (k % 2 ? 46 : 72) * bat;
      c.fillStyle = tt(MAT.orVif, k % 2 ? .22 : .34);
      c.beginPath(); c.moveTo(CX + Math.cos(a - .05) * 12, SOL_IDOLE - 30 + Math.sin(a - .05) * 12);
      c.lineTo(CX + Math.cos(a) * L, SOL_IDOLE - 30 + Math.sin(a) * L);
      c.lineTo(CX + Math.cos(a + .05) * 12, SOL_IDOLE - 30 + Math.sin(a + .05) * 12); c.closePath(); c.fill();
    }
    c.restore();
    lueur(c, CX, SOL_IDOLE - 30, 70, MAT.or, .4 * bat);
  },
  peindre(c, t){
    const bat = .85 + Math.sin(t * .9) * .15;
    c.save(); c.globalCompositeOperation = 'screen';
    // La nappe dorée, radiale et écrasée : elle s'éteint aussi sur les côtés.
    // En rectangle, ses deux bords droits se voyaient le long des touches.
    c.save(); c.translate(CX, BANDE - 10); c.scale(2.2, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 250);
    g.addColorStop(0, tt(MAT.or, .22 * bat)); g.addColorStop(.4, tt(MAT.or, .08 * bat)); g.addColorStop(1, tt(MAT.or, 0));
    c.fillStyle = g; c.fillRect(-250, 0, 500, 250);
    c.restore();
    for (let k = -3; k <= 3; k++){
      if (!k) continue;
      c.save(); c.translate(CX, SOL_IDOLE - 30); c.rotate(k * .28 + Math.sin(t * .3) * .02);
      const r = c.createLinearGradient(0, 0, 0, 280);
      r.addColorStop(0, tt(MAT.orVif, .15 * bat)); r.addColorStop(1, tt(MAT.orVif, 0));
      c.fillStyle = r; c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.lineTo(30, 280); c.lineTo(-30, 280); c.closePath(); c.fill();
      c.restore();
    }
    c.restore();
  }
};

function pourChaqueCage(c, fn){
  for (const side of [1, 2]){
    c.save();
    c.translate(side === 1 ? COURT.left : COURT.right, CY);
    c.scale(side === 1 ? 1 : -1, 1);
    fn(c, side);
    c.restore();
  }
}

const cageFour = {
  fixe(c){
    c.fillStyle = MAT.briqueOmbre; c.fillRect(-GOAL_D - 14, -GH - 12, GOAL_D + 16, GH * 2 + 24);
    appareil(c, -GOAL_D - 14, -GH - 12, GOAL_D + 16, GH * 2 + 24, { base: MAT.brique, a0: .25, a1: .5, hb: 5, lb: 12 });
    // La sole du four, en briques posées de chant, noircies.
    c.fillStyle = '#1a0f0c'; c.fillRect(-GOAL_D, -GH, GOAL_D, GH * 2);
    appareil(c, -GOAL_D, -GH, GOAL_D, GH * 2, { base: MAT.briqueOmbre, a0: .3, a1: .55, hb: 12, lb: 8 });
    // La suie qui lèche l'ouverture, plus épaisse vers le haut du foyer.
    const s = c.createLinearGradient(0, 0, -GOAL_D, 0);
    s.addColorStop(0, tt(MAT.noirChaud, .75)); s.addColorStop(.5, tt(MAT.noirChaud, .3)); s.addColorStop(1, tt(MAT.noirChaud, 0));
    c.fillStyle = s; c.fillRect(-GOAL_D, -GH, GOAL_D, GH * 2);
    // Les deux jambages de pierre du four.
    for (const y of [-GH - 12, GH + 2]){
      c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .4); c.fillRect(-GOAL_D - 14, y, GOAL_D + 16, 10);
      c.fillStyle = tt(MAT.pierreClaire, .18); c.fillRect(-GOAL_D - 14, y, GOAL_D + 16, 1.5);
    }
  },
  anime(c, t){
    // Le lit de braises, au fond, qui respire.
    for (let i = 0; i < 56; i++){
      const v = .55 + Math.sin(t * 2.2 + i * 1.7) * .25 + Math.sin(t * 5.1 + i) * .2;
      c.fillStyle = mel('#3a0c06', i % 4 ? MAT.braise : MAT.feu, v);
      c.fillRect(-GOAL_D + 1 + graine(i) * graine(i * 9) * 20, -GH + 4 + graine(i * 3) * (GH * 2 - 8), 2.5 + graine(i * 5) * 3.5, 2 + graine(i * 7) * 2);
    }
  },
  lueurs(c, t){
    const v = .85 + Math.sin(t * 2.2) * .1 + Math.sin(t * 5.7) * .05;
    c.save(); c.globalCompositeOperation = 'screen';
    const g = c.createLinearGradient(-GOAL_D, 0, 40, 0);
    g.addColorStop(0, tt(MAT.feu, .42 * v)); g.addColorStop(.45, tt(MAT.braise, .2 * v)); g.addColorStop(1, tt(MAT.braise, 0));
    c.fillStyle = g; c.fillRect(-GOAL_D, -GH, GOAL_D + 40, GH * 2);
    // Les escarbilles poussées vers le terrain par le tirage.
    for (let k = 0; k < 12; k++){
      const q = (t * .45 + graine(k * 7)) % 1;
      c.fillStyle = tt('#ffc070', (1 - q) * .85);
      c.fillRect(-GOAL_D + 8 + q * 70, alea(k, -GH + 10, GH - 10) + Math.sin(t * 3 + k) * 6, 1.5, 1.5);
    }
    c.restore();
  }
};

function volets(c){
  c.save();
  for (const side of [1, 2]){
    const gx = side === 1 ? COURT.left - GOAL_D : COURT.right;
    const lx = side === 1 ? COURT.left - 4 : COURT.right;
    for (const z of getMap().zones){
      const y0 = CY + z.from, h = z.to - z.from;
      c.globalAlpha = .07; c.fillStyle = z.color; c.fillRect(gx, y0, GOAL_D, h);
      c.globalAlpha = .9; c.fillRect(lx, y0 + 2, 4, h - 4);
      c.globalAlpha = 1;
      c.fillStyle = tt(MAT.noirChaud, .75); c.fillRect(gx, y0 - 1, GOAL_D, 2);
      c.font = '700 16px "Archivo Black", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillStyle = tt(MAT.noirChaud, .8); texte(c, z.points, gx + GOAL_D / 2 + 1, y0 + h / 2 + 1.5);
      c.fillStyle = z.points === 5 ? MAT.orVif : '#ffe4f4';
      texte(c, z.points, gx + GOAL_D / 2, y0 + h / 2);
    }
    c.fillStyle = tt(MAT.noirChaud, .75); c.fillRect(gx, CY + GH - 1, GOAL_D, 2);
  }
  c.restore();
}

const BAIE = 240;

function murEntree(c){
  c.fillStyle = mel(MAT.briqueOmbre, MAT.noirChaud, .3); c.fillRect(0, SEUIL, W, H - SEUIL);
  appareil(c, 0, SEUIL, W, H - SEUIL, { a0: .08, a1: .2 });
  c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .5); c.fillRect(0, SEUIL, W, 4);
  c.fillStyle = tt(MAT.pierreClaire, .18); c.fillRect(0, SEUIL, W, 1.2);
  // Les deux piédroits de la baie.
  for (const s of [-1, 1]){
    const x = CX + s * (BAIE / 2 + 7);
    c.fillStyle = mel(MAT.pierreOmbre, MAT.pierre, .55); c.fillRect(x - 7, SEUIL, 14, H - SEUIL);
    c.fillStyle = tt(MAT.pierreClaire, .2); c.fillRect(x - 7, SEUIL, 14, 1.4);
  }
}

const entreeCrypte = {
  fixe(c){
    murEntree(c);
    const x0 = CX - BAIE / 2;
    for (let k = 0; k < 6; k++){
      const y = SEUIL + 4 + k * 6;
      c.fillStyle = mel(MAT.pierre, MAT.noirChaud, .2 + k * .14); c.fillRect(x0, y, BAIE, 6);
      c.fillStyle = tt(MAT.pierreClaire, .16 - k * .02); c.fillRect(x0, y, BAIE, 1.2);
      c.fillStyle = tt(MAT.noirChaud, .5); c.fillRect(x0, y + 5, BAIE, 1);
    }
    // La balustrade dorée, de part et d'autre.
    for (const s of [-1, 1]){
      const x = CX + s * (BAIE / 2 - 5);
      c.fillStyle = mel(MAT.orOmbre, MAT.or, .45); c.fillRect(x - 1.5, SEUIL + 2, 3, H - SEUIL);
      for (let y = SEUIL + 6; y < H; y += 8){
        c.fillStyle = mel(MAT.orOmbre, MAT.orVif, .5); c.fillRect(x - 3, y, 6, 3);
      }
    }
  },
  anime(){},
  jour(c, t){
    c.save(); c.globalCompositeOperation = 'screen';
    // Radiale et écrasée, comme la nappe de jour : découpée en ellipse, son
    // bord se voyait en arc de cercle sur le dallage.
    c.translate(CX, H); c.scale(1.7, 1);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, 150);
    g.addColorStop(0, tt(MAT.or, .3)); g.addColorStop(.4, tt(MAT.or, .1)); g.addColorStop(1, tt(MAT.or, 0));
    c.fillStyle = g; c.fillRect(-150, -150, 300, 150);
    c.restore();
    // L'encens qui monte de la crypte, en fibres lentes.
    c.save(); c.globalCompositeOperation = 'screen';
    for (let k = 0; k < 9; k++){
      const q = (t * .06 + graine(k * 5)) % 1;
      const y = H - q * 200, x = CX + alea(k, -90, 90) + Math.sin(t * .4 + k * 2) * 20 * q;
      c.fillStyle = tt('#d8ccc0', Math.sin(q * Math.PI) * .07);
      c.fillRect(x - 20, y, 40 + graine(k) * 20, 2.2);
      c.fillRect(x - 10, y + 4, 24, 1.6);
    }
    c.restore();
  }
};

function tenebres(c){
  c.save();
  const g = c.createRadialGradient(CX, CY, 100, CX, CY, 560);
  g.addColorStop(0, tt(MAT.noirChaud, .06));
  g.addColorStop(.5, tt(MAT.noirChaud, .3));
  g.addColorStop(1, tt(MAT.noirChaud, .8));
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.restore();
}


/* ===========================================================================
   L'ASSEMBLAGE.

   Tout ce qui ne bouge jamais — le damier et son marquage, les murs et les
   trépieds des bas-côtés, l'abside, les bouches de four, l'escalier — est
   peint une fois dans un calque et recopié ensuite (voir render/calques.js).
   Sous le zoom du replay ou une secousse, la recopie ne serait pas exacte au
   pixel : on repeint alors en direct.

   L'ordre ne se négocie pas : le décor, les corps, la pénombre, puis l'idole
   — dont l'éclat ne dépend que de la lumière —, puis tous les feux et la
   gloire par-dessus. Tout reste SOUS les joueurs : c'est un décor, pas une
   règle, il ne doit rien leur cacher.
   ======================================================================== */
function peindreFond(c){
  c.fillStyle = MAT.noirChaud; c.fillRect(0, 0, W, H);
  solDamier(c);
  marquage(c, false);
  flancsBraseros.fixe(c);
  abside(c);
  pourChaqueCage(c, cc => cageFour.fixe(cc));
  entreeCrypte.fixe(c);
}
const calque = { cle: '', cv: null };
function fondTemple(){
  const cle = getMapId() + '|' + COURT.left + ',' + COURT.top + ',' + COURT.right + ',' + COURT.bottom + '|' + GH + ',' + GOAL_D;
  if (calque.cle !== cle){ calque.cle = cle; calque.cv = peindreHorsEcran(g => peindreFond(g)); }
  return calque.cv;
}

// L'idole ne bouge pas : sous la gloire, son éclat est toujours plein. Elle
// est peinte une fois, puis recopiée à sa place dans l'ordre des couches.
const idoleFigee = memoiserSprite('temple-idole', c => idoleDressee.peindre(c, 0, lumGloire.eclat()));

export function drawCourtTemple(){
  const c = ctx, t = G.now;
  accorder();
  if (copieExacte(c)) c.drawImage(fondTemple(), 0, 0);
  else peindreFond(c);
  flancsBraseros.anime(c, t);
  pourChaqueCage(c, cc => cageFour.anime(cc, t));
  tenebres(c);
  lumGloire.avant(c, t);
  idoleFigee(c);
  entreeCrypte.jour(c, t);
  flancsBraseros.lueurs(c, t);
  pourChaqueCage(c, cc => cageFour.lueurs(cc, t));
  idoleDressee.lueurs(c, t);
  lumGloire.peindre(c, t);
  volets(c);
}
