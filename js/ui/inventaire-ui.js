// ---------------------------------------------------------------------------
// Écran INVENTAIRE / BOUTIQUE.
//
// Deux onglets : ce qu'on a, et ce qui se vend. Cinq catégories : tenues,
// disques, dos de cartes, titres, bannières. On survole une carte pour la voir
// en grand, on clique pour l'équiper (ou pour la choisir, en boutique), et un
// second clic sur ACHETER confirme — payer d'un seul clic, ça se regrette.
//
// Ce que cet écran NE fait pas : équiper une tenue ou un disque. Ça se choisit
// dans la sélection des persos, juste avant le match, comme les skins et les
// skins d'arme de Brawlhalla. Ici on les regarde, on les met en favori, on leur
// achète un StatTrak™.
//
// Données : data/inventaire.js. Dessins des dos et bannières :
// ui/inventaire-visuels.js. Habillage : css/inventaire.css.
// Réglages issus du mockup mockups/inventaire.html.
// ---------------------------------------------------------------------------
import { $, showScreen, curScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { CHARS } from '../data/characters.js';
import { drawSkinDisc } from '../data/skins.js';
import { skinActif } from '../data/skins-perso.js';
import { Compte, connecte, mesTitres } from '../reseau/compte.js';
import { catalogue, objetDe, possede, equiper, equipeDe, estFavori, basculerFavori, listeFavoris,
  statDe, pourcentStat, acheter, acheterCompteur, poserTitres, titresDuCompte,
  PRIX, CATEGORIES, NOM_TYPE } from '../data/inventaire.js';
import { dosHTML, banniereHTML, plaqueTitreHTML } from './inventaire-visuels.js';

const PIECE = '<span class="piece" aria-hidden="true"></span>';
const CADENAS = '<svg class="cadenas" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill="#fff" stroke="#111318" stroke-width="2.4"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="#111318" stroke-width="2.4"/><circle cx="12" cy="15.6" r="1.6" fill="#111318"/></svg>';
const nombre = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const PAR_PAGE = 50;

// `tri` ne sert qu'en boutique : dans l'inventaire on est déjà rangé par perso.
const S = { onglet:'inventaire', categorie:'tenue', pages:{}, choix:null, survol:null, confirmer:null, tri:'prix' };
let ecran = null, grille = null, boucle = null, minuteur = null;

/* ---------- images, faites une fois ---------- */
const cache = new Map();
function sprite(ck, sid, k = 6) {
  const cle = ck + ':' + sid + ':' + k;
  if (cache.has(cle)) return cache.get(cle);
  const c = CHARS[ck], src = (c.skins && c.skins[sid] && c.skins[sid].idle) || c.frames.idle;
  const cv = document.createElement('canvas');
  cv.width = src.width * k; cv.height = src.height * k;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, cv.width, cv.height);
  const url = cv.toDataURL(); cache.set(cle, url); return url;
}
function disqueURL(did) {
  const cle = 'd:' + did;
  if (cache.has(cle)) return cache.get(cle);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  try { drawSkinDisc(cv.getContext('2d'), 64, 64, 58, did, 0); } catch (e) { }
  const url = cv.toDataURL(); cache.set(cle, url); return url;
}

/* ---------- ouverture ---------- */
export function ouvrirInventaire() {
  showScreen('inventaire');
  if (!ecran) construire();
  // Les titres gagnés vivent sur le compte : on les demande à l'ouverture.
  if (connecte()) mesTitres().then(l => { poserTitres(l.map(t => t.titre || t)); rendreTout(); }).catch(() => { });
  S.choix = null; S.confirmer = null; S.survol = null;
  rendreTout();
}

