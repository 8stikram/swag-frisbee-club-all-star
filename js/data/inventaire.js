// ---------------------------------------------------------------------------
// Inventaire et boutique — les données.
//
// Un seul catalogue pour tout ce qui se possède : tenues, disques, dos de
// cartes, titres, bannières. Chaque objet a un identifiant préfixé par son
// type — 'tenue:naruto:hokage', 'disque:galaxy', 'dos:noel' — et c'est ce même
// identifiant qui voyage jusqu'à la base (supabase/inventaire.sql).
//
// Règles décidées le 19/09 :
//   • trois raretés, et seulement pour les tenues : DE BASE < CHROMA < SKIN.
//     Un chroma ne change que les couleurs : il est moins rare qu'un skin, et
//     il coûte la moitié (100 contre 200) ;
//   • les disques coûtent 50, sauf DEUX offerts à chaque compte, tirés au sort
//     une seule fois — le tirage vit côté serveur, pour qu'on ne puisse pas le
//     relancer en vidant son cache ;
//   • le StatTrak™ s'achète 25 par objet, et compte tout : IA et en ligne ;
//   • les titres ne s'achètent pas, ils se gagnent en jouant.
//
// Les tenues restent gérées par data/skins-perso.js — c'est lui qui sait ce
// qui est débloqué et qui le synchronise depuis toujours. Ce module ne double
// pas cette liste : il la consulte.
// ---------------------------------------------------------------------------
import { listeSkins, rareteTenue, estDebloque, offrirSkin, coutSkin, skinActif } from './skins-perso.js';
import { DISC_SKINS, setFavSkin, setSkinId, getSkinId, brancherPossessionDisque } from './skins.js';
import { ROSTER } from './characters.js';
import { Compte, connecte, majProfil, acheterObjet, acheterStattrak, stattrakMatch, disquesOfferts, debloquerObjet } from '../reseau/compte.js';

export const PRIX = { tenue:200, chroma:100, disque:50, stattrak:25 };

// --- Le contenu qui n'existe que dans l'inventaire --------------------------
export const DOS = [
  { id:'runes', nom:'RUNES DU DIABLE', defaut:true, desc:'Le dos d’origine du casino.' },
  { id:'neon', nom:'NÉON', prix:100 },
  { id:'noel', nom:'NOËL', prix:150 },
  { id:'holo', nom:'HOLOGRAMME', prix:250 },
];
export const BANNIERES = [
  { id:'perso', nom:'MA BANNIÈRE', defaut:true, desc:'L’image que tu envoies depuis ton profil.' },
  { id:'coucher', nom:'COUCHER DE SOLEIL', prix:100 },
  { id:'terrain', nom:'LE TERRAIN', prix:150 },
  { id:'galaxie', nom:'GALAXIE', prix:250 },
];
// Les titres viennent de la base (table `titres`). Cette liste sert quand on
// joue sans compte, et donne l'ordre d'affichage.
export const TITRES = [
  { id:'debutant', nom:'DÉBUTANT', cond:'Offert à la création du compte' },
  { id:'habitue', nom:'HABITUÉ', cond:'Jouer 10 matchs en ligne' },
  { id:'veteran', nom:'VÉTÉRAN', cond:'Jouer 50 matchs en ligne' },
  { id:'tireur', nom:'TIREUR D’ÉLITE', cond:'Marquer 100 points au total' },
  { id:'invaincu', nom:'INVAINCU', cond:'Gagner 10 matchs en ligne' },
  { id:'legende', nom:'LÉGENDE', cond:'Gagner 50 matchs en ligne' },
  { id:'createur', nom:'CRÉATEUR DU JEU', cond:'Avoir fait le jeu', secret:true },
];
export const NOM_TYPE = { tenue:'TENUE', disque:'DISQUE', dos:'DOS DE CARTES', titre:'TITRE', banniere:'BANNIÈRE' };
export const CATEGORIES = [
  { id:'tenue', nom:'TENUES' }, { id:'disque', nom:'DISQUES' }, { id:'dos', nom:'DOS DE CARTES' },
  { id:'titre', nom:'TITRES' }, { id:'banniere', nom:'BANNIÈRES' },
];

