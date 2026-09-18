import { $ } from '../core/dom.js';
import { CHARS, ROSTER } from '../data/characters.js';
import { initAudio, sfx } from '../audio/audio.js';
import { getSkinId, drawSkinDisc, tracerContour, deformationDisque } from '../data/skins.js';
import { proposerTutoSiPremiereFois } from './menus.js';
import { arriveeMenu, dureeArrivee, jouerArriveeMenu, R_MENU } from './menu-titre.js';

// ---------------------------------------------------------------------------
// Intro « passe du roster », jouée à chaque lancement avant le menu.
//
// Trois persos tirés au sort se passent le disque, chacun dans une bande en
// biais à ses couleurs. Le troisième tire vers l'écran : flash, le logo
// claque au centre puis file se garer sur celui du menu, pendant que le perso
// entre par la droite et que les tuiles arrivent. Le dernier perso de la
// passe est celui qui reste sur le menu.
//
// Réglages validés : mockups/intro-roster.reglages.json (mockup
// mockups/intro-roster.html). Tout est animé par la Web Animations API, en
// translate / scale / opacity uniquement. Un clic ou une touche passe l'intro
// à tout moment, par un fondu court plutôt qu'une coupure.
// ---------------------------------------------------------------------------

const R = {
  angle:-14, relief:.28, contourPerso:.45, ombrePerso:.9, parallaxePerso:1.15, elan:1.8, recul:1.3, mainX:92, mainY:56,
  nomLargeurMax:78, parallaxeNom:.85, retardNom:.05, perspective:.55, courbe:.2, fantomes:6, espacement:16,
  ouverture:.46, avantLancer:.16, vol:.46, poussee:.38, traits:.3, tenue:.2, dernierLancer:.42,
  flashTenue:.12, tremblementImpact:1.8, ondeTaille:3.6, logoImpact:1.5, tenueLogo:.45, volLogo:.55,
  retardHeros:.1, arriveeHeros:.55, retardBoutons:.16, tremblement:.9, tremblementDuree:.16, rapprochement:1.1,
  flash:1, parallaxeFond:.22, tailleDisque:8.5,
};
const PLACEMENT = { bande:{ y:50, s:1 }, perso:{ x:13, y:36, s:1 }, nom:{ x:45, y:31, s:1 } };
const POUSSE = 'cubic-bezier(.6,0,.4,1)', REBOND = 'cubic-bezier(.2,1.3,.4,1)';
const FRAMES = ['idle', 'dash', 'dive', 'throw'];
const GRACE = 700;   // un clic parasite au tout début du chargement ne passe pas l'intro

const scr = $('scr-intro');
const titre = $('scr-title');
let etat = 'attente';          // attente → lecture → fini
let anims = [], minuteurs = [], debut = 0, FIN_DISQUE = 0;
let q = {};                    // éléments de l'intro

const plus_tard = (ms, fn) => minuteurs.push(setTimeout(fn, ms));
function melange(hex, vers, k) {
  const a = parseInt(hex.slice(1), 16), b = parseInt(vers.slice(1), 16);
  const c = s => Math.round(((a >> s) & 255) * (1 - k) + ((b >> s) & 255) * k);
  return `rgb(${c(16)},${c(8)},${c(0)})`;
}

