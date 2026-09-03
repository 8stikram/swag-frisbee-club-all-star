// ---------------------------------------------------------------------------
// RACCOON CITY — la rue devant le R.P.D., la nuit de l'épidémie, septembre 1998.
// Le terrain de Leon S. Kennedy, dont data/characters.js dit déjà l'univers.
//
// Dessiné d'après de vraies captures de Resident Evil 2 remake, élément par
// élément, et non de mémoire : c'est ce qui séparait jusqu'ici « une ville la
// nuit » de « Raccoon City ». Chaque pièce a été mise au banc dans
// mockups/rpd-station.html, où l'on peut encore comparer les variantes
// écartées et relire les mesures qui ont tranché.
//
// Il vit dans son propre fichier et non dans render.js : celui-ci fait déjà
// 2751 lignes, et y verser sept cents lignes de plus avec une trentaine de
// noms génériques — mur, tour, station, barrière — était un risque de
// collision pour rien.
//
// LE MODÈLE DE LUMIÈRE, dont tout le reste découle. Trois sources, toutes
// basses et toutes latérales : les gyrophares au sol, les fenêtres du poste en
// contre-jour, et l'incendie hors champ. Conséquences appliquées partout : le
// macadam est mouillé, c'est la seule surface qui réfléchit ; tout ce qui est
// vertical est une silhouette éclairée sur un seul flanc ; rien n'est éclairé
// par le dessus. Et surtout — mesuré — dans cette série c'est la LUMIÈRE qui
// détache l'aire de jeu, jamais la clarté de la matière : en éclaircissant le
// sol pour gagner du contraste on obtenait un plateau de gymnase sous une
// façade de nuit.
// ---------------------------------------------------------------------------
import { ctx, W, H } from '../../core/dom.js';
import { COURT, CX, CY, GOAL_TOP, GOAL_BOTTOM, GOAL_DEPTH } from '../../core/constants.js';
import { TAU } from '../../core/utils.js';
import { G } from '../../game/state.js';
import { getMap } from '../../data/maps.js';
import { densiteBrume } from '../../game/brume.js';

// Le dosage du sol retenu au banc : macadam, humide sans les grandes traînées
// verticales — elles étaient superbes en image fixe et bougeaient en
// permanence sous le disque.
const SOL = { matiere: 'macadam', mouille: .4, eclaire: 1, papiers: 1, sang: 1 };

// La hauteur de bande disponible au-dessus du terrain. Tout le dessin de la
// station en dépend : à 82 px, « R.P.D. » tient en 15 px de haut sur le
// pavillon d'entrée — contre 7 sur le linteau d'un portail, ce qui a fait
// abandonner la première piste.
const BANDE = COURT.top - 2;
const M = {
  nuit:'#080e10',        nuitTeal:'#0e1c1f',     teal:'#14282b',
  brume:'#2d5a5e',
  pierre:'#494540',      pierreClair:'#6e6a60',  pierreOmbre:'#23211d',
  pierreFroide:'#3a4244',
  fer:'#171f21',         ferArete:'#65787a',     ferOmbre:'#0c1113',
  vitre:'#101a1c',       vitreFroide:'#22383a',
  ambre:'#ff9a3c',       ambreClair:'#ffc478',   ambrePale:'#ffe0b0',
  lettre:'#e8eef0',      lettreAllumee:'#ffffff',
  drapRouge:'#c8202e',   drapBlanc:'#eef0f2',    drapBleu:'#1e2f6b',
  gyroBleu:'#2f8cff',
  sang:'#7a1520',        sangSec:'#3d0d14',      papier:'#c6c2b6',
  bitume:'#10181a',      bitumeReflet:'#2a4a4e', bitumeOmbre:'#070c0d'
};

function graine(i){ const x = Math.sin(i*127.1)*43758.5453; return x - Math.floor(x); }
function alea(i,a,b){ return a + graine(i)*(b-a); }
function mel(a,b,k){
  const lire = h => [1,3,5].map(i => parseInt(h.slice(i,i+2),16));
  const A = lire(a), B = lire(b);
  return '#' + A.map((v,i) => Math.max(0,Math.min(255,Math.round(v+(B[i]-v)*k)))
    .toString(16).padStart(2,'0')).join('');
}
function tt(col,a){
  const [r,g,b] = [1,3,5].map(i => parseInt(col.slice(i,i+2),16));
  return 'rgba('+r+','+g+','+b+','+Math.max(0,Math.min(1,a))+')';
}

/* Un pan de mur appareillé : assises décalées, joints visibles, et un grain
   qui change d'un bloc à l'autre. Sans ça, la pierre est un aplat. */
function mur(c, x, y, l, h, ht, i0){
  c.fillStyle = mel(M.pierre, M.pierreOmbre, .2);
  c.fillRect(x, y, l, h);
  const hb = Math.max(2, ht*.055);
  for (let k = 0, yy = y; yy < y + h; k++, yy += hb){
    const hr = Math.min(hb, y + h - yy);
    for (let xx = x - (k % 2 ? hb : 0); xx < x + l; xx += hb*2.2){
      const g = graine(i0 + k*37 + xx);
      const bl = Math.min(hb*2.2 - 1, x + l - xx);
      if (bl <= 0) continue;
      c.fillStyle = mel(M.pierre, g > .5 ? M.pierreClair : M.pierreOmbre, .1 + g*.28);
      c.fillRect(Math.max(x, xx), yy, Math.min(bl, xx + bl - Math.max(x, xx)), hr - 1);
    }
    c.fillStyle = tt(M.pierreOmbre, .5);
    c.fillRect(x, yy + hr - 1, l, 1);
  }
}

/* Une fenêtre. `cintree` pour le rez-de-chaussée, rectangulaire à l'étage.
   Le verre n'est jamais noir : il renvoie le teal du ciel, et parfois une
   lueur chaude quand la pièce derrière est encore éclairée. */
function fenetre(c, x, y, l, h, cintree, ht, i, allumee){
  c.save();
  c.beginPath();
  if (cintree){
    c.moveTo(x, y + h);
    c.lineTo(x, y + h*.42);
    c.quadraticCurveTo(x + l/2, y - h*.12, x + l, y + h*.42);
    c.lineTo(x + l, y + h);
  } else {
    c.rect(x, y, l, h);
  }
  c.closePath();
  c.fillStyle = allumee ? tt(M.ambre, .34 + graine(i)*.3) : mel(M.vitre, M.vitreFroide, .2 + graine(i)*.5);
  c.fill();
  // Le reflet oblique du ciel sur la vitre : deux bandes, pas un dégradé.
  c.clip();
  c.fillStyle = tt(M.vitreFroide, .5);
  c.save(); c.translate(x, y); c.rotate(-.5);
  c.fillRect(-l, h*.1, l*2.4, h*.13);
  c.fillRect(-l, h*.4, l*2.4, h*.07);
  c.restore();
  c.restore();
  // L'encadrement et le meneau.
  c.strokeStyle = mel(M.pierre, M.pierreClair, .45); c.lineWidth = Math.max(1, ht*.014);
  c.beginPath();
  if (cintree){
    c.moveTo(x, y + h);
    c.lineTo(x, y + h*.42);
    c.quadraticCurveTo(x + l/2, y - h*.12, x + l, y + h*.42);
    c.lineTo(x + l, y + h);
  } else c.rect(x, y, l, h);
  c.stroke();
  c.strokeStyle = tt(M.fer, .8); c.lineWidth = Math.max(.8, ht*.009);
  c.beginPath(); c.moveTo(x + l/2, y + h*.05); c.lineTo(x + l/2, y + h); c.stroke();
  c.beginPath(); c.moveTo(x, y + h*.55); c.lineTo(x + l, y + h*.55); c.stroke();
}

/* Des planches clouées en travers d'une fenêtre. Jamais parallèles : c'est
   fait à la hâte, avec ce qui traînait. Le poste tient encore, mais de peu. */
function planches(c, x, y, l, h, ht, i){
  for (let k = 0; k < 3; k++){
    const g = graine(i*7 + k);
    c.save();
    c.translate(x + l/2, y + h*(.18 + k*.3));
    c.rotate((g - .5) * .3);
    const ep = Math.max(2, h*.13);
    c.fillStyle = mel('#6b5236', '#3a2c1e', .2 + g*.4);
    c.fillRect(-l*.62, -ep/2, l*1.24, ep);
    c.fillStyle = tt('#3a2c1e', .6);
    c.fillRect(-l*.62, ep*.22, l*1.24, ep*.28);
    c.fillStyle = tt(M.ferArete, .5);
    c.fillRect(-l*.5, -ep*.1, Math.max(1, ht*.012), Math.max(1, ht*.012));
    c.fillRect(l*.44, -ep*.1, Math.max(1, ht*.012), Math.max(1, ht*.012));
    c.restore();
  }
}

/* Une vitre explosée : le trou noir, et les éclats restés dans le châssis. */
function vitreBrisee(c, x, y, l, h, ht, i){
  c.fillStyle = tt('#050a0b', .92);
  c.fillRect(x + l*.08, y + h*.18, l*.84, h*.7);
  c.fillStyle = tt(M.vitreFroide, .75);
  for (let k = 0; k < 6; k++){
    const g = graine(i*13 + k);
    c.beginPath();
    const px = x + l*(.1 + g*.8), py = y + h*(.2 + graine(i*13+k+3)*.6);
    c.moveTo(px, py);
    c.lineTo(px + l*.16*(g > .5 ? 1 : -1), py + h*.1);
    c.lineTo(px + l*.05, py + h*.22);
    c.closePath(); c.fill();
  }
}

/* La balustrade du toit : une main courante, une plinthe, et des balustres.
   C'est elle qui donne au bâtiment sa ligne de toit civique. */
