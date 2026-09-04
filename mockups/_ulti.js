// ---------------------------------------------------------------------------
// LA BOÎTE À OUTILS DES MOCKUPS D'ULTIME.
//
// Le mockup de White Tiger a fait naître tout ça pièce par pièce, et le second
// ultime allait les recopier. Un outil recopié est un outil qui diverge : la
// visionneuse de l'un aurait fini par ne plus se régler comme celle de l'autre,
// et les leçons apprises sur le premier ne seraient pas arrivées au second.
//
// Ce que ça contient : le terrain réel importé de maps.js, les personnages et
// le disque, les courbes d'accélération, les effets lumineux, et la
// VISIONNEUSE — la barre de lecture qui permet de regarder une action de deux
// secondes au ralenti, image par image.
// ---------------------------------------------------------------------------
import { MAPS } from '../js/data/maps.js';

export const TAU = Math.PI * 2;
export const ARENE = MAPS[0];
export const CT = ARENE.court;
export const CW = CT.right - CT.left, CH = CT.bottom - CT.top;
export const CXX = (CT.left + CT.right) / 2, CYY = (CT.top + CT.bottom) / 2;
export const GOAL_H = ARENE.goal.height, GOAL_D = ARENE.goal.depth;
export const TH = ARENE.theme;

// Le terrain, dessiné à partir des vraies mesures du jeu. Un ultime jugé sur un
// rectangle inventé ne dit rien de sa portée réelle.
export function terrain(g, W, H) {
  const e = Math.min(W / (CW + 2 * GOAL_D + 40), H / (CH + 40));
  const ox = (W - CW * e) / 2, oy = (H - CH * e) / 2;
  const X = x => ox + (x - CT.left) * e, Y = y => oy + (y - CT.top) * e;

  g.fillStyle = TH.bgOuter; g.fillRect(0, 0, W, H);
  g.fillStyle = TH.bgInner;
  g.fillRect(X(CT.left) - GOAL_D * e, Y(CT.top) - 8, CW * e + GOAL_D * 2 * e, CH * e + 16);
  g.fillStyle = TH.floor; g.fillRect(X(CT.left), Y(CT.top), CW * e, CH * e);

  g.strokeStyle = TH.line; g.lineWidth = Math.max(1, 2 * e);
  g.strokeRect(X(CT.left), Y(CT.top), CW * e, CH * e);
  g.beginPath(); g.moveTo(X(CXX), Y(CT.top)); g.lineTo(X(CXX), Y(CT.bottom)); g.stroke();
  g.beginPath(); g.arc(X(CXX), Y(CYY), 58 * e, 0, TAU); g.stroke();

  for (const side of [1, 2]) {
    const gx = side === 1 ? CT.left - GOAL_D : CT.right;
    for (const z of ARENE.zones) {
      g.globalAlpha = .5; g.fillStyle = z.color;
      g.fillRect(X(gx), Y(CYY + z.from), GOAL_D * e, (z.to - z.from) * e);
      g.globalAlpha = 1;
      g.strokeStyle = TH.goalStroke; g.lineWidth = 1;
      g.strokeRect(X(gx), Y(CYY + z.from), GOAL_D * e, (z.to - z.from) * e);
    }
    g.strokeStyle = TH.goalStroke; g.lineWidth = Math.max(1, 2 * e);
    g.strokeRect(X(gx), Y(CYY - GOAL_H / 2), GOAL_D * e, GOAL_H * e);
  }
  return { e, X, Y };
}

export function perso(g, sprite, x, y, vue, face, alpha = 1) {
  const { e, X, Y } = vue;
  const w = 48 * 1.6 * e, h = 60 * 1.6 * e;
  g.save(); g.imageSmoothingEnabled = false; g.globalAlpha = alpha;
  g.translate(X(x), Y(y));
  if (face < 0) g.scale(-1, 1);
  g.drawImage(sprite, -w / 2, -h + 10 * e, w, h);
  g.restore();
}

export function disque(g, x, y, vue, r = 11) {
  const { e, X, Y } = vue;
  g.save(); g.translate(X(x), Y(y));
  g.fillStyle = '#35e0ff';
  g.beginPath(); g.ellipse(0, 0, r * e, r * e * .42, 0, 0, TAU); g.fill();
  g.strokeStyle = '#bff2ff'; g.lineWidth = 1.4; g.stroke(); g.restore();
}

