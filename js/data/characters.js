// Registre des personnages. Pour ajouter un perso : une palette, ses lignes de sprite,
// puis une entrée dans CHARS + son id dans ROSTER. `ult` pointe vers une clé de data/specials.js.
export function buildSprite(rows, pal) {
  const c = document.createElement('canvas');
  c.width = 16; c.height = rows.length;
  const g = c.getContext('2d');
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch !== '.') { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); }
    }
  });
  return c;
}

// K : le noir du bandeau, de la veste et des sandales — un vrai noir, pas un bleu marine.
// P : l'orange du pantalon, volontairement plus terne que le O de la veste pour
//     que les deux se distinguent. w : les moustaches.
const PAL_N = { H: '#ffd23e', h: '#e2a71c', M: '#d9dfe8', S: '#f8c890', s: '#d99a63', w: '#c08050', E: '#173e8f', O: '#ff8c1a', o: '#d96b08', W: '#f2f2f5', K: '#1e1e24', P: '#e5730f' };
// K : le gilet pare-balles, la ceinture et les rangers. V : les manches gris clair
// et la boucle. W : le marquage R.P.D., découpé en 3 points pour lire 3 lettres.
// J est un bleu volontairement un peu clair : sans ça Leon devient une masse noire
// sur le fond spatial déjà sombre.
const PAL_L = { L: '#7a4f2c', l: '#4e2f18', S: '#f0c090', s: '#cf9660', E: '#2c2a26', J: '#42537d', j: '#26314d', V: '#b3bac6', B: '#e8b83a', W: '#eef1f6', D: '#2f3b59', K: '#1b1f2a' };
// Pas de contour noir : il dénaturait le jeu et rendait Isaac étranger aux deux
// autres persos. À la place, deux tons de peau foncée — 'a' pour tout le pourtour,
// 'b' réservé aux creux d'ombre (sous le cou, aisselles, entre les jambes).
// Le noir ne sert plus qu'aux yeux (E) et à la bouche (K) : sans eux, un visage
// sans cheveux ni vêtements n'a plus aucun trait. T : les larmes, permanentes.
const PAL_I = { S: '#f2cfcb', a: '#e2b8b4', b: '#c08c88', E: '#151013', T: '#8fd8e8', W: '#ffffff', K: '#151013' };