function balustrade(c, x, y, l, ht){
  const h = ht*.09;
  c.fillStyle = mel(M.pierre, M.pierreOmbre, .3);
  c.fillRect(x, y + h - Math.max(1.5, ht*.018), l, Math.max(1.5, ht*.018));
  const pas = Math.max(3, ht*.048);
  for (let bx = x + pas*.3; bx < x + l; bx += pas){
    c.fillStyle = mel(M.pierre, M.pierreClair, .2 + graine(bx)*.2);
    c.fillRect(bx, y + h*.2, Math.max(1.2, pas*.36), h*.62);
  }
  c.fillStyle = mel(M.pierre, M.pierreClair, .5);
  c.fillRect(x, y, l, Math.max(1.6, ht*.022));
}

/* Une barrière de police : la lisse jaune et noire, ses deux pieds, et son
   ombre au sol. Jamais parfaitement alignée avec la suivante. */
function barriere(c, x, y, ht, i){
  const l = ht*.55, h = ht*.1, g = graine(i);
  c.save(); c.translate(x, y); c.rotate((g - .5)*.14);
  c.fillStyle = tt(M.bitumeOmbre, .55);
  c.fillRect(0, h*1.5, l, h*.28);
  c.fillStyle = mel('#c8a832', M.teal, .25);
  c.fillRect(0, 0, l, h);
  c.fillStyle = tt(M.ferOmbre, .85);
  for (let k = 0; k < 4; k++) c.fillRect(k*(l/4), 0, l/8, h);
  c.fillStyle = tt(M.pierreClair, .3);
  c.fillRect(0, 0, l, Math.max(1, h*.16));
  c.fillStyle = mel(M.fer, M.ferArete, .2);
  c.fillRect(l*.06, h, Math.max(1.4, ht*.02), h*.6);
  c.fillRect(l*.86, h, Math.max(1.4, ht*.02), h*.6);
  c.restore();
}

/* Le fourgon du R.P.D., en biais devant le perron. Sa barre lumineuse est le
   seul bleu saturé de la scène — un point, jamais la lumière principale. */
function fourgon(c, x, y, ht, ang, t){
  c.save(); c.translate(x, y); c.rotate(ang);
  const l = ht*2.1, h = ht*.86;
  c.fillStyle = tt(M.bitumeOmbre, .6);
  c.beginPath(); c.ellipse(0, h*.45, l*.56, h*.34, 0, 0, TAU); c.fill();
  // Caisse : blanc sale, bande sombre, et le flanc qui capte la lumière chaude.
  c.fillStyle = mel('#c9ccc8', M.teal, .38);
  c.fillRect(-l/2, -h/2, l, h);
  c.fillStyle = mel('#1a2a3a', M.teal, .3);
  c.fillRect(-l/2, -h*.06, l, h*.3);
  c.fillStyle = tt(M.ambre, .18);
  c.fillRect(-l/2, -h/2, l, h*.14);
  // Vitres.
  c.fillStyle = mel(M.vitre, M.vitreFroide, .35);
  c.fillRect(-l*.44, -h*.4, l*.3, h*.3);
  c.fillRect(l*.16, -h*.4, l*.28, h*.3);
  // Roues.
  c.fillStyle = '#0e1214';
  c.fillRect(-l*.4, h*.42, l*.16, h*.16);
  c.fillRect(l*.24, h*.42, l*.16, h*.16);
  // La barre lumineuse, qui tourne encore.
  const vB = Math.max(0, Math.cos(t*2.6)), vR = Math.max(0, -Math.cos(t*2.6));
  c.save(); c.globalCompositeOperation = 'screen';
  for (const [col, v, dx] of [[M.gyroBleu, vB, -l*.12], ['#ff3a4e', vR, l*.12]]){
    if (v < .05) continue;
    c.globalAlpha = .55*v;
    const g = c.createRadialGradient(dx, -h*.6, 1, dx, -h*.6, ht*1.1);
    g.addColorStop(0, tt(col, .95)); g.addColorStop(1, tt(col, 0));
    c.fillStyle = g; c.beginPath(); c.arc(dx, -h*.6, ht*1.1, 0, TAU); c.fill();
  }
  c.restore();
  c.fillStyle = '#141a1c';
  c.fillRect(-l*.26, -h*.66, l*.52, h*.14);
  c.fillStyle = vB > .1 ? M.gyroBleu : mel(M.gyroBleu, '#000', .78);
  c.fillRect(-l*.24, -h*.64, l*.22, h*.1);
  c.fillStyle = vR > .1 ? '#ff3a4e' : mel('#ff3a4e', '#000', .78);
  c.fillRect(l*.02, -h*.64, l*.22, h*.1);
  c.restore();
}

/* La tour d'horloge, à gauche. Elle dépasse volontairement par le haut du
   cadre : c'est ce qui donne l'échelle au reste du bâtiment. Son cadran, lui,
   est calé sur la bande visible et non sur la hauteur de la tour — sans quoi
   il tombait hors champ à la taille réelle, et n'existait que dans l'aperçu
   agrandi du banc. */
function tour(c, x, sol, ht, t, opt){
  const l = ht*.72, h = ht*1.55, y = sol - h;
  // Appareillage plus gros que celui des ailes : une tour ne se maçonne pas
  // comme un mur de bureau, et ça la détache du reste à petite taille.
  c.fillStyle = mel(M.pierre, M.pierreOmbre, .12);
  c.fillRect(x, y, l, h);
  for (let k = 0, yy = y; yy < sol; k++, yy += ht*.09){
    for (let xx = x - (k % 2 ? ht*.09 : 0); xx < x + l; xx += ht*.2){
      const g = graine(401 + k*29 + xx);
      c.fillStyle = mel(M.pierre, g > .5 ? M.pierreClair : M.pierreOmbre, .12 + g*.3);
      const bx = Math.max(x, xx), bl = Math.min(xx + ht*.2 - 1, x + l) - bx;
      if (bl > 0) c.fillRect(bx, yy, bl, ht*.09 - 1.5);
    }
  }
  // Les chaînes d'angle, qui font la tour massive.
  for (const cxx of [x, x + l - ht*.07]){
    c.fillStyle = mel(M.pierre, M.pierreClair, .3);
    c.fillRect(cxx, y, ht*.07, h);
    c.fillStyle = tt(M.pierreOmbre, .45);
    c.fillRect(cxx + ht*.05, y, ht*.02, h);
  }
  // Bandeaux horizontaux : sans eux la tour est un simple pilier.
  for (const k of [.34, .62]){
    c.fillStyle = mel(M.pierre, M.pierreClair, .35);
    c.fillRect(x - ht*.02, y + h*k, l + ht*.04, Math.max(1.4, ht*.022));
    c.fillStyle = tt(M.pierreOmbre, .5);
    c.fillRect(x - ht*.02, y + h*k + Math.max(1.4, ht*.022), l + ht*.04, Math.max(1, ht*.012));
  }
  // Les fenêtres de la cage d'escalier.
  fenetre(c, x + l*.28, sol - ht*.62, l*.44, ht*.22, true, ht, 7, true);
  fenetre(c, x + l*.28, sol - ht*.32, l*.44, ht*.22, true, ht, 9, false);

  // LE CADRAN. Il était calé sur la hauteur de la tour — donc hors cadre dès
  // qu'on dessinait à la taille réelle, et visible seulement dans l'aperçu
  // agrandi. Il est maintenant calé sur la BANDE : quelle que soit la hauteur
  // de la tour, il tombe toujours dans les 82 px visibles.
  const ccx = x + l/2, ccy = sol - ht*.9, r = l*.36;
  c.fillStyle = mel(M.pierre, M.pierreOmbre, .55);
  c.beginPath(); c.arc(ccx, ccy, r*1.26, 0, TAU); c.fill();
  c.fillStyle = mel(M.pierre, M.pierreClair, .4);
  c.beginPath(); c.arc(ccx, ccy, r*1.26, 0, TAU);
  c.lineWidth = Math.max(1.2, ht*.018); c.strokeStyle = mel(M.pierre, M.pierreClair, .45); c.stroke();
  // Le cadran est éclairé de l'intérieur : de nuit, c'est un disque lumineux.
  // C'est ce qui le rend lisible à 17 px de diamètre, pas son détail.
  if (!opt.horlogeEteinte){
    c.save(); c.globalCompositeOperation = 'screen';
    const gh = c.createRadialGradient(ccx, ccy, r*.2, ccx, ccy, r*2.6);
    gh.addColorStop(0, tt(M.ambrePale, .5)); gh.addColorStop(1, tt(M.ambre, 0));
    c.fillStyle = gh; c.beginPath(); c.arc(ccx, ccy, r*2.6, 0, TAU); c.fill();
    c.restore();
  }
  c.fillStyle = opt.horlogeEteinte ? mel('#c9c2ae', M.teal, .6) : '#fff2d4';
  c.beginPath(); c.arc(ccx, ccy, r, 0, TAU); c.fill();
  c.strokeStyle = mel(M.pierre, M.pierreClair, .5); c.lineWidth = Math.max(1, ht*.016);
  c.beginPath(); c.arc(ccx, ccy, r, 0, TAU); c.stroke();
  c.fillStyle = '#2a2620';
  for (let i = 0; i < 12; i++){
    const a = i/12*TAU;
    c.fillRect(ccx + Math.cos(a)*r*.76 - r*.05, ccy + Math.sin(a)*r*.76 - r*.05, r*.1, r*.1);
  }
  // Les aiguilles arrêtées : la ville s'est arrêtée, l'horloge aussi.
  c.strokeStyle = '#2a2620'; c.lineWidth = Math.max(1.2, r*.13); c.lineCap = 'round';
  c.beginPath(); c.moveTo(ccx, ccy); c.lineTo(ccx + Math.cos(-.7)*r*.62, ccy + Math.sin(-.7)*r*.62);
  c.moveTo(ccx, ccy); c.lineTo(ccx + Math.cos(2.5)*r*.42, ccy + Math.sin(2.5)*r*.42);
  c.stroke();
  c.fillStyle = mel(M.pierre, M.pierreOmbre, .3);
  for (let i = 0; i < 12; i++){
    const a = i/12*TAU;
    c.fillRect(ccx + Math.cos(a)*r*.78 - r*.06, ccy + Math.sin(a)*r*.78 - r*.06, r*.12, r*.12);
  }
  // Les aiguilles arrêtées : la ville s'est arrêtée, l'horloge aussi.
  c.strokeStyle = '#2a2620'; c.lineWidth = Math.max(1.2, r*.15); c.lineCap = 'round';
  c.beginPath();
  c.moveTo(ccx, ccy); c.lineTo(ccx + Math.cos(-.7)*r*.6, ccy + Math.sin(-.7)*r*.6);
  c.moveTo(ccx, ccy); c.lineTo(ccx + Math.cos(2.5)*r*.4, ccy + Math.sin(2.5)*r*.4);
  c.stroke();

  // La corniche et le toit. Au-dessus de la bande, ils sont rognés — c'est
  // voulu : une tour qui sort du cadre donne l'échelle de tout le reste.
  const yCorn = sol - ht*1.18;
  c.fillStyle = mel(M.pierre, M.pierreClair, .35);
  c.fillRect(x - ht*.07, yCorn, l + ht*.14, ht*.05);
  c.fillStyle = tt(M.pierreOmbre, .5);
  c.fillRect(x - ht*.07, yCorn + ht*.05, l + ht*.14, ht*.02);
  c.fillStyle = mel(M.pierreFroide, M.pierreOmbre, .35);
  c.beginPath();
  c.moveTo(x - ht*.07, yCorn); c.lineTo(x + l/2, yCorn - ht*.44); c.lineTo(x + l + ht*.07, yCorn);
  c.closePath(); c.fill();
  c.fillStyle = tt(M.pierreClair, .16);
  c.beginPath();
  c.moveTo(x - ht*.07, yCorn); c.lineTo(x + l/2, yCorn - ht*.44); c.lineTo(x + l/2, yCorn);
  c.closePath(); c.fill();
}

