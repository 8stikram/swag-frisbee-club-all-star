// ---------------------------------------------------------------------------
// Skins de personnages. Purement cosmétiques : ils ne touchent ni aux stats,
// ni aux vitesses, ni aux hitboxes. Chaque tenue non par défaut s'achète avec
// les pièces gagnées en jouant, au même prix pour toutes — il n'y a plus de
// défi à remplir.
//
// Deux clés de sauvegarde distinctes, et c'est volontaire :
//   sbcbUnlockedSkins — ce qui a été acheté. JAMAIS effacé, même par une
//                       remise à zéro : on ne reprend pas au joueur ce qu'il
//                       a payé.
//   sbcbActiveSkins   — le skin porté par chaque personnage.
// ---------------------------------------------------------------------------

import { forcageTenue } from './deverrouillage.js';
import { acheterSkin as debiterPieces, connecte } from '../reseau/compte.js';

export const COUT_SKIN = 100;

export const SKINS = {
  naruto: [
    { id: 'shippuden', nom: 'SHIPPUDEN', defaut: true },
    { id: 'hokage', nom: 'HOKAGE' },
    { id: 'ermite', nom: 'MODE ERMITE' },
    { id: 'thelast', nom: 'THE LAST' },
    { id: 'minato', nom: 'MINATO' }
  ],
  leon: [
    { id: 'rpd', nom: 'R.P.D. STANDARD', defaut: true },
    { id: 're2', nom: 'RE2 CLASSIQUE' },
    { id: 're4', nom: 'RE4' },
    { id: 'darkside', nom: 'DARKSIDE' },
    { id: 'requiem', nom: 'REQUIEM' }
  ],
  isaac: [
    { id: 'isaac', nom: 'ISAAC', defaut: true },
    { id: 'magdalene', nom: 'MAGDALENE' },
    { id: 'cain', nom: 'CAIN' },
    { id: 'azazel', nom: 'AZAZEL' },
    { id: 'eve', nom: 'EVE' }
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
  yuki: [
    { id: 'doudoune', nom: 'DOUDOUNE 雪', defaut: true }
  ],
  flowser: [
    { id: 'psychique', nom: 'PSYCHIQUE', defaut: true },
    { id: 'brasier', nom: 'BRASIER', cond: 'victoires', seuil: 3,
      texte: 'Gagner 3 matchs avec Flowser-Two' },
    { id: 'abysse', nom: 'ABYSSE', cond: 'victoires', seuil: 10,
      texte: 'Gagner 10 matchs avec Flowser-Two' },
    { id: 'venin', nom: 'VENIN', cond: 'attrapesMatch', seuil: 12,
      texte: 'Attraper 12 disques en un seul match' },
    { id: 'albinos', nom: 'ALBINOS', cond: 'victoiresDifficile', seuil: 3,
      texte: 'Gagner 3 matchs en difficulté Difficile' }
  ],
  hollis: [
    { id: 'platine', nom: 'PLATINE', defaut: true },
    { id: 'corbeau', nom: 'CORBEAU' },
    { id: 'cerise', nom: 'CERISE' },
    { id: 'argent', nom: 'ARGENT' },
    { id: 'glacier', nom: 'GLACIER' }
  ],
  yoshi: [
    { id: 'vert', nom: 'VERT', defaut: true },
    { id: 'rouge', nom: 'ROUGE' },
    { id: 'bleu', nom: 'BLEU' },
    { id: 'jaune', nom: 'JAUNE' },
    { id: 'violet', nom: 'VIOLET' },
    { id: 'cyan', nom: 'CYAN' },
    { id: 'orange', nom: 'ORANGE' },
    { id: 'rose', nom: 'ROSE' },
    { id: 'noir', nom: 'NOIR' },
    { id: 'blanc', nom: 'BLANC' }
  ],
  jingle: [
    { id: 'polenord', nom: 'PÔLE NORD', defaut: true },
    { id: 'smoking', nom: 'SMOKING NOIR' },
    { id: 'ninja', nom: 'NINJA' },
    { id: 'cowboy', nom: 'COWBOY' },
    { id: 'halloween', nom: 'HALLOWEEN' }
  ]
};

const CLE_DEBLOQUES = 'sbcbUnlockedSkins';
const CLE_ACTIFS = 'sbcbActiveSkins';

let debloques = [];        // ['naruto:hokage', ...]
let actifs = {};           // { naruto: 'hokage', ... }

function charger() {
  try {
    const d = JSON.parse(localStorage.getItem(CLE_DEBLOQUES) || '[]');
    if (Array.isArray(d)) debloques = d;
  } catch (e) { }
  try { actifs = JSON.parse(localStorage.getItem(CLE_ACTIFS) || '{}') || {}; } catch (e) { }
}
function sauverDebloques() {
  try { localStorage.setItem(CLE_DEBLOQUES, JSON.stringify(debloques)); } catch (e) { }
}
function sauverActifs() {
  try { localStorage.setItem(CLE_ACTIFS, JSON.stringify(actifs)); } catch (e) { }
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

// Marque une tenue comme acquise, sans toucher aux pièces : sert à l'achat
// ci-dessous, une fois le débit accepté par le serveur.
function debloquer(ck, id) {
  if (estDebloque(ck, id)) return false;
  debloques.push(ck + ':' + id);
  sauverDebloques();
  return true;
}

// Achète une tenue : débite le compte en ligne d'abord — c'est le serveur qui
// décide si le solde suffit, jamais le navigateur — puis ne la débloque en
// local qu'une fois le débit accepté. Lève une erreur sinon (pas connecté,
// pas assez de pièces), que l'appelant affiche tel quel.
export async function acheterSkinPerso(ck, id) {
  if (estDebloque(ck, id)) return;
  if (!connecte()) throw new Error('connecte-toi pour acheter cette tenue');
  await debiterPieces(COUT_SKIN);
  debloquer(ck, id);
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

// --- Sauvegarde externe ------------------------------------------------------
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