/* ================= CONSTRUCTION ================= */
function construire(persos) {
  const ligneFiligrane = '<div class="line">SWAG FRISBEE CLUB SWAG FRISBEE CLUB SWAG FRISBEE CLUB </div>';
  scr.innerHTML = `
    <div class="introFond"></div>
    <div class="secousse">
      <div class="fondRayures"></div>
      <div class="fondFiligrane"><div class="watermark">${ligneFiligrane.repeat(6)}</div></div>
      <div class="camera">
        <div class="cameraZoom">
          <div class="plans"></div>
          <div class="axe axeLigne" style="z-index:9"><div class="traits"></div><div class="ligne"></div></div>
          <div class="vignette"></div>
        </div>
        <div class="disqueCouche"><div class="reflets"></div>
          <div class="disque"><div class="disqueTour"><canvas width="384" height="384"></canvas></div></div></div>
      </div>
      <img class="logoVol" src="assets/logo.png" alt="">
      <canvas class="heroVol" width="256" height="320"></canvas>
      <div class="onde"></div>
    </div>
    <div class="flash"></div>`;
  const s = sel => scr.querySelector(sel);
  q = { fond: s('.introFond'), secousse: s('.secousse'), filigrane: s('.fondFiligrane'), camera: s('.camera'), zoom: s('.cameraZoom'),
    axeLigne: s('.axeLigne'), traits: s('.traits'), ligne: s('.ligne'), couche: s('.disqueCouche'), reflets: s('.reflets'),
    disque: s('.disque'), disqueCv: s('.disque canvas'), logoVol: s('.logoVol'), heroVol: s('.heroVol'), onde: s('.onde'), flash: s('.flash') };

  q.plans = persos.map((ck, i) => {
    const el = document.createElement('div');
    el.className = 'plan' + (i % 2 ? ' miroir' : '');
    el.style.zIndex = i + 1;
    const c = CHARS[ck];
    const mot = c.universe.toUpperCase() + ' · ', repet = Math.max(2, Math.ceil(28 / mot.length));
    el.innerHTML = `
      <div class="axe"><div class="bande"><div class="filigrane"><span>${mot.repeat(repet)}</span><span>${mot.repeat(repet)}</span></div>
        <div class="joint g"></div><div class="joint d"></div></div></div>
      <div class="perso"><div class="persoGlisse"><div class="persoPose">${FRAMES.map(f => `<canvas data-frame="${f}"></canvas>`).join('')}</div></div></div>
      <div class="nom"><div class="nomGlisse"><div class="nomSlam"><div class="nomBloc">
        <div class="nomTexte"></div><div><span class="univers"></span></div></div></div></div></div>`;
    el.style.setProperty('--c1', c.color);
    el.style.setProperty('--c2', c.accent);
    el.style.setProperty('--cClair', melange(c.color, '#ffffff', R.relief));
    el.style.setProperty('--cSombre', melange(c.color, '#000000', R.relief * 1.3));
    el.querySelector('.nomTexte').textContent = c.name.toUpperCase();
    el.querySelector('.univers').textContent = c.universe.toUpperCase();
    s('.plans').appendChild(el);
    return {
      i, ck, el, miroir: i % 2 === 1, axe: el.querySelector('.axe'), bande: el.querySelector('.bande'),
      perso: el.querySelector('.perso'), persoGlisse: el.querySelector('.persoGlisse'), persoPose: el.querySelector('.persoPose'),
      frames: Object.fromEntries(FRAMES.map(f => [f, el.querySelector(`canvas[data-frame="${f}"]`)])),
      nom: el.querySelector('.nom'), nomGlisse: el.querySelector('.nomGlisse'), nomSlam: el.querySelector('.nomSlam'),
      nomBloc: el.querySelector('.nomBloc'), nomTexte: el.querySelector('.nomTexte'), univers: el.querySelector('.univers'),
    };
  });

  // Le perso du menu est le dernier de la passe, dessiné comme le fait le menu (×16).
  const src = CHARS[persos[2]].frames.idle;
  for (const cv of [$('titleHero'), q.heroVol]) {
    cv.width = src.width * 16; cv.height = src.height * 16;
    const g = cv.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, cv.width, cv.height);
  }
}

/* Sprite agrandi d'un nombre entier de pixels écran par pixel de sprite, contour
   et ombre dessinés une fois (silhouette dilatée par neuf copies décalées). */
function rendreFrames(pl, n, m, o, dpr) {
  const src = CHARS[pl.ck].frames, w = 16 * n, h = 20 * n;
  for (const fr of FRAMES) {
    const cv = pl.frames[fr];
    cv.width = w + 2 * m + o; cv.height = h + 2 * m + o;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const sp = document.createElement('canvas'); sp.width = w; sp.height = h;
    const s = sp.getContext('2d'); s.imageSmoothingEnabled = false;
    if (pl.miroir) { s.translate(w, 0); s.scale(-1, 1); }
    s.drawImage(src[fr] || src.idle, 0, 0, 16, 20, 0, 0, w, h);
    const dil = document.createElement('canvas'); dil.width = w + 2 * m; dil.height = h + 2 * m;
    const d = dil.getContext('2d'); d.imageSmoothingEnabled = false;
    const decal = m ? [[0,0],[m,0],[-m,0],[0,m],[0,-m],[m,m],[m,-m],[-m,m],[-m,-m]] : [[0,0]];
    for (const [dx, dy] of decal) d.drawImage(sp, m + dx, m + dy);
    d.globalCompositeOperation = 'source-in'; d.fillStyle = '#111318'; d.fillRect(0, 0, dil.width, dil.height);
    if (o) { g.globalAlpha = .34; g.drawImage(dil, o, o); g.globalAlpha = 1; }
    if (m) g.drawImage(dil, 0, 0);
    g.drawImage(sp, m, m);
    cv.style.width = cv.width / dpr + 'px'; cv.style.height = cv.height / dpr + 'px';
  }
}