function construire() {
  ecran = $('scr-inventaire');
  ecran.innerHTML = `
    <div class="bg bg-inv">
      <div class="invFondCouche" data-pour="inventaire"></div><div class="invFondCouche" data-pour="boutique"></div>
      <div class="streaks"></div><div class="arc"></div>
      <div class="ringwrap"><svg viewBox="0 0 400 400"><path id="ring-inv" d="M 200,200 m -160,0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0" fill="none"/>
        <text><textPath href="#ring-inv" startOffset="0%">INVENTAIRE • BOUTIQUE • INVENTAIRE • BOUTIQUE • INVENTAIRE • BOUTIQUE • </textPath></text></svg></div>
    </div>
    <div class="invTitre">
      <button data-onglet="inventaire"><span>INVENTAIRE</span></button><button data-onglet="boutique"><span>BOUTIQUE</span></button>
    </div>
    <div class="invSolde"><span class="pieceTourne"><i class="av"></i><i class="ar"></i></span><b class="soldeVal">0</b><em class="soldeHors">HORS LIGNE</em></div>
    <div class="invCats tabs">${CATEGORIES.map(c => `<div class="tab" data-cat="${c.id}">${c.nom}<em></em></div>`).join('')}</div>
    <div class="invGrille"><div class="igDefil"><div class="igCartes"></div><p class="igVide"></p></div></div>
    <div class="invApercu">
      <div class="iaTete"><span class="iaType"></span><span class="iaEtat"></span></div>
      <div class="iaScene"><div class="iaRayons"></div><div class="iaHalo"></div><div class="iaSol"></div><div class="iaVisuel"></div><div class="iaTampon"></div></div>
      <div class="iaInfos">
        <div class="iaNom"></div><div class="iaPuces"></div><div class="iaDesc"></div>
        <div class="iaSt"></div><div class="iaActions"></div><div class="iaLien"></div>
      </div>
    </div>
    <div class="invPied">
      <div class="ipPages"><button class="ipFleche" data-page="-1">◀</button><span class="ipNum"></span><button class="ipFleche" data-page="1">▶</button></div>
      <span class="ipCompte"></span><button class="ipTri" title="Changer le tri"></button>
      <div class="ipFav"><button class="ipFavBtn"><span class="de">🎲</span> JOUER EN FAVORIS</button></div>
    </div>
    <div class="invToast"></div>`;
  grille = ecran.querySelector('.igCartes');
  brancher();
}

const q = s => ecran.querySelector(s);
const qa = s => [...ecran.querySelectorAll(s)];

/* ---------- listes ---------- */
const ROSTER_ORDRE = Object.keys(CHARS);
const indexPerso = o => o.ck ? ROSTER_ORDRE.indexOf(o.ck) : -1;
const rang = o => ({ base:0, chroma:1, skin:2 })[o.rarete] ?? 0;
const alpha = (a, b) => a.nom.localeCompare(b.nom, 'fr');

function liste() {
  const L = catalogue().filter(o => o.type === S.categorie);
  if (S.onglet === 'inventaire') {
    return L.filter(o => possede(o.id)).sort((a, b) =>
      (indexPerso(a) - indexPerso(b)) || ((b.defaut ? 1 : 0) - (a.defaut ? 1 : 0)) || (rang(a) - rang(b)) || alpha(a, b));
  }
  const vendable = o => o.source === 'direct';
  const boutique = L.filter(o => o.source !== 'defaut' && !(o.secret && !possede(o.id)));
  // Par personnage : on voit d'un coup tout ce qui manque à celui qu'on joue.
  // Par prix : on voit ce qu'on peut s'offrir avec ce qu'on a.
  if (S.tri === 'perso') {
    return boutique.sort((a, b) =>
      ((vendable(b) ? 1 : 0) - (vendable(a) ? 1 : 0)) || (indexPerso(a) - indexPerso(b)) || (rang(a) - rang(b)) || (a.prix - b.prix) || alpha(a, b));
  }
  return boutique.sort((a, b) =>
    ((vendable(b) ? 1 : 0) - (vendable(a) ? 1 : 0)) || (a.prix - b.prix) || (indexPerso(a) - indexPerso(b)) || (rang(a) - rang(b)) || alpha(a, b));
}
const clePage = () => S.onglet + ':' + S.categorie;
const estEquipe = o => o.type === 'tenue' ? skinActif(o.ck) === o.sid : equipeDe(o.type) === o.id;
const auHub = o => o.type === 'tenue' || o.type === 'disque';
const aStat = o => o.type === 'tenue' || o.type === 'disque';

