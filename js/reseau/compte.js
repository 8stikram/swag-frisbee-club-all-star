// ---------------------------------------------------------------------------
// Comptes, profils et statistiques en ligne.
//
// Tout passe par de simples requêtes : aucune bibliothèque à charger, le jeu
// reste un site statique qu'on peut ouvrir depuis n'importe où.
//
// La clé ci-dessous est publique par conception — elle finit forcément dans le
// code que tout le monde peut lire. Ce n'est pas elle qui protège quoi que ce
// soit : la protection vit dans les règles posées sur la base (voir
// supabase/schema.sql), qui interdisent d'écrire ailleurs que chez soi.
// ---------------------------------------------------------------------------
const BASE = 'https://uxyxwjhtddydbmnkdgsw.supabase.co';
const CLE = 'sb_publishable_5v1KZLiUboQHx5yytAOvCQ_rXBC0j9b';

const CLE_SESSION = 'sbcbSession';
export const Compte = { session: null, profil: null };

function charger() {
  try { Compte.session = JSON.parse(localStorage.getItem(CLE_SESSION) || 'null'); } catch (e) { }
}
function sauver() {
  try {
    if (Compte.session) localStorage.setItem(CLE_SESSION, JSON.stringify(Compte.session));
    else localStorage.removeItem(CLE_SESSION);
  } catch (e) { }
}
charger();

export function connecte() { return !!(Compte.session && Compte.session.access_token); }
export function monId() { return Compte.session && Compte.session.user && Compte.session.user.id; }

function entetes(json = true) {
  const h = { apikey: CLE };
  if (json) h['Content-Type'] = 'application/json';
  h.Authorization = 'Bearer ' + (connecte() ? Compte.session.access_token : CLE);
  return h;
}

async function appel(chemin, options = {}) {
  const r = await fetch(BASE + chemin, options);
  const txt = await r.text();
  let corps = null;
  try { corps = txt ? JSON.parse(txt) : null; } catch (e) { corps = txt; }
  if (!r.ok) {
    const msg = (corps && (corps.msg || corps.message || corps.error_description || corps.error)) || ('erreur ' + r.status);
    throw new Error(msg);
  }
  return corps;
}

// --- Compte ----------------------------------------------------------------
// Le mot de passe part directement au service d'authentification et n'est
// jamais conservé ici, pas même le temps d'un instant.
export async function inscrire(email, motDePasse) {
  const s = await appel('/auth/v1/signup', {
    method: 'POST', headers: entetes(),
    body: JSON.stringify({ email, password: motDePasse })
  });
  if (s && s.access_token) { Compte.session = s; sauver(); }
  return s;
}

export async function connecterSe(email, motDePasse) {
  const s = await appel('/auth/v1/token?grant_type=password', {
    method: 'POST', headers: entetes(),
    body: JSON.stringify({ email, password: motDePasse })
  });
  Compte.session = s; sauver();
  await chargerProfil();
  return s;
}

export function deconnecter() {
  Compte.session = null; Compte.profil = null; sauver();
}

// --- Profil ----------------------------------------------------------------
export async function chargerProfil() {
  if (!connecte()) return null;
  const r = await appel('/rest/v1/profils?id=eq.' + monId() + '&select=*', { headers: entetes() });
  Compte.profil = (r && r[0]) || null;
  return Compte.profil;
}

export async function creerProfil(pseudo) {
  const p = await appel('/rest/v1/profils', {
    method: 'POST',
    headers: { ...entetes(), Prefer: 'return=representation' },
    body: JSON.stringify({ id: monId(), pseudo })
  });
  Compte.profil = (p && p[0]) || null;
  return Compte.profil;
}

export async function majProfil(champs) {
  const p = await appel('/rest/v1/profils?id=eq.' + monId(), {
    method: 'PATCH',
    headers: { ...entetes(), Prefer: 'return=representation' },
    body: JSON.stringify(champs)
  });
  Compte.profil = (p && p[0]) || Compte.profil;
  return Compte.profil;
}

// --- Photo de profil -------------------------------------------------------
// Chacun dépose dans un dossier à son nom : impossible d'écraser l'image d'un
// autre. Le poids est borné côté base ; on refuse ici aussi, pour dire non
// tout de suite plutôt qu'après l'envoi.
export const POIDS_MAX = 1024 * 1024;

export async function envoyerAvatar(fichier) {
  if (!connecte()) throw new Error('connecte-toi d\'abord');
  if (!/^image\//.test(fichier.type)) throw new Error('il faut une image');
  if (fichier.size > POIDS_MAX) throw new Error('image trop lourde (1 Mo maximum)');
  const ext = (fichier.name.split('.').pop() || 'png').toLowerCase().slice(0, 4);
  const chemin = monId() + '/avatar.' + ext;
  // x-upsert : sans lui le service refuse toute photo suivante avec « la
  // ressource existe déjà ». Le chemin est fixe par compte, donc changer de
  // photo revient toujours à écraser la précédente — c'est le comportement
  // voulu, et ça évite d'accumuler les anciennes indéfiniment.
  await appel('/storage/v1/object/avatars/' + chemin, {
    method: 'POST',
    headers: {
      apikey: CLE,
      Authorization: 'Bearer ' + Compte.session.access_token,
      'x-upsert': 'true'
    },
    body: fichier
  });
  // On range l'adresse publique dans le profil, avec un numéro de version :
  // sans lui, le navigateur continuerait d'afficher l'ancienne image.
  const url = BASE + '/storage/v1/object/public/avatars/' + chemin + '?v=' + Date.now();
  await majProfil({ avatar: url });
  return url;
}

// --- Classement et fin de match -------------------------------------------
export async function classement(limite = 20) {
  return appel('/rest/v1/classement?select=*&limit=' + limite, { headers: entetes() });
}

export async function enregistrerMatch(gagne, marques, encaisses, perso) {
  if (!connecte()) return null;
  return appel('/rest/v1/rpc/enregistrer_match', {
    method: 'POST', headers: entetes(),
    body: JSON.stringify({ gagne, marques, encaisses, perso })
  });
}

// Les trois personnages les plus joués, pour le podium de la fiche.
export function podiumPersos(profil = Compte.profil) {
  const m = (profil && profil.persos) || {};
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([ck, n]) => ({ ck, n }));
}
