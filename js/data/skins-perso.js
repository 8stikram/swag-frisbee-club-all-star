// ---------------------------------------------------------------------------
// Skins de personnages. Purement cosmétiques : ils ne touchent ni aux stats,
// ni aux vitesses, ni aux hitboxes.
//
// Trois clés de sauvegarde distinctes, et c'est volontaire :
//   sbcbUnlockedSkins — ce qui a été gagné. JAMAIS effacé, même par une remise
//                       à zéro : on ne reprend pas au joueur ce qu'il a mérité.
//   sbcbActiveSkins   — le skin porté par chaque personnage.
//   sbcbStats         — les compteurs de progression, eux réinitialisables.
// ---------------------------------------------------------------------------

import { forcageTenue } from './deverrouillage.js';

export const SKINS = {
  naruto: [
    { id: 'shippuden', nom: 'SHIPPUDEN', defaut: true },
    { id: 'hokage', nom: 'HOKAGE', cond: 'victoires', seuil: 10,
      texte: 'Gagner 10 matchs avec Naruto' },
    { id: 'ermite', nom: 'MODE ERMITE', cond: 'perfectsMatch', seuil: 5,
      texte: 'Faire 5 Perfect Dives en un seul match' },
    { id: 'thelast', nom: 'THE LAST', cond: 'victoiresRapides', seuil: 5,
      texte: 'Gagner 5 matchs en moins de 60 secondes' },
    { id: 'minato', nom: 'MINATO', cond: 'victoiresDifficile', seuil: 3,
      texte: 'Gagner 3 matchs en difficulté Difficile' }
  ],
  leon: [
    { id: 'rpd', nom: 'R.P.D. STANDARD', defaut: true },
    { id: 're2', nom: 'RE2 CLASSIQUE', cond: 'victoires', seuil: 10,
      texte: 'Gagner 10 matchs avec Leon' },
    { id: 're4', nom: 'RE4', cond: 'butsMatch', seuil: 5,
      texte: 'Marquer 5 buts en un seul match' },
    { id: 'darkside', nom: 'DARKSIDE', cond: 'dashThrowsMatch', seuil: 3,
      texte: 'Faire 3 Dash Throws en un seul match' },
    { id: 'requiem', nom: 'REQUIEM', cond: 'victoiresDifficile', seuil: 3,
      texte: 'Gagner 3 matchs en difficulté Difficile' }
  ],
  isaac: [
    { id: 'isaac', nom: 'ISAAC', defaut: true },
    { id: 'magdalene', nom: 'MAGDALENE', cond: 'victoires', seuil: 10,
      texte: 'Gagner 10 matchs avec Isaac' },
    { id: 'cain', nom: 'CAIN', cond: 'attrapesMatch', seuil: 20,
      texte: 'Attraper le disque 20 fois en un seul match' },
    { id: 'azazel', nom: 'AZAZEL', cond: 'perfects', seuil: 10,
      texte: 'Faire 10 Perfect Dives au total' },
    { id: 'eve', nom: 'EVE', cond: 'victoiresDifficile', seuil: 3,
      texte: 'Gagner 3 matchs en difficulté Difficile' }
  ],
  // Cyberleek n'a pour l'instant que sa tenue d'origine. L'entrée est quand
  // même nécessaire : sans elle sa liste de tenues est vide, le panneau s'ouvre
  // sans une seule tuile, et comme c'est la tuile qui valide le personnage, il
  // devenait tout simplement impossible à choisir.
  cyberleek: [
    { id: 'combat', nom: 'TENUE DE COMBAT', defaut: true }
  ],
  // Même raison que Cyberleek ci-dessus : Mamie n'a que son treillis, mais
  // sans cette entrée sa liste serait vide et elle ne pourrait pas être
  // choisie du tout.
  mamie: [
    { id: 'treillis', nom: 'TREILLIS CAMO', defaut: true }
  ],
  chopper: [
    { id: 'junker', nom: 'ÉQUIPEMENT COMPLET', defaut: true }
  ],
  jingle: [
    { id: 'polenord', nom: 'PÔLE NORD', defaut: true },
    { id: 'smoking', nom: 'SMOKING NOIR', cond: 'victoires', seuil: 10,
      texte: 'Gagner 10 matchs avec Jingle' },
    { id: 'ninja', nom: 'NINJA', cond: 'victoiresSansDash', seuil: 1,
      texte: 'Gagner un match sans jamais dasher' },
    { id: 'cowboy', nom: 'COWBOY', cond: 'buts', seuil: 5,
      texte: 'Marquer 5 buts avec Jingle' },
    { id: 'halloween', nom: 'HALLOWEEN', cond: 'victoiresDifficile', seuil: 3,
      texte: 'Gagner 3 matchs en difficulté Difficile' }
  ]
};