/* ---------- une carte ---------- */
function visuel(o, grand) {
  if (o.type === 'tenue') return `<img class="${grand ? 'iaSprite' : 'icSprite'}" src="${sprite(o.ck, o.sid, grand ? 10 : 6)}" alt="">`;
  if (o.type === 'disque') return grand ? '<canvas class="iaDisque" width="320" height="320"></canvas>' : `<img class="icDisque" src="${disqueURL(o.did)}" alt="">`;
  if (o.type === 'dos') return dosHTML(o.did);
  if (o.type === 'banniere') return banniereBonne(o);
  return plaqueTitreHTML(o.nom, o.tid === 'createur');
}
// « Ma bannière » montre l'image envoyée quand il y en a une.
function banniereBonne(o) {
  const url = Compte.profil && Compte.profil.banniere;
  if (o.bid === 'perso' && url) return `<div class="banniere"><img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover"></div>`;
  return banniereHTML(o.bid);
}
function particules(o, k = 1) {
  const n = Math.round((o.rarete === 'skin' ? 6 : o.rarete === 'chroma' ? 3 : 0) * k);
  let h = '';
  for (let i = 0; i < n; i++) {
    const x = (8 + Math.random() * 84).toFixed(0), y = (22 + Math.random() * 50).toFixed(0);
    const d = (Math.random() * 3).toFixed(2), t = (2.2 + Math.random() * 1.8).toFixed(2), taille = (0.6 + Math.random() * .8).toFixed(2);
    const teinte = o.chroma ? `--pc:hsl(${(Math.random() * 360) | 0} 95% 70%)` : '';
    h += `<i style="left:${x}%;top:${y}%;--d:-${d}s;--t:${t}s;--k:${taille};${teinte}"></i>`;
  }
  return h;
}
function carte(o) {
  const el = document.createElement('div');
  const verrou = !possede(o.id);
  el.className = `invCarte r-${o.rarete || 'aucune'} t-${o.type}` + (o.chroma ? ' chroma' : '') + (verrou ? ' verrou' : '') +
    (estEquipe(o) && !verrou ? ' equipe' : '') + (estFavori(o.id) ? ' favori' : '') + (S.choix === o.id ? ' choisie' : '');
  el.dataset.id = o.id;
  const st = statDe(o.id);
  const ligneSt = st && !verrou ? `<small class="icSt"><b>ST</b>${pourcentStat(st)} % · ${st.m} MATCH${st.m > 1 ? 'S' : ''}</small>` : '';
  let prix = '';
  if (S.onglet === 'boutique') {
    if (!verrou) prix = `<span class="icPossede">✔ POSSÉDÉ</span>`;
    else if (o.source === 'direct') prix = `<span class="icPrix">${PIECE}${nombre(o.prix)}</span>`;
    else prix = `<span class="icPrix gain">${o.source === 'tuto' ? 'TUTORIEL' : 'À GAGNER'}</span>`;
  }
  el.innerHTML = `${o.chroma ? '<div class="icIris"><i></i></div>' : ''}<div class="icFond"></div>
    ${o.rarete === 'skin' ? '<div class="icLueur"></div>' : ''}
    <div class="icVisuel">${visuel(o)}</div>
    <div class="icParts">${particules(o)}</div>
    ${verrou ? `<div class="icCadenas">${CADENAS}</div>` : ''}
    <button class="icEtoile" title="Favori">★</button>
    ${o.chroma ? '<span class="icChroma">CHROMA</span>' : ''}
    <span class="icRuban">✔ ÉQUIPÉ</span>
    ${prix}
    <div class="icBas"><b class="icNom">${o.nom}</b>${ligneSt}</div>`;
  return el;
}

