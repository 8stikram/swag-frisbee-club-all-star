import { Compte } from './compte.js';

// ---------------------------------------------------------------------------
// Le code d'arene.
//
// Cinq caracteres suffisent : trente-trois millions de combinaisons, pour deux
// personnes qui jouent ensemble. L'alphabet exclut O et 0, I et 1 : un code se
// dicte a l'oral, et ces quatre-la se confondent.
//
// Cette table ne sert qu'aux presentations. Une fois les deux navigateurs
// connectes, ils se parlent en direct et plus rien ne passe par ici.
// ---------------------------------------------------------------------------
const BASE = 'https://uxyxwjhtddydbmnkdgsw.supabase.co';
const CLE = 'sb_publishable_5v1KZLiUboQHx5yytAOvCQ_rXBC0j9b';
const LETTRES = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Cadence de relecture. Assez rapide pour que l'attente ne pese pas, assez
// lente pour ne pas marteler le service pendant qu'on attend un adversaire.
export const CADENCE = 2000;

function entetes() {
  const h = { apikey: CLE, 'Content-Type': 'application/json' };
  const t = Compte.session && Compte.session.access_token;
  h.Authorization = 'Bearer ' + (t || CLE);
  return h;
}

async function appel(chemin, options = {}) {
  const r = await fetch(BASE + chemin, { headers: entetes(), ...options });
  const txt = await r.text();
  let corps = null;
  try { corps = txt ? JSON.parse(txt) : null; } catch (e) { corps = txt; }
  if (!r.ok) {
    const m = (corps && (corps.message || corps.msg || corps.error)) || ('erreur ' + r.status);
    throw new Error(m);
  }
  return corps;
}

export function codeAuHasard(n = 5) {
  let s = '';
  for (let i = 0; i < n; i++) s += LETTRES[Math.floor(Math.random() * LETTRES.length)];
  return s;
}

export function codeValide(c) {
  return typeof c === 'string' && new RegExp('^[' + LETTRES + ']{5}$').test(c.trim().toUpperCase());
}

// Depose l'invitation sous un code libre. Une collision est possible mais rare :
// on retente plutot que d'echouer sous le nez du joueur.
export async function ouvrirArene(offre, pseudo) {
  for (let essai = 0; essai < 5; essai++) {
    const code = codeAuHasard();
    try {
      await appel('/rest/v1/rpc/creer_arene', {
        method: 'POST',
        body: JSON.stringify({ p_code: code, p_offre: offre, p_hote: pseudo || null })
      });
      return code;
    } catch (e) {
      if (!/duplicate|unique/i.test(e.message)) throw e;
    }
  }
  throw new Error('impossible de trouver un code libre');
}

export async function lireArene(code) {
  const r = await appel('/rest/v1/arenes?code=eq.' + encodeURIComponent(code) + '&select=*');
  return (r && r[0]) || null;
}

export async function repondreArene(code, reponse) {
  await appel('/rest/v1/arenes?code=eq.' + encodeURIComponent(code), {
    method: 'PATCH', body: JSON.stringify({ reponse })
  });
}

export async function fermerArene(code) {
  try {
    await appel('/rest/v1/arenes?code=eq.' + encodeURIComponent(code), { method: 'DELETE' });
  } catch (e) { /* l'arene finira par expirer d'elle-meme */ }
}

// Attend que l'invite ait depose sa reponse. Rend la main des qu'elle arrive,
// ou au bout du delai — on ne laisse pas un joueur attendre indefiniment.
export function attendreReponse(code, quandPrete, delaiMax = 180000) {
  const debut = Date.now();
  let arret = false;
  const tour = async () => {
    if (arret) return;
    try {
      const a = await lireArene(code);
      if (a && a.reponse) { quandPrete(a.reponse); return; }
      if (!a) { quandPrete(null, 'arene introuvable'); return; }
    } catch (e) { /* on retentera au tour suivant */ }
    if (Date.now() - debut > delaiMax) { quandPrete(null, 'personne n a rejoint'); return; }
    setTimeout(tour, CADENCE);
  };
  setTimeout(tour, CADENCE);
  return () => { arret = true; };
}
