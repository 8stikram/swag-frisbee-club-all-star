import { $ } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { CHARS } from '../data/characters.js';
import {
  Compte, connecte, inscrire, connecterSe, deconnecter, chargerProfil,
  creerProfil, majProfil, envoyerAvatar, classement, podiumPersos,
  profilPublic, derniersMatchs, catalogueTitres, mesTitres, envoyerBanniere,
  demarrerPresence, monId, lireCommentaires, ecrireCommentaire, supprimerCommentaire,
  pousserPreferences, dureeMoyenne
} from '../reseau/compte.js';

// ---------------------------------------------------------------------------
// Compte, fiche de profil et classement. Trois panneaux qui vivent dans
// l'écran du mode en ligne, dans le même bleu pastel que le reste.
// ---------------------------------------------------------------------------
const PANNEAUX = ['onChoix', 'onChoixArene', 'onEtapeHote', 'onEtapeInvite', 'onEtapeCompte', 'onEtapeAmis',
  'onEtapePseudo', 'onEtapeFiche', 'onEtapeClassement'];

export function montrerPanneau(id) {
  for (const p of PANNEAUX) { const e = $(p); if (e) e.classList.toggle('hidden', p !== id); }
  // Les listes portent deja leur propre RETOUR : le gros bouton du bas ferait
  // doublon. Il ne sert qu'aux panneaux, qui n'en ont pas.
  const liste = id === 'onChoix' || id === 'onChoixArene';
  const r = document.querySelector('.onRetour');
  if (r) r.classList.toggle('hidden', liste);
  // Hors des listes, le titre et son decor remontent en retrecissant : ils
  // resteraient sinon plantes derriere le panneau qu'on vient d'ouvrir.
  const ecran = $('scr-online');
  if (ecran) ecran.classList.toggle('panneau', !liste);
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

  // Le texte du profil peut passer en noir : sur un dégradé clair, le blanc
  // devient illisible, et c'est le propriétaire qui sait ce qu'il a choisi.
  carte.classList.toggle('sombre', !!p.texte_sombre);
  // Les quatre chiffres et le main sont posés par afficherStats, appelé juste
  // après : la durée moyenne demande une requête de plus.
  afficherStats(p, 0);

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
  const b = document.createElement('b'); b.textContent = j ? j.pseudo : '-';
  if (j) {
    // Le pseudo mene au profil : c'est le geste qu'on tente naturellement.
    b.style.cursor = 'pointer'; b.title = 'Voir le profil';
    b.addEventListener('click', () => { sfx('select'); voirProfil(j.id); });
  }
  d.appendChild(b);
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
      c[1].style.cursor = 'pointer'; c[1].title = 'Voir le profil';
      c[1].addEventListener('click', () => { sfx('select'); voirProfil(j.id); });
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
    // Le reste vient de la vue publique : c'est exactement ce que les autres
    // verront, donc on l'affiche a son proprietaire tel quel.
    const pub = await profilPublic(monId());
    const rec = await derniersMatchs(monId(), 3).catch(() => []);
    if (pub) { afficherEnrichi(pub, rec); afficherStats(pub, await dureeMoyenne(monId())); }
    setProfilVu(monId());
    for (const sel of ['#onEditer', '#onDeconnexion', '.ficheChangeBan']) {
      const e = document.querySelector(sel);
      if (e) e.classList.remove('hidden');
    }
    chargerMur(monId());
    demarrerPresence();
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
  // Même réglage pour la pastille du haut : elle porte le dégradé, donc elle a
  // le même problème de lisibilité sur les couleurs claires.
  b.classList.toggle('sombre', dedans && !!p.texte_sombre);
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

// ---------------------------------------------------------------------------
// Profil enrichi : banniere, pastille de presence, titre, statut, main et
// trois derniers matchs. Tout est public : c'est une page qu'on montre.
// ---------------------------------------------------------------------------
function quand(iso) {
  if (!iso) return '';
  const d = new Date(iso), maintenant = Date.now();
  const min = Math.round((maintenant - d.getTime()) / 60000);
  if (min < 1) return 'a l instant';
  if (min < 60) return 'il y a ' + min + ' min';
  const h = Math.round(min / 60);
  if (h < 24) return 'il y a ' + h + ' h';
  const j = Math.round(h / 24);
  if (j < 30) return 'il y a ' + j + ' j';
  return d.toLocaleDateString('fr-FR');
}

export function afficherEnrichi(p, recents) {
  // Banniere : l'image si elle existe, sinon le degrade du joueur suffit.
  const ban = $('ficheBanniere');
  if (ban) ban.style.backgroundImage = p.banniere ? ('url(' + p.banniere + ')') : 'none';

  // Pastille : verte si le joueur s'est manifeste il y a moins de deux minutes.
  const past = $('fichePastille');
  if (past) {
    const vu = p.vu_le ? new Date(p.vu_le).getTime() : 0;
    const ici = p.en_ligne !== undefined ? p.en_ligne : (Date.now() - vu < 120000);
    past.classList.toggle('enligne', !!ici);
    past.title = ici ? 'En ligne' : ('Vu ' + quand(p.vu_le));
  }

  const t = $('ficheTitre'); if (t) t.textContent = p.titre_actif || '';
  const s = $('ficheStatut'); if (s) s.textContent = p.statut || '';

  // Le personnage principal, dessine avec son vrai sprite.
  const mn = $('ficheMain');
  if (mn) {
    mn.innerHTML = '';
    if (p.main && CHARS[p.main]) {
      mn.appendChild(dessinerPerso(p.main));
      const e = document.createElement('span');
      e.textContent = 'MAIN : ' + CHARS[p.main].short;
      mn.appendChild(e);
    }
  }

  // Les trois derniers matchs : adversaire, score, quand.
  const r = $('ficheRecents');
  if (!r) return;
  r.innerHTML = '';
  if (!recents || !recents.length) return;
  for (const m of recents) {
    const d = document.createElement('div'); d.className = 'ficheRecent';
    const iss = document.createElement('span');
    iss.className = 'issue ' + (m.gagne ? 'v' : 'd');
    iss.textContent = m.gagne ? 'V' : 'D';
    const adv = document.createElement('span');
    adv.textContent = m.adversaire_pseudo || 'inconnu';
    const sc = document.createElement('span');
    sc.textContent = m.score_joueur + ' - ' + m.score_adversaire;
    const qd = document.createElement('span');
    qd.className = 'quand'; qd.textContent = quand(m.joue_le);
    d.append(iss, adv, sc, qd);
    r.appendChild(d);
  }
}

// --- Reglages du profil ----------------------------------------------------
// Remplir les listes deroulantes demande d'aller chercher le catalogue des
// titres : on ne le fait qu'une fois, a la premiere ouverture.
let titresCharges = false;

async function remplirReglages(p) {
  const st = $('onStatut'); if (st) st.value = p.statut || '';
  const ts = $('onTexteSombre'); if (ts) ts.checked = !!p.texte_sombre;

  const mc = $('onMainChoix');
  if (mc && !mc.options.length) {
    const vide = document.createElement('option');
    vide.value = ''; vide.textContent = '— aucun —';
    mc.appendChild(vide);
    for (const ck of Object.keys(CHARS)) {
      const o = document.createElement('option');
      o.value = ck; o.textContent = CHARS[ck].short || ck;
      mc.appendChild(o);
    }
  }
  if (mc) mc.value = p.main || '';

  const tc = $('onTitreChoix');
  if (tc && !titresCharges) {
    titresCharges = true;
    try {
      const [cat, miens] = await Promise.all([catalogueTitres(), mesTitres()]);
      tc.innerHTML = '';
      const vide = document.createElement('option');
      vide.value = ''; vide.textContent = '— aucun —';
      tc.appendChild(vide);
      for (const t of cat) {
        const o = document.createElement('option');
        const eu = miens.includes(t.id);
        o.value = t.libelle;
        // Un titre non gagne reste visible mais barre : cacher ce qu'on peut
        // obtenir n'a jamais donne envie de l'obtenir.
        o.textContent = eu ? t.libelle : (t.libelle + ' (' + t.condition + ')');
        o.disabled = !eu;
        tc.appendChild(o);
      }
    } catch (e) { titresCharges = false; }
  }
  if (tc) tc.value = p.titre_actif || '';
}

(function cablerProfilEnrichi() {
  if (!$('onEditer')) return;

  $('onEditer').addEventListener('click', async () => {
    sfx('select');
    const r = $('ficheReglages');
    const ouvre = r.classList.contains('hidden');
    r.classList.toggle('hidden', !ouvre);
    if (ouvre) await remplirReglages(Compte.profil || {});
  });

  $('onEnregistrer').addEventListener('click', async () => {
    dire('enregistrement...');
    try {
      await majProfil({
        statut: $('onStatut').value.trim() || null,
        titre_actif: $('onTitreChoix').value || null,
        main: $('onMainChoix').value || null,
        texte_sombre: $('onTexteSombre').checked
      });
      await ouvrirProfil();
      $('ficheReglages').classList.add('hidden');
      dire('profil mis a jour.');
    } catch (e) { dire(e.message, true); }
  });

  $('onBanniere').addEventListener('change', async ev => {
    const f = ev.target.files && ev.target.files[0];
    if (!f) return;
    const { cadrer } = await import('./cadrage.js');
    // La banniere est large et basse : on lui donne ses vraies proportions,
    // sinon on cadre a l'aveugle et le sujet se retrouve coupe.
    const cadre = await cadrer(f, { forme: 'rect', taille: 1024, hauteur: 288 });
    ev.target.value = '';
    if (!cadre) return;
    dire('envoi de la banniere...');
    try { await envoyerBanniere(cadre); await ouvrirProfil(); dire('banniere mise a jour.'); }
    catch (e) { dire(e.message, true); }
  });
})();

// ---------------------------------------------------------------------------
// Mur de commentaires. Un profil est une page qu'on visite : on doit pouvoir
// y laisser un mot, et repondre a celui d'un autre.
// ---------------------------------------------------------------------------
// Le profil actuellement affiche. Le sien par defaut, celui d'un autre quand
// on vient de la liste d'amis ou du classement.
export let profilVu = null;
export function setProfilVu(v) { profilVu = v; }
let repondA = null;

function motDe(c, profilId) {
  const d = document.createElement('div');
  d.className = 'murMot' + (c.parent ? ' reponse' : '');
  const auteur = c.profils || {};

  const ph = document.createElement('img');
  ph.className = 'murPhoto';
  if (auteur.avatar) ph.src = auteur.avatar;
  d.appendChild(ph);

  const corps = document.createElement('div');
  corps.className = 'murCorps';
  const qui = document.createElement('span');
  qui.className = 'murQui'; qui.textContent = auteur.pseudo || 'inconnu';
  const txt = document.createElement('span');
  txt.className = 'murTexte'; txt.textContent = c.texte;
  const qd = document.createElement('span');
  qd.className = 'murQuand'; qd.textContent = quand(c.ecrit_le);
  corps.append(qui, txt, qd);
  d.appendChild(corps);

  const act = document.createElement('div');
  act.className = 'murActions';
  // Repondre : une seule fois, pas de reponse a une reponse. Deux niveaux
  // suffisent a une conversation, dix la rendent illisible.
  if (connecte() && !c.parent) {
    const r = document.createElement('button');
    r.textContent = 'repondre';
    r.addEventListener('click', () => {
      repondA = c.id;
      const champ = $('murTexte');
      champ.placeholder = 'reponse a ' + (auteur.pseudo || 'ce mot');
      champ.focus();
    });
    act.appendChild(r);
  }
  // L'auteur peut retirer le sien, et le proprietaire du mur ce qu'on a
  // ecrit chez lui : subir n'importe quoi sur sa page sans recours n'est pas
  // une absence de moderation, c'est une absence de porte.
  if (connecte() && (c.auteur === monId() || profilId === monId())) {
    const s = document.createElement('button');
    s.textContent = 'retirer';
    s.addEventListener('click', async () => {
      try { await supprimerCommentaire(c.id); sfx('deny'); chargerMur(profilId); }
      catch (e) { dire(e.message, true); }
    });
    act.appendChild(s);
  }
  d.appendChild(act);
  return d;
}

export async function chargerMur(profilId) {
  const liste = $('murListe');
  if (!liste) return;
  liste.innerHTML = '';
  try {
    const mots = await lireCommentaires(profilId);
    if (!mots.length) {
      const v = document.createElement('div');
      v.className = 'murVide';
      v.textContent = 'aucun mot pour l instant.';
      liste.appendChild(v);
      return;
    }
    // Les reponses se rangent sous leur mot, pas a la suite : une conversation
    // eclatee dans l'ordre chronologique ne se suit pas.
    const racines = mots.filter(m => !m.parent);
    for (const r of racines) {
      liste.appendChild(motDe(r, profilId));
      for (const rep of mots.filter(m => m.parent === r.id)) {
        liste.appendChild(motDe(rep, profilId));
      }
    }
  } catch (e) { dire('commentaires indisponibles : ' + e.message, true); }
}

// Ouvre le profil de quelqu'un d'autre : meme fiche, mais on n'y modifie rien.
export async function voirProfil(id) {
  if (!id) return;
  montrerPanneau('onEtapeFiche');
  dire('chargement du profil...');
  try {
    const p = await profilPublic(id);
    if (!p) { dire('profil introuvable.', true); return; }
    setProfilVu(id);
    const soi = id === monId();
    // Les commandes de modification n'ont aucun sens sur la page d'un autre.
    for (const sel of ['#onEditer', '#onDeconnexion', '.ficheChangeBan']) {
      const e = document.querySelector(sel);
      if (e) e.classList.toggle('hidden', !soi);
    }
    const carte = $('ficheCarte');
    carte.style.setProperty('--c1', p.couleur1 || '#35e0ff');
    carte.style.setProperty('--c2', p.couleur2 || '#7b2ff7');
    $('fichePseudo').textContent = p.pseudo || '';
    const img = $('ficheAvatar'), vide = $('ficheAvatarVide');
    if (p.avatar) { img.src = p.avatar; img.classList.remove('hidden'); vide.classList.add('hidden'); }
    else { img.classList.add('hidden'); vide.classList.remove('hidden'); }
    const diff = (p.points_marques || 0) - (p.points_encaisses || 0);
    const taux = p.matchs ? Math.round((p.victoires || 0) / p.matchs * 100) : 0;
    $('ficheStats').innerHTML = [
      [p.matchs || 0, 'matchs'], [p.victoires || 0, 'victoires'], [taux + '%', 'de reussite'],
      [p.points_marques || 0, 'points mis'], [p.points_encaisses || 0, 'encaisses'],
      [(diff >= 0 ? '+' : '') + diff, 'difference']
    ].map(([v, l]) => '<div class="ficheStat"><b>' + v + '</b><span>' + l + '</span></div>').join('');
    const pod = $('fichePodium'); pod.innerHTML = '';
    for (const { ck, n } of podiumPersos(p)) {
      const d = document.createElement('div'); d.className = 'fichePerso';
      d.appendChild(dessinerPerso(ck));
      const e = document.createElement('em');
      e.textContent = ((CHARS[ck] && CHARS[ck].short) || ck) + ' - ' + n;
      d.appendChild(e); pod.appendChild(d);
    }
    afficherEnrichi(p, await derniersMatchs(id, 3).catch(() => []));
    carte.classList.toggle('sombre', !!p.texte_sombre);
    afficherStats(p, await dureeMoyenne(id));
    await chargerMur(id);
    dire('');
  } catch (e) { dire(e.message, true); }
}

(function cablerMur() {
  const b = $('murEnvoyer');
  if (!b) return;
  const envoyer = async () => {
    const champ = $('murTexte');
    const cible = profilVu || monId();
    if (!connecte()) { dire('connecte-toi pour ecrire.', true); return; }
    try {
      await ecrireCommentaire(cible, champ.value, repondA);
      champ.value = ''; champ.placeholder = 'laisser un mot'; repondA = null;
      sfx('select');
      chargerMur(cible);
    } catch (e) { dire(e.message, true); }
  };
  b.addEventListener('click', envoyer);
  $('murTexte').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') envoyer();
  });
})();

