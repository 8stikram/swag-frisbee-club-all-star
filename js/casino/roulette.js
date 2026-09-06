// ---------------------------------------------------------------------------
// Roulette américaine — 0, 00 et 1 à 36.
//
// Trente-huit cases, donc 5,26 % d'avantage à la maison : c'est le double d'une
// européenne, et c'est assumé. Le tapis, lui, paie exactement ce qu'il doit —
// un plein rapporte 35 fois la mise, plus la mise elle-même.
//
// La roue est en canvas (trente-huit secteurs redessinés soixante fois par
// seconde), le tapis en DOM. Le tapis pouvait être dessiné aussi, mais chaque
// case doit être cliquable — et les chevaux, carrés et sixains se jouent sur les
// ARÊTES entre les cases. En DOM ce sont des div ; en canvas il aurait fallu
// refaire la détection de survol à la main pour cent cinquante zones.
//
// Le décor, les jetons, les effets et le compteur sont ceux du blackjack et du
// poker : mêmes classes, même casino.
// ---------------------------------------------------------------------------
import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { Compte, connecte, ajouterPieces } from '../reseau/compte.js';
import { sceau, message as messageCasino } from './casino.js';
import { secousse, flash, emettre, boiteDe } from './effets.js';

// --- La roue ----------------------------------------------------------------
// L'ordre réel d'une roue américaine : les numéros n'y sont pas rangés, ils
// sont disposés pour que rouges et noirs alternent et que les hauts et les bas
// se fassent face. Le trier par valeur casserait tout l'équilibre visuel.
const ORDRE = ['0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22',
               '34', '15', '3', '24', '36', '13', '1', '00', '27', '10', '25', '29',
               '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35',
               '14', '2'];
const ROUGES = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const couleurDe = n => (n === '0' || n === '00') ? 'vert' : ROUGES.has(+n) ? 'rouge' : 'noir';

const MISE_MIN = 10;
const JETONS = [
  { v: 10, teinte: '#e8e8e8' }, { v: 50, teinte: '#ff5a5a' }, { v: 100, teinte: '#5aa8ff' },
  { v: 500, teinte: '#7bff9d' }, { v: 1000, teinte: '#f6e27a' }
];

// Ce que rapporte chaque famille de mise, en plus de la mise rendue. Un plein
// couvre une case sur trente-huit et paie 35 : c'est de cet écart que vient
// l'avantage de la maison, sur toutes les familles à la fois.
const PAIEMENT = {
  plein: 35, cheval: 17, transversale: 11, carre: 8, sixain: 5,
  colonne: 2, douzaine: 2, simple: 1
};
const LIBELLE = {
  plein: 'Plein', cheval: 'Cheval', transversale: 'Transversale', carre: 'Carré',
  sixain: 'Sixain', colonne: 'Colonne', douzaine: 'Douzaine', simple: 'Chance simple'
};

// --- État -------------------------------------------------------------------
// Une mise = un identifiant, une famille, les numéros couverts et un montant.
// Garder les numéros DANS la mise rend le règlement trivial : « le tirage est-il
// dedans ». Recalculer la couverture au moment de payer, à partir du type et
// d'un numéro de référence, aurait dupliqué toute la géométrie du tapis.
const R = {
  mises: new Map(),          // id -> { type, nums, montant }
  precedentes: null,         // pour « Rejouer »
  solde: 0,
  jeton: 100,
  tourne: false,
  historique: []
};

const totalMise = () => [...R.mises.values()].reduce((s, m) => s + m.montant, 0);

// ---------------------------------------------------------------------------
// Le tapis
// ---------------------------------------------------------------------------
// Trois rangées de douze, et non douze rangées de trois : c'est la disposition
// de toutes les vraies tables, et la seule qui tienne dans un écran plus large
// que haut. La rangée du haut porte les multiples de 3.
const LIGNES = [
  [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36],
  [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35],
  [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]
];

function poserMise(id, type, nums) {
  if (R.tourne) return;
  if (R.jeton > R.solde - totalMise()) { sfx('deny'); message('Pas assez de pièces.'); return; }
  const m = R.mises.get(id) || { type, nums, montant: 0 };
  m.montant += R.jeton;
  R.mises.set(id, m);
  sfx('rlJeton');
  majTapis();
}

