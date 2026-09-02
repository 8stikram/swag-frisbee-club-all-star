/* ===========================================================================
   Contrôles partagés des mockups de personnage.

   Chaque erreur commise sur un perso est devenue un contrôle ici, et ce
   contrôle s'applique ensuite à TOUS les persos, y compris ceux déjà écrits.
   C'est la différence avec le moteur d'affichage, qu'on ne mutualise pas :
   un mockup est une trace de décision et son rendu ne doit pas changer dans
   le dos de l'utilisateur — mais un contrôle, lui, doit remonter partout.

   Pour s'en servir depuis un mockup :

     import { verifier } from './_verif.js';
     const bad = verifier({ id: 'yoshi', PERSO, SECTIONS });

   Le tableau renvoyé est vide quand tout va bien.
   =========================================================================== */

// Écart exigé entre deux variantes d'une même section. Ajouté après que
// l'utilisateur ait signalé, sur quatre persos d'affilée, que « chaque variante
// se ressemble » — à l'activation, la règle a rejeté 16 variantes sur 18 du
// premier jet de Yoshi.
//
// Le seuil est RELATIF, pas absolu. Un premier jet exigeait 16 px sur les 320
// d'un sprite, quelle que soit la section : c'était laxiste pour une tête, qui
// dispose de 160 px, et absurde pour des bottes, qui n'en commandent qu'une
// trentaine — leur demander 16 px revenait à exiger qu'elles changent
// entièrement. On mesure donc d'abord la ZONE de la section (les pixels qu'au
// moins une variante déplace par rapport à A), et on exige de chaque variante
// une part de cette zone.
//
// Et la comparaison se fait DEUX À DEUX, pas contre la variante A. Mesuré sur
// Yoshi : la règle « écart avec A » laissait passer pose-D et pose-F à 9 px
// l'une de l'autre, et anim-E / anim-H à 8 px, parce que les deux s'éloignaient
// de A dans la même direction. C'est exactement le « on dirait plein de fois la
// même » de l'utilisateur, et l'ancienne règle ne pouvait pas le voir.
export const PART_ZONE = 0.20;     // 20 % de ce que la section commande vraiment
export const ECART_PLANCHER = 12;  // et jamais moins de 12 px, en dessous rien ne se distingue sur la carte

// Une section dont toutes les variantes réunies ne déplacent presque rien ne
// propose pas de partis pris. Le seuil relatif seul ne l'attraperait pas :
// une petite part d'une petite zone reste petite.
export const ZONE_MIN = 24;

// Longueur minimale d'une description. Elle doit dire ce que c'est ET ce que
// ça coûte : en dessous, c'est un nom déguisé en explication.
export const DESC_MIN = 40;

/* ---------------------------------------------------------------------------
   TRAITS OBLIGATOIRES, par personnage.

   C'est la parade aux RÉGRESSIONS. Sur Yoshi, les épines rouges ont disparu
   quand j'ai refait les proportions du visage, et rien ne l'a signalé — c'est
   l'utilisateur qui l'a vu. Un trait déclaré ici est vérifié à chaque
   modification, pour toujours.

   Chaque trait reçoit les 20 lignes du sprite assemblé et renvoie vrai si la
   caractéristique est présente.
   --------------------------------------------------------------------------- */

// Cherche une colonne où une couleur donnée court sans interruption sur au
// moins `hauteur` lignes. Sert à vérifier qu'une zone est CONTINUE et non
// coupée en deux — le blanc de Yoshi, qui doit relier le menton au ventre.
function colonneContinue(rows, lettres, hauteur) {
  for (let x = 0; x < 16; x++) {
    let debut = -1, fin = -1;
    for (let y = 0; y < rows.length; y++) {
      if (lettres.includes(rows[y][x])) { if (debut < 0) debut = y; fin = y; }
    }
    if (debut < 0) continue;
    let trous = 0;
    for (let y = debut; y <= fin; y++) if (!lettres.includes(rows[y][x])) trous++;
    if (trous === 0 && fin - debut + 1 >= hauteur) return true;
  }
  return false;
}
const contient = (rows, lettre, jusqua) =>
  rows.slice(0, jusqua === undefined ? rows.length : jusqua).some(l => l.includes(lettre));

