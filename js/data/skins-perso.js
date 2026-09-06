// ---------------------------------------------------------------------------
// Skins de personnages. Purement cosmétiques : ils ne touchent ni aux stats,
// ni aux vitesses, ni aux hitboxes. Chaque tenue non par défaut s'achète avec
// les pièces gagnées en jouant — il n'y a plus de défi à remplir.
//
// Ce qui est acheté est acquis POUR DE BON, et sur le compte : le navigateur
// n'en garde qu'une copie. Une tenue payée deux cents pièces qui disparaîtrait en
// changeant de machine ou en vidant son cache, c'est de l'argent repris au
// joueur — et il n'aurait aucun moyen de le prouver.
//
// Deux clés de sauvegarde locales, et c'est volontaire :
//   sbcbUnlockedSkins — ce qui a été acheté. JAMAIS effacé, même par une
//                       remise à zéro. C'est le miroir de la liste du compte,
//                       et le seul recours de qui joue sans être connecté.
//   sbcbActiveSkins   — le skin porté par chaque personnage.
// ---------------------------------------------------------------------------

import { forcageTenue } from './deverrouillage.js';
import { acheterSkin as debiterPieces, debloquerTenue, connecte, Compte } from '../reseau/compte.js';

// Deux tarifs, parce qu'il y a deux natures de tenue.
//
// Une TENUE redessine le personnage : nouvelle tête, nouvelle coupe, parfois un
// autre visage. Un CHROMA ne change que la palette — même silhouette, mêmes
// pixels, d'autres couleurs. Les faire payer pareil revenait à vendre le
// smoking de Jingle au prix du Yoshi rouge, et ça se voyait. Le double, donc :
// deux cents contre cent.
//
// Voir la propriété `chroma` dans SKINS ci-dessous : elle est déclarée à la
// main plutôt que déduite de la façon dont le sprite est construit. On pourrait
// deviner — un chroma n'est qu'une table de couleurs dans characters.js — mais
// la déduction casserait le jour où une tenue serait bâtie autrement, et
// personne ne comprendrait pourquoi son prix a changé tout seul.
export const COUT_SKIN = 200;
export const COUT_CHROMA = 100;

export function coutSkin(ck, id) {
  const s = (SKINS[ck] || []).find(x => x.id === id);
  return (s && s.chroma) ? COUT_CHROMA : COUT_SKIN;
}

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
    { id: 'brasier', nom: 'BRASIER', chroma: true, cond: 'victoires', seuil: 3,
      texte: 'Gagner 3 matchs avec Flowser-Two' },
    { id: 'abysse', nom: 'ABYSSE', chroma: true, cond: 'victoires', seuil: 10,
      texte: 'Gagner 10 matchs avec Flowser-Two' },
    { id: 'venin', nom: 'VENIN', chroma: true, cond: 'attrapesMatch', seuil: 12,
      texte: 'Attraper 12 disques en un seul match' },
    { id: 'albinos', nom: 'ALBINOS', chroma: true, cond: 'victoiresDifficile', seuil: 3,
      texte: 'Gagner 3 matchs en difficulté Difficile' }
  ],
  hollis: [
    { id: 'platine', nom: 'PLATINE', defaut: true },
    { id: 'corbeau', nom: 'CORBEAU', chroma: true },
    { id: 'cerise', nom: 'CERISE', chroma: true },
    { id: 'argent', nom: 'ARGENT', chroma: true },
    { id: 'glacier', nom: 'GLACIER', chroma: true }
  ],
  yoshi: [
    { id: 'vert', nom: 'VERT', defaut: true },
    { id: 'rouge', nom: 'ROUGE', chroma: true },
    { id: 'bleu', nom: 'BLEU', chroma: true },
    { id: 'jaune', nom: 'JAUNE', chroma: true },
    { id: 'violet', nom: 'VIOLET', chroma: true },
    { id: 'cyan', nom: 'CYAN', chroma: true },
    { id: 'orange', nom: 'ORANGE', chroma: true },
    { id: 'rose', nom: 'ROSE', chroma: true },
    { id: 'noir', nom: 'NOIR', chroma: true },
    { id: 'blanc', nom: 'BLANC', chroma: true }
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
  const cle = ck + ':' + id;
  debloques.push(cle);
  sauverDebloques();
  pousserTenue(cle);
  return true;
}

// Achète une tenue : débite le compte en ligne d'abord — c'est le serveur qui
// décide si le solde suffit, jamais le navigateur — puis ne la débloque en
// local qu'une fois le débit accepté. Lève une erreur sinon (pas connecté,
// pas assez de pièces), que l'appelant affiche tel quel.
export async function acheterSkinPerso(ck, id) {
  if (estDebloque(ck, id)) return;
  if (!connecte()) throw new Error('connecte-toi pour acheter cette tenue');
  await debiterPieces(coutSkin(ck, id));
  debloquer(ck, id);
}

// ---------------------------------------------------------------------------
// La liste du compte
//
// `debloquer` écrit toujours en local d'abord, puis pousse vers le serveur sans
// attendre : une tenue qu'on vient de payer doit apparaître tout de suite, et
// un aller-retour réseau au milieu de l'achat se verrait. Si l'écriture échoue,
// la copie locale reste — et la prochaine ouverture de session la repoussera.
// ---------------------------------------------------------------------------

// Fusionne la liste du compte dans la copie locale, dans les deux sens. Appelé
// à chaque chargement de profil.
//
// La fusion ne retire JAMAIS rien : c'est la même règle que pour l'import d'une
// sauvegarde. Deux machines qui ont chacune acheté de leur côté doivent finir
// avec la somme des deux, pas avec la dernière connectée.
export function synchroniserTenues() {
  const distantes = (Compte.profil && Compte.profil.tenues) || [];
  let neuf = false;
  for (const t of distantes) if (!debloques.includes(t)) { debloques.push(t); neuf = true; }
  if (neuf) sauverDebloques();
  // Ce que cette machine a et que le compte n'a pas : on le remonte. C'est ce
  // qui rattrape les tenues achetées avant que le compte ne sache les garder.
  for (const t of debloques) if (!distantes.includes(t)) pousserTenue(t);
}

// Le compte vient d'être chargé : on fusionne. L'événement plutôt qu'un appel
// depuis compte.js, parce que c'est LUI dont ce module dépend — l'inverse aurait
// fermé un cycle d'imports.
document.addEventListener('profilCharge', synchroniserTenues);

function pousserTenue(cle) {
  if (!connecte()) return;
  debloquerTenue(cle).then(liste => {
    if (Array.isArray(liste) && Compte.profil) Compte.profil.tenues = liste;
  }).catch(() => { /* la copie locale reste, on repoussera à la prochaine session */ });
}

// Offre une tenue sans rien débiter. Le case opening s'en sert : il a déjà payé
// SON prix — vingt-cinq ou soixante-quinze pièces selon le mode — et ce prix
// n'a rien à voir avec les cent pièces de la boutique. Passer par
// `acheterSkinPerso` aurait facturé deux fois, et au mauvais tarif.
export function offrirSkin(ck, id) {
  return debloquer(ck, id);
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
