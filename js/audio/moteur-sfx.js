// ---------------------------------------------------------------------------
// Moteur des bruitages du match.
//
// Un son n'est plus une ligne de bips : c'est une pile de COUCHES décrites en
// données (un impact grave, un claquement, un souffle, la résonance d'une
// matière…), que l'on peut superposer librement. Le même son se colore ensuite
// selon le contexte :
//   - force   : 0 → 1, la puissance du geste (tir chargé, vitesse du disque) ;
//   - perso   : son poids (grave, lourd) et son grain (clair, sec) ;
//   - map     : la matière des murs et l'acoustique du lieu (réverbération) ;
//   - alea    : une petite variation à chaque fois, pour ne jamais entendre
//               cent fois le même son identique.
//
// Ce module n'importe rien du jeu : il reçoit un AudioContext et une sortie.
// Le hasard est celui du navigateur — c'est du décor sonore, il n'a pas à être
// rejoué à l'identique sur les deux machines d'une partie en ligne.
// ---------------------------------------------------------------------------

// --- Matière des murs et acoustique, par map ------------------------------
// `modes` : partiels [fréquence, durée d'extinction, gain] de la résonance du
// mur au contact du disque. `etouffe` : coupe-haut sur cette résonance (le
// sable avale les aigus). `salle` : réverbération (durée, part, clarté 0-1).
export const MATIERES = {
  arena:    { nom: 'Métal (station)',   etouffe: 9000, modes: [[820, .16, 1], [1370, .11, .6], [2210, .07, .4], [3480, .04, .25]], salle: { duree: .7, part: .16, clair: .8 } },
  dojo:     { nom: 'Bois (dojo)',       etouffe: 5000, modes: [[240, .07, 1], [515, .05, .55], [930, .03, .3]],                     salle: { duree: .5, part: .12, clair: .45 } },
  stadium:  { nom: 'Plexi (stade)',     etouffe: 7000, modes: [[520, .09, 1], [1180, .06, .5], [2400, .03, .25]],                   salle: { duree: 1.5, part: .2, clair: .35 } },
  dune:     { nom: 'Pierre et sable',   etouffe: 1400, modes: [[190, .045, 1], [430, .03, .4]],                                     salle: { duree: .25, part: .05, clair: .2 } },
  polenord: { nom: 'Glace',             etouffe: 12000, modes: [[1600, .26, 1], [2650, .18, .5], [4200, .1, .3]],                   salle: { duree: .9, part: .15, clair: 1 } },
  raccoon:  { nom: 'Tôle et béton',     etouffe: 6000, modes: [[410, .1, 1], [980, .07, .55], [1720, .05, .35]],                    salle: { duree: .8, part: .14, clair: .5 } }
};

// --- Timbre par personnage ---------------------------------------------------
// poids : -1 léger → +1 lourd (abaisse la hauteur, allonge les graves).
// clair : -1 mat → +1 brillant (déplace les filtres de bruit).
export const TIMBRES = {
  naruto:     { poids: -.2, clair: .3 },
  isaac:      { poids: -.5, clair: -.2 },
  leon:       { poids: .45, clair: .1 },
  jingle:     { poids: .2, clair: .6 },
  mamie:      { poids: .1, clair: -.4 },
  chopper:    { poids: .9, clair: -.3 },
  yuki:       { poids: -.7, clair: .5 },
  cyberleek:  { poids: -.3, clair: .8 },
  yoshi:      { poids: -.1, clair: -.1 },
  hollis:     { poids: .3, clair: .4 },
  flowser:    { poids: -.1, clair: .2 },
  fricadelle: { poids: .5, clair: -.2 }
};

// --- Ressources partagées par contexte audio --------------------------------
const cache = new WeakMap();
function res(ac) {
  let r = cache.get(ac);
  if (!r) {
    const n = ac.sampleRate * 2, buf = ac.createBuffer(1, n, ac.sampleRate), ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    r = { bruit: buf, salles: {} };
    cache.set(ac, r);
  }
  return r;
}

// Réponse impulsionnelle synthétique : un bruit stéréo qui s'éteint, lissé
// d'autant plus que la salle est sourde. Une par map, calculée une fois.
function salle(ac, id) {
  const r = res(ac);
  if (r.salles[id]) return r.salles[id];
  const s = (MATIERES[id] || MATIERES.arena).salle;
  const n = Math.max(1, Math.floor(ac.sampleRate * s.duree)), ir = ac.createBuffer(2, n, ac.sampleRate);
  const lisse = 1 - (.15 + .8 * s.clair);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c); let prec = 0;
    for (let i = 0; i < n; i++) {
      const v = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      prec = prec * lisse + v * (1 - lisse); d[i] = prec;
    }
  }
  const conv = ac.createConvolver(); conv.buffer = ir;
  return (r.salles[id] = conv);
}

const lerp = (a, b, t) => a + (b - a) * t;
const hasard = (amp) => (Math.random() * 2 - 1) * amp;

