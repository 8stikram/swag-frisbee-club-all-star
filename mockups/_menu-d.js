// ---------------------------------------------------------------------------
// Menu titre, version D : tuiles façon jeu de combat.
//
// Partagé par deux mockups : mockups/menu-d.html, où il se règle, et
// mockups/intro-roster.html, où l'intro se pose dessus. Le dessin du menu et
// son animation d'arrivée n'existent qu'ici, pour que les deux ne divergent pas.
//
// Rien n'est importé du jeu : la page fournit les sprites (CHARS) et le
// chemin du logo. Le module reste ainsi utilisable dans la version autonome.
//
// D.A. reprise du menu actuel (css/style.css) : fond cyan, filigrane, anneau,
// contour encre de 4 px, ombre dure, Chakra Petch pour les libellés.
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

export const DEF = {
  // Tuiles
  police_tuile:'chakra', dispoIcone:'gauche', tuileRatio:2.5, tuileIcone:6, tuileTexte:2.7,
  ecartTuiles:1.4, rayon:18, ombre:6, petiteHauteur:6.4,
  // EN LIGNE
  styleEnLigne:'petrole',
  // Modes à venir
  verrouiller:'oui', styleVerrou:'gris', police_bientot:'archivo', bientotTaille:1.45, bientotAngle:8, bientotCouleur:'#f5e63d',
  // Perso
  haloTaille:1.15, haloOpacite:.28,
  // Bandeau
  lueurCouleur:'#9ff4ff', lueurTaille:1.6, lueurForce:.85, bandeauTaille:1.3,
  // Aide « M musique » : taille du jeu actuel
  aideTaille:1,
  // Arrivée des boutons
  styleArrivee:'pop', debutTuiles:.12, decalageTuiles:.07, dureeTuile:.46, rebondArrivee:1,
  // Clic
  styleClic:'eclats', forceClic:1,
};

// x / y en % de la scène, s = échelle. Le perso et le bandeau sont exactement
// à leur place du menu actuel (mesurés dans le jeu, écran de 1200 × 750) ;
// pour le bandeau, x / y désignent son coin bas-droit.
export const PLACEMENT_DEF = {
  logo:    { x:.6,   y:.6,   s:1 },
  tuiles:  { x:3.4,  y:39,   s:1 },
  perso:   { x:54.65, y:21.65, s:1 },
  bandeau: { x:97.6, y:98.1, s:1 },
};
export const NOMS_EL = { logo:'Logo', tuiles:'Tuiles (et l’aide « M musique »)', perso:'Personnage et halo', bandeau:'Phrase du bas' };

// Les deux modes jouables en haut, les deux à venir en dessous : l'œil tombe
// d'abord sur ce qui se joue.
export const ORDRE_DEF = { modes:['vsia', 'enligne', 'histoire', 'jcj'], petites:['entrainement', 'casino', 'options'] };

export const PHRASES_DEF = [
  ['MONTRE AU MONDE', 'QUI EST LE MEILLEUR !'],
  ['LE TERRAIN', 'T’APPARTIENT !'],
  ['CHAQUE LANCER', 'COMPTE !'],
  ['VISE HAUT,', 'FRAPPE FORT !'],
  ['DEVIENS UNE LÉGENDE', 'DU CLUB !'],
  ['LE DISQUE N’ATTEND', 'PERSONNE !'],
  ['UN VRAI CHAMPION', 'NE LÂCHE RIEN !'],
  ['AUJOURD’HUI,', 'C’EST TON JOUR !'],
  ['FAIS TREMBLER', 'LE TERRAIN !'],
  ['PERSONNE NE PEUT', 'T’ARRÊTER !'],
  ['LA VICTOIRE', 'SE MÉRITE !'],
  ['TON DISQUE,', 'TA LÉGENDE !'],
];