// Un clic droit retire la dernière mise posée sur la case : sans ça, une erreur
// de placement oblige à tout effacer et à recommencer.
function retirerMise(id) {
  if (R.tourne) return;
  const m = R.mises.get(id);
  if (!m) return;
  m.montant -= R.jeton;
  if (m.montant <= 0) R.mises.delete(id);
  sfx('select');
  majTapis();
}

// Chaque case et chaque arête reçoit son point de mise. Les arêtes sont de vrais
// éléments posés à cheval sur deux cases : c'est ainsi qu'on joue un cheval sur
// une table, et une liste de boutons « cheval 17-18 » aurait été illisible.
function construireTapis() {
  const grille = $('rlGrille');
  if (!grille || grille.children.length) return;

  // `famille` est la clé de paiement, pas un libellé : c'est elle qu'on
  // retrouvera au règlement. Stocker « Carré » et le retraduire en 8:1 au
  // moment de payer aurait fait dépendre l'argent d'une chaîne d'affichage.
  const zone = (classe, style, id, famille, nums, etiquette) => {
    const d = document.createElement('div');
    d.className = classe;
    if (style) d.style.cssText = style;
    if (etiquette !== undefined) d.textContent = etiquette;
    d.dataset.mise = id;
    d.title = `${LIBELLE[famille]} (${PAIEMENT[famille]}:1) — ${nums.join(', ')}`;
    d.addEventListener('click', ev => { ev.stopPropagation(); poserMise(id, famille, nums); });
    d.addEventListener('contextmenu', ev => { ev.preventDefault(); ev.stopPropagation(); retirerMise(id); });
    return d;
  };

  for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) {
    const n = LIGNES[r][c];
    const cel = zone('rlNum ' + couleurDe(String(n)), `grid-area:${r + 1}/${c + 1}`,
                     'plein:' + n, 'plein', [n], n);
    cel.dataset.num = n;

    // Arête droite : cheval avec le numéro voisin de la même ligne.
    if (c < 11) cel.appendChild(zone('rlArete droite', '', `cheval:${n}-${LIGNES[r][c + 1]}`,
                                     'cheval', [n, LIGNES[r][c + 1]]));
    // Arête basse : cheval avec le numéro de la ligne en dessous.
    if (r < 2) cel.appendChild(zone('rlArete basse', '', `cheval:${n}-${LIGNES[r + 1][c]}`,
                                    'cheval', [n, LIGNES[r + 1][c]]));
    // Coin bas-droite : le carré des quatre numéros qui s'y touchent.
    if (r < 2 && c < 11) {
      const q = [n, LIGNES[r][c + 1], LIGNES[r + 1][c], LIGNES[r + 1][c + 1]].sort((a, b) => a - b);
      cel.appendChild(zone('rlArete coin', '', 'carre:' + q.join('-'), 'carre', q));
    }
    // Sous la dernière ligne : la transversale (les trois numéros de la colonne)
    // et, au coin, le sixain (deux colonnes).
    if (r === 2) {
      const t = [n, n + 1, n + 2];
      cel.appendChild(zone('rlArete dessous', '', 'transversale:' + t.join('-'), 'transversale', t));
      if (c < 11) {
        const six = [n, n + 1, n + 2, n + 3, n + 4, n + 5];
        cel.appendChild(zone('rlArete coinBas', '', 'sixain:' + six.join('-'), 'sixain', six));
      }
    }
    grille.appendChild(cel);
  }

  // Le zéro et le double zéro, à gauche, chacun sur une case et demie.
  const zeros = $('rlZeros');
  for (const z of ['0', '00'])
    zeros.appendChild(zone('rlNum vert rlZero', '', 'plein:' + z, 'plein', [z], z));

  // Les douzaines au-dessus, les colonnes à droite, les chances simples dessous.
  const douz = $('rlDouzaines');
  [[1, 'P12'], [2, 'M12'], [3, 'D12']].forEach(([i, texte]) => {
    const nums = []; for (let n = (i - 1) * 12 + 1; n <= i * 12; n++) nums.push(n);
    douz.appendChild(zone('rlExterne', '', 'douzaine:' + i, 'douzaine', nums, texte));
  });

  const cols = $('rlColonnes');
  for (let r = 0; r < 3; r++)
    cols.appendChild(zone('rlExterne', '', 'colonne:' + r, 'colonne', LIGNES[r], '2:1'));

  const simples = $('rlSimples');
  const pair = [], impair = [], manque = [], passe = [], rouge = [], noir = [];
  for (let n = 1; n <= 36; n++) {
    (n % 2 ? impair : pair).push(n);
    (n <= 18 ? manque : passe).push(n);
    (ROUGES.has(n) ? rouge : noir).push(n);
  }
  for (const [id, nums, texte, extra] of [
    ['manque', manque, '1-18', ''], ['pair', pair, 'PAIR', ''],
    ['rouge', rouge, '◆', 'rouge'], ['noir', noir, '◆', 'noir'],
    ['impair', impair, 'IMPAIR', ''], ['passe', passe, '19-36', '']
  ]) simples.appendChild(zone('rlExterne ' + extra, '', id, 'simple', nums, texte));

  const rangee = $('rlJetons');
  for (const j of JETONS) {
    const b = document.createElement('button');
    b.className = 'rlJeton' + (j.v === R.jeton ? ' choisi' : '');
    b.style.setProperty('--teinte', j.teinte);
    b.dataset.valeur = j.v;
    b.innerHTML = `<b>${j.v}</b>`;
    b.addEventListener('click', () => {
      R.jeton = j.v;
      sfx('select');
      for (const a of rangee.children) a.classList.toggle('choisi', +a.dataset.valeur === j.v);
    });
    rangee.appendChild(b);
  }
}

