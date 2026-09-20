// ---------------------------------------------------------------------------
// Hub façon Brawlhalla — la sélection des persos refaite (retenue le 19/09).
// Mockup : mockups/hub-brawlhalla.html, trois propositions visuelles.
//
// On choisit à gauche (grille des persos), on s'équipe à droite (tenue,
// chromas en pastilles façon LoL, disque façon skin d'arme). Deux cartes de
// joueur, 1P et CPU : on fait son choix, CONFIRMER, puis on fait pareil pour
// le CPU — son perso ET sa tenue. Cliquer une carte de joueur y revient.
//
// En ligne, seul son propre camp se choisit : la carte d'en face devient
// l'adversaire, masqué jusqu'à ce qu'il valide, et CONFIRMER compte les
// joueurs prêts (1/2, 2/2) comme aujourd'hui.
//
// Chaque proposition ne fournit que sa mise en page (classes h*), ce module
// remplit tout. Compte simulé : celui de mockups/_inventaire.js.
// ---------------------------------------------------------------------------
import { PRIX } from './_inventaire.js';

// Instantané des ultimes (js/data/specials.js). Le mockup n'importe pas ce
// fichier : il tire tout le moteur du jeu avec lui. Le jeu, lui, lira SPECIALS.
export const ULTIS = {
  kurama:['SIX PATHS', 'Passe en mode Six Paths : tenue dorée, six orbes, et un tir qui traverse tout.'],
  matilda:['TIR MATILDA', 'Rafale triple.'],
  bell:['CLOCHE DE MINUIT', 'Sa tête devient une cloche géante qui protège sa cage.'],
  whitetiger:['WHITE TIGER', 'Il chante, un tigre blanc file droit devant, immobilise l’adversaire et l’attire vers lui.'],
  psychoshell:['PSYCHO-SHELL', 'Une carapace psychique s’écrase et laisse une zone qui ralentit l’adversaire et vide sa jauge.'],
  lamedragon:['SUSANO SSJ ROSE', 'Le Susanoo rose se dresse 10 s : chaque clic abat son épée là où tu vises, et tout disque touché repart en tir parfait.'],
  ruee:['LA RUÉE DES YOSHI', 'Une horde traverse le terrain, pousse le disque et bouscule l’adversaire.'],
  chien:['LE CHIEN DE YUKI', 'Un chien débarque plein écran et aveugle l’adversaire.'],
  grappin:['CROCHET DE CHOPPER', 'Il harponne le disque en vol et se le ramène en main.'],
  rafale:['RAFALE DE MAMIE', 'Elle mitraille dans la direction visée et repousse l’adversaire.'],
  piratage:['PIRATAGE', 'Prend la main sur l’adversaire : ses commandes partent à l’envers.'],
  leg:['LA JAMBE DE MAMAN', 'La jambe de Mom tombe du ciel.'],
};

const CADENAS = '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill="#fff" stroke="#111318" stroke-width="2.6"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="#111318" stroke-width="2.6"/><circle cx="12" cy="15.6" r="1.6" fill="#111318"/></svg>';
const PIECE = '<span class="piece" aria-hidden="true"></span>';
const DIFFS = ['FACILE', 'NORMAL', 'DIFFICILE'];
const STATS = [['VITESSE', 'spd', '#5df08a'], ['PUISSANCE', 'pow', '#ff5f6d'], ['CONTRÔLE', 'ctl', '#35e0ff']];
const COULEUR_COTE = { p1:'#2f6bff', cpu:'#e5384f' };