/* ===========================================================================
   LA STATION. `ht` est la hauteur des ailes ; tout en découle, donc on peut
   la dessiner à n'importe quelle taille et vérifier à 1:1 ce qu'on a jugé
   à 3:1. `larg` est la largeur à remplir : les ailes filent hors champ des
   deux côtés, comme quand on est planté devant le bâtiment.
   ======================================================================== */
function station(c, cx, sol, ht, larg, t, opt){
  opt = opt || {};
  const v = (opt.lueur === 0) ? 0 : (.74 + Math.sin(t*1.6)*.09) * (opt.lueur || 1);
  const hAile = ht*.82, yAile = sol - hAile;
  const lPav = ht*2.65, hPav = ht;
  const xPav = cx - lPav/2, yPav = sol - hPav;

  // 1. Les ailes, d'un bord à l'autre.
  mur(c, 0, yAile, larg, hAile, ht, 101);
  // Le bandeau qui sépare les deux niveaux.
  c.fillStyle = mel(M.pierre, M.pierreClair, .3);
  c.fillRect(0, yAile + hAile*.46, larg, Math.max(1.4, ht*.02));
  c.fillStyle = tt(M.pierreOmbre, .55);
  c.fillRect(0, yAile + hAile*.46 + Math.max(1.4, ht*.02), larg, Math.max(1, ht*.012));

  // 2. Les fenêtres des ailes. Cintrées en bas, rectangulaires en haut, et
  // séparées par des pilastres — c'est ce rythme qui fait le bâtiment civique.
  const pas = ht*.5;
  for (let x = pas*.35; x < larg; x += pas){
    if (x > xPav - ht*.2 && x < xPav + lPav + ht*.2) continue;   // le pavillon
    const i = (x*7)|0;
    // Pilastre entre deux travées.
    c.fillStyle = mel(M.pierre, M.pierreClair, .12);
    c.fillRect(x - pas*.16, yAile, pas*.1, hAile);
    c.fillStyle = tt(M.pierreOmbre, .35);
    c.fillRect(x - pas*.07, yAile, pas*.03, hAile);
    // Rez-de-chaussée : c'est par là qu'on entre, donc c'est là qu'on cloue.
    const cloue = graine(i+11) > .58, brise = !cloue && graine(i+17) > .72;
    fenetre(c, x, yAile + hAile*.6, pas*.42, hAile*.34, true, ht, i, graine(i) > .74);
    if (cloue) planches(c, x - ht*.02, yAile + hAile*.62, pas*.46, hAile*.3, ht, i);
    else if (brise) vitreBrisee(c, x, yAile + hAile*.6, pas*.42, hAile*.34, ht, i);
    // Étage : plus clair que le rez-de-chaussée, sinon il disparaît sur la
    // pierre sombre et on ne lit plus qu'un seul niveau.
    fenetre(c, x, yAile + hAile*.12, pas*.42, hAile*.3, false, ht, i+3, graine(i+3) > .62);
    if (graine(i+23) > .8) vitreBrisee(c, x, yAile + hAile*.12, pas*.42, hAile*.3, ht, i+5);
  }
  balustrade(c, 0, yAile - ht*.09, larg, ht);

  // 2b. LE FROID SUR LA PIERRE. Toute la pierre baignait dans un gris neutre
  // alors que l'ambiance de la série est franchement teal. On refroidit donc
  // la façade, d'autant plus qu'on s'éloigne de l'entrée — la seule chose qui
  // réchauffe, c'est la lumière qui en sort.
  c.save();
  const gf = c.createRadialGradient(cx, sol - ht*.4, ht*.4, cx, sol - ht*.4, larg*.55);
  gf.addColorStop(0, tt(M.teal, 0)); gf.addColorStop(1, tt(M.teal, .5));
  c.fillStyle = gf;
  c.fillRect(0, yAile - ht*.12, larg, hAile + ht*.12);
  c.restore();

  // 3. La tour d'horloge. Rentrée par rapport au bord : à l'extrémité elle
  // était à moitié hors champ et on ne la remarquait pas.
  if (opt.tour !== 0) tour(c, cx - larg*.29, sol, ht, t, opt);

  // 4. Le pavillon d'entrée, en saillie : il porte donc son ombre sur l'aile
  // de droite, sinon rien ne dit qu'il est devant.
  c.fillStyle = tt(M.pierreOmbre, .55);
  c.fillRect(xPav + lPav, yPav, ht*.1, hPav);
  mur(c, xPav, yPav, lPav, hPav, ht, 211);
  c.fillStyle = tt(M.pierreClair, .1);
  c.fillRect(xPav, yPav, lPav, hPav*.06);
  // Ses pilastres d'angle.
  for (const px of [xPav, xPav + lPav - ht*.13]){
    c.fillStyle = mel(M.pierre, M.pierreClair, .22);
    c.fillRect(px, yPav, ht*.13, hPav);
    c.fillStyle = tt(M.pierreOmbre, .4);
    c.fillRect(px + ht*.1, yPav, ht*.03, hPav);
  }
  balustrade(c, xPav - ht*.05, yPav - ht*.09, lPav + ht*.1, ht);

  // 5. L'entrée cintrée et sa lumière. C'est la seule source saturée de toute
  // l'image : tout ce qui est chaud vient de là.
  const lArc = lPav*.42, xArc = cx - lArc/2, hArc = hPav*.44, yArc = sol - hArc;
  if (v > 0){
    c.save(); c.globalCompositeOperation = 'screen';
    const g = c.createRadialGradient(cx, sol - hArc*.5, ht*.03, cx, sol - hArc*.5, ht*1.1);
    g.addColorStop(0, tt(M.ambre, .46*v)); g.addColorStop(.45, tt(M.ambre, .14*v));
    g.addColorStop(1, tt(M.ambre, 0));
    c.fillStyle = g; c.fillRect(cx - ht*1.2, sol - ht*1.3, ht*2.4, ht*1.5);
    c.restore();
  }
  c.fillStyle = mel(M.vitre, '#000000', .4);
  c.beginPath();
  c.moveTo(xArc, sol); c.lineTo(xArc, yArc + hArc*.38);
  c.quadraticCurveTo(cx, yArc - hArc*.16, xArc + lArc, yArc + hArc*.38);
  c.lineTo(xArc + lArc, sol); c.closePath(); c.fill();
  if (v > 0){
    c.save();
    c.beginPath();
    c.moveTo(xArc, sol); c.lineTo(xArc, yArc + hArc*.38);
    c.quadraticCurveTo(cx, yArc - hArc*.16, xArc + lArc, yArc + hArc*.38);
    c.lineTo(xArc + lArc, sol); c.closePath(); c.clip();
    const gp = c.createLinearGradient(0, sol, 0, yArc);
    gp.addColorStop(0, tt(M.ambreClair, .62*v)); gp.addColorStop(1, tt(M.ambre, .12*v));
    c.fillStyle = gp; c.fillRect(xArc, yArc - hArc, lArc, hArc*2);
    // La silhouette des portes vitrées à double battant.
    c.fillStyle = tt(M.fer, .85);
    c.fillRect(cx - Math.max(1, ht*.012), yArc + hArc*.35, Math.max(2, ht*.024), hArc);
    c.fillRect(xArc + lArc*.12, yArc + hArc*.62, lArc*.76, Math.max(1.4, ht*.018));
    c.restore();
  }
  // L'imposte en éventail au-dessus de la porte.
  c.strokeStyle = mel(M.pierre, M.pierreClair, .5); c.lineWidth = Math.max(1.2, ht*.018);
  c.beginPath();
  c.moveTo(xArc - ht*.02, yArc + hArc*.38);
  c.quadraticCurveTo(cx, yArc - hArc*.18, xArc + lArc + ht*.02, yArc + hArc*.38);
  c.stroke();
  c.strokeStyle = tt(M.fer, .7); c.lineWidth = Math.max(.8, ht*.01);
  for (let k = 1; k < 5; k++){
    const a = Math.PI + k*(Math.PI/5);
    c.beginPath();
    c.moveTo(cx, yArc + hArc*.38);
    c.lineTo(cx + Math.cos(a)*lArc*.5, yArc + hArc*.38 + Math.sin(a)*hArc*.5);
    c.stroke();
  }

  // 6. Les lettres. LE marqueur : si « R.P.D. » se lit, le joueur sait où il est.
  const hL = ht * (opt.grandesLettres ? .3 : .24);
  c.save();
  c.font = '700 ' + hL.toFixed(1) + 'px "Archivo Black", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  const yL = yPav + hPav*.26;
  if (opt.lettresEteintes){
    c.fillStyle = tt(M.lettre, .4);
  } else {
    c.shadowColor = tt(M.ambrePale, .85); c.shadowBlur = Math.max(3, ht*.1);
    c.fillStyle = M.lettreAllumee;
  }
  c.fillText('R.P.D.', cx, yL);
  c.restore();
  // Le sous-titre. Il ne se lira pas à 82 px, mais sa masse grise fait un
  // bandeau qui appuie les grandes lettres — c'est son vrai rôle.
  const hS = ht*.085;
  c.save();
  c.font = '700 ' + hS.toFixed(1) + 'px "Archivo Black", sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = tt(M.lettre, opt.lettresEteintes ? .28 : .6);
  c.fillText('RACCOON POLICE', cx, yL + hL*.72);
  c.restore();

  // 7. Les deux lanternes de l'entrée.
  for (const s of [-1, 1]){
    const lx = cx + s*lArc*.78, ly = yArc + hArc*.2;
    if (v > 0){
      c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = .5*v;
      const g = c.createRadialGradient(lx, ly, 1, lx, ly, ht*.3);
      g.addColorStop(0, tt(M.ambreClair, .9)); g.addColorStop(1, tt(M.ambre, 0));
      c.fillStyle = g; c.beginPath(); c.arc(lx, ly, ht*.3, 0, TAU); c.fill(); c.restore();
    }
    c.fillStyle = M.fer;
    c.fillRect(lx - Math.max(.8, ht*.012), ly - ht*.09, Math.max(1.6, ht*.024), ht*.06);
    c.fillStyle = v > 0 ? tt(M.ambrePale, .9) : tt(M.vitreFroide, .8);
    c.beginPath();
    c.moveTo(lx - ht*.035, ly + ht*.05); c.lineTo(lx + ht*.035, ly + ht*.05);
    c.lineTo(lx + ht*.022, ly - ht*.03); c.lineTo(lx - ht*.022, ly - ht*.03);
    c.closePath(); c.fill();
    c.strokeStyle = M.fer; c.lineWidth = Math.max(.8, ht*.011); c.stroke();
  }

  // 8. Le perron et le contact au sol : sans marches, le bâtiment est posé
  // sur la rue au lieu d'y être planté.
  for (let k = 0; k < 3; k++){
    const el = lArc + ht*(.18 + k*.14);
    c.fillStyle = mel(M.pierre, k % 2 ? M.pierreClair : M.pierreOmbre, .22);
    c.fillRect(cx - el/2, sol + k*ht*.035, el, ht*.04);
    c.fillStyle = tt(M.pierreOmbre, .5);
    c.fillRect(cx - el/2, sol + k*ht*.035 + ht*.032, el, ht*.012);
  }
  const go = c.createLinearGradient(0, sol, 0, sol + ht*.2);
  go.addColorStop(0, tt(M.bitumeOmbre, .75)); go.addColorStop(1, tt(M.bitumeOmbre, 0));
  c.fillStyle = go; c.fillRect(0, sol, larg, ht*.2);

  // 9. Le périmètre de sécurité : la ligne de barrières en travers du perron
  // et le fourgon en biais. C'est ce qui sépare le bâtiment de l'aire de jeu
  // et remplit le bas de la bande, sinon vide sous la façade.
  if (opt.devant !== 0){
    fourgon(c, cx + lPav*.95, sol + ht*.12, ht*.5, -.09, t);
    for (let bx = -ht*.2; bx < larg; bx += ht*.62){
      if (bx > cx + lPav*.6 && bx < cx + lPav*1.35) continue;   // la place du fourgon
      barriere(c, bx, sol + ht*.13, ht, (bx*13)|0);
    }
  }

  // 10. Le drapeau, sur son mât devant l'aile droite.
  if (opt.drapeau !== 0) drapeau(c, cx + lPav*.72, sol, ht*1.05, t);
}

