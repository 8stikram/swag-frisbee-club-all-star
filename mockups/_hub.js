// ---------------------------------------------------------------------------
// Hub — la sélection des persos, où l'on choisit sa TENUE et son DISQUE
// avant le match, comme les skins et les skins d'arme de Brawlhalla.
// Mockup à trois versions : mockups/hub-selection.html.
//
// Ce module contient tout ce qui est commun aux trois versions : l'état, les
// tuiles de tenues, les pastilles de chroma (façon League of Legends), la case
// disque, l'aperçu sur le perso, le tour du CPU. Chaque version ne fournit que
// sa mise en page : des éléments portant les classes h* que ce module remplit.
//
// Le compte simulé est celui de l'inventaire (mockups/_inventaire.js) : mêmes
// tenues possédées, mêmes favoris, mêmes disques offerts.
//
// Décisions du 19/09 : raretés DE BASE < CHROMA < SKIN ; un chroma est une
// variante de couleur de la tenue d'origine ; tenue et disque se choisissent
// ici ; le CPU porte une tenue tirée au hasard parmi toutes ; CONFIRMER garde
// l'enchaînement 1P → CPU → terrain.
// ---------------------------------------------------------------------------
import { PRIX } from './_inventaire.js';

const CADENAS = '<svg viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill="#fff" stroke="#111318" stroke-width="2.6"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="#111318" stroke-width="2.6"/><circle cx="12" cy="15.6" r="1.6" fill="#111318"/></svg>';
const PIECE = '<span class="piece" aria-hidden="true"></span>';
const DIFFS = ['FACILE', 'NORMAL', 'DIFFICILE'];