/* ---------- rendu ---------- */
function rendreGrille(animer) {
  const L = liste(), nPages = Math.max(1, Math.ceil(L.length / PAR_PAGE));
  let p = S.pages[clePage()] || 0;
  if (p >= nPages) p = nPages - 1;
  S.pages[clePage()] = p;
  const tranche = L.slice(p * PAR_PAGE, (p + 1) * PAR_PAGE);
  grille.innerHTML = '';
  // En boutique, un séparateur par palier de prix : on voit ce que coûte la
  // rangée avant de lire un seul chiffre.
  // Les séparateurs suivent le tri : un par palier de prix, ou un par
  // personnage quand c'est par personnage qu'on range.
  const parPerso = S.tri === 'perso' && tranche.some(o => o.ck);
  const groupe = o => S.onglet !== 'boutique' ? ''
    : o.source !== 'direct' ? 'x'
    : parPerso ? (o.ck ? 'c' + o.ck : 'z') : 'p' + o.prix;
  const nGroupes = new Set(tranche.map(groupe)).size;
  let dernier = null, n = 0;
  for (const o of tranche) {
    const g = groupe(o);
    if (S.onglet === 'boutique' && nGroupes > 1 && g !== dernier) {
      const h = document.createElement('div');
      h.className = 'igEntete';
      if (g === 'x') h.innerHTML = '<i class="gris"></i>À GAGNER EN JOUANT';
      else if (g.startsWith('c')) {
        const total = catalogue().filter(x => x.type === o.type && x.ck === o.ck).length;
        const a = catalogue().filter(x => x.type === o.type && x.ck === o.ck && possede(x.id)).length;
        h.innerHTML = `<i style="background:${CHARS[o.ck].color}"></i>${CHARS[o.ck].short}<em>${a} / ${total}</em>`;
      } else h.innerHTML = `${PIECE}${nombre(o.prix)}<em>${o.type === 'tenue' ? (o.prix === PRIX.chroma ? 'CHROMAS' : 'SKINS') : ''}</em>`;
      grille.appendChild(h); dernier = g;
    }
    const c = carte(o);
    grille.appendChild(c);
    if (animer && n < 36) c.animate([{ opacity:0, transform:'translateY(2.4cqh) scale(.86)' }, { opacity:1, transform:'none' }],
      { duration:300, delay:n * 16, easing:'cubic-bezier(.2,.8,.3,1)', fill:'backwards' });
    n++;
  }
  q('.igVide').textContent = !L.length ? (S.onglet === 'inventaire' ? 'Rien ici pour l’instant — passe à la BOUTIQUE.' : 'Tout est à toi. Bravo.') : '';
  q('.ipNum').textContent = `PAGE ${p + 1} / ${nPages}`;
  for (const b of qa('.ipFleche')) b.disabled = (+b.dataset.page < 0 ? p <= 0 : p >= nPages - 1);
  q('.ipCompte').textContent = `${L.length} OBJET${L.length > 1 ? 'S' : ''}`;
  if (animer) q('.igDefil').scrollTop = 0;
}
function majCompteurs() {
  for (const t of qa('.invCats .tab')) {
    const c = t.dataset.cat, tous = catalogue().filter(o => o.type === c && !(o.secret && !possede(o.id)));
    t.classList.toggle('active', c === S.categorie);
    t.querySelector('em').textContent = S.onglet === 'inventaire'
      ? tous.filter(o => possede(o.id)).length
      : tous.filter(o => o.source !== 'defaut' && !possede(o.id)).length;
  }
}
function majEntete() {
  ecran.dataset.onglet = S.onglet;
  for (const b of qa('.invTitre button')) b.classList.toggle('on', b.dataset.onglet === S.onglet);
  q('.soldeVal').textContent = nombre((Compte.profil && Compte.profil.pieces) || 0);
  q('.invSolde').classList.toggle('hors', !connecte());
  const tri = q('.ipTri');
  tri.style.display = S.onglet === 'boutique' ? '' : 'none';
  tri.innerHTML = `TRI : <b>${S.tri === 'perso' ? 'PAR PERSONNAGE' : 'PAR PRIX'}</b> ⇅`;
  q('.ipFav').style.display = S.onglet === 'inventaire' ? '' : 'none';
}
function rendreTout(animer = true) {
  if (!ecran) return;
  majEntete(); majCompteurs(); rendreGrille(animer);
  const L = liste();
  if (!S.choix || !L.some(o => o.id === S.choix)) {
    const depart = S.onglet === 'boutique' ? L.find(o => !possede(o.id)) : L.find(o => estEquipe(o));
    S.choix = (depart || L[0] || {}).id || null;
    marquerChoix();
  }
  majApercu(true);
}
function marquerChoix() { for (const c of grille.querySelectorAll('.invCarte')) c.classList.toggle('choisie', c.dataset.id === S.choix); }

