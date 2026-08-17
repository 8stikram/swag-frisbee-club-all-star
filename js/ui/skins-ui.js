import { $ } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { CHARS } from '../data/characters.js';
import { listeSkins, estDebloque, skinActif, setSkinActif } from '../data/skins-perso.js';

// ---------------------------------------------------------------------------
// Panneau de skins. Il s'ouvre en cliquant sur le grand portrait d'un camp et
// se referme au clic à côté ou à Échap. Les skins encore à gagner y restent
// visibles, cadenassés, avec leur condition — les cacher ne donnerait aucune
// raison de les viser.
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

export function ouvrirPanneauSkins(camp, ck) {
  const panneau = $('skinsPanel');
  if (!panneau) return;
  campOuvert = camp;
  const grille = $('skinsGrid');
  grille.innerHTML = '';
  $('skinsTitre').textContent = 'SKINS · ' + CHARS[ck].short;

  const actif = skinActif(ck);
  for (const s of listeSkins(ck)) {
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
      lock.className = 'skinTileLock'; lock.textContent = '🔒';
      cell.appendChild(lock);
    }
    cell.addEventListener('click', e => {
      e.stopPropagation();
      if (!libre) { sfx('deny'); message('🔒 ' + s.nom + ' — ' + s.texte); return; }
      setSkinActif(ck, s.id);
      sfx('select');
      if (auChangement) auChangement();
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

// Appelé à la fin d'un match quand des skins viennent d'être gagnés.
export function annoncerSkins(ck, gagnes) {
  if (!gagnes || !gagnes.length) return;
  const nom = CHARS[ck] ? CHARS[ck].short : ck;
  message('🎨 SKIN DÉBLOQUÉ ! ' + gagnes.map(s => s.nom).join(' · ') + ' pour ' + nom, true);
  sfx('full');
}

// Fermeture au clic à côté ou à Échap.
(function cabler() {
  const p = $('skinsPanel');
  if (p) p.addEventListener('click', e => { if (e.target === p) fermerPanneauSkins(); });
  window.addEventListener('keydown', e => {
    if (campOuvert !== null && e.code === 'Escape') { e.stopPropagation(); fermerPanneauSkins(); }
  }, true);
})();