/* ================= MISE EN PAGE =================
   Les plans en miroir prennent le reflet par le centre de la bande (elle est
   inclinée : un miroir gauche/droite poserait le perso hors de sa bande). */
function miseEnPage() {
  const Wp = scr.clientWidth, Hp = scr.clientHeight;
  const cqh = Hp / 100, dpr = window.devicePixelRatio || 1;
  const ang = R.angle * Math.PI / 180, ux = Math.cos(ang), uy = Math.sin(ang);
  const cx = Wp / 2, cy = Hp * PLACEMENT.bande.y / 100;
  const T = 46 * cqh * PLACEMENT.bande.s, L = 200 * cqh;
  scr.style.setProperty('--L', L + 'px'); scr.style.setProperty('--T', T + 'px');
  for (const ax of [...q.plans.map(p => p.axe), q.axeLigne]) {
    ax.style.left = cx + 'px'; ax.style.top = cy + 'px'; ax.style.rotate = R.angle + 'deg';
  }
  const n = Math.max(1, Math.round(40 * cqh * PLACEMENT.perso.s * dpr / 20));
  const wC = 16 * n / dpr, hC = 20 * n / dpr;
  const m = Math.round(R.contourPerso * cqh * dpr), o = Math.round(R.ombrePerso * cqh * dpr);
  const mains = [];
  for (const pl of q.plans) {
    rendreFrames(pl, n, m, o, dpr);
    let x = Wp * PLACEMENT.perso.x / 100, y = Hp * PLACEMENT.perso.y / 100;
    if (pl.miroir) { x = Wp - x - wC; y = 2 * cy - y - hC; }
    x = Math.round(x * dpr) / dpr; y = Math.round(y * dpr) / dpr;
    pl.perso.style.left = (x - m / dpr) + 'px'; pl.perso.style.top = (y - m / dpr) + 'px';
    const mx = R.mainX / 100, my = R.mainY / 100;
    mains.push({ x: x + (pl.miroir ? 1 - mx : mx) * wC, y: y + my * hC });
    const fs = 7 * cqh * PLACEMENT.nom.s;
    pl.nomTexte.style.fontSize = fs + 'px';
    const maxW = R.nomLargeurMax * cqh * PLACEMENT.nom.s, w0 = pl.nomTexte.scrollWidth;
    if (w0 > maxW) pl.nomTexte.style.fontSize = (fs * maxW / w0) + 'px';
    const bw = pl.nomBloc.offsetWidth, bh = pl.nomBloc.offsetHeight;
    let nx = Wp * PLACEMENT.nom.x / 100, ny = Hp * PLACEMENT.nom.y / 100;
    if (pl.miroir) { nx = Wp - nx - bw; ny = 2 * cy - ny - bh; }
    pl.nom.style.left = nx + 'px'; pl.nom.style.top = ny + 'px';
  }
  // Cibles sur le vrai menu, mesurées sans le flottement du perso.
  titre.classList.add('sansFlottement');
  const rs = scr.getBoundingClientRect();
  const rl = titre.querySelector('.logoImg').getBoundingClientRect(), rh = $('titleHero').getBoundingClientRect();
  const cibleLogo = { x: rl.left - rs.left, y: rl.top - rs.top, w: rl.width, h: rl.height };
  const cibleHero = { x: rh.left - rs.left, y: rh.top - rs.top, w: rh.width, h: rh.height };
  Object.assign(q.logoVol.style, { left: cibleLogo.x + 'px', top: cibleLogo.y + 'px', width: cibleLogo.w + 'px' });
  Object.assign(q.heroVol.style, { left: cibleHero.x + 'px', top: cibleHero.y + 'px', width: cibleHero.w + 'px', height: cibleHero.h + 'px' });
  return { Wp, Hp, cqh, L, ux, uy, mains, cibleLogo };
}

