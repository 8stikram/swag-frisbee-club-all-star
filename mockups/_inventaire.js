// ---------------------------------------------------------------------------
// Écran INVENTAIRE / BOUTIQUE — mockup (mockups/inventaire.html).
//
// Tout l'écran vit ici : le catalogue, l'état d'un faux compte, la grille,
// l'aperçu, les achats, les favoris aléatoires et les effets. La page
// inventaire.html ne fait que le régler (placement, typo, curseurs) et
// l'exporter en JSON.
//
// Rien n'est lu ni écrit dans la vraie sauvegarde : le compte est simulé.
// La page fournit les sprites (CHARS), le dessin des disques et les sons.
//
// D.A. reprise du jeu (css/style.css) : contour encre de 4 px, ombre dure,
// Archivo Black pour les titres, Chakra Petch pour les boutons, fond
// semi-transparent qui laisse voir la démo.
//
// Décisions du 19/09 : chroma moins cher (100 contre 200), disques à 50
// pièces sauf deux offerts par compte, StatTrak à 25 pièces par objet (un seul
// compteur, IA et en ligne réunis), dos de cartes et bannières en boutique,
// titres gagnés en jouant.
// ---------------------------------------------------------------------------

export const POLICES = {
  archivo:    { nom:'Archivo Black',       famille:"'Archivo Black',sans-serif",      poids:400 },
  russo:      { nom:'Russo One',           famille:"'Russo One',sans-serif",          poids:400 },
  barlow:     { nom:'Barlow ExtraBold',    famille:"'Barlow',sans-serif",             poids:800 },
  chakra:     { nom:'Chakra Petch Bold',   famille:"'Chakra Petch','Archivo Black',sans-serif", poids:700 },
  dotgothic:  { nom:'DotGothic16',         famille:"'DotGothic16',monospace",         poids:400 },
  greatvibes: { nom:'Great Vibes',         famille:"'Great Vibes',cursive",           poids:400 },
  georgia:    { nom:'Georgia (casino)',    famille:"Georgia,serif",                   poids:700 },
  segoe:      { nom:'Segoe UI',            famille:"'Segoe UI',system-ui,sans-serif", poids:700 },
};

// Trois raretés, et seulement pour les tenues (précisé le 19/09) : la tenue
// DE BASE, offerte ; le CHROMA, qui ne change que les couleurs ; le SKIN,
// redessiné de la tête aux pieds. Un chroma est MOINS rare qu'un skin : c'est
// un recoloriage. La rareté découle donc de la nature de la tenue, elle ne se
// choisit pas. Les autres objets n'ont pas de rareté pour l'instant.
export const RARETES = ['base', 'chroma', 'skin'];
export const NOMS_RARETE = { base:'DE BASE', chroma:'CHROMA', skin:'SKIN' };
const rareteTenue = s => s.defaut ? 'base' : s.chroma ? 'chroma' : 'skin';

// Tarifs fixés le 19/09 : la nature de l'objet fait son prix.
export const PRIX = { tenue:200, chroma:100, disque:50, stattrak:25 };

// Ambiances : l'inventaire et la boutique ont chacun la leur, et l'écran bascule
// de l'une à l'autre avec l'onglet, comme la sélection change de couleur avec
// les persos.
export const PALETTES = {
  lavande: { nom:'Lavande',        fond:'linear-gradient(160deg,rgba(228,214,255,.88) 0%,rgba(198,178,250,.86) 50%,rgba(160,130,236,.88) 100%)', accent:'#9b6cf0', sombre:false },
  or:      { nom:'Or (pièces)',     fond:'linear-gradient(160deg,rgba(255,242,186,.9) 0%,rgba(255,216,122,.88) 50%,rgba(246,174,62,.9) 100%)',  accent:'#ffae1a', sombre:false },
  menthe:  { nom:'Menthe',          fond:'linear-gradient(160deg,rgba(214,252,232,.88) 0%,rgba(160,236,204,.86) 50%,rgba(92,206,164,.88) 100%)', accent:'#22b383', sombre:false },
  rose:    { nom:'Rose',            fond:'linear-gradient(160deg,rgba(255,222,232,.88) 0%,rgba(255,184,206,.86) 50%,rgba(242,120,160,.88) 100%)', accent:'#f2698c', sombre:false },
  cyan:    { nom:'Cyan (menu titre)', fond:'linear-gradient(160deg,rgba(210,247,245,.86) 0%,rgba(150,230,236,.84) 45%,rgba(99,208,221,.86) 100%)', accent:'#1fb5c9', sombre:false },
  nuit:    { nom:'Nuit (façon Valorant)', fond:'radial-gradient(120cqh 90cqh at 50% 30%,rgba(28,36,70,.95) 0%,rgba(14,18,38,.96) 60%,rgba(5,7,16,.97) 100%)', accent:'#35e0ff', sombre:true },
  violet:  { nom:'Violet (options)', fond:'linear-gradient(160deg,rgba(36,26,92,.94) 0%,rgba(26,19,80,.94) 48%,rgba(13,10,40,.96) 100%)', accent:'#f5e63d', sombre:true },
};

export const DEF = {
  // Ambiance
  fondInventaire:'lavande', fondBoutique:'or', decor:'anneau',
  // Typo
  police_titre:'archivo', police_onglet:'archivo', police_nom:'chakra', police_prix:'russo',
  // Grille
  colonnes:6, ecart:1.3, rayon:12, ombre:4, survol:1.06, tailleNom:1, entetes:'boutique', ordreRarete:'croissant',
  // Raretés des tenues
  c_base:'#9aa0ac', c_chroma:'#35c6e0', c_skin:'#ffae1a',
  // Effets
  particules:1, lueur:1, vitesseIris:1, flash:1, entree:'oui',
  // Aperçu
  apercuSprite:1, apercuFlotte:1, rayons:1,
};

// x / y en % de l'écran (coin haut-gauche du bloc), s = échelle.
export const PLACEMENT_DEF = {
  titre:      { x:30,   y:0,    s:1 },
  solde:      { x:73.4, y:10.6, s:1 },
  categories: { x:2.5,  y:10.4, s:1 },
  grille:     { x:2.5,  y:18.6, s:1 },
  apercu:     { x:65.2, y:18.6, s:1 },
  pied:       { x:2.5,  y:90.3, s:1 },
};
export const NOMS_EL = {
  titre:'Onglets INVENTAIRE / BOUTIQUE', solde:'Solde de pièces', categories:'Catégories',
  grille:'Grille d’objets', apercu:'Aperçu', pied:'Pages et favoris aléatoires',
};

export const CATEGORIES = [
  { id:'tenue',    nom:'TENUES' },
  { id:'disque',   nom:'DISQUES' },
  { id:'dos',      nom:'DOS DE CARTES' },
  { id:'titre',    nom:'TITRES' },
  { id:'banniere', nom:'BANNIÈRES' },
];
const NOM_TYPE = { tenue:'TENUE', disque:'DISQUE', dos:'DOS DE CARTES', titre:'TITRE', banniere:'BANNIÈRE' };

// --- Contenu nouveau (premier lot, dessins provisoires) ---------------------
export const DOS = [
  { id:'runes',  nom:'RUNES DU DIABLE', defaut:true, desc:'Le dos d’origine du casino.' },
  { id:'neon',   nom:'NÉON',            prix:100 },
  { id:'noel',   nom:'NOËL',            prix:150 },
  { id:'holo',   nom:'HOLOGRAMME',      prix:250 },
];
export const BANNIERES = [
  { id:'perso',   nom:'MA BANNIÈRE',       defaut:true, desc:'L’image que tu envoies depuis ton profil.' },
  { id:'coucher', nom:'COUCHER DE SOLEIL', prix:100 },
  { id:'terrain', nom:'LE TERRAIN',        prix:150 },
  { id:'galaxie', nom:'GALAXIE',           prix:250 },
];
// Les titres se gagnent en jouant (table `titres` de supabase/profils.sql).
export const TITRES = [
  { id:'debutant', nom:'DÉBUTANT',        cond:'Offert à la création du compte' },
  { id:'habitue',  nom:'HABITUÉ',         cond:'Jouer 10 matchs en ligne' },
  { id:'veteran',  nom:'VÉTÉRAN',         cond:'Jouer 50 matchs en ligne' },
  { id:'tireur',   nom:'TIREUR D’ÉLITE',  cond:'Marquer 100 points au total' },
  { id:'invaincu', nom:'INVAINCU',        cond:'Gagner 10 matchs en ligne' },
  { id:'legende',  nom:'LÉGENDE',         cond:'Gagner 50 matchs en ligne' },
  { id:'createur', nom:'CRÉATEUR DU JEU', cond:'Avoir fait le jeu', secret:true },
];

