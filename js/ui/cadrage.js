import { $ } from '../core/dom.js';
import { sfx } from '../audio/audio.js';

// ---------------------------------------------------------------------------
// Cadrage d'image.
//
// Une photo prise au telephone est rarement carree, et une banniere encore
// moins. Sans cadrage, le jeu recadrait au centre : une photo de groupe
// donnait un bout d'epaule, et une banniere paysage perdait tout son sujet.
//
// On montre donc l'image avec un cadre aux bonnes proportions, on la deplace
// et on la zoome, puis on n'envoie que ce qui tient dans le cadre. Le fichier
// envoye est deja a la bonne taille : rien d'inutile ne part sur le reseau.
// ---------------------------------------------------------------------------
let img = null, forme = 'rond', sortie = 512, hauteurSortie = 512;
let echelle = 1, minEchelle = 1, dx = 0, dy = 0;
let attrape = null, resoudre = null;

function boite() { return $('cadCanevas').getBoundingClientRect(); }

function borner() {
  // L'image doit toujours couvrir le cadre : sans cette contrainte on peut la
  // faire glisser hors champ et valider un cadre a moitie vide.
  const c = $('cadCanevas');
  const l = img.width * echelle, h = img.height * echelle;
  dx = Math.min(0, Math.max(dx, c.width - l));
  dy = Math.min(0, Math.max(dy, c.height - h));
}

function peindre() {
  const c = $('cadCanevas'), g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, dx, dy, img.width * echelle, img.height * echelle);
}

function poser(fichier, options) {
  forme = options.forme || 'rond';
  sortie = options.taille || 512;
  hauteurSortie = options.hauteur || sortie;
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(fichier);
    const i = new Image();
    i.onload = () => { URL.revokeObjectURL(url); img = i; res(); };
    i.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image illisible')); };
    i.src = url;
  });
}

// Ouvre le cadreur et rend le fichier cadre, ou null si on annule.
export async function cadrer(fichier, options = {}) {
  const pop = $('cadPop');
  if (!pop) return fichier;
  await poser(fichier, options);

  const c = $('cadCanevas');
  // Le canevas prend les proportions demandees, a une taille d'affichage
  // confortable ; la sortie, elle, est rendue a la taille reelle voulue.
  const largeurVue = 320;
  c.width = largeurVue;
  c.height = Math.round(largeurVue * hauteurSortie / sortie);
  c.classList.toggle('rond', forme === 'rond');

  // Echelle minimale : celle qui fait tout juste couvrir le cadre.
  minEchelle = Math.max(c.width / img.width, c.height / img.height);
  echelle = minEchelle;
  dx = (c.width - img.width * echelle) / 2;
  dy = (c.height - img.height * echelle) / 2;
  const z = $('cadZoom');
  z.min = '1'; z.max = '4'; z.step = '0.01'; z.value = '1';
  peindre();

  pop.classList.remove('hidden');
  return new Promise(res => { resoudre = res; });
}

function fermer(valeur) {
  $('cadPop').classList.add('hidden');
  img = null; attrape = null;
  if (resoudre) { resoudre(valeur); resoudre = null; }
}

(function cabler() {
  const c = $('cadCanevas');
  if (!c) return;

  const point = e => {
    const t = e.touches ? e.touches[0] : e;
    const b = boite();
    return { x: (t.clientX - b.left) * c.width / b.width,
             y: (t.clientY - b.top) * c.height / b.height };
  };
  const debut = e => { if (!img) return; e.preventDefault(); const p = point(e); attrape = { x: p.x - dx, y: p.y - dy }; };
  const bouge = e => {
    if (!attrape || !img) return;
    e.preventDefault();
    const p = point(e);
    dx = p.x - attrape.x; dy = p.y - attrape.y;
    borner(); peindre();
  };
  const fin = () => { attrape = null; };

  c.addEventListener('mousedown', debut);
  window.addEventListener('mousemove', bouge);
  window.addEventListener('mouseup', fin);
  c.addEventListener('touchstart', debut, { passive: false });
  window.addEventListener('touchmove', bouge, { passive: false });
  window.addEventListener('touchend', fin);

  $('cadZoom').addEventListener('input', e => {
    if (!img) return;
    // On zoome autour du centre du cadre : zoomer depuis un coin ferait fuir
    // le sujet hors champ a chaque cran.
    const c2 = $('cadCanevas');
    const cx = c2.width / 2, cy = c2.height / 2;
    const avant = echelle;
    echelle = minEchelle * parseFloat(e.target.value);
    const k = echelle / avant;
    dx = cx - (cx - dx) * k;
    dy = cy - (cy - dy) * k;
    borner(); peindre();
  });

  $('cadAnnuler').addEventListener('click', () => { sfx('deny'); fermer(null); });

  $('cadValider').addEventListener('click', () => {
    if (!img) { fermer(null); return; }
    // On rend a la taille reelle voulue, pas a celle de l'apercu.
    const sortieCv = document.createElement('canvas');
    sortieCv.width = sortie; sortieCv.height = hauteurSortie;
    const g = sortieCv.getContext('2d');
    g.imageSmoothingQuality = 'high';
    const k = sortie / $('cadCanevas').width;
    g.drawImage(img, dx * k, dy * k, img.width * echelle * k, img.height * echelle * k);
    sortieCv.toBlob(b => {
      sfx('select');
      // Un nom propre : le service se sert de l'extension pour le type.
      fermer(b ? new File([b], 'cadre.png', { type: 'image/png' }) : null);
    }, 'image/png');
  });
})();
