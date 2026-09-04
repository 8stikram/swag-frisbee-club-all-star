// ---------------------------------------------------------------------------
// L'ÉDITEUR DE PIXELS, partagé par tous les mockups de personnage.
//
// À quoi il sert. Les sections proposent des variantes que j'ai dessinées ;
// elles ne couvriront jamais tout. Quand le rendu est presque bon mais qu'il
// manque deux pixels au bon endroit, il faut pouvoir les poser soi-même plutôt
// que de décrire la correction et d'attendre. L'éditeur retouche le sprite
// ASSEMBLÉ — celui que les choix viennent de produire — et le mockup se
// redessine avec la retouche partout : aperçu, échelle du match, bande roster.
//
// Ce qui est gardé. La retouche vit dans localStorage sous sa propre clé, donc
// elle survit au rechargement de la page. Et le bouton « copier le sprite »
// sort les vingt lignes prêtes à coller dans le code source : c'est par là que
// la retouche devient définitive. Tant qu'on n'a pas collé, elle n'existe que
// dans le navigateur.
//
// Ce qu'il ne fait pas. Il ne touche pas aux variantes : changer un choix
// repart du sprite assemblé, et la retouche est perdue si elle portait sur la
// pièce qui vient de changer. C'est voulu — une retouche est une correction
// finale, pas une onzième variante.
// ---------------------------------------------------------------------------

const LARG = 16, HAUT = 20;

export function editeur(o) {
  const { hote, cle, rows, pal, change } = o;
  const CLE = 'mockupPixels:' + cle;

  let dessin = null;          // les 20 lignes retouchées, ou null si rien
  let lettre = null;          // la couleur au pinceau
  let grille = true;
  const pile = [];            // pour annuler : les états précédents

  try {
    const gard = localStorage.getItem(CLE);
    if (gard) dessin = JSON.parse(gard);
  } catch (e) { /* navigation privée, mode fichier : on s'en passe */ }

  const garder = () => {
    try {
      if (dessin) localStorage.setItem(CLE, JSON.stringify(dessin));
      else localStorage.removeItem(CLE);
    } catch (e) { /* idem */ }
  };

  // Le sprite montré : la retouche si elle existe, sinon celui des choix.
  const courant = () => dessin || rows();

  /* --- le panneau ------------------------------------------------------- */
  hote.innerHTML =
    '<div class="pxBarre">' +
      '<b>DESSINER DESSUS</b>' +
      '<span class="pxAide">clic pour poser · clic droit pour effacer · Ctrl+Z pour annuler</span>' +
    '</div>' +
    '<div class="pxCorps">' +
      '<canvas class="pxToile"></canvas>' +
      '<div class="pxCote">' +
        '<div class="pxPal"></div>' +
        '<div class="pxBoutons">' +
          '<button class="pxBtn" data-a="grille">grille</button>' +
          '<button class="pxBtn" data-a="annuler">annuler</button>' +
          '<button class="pxBtn" data-a="reset">repartir des choix</button>' +
          '<button class="pxBtn pxFort" data-a="copier">copier le sprite</button>' +
        '</div>' +
        '<textarea class="pxSortie" readonly rows="6"></textarea>' +
      '</div>' +
    '</div>';

  const toile = hote.querySelector('.pxToile');
  const g = toile.getContext('2d');
  const boitePal = hote.querySelector('.pxPal');
  const sortie = hote.querySelector('.pxSortie');

  /* --- la palette ------------------------------------------------------- */
  function majPalette() {
    const p = pal();
    boitePal.innerHTML = '';
    // Le vide d'abord : c'est la gomme, et c'est elle qu'on cherche le plus.
    const cases = [['.', null]].concat(Object.entries(p));
    for (const [k, coul] of cases) {
      const b = document.createElement('button');
      b.className = 'pxCase' + (lettre === k ? ' on' : '');
      b.title = k === '.' ? 'vide (gomme)' : k + ' — ' + coul;
      b.style.background = coul || 'transparent';
      if (!coul) b.textContent = '×';
      b.onclick = () => { lettre = k; majPalette(); };
      boitePal.append(b);
    }
    if (lettre === null) { lettre = Object.keys(p)[0] || '.'; majPalette(); }
  }

  /* --- le dessin -------------------------------------------------------- */
  let ECH = 18;
  function peindre() {
    ECH = Math.max(8, Math.min(22, Math.floor((hote.clientWidth - 210) / LARG) || 18));
    toile.width = LARG * ECH; toile.height = HAUT * ECH;
    const r = courant(), p = pal();
    // Un damier sous le sprite : sans lui on ne distingue pas un pixel vide
    // d'un pixel noir, et le collier devient un trou.
    for (let y = 0; y < HAUT; y++) {
      for (let x = 0; x < LARG; x++) {
        g.fillStyle = ((x + y) & 1) ? '#181228' : '#120d1e';
        g.fillRect(x * ECH, y * ECH, ECH, ECH);
        const ch = r[y][x];
        if (ch !== '.' && p[ch]) {
          g.fillStyle = p[ch];
          g.fillRect(x * ECH, y * ECH, ECH, ECH);
        }
      }
    }
    if (grille) {
      g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1;
      for (let x = 0; x <= LARG; x++) {
        g.beginPath(); g.moveTo(x * ECH + .5, 0); g.lineTo(x * ECH + .5, toile.height); g.stroke();
      }
      for (let y = 0; y <= HAUT; y++) {
        g.beginPath(); g.moveTo(0, y * ECH + .5); g.lineTo(toile.width, y * ECH + .5); g.stroke();
      }
      // Les colonnes 14-15 sont réservées par le gabarit : on les barre, pour
      // qu'on ne dessine pas dedans sans le vouloir.
      g.fillStyle = 'rgba(255,83,64,.14)';
      g.fillRect(14 * ECH, 0, 2 * ECH, toile.height);
      // Et la coupure tête / corps, qui tombe toujours à la dixième ligne.
      g.strokeStyle = 'rgba(240,224,188,.45)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, 10 * ECH + .5); g.lineTo(toile.width, 10 * ECH + .5); g.stroke();
    }
    sortie.value = 'tete: ' + JSON.stringify(courant().slice(0, 10)) +
                   ',\ncorps: ' + JSON.stringify(courant().slice(10));
  }

  function poser(ev, efface) {
    const b = toile.getBoundingClientRect();
    const x = Math.floor((ev.clientX - b.left) / (b.width / LARG));
    const y = Math.floor((ev.clientY - b.top) / (b.height / HAUT));
    if (x < 0 || x >= LARG || y < 0 || y >= HAUT) return;
    const av = courant();
    const ch = efface ? '.' : lettre;
    if (av[y][x] === ch) return;
    if (!dessin) dessin = av.slice();
    pile.push(dessin.slice());
    if (pile.length > 200) pile.shift();
    dessin = dessin.slice();
    dessin[y] = dessin[y].slice(0, x) + ch + dessin[y].slice(x + 1);
    garder(); peindre(); change();
  }

  let appuie = 0;
  toile.oncontextmenu = e => e.preventDefault();
  toile.onmousedown = e => { appuie = e.button === 2 ? 2 : 1; poser(e, appuie === 2); };
  toile.onmousemove = e => { if (appuie) poser(e, appuie === 2); };
  addEventListener('mouseup', () => { appuie = 0; });
  addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (!pile.length) return;
      dessin = pile.pop();
      garder(); peindre(); change();
    }
  });

  hote.querySelectorAll('.pxBtn').forEach(b => {
    b.onclick = async () => {
      const a = b.dataset.a;
      if (a === 'grille') { grille = !grille; peindre(); }
      if (a === 'annuler') {
        if (!pile.length) return;
        dessin = pile.pop(); garder(); peindre(); change();
      }
      if (a === 'reset') {
        pile.length = 0; dessin = null; garder(); peindre(); change();
      }
      if (a === 'copier') {
        try { await navigator.clipboard.writeText(sortie.value);
              b.textContent = 'copié !'; b.classList.add('ok');
              setTimeout(() => { b.textContent = 'copier le sprite'; b.classList.remove('ok'); }, 1400); }
        catch (e) { sortie.select(); }
      }
    };
  });

  majPalette();
  peindre();
  addEventListener('resize', peindre);

  return {
    actif: () => dessin !== null,
    rows: () => dessin,
    // À appeler quand les choix changent : le panneau se remet à jour, mais la
    // retouche RESTE. On ne l'efface pas dans le dos de celui qui l'a faite.
    maj: () => { majPalette(); peindre(); }
  };
}