/* Le drapeau : le seul rouge franc de la scène. Treize bandes qui ondulent,
   et la face au vent plus claire que celle qui s'en détourne. */
function drapeau(c, x, sol, ht, t){
  c.fillStyle = mel(M.fer, M.ferArete, .25);
  c.fillRect(x - ht*.012, sol - ht, ht*.024, ht);
  c.fillStyle = tt(M.ferArete, .5);
  c.fillRect(x - ht*.012, sol - ht, ht*.009, ht);
  c.fillStyle = tt(M.ambreClair, .8);
  c.beginPath(); c.arc(x, sol - ht - ht*.02, Math.max(1, ht*.022), 0, TAU); c.fill();
  const l = ht*.4, h = ht*.23, y0 = sol - ht + ht*.03;
  for (let b = 0; b < 13; b++){
    const yb = y0 + b*(h/13);
    c.beginPath();
    c.moveTo(x, yb);
    for (let s = 0; s <= 6; s++)
      c.lineTo(x + s*(l/6), yb + Math.sin(t*2.2 + s*.9)*h*.07*(s/6));
    for (let s = 6; s >= 0; s--)
      c.lineTo(x + s*(l/6), yb + h/13 + Math.sin(t*2.2 + s*.9)*h*.07*(s/6));
    c.closePath();
    const ombre = (Math.sin(t*2.2 + b*.15 + 1) + 1) / 2;
    c.fillStyle = b % 2 ? mel(M.drapBlanc, M.teal, .25 + ombre*.3)
                        : mel(M.drapRouge, M.pierreOmbre, .1 + ombre*.35);
    c.fill();
  }
  c.fillStyle = mel(M.drapBleu, M.pierreOmbre, .2);
  c.fillRect(x, y0, l*.42, h*.54);
  c.fillStyle = tt(M.drapBlanc, .75);
  for (let k = 0; k < 9; k++)
    c.fillRect(x + l*.05 + (k%3)*(l*.12), y0 + h*.1 + ((k/3)|0)*(h*.15),
               Math.max(.8, ht*.014), Math.max(.8, ht*.014));
}

/* La chaussée AUTOUR du terrain : le même macadam, mais privé de la lumière
   qui tombe sur l'aire de jeu. C'est ce contraste qui dit où l'on joue — et
   c'est lui qui manquait quand tout était au même niveau de gris. */
function rueAutour(c, t, R){
  const g = c.createLinearGradient(0, COURT.top, 0, 600);
  g.addColorStop(0, mel(M.bitume, M.bitumeOmbre, .3));
  g.addColorStop(1, M.bitumeOmbre);
  c.fillStyle = g; c.fillRect(0, COURT.top - 4, 960, 600 - COURT.top + 4);
  c.globalAlpha = .4;
  for (let i = 0; i < 220; i++){
    c.fillStyle = graine(i) > .55 ? tt(M.bitumeReflet, .45) : tt(M.bitumeOmbre, .8);
    c.fillRect(alea(i, 0, 960), COURT.top + alea(i + 7, 0, 600 - COURT.top), 2, 2);
  }
  c.globalAlpha = 1;
  // Les reflets de la rue restent francs : c'est le fond, on a le droit d'y
  // mettre de la matière — c'est près du jeu qu'on se tient sobre.
  c.save(); c.globalCompositeOperation = 'screen';
  for (const [sx, col] of [[140, M.ambre], [430, M.ambre], [760, M.gyroBleu], [880, M.ambre]]){
    for (let k = 0; k < 5; k++){
      c.globalAlpha = .1 * (1 - k/5);
      c.fillStyle = col;
      c.beginPath();
      c.ellipse(sx + Math.sin(t*1.8 + k)*4, 570 + k*8, 26 - k*3, 9, 0, 0, TAU);
      c.fill();
    }
  }
  c.restore();
  // Le caniveau qui longe le parvis.
  c.fillStyle = tt(M.bitumeOmbre, .85);
  c.fillRect(0, COURT.top - 9, 960, 5);
  c.fillRect(0, COURT.bottom + 4, 960, 5);
}

/* Le sol de l'aire de jeu. Ici c'est du macadam : granulat à trois grosseurs
   et les deux bandes de roulement polies par les pneus. Le mode « pierre » et
   le mode « mixte » sont conservés — ils ont été dessinés au banc et coûtent
   trois lignes — mais la fiche de la map ne demande que le macadam. */