export function creerHubB(hote, { gabarit, CHARS, ROSTER, SKINS, DISC_SKINS, drawSkinDisc, son = () => {}, etat, mode = 'ia' }) {
  hote.innerHTML = gabarit;
  const racine = hote.firstElementChild;
  const q = s => racine.querySelector(s), qa = s => [...racine.querySelectorAll(s)];

  /* ---------- images, faites une fois ---------- */
  const cache = new Map();
  function sprite(ck, sid, k = 8) {
    const cle = ck + ':' + sid + ':' + k;
    if (cache.has(cle)) return cache.get(cle);
    const c = CHARS[ck], src = (c.skins && c.skins[sid] && c.skins[sid].idle) || c.frames.idle;
    const cv = document.createElement('canvas'); cv.width = src.width * k; cv.height = src.height * k;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, cv.width, cv.height);
    const url = cv.toDataURL(); cache.set(cle, url); return url;
  }
  function disque(did) {
    const cle = 'disque:' + did;
    if (cache.has(cle)) return cache.get(cle);
    const cv = document.createElement('canvas'); cv.width = cv.height = 96;
    try { drawSkinDisc(cv.getContext('2d'), 48, 48, 44, did, 0); } catch (e) { }
    const url = cv.toDataURL(); cache.set(cle, url); return url;
  }
  // Couleur d'une pastille de chroma : celle qui change le plus par rapport à
  // la tenue d'origine, lue sur le sprite.
  const couleurs = new Map();
  function couleurPastille(ck, sid, contre) {
    const cle = ck + ':' + sid;
    if (couleurs.has(cle)) return couleurs.get(cle);
    const c = CHARS[ck], img = s => (c.skins && c.skins[s] && c.skins[s].idle) || c.frames.idle;
    const a = img(sid), b = contre ? img(contre) : null, w = a.width, h = a.height;
    const lire = im => { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h).data; };
    const da = lire(a), db = b ? lire(b) : null;
    let meilleur = '#9aa0ac';
    for (const seuil of [110, 0]) {
      const n = new Map();
      for (let i = 0; i < da.length; i += 4) {
        if (da[i + 3] < 128) continue;
        if (db && da[i] === db[i] && da[i + 1] === db[i + 1] && da[i + 2] === db[i + 2]) continue;
        if (da[i] + da[i + 1] + da[i + 2] < seuil) continue;
        const k = (da[i] << 16) | (da[i + 1] << 8) | da[i + 2];
        n.set(k, (n.get(k) || 0) + 1);
      }
      if (n.size) { const [k] = [...n.entries()].sort((x, y) => y[1] - x[1])[0]; meilleur = '#' + k.toString(16).padStart(6, '0'); break; }
    }
    couleurs.set(cle, meilleur); return meilleur;
  }

  /* ---------- catalogue d'un perso ---------- */
  const liste = ck => SKINS[ck] || [];
  const defautDe = ck => (liste(ck).find(s => s.defaut) || liste(ck)[0]).id;
  const tenuesDe = ck => liste(ck).filter(s => !s.chroma);
  const chromasDe = ck => liste(ck).filter(s => s.chroma);
  const infos = (ck, sid) => liste(ck).find(s => s.id === sid);
  const parent = (ck, sid) => (infos(ck, sid) || {}).chroma ? defautDe(ck) : sid;
  const rarete = (ck, sid) => { const s = infos(ck, sid) || {}; return s.defaut ? 'base' : s.chroma ? 'chroma' : 'skin'; };
  const prixT = (ck, sid) => (infos(ck, sid) || {}).chroma ? PRIX.chroma : PRIX.tenue;
  const possedeT = (ck, sid) => etat.possede.has(`tenue:${ck}:${sid}`);
  const favorites = ck => liste(ck).filter(s => etat.favoris.has(`tenue:${ck}:${s.id}`) && possedeT(ck, s.id));
  const disques = () => DISC_SKINS.map(d => ({ id:'disque:' + d.id, did:d.id, nom:d.name.toUpperCase(), tuto:d.verrou === 'tuto' }));
  const auHasard = arr => arr[(Math.random() * arr.length) | 0];

  /* ---------- état ----------
     Deux camps. 1P porte ses tenues équipées ; le CPU part sur « tenue au
     hasard » et peut porter TOUTES les tenues : c'est un adversaire qu'on
     habille, pas un compte qui achète. */
  const tenuesP1 = {};
  for (const ck of ROSTER) {
    const eq = (etat.equipe.tenue[ck] || '').split(':')[2];
    tenuesP1[ck] = eq && possedeT(ck, eq) ? eq : defautDe(ck);
  }
  const J = {
    p1: { ck:'naruto', tenues:tenuesP1, pret:false, rnd:false },
    cpu: { ck:null, tenues:{}, pret:false, rnd:false },
  };
  const H = { cote:'p1', mode, diff:1, onglet:'tenue', disque:etat.equipe.disque, survolCk:null, survolT:null, survolD:null, adv:null, pop:false };
  const jA = () => J[H.cote];
  const enLigne = () => H.mode === 'ligne';
  const libre = (ck, sid) => H.cote === 'cpu' || possedeT(ck, sid);
  const tenueDe = (cote, ck) => J[cote].tenues[ck] ?? (cote === 'cpu' ? '__rnd' : defautDe(ck));
  const sidAffiche = (ck, sid) => sid === '__fav' ? (favorites(ck)[0] || { id:defautDe(ck) }).id : sid === '__rnd' ? defautDe(ck) : sid;
  const nomTenue = (ck, sid) => sid === '__fav' ? 'FAVORITE AU HASARD' : sid === '__rnd' ? 'TENUE AU HASARD' : (infos(ck, sid) || {}).nom || '';
  const editable = () => !jA().pret;

  /* ---------- aperçu ---------- */
  let boucle = null, angle = 0, t0 = 0;
  function dessinerDisqueHeros() {
    const cv = q('.hHeroDisque'); if (!cv) return;
    const id = H.survolD || H.disque, spec = id === '__alea' || id === '__fav';
    cv.parentElement.classList.toggle('hSpec', spec);
    const qd = q('.hHeroDisqueQ'); if (qd) qd.textContent = id === '__fav' ? '★' : '?';
    if (spec) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height); g.save(); g.translate(cv.width / 2, cv.height / 2); g.rotate(angle);
    try { drawSkinDisc(g, 0, 0, cv.width / 2 - 3, id.split(':')[1], angle); } catch (e) { }
    g.restore();
  }
  const tourner = t => { const dt = Math.min(.05, (t - t0) / 1000); t0 = t; angle += dt * 6; if (H.cote === 'p1') dessinerDisqueHeros(); boucle = requestAnimationFrame(tourner); };
  boucle = requestAnimationFrame(t => { t0 = t; tourner(t); });

  function majHeros() {
    const j = jA(), ck = (editable() && H.survolCk) || j.ck;
    racine.dataset.cote = H.cote;
    racine.style.setProperty('--cA', COULEUR_COTE[H.cote]);
    for (const e of qa('.hRole')) e.textContent = H.cote === 'p1' ? (enLigne() ? 'TOI' : '1P') : 'CPU';
    racine.classList.toggle('heroVide', !ck);
    const img = q('.hSprite');
    if (!ck) {
      if (img) { img.removeAttribute('src'); img.style.visibility = 'hidden'; }
      for (const e of qa('.hNom')) e.textContent = 'CHOISIS UN PERSO';
      for (const e of qa('.hUnivers')) e.textContent = 'DANS LA GRILLE';
      majStats(null); majUlti(null);
      const lab = q('.hTenueNom'); if (lab) lab.innerHTML = '';
      return;
    }
    const c = CHARS[ck], cache = j.rnd && ck === j.ck;
    const sid = (ck === j.ck && editable() && H.survolT) || tenueDe(H.cote, ck);
    const special = sid === '__fav' || sid === '__rnd';
    if (img) {
      const url = sprite(ck, sidAffiche(ck, sid), 12);
      if (img.getAttribute('src') !== url) {
        img.src = url;
        img.animate([{ opacity:.3, transform:'translateY(1.4cqh) scale(.96)' }, { opacity:1, transform:'none' }], { duration:200, easing:'cubic-bezier(.2,.8,.3,1)' });
      }
      img.style.visibility = cache ? 'hidden' : '';
    }
    racine.classList.toggle('persoAleatoire', cache);
    racine.classList.toggle('tenueSpeciale', special && !cache);
    racine.dataset.marque = sid === '__fav' ? '★' : '?';
    for (const e of qa('.hNom')) e.textContent = cache ? '???' : c.short;
    for (const e of qa('.hUnivers')) e.textContent = cache ? 'TIRÉ AU SORT' : c.universe;
    racine.style.setProperty('--cP', cache ? '#9aa0ac' : c.color);
    const lab = q('.hTenueNom');
    if (lab) {
      if (cache) lab.innerHTML = '<b>TENUE AU HASARD</b>';
      else if (special) lab.innerHTML = `<i class="rar r-base">${sid === '__fav' ? '★' : '?'}</i><b>${nomTenue(ck, sid)}</b>`;
      else {
        const r = rarete(ck, sid);
        const achat = libre(ck, sid) ? '' : `<em class="aAcheter">${CADENAS}${PIECE}${prixT(ck, sid)} EN BOUTIQUE</em>`;
        lab.innerHTML = `<i class="rar r-${r}">${r === 'base' ? 'DE BASE' : r === 'chroma' ? 'CHROMA' : 'SKIN'}</i><b>${nomTenue(ck, sid)}</b>${achat}`;
      }
    }
    majStats(cache ? null : c); majUlti(cache ? null : c);
    if (H.cote === 'p1') dessinerDisqueHeros();
  }
  // Barres de stats : trois lignes, cinq crans larges, la valeur en clair.
  function majStats(c) {
    for (const el of qa('.hStats')) el.innerHTML = STATS.map(([l, k, col]) => {
      const v = c ? c.stats[k] : 0;
      return `<div class="stSeg"><b>${l}</b><span class="stCrans">${[1, 2, 3, 4, 5].map(i => `<i${i <= v ? ` class="on" style="--sc:${col}"` : ''}></i>`).join('')}</span><em>${c ? v : '–'}</em></div>`;
    }).join('');
  }
  function majUlti(c) {
    for (const el of qa('.hUlti')) {
      const u = c && ULTIS[c.ult];
      el.innerHTML = u ? `<span class="ultiChip">ULTIME</span><div><b>${u[0]}</b><em>${u[1]}</em></div>`
        : `<span class="ultiChip">ULTIME</span><div><b>???</b><em>${c === null && jA().rnd ? 'Tirage au sort : révélé au coup d’envoi.' : 'Choisis un perso pour voir son ultime.'}</em></div>`;
    }
  }

  /* ---------- tenues et chromas ---------- */
  function majTenues() {
    const z = q('.hTenues'); if (!z) return;
    const j = jA(), ck = j.ck;
    if (!ck) { z.innerHTML = '<p class="hVide">Choisis d’abord un perso dans la grille.</p>'; majChromas(); return; }
    const choix = tenueDe(H.cote, ck), choisie = parent(ck, choix);
    const tuiles = tenuesDe(ck).map(s => {
      const ok = libre(ck, s.id), r = rarete(ck, s.id);
      const nCh = s.defaut ? chromasDe(ck).length : 0;
      const vue = choisie === s.id && choix !== s.id ? choix : s.id;
      const cls = ['hT', 'r-' + r, ok ? '' : 'verrou', choisie === s.id ? 'sel' : '', H.cote === 'p1' && etat.favoris.has(`tenue:${ck}:${s.id}`) ? 'fav' : ''].join(' ');
      return `<button class="${cls}" data-sid="${s.id}" title="${s.nom}">
        <img src="${sprite(ck, vue, 6)}" alt=""><i class="hTbande"></i>
        ${ok ? '' : `<span class="hTcad">${CADENAS}</span><em class="hTprix">${PIECE}${prixT(ck, s.id)}</em>`}
        ${H.cote === 'p1' ? '<span class="hTetoile" data-etoile="1">★</span>' : ''}
        ${nCh ? `<span class="hTnb">+${nCh}</span>` : ''}
        <b class="hTnom">${s.nom}</b></button>`;
    });
    // La tuile de hasard : « favorite au hasard » pour soi (la touche de
    // Brawlhalla), « au hasard » pour le CPU.
    if (H.cote === 'p1') {
      const n = favorites(ck).length;
      tuiles.push(`<button class="hT hTspec${choix === '__fav' ? ' sel' : ''}${n ? '' : ' vide'}" data-sid="__fav" title="Une de tes tenues favorites, tirée à chaque match">
        <span class="hTspecIco">★<small>?</small></span><b class="hTnom">FAVORITE</b><em class="hTnbFav">${n} ★</em></button>`);
    } else {
      tuiles.push(`<button class="hT hTspec${choix === '__rnd' ? ' sel' : ''}" data-sid="__rnd" title="Une tenue au hasard à chaque match"><span class="hTspecIco">?</span><b class="hTnom">AU HASARD</b></button>`);
    }
    z.innerHTML = tuiles.join('');
    majChromas();
  }
  function majChromas() {
    const z = q('.hChromas'); if (!z) return;
    const ck = jA().ck;
    const choix = ck ? tenueDe(H.cote, ck) : null, base = ck ? defautDe(ck) : null, ch = ck ? chromasDe(ck) : [];
    const montrer = ck && ch.length && parent(ck, choix) === base;
    z.classList.toggle('vide', !montrer);
    if (!montrer) { z.innerHTML = ''; return; }
    z.innerHTML = `<span class="hPlabel">CHROMAS</span>` + [infos(ck, base), ...ch].map(s => {
      const col = s.chroma ? couleurPastille(ck, s.id, base) : couleurPastille(ck, base, ch[0].id);
      const ok = libre(ck, s.id);
      return `<button class="hP${choix === s.id ? ' sel' : ''}${ok ? '' : ' verrou'}" data-sid="${s.id}" style="--c:${col}" title="${s.nom}${ok ? '' : ' — ' + PRIX.chroma + ' en boutique'}"><i></i>${ok ? '' : `<span>${CADENAS}</span>`}</button>`;
    }).join('');
  }

  /* ---------- disque (1P seulement : il n'y a qu'un disque par match) ---------- */
  function majDisque() {
    const id = H.disque, d = disques().find(x => x.id === id);
    for (const e of qa('.hDisqueNom')) e.textContent = id === '__alea' ? 'AU HASARD' : id === '__fav' ? 'FAVORI AU HASARD' : d.nom;
    const slot = q('.hDisqueImg');
    if (slot) slot.innerHTML = id === '__alea' ? '<span class="q">?</span>' : id === '__fav' ? '<span class="q">★</span>' : `<img src="${disque(d.did)}" alt="">`;
    for (const g of qa('.hDisquesGrille')) {
      const cases = [`<button class="hD hSpec${id === '__alea' ? ' sel' : ''}" data-id="__alea" title="Un de tes disques, au hasard"><span class="q">?</span></button>`,
        `<button class="hD hSpec${id === '__fav' ? ' sel' : ''}" data-id="__fav" title="Un de tes disques favoris, au hasard"><span class="q">★</span></button>`];
      for (const x of disques()) {
        const ok = etat.possede.has(x.id);
        cases.push(`<button class="hD${ok ? '' : ' verrou'}${id === x.id ? ' sel' : ''}${etat.favoris.has(x.id) ? ' fav' : ''}" data-id="${x.id}" title="${x.nom}${ok ? '' : x.tuto ? ' — récompense du tutoriel' : ' — ' + PRIX.disque + ' en boutique'}">
          <img src="${disque(x.did)}" alt="">${ok ? '' : `<span class="hDcad">${CADENAS}</span>`}<span class="hTetoile" data-etoile="1">★</span></button>`);
      }
      g.innerHTML = cases.join('');
    }
    if (H.cote === 'p1') dessinerDisqueHeros();
  }

  /* ---------- grille, cartes de joueur, bouton ---------- */
  function majGrille() {
    const g = q('.hGrille'); if (!g) return;
    const advCk = enLigne() ? (H.adv && H.adv.ck) : J.cpu.ck;
    g.innerHTML = ROSTER.map(ck => {
      const p1 = ck === J.p1.ck && !J.p1.rnd, p2 = ck === advCk && !(J.cpu.rnd && !enLigne());
      return `<div class="cell${p1 ? ' sel1' : ''}${p2 ? ' sel2' : ''}" data-ck="${ck}"><img src="${sprite(ck, defautDe(ck), 5)}" alt="">
        ${p1 ? `<span class="tag t1">${enLigne() ? 'TOI' : '1P'}</span>` : ''}${p2 ? `<span class="tag t2">${enLigne() ? 'ADV' : 'CPU'}</span>` : ''}</div>`;
    }).join('') + `<div class="cell rndCell" data-ck="__rnd" title="Perso et tenue au hasard"><span class="qm">?</span></div>`;
    g.classList.toggle('fige', !editable());
  }
  function carteJoueur(el, cote) {
    if (!el) return;
    const ligneAdv = enLigne() && cote === 'cpu';
    let ck, sid, rnd, pret;
    if (ligneAdv) { ck = H.adv && H.adv.ck; sid = H.adv && H.adv.sid; rnd = false; pret = !!H.adv; }
    else { const j = J[cote]; ck = j.ck; sid = ck ? tenueDe(cote, ck) : null; rnd = j.rnd; pret = j.pret; }
    el.classList.toggle('actif', cote === H.cote && !ligneAdv);
    el.classList.toggle('pret', pret);
    el.classList.toggle('vide', !ck || rnd);
    el.classList.toggle('ligne', ligneAdv);
    const img = el.querySelector('.bjPortrait img');
    if (img) { if (ck && !rnd) img.src = sprite(ck, sidAffiche(ck, sid), 6); else img.removeAttribute('src'); }
    el.style.setProperty('--cP', ck && !rnd ? CHARS[ck].color : '#9aa0ac');
    el.querySelector('.bjRole').textContent = cote === 'p1' ? (enLigne() ? 'TOI' : '1P') : (enLigne() ? 'ADVERSAIRE' : 'CPU');
    el.querySelector('.bjNom').textContent = ligneAdv ? (ck ? CHARS[ck].short : 'EN LIGNE') : rnd ? '???' : ck ? CHARS[ck].short : 'À CHOISIR';
    el.querySelector('.bjTenue').textContent = ligneAdv ? (ck ? nomTenue(ck, sid) : 'choisit son champion…') : rnd ? 'au hasard' : ck ? nomTenue(ck, sid) : (cote === 'cpu' ? 'après ton choix' : '');
    const etatEl = el.querySelector('.bjEtat');
    if (etatEl) etatEl.textContent = pret ? 'PRÊT' : (cote === H.cote && !ligneAdv ? 'EN COURS' : ligneAdv ? '…' : 'MODIFIER');
  }
  function majJoueurs() {
    carteJoueur(q('.bjP1'), 'p1'); carteJoueur(q('.bjCpu'), 'cpu');
    // Le fond suit les deux camps, comme l'écran de sélection actuel : la
    // couleur de 1P à gauche, celle d'en face à droite, gris tant qu'inconnue.
    const advCk = enLigne() ? (H.adv && H.adv.ck) : (!J.cpu.rnd && J.cpu.ck);
    racine.style.setProperty('--cJ1', J.p1.ck && !J.p1.rnd ? CHARS[J.p1.ck].color : '#9aa0ac');
    racine.style.setProperty('--cJ2', advCk ? CHARS[advCk].color : '#9aa0ac');
    for (const e of qa('.hDiff')) e.textContent = DIFFS[H.diff];
    racine.classList.toggle('modeLigne', enLigne());
  }
  function majBouton() {
    const b = q('.hConfirmer'); if (!b) return;
    const tous = enLigne() ? J.p1.pret && H.adv : J.p1.pret && J.cpu.pret;
    b.classList.remove('attente', 'go');
    if (tous) { b.textContent = enLigne() ? 'PRÊTS 2/2' : 'TERRAIN →'; b.classList.add('go'); }
    else if (enLigne() && J.p1.pret) { b.textContent = 'EN ATTENTE… 1/2'; b.classList.add('attente'); }
    else if (!jA().ck) { b.textContent = 'CHOISIS UN PERSO'; b.classList.add('attente'); }
    else b.textContent = H.cote === 'cpu' ? 'CONFIRMER LE CPU' : 'CONFIRMER';
    for (const e of qa('.hTour')) {
      e.classList.remove('p1', 'p2', 'done');
      if (tous) { e.textContent = 'PRÊTS !'; e.classList.add('done'); }
      else if (enLigne()) { e.textContent = J.p1.pret ? 'L’ADVERSAIRE CHOISIT…' : 'CHOISIS TON CHAMPION'; e.classList.add(J.p1.pret ? 'p2' : 'p1'); }
      else { e.textContent = H.cote === 'p1' ? 'AU TOUR DE 1P' : 'AU TOUR DU CPU'; e.classList.add(H.cote === 'p1' ? 'p1' : 'p2'); }
    }
  }
  function majOnglets() {
    if (H.cote === 'cpu' && H.onglet === 'disque') H.onglet = 'tenue';
    for (const b of qa('.bbOnglets button')) {
      b.classList.toggle('on', b.dataset.onglet === H.onglet);
      if (b.dataset.onglet === 'disque') { b.classList.toggle('off', H.cote === 'cpu'); b.title = H.cote === 'cpu' ? 'Un seul disque par match : c’est le tien.' : ''; }
    }
    racine.dataset.onglet = H.onglet;
  }
  function toutMaj() { majGrille(); majHeros(); majTenues(); majDisque(); majJoueurs(); majBouton(); majOnglets(); }

  /* ---------- petits effets ---------- */
  function dire(txt, dore) {
    const m = q('.hMsg'); if (!m) return;
    m.innerHTML = txt; m.classList.toggle('dore', !!dore);
    m.getAnimations().forEach(a => a.cancel());
    m.animate([{ opacity:0, transform:'translate(-50%,1cqh)' }, { opacity:1, transform:'translate(-50%,0)', offset:.08 }, { opacity:1, offset:.85 }, { opacity:0 }], { duration:2600, fill:'forwards' });
  }
  function refuser(el) {
    son('deny');
    el?.animate([{ transform:'none' }, { transform:'translateX(-4px)' }, { transform:'translateX(4px)' }, { transform:'translateX(-3px)' }, { transform:'none' }], { duration:280 });
  }
  function claque(el) {
    el?.animate([{ transform:'scale(1)' }, { transform:'scale(1.12)', offset:.35 }, { transform:'none' }], { duration:300, easing:'cubic-bezier(.2,.8,.3,1)' });
    q('.hHero')?.animate([{ filter:'brightness(1)' }, { filter:'brightness(1.7)', offset:.25 }, { filter:'brightness(1)' }], { duration:360 });
  }
  function tampon(el) {
    if (!el) return;
    el.querySelectorAll('.tamponPret').forEach(e => e.remove());
    const t = document.createElement('div'); t.className = 'tamponPret'; t.textContent = 'PRÊT !'; el.appendChild(t);
  }
  const sansTampon = el => el?.querySelectorAll('.tamponPret').forEach(e => e.remove());
  // Le panneau change de camp : un glissé, pour qu'on voie qu'on habille
  // maintenant quelqu'un d'autre.
  function basculer(cote) {
    if (H.cote === cote) return;
    H.cote = cote; H.survolCk = H.survolT = H.survolD = null;
    toutMaj();
    const p = q('.bbPanneau') || q('.hPanneau');
    p?.animate([{ opacity:.2, transform:`translateX(${cote === 'cpu' ? 3 : -3}cqw)` }, { opacity:1, transform:'none' }], { duration:260, easing:'cubic-bezier(.2,.8,.3,1)' });
  }

  /* ---------- gestes ---------- */
  function choisirPerso(ck, el) {
    if (!editable()) { refuser(el); return; }
    const j = jA();
    if (ck === '__rnd') {
      j.rnd = true; j.ck = auHasard(ROSTER);
      const pool = liste(j.ck).filter(s => libre(j.ck, s.id));
      j.tenues[j.ck] = auHasard(pool).id;
      dire(`${H.cote === 'cpu' ? 'CPU' : '1P'} : perso et tenue tirés au sort, révélés au coup d’envoi.`);
    } else { j.rnd = false; j.ck = ck; }
    H.survolCk = H.survolT = null; son('select');
    toutMaj(); claque(q('.hHero'));
  }
  function choisirTenue(sid, el) {
    const j = jA(), ck = j.ck;
    if (!ck || !editable() || j.rnd) { refuser(el); return; }
    if (sid === '__fav' && !favorites(ck).length) { refuser(el); dire('Mets des ★ sur les tenues de ce perso pour tirer parmi elles.'); return; }
    if (!sid.startsWith('__') && !libre(ck, sid)) { refuser(el); dire(`${nomTenue(ck, sid)} : ${PIECE}${prixT(ck, sid)} en <b>BOUTIQUE</b>`); return; }
    j.tenues[ck] = sid; H.survolT = null; son('select');
    majTenues(); majHeros(); majJoueurs(); claque(el);
  }
  function choisirDisque(id, el) {
    if (H.cote !== 'p1' || !editable()) { refuser(el); return; }
    if (id === '__fav' && !disques().some(x => etat.favoris.has(x.id) && etat.possede.has(x.id))) { refuser(el); dire('Aucun disque favori : mets des ★ d’abord.'); return; }
    if (id.startsWith('disque:') && !etat.possede.has(id)) {
      const x = disques().find(d => d.id === id);
      refuser(el); dire(x.tuto ? `${x.nom} : termine le tutoriel pour l’avoir.` : `${x.nom} : ${PIECE}${PRIX.disque} en <b>BOUTIQUE</b>`); return;
    }
    H.disque = id; H.survolD = null; son('select'); majDisque(); claque(el);
  }
  function basculerFavori(cle, el) {
    if (H.cote !== 'p1') return;
    if (etat.favoris.has(cle)) etat.favoris.delete(cle); else etat.favoris.add(cle);
    son('move');
    el?.animate([{ transform:'scale(1)' }, { transform:'scale(1.8) rotate(72deg)', offset:.4 }, { transform:'none' }], { duration:340 });
    setTimeout(() => { majTenues(); majDisque(); }, 200);
  }
  function confirmer() {
    const b = q('.hConfirmer'), j = jA();
    const tous = enLigne() ? J.p1.pret && H.adv : J.p1.pret && J.cpu.pret;
    if (tous) { son('select'); dire('Dans le jeu : on passe au choix du terrain.', true); return; }
    if (!j.ck || j.pret) { refuser(b); return; }
    j.pret = true; son('select'); claque(b);
    tampon(q(H.cote === 'p1' ? '.bjP1' : '.bjCpu'));
    if (enLigne()) {
      dire(H.adv ? 'Les deux sont prêts : en route pour le terrain.' : 'Ton champion est annoncé : on attend l’adversaire.', !!H.adv);
      toutMaj(); return;
    }
    if (H.cote === 'p1' && !J.cpu.pret) { dire('À toi d’habiller le <b>CPU</b> : son perso, puis sa tenue.', true); basculer('cpu'); return; }
    if (H.cote === 'cpu' && !J.p1.pret) { basculer('p1'); return; }
    toutMaj();
  }
  // Cliquer une carte de joueur y ramène le panneau, et rouvre son choix
  // s'il était validé.
  function ouvrirCote(cote, el) {
    if (enLigne()) {
      if (cote === 'cpu') { refuser(el); dire('En ligne, l’adversaire choisit de son côté.'); return; }
      if (J.p1.pret && !H.adv) { J.p1.pret = false; sansTampon(q('.bjP1')); son('deny'); dire('Tu te ravises : l’adversaire le voit.'); toutMaj(); }
      return;
    }
    const j = J[cote];
    if (j.pret) { j.pret = false; sansTampon(q(cote === 'p1' ? '.bjP1' : '.bjCpu')); son('deny'); }
    else son('move');
    if (H.cote === cote) toutMaj(); else basculer(cote);
  }
  function retour() {
    if (enLigne()) { ouvrirCote('p1'); return; }
    if (J.cpu.pret) ouvrirCote('cpu');
    else if (H.cote === 'cpu' || J.p1.pret) ouvrirCote('p1');
  }

  racine.addEventListener('click', e => {
    const t = e.target;
    const et = t.closest('[data-etoile]');
    if (et) { const tu = et.closest('.hT'), di = et.closest('.hD'); if (tu) basculerFavori(`tenue:${jA().ck}:${tu.dataset.sid}`, et); else if (di) basculerFavori(di.dataset.id, et); return; }
    const df = t.closest('[data-diff]'); if (df) { e.stopPropagation(); H.diff = (H.diff + +df.dataset.diff + DIFFS.length) % DIFFS.length; son('move'); majJoueurs(); return; }
    const cell = t.closest('.hGrille .cell'); if (cell) { choisirPerso(cell.dataset.ck, cell); return; }
    const tu = t.closest('.hT, .hP'); if (tu) { choisirTenue(tu.dataset.sid, tu); return; }
    const d = t.closest('.hD'); if (d) { choisirDisque(d.dataset.id, d); return; }
    const bj = t.closest('.bjCarte'); if (bj) { ouvrirCote(bj.dataset.cote, bj); return; }
    // Bien viser les onglets : la racine porte elle aussi data-onglet (c'est
    // elle qui montre le bon panneau), donc un closest('[data-onglet]') nu
    // remonterait jusqu'à elle et avalerait tous les clics de l'écran.
    const o = t.closest('.bbOnglets button'); if (o) { if (o.classList.contains('off')) { refuser(o); dire('Un seul disque par match, et c’est le tien.'); return; } H.onglet = o.dataset.onglet; son('move'); majOnglets(); return; }
    if (t.closest('.hConfirmer')) { confirmer(); return; }
    if (t.closest('.hRetour')) { retour(); return; }
  });
  racine.addEventListener('mouseover', e => {
    const t = e.target;
    if (!editable()) return;
    const cell = t.closest('.hGrille .cell');
    if (cell && cell.dataset.ck !== '__rnd') { if (H.survolCk !== cell.dataset.ck) { H.survolCk = cell.dataset.ck; son('survol'); majHeros(); } return; }
    const tu = t.closest('.hT, .hP');
    if (tu && !tu.dataset.sid.startsWith('__') && !jA().rnd) { if (H.survolT !== tu.dataset.sid) { H.survolT = tu.dataset.sid; son('survol'); majHeros(); } return; }
    const d = t.closest('.hD');
    if (d && H.cote === 'p1') { if (H.survolD !== d.dataset.id) { H.survolD = d.dataset.id; son('survol'); dessinerDisqueHeros(); } }
  });
  racine.addEventListener('mouseout', e => {
    const vers = e.relatedTarget;
    if (H.survolCk && !vers?.closest?.('.hGrille .cell')) { H.survolCk = null; majHeros(); }
    if (H.survolT && !vers?.closest?.('.hT, .hP')) { H.survolT = null; majHeros(); }
    if (H.survolD && !vers?.closest?.('.hD')) { H.survolD = null; dessinerDisqueHeros(); }
  });

  toutMaj();
  return {
    arreter() { cancelAnimationFrame(boucle); },
    recommencer() {
      J.p1.pret = J.cpu.pret = false; J.p1.rnd = J.cpu.rnd = false; J.p1.ck = 'naruto'; J.cpu.ck = null; J.cpu.tenues = {};
      H.adv = null; H.cote = 'p1'; qa('.tamponPret').forEach(e => e.remove()); toutMaj();
    },
    // En ligne : l'adversaire valide son champion, qu'on découvre alors.
    adversaireValide() {
      if (!enLigne() || H.adv) return false;
      const ck = auHasard(ROSTER); H.adv = { ck, sid:auHasard(liste(ck)).id };
      son('select'); tampon(q('.bjCpu')); claque(q('.bjCpu'));
      dire(`L’adversaire a choisi <b>${CHARS[ck].short}</b> en ${nomTenue(ck, H.adv.sid)}`, true);
      toutMaj(); return true;
    },
  };
}