/* ---------- aperçu ---------- */
let apercuId = null;
function majApercu(forcer) {
  const o = objetDe(S.survol || S.choix);
  const ap = q('.invApercu');
  if (!o) { ap.classList.add('vide'); return; }
  ap.classList.remove('vide');
  const meme = apercuId === o.id;
  apercuId = o.id;
  for (const c of [...ap.classList]) if (/^[rt]-/.test(c) || c === 'chroma') ap.classList.remove(c);
  ap.classList.add('r-' + (o.rarete || 'aucune'), 't-' + o.type);
  ap.classList.toggle('chroma', !!o.chroma);
  const verrou = !possede(o.id);
  q('.iaType').textContent = (o.ck ? CHARS[o.ck].short + ' · ' : '') + NOM_TYPE[o.type];
  const et = q('.iaEtat');
  et.innerHTML = verrou ? (S.onglet === 'boutique' ? CADENAS + ' VERROUILLÉ' : '') : estEquipe(o) ? '✔ ÉQUIPÉ' : 'POSSÉDÉ';
  et.className = 'iaEtat' + (verrou ? ' verrou' : estEquipe(o) ? ' equipe' : '');
  q('.iaHalo').style.setProperty('--halo', o.ck ? CHARS[o.ck].color : 'var(--rc)');
  if (!meme || forcer) {
    stopperBoucle();
    const vis = q('.iaVisuel');
    vis.innerHTML = visuel(o, true);
    if (o.type === 'disque') demarrerDisque(vis.querySelector('canvas'), o.did);
    vis.animate([{ opacity:0, transform:'translateY(1.5cqh) scale(.94)' }, { opacity:1, transform:'none' }], { duration:220, easing:'cubic-bezier(.2,.8,.3,1)' });
  }
  q('.iaNom').textContent = o.nom;
  const RAR = { base:'DE BASE', chroma:'CHROMA', skin:'SKIN' };
  q('.iaPuces').innerHTML = (o.rarete ? `<span class="puce rar">${RAR[o.rarete]}</span>` : '') +
    (estFavori(o.id) ? '<span class="puce fav">★ FAVORI</span>' : '');
  q('.iaDesc').textContent = o.cond ? (possede(o.id) ? 'Gagné : ' + o.cond.toLowerCase() : 'Pour l’obtenir : ' + o.cond.toLowerCase())
    : o.desc || (o.type === 'tenue'
      ? (o.chroma ? 'Chroma : la même tenue, dans d’autres couleurs.' : o.defaut ? 'La tenue d’origine, offerte.' : 'Skin : redessiné de la tête aux pieds.')
      : '');
  majStat(o); majActions(o);
}
function majStat(o) {
  const z = q('.iaSt');
  if (!aStat(o)) { z.innerHTML = ''; z.className = 'iaSt'; return; }
  const st = statDe(o.id);
  if (st && possede(o.id)) {
    z.className = 'iaSt on';
    z.innerHTML = `<div class="stTete"><b>STATTRAK™</b><span>IA + EN LIGNE</span></div>
      <div class="stChiffres"><strong>${pourcentStat(st)} %</strong><span>DE VICTOIRES<br>${st.m} MATCH${st.m > 1 ? 'S' : ''} · ${st.v} V – ${st.m - st.v} D</span></div>
      <div class="stBarre"><i style="width:${pourcentStat(st)}%"></i></div>`;
  } else if (possede(o.id)) {
    z.className = 'iaSt achat';
    const c = S.confirmer === 'st:' + o.id;
    z.innerHTML = `<button class="iaBtn st${c ? ' confirme' : ''}" data-action="stattrak">${c ? 'CONFIRMER ?' : 'AJOUTER UN STATTRAK™'} <span class="prixBtn">${PIECE}${PRIX.stattrak}</span></button>
      <p>Compte tes victoires avec cet objet, contre l’IA et en ligne, à partir de l’achat.</p>`;
  } else {
    z.className = 'iaSt';
    z.innerHTML = `<p>StatTrak™ disponible après l’achat · ${PIECE}${PRIX.stattrak}</p>`;
  }
}
function majActions(o) {
  const z = q('.iaActions'), lien = q('.iaLien');
  lien.innerHTML = '';
  const fav = `<button class="iaBtn fav${estFavori(o.id) ? ' on' : ''}" data-action="favori" title="Favori">★</button>`;
  if (possede(o.id) && auHub(o)) {
    z.innerHTML = `<button class="iaBtn bleu" data-action="hub">${o.type === 'tenue' ? 'CHOISIR' : 'PRENDRE'} DANS LA SÉLECTION →</button>` + fav;
  } else if (possede(o.id)) {
    z.innerHTML = (estEquipe(o) ? '<button class="iaBtn equipe" disabled>✔ ÉQUIPÉ</button>'
      : '<button class="iaBtn vert" data-action="equiper">ÉQUIPER</button>') + fav;
  } else if (o.source === 'direct') {
    const c = S.confirmer === 'achat:' + o.id, solde = (Compte.profil && Compte.profil.pieces) || 0, manque = o.prix - solde;
    if (!connecte()) z.innerHTML = '<button class="iaBtn gris" data-action="connexion">CONNECTE-TOI POUR ACHETER</button>';
    else if (manque > 0) z.innerHTML = `<button class="iaBtn gris" disabled>IL TE MANQUE ${PIECE}${nombre(manque)}</button>`;
    else z.innerHTML = `<button class="iaBtn or${c ? ' confirme' : ''}" data-action="acheter">${c ? 'CONFIRMER ?' : 'ACHETER'} <span class="prixBtn">${PIECE}${nombre(o.prix)}</span></button>`;
  } else {
    z.innerHTML = `<button class="iaBtn gris" disabled>${o.source === 'tuto' ? 'RÉCOMPENSE DU TUTORIEL' : 'À GAGNER EN JOUANT'}</button>`;
  }
  if (o.type === 'tenue' && o.casino && !possede(o.id) && S.onglet === 'boutique')
    lien.innerHTML = '<button class="iaLienCasino" data-action="casino">ou tente ta chance aux caisses du <b>CASINO</b> →</button>';
}