export const TRAITS = {
  yoshi: [
    { nom: 'les épines rouges du crâne',
      pourquoi: 'elles ont déjà disparu une fois au détour d’une refonte du visage',
      test: r => contient(r, 'R', 8) },
    { nom: 'le blanc continu du menton jusqu’au ventre',
      pourquoi: 'il passe par le cou : coupé, la tête paraît posée sur le corps',
      test: r => colonneContinue(r, 'Ww', 7) },
    { nom: 'le museau en vert clair, détaché du crâne',
      pourquoi: 'sans lui la tête redevient un aplat vert et le perso n’est plus reconnaissable',
      test: r => contient(r, 'l') },
    { nom: 'les bottes à semelle',
      pourquoi: 'c’est son détail le plus reconnaissable après le museau',
      test: r => contient(r, 'O') && contient(r, 'Y') },
    { nom: 'deux yeux avec leur pupille',
      pourquoi: 'le roster est entièrement de face : un seul œil trahit un design de profil',
      test: r => contient(r, 'E') && contient(r, 'W')
                 && r.some(l => (l.match(/E/g) || []).length >= 2) }
  ],
  yuki: [
    { nom: 'les bras visibles aux épaules',
      pourquoi: 'la première doudoune les avalait et le perso n\'avait plus de membres',
      test: r => r[10].includes('S') || r[11].includes('S') },
    { nom: 'la doudoune ouverte sur le poitrail',
      pourquoi: 'fermée, elle efface le corps ; les visuels la montrent ouverte et courte',
      test: r => r.slice(10, 16).some(l => /K.*s.*K/.test(l)) },
    { nom: 'le bandana rouge',
      pourquoi: 'seul clin d\'œil restant au Petit Chaperon Rouge',
      test: r => contient(r, 'R') }
  ],
  chopper: [
    { nom: 'le pneu dans le dos',
      pourquoi: 'il élargit la silhouette et le distingue du reste du casting',
      test: r => contient(r, 'm', 14) },
    { nom: 'la bonbonne jaune',
      pourquoi: 'seule couleur vive d\'un perso entièrement sombre',
      test: r => contient(r, 'Y') },
    { nom: 'le ventre tatoué laissé nu',
      pourquoi: 'c\'est lui qui porte toute la masse du personnage',
      test: r => contient(r, 'T') }
  ],
  mamie: [
    { nom: 'le treillis militaire',
      pourquoi: 'le premier jet, rouge et anguleux, se lisait comme un costume de super-héros',
      test: r => contient(r, 'O') || contient(r, 'W') }
  ]
};

/* ---------------------------------------------------------------------------
   LES CONTRÔLES
   --------------------------------------------------------------------------- */

// Toutes les lignes font 16 colonnes, le sprite en fait 20, et chaque lettre
// existe dans la palette. Ce dernier point est le plus traître : une lettre
// absente ne lève AUCUNE erreur, le pixel est simplement ignoré, et le trou
// passe inaperçu au chargement.
function verifSprite(nom, rows, pal, bad) {
  if (rows.length !== 20) bad.push(nom + ' : ' + rows.length + ' lignes (attendu 20)');
  rows.forEach((l, i) => {
    if (l.length !== 16) bad.push(nom + '[' + i + '] : ' + l.length + ' colonnes (attendu 16)');
    for (const ch of l) if (ch !== '.' && !pal[ch]) {
      bad.push(nom + '[' + i + '] : lettre « ' + ch + ' » absente de la palette');
    }
    // Colonnes 14 et 15 réservées : le gabarit du roster tient en 12 px de
    // large, et un perso qui déborde ne s'aligne plus avec les autres.
    if (l.length >= 16 && (l[14] !== '.' || l[15] !== '.')) {
      bad.push(nom + '[' + i + '] : déborde à droite (colonnes 14-15 doivent rester vides)');
    }
  });
}

// La ZONE d'une section : combien de pixels distincts au moins une de ses
// variantes déplace par rapport à A. C'est la surface que la section commande
// réellement, et donc l'étalon auquel mesurer l'audace de chaque variante.
function zoneSection(variantes, spriteDe, spriteRef) {
  const touche = new Set();
  for (const va of variantes) {
    if (!va.tete && !va.corps) continue;
    const rows = spriteDe(va);
    for (let y = 0; y < Math.min(rows.length, spriteRef.length); y++) {
      for (let x = 0; x < 16; x++) if (rows[y][x] !== spriteRef[y][x]) touche.add(y * 16 + x);
    }
  }
  return touche.size;
}

// Combien de pixels séparent deux sprites. Sert au contrôle d'écart.
function distance(a, b) {
  let n = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    for (let j = 0; j < 16; j++) if (a[i][j] !== b[i][j]) n++;
  }
  return n;
}

/**
 * Passe un mockup au crible. Renvoie la liste des problèmes ; vide = tout va bien.
 *
 * @param {string} id        clé du personnage, pour retrouver ses traits obligatoires
 * @param {object} PERSO     { pal, tete, corps, dominante? }
 * @param {Array}  SECTIONS  le tableau de sections du mockup
 * @param {object} options   { variantesAttendues?: number }
 */