// La feuille de style du panneau, posée une seule fois. Elle vit ici plutôt
// que dans chaque mockup : un éditeur qui change d'allure d'un perso à l'autre
// serait un éditeur de plus à relire à chaque fois.
export function styleEditeur() {
  if (document.getElementById('pxStyle')) return;
  const s = document.createElement('style');
  s.id = 'pxStyle';
  s.textContent = `
  .pxBarre{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:8px}
  .pxBarre b{font-size:12px;letter-spacing:1.2px}
  .pxAide{font-size:10.5px;opacity:.6;font-family:Consolas,monospace}
  .pxCorps{display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start}
  .pxToile{image-rendering:pixelated;border-radius:8px;cursor:crosshair;
           border:1px solid rgba(255,255,255,.14)}
  .pxCote{flex:1 1 180px;min-width:170px;display:flex;flex-direction:column;gap:8px}
  .pxPal{display:flex;flex-wrap:wrap;gap:4px}
  .pxCase{width:24px;height:24px;border-radius:6px;cursor:pointer;
          border:2px solid rgba(255,255,255,.18);color:#fff;font-size:12px;line-height:1;padding:0}
  .pxCase.on{border-color:#fff;box-shadow:0 0 0 2px rgba(255,255,255,.35)}
  .pxBoutons{display:flex;flex-wrap:wrap;gap:6px}
  .pxBtn{background:rgba(255,255,255,.08);color:inherit;border:1px solid rgba(255,255,255,.18);
         border-radius:7px;padding:6px 11px;font-size:11px;cursor:pointer;font-family:inherit}
  .pxBtn:hover{background:rgba(255,255,255,.16)}
  .pxBtn.pxFort{background:rgba(255,255,255,.16)}
  .pxBtn.ok{background:#1d4a33;border-color:#2f7a52;color:#8ef0b4}
  .pxSortie{width:100%;background:rgba(0,0,0,.35);color:inherit;border:1px solid rgba(255,255,255,.14);
            border-radius:8px;padding:7px 9px;font-family:Consolas,monospace;font-size:10.5px;
            resize:vertical;line-height:1.5}`;
  document.head.append(s);
}