/* ---------- le disque tourne dans l'aperçu ---------- */
function demarrerDisque(cv, did) {
  if (!cv) return;
  const g = cv.getContext('2d');
  let a = 0, t0 = performance.now();
  const pas = t => {
    const dt = Math.min(.05, (t - t0) / 1000); t0 = t; a += dt * 7;
    g.clearRect(0, 0, cv.width, cv.height); g.save(); g.translate(cv.width / 2, cv.height / 2); g.rotate(a);
    try { drawSkinDisc(g, 0, 0, cv.width / 2 - 6, did, a); } catch (e) { }
    g.restore();
    boucle = requestAnimationFrame(pas);
  };
  boucle = requestAnimationFrame(pas);
}
function stopperBoucle() { if (boucle) cancelAnimationFrame(boucle); boucle = null; }

/* ---------- petits effets ---------- */
function toast(txt, dore) {
  const t = q('.invToast');
  t.innerHTML = txt; t.classList.toggle('dore', !!dore);
  t.getAnimations().forEach(a => a.cancel());
  t.animate([{ opacity:0, transform:'translate(-50%,1.5cqh)' }, { opacity:1, transform:'translate(-50%,0)', offset:.1 },
    { opacity:1, transform:'translate(-50%,0)', offset:.85 }, { opacity:0, transform:'translate(-50%,-.5cqh)' }],
    { duration:2800, easing:'ease-out', fill:'forwards' });
}
const carteDe = id => grille.querySelector(`.invCarte[data-id="${CSS.escape(id)}"]`);
function animerEclat(c) {
  if (!c) return;
  c.animate([{ transform:'scale(1)' }, { transform:'scale(1.12)', offset:.35 }, { transform:'scale(1)' }], { duration:420, easing:'cubic-bezier(.2,.8,.3,1)' });
  const f = document.createElement('i'); f.className = 'icFlash'; c.appendChild(f);
  f.animate([{ opacity:.9 }, { opacity:0 }], { duration:420, easing:'ease-out' }).finished.then(() => f.remove(), () => f.remove());
  for (let i = 0; i < 12; i++) {
    const e = document.createElement('span'); e.className = 'etincelle'; c.appendChild(e);
    const a = (i / 12) * Math.PI * 2 + Math.random() * .5, dist = 26 + Math.random() * 26;
    e.animate([{ transform:'translate(-50%,-50%) scale(1)', opacity:1 },
      { transform:`translate(calc(${Math.cos(a) * dist}cqi - 50%),calc(${Math.sin(a) * dist}cqi - 50%)) scale(.2) rotate(200deg)`, opacity:0 }],
      { duration:520 + Math.random() * 200, easing:'cubic-bezier(.1,.8,.3,1)' }).finished.then(() => e.remove(), () => e.remove());
  }
}
function tamponApercu(txt) {
  const t = q('.iaTampon');
  t.textContent = txt;
  t.getAnimations().forEach(a => a.cancel());
  t.animate([{ opacity:0, transform:'translate(-50%,-50%) scale(2.2) rotate(-14deg)' }, { opacity:1, transform:'translate(-50%,-50%) scale(1) rotate(-8deg)', offset:.25 },
    { opacity:1, transform:'translate(-50%,-50%) scale(1) rotate(-8deg)', offset:.8 }, { opacity:0, transform:'translate(-50%,-50%) scale(1.05) rotate(-8deg)' }],
    { duration:1300, easing:'ease-out', fill:'forwards' });
}
function animerSolde(avant, apres) {
  const el = q('.soldeVal'), t0 = performance.now(), D = 650;
  const pas = t => {
    const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
    el.textContent = nombre(Math.round(avant + (apres - avant) * e));
    if (k < 1) requestAnimationFrame(pas);
  };
  requestAnimationFrame(pas);
  q('.invSolde').animate([{ transform:'scale(1)' }, { transform:'scale(1.14)', offset:.3 }, { transform:'scale(1)' }], { duration:450, easing:'ease-out' });
}
// Une confirmation qui s'efface seule : cliquer une fois ne coûte rien.
function armerConfirmation(o) {
  clearTimeout(minuteur);
  minuteur = setTimeout(() => { S.confirmer = null; const v = objetDe(S.survol || S.choix); if (v === o) { majActions(o); majStat(o); } }, 2800);
}