function parvis(c, t, R){
  const cw = COURT.right - COURT.left, ch = COURT.bottom - COURT.top;
  // Le sol de nuit d'un Resident Evil n'est JAMAIS clair. En l'éclaircissant
  // pour gagner du contraste, j'obtenais un plateau de gymnase sous une façade
  // de nuit. C'est la LUMIÈRE qui détache l'aire de jeu — la nappe des
  // projecteurs plus bas — pas la clarté de la matière.
  const macadam = R.matiere === 'macadam';
  c.fillStyle = macadam ? mel(M.bitume, M.bitumeOmbre, .25) : mel(M.pierre, M.pierreOmbre, .68);
  c.fillRect(COURT.left, COURT.top, cw, ch);
  c.save();
  c.beginPath(); c.rect(COURT.left, COURT.top, cw, ch); c.clip();

  if (macadam){
    // Le macadam : trois grosseurs de granulat, et les deux bandes de
    // roulement polies par les pneus.
    for (let i = 0; i < 520; i++){
      const g = graine(i);
      c.fillStyle = g > .66 ? tt(M.bitumeReflet, .18)
                  : g > .32 ? tt('#5a6a72', .1) : tt(M.bitumeOmbre, .55);
      const s = g > .66 ? 1.4 : g > .32 ? 2.2 : 3;
      c.fillRect(COURT.left + alea(i, 0, cw), COURT.top + alea(i + 7, 0, ch), s, s);
    }
    for (const y of [CY - 96, CY + 96]){
      c.fillStyle = tt('#3a4a52', .14); c.fillRect(COURT.left, y - 19, cw, 38);
      c.fillStyle = tt(M.bitumeOmbre, .35);
      c.fillRect(COURT.left, y - 21, cw, 3); c.fillRect(COURT.left, y + 18, cw, 3);
    }
  } else {
    // Le parvis, en dalles sombres. Les joints suffisent à dire la pierre :
    // les fissures que j'avais ajoutées ne ressemblaient qu'à des gribouillis.
    for (let y = COURT.top; y < COURT.bottom; y += 68){
      for (let x = COURT.left; x < COURT.right; x += 94){
        const g = graine(y*13 + x);
        c.fillStyle = mel(M.pierre, M.pierreOmbre, .32 + g*.3);
        c.fillRect(x + 2, y + 2, 90, 64);
        c.fillStyle = tt(M.pierreClair, .09); c.fillRect(x + 2, y + 2, 90, 2);
        c.fillStyle = tt(M.pierreOmbre, .55); c.fillRect(x + 2, y + 63, 90, 3);
        c.fillStyle = tt(M.pierreOmbre, .4);  c.fillRect(x + 89, y + 2, 3, 64);
      }
    }
    // Le grain de la pierre, sinon les dalles sont des aplats.
    for (let i = 0; i < 300; i++){
      c.fillStyle = graine(i) > .5 ? tt(M.pierreClair, .07) : tt(M.pierreOmbre, .3);
      c.fillRect(COURT.left + alea(i, 0, cw), COURT.top + alea(i + 7, 0, ch), 2, 2);
    }
  }
  // La route qui traverse : le macadam au centre, le parvis de part et d'autre.
  if (R.matiere === 'mixte'){
    c.fillStyle = mel(M.bitume, M.bitumeOmbre, .2);
    c.fillRect(COURT.left, CY - 118, cw, 236);
    for (let i = 0; i < 240; i++){
      const g = graine(i + 900);
      c.fillStyle = g > .6 ? tt(M.bitumeReflet, .16) : tt(M.bitumeOmbre, .5);
      c.fillRect(COURT.left + alea(i + 900, 0, cw), CY - 118 + alea(i + 907, 0, 236), 2.4, 2.4);
    }
    c.fillStyle = tt(M.pierreOmbre, .7);
    c.fillRect(COURT.left, CY - 121, cw, 4); c.fillRect(COURT.left, CY + 117, cw, 4);
  }
  // Ce qui traîne : exact mais tenu court, pour ne pas dénaturer le jeu.
  // Plaques d'égout et caniveau — du mobilier fixe, il ne bouge pas sous le
  // disque et il donne des repères sur le terrain.
  for (const [px, py] of [[COURT.left + 190, CY + 128], [COURT.right - 210, CY - 136]]){
    c.fillStyle = tt(M.bitumeOmbre, .8);
    c.beginPath(); c.arc(px, py, 19, 0, TAU); c.fill();
    c.fillStyle = M.fer; c.beginPath(); c.arc(px, py, 17, 0, TAU); c.fill();
    c.fillStyle = M.ferOmbre;
    for (let k = -2; k <= 2; k++) c.fillRect(px - 14, py + k*6 - 1.4, 28, 2.8);
    c.strokeStyle = tt(M.ferArete, .5); c.lineWidth = 1.2;
    c.beginPath(); c.arc(px, py - 1, 17, Math.PI*1.1, Math.PI*1.9); c.stroke();
  }
  // Dossiers de police éparpillés : ça raconte le lieu, et ça ne bouge pas.
  if (R.papiers){
    for (let i = 0; i < 9; i++){
      c.save();
      c.translate(COURT.left + alea(i + 90, 20, cw - 20), COURT.top + alea(i + 97, 20, ch - 20));
      c.rotate(graine(i + 3) * 3);
      c.fillStyle = tt('#c6c2b6', .28 + graine(i)*.2);
      c.fillRect(-7, -5, 14, 10);
      c.fillStyle = tt(M.pierreOmbre, .35);
      c.fillRect(-5, -3, 10, 1.4); c.fillRect(-5, 0, 10, 1.4);
      c.restore();
    }
  }
  // Traînées séchées : immobiles, donc sans concurrence avec l'action.
  // Deux traînées seulement, et sombres : à cinq taches rose vif on lisait des
  // éclaboussures posées sur un sol propre, pas du sang séché dans la pierre.
  if (R.sang){
    for (let i = 0; i < 2; i++){
      c.save();
      c.translate(COURT.left + alea(i + 60, 140, cw - 140), COURT.top + alea(i + 67, 110, ch - 110));
      c.rotate(graine(i) * 3);
      c.fillStyle = tt(M.sangSec, .2);
      c.beginPath(); c.ellipse(0, 0, alea(i + 71, 18, 34), alea(i + 75, 6, 12), 0, 0, TAU); c.fill();
      c.fillStyle = tt(M.sangSec, .12);
      c.beginPath(); c.ellipse(alea(i + 79, -26, 26), 0, 22, 4, 0, 0, TAU); c.fill();
      c.restore();
    }
  }

  // LES REFLETS. C'est le réglage que tu voulais pouvoir juger sur pièce :
  // `mouille` va de 0 (parvis sec) à 1 (trempé). Au-delà de .5 les traînées
  // bougent en permanence sous le disque.
  if (R.mouille > 0){
    c.save(); c.globalCompositeOperation = 'screen';
    for (let i = 0; i < 6; i++){
      const px = COURT.left + alea(i + 20, 70, cw - 70), py = COURT.top + alea(i + 27, 50, ch - 50);
      const rx = alea(i + 33, 26, 56) * (.6 + R.mouille*.6), ry = alea(i + 39, 10, 20);
      c.globalAlpha = .1 + R.mouille * .22;
      const g = c.createRadialGradient(px, py, 2, px, py, rx);
      g.addColorStop(0, tt(M.ambreClair, .8)); g.addColorStop(1, tt(M.ambre, 0));
      c.fillStyle = g; c.beginPath(); c.ellipse(px, py, rx, ry, 0, 0, TAU); c.fill();
    }
    // Les grandes traînées verticales, seulement à partir de « mouillé ».
    if (R.mouille > .5){
      for (const [sx, col] of [[CX - 250, M.ambre], [CX, M.ambreClair], [CX + 250, M.gyroBleu]]){
        for (let k = 0; k < 6; k++){
          c.globalAlpha = (R.mouille - .5) * .3 * (1 - k/6);
          c.fillStyle = col;
          c.beginPath();
          c.ellipse(sx + Math.sin(t*2 + k)*6, COURT.top + 30 + k*46, 30 - k*3, 22, 0, 0, TAU);
          c.fill();
        }
      }
    }
    c.restore();
  }

  // LA NAPPE DES PROJECTEURS. Le deuxième moitié du « lumière ET matière » :
  // la police a éclairé la zone, donc l'aire de jeu est baignée et le reste
  // de la rue non.
  // Maintenant que la matière est sombre, c'est elle qui porte TOUT l'écart :
  // deux nappes superposées, une large et froide qui vient des projecteurs du
  // périmètre, une serrée et chaude qui vient de l'entrée du poste.
  c.save(); c.globalCompositeOperation = 'screen';
  // Dosée bas : à pleine puissance elle relevait tout le terrain et j'obtenais
  // un sol PLUS clair qu'avant de l'assombrir. Elle doit se voir, pas éclairer.
  const h1 = c.createRadialGradient(CX, CY, 50, CX, CY, Math.max(cw, ch)*.72);
  h1.addColorStop(0, tt('#cfe4e8', .07 + R.eclaire*.07));
  h1.addColorStop(.6, tt('#a8c8cc', .02 + R.eclaire*.03));
  h1.addColorStop(1, tt('#a8c8cc', 0));
  c.fillStyle = h1; c.fillRect(COURT.left, COURT.top, cw, ch);
  const h2 = c.createRadialGradient(CX, COURT.top, 20, CX, COURT.top, ch*.9);
  h2.addColorStop(0, tt(M.ambre, .1*R.eclaire));
  h2.addColorStop(1, tt(M.ambre, 0));
  c.fillStyle = h2; c.fillRect(COURT.left, COURT.top, cw, ch);
  c.restore();
  // Le vignettage fait le reste du travail : il referme l'aire de jeu par les
  // coins au lieu de l'éclaircir par le centre.
  const vg = c.createRadialGradient(CX, CY, cw*.24, CX, CY, cw*.6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, tt(M.bitumeOmbre, .72));
  c.fillStyle = vg; c.fillRect(COURT.left, COURT.top, cw, ch);
  c.restore();
}