// Une pastille par case misée, portant le total posé dessus. On la redessine
// entièrement à chaque changement : à quinze mises maximum, chercher laquelle a
// bougé coûterait plus cher que tout refaire.
function majTapis() {
  for (const p of document.querySelectorAll('.rlPastille')) p.remove();
  for (const [id, m] of R.mises) {
    const cible = document.querySelector(`[data-mise="${CSS.escape(id)}"]`);
    if (!cible) continue;
    const p = document.createElement('span');
    p.className = 'rlPastille';
    p.textContent = m.montant;
    cible.appendChild(p);
  }
  const total = totalMise();
  $('rlTotal').textContent = total;
  $('rlLancer').disabled = total === 0 || R.tourne;
  $('rlEffacer').disabled = total === 0 || R.tourne;
  $('rlRejouer').disabled = R.tourne || !R.precedentes;
  $('rlDoubler').disabled = R.tourne || total === 0 || total * 2 > R.solde;
  $('rlSoldeVal').textContent = R.solde - total;
}

// ---------------------------------------------------------------------------
// La roue, en canvas
// ---------------------------------------------------------------------------
const PAS = Math.PI * 2 / ORDRE.length;
let ctx = null, taille = 0;
// Angles en radians. La roue tourne dans un sens, la bille dans l'autre : c'est
// ce croisement qui rend le tirage illisible à l'œil, et c'est aussi pour ça
// qu'une vraie table le fait.
let angleRoue = 0, angleBille = 0, rayonBille = 0;

function calibrerRoue() {
  const cv = $('rlRoue');
  if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const l = cv.clientWidth, h = cv.clientHeight;
  cv.width = l * dpr | 0; cv.height = h * dpr | 0;
  ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  taille = Math.min(l, h);
}

