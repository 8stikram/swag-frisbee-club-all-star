import { $, curScreen } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import {
  Compte, connecte, inscrire, connecterSe, deconnecter,
  chargerProfil, creerProfil
} from '../reseau/compte.js';
import { crediterEnAttente } from '../data/apprentissage.js';

// ---------------------------------------------------------------------------
// Fenêtre de compte.
//
// Se connecter n'est pas un mode de jeu : ça ne doit donc pas emmener ailleurs.
// La fenêtre se pose par-dessus l'écran où l'on se trouve, et le rend tel qu'il
// était en se refermant — on ne perd pas ce qu'on était en train de faire.
//
// Elle porte les trois moments du compte : se connecter ou s'inscrire, choisir
// son pseudo la première fois, puis se voir une fois connecté.
// ---------------------------------------------------------------------------
const cache = (id, oui) => { const e = $(id); if (e) e.classList.toggle('hidden', !!oui); };
const dire = (t, mauvais) => {
  const e = $('cpEtat'); if (!e) return;
  e.textContent = t || ''; e.classList.toggle('bad', !!mauvais);
};

export function popOuverte() {
  const p = $('comptePop');
  return !!p && !p.classList.contains('hidden');
}

export function fermerPop() {
  const p = $('comptePop'); if (p) p.classList.add('hidden');
}

function montrerEtape(etape) {
  cache('cpForm', etape !== 'form');
  cache('cpPseudoBloc', etape !== 'pseudo');
  cache('cpConnecte', etape !== 'connecte');
  const t = $('cpTitre'), a = $('cpAide');
  if (etape === 'form') {
    t.textContent = 'SE CONNECTER';
    a.textContent = 'Ton compte sert au classement et a ton profil en ligne.';
  } else if (etape === 'pseudo') {
    t.textContent = 'CHOISIS TON PSEUDO';
    a.textContent = 'Deux a seize caracteres, et il doit etre libre.';
  } else {
    t.textContent = 'MON COMPTE';
    a.textContent = '';
  }
}

function afficherMoi() {
  const p = Compte.profil;
  const img = $('cpAvatar');
  if (p && p.avatar) { img.src = p.avatar; img.classList.remove('hidden'); }
  else img.classList.add('hidden');
  $('cpPseudoAff').textContent = (p && p.pseudo) || '';
}

export async function ouvrirPop() {
  const p = $('comptePop');
  if (!p) return;
  p.classList.remove('hidden');
  dire('');
  if (!connecte()) { montrerEtape('form'); return; }
  dire('chargement...');
  try {
    const prof = await chargerProfil();
    if (!prof) { montrerEtape('pseudo'); dire('il te manque un pseudo.'); return; }
    montrerEtape('connecte'); afficherMoi(); dire('');
  } catch (e) { montrerEtape('form'); dire(e.message, true); }
}

// Prévenir le reste de l'interface qu'on vient de changer d'état, sans que ce
// fichier ait à connaître qui que ce soit.
let auChangement = null;
export function surCompteChange(fn) { auChangement = fn; }
const signaler = () => { if (auChangement) auChangement(); };

(function cabler() {
  const pop = $('comptePop');
  if (!pop) return;

  $('cpConnexion').addEventListener('click', async () => {
    const e = $('cpEmail').value.trim(), m = $('cpMdp').value;
    if (!e || !m) { dire('adresse et mot de passe, s il te plait.', true); return; }
    dire('connexion...');
    try {
      await connecterSe(e, m);
      $('cpMdp').value = '';
      signaler();
      crediterEnAttente();
      if (!Compte.profil) { montrerEtape('pseudo'); dire('choisis ton pseudo.'); }
      else { montrerEtape('connecte'); afficherMoi(); dire('te voila connecte.'); }
    } catch (err) { dire(err.message, true); }
  });

  $('cpInscription').addEventListener('click', async () => {
    const e = $('cpEmail').value.trim(), m = $('cpMdp').value;
    if (!e || m.length < 6) { dire('adresse valide et mot de passe d au moins 6 caracteres.', true); return; }
    dire('creation du compte...');
    try {
      const s = await inscrire(e, m);
      $('cpMdp').value = '';
      signaler();
      // Selon le reglage du projet, le compte peut demander une confirmation
      // par mail avant de servir.
      if (s && s.access_token) { montrerEtape('pseudo'); dire('compte cree - choisis ton pseudo.'); }
      else dire('compte cree : confirme le mail recu, puis connecte-toi.');
    } catch (err) { dire(err.message, true); }
  });

  $('cpValiderPseudo').addEventListener('click', async () => {
    const v = $('cpPseudo').value.trim();
    if (v.length < 2) { dire('deux caracteres minimum.', true); return; }
    dire('enregistrement...');
    try {
      await creerProfil(v);
      signaler();
      montrerEtape('connecte'); afficherMoi(); dire('bienvenue.');
    } catch (err) {
      dire(/duplicate|unique/i.test(err.message) ? 'ce pseudo est deja pris.' : err.message, true);
    }
  });

  $('cpDeconnexion').addEventListener('click', () => {
    deconnecter(); signaler(); sfx('deny');
    montrerEtape('form'); dire('deconnecte.');
  });

  $('cpVoirProfil').addEventListener('click', async () => {
    sfx('select'); fermerPop();
    const { doAct } = await import('./menus.js');
    const { ouvrirProfil } = await import('./profil-ui.js');
    doAct('online'); ouvrirProfil();
  });

  // Fermeture au clic à côté de la carte, et à Échap. En capture pour passer
  // avant les raccourcis du jeu, qui sinon ouvriraient la pause par-dessus.
  pop.addEventListener('click', e => { if (e.target === pop) fermerPop(); });
  window.addEventListener('keydown', e => {
    if (popOuverte() && e.code === 'Escape') {
      e.preventDefault(); e.stopPropagation(); fermerPop();
    }
  }, true);
  void curScreen;
})();