/* ================= CHRONOLOGIE =================
   Une animation par élément, qui couvre toute la séquence, clés posées aux
   bons instants : elles démarrent toutes ensemble et ne peuvent pas dériver. */
function jouer(G) {
  const O = R.ouverture, V = R.vol, P = Math.min(R.poussee, R.vol - .04), H = R.tenue, F = R.dernierLancer;
  const T = [O + R.avantLancer], C = [null], Ps = [null], Pe = [null];
  for (let k = 1; k < 3; k++) {
    C[k] = T[k - 1] + V; T[k] = C[k] + H;
    Ps[k] = T[k - 1] + (V - P) / 2; Pe[k] = Ps[k] + P;
  }
  const FIN = T[2] + F;
  const T_logo = FIN + .3 + R.tenueLogo, T_logoFin = T_logo + R.volLogo;
  const T_hero = T_logo + R.retardHeros, T_heroFin = T_hero + R.arriveeHeros;
  const T_btn = T_logo + R.retardBoutons;
  const arrivee = arriveeMenu({ logo:false, perso:false });
  const TOTAL = Math.max(T_logoFin, T_heroFin, T_btn + dureeArrivee(arrivee)) + .05;
  const cote = k => (k % 2 === 1 ? 1 : -1);
  const le = (d, p = 1) => `${d * p * G.ux}px ${d * p * G.uy}px`;
  const cqh = G.cqh;

  const frise = (el, pts, delai = 0) => {
    pts = pts.filter(Boolean).sort((a, b) => a[0] - b[0]);
    const kfs = pts.map(([t, props, easing]) => ({ ...props, offset: Math.min(1, Math.max(0, t / TOTAL)), easing: easing || 'linear' }));
    if (kfs[0].offset > 0) kfs.unshift({ ...kfs[0], offset: 0, easing: 'linear' });
    if (kfs[kfs.length - 1].offset < 1) kfs.push({ ...kfs[kfs.length - 1], offset: 1 });
    anims.push(el.animate(kfs, { duration: TOTAL * 1000, fill: 'both', delay: delai }));
  };

  // Caméra : tremblement à chaque réception, rapprochement au dernier lancer.
  const a = R.tremblement * cqh, d = R.tremblementDuree, secousse = [[0, { translate:'0px 0px' }]];
  for (const c of [C[1], C[2]]) {
    secousse.push([c, { translate:'0px 0px' }], [c + d * .18, { translate:`${a}px ${-a * .6}px` }],
      [c + d * .42, { translate:`${-a * .7}px ${a * .5}px` }], [c + d * .7, { translate:`${a * .35}px ${-a * .25}px` }], [c + d, { translate:'0px 0px' }]);
  }
  frise(q.camera, secousse);
  frise(q.zoom, [[0, { scale:'1' }], [T[2], { scale:'1' }, 'cubic-bezier(.5,0,.9,.45)'], [FIN, { scale:String(R.rapprochement) }]]);
  frise(q.zoom, [[0, { opacity:1, visibility:'visible' }], [FIN + .1, { opacity:1, visibility:'visible' }, 'steps(1, end)'],
    [FIN + .11, { opacity:0, visibility:'hidden' }]]);
  // Le fond de l'intro s'efface derrière le flash : le vrai menu est dessous.
  for (const [el, op] of [[q.fond, 1], [q.filigrane, .06], [scr.querySelector('.fondRayures'), .07]]) {
    frise(el, [[0, { opacity:op }], [FIN + .02, { opacity:op }, 'steps(1, end)'], [FIN + .03, { opacity:0 }]]);
  }

  frise(q.ligne, [[0, { scale:'0 1', opacity:1 }, 'cubic-bezier(.2,.8,.3,1)'], [.16, { scale:'1 1', opacity:1 }],
    [Math.max(.17, O * .55), { scale:'1 1', opacity:1 }, 'ease-out'], [Math.max(.2, O * .85), { scale:'1 1', opacity:0 }]]);
  frise(q.plans[0].axe, [[0, { scale:'1 0' }], [.1, { scale:'1 0' }, 'cubic-bezier(.25,1.3,.45,1)'], [Math.max(.14, O * .75), { scale:'1 1' }]]);

  // Le filigrane du fond suit la caméra, les traits de vitesse filent aux glissements.
  let cumul = 0;
  const fond = [[0, { translate:'0px 0px' }]];
  for (let k = 1; k < 3; k++) {
    fond.push([Ps[k], { translate: le(cumul) }, POUSSE]);
    cumul -= cote(k) * G.L * R.parallaxeFond;
    fond.push([Pe[k], { translate: le(cumul) }]);
  }
  frise(q.filigrane.firstElementChild, fond);
  const traits = [[0, { opacity:0, translate:'0px 0px' }]];
  for (let k = 1; k < 3; k++) {
    const vers = -cote(k) * G.L * .35;
    traits.push([Ps[k], { opacity:0, translate:`${-vers}px 0px` }], [(Ps[k] + Pe[k]) / 2, { opacity:R.traits, translate:'0px 0px' }],
      [Pe[k], { opacity:0, translate:`${vers}px 0px` }]);
  }
  frise(q.traits, traits);

  for (const pl of q.plans) {
    const i = pl.i, f = pl.miroir ? -1 : 1;
    const bande = [];
    if (i === 0) bande.push([0, { translate:'0px 0px' }]);
    else bande.push([0, { translate:`${cote(i) * G.L}px 0px` }], [Ps[i], { translate:`${cote(i) * G.L}px 0px` }, POUSSE], [Pe[i], { translate:'0px 0px' }]);
    if (i < 2) bande.push([Ps[i + 1], { translate:'0px 0px' }, POUSSE], [Pe[i + 1], { translate:`${-cote(i + 1) * G.L}px 0px` }]);
    frise(pl.bande, bande);

    const glisse = (p, arriveeT) => {
      const pts = [];
      if (i === 0) pts.push([0, { translate:'0px 0px', opacity:1 }]);
      else pts.push([0, { translate: le(cote(i) * G.L, p), opacity:0 }], [Ps[i], { translate: le(cote(i) * G.L, p), opacity:0 }, 'steps(1, start)'],
        [Ps[i] + .001, { translate: le(cote(i) * G.L, p), opacity:1 }, POUSSE], [arriveeT, { translate:'0px 0px', opacity:1 }]);
      if (i < 2) pts.push([Ps[i + 1], { translate:'0px 0px', opacity:1 }, POUSSE], [Pe[i + 1], { translate: le(-cote(i + 1) * G.L, p), opacity:1 }, 'steps(1, end)'],
        [Pe[i + 1] + .001, { translate: le(-cote(i + 1) * G.L, p), opacity:0 }]);
      return pts;
    };
    const persoPts = glisse(R.parallaxePerso, Pe[i] ?? 0);
    if (i === 0) {
      const enBas = { translate:`0px ${G.Hp * .75}px`, opacity:1 };
      persoPts.splice(0, 1, [0, enBas], [O * .3, enBas, REBOND], [O + .02, { translate:'0px 0px', opacity:1 }]);
    }
    frise(pl.persoGlisse, persoPts);
    const arriveeNom = (Pe[i] ?? 0) + R.retardNom;
    frise(pl.nomGlisse, glisse(R.parallaxeNom, arriveeNom));
    if (i === 0) frise(pl.nomSlam, [[0, { scale:'1.9', opacity:0 }], [O * .45, { scale:'1.9', opacity:0 }, 'cubic-bezier(.3,1.2,.5,1)'], [O + .1, { scale:'1', opacity:1 }]]);
    else frise(pl.nomSlam, [[0, { scale:'1', opacity:1 }], [arriveeNom - .02, { scale:'1', opacity:1 }, 'ease-out'],
      [arriveeNom + .05, { scale:'1.12', opacity:1 }, 'ease-in-out'], [arriveeNom + .2, { scale:'1', opacity:1 }]]);
    const pop = i === 0 ? O + .02 : arriveeNom + .02;
    frise(pl.univers, [[0, { scale:'0' }], [pop, { scale:'0' }, 'cubic-bezier(.2,1.7,.4,1)'], [pop + .18, { scale:'1' }]]);

    const elan = R.elan * cqh, recul = R.recul * cqh, pose = [[0, { translate:'0px 0px' }]];
    if (i >= 1) {
      const c = C[i], retour = Math.max(c + .07, Math.min(c + .2, T[i] - .06));
      pose.push([c - .005, { translate:'0px 0px' }, 'cubic-bezier(.2,.9,.3,1)'], [c + .05, { translate:`${-f * recul}px 0px` }, 'ease-in-out'], [retour, { translate:'0px 0px' }]);
    }
    pose.push([T[i] - .06, { translate:'0px 0px' }, 'cubic-bezier(.3,0,.2,1)'], [T[i] + .03, { translate:`${f * elan}px 0px` }, 'ease-out'], [T[i] + .24, { translate:'0px 0px' }]);
    frise(pl.persoPose, pose);

    const suite = i === 0 ? [[0, 'idle'], [T[0] - .04, 'throw']]
      : [[0, 'dash'], [C[i], 'dive'], [C[i] + .12, 'idle'], [T[i] - .04, 'throw']].filter(([t, nom], j, tab) => nom !== 'idle' || t < tab[j + 1][0]);
    for (const fr of FRAMES) frise(pl.frames[fr], suite.map(([t, nom]) => [t, { opacity: nom === fr ? 1 : 0 }, 'steps(1, end)']));
  }

  // Disque : de main en main, puis droit vers l'écran.
  const M = G.mains, persp = R.perspective, N = 18;
  const S = (x, y, s, sy) => ({ translate:`${x}px ${y}px`, scale:`${s} ${s * sy}` });
  const vol = [[0, S(M[0].x, M[0].y, 0, persp)], [O - .04, S(M[0].x, M[0].y, 0, persp), 'cubic-bezier(.2,1.7,.4,1)'], [O + .12, S(M[0].x, M[0].y, 1, persp)]];
  const enVol = [];
  for (let k = 1; k < 3; k++) {
    const p0 = M[k - 1], p1 = M[k], t0 = T[k - 1], t1 = C[k];
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dist = Math.hypot(dx, dy) || 1;
    let nx = -dy / dist, ny = dx / dist;
    if (ny > 0) { nx = -nx; ny = -ny; }
    const qx = (p0.x + p1.x) / 2 + nx * dist * R.courbe, qy = (p0.y + p1.y) / 2 + ny * dist * R.courbe;
    vol.push([t0, S(p0.x, p0.y, 1, persp)]);
    for (let j = 1; j <= N; j++) {
      const u = j / N, e = u * .35 + (1 - (1 - u) * (1 - u)) * .65;
      vol.push([t0 + u * (t1 - t0), S((1 - e) * (1 - e) * p0.x + 2 * (1 - e) * e * qx + e * e * p1.x,
        (1 - e) * (1 - e) * p0.y + 2 * (1 - e) * e * qy + e * e * p1.y, 1, persp)]);
    }
    enVol.push([t0, t1]);
  }
  const sFin = Math.hypot(G.Wp, G.Hp) * 1.15 / (R.tailleDisque * cqh);
  vol.push([T[2], S(M[2].x, M[2].y, 1, persp)]);
  for (let j = 1; j <= N; j++) {
    const u = j / N, e = u * u;
    vol.push([T[2] + u * F, S(M[2].x + (G.Wp / 2 - M[2].x) * e, M[2].y + (G.Hp / 2 - M[2].y) * e,
      1 + (sFin - 1) * Math.pow(u, 3.2), persp + (1 - persp) * u * u)]);
  }
  enVol.push([T[2], FIN]);
  frise(q.disque, vol);
  frise(q.couche, [[0, { opacity:1 }], [FIN + .12, { opacity:1 }, 'steps(1, end)'], [FIN + .13, { opacity:0 }]]);
  for (let j = 1; j <= R.fantomes; j++) {
    const r = document.createElement('div');
    r.className = 'reflet';
    q.reflets.appendChild(r);
    const alpha = .5 * (1 - (j - 1) / R.fantomes), retard = j * R.espacement;
    frise(r, vol.map(([t, p, e]) => [t, { ...p, scale: p.scale.split(' ').map(v => +v * (1 - j * .05)).join(' ') }, e]), retard);
    const op = [[0, { opacity:0 }]];
    for (const [t0, t1] of enVol) op.push([t0, { opacity:0 }], [t0 + .04, { opacity:alpha }], [t1 - .03, { opacity:alpha }], [t1, { opacity:0 }]);
    frise(r, op, retard);
  }

  // Impact : flash, secousse de tout l'écran (menu compris), onde de choc.
  frise(q.flash, [[0, { opacity:0 }], [FIN - .03, { opacity:0 }, 'ease-out'], [FIN + .01, { opacity:R.flash }],
    [FIN + .01 + R.flashTenue, { opacity:R.flash }, 'cubic-bezier(.2,.6,.3,1)'], [FIN + .6, { opacity:0 }]]);
  const ai = R.tremblementImpact * cqh;
  const choc = [[0, { translate:'0px 0px' }], [FIN, { translate:'0px 0px' }],
    [FIN + .05, { translate:`${-ai}px ${ai * .5}px` }], [FIN + .12, { translate:`${ai * .8}px ${-ai * .6}px` }],
    [FIN + .2, { translate:`${-ai * .45}px ${ai * .3}px` }], [FIN + .32, { translate:'0px 0px' }]];
  frise(q.secousse, choc);
  frise(titre, choc);
  frise(q.onde, [[0, { opacity:0, scale:'.15' }], [FIN, { opacity:0, scale:'.15' }, 'steps(1, end)'],
    [FIN + .02, { opacity:.9, scale:'.2' }, 'cubic-bezier(.1,.75,.3,1)'], [FIN + .6, { opacity:0, scale:String(R.ondeTaille) }]]);

  // Logo : claque au centre, s'écrase, rebondit, attend, file se garer sur celui du menu.
  const CL = G.cibleLogo, gr = R.logoImpact;
  const auCentre = `${G.Wp / 2 - (CL.x + CL.w / 2)}px ${G.Hp / 2 - (CL.y + CL.h / 2)}px`;
  frise(q.logoVol, [
    [0, { opacity:0, translate:auCentre, scale:`${gr * 1.3} ${gr * 1.42}` }],
    [FIN, { opacity:0, translate:auCentre, scale:`${gr * 1.3} ${gr * 1.42}` }, 'steps(1, end)'],
    [FIN + .01, { opacity:1, translate:auCentre, scale:`${gr * 1.3} ${gr * 1.42}` }, 'cubic-bezier(.2,.9,.3,1)'],
    [FIN + .14, { opacity:1, translate:auCentre, scale:`${gr * 1.06} ${gr * .9}` }, 'cubic-bezier(.3,1.4,.5,1)'],
    [FIN + .3, { opacity:1, translate:auCentre, scale:`${gr} ${gr}` }],
    [T_logo, { opacity:1, translate:auCentre, scale:`${gr} ${gr}` }, 'cubic-bezier(.55,0,.2,1)'],
    [T_logoFin, { opacity:1, translate:'0px 0px', scale:'1 1' }, 'steps(1, end)'],
    [T_logoFin + .005, { opacity:0, translate:'0px 0px', scale:'1 1' }],
  ]);
  frise(titre.querySelector('.logoImg'), [[0, { opacity:0 }], [T_logoFin, { opacity:0 }, 'steps(1, end)'], [T_logoFin + .005, { opacity:1 }]]);

  // Le perso qui vient de tirer entre par la droite et se pose à sa place.
  const dehors = `${G.Wp * .5}px ${G.Hp * .1}px`;
  frise(q.heroVol, [
    [0, { opacity:0, translate:dehors, scale:'1.06' }],
    [T_hero, { opacity:0, translate:dehors, scale:'1.06' }, 'steps(1, end)'],
    [T_hero + .005, { opacity:1, translate:dehors, scale:'1.06' }, 'cubic-bezier(.2,.9,.25,1.06)'],
    [T_heroFin, { opacity:1, translate:'0px 0px', scale:'1' }, 'steps(1, end)'],
    [T_heroFin + .005, { opacity:0, translate:'0px 0px', scale:'1' }],
  ]);
  frise($('titleHero'), [[0, { opacity:0 }], [T_heroFin, { opacity:0 }, 'steps(1, end)'], [T_heroFin + .005, { opacity:1 }]]);
  frise(titre.querySelector('.halo'), [[0, { opacity:0 }], [T_heroFin - .18, { opacity:0 }, 'ease-out'], [T_heroFin + .12, { opacity:1 }]]);

  // Tuiles, phrase, barre du haut : l'arrivée du menu, lancée au départ des tuiles.
  for (const dsc of arrivee) {
    anims.push(dsc.el.animate(dsc.kf, { delay:(T_btn + dsc.depart) * 1000, duration:dsc.duree * 1000, easing:dsc.easing, fill:'both' }));
  }

  // Sons, calés sur l'image.
  const sons = [
    [0, 'swish'], [.12, 'dash'], [T[0], 'throw'], [Ps[1], 'swish'], [C[1], 'catch'], [T[1], 'throw'],
    [Ps[2], 'swish'], [C[2], 'catch'], [T[2], 'superthrow'], [FIN, 'bigbounce'], [FIN + .04, 'go'], [T_hero, 'dash'],
    ...arrivee.filter(x => x.el.classList?.contains('tuile') && x.el.closest('.rangModes')).map((_, i) => [T_btn + R_MENU.debutTuiles + i * R_MENU.decalageTuiles, 'move']),
  ];
  for (const [t, n] of sons) plus_tard(t * 1000, () => sfx(n, false, true));

  // Le disque est redessiné à chaque image tant qu'il est à l'écran (skins animés).
  FIN_DISQUE = performance.now() + (FIN + .15) * 1000;
  const g = q.disqueCv.getContext('2d'), id = getSkinId();
  (function dessiner() {
    if (etat !== 'lecture' || performance.now() > FIN_DISQUE) return;
    g.clearRect(0, 0, 384, 384);
    drawSkinDisc(g, 192, 192, 164, id, performance.now() / 1000 * 4);
    g.save(); tracerContour(g, 192, 192, 164, deformationDisque(id)); g.lineWidth = 26; g.strokeStyle = '#111318'; g.stroke(); g.restore();
    requestAnimationFrame(dessiner);
  })();

  plus_tard(T_heroFin * 1000 + 30, () => titre.classList.remove('sansFlottement'));
  plus_tard(TOTAL * 1000, terminer);
}

