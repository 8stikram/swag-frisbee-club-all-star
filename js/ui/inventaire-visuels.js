// ---------------------------------------------------------------------------
// Dessins de l'inventaire : dos de cartes et bannières.
//
// Ils vivent ici pour être partagés : le casino peint le dos choisi sur ses
// cartes (js/casino/cartes.js), le profil affiche la bannière choisie
// (js/ui/profil-ui.js), et la boutique les montre en vitrine.
//
// Tout est en SVG calculé, jamais en image : le jeu reste un site statique
// qu'on peut ouvrir de n'importe où, et un dos ajouté demain ne demande aucun
// fichier de plus.
// ---------------------------------------------------------------------------

// Hasard semé : les étoiles de la bannière « Galaxie » doivent être les mêmes
// à chaque ouverture, sinon le ciel se redessine sous les yeux du joueur.
function alea(graine) {
  let s = 0;
  for (const c of String(graine)) s = (s * 31 + c.charCodeAt(0)) >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

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

// ---------------------------------------------------------------------------
// La même chose, mais dessinable sur un canvas.
//
// La bande du case opening est un canvas : elle ne sait pas afficher du HTML.
// On refait donc le dessin en SVG autonome — fond compris, puisque le fond des
// dos vient de la CSS — qu'on charge dans une image. Le résultat est gardé :
// soixante cartes défilent, ce serait soixante décodages.
// ---------------------------------------------------------------------------
const FOND_DOS = {
  runes:'<radialGradient id="f" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#5c1010"/><stop offset=".55" stop-color="#4a0a0a"/><stop offset="1" stop-color="#2e0505"/></radialGradient>',
  noel:'<radialGradient id="f" cx=".5" cy=".45" r=".7"><stop offset="0" stop-color="#d2213a"/><stop offset=".6" stop-color="#a8122a"/><stop offset="1" stop-color="#6e0818"/></radialGradient>',
  holo:'<linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9ad5"/><stop offset=".25" stop-color="#a9f0ff"/><stop offset=".45" stop-color="#fff7a8"/><stop offset=".65" stop-color="#c7a8ff"/><stop offset=".85" stop-color="#8ff5d0"/><stop offset="1" stop-color="#ff9ad5"/></linearGradient>',
  neon:'<linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0633"/><stop offset=".55" stop-color="#3a0b5e"/><stop offset="1" stop-color="#140726"/></linearGradient>',
};
const INTERIEUR_DOS = { runes:SVG_RUNES, noel:SVG_NOEL, holo:SVG_HOLO, neon:SVG_NEON };
const sansEnveloppe = s => s.replace(/^\s*<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

export function svgAutonome(type, id) {
  if (type === 'dos') {
    const fond = FOND_DOS[id], dedans = INTERIEUR_DOS[id];
    if (!dedans) return null;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><defs>${fond}</defs>` +
      `<rect width="100" height="150" rx="7" fill="url(#f)"/>${sansEnveloppe(dedans)}</svg>`;
  }
  const b = SVG_BAN[id];
  if (!b || id === 'perso') return null;   // « ma bannière » est une image envoyée
  return b.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
}

const images = new Map();
export function imageDe(type, id) {
  const cle = type + ':' + id;
  if (images.has(cle)) return images.get(cle);
  const svg = svgAutonome(type, id);
  if (!svg) return null;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  images.set(cle, img);
  return img;
}

// La plaque d'un titre, telle qu'elle s'affiche sur le profil.
export function plaqueTitreHTML(nom, createur) {
  return `<div class="plaqueTitre${createur ? ' createur' : ''}"><span>${nom}</span></div>`;
}