// --- Le catalogue -----------------------------------------------------------
// Recalculé à la demande : un disque ou une tenue ajoutés au jeu y entrent
// sans qu'on touche à ce fichier.
export function catalogue() {
  const L = [];
  for (const ck of ROSTER) for (const s of listeSkins(ck)) {
    L.push({ id:`tenue:${ck}:${s.id}`, type:'tenue', ck, sid:s.id, nom:s.nom, chroma:!!s.chroma, defaut:!!s.defaut,
      rarete:rareteTenue(ck, s.id), prix: s.defaut ? 0 : coutSkin(ck, s.id),
      source: s.defaut ? 'defaut' : 'direct', casino: !s.defaut });
  }
  for (const d of DISC_SKINS) {
    const tuto = d.verrou === 'tuto';
    L.push({ id:'disque:' + d.id, type:'disque', did:d.id, nom:(d.name || '').toUpperCase(), rarete:null,
      prix: tuto ? 0 : PRIX.disque, source: tuto ? 'tuto' : 'direct', cond: tuto ? d.aide : null });
  }
  for (const d of DOS) L.push({ id:'dos:' + d.id, type:'dos', did:d.id, nom:d.nom, rarete:null, defaut:!!d.defaut,
    prix:d.prix || 0, source: d.defaut ? 'defaut' : 'direct', desc:d.desc });
  for (const t of TITRES) L.push({ id:'titre:' + t.id, type:'titre', tid:t.id, nom:t.nom, rarete:null, prix:0,
    source:'gain', cond:t.cond, secret:!!t.secret });
  for (const b of BANNIERES) L.push({ id:'banniere:' + b.id, type:'banniere', bid:b.id, nom:b.nom, rarete:null, defaut:!!b.defaut,
    prix:b.prix || 0, source: b.defaut ? 'defaut' : 'direct', desc:b.desc });
  return L;
}
export const objetDe = id => catalogue().find(o => o.id === id) || null;

// --- Ce qu'on possède, ce qu'on porte, ce qu'on aime ------------------------
const CLES = { objets:'sbcbObjets', equipe:'sbcbEquipement', favoris:'sbcbFavoris', st:'sbcbStatTrak', offerts:'sbcbOfferts' };
const lire = (cle, defaut) => { try { const v = JSON.parse(localStorage.getItem(cle) || 'null'); return v ?? defaut; } catch (e) { return defaut; } };
const ecrire = (cle, v) => { try { localStorage.setItem(cle, JSON.stringify(v)); } catch (e) { } };

let objets = lire(CLES.objets, []);            // ids possédés, hors tenues
let equipe = lire(CLES.equipe, {});            // { disque, dos, banniere, titre }
let favoris = lire(CLES.favoris, []);          // ids marqués d'une étoile
let stattrak = lire(CLES.st, {});              // { id: { v, m } }
let offerts = lire(CLES.offerts, null);        // les deux disques offerts

const disquesVendus = () => DISC_SKINS.filter(d => d.verrou !== 'tuto').map(d => 'disque:' + d.id);

// Hors ligne, le tirage se fait une fois et reste dans le navigateur. En
// ligne, c'est la base qui tranche et qui garde (voir synchroniser).
function tirerOfferts() {
  const pool = [...disquesVendus()];
  const a = pool.splice((Math.random() * pool.length) | 0, 1)[0];
  const b = pool.splice((Math.random() * pool.length) | 0, 1)[0];
  return [a, b].filter(Boolean);
}
export function disquesDuCompte() {
  if (!offerts || offerts.length < 2) { offerts = tirerOfferts(); ecrire(CLES.offerts, offerts); }
  return offerts;
}

export function possede(id) {
  if (id.startsWith('tenue:')) { const [, ck, sid] = id.split(':'); return estDebloque(ck, sid); }
  const o = objetDe(id);
  if (o && (o.defaut || o.source === 'defaut')) return true;
  if (o && o.type === 'titre') return titresGagnes.includes(o.tid);
  if (id.startsWith('disque:')) {
    const d = DISC_SKINS.find(x => 'disque:' + x.id === id);
    // Le 20/20 reste la récompense du tutoriel : il ne s'achète pas.
    if (d && d.verrou === 'tuto') return objets.includes(id);
    if (disquesDuCompte().includes(id)) return true;
  }
  return objets.includes(id);
}

