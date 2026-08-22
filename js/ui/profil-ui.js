import { $ } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { CHARS } from '../data/characters.js';
import {
  Compte, connecte, inscrire, connecterSe, deconnecter, chargerProfil,
  creerProfil, majProfil, envoyerAvatar, classement, podiumPersos
} from '../reseau/compte.js';

// ---------------------------------------------------------------------------
// Compte, fiche de profil et classement. Trois panneaux qui vivent dans
// l'écran du mode en ligne, dans le même bleu pastel que le reste.
// ---------------------------------------------------------------------------
const PANNEAUX = ['onChoix', 'onChoixArene', 'onEtapeHote', 'onEtapeInvite', 'onEtapeCompte',
  'onEtapePseudo', 'onEtapeFiche', 'onEtapeClassement'];

export function montrerPanneau(id) {
  for (const p of PANNEAUX) { const e = $(p); if (e) e.classList.toggle('hidden', p !== id); }
  // Les listes portent deja leur propre RETOUR : le gros bouton du bas ferait
  // doublon. Il ne sert qu'aux panneaux, qui n'en ont pas.
  const r = document.querySelector('.onRetour');
  if (r) r.classList.toggle('hidden', id === 'onChoix' || id === 'onChoixArene');
}
const dire = (t, mauvais) => {
  const e = $('onEtat'); if (!e) return;
  e.textContent = t || ''; e.classList.toggle('bad', !!mauvais);
};

// --- Fiche -----------------------------------------------------------------
function dessinerPerso(ck) {
  const c = CHARS[ck];
  const cv = document.createElement('canvas');
  cv.width = 16; cv.height = 20;
  if (c) cv.getContext('2d').drawImage(c.frames.idle, 0, 0);
  return cv;
}

export function afficherFiche() {
  const p = Compte.profil;
  if (!p) return;
  const carte = $('ficheCarte');
  carte.style.setProperty('--c1', p.couleur1 || '#35e0ff');
  carte.style.setProperty('--c2', p.couleur2 || '#7b2ff7');
  $('fichePseudo').textContent = p.pseudo || '';
  const img = $('ficheAvatar'), vide = $('ficheAvatarVide');
  if (p.avatar) { img.src = p.avatar; img.classList.remove('hidden'); vide.classList.add('hidden'); }
  else { img.classList.add('hidden'); vide.classList.remove('hidden'); }
  $('onCoul1').value = p.couleur1 || '#35e0ff';
  $('onCoul2').value = p.couleur2 || '#7b2ff7';

  // Un ratio parle plus qu'un total : marquer 300 points en 50 matchs n'a rien
  // a voir avec les marquer en 5.
  const diff = (p.points_marques || 0) - (p.points_encaisses || 0);
  const taux = p.matchs ? Math.round((p.victoires || 0) / p.matchs * 100) : 0;
  const stats = [
    [p.matchs || 0, 'matchs'], [p.victoires || 0, 'victoires'], [taux + '%', 'de reussite'],
    [p.points_marques || 0, 'points mis'], [p.points_encaisses || 0, 'encaisses'],
    [(diff >= 0 ? '+' : '') + diff, 'difference']
  ];
  $('ficheStats').innerHTML = stats
    .map(([v, l]) => '<div class="ficheStat"><b>' + v + '</b><span>' + l + '</span></div>').join('');

  const pod = $('fichePodium');
  pod.innerHTML = '';
  const trois = podiumPersos(p);
  if (!trois.length) {
    const a = document.createElement('span');
    a.className = 'onAide';
    a.textContent = 'Joue quelques matchs en ligne pour voir tes persos ici.';
    pod.appendChild(a);
  } else for (const { ck, n } of trois) {
    const d = document.createElement('div'); d.className = 'fichePerso';
    d.appendChild(dessinerPerso(ck));
    const e = document.createElement('em');
    e.textContent = ((CHARS[ck] && CHARS[ck].short) || ck) + ' - ' + n;
    d.appendChild(e); pod.appendChild(d);
  }
}

