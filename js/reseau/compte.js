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

// Un jeton d'accès ne vit qu'une heure. Passé ce délai, tout échouait sur un
// « JWT expired » incompréhensible et il fallait se reconnecter à la main. On
// le renouvelle donc en silence, avec le jeton de rafraîchissement fourni à la
// connexion, puis on rejoue la requête. Le joueur ne voit rien.
let renouvellement = null;

async function renouveler() {
  if (!Compte.session || !Compte.session.refresh_token) return false;
  // Une seule tentative à la fois : sans ce garde, dix requêtes qui expirent
  // ensemble lanceraient dix renouvellements concurrents.
  if (!renouvellement) {
    renouvellement = (async () => {
      try {
        const r = await fetch(BASE + '/auth/v1/token?grant_type=refresh_token', {
          method: 'POST',
          headers: { apikey: CLE, 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: Compte.session.refresh_token })
        });
        if (!r.ok) return false;
        const s = await r.json();
        if (!s || !s.access_token) return false;
        Compte.session = s; sauver();
        return true;
      } catch (e) { return false; }
      finally { setTimeout(() => { renouvellement = null; }, 0); }
    })();
  }
  return renouvellement;
}

async function appel(chemin, options = {}, deuxieme = false) {
  const r = await fetch(BASE + chemin, options);
  const txt = await r.text();
  let corps = null;
  try { corps = txt ? JSON.parse(txt) : null; } catch (e) { corps = txt; }
  if (!r.ok) {
    const msg = (corps && (corps.msg || corps.message || corps.error_description || corps.error)) || ('erreur ' + r.status);
    // Jeton périmé : on le renouvelle et on rejoue une fois, en remettant
    // l'en-tête d'autorisation à jour.
    if (!deuxieme && (r.status === 401 || /jwt|expired/i.test(msg)) && await renouveler()) {
      const o = { ...options };
      if (o.headers && o.headers.Authorization) {
        o.headers = { ...o.headers, Authorization: 'Bearer ' + Compte.session.access_token };
      }
      return appel(chemin, o, true);
    }
    if (r.status === 401 || /jwt|expired/i.test(msg)) {
      deconnecter();
      throw new Error('session expiree — reconnecte-toi');
    }
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
  // Les reglages du compte reprennent la main sur ceux de la machine : c'est
  // tout l'interet de les avoir mis en ligne, et sans regle claire deux
  // ordinateurs se renverraient leurs reglages sans fin.
  await tirerPreferences().catch(() => false);
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

// ---------------------------------------------------------------------------
// Profil public enrichi : banniere, statut, titre, main, presence, historique.
// ---------------------------------------------------------------------------

// Signe de vie. Le jeu l'envoie regulierement : deux minutes sans nouvelle et
// la base considere le joueur hors ligne. Pas de connexion permanente a tenir
// ouverte pour une pastille verte.
export async function signeDeVie() {
  if (!connecte()) return;
  try { await appel('/rest/v1/rpc/signe_de_vie', { method: 'POST', headers: entetes(), body: '{}' }); }
  catch (e) { /* sans importance : on reessaiera au prochain tour */ }
}

let batteur = null;
export function demarrerPresence(cadence = 60000) {
  arreterPresence();
  signeDeVie();
  batteur = setInterval(signeDeVie, cadence);
}
export function arreterPresence() { if (batteur) { clearInterval(batteur); batteur = null; } }

// Le profil vu par les autres, avec la pastille en ligne deja calculee.
export async function profilPublic(id) {
  const r = await appel('/rest/v1/profils_publics?id=eq.' + id + '&select=*', { headers: entetes() });
  return (r && r[0]) || null;
}

export async function chercherPseudo(bout) {
  const q = encodeURIComponent('*' + bout + '*');
  return appel('/rest/v1/profils_publics?pseudo=ilike.' + q + '&select=id,pseudo,avatar,en_ligne&limit=10',
    { headers: entetes() });
}

// Les derniers matchs d'un joueur, pour son profil.
export async function derniersMatchs(id, combien = 3) {
  return appel('/rest/v1/matchs?joueur=eq.' + id +
    '&select=adversaire,adversaire_pseudo,score_joueur,score_adversaire,gagne,joue_le' +
    '&order=joue_le.desc&limit=' + combien, { headers: entetes() });
}

// --- Titres ----------------------------------------------------------------
export async function catalogueTitres() {
  return appel('/rest/v1/titres?select=*', { headers: entetes() });
}
export async function mesTitres() {
  if (!connecte()) return [];
  const r = await appel('/rest/v1/titres_debloques?joueur=eq.' + monId() + '&select=titre',
    { headers: entetes() });
  return (r || []).map(x => x.titre);
}

// --- Banniere --------------------------------------------------------------
export const POIDS_BANNIERE = 2 * 1024 * 1024;

export async function envoyerBanniere(fichier) {
  if (!connecte()) throw new Error('connecte-toi d abord');
  if (!/^image\//.test(fichier.type)) throw new Error('il faut une image');
  if (fichier.size > POIDS_BANNIERE) throw new Error('image trop lourde (2 Mo maximum)');
  const ext = (fichier.name.split('.').pop() || 'png').toLowerCase().slice(0, 4);
  const chemin = monId() + '/banniere.' + ext;
  await appel('/storage/v1/object/bannieres/' + chemin, {
    method: 'POST',
    headers: {
      apikey: CLE,
      Authorization: 'Bearer ' + Compte.session.access_token,
      'x-upsert': 'true'
    },
    body: fichier
  });
  const url = BASE + '/storage/v1/object/public/bannieres/' + chemin + '?v=' + Date.now();
  await majProfil({ banniere: url });
  return url;
}

// --- Fin de match ----------------------------------------------------------
// Remplace enregistrerMatch : ecrit d'un coup l'historique, les compteurs et
// les titres gagnes, par une seule fonction que le navigateur ne peut pas
// contourner.
export async function enregistrerMatchComplet(o) {
  if (!connecte()) return null;
  return appel('/rest/v1/rpc/enregistrer_match_complet', {
    method: 'POST', headers: entetes(),
    body: JSON.stringify({
      p_adversaire: o.adversaireId || null,
      p_adversaire_pseudo: o.adversairePseudo || null,
      p_score: o.score | 0, p_score_adv: o.scoreAdv | 0,
      p_perso: o.perso, p_perso_adv: o.persoAdv || null,
      p_mode: o.mode || 'en_ligne'
    })
  });
}

export async function faceAFace(adversaireId) {
  const r = await appel('/rest/v1/rpc/face_a_face', {
    method: 'POST', headers: entetes(),
    body: JSON.stringify({ p_adversaire: adversaireId })
  });
  return (r && r[0]) || { victoires: 0, defaites: 0 };
}

// ---------------------------------------------------------------------------
// Amis. Une demande part dans un sens, seul le destinataire l'accepte.
// ---------------------------------------------------------------------------
export async function mesAmis() {
  if (!connecte()) return [];
  return appel('/rest/v1/rpc/mes_amis', { method: 'POST', headers: entetes(), body: '{}' });
}

export async function demanderAmi(id) {
  return appel('/rest/v1/amis', {
    method: 'POST', headers: entetes(),
    body: JSON.stringify({ demandeur: monId(), destinataire: id, etat: 'attente' })
  });
}

export async function accepterAmi(id) {
  // On n'accepte que la demande qui vient vers soi : l'autre sens n'existe pas.
  return appel('/rest/v1/amis?demandeur=eq.' + id + '&destinataire=eq.' + monId(), {
    method: 'PATCH', headers: entetes(), body: JSON.stringify({ etat: 'accepte' })
  });
}

export async function retirerAmi(id) {
  const moi = monId();
  await appel('/rest/v1/amis?demandeur=eq.' + moi + '&destinataire=eq.' + id,
    { method: 'DELETE', headers: entetes() }).catch(() => { });
  await appel('/rest/v1/amis?demandeur=eq.' + id + '&destinataire=eq.' + moi,
    { method: 'DELETE', headers: entetes() }).catch(() => { });
}

// --- Invitations a jouer ---------------------------------------------------
// On depose un code d'arene chez un ami. Il le verra dans sa liste, et pourra
// entrer d'un clic sans avoir a recopier quoi que ce soit.
export async function inviter(id, code) {
  await appel('/rest/v1/invitations?de=eq.' + monId() + '&vers=eq.' + id,
    { method: 'DELETE', headers: entetes() }).catch(() => { });
  return appel('/rest/v1/invitations', {
    method: 'POST', headers: entetes(),
    body: JSON.stringify({ de: monId(), vers: id, code })
  });
}

export async function retirerInvitation(deId) {
  return appel('/rest/v1/invitations?de=eq.' + deId + '&vers=eq.' + monId(),
    { method: 'DELETE', headers: entetes() }).catch(() => { });
}

// ---------------------------------------------------------------------------
// Commentaires de profil. Un mur public, avec des reponses d'un niveau.
// ---------------------------------------------------------------------------
export async function lireCommentaires(profilId, combien = 40) {
  const mots = await appel('/rest/v1/commentaires?profil=eq.' + profilId +
    '&select=id,auteur,parent,texte,ecrit_le&order=ecrit_le.asc&limit=' + combien,
    { headers: entetes() });
  if (!mots || !mots.length) return [];
  // Les auteurs en une seule requete plutot qu'une par commentaire. La clef
  // etrangere pointe vers les comptes et non vers les profils, donc la base ne
  // sait pas faire la jointure elle-meme : on la fait ici, ce qui evite de
  // toucher au schema pour si peu.
  const ids = [...new Set(mots.map(m => m.auteur).filter(Boolean))];
  let gens = {};
  if (ids.length) {
    const r = await appel('/rest/v1/profils?id=in.(' + ids.join(',') + ')&select=id,pseudo,avatar',
      { headers: entetes() }).catch(() => []);
    for (const p of r || []) gens[p.id] = p;
  }
  return mots.map(m => ({ ...m, profils: gens[m.auteur] || {} }));
}

export async function ecrireCommentaire(profilId, texte, parent = null) {
  if (!connecte()) throw new Error('connecte-toi d abord');
  const t = (texte || '').trim();
  if (!t) throw new Error('ecris quelque chose');
  if (t.length > 300) throw new Error('300 caracteres maximum');
  return appel('/rest/v1/commentaires', {
    method: 'POST', headers: { ...entetes(), Prefer: 'return=representation' },
    body: JSON.stringify({ profil: profilId, auteur: monId(), parent, texte: t })
  });
}

export async function supprimerCommentaire(id) {
  return appel('/rest/v1/commentaires?id=eq.' + id, { method: 'DELETE', headers: entetes() });
}

// ---------------------------------------------------------------------------
// Preferences en ligne : touches, disque prefere, difficulte contre l'IA.
//
// Elles restent d'abord dans le navigateur — le jeu doit marcher sans compte.
// Le compte ne fait que les transporter d'une machine a l'autre.
//
// Regle de conflit : a la connexion, ce qui est en ligne gagne. Sans regle
// claire, deux ordinateurs se renvoient leurs reglages a tour de role et on ne
// sait jamais lequel a raison.
// ---------------------------------------------------------------------------
const CLES_LOCALES = {
  touches: 'sbcbKeys',
  disque: 'sbcbFavSkin',
  difficulte: 'sbcbDiff',
  viseeDash: 'sbcbDashAim',
  piste: 'sbcbTrack'
};

function lireLocales() {
  const o = {};
  for (const [nom, cle] of Object.entries(CLES_LOCALES)) {
    try { const v = localStorage.getItem(cle); if (v !== null) o[nom] = v; } catch (e) { }
  }
  return o;
}

function ecrireLocales(prefs) {
  if (!prefs) return;
  for (const [nom, cle] of Object.entries(CLES_LOCALES)) {
    if (prefs[nom] === undefined || prefs[nom] === null) continue;
    try { localStorage.setItem(cle, prefs[nom]); } catch (e) { }
  }
}

// Envoie les reglages de cette machine vers le compte.
export async function pousserPreferences() {
  if (!connecte()) return null;
  return majProfil({ preferences: lireLocales() });
}

// Rapatrie les reglages du compte sur cette machine. Renvoie vrai si quelque
// chose a change, pour que l'interface se rafraichisse.
export async function tirerPreferences() {
  if (!connecte()) return false;
  const p = Compte.profil || await chargerProfil();
  const prefs = p && p.preferences;
  if (!prefs || !Object.keys(prefs).length) {
    // Premiere connexion sur ce compte : on y depose ce qu'on a sous la main
    // plutot que de laisser le profil vide.
    await pousserPreferences();
    return false;
  }
  const avant = JSON.stringify(lireLocales());
  ecrireLocales(prefs);
  return JSON.stringify(lireLocales()) !== avant;
}
