import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { heberger, rejoindre, accepterReponse, surChangement, fermer, Reseau } from '../reseau/connexion.js';
import { demarrerPartieReseau, arreterPartieReseau } from '../reseau/partie.js';
import { initMatch, G } from '../game/state.js';
import { montrerPanneau } from './profil-ui.js';
import { ouvrirArene, lireArene, repondreArene, fermerArene, attendreReponse, codeValide } from '../reseau/arene.js';
import { Compte } from '../reseau/compte.js';

// ---------------------------------------------------------------------------
// Écran du match en ligne. Il ne fait que porter deux bouts de texte d'un
// joueur à l'autre : tout le reste se passe entre les deux navigateurs.
// ---------------------------------------------------------------------------
const dire = (txt, mauvais) => {
  const e = $('onEtat');
  if (!e) return;
  e.textContent = txt || '';
  e.classList.toggle('bad', !!mauvais);
};
const montrer = (id, oui) => { const e = $(id); if (e) e.classList.toggle('hidden', !oui); };

function copier(idZone, bouton) {
  const z = $(idZone); if (!z) return;
  z.select();
  navigator.clipboard?.writeText(z.value).catch(() => { });
  if (bouton) { bouton.textContent = 'COPIÉ'; setTimeout(() => { bouton.textContent = 'COPIER'; }, 900); }
  sfx('select');
}

export function ouvrirEnLigne() {
  fermer(); arreterPartieReseau();
  montrerPanneau('onChoix');
  montrer('onPas2Invite', false); montrer('onMaReponse', false); montrer('onCopier2', false);
  for (const id of ['onReponse', 'onCodeHote', 'areneEntree']) { const e = $(id); if (e) e.value = ''; }
  abandonnerArene();
  dire('');
  showScreen('online');
}

// Une fois la liaison ouverte, on lance le match des deux côtés. L'hôte tient
// le joueur de gauche, l'invité celui de droite — c'est la seule répartition
// possible : le camp qui simule ne peut pas être celui qu'on téléguide.
function lancerMatch(role) {
  demarrerPartieReseau(role);
  initMatch(false, G.matchChar || 'naruto', G.matchCPU || 'leon', 1, true);
  // Les deux personnages sont humains : aucun des deux n'est piloté par l'IA.
  G.p2.human = true; G.p2.ai = null;
  showScreen(null);
  dire('');
}

(function cabler() {
  const bh = $('onHeberger'), br = $('onRejoindre');
  if (!bh || !br) return;

  bh.addEventListener('click', () => {
    sfx('select');
    montrerPanneau('onEtapeHote');
    hebergerAvecCode();
  });

  br.addEventListener('click', () => {
    sfx('select');
    montrerPanneau('onEtapeInvite');
    dire('tape le code que ton adversaire t\'a donné.');
    const c = $('areneEntree');
    if (c) { c.value = ''; c.focus(); }
  });

  $('onRejoindreCode')?.addEventListener('click', () => { sfx('select'); rejoindreAvecCode(); });
  $('areneEntree')?.addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') rejoindreAvecCode();
  });

  // On copie le code lui-même, pas le pavé technique : c'est lui qu'on envoie.
  $('onCopier')?.addEventListener('click', e => {
    const t = $('areneCode').textContent.trim();
    navigator.clipboard?.writeText(t).catch(() => { });
    e.currentTarget.textContent = 'COPIÉ';
    setTimeout(() => { e.currentTarget.textContent = 'COPIER LE CODE'; }, 900);
    sfx('select');
  });
  $('onCopier2')?.addEventListener('click', e => copier('onMaReponse', e.currentTarget));

  $('onValiderHote')?.addEventListener('click', async () => {
    const t = $('onCodeHote').value.trim();
    if (!t) { dire('colle d\'abord le code de l\'hôte.', true); return; }
    dire('lecture du code…');
    try {
      $('onMaReponse').value = await rejoindre(t);
      montrer('onPas2Invite', true); montrer('onMaReponse', true); montrer('onCopier2', true);
      dire('renvoie cette réponse à l\'hôte, puis attends.');
    } catch (e) { dire('ce code n\'est pas lisible.', true); }
  });

  $('onValiderReponse')?.addEventListener('click', async () => {
    const t = $('onReponse').value.trim();
    if (!t) { dire('colle d\'abord sa réponse.', true); return; }
    dire('connexion…');
    try { await accepterReponse(t); } catch (e) { dire('cette réponse n\'est pas lisible.', true); }
  });

  surChangement(e => {
    if (e === 'connecte') { sfx('go'); lancerMatch(Reseau.role); }
    else if (e === 'perdu') {
      arreterPartieReseau();
      dire('liaison perdue.', true);
      showScreen('online');
      montrerPanneau('onChoix');
    }
  });
})();

// --- Code d'arene ----------------------------------------------------------
// Le copier-coller marche toujours, mais il reste replie : il ne sert que si
// le service est injoignable. Ce qu'on montre d'abord, c'est le code.
let areneCourante = null, arretAttente = null;

export function abandonnerArene() {
  if (arretAttente) { arretAttente(); arretAttente = null; }
  if (areneCourante) { fermerArene(areneCourante); areneCourante = null; }
}

async function hebergerAvecCode() {
  dire('preparation de l arene...');
  $('areneCode').textContent = '·····';
  $('onAttente').textContent = 'preparation...';
  try {
    const offre = await heberger();
    $('onMonCode').value = offre;
    const pseudo = (Compte.profil && Compte.profil.pseudo) || null;
    areneCourante = await ouvrirArene(offre, pseudo);
    $('areneCode').textContent = areneCourante;
    $('onAttente').textContent = 'En attente d un adversaire...';
    dire('donne ce code a ton adversaire.');
    arretAttente = attendreReponse(areneCourante, async (reponse, souci) => {
      if (souci || !reponse) { dire(souci || 'personne n a rejoint.', true); return; }
      dire('adversaire trouve, connexion...');
      try { await accepterReponse(reponse); fermerArene(areneCourante); areneCourante = null; }
      catch (e) { dire('sa reponse est illisible.', true); }
    });
  } catch (e) {
    $('areneCode').textContent = '—';
    $('onAttente').textContent = 'service injoignable : passe par l echange manuel.';
    dire(e.message, true);
  }
}

async function rejoindreAvecCode() {
  const code = ($('areneEntree').value || '').trim().toUpperCase();
  if (!codeValide(code)) { dire('un code fait cinq caracteres.', true); return; }
  dire('recherche de l arene...');
  try {
    const a = await lireArene(code);
    if (!a) { dire('aucune arene sous ce code.', true); return; }
    const reponse = await rejoindre(a.offre);
    $('onMaReponse').value = reponse;
    await repondreArene(code, reponse);
    dire(a.hote ? ('arene de ' + a.hote + ' — connexion...') : 'connexion...');
  } catch (e) { dire(e.message, true); }
}