// --- Classement ------------------------------------------------------------
function marche(j, rang) {
  const d = document.createElement('div'); d.className = 'clMarche';
  if (j && j.avatar) { const i = document.createElement('img'); i.src = j.avatar; d.appendChild(i); }
  else { const v = document.createElement('div'); v.className = 'vide'; v.textContent = j ? '?' : '-'; d.appendChild(v); }
  const b = document.createElement('b'); b.textContent = j ? j.pseudo : '-'; d.appendChild(b);
  if (j) {
    // Le personnage le plus joue, pose a cote de la photo.
    const fav = podiumPersos(j)[0];
    if (fav) { const cv = dessinerPerso(fav.ck); cv.style.height = '5cqh'; d.appendChild(cv); }
    const s = document.createElement('span'); s.textContent = j.victoires + ' victoires'; d.appendChild(s);
  }
  const socle = document.createElement('div');
  socle.className = 'clSocle';
  socle.style.height = (rang === 1 ? 7 : rang === 2 ? 5 : 3.6) + 'cqh';
  socle.textContent = rang;
  d.appendChild(socle);
  return d;
}

export async function afficherClassement() {
  montrerPanneau('onEtapeClassement');
  dire('chargement du classement...');
  try {
    const l = await classement(20);
    const pod = $('clPodium'); pod.innerHTML = '';
    // Le premier au centre, le deuxieme a gauche, le troisieme a droite.
    [[l[1], 2], [l[0], 1], [l[2], 3]].forEach(([j, r]) => pod.appendChild(marche(j, r)));
    const liste = $('clListe');
    liste.innerHTML = '';
    l.slice(3).forEach((j, i) => {
      const d = document.createElement('div'); d.className = 'clLigne';
      d.innerHTML = '<span class="rang"></span><span></span><span></span><span class="taux"></span>';
      const c = d.children;
      c[0].textContent = i + 4; c[1].textContent = j.pseudo;
      c[2].textContent = j.victoires + 'V'; c[3].textContent = j.taux_victoire + '%';
      liste.appendChild(d);
    });
    dire(l.length ? '' : 'personne n a encore joue de match en ligne.');
  } catch (e) { dire('classement indisponible : ' + e.message, true); }
}

// --- Cablage ---------------------------------------------------------------
export async function ouvrirProfil() {
  if (!connecte()) { montrerPanneau('onEtapeCompte'); dire(''); return; }
  dire('chargement du profil...');
  try {
    const p = await chargerProfil();
    if (!p) { montrerPanneau('onEtapePseudo'); dire('il te manque un pseudo.'); return; }
    montrerPanneau('onEtapeFiche'); afficherFiche(); rafraichirBoutonCompte(); dire('');
  } catch (e) { dire(e.message, true); }
}