/* ---------- gestes ---------- */
async function acheterObjetUI(o) {
  if (S.confirmer !== 'achat:' + o.id) { S.confirmer = 'achat:' + o.id; sfx('move'); majActions(o); armerConfirmation(o); return; }
  S.confirmer = null;
  const avant = (Compte.profil && Compte.profil.pieces) || 0;
  try {
    await acheter(o.id);
    sfx('full');
    animerSolde(avant, (Compte.profil && Compte.profil.pieces) || 0);
    majCompteurs(); rendreGrille(false); marquerChoix(); majApercu(true);
    animerEclat(carteDe(o.id)); tamponApercu('DÉBLOQUÉ !');
    toast(`${o.nom} ${o.ck ? 'pour ' + CHARS[o.ck].short + ' ' : ''}est à toi !`, true);
  } catch (e) { sfx('deny'); toast('🔒 ' + e.message); }
}
async function acheterStatUI(o) {
  if (S.confirmer !== 'st:' + o.id) { S.confirmer = 'st:' + o.id; sfx('move'); majStat(o); armerConfirmation(o); return; }
  S.confirmer = null;
  const avant = (Compte.profil && Compte.profil.pieces) || 0;
  try {
    await acheterCompteur(o.id);
    sfx('full');
    animerSolde(avant, (Compte.profil && Compte.profil.pieces) || 0);
    rendreGrille(false); marquerChoix(); majApercu(true); tamponApercu('STATTRAK™ !');
  } catch (e) { sfx('deny'); toast('🔒 ' + e.message); }
}
function equiperUI(o) {
  if (!equiper(o.id)) { sfx('deny'); return; }
  sfx('select');
  rendreGrille(false); marquerChoix(); majApercu(true);
  animerEclat(carteDe(o.id)); tamponApercu('ÉQUIPÉ !');
}
// « Jouer en favoris » : une tenue et un disque tirés parmi les étoiles, puis
// on part choisir son perso avec, comme le tirage favori de Brawlhalla.
function jouerFavoris() {
  const favs = listeFavoris().map(objetDe).filter(o => o && possede(o.id));
  const tenues = favs.filter(o => o.type === 'tenue'), disques = favs.filter(o => o.type === 'disque');
  if (!tenues.length && !disques.length) { sfx('deny'); toast('Mets des ★ sur tes tenues et tes disques d’abord.'); return; }
  const t = tenues[(Math.random() * tenues.length) | 0], d = disques[(Math.random() * disques.length) | 0];
  if (d) equiper(d.id);
  sfx('select');
  document.dispatchEvent(new CustomEvent('inventaireJouer', { detail:{ tenue:t ? t.id : null, disque:d ? d.id : null } }));
}