let dernierL = 0;
function dessinerRoue(gagnant) {
  const cv = $('rlRoue');
  if (!cv) return;
  // La roue grandit au lancer : sa taille CSS change à chaque image pendant la
  // transition, et un canvas dont la boîte bouge sans qu'on redimensionne son
  // tampon se retrouve étiré. On recalibre dès que la largeur a changé.
  if (cv.clientWidth !== dernierL) { calibrerRoue(); dernierL = cv.clientWidth; }
  if (!ctx) return;
  const l = cv.clientWidth, h = cv.clientHeight;
  const cx = l / 2, cy = h / 2, rExt = taille * .47, rInt = taille * .26;
  ctx.clearRect(0, 0, l, h);

  // Le plateau : bordeaux sombre, cerclé d'or, avec une ombre portée.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.shadowColor = 'rgba(0,0,0,.8)'; ctx.shadowBlur = taille * .06; ctx.shadowOffsetY = taille * .02;
  ctx.beginPath(); ctx.arc(0, 0, rExt * 1.06, 0, 6.2832);
  ctx.fillStyle = '#2a0810'; ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRoue);
  for (let i = 0; i < ORDRE.length; i++) {
    const n = ORDRE[i], a0 = i * PAS - PAS / 2, a1 = a0 + PAS;
    const c = couleurDe(n);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, rExt, a0, a1);
    ctx.closePath();
    ctx.fillStyle = c === 'vert' ? '#0b6038' : c === 'rouge' ? '#7c1020' : '#141018';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212,175,55,.75)';
    ctx.lineWidth = Math.max(1, taille * .004);
    ctx.stroke();

    // Le numéro, couché le long du rayon. Écrit droit, il serait illisible sur
    // la moitié inférieure de la roue.
    ctx.save();
    ctx.rotate(a0 + PAS / 2);
    ctx.translate(rExt * .82, 0);
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = n === gagnant ? '#fff6c2' : '#f6e27a';
    ctx.font = `700 ${Math.max(7, taille * .045)}px 'Russo One', sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (n === gagnant) { ctx.shadowColor = '#ffd24a'; ctx.shadowBlur = taille * .05; }
    ctx.fillText(n, 0, 0);
    ctx.restore();
  }

  // Moyeu et anneau intérieur.
  ctx.beginPath(); ctx.arc(0, 0, rInt, 0, 6.2832);
  const moyeu = ctx.createRadialGradient(-rInt * .3, -rInt * .3, rInt * .1, 0, 0, rInt);
  moyeu.addColorStop(0, '#3a1626'); moyeu.addColorStop(1, '#0a0409');
  ctx.fillStyle = moyeu; ctx.fill();
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = Math.max(1.5, taille * .008); ctx.stroke();
  ctx.restore();

  // Cercle d'or extérieur, hors rotation : c'est le cadre fixe de la cuvette.
  ctx.beginPath(); ctx.arc(cx, cy, rExt * 1.06, 0, 6.2832);
  ctx.strokeStyle = '#d4af37'; ctx.lineWidth = Math.max(2, taille * .012); ctx.stroke();

  // La bille, et sa traînée.
  const bx = cx + Math.cos(angleBille) * rayonBille, by = cy + Math.sin(angleBille) * rayonBille;
  const halo = ctx.createRadialGradient(bx, by, 0, bx, by, taille * .06);
  halo.addColorStop(0, 'rgba(255,240,190,.9)');
  halo.addColorStop(.4, 'rgba(190,110,255,.45)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.beginPath(); ctx.arc(bx, by, taille * .06, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, Math.max(2.5, taille * .018), 0, 6.2832);
  ctx.fillStyle = '#fffdf2'; ctx.fill();

  // Le repère : c'est lui qui désigne la case gagnante, en haut de la cuvette.
  ctx.beginPath();
  ctx.moveTo(cx, cy - rExt * 1.14); ctx.lineTo(cx - taille * .028, cy - rExt * 1.02);
  ctx.lineTo(cx + taille * .028, cy - rExt * 1.02); ctx.closePath();
  ctx.fillStyle = '#f6e27a'; ctx.fill();
}

// ---------------------------------------------------------------------------
// Le lancer
// ---------------------------------------------------------------------------
const easeOut = t => 1 - Math.pow(1 - t, 4);
let anim = null, sauter = false;

function lancer() {
  if (R.tourne || !R.mises.size) return;
  const total = totalMise();
  if (total > R.solde) { sfx('deny'); message('Pas assez de pièces.'); return; }

  R.tourne = true;
  R.precedentes = new Map([...R.mises].map(([k, m]) => [k, { ...m }]));
  majTapis();
  effacerAnnonce();
  // La roue prend toute la place pendant le lancer et le tapis s'efface. C'est
  // la seule façon d'avoir les deux en grand sur un écran plus large que haut :
  // chacun au moment où il compte, plutôt qu'un compromis où les deux sont
  // trop petits pour être lus.
  $('scr-roulette').classList.add('lance');

  // Le tirage est fait MAINTENANT, avant la moindre image : l'animation ne
  // décide de rien, elle raconte. Faire tomber la bille « où elle arrive »
  // aurait rendu le hasard dépendant du nombre d'images par seconde.
  const i = (Math.random() * ORDRE.length) | 0;
  const gagnant = ORDRE[i];

  const DUREE = 5600;
  const debut = performance.now();
  const roue0 = angleRoue;
  const roueF = roue0 + Math.PI * 2 * 6;           // six tours dans le sens horaire
  // La case gagnante doit finir sous le repère, en haut. Le secteur i est à
  // l'angle i*PAS dans le repère de la roue ; on résout l'angle de la bille
  // pour qu'elle s'y trouve, plutôt que d'espérer qu'elle y tombe.
  const billeF = roueF + i * PAS - Math.PI / 2;
  const bille0 = billeF + Math.PI * 2 * 11;        // onze tours en sens inverse
  const rExt = () => taille * .43, rPoche = () => taille * .355;

  let dernierTic = 0;
  const pas = maintenant => {
    const brut = Math.min(1, (maintenant - debut) / DUREE);
    const t = sauter ? 1 : brut;
    const e = easeOut(t);
    angleRoue = roue0 + (roueF - roue0) * e;
    angleBille = bille0 + (billeF - bille0) * e;

    // La bille descend vers sa case sur le dernier tiers, et rebondit deux ou
    // trois fois avant de se poser. Sans ces rebonds elle se colle à sa case,
    // et on voit qu'elle savait où aller.
    const chute = Math.max(0, (t - .62) / .38);
    const rebond = chute > 0 && chute < 1 ? Math.abs(Math.sin(chute * Math.PI * 3)) * (1 - chute) * taille * .045 : 0;
    rayonBille = rExt() - (rExt() - rPoche()) * easeOut(chute) + rebond;

    // Un cliquetis à chaque case franchie, de plus en plus espacé.
    if (t < 1 && maintenant - dernierTic > 40 + 400 * e * e) { sfx('rlTic'); dernierTic = maintenant; }

    dessinerRoue(t >= 1 ? gagnant : null);
    if (t < 1) anim = requestAnimationFrame(pas);
    else { anim = null; sauter = false; regler(gagnant); }
  };
  anim = requestAnimationFrame(pas);
}

// ---------------------------------------------------------------------------
// Le règlement
// ---------------------------------------------------------------------------
function regler(gagnant) {
  sfx('rlChute');
  const num = gagnant === '0' || gagnant === '00' ? gagnant : +gagnant;
  const couleur = couleurDe(gagnant);

  let mise = 0, retour = 0, meilleur = 0;
  for (const [id, m] of R.mises) {
    mise += m.montant;
    const gagne = m.nums.some(n => String(n) === String(num));
    const cel = document.querySelector(`[data-mise="${CSS.escape(id)}"]`);
    if (gagne) {
      retour += m.montant * (PAIEMENT[m.type] + 1);
      meilleur = Math.max(meilleur, PAIEMENT[m.type]);
      cel?.classList.add('gagnante');
    } else cel?.classList.add('perdante');
  }

  const net = retour - mise;
  R.solde = Math.max(0, R.solde + net);
  R.historique.unshift(gagnant);
  if (R.historique.length > 10) R.historique.pop();
  majHistorique();
  marquerGagnant(gagnant);

  annoncer(`${gagnant} ${couleur.toUpperCase()}`, couleur, net, meilleur);

  const ecran = $('scr-roulette');
  if (net > 0) {
    // Le juice se règle sur ce qui vient d'arriver : un plein à 35:1 secoue
    // l'écran, un rouge/noir se contente de briller. Tout célébrer pareil
    // reviendrait à ne rien souligner.
    const gros = meilleur >= 8;
    flash(ecran, 'or', gros ? 180 : 110);
    secousse(ecran, gros ? 14 : 5, gros ? 420 : 240);
    emettre(ecran, 'confetti', { x: 0, y: -30, l: ecran.clientWidth, h: 20 }, gros ? 40 : 16);
    for (const c of document.querySelectorAll('.rlNum.gagnante, .rlExterne.gagnante, .rlArete.gagnante'))
      emettre(ecran, 'confetti', boiteDe(ecran, c), 6);
    sfx(gros ? 'bjCaching' : 'bjDing');
  } else if (net < 0) {
    flash(ecran, 'rougeDoux', 120);
    secousse(ecran, 4, 200);
    sfx('bjBuzzer');
  } else sfx('bjDingNeutre');

  if (net !== 0 && connecte()) {
    ajouterPieces(net).then(s => {
      if (s !== null && s !== undefined) { R.solde = s; majTapis(); }
    }).catch(() => { /* resynchronisé à la prochaine ouverture */ });
  }

  // On laisse le temps de LIRE le résultat sur la grande roue avant de rendre
  // le tapis : ramené tout de suite, on ne voit ni la case allumée ni le
  // numéro, seulement un écran qui se réorganise.
  setTimeout(() => {
    $('scr-roulette').classList.remove('lance');
    // L'annonce s'efface en même temps que la roue rapetisse : laissée en
    // place, elle couvrirait les numéros du tapis au moment précis où la case
    // gagnante s'y allume.
    $('rlAnnonce').classList.add('fane');
  }, 1500);
  setTimeout(() => {
    R.tourne = false;
    R.mises.clear();
    for (const c of document.querySelectorAll('.gagnante, .perdante')) c.classList.remove('gagnante', 'perdante');
    majTapis();
  }, 3400);
}


function marquerGagnant(gagnant) {
  const cel = document.querySelector(`.rlNum[data-mise="plein:${gagnant}"]`);
  if (!cel) return;
  cel.classList.add('tombe');
  setTimeout(() => cel.classList.remove('tombe'), 2600);
}

function majHistorique() {
  const el = $('rlHistorique');
  if (!el) return;
  el.innerHTML = '';
  for (const n of R.historique) {
    const s = document.createElement('span');
    s.className = 'rlHisto ' + couleurDe(n);
    s.textContent = n;
    el.appendChild(s);
  }
}

// ---------------------------------------------------------------------------
// Annonce et messages
// ---------------------------------------------------------------------------
function annoncer(texte, couleur, net, meilleur) {
  const el = $('rlAnnonce');
  el.className = 'rlAnnonce ' + couleur + (meilleur >= 8 && net > 0 ? ' jackpot' : '');
  el.innerHTML = `<b>${texte}</b><em>${net > 0 ? '+' + net : net < 0 ? net : 'Mise rendue'}</em>`;
}
function effacerAnnonce() { $('rlAnnonce').className = 'rlAnnonce hidden'; }

let effaceMsg = null;
function message(texte) {
  const el = $('rlMsg');
  if (!el) return;
  el.textContent = texte;
  el.classList.remove('hidden');
  clearTimeout(effaceMsg);
  effaceMsg = setTimeout(() => el.classList.add('hidden'), 2600);
}

// ---------------------------------------------------------------------------
// Ouverture
// ---------------------------------------------------------------------------
export function ouvrirRoulette() {
  if (!connecte()) { messageCasino('Connecte-toi : les pièces vivent sur ton compte.'); return false; }
  R.solde = (Compte.profil && Compte.profil.pieces) || 0;
  if (R.solde < MISE_MIN) {
    messageCasino(`Il te faut au moins ${MISE_MIN} pièces pour miser.`);
    return false;
  }
  R.mises.clear();
  R.tourne = false;
  effacerAnnonce();
  showScreen('roulette');
  // Le canvas ne peut être mesuré qu'une fois l'écran visible : caché, il
  // rapporte une taille nulle et la roue se dessinerait dans un point.
  requestAnimationFrame(() => { calibrerRoue(); dessinerRoue(null); majTapis(); });
  return true;
}

// ---------------------------------------------------------------------------
// Câblage
// ---------------------------------------------------------------------------
(function cabler() {
  if (!$('rlLancer')) return;

  const zone = $('rlSceaux');
  if (zone) for (const [classe, branches, runes] of [['a', 5, 8], ['b', 7, 7], ['c', 5, 12]]) {
    const d = document.createElement('div');
    d.className = 'casSceau ' + classe;
    d.innerHTML = sceau(50, branches, runes);
    zone.appendChild(d);
  }
  const st = $('rlSceauTapis');
  if (st) st.innerHTML = sceau(50, 5, 12);

  construireTapis();
  rayonBille = 0;

  $('rlLancer').addEventListener('click', () => { if (!$('rlLancer').disabled) lancer(); });
  $('rlEffacer').addEventListener('click', () => {
    if (R.tourne) return;
    R.mises.clear(); sfx('select'); majTapis();
  });
  $('rlRejouer').addEventListener('click', () => {
    if (R.tourne || !R.precedentes) return;
    R.mises = new Map([...R.precedentes].map(([k, m]) => [k, { ...m }]));
    sfx('rlJeton'); majTapis();
  });
  $('rlDoubler').addEventListener('click', () => {
    if (R.tourne) return;
    if (totalMise() * 2 > R.solde) { sfx('deny'); message('Pas assez de pièces.'); return; }
    for (const m of R.mises.values()) m.montant *= 2;
    sfx('rlJeton'); majTapis();
  });

  // Espace coupe court à la bille. Une roulette s'enchaîne, et la durée d'une
  // animation ne doit jamais être le prix d'une décision.
  window.addEventListener('keydown', ev => {
    if (ev.code !== 'Space') return;
    if ($('scr-roulette').classList.contains('hidden')) return;
    ev.preventDefault();
    if (anim) sauter = true;
  }, true);

  window.addEventListener('resize', () => {
    if ($('scr-roulette').classList.contains('hidden')) return;
    calibrerRoue(); dessinerRoue(null);
  });
})();