(function cabler() {
  if (!$('onProfil')) return;
  $('onProfil').addEventListener('click', () => { sfx('select'); ouvrirProfil(); });
  $('onClassement').addEventListener('click', () => { sfx('select'); afficherClassement(); });

  $('onSeConnecter').addEventListener('click', async () => {
    const e = $('onEmail').value.trim(), m = $('onMdp').value;
    if (!e || !m) { dire('adresse et mot de passe, s il te plait.', true); return; }
    dire('connexion...');
    try { await connecterSe(e, m); $('onMdp').value = ''; ouvrirProfil(); }
    catch (err) { dire(err.message, true); }
  });

  $('onSInscrire').addEventListener('click', async () => {
    const e = $('onEmail').value.trim(), m = $('onMdp').value;
    if (!e || m.length < 6) { dire('adresse valide et mot de passe d au moins 6 caracteres.', true); return; }
    dire('creation du compte...');
    try {
      const s = await inscrire(e, m);
      $('onMdp').value = '';
      // Selon le reglage du projet, le compte peut demander une confirmation
      // par mail avant de pouvoir servir.
      if (s && s.access_token) { montrerPanneau('onEtapePseudo'); dire('compte cree - choisis ton pseudo.'); }
      else dire('compte cree : confirme le mail recu, puis connecte-toi.');
    } catch (err) { dire(err.message, true); }
  });

  $('onValiderPseudo').addEventListener('click', async () => {
    const v = $('onPseudo').value.trim();
    if (v.length < 2) { dire('deux caracteres minimum.', true); return; }
    dire('enregistrement...');
    try { await creerProfil(v); montrerPanneau('onEtapeFiche'); afficherFiche(); rafraichirBoutonCompte(); dire(''); }
    catch (err) { dire(/duplicate|unique/i.test(err.message) ? 'ce pseudo est deja pris.' : err.message, true); }
  });

  $('onFichier').addEventListener('change', async ev => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    dire('envoi de la photo...');
    try { await envoyerAvatar(f); afficherFiche(); rafraichirBoutonCompte(); dire('photo mise a jour.'); }
    catch (err) { dire(err.message, true); }
    ev.target.value = '';
  });

  const couleur = async () => {
    try {
      await majProfil({ couleur1: $('onCoul1').value, couleur2: $('onCoul2').value });
      afficherFiche();
      // Le bouton du haut porte les memes couleurs : il doit suivre tout de
      // suite, sinon on croit que le choix n'a pas pris.
      rafraichirBoutonCompte();
    } catch (err) { dire(err.message, true); }
  };
  $('onCoul1').addEventListener('change', couleur);
  $('onCoul2').addEventListener('change', couleur);

  $('onDeconnexion').addEventListener('click', () => {
    deconnecter(); sfx('deny'); rafraichirBoutonCompte(); montrerPanneau('onChoix'); dire('deconnecte.');
  });
})();

// ---------------------------------------------------------------------------
// Bouton de compte de la barre du haut. Il suit l'état de la session : une
// invitation à se connecter tant qu'on ne l'est pas, le pseudo et la photo
// ensuite. C'est le seul endroit du jeu qui dit qui tu es.
// ---------------------------------------------------------------------------
export function rafraichirBoutonCompte() {
  const b = $('compteBtn');
  if (!b) return;
  const p = Compte.profil;
  const dedans = !!(connecte() && p);
  b.classList.toggle('connecte', dedans);
  b.textContent = '';
  // Le bouton porte les couleurs choisies dans la fiche : c'est la signature du
  // joueur, elle doit le suivre partout plutot que rester dans son profil.
  b.style.background = dedans
    ? 'linear-gradient(140deg,' + (p.couleur1 || '#35e0ff') + ',' + (p.couleur2 || '#7b2ff7') + ')'
    : '';
  if (dedans) {
    if (p.avatar) { const i = document.createElement('img'); i.src = p.avatar; b.appendChild(i); }
    b.appendChild(document.createTextNode(p.pseudo || 'MON PROFIL'));
    b.title = 'Voir mon profil';
  } else {
    b.textContent = 'SE CONNECTER';
    b.title = 'Se connecter ou creer un compte';
  }
}

(function cablerBoutonCompte() {
  const b = $('compteBtn');
  if (!b) return;
  b.addEventListener('click', async () => {
    sfx('select');
    // Se connecter n'est pas un mode de jeu : on ouvre une fenetre par-dessus
    // l'ecran courant au lieu d'emmener le joueur ailleurs.
    const { ouvrirPop } = await import('./compte-pop.js');
    ouvrirPop();
  });
  // Une session peut survivre a un rechargement : on va chercher le profil
  // pour afficher le pseudo tout de suite, sans attendre un clic.
  if (connecte()) chargerProfil().then(rafraichirBoutonCompte).catch(() => { });
  rafraichirBoutonCompte();
})();

// Le bouton du haut suit l'etat du compte, quel que soit l'endroit ou il a
// change : la fenetre du haut, ou la fiche de l'ecran en ligne.
import('./compte-pop.js').then(m => m.surCompteChange(rafraichirBoutonCompte));