// Les titres gagnés arrivent du compte (table titres_debloques).
let titresGagnes = [];
export function poserTitres(liste) { titresGagnes = liste || []; }
export function titresDuCompte() { return titresGagnes; }

export function equipeDe(type) {
  if (type === 'titre') return (Compte.profil && Compte.profil.titre_actif) || equipe.titre || null;
  // Le disque en main est celui du jeu : il se choisit aussi dans la sélection,
  // et l'inventaire doit dire la même chose que le carrousel.
  if (type === 'disque') return equipe.disque || 'disque:' + getSkinId();
  return equipe[type] || null;
}
export function equiper(id) {
  const o = objetDe(id);
  if (!o || !possede(id)) return false;
  equipe[o.type] = id;
  ecrire(CLES.equipe, equipe);
  // Chaque type a son effet ailleurs : le disque est celui qu'on emporte au
  // match, le titre s'affiche sur le profil en ligne.
  if (o.type === 'disque') { setFavSkin(o.did); setSkinId(o.did); }
  if (o.type === 'titre' && connecte()) majProfil({ titre_actif:o.nom }).catch(() => { });
  pousser();
  document.dispatchEvent(new CustomEvent('inventaireChange', { detail:{ equipe:o.type, id } }));
  return true;
}

export function estFavori(id) { return favoris.includes(id); }
export function basculerFavori(id) {
  const i = favoris.indexOf(id);
  if (i < 0) favoris.push(id); else favoris.splice(i, 1);
  ecrire(CLES.favoris, favoris);
  pousser();
  return i < 0;
}
export function listeFavoris() { return favoris.slice(); }

export function statDe(id) { return stattrak[id] || null; }
export function pourcentStat(s) { return s && s.m ? Math.round(s.v / s.m * 100) : 0; }

// --- Acheter ----------------------------------------------------------------
// Les messages de la base sont écrits pour la base. Ceux-là sont écrits pour
// le joueur — y compris celui qui arrive tant que supabase/inventaire.sql
// n'a pas été passé, sans quoi il lit un « 404 » sans rien comprendre.
function traduire(err) {
  const m = String((err && err.message) || err);
  if (/pas assez/i.test(m)) throw new Error('pas assez de pièces');
  if (/deja possede/i.test(m)) throw new Error('tu l’as déjà');
  if (/introuvable/i.test(m)) throw new Error('cet objet ne se vend pas');
  if (/deja pose/i.test(m)) throw new Error('il a déjà un StatTrak™');
  if (/function|404|schema cache|not find/i.test(m)) throw new Error('la boutique n’est pas encore branchée sur le compte');
  throw new Error(m);
}
// C'est la base qui connaît le prix et qui débite : le navigateur ne fait que
// nommer l'objet. Rien n'est débloqué en local tant qu'elle n'a pas accepté.
export async function acheter(id) {
  const o = objetDe(id);
  if (!o) throw new Error('objet inconnu');
  if (possede(id)) throw new Error('tu l’as déjà');
  if (o.source !== 'direct') throw new Error('celui-là ne s’achète pas');
  if (!connecte()) throw new Error('connecte-toi pour acheter');
  await acheterObjet(id).catch(traduire);
  if (o.type === 'tenue') offrirSkin(o.ck, o.sid);
  else if (!objets.includes(id)) { objets.push(id); ecrire(CLES.objets, objets); }
  document.dispatchEvent(new CustomEvent('inventaireChange', { detail:{ achat:id } }));
  return true;
}