function marquageSol(c){
  const cw = COURT.right - COURT.left, ch = COURT.bottom - COURT.top;
  c.save();
  c.beginPath(); c.rect(COURT.left, COURT.top, cw, ch); c.clip();
  const trace = () => {
    c.beginPath();
    c.rect(COURT.left + 6, COURT.top + 6, cw - 12, ch - 12);
    c.moveTo(CX, COURT.top + 6); c.lineTo(CX, COURT.bottom - 6);
    c.moveTo(CX + 58, CY); c.arc(CX, CY, 58, 0, TAU);
    c.moveTo(CX + 13, CY); c.arc(CX, CY, 13, 0, TAU);
  };
  c.lineWidth = 6; c.strokeStyle = 'rgba(216,222,232,.72)'; trace(); c.stroke();
  c.lineWidth = 6.6; c.strokeStyle = tt(M.pierre, .5);
  c.setLineDash([5, 21]); c.lineDashOffset = 9; trace(); c.stroke(); c.setLineDash([]);
  c.restore();
}

let GOAL_D = 48, GH = 100;   // recalculés depuis la fiche de la map à chaque image

/* Un barreau : un cylindre vu de face, donc une face sombre, un corps, et une
   arête vive du côté du terrain — c'est là que passe la lumière. Sans cette
   arête, un barreau n'est qu'un trait. */
function barreau(c, x, y, l, ep, v, base){
  const b = base || M.fer;
  c.fillStyle = mel(b, M.ferOmbre, .55);
  c.fillRect(x, y, l, ep);
  c.fillStyle = b;
  c.fillRect(x, y + ep*.2, l, ep*.5);
  c.fillStyle = tt(M.ferArete, .3 + .35*(v || 0));
  c.fillRect(x, y + ep*.2, l, Math.max(.8, ep*.22));
  c.fillStyle = 'rgba(0,0,0,.4)';
  c.fillRect(x, y + ep*.82, l, ep*.18);
}
function boulon(c, x, y, r){
  c.fillStyle = M.ferOmbre; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = tt(M.ferArete, .8); c.beginPath(); c.arc(x - r*.25, y - r*.25, r*.5, 0, TAU); c.fill();
}
function pourChaqueCage(c, fn){
  for (const side of [1, 2]){
    c.save();
    c.translate(side === 1 ? COURT.left : COURT.right, CY);
    c.scale(side === 1 ? 1 : -1, 1);
    fn(c, side);
    c.restore();
  }
}
/* Les volets, hors miroir pour que les chiffres restent lisibles. */
function voletsCage(c){
  // Les zones viennent de la fiche de la map, jamais recopiées ici : c'est
  // elle qui décide où sont les 3 et les 5, et le rendu ne fait que les montrer.
  for (const side of [1, 2]){
    const gx = side === 1 ? COURT.left - GOAL_D : COURT.right;
    for (const z of getMap().zones){
      c.globalAlpha = .24; c.fillStyle = z.color;
      c.fillRect(gx, CY + z.from, GOAL_D, z.to - z.from);
      c.globalAlpha = 1;
      c.fillStyle = 'rgba(255,255,255,.82)';
      c.font = '700 16px "Archivo Black", sans-serif';
      c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText(z.points, gx + GOAL_D / 2, CY + (z.from + z.to) / 2);
    }
  }
}

/* Une traînée de brume. Surtout PAS un dégradé radial : un blob rond se lit
   comme un halo de lumière, jamais comme du brouillard — c'était le défaut de
   la première version. Une traînée est faite de FIBRES horizontales : une
   quinzaine de traits fins, de longueurs et de décalages inégaux, dont
   l'opacité s'éteint aux deux bouts et décroît en s'éloignant de l'axe. C'est
   ce grain filandreux et déchiré qui fait la brume. */
function traineeBrume(c, x, y, L, E, col, a, t, i){
  const n = 15;
  for (let k = 0; k < n; k++){
    const u = (k / (n - 1)) * 2 - 1;
    const chute = Math.exp(-u*u*2.4);
    const g1 = graine(i*31 + k), g2 = graine(i*31 + k + 7);
    // Longueur et décalage propres à chaque fibre : sans ça on obtient un
    // rectangle flou, pas une traînée.
    const l = L * (.55 + g1*.55);
    const ox = (g2 - .5) * L * .28 + Math.sin(t*.5 + k*.8 + i) * L * .03;
    const dy = u * E * .5 + Math.sin(t*.7 + k + i*2) * E * .04;
    const gr = c.createLinearGradient(x + ox - l/2, 0, x + ox + l/2, 0);
    gr.addColorStop(0, tt(col, 0));
    gr.addColorStop(.22 + g1*.1, tt(col, a * chute));
    gr.addColorStop(.7, tt(col, a * chute * .8));
    gr.addColorStop(1, tt(col, 0));
    c.fillStyle = gr;
    c.fillRect(x + ox - l/2, y + dy, l, Math.max(1.6, E / n * 2.1));
  }
}

const POURTOUR = (() => {
  const a = [];
  // Tailles relevées d'un cran : à 21 px la posture — l'épaule tombante, la
  // jambe qui traîne — ne se lisait pas, et c'est elle qui fait le zombie.
  // La rangée du bas descend de deux pixels pour que les têtes ne mordent pas
  // sur la ligne de fond du terrain.
  for (let x = 16; x < 960; x += 34) a.push({ x, y: 598, h: 38, k: 'bas' });
  for (let y = COURT.top + 34; y < COURT.bottom - 6; y += 42){
    a.push({ x: 26 + graine(y)*18, y, h: 34, k: 'gauche' });
    a.push({ x: 934 - graine(y + 3)*18, y, h: 34, k: 'droite' });
  }
  return a;
})();

function voitureRue(c, x, y, ang, col, brulee, porte, t, i){
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = tt(M.bitumeOmbre, .7);
  c.beginPath(); c.ellipse(0, 4, 34, 21, 0, 0, TAU); c.fill();
  const corps = brulee ? '#221c19' : col;
  c.fillStyle = mel(corps, '#000000', .45); c.fillRect(-28, -18, 56, 36);
  c.fillStyle = corps; c.fillRect(-28, -15, 56, 27);
  c.fillStyle = mel(corps, '#7b8798', .3); c.fillRect(-28, -18, 56, 4);
  c.fillStyle = brulee ? '#0e0c0a' : 'rgba(18,26,38,.9)'; c.fillRect(-15, -12, 25, 24);
  if (!brulee){
    c.fillStyle = 'rgba(140,175,215,.38)';
    c.fillRect(-22, -11, 5, 22); c.fillRect(14, -11, 6, 22);
    c.fillStyle = 'rgba(140,175,215,.18)'; c.fillRect(-14, -11, 23, 5);
  } else {
    c.fillStyle = tt('#5a4a3a', .5);
    for (let k = 0; k < 6; k++) c.fillRect(-25 + k*9, -13 + (k % 3)*9, 6, 5);
    // Le feu, s'il brûle encore.
    c.save(); c.globalCompositeOperation = 'screen';
    const v = .6 + Math.sin(t*6 + i)*.4;
    c.globalAlpha = .4*v;
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 90);
    g.addColorStop(0, tt(M.feu || '#ff6a1a', .9)); g.addColorStop(1, tt('#ff6a1a', 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 90, 0, TAU); c.fill(); c.restore();
    c.fillStyle = tt('#ff8c1f', .7);
    for (let k = 0; k < 4; k++){
      const vv = .5 + Math.sin(t*8 + k + i)*.5;
      c.beginPath(); c.ellipse(-10 + k*7, -4, 3.4, 7*vv, 0, 0, TAU); c.fill();
    }
  }
  c.fillStyle = '#0f1216';
  for (const [dx, dy] of [[-21, -21], [14, -21], [-21, 16], [14, 16]]) c.fillRect(dx, dy, 8, 5);
  if (porte){
    c.fillStyle = mel(corps, '#000000', .3);
    c.save(); c.translate(-4, 18); c.rotate(.85);
    c.fillRect(0, 0, 23, 6);
    c.fillStyle = 'rgba(140,175,215,.22)'; c.fillRect(3, 1, 15, 3); c.restore();
    c.fillStyle = 'rgba(180,205,235,.16)';
    for (let k = 0; k < 8; k++) c.fillRect(alea(k + x, -14, 30), alea(k + y, 17, 34), 2, 2);
  }
  c.restore();
}

function corpsSousBache(c, x, y, i){
  c.save(); c.translate(x, y); c.rotate(alea(i, -.22, .22));
  c.fillStyle = tt(M.bitumeOmbre, .55); c.fillRect(-20, -5, 42, 14);
  c.fillStyle = tt('#c9ccd2', .68);
  c.beginPath(); c.roundRect(-21, -7, 42, 14, 6); c.fill();
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(-19, -6, 38, 3);
  c.fillStyle = tt(M.sangSec, .3);
  c.beginPath(); c.ellipse(-11, 1, 7, 4, 0, 0, TAU); c.fill();
  c.restore();
}


/* ===========================================================================
   LES SILHOUETTES DE RESIDENT EVIL 2, relevées sur les références.

   Trois types de zombies, et ce ne sont pas des variations décoratives : ce
   sont les trois qu'on croise réellement dans le jeu.
     · LE FLIC     chemise bleu clair délavée, pantalon marine, ceinturon
     · LE CIVIL    vêtements 90s ternes, veste ou chemise à carreaux
     · LA BLOUSE   blouse blanche des labos Umbrella, pantalon sombre
   Tous : peau grise tirant sur le vert, sang à la bouche et sur le torse.

   Les policiers encore vivants portent la MÊME chemise bleu clair que les
   flics zombifiés — c'est ce qui rend l'image du poste si dérangeante — plus
   le gilet noir, la casquette et la lampe.
   ======================================================================== */
