import { $, showScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { heberger, rejoindre, accepterReponse, surChangement, fermer, Reseau } from '../reseau/connexion.js';
import { demarrerPartieReseau, arreterPartieReseau, annoncerIdentite, surCoupDEnvoi } from '../reseau/partie.js';
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
// La liaison est ouverte : chacun annonce qui il est et quel personnage il a
// choisi. Le match ne démarre qu'au coup d'envoi de l'hôte, une fois les deux
// choix connus — sinon chacun lancerait le sien avec ses suppositions.
function preparerMatch(role) {
  demarrerPartieReseau(role);
  dire('adversaire trouve — mise en place...');
  annoncerIdentite(G.matchChar || 'naruto');
}

async function lancerMatch(persoHote, persoInvite) {
  // Chacun joue avec son disque préféré, de son côté. Le disque est dessiné
  // localement et n'a aucune incidence sur le jeu : rien n'oblige les deux
  // joueurs à voir le même, et personne n'a envie de se faire imposer celui
  // d'en face. Sans préféré, on en tire un — c'est déjà le comportement solo.
  const { getFavSkin, setSkinId, randomSkinId } = await import('../data/skins.js');
  setSkinId(getFavSkin() || randomSkinId());
  // L'hôte tient toujours le joueur de gauche : le camp qui simule ne peut pas
  // être celui qu'on téléguide.
  initMatch(false, persoHote, persoInvite, 1, true);
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

  // ARENE ouvre le choix entre heberger et rejoindre : deux gestes differents,
  // mais une seule entree au menu, parce qu'on vient pour la meme chose.
  $('onArene')?.addEventListener('click', () => { sfx('select'); montrerPanneau('onChoixArene'); dire(''); });
  $('onRetourMenu')?.addEventListener('click', () => { sfx('select'); montrerPanneau('onChoix'); dire(''); });

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
    if (e === 'connecte') { sfx('go'); preparerMatch(Reseau.role); }
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

// --- Invitations entre amis ------------------------------------------------
// Inviter, c'est ouvrir une arene et deposer le code chez l'ami : il le verra
// dans sa liste et entrera d'un clic, sans rien recopier.
export async function inviterAmi(id, pseudo) {
  const { inviter } = await import('../reseau/compte.js');
  montrerPanneau('onEtapeHote');
  await hebergerAvecCode();
  if (!areneCourante) { dire('impossible d ouvrir l arene.', true); return; }
  try {
    await inviter(id, areneCourante);
    dire(pseudo + ' est invite — il verra le code dans sa liste d amis.');
  } catch (e) { dire('invitation impossible : ' + e.message, true); }
}

export async function rejoindreDepuisAmi(code) {
  montrerPanneau('onEtapeInvite');
  const champ = $('areneEntree');
  if (champ) champ.value = code;
  await rejoindreAvecCode();
}

// Coup d'envoi commun : les deux cotes demarrent sur les memes personnages et
// le meme terrain, annonces par l'hote.
surCoupDEnvoi((p1, p2) => { sfx('go'); lancerMatch(p1, p2); });

// --- Choix du personnage ---------------------------------------------------
// Chacun choisit le sien avant d'entrer : le choix part avec l'identite au
// moment de se connecter, et l'hote assemble les deux au coup d'envoi.
(function cablerPersos() {
  const zone = $('persoChoix');
  if (!zone) return;
  const cases = {};
  const choisir = ck => {
    G.matchChar = ck;
    for (const [k, el] of Object.entries(cases)) el.classList.toggle('on', k === ck);
  };
  let redessiner = () => { };
  import('../data/characters.js').then(({ CHARS, ROSTER }) => {
    const toiles = {};
    // La vignette montre la tenue réellement portée : sans ça on choisit un
    // personnage sans voir de quoi il aura l'air sur le terrain.
    redessiner = async () => {
      const { skinActif } = await import('../data/skins-perso.js');
      for (const k of Object.keys(toiles)) {
        const jeu = CHARS[k].skins && CHARS[k].skins[skinActif(k)];
        const g = toiles[k].getContext('2d');
        g.clearRect(0, 0, 16, 20);
        g.drawImage((jeu && jeu.idle) || CHARS[k].frames.idle, 0, 0);
      }
    };
    for (const ck of ROSTER) {
      const b = document.createElement('button');
      b.className = 'persoCase';
      const cv = document.createElement('canvas');
      cv.width = 16; cv.height = 20;
      toiles[ck] = cv;
      cv.getContext('2d').drawImage(CHARS[ck].frames.idle, 0, 0);
      const nom = document.createElement('span');
      nom.textContent = CHARS[ck].short;
      b.append(cv, nom);
      // Même geste qu'en solo : le personnage ouvre ses tenues, et c'est la
      // tenue qui arrête le choix. Les skins manquaient ici, on partait donc
      // en ligne avec celle de la dernière partie sans pouvoir en changer.
      b.addEventListener('click', async () => {
        sfx('move');
        const { ouvrirPanneauSkins } = await import('./skins-ui.js');
        ouvrirPanneauSkins(1, ck, { auChoix: () => { choisir(ck); redessiner(); } });
      });
      cases[ck] = b;
      zone.appendChild(b);
    }
    choisir(G.matchChar && cases[G.matchChar] ? G.matchChar : ROSTER[0]);
    redessiner();
  });
})();
