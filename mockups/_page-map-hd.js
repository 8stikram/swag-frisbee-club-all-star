// ---------------------------------------------------------------------------
// LA PAGE DE COMPARAISON des terrains HD, partagée par stadium-hd.html et les
// suivants. La page fournit son HTML (mêmes identifiants que stadium-hd.html) ;
// ce module fait tourner l'écran, la loupe, les zooms côte à côte et le code
// de choix.
//
// config = {
//   versions: [{ id, nom, image(t, but) → canvas | null, fond: url | null }],
//   zones: { cle: [x, y, l, h] | 'yuki' },
//   code: t => texte du code à renvoyer
// }
// ---------------------------------------------------------------------------
import { W, H, choregraphie, dessinerJoueurs, dessinerDisque, dessinerHUD, canvasYuki } from './_terrain-hd.js';

export function monterPage(config) {
  const jeu = document.getElementById('jeu'), g = jeu.getContext('2d');
  const loupe = document.getElementById('loupe'), lg = loupe.getContext('2d');
  const spr = canvasYuki();
  const opt = id => document.getElementById(id).checked;
  const versions = {};
  for (const v of config.versions) {
    versions[v.id] = v;
    if (v.fond) { v.img = new Image(); v.img.src = v.fond; }
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    v.tampon = c;
  }
  let vue = config.versions[config.versions.length - 1].id;
  let zone = Object.keys(config.zones)[0], t = 2.3, tBut = null, dernier = performance.now(), image = 0;

  const effetBut = () => {
    if (tBut === null) return 0;
    const k = t - tBut;
    return k < 0 || k > 1.1 ? 0 : 1 - k / 1.1;
  };
  function composer(id, ctx) {
    const v = versions[id], but = effetBut();
    if (v.img) {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      if (v.img.complete && v.img.naturalWidth) ctx.drawImage(v.img, 0, 0, W, H);
    } else ctx.drawImage(v.image(t, but), 0, 0);
    if (opt('opt-persos')) {
      const etat = choregraphie(t);
      dessinerJoueurs(ctx, etat, spr);
      dessinerDisque(ctx, etat, t);
    }
    if (opt('opt-hud')) dessinerHUD(ctx, spr, t);
  }

  function boucle(maintenant) {
    const dt = Math.min(.05, (maintenant - dernier) / 1000);
    dernier = maintenant;
    if (opt('opt-anim')) t += dt;
    composer(vue, g);
    // Zooms repeints une image sur trois : un rendu complet par version.
    if (image++ % 3 === 0) {
      let r = config.zones[zone];
      if (r === 'yuki') {
        const p = choregraphie(t).p1;
        r = [Math.round(p.x - 80), Math.round(p.y - 58), 160, 100];
      }
      for (const v of config.versions) {
        const tg = v.tampon.getContext('2d');
        if (v.id === vue) tg.drawImage(jeu, 0, 0); else composer(v.id, tg);
        const z = document.getElementById('z-' + v.id), zg = z.getContext('2d');
        zg.imageSmoothingEnabled = false;
        zg.drawImage(v.tampon, r[0], r[1], r[2], r[3], 0, 0, z.width, z.height);
      }
    }
    if (!loupe.hidden) peindreLoupe();
    requestAnimationFrame(boucle);
  }

  let pointeur = null;
  function peindreLoupe() {
    if (!pointeur) return;
    const r = jeu.getBoundingClientRect();
    const x = (pointeur.x - r.left) / r.width * W, y = (pointeur.y - r.top) / r.height * H;
    const taille = loupe.clientWidth, n = taille / 3;
    loupe.width = taille; loupe.height = taille;
    lg.imageSmoothingEnabled = false;
    lg.fillStyle = '#000'; lg.fillRect(0, 0, taille, taille);
    lg.drawImage(jeu, x - n / 2, y - n / 2, n, n, 0, 0, taille, taille);
    const ecran = jeu.parentElement.getBoundingClientRect();
    loupe.style.left = (pointeur.x - ecran.left - taille / 2) + 'px';
    loupe.style.top = (pointeur.y - ecran.top - taille / 2) + 'px';
  }
  const suivre = e => { pointeur = { x: e.clientX, y: e.clientY }; loupe.hidden = !opt('opt-loupe'); };
  jeu.addEventListener('pointermove', suivre);
  jeu.addEventListener('pointerdown', suivre);
  jeu.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') loupe.hidden = true; });

  for (const b of document.querySelectorAll('.onglets button')) {
    b.addEventListener('click', () => {
      vue = b.dataset.v;
      for (const o of document.querySelectorAll('.onglets button')) o.setAttribute('aria-selected', String(o === b));
      document.getElementById('legende').textContent = versions[vue].nom;
    });
  }
  for (const b of document.querySelectorAll('#zones button')) {
    b.addEventListener('click', () => {
      zone = b.dataset.z;
      for (const o of document.querySelectorAll('#zones button')) o.setAttribute('aria-pressed', String(o === b));
      image = 0;
    });
  }
  document.getElementById('but').addEventListener('click', () => { tBut = t; });

  const code = document.getElementById('code');
  const majCode = () => { code.textContent = config.code(); };
  for (const el of document.querySelectorAll('.choix input, .choix textarea')) el.addEventListener('input', majCode);
  majCode();
  document.getElementById('copier').addEventListener('click', async e => {
    const bouton = e.currentTarget;
    try {
      await navigator.clipboard.writeText(code.textContent);
      bouton.textContent = 'Copié';
    } catch (err) {
      const sel = getSelection(), plage = document.createRange();
      plage.selectNodeContents(code); sel.removeAllRanges(); sel.addRange(plage);
      bouton.textContent = 'Sélectionné, copie-le';
    }
    setTimeout(() => { bouton.textContent = 'Copier le code'; }, 1800);
  });

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) document.getElementById('opt-anim').checked = false;
  requestAnimationFrame(boucle);
}
