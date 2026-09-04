import { $ } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { CHARS } from '../data/characters.js';
import { listeSkins, estDebloque, skinActif, setSkinActif, acheterSkinPerso, COUT_SKIN } from '../data/skins-perso.js';
import { Compte } from '../reseau/compte.js';

// ---------------------------------------------------------------------------
// Panneau de skins. Il s'ouvre en cliquant sur le grand portrait d'un camp et
// se referme au clic à côté ou à Échap. Les skins encore à gagner y restent
// visibles, cadenassées : cliquer dessus tente de les acheter avec les pièces
// du compte, toutes au même prix.
// ---------------------------------------------------------------------------

let campOuvert = null;          // 1 ou 2 quand le panneau est ouvert
let auChangement = null;        // callback fourni par l'écran de sélection

export function brancherSkins(surChangement) { auChangement = surChangement; }
export function panneauSkinsOuvert() { return campOuvert !== null; }

// Dessine un personnage dans un canvas, avec le skin demandé.
export function dessinerAvecSkin(canvasEl, ck, skinId, echelle) {
  const c = CHARS[ck];
  const src = (c.skins && c.skins[skinId] && c.skins[skinId].idle) || c.frames.idle;
  canvasEl.width = src.width * echelle;
  canvasEl.height = src.height * echelle;
  const g = canvasEl.getContext('2d');
  g.clearRect(0, 0, canvasEl.width, canvasEl.height);
  g.imageSmoothingEnabled = false;
  g.drawImage(src, 0, 0, canvasEl.width, canvasEl.height);
}

// auChoix : appelé quand une tenue est retenue. C'est ce qui permet au choix
// du personnage de se conclure sur le choix de sa tenue, au lieu de demander
// deux gestes distincts pour une seule décision.
let auChoix = null;

export function ouvrirPanneauSkins(camp, ck, options) {
  if (options && 'auChoix' in options) auChoix = options.auChoix || null;
  const panneau = $('skinsPanel');
  if (!panneau) return;
  campOuvert = camp;
  const grille = $('skinsGrid');
  grille.innerHTML = '';
  $('skinsTitre').textContent = 'SKINS · ' + CHARS[ck].short;
  const solde = $('skinsSolde');
  if (solde) {
    const p = Compte.profil;
    solde.textContent = p ? ('🪙 ' + (p.pieces || 0)) : '';
  }

  const actif = skinActif(ck);
  const dispos = listeSkins(ck);
  // Personnage sans aucune tenue : on conclut le choix tout de suite plutôt que
  // d'ouvrir un panneau vide. C'est la tuile qui valide le personnage, donc un
  // panneau sans tuile le rendrait injouable — le piège n'est pas théorique, il
  // s'est déclenché à l'arrivée de Cyberleek.
  if (!dispos.length) {
    if (auChoix) { const suite = auChoix; auChoix = null; sfx('select'); suite(ck, null); }
    return;
  }
  for (const s of dispos) {
    const libre = estDebloque(ck, s.id);
    const cell = document.createElement('button');
    cell.className = 'skinTile' + (s.id === actif ? ' on' : '') + (libre ? '' : ' locked');
    const cv = document.createElement('canvas');
    dessinerAvecSkin(cv, ck, s.id, 4);
    cell.appendChild(cv);
    const nom = document.createElement('em');
    nom.textContent = s.nom;
    cell.appendChild(nom);
    if (!libre) {
      const lock = document.createElement('span');
      lock.className = 'skinTileLock';
      lock.innerHTML = '🔒<b>' + COUT_SKIN + '</b>';
      cell.appendChild(lock);
    }
    cell.addEventListener('click', async e => {
      e.stopPropagation();
      if (!libre) {
        sfx('select');
        try {
          await acheterSkinPerso(ck, s.id);
          sfx('full');
          message('🎨 ' + s.nom + ' débloqué pour ' + CHARS[ck].short + ' !', true);
          if (auChangement) auChangement();
          ouvrirPanneauSkins(camp, ck);       // rafraîchit la tuile et le solde
        } catch (err) { sfx('deny'); message('🔒 ' + err.message); }
        return;
      }
      setSkinActif(ck, s.id);
      sfx('select');
      if (auChangement) auChangement();
      // Choisir une tenue vaut choix du personnage : on ferme et on conclut.
      if (auChoix) {
        const suite = auChoix;
        auChoix = null;
        fermerPanneauSkins();
        suite(ck, s.id);
        return;
      }
      ouvrirPanneauSkins(camp, ck);          // rafraîchit la bordure dorée
    });
    grille.appendChild(cell);
  }
  panneau.classList.remove('hidden');
}

export function fermerPanneauSkins() {
  campOuvert = null;
  const p = $('skinsPanel');
  if (p) p.classList.add('hidden');
}

// Bandeau bref en bas d'écran, pour les conditions et les déblocages.
let effacer = null;
function message(texte, dore) {
  const el = $('skinsMsg');
  if (!el) return;
  el.textContent = texte;
  el.classList.remove('hidden', 'dore');
  if (dore) el.classList.add('dore');
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(effacer);
  effacer = setTimeout(() => el.classList.add('hidden'), dore ? 3000 : 2000);
}

// Fermeture au clic à côté ou à Échap.
(function cabler() {
  const p = $('skinsPanel');
  if (p) p.addEventListener('click', e => { if (e.target === p) fermerPanneauSkins(); });
  window.addEventListener('keydown', e => {
    if (campOuvert !== null && e.code === 'Escape') { e.stopPropagation(); fermerPanneauSkins(); }
  }, true);
})();