const SVG = {
  vsia:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"/></svg>',
  jcj:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 19c0-3 2.7-5 6-5M22 19c0-3-2.7-5-6-5"/></svg>',
  enligne:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 2.5 15 0 18M12 3c-2.5 2.7-2.5 15 0 18"/></svg>',
  entrainement:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6.5c3-1.6 6-1.6 9 0v13c-3-1.6-6-1.6-9 0z"/><path d="M21 6.5c-3-1.6-6-1.6-9 0v13c3-1.6 6-1.6 9 0z"/></svg>',
  casino:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10c0-3 3.5-6 8-6s8 3 8 6"/><path d="M6 7l-1.5-4M18 7l1.5-4"/><circle cx="9" cy="13" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1.4" fill="currentColor" stroke="none"/><path d="M8 18c1.4 1.6 6.6 1.6 8 0"/></svg>',
  options:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>',
  histoire:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4h11l-2.6 4.5L17 13H6"/></svg>',
  cadenas:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>',
  plein:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};

export const BOUTONS = {
  histoire:     { label:'MODE HISTOIRE', court:'HISTOIRE', couleur:'',          verrou:true },
  vsia:         { label:'MATCH VS IA',   court:'VS IA',    couleur:'c-green' },
  jcj:          { label:'MATCH JCJ',     court:'JCJ',      couleur:'c-green',   verrou:true },
  enligne:      { label:'MATCH EN LIGNE',court:'EN LIGNE', couleur:'c-enligne' },
  entrainement: { label:'ENTRAÎNEMENT',  court:'ENTRAÎNEMENT', couleur:'c-learn' },
  casino:       { label:'CASINO',        court:'CASINO',   couleur:'c-casino' },
  options:      { label:'OPTIONS',       court:'OPTIONS',  couleur:'' },
};