const RE2 = {
  chemise:   '#7d9bb8',   chemiseOmbre: '#4e6a85',
  marine:    '#2a3348',   marineOmbre:  '#171e2c',
  gilet:     '#171b22',
  blouse:    '#cfd4d0',   blouseOmbre:  '#8d9491',
  peau:      '#93998c',   peauOmbre:    '#5c6157',
  peauVive:  '#b09a86',
  civil:     ['#4a4438', '#3c4a3e', '#5a4038', '#37414f', '#4a4a3a'],
  sang:      '#6e131e',
  cruiser:   '#d6d9d4',   cruiserBande: '#1d2b45'
};

/* Un zombie de RE2. La posture fait tout : tête penchée, une épaule tombante,
   les bras devant, les jambes décalées dont une qui traîne. À 21 px de haut,
   c'est la seule chose qui se lit — et c'est elle qui distingue un infecté
   d'un passant, bien avant le costume. */
function zombieRE2(c, x, y, h, t, i){
  const vers = x < CX ? 1 : -1;
  const type = ['flic', 'civil', 'civil', 'blouse'][(graine(i*7) * 4) | 0];
  const osc = Math.sin(t*1.25 + i) * .085;
  const haut = type === 'flic' ? RE2.chemise
             : type === 'blouse' ? RE2.blouse
             : RE2.civil[(graine(i*3) * RE2.civil.length) | 0];
  const bas = type === 'civil' ? mel(RE2.civil[(graine(i*5)*RE2.civil.length)|0], '#000', .45)
            : RE2.marine;
  c.save(); c.translate(x, y); c.rotate(osc);
  // Jambes décalées, l'une qui traîne d'un pas.
  c.fillStyle = mel(bas, '#000000', .25);
  c.fillRect(-h*.16, -h*.3, h*.13, h*.3);
  c.fillStyle = bas;
  c.fillRect(h*.04, -h*.3, h*.13, h*.32 + Math.sin(t*1.25 + i)*h*.03);
  // Buste, épaule droite tombante.
  c.fillStyle = haut;
  c.beginPath();
  c.moveTo(-h*.2, -h*.3); c.lineTo(-h*.22, -h*.62);
  c.lineTo(h*.18, -h*.58); c.lineTo(h*.2, -h*.3);
  c.closePath(); c.fill();
  c.fillStyle = tt(mel(haut, '#000', .5), .55);
  c.fillRect(-h*.22, -h*.44, h*.42, h*.05);
  // Le ceinturon du flic : c'est lui qui le fait reconnaître d'un coup d'œil.
  if (type === 'flic'){
    c.fillStyle = RE2.gilet; c.fillRect(-h*.21, -h*.34, h*.42, h*.07);
    c.fillStyle = tt('#b8a45c', .8); c.fillRect(-h*.04, -h*.335, h*.08, h*.06);
  }
  // La blouse ouverte, qui bat.
  if (type === 'blouse'){
    c.fillStyle = tt(RE2.blouseOmbre, .7);
    c.fillRect(-h*.03, -h*.6, h*.06, h*.3);
  }
  // Bras tendus vers le terrain, l'un plus haut que l'autre.
  c.fillStyle = mel(haut, RE2.peauOmbre, .35);
  c.save(); c.rotate(-vers*.42);
  c.fillRect(-h*.08, -h*.56, h*.36, h*.1); c.restore();
  c.fillRect(-h*.3, -h*.5 + Math.sin(t*1.8 + i)*h*.03, h*.28, h*.09);
  // Les mains, en peau grise.
  c.fillStyle = RE2.peau;
  c.fillRect(-h*.34, -h*.5 + Math.sin(t*1.8 + i)*h*.03, h*.07, h*.09);
  // Tête penchée, sang à la bouche.
  c.save(); c.translate(0, -h*.68); c.rotate(vers*.3);
  c.fillStyle = RE2.peau;
  c.beginPath(); c.arc(0, -h*.06, h*.15, 0, TAU); c.fill();
  c.fillStyle = tt(RE2.peauOmbre, .6);
  c.beginPath(); c.arc(vers*h*.05, -h*.08, h*.1, 0, TAU); c.fill();
  c.fillStyle = tt(RE2.sang, .75);
  c.fillRect(-h*.05, -h*.02, h*.1, h*.07);
  c.restore();
  // Le sang sur le torse : toujours sous le menton, jamais réparti au hasard.
  c.fillStyle = tt(RE2.sang, .45);
  c.fillRect(-h*.07, -h*.56, h*.13, h*.14);
  c.restore();
}

/* Un policier du R.P.D. encore debout : même chemise bleu clair que les flics
   zombifiés, gilet noir, casquette, et la lampe qui balaie. */