export function creerHub(hote, { gabarit, CHARS, ROSTER, SKINS, DISC_SKINS, drawSkinDisc, son = () => {}, etat }) {
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
  // La couleur d'une pastille de chroma : celle qui change le plus entre la
  // tenue d'origine et ce chroma. Lue sur le sprite plutôt que déclarée, pour
  // qu'un chroma ajouté demain ait sa pastille sans rien écrire de plus.
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

  /* ---------- le catalogue d'un perso ---------- */
  const liste = ck => SKINS[ck] || [];
  const defautDe = ck => (liste(ck).find(s => s.defaut) || liste(ck)[0]).id;
  // Les tenues qu'on voit dans la rangée : l'origine et les skins. Les chromas
  // ne sont pas des tuiles : ce sont des pastilles sous la tenue d'origine.
  const tenuesDe = ck => liste(ck).filter(s => !s.chroma);
  const chromasDe = ck => liste(ck).filter(s => s.chroma);
  const infos = (ck, sid) => liste(ck).find(s => s.id === sid);
  const parent = (ck, sid) => (infos(ck, sid) || {}).chroma ? defautDe(ck) : sid;
  const possedeT = (ck, sid) => etat.possede.has(`tenue:${ck}:${sid}`);
  const prixT = (ck, sid) => (infos(ck, sid) || {}).chroma ? PRIX.chroma : PRIX.tenue;
  const rarete = (ck, sid) => { const s = infos(ck, sid) || {}; return s.defaut ? 'base' : s.chroma ? 'chroma' : 'skin'; };
  const favorites = ck => liste(ck).filter(s => etat.favoris.has(`tenue:${ck}:${s.id}`) && possedeT(ck, s.id));
  const disques = () => DISC_SKINS.map(d => ({ id:'disque:' + d.id, did:d.id, nom:d.name.toUpperCase(), tuto:d.verrou === 'tuto' }));

  /* ---------- état ---------- */
  const tenue = {};
  for (const ck of ROSTER) {
    const eq = (etat.equipe.tenue[ck] || '').split(':')[2];
    tenue[ck] = eq && possedeT(ck, eq) ? eq : defautDe(ck);
  }
  const H = {
    tour:1, ck:'naruto', survolCk:null, survolT:null, survolD:null, verrou:false, rnd:false,
    disque: etat.equipe.disque, cpu:null, cpuSid:null, diff:1, onglet:'tenue', pop:false,
  };

  /* ---------- aperçu ---------- */
  const persoVu = () => (H.tour === 1 && H.survolCk) || H.ck;
  function tenueVue(ck) {
    if (ck !== H.ck || H.tour !== 1) return tenue[ck];
    return H.survolT || tenue[ck];
  }
  let boucle = null, angle = 0, t0 = 0;
  function dessinerDisqueHeros() {
    const cv = q('.hHeroDisque'); if (!cv) return;
    const id = H.survolD || H.disque;
    const special = id === '__alea' || id === '__fav';
    cv.parentElement.classList.toggle('hSpec', special);
    const qd = q('.hHeroDisqueQ'); if (qd) qd.textContent = id === '__fav' ? '★' : '?';
    if (special) return;
    const g = cv.getContext('2d'), did = id.split(':')[1];
    g.clearRect(0, 0, cv.width, cv.height); g.save(); g.translate(cv.width / 2, cv.height / 2); g.rotate(angle);
    try { drawSkinDisc(g, 0, 0, cv.width / 2 - 3, did, angle); } catch (e) { }
    g.restore();
  }
  function tourner(t) {
    const dt = Math.min(.05, (t - t0) / 1000); t0 = t; angle += dt * 6;
    dessinerDisqueHeros();
    boucle = requestAnimationFrame(tourner);
  }
  boucle = requestAnimationFrame(t => { t0 = t; tourner(t); });

  function majHeros() {
    const ck = persoVu(), c = CHARS[ck];
    const sid = tenueVue(ck);
    const img = q('.hSprite');
    const fav = sid === '__fav', src = fav ? (favorites(ck)[0] || { id:defautDe(ck) }).id : sid;
    if (img) {
      const url = H.rnd ? '' : sprite(ck, src, 12);
      if (img.getAttribute('src') !== url) {
        img.src = url;
        img.animate([{ opacity:.35, transform:'translateY(1.2cqh) scale(.97)' }, { opacity:1, transform:'none' }], { duration:180, easing:'ease-out' });
      }
      img.style.visibility = H.rnd ? 'hidden' : '';
    }
    racine.classList.toggle('persoAleatoire', H.rnd);
    racine.classList.toggle('tenueFavorite', fav && !H.rnd);
    for (const e of qa('.hNom')) e.textContent = H.rnd ? '???' : c.short;
    for (const e of qa('.hUnivers')) e.textContent = H.rnd ? '???' : c.universe;
    racine.style.setProperty('--c1', H.rnd ? '#6b7280' : c.color);
    const halo = q('.hGlow1'); if (halo) halo.style.setProperty('--halo', H.rnd ? '#6b7280' : c.color);
    // Le nom de la tenue et ce qu'il faut pour l'avoir.
    const lab = q('.hTenueNom');
    if (lab) {
      if (H.rnd) lab.innerHTML = '<b>TENUE AU HASARD</b>';
      else if (fav) lab.innerHTML = '<b>★ TENUE FAVORITE AU HASARD</b>';
      else {
        const s = infos(ck, sid) || {}, r = rarete(ck, sid);
        const etatT = possedeT(ck, sid) ? '' : `<em class="aAcheter">${CADENAS}${PIECE}${prixT(ck, sid)} EN BOUTIQUE</em>`;
        lab.innerHTML = `<i class="rar r-${r}">${r === 'base' ? 'DE BASE' : r === 'chroma' ? 'CHROMA' : 'SKIN'}</i><b>${s.nom || ''}</b>${etatT}`;
      }
    }
    majStats(q('.hStats'), H.rnd ? null : c);
    // L'ultime : le mockup n'importe pas js/data/specials.js (il tire tout le
    // jeu avec lui), il en garde seulement la place.
    const sp = q('.hUlti');
    if (sp) sp.innerHTML = H.rnd ? '<b>???</b><em>Tirage au sort — révélé au coup d’envoi.</em>'
      : `<b>ULTIME DE ${c.short}</b><em>Le nom et la description du jeu s’affichent ici.</em>`;
    dessinerDisqueHeros();
  }
  function majStats(el, c) {
    if (!el) return;
    const rows = [['VITESSE', c ? c.stats.spd : 0, '#5df08a'], ['PUISSANCE', c ? c.stats.pow : 0, '#ff5f6d'], ['CONTRÔLE', c ? c.stats.ctl : 0, '#35e0ff']];
    if (el.classList.contains('pips')) {
      el.innerHTML = rows.map(([l, v, col]) => `<span class="pip"><b>${l}</b>${[1, 2, 3, 4, 5].map(i => `<i style="${i <= v ? 'background:' + col : ''}"></i>`).join('')}</span>`).join('');
    } else {
      el.innerHTML = rows.map(([l, v, col]) => `<div class="statRow"><span class="lbl">${l}</span><div class="bar"><i style="width:${v / 5 * 100}%;background:${c ? col : '#6b7280'}"></i></div></div>`).join('');
    }
  }

  /* ---------- tenues ---------- */
  function majTenues() {
    const z = q('.hTenues'); if (!z) return;
    const ck = H.ck, choisie = parent(ck, tenue[ck]);
    const tuiles = tenuesDe(ck).map(s => {
      const pos = possedeT(ck, s.id), r = rarete(ck, s.id);
      const cls = ['hT', 'r-' + r, pos ? '' : 'verrou', choisie === s.id && tenue[ck] !== '__fav' ? 'sel' : '', etat.favoris.has(`tenue:${ck}:${s.id}`) ? 'fav' : ''].join(' ');
      const nChromas = s.defaut ? chromasDe(ck).length : 0;
      // La tuile d'origine porte le chroma choisi : c'est lui qu'on va jouer.
      const vue = choisie === s.id && tenue[ck] !== s.id && tenue[ck] !== '__fav' ? tenue[ck] : s.id;
      return `<button class="${cls}" data-sid="${s.id}" title="${s.nom}">
        <img src="${sprite(ck, vue, 6)}" alt=""><i class="hTbande"></i>
        ${pos ? '' : `<span class="hTcad">${CADENAS}</span>`}
        <span class="hTetoile" data-etoile="1">★</span>
        ${nChromas ? `<span class="hTnb">+${nChromas}</span>` : ''}
        <b class="hTnom">${s.nom}</b>${pos ? '' : `<em class="hTprix">${PIECE}${PRIX.tenue}</em>`}
      </button>`;
    });
    // Tenue favorite au hasard : la touche « favori aléatoire » de Brawlhalla.
    const nFav = favorites(ck).length;
    tuiles.push(`<button class="hT hTfav${tenue[ck] === '__fav' ? ' sel' : ''}${nFav ? '' : ' vide'}" data-sid="__fav" title="Une de tes tenues favorites, tirée au hasard à chaque match">
      <span class="hTfavIco">★<small>?</small></span><b class="hTnom">FAVORITE AU HASARD</b><em class="hTprix">${nFav} ★</em></button>`);
    z.innerHTML = tuiles.join('');
    majChromas();
  }
  // Pastilles façon League of Legends : la tenue d'origine puis chacun de ses
  // chromas, en ronds de couleur. Seulement quand la tenue choisie en a.
  function majChromas() {
    const z = q('.hChromas'); if (!z) return;
    const ck = H.ck, base = defautDe(ck), ch = chromasDe(ck);
    const montrer = ch.length && parent(ck, tenue[ck]) === base && tenue[ck] !== '__fav';
    z.classList.toggle('vide', !montrer);
    if (!montrer) { z.innerHTML = ''; return; }
    const tous = [infos(ck, base), ...ch];
    z.innerHTML = `<span class="hPlabel">CHROMAS</span>` + tous.map(s => {
      const col = s.chroma ? couleurPastille(ck, s.id, base) : couleurPastille(ck, base, ch[0].id);
      const pos = possedeT(ck, s.id);
      return `<button class="hP${tenue[ck] === s.id ? ' sel' : ''}${pos ? '' : ' verrou'}" data-sid="${s.id}" style="--c:${col}" title="${s.nom}${pos ? '' : ' — ' + PRIX.chroma + ' en boutique'}"><i></i>${pos ? '' : `<span>${CADENAS}</span>`}</button>`;
    }).join('');
  }

  /* ---------- disques ---------- */
  function majDisque() {
    const slot = q('.hDisqueSlot');
    const id = H.disque, d = disques().find(x => x.id === id);
    if (slot) {
      slot.classList.toggle('hSpec', id === '__alea' || id === '__fav');
      slot.querySelector('.hDisqueImg').innerHTML = id === '__alea' ? '<span class="q">?</span>' : id === '__fav' ? '<span class="q">★</span>' : `<img src="${disque(d.did)}" alt="">`;
    }
    for (const e of qa('.hDisqueNom')) e.textContent = id === '__alea' ? 'ALÉATOIRE' : id === '__fav' ? 'FAVORI AU HASARD' : d.nom;
    const grilles = qa('.hDisquesGrille');
    for (const g of grilles) {
      const cases = [`<button class="hD hSpec${id === '__alea' ? ' sel' : ''}" data-id="__alea" title="Un de tes disques, au hasard"><span class="q">?</span></button>`,
        `<button class="hD hSpec fav${id === '__fav' ? ' sel' : ''}" data-id="__fav" title="Un de tes disques favoris, au hasard"><span class="q">★</span></button>`];
      for (const x of disques()) {
        const pos = etat.possede.has(x.id);
        cases.push(`<button class="hD${pos ? '' : ' verrou'}${id === x.id ? ' sel' : ''}${etat.favoris.has(x.id) ? ' fav' : ''}" data-id="${x.id}" title="${x.nom}${pos ? '' : x.tuto ? ' — récompense du tutoriel' : ' — ' + PRIX.disque + ' en boutique'}">
          <img src="${disque(x.did)}" alt="">${pos ? '' : `<span class="hDcad">${CADENAS}</span>`}<span class="hTetoile" data-etoile="1">★</span></button>`);
      }
      g.innerHTML = cases.join('');
    }
    dessinerDisqueHeros();
  }

  /* ---------- grille des persos et CPU ---------- */
  function majGrille() {
    const g = q('.hGrille'); if (!g) return;
    g.innerHTML = ROSTER.map(ck => `<div class="cell${ck === H.ck && !H.rnd ? ' sel1' : ''}${ck === H.cpu ? ' sel2' : ''}" data-ck="${ck}"><img src="${sprite(ck, defautDe(ck), 5)}" alt=""></div>`).join('')
      + `<div class="cell rndCell${H.rnd ? ' sel1' : ''}" data-ck="__rnd" title="Perso et tenue au hasard"><span class="qm">?</span></div>`;
    g.classList.toggle('fini', H.tour === 0);
  }
  function majCpu() {
    const img = q('.hCpuSprite'), c = H.cpu ? CHARS[H.cpu] : null;
    if (img) { img.src = c ? sprite(H.cpu, H.cpuSid, 12) : ''; img.style.visibility = c ? '' : 'hidden'; }
    for (const e of qa('.hCpuNom')) e.textContent = c ? c.short : (H.tour === 2 ? 'À TOI DE CHOISIR' : 'CPU');
    for (const e of qa('.hCpuUnivers')) e.textContent = c ? c.universe : '—';
    const t = q('.hCpuTenue'); if (t) t.textContent = c ? (infos(H.cpu, H.cpuSid) || {}).nom : '';
    racine.style.setProperty('--c2', c ? c.color : '#6b7280');
    const halo = q('.hGlow2'); if (halo) halo.style.setProperty('--halo', c ? c.color : '#6b7280');
    majStats(q('.hCpuStats'), c);
    racine.classList.toggle('cpuVide', !c);
  }
  function majTour() {
    for (const e of qa('.hTour')) {
      e.className = e.className.replace(/\b(p1|p2|done)\b/g, '').trim() + ' ' + (H.tour === 1 ? 'p1' : H.tour === 2 ? 'p2' : 'done');
      e.textContent = H.tour === 1 ? 'AU TOUR DE 1P' : H.tour === 2 ? 'AU TOUR DU CPU' : 'PRÊTS !';
    }
    const b = q('.hConfirmer');
    if (b) b.innerHTML = H.tour === 1 ? 'CONFIRMER' : H.tour === 2 ? 'CHOISIS LE CPU…' : 'TERRAIN →';
    if (b) b.classList.toggle('attente', H.tour === 2);
    for (const e of qa('.hDiff')) e.textContent = DIFFS[H.diff];
    racine.dataset.tour = H.tour;
    racine.classList.toggle('verrouille', H.tour !== 1);
  }
  function toutMaj() { majGrille(); majHeros(); majTenues(); majDisque(); majCpu(); majTour(); majOnglet(); }
  function majOnglet() {
    for (const b of qa('[data-onglet]')) b.classList.toggle('on', b.dataset.onglet === H.onglet);
    racine.dataset.onglet = H.onglet;
  }

  /* ---------- messages ---------- */
  function dire(txt, dore) {
    const m = q('.hMsg'); if (!m) return;
    m.innerHTML = txt; m.classList.toggle('dore', !!dore);
    m.getAnimations().forEach(a => a.cancel());
    m.animate([{ opacity:0, transform:'translate(-50%,1cqh)' }, { opacity:1, transform:'translate(-50%,0)', offset:.08 }, { opacity:1, offset:.85 }, { opacity:0 }],
      { duration:2600, fill:'forwards' });
  }
  function refuser(el) {
    son('deny');
    el?.animate([{ transform:'none' }, { transform:'translateX(-4px)' }, { transform:'translateX(4px)' }, { transform:'translateX(-3px)' }, { transform:'none' }], { duration:280 });
  }
  function claque(el) {
    el?.animate([{ transform:'scale(1)' }, { transform:'scale(1.16)', offset:.35 }, { transform:'none' }], { duration:300, easing:'cubic-bezier(.2,.8,.3,1)' });
    const h = q('.hHero');
    h?.animate([{ filter:'brightness(1)' }, { filter:'brightness(1.7)', offset:.25 }, { filter:'brightness(1)' }], { duration:360 });
  }

  /* ---------- gestes ---------- */
  function choisirPerso(ck) {
    if (H.tour === 1) {
      if (ck === '__rnd') { H.rnd = true; H.ck = ROSTER[(Math.random() * ROSTER.length) | 0];
        const pos = liste(H.ck).filter(s => possedeT(H.ck, s.id)); tenue[H.ck] = pos[(Math.random() * pos.length) | 0].id;
        son('select'); dire('Perso et tenue tirés au sort : révélés au coup d’envoi.'); }
      else { H.rnd = false; H.ck = ck; son('select'); }
      H.survolCk = null; H.survolT = null; H.pop = false;
      toutMaj(); claque(q('.hHero'));
    } else if (H.tour === 2) {
      const cible = ck === '__rnd' ? ROSTER[(Math.random() * ROSTER.length) | 0] : ck;
      H.cpu = cible;
      const toutes = liste(cible); H.cpuSid = toutes[(Math.random() * toutes.length) | 0].id;
      H.tour = 0; son('select');
      dire(`CPU : <b>${CHARS[cible].short}</b> en ${(infos(cible, H.cpuSid) || {}).nom} (tenue tirée au hasard)`);
      toutMaj(); claque(q('.hCpuHero')); tampon(q('.hCpuHero'));
    }
  }
  function choisirTenue(sid, el) {
    const ck = H.ck;
    if (H.tour !== 1 || H.rnd) { refuser(el); return; }
    if (sid === '__fav') {
      if (!favorites(ck).length) { refuser(el); dire('Mets des ★ sur les tenues de ce perso pour utiliser ce choix.'); return; }
      tenue[ck] = '__fav'; son('select'); toutMaj(); claque(el); return;
    }
    if (!possedeT(ck, sid)) { refuser(el); dire(`${(infos(ck, sid) || {}).nom} : ${PIECE}${prixT(ck, sid)} en <b>BOUTIQUE</b>`); return; }
    tenue[ck] = sid; H.survolT = null; son('select');
    majTenues(); majHeros(); claque(el);
  }
  function choisirDisque(id, el) {
    if (H.tour !== 1) { refuser(el); return; }
    if (id === '__fav' && !disques().some(x => etat.favoris.has(x.id) && etat.possede.has(x.id))) { refuser(el); dire('Aucun disque favori : mets des ★ d’abord.'); return; }
    if (id.startsWith('disque:') && !etat.possede.has(id)) {
      const x = disques().find(d => d.id === id);
      refuser(el); dire(x.tuto ? `${x.nom} : termine le tutoriel pour l’avoir.` : `${x.nom} : ${PIECE}${PRIX.disque} en <b>BOUTIQUE</b>`); return;
    }
    H.disque = id; H.survolD = null; son('select');
    majDisque(); claque(el);
    if (H.pop) fermerPop();
  }
  function basculerFavori(cle, el) {
    if (etat.favoris.has(cle)) etat.favoris.delete(cle); else etat.favoris.add(cle);
    son('move');
    el?.animate([{ transform:'scale(1)' }, { transform:'scale(1.8) rotate(72deg)', offset:.4 }, { transform:'none' }], { duration:340 });
    setTimeout(() => { majTenues(); majDisque(); }, 200);
  }
  function confirmer() {
    const b = q('.hConfirmer');
    if (H.tour === 1) {
      H.tour = 2; son('select');
      const t = tenue[H.ck], d = H.disque;
      dire(H.rnd ? '1P prêt : perso au hasard.' : `1P : <b>${CHARS[H.ck].short}</b> · ${t === '__fav' ? 'tenue favorite au hasard' : (infos(H.ck, t) || {}).nom} · disque ${d === '__alea' ? 'au hasard' : d === '__fav' ? 'favori au hasard' : disques().find(x => x.id === d).nom}`, true);
      toutMaj(); claque(b);
      tampon(q('.hHero'));
    } else if (H.tour === 0) { son('select'); dire('Dans le jeu : on passe au choix du terrain.'); }
    else refuser(b);
  }
  // Le tampon « PRÊT ! » du jeu (css/style.css), claqué sur le portrait.
  function tampon(box) {
    if (!box) return;
    box.querySelectorAll('.tamponPret').forEach(e => e.remove());
    const t = document.createElement('div'); t.className = 'tamponPret'; t.textContent = 'PRÊT !'; box.appendChild(t);
  }
  function retour() {
    if (H.tour === 0) { H.tour = 2; H.cpu = null; qa('.hCpuHero .tamponPret').forEach(e => e.remove()); }
    else if (H.tour === 2) { H.tour = 1; qa('.hHero .tamponPret').forEach(e => e.remove()); }
    else return;
    son('deny'); toutMaj();
  }
  function ouvrirPop() { H.pop = true; q('.hDisquePop')?.classList.remove('hidden'); son('move'); q('.hDisquePop')?.animate([{ opacity:0, transform:'translate(-50%,1.2cqh) scale(.96)' }, { opacity:1, transform:'translate(-50%,0)' }], { duration:160, easing:'ease-out' }); }
  function fermerPop() { H.pop = false; H.survolD = null; q('.hDisquePop')?.classList.add('hidden'); dessinerDisqueHeros(); }

  racine.addEventListener('click', e => {
    const t = e.target;
    const et = t.closest('[data-etoile]');
    if (et) {
      const tu = et.closest('.hT'), di = et.closest('.hD');
      if (tu) basculerFavori(`tenue:${H.ck}:${tu.dataset.sid}`, et);
      else if (di) basculerFavori(di.dataset.id, et);
      return;
    }
    const cell = t.closest('.hGrille .cell'); if (cell) { choisirPerso(cell.dataset.ck); return; }
    const tu = t.closest('.hT'); if (tu) { choisirTenue(tu.dataset.sid, tu); return; }
    const p = t.closest('.hP'); if (p) { choisirTenue(p.dataset.sid, p); return; }
    const d = t.closest('.hD'); if (d) { choisirDisque(d.dataset.id, d); return; }
    if (t.closest('.hDisqueSlot')) { if (H.tour !== 1) { refuser(t.closest('.hDisqueSlot')); return; } H.pop ? fermerPop() : ouvrirPop(); return; }
    if (t.closest('.hConfirmer')) { confirmer(); return; }
    if (t.closest('.hRetour')) { retour(); return; }
    const o = t.closest('[data-onglet]'); if (o) { H.onglet = o.dataset.onglet; son('move'); majOnglet(); return; }
    const df = t.closest('[data-diff]'); if (df) { H.diff = (H.diff + +df.dataset.diff + DIFFS.length) % DIFFS.length; son('move'); majTour(); return; }
    if (H.pop && !t.closest('.hDisquePop')) fermerPop();
  });
  // Survol : le perso survolé dans la grille, la tenue ou le chroma survolé,
  // le disque survolé — tout passe sur l'aperçu, comme dans Brawlhalla et LoL.
  racine.addEventListener('mouseover', e => {
    const t = e.target;
    const cell = t.closest('.hGrille .cell');
    if (cell && H.tour === 1 && cell.dataset.ck !== '__rnd') { if (H.survolCk !== cell.dataset.ck) { H.survolCk = cell.dataset.ck; son('survol'); majHeros(); } return; }
    const tu = t.closest('.hT, .hP');
    if (tu && H.tour === 1 && !H.rnd && tu.dataset.sid !== '__fav') { if (H.survolT !== tu.dataset.sid) { H.survolT = tu.dataset.sid; son('survol'); majHeros(); } return; }
    const d = t.closest('.hD');
    if (d && H.tour === 1) { if (H.survolD !== d.dataset.id) { H.survolD = d.dataset.id; son('survol'); dessinerDisqueHeros(); } return; }
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
    recommencer() { H.tour = 1; H.cpu = null; H.rnd = false; H.ck = 'naruto'; H.pop = false; qa('.tamponPret').forEach(e => e.remove()); toutMaj(); },
    toutMaj,
  };
}