export function verifier({ id, PERSO, SECTIONS, options = {} }) {
  const bad = [];
  const attendu = options.variantesAttendues || 10;

  for (const s of SECTIONS) {
    if (!s.note || s.note.trim().length < DESC_MIN) {
      bad.push(s.id + ' : la section n\'explique pas ce qu\'on y juge');
    }
    if (s.variantes.length !== attendu) {
      bad.push(s.id + ' : ' + s.variantes.length + ' variantes (attendu ' + attendu + ')');
    }

    const vus = new Map();
    const refA = s.variantes[0];
    const spriteDe = va => [...(va.tete || PERSO.tete), ...(va.corps || PERSO.corps)];
    const spriteRef = spriteDe(refA);

    // Surface réellement commandée par la section, puis écart exigé de chacune.
    const zone = zoneSection(s.variantes, spriteDe, spriteRef);
    const exige = Math.max(ECART_PLANCHER, Math.round(zone * PART_ZONE));
    if (zone > 0 && zone < ZONE_MIN) {
      bad.push(s.id + ' : toutes les variantes réunies ne déplacent que ' + zone
               + ' px — la section ne propose aucun vrai parti pris');
    }
    for (const va of s.variantes) {
      if (!va.nom || !va.nom.trim()) bad.push(s.id + '-' + va.id + ' : pas de nom');
      if (!va.desc || va.desc.trim().length < DESC_MIN) {
        bad.push(s.id + '-' + va.id + ' : explication manquante ou trop courte — dire l\'allure ET l\'avantage/inconvénient');
      }
      if (!va.tete && !va.corps && !va.pal) continue;   // section d'effet ou de stats

      const pal = { ...PERSO.pal, ...(va.pal || {}) };
      const rows = spriteDe(va);
      verifSprite(s.id + '-' + va.id, rows, pal, bad);

      // Une variante qui ne change QUE la palette a, par construction, le même
      // sprite que les autres : ni le contrôle de doublon ni celui d'écart ne
      // s'y appliquent. C'est la teinte qui les distingue, pas la forme.
      const teinteSeule = !!va.pal && !va.tete && !va.corps;
      if (teinteSeule) continue;

      // Doublon strict. La comparaison DOIT être sensible à la casse : 'K' et
      // 'k' sont deux couleurs différentes, et une comparaison insensible les
      // confondait, signalant comme identiques des variantes qui allaient bien.
      const cle = rows.join('|');
      if (vus.has(cle)) bad.push(s.id + ' : ' + va.id + ' est identique à ' + vus.get(cle));
      else vus.set(cle, va.id);
    }

    // Écart DEUX À DEUX. Chaque paire de variantes doit se distinguer, pas
    // seulement s'éloigner de A. On ne liste que les quatre pires paires par
    // section : au-delà le rapport devient illisible et le nombre, décoratif.
    const graph = s.variantes.filter(v => v.tete || v.corps);
    const proches = [];
    for (let i = 0; i < graph.length; i++) {
      for (let j = i + 1; j < graph.length; j++) {
        const d = distance(spriteDe(graph[i]), spriteDe(graph[j]));
        // d === 0 est déjà signalé, et nommé, par le contrôle de doublon.
        if (d > 0 && d < exige) proches.push({ d, a: graph[i].id, b: graph[j].id });
      }
    }
    proches.sort((x, y) => x.d - y.d);
    for (const pr of proches.slice(0, 4)) {
      bad.push(s.id + ' : ' + pr.a + ' et ' + pr.b + ' se ressemblent (' + pr.d
               + ' px d’écart, ' + exige + ' exigés sur les ' + zone
               + ' que la section commande)');
    }
    if (proches.length > 4) {
      bad.push(s.id + ' : ' + (proches.length - 4) + ' autres paires trop proches');
    }
  }

  // Assez de valeurs sur la couleur dominante ? Avec deux tons seulement, un
  // personnage devient un aplat où le volume ne se lit pas. Constaté sur Yuki
  // (blanc sur 2 tons) puis sur Yoshi (vert sur 1 ton).
  if (PERSO.dominante) {
    const n = new Set([...PERSO.dominante].filter(c => PERSO.pal[c])).size;
    if (n < 3) bad.push('palette : la couleur dominante n\'a que ' + n
                        + ' valeur(s) — il en faut au moins 3 pour que le volume se lise');
  }

  // Traits obligatoires du personnage : la parade aux régressions.
  const traits = TRAITS[id] || [];
  const base = [...PERSO.tete, ...PERSO.corps];
  for (const t of traits) {
    let ok = false;
    try { ok = t.test(base); } catch (e) { ok = false; }
    if (!ok) bad.push('RÉGRESSION — ' + t.nom + ' a disparu (' + t.pourquoi + ')');
  }

  return bad;
}

/** Rend le rapport dans la boîte #errs du mockup. */
export function afficher(bad, boite, options = {}) {
  const max = options.max || 22;
  boite.textContent = bad.length
    ? bad.length + ' à corriger :\n' + bad.slice(0, max).join('\n')
        + (bad.length > max ? '\n…' : '')
    : 'OK — gabarit tenu, palettes complètes, descriptions écrites, variantes'
      + ' assez différentes, et tous les traits obligatoires du personnage sont là.';
  boite.className = bad.length ? 'bad' : '';
  return bad.length === 0;
}