// Les reglages du jeu suivent le compte. On pousse a chaque fermeture des
// options : c'est le moment ou l'on vient de changer quelque chose.
(function cablerPreferences() {
  const pousser = () => { if (connecte()) pousserPreferences().catch(() => { }); };
  // Options fermees, ou onglet quitte : deux moments ou l'on a fini de regler.
  document.addEventListener('visibilitychange', () => { if (document.hidden) pousser(); });
  window.addEventListener('beforeunload', pousser);
  const b = document.querySelector('.scr-options [data-act="back"]');
  if (b) b.addEventListener('click', pousser);
})();

// ---------------------------------------------------------------------------
// Les quatre chiffres qui comptent, et le main a cote.
//
// Quatre plutot que six : un profil se lit d'un coup d'oeil, et six cases en
// deux rangees de trois se parcourent au lieu de se voir. Ce sont des rapports
// et non des totaux — « 240 points marques » ne dit rien sans savoir en combien
// de matchs.
// ---------------------------------------------------------------------------
function dureeLisible(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60), r = Math.round(s % 60);
  return m ? (m + 'm' + (r ? String(r).padStart(2, '0') : '')) : (r + 's');
}

export function afficherStats(p, moyenne) {
  const zone = $('ficheStats');
  if (!zone) return;
  const taux = p.matchs ? Math.round((p.victoires || 0) / p.matchs * 100) : 0;
  const mis = p.points_marques || 0, pris = p.points_encaisses || 0;
  // Un ratio se lit mieux que deux totaux : au-dessus de 1, on marque plus
  // qu'on n'encaisse, et c'est tout ce qu'on veut savoir.
  const ratio = pris ? (mis / pris).toFixed(2) : (mis ? '∞' : '—');
  const cases = [
    [p.matchs || 0, 'matchs joues'],
    [taux + '%', 'de victoires'],
    [ratio, 'buts mis / pris'],
    [dureeLisible(moyenne), 'duree moyenne']
  ];
  zone.innerHTML = '';
  for (const [v, l] of cases) {
    const d = document.createElement('div'); d.className = 'ficheStat';
    const b = document.createElement('b'); b.textContent = v;
    const s = document.createElement('span'); s.textContent = l;
    d.append(b, s); zone.appendChild(d);
  }

  // Le main, en grand, a cote des chiffres.
  const mn = $('ficheMainGrand');
  if (!mn) return;
  mn.innerHTML = '';
  if (p.main && CHARS[p.main]) {
    const cv = dessinerPerso(p.main);
    const nom = document.createElement('b');
    nom.textContent = CHARS[p.main].short;
    const tag = document.createElement('span');
    tag.textContent = 'MAIN';
    mn.append(tag, cv, nom);
  }
}