function brancher() {
  ecran.addEventListener('click', e => {
    const t = e.target;
    const ong = t.closest('.invTitre button');
    if (ong) { if (ong.dataset.onglet !== S.onglet) { S.onglet = ong.dataset.onglet; S.survol = null; S.choix = null; S.confirmer = null; sfx('select'); rendreTout(); } return; }
    const c = t.closest('.invCats .tab');
    if (c) { if (c.dataset.cat !== S.categorie) { S.categorie = c.dataset.cat; S.survol = null; S.choix = null; S.confirmer = null; sfx('move'); rendreTout(); } return; }
    const fl = t.closest('.ipFleche');
    if (fl) { if (!fl.disabled) { S.pages[clePage()] = (S.pages[clePage()] || 0) + +fl.dataset.page; sfx('move'); rendreGrille(true); } return; }
    if (t.closest('.ipTri')) { S.tri = S.tri === 'prix' ? 'perso' : 'prix'; S.pages[clePage()] = 0; sfx('move'); majEntete(); rendreGrille(true); return; }
    if (t.closest('.ipFavBtn')) { jouerFavoris(); return; }
    const etoile = t.closest('.icEtoile');
    if (etoile) {
      const o = objetDe(etoile.closest('.invCarte').dataset.id);
      const on = basculerFavori(o.id);
      sfx('move');
      etoile.closest('.invCarte').classList.toggle('favori', on);
      etoile.animate([{ transform:'scale(1)' }, { transform:'scale(1.7) rotate(72deg)', offset:.4 }, { transform:'scale(1)' }], { duration:380, easing:'ease-out' });
      majApercu();
      return;
    }
    const carteEl = t.closest('.invCarte');
    if (carteEl) {
      const o = objetDe(carteEl.dataset.id);
      if (S.choix !== o.id) S.confirmer = null;
      S.choix = o.id; marquerChoix();
      if (S.onglet === 'inventaire' && !auHub(o) && !estEquipe(o) && possede(o.id)) equiperUI(o);
      else { sfx('move'); majApercu(); }
      return;
    }
    const act = t.closest('[data-action]');
    if (act) {
      const o = objetDe(S.survol || S.choix);
      if (!o) return;
      const a = act.dataset.action;
      if (a === 'equiper') equiperUI(o);
      else if (a === 'favori') { basculerFavori(o.id); sfx('move'); rendreGrille(false); marquerChoix(); majApercu(); }
      else if (a === 'acheter') acheterObjetUI(o);
      else if (a === 'stattrak') acheterStatUI(o);
      else if (a === 'hub') { sfx('select'); toast('Tenue et disque se choisissent dans la sélection, juste avant le match.'); }
      else if (a === 'casino') { sfx('select'); document.dispatchEvent(new CustomEvent('inventaireCasino')); }
      else if (a === 'connexion') { sfx('select'); document.dispatchEvent(new CustomEvent('inventaireConnexion')); }
    }
  });
  grille.addEventListener('mouseover', e => {
    const c = e.target.closest('.invCarte');
    if (!c || c.dataset.id === S.survol) return;
    S.survol = c.dataset.id;
    if (S.confirmer) S.confirmer = null;
    majApercu();
  });
  ecran.querySelector('.invGrille').addEventListener('mouseleave', () => { if (!S.survol) return; S.survol = null; majApercu(); });
  // L'écran quitté, le disque cesse de tourner : rien ne doit continuer à
  // dessiner derrière un menu fermé.
  document.addEventListener('ecranChange', () => { if (curScreen !== 'inventaire') stopperBoucle(); });
  document.addEventListener('inventaireChange', () => { if (curScreen === 'inventaire') { majEntete(); majCompteurs(); } });
}
