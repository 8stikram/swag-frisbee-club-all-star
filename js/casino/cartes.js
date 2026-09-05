// ---------------------------------------------------------------------------
// Le carton : ce qu'est une carte à jouer, indépendamment du jeu qui s'en sert.
//
// Extrait de blackjack.js pour que le banc d'essai des fins de main
// (mockups/blackjack-fins.html) puisse poser de vraies cartes sans embarquer le
// sabot, le compte et l'arbitrage. Une carte redessinée à la main dans le
// mockup aurait dérivé du jeu dès la première retouche.
// ---------------------------------------------------------------------------

export const ENSEIGNES = [
  { s: '♠', nom: 'pique', rouge: false },
  { s: '♥', nom: 'coeur', rouge: true },
  { s: '♦', nom: 'carreau', rouge: true },
  { s: '♣', nom: 'trefle', rouge: false }
];
export const RANGS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// --- Le dos des cartes ------------------------------------------------------
// Trame géométrique, médaillon à pentagramme, couronne de runes et fleurons
// d'angle, en or sur bordeaux. Des rayures en diagonale — ce qu'il y avait
// avant — donnaient un dos de bloc-notes : c'est le motif construit, avec son
// centre et ses angles, qui fait la carte de jeu.
//
// Tout est calculé ici plutôt que déclaré en CSS parce que le pentagramme et
// la couronne demandent de la trigonométrie. Et pas de <pattern> ni de
// clipPath : leur id serait répété par les soixante cartes du sabot, et toutes
// pointeraient vers celui de la première — qui disparaît à chaque donne. Le
// débordement est déjà coupé par overflow:hidden sur .bjDos.
const RUNES_DOS = ['ᚦ', 'ᚱ', 'ᛉ', 'ᛟ', 'ᛃ', 'ᚨ', 'ᛗ', 'ᛖ'];

const dosSvg = (() => {
  const L = 100, H = 150;                 // ratio 2:3, comme le carton
  const pt = (cx, cy, r, deg) => {
    const a = (deg - 90) * Math.PI / 180;
    return [(cx + r * Math.cos(a)).toFixed(2), (cy + r * Math.sin(a)).toFixed(2)];
  };

  // Trame : deux familles de diagonales croisées, plus un point d'or à chaque
  // nœud. Sans les nœuds, les diagonales seules redeviennent des rayures.
  let trame = '', noeuds = '';
  for (let d = -H; d < L + H; d += 9) {
    trame += `M${d} 0 L${d + H} ${H} M${d} ${H} L${d + H} 0 `;
  }
  for (let y = 9; y < H; y += 9)
    for (let x = ((y / 9) % 2 ? 4.5 : 9); x < L; x += 9)
      noeuds += `<circle cx="${x}" cy="${y}" r=".7"/>`;

  // Pentagramme du médaillon : un sommet sur deux, d'un seul trait.
  const cx = L / 2, cy = H / 2;
  const sommets = [];
  for (let i = 0; i < 5; i++) sommets.push(pt(cx, cy, 14, i * 72));
  const ordre = [];
  for (let i = 0, j = 0; i < 5; i++, j = (j + 2) % 5) ordre.push(sommets[j]);
  const etoile = 'M' + ordre.map(p => p.join(' ')).join(' L') + ' Z';

  let couronne = '';
  RUNES_DOS.forEach((g, i) => {
    const [x, y] = pt(cx, cy, 25.5, i * 360 / RUNES_DOS.length);
    couronne += `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central"
                 font-size="5.4" fill="#e8c565" opacity=".72">${g}</text>`;
  });

  // Fleurons d'angle : une petite étoile à quatre branches, dessinée en losange
  // creusé pour rester lisible à la taille d'une carte.
  const fleuron = (x, y) => {
    const b = 4.6, t = 1.3;
    return `<path d="M${x} ${y - b} Q${x + t} ${y - t} ${x + b} ${y}` +
           ` Q${x + t} ${y + t} ${x} ${y + b} Q${x - t} ${y + t} ${x - b} ${y}` +
           ` Q${x - t} ${y - t} ${x} ${y - b} Z" fill="#d4af37" opacity=".5"/>`;
  };

  return `<svg viewBox="0 0 ${L} ${H}" preserveAspectRatio="none">
    <path d="${trame}" fill="none" stroke="#d4af37" stroke-width=".55" opacity=".26"/>
    <g fill="#f6e27a" opacity=".3">${noeuds}</g>
    <rect x="4" y="4" width="${L - 8}" height="${H - 8}" rx="4"
          fill="none" stroke="#d4af37" stroke-width="1.6" opacity=".9"/>
    <rect x="8.5" y="8.5" width="${L - 17}" height="${H - 17}" rx="2.5"
          fill="none" stroke="#d4af37" stroke-width=".6" opacity=".55"/>
    ${fleuron(16, 22)}${fleuron(L - 16, 22)}${fleuron(16, H - 22)}${fleuron(L - 16, H - 22)}
    <circle cx="${cx}" cy="${cy}" r="30" fill="#3a0707" opacity=".82"/>
    <circle cx="${cx}" cy="${cy}" r="30" fill="none" stroke="#d4af37" stroke-width=".9" opacity=".75"/>
    <circle cx="${cx}" cy="${cy}" r="20" fill="none" stroke="#d4af37" stroke-width=".5"
            stroke-dasharray="2 2.4" opacity=".6"/>
    ${couronne}
    <path d="${etoile}" fill="none" stroke="#f6e27a" stroke-width="1.1" opacity=".85"/>
    <circle cx="${cx}" cy="${cy}" r="2.2" fill="#f6e27a" opacity=".9"/>
  </svg>`;
})();


// `face` dit si la carte arrive déjà retournée. Le retournement lui-même est
// une transition CSS sur `.face` : c'est la charnière qui tourne, pas une image
// qu'on remplace.
export function carteDom(carte, face) {
  const d = document.createElement('div');
  d.className = 'bjCarte' + (face ? ' face' : '');
  const couleur = carte.ens.rouge ? 'bjRouge' : 'bjNoir';
  d.innerHTML = `<div class="bjFaces">
      <div class="bjFace">
        <span class="bjCoin ${couleur}">${carte.rang}<span class="bjPip">${carte.ens.s}</span></span>
        <span class="bjCentre ${couleur}">${carte.ens.s}</span>
        <span class="bjCoin bas ${couleur}">${carte.rang}<span class="bjPip">${carte.ens.s}</span></span>
      </div>
      <div class="bjDos">${dosSvg}</div>
    </div>`;
  return d;
}