/* ================= STYLE ================= */
const CSS = `
.menuD{position:absolute;inset:0;overflow:hidden;
  --green:#5df08a;--learn:#d9b8f5;--yellow:#f5e63d;--ink:#111318;
  --f-tuile:'Chakra Petch','Archivo Black',sans-serif;--w-tuile:700;
  --f-bientot:'Archivo Black',sans-serif;--w-bientot:400}
.menuD *{margin:0;padding:0;box-sizing:border-box}
.menuD .bg{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.menuD .bg-title{background:linear-gradient(160deg,rgba(210,247,245,.82) 0%,rgba(150,230,236,.8) 45%,rgba(99,208,221,.82) 100%)}
.menuD .watermark{position:absolute;top:-30%;left:-60%;width:220%;height:160%;display:flex;flex-direction:column;gap:2.6cqw;
  transform:rotate(-14deg);animation:menuDDerive 30s linear infinite}
.menuD .watermark .line{white-space:nowrap;font-family:'Archivo Black',sans-serif;font-size:4.2cqw;letter-spacing:.12em;color:rgba(255,255,255,.3)}
.menuD .watermark .line:nth-child(even){color:rgba(255,255,255,.16);transform:translateX(-6%)}
@keyframes menuDDerive{from{transform:rotate(-14deg) translateX(0)}to{transform:rotate(-14deg) translateX(-12%)}}
.menuD .streaks{position:absolute;inset:-20%;background:repeating-linear-gradient(-14deg,rgba(255,255,255,.2) 0 3px,transparent 3px 54px);
  animation:menuDRayures 10s linear infinite}
@keyframes menuDRayures{from{transform:translateX(0)}to{transform:translateX(54px)}}
.menuD .ringwrap{position:absolute;top:50%;left:50%;width:150cqh;height:150cqh;transform:translate(-50%,-50%);animation:menuDTourne 50s linear infinite}
@keyframes menuDTourne{from{transform:translate(-50%,-50%) rotate(0)}to{transform:translate(-50%,-50%) rotate(360deg)}}
.menuD .ringwrap svg{width:100%;height:100%}
.menuD .ringwrap text{font-family:'Archivo Black',sans-serif;font-size:15px;letter-spacing:.42em;fill:rgba(255,255,255,.6)}
.menuD .arc{position:absolute;top:50%;left:50%;width:126cqh;height:126cqh;transform:translate(-50%,-50%);
  border:3px dashed rgba(255,255,255,.3);border-radius:50%;animation:menuDTourne 66s linear infinite reverse}
.menuD .degradeBas{position:absolute;left:0;right:0;bottom:0;height:19%;z-index:5;pointer-events:none;
  background:linear-gradient(to top,rgba(0,0,0,.62) 0%,rgba(0,0,0,.38) 40%,rgba(0,0,0,0) 100%)}

/* Barre du haut, telle quelle. */
.menuD .topBar{position:absolute;top:2.6%;right:2.4%;z-index:24;display:flex;gap:.7cqw;align-items:center}
.menuD .fsBtn{width:4.4cqh;height:4.4cqh;min-width:34px;min-height:34px;display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.96);color:var(--ink);border:3px solid var(--ink);border-radius:11px;box-shadow:4px 4px 0 var(--ink);cursor:pointer}
.menuD .fsBtn svg{width:58%;height:58%}
.menuD .fsBtn:hover{background:var(--yellow)}
.menuD .compteBtn{width:auto;min-width:0;padding:0 1.1cqw;font-family:'Russo One',sans-serif;font-size:clamp(8px,1.5cqh,13px);letter-spacing:.03em;white-space:nowrap}

/* Blocs placés : la taille passe par \`scale\`, les animations par \`transform\`,
   ce qui leur permet de se composer sans que l'une écrase l'autre. */
.menuD .mv{position:absolute;left:calc(var(--x) * 1%);top:calc(var(--y) * 1%);scale:var(--s,1);transform-origin:0 0}
/* La phrase s'accroche par son coin bas-droit, comme le bandeau du jeu : X et Y
   sont ce coin, donc elle grandit vers le haut et la gauche sans sortir du cadre. */
.menuD .mv[data-ancrage="droite"]{left:auto;top:auto;right:calc((100 - var(--x)) * 1%);bottom:calc((100 - var(--y)) * 1%);transform-origin:100% 100%}
.menuD .mvPerso{z-index:4;height:74cqh}
.menuD .mvLogo{z-index:6;width:56cqw}
.menuD .mvTuiles{z-index:7;width:43cqw}
.menuD .mvBandeau{z-index:8;text-align:right;white-space:nowrap}

/* Perso : même taille et même place que le menu actuel. Le halo est celui du
   jeu (disque blanc voilé sous les pieds), un peu agrandi par --haloTaille. */
.menuD .titleHero{position:relative;z-index:1;display:block;height:100%;width:auto;image-rendering:pixelated;
  filter:drop-shadow(0 8px 0 rgba(0,0,0,.16));animation:menuDFlotte 2.6s ease-in-out infinite}
.menuD.sansFlottement .titleHero{animation:none}
@keyframes menuDFlotte{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.menuD .halo{position:absolute;left:50%;bottom:-3.1%;width:calc(76.5% * var(--haloTaille,1));aspect-ratio:1;translate:-50% 0;
  border-radius:50%;background:rgba(255,255,255,var(--haloOpacite,.28));filter:blur(2px)}

/* Logo : on ne garde que la bande du PNG où il y a quelque chose. */
.menuD .logoCadre{position:relative;width:100%;aspect-ratio:1254/500;overflow:hidden}
.menuD .logoCadre img{display:block;width:100%;margin-top:-29%;filter:drop-shadow(0 6px 0 rgba(0,0,0,.28))}

/* Phrase du bas : style du bandeau du jeu, avec une lueur autour du contour. */
.menuD .texteBandeau{font-family:'Archivo Black',sans-serif;font-size:calc(clamp(13px,2cqw,26px) * var(--bandeauTaille,1));color:#fff;
  -webkit-text-stroke:5px var(--ink);paint-order:stroke fill;line-height:1.2;
  filter:drop-shadow(0 0 calc(var(--lueurTaille,1.6cqh) * .45) var(--lueurA)) drop-shadow(0 0 var(--lueurTaille,1.6cqh) var(--lueurB))}

/* --- Tuiles --- */
.menuD .rangModes{display:grid;grid-template-columns:1fr 1fr;gap:var(--ecartTuiles,1.4cqh)}
.menuD .rangPetites{display:grid;grid-template-columns:repeat(3,1fr);gap:var(--ecartTuiles,1.4cqh);margin-top:var(--ecartTuiles,1.4cqh)}
.menuD .tuile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1cqh;
  aspect-ratio:var(--tuileRatio,2.5);font-family:var(--f-tuile);font-weight:var(--w-tuile);font-size:var(--tuileTexte,2.7cqh);letter-spacing:.05em;
  color:var(--ink);background:rgba(255,255,255,.96);border:4px solid var(--ink);border-radius:var(--rayon,18px);
  box-shadow:var(--ombre,6px) var(--ombre,6px) 0 var(--ink);cursor:pointer;white-space:nowrap;
  transition:background .1s,color .1s,transform .1s,box-shadow .1s}
.menuD[data-icone="gauche"] .rangModes .tuile{flex-direction:row;justify-content:flex-start;gap:1.2cqw;padding-left:1.4cqw}
.menuD .tuile .ico{position:relative;flex-shrink:0;width:var(--tuileIcone,6cqh);height:var(--tuileIcone,6cqh);border-radius:50%;
  border:.5cqh solid currentColor;display:flex;align-items:center;justify-content:center}
.menuD .tuile .ico svg{width:58%;height:58%}
.menuD .rangPetites .tuile{aspect-ratio:auto;height:var(--petiteHauteur,6.4cqh);flex-direction:row;gap:.7cqw;padding:0 .6cqw;
  font-size:calc(var(--tuileTexte,2.7cqh) * .7);border-radius:calc(var(--rayon,18px) * .8)}
.menuD .rangPetites .tuile .ico{width:2.8cqh;height:2.8cqh;border-width:3px}
.menuD .tuile.c-green{background:var(--green)}
.menuD .tuile.c-learn{background:var(--learn)}
.menuD .tuile.c-casino{background:#e0574f;color:#2a0509}
.menuD .tuile:not(.verrou):hover{background:var(--ink);color:#fff;transform:translate(-2px,-2px);
  box-shadow:calc(var(--ombre,6px) + 2px) calc(var(--ombre,6px) + 2px) 0 var(--ink)}
.menuD .tuile .eclat{position:absolute;inset:0;border-radius:inherit;background:#fff;opacity:0;pointer-events:none;z-index:4}
.menuD .anneauClic{position:absolute;inset:-5px;border-radius:inherit;border:.5cqh solid var(--ink);pointer-events:none;z-index:5}
.menuD .etincelle{position:absolute;left:50%;top:50%;width:1.3cqh;height:1.3cqh;margin:-.65cqh 0 0 -.65cqh;background:var(--yellow);
  border:2px solid var(--ink);pointer-events:none;z-index:6}

/* EN LIGNE aux couleurs de l'écran en ligne : bleu pétrole étoilé, rose. */
.menuD[data-enligne="petrole"] .tuile.c-enligne{color:#fff;
  background:radial-gradient(1.5px 1.5px at 18% 26%,#fff 50%,transparent 51%),radial-gradient(1.5px 1.5px at 84% 20%,#bff3ff 50%,transparent 51%),
    radial-gradient(1.5px 1.5px at 72% 78%,#9df0c0 50%,transparent 51%),radial-gradient(1.5px 1.5px at 40% 84%,#fff 50%,transparent 51%),
    radial-gradient(130% 150% at 30% 20%,#1b86ab 0%,#0d5a76 58%,#073b52 100%)}
.menuD[data-enligne="petrole"] .tuile.c-enligne .ico{color:#f2698c}
.menuD[data-enligne="petrole"] .tuile.c-enligne .lbl{text-shadow:0 3px 0 var(--ink)}
.menuD[data-enligne="petrole"] .tuile.c-enligne::after{content:'';position:absolute;left:0;right:0;bottom:14%;height:9%;background:#f2698c;opacity:.85;z-index:0}
.menuD[data-enligne="petrole"] .tuile.c-enligne > *{position:relative;z-index:1}
.menuD[data-enligne="rose"] .tuile.c-enligne{background:#f2698c;color:var(--ink)}
.menuD[data-enligne="petrole"] .tuile.c-enligne:hover::after{opacity:.4}

/* Modes à venir : grisés, cadenas, étiquette BIENTÔT. */
.menuD .tuile.verrou{cursor:not-allowed}
.menuD[data-verrou="gris"] .tuile.verrou{background:#c5cad3!important;color:rgba(17,19,24,.55)!important}
.menuD[data-verrou="attenue"] .tuile.verrou{color:rgba(17,19,24,.6)!important;
  box-shadow:inset 0 0 0 999px rgba(255,255,255,.45),var(--ombre,6px) var(--ombre,6px) 0 var(--ink)}
.menuD .bientot{position:absolute;top:-1.3cqh;right:-.8cqw;z-index:7;rotate:var(--bientotAngle,8deg);
  font-family:var(--f-bientot);font-weight:var(--w-bientot);font-size:var(--bientotTaille,1.45cqh);letter-spacing:.06em;line-height:1;
  color:var(--ink);background:var(--bientotCouleur,#f5e63d);border:3px solid var(--ink);border-radius:8px;padding:.35cqh .6cqw .25cqh;
  box-shadow:3px 3px 0 var(--ink);white-space:nowrap;pointer-events:none}

.menuD .hint{font-family:'Barlow',sans-serif;font-weight:700;font-size:calc(clamp(9px,1cqw,12px) * var(--aideTaille,1));letter-spacing:.14em;color:rgba(17,19,24,.62);
  text-transform:uppercase;margin-top:1.6cqh;padding-left:.3cqw;white-space:nowrap}
.menuD .hint kbd{font-family:'Archivo Black',sans-serif;background:rgba(17,19,24,.12);padding:1px 5px;border-radius:3px}
`;
export function injecterStyle() {
  if (document.getElementById('styleMenuD')) return;
  const st = document.createElement('style');
  st.id = 'styleMenuD';
  st.textContent = CSS;
  document.head.appendChild(st);
}