// Enveloppe : montée linéaire `a`, puis extinction exponentielle sur `d`.
function enveloppe(param, t, g, a, d) {
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(Math.max(g, .0002), t + Math.max(a, .001));
  param.exponentialRampToValueAtTime(.0001, t + Math.max(a, .001) + d);
}

// ---------------------------------------------------------------------------
// Jouer une pile de couches.
//   couches  : tableau de couches (voir les types plus bas)
//   ctx      : { force, perso, map, alea }
//   reglage  : { gain, decalage (s), hauteur (demi-tons), longueur (×) }
// ---------------------------------------------------------------------------
export function jouerCouches(ac, sortie, couches, ctx = {}, reglage = {}) {
  if (!ac || !couches) return;
  const force = ctx.force ?? .5;
  const tb = TIMBRES[ctx.perso] || { poids: 0, clair: 0 };
  const mat = MATIERES[ctx.map] || MATIERES.arena;
  const alea = ctx.alea !== false;
  // Variation tirée une fois pour tout le son : les couches bougent ensemble,
  // sinon l'impact et le claquement se désaccordent et le son se désagrège.
  // Un son fait de plusieurs groupes la reçoit toute faite (voir jouerSon).
  const tir = ctx.tirage || tirerVariation(alea);
  const vHauteur = tir.h, vGain = tir.g, vLong = tir.l;
  const hauteur = Math.pow(2, ((reglage.hauteur || 0) + vHauteur - tb.poids * 2.5) / 12);
  const longueur = (reglage.longueur || 1) * vLong * (1 + tb.poids * .12);
  const clair = Math.pow(2, tb.clair * .6);
  const t0 = ac.currentTime + .005 + Math.max(0, reglage.decalage || 0);

  // Bus du son : sec vers la sortie, et un envoi vers la salle de la map.
  const bus = ac.createGain(); bus.gain.value = (reglage.gain ?? 1) * vGain;
  bus.connect(sortie);
  const envoi = ac.createGain(); envoi.gain.value = mat.salle.part * (ctx.salle ?? 1);
  bus.connect(envoi); envoi.connect(salle(ac, ctx.map in MATIERES ? ctx.map : 'arena')).connect(sortie);

  for (const c of couches) {
    // Sensibilité à la force : +1 = plus fort, plus grave et plus long quand
    // le geste est puissant ; -1 = l'inverse ; 0 = indifférent.
    const sf = c.sf || 0, k = (force - .5) * sf;
    const g = c.g * (1 + k * .9) * (alea ? 1 + hasard(.06) : 1);
    const fMul = hauteur * (1 - k * .25);
    const dMul = longueur * (1 + k * .5);
    const t = t0 + (c.delai || 0) * longueur;
    if (g <= 0) continue;
    switch (c.t) {
      case 'ton': ton(ac, bus, c, t, g, fMul, dMul); break;
      case 'bruit': bruit(ac, bus, c, t, g, fMul * clair, dMul); break;
      case 'modes': modes(ac, bus, c.mat ? mat.modes : c.partiels, c.mat ? mat.etouffe : 20000, t, g, fMul, dMul); break;
      case 'clic': clic(ac, bus, t, g, clair); break;
      case 'fm': fm(ac, bus, c, t, g, fMul, dMul); break;
      case 'foule': foule(ac, bus, c, t, g, dMul); break;
    }
  }
  // Débranche le bus une fois le son éteint.
  setTimeout(() => { try { bus.disconnect(); envoi.disconnect(); } catch (e) { /* déjà fait */ } },
    (t0 - ac.currentTime + 4) * 1000);
}

function tirerVariation(alea) {
  return alea ? { h: hasard(.55), g: 1 + hasard(.12), l: 1 + hasard(.08) } : { h: 0, g: 1, l: 1 };
}

// ---------------------------------------------------------------------------
// Un son complet : plusieurs groupes de couches superposés, chacun avec son
// réglage (gain, décalage en secondes, hauteur, longueur), comme dans la page
// d'écoute — et `niveau`, le gain qui aligne tous les sons sur la même
// intensité perçue. Une seule variation pour tout le son.
// ---------------------------------------------------------------------------
export function jouerSon(ac, sortie, son, ctx = {}) {
  if (!ac || !son) return;
  const c = { ...ctx, tirage: tirerVariation(ctx.alea !== false) };
  for (const gr of son.groupes) {
    jouerCouches(ac, sortie, gr.couches, c, {
      gain: (gr.gain ?? 1) * (son.niveau ?? 1), decalage: gr.decalage || 0,
      hauteur: gr.hauteur || 0, longueur: gr.longueur || 1
    });
  }
}

