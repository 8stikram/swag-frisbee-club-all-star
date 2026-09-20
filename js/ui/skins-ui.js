import { $ } from '../core/dom.js';
import { sfx } from '../audio/audio.js';
import { CHARS } from '../data/characters.js';
import { tenuesSeules, chromasDe, rareteTenue, estDebloque, skinActif, setSkinActif,
  acheterSkinPerso, coutSkin, estFavorite, basculerFavorite } from '../data/skins-perso.js';
import { Compte } from '../reseau/compte.js';

// ---------------------------------------------------------------------------
// Panneau de skins. Il s'ouvre en cliquant sur le grand portrait d'un camp et
// se referme au clic à côté ou à Échap. Les skins encore à gagner y restent
// visibles, cadenassées : cliquer dessus tente de les acheter avec les pièces
// du compte.
//
// La grille ne montre que les TENUES — l'originale et les skins redessinés.
// Les CHROMAS, qui ne changent que les couleurs, sont une rangée de pastilles
// sous la grille : dix tuiles presque identiques pour Yoshi ne se lisaient pas.
// Leur couleur est lue sur le sprite, donc un chroma ajouté demain a sa
// pastille sans qu'on écrive quoi que ce soit de plus.
//
// Habillage : css/skins-panneau.css.
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
  // La rangée de couleurs est VOISINE de la grille, pas dedans : vider la
  // grille ne l'efface pas, et elle survivait au perso suivant.
  panneau.querySelectorAll('.skinChromas').forEach(e => e.remove());
  $('skinsTitre').textContent = 'SKINS · ' + CHARS[ck].short;
  const solde = $('skinsSolde');
  if (solde) {
    const p = Compte.profil;
    solde.textContent = p ? ('🪙 ' + (p.pieces || 0)) : '';
  }

  const actif = skinActif(ck);
  const dispos = tenuesSeules(ck);
  // Personnage sans aucune tenue : on conclut le choix tout de suite plutôt que
  // d'ouvrir un panneau vide. C'est la tuile qui valide le personnage, donc un
  // panneau sans tuile le rendrait injouable — le piège n'est pas théorique, il
  // s'est déclenché à l'arrivée de Cyberleek.
  if (!dispos.length) {
    if (auChoix) { const suite = auChoix; auChoix = null; sfx('select'); suite(ck, null); }
    return;
  }
  // Une tenue choisie vaut choix du personnage : on ferme et on conclut. Une
  // tenue verrouillée tente l'achat, au prix affiché.
  async function choisir(s, quoi) {
    if (!estDebloque(ck, s.id)) {
      sfx('select');
      try {
        await acheterSkinPerso(ck, s.id);
        sfx('full');
        message('🎨 ' + s.nom + ' débloqué pour ' + CHARS[ck].short + ' !', true);
        if (auChangement) auChangement();
        ouvrirPanneauSkins(camp, ck);        // rafraîchit la tuile et le solde
      } catch (err) { sfx('deny'); message('🔒 ' + err.message); }
      return;
    }
    setSkinActif(ck, s.id);
    sfx('select');
    if (auChangement) auChangement();
    if (auChoix) {
      const suite = auChoix;
      auChoix = null;
      fermerPanneauSkins();
      suite(ck, s.id);
      return;
    }
    ouvrirPanneauSkins(camp, ck);            // rafraîchit la bordure dorée
  }
  // L'étoile marque, elle ne choisit pas : elle ne doit donc ni valider le
  // personnage ni fermer le panneau.
  function etoile(hote, s) {
    const e = document.createElement('span');
    e.className = 'skinFav' + (estFavorite(ck, s.id) ? ' on' : '');
    e.textContent = '★';
    e.title = 'Favori';
    e.addEventListener('click', ev => {
      ev.stopPropagation();
      e.classList.toggle('on', basculerFavorite(ck, s.id));
      sfx('move');
    });
    hote.appendChild(e);
  }

  for (const s of dispos) {
    const libre = estDebloque(ck, s.id);
    const cell = document.createElement('button');
    cell.className = 'skinTile r-' + rareteTenue(ck, s.id) + (s.id === actif ? ' on' : '') + (libre ? '' : ' locked');
    const cv = document.createElement('canvas');
    dessinerAvecSkin(cv, ck, s.id, 4);
    cell.appendChild(cv);
    const nom = document.createElement('em');
    nom.textContent = s.nom;
    cell.appendChild(nom);
    const bande = document.createElement('i');
    bande.className = 'skinBande';
    cell.appendChild(bande);
    if (libre) etoile(cell, s);
    else {
      const lock = document.createElement('span');
      // Le prix affiché est celui de CETTE tenue : l'annoncer après le clic
      // aurait été une surprise, pas une information.
      lock.className = 'skinTileLock';
      lock.innerHTML = '🔒<b>' + coutSkin(ck, s.id) + '</b>';
      lock.title = 'Tenue complète';
      cell.appendChild(lock);
    }
    cell.addEventListener('click', e => { e.stopPropagation(); choisir(s); });
    grille.appendChild(cell);
  }

  // --- Les chromas, en pastilles sous la grille ---
  const chromas = chromasDe(ck);
  if (chromas.length) {
    const rangee = document.createElement('div');
    rangee.className = 'skinChromas';
    const titre = document.createElement('span');
    titre.className = 'skinChromasTitre';
    titre.textContent = 'COULEURS';
    rangee.appendChild(titre);
    const base = dispos.find(s => s.defaut) || dispos[0];
    for (const s of [base, ...chromas]) {
      const libre = estDebloque(ck, s.id);
      const p = document.createElement('button');
      p.className = 'skinPastille' + (s.id === actif ? ' on' : '') + (libre ? '' : ' locked');
      p.style.setProperty('--c', couleurPastille(ck, s.id, base.id));
      p.title = s.nom + (libre ? '' : ' — ' + coutSkin(ck, s.id) + ' pièces');
      p.innerHTML = '<i></i>';
      if (libre) etoile(p, s);
      else {
        const l = document.createElement('span');
        l.className = 'skinPastilleLock'; l.textContent = '🔒';
        p.appendChild(l);
        const prix = document.createElement('span');
        prix.className = 'skinPastillePrix'; prix.textContent = coutSkin(ck, s.id);
        p.appendChild(prix);
      }
      p.addEventListener('click', e => { e.stopPropagation(); choisir(s); });
      rangee.appendChild(p);
    }
    grille.after(rangee);
  }
  panneau.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// La couleur d'une pastille : celle qui change le plus entre la tenue