/* ================= RÉGLAGES ================= */
function melangeAlpha(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function appliquerReglages(hote, R) {
  const s = (nom, v) => hote.style.setProperty(nom, v);
  const p = POLICES[R.police_tuile] || POLICES.chakra, pb = POLICES[R.police_bientot] || POLICES.archivo;
  s('--f-tuile', p.famille); s('--w-tuile', p.poids);
  s('--f-bientot', pb.famille); s('--w-bientot', pb.poids);
  s('--tuileRatio', R.tuileRatio); s('--tuileIcone', R.tuileIcone + 'cqh'); s('--tuileTexte', R.tuileTexte + 'cqh');
  s('--ecartTuiles', R.ecartTuiles + 'cqh'); s('--rayon', R.rayon + 'px'); s('--ombre', R.ombre + 'px'); s('--petiteHauteur', R.petiteHauteur + 'cqh');
  s('--bientotTaille', R.bientotTaille + 'cqh'); s('--bientotAngle', R.bientotAngle + 'deg'); s('--bientotCouleur', R.bientotCouleur);
  s('--haloTaille', R.haloTaille); s('--haloOpacite', R.haloOpacite);
  s('--lueurTaille', R.lueurTaille + 'cqh'); s('--bandeauTaille', R.bandeauTaille); s('--aideTaille', R.aideTaille);
  s('--lueurA', melangeAlpha(R.lueurCouleur, Math.min(1, R.lueurForce))); s('--lueurB', melangeAlpha(R.lueurCouleur, R.lueurForce * .7));
  hote.dataset.icone = R.dispoIcone;
  hote.dataset.enligne = R.styleEnLigne;
  hote.dataset.verrou = R.styleVerrou;
}

/* ================= DESSIN ================= */
const ico = id => `<span class="ico">${SVG[id]}</span>`;
function tuile(id, R, petite) {
  const b = BOUTONS[id], v = !!b.verrou && R.verrouiller !== 'non';
  return `<button class="tuile ${b.couleur} ${v ? 'verrou' : ''}" data-bouton="${id}">${ico(v ? 'cadenas' : id)}`
    + `<span class="lbl">${petite ? b.label : b.court}</span>${v ? '<span class="bientot">BIENTÔT</span>' : ''}<span class="eclat"></span></button>`;
}
let numero = 0;

/**
 * Construit le menu dans `hote` et renvoie les éléments utiles à l'animation.
 * options : { R, placement, ordre, perso, phrase:[l1,l2], CHARS, logo }
 */
export function construireMenuD(hote, { R, placement, ordre, perso, phrase, CHARS, logo }) {
  injecterStyle();
  hote.classList.add('menuD');
  appliquerReglages(hote, R);
  const piste = 'pisteMenuD' + (++numero);
  const mv = (el, contenu, classe, ancrage) => {
    const p = placement[el];
    return `<div class="mv ${classe}" data-el="${el}" data-nom="${NOMS_EL[el]}"${ancrage ? ` data-ancrage="${ancrage}"` : ''} style="--x:${p.x};--y:${p.y};--s:${p.s}">${contenu}</div>`;
  };
  const ligne = '<div class="line">SWAG FRISBEE CLUB SWAG FRISBEE CLUB SWAG FRISBEE CLUB </div>';
  hote.innerHTML = `
    <div class="bg bg-title"><div class="watermark">${ligne.repeat(6)}</div><div class="streaks"></div><div class="arc"></div>
      <div class="ringwrap"><svg viewBox="0 0 400 400"><path id="${piste}" d="M 200,200 m -160,0 a 160,160 0 1,1 320,0 a 160,160 0 1,1 -320,0" fill="none"/>
        <text><textPath href="#${piste}" startOffset="0%">MENU PRINCIPAL • MENU PRINCIPAL • MENU PRINCIPAL • MENU PRINCIPAL • </textPath></text></svg></div></div>
    <div class="degradeBas"></div>
    <div class="topBar"><button class="fsBtn compteBtn">SE CONNECTER</button><button class="fsBtn">${SVG.plein}</button></div>
    ${mv('perso', '<div class="halo"></div><canvas class="titleHero" width="256" height="320"></canvas>', 'mvPerso')}
    ${mv('logo', `<div class="logoCadre"><img class="logoImg" src="${logo}" alt="Swag Frisbee Club All Star"></div>`, 'mvLogo')}
    ${mv('tuiles', `<div class="rangModes">${ordre.modes.map(id => tuile(id, R)).join('')}</div>`
      + `<div class="rangPetites">${ordre.petites.map(id => tuile(id, R, true)).join('')}</div>`
      + '<div class="hint"><kbd>M</kbd> musique</div>', 'mvTuiles')}
    ${mv('bandeau', `<div class="texteBandeau">${phrase[0]}<br>${phrase[1]}</div>`, 'mvBandeau', 'droite')}`;
  // Même agrandissement que le jeu (drawSprite ×16).
  const cv = hote.querySelector('.titleHero'), g = cv.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(CHARS[perso].frames.idle, 0, 0, 16, 20, 0, 0, cv.width, cv.height);
  return {
    racine: hote,
    logo: hote.querySelector('.mvLogo'), logoImg: hote.querySelector('.logoImg'),
    perso: hote.querySelector('.mvPerso'), heros: cv, halo: hote.querySelector('.halo'),
    tuiles: [...hote.querySelectorAll('.rangModes .tuile')], petites: [...hote.querySelectorAll('.rangPetites .tuile')],
    aide: hote.querySelector('.hint'), bandeau: hote.querySelector('.mvBandeau'), degrade: hote.querySelector('.degradeBas'),
    barre: hote.querySelector('.topBar'),
  };
}

/* ================= ARRIVÉE =================
   Renvoie les animations sous forme de descriptions (élément, clés, départ,
   durée, courbe), toutes relatives au moment où les tuiles commencent. La page
   les joue telles quelles ; l'intro les décale et les range dans sa frise.
   `logo` et `perso` peuvent être laissés à l'intro, qui les fait voler. */
export function arriveeMenuD(h, R, { logo = true, perso = true } = {}) {
  const A = [], k = R.rebondArrivee;
  const add = (el, kf, depart, duree, easing = 'linear') => { if (el) A.push({ el, kf, depart, duree, easing }); };
  if (logo) add(h.logo, [{ opacity:0, transform:'translateY(-4cqh) scale(1.5)' }, { opacity:1, transform:`scale(${1 - .05 * k})`, offset:.6 },
    { opacity:1, transform:'none' }], -.12, .5, 'cubic-bezier(.2,.9,.3,1)');
  if (perso) add(h.perso, [{ opacity:0, transform:'translateX(55cqw) scale(1.06)' }, { opacity:1, transform:`translateX(${-1.5 * k}cqw) scale(1)`, offset:.7 },
    { opacity:1, transform:'none' }], -.02, .6, 'cubic-bezier(.2,.8,.3,1)');

  const T = R.debutTuiles, D = R.dureeTuile;
  const styles = {
    pop: [{ opacity:0, transform:'translateY(4cqh) scale(.55) rotate(-7deg)' },
      { opacity:1, transform:`translateY(${-.6 * k}cqh) scale(${1 + .07 * k}) rotate(${1.5 * k}deg)`, offset:.62 }, { opacity:1, transform:'none' }],
    glisse: [{ opacity:0, transform:'translateX(-45%)' }, { opacity:1, transform:`translateX(${3 * k}%)`, offset:.7 }, { opacity:1, transform:'none' }],
    retourne: [{ opacity:0, transform:'perspective(70cqh) rotateX(-100deg)', transformOrigin:'50% 0' },
      { opacity:1, transform:`perspective(70cqh) rotateX(${14 * k}deg)`, transformOrigin:'50% 0', offset:.65 },
      { opacity:1, transform:'perspective(70cqh) rotateX(0deg)', transformOrigin:'50% 0' }],
  };
  const kfTuile = styles[R.styleArrivee] || styles.pop;
  h.tuiles.forEach((t, i) => {
    const d = T + i * R.decalageTuiles;
    add(t, kfTuile, d, D, 'cubic-bezier(.2,.8,.3,1)');
    add(t.querySelector('.ico'), [{ transform:'scale(0) rotate(-90deg)' }, { transform:`scale(${1 + .25 * k}) rotate(${10 * k}deg)`, offset:.6 },
      { transform:'none' }], d + .12, .42, 'cubic-bezier(.2,.8,.3,1)');
    add(t.querySelector('.bientot'), [{ scale:'0' }, { scale:`${1 + .3 * k}`, offset:.6 }, { scale:'1' }], d + .26, .34, 'ease-out');
  });
  const apresModes = T + h.tuiles.length * R.decalageTuiles + D * .35;
  h.petites.forEach((t, j) => {
    const d = apresModes + j * R.decalageTuiles * .8;
    add(t, [{ opacity:0, transform:'translateY(3cqh)' }, { opacity:1, transform:`translateY(${-.4 * k}cqh)`, offset:.7 }, { opacity:1, transform:'none' }],
      d, .36, 'cubic-bezier(.2,.9,.3,1)');
  });
  const fin = apresModes + h.petites.length * R.decalageTuiles * .8 + .2;
  add(h.aide, [{ opacity:0 }, { opacity:1 }], fin, .3);
  add(h.degrade, [{ opacity:0 }, { opacity:1 }], T, .5);
  add(h.bandeau, [{ opacity:0, transform:'translateY(3cqh)' }, { opacity:1, transform:'none' }], T + .18, .5, 'cubic-bezier(.2,.9,.3,1)');
  add(h.barre, [{ opacity:0, transform:'translateY(-3cqh)' }, { opacity:1, transform:'none' }], T + .25, .4, 'cubic-bezier(.2,.9,.3,1)');
  return A;
}
// Fin de l'arrivée, en secondes après le départ des tuiles.
export function dureeArrivee(A) { return Math.max(...A.map(a => a.depart + a.duree)); }

/* ================= CLICS =================
   Appui : la tuile s'enfonce dans son ombre. Relâché : elle rebondit, un
   éclat blanc la traverse, un anneau s'échappe, l'icône saute, et quelques
   éclats jaunes partent (style « éclats »). Tout en transform / opacity. */
const appuis = new WeakMap();
export function presser(t, R) {
  if (!t || t.classList.contains('verrou')) return;
  const o = R.ombre;
  const a = t.animate([{ transform:'none' }, { transform:`translate(${o - 1}px,${o - 1}px) scale(${1 - .03 * R.forceClic})`, boxShadow:'1px 1px 0 #111318' }],
    { duration:70, easing:'ease-out', fill:'forwards' });
  appuis.set(t, a);
}
export function relacher(t, R) {
  const a = appuis.get(t);
  if (a) { a.cancel(); appuis.delete(t); }
}
export function animerClic(t, R) {
  if (!t) return;
  relacher(t, R);
  const f = R.forceClic, o = R.ombre;
  if (R.styleClic === 'sobre') {
    t.animate([{ transform:`translate(${o - 1}px,${o - 1}px)` }, { transform:'none' }], { duration:160, easing:'ease-out' });
    return;
  }
  t.animate([{ transform:`translate(${o - 1}px,${o - 1}px) scale(${1 - .04 * f})` },
    { transform:`translate(-2px,-2px) scale(${1 + .06 * f})`, offset:.45 }, { transform:'none' }],
    { duration:420, easing:'cubic-bezier(.2,.8,.3,1)' });
  t.querySelector('.eclat')?.animate([{ opacity:.75 * Math.min(1, f) }, { opacity:0 }], { duration:280, easing:'ease-out' });
  t.querySelector('.ico')?.animate([{ transform:'none' }, { transform:`scale(${1 + .35 * f}) rotate(-14deg)`, offset:.35 }, { transform:'none' }],
    { duration:440, easing:'cubic-bezier(.2,.8,.3,1)' });
  const anneau = document.createElement('span');
  anneau.className = 'anneauClic';
  t.appendChild(anneau);
  anneau.animate([{ transform:'scale(1)', opacity:.9 }, { transform:`scale(${1 + .16 * f},${1 + .4 * f})`, opacity:0 }],
    { duration:440, easing:'cubic-bezier(.1,.7,.3,1)' }).finished.then(() => anneau.remove(), () => anneau.remove());
  if (R.styleClic !== 'eclats') return;
  for (let i = 0; i < 7; i++) {
    const e = document.createElement('span');
    e.className = 'etincelle';
    t.appendChild(e);
    const ang = (i / 7) * Math.PI * 2 + Math.random() * .6, dist = (9 + Math.random() * 7) * f;
    const dx = Math.cos(ang) * dist * 1.9, dy = Math.sin(ang) * dist;
    e.animate([{ transform:'translate(0,0) scale(1) rotate(0deg)', opacity:1 },
      { transform:`translate(${dx}cqh,${dy}cqh) scale(.2) rotate(${180 + Math.random() * 180}deg)`, opacity:0 }],
      { duration:420 + Math.random() * 160, easing:'cubic-bezier(.1,.8,.3,1)' }).finished.then(() => e.remove(), () => e.remove());
  }
}
export function animerRefus(t) {
  if (!t) return;
  t.animate([{ transform:'none' }, { transform:'translateX(-6px) rotate(-1deg)' }, { transform:'translateX(6px) rotate(1deg)' },
    { transform:'translateX(-5px)' }, { transform:'translateX(4px)' }, { transform:'none' }], { duration:380, easing:'ease-out' });
  t.querySelector('.ico')?.animate([{ transform:'none' }, { transform:'rotate(-18deg)' }, { transform:'rotate(16deg)' }, { transform:'rotate(-10deg)' },
    { transform:'none' }], { duration:420, easing:'ease-out' });
  t.querySelector('.bientot')?.animate([{ scale:'1' }, { scale:'1.3', offset:.3 }, { scale:'1' }], { duration:380, easing:'ease-out' });
}
