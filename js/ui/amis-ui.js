import { $ } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import {
  connecte, monId, mesAmis, demanderAmi, accepterAmi, retirerAmi,
  chercherPseudo, inviter, retirerInvitation
} from '../reseau/compte.js';
import { montrerPanneau } from './profil-ui.js';

// ---------------------------------------------------------------------------
// Liste d'amis.
//
// L'ordre n'est pas anodin : ce qui appelle une decision passe en premier —
// les demandes recues, puis les invitations a jouer, puis les amis, en ligne
// en tete. Une liste rangee par ordre alphabetique obligerait a la parcourir
// entierement pour savoir s'il s'y passe quelque chose.
// ---------------------------------------------------------------------------
const dire = (t, mauvais) => {
  const e = $('onEtat'); if (!e) return;
  e.textContent = t || ''; e.classList.toggle('bad', !!mauvais);
};

function bouton(texte, classe, action) {
  const b = document.createElement('button');
  b.className = 'mbtn mini' + (classe ? ' ' + classe : '');
  b.textContent = texte;
  b.addEventListener('click', e => { e.stopPropagation(); action(b); });
  return b;
}

function ligne(a, options = {}) {
  const d = document.createElement('div');
  d.className = 'amiLigne' + (options.attente ? ' attente' : '');

  const past = document.createElement('span');
  past.className = 'amiPastille' + (a.en_ligne ? ' enligne' : '');
  past.title = a.en_ligne ? 'En ligne' : 'Hors ligne';
  d.appendChild(past);

  const ph = document.createElement('img');
  ph.className = 'amiPhoto';
  if (a.avatar) ph.src = a.avatar;
  d.appendChild(ph);

  const nom = document.createElement('span');
  nom.textContent = a.pseudo || '';
  d.appendChild(nom);

  const bilan = document.createElement('span');
  bilan.className = 'amiBilan';
  // Le face-a-face ne s'affiche que s'il y a eu des matchs : « 0 - 0 » ne dit
  // rien et occupe la place de ce qui compte.
  const v = Number(a.victoires || 0), p = Number(a.defaites || 0);
  bilan.textContent = (v + p) ? (v + 'V - ' + p + 'D') : '';
  d.appendChild(bilan);

  const actions = document.createElement('span');
  for (const b of options.boutons || []) actions.appendChild(b);
  d.appendChild(actions);
  return d;
}

export async function afficherAmis() {
  montrerPanneau('onEtapeAmis');
  if (!connecte()) { dire('connecte-toi pour avoir des amis.', true); return; }
  dire('chargement...');
  try {
    const tous = await mesAmis();
    const dem = $('amiDemandes'), lst = $('amiListe'), res = $('amiResultats');
    dem.innerHTML = ''; lst.innerHTML = ''; res.innerHTML = '';

    // Demandes recues : celles qu'on n'a pas envoyees et qui attendent.
    for (const a of tous.filter(x => x.etat === 'attente' && !x.je_demande)) {
      dem.appendChild(ligne(a, {
        attente: true,
        boutons: [
          bouton('ACCEPTER', 'c-green', async () => {
            try { await accepterAmi(a.id); sfx('select'); afficherAmis(); }
            catch (e) { dire(e.message, true); }
          }),
          bouton('REFUSER', '', async () => {
            try { await retirerAmi(a.id); sfx('deny'); afficherAmis(); }
            catch (e) { dire(e.message, true); }
          })
        ]
      }));
    }

    for (const a of tous.filter(x => x.etat === 'accepte')) {
      const btns = [];
      // Une invitation recue passe avant tout : c'est une porte ouverte qui
      // n'attend qu'un clic.
      if (a.invitation) {
        btns.push(bouton('REJOINDRE ' + a.invitation, 'c-green', async () => {
          const { rejoindreDepuisAmi } = await import('./online-ui.js');
          await retirerInvitation(a.id);
          rejoindreDepuisAmi(a.invitation);
        }));
      } else {
        btns.push(bouton('INVITER', '', async () => {
          const { inviterAmi } = await import('./online-ui.js');
          inviterAmi(a.id, a.pseudo);
        }));
      }
      btns.push(bouton('RETIRER', '', async () => {
        try { await retirerAmi(a.id); sfx('deny'); afficherAmis(); }
        catch (e) { dire(e.message, true); }
      }));
      lst.appendChild(ligne(a, { boutons: btns }));
    }

    // Demandes envoyees, en bas : elles ne demandent rien, elles informent.
    for (const a of tous.filter(x => x.etat === 'attente' && x.je_demande)) {
      const l = ligne(a, { boutons: [bouton('ANNULER', '', async () => {
        try { await retirerAmi(a.id); afficherAmis(); } catch (e) { dire(e.message, true); }
      })] });
      l.querySelector('.amiBilan').textContent = 'demande envoyee';
      lst.appendChild(l);
    }

    dire(tous.length ? '' : 'personne pour l instant — cherche un pseudo.');
  } catch (e) { dire(e.message, true); }
}

(function cabler() {
  if (!$('onAmis')) return;
  $('onAmis').addEventListener('click', () => { sfx('select'); afficherAmis(); });

  const chercher = async () => {
    const q = ($('amiRecherche').value || '').trim();
    if (q.length < 2) { dire('deux caracteres minimum.', true); return; }
    dire('recherche...');
    try {
      const r = await chercherPseudo(q);
      const res = $('amiResultats');
      res.innerHTML = '';
      const moi = monId();
      const trouves = (r || []).filter(x => x.id !== moi);
      for (const a of trouves) {
        res.appendChild(ligne(a, {
          boutons: [bouton('AJOUTER', 'c-green', async () => {
            try { await demanderAmi(a.id); sfx('select'); dire('demande envoyee a ' + a.pseudo + '.'); afficherAmis(); }
            catch (e) { dire(/duplicate|unique/i.test(e.message) ? 'demande deja envoyee.' : e.message, true); }
          })]
        }));
      }
      dire(trouves.length ? '' : 'aucun joueur sous ce pseudo.');
    } catch (e) { dire(e.message, true); }
  };

  $('amiChercher').addEventListener('click', chercher);
  $('amiRecherche').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') chercher();
  });
})();
