import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { heberger, rejoindre, accepterReponse, surChangement, fermer, Reseau } from '../reseau/connexion.js';
import { demarrerPartieReseau, arreterPartieReseau } from '../reseau/partie.js';
import { initMatch, G } from '../game/state.js';

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
  montrer('onChoix', true); montrer('onEtapeHote', false); montrer('onEtapeInvite', false);
  montrer('onPas2Invite', false); montrer('onMaReponse', false); montrer('onCopier2', false);
  const r = $('onReponse'), h = $('onCodeHote');
  if (r) r.value = ''; if (h) h.value = '';
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

  bh.addEventListener('click', async () => {
    sfx('select');
    montrer('onChoix', false); montrer('onEtapeHote', true);
    dire('préparation de l\'arène…');
    try {
      $('onMonCode').value = await heberger();
      dire('envoie ce code, puis colle sa réponse.');
    } catch (e) { dire('impossible d\'ouvrir l\'arène : ' + e.message, true); }
  });

  br.addEventListener('click', () => {
    sfx('select');
    montrer('onChoix', false); montrer('onEtapeInvite', true);
    dire('colle le code de l\'hôte.');
  });

  $('onCopier')?.addEventListener('click', e => copier('onMonCode', e.currentTarget));
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
      montrer('onChoix', true); montrer('onEtapeHote', false); montrer('onEtapeInvite', false);
    }
  });
})();
