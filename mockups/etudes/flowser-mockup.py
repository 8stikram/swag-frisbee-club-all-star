# -*- coding: utf-8 -*-
"""Ecrit mockups/flowser.html : un mockup DEDIE au design, ou chaque piece se
juge EN GRAND. Le gabarit commun montre le perso dans une vignette de terrain a
l'echelle du match ; c'est bien pour trancher une silhouette, c'est inutile pour
trancher une monture de lunettes de trois pixels. Ici chaque carte porte le
perso entier en grand ET un gros plan sur la piece que la section commande."""
import io, os, sys
sys.path.insert(0, '.')
from fl_mk_data import SPR, PAL, SECS, IDS

R = r'C:\Jeu mata label\Jeu frisbee\claude local'


def js(v):
    if v is None:
        return 'null'
    if isinstance(v, str):
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, (list, tuple)):
        return '[' + ','.join(js(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{' + ','.join('%s:%s' % (k, js(x)) for k, x in v.items()) + '}'
    raise TypeError(v)


blocs = []
for s in SECS:
    vs = []
    for i, va in enumerate(s['variantes']):
        p = {'id': va['id'], 'nom': va['nom'], 'desc': va['desc']}
        if va['spr'] is not None:
            p['tete'] = va['spr'][:10]
            p['corps'] = va['spr'][10:]
        if 'pals' in s:
            p['pal'] = s['pals'][i]
        if 'stats' in s:
            p['stats'] = s['stats'][i]
        vs.append(p)
    blocs.append({'id': s['id'], 'titre': s['titre'], 'note': s['note'],
                  'zoom': s['zoom'], 'variantes': vs})

DONNEES = ('const PERSO = {\n'
           "  nom: 'FLOWSER-TWO',\n"
           "  dominante: 'LMmo',\n"
           "  univers: 'LABORATOIRE DU CHÂTEAU',\n"
           '  pal: %s,\n'
           '  tete: %s,\n'
           '  corps: %s\n};\n\n'
           'const SECTIONS = %s;\n') % (js(PAL), js(SPR[:10]), js(SPR[10:]), js(blocs))

HTML = r'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Flowser-Two — chara-design</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap" rel="stylesheet">
<style>
  :root{ --bg:#0a0713; --panel:#150e24; --edge:#33244d; --ink:#eee6fb; --accent:#c98ae8; --or:#f0e0bc; }
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--ink);font-family:'Segoe UI',system-ui,sans-serif;padding:22px 18px 70px}
  h1{font-size:23px;margin:0 0 4px;font-family:'Archivo Black',sans-serif;letter-spacing:.5px}
  h2{font-size:14px;margin:36px 0 6px;color:var(--accent);text-transform:uppercase;
     letter-spacing:1.4px;border-bottom:1px solid var(--edge);padding-bottom:6px}
  .note{font-size:12.5px;color:#a595c4;max-width:1000px;line-height:1.75;margin:0 0 14px}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  /* max-width : sans lui, une carte seule sur sa ligne prend toute la largeur
     et ses deux canvas s'etirent en enormes rectangles flous. */
  .card{background:var(--panel);border:1px solid var(--edge);border-radius:12px;padding:10px;
        flex:1 1 206px;min-width:206px;max-width:268px;cursor:pointer;
        transition:border-color .12s,transform .12s}
  .card:hover{border-color:#5b3f85}
  .card.on{border-color:var(--or);transform:translateY(-2px);box-shadow:0 0 0 1px var(--or) inset}
  .lbl{font-size:11px;color:#a595c4;margin-bottom:8px;line-height:1.5;min-height:84px}
  .lbl b{display:block;font-size:13px;color:var(--or);letter-spacing:.5px;margin-bottom:3px}
  .duo{display:flex;gap:8px;align-items:flex-end;justify-content:center}
  /* Les deux canvas gardent leur taille propre : en flex-grow ils s'etiraient
     et le gros plan devenait un aplat de couleurs. */
  .duo canvas{background:#120b1f;border-radius:8px;display:block;image-rendering:pixelated;flex:0 0 auto}
  .duo .zoom{border:1px solid #6b4a87}
  .duo .plein{opacity:.85}
  .reserve{display:none}
  .reserve.ouverte{display:flex}
  .plus{margin-top:10px;background:#20143a;color:#b8a3d8;border:1px solid var(--edge);
        border-radius:8px;padding:6px 14px;font-size:11.5px;cursor:pointer;letter-spacing:.4px}
  .plus:hover{background:#2c1b4f;color:var(--ink)}
  .haut{display:flex;gap:14px;flex-wrap:wrap;align-items:flex-start}
  .apercu{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:14px;flex:1 1 420px;
          display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
  .apercu canvas{background:#120b1f;border-radius:10px;image-rendering:pixelated;display:block}
  .fiche{background:var(--panel);border:1px solid var(--edge);border-radius:14px;padding:14px;flex:1 1 280px}
  .fiche h3{margin:0 0 10px;font-size:12px;color:var(--accent);text-transform:uppercase;letter-spacing:1.2px}
  .fiche table{width:100%;border-collapse:collapse;font-size:11.5px;font-family:Consolas,monospace}
  .fiche td{padding:3px 0;color:#a595c4;vertical-align:top}
  .fiche td:last-child{color:var(--or);text-align:right;white-space:nowrap;padding-left:8px}
  .bar{height:7px;background:#241738;border-radius:4px;overflow:hidden;margin-top:2px}
  .bar i{display:block;height:100%}
  .choix{font-size:11.5px;color:#b8a3d8;margin-top:10px;font-family:Consolas,monospace;line-height:1.8}
  .choix b{color:var(--or)}
  .copier{display:flex;gap:8px;align-items:center;margin-top:9px;flex-wrap:wrap}
  .codeChoix{flex:1 1 190px;background:#120b1f;border:1px solid var(--edge);border-radius:8px;
             padding:7px 10px;color:var(--or);font-family:Consolas,monospace;font-size:13px;letter-spacing:1.2px}
  .btnCopier{background:#2c1b4f;color:var(--ink);border:1px solid var(--edge);border-radius:8px;
             padding:8px 15px;font-size:11.5px;cursor:pointer;letter-spacing:.4px;white-space:nowrap}
  .btnCopier:hover{background:#3b2568}
  .btnCopier.ok{background:#1d4a33;border-color:#2f7a52;color:#8ef0b4}
  .anatCorps{display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
  .anatCorps canvas{image-rendering:pixelated;border-radius:10px;border:1px solid var(--edge)}
  .anatListe{flex:1 1 340px;font-size:11.5px;line-height:1.6}
  .anatListe div{display:flex;gap:8px;align-items:baseline;padding:2px 0}
  .anatListe i{width:12px;height:12px;border-radius:3px;flex:0 0 auto;position:relative;top:1px}
  .anatListe b{color:var(--or);font-weight:600}
  .anatListe em{font-style:normal;color:#8d7fa8}
  .rosterRow{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
  .rosterOne{text-align:center;font-size:9px;color:#8d7fa8;font-family:Consolas,monospace}
  .rosterOne canvas{display:block;border-radius:6px;image-rendering:pixelated;border:1px solid var(--edge)}
  #errs{font-size:12.5px;font-family:Consolas,monospace;color:#5df08a;white-space:pre-wrap;margin:10px 0 4px}
  #errs.bad{color:#ff5340}
</style>
</head>
<body>

<h1>FLOWSER-TWO — CHARA-DESIGN</h1>
<p class="note">
  <b>Bowser × Mewtwo.</b> Le corps, le museau, l'oreille et la queue viennent de Mewtwo ; la crête,
  la carapace et le cuir clouté viennent de Bowser. Les lunettes rondes sont à lui.
  <br><br>
  <b>Il est de profil, dans la position de Yoshi.</b> Sa carapace et sa queue sont des éléments de
  DOS : de face on n'en voyait que deux pointes aux épaules, et le reste était un aplat mauve. Et
  les lunettes n'y perdent rien — de profil on voit le <b>verre</b> ET la <b>branche</b> qui part
  vers l'oreille, ce qui est la lecture la plus claire des deux.
  <br><br>
  <b>Mockup dédié au design.</b> Le gabarit commun montre le perso dans une vignette de terrain à
  l'échelle du match : c'est bien pour trancher une silhouette, c'est inutile pour trancher une
  monture de trois pixels. Ici chaque carte porte le <b>perso entier en grand</b> et un
  <b>gros plan</b> sur la pièce que la section commande. La bande du bas le remet à l'échelle du
  match, à côté du roster — c'est là qu'on vérifie qu'il tient vraiment.
</p>

<div id="errs"></div>

<div class="haut">
  <div class="apercu">
    <canvas id="cvGrand" width="304" height="380"></canvas>
    <div>
      <canvas id="cvPetit" width="230" height="120"></canvas>
      <div class="choix" id="choix"></div>
      <div class="copier">
        <input class="codeChoix" id="codeChoix" readonly>
        <button class="btnCopier" id="btnCopier">copier mes choix</button>
      </div>
    </div>
  </div>
  <div class="fiche">
    <h3>Le personnage</h3>
    <table id="fiche"></table>
    <h3 style="margin-top:14px">À côté du roster, à l'échelle du match</h3>
    <div class="rosterRow" id="rosterRow"></div>
  </div>
</div>

<div class="apercu" id="anatomie" style="margin-top:14px;display:block"></div>

<div class="apercu" id="editeur" style="margin-top:14px;display:block"></div>

<div id="sections"></div>

<script type="module">
import { MAPS } from '../js/data/maps.js';
import { CHARS, ROSTER } from '../js/data/characters.js';
import { verifier, afficher } from './_verif.js';
import { editeur, styleEditeur } from './_pixel.js';

__DONNEES__

/* ===================== LE DESSIN ===================== */
// Un sprite se dessine a la main plutot que par buildSprite : on veut pouvoir
// le poser a n'importe quelle echelle, et surtout n'en dessiner qu'un MORCEAU
// pour le gros plan.
function peindre(g, rows, pal, ech, ox, oy, zone) {
  const [x0, y0, x1, y1] = zone || [0, 0, 15, 19];
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !pal[ch]) continue;
      g.fillStyle = pal[ch];
      g.fillRect(ox + (x - x0) * ech, oy + (y - y0) * ech, ech, ech);
    }
  }
}

// Le fond : un degrade neutre, pas le terrain. Sur un terrain bleu nuit un
// perso mauve se juge mal, et la question ici n'est pas « est-ce qu'il ressort
// sur le terrain » mais « est-ce que la piece se lit ». Le terrain revient
// dans la bande du bas, ou la question redevient celle-la.
function fond(g, W, H) {
  const d = g.createLinearGradient(0, 0, 0, H);
  d.addColorStop(0, '#1d1430'); d.addColorStop(1, '#100a1c');
  g.fillStyle = d; g.fillRect(0, 0, W, H);
}

/* ===================== L'ÉTAT ===================== */
const choix = {};
SECTIONS.forEach(s => { choix[s.id] = s.variantes[0].id; });
const actuel = id => SECTIONS.find(s => s.id === id).variantes.find(x => x.id === choix[id]);

// Assemble le perso tel que les choix le decrivent. Chaque section n'apporte
// que la piece qu'elle remplace, la derniere declaree l'emporte.
function batir(remplace) {
  let tete = PERSO.tete, corps = PERSO.corps;
  let pal = { ...PERSO.pal }, stats = null;
  for (const s of SECTIONS) {
    const va = (remplace && remplace.sec === s.id) ? remplace.va : actuel(s.id);
    if (va.tete) tete = va.tete;
    if (va.corps) corps = va.corps;
    if (va.pal) pal = { ...pal, ...va.pal };
    if (va.stats) stats = va.stats;
  }
  // La retouche de l'editeur ne s'applique qu'au perso ASSEMBLE, jamais aux
  // cartes : une carte doit montrer SA variante, sinon on choisit a l'aveugle.
  let rows = [...tete, ...corps];
  if (!remplace && ed && ed.actif()) rows = ed.rows();
  return { rows, pal, stats };
}

// Declare AVANT tout ce qui appelle batir() : la carte d'anatomie s'en sert,
// et une variable `let` lue avant sa declaration jette au lieu de valoir
// undefined. C'est ce qui vidait le panneau sans un mot dans la page.
let ed = null;

/* ===================== L'ANATOMIE ===================== */
// Elle vit ici et pas dans une tête : c'est elle qui commande les poses
// d'animation, et une pose se dessine en sachant CE QUI BOUGE. Dans une
// course, la carapace et la tête ne bougent pas, les jambes alternent, et les
// deux bras balancent À CONTRETEMPS l'un de l'autre — c'est ce contretemps qui
// fait courir plutôt que glisser.
const ANATOMIE = [
  ['la crête', '#e8392f', 0, 4, 0, 15, 'fixe — elle ne se couche qu\'au dash'],
  ['la monture et les deux verres', '#35e0ff', 5, 7, 0, 15, 'fixe'],
  ['le museau', '#c98ae8', 6, 8, 7, 12, 'fixe'],
  ['le collier clouté', '#f0e0bc', 9, 9, 0, 15, 'fixe'],
  ['la carapace et ses pointes', '#a05a9c', 10, 17, 0, 7, 'fixe — c\'est le bloc de référence'],
  ['LE BRAS PROCHE, avec ses bracelets', '#5df08a', 11, 16, 8, 9, 'il balance'],
  ['le ventre, relié à la queue', '#ffd23e', 10, 17, 10, 12, 'fixe — il se penche au dash et au plongeon'],
  ['LE BRAS LOIN', '#ff6fb5', 11, 16, 13, 14, 'il balance à contretemps de l\'autre'],
  ['les jambes et les griffes', '#ff8c1a', 17, 19, 0, 15, 'elles alternent']
];

(function anatomie() {
  const h = document.getElementById('anatomie');
  h.innerHTML = '<div style="width:100%"><h3 style="margin:0 0 10px;font-size:12px;color:var(--accent);' +
    'text-transform:uppercase;letter-spacing:1.2px">L\'anatomie — ce qui bouge et ce qui ne bouge pas</h3>' +
    '<div class="anatCorps"><canvas id="cvAnat"></canvas><div class="anatListe" id="anatListe"></div></div></div>';
  const cv = document.getElementById('cvAnat');
  const e = 13;
  cv.width = 16 * e; cv.height = 20 * e;
  const g = cv.getContext('2d');
  const { rows, pal } = batir();
  fond(g, cv.width, cv.height);
  for (let y = 0; y < 20; y++) {
    for (let x = 0; x < 16; x++) {
      const ch = rows[y][x];
      if (ch === '.' || !pal[ch]) continue;
      // La DERNIÈRE zone qui contient le pixel gagne : les zones larges sont
      // déclarées d'abord, les pièces précises ensuite, et une pièce précise
      // doit l'emporter sur le bloc qui la contient.
      let coul = pal[ch];
      for (const [, c, y0, y1, x0, x1] of ANATOMIE) {
        if (y >= y0 && y <= y1 && x >= x0 && x <= x1) coul = c;
      }
      g.fillStyle = coul;
      g.fillRect(x * e, y * e, e, e);
    }
  }
  document.getElementById('anatListe').innerHTML = ANATOMIE.map(
    ([nom, c, , , , , quoi]) =>
      '<div><i style="background:' + c + '"></i><span><b>' + nom + '</b> — <em>' + quoi + '</em></span></div>'
  ).join('');
})();

/* ===================== L'ÉDITEUR ===================== */
// Les sections proposent les variantes que j'ai dessinees ; elles ne couvriront
// jamais tout. Quand il manque deux pixels au bon endroit, il faut pouvoir les
// poser soi-meme plutot que de decrire la correction et d'attendre.
styleEditeur();
ed = editeur({
  hote: document.getElementById('editeur'),
  cle: 'flowser',
  rows: () => { const t = batir(); return t.rows; },
  pal: () => batir().pal,
  change: () => rafraichir()
});

/* ===================== L'APERÇU ===================== */
const gG = document.getElementById('cvGrand').getContext('2d');
const gP = document.getElementById('cvPetit').getContext('2d');
const ARENE = MAPS[0], TH = ARENE.theme;

function majApercu() {
  const { rows, pal } = batir();
  const cv = gG.canvas;
  fond(gG, cv.width, cv.height);
  const ech = 19;
  peindre(gG, rows, pal, ech, (cv.width - 16 * ech) / 2, (cv.height - 20 * ech) / 2);

  // Et a l'echelle du match, sur le vrai sol du terrain : quatre fois, parce
  // qu'un perso seul ne dit pas s'il tient au milieu des autres.
  const c2 = gP.canvas;
  gP.fillStyle = TH.floor; gP.fillRect(0, 0, c2.width, c2.height);
  gP.strokeStyle = TH.line; gP.lineWidth = 1;
  gP.beginPath(); gP.moveTo(0, c2.height - 14); gP.lineTo(c2.width, c2.height - 14); gP.stroke();
  for (let i = 0; i < 3; i++) {
    peindre(gP, rows, pal, 4.8, 14 + i * 74, c2.height - 14 - 20 * 4.8);
  }
  majFiche(); majChoix();
}

function majFiche() {
  const { stats } = batir();
  const st = stats || { spd: 3, pow: 3, ctl: 3, speed: 330, power: 1, catchR: 30, chargeT: .8 };
  const barre = (n, c) => '<div class="bar"><i style="width:' + (n / 5 * 100) + '%;background:' + c + '"></i></div>';
  document.getElementById('fiche').innerHTML =
    '<tr><td>Univers</td><td>' + PERSO.univers + '</td></tr>' +
    '<tr><td>Vitesse' + barre(st.spd, '#5df08a') + '</td><td>' + st.speed + ' px/s</td></tr>' +
    '<tr><td>Puissance' + barre(st.pow, '#ff6a7a') + '</td><td>×' + st.power + '</td></tr>' +
    '<tr><td>Contrôle' + barre(st.ctl, '#35e0ff') + '</td><td>' + st.catchR + ' px</td></tr>' +
    '<tr><td>Temps de charge</td><td>' + st.chargeT + ' s</td></tr>';
}

function majChoix() {
  document.getElementById('choix').innerHTML =
    SECTIONS.map(s => s.titre.replace(/^\d+ · /, '') + ' <b>' + choix[s.id] + '</b>').join('  ·  ');
  document.getElementById('codeChoix').value =
    SECTIONS.map((s, i) => (i + 1) + choix[s.id]).join(' ');
}

/* ===================== LES CARTES ===================== */
// Chaque carte porte DEUX dessins : le perso entier, et un gros plan sur la
// piece que la section commande. C'est le gros plan qui permet de trancher —
// une monture de trois pixels ne se juge pas dans une vignette de terrain.
const cartes = [];
function dessinerCarte(o) {
  const { rows, pal } = batir({ sec: o.sec.id, va: o.va });
  const gc = o.plein.getContext('2d');
  fond(gc, o.plein.width, o.plein.height);
  const e1 = o.zoom ? 4 : 8;
  peindre(gc, rows, pal, e1, 0, 0);
  if (!o.zoom) return;
  const gz = o.zoom.getContext('2d');
  fond(gz, o.zoom.width, o.zoom.height);
  const z = o.sec.zoom;
  const ez = o.zoom.width / (z[2] - z[0] + 1);
  peindre(gz, rows, pal, ez, 0, 0, z);
}

const boite = document.getElementById('sections');
SECTIONS.forEach(sec => {
  const h2 = document.createElement('h2');
  h2.textContent = sec.titre;
  const note = document.createElement('p');
  note.className = 'note'; note.textContent = sec.note;
  boite.append(h2, note);

  const rangee = (liste, reserve) => {
    const row = document.createElement('div');
    row.className = 'row' + (reserve ? ' reserve' : '');
    liste.forEach(va => {
      const card = document.createElement('div');
      card.className = 'card' + (choix[sec.id] === va.id ? ' on' : '');
      card.dataset.sec = sec.id; card.dataset.va = va.id;
      const lbl = document.createElement('div');
      lbl.className = 'lbl';
      lbl.innerHTML = '<b>' + va.id + ' · ' + va.nom + '</b>' + va.desc;
      // LE GROS PLAN EST LE DESSIN PRINCIPAL, le perso entier n'est qu'une
      // vignette a cote. L'inverse — un grand perso et un petit gros plan —
      // noyait la difference : sur la crete, ce qui change tient dans six
      // lignes de pixels, invisibles au milieu de tout le personnage. Le gros
      // plan prend la forme de sa zone au lieu d'une boite fixe, sinon une
      // zone large et basse se dessine minuscule dans un cadre haut.
      const duo = document.createElement('div'); duo.className = 'duo';
      let zoom = null;
      if (sec.zoom) {
        const z = sec.zoom, zw = z[2] - z[0] + 1, zh = z[3] - z[1] + 1;
        const ez = Math.min(15, Math.floor(168 / zw), Math.floor(168 / zh));
        zoom = document.createElement('canvas');
        zoom.className = 'zoom'; zoom.width = zw * ez; zoom.height = zh * ez;
        duo.append(zoom);
      }
      const plein = document.createElement('canvas');
      plein.className = 'plein';
      plein.width = sec.zoom ? 16 * 4 : 16 * 8;
      plein.height = sec.zoom ? 20 * 4 : 20 * 8;
      duo.append(plein);
      card.append(lbl, duo);
      card.onclick = () => {
        choix[sec.id] = va.id;
        document.querySelectorAll('.card[data-sec="' + sec.id + '"]')
          .forEach(c => c.classList.toggle('on', c.dataset.va === va.id));
        rafraichir();
      };
      row.append(card);
      cartes.push({ plein, zoom, sec, va });
    });
    return row;
  };
  boite.append(rangee(sec.variantes.slice(0, 5), false));
  const res = rangee(sec.variantes.slice(5), true);
  const btn = document.createElement('button');
  btn.className = 'plus'; btn.textContent = '+ 5 autres choix';
  btn.onclick = () => { res.classList.toggle('ouverte'); rafraichir(); };
  boite.append(btn, res);
});

function rafraichir() {
  majApercu();
  if (ed) ed.maj();
  cartes.forEach(o => { if (o.plein.offsetParent) dessinerCarte(o); });
}

document.getElementById('btnCopier').onclick = async () => {
  const b = document.getElementById('btnCopier');
  try { await navigator.clipboard.writeText(document.getElementById('codeChoix').value);
        b.textContent = 'copié !'; b.classList.add('ok');
        setTimeout(() => { b.textContent = 'copier mes choix'; b.classList.remove('ok'); }, 1400); }
  catch (e) { document.getElementById('codeChoix').select(); }
};

/* --- La bande du roster, a l'echelle du match --- */
(function bande() {
  const hote = document.getElementById('rosterRow');
  const ajoute = (dessine, nom) => {
    const d = document.createElement('div'); d.className = 'rosterOne';
    const cv = document.createElement('canvas');
    cv.width = 16 * 4.2; cv.height = 20 * 4.2;
    const g = cv.getContext('2d');
    g.fillStyle = TH.floor; g.fillRect(0, 0, cv.width, cv.height);
    dessine(g, cv);
    const e = document.createElement('em'); e.style.fontStyle = 'normal'; e.textContent = nom;
    d.append(cv, e); hote.append(d);
  };
  const moi = batir();
  ajoute((g, cv) => peindre(g, moi.rows, moi.pal, 4.2, 0, 0), 'FLOWSER');
  for (const ck of ROSTER) {
    const c = CHARS[ck];
    ajoute((g, cv) => { g.imageSmoothingEnabled = false; g.drawImage(c.frames.idle, 0, 0, cv.width, cv.height); },
           c.short || c.name);
  }
})();

/* --- Le module de controle --- */
afficher(verifier({ id: 'flowser', PERSO, SECTIONS }), document.getElementById('errs'));

rafraichir();
</script>
</body>
</html>
'''

HTML = HTML.replace('__DONNEES__', DONNEES)
io.open(os.path.join(R, 'mockups', 'flowser.html'), 'w', encoding='utf-8').write(HTML)
print('mockups/flowser.html ecrit : %d sections' % len(SECS))
