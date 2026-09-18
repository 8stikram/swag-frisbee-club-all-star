// ---------------------------------------------------------------------------
// Mode allégé : quand le navigateur dessine sans la carte graphique.
//
// Certains navigateurs affichent la page avec le moteur de dessin LOGICIEL de
// Windows (« Microsoft Basic Render Driver ») ou son équivalent ailleurs
// (SwiftShader, llvmpipe) — une carte trop ancienne, un pilote bloqué, ou un
// réglage du navigateur resté dans un mauvais état. Mesuré sur une machine
// dotée d'une RTX 4060 Ti mais dont Opera était réglé ainsi : les matchs
// tenaient 180 images par seconde, et les menus tombaient à 13.
//
// L'écart ne venait pas du jeu mais des menus : leurs grandes couches
// translucides et leurs décors animés, empilés au-dessus d'une démo qui bouge,
// doivent alors être recombinés par le processeur à chaque image. On coupe
// donc, et seulement dans ce cas, ce qui décore sans rien dire — les décors
// animés en boucle et la démo derrière les menus — sans toucher à ce qui
// informe ni au match lui-même.
//
// Ce module n'importe rien : loop.js, menus.js et casino.js s'en servent, et
// aucun cycle d'imports ne peut s'y refermer.
// ---------------------------------------------------------------------------

// Les moteurs de dessin logiciels, tels que les navigateurs les nomment.
const LOGICIEL = /Basic Render Driver|SwiftShader|llvmpipe|softpipe|WARP|Software/i;

export const Rendu = { leger: false, raison: '' };

// La détection ne tranche que sur un indice sûr : le nom du moteur annoncé par
// WebGL. Un WebGL introuvable ne suffit PAS à conclure — un bloqueur de
// traçage ou un réglage de confidentialité le coupe aussi sur des machines
// très bien équipées, qui n'ont aucune raison de perdre leurs décors.
//
// `sbcbRenduLeger` dans le stockage local force le choix : '1' l'active, '0'
// le coupe. C'est ce qui permet de le comparer au rendu normal sur une même
// machine (voir mockups/mesure-fps.html).
function detecter() {
  let force = null;
  try { force = localStorage.getItem('sbcbRenduLeger'); } catch (e) { }
  if (force === '1') return { leger: true, raison: 'forcé' };
  if (force === '0') return { leger: false, raison: 'désactivé' };
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return { leger: false, raison: 'WebGL indisponible' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const nom = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    // Un contexte WebGL occupe de la mémoire graphique : on le rend tout de
    // suite, il n'a servi qu'à lire un nom.
    const perte = gl.getExtension('WEBGL_lose_context');
    if (perte) perte.loseContext();
    return { leger: LOGICIEL.test(nom), raison: nom || 'moteur non nommé' };
  } catch (e) {
    return { leger: false, raison: 'détection impossible' };
  }
}

// Posé sur <html> : les décors à figer vivent dans plusieurs écrans, et le
// casino comme les tables doivent pouvoir le lire aussi.
export function appliquerRenduLeger(actif, raison) {
  Rendu.leger = !!actif;
  if (raison !== undefined) Rendu.raison = raison;
  document.documentElement.classList.toggle('renduLeger', Rendu.leger);
}

const trouve = detecter();
appliquerRenduLeger(trouve.leger, trouve.raison);