// ---------------------------------------------------------------------------
// Catalogue
// ---------------------------------------------------------------------------
export function construireCatalogue({ SKINS, ROSTER, DISC_SKINS }, prix = {}, extra = 0) {
  const L = [];
  for (const ck of ROSTER) for (const s of (SKINS[ck] || [])) {
    const id = `tenue:${ck}:${s.id}`;
    L.push({ id, type:'tenue', ck, sid:s.id, nom:s.nom, chroma:!!s.chroma, defaut:!!s.defaut, rarete:rareteTenue(s),
      prix: s.defaut ? 0 : (s.chroma ? PRIX.chroma : PRIX.tenue),
      source: s.defaut ? 'defaut' : 'direct', casino: !s.defaut });
  }
  // Tenues factices pour éprouver la pagination (bloc Test de l'éditeur).
  for (let i = 0; i < extra; i++) {
    const ck = ROSTER[i % ROSTER.length], id = `tenue:${ck}:test${i}`, chroma = i % 3 === 0;
    L.push({ id, type:'tenue', ck, sid:'__base', nom:'TENUE TEST ' + String(i + 1).padStart(3, '0'), chroma,
      rarete: chroma ? 'chroma' : 'skin', prix: chroma ? PRIX.chroma : PRIX.tenue, source:'direct', casino:true, factice:true });
  }
  for (const d of DISC_SKINS) {
    const tuto = d.verrou === 'tuto';
    L.push({ id:`disque:${d.id}`, type:'disque', did:d.id, nom:d.name.toUpperCase(), rarete:null,
      prix: tuto ? 0 : PRIX.disque, source: tuto ? 'tuto' : 'direct', cond: tuto ? d.aide : null });
  }
  for (const d of DOS) {
    const id = `dos:${d.id}`;
    L.push({ id, type:'dos', did:d.id, nom:d.nom, rarete:null, defaut:!!d.defaut,
      prix: d.defaut ? 0 : (prix[id] ?? d.prix), source: d.defaut ? 'defaut' : 'direct', desc:d.desc });
  }
  for (const t of TITRES) {
    L.push({ id:`titre:${t.id}`, type:'titre', tid:t.id, nom:t.nom, rarete:null, prix:0, source:'gain', cond:t.cond, secret:!!t.secret });
  }
  for (const b of BANNIERES) {
    const id = `banniere:${b.id}`;
    L.push({ id, type:'banniere', bid:b.id, nom:b.nom, rarete:null, defaut:!!b.defaut,
      prix: b.defaut ? 0 : (prix[id] ?? b.prix), source: b.defaut ? 'defaut' : 'direct', desc:b.desc });
  }
  return L;
}