/* ===================== LES COURBES ===================== */
export const easeOut = k => 1 - Math.pow(1 - k, 3);
export const easeIn = k => k * k * k;
export const easeInOut = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
// Depassement leger a l'arrivee : la forme grossit un peu trop puis se cale.
export const easeBack = k => { const c = 1.9; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
// Hasard DETERMINISTE : la meme particule garde sa place d'une image a l'autre,
// et une carte figee rend exactement ce que l'apercu montre au meme instant.
// Sans lui, deux machines en ligne verraient deux animations differentes.
export const alea = i => { const v = Math.sin(i * 12.9898) * 43758.5453; return v - Math.floor(v); };

/* ===================== LES EFFETS ===================== */
// Tout se dessine en mode `lighter` : les lumieres s'AJOUTENT au lieu de se
// recouvrir, ce qui donne un coeur clair la ou elles se superposent. C'est la
// difference entre un effet pose SUR l'image et un effet qui l'eclaire.
export function lueur(g, x, y, r, coul, alpha) {
  if (alpha <= 0 || r <= 0) return;
  const d = g.createRadialGradient(x, y, 0, x, y, r);
  d.addColorStop(0, coul); d.addColorStop(1, 'rgba(0,0,0,0)');
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.fillStyle = d; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
}

export function anneau(g, x, y, rx, ry, alpha, coul, ep) {
  if (alpha <= 0 || rx <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.strokeStyle = coul; g.lineWidth = ep;
  g.beginPath(); g.ellipse(x, y, rx, Math.max(1, ry), 0, 0, TAU); g.stroke(); g.restore();
}

export function etincelle(g, x, y, t, alpha, coul) {
  if (alpha <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.strokeStyle = coul; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x - t, y); g.lineTo(x + t, y);
  g.moveTo(x, y - t); g.lineTo(x, y + t); g.stroke(); g.restore();
}

// Une decharge crepitante : une ligne brisee dont les cassures sont
// deterministes, sinon elle scintille sans repos d'une image a l'autre.
export function arc(g, x, y, r, graine, alpha, coul) {
  if (alpha <= 0) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = alpha;
  g.strokeStyle = coul; g.lineWidth = 1.6; g.beginPath();
  const a0 = alea(graine) * TAU;
  let px = x + Math.cos(a0) * r, py = y + Math.sin(a0) * r * .6;
  g.moveTo(px, py);
  for (let i = 1; i <= 4; i++) {
    const a = a0 + (alea(graine + i) - .5) * 1.6;
    const rr = r * (1 - i * .18) * (.6 + alea(graine + i + 20) * .8);
    px = x + Math.cos(a) * rr; py = y + Math.sin(a) * rr * .6;
    g.lineTo(px, py);
  }
  g.stroke(); g.restore();
}

/* ===================== LA VISIONNEUSE ===================== */
// C'est une visionneuse, pas une boucle qu'on subit. Une action de deux
// secondes qui tourne en rond ne se juge pas : on ne voit ni l'arrêt sur image
// du déclenchement, ni ce qui change quand on clique une carte — le choix
// s'applique bien, mais son effet passe en un quart de seconde pendant qu'on
// lit la description d'à côté.
//
// o.phases : [{nom, detail}] — les cases de la frise, qui sert de chapitrage.
// o.duree  : () => durée totale en secondes, recalculée à chaque image parce
//            qu'un choix peut la changer.
// o.depart : () => [t0, t1, …] le début de chaque phase.
// o.jouer  : (g, t, W, H) => l'indice de la phase en cours.
export function visionneuse(o) {
  const { hote, cv, phases, duree, depart, jouer } = o;
  const g = cv.getContext('2d');
  const PAS = 1 / 60;                      // une image, a soixante par seconde

  hote.innerHTML =
    '<div class="frise"></div>' +
    '<div class="lect">' +
      '<button class="bt bPlay">&#9208; pause</button>' +
      '<button class="bt bPrec" title="image precedente">&#9664;</button>' +
      '<button class="bt bSuiv" title="image suivante">&#9654;</button>' +
      '<input type="range" class="scrub" min="0" max="1000" value="0">' +
      '<span class="tps">0.00 s</span>' +
      '<button class="bt vit on" data-v="1">&#215;1</button>' +
      '<button class="bt vit" data-v="0.4">&#215;1/2</button>' +
      '<button class="bt vit" data-v="0.2">&#215;1/5</button>' +
      '<button class="bt vit" data-v="0.05">&#215;1/20</button>' +
    '</div>';

  const friseEl = hote.querySelector('.frise');
  friseEl.innerHTML = phases.map(p =>
    '<div class="ph"><b>' + p.nom + '</b><i>' + p.detail + '</i></div>').join('');
  const elPlay = hote.querySelector('.bPlay');
  const elScrub = hote.querySelector('.scrub');
  const elTps = hote.querySelector('.tps');

  let tv = 0, vitesse = 1, enLecture = true, dernier = performance.now();
  const majPlay = () => { elPlay.innerHTML = enLecture ? '⏸ pause' : '▶ lire'; };

  // Se placer a un instant precis, et s'y ARRETER : on ne se place pas dans une
  // animation qui continue de defiler, on n'aurait rien vu.
  function poser(t) {
    const T = duree();
    tv = ((t % T) + T) % T;
    enLecture = false; majPlay();
  }
  elPlay.onclick = () => { enLecture = !enLecture; majPlay(); };
  hote.querySelector('.bPrec').onclick = () => poser(tv - PAS);
  hote.querySelector('.bSuiv').onclick = () => poser(tv + PAS);
  elScrub.oninput = () => poser(elScrub.value / 1000 * duree());
  hote.querySelectorAll('.vit').forEach(b => {
    b.onclick = () => {
      vitesse = parseFloat(b.dataset.v);
      hote.querySelectorAll('.vit').forEach(x => x.classList.toggle('on', x === b));
      enLecture = true; majPlay();
    };
  });
  // La frise sert de CHAPITRAGE : une case cliquee, on tombe au debut de la
  // phase. Le millieme ajoute evite de retomber pile sur la frontiere.
  [...friseEl.children].forEach((el, i) => {
    el.onclick = () => poser(depart()[i] + .001);
  });
  addEventListener('keydown', ev => {
    if (ev.target.tagName === 'INPUT') return;
    if (ev.code === 'Space') { ev.preventDefault(); enLecture = !enLecture; majPlay(); }
    else if (ev.code === 'ArrowLeft') { ev.preventDefault(); poser(tv - PAS); }
    else if (ev.code === 'ArrowRight') { ev.preventDefault(); poser(tv + PAS); }
  });

  function boucle(now) {
    const dt = Math.min((now - dernier) / 1000, .1);
    dernier = now;
    const T = duree();
    if (enLecture) tv = (tv + dt * vitesse) % T;
    const ph = jouer(g, tv, cv.width, cv.height);
    [...friseEl.children].forEach((el, i) => el.classList.toggle('on', i === ph));
    elScrub.value = Math.round(tv / T * 1000);
    elTps.textContent = tv.toFixed(2) + ' s / ' + T.toFixed(2) + ' s';
    requestAnimationFrame(boucle);
  }
  majPlay();
  requestAnimationFrame(boucle);

  return {
    // Changer de choix relance depuis le debut — sinon on rate l'effet du clic.
    // Sauf en pause : la, on compare deux rendus au MEME instant, et repartir
    // de zero detruirait justement la comparaison.
    relancer: () => { if (enLecture) tv = 0; },
    instant: () => tv
  };
}

// La feuille de style de la visionneuse, posee une seule fois.
export function styleVisionneuse() {
  if (document.getElementById('ultiStyle')) return;
  const s = document.createElement('style');
  s.id = 'ultiStyle';
  s.textContent = `
  .frise{display:flex;gap:3px;margin-top:10px}
  .ph{flex:1 1 0;text-align:center;font-size:9.5px;font-family:Consolas,monospace;cursor:pointer;
      padding:5px 2px;border-radius:5px;background:rgba(255,255,255,.05);color:#8d7fa8;
      border:1px solid transparent;transition:background .1s,color .1s}
  .ph.on{background:rgba(255,255,255,.14);color:#f0e0bc;border-color:#f0e0bc}
  .ph i{display:block;font-style:normal;font-size:8.5px;opacity:.75}
  .lect{display:flex;gap:6px;align-items:center;margin-top:9px;flex-wrap:wrap}
  .lect .bt{background:rgba(255,255,255,.07);color:inherit;border:1px solid rgba(255,255,255,.16);
            border-radius:6px;padding:5px 10px;font-size:11px;cursor:pointer;
            font-family:Consolas,monospace;letter-spacing:.4px}
  .lect .bt:hover{background:rgba(255,255,255,.15)}
  .lect .bt.on{background:rgba(255,255,255,.18);color:#f0e0bc;border-color:#f0e0bc}
  .lect .scrub{flex:1 1 150px;accent-color:#f0e0bc;height:4px;min-width:110px}
  .lect .tps{font-family:Consolas,monospace;font-size:11px;color:#f0e0bc;white-space:nowrap}`;
  document.head.append(s);
}