// Oscillateur avec glissé de hauteur : les impacts (sinus qui plonge), les
// timbres arcade (carré, dent de scie).
// { t:'ton', onde, f:[départ, arrivée], a, d, g, delai, sf }
function ton(ac, bus, c, t, g, fMul, dMul) {
  const o = ac.createOscillator(), v = ac.createGain();
  o.type = c.onde || 'sine';
  const d = c.d * dMul;
  o.frequency.setValueAtTime(c.f[0] * fMul, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1, (c.f[1] ?? c.f[0]) * fMul), t + (c.a || 0) + d * (c.glisse ?? 1));
  enveloppe(v.gain, t, g, c.a || 0, d);
  o.connect(v).connect(bus); o.start(t); o.stop(t + (c.a || 0) + d + .05);
}

// Bruit filtré dont le filtre peut balayer : souffles, whooshs, frottements.
// { t:'bruit', filtre:'bandpass'|'lowpass'|'highpass', f:[départ, arrivée], q, a, d, g }
function bruit(ac, bus, c, t, g, fMul, dMul) {
  const s = ac.createBufferSource(); s.buffer = res(ac).bruit;
  const f = ac.createBiquadFilter(); f.type = c.filtre || 'bandpass'; f.Q.value = c.q ?? 1;
  const d = c.d * dMul;
  f.frequency.setValueAtTime(Math.min(20000, c.f[0] * fMul), t);
  f.frequency.exponentialRampToValueAtTime(Math.min(20000, Math.max(20, (c.f[1] ?? c.f[0]) * fMul)), t + (c.a || 0) + d);
  const v = ac.createGain(); enveloppe(v.gain, t, g, c.a || 0, d);
  s.connect(f).connect(v).connect(bus);
  s.start(t, Math.random() * 1.5); s.stop(t + (c.a || 0) + d + .05);
}

// Corps résonant : une poignée de sinus amortis, chacun avec sa propre durée.
// C'est ce qui fait entendre une MATIÈRE (plastique, métal, bois, glace) là
// où un seul oscillateur fait entendre un bip.
function modes(ac, bus, partiels, etouffe, t, g, fMul, dMul) {
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = etouffe;
  lp.connect(bus);
  for (const [fr, dur, gp] of partiels) {
    const o = ac.createOscillator(), v = ac.createGain();
    o.frequency.value = fr * fMul * (1 + hasard(.004));
    enveloppe(v.gain, t, g * gp, .001, dur * dMul);
    o.connect(v).connect(lp); o.start(t); o.stop(t + dur * dMul + .05);
  }
}

// Transitoire : deux millisecondes de bruit très aigu. Seul, on ne l'entend
// presque pas ; sous un impact, il lui donne son attaque.
function clic(ac, bus, t, g, clair) {
  const s = ac.createBufferSource(); s.buffer = res(ac).bruit;
  const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500 * clair;
  const v = ac.createGain(); enveloppe(v.gain, t, g, .0005, .012);
  s.connect(f).connect(v).connect(bus); s.start(t, Math.random()); s.stop(t + .03);
}

// Modulation de fréquence : timbres métalliques, cloches, étincelles.
// { t:'fm', f:[départ, arrivée], ratio, indice:[départ, arrivée], d, g }
function fm(ac, bus, c, t, g, fMul, dMul) {
  const car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), v = ac.createGain();
  const d = c.d * dMul, f0 = c.f[0] * fMul, f1 = (c.f[1] ?? c.f[0]) * fMul;
  car.frequency.setValueAtTime(f0, t); car.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + d);
  mod.frequency.setValueAtTime(f0 * (c.ratio || 1.4), t); mod.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * (c.ratio || 1.4)), t + d);
  mg.gain.setValueAtTime(f0 * c.indice[0], t); mg.gain.exponentialRampToValueAtTime(Math.max(1, f0 * c.indice[1]), t + d);
  mod.connect(mg).connect(car.frequency);
  enveloppe(v.gain, t, g, c.a || .001, d);
  car.connect(v).connect(bus);
  car.start(t); mod.start(t); car.stop(t + d + .05); mod.stop(t + d + .05);
}

// Public : plusieurs bandes de bruit dont le volume tremble indépendamment.
// C'est ce tremblement irrégulier qui fait « foule » et non « souffle ».
// { t:'foule', a, d, g }
function foule(ac, bus, c, t, g, dMul) {
  const d = c.d * dMul, a = c.a || .2;
  for (const [fr, q, gp] of [[420, .8, 1], [850, .9, .8], [1650, 1.1, .5], [3100, 1.3, .25]]) {
    const s = ac.createBufferSource(); s.buffer = res(ac).bruit;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = fr; f.Q.value = q;
    const env = ac.createGain(); enveloppe(env.gain, t, g * gp, a, d);
    const trem = ac.createGain(); trem.gain.setValueAtTime(1, t);
    for (let x = .05; x < a + d; x += .05 + Math.random() * .05) trem.gain.linearRampToValueAtTime(.55 + Math.random() * .6, t + x);
    s.connect(f).connect(trem).connect(env).connect(bus);
    s.start(t, Math.random()); s.stop(t + a + d + .05);
  }
}