// Tirage semé : les deux disques offerts dépendent du compte, pas du hasard du
// chargement. Recharger la page ne doit pas permettre de les « relancer ».
function alea(graine) {
  let s = 0;
  for (const c of String(graine)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
export function disquesOfferts(cat, idCompte) {
  const r = alea(idCompte), libres = cat.filter(o => o.type === 'disque' && o.source === 'direct');
  const a = libres.splice((r() * libres.length) | 0, 1)[0];
  const b = libres.splice((r() * libres.length) | 0, 1)[0];
  return [a.id, b.id];
}

// Un compte de démonstration : ce qu'un joueur régulier aurait après quelques
// semaines, pour que chaque état se voie (équipé, possédé, favori, StatTrak).
export function etatDepart(cat, idCompte = 'compte-demo') {
  const offerts = disquesOfferts(cat, idCompte);
  const possede = new Set(cat.filter(o => o.source === 'defaut').map(o => o.id));
  for (const id of ['tenue:naruto:hokage', 'tenue:naruto:minato', 'tenue:leon:re4', 'tenue:yoshi:rouge', 'tenue:yoshi:noir',
    'tenue:hollis:cerise', 'tenue:jingle:smoking', 'tenue:flowser:albinos', 'dos:noel', 'banniere:coucher',
    'titre:debutant', 'titre:habitue', 'titre:veteran', 'titre:createur', ...offerts]) if (cat.some(o => o.id === id)) possede.add(id);
  const tenue = {};
  for (const o of cat) if (o.type === 'tenue' && o.defaut) tenue[o.ck] = o.id;
  tenue.naruto = 'tenue:naruto:hokage'; tenue.leon = 'tenue:leon:re4'; tenue.yoshi = 'tenue:yoshi:noir';
  return {
    compte: idCompte, pseudo:'NONO', connecte:true, pieces:1250, offerts,
    possede,
    equipe: { tenue, disque:offerts[0], dos:'dos:noel', titre:'titre:createur', banniere:'banniere:coucher' },
    favoris: new Set(['tenue:naruto:hokage', 'tenue:naruto:minato', 'tenue:yoshi:noir', 'tenue:jingle:smoking', 'tenue:leon:re4', offerts[0], offerts[1]]),
    stattrak: {
      'tenue:naruto:hokage': { v:74, m:142 }, 'tenue:leon:re4': { v:21, m:47 }, 'tenue:yoshi:noir': { v:9, m:12 },
      [offerts[0]]: { v:38, m:61 },
    },
  };
}

// ---------------------------------------------------------------------------
// Dessins : dos de cartes, bannières, plaques de titre (provisoires — ils
// seront repris à l'étape « contenu »).
// ---------------------------------------------------------------------------
const RUNES = ['ᚦ', 'ᚱ', 'ᛉ', 'ᛟ', 'ᛃ', 'ᚨ', 'ᛗ', 'ᛖ'];
// Le dos d'origine, recopié de js/casino/cartes.js.
const SVG_RUNES = (() => {
  const L = 100, H = 150, pt = (cx, cy, r, deg) => { const a = (deg - 90) * Math.PI / 180; return [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)]; };
  let trame = '', noeuds = '';
  for (let d = -H; d < L + H; d += 9) trame += `M${d} 0 L${d + H} ${H} M${d} ${H} L${d + H} 0 `;
  for (let y = 9; y < H; y += 9) for (let x = ((y / 9) % 2 ? 4.5 : 9); x < L; x += 9) noeuds += `<circle cx="${x}" cy="${y}" r=".7"/>`;
  const cx = L / 2, cy = H / 2, som = [];
  for (let i = 0; i < 5; i++) som.push(pt(cx, cy, 14, i * 72));
  const ordre = []; for (let i = 0, j = 0; i < 5; i++, j = (j + 2) % 5) ordre.push(som[j]);
  let couronne = '';
  RUNES.forEach((g, i) => { const [x, y] = pt(cx, cy, 25.5, i * 45); couronne += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="5.4" fill="#e8c565" opacity=".72">${g}</text>`; });
  return `<svg viewBox="0 0 100 150" preserveAspectRatio="none"><path d="${trame}" fill="none" stroke="#d4af37" stroke-width=".55" opacity=".26"/>
    <g fill="#f6e27a" opacity=".3">${noeuds}</g><rect x="4" y="4" width="92" height="142" rx="4" fill="none" stroke="#d4af37" stroke-width="1.6" opacity=".9"/>
    <circle cx="50" cy="75" r="30" fill="#3a0707" opacity=".82"/><circle cx="50" cy="75" r="30" fill="none" stroke="#d4af37" stroke-width=".9" opacity=".75"/>
    <circle cx="50" cy="75" r="20" fill="none" stroke="#d4af37" stroke-width=".5" stroke-dasharray="2 2.4" opacity=".6"/>${couronne}
    <path d="M${ordre.map(p => p.join(' ')).join(' L')} Z" fill="none" stroke="#f6e27a" stroke-width="1.1" opacity=".85"/></svg>`;
})();
const flocon = (x, y, r, o = .8) => {
  let d = '';
  for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3, dx = Math.cos(a) * r, dy = Math.sin(a) * r; d += `M${(x - dx).toFixed(1)} ${(y - dy).toFixed(1)}L${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`; }
  return `<path d="${d}" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity="${o}"/>`;
};
const SVG_NOEL = (() => {
  let f = '';
  for (let y = 10; y < 150; y += 20) for (let x = (y / 10) % 4 ? 12 : 2; x < 100; x += 20) f += flocon(x, y, 3.2, .35);
  let houx = '';
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6, x = 50 + Math.cos(a) * 21, y = 75 + Math.sin(a) * 21;
    houx += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="6.5" ry="3" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${i % 2 ? '#1f7a3e' : '#2a9a50'}"/>`;
    if (i % 3 === 0) houx += `<circle cx="${(50 + Math.cos(a + .26) * 21).toFixed(1)}" cy="${(75 + Math.sin(a + .26) * 21).toFixed(1)}" r="2.3" fill="#ff3348" stroke="#7a0010" stroke-width=".5"/>`;
  }
  return `<svg viewBox="0 0 100 150" preserveAspectRatio="none">${f}
    <rect x="4" y="4" width="92" height="142" rx="4" fill="none" stroke="#f5c542" stroke-width="1.8"/>
    <rect x="8.5" y="8.5" width="83" height="133" rx="2.5" fill="none" stroke="#fff" stroke-width=".6" stroke-dasharray="3 2" opacity=".7"/>
    <circle cx="50" cy="75" r="17" fill="#8e0a1c"/>${houx}
    <path d="M50 64 C44 64 42 72 42 78 L40 82 L60 82 L58 78 C58 72 56 64 50 64 Z" fill="#f5c542" stroke="#8a5f11" stroke-width=".8"/>
    <circle cx="50" cy="84" r="2.6" fill="#f5c542" stroke="#8a5f11" stroke-width=".7"/>
    ${flocon(18, 20, 5)}${flocon(82, 20, 5)}${flocon(18, 130, 5)}${flocon(82, 130, 5)}</svg>`;
})();
const SVG_HOLO = (() => {
  let hex = '';
  for (let y = 0; y < 160; y += 13) for (let x = (y / 13) % 2 ? 7.5 : 0; x < 110; x += 15)
    hex += `<path d="M${x} ${y - 5}l4.3 2.5v5l-4.3 2.5l-4.3 -2.5v-5z" fill="none" stroke="#fff" stroke-width=".5" opacity=".35"/>`;
  return `<svg viewBox="0 0 100 150" preserveAspectRatio="none">${hex}
    <rect x="4" y="4" width="92" height="142" rx="5" fill="none" stroke="#fff" stroke-width="1.4" opacity=".85"/>
    <circle cx="50" cy="75" r="24" fill="rgba(255,255,255,.18)" stroke="#fff" stroke-width="1.4"/>
    <ellipse cx="50" cy="75" rx="15" ry="6" fill="none" stroke="#fff" stroke-width="2"/>
    <ellipse cx="50" cy="73" rx="15" ry="6" fill="rgba(255,255,255,.35)"/>
    <text x="50" y="112" text-anchor="middle" font-family="Archivo Black" font-size="8" fill="#fff" opacity=".9" letter-spacing="1">S.F.C</text></svg>`;
})();
const SVG_NEON = (() => {
  let grille = '';
  for (let i = 0; i <= 10; i++) grille += `<path d="M50 96 L${-60 + i * 22} 150" stroke="#ff4fd8" stroke-width=".7" opacity=".7"/>`;
  for (const y of [100, 106, 114, 125, 140]) grille += `<path d="M0 ${y}H100" stroke="#ff4fd8" stroke-width=".7" opacity=".7"/>`;
  let soleil = '';
  for (let i = 0; i < 5; i++) soleil += `<rect x="28" y="${70 + i * 5.2}" width="44" height="${2.2 - i * .3}" fill="#140726"/>`;
  return `<svg viewBox="0 0 100 150" preserveAspectRatio="none">
    <defs><linearGradient id="neonSoleil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe14d"/><stop offset=".6" stop-color="#ff5f9e"/><stop offset="1" stop-color="#b43cff"/></linearGradient></defs>
    <circle cx="50" cy="72" r="22" fill="url(#neonSoleil)"/>${soleil}
    <rect x="0" y="96" width="100" height="54" fill="#140726"/>${grille}
    <rect x="4" y="4" width="92" height="142" rx="5" fill="none" stroke="#35e0ff" stroke-width="1.6"/>
    <rect x="4" y="4" width="92" height="142" rx="5" fill="none" stroke="#35e0ff" stroke-width="4" opacity=".25"/></svg>`;
})();
export function dosHTML(id) {
  const inner = { runes:SVG_RUNES, noel:SVG_NOEL, holo:SVG_HOLO, neon:SVG_NEON }[id] || '';
  const reflet = id === 'holo' ? '<i class="dosReflet"></i>' : '';
  return `<div class="dosCarte d-${id}">${inner}${reflet}</div>`;
}

const SVG_BAN = {
  perso: `<div class="banVide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16l4-4 4 4 3-3 5 5"/><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="15.5" cy="8.5" r="1.5"/></svg><span>TON IMAGE</span></div>`,
  coucher: (() => {
    let bandes = ''; for (let i = 0; i < 5; i++) bandes += `<rect x="112" y="${40 + i * 5}" width="76" height="${2.6 - i * .35}" fill="#3a0b4a"/>`;
    let g = ''; for (let i = 0; i <= 14; i++) g += `<path d="M150 62 L${-60 + i * 30} 100" stroke="#ff7ad9" stroke-width=".8" opacity=".6"/>`;
    for (const y of [66, 72, 81, 94]) g += `<path d="M0 ${y}H300" stroke="#ff7ad9" stroke-width=".8" opacity=".6"/>`;
    return `<svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice"><defs>
      <linearGradient id="banCiel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2b0b52"/><stop offset=".55" stop-color="#c23a8c"/><stop offset="1" stop-color="#ff9a4d"/></linearGradient>
      <linearGradient id="banSoleil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe14d"/><stop offset="1" stop-color="#ff4f7a"/></linearGradient></defs>
      <rect width="300" height="100" fill="url(#banCiel)"/><circle cx="150" cy="52" r="34" fill="url(#banSoleil)"/>${bandes}
      <rect y="62" width="300" height="38" fill="#1a0630"/>${g}</svg>`;
  })(),
  terrain: `<svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice">
      <rect width="300" height="100" fill="#2f6bff"/><rect x="0" y="0" width="30" height="100" fill="#ff8c1a"/><rect x="270" y="0" width="30" height="100" fill="#e5384f"/>
      <g stroke="#fff" stroke-width="2.4" fill="none" opacity=".92"><rect x="8" y="8" width="284" height="84" rx="3"/><path d="M150 8V92"/><circle cx="150" cy="50" r="16"/>
      <path d="M30 8V92M270 8V92" stroke-dasharray="5 4"/></g>
      <g fill="#fff" opacity=".18">${Array.from({ length:9 }, (_, i) => `<rect x="${40 + i * 25}" y="0" width="12" height="100" transform="skewX(-14)"/>`).join('')}</g>
      <circle cx="96" cy="44" r="7" fill="#f5e63d" stroke="#111318" stroke-width="2"/></svg>`,
  galaxie: (() => {
    const r = alea('galaxie'); let et = '';
    for (let i = 0; i < 70; i++) et += `<circle cx="${(r() * 300).toFixed(1)}" cy="${(r() * 100).toFixed(1)}" r="${(r() * 1.1 + .3).toFixed(2)}" fill="#fff" opacity="${(r() * .7 + .3).toFixed(2)}"/>`;
    return `<svg viewBox="0 0 300 100" preserveAspectRatio="xMidYMid slice"><defs>
      <radialGradient id="banNeb1" cx=".3" cy=".5" r=".5"><stop offset="0" stop-color="#ff4fd8" stop-opacity=".75"/><stop offset="1" stop-color="#ff4fd8" stop-opacity="0"/></radialGradient>
      <radialGradient id="banNeb2" cx=".72" cy=".4" r=".45"><stop offset="0" stop-color="#35e0ff" stop-opacity=".7"/><stop offset="1" stop-color="#35e0ff" stop-opacity="0"/></radialGradient></defs>
      <rect width="300" height="100" fill="#0b0726"/><rect width="300" height="100" fill="url(#banNeb1)"/><rect width="300" height="100" fill="url(#banNeb2)"/>${et}
      <g transform="translate(222 58) rotate(-18)"><ellipse rx="26" ry="7" fill="none" stroke="#ffe14d" stroke-width="2"/><circle r="11" fill="#8e5cff"/><ellipse rx="26" ry="7" fill="none" stroke="#ffe14d" stroke-width="2" stroke-dasharray="0 41 41 0"/></g></svg>`;
  })(),
};
export function banniereHTML(id) { return `<div class="banniere b-${id}">${SVG_BAN[id] || ''}</div>`; }
export function titreHTML(o) { return `<div class="plaqueTitre${o.tid === 'createur' ? ' createur' : ''}"><span>${o.nom}</span></div>`; }

// ---------------------------------------------------------------------------
// Petits éléments communs
// ---------------------------------------------------------------------------
const PIECE = '<span class="piece" aria-hidden="true"></span>';
const CADENAS = '<svg class="cadenas" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="11" rx="2.5" fill="#fff" stroke="#111318" stroke-width="2.4"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="#111318" stroke-width="2.4"/><circle cx="12" cy="15.6" r="1.6" fill="#111318"/></svg>';
const nombre = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pct = s => s.m ? Math.round(s.v / s.m * 100) : 0;

// ---------------------------------------------------------------------------
// L'écran
// ---------------------------------------------------------------------------
export function creerEcran(hote, { CHARS, ROSTER, drawSkinDisc, son = () => {}, R, placement, cat, etat, surChangement = () => {} }) {
  const S = { onglet:'inventaire', categorie:'tenue', pages:{}, choix:null, survol:null, confirmer:null, rouletteOuverte:false,
    aleaPerso:true, aleaTenue:true, aleaDisque:true };
  let apercuBoucle = null;

  /* ---------- sprites et disques en images, faits une fois ---------- */
  const cacheSprite = new Map(), cacheDisque = new Map();
  function spriteURL(ck, sid) {
    const cle = ck + ':' + sid;
    if (cacheSprite.has(cle)) return cacheSprite.get(cle);
    const c = CHARS[ck], src = (c.skins && c.skins[sid] && c.skins[sid].idle) || c.frames.idle;
    const k = 6, cv = document.createElement('canvas');
    cv.width = src.width * k; cv.height = src.height * k;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(src, 0, 0, cv.width, cv.height);
    const url = cv.toDataURL(); cacheSprite.set(cle, url); return url;
  }
  function disqueURL(did) {
    if (cacheDisque.has(did)) return cacheDisque.get(did);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const g = cv.getContext('2d');
    try { drawSkinDisc(g, 64, 64, 58, did, 0); } catch (e) { /* un disque inconnu reste vide */ }
    const url = cv.toDataURL(); cacheDisque.set(did, url); return url;
  }

  /* ---------- structure ---------- */
  const ecran = document.createElement('div');
  ecran.className = 'screen invEcran';
  ecran.innerHTML = `
    <div class="bg invFond">
      <div class="invFondCouche" data-pour="inventaire"></div><div class="invFondCouche" data-pour="boutique"></div>
      <div class="invDecor"><div class="streaks"></div><div class="arc"></div>
        <div class="ringwrap"><svg viewBox="0 0 400 400"><path id="ring-inv" d="M 200,200 m -160,0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0" fill="none"/>
          <text><textPath href="#ring-inv" startOffset="0%">INVENTAIRE • BOUTIQUE • INVENTAIRE • BOUTIQUE • INVENTAIRE • BOUTIQUE • </textPath></text></svg></div>
      </div>
    </div>
    <div class="topBar gauche"><button class="fsBtn" title="Retour"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button></div>
    <div class="topBar"><button class="fsBtn compteBtn connecte invCompte"></button>
      <button class="fsBtn" title="Plein écran"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button></div>

    <div class="mv invTitre" data-el="titre">
      <button data-onglet="inventaire"><span>INVENTAIRE</span></button><button data-onglet="boutique"><span>BOUTIQUE</span></button>
    </div>
    <div class="mv invSolde" data-el="solde"><span class="pieceTourne"><i class="av"></i><i class="ar"></i></span><b class="soldeVal"></b><em class="soldeHors">HORS LIGNE</em></div>
    <div class="mv invCats tabs" data-el="categories">${CATEGORIES.map(c => `<div class="tab" data-cat="${c.id}">${c.nom}<em></em></div>`).join('')}</div>
    <div class="mv invGrille" data-el="grille"><div class="igDefil"><div class="igCartes"></div><p class="igVide"></p></div></div>
    <div class="mv invApercu" data-el="apercu">
      <div class="iaTete"><span class="iaType"></span><span class="iaEtat"></span></div>
      <div class="iaScene"><div class="iaRayons"></div><div class="iaHalo"></div><div class="iaSol"></div><div class="iaVisuel"></div><div class="iaParts"></div><div class="iaTampon"></div></div>
      <div class="iaInfos">
        <div class="iaNom"></div>
        <div class="iaPuces"></div>
        <div class="iaDesc"></div>
        <div class="iaSt"></div>
        <div class="iaActions"></div>
        <div class="iaLien"></div>
      </div>
    </div>
    <div class="mv invPied" data-el="pied">
      <div class="ipPages"><button class="ipFleche" data-page="-1">◀</button><span class="ipNum"></span><button class="ipFleche" data-page="1">▶</button></div>
      <span class="ipCompte"></span>
      <span class="ipTri"></span>
      <div class="ipFav">
        <button class="ipFavBtn"><span class="de">🎲</span> FAVORIS ALÉATOIRES</button>
        <div class="ipBascules">
          <button class="ipBascule on" data-alea="aleaPerso">PERSO</button>
          <button class="ipBascule on" data-alea="aleaTenue">TENUE</button>
          <button class="ipBascule on" data-alea="aleaDisque">DISQUE</button>
        </div>
      </div>
    </div>
    <div class="invToast"></div>
    <div class="invRoulette hidden">
      <div class="rlCarte">
        <div class="rlTag"><span>FAVORIS ALÉATOIRES</span></div>
        <div class="rlCases">
          <div class="rlCase rlPerso"><div class="rlFenetre"><img alt=""></div><b></b><small></small></div>
          <div class="rlPlus">+</div>
          <div class="rlCase rlDisque"><div class="rlFenetre"><canvas width="160" height="160"></canvas></div><b></b><small></small></div>
        </div>
        <div class="rlBoutons"><button class="iaBtn rlRelancer">🎲 RELANCER</button><button class="iaBtn vert rlGo">C’EST PARTI !</button></div>
        <p class="rlNote">Ensuite : tour du CPU, puis choix du terrain.</p>
      </div>
    </div>`;
  hote.innerHTML = '';
  hote.appendChild(ecran);
  const q = s => ecran.querySelector(s);
  const grille = q('.igCartes'), defil = q('.igDefil');

  /* ---------- réglages → variables CSS ---------- */
  function appliquerReglages(r = R) {
    R = r;
    const st = ecran.style, P = POLICES;
    for (const [k, v] of Object.entries({ titre:r.police_titre, onglet:r.police_onglet, nom:r.police_nom, prix:r.police_prix })) {
      st.setProperty('--f-' + k, P[v].famille); st.setProperty('--w-' + k, P[v].poids);
    }
    st.setProperty('--cols', r.colonnes); st.setProperty('--ecart', r.ecart + 'cqh');
    st.setProperty('--rayon', r.rayon + 'px'); st.setProperty('--ombreC', r.ombre + 'px');
    st.setProperty('--survol', r.survol); st.setProperty('--tNom', r.tailleNom);
    for (const k of RARETES) st.setProperty('--r-' + k, r['c_' + k]);
    st.setProperty('--lueur', r.lueur); st.setProperty('--iris', (6 / Math.max(.1, r.vitesseIris)).toFixed(2) + 's');
    st.setProperty('--apSprite', r.apercuSprite); st.setProperty('--flotte', r.apercuFlotte); st.setProperty('--rayons', r.rayons);
    const A = PALETTES[r.fondInventaire] || PALETTES.lavande, B = PALETTES[r.fondBoutique] || PALETTES.or;
    q('.invFondCouche[data-pour="inventaire"]').style.background = A.fond;
    q('.invFondCouche[data-pour="boutique"]').style.background = B.fond;
    st.setProperty('--accInv', A.accent); st.setProperty('--accBout', B.accent);
    ecran.dataset.decor = r.decor;
    majSombre();
  }
  function majSombre() {
    const p = PALETTES[S.onglet === 'boutique' ? R.fondBoutique : R.fondInventaire];
    ecran.classList.toggle('sombre', !!(p && p.sombre));
  }
  function appliquerPlacement(pl = placement) {
    placement = pl;
    for (const m of ecran.querySelectorAll('.mv')) {
      const p = placement[m.dataset.el]; if (!p) continue;
      m.style.setProperty('--x', p.x); m.style.setProperty('--y', p.y); m.style.setProperty('--s', p.s);
    }
  }

  /* ---------- listes ---------- */
  const rang = o => RARETES.indexOf(o.rarete);
  const ordreRarete = (a, b) => R.ordreRarete === 'decroissant' ? rang(b) - rang(a) : rang(a) - rang(b);
  const indexPerso = o => o.ck ? ROSTER.indexOf(o.ck) : -1;
  const alpha = (a, b) => a.nom.localeCompare(b.nom, 'fr');
  // Inventaire : ce qu'on possède, par perso, puis rareté, puis nom — la
  // tenue d'origine en tête de chaque perso, pour qu'on s'y retrouve.
  // Boutique : tout ce qui se vend, par prix croissant puis par perso ; ce qui
  // ne s'achète pas (titres, récompense du tutoriel) ferme la marche.
  function liste() {
    const L = cat.filter(o => o.type === S.categorie);
    if (S.onglet === 'inventaire') {
      return L.filter(o => etat.possede.has(o.id)).sort((a, b) =>
        (indexPerso(a) - indexPerso(b)) || ((b.defaut ? 1 : 0) - (a.defaut ? 1 : 0)) || ordreRarete(a, b) || alpha(a, b));
    }
    const vendable = o => o.source === 'direct';
    return L.filter(o => o.source !== 'defaut' && !(o.secret && !etat.possede.has(o.id))).sort((a, b) =>
      ((vendable(b) ? 1 : 0) - (vendable(a) ? 1 : 0)) || (a.prix - b.prix) || (indexPerso(a) - indexPerso(b)) || ordreRarete(a, b) || alpha(a, b));
  }
  const PAR_PAGE = 50;
  const cleePage = () => S.onglet + ':' + S.categorie;

  /* ---------- statut d'un objet ---------- */
  function estEquipe(o) {
    const e = etat.equipe;
    if (o.type === 'tenue') return e.tenue[o.ck] === o.id;
    return e[o.type] === o.id;
  }
  const possede = o => etat.possede.has(o.id);
  const aStat = o => o.type === 'tenue' || o.type === 'disque';
  // Tenue et disque se choisissent dans la sélection des persos, comme les
  // skins et les skins d'arme de Brawlhalla (décidé le 19/09). L'inventaire
  // ne les équipe pas : il les montre, les met en favori, leur ajoute un
  // StatTrak™. Dos de cartes, titres et bannières s'équipent ici.
  const auHub = o => o.type === 'tenue' || o.type === 'disque';

  /* ---------- une carte ---------- */
  function visuel(o, grand) {
    if (o.type === 'tenue') return `<img class="${grand ? 'iaSprite' : 'icSprite'}" src="${spriteURL(o.ck, o.sid)}" alt="">`;
    if (o.type === 'disque') return grand ? '<canvas class="iaDisque" width="360" height="360"></canvas>' : `<img class="icDisque" src="${disqueURL(o.did)}" alt="">`;
    if (o.type === 'dos') return dosHTML(o.did);
    if (o.type === 'banniere') return banniereHTML(o.bid);
    return titreHTML(o);
  }
  function particules(o, n0) {
    // Le skin brille le plus, le chroma scintille à peine, la tenue de base rien.
    const base = o.rarete === 'skin' ? 6 : o.rarete === 'chroma' ? 3 : 0;
    const n = Math.round(base * R.particules * (n0 || 1));
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
    const verrou = !possede(o);
    el.className = `invCarte r-${o.rarete || 'aucune'} t-${o.type}` + (o.chroma ? ' chroma' : '') + (verrou ? ' verrou' : '') +
      (estEquipe(o) && !verrou ? ' equipe' : '') + (etat.favoris.has(o.id) ? ' favori' : '') + (S.choix === o.id ? ' choisie' : '');
    el.dataset.id = o.id;
    const st = etat.stattrak[o.id];
    const ligneSt = st && !verrou ? `<small class="icSt"><b>ST</b>${pct(st)} % · ${st.m} MATCH${st.m > 1 ? 'S' : ''}</small>` : '';
    let prix = '';
    if (S.onglet === 'boutique') {
      if (!verrou) prix = etat.offerts.includes(o.id) ? `<span class="icPossede offert">🎁 OFFERT</span>` : `<span class="icPossede">✔ POSSÉDÉ</span>`;
      else if (o.source === 'direct') prix = `<span class="icPrix">${PIECE}${nombre(o.prix)}</span>`;
      else if (o.source === 'casino') prix = `<span class="icPrix casino">CASINO</span>`;
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

  /* ---------- rendu de la grille ---------- */
  function rendreGrille(animer) {
    const L = liste(), nPages = Math.max(1, Math.ceil(L.length / PAR_PAGE));
    let p = S.pages[cleePage()] || 0;
    if (p >= nPages) p = nPages - 1;
    S.pages[cleePage()] = p;
    const tranche = L.slice(p * PAR_PAGE, (p + 1) * PAR_PAGE);
    grille.innerHTML = '';
    // Des en-têtes de groupe quand il y en a plusieurs : le perso dans
    // l'inventaire, le palier de prix dans la boutique.
    const groupe = o => S.onglet === 'inventaire'
      ? (o.ck ? o.ck : '')
      : (o.source === 'direct' ? 'p' + o.prix : 'x');
    const nGroupes = new Set(tranche.map(groupe)).size;
    let dernier = null, n = 0;
    for (const o of tranche) {
      const g = groupe(o);
      const avecEntetes = R.entetes === 'partout' || (R.entetes === 'boutique' && S.onglet === 'boutique');
      if (avecEntetes && nGroupes > 1 && g !== dernier) {
        const h = document.createElement('div');
        h.className = 'igEntete';
        if (S.onglet === 'inventaire' && o.ck) {
          const total = cat.filter(x => x.type === 'tenue' && x.ck === o.ck).length;
          const a = cat.filter(x => x.type === 'tenue' && x.ck === o.ck && possede(x)).length;
          h.innerHTML = `<i style="background:${CHARS[o.ck].color}"></i>${CHARS[o.ck].short}<em>${a} / ${total}</em>`;
        } else if (g === 'x') h.innerHTML = `<i class="gris"></i>À GAGNER EN JOUANT`;
        else h.innerHTML = `${PIECE}${nombre(o.prix)}<em>${o.type === 'tenue' ? (o.prix === PRIX.chroma ? 'CHROMAS' : 'SKINS') : ''}</em>`;
        grille.appendChild(h);
        dernier = g;
      }
      const c = carte(o);
      grille.appendChild(c);
      if (animer && R.entree === 'oui' && n < 36) {
        c.animate([{ opacity:0, transform:'translateY(2.4cqh) scale(.86)' }, { opacity:1, transform:'none' }],
          { duration:300, delay:n * 16, easing:'cubic-bezier(.2,.8,.3,1)', fill:'backwards' });
      }
      n++;
    }
    const vide = q('.igVide');
    vide.textContent = !L.length ? (S.onglet === 'inventaire' ? 'Rien ici pour l’instant — passe à la BOUTIQUE.' : 'Tout est à toi. Bravo.') : '';
    q('.ipNum').textContent = `PAGE ${p + 1} / ${nPages}`;
    for (const b of ecran.querySelectorAll('.ipFleche')) b.disabled = (+b.dataset.page < 0 ? p <= 0 : p >= nPages - 1);
    q('.ipCompte').textContent = `${L.length} OBJET${L.length > 1 ? 'S' : ''}`;
    if (animer) defil.scrollTop = 0;
  }
  function majCompteurs() {
    for (const t of ecran.querySelectorAll('.invCats .tab')) {
      const c = t.dataset.cat, tous = cat.filter(o => o.type === c && !(o.secret && !etat.possede.has(o.id)));
      t.classList.toggle('active', c === S.categorie);
      t.querySelector('em').textContent = S.onglet === 'inventaire'
        ? tous.filter(possede).length
        : tous.filter(o => o.source !== 'defaut' && !possede(o)).length;
    }
  }
  function majEntete() {
    ecran.dataset.onglet = S.onglet;
    for (const b of ecran.querySelectorAll('.invTitre button')) b.classList.toggle('on', b.dataset.onglet === S.onglet);
    const solde = q('.soldeVal');
    solde.textContent = nombre(etat.pieces);
    q('.invSolde').classList.toggle('hors', !etat.connecte);
    const cb = q('.invCompte');
    cb.textContent = etat.connecte ? etat.pseudo : 'SE CONNECTER';
    cb.classList.toggle('connecte', etat.connecte);
    q('.ipTri').textContent = S.onglet === 'boutique' ? 'TRI : PRIX CROISSANT, PUIS PERSO' : '';
    q('.ipFav').style.display = S.onglet === 'inventaire' ? '' : 'none';
    for (const b of ecran.querySelectorAll('.ipBascule')) b.classList.toggle('on', S[b.dataset.alea]);
    majSombre();
  }
  function rendreTout(animer) {
    majEntete(); majCompteurs(); rendreGrille(animer);
    const L = liste();
    if (!S.choix || !L.some(o => o.id === S.choix)) {
      // Inventaire : on part de ce qui est équipé. Boutique : du premier objet
      // qu'on n'a pas encore.
      const depart = S.onglet === 'boutique' ? L.find(o => !possede(o)) : L.find(o => estEquipe(o) && possede(o));
      S.choix = (depart || L[0] || {}).id || null;
      marquerChoix();
    }
    majApercu();
  }
  function marquerChoix() { for (const c of grille.querySelectorAll('.invCarte')) c.classList.toggle('choisie', c.dataset.id === S.choix); }

  /* ---------- aperçu ---------- */
  const objet = id => cat.find(o => o.id === id);
  let apercuId = null;
  function majApercu(forcer) {
    const o = objet(S.survol || S.choix);
    const ap = q('.invApercu');
    if (!o) { ap.classList.add('vide'); return; }
    ap.classList.remove('vide');
    const memeObjet = apercuId === o.id;
    apercuId = o.id;
    for (const c of [...ap.classList]) if (/^[rt]-/.test(c) || c === 'chroma') ap.classList.remove(c);
    ap.classList.add('r-' + (o.rarete || 'aucune'), 't-' + o.type);
    ap.classList.toggle('chroma', !!o.chroma);
    const verrou = !possede(o);
    q('.iaType').textContent = (o.ck ? CHARS[o.ck].short + ' · ' : '') + NOM_TYPE[o.type];
    q('.iaEtat').innerHTML = verrou ? (S.onglet === 'boutique' ? CADENAS + ' VERROUILLÉ' : '') : estEquipe(o) ? '✔ ÉQUIPÉ' : 'POSSÉDÉ';
    q('.iaEtat').className = 'iaEtat' + (verrou ? ' verrou' : estEquipe(o) ? ' equipe' : '');
    q('.iaHalo').style.setProperty('--halo', o.ck ? CHARS[o.ck].color : 'var(--rc)');
    if (!memeObjet || forcer) {
      stopperBoucle();
      const vis = q('.iaVisuel');
      // L'aperçu montre toujours l'objet en couleur, même verrouillé : c'est
      // là qu'on le regarde avant de l'acheter.
      vis.innerHTML = visuel(o, true);
      if (o.type === 'disque') demarrerDisque(vis.querySelector('canvas'), o.did);
      q('.iaParts').innerHTML = particules(o, 2);
      vis.animate([{ opacity:0, transform:'translateY(1.5cqh) scale(.94)' }, { opacity:1, transform:'none' }], { duration:220, easing:'cubic-bezier(.2,.8,.3,1)' });
    }
    q('.iaNom').textContent = o.nom;
    q('.iaPuces').innerHTML = (o.rarete ? `<span class="puce rar">${NOMS_RARETE[o.rarete]}</span>` : '') +
      (etat.offerts.includes(o.id) ? '<span class="puce off">🎁 OFFERT AVEC TON COMPTE</span>' : '') +
      (etat.favoris.has(o.id) ? '<span class="puce fav">★ FAVORI</span>' : '');
    q('.iaDesc').textContent = o.cond ? (possede(o) ? 'Gagné : ' + o.cond.toLowerCase() : 'Pour l’obtenir : ' + o.cond.toLowerCase())
      : o.desc || (o.type === 'tenue' ? (o.chroma ? 'Chroma : la même tenue, dans d’autres couleurs.' : o.defaut ? 'La tenue d’origine, offerte.' : 'Skin : redessiné de la tête aux pieds.') : '');
    majStat(o);
    majActions(o);
  }
  function majStat(o) {
    const z = q('.iaSt');
    if (!aStat(o)) { z.innerHTML = ''; z.className = 'iaSt'; return; }
    const st = etat.stattrak[o.id];
    if (st && possede(o)) {
      z.className = 'iaSt on';
      z.innerHTML = `<div class="stTete"><b>STATTRAK™</b><span>IA + EN LIGNE</span></div>
        <div class="stChiffres"><strong>${pct(st)} %</strong><span>DE VICTOIRES<br>${st.m} MATCH${st.m > 1 ? 'S' : ''} · ${st.v} V – ${st.m - st.v} D</span></div>
        <div class="stBarre"><i style="width:${pct(st)}%"></i></div>`;
    } else if (possede(o)) {
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
    const favBtn = `<button class="iaBtn fav${etat.favoris.has(o.id) ? ' on' : ''}" data-action="favori" title="Favori">★</button>`;
    if (possede(o) && auHub(o)) {
      z.innerHTML = `<button class="iaBtn bleu" data-action="hub">${o.type === 'tenue' ? 'CHOISIR' : 'PRENDRE'} DANS LA SÉLECTION →</button>` + favBtn;
    } else if (possede(o)) {
      z.innerHTML = (estEquipe(o) ? `<button class="iaBtn equipe" disabled>✔ ÉQUIPÉ</button>` : `<button class="iaBtn vert" data-action="equiper">ÉQUIPER</button>`) + favBtn;
    } else if (o.source === 'direct') {
      const c = S.confirmer === 'achat:' + o.id, manque = o.prix - etat.pieces;
      if (!etat.connecte) z.innerHTML = `<button class="iaBtn gris" data-action="connexion">CONNECTE-TOI POUR ACHETER</button>`;
      else if (manque > 0) z.innerHTML = `<button class="iaBtn gris" disabled>IL TE MANQUE ${PIECE}${nombre(manque)}</button>`;
      else z.innerHTML = `<button class="iaBtn or${c ? ' confirme' : ''}" data-action="acheter">${c ? 'CONFIRMER ?' : 'ACHETER'} <span class="prixBtn">${PIECE}${nombre(o.prix)}</span></button>`;
    } else if (o.source === 'casino') {
      z.innerHTML = `<button class="iaBtn rose" data-action="casino">OBTENIR AU CASINO →</button>`;
    } else {
      z.innerHTML = `<button class="iaBtn gris" disabled>${o.source === 'tuto' ? 'RÉCOMPENSE DU TUTORIEL' : 'À GAGNER EN JOUANT'}</button>`;
    }
    if (o.type === 'tenue' && o.casino && !possede(o) && S.onglet === 'boutique')
      lien.innerHTML = `<button class="iaLienCasino" data-action="casino">ou tente ta chance aux caisses du <b>CASINO</b> →</button>`;
  }

  /* ---------- disque qui tourne dans l'aperçu ---------- */
  function demarrerDisque(cv, did) {
    const g = cv.getContext('2d'); let a = 0, t0 = performance.now();
    const pas = t => {
      const dt = Math.min(.05, (t - t0) / 1000); t0 = t; a += dt * 7;
      g.clearRect(0, 0, 360, 360); g.save(); g.translate(180, 180); g.rotate(a);
      try { drawSkinDisc(g, 0, 0, 150, did, a); } catch (e) { }
      g.restore();
      apercuBoucle = requestAnimationFrame(pas);
    };
    apercuBoucle = requestAnimationFrame(pas);
  }
  function stopperBoucle() { if (apercuBoucle) cancelAnimationFrame(apercuBoucle); apercuBoucle = null; }

  /* ---------- gestes ---------- */
  function toast(txt, dore) {
    const t = q('.invToast');
    t.innerHTML = txt; t.classList.toggle('dore', !!dore);
    t.getAnimations().forEach(a => a.cancel());
    t.animate([{ opacity:0, transform:'translate(-50%,1.5cqh)' }, { opacity:1, transform:'translate(-50%,0)', offset:.1 },
      { opacity:1, transform:'translate(-50%,0)', offset:.85 }, { opacity:0, transform:'translate(-50%,-.5cqh)' }], { duration:2600, easing:'ease-out', fill:'forwards' });
  }
  function carteDe(id) { return grille.querySelector(`.invCarte[data-id="${CSS.escape(id)}"]`); }

  function equiper(o) {
    if (!possede(o) || estEquipe(o)) return;
    if (o.type === 'tenue') etat.equipe.tenue[o.ck] = o.id; else etat.equipe[o.type] = o.id;
    son('equip');
    // Les cartes qui changent : l'ancienne équipée du même emplacement et la nouvelle.
    for (const c of grille.querySelectorAll('.invCarte.equipe')) {
      const x = objet(c.dataset.id);
      if (x && x.type === o.type && (o.type !== 'tenue' || x.ck === o.ck)) c.classList.remove('equipe');
    }
    const c = carteDe(o.id);
    if (c) { c.classList.add('equipe'); animerEquipe(c); }
    majApercu(true); tamponApercu('ÉQUIPÉ !');
    surChangement();
  }
  function animerEquipe(c) {
    const f = R.flash;
    c.animate([{ transform:'scale(1)' }, { transform:`scale(${1 + .12 * f})`, offset:.35 }, { transform:'scale(1)' }], { duration:420, easing:'cubic-bezier(.2,.8,.3,1)' });
    const flash = document.createElement('i'); flash.className = 'icFlash'; c.appendChild(flash);
    flash.animate([{ opacity:.9 * Math.min(1, f) }, { opacity:0 }], { duration:420, easing:'ease-out' }).finished.then(() => flash.remove(), () => flash.remove());
    const an = document.createElement('i'); an.className = 'icAnneau'; c.appendChild(an);
    an.animate([{ transform:'scale(1)', opacity:1 }, { transform:`scale(${1 + .3 * f})`, opacity:0 }], { duration:520, easing:'cubic-bezier(.1,.7,.3,1)' })
      .finished.then(() => an.remove(), () => an.remove());
    c.querySelector('.icRuban')?.animate([{ transform:'scale(0) rotate(-20deg)' }, { transform:'scale(1.3) rotate(4deg)', offset:.6 }, { transform:'none' }], { duration:380, easing:'ease-out' });
  }
  function tamponApercu(txt) {
    const t = q('.iaTampon');
    t.textContent = txt;
    t.getAnimations().forEach(a => a.cancel());
    t.animate([{ opacity:0, transform:'translate(-50%,-50%) scale(2.2) rotate(-14deg)' }, { opacity:1, transform:'translate(-50%,-50%) scale(1) rotate(-8deg)', offset:.25 },
      { opacity:1, transform:'translate(-50%,-50%) scale(1) rotate(-8deg)', offset:.8 }, { opacity:0, transform:'translate(-50%,-50%) scale(1.05) rotate(-8deg)' }], { duration:1300, easing:'ease-out', fill:'forwards' });
    const v = q('.iaVisuel');
    v.animate([{ filter:'brightness(1)' }, { filter:`brightness(${1 + .9 * R.flash})`, offset:.2 }, { filter:'brightness(1)' }], { duration:500 });
  }
  function basculerFavori(o) {
    if (etat.favoris.has(o.id)) etat.favoris.delete(o.id); else etat.favoris.add(o.id);
    son('favori');
    const c = carteDe(o.id);
    if (c) {
      c.classList.toggle('favori', etat.favoris.has(o.id));
      c.querySelector('.icEtoile').animate([{ transform:'scale(1)' }, { transform:'scale(1.7) rotate(72deg)', offset:.4 }, { transform:'scale(1)' }], { duration:380, easing:'ease-out' });
    }
    majApercu(); surChangement();
  }
  function animerSolde(avant, apres) {
    const el = q('.soldeVal'), t0 = performance.now(), D = 650;
    const pas = t => {
      const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      el.textContent = nombre(Math.round(avant + (apres - avant) * e));
      if (k < 1) requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
    setTimeout(() => { el.textContent = nombre(apres); }, D + 80);
    q('.invSolde').animate([{ transform:'scale(1)' }, { transform:'scale(1.14)', offset:.3 }, { transform:'scale(1)' }], { duration:450, easing:'ease-out' });
  }
  // Des pièces qui volent du solde vers ce qu'on vient d'acheter.
  function volerPieces(versEl) {
    const s = q('.invSolde .pieceTourne').getBoundingClientRect(), d = versEl.getBoundingClientRect(), e = ecran.getBoundingClientRect();
    const sx = ecran.clientWidth / e.width, sy = ecran.clientHeight / e.height;
    for (let i = 0; i < 9; i++) {
      const p = document.createElement('span'); p.className = 'pieceVol'; ecran.appendChild(p);
      const x0 = (s.left + s.width / 2 - e.left) * sx, y0 = (s.top + s.height / 2 - e.top) * sy;
      const x1 = (d.left + d.width * (.3 + Math.random() * .4) - e.left) * sx, y1 = (d.top + d.height * (.3 + Math.random() * .4) - e.top) * sy;
      const mx = (x0 + x1) / 2 + (Math.random() - .5) * 120, my = Math.min(y0, y1) - 40 - Math.random() * 60;
      p.style.left = x0 + 'px'; p.style.top = y0 + 'px';
      p.animate([{ transform:'translate(-50%,-50%) scale(.6)', opacity:0 }, { transform:`translate(calc(${mx - x0}px - 50%),calc(${my - y0}px - 50%)) scale(1.1)`, opacity:1, offset:.45 },
        { transform:`translate(calc(${x1 - x0}px - 50%),calc(${y1 - y0}px - 50%)) scale(.5)`, opacity:.9 }],
        { duration:560 + i * 40, delay:i * 45, easing:'cubic-bezier(.3,.1,.4,1)', fill:'backwards' }).finished.then(() => p.remove(), () => p.remove());
    }
  }
  function eclatAchat(c) {
    if (!c) return;
    const r = getComputedStyle(c).getPropertyValue('--rc') || '#ffae1a';
    for (let i = 0; i < 14; i++) {
      const e = document.createElement('span'); e.className = 'etincelle'; e.style.background = i % 2 ? '#ffd23e' : r; c.appendChild(e);
      const a = (i / 14) * Math.PI * 2 + Math.random() * .5, dist = 30 + Math.random() * 30;
      e.animate([{ transform:'translate(-50%,-50%) scale(1)', opacity:1 }, { transform:`translate(calc(${Math.cos(a) * dist}cqi - 50%),calc(${Math.sin(a) * dist}cqi - 50%)) scale(.2) rotate(200deg)`, opacity:0 }],
        { duration:520 + Math.random() * 200, easing:'cubic-bezier(.1,.8,.3,1)' }).finished.then(() => e.remove(), () => e.remove());
    }
  }
  function acheter(o) {
    if (possede(o) || o.source !== 'direct') return;
    if (!etat.connecte) { son('deny'); toast('Connecte-toi pour acheter : les achats vivent sur ton compte.'); return; }
    if (etat.pieces < o.prix) { son('deny'); return; }
    if (S.confirmer !== 'achat:' + o.id) { S.confirmer = 'achat:' + o.id; son('move'); majActions(o); armerConfirmation(o); return; }
    S.confirmer = null;
    const avant = etat.pieces;
    etat.pieces -= o.prix;
    etat.possede.add(o.id);
    son('achat');
    const c = carteDe(o.id);
    if (c) volerPieces(c);
    animerSolde(avant, etat.pieces);
    setTimeout(() => {
      const c2 = carteDe(o.id);
      if (c2) {
        const cad = c2.querySelector('.icCadenas');
        if (cad) cad.animate([{ transform:'translate(-50%,-50%) scale(1)', opacity:1 }, { transform:'translate(-50%,-50%) scale(1.5) rotate(-12deg)', opacity:.9, offset:.4 },
          { transform:'translate(-50%,-90%) scale(.2) rotate(30deg)', opacity:0 }], { duration:420, easing:'ease-in', fill:'forwards' });
        setTimeout(() => {
          const neuve = carte(o); c2.replaceWith(neuve); animerEquipe(neuve); eclatAchat(neuve);
          majCompteurs(); majEntete();
        }, 380);
      }
      majApercu(true); tamponApercu('DÉBLOQUÉ !');
      toast(`${o.nom} ${o.ck ? 'pour ' + CHARS[o.ck].short + ' ' : ''}est à toi !`, true);
      surChangement();
    }, 520);
  }
  function acheterStat(o) {
    if (!possede(o) || etat.stattrak[o.id]) return;
    if (!etat.connecte) { son('deny'); toast('Connecte-toi pour acheter un StatTrak™.'); return; }
    if (etat.pieces < PRIX.stattrak) { son('deny'); toast(`Il te manque ${PRIX.stattrak - etat.pieces} pièces.`); return; }
    if (S.confirmer !== 'st:' + o.id) { S.confirmer = 'st:' + o.id; son('move'); majStat(o); armerConfirmation(o); return; }
    S.confirmer = null;
    const avant = etat.pieces;
    etat.pieces -= PRIX.stattrak;
    etat.stattrak[o.id] = { v:0, m:0 };
    son('achat'); animerSolde(avant, etat.pieces);
    const c = carteDe(o.id);
    if (c) { volerPieces(q('.iaSt')); const n = carte(o); c.replaceWith(n); animerEquipe(n); }
    majStat(o); tamponApercu('STATTRAK™ !');
    q('.iaSt').animate([{ transform:'scale(.9)', opacity:0 }, { transform:'scale(1.05)', opacity:1, offset:.6 }, { transform:'none' }], { duration:380, easing:'ease-out' });
    surChangement();
  }
  // Une confirmation qui s'efface seule : cliquer une fois ne coûte rien.
  let minuteur = null;
  function armerConfirmation(o) {
    clearTimeout(minuteur);
    minuteur = setTimeout(() => { S.confirmer = null; if (objet(S.survol || S.choix) === o) { majActions(o); majStat(o); } }, 2600);
  }

  /* ---------- favoris aléatoires ----------
     Le tirage est fait avant la première image, comme au casino : la roulette
     défile AUTOUR du résultat. */
  function tirerFavoris() {
    const favTenues = cat.filter(o => o.type === 'tenue' && etat.favoris.has(o.id) && possede(o));
    const favDisques = cat.filter(o => o.type === 'disque' && etat.favoris.has(o.id) && possede(o));
    const persosFav = [...new Set(favTenues.map(o => o.ck))];
    const courant = objet(S.choix);
    let ck = courant && courant.ck ? courant.ck : 'naruto';
    if (S.aleaPerso) ck = persosFav.length ? persosFav[(Math.random() * persosFav.length) | 0] : ROSTER[(Math.random() * ROSTER.length) | 0];
    const sesFav = favTenues.filter(o => o.ck === ck);
    let tenue = objet(etat.equipe.tenue[ck]);
    if (S.aleaTenue && sesFav.length) tenue = sesFav[(Math.random() * sesFav.length) | 0];
    let disque = objet(etat.equipe.disque);
    const disquesPossedes = cat.filter(o => o.type === 'disque' && possede(o));
    if (S.aleaDisque) { const pool = favDisques.length ? favDisques : disquesPossedes; disque = pool[(Math.random() * pool.length) | 0]; }
    // Ce qui défile : toutes les tenues favorites (ou celles du perso si le
    // perso est fixe), tous les disques favoris.
    const defileT = S.aleaPerso ? (favTenues.length ? favTenues : [tenue]) : (sesFav.length ? sesFav : [tenue]);
    const defileD = favDisques.length ? favDisques : disquesPossedes;
    return { ck, tenue, disque, defileT, defileD };
  }
  let rlDisque = null;
  function ouvrirRoulette() {
    if (!S.aleaPerso && !S.aleaTenue && !S.aleaDisque) { son('deny'); toast('Active au moins PERSO, TENUE ou DISQUE.'); return; }
    const favs = cat.filter(o => etat.favoris.has(o.id) && (o.type === 'tenue' || o.type === 'disque'));
    if (!favs.length) { son('deny'); toast('Mets des ★ sur tes tenues et tes disques d’abord.'); return; }
    S.rouletteOuverte = true;
    const rl = q('.invRoulette');
    rl.classList.remove('hidden');
    rl.animate([{ opacity:0 }, { opacity:1 }], { duration:200 });
    rl.querySelector('.rlCarte').animate([{ transform:'translateY(4cqh) scale(.9)', opacity:0 }, { transform:'none', opacity:1 }], { duration:320, easing:'cubic-bezier(.2,.8,.3,1)' });
    lancerRoulette();
  }
  function lancerRoulette() {
    const T = tirerFavoris();
    const casP = q('.rlPerso'), casD = q('.rlDisque'), img = casP.querySelector('img'), cv = casD.querySelector('canvas');
    casP.classList.toggle('fixe', !S.aleaPerso && !S.aleaTenue);
    casD.classList.toggle('fixe', !S.aleaDisque);
    q('.rlRelancer').disabled = true; q('.rlGo').disabled = true;
    const g = cv.getContext('2d');
    let did = T.disque.did, ang = 0, t0 = performance.now();
    cancelAnimationFrame(rlDisque);
    const tourner = t => { const dt = Math.min(.05, (t - t0) / 1000); t0 = t; ang += dt * 9; g.clearRect(0, 0, 160, 160); g.save(); g.translate(80, 80); g.rotate(ang);
      try { drawSkinDisc(g, 0, 0, 66, did, ang); } catch (e) { } g.restore(); if (S.rouletteOuverte) rlDisque = requestAnimationFrame(tourner); };
    rlDisque = requestAnimationFrame(tourner);
    const montrerT = o => { img.src = spriteURL(o.ck, o.sid); casP.querySelector('b').textContent = CHARS[o.ck].short; casP.querySelector('small').textContent = o.nom; };
    const montrerD = o => { did = o.did; casD.querySelector('b').textContent = o.nom; casD.querySelector('small').textContent = 'DISQUE'; };
    let k = 0, delai = 45;
    const tourneT = S.aleaPerso || S.aleaTenue, tourneD = S.aleaDisque;
    if (!tourneT) montrerT(T.tenue);
    if (!tourneD) montrerD(T.disque);
    const tic = () => {
      if (!S.rouletteOuverte) return;
      delai *= 1.16; k++;
      const fini = delai > 330;
      if (tourneT) montrerT(fini ? T.tenue : T.defileT[(Math.random() * T.defileT.length) | 0]);
      if (tourneD) montrerD(fini ? T.disque : T.defileD[(Math.random() * T.defileD.length) | 0]);
      if (!fini) { son('tic'); setTimeout(tic, delai); return; }
      son('equip');
      for (const c of [casP, casD]) if (!c.classList.contains('fixe')) {
        c.querySelector('.rlFenetre').animate([{ transform:'scale(1)', filter:'brightness(1)' }, { transform:'scale(1.12)', filter:'brightness(1.8)', offset:.3 }, { transform:'none', filter:'brightness(1)' }], { duration:480, easing:'ease-out' });
      }
      S.tirage = T;
      q('.rlRelancer').disabled = false; q('.rlGo').disabled = false;
    };
    setTimeout(tic, delai);
  }
  function fermerRoulette() {
    S.rouletteOuverte = false; cancelAnimationFrame(rlDisque);
    q('.invRoulette').classList.add('hidden');
  }

  /* ---------- branchements ---------- */
  ecran.addEventListener('click', e => {
    if (ecran.closest('.scene')?.classList.contains('placement')) return;
    const t = e.target;
    const ong = t.closest('.invTitre button');
    if (ong) { if (ong.dataset.onglet !== S.onglet) { S.onglet = ong.dataset.onglet; S.survol = null; S.choix = null; S.confirmer = null; son('select'); rendreTout(true); } return; }
    const c = t.closest('.invCats .tab');
    if (c) { if (c.dataset.cat !== S.categorie) { S.categorie = c.dataset.cat; S.survol = null; S.choix = null; S.confirmer = null; son('move'); rendreTout(true); } return; }
    const fl = t.closest('.ipFleche');
    if (fl) { if (!fl.disabled) { S.pages[cleePage()] = (S.pages[cleePage()] || 0) + +fl.dataset.page; son('move'); rendreGrille(true); } return; }
    const bas = t.closest('.ipBascule');
    if (bas) { S[bas.dataset.alea] = !S[bas.dataset.alea]; bas.classList.toggle('on', S[bas.dataset.alea]); son('move'); return; }
    if (t.closest('.ipFavBtn')) { son('select'); ouvrirRoulette(); return; }
    if (t.closest('.rlRelancer')) { son('select'); lancerRoulette(); return; }
    if (t.closest('.rlGo')) {
      const T = S.tirage; fermerRoulette(); son('select');
      if (T) toast(`Dans le jeu : <b>${CHARS[T.ck].short}</b> en ${T.tenue.nom} avec le disque ${T.disque.nom} → tour du CPU`, true);
      return;
    }
    if (t.closest('.invRoulette') && !t.closest('.rlCarte')) { fermerRoulette(); return; }
    const etoile = t.closest('.icEtoile');
    if (etoile) { basculerFavori(objet(etoile.closest('.invCarte').dataset.id)); return; }
    const carteEl = t.closest('.invCarte');
    if (carteEl) {
      const o = objet(carteEl.dataset.id);
      if (S.choix !== o.id) S.confirmer = null;
      S.choix = o.id; marquerChoix();
      if (S.onglet === 'inventaire' && !auHub(o)) { if (!estEquipe(o)) equiper(o); else { son('move'); majApercu(); } }
      else { son('move'); majApercu(); }
      return;
    }
    const act = t.closest('[data-action]');
    if (act) {
      const o = objet(S.survol || S.choix);
      if (!o) return;
      const a = act.dataset.action;
      if (a === 'equiper') equiper(o);
      else if (a === 'favori') basculerFavori(o);
      else if (a === 'acheter') acheter(o);
      else if (a === 'stattrak') acheterStat(o);
      else if (a === 'hub') { son('select'); toast(`Dans le jeu : ouvre la sélection${o.ck ? ' sur ' + CHARS[o.ck].short : ''}, avec ${o.type === 'tenue' ? 'cette tenue mise' : 'ce disque mis'} en avant.`); }
      else if (a === 'casino') { son('select'); toast(`Dans le jeu : ouvre le Case Opening${o.ck ? ', caisse de ' + CHARS[o.ck].short : ''}.`); }
      else if (a === 'connexion') { son('deny'); toast('Dans le jeu : ouvre la fenêtre de connexion.'); }
    }
  });
  // Survol : l'aperçu suit la souris dans la grille ; en sortant, il revient à
  // l'objet choisi. Hors édition seulement.
  grille.addEventListener('mouseover', e => {
    const c = e.target.closest('.invCarte');
    if (!c || c.dataset.id === S.survol) return;
    S.survol = c.dataset.id; if (S.confirmer) { S.confirmer = null; }
    son('survol'); majApercu();
  });
  q('.invGrille').addEventListener('mouseleave', () => { if (!S.survol) return; S.survol = null; majApercu(); });

  appliquerReglages(R); appliquerPlacement(placement);
  rendreTout(true);

  return {
    ecran,
    reglages(r) { appliquerReglages(r); rendreGrille(false); majApercu(true); },
    placement(p) { appliquerPlacement(p); },
    catalogue(c) { cat = c; S.choix = null; rendreTout(true); },
    etat(e) { etat = e; rendreTout(false); },
    rafraichir() { rendreTout(false); },
    etatActuel: () => etat,
    // Pour le bloc Test : un match joué avec le perso regardé (ou Naruto), sa
    // tenue équipée et le disque équipé. Seuls les objets à StatTrak comptent.
    jouerMatch(gagne) {
      const vu = objet(S.survol || S.choix);
      const ck = vu && vu.ck ? vu.ck : 'naruto';
      const noms = [];
      for (const id of [etat.equipe.tenue[ck], etat.equipe.disque]) {
        const s = etat.stattrak[id]; if (!s) continue;
        s.m++; if (gagne) s.v++; noms.push(objet(id).nom);
      }
      rendreGrille(false); majApercu(); surChangement();
      toast(noms.length ? `${gagne ? 'Victoire' : 'Défaite'} avec ${CHARS[ck].short} : StatTrak™ de ${noms.join(' et ')} +1`
        : `${CHARS[ck].short} : ni sa tenue équipée ni le disque n’ont de StatTrak™.`, !!noms.length);
    },
    arreter() { stopperBoucle(); fermerRoulette(); },
  };
}