// d'origine et ce chroma, lue sur le sprite. Déclarer la couleur à la main
// aurait voulu dire y penser à chaque chroma ajouté — et se tromper un jour.
// Le premier passage ignore les pixels très sombres (contours et ombres) ;
// s'il ne reste rien, c'est que le chroma EST sombre (Yoshi noir), et le
// second passage les accepte.
// ---------------------------------------------------------------------------
const couleursChroma = new Map();
function couleurPastille(ck, id, baseId) {
  const cle = ck + ':' + id;
  if (couleursChroma.has(cle)) return couleursChroma.get(cle);
  const c = CHARS[ck];
  const img = s => (c.skins && c.skins[s] && c.skins[s].idle) || c.frames.idle;
  const a = img(id), b = id === baseId ? img((chromasDe(ck)[0] || {}).id) : img(baseId);
  let couleur = '#9aa0ac';
  try {
    const w = a.width, h = a.height;
    const lire = im => {
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0);
      return g.getImageData(0, 0, w, h).data;
    };
    const da = lire(a), db = lire(b);
    for (const seuil of [110, 0]) {
      const n = new Map();
      for (let i = 0; i < da.length; i += 4) {
        if (da[i + 3] < 128) continue;
        if (da[i] === db[i] && da[i + 1] === db[i + 1] && da[i + 2] === db[i + 2]) continue;
        if (da[i] + da[i + 1] + da[i + 2] < seuil) continue;
        const k = (da[i] << 16) | (da[i + 1] << 8) | da[i + 2];
        n.set(k, (n.get(k) || 0) + 1);
      }
      if (n.size) {
        const [k] = [...n.entries()].sort((x, y) => y[1] - x[1])[0];
        couleur = '#' + k.toString(16).padStart(6, '0');
        break;
      }
    }
  } catch (e) { /* une couleur par défaut vaut mieux qu'un panneau cassé */ }
  couleursChroma.set(cle, couleur);
  return couleur;
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