function policierRE2(c, x, y, h, t, i){
  const swat = graine(i*11) > .74;
  const a = Math.sin(t*.55 + i*1.4)*.75 + (x < CX ? 0 : Math.PI);
  // Le faisceau, posé avant la silhouette pour passer dessous.
  // Faisceaux nettement adoucis : ce sont les seules lumières mobiles à passer
  // au-dessus de l'aire de jeu, donc les seules qui puissent gêner la lecture
  // du disque. À .05 ils habitent le pourtour sans éclairer le terrain.
  c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = .05;
  const g = c.createLinearGradient(x, y - h*.6, x + Math.cos(a)*180, y - h*.6 + Math.sin(a)*180);
  g.addColorStop(0, 'rgba(244,250,255,.7)'); g.addColorStop(1, 'rgba(244,250,255,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x, y - h*.6);
  c.lineTo(x + Math.cos(a - .11)*190, y - h*.6 + Math.sin(a - .11)*190);
  c.lineTo(x + Math.cos(a + .11)*190, y - h*.6 + Math.sin(a + .11)*190);
  c.closePath(); c.fill(); c.restore();

  c.save(); c.translate(x + Math.sin(t*1.1 + i)*.7, y);
  const haut = swat ? RE2.gilet : RE2.chemise;
  const bas = swat ? RE2.gilet : RE2.marine;
  // Jambes d'aplomb : un vivant se tient droit, c'est ce qui l'oppose au
  // zombie à deux pas de lui.
  c.fillStyle = bas;
  c.fillRect(-h*.14, -h*.32, h*.12, h*.32);
  c.fillRect(h*.03, -h*.32, h*.12, h*.32);
  c.fillStyle = haut;
  c.fillRect(-h*.2, -h*.64, h*.4, h*.34);
  // Le gilet pare-balles, par-dessus la chemise.
  c.fillStyle = RE2.gilet;
  c.fillRect(-h*.19, -h*.6, h*.38, h*.24);
  c.fillStyle = tt('#5b6472', .6);
  c.fillRect(-h*.19, -h*.5, h*.38, h*.03);
  // L'écusson.
  c.fillStyle = tt('#b8a45c', .85);
  c.fillRect(-h*.15, -h*.56, h*.06, h*.06);
  // Tête, casquette ou casque.
  c.fillStyle = RE2.peauVive;
  c.beginPath(); c.arc(0, -h*.76, h*.15, 0, TAU); c.fill();
  c.fillStyle = swat ? '#0e1116' : RE2.marine;
  c.beginPath(); c.arc(0, -h*.79, h*.16, Math.PI, 0); c.fill();
  c.fillRect(-h*.16, -h*.8, h*.32, h*.05);
  if (swat){
    c.fillStyle = tt('#8fb4dc', .35);
    c.fillRect(-h*.13, -h*.79, h*.26, h*.09);
  } else {
    c.fillStyle = RE2.marineOmbre;
    c.fillRect(-h*.16, -h*.79, h*.26, h*.04);
  }
  // Le bras et la lampe, tendus dans l'axe du faisceau.
  c.save(); c.rotate(a + (x < CX ? 0 : Math.PI));
  c.fillStyle = haut; c.fillRect(0, -h*.58, h*.3, h*.09);
  c.fillStyle = '#c9ccd2'; c.fillRect(h*.28, -h*.585, h*.1, h*.1);
  c.restore();
  c.restore();
}

/* Une voiture de patrouille du R.P.D. : caisse blanche, bande marine, barre
   lumineuse, et « POLICE » sur le flanc. Les carcasses civiles réutilisent
   voitureRue(). */
function cruiserRPD(c, x, y, ang, t, i, brulee){
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = tt(M.bitumeOmbre, .7);
  c.beginPath(); c.ellipse(0, 4, 36, 22, 0, 0, TAU); c.fill();
  const corps = brulee ? '#241f1c' : RE2.cruiser;
  c.fillStyle = mel(corps, '#000000', .4); c.fillRect(-30, -18, 60, 36);
  c.fillStyle = corps; c.fillRect(-30, -15, 60, 27);
  if (!brulee){
    c.fillStyle = RE2.cruiserBande; c.fillRect(-30, -4, 60, 11);
    c.fillStyle = tt('#eef2f4', .85);
    c.font = '700 7px "Archivo Black", sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('POLICE', 0, 1.5);
  }
  c.fillStyle = brulee ? '#0e0c0a' : 'rgba(18,26,38,.9)'; c.fillRect(-16, -12, 26, 24);
  if (!brulee){
    c.fillStyle = 'rgba(140,175,215,.4)';
    c.fillRect(-24, -11, 5, 22); c.fillRect(15, -11, 6, 22);
  } else {
    c.fillStyle = tt('#5a4a3a', .5);
    for (let k = 0; k < 6; k++) c.fillRect(-26 + k*9, -13 + (k % 3)*9, 6, 5);
  }
  c.fillStyle = '#0f1216';
  for (const [dx, dy] of [[-22, -21], [15, -21], [-22, 16], [15, 16]]) c.fillRect(dx, dy, 8, 5);
  // La barre lumineuse : elle tourne encore sur les épaves non brûlées.
  if (!brulee){
    const vB = Math.max(0, Math.cos(t*2.4 + i)), vR = Math.max(0, -Math.cos(t*2.4 + i));
    c.save(); c.globalCompositeOperation = 'screen';
    for (const [col, v, dx] of [[M.gyroBleu, vB, -9], ['#ff3a4e', vR, 9]]){
      if (v < .05) continue;
      c.globalAlpha = .45*v;
      const g = c.createRadialGradient(dx, 0, 1, dx, 0, 110);
      g.addColorStop(0, tt(col, .9)); g.addColorStop(1, tt(col, 0));
      c.fillStyle = g; c.beginPath(); c.arc(dx, 0, 110, 0, TAU); c.fill();
    }
    c.restore();
    c.fillStyle = '#141a1c'; c.fillRect(-19, -8, 38, 8);
    c.fillStyle = vB > .1 ? M.gyroBleu : mel(M.gyroBleu, '#000', .78);
    c.fillRect(-18, -7, 17, 6);
    c.fillStyle = vR > .1 ? '#ff3a4e' : mel('#ff3a4e', '#000', .78);
    c.fillRect(1, -7, 17, 6);
  } else {
    c.save(); c.globalCompositeOperation = 'screen';
    const v = .6 + Math.sin(t*6 + i)*.4;
    c.globalAlpha = .38*v;
    const g = c.createRadialGradient(0, 0, 4, 0, 0, 95);
    g.addColorStop(0, tt('#ff6a1a', .9)); g.addColorStop(1, tt('#ff6a1a', 0));
    c.fillStyle = g; c.beginPath(); c.arc(0, 0, 95, 0, TAU); c.fill(); c.restore();
    c.fillStyle = tt('#ff8c1f', .7);
    for (let k = 0; k < 4; k++){
      const vv = .5 + Math.sin(t*8 + k + i)*.5;
      c.beginPath(); c.ellipse(-10 + k*7, -4, 3.4, 7*vv, 0, 0, TAU); c.fill();
    }
  }
  c.restore();
}

/* --- LA CAGE : la bouche d'egout --- */
function cageRaccoon(c, t){
pourChaqueCage(c, (c) => {
      // Le caniveau en pierre qui l'encadre.
      c.fillStyle = mel(M.pierre, M.pierreOmbre, .45);
      c.fillRect(-GOAL_D - 14, -GH - 12, GOAL_D + 16, GH*2 + 24);
      c.fillStyle = tt(M.pierreClair, .18);
      c.fillRect(-GOAL_D - 14, -GH - 12, GOAL_D + 16, 3);
      c.fillStyle = tt(M.pierreOmbre, .7);
      c.fillRect(-GOAL_D - 14, GH + 9, GOAL_D + 16, 3);
      // Le vide, très noir.
      c.fillStyle = '#030708'; c.fillRect(-GOAL_D - 2, -GH, GOAL_D + 2, GH*2);
      // Les fers plats, épais, avec leur arête usée par les roues.
      for (let y = -GH + 4; y < GH; y += 17){
        c.fillStyle = mel(M.fer, M.ferOmbre, .35);
        c.fillRect(-GOAL_D - 4, y, GOAL_D + 6, 9);
        c.fillStyle = tt(M.ferArete, .45);
        c.fillRect(-GOAL_D - 4, y, GOAL_D + 6, 2.4);
        c.fillStyle = tt('#5e3a24', .35);
        c.fillRect(-GOAL_D - 4, y + 7, GOAL_D + 6, 2);
      }
      // Deux fers longitudinaux qui tiennent l'ensemble.
      for (const x of [-GOAL_D + 4, -6]){
        c.fillStyle = mel(M.fer, M.ferOmbre, .2); c.fillRect(x, -GH, 6, GH*2);
        c.fillStyle = tt(M.ferArete, .4); c.fillRect(x, -GH, 1.6, GH*2);
      }
      // La vapeur : elle sort par les fentes, pas d'un point.
      c.save(); c.globalCompositeOperation = 'screen';
      for (let i = 0; i < 7; i++){
        const p = ((t*.4 + i*.15) % 1), y = -GH + 16 + i*26;
        c.globalAlpha = (1 - p)*.22;
        const g = c.createRadialGradient(-GOAL_D/2 - p*22, y, 2, -GOAL_D/2 - p*22, y, 16 + p*34);
        g.addColorStop(0, tt('#b8ccd2', .8)); g.addColorStop(1, tt('#b8ccd2', 0));
        c.fillStyle = g; c.beginPath(); c.arc(-GOAL_D/2 - p*22, y, 16 + p*34, 0, TAU); c.fill();
      }
      c.restore();
  });
}

/* --- LA BRUME : les gros traits blancs --- */
function brumeRaccoon(c, t){
const d = densiteBrume(t); if (d <= 0) return;
      const ch = COURT.bottom - COURT.top;
      // Blanches, faibles, nombreuses. La scène transparaît au travers au lieu
      // que la brume porte sa propre couleur — c'est ce qui la sortait du décor.
      const BLANC = '#eef4f5';
      for (let i = 0; i < 13; i++){
        const per = 3.2 + graine(i)*2.6, k = ((t/per) + graine(i+3)) % 1;
        const x = -520 + k*(960 + 1040);
        const y = COURT.top + alea(i + 11, 20, ch - 20);
        traineeBrume(c, x, y, 700 + graine(i+7)*360, 46 + graine(i+13)*40,
                     BLANC, d*.09*Math.sin(k*Math.PI), t, 200 + i);
  }
}

/* --- LE POURTOUR --- */
function pourtourRaccoon(c, t){

      // Les carcasses d'abord : tout le monde se tient devant elles.
      cruiserRPD(c, 34, 152, 1.5, t, 1, false);
      voitureRue(c, 34, 470, 1.44, '#4a5a2f', true, false, t, 2);
      cruiserRPD(c, 926, 200, 1.52, t, 3, false);
      voitureRue(c, 926, 486, 1.46, '#37414f', false, true, t, 4);
      cruiserRPD(c, 250, 590, .1, t, 5, true);
      voitureRue(c, 620, 592, -.12, '#5a4038', false, true, t, 6);
      // À gauche, les infectés. Ils sont plus serrés vers le milieu du terrain,
      // là où ils ont convergé.
      POURTOUR.forEach((p, i) => {
        const gauche = p.k === 'gauche' || (p.k === 'bas' && p.x < CX);
        if (!gauche) return;
        if (graine(i*5) < .18) return;
        zombieRE2(c, p.x, p.y, p.h, t, i);
      });
      // À droite, ce qui tient encore la ligne. Moins nombreux, forcément.
      POURTOUR.forEach((p, i) => {
        const droite = p.k === 'droite' || (p.k === 'bas' && p.x >= CX);
        if (!droite) return;
        if (graine(i*9) < .55) return;
        policierRE2(c, p.x, p.y, p.h, t, i);
      });
      // Les douilles au pied de la ligne : ils tirent depuis un moment.
      for (let i = 0; i < 60; i++){
        const px = alea(i + 700, CX, 954), py = alea(i + 707, COURT.top + 20, 598);
        if (px > COURT.left && px < COURT.right && py < COURT.bottom) continue;
        c.save(); c.translate(px, py); c.rotate(graine(i + 3)*3);
        c.fillStyle = tt('#c69e48', .55 + graine(i)*.3);
        c.fillRect(-2.4, -1, 5, 2); c.restore();
      }
}

/* ===========================================================================
   L'ASSEMBLAGE. L'ordre des couches est celui du banc, à une exception près :
   la brume en sort. C'est une règle de jeu, elle doit masquer les joueurs et
   le disque — elle est donc peinte à part, après eux, comme la tempête de
   Dune de Râ.
   ======================================================================== */
export function drawCourtRaccoon() {
  const c = ctx, t = G.now;
  // La géométrie des cages suit la fiche de la map plutôt que deux constantes
  // recopiées : sans ça, changer goal.height dans maps.js désaccorderait
  // silencieusement tout le dessin des barreaux.
  GOAL_D = GOAL_DEPTH;
  GH = (GOAL_BOTTOM - GOAL_TOP) / 2;

  // Le ciel, jusqu'à l'horizon seulement. Étendu plus bas il passerait derrière
  // le terrain, ce qui n'a aucun sens en vue de dessus.
  const ciel = c.createLinearGradient(0, 0, 0, BANDE);
  ciel.addColorStop(0, M.nuit); ciel.addColorStop(1, M.nuitTeal);
  c.fillStyle = ciel;
  c.fillRect(0, 0, W, BANDE);

  rueAutour(c, t, SOL);
  parvis(c, t, SOL);
  marquageSol(c);
  station(c, CX, BANDE, 82, W, t, {});
  pourtourRaccoon(c, t);
  cageRaccoon(c, t);
  voletsCage(c);
}

/* La brume, en espace écran et par-dessus tout — joueurs et disque compris,
   sinon elle ne masque rien. Appelée depuis render(), à côté de drawTempete().
   Le rendu ne décide de rien : la densité vient de game/brume.js, qui la tire
   du hasard semé et la fait décider par l'hôte. */
export function drawBrumeRaccoon() {
  if (getMap().style !== 'raccoon') return;
  brumeRaccoon(ctx, G.now);
}