// Les conditions dont le nom finit par « Match » se jugent sur une seule
// partie : elles ne sont pas stockées, seulement testées à chaud à la fin du
// match. Toutes les autres se cumulent dans sbcbStats.
const CLE_DEBLOQUES = 'sbcbUnlockedSkins';
const CLE_ACTIFS = 'sbcbActiveSkins';
const CLE_STATS = 'sbcbStats';

let debloques = [];        // ['naruto:hokage', ...]
let actifs = {};           // { naruto: 'hokage', ... }
let stats = {};            // { naruto: { victoires: 3, ... }, ... }

function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE_DEBLOQUES) || '[]');
    if (Array.isArray(d)) debloques = d;
  } catch (e) { }
  try { actifs = JSON.parse(localStorage.getItem(CLE_ACTIFS) || '{}') || {}; } catch (e) { }
  try { stats = JSON.parse(localStorage.getItem(CLE_STATS) || '{}') || {}; } catch (e) { }
}
function sauverDebloques() {
  try { localStorage.setItem(CLE_DEBLOQUES, JSON.stringify(debloques)); } catch (e) { }
}
function sauverActifs() {
  try { localStorage.setItem(CLE_ACTIFS, JSON.stringify(actifs)); } catch (e) { }
}
function sauverStats() {
  try { localStorage.setItem(CLE_STATS, JSON.stringify(stats)); } catch (e) { }
}
charger();

export function listeSkins(ck) { return SKINS[ck] || []; }
export function skinParDefaut(ck) {
  const l = listeSkins(ck);
  return (l.find(s => s.defaut) || l[0] || {}).id;
}

export function estDebloque(ck, id) {
  const s = listeSkins(ck).find(x => x.id === id);
  if (!s) return false;
  // La tenue d'origine reste ouverte quoi qu'il arrive : même en verrouillant
  // tout pour tester, un personnage doit pouvoir s'habiller.
  if (s.defaut) return true;
  // Forçage du panneau admin : vaut pour la session seulement, jamais sauvegardé.
  const f = forcageTenue(ck + ':' + id);
  if (f !== null) return f;
  return debloques.includes(ck + ':' + id);
}

// Renvoie true si le skin vient tout juste d'être gagné, pour que l'appelant
// puisse l'annoncer. Un skin déjà acquis ne redéclenche rien.
export function debloquer(ck, id) {
  if (estDebloque(ck, id)) return false;
  debloques.push(ck + ':' + id);
  sauverDebloques();
  return true;
}

export function skinActif(ck) {
  const id = actifs[ck];
  return (id && estDebloque(ck, id)) ? id : skinParDefaut(ck);
}
export function setSkinActif(ck, id) {
  if (!estDebloque(ck, id)) return false;
  actifs[ck] = id;
  sauverActifs();
  return true;
}

// --- Compteurs --------------------------------------------------------------
export function statsDe(ck) { return stats[ck] || {}; }
export function ajouterStat(ck, cle, n = 1) {
  if (!stats[ck]) stats[ck] = {};
  stats[ck][cle] = (stats[ck][cle] || 0) + n;
  sauverStats();
}

// Confronte les compteurs aux conditions et renvoie les skins nouvellement
// gagnés. `ponctuelles` porte les valeurs du match qui vient de finir, celles
// qui ne se cumulent pas.
export function verifierDeblocages(ck, ponctuelles = {}) {
  const gagnes = [];
  for (const s of listeSkins(ck)) {
    if (s.defaut || estDebloque(ck, s.id)) continue;
    const valeur = (ponctuelles[s.cond] !== undefined)
      ? ponctuelles[s.cond]
      : (statsDe(ck)[s.cond] || 0);
    if (valeur >= s.seuil && debloquer(ck, s.id)) gagnes.push(s);
  }
  return gagnes;
}

// --- Remise à zéro et sauvegarde externe ------------------------------------
// Efface uniquement la progression : les skins gagnés restent acquis.
export function reinitialiserStats() { stats = {}; sauverStats(); }

export function exporter() {
  return JSON.stringify({ version: 1, debloques, actifs }, null, 2);
}
export function importer(texte) {
  try {
    const o = JSON.parse(texte);
    if (!o || !Array.isArray(o.debloques)) return false;
    // On fusionne au lieu de remplacer : importer une vieille sauvegarde ne
    // doit jamais faire perdre un skin gagné depuis.
    for (const d of o.debloques) if (!debloques.includes(d)) debloques.push(d);
    sauverDebloques();
    if (o.actifs && typeof o.actifs === 'object') { actifs = { ...actifs, ...o.actifs }; sauverActifs(); }
    return true;
  } catch (e) { return false; }
}