/* ================= FIN ET PASSAGE ================= */
function nettoyer() {
  minuteurs.forEach(clearTimeout); minuteurs = [];
  // Les animations qui touchaient au menu sont retirées : il retrouve son état
  // normal, identique à la dernière image de l'intro.
  anims.forEach(a => a.cancel()); anims = [];
  titre.classList.remove('sansFlottement');
}
function terminer() {
  if (etat === 'fini') return;
  etat = 'fini';
  nettoyer();
  clore();
}
function clore() {
  scr.classList.add('done');
  scr.innerHTML = '';
  window.removeEventListener('resize', passer);
  // Tout premier lancement : on propose le tutoriel, une fois l'intro passée.
  proposerTutoSiPremiereFois();
}
// Passer : fondu court de l'intro, et le menu se monte d'un coup dessous.
function passer() {
  if (etat !== 'lecture') return;
  etat = 'fini';
  nettoyer();
  jouerArriveeMenu();
  scr.style.pointerEvents = 'none';
  let clos = false;
  const fermer = () => {
    if (clos) return;
    clos = true;
    scr.getAnimations().forEach(a => a.cancel());
    scr.style.pointerEvents = '';
    clore();
  };
  scr.animate([{ opacity:1 }, { opacity:0 }], { duration:280, easing:'ease-out', fill:'forwards' }).finished.then(fermer, fermer);
  // Onglet en arrière-plan : le navigateur ne dessine plus, le fondu n'avance
  // pas. Le minuteur, lui, tourne toujours.
  setTimeout(fermer, 350);
}

function geste(e) {
  if (etat === 'fini') return;
  if (e.type === 'keydown') {
    // L'intro garde le clavier pour elle : sans ça, Entrée validerait aussi la
    // tuile sélectionnée du menu caché dessous.
    e.preventDefault(); e.stopImmediatePropagation();
  }
  initAudio();
  if (etat !== 'lecture' || performance.now() - debut < GRACE) return;
  passer();
}

export async function lancerIntro() {
  debut = performance.now();
  const sac = [...ROSTER], persos = [0, 1, 2].map(() => sac.splice((Math.random() * sac.length) | 0, 1)[0]);
  construire(persos);
  titre.classList.add('sansFlottement');
  scr.addEventListener('pointerdown', geste);
  // Les mockups qui chargent le jeu en fond passent l'intro par un simple clic.
  scr.addEventListener('click', geste);
  window.addEventListener('keydown', geste, true);
  // Le son démarre dès l'ouverture si le navigateur le permet ; sinon au
  // premier clic ou à la première touche.
  initAudio();
  // Les noms se mesurent avec leur vraie police : on l'attend un instant.
  await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]);
  if (etat === 'fini') return;
  etat = 'lecture';
  jouer(miseEnPage());
  window.addEventListener('resize', passer);
}