// Offre un objet sans rien débiter. Les caisses du casino s'en servent : elles
// ont déjà payé LEUR prix, qui n'a rien à voir avec celui de la boutique.
export function offrir(id) {
  if (possede(id)) return false;
  if (!objets.includes(id)) { objets.push(id); ecrire(CLES.objets, objets); }
  debloquerObjet(id).catch(() => { /* la copie locale reste, elle repartira */ });
  document.dispatchEvent(new CustomEvent('inventaireChange', { detail:{ gagne:id } }));
  return true;
}

export async function acheterCompteur(id) {
  if (!possede(id)) throw new Error('achète l’objet d’abord');
  if (stattrak[id]) throw new Error('il en a déjà un');
  if (!connecte()) throw new Error('connecte-toi pour acheter un StatTrak');
  await acheterStattrak(id).catch(traduire);
  stattrak[id] = { v:0, m:0 };
  ecrire(CLES.st, stattrak);
  return true;
}

// Fin de match : les objets portés qui ont un compteur avancent d'un cran.
// Compté pour tous les matchs, contre l'IA comme en ligne — c'est ce qui a été
// décidé, et c'est ce qui rend le compteur vivant.
export function compterMatch(ck, disqueId, gagne) {
  const ids = [];
  if (ck) { const t = `tenue:${ck}:${skinActif(ck)}`; if (stattrak[t]) ids.push(t); }
  if (disqueId && stattrak[disqueId]) ids.push(disqueId);
  if (!ids.length) return [];
  for (const id of ids) { const s = stattrak[id]; s.m++; if (gagne) s.v++; }
  ecrire(CLES.st, stattrak);
  stattrakMatch(ids, gagne).catch(() => { /* le compteur local reste, il repartira */ });
  return ids;
}

// --- Le compte --------------------------------------------------------------
// Fusion à la connexion : ce qui est possédé ne se perd JAMAIS (on additionne
// les deux listes), le reste suit la dernière écriture, comme décidé.
export async function synchroniser() {
  const p = Compte.profil;
  if (!p) return;
  const distants = p.objets || [];
  let neuf = false;
  for (const id of distants) if (!objets.includes(id) && !id.startsWith('tenue:')) { objets.push(id); neuf = true; }
  if (neuf) ecrire(CLES.objets, objets);
  if (p.favoris && p.favoris.length) { favoris = [...new Set([...favoris, ...p.favoris])]; ecrire(CLES.favoris, favoris); }
  if (p.stattrak && Object.keys(p.stattrak).length) { stattrak = { ...stattrak, ...p.stattrak }; ecrire(CLES.st, stattrak); }
  if (p.equipement && Object.keys(p.equipement).length) { equipe = { ...equipe, ...p.equipement }; ecrire(CLES.equipe, equipe); }
  // Les deux disques offerts : c'est la base qui tire et qui garde.
  try {
    const liste = await disquesOfferts(disquesVendus());
    if (Array.isArray(liste) && liste.length >= 2) { offerts = liste; ecrire(CLES.offerts, offerts); }
  } catch (e) { /* hors ligne, le tirage local fait l'affaire */ }
  // Ce que cette machine a en plus part vers le compte.
  pousser();
  document.dispatchEvent(new CustomEvent('inventaireChange', { detail:{ synchro:true } }));
}
document.addEventListener('profilCharge', () => { synchroniser(); });

// Le registre des disques demande ici qui est possédé : un disque non acheté
// n'apparaît plus dans le carrousel de la sélection ni dans les tirages.
brancherPossessionDisque(id => possede(id));
// Un disque retenu d'avant la boutique — ou perdu en changeant de compte —
// ne doit pas rester en main : on retombe sur un de ceux qu'on a.
(function disqueValide() {
  const actuel = 'disque:' + getSkinId();
  if (possede(actuel)) return;
  const mien = disquesDuCompte().find(id => possede(id)) || disquesVendus().find(id => possede(id));
  if (mien) setSkinId(mien.split(':')[1]);
})();

let enAttente = null;
function pousser() {
  if (!connecte()) return;
  clearTimeout(enAttente);
  enAttente = setTimeout(() => {
    majProfil({ equipement:equipe, favoris, objets:[...new Set([...(Compte.profil.objets || []), ...objets])] })
      .catch(() => { /* on repoussera au prochain changement */ });
  }, 600);
}