// Tête partagée par les 4 poses : tignasse en pics (sa signature), bandeau noir
// à plaque, moustaches d'1 px par joue.
// Les yeux sont volontairement décalés d'un pixel à droite du centre de la tête :
// sans ça le visage regarde à gauche en permanence et le miroir horizontal
// (render.js, p.face) ne se lit pas. Sprite naturel = tourné vers la droite.
const N_HEAD = ["...hH.HH.Hh.....", "..HHHHHHHHHH....", ".hHHHHHHHHHHh...", "..hHHHHHHHHh....", "..KKKKKKKKKK....", "..KKMMMMMMKK....", "..SSSSSSSSSS....", "..SSSESSSSES....", "..swSSSSSSws....", "...SSSSSSSS....."];
// Veste Shippuden : col et épaules noirs, fermeture éclair noire au centre,
// bande noire au-dessus de la ceinture, puis pantalon orange à bande blanche
// (jambe gauche) et sandales noires.
const N_IDLE_B = ["....KKKKKK......", "..KKKKKKKKKK....", ".SKKKKKKKKKKS...", ".SOOOOKKOOOOS...", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..KKK....KKK...."];
const N_RUN1_B = ["....KKKKKK......", "..KKKKKKKKKK....", ".SKKKKKKKKKK....", "...OOOKKOOOOS...", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "..PP......PP....", ".WW........PP...", ".PP........PP...", "KKK........KKK.."];
const N_RUN2_B = ["....KKKKKK......", "..KKKKKKKKKK....", "...KKKKKKKKKS...", ".SKOOOKKOOOO....", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..KKK....KKK...."];
const N_THROW_B = ["....KKKKKK......", "..KKKKKKKKKK....", "..KKKKKKKKKKSS..", "..OOOOKKOOOOSS..", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "..PP.....PP.....", "..WW......PP....", ".PPP......PPP...", ".KKK......KKK..."];
// Pose de plongeon : bras tendus vers l'avant, jambes écartées et rejetées en
// arrière. Elle se distingue nettement de la course et du lancer, ce qui rend
// l'action lisible sans dépendre uniquement de la rotation.
const N_DIVE_B = ["....KKKKKK......", "..KKKKKKKKKKSS..", "..KKKKKKKKKKSS..", "..OOOOKKOOOO....", "..OOOOKKOOOO....", "..KKKKKKKKKK....", ".PPPP...PPPP....", "PPP......PPP....", "KK........KK....", "................"];
// Pose de dash : bras rejetés en arrière et buste ramassé, jambes en ciseau.
// Sans elle, dasher réutilisait la pose de course et l'élan ne se lisait pas.
const N_DASH_B = ["....KKKKKK......", "SSKKKKKKKKKK....", "SSKKKKKKKKKK....", "..OOOOKKOOOO....", "..OOOOKKOOOO....", "..KKKKKKKKKK....", "..PP..PP........", ".WW..PP.........", "PP..PP..........", "KK..KK.........."];

// Tête partagée : coupe à raie au milieu, les cheveux encadrent le visage des deux côtés.
// Yeux décalés d'un pixel à droite, même raison que pour Naruto : c'est ce qui
// rend le miroir horizontal lisible quand il se tourne vers la souris.
const L_HEAD = ["....lLLLLl......", "...LLLLLLLL.....", "..LLLLLLLLLL....", "..LLLLllLLLL....", "..LLSSSSSSLL....", "..LSSSSSSSSL....", "..SSSESSSSES....", "..SSSSSSSSSS....", "...SSSSSSSS.....", "....JJJJJJ......"];
// Gilet pare-balles noir montant jusqu'aux épaules, R.P.D. en 3 points, ceinture
// dégagée sous le gilet, protège-genoux à la largeur de la jambe (sans déborder).
const L_IDLE_B = ["..KKKKKKKKKB....", ".VKKKKKKKKKKV...", ".VKKWKWKWKKKV...", ".SKKKKKKKKKKS...", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "...DD....DD.....", "...KK....KK.....", "...DD....DD.....", "..KKK....KKK...."];
const L_RUN1_B = ["..KKKKKKKKKB....", ".VKKKKKKKKKK....", "...KWKWKWKKKV...", "..KKKKKKKKKKS...", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "..DD......DD....", "..KK......KK....", ".DD........DD...", "KKK........KKK.."];
const L_RUN2_B = ["..KKKKKKKKKB....", "...KKKKKKKKKV...", ".VKKWKWKWKKK....", "..KKKKKKKKKKS...", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "...DD....DD.....", "...KK....KK.....", "...DD....DD.....", "..KKK....KKK...."];
const L_THROW_B = ["..KKKKKKKKKB....", "..KKKKKKKKKKVV..", "..KKWKWKWKKKVV..", "..KKKKKKKKKK....", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "..DD.....DD.....", "..KK.....KK.....", ".DDD......DDD...", ".KKK......KKK..."];
const L_DIVE_B = ["..KKKKKKKKKB....", "..KKKKKKKKKKVV..", "..KKWKWKWKKKVV..", "..KKKKKKKKKK....", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", ".DDDD...DDDD....", "KKK......KKK....", "KK........KK....", "................"];
const L_DASH_B = ["..KKKKKKKKKB....", "VVKKKKKKKKKK....", "VVKKWKWKWKKK....", "..KKKKKKKKKK....", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "..DD..DD........", ".KK..DD.........", "DD..DD..........", "KK..KK.........."];

// Grosse tête ronde entièrement cernée de noir, yeux à reflet blanc, larmes permanentes.
// Isaac sert de gabarit de référence pour tout nouveau perso : tête sur 10 lignes,
// corps sur 10 lignes, largeur maximale 12 px (colonnes 1 à 12), bras jusqu'aux
// colonnes 1 et 12, jambes aux colonnes 3-4 et 9-10 — comme Naruto et Leon.
const I_HEAD = ["....aaaaaa......", "..aaSSSSSSaa....", ".aSSSSSSSSSSa...", ".aSSSSSSSSSSa...", ".aSSSSSSSSSSa...", ".aSSWESSSWESa...", ".aSSEESSSEESa...", ".aSSTSKKSTSSa...", "..aSTSSSSTSa....", "...bbbbbbbb....."];
// Les 'b' ne marquent que les trois creux d'ombre : haut du torse (sous le cou),
// aisselles et entrejambe. La dernière ligne perd ses pixels de coin pour arrondir
// les pieds, qui formaient sinon deux blocs carrés bien plus lourds que ceux des autres.
const I_IDLE_B = ["....bbbbbb......", "..aaSSSSSSaa....", ".aSSSSSSSSSSa...", ".aSSSSSSSSSSa...", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "...aa....aa....."];
const I_RUN1_B = ["....bbbbbb......", "..aaSSSSSSaa....", ".aSSSSSSSSSa....", "..aSSSSSSSSSa...", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", ".aSSb....bSSa...", ".aSSb....bSSa...", "..aa......aa...."];
const I_RUN2_B = ["....bbbbbb......", "..aaSSSSSSaa....", "..aSSSSSSSSSa...", ".aSSSSSSSSSa....", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "...aa....aa....."];
const I_THROW_B = ["....bbbbbb......", "..aaSSSSSSaa....", ".aSSSSSSSSSSaa..", ".aSSSSSSSSSSaa..", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "..aSSb..bSSa....", "...aa....aa....."];
const I_DIVE_B = ["....bbbbbb......", "..aaSSSSSSaaa...", ".aSSSSSSSSSSaa..", ".aSSSSSSSSSSaa..", "..bSSSSSSSSb....", "..aSSSSSSSSa....", ".aSSa....aSSa...", "aSSa......aSSa..", "aaa........aaa..", "................"];
const I_DASH_B = ["....bbbbbb......", "aaaSSSSSSaa.....", "aSSSSSSSSSSa....", ".aSSSSSSSSSa....", "..bSSSSSSSSb....", "..aSSSSSSSSa....", "..aSSa.aSSa.....", ".aSSa.aSSa......", "aSSa.aSSa.......", "aaa..aaa........"];

// G : l'or de la cloche qui lui tient lieu de tête. R : la bure cramoisie.
// V : le vert sapin de l'écharpe et du drapé. S : les pièces d'armure.
// Son visage n'existe pas : toute sa lisibilité tient à la silhouette de cloche.
// l : le vert clair de la bandoulière, qui doit trancher sur le vert sapin.
// d : l'or le plus sombre, réservé au bord droit de la cloche.
const PAL_J = { G: '#f5c542', g: '#c9992a', W: '#ffe9a0', d: '#8a6a15', R: '#a8232f', r: '#7a1620', V: '#1f5c3a', v: '#143f28', l: '#3fae70', S: '#b9c0cb', s: '#7e8794', K: '#241318' };

// Tête partagée : la cloche s'évase jusqu'au rebord, éclairée en haut à gauche
// et assombrie vers la droite pour lire comme du métal courbe. La dernière
// rangée ouvre l'écharpe rayée, qui se poursuit sur la première ligne du corps.
const J_HEAD = ["......WG........", ".....WgGg.......", ".....WGGg.......", "....WGGGgg......", "....WGGGgd......", "...WGGGGggd.....", "...WGGGGggd.....", "..gWGGGGgggd....", "..dgGGGgggdg....", "..RVRVRVRVRV...."];
// Écharpe rayée sur deux rangées (la seconde en tons foncés, ce qui lui donne
// son épaisseur), pans de cape verts sur les épaules, bandoulière vert clair
// en diagonale symétrique, plastron d'acier au centre, épaulières et bottes.
const J_IDLE_B = ["....rvrvrv......", "..SVvRVVRvVS....", ".SSVvVVVVvVSS...", ".SSlvVVVVvlSS...", "..rrlSssSlrr....", "..rRRlsSlRRr....", "...RRRllRRR.....", "...SS....SS.....", "...SS....SS.....", "..GSS....SSG...."];
const J_RUN1_B = ["....rvrvrv......", "..SVvRVVRvVS....", ".SSVvVVVVvVS....", "..SlvVVVVvlSS...", "..rrlSssSlrr....", "..rRRlsSlRRr....", "..RRRRllRRRR....", "..SS......SS....", ".SS........SS...", "GSS........SSG.."];
const J_RUN2_B = ["....rvrvrv......", "..SVvRVVRvVS....", "..SVvVVVVvVSS...", ".SSlvVVVVvlS....", "..rrlSssSlrr....", "..rRRlsSlRRr....", "...RRRllRRR.....", "...SS....SS.....", "...SS....SS.....", "..GSS....SSG...."];
const J_THROW_B = ["....rvrvrv......", "..SVvRVVRvVS....", "..SVvVVVVvVSSS..", "..SlvVVVVvlSSS..", "..rrlSssSlrr....", "..rRRlsSlRRr....", "...RRRllRRR.....", "..SS.....SS.....", "..SS......SS....", ".GSS......SSG..."];
const J_DIVE_B = ["....rvrvrv......", "..SVvRVVRvVSS...", "..SVvVVVVvVSSS..", "..SlvVVVVvlSSS..", "..rrlSssSlrr....", "..rRRlsSlRRr....", ".RRRRRllRRR.....", ".SS......SS.....", "GS........SG....", "................"];
const J_DASH_B = ["....rvrvrv......", "SSSVvVVRRvVR....", "SSSVvVVVVvVR....", "..RlvVVVVvlR....", "..rrlSssSlrr....", "..rRRlsSlRRr....", "..RRRRllRR......", "..SS..SS........", ".SS..SS.........", "GSS.GSS........."];

// ---------------------------------------------------------------------------
// Cyberleek. Un poireau en armure tactique : les feuilles partent vers le haut
// et sur la droite, le fût pâle fait le visage, et tout le bas est bleu avec
// des liserés cyan. Les feuilles s'arrêtent à quatre rangées — elles montent
// beaucoup plus haut sur les visuels d'origine, mais un sprite fait vingt
// lignes en tout, et lui en donner huit reviendrait à supprimer les jambes.
// ---------------------------------------------------------------------------
const PAL_C = {
  L: '#8fe04a',   // feuille, face éclairée
  l: '#3f9b2e',   // feuille, face à l'ombre
  // Le fût tire volontairement sur le vert pâle. En crème il était presque
  // blanc, et la moustache — blanche elle aussi — s'y noyait : toute la rangée
  // se lisait comme une seule barre claire en travers du visage.
  W: '#dfeaa6',   // fût du poireau : le visage
  w: '#a8bb70',   // ombre du fût
  M: '#ffffff',   // moustache
  K: '#101a33',   // navy des plaques et de la monture
  B: '#2a6ef0',   // bleu vif de l'armure
  b: '#143a92',   // bleu sombre des articulations
  C: '#4fe8ff'    // cyan lumineux : verres, accents, mains
};

// Les verres sont décalés d'un pixel vers la droite, comme les yeux de tout le
// roster : c'est ce léger décentrage qui donne aux visages leur air vivant.
// Sa tête EST un poireau, feuilles comprises : le vert fait la moitié de la
// hauteur, comme le fût blanc d'un vrai poireau prolongé par son feuillage.
// D'où le partage inhabituel — douze rangées de tête, huit de corps, au lieu
// du dix-dix du reste du roster. Le sprite fait toujours vingt lignes, donc le
// moteur n'a rien à savoir de cette exception.
const C_HEAD = ["......lL........", ".....lLL........", ".....LLl........", "....lLL.........", "....LLl.........", "....wLw.........", "....wWw.........", "...wWWWw........", "..KKKKKKKKKK....", "..KKCCKKKCCK....", "..wWWWMMMwWw....", "...wWWWWWWw....."];
// Armure tactique : épaulières et genouillères navy, plastron sombre au cœur
// cyan, et les mains qui luisent au bout des bras. Les bras sont bien des bras
// — hand, avant-bras, articulation — sinon les mains cyan flottaient à côté du
// torse comme deux blocs détachés.
const C_IDLE_B = ["..KKBBBBBBKK....", ".CBbKKKKKKbBC...", ".CBbKKCCKKbBC...", "..bBBBBBBBBb....", "...BB....BB.....", "...KK....KK.....", "...BB....BB.....", "..KKK....KKK...."];
const C_RUN1_B = ["..KKBBBBBBKK....", ".CBbKKKKKKbBC...", "..BbKKCCKKbB....", "..bBBBBBBBBb....", "..BB......BB....", ".KK........KK...", ".BB........BB...", "KKK........KKK.."];
const C_RUN2_B = ["..KBBBBBBBBK....", "..BbKKKKKKbB....", ".CBbKKCCKKbBC...", "..bBBBBBBBBb....", "....BB..BB......", "....KK..KK......", "....BB..BB......", "...KKK..KKK....."];
const C_THROW_B = ["..KKBBBBBBKK....", ".CBbKKKKKKbBBBC.", "..BbKKCCKKbBBB..", "..bBBBBBBBBb....", "...BB....BB.....", "...KK....KK.....", "..BB......BB....", "..KKK....KKK...."];
const C_DIVE_B = ["..KKBBBBBBKKCC..", ".CBbKKKKKKbBBB..", "..BbKKCCKKbBB...", ".bBBBBBBBBb.....", "..BB....BB......", ".KK......KK.....", "KK........KK....", "................"];
const C_DASH_B = ["CCKKBBBBBBKK....", "CCBbKKKKKKbB....", "..BbKKCCKKbB....", "..bBBBBBBBb.....", "..BB..BB........", ".KK..KK.........", ".BB..BB.........", "KKK.KKK........."];

// ---------------------------------------------------------------------------
// Skins de Naruto. Chaque tenue est décrite par deux choses :
//   - `idle`, dessiné à la main et validé pixel par pixel ;
//   - `teinte`, une correspondance de couleurs appliquée aux autres poses, pour
//     que la course, le tir, le dash et le plongeon restent cohérents sans
//     réécrire vingt-quatre sprites à l'aveugle.
// Les silhouettes ne bougent jamais : seules les couleurs changent.
// ---------------------------------------------------------------------------
const PAL_SKINS_N = {
  ...PAL_N,
  B: '#f4f1e6',   // blanc de cape
  R: '#c0272d',   // flammes et écharpe
  r: '#8f1a1f',
  X: '#e04a2a',   // brassard de The Last
  A: '#b52a2a',   // haori de l'Ermite
  a: '#7e1818',
  D: '#3b3f33',   // veste sombre de The Last
  d: '#24271f',
  V: '#4f7a4a',   // gilet de Minato
  v: '#375a34',
  u: '#284026',
  N: '#2a4a8f',
  n: '#1d3568',
  C: '#8a6a3a',   // sangle du parchemin
  Y: '#e8a020',   // œil de crapaud
  y: '#8a5a08'
};

function teinter(rows, corresp) {
  return rows.map(r => [...r].map(ch => corresp[ch] || ch).join(''));
}

const SKINS_N = {
  hokage: {
    tete: N_HEAD,
    idle: ["....BOooOB......", "..BBOOooOOBB....", ".BBBOOooOOBBB...", ".BBBOOooOOBBB...", "..BBKKKKKKBB....", "..RRKKKKKKRR....", "...KK....KK.....", "...KK....KK.....", "..KKK....KKK....", "..kkk....kkk...."],
    teinte: { K: 'B', P: 'K', W: 'K' }
  },
  ermite: {
    // Yeux de crapaud : la seule tenue qui touche aussi au visage.
    tete: teinter(N_HEAD, {}).map((r, i) => i === 7 ? "..SSyYSSSyYS...." : r),
    idle: ["....KKKKKK......", "..AAKKKKKKAA....", ".SACKKKKKKCAS...", ".SAOOOKKOOOAS...", "..AaOOKKOOaA....", "..AaAKKKKAaA....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..CCC....CCC...."],
    teinte: { K: 'A' }
  },
  thelast: {
    tete: N_HEAD,
    idle: ["....RRRRRR......", "..RRDdddddDR....", ".SXXDdddddDDS...", ".SDDDdddddDDS...", "..DDDdddddDD....", "..dddddddddd....", "...PP....PP.....", "...WW....PP.....", "..PPP....PPP....", "..KKK....KKK...."],
    teinte: { K: 'D', O: 'D', o: 'd' }
  },
  minato: {
    tete: N_HEAD,
    idle: ["....BVvvVB......", "..BBVVvvVVBB....", ".BBBVuvvuVBBB...", ".BBBVvvvvVBBB...", "..BBVVvvVVBB....", "..RRNNNNNNRR....", "...NN....NN.....", "...NN....NN.....", "..NNN....NNN....", "..nnn....nnn...."],
    teinte: { K: 'B', O: 'V', o: 'v', P: 'N', W: 'N' }
  }
};

// Construit les six poses d'un skin : l'idle validé tel quel, le reste teinté.
function construireSkin(s) {
  const corps = { run1: N_RUN1_B, run2: N_RUN2_B, throw: N_THROW_B, dive: N_DIVE_B, dash: N_DASH_B };
  const out = { idle: buildSprite([...s.tete, ...s.idle], PAL_SKINS_N) };
  for (const [nom, base] of Object.entries(corps)) {
    out[nom] = buildSprite([...s.tete, ...teinter(base, s.teinte)], PAL_SKINS_N);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Skins de Leon. Chez lui ce ne sont pas des recolorations : ce sont quatre
// vêtements différents, repris des jeux d'origine.
//   1998     — la combinaison bleue, épaulières et gros marquage R.P.D.
//   RE4      — le blouson de cuir à col en peau de mouton sur chemise olive.
//   Darkside — le gilet tactique olive à bretelles, sur t-shirt noir.
//   Requiem  — le manteau noir à double boutonnage, entrouvert sur le t-shirt.
//
// Trois lignes du corps sont identiques d'une pose à l'autre chez Leon : le
// haut du buste, la bande de chemise et la ceinture. On y recopie la tenue
// telle quelle. Les lignes qui bougent sont recolorées, et les détails qui
// font reconnaître le vêtement — marquage, bretelles, t-shirt — sont
// réinjectés colonne par colonne pour survivre à la course et au plongeon.
// Sans ça, un skin de Leon ne se lirait que sur la pose immobile.
// ---------------------------------------------------------------------------
const PAL_SKINS_L = {
  ...PAL_L,
  U: '#3f5fa8', u: '#2a3f73',   // les bleus de 1998
  A: '#9aa0ad',                 // épaulières grises
  m: '#57301a',                 // cuir sombre du blouson
  F: '#dcc49a', f: '#ab8f68',   // col en peau de mouton
  N: '#26262b',                 // t-shirt noir
  C: '#3d4136', c: '#565c47',   // cargo et poches
  g: '#556a2f',                 // vert militaire
  Q: '#2b2d34', q: '#181a20',   // manteau de Requiem
  Y: '#565b66'                  // gris ardoise : col, boutons, t-shirt
};

// Les 9 premières lignes de la tête. La 10e est le col : il change avec la
// tenue, c'est lui qui raccorde le visage au vêtement.
const L_TETE = L_HEAD.slice(0, 9);
// RE4 : les mèches descendent et encadrent le visage.
const L_TETE_RIDEAU = ["....lLLLLl......", "...LLLLLLLL.....", "..LLLLLLLLLL....", "..LLLLllLLLL....", "..LLLSSSSLLL....", "..LLSSSSSSLL....", "..LSSESSSSEL....", "..SSSSSSSSSS....", "...SSSSSSSS....."];
// Requiem : mêmes mèches longues, plus la barbe de trois jours.
const L_TETE_REQUIEM = ["....lLLLLl......", "...LLLLLLLL.....", "..LLLLLLLLLL....", "..LLLLllLLLL....", "..LLLSSSSLLL....", "..LLSSSSSSLL....", "..LSSESSSSEL....", "..SsSSSSSSsS....", "...lsSSSSsl....."];
function teteL(haut, col) { return [...haut, '....' + col.repeat(6) + '......']; }

const SKINS_L = {
  re2: {
    tete: teteL(L_TETE, 'U'),
    idle: ["..AUUUUUUUUA....", ".VUUUUUUUUUUV...", ".VUUWWWWWWUUV...", ".SUUUUUUUUUUS...", "..JJJJJJJJJJ....", "..KKKKVKKKKK....", "...uu....uu.....", "...uu....uu.....", "...uu....uu.....", "..KKK....KKK...."],
    tissu: 'U', teinte: { K: 'U' }, jambe: 'u',
    // Le marquage R.P.D. d'origine était bien plus large que celui du remake.
    colonnes: { 2: { 4: 'W', 5: 'W', 6: 'W', 7: 'W', 8: 'W', 9: 'W' } }
  },
  re4: {
    tete: teteL(L_TETE_RIDEAU, 'f'),
    idle: ["..fFFFFFFFFf....", ".mmmmggggmmmm...", ".mmmmggggmmmm...", ".NmmmggggmmmN...", "..mmmggggmmm....", "..CCCCVCCCCC....", "...CC....CC.....", "...cc....cc.....", "...CC....CC.....", "..KKK....KKK...."],
    tissu: 'm', teinte: { K: 'm', W: 'm', V: 'm', B: 'f', J: 'g' }, jambe: 'C',
    // La chemise olive reste visible dans l'ouverture du blouson.
    colonnes: { 1: { 5: 'g', 6: 'g', 7: 'g', 8: 'g' }, 2: { 5: 'g', 6: 'g', 7: 'g', 8: 'g' }, 3: { 5: 'g', 6: 'g', 7: 'g', 8: 'g' } }
  },
  darkside: {
    tete: teteL(L_TETE, 'g'),
    idle: ["..ggCggggCgg....", ".NggCggggCggN...", ".SggCggggCggS...", ".SggCggggCggS...", "..NNNNNNNNNN....", "..CCCCVCCCCC....", "...Cc....cC.....", "...cC....Cc.....", "...Cc....cC.....", "..KKK....KKK...."],
    tissu: 'g', teinte: { K: 'g', W: 'g', B: 'g', V: 'S', J: 'N' }, jambe: 'C',
    // Les deux bretelles du gilet, des épaules au ceinturon.
    colonnes: { 1: { 4: 'C', 9: 'C' }, 2: { 4: 'C', 9: 'C' }, 3: { 4: 'C', 9: 'C' } }
  },
  requiem: {
    tete: teteL(L_TETE_REQUIEM, 'Y'),
    idle: ["..YQQQQQQQQY....", ".QQQQqYYqQQQQ...", ".QQQQqYYqQQQQ...", ".SQQQqYYqQQQS...", "..QQQqYYqQQQ....", "..QQQQVQQQQQ....", "..QQQQ..QQQQ....", "...qq....qq.....", "...qq....qq.....", "..KKK....KKK...."],
    tissu: 'Q', teinte: { K: 'Q', W: 'Q', V: 'Q', B: 'Q', J: 'Q' }, jambe: 'q',
    // Le t-shirt entre les deux rangées de boutons.
    colonnes: { 1: { 5: 'q', 6: 'Y', 7: 'Y', 8: 'q' }, 2: { 5: 'q', 6: 'Y', 7: 'Y', 8: 'q' }, 3: { 5: 'q', 6: 'Y', 7: 'Y', 8: 'q' } }
  }
};

// Repose un détail sur des colonnes précises, mais seulement là où le pixel
// appartient déjà au vêtement : les bras, les mains et le vide sont épargnés,
// donc la silhouette de la pose ne bouge pas d'un pixel.
function injecter(ligne, cols, tissu) {
  if (!cols) return ligne;
  return [...ligne].map((ch, x) => (ch === tissu && cols[x]) ? cols[x] : ch).join('');
}

function construireSkinL(s) {
  const poses = { run1: L_RUN1_B, run2: L_RUN2_B, throw: L_THROW_B, dive: L_DIVE_B, dash: L_DASH_B };
  const out = { idle: buildSprite([...s.tete, ...s.idle], PAL_SKINS_L) };
  for (const [nom, base] of Object.entries(poses)) {
    const corps = base.map((ligne, i) => {
      // Buste, bande de chemise et ceinture : identiques dans les six poses.
      if (i === 0 || i === 4 || i === 5) return s.idle[i];
      // Jambes : seul le pantalon change, les rangers restent noires.
      if (i >= 6) return teinter([ligne], { D: s.jambe })[0];
      return injecter(teinter([ligne], s.teinte)[0], s.colonnes[i], s.tissu);
    });
    out[nom] = buildSprite([...s.tete, ...corps], PAL_SKINS_L);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tenue Six Paths de Naruto, portée le temps de son ultime.
// Manteau de chakra doré, col et ceinture sombres, ouverture du manteau au
// centre. Les yeux passent en or sombre : en or vif ils disparaissaient
// purement et simplement du visage, noyés dans les cheveux de la même couleur.
//
// Le col, la bande de chemise et la ceinture occupent trois lignes identiques
// dans les six poses : on les recopie telles quelles. Le reste est recoloré, et
// l'ouverture du manteau est réinjectée colonne par colonne, sinon elle
// n'existerait que sur la pose immobile — or l'ultime se joue en mouvement.
// ---------------------------------------------------------------------------
const PAL_SIX = { ...PAL_N, G: '#ffd76b', n: '#3a2f14', E: '#7a4e05' };
const SIX_IDLE_B = ["....nnnnnn......", "..GGGGnnGGGG....", ".SGGGGnnGGGGS...", ".SGGGGnnGGGGS...", "..GGGGnnGGGG....", "..nnnnnnnnnn....", "...GG....GG.....", "...WW....GG.....", "..GGG....GGG....", "..nnn....nnn...."];
const SIX_BUSTE = { K: 'G', O: 'G', o: 'G' };
const SIX_JAMBE = { P: 'G', K: 'n' };
const SIX_OUVERTURE = { 6: 'n', 7: 'n' };

function construireSixPaths() {
  const poses = { run1: N_RUN1_B, run2: N_RUN2_B, throw: N_THROW_B, dive: N_DIVE_B, dash: N_DASH_B };
  const out = { idle: buildSprite([...N_HEAD, ...SIX_IDLE_B], PAL_SIX) };
  for (const [nom, base] of Object.entries(poses)) {
    const corps = base.map((ligne, i) => {
      if (i === 0 || i === 4 || i === 5) return SIX_IDLE_B[i];
      if (i >= 6) return teinter([ligne], SIX_JAMBE)[0];
      return injecter(teinter([ligne], SIX_BUSTE)[0], SIX_OUVERTURE, 'G');
    });
    out[nom] = buildSprite([...N_HEAD, ...corps], PAL_SIX);
  }
  return out;
}

export const ROSTER = ['naruto', 'isaac', 'leon', 'jingle', 'cyberleek'];

export const CHARS = {
  naruto: {
    name: 'NARUTO UZUMAKI', short: 'NARUTO', icon: '🍥', universe: 'KONOHA',
    speed: 352, power: .95, catchR: 27, chargeT: .72,
    color: '#ff8c1a', accent: '#ffd23e',
    stats: { spd: 5, pow: 3, ctl: 4 },
    ult: 'kurama',
    frames: {
      idle: buildSprite([...N_HEAD, ...N_IDLE_B], PAL_N),
      run1: buildSprite([...N_HEAD, ...N_RUN1_B], PAL_N),
      run2: buildSprite([...N_HEAD, ...N_RUN2_B], PAL_N),
      throw: buildSprite([...N_HEAD, ...N_THROW_B], PAL_N),
      dive: buildSprite([...N_HEAD, ...N_DIVE_B], PAL_N),
      dash: buildSprite([...N_HEAD, ...N_DASH_B], PAL_N)
    },
    // Tenue portée pendant l'ultime seulement, jamais choisissable.
    sixpaths: construireSixPaths(),
    skins: {
      shippuden: null,          // rempli juste après : c'est `frames` lui-même
      hokage: construireSkin(SKINS_N.hokage),
      ermite: construireSkin(SKINS_N.ermite),
      thelast: construireSkin(SKINS_N.thelast),
      minato: construireSkin(SKINS_N.minato)
    }
  },
  isaac: {
    name: 'ISAAC', short: 'ISAAC', icon: '💧', universe: 'LE SOUS-SOL',
    speed: 330, power: .88, catchR: 30, chargeT: .8,
    color: '#7fd8ff', accent: '#bfe9ff',
    stats: { spd: 4, pow: 2, ctl: 5 },
    ult: 'leg',
    frames: {
      idle: buildSprite([...I_HEAD, ...I_IDLE_B], PAL_I),
      run1: buildSprite([...I_HEAD, ...I_RUN1_B], PAL_I),
      run2: buildSprite([...I_HEAD, ...I_RUN2_B], PAL_I),
      throw: buildSprite([...I_HEAD, ...I_THROW_B], PAL_I),
      dive: buildSprite([...I_HEAD, ...I_DIVE_B], PAL_I),
      dash: buildSprite([...I_HEAD, ...I_DASH_B], PAL_I)
    }
  },
  leon: {
    name: 'LEON S. KENNEDY', short: 'LEON', icon: '🚔', universe: 'RACCOON CITY',
    speed: 306, power: 1.18, catchR: 31, chargeT: 1.0,
    color: '#3f8fe0', accent: '#9fe8ff',
    stats: { spd: 3, pow: 5, ctl: 4 },
    ult: 'matilda',
    frames: {
      idle: buildSprite([...L_HEAD, ...L_IDLE_B], PAL_L),
      run1: buildSprite([...L_HEAD, ...L_RUN1_B], PAL_L),
      run2: buildSprite([...L_HEAD, ...L_RUN2_B], PAL_L),
      throw: buildSprite([...L_HEAD, ...L_THROW_B], PAL_L),
      dive: buildSprite([...L_HEAD, ...L_DIVE_B], PAL_L),
      dash: buildSprite([...L_HEAD, ...L_DASH_B], PAL_L)
    },
    skins: {
      rpd: null,                // rempli juste après : c'est `frames` lui-même
      re2: construireSkinL(SKINS_L.re2),
      re4: construireSkinL(SKINS_L.re4),
      darkside: construireSkinL(SKINS_L.darkside),
      requiem: construireSkinL(SKINS_L.requiem)
    }
  },
  jingle: {
    name: 'JINGLE BELLS', short: 'JINGLE BELLS', icon: '🔔', universe: 'PÔLE NORD',
    // Profil défensif : lent et lourd, mais très sûr à la réception — sa large
    // bure lui donne la meilleure zone d'attrapé du jeu.
    speed: 296, power: 1.1, catchR: 33, chargeT: .95,
    // Sapin volontairement plus lumineux que le vert de sa tenue : délavé pour
    // le fond de sélection, l'ancien #1f5c3a virait au gris-vert terne.
    color: '#1f8a4d', accent: '#f5c542',
    stats: { spd: 2, pow: 4, ctl: 5 },
    ult: 'bell',
    frames: {
      idle: buildSprite([...J_HEAD, ...J_IDLE_B], PAL_J),
      run1: buildSprite([...J_HEAD, ...J_RUN1_B], PAL_J),
      run2: buildSprite([...J_HEAD, ...J_RUN2_B], PAL_J),
      throw: buildSprite([...J_HEAD, ...J_THROW_B], PAL_J),
      dive: buildSprite([...J_HEAD, ...J_DIVE_B], PAL_J),
      dash: buildSprite([...J_HEAD, ...J_DASH_B], PAL_J)
      // Sa tête qui lévite n'a pas besoin de frame dédiée : le rendu découpe
      // directement la pose courante entre la cloche et les épaules.
    }
  },

  cyberleek: {
    name: 'CYBERLEEK', short: 'CYBERLEEK', icon: '🥬', universe: '$CYBERLEEK',
    // Profil de perturbateur : vif et très sûr à la réception, mais le bras le
    // plus faible du roster. Il ne gagne pas en frappant, il gagne en prenant
    // la main sur l'adversaire — sa puissance est basse à dessein.
    speed: 344, power: .86, catchR: 30, chargeT: .66,
    color: '#2a6ef0', accent: '#4fe8ff',
    stats: { spd: 4, pow: 2, ctl: 5 },
    ult: 'piratage',
    frames: {
      idle: buildSprite([...C_HEAD, ...C_IDLE_B], PAL_C),
      run1: buildSprite([...C_HEAD, ...C_RUN1_B], PAL_C),
      run2: buildSprite([...C_HEAD, ...C_RUN2_B], PAL_C),
      throw: buildSprite([...C_HEAD, ...C_THROW_B], PAL_C),
      dive: buildSprite([...C_HEAD, ...C_DIVE_B], PAL_C),
      dash: buildSprite([...C_HEAD, ...C_DASH_B], PAL_C)
    }
  }
};

export function portraitURL(ck) {
  const f = CHARS[ck].frames.idle;
  const c = document.createElement('canvas');
  c.width = f.width * 6; c.height = f.height * 6;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(f, 0, 0, c.width, c.height);
  return c.toDataURL();
}

// La tenue d'origine est un skin comme les autres : elle pointe simplement sur
// les sprites de base, ce qui évite de les dupliquer.
CHARS.naruto.skins.shippuden = CHARS.naruto.frames;
CHARS.leon.skins.rpd = CHARS.leon.frames;
