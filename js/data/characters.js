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
// Mamie Trayette. Une grand-mère vétérane en treillis, pas une mamie en
// cardigan : le premier jet (cape rouge pointue sur bloc blanc) se lisait
// comme un costume de super-héros, d'où la silhouette arrondie et le vert
// militaire dominant. Le bandana rouge (R) est le seul reste du Petit
// Chaperon Rouge. `O` est volontairement une lettre distincte de `G` : le
// gris ne sert qu'aux cheveux, sinon le treillis les repeindrait en vert.
// ---------------------------------------------------------------------------
const PAL_M = {
  G: '#d9d9dd', g: '#a9a9b0',   // cheveux gris / ombre
  S: '#eccba3', s: '#c99b6e',   // peau / ombre
  E: '#241f1c',                 // lunettes et yeux
  O: '#6b7a3d', o: '#48532a',   // treillis olive / ombre
  W: '#c9b380', w: '#a8925c',   // tissu kaki du torse / ombre
  R: '#b3272d', r: '#7a1a1e',   // bandana rouge / ombre
  K: '#241f1c',                 // bouche
  n: '#2b2320',                 // rangers
  c: '#e8a882',                 // joues
  p: '#c9ccd1',                 // plaques militaires
  x: '#5a4a2e'                  // taches de camouflage
};

// Tête partagée : cheveux détachés avec barrette, lunettes, bandana au cou.
// Yeux décalés d'un pixel à droite comme tout le roster, sinon le miroir
// horizontal (render.js, p.face) ne se lit pas quand elle vise à la souris.
const M_HEAD = ["....GGGG........", "..GGGGGGGG......", ".GGpSSSSSSGG....", ".GSSSSSSSSSG....", ".GSSSSSSSSSG....", "..SSEESSEESS....", "..SScSSSScSS....", "..SSSSSKKSSS....", ".GGSSSSSSSSGG...", "..GRRRRRRRRG...."];
// Veste olive ouverte sur un maillot kaki, plaques militaires au centre,
// mains (S) visibles à hauteur d'épaule pour que les bras existent.
// Les taches de camouflage (x) sont placées à la main, en petits amas
// irréguliers : générées en damier sur une case sur deux, elles se lisaient
// comme des rayures régulières et pas comme du camo.
const M_IDLE_B = ["...OOxxOOOO.....", "SOORROxOOOOS....", ".OOWxxWWWOO.....", ".OWWwppwWWWO....", "..OWWWWxxWO.....", "..OOWxWWWWOO....", "..OOo....oOO....", "..OOo....oOO....", "..OOo....oOO....", "...nn....nn....."];
const M_RUN1_B = ["...OOxxOOOO.....", "SOORROxOOOOS....", ".OOWxxWWWOO.....", ".OWWwppwWWWO....", "..OWWWWxxWO.....", "..OOWxWWWWOO....", "..OOo......oOO..", ".OOo........oOO.", ".OOo........oOO.", "..nn........nn.."];
const M_RUN2_B = ["...OOxxOOOO.....", "SOORROxOOOOS....", "..OOWxWWWWOO....", ".OWWwppwWWWO....", "..OWWWWxxWO.....", "..OOWxWWWWOO....", "..OOo....oOO....", "..OOo....oOO....", "..OOo....oOO....", "...nn....nn....."];
const M_THROW_B = ["...OOxxOOOO.....", ".OORROxOOOOSS...", ".OOWxxWWWOOSS...", ".OWWwppwWWWO....", "..OWWWWxxWO.....", "..OOWxWWWWOO....", "..OOo...oOO.....", "..OOo...oOO.....", ".OOo.....oOO....", "..nn.....nn....."];
const M_DIVE_B = ["...OOxxOOOO.....", "SOORROxOOOOSS...", ".OOWxxWWWOOSS...", ".OWWwppwWWWO....", "..OWWWWxxWO.....", "..OOWxWWWWOO....", ".OOOo...oOOO....", "OOo......oOO....", "nn........nn....", "................"];
const M_DASH_B = ["...OOxxOOOO.....", "SSOORROxOOOO....", "SSOOWxWWWWOO....", ".OWWwppwWWWO....", "..OWWWWxxWO.....", "..OOWxWWWWOO....", "..OOo.oOO.......", ".OOo.oOO........", "OOo.oOO.........", "nn..nn.........."];

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
  S: '#a8ecff',   // le sourire, cyan comme les verres
  K: '#101a33',   // navy des plaques et de la monture
  B: '#2a6ef0',   // bleu vif de l'armure
  b: '#143a92',   // bleu sombre des articulations
  C: '#4fe8ff'    // cyan lumineux : verres, accents, mains
};

// Les verres sont décalés d'un pixel vers la droite, comme les yeux de tout le
// roster : c'est ce léger décentrage qui donne aux visages leur air vivant.
// Sa tête EST un poireau : un fût blanc large, qui monte haut au-dessus des
// lunettes avant de se resserrer, coiffé d'un feuillage court et penché à
// gauche. D'où le partage inhabituel — douze rangées de tête, huit de corps,
// au lieu du dix-dix du reste du roster. Le sprite fait toujours vingt lignes,
// donc le moteur n'a rien à savoir de cette exception.
// Le fût s'évase doucement vers les lunettes, de cinq à huit pixels. Élargi
// jusqu'à la largeur des verres il devenait un crâne triangulaire ; laissé à
// trois pixels il n'était plus qu'une mèche posée sur une tête normale. Entre
// les deux, on lit le poireau.
const C_HEAD = ["..lLLl..........", ".lLLLLl.........", ".lLLLLLl........", "..lLLLLl........", "...wWWWw........", "...wWWWWw.......", "..wWWWWWw.......", "..wWWWWWWw......", "..KKKKKKKKKK....", "..KKCCKKKCCK....", "..wWSSwwSSWw....", "...wWWWWWWw....."];
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

// ---------------------------------------------------------------------------
// Chopper. Le colosse de Junkertown, masque à gaz et crochet au bout d'une
// chaîne. Il ne dépasse pas le gabarit commun de 12 px de large — il le
// REMPLIT là où les autres en occupent huit. C'est la masse qui le distingue,
// pas la taille : lui donner une boîte plus grande l'aurait rendu inutilisable
// avec le reste du casting.
// ---------------------------------------------------------------------------
const PAL_CH = {
  H: '#e8e0c8', h: '#b9ae90',   // touffe de cheveux décolorée / ombre
  M: '#4a4a52', m: '#2e2e34',   // caoutchouc du masque / creux du groin
  // Ton intermédiaire réservé au pourtour du masque. Réutiliser le 'm' du
  // groin donnait un liseré aussi sombre que lui : ça se lisait comme le
  // contour noir qu'on s'interdit, et le groin ne se détachait plus.
  o: '#3b3b43',                 // galbe du masque, à mi-chemin
  L: '#cfd8e2',                 // verres ronds du masque
  S: '#d9a17c', s: '#ad7452',   // peau / ombre
  E: '#241f1c',                 // yeux, si un jour on le démasque
  T: '#e0762c', t: '#a84a12',   // tatouage du ventre / ombre
  V: '#3f342a', v: '#241c15',   // cuir du gilet / ombre
  K: '#1c1c20',                 // sangles noires, ceinture
  J: '#42506a', j: '#2a3345',   // treillis / ombre
  Y: '#e8c23a', y: '#a08320',   // bonbonne jaune / ombre
  W: '#c8ccd4',                 // acier : pointes, brassards, crochet, plaque
  n: '#2b2320'                  // bottes
};

// Tête partagée : verres ronds et groin saillant, tous deux décalés d'un pixel
// à DROITE du centre — c'est le côté vers lequel il regarde, et sans ce
// décalage le miroir horizontal (render.js, p.face) ne se lit pas quand il
// vise à la souris. Les 'Y' sont les filtres du masque.
const CH_HEAD = [".....hHHh.......","....oMMMMMo.....","...oMMMMMMMo....","..oMMMMMMMMMo...","..oMMLLMMMLLo...","..oMMLLMMMLLo...",".YoMMMMMMMMoY...",".yoMMMmmmmmoy...","....MMmmmmmM....","...KKKKKKKKK...."];
// Corps : le pneu en travers du dos (m/M, à gauche puisque le sprite est
// tourné vers la droite), les pointes de l'épaulière et les brassards en
// acier, la bonbonne jaune, le gilet à sangles, et le ventre tatoué laissé nu
// — c'est lui qui porte toute la masse du personnage.
const CH_IDLE_B  = [".WmWmVVVVVYy....",".mMmmVKKKKVYy...",".WmmVKTTTTKVW...",".SSSSTTTTTTSS...",".SSSTTTTTTTSS...","..SSSSSSSSSS....","..KKWWWWWWKK....",".JJj......jJJ...",".JJj......jJJ...",".nnn......nnn..."];
const CH_RUN1_B  = [".WmWmVVVVVYy....",".mMmmVKKKKVYy...",".WmmVKTTTTKVW...",".SSSSTTTTTTSS...",".SSSTTTTTTTSS...","..SSSSSSSSSS....","..KKWWWWWWKK....","..JJj.....jJJ...",".JJj.......jJJ..",".nnn.......nnn.."];
const CH_RUN2_B  = [".WmWmVVVVVYy....",".mMmmVKKKKVYy...",".WmmVKTTTTKVW...",".SSSSTTTTTTSS...",".SSSTTTTTTTSS...","..SSSSSSSSSS....","..KKWWWWWWKK....","...JJj...jJJ....","...JJj...jJJ....","...nnn...nnn...."];
const CH_THROW_B = [".WmWmVVVVVYyS...",".mMmmVKKKKVYyS..",".WmmVKTTTTKVWW..",".SSSSTTTTTTSS...",".SSSTTTTTTTSS...","..SSSSSSSSSS....","..KKWWWWWWKK....",".JJj......jJJ...",".JJj......jJJ...",".nnn......nnn..."];
const CH_DIVE_B  = [".WmWmVVVVVYySS..",".mMmmVKKKKVYyS..",".WmmVKTTTTKVW...",".SSSSTTTTTTSS...",".SSSTTTTTTTSS...","..SSSSSSSSSS....","..KKWWWWWWKK....",".JJJj...jJJJ....","JJj.......jJJ...","nn.........nn..."];
const CH_DASH_B  = ["SWmWmVVVVVYy....","SmMmmVKKKKVYy...",".WmmVKTTTTKVW...",".SSSSTTTTTTSS...",".SSSTTTTTTTSS...","..SSSSSSSSSS....","..KKWWWWWWKK....","..JJj..jJJ......",".JJj..jJJ.......",".nnn..nnn......."];

// ---------------------------------------------------------------------------
// Yuki. Loup blanc de Michou, doudoune noire au kanji 雪 (« neige »).
// Deux partis pris de dessin qui ont demandé une reprise complète :
// 1. Un personnage blanc a besoin de QUATRE valeurs, pas deux. Avec seulement
//    « blanc + ombre » le visage était un aplat où le museau ne se lisait pas.
//    D'où W (haute lumière), s (ton moyen), w (ombre) et g (creux).
// 2. La doudoune est OUVERTE et COURTE, comme sur les visuels : deux panneaux
//    noirs sur les côtés, le poitrail visible entre eux, et le ventre nu
//    jusqu'à la ceinture. Un gilet fermé effaçait tout le corps du personnage.
// ---------------------------------------------------------------------------
const PAL_Y = {
  W: '#f6f8fc',                 // hautes lumières : dessus du crâne et du museau
  s: '#dde4ee',                 // fourrure, ton moyen
  w: '#b4bdcb',                 // ombre : dessous du museau, joue, queue
  g: '#8a94a4',                 // creux : arcades, sous la mâchoire, oreilles
  p: '#c49aa2',                 // intérieur des oreilles
  E: '#3a86d6',                 // yeux bleus
  n: '#26262c',                 // truffe, griffes
  K: '#1e1f24', k: '#101116',   // doudoune noire / matelassage
  Y: '#dfe4ec',                 // le kanji 雪 sur le panneau
  S: '#e8e9ee',                 // pendentif, boucle
  R: '#c4485a'                  // gueule
};

// Tête : oreilles pointues à intérieur rosé, museau qui dépasse vers la DROITE
// avec la truffe au bout, creux sombres devant chaque œil pour creuser les
// arcades. Yeux ET museau décalés d'un pixel à droite — c'est le côté vers
// lequel il regarde, et sans ce décalage le miroir horizontal (render.js,
// p.face) ne se lit pas quand il vise à la souris.
const Y_HEAD = ["..gW..Wg........",".gpWWWWpg.......",".WWWWWWWWW......",".WWWWWWWWWWs....",".WWgEEWWgEEWs...",".WWWWWWWWWWWsn..",".wWWWWWWWWWWsn..",".wgWWWWWWWWws...","..ggwwwwwwg.....","...KKKKKKKK....."];
const Y_IDLE_B  = ["..KKKsssKKK.....",".WKKKsssKKKW....",".WKYKssssKKW....",".WKKKssssKKW....","wWwKKssssKKw....","wwWsssssssW.....","..KKKKKKKKKK....","..WWw....wWW....","..WWw....wWW....","..nnn....nnn...."];
const Y_RUN1_B  = ["..KKKsssKKK.....",".WKKKsssKKKW....",".WKYKssssKKW....",".WKKKssssKKW....","wWwKKssssKKw....","wwWsssssssW.....","..KKKKKKKKKK....","..WWw.....wWW...",".WWw.......wWW..",".nnn.......nnn.."];
const Y_RUN2_B  = ["..KKKsssKKK.....",".WKKKsssKKKW....",".WKYKssssKKW....",".WKKKssssKKW....","wWwKKssssKKw....","wwWsssssssW.....","..KKKKKKKKKK....","...WWw..wWW.....","...WWw..wWW.....","...nnn..nnn....."];
const Y_THROW_B = ["..KKKsssKKK.....",".WKKKsssKKKWWW..",".WKYKssssKKWWW..",".WKKKssssKKW....","wWwKKssssKKw....","wwWsssssssW.....","..KKKKKKKKKK....","..WWw....wWW....","..WWw....wWW....","..nnn....nnn...."];
const Y_DIVE_B  = ["..KKKsssKKKW....",".WKKKsssKKKWW...",".WKYKssssKKW....",".WKKKssssKKW....","wWwKKssssKKw....","wwWsssssssW.....","..KKKKKKKKKK....",".WWWw...wWWW....","WWw.......wWW...","nn.........nn..."];
const Y_DASH_B  = ["W..KKKsssKKK....","WWWKKKsssKKKW...","WWWKYKssssKKW...",".WKKKssssKKW....","wWwKKssssKKw....","wwWsssssssW.....","..KKKKKKKKKK....","..WWw..wWW......",".WWw..wWW.......",".nnn..nnn......."];

// ---------------------------------------------------------------------------
// YOSHI. Le seul personnage du roster vu de PROFIL : tous les autres sont de
// face. Le jeu applique ctx.scale(-1, 1) quand le perso vise a gauche, donc le
// profil se lit dans les deux sens — c'est ce qui rend le choix possible.
//
// Ordre des masses, de l'arriere vers l'avant : epines rouges, crane, oeil au
// tiers arriere, museau en vert clair qui projette, machoire blanche dessous.
// Ce blanc descend d'un seul tenant par le cou jusqu'au ventre : coupe, la
// tete parait posee sur le corps. La carapace est dans le dos, donc a gauche,
// et le ventre a l'avant, donc a droite.
// ---------------------------------------------------------------------------
const PAL_YO = {
  l: '#8fd95e',                 // vert eclaire : dessus du crane et du museau
  G: '#63c23c',                 // LE vert de base, celui qu'un skin remplace
  g: '#3f9127',                 // son ombre
  h: '#2a6a19',                 // son creux
  W: '#ffffff', w: '#d5e2cc',   // machoire et ventre / ombre
  E: '#231d55',                 // pupille
  M: '#7a2018',                 // ligne de bouche
  R: '#e8544b', r: '#b8352e',   // epines du crane et carapace / ombre
  O: '#d9743a', o: '#a8542a',   // bottes / ombre
  Y: '#f2d35c'                  // semelle des bottes
};

const YO_HEAD = ["....GGllg.......", "..RGGWEllllg....", ".RRGGWElllllg...", ".RRGGGGGllllg...", ".RRGGGGlllllg...", ".RRGGGglllllg...", ".rRGGGglllllg...", "..rGWWWWWWWWg...", "..GWWWWWWWWWg...", "...WWWWWWWGg...."];
const YO_IDLE_B  = ["....rGWWWWGg....", "...rRGGWWWWWg...", "..rRRGWWWWWWg...", "..rRRGWWWWWWg...", ".rRRGGGWWWWWg...", ".rGGGGGWWWGGg...", "...GGGG..GGGg...", "...OOOO..OOOg...", "...OOOO..OOOO...", "...YYYY..YYYY..."];
const YO_RUN1_B  = ["....rGWWWWGg....", "...rRGGWWWWWg...", "..rRRGWWWWWWg...", "..rRRGWWWWWWg...", ".rRRGGGWWWWWg...", ".rGGGGGWWWGGg...", "..GGGG..GGGGg...", "..OOOO..OOOOg...", "..OOOO...OOO....", "..YYYY...YYY...."];
const YO_RUN2_B  = ["....rGWWWWGg....", "...rRGGWWWWWg...", "..rRRGWWWWWWg...", "..rRRGWWWWWWg...", ".rRRGGGWWWWWg...", ".rGGGGGWWWGGg...", "..GGGG..GGGGg...", "..OOOO..OOOOg...", "...OOO..OOOO....", "...YYY..YYYY...."];
const YO_THROW_B = ["GGrGGWWWWWGg....", "GGrRRGWWWWWWg...", "GGrRRGWWWWWWg...", ".rRRGGWWWWWWg...", "..rRGGWWWWWGg...", "..GGGGWWWGGg....", "...GGGG..GGGg...", "...OOOO..OOOg...", "...OOOO..OOOO...", "...YYYY..YYYY..."];
const YO_DIVE_B  = ["rRRGGWWWWWWWg...", "rRRGGWWWWWWWg...", ".rGGGWWWWWWGg...", "..GGGGGWWWGGg...", "...GGGGGGGGg....", "....GGGGGGg.....", "..GGGGGGGGGg....", "..OOOOOOOOOOg...", "..OOOOOOOOOO....", "..YYYYYYYYYY...."];
const YO_DASH_B  = ["....rGGWWWWGg...", "...rRGGWWWWWg...", "..rRRGWWWWWWg...", ".rRRGGWWWWWWg...", "rRRGGGGWWWWWg...", "rRGGGGGWWWGGg...", "...GGGG..GGGg...", "...OOOO..OOOg...", "...OOOO..OOOO...", "...YYYY..YYYY..."];

// Les skins de Yoshi ne sont pas des tenues : ce sont des teintes. Inutile de
// remapper des lettres comme chez Naruto ou Leon, il suffit de rebatir le
// sprite avec une palette ou l, G, g et h ont change.
//
// Trois skins vont plus loin que la teinte, et c'est mesure : sur le rouge, la
// carapace tombait a 35 de distance du corps et les bottes a 53 ; sur l'orange
// a 65 et 34 ; sur le blanc, le ventre a 47. En dessous de 90 deux couleurs
// fusionnent a l'oeil. Les visuels d'origine reglent eux-memes le probleme —
// le Yoshi rouge y porte des bottes bleues, le cyan des violettes, le jaune
// des vertes, le noir des blanches — et c'est ce qu'on reprend. Le pire ecart
// passe ainsi de 34 a 130.
const TEINTES_YO = {
  vert:   { l: '#8fd95e', G: '#63c23c', g: '#3f9127', h: '#2a6a19' },
  rouge:  { l: '#f0716a', G: '#d63f36', g: '#a32a23', h: '#741a15',
            O: '#3d7fd6', o: '#2a5aa0', R: '#5e1410', r: '#3d0c08' },
  bleu:   { l: '#7ab4ee', G: '#3d7fd6', g: '#2a5aa0', h: '#1a3c73' },
  jaune:  { l: '#f7e06a', G: '#e8c72e', g: '#b89a18', h: '#8a7210',
            O: '#4aa832', o: '#2f7020' },
  violet: { l: '#c98ae8', G: '#a352d1', g: '#7a35a0', h: '#562473' },
  cyan:   { l: '#8fe8e0', G: '#46c9bd', g: '#2e9188', h: '#1e6660',
            O: '#a352d1', o: '#7a35a0' },
  orange: { l: '#f7ac5e', G: '#e88521', g: '#b56414', h: '#85480d',
            O: '#3d7fd6', o: '#2a5aa0', R: '#6e1a14', r: '#47100c' },
  rose:   { l: '#f79ac9', G: '#e85fa5', g: '#b53f78', h: '#852a56' },
  noir:   { l: '#6e7480', G: '#3d434d', g: '#262a31', h: '#16181d',
            O: '#e4e8ee', o: '#aab2bd' },
  // Corps gris clair et non blanc : en blanc sur blanc le ventre disparaissait
  // dans le corps, exactement le defaut rencontre sur Yuki.
  blanc:  { l: '#dfe6ee', G: '#aab4c0', g: '#7d8794', h: '#565f6b' }
};

const YO_POSES = { idle: YO_IDLE_B, run1: YO_RUN1_B, run2: YO_RUN2_B,
                   throw: YO_THROW_B, dive: YO_DIVE_B, dash: YO_DASH_B };

function construireSkinYo(teinte) {
  const pal = { ...PAL_YO, ...TEINTES_YO[teinte] };
  const out = {};
  for (const [nom, corps] of Object.entries(YO_POSES)) {
    out[nom] = buildSprite([...YO_HEAD, ...corps], pal);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2HOLLIS. Chara-design arrete dans mockups/2hollis.html : 1A (la marque
// peinte qui barre le nez jusqu'au bord droit du visage), 2A (la raie au
// milieu, masse platine qui tombe sur le torse), 3B (torse nu sans chaine,
// une ligne d'ombre sous les pectoraux et une au sternum).
//
// Les cinq autres sections du mockup n'ont pas ete tranchees : palette, pose,
// animations, profil de jeu et bas sont donc sur leur variante A. Ce sont les
// seuls endroits ou j'ai choisi seul, et ils se changent sans rien casser.
const PAL_2H = {
  C: '#f8e9a8', c: '#e2c96e', k: '#c2a44e',   // platine : clair, base, ombre
  S: '#f0c8a4', s: '#cf9660',                 // peau et son ombre
  N: '#15151a',                               // LA marque peinte en travers du nez
  E: '#2c2a26',                               // l'oeil : un seul pixel sombre
  P: '#2b2b33', O: '#1c1c22', K: '#0d0d11'    // cuir, bottes, semelles
};

const H2_TETE = ["....CCCCCC......", "..CCCCCCCCCC....", ".cCCCCCCCCCCc...", ".cCCCCCCCCCCc...", ".cCCSSSSSSCCc...", ".cCSSSSSSSSCc...", ".cSSSSSSSSSSc...", ".cSSSESSSSESc...", ".cSSNNNNNNNNc...", "..kSSSSSSSSk...."];
// Les cheveux tombent sur le torse (les deux `cc` du rang 1) sans occuper les
// colonnes 1 et 12 : ce sont celles des bras, et la masse platine les cachait.
const H2_IDLE_B  = ["..cSSSSSSSSc....", ".SccSSSSSSccS...", ".SccSsSSsSccS...", ".SckSSsSSSkcS...", "..SSSSsSSSS.....", "..PPPPPPPPPP....", "...PP....PP.....", "...PP....PP.....", "..OOO....OOO....", "..KKK....KKK...."];
// Course : appuis LARGES puis appuis RAMASSES. C'est l'ecart entre les deux
// qui fait courir — deux poses proches donnent une marche glissee.
const H2_RUN1_B  = ["..cSSSSSSSSc....", ".SccSSSSSSccS...", ".SccSsSSsSccS...", ".SckSSsSSSkcS...", "..SSSSsSSSS.....", "..PPPPPPPPPP....", "..PP......PP....", ".PP........PP...", ".OOO.......OO...", ".KKK.......KK..."];
const H2_RUN2_B  = ["..cSSSSSSSSc....", ".SccSSSSSSccS...", ".SccSsSSsSccS...", ".SckSSsSSSkcS...", "..SSSSsSSSS.....", "..PPPPPPPPPP....", "...PP....PP.....", "...PP....PP.....", "...OOO..OOO.....", "...KKK..KKK....."];
// Tir : le bras droit part devant, hors de la masse de cheveux.
const H2_THROW_B = ["..cSSSSSSSSc....", ".SccSSSSSSccSSS.", ".SccSsSSsSccS...", ".SckSSsSSSkcS...", "..SSSSsSSSS.....", "..PPPPPPPPPP....", "...PP....PP.....", "...PP....PP.....", "..OOO....OOO....", "..KKK....KKK...."];
// Dash : le buste penche, les bras en arriere, les appuis ecartes.
const H2_DASH_B  = ["..cSSSSSSSSc....", "SccSSSSSSSccSS..", "SccSsSSsSccS....", ".ckSSsSSSkcS....", "..SSSSsSSSS.....", "..PPPPPPPPPP....", "..PP......PP....", ".PP........PP...", ".OOO.......OO...", ".KKK.......KK..."];
// Plongeon : le corps s'allonge a l'horizontale, bottes en avant.
const H2_DIVE_B  = ["SScSSSSSSSScSS..", ".cSSSSSSSSSSc...", ".cSSsSSSSsSSc...", "..SSSSsSSSSS....", "...SSSSSSSS.....", "....PPPPPP......", "..PPPPPPPPPP....", "..OOOOOOOOOO....", "..OOOOOOOOOO....", "..KKKKKKKKKK...."];

// Ses deux grandes surfaces sont les CHEVEUX et le CUIR : ce sont elles que
// les skins recolorent. Le reste — peau, marque, oeil — ne bouge jamais, sinon
// ce n'est plus le meme personnage.
const TEINTES_2H = {
  platine: { C: '#f8e9a8', c: '#e2c96e', k: '#c2a44e' },
  corbeau: { C: '#4a4658', c: '#2e2b3a', k: '#1b1926' },
  cerise:  { C: '#f0708a', c: '#c4485a', k: '#8f2c3c' },
  // Cuir clair sur cheveux argent : en tout-clair il n'y avait plus de bas de
  // silhouette, exactement le defaut rencontre sur le Yoshi blanc.
  argent:  { C: '#f4f6fa', c: '#c8d0dc', k: '#98a2b2',
             P: '#4e5260', O: '#33363f', K: '#1f2128' },
  glacier: { C: '#a8e4f8', c: '#5fb4d8', k: '#3a7d9c' }
};

const H2_POSES = { idle: H2_IDLE_B, run1: H2_RUN1_B, run2: H2_RUN2_B,
                   throw: H2_THROW_B, dive: H2_DIVE_B, dash: H2_DASH_B };

function construireSkin2H(teinte) {
  const pal = { ...PAL_2H, ...TEINTES_2H[teinte] };
  const out = {};
  for (const [nom, corps] of Object.entries(H2_POSES)) {
    out[nom] = buildSprite([...H2_TETE, ...corps], pal);
  }
  return out;
}

// ---------------------------------------------------------------------------
// FLOWSER-TWO. Bowser x Mewtwo, et le seul perso du roster avec Yoshi a etre
// dessine DE PROFIL — pour une raison : sa carapace et sa queue sont des
// elements de DOS. De face on n'en voyait que deux pointes aux epaules et le
// reste etait un aplat mauve.
//
// La carte d'anatomie, qui commande les poses (voir mockups/flowser.html) :
//   la crete, les lunettes, le museau, le collier et la CARAPACE ne bougent
//   pas — la carapace est le bloc de reference, tout se dessine par rapport a
//   elle ; LES DEUX BRAS balancent A CONTRETEMPS l'un de l'autre, et c'est ca
//   qui fait courir, deux bras qui balancent ensemble donnent un pantin ; les
//   DEUX JAMBES alternent ; la QUEUE ne bouge pas en course, elle se tend au
//   dash et fouette au tir.
//
// Les bras sont des bandes rayees — le cuir cloute — et c'est le DECALAGE des
// rayures qui les fait bouger, d'un cran vers le haut pour l'un pendant que
// l'autre descend. Une main creme au bout de chaque bras avait ete essayee :
// elle rendait le mouvement plus lisible, mais deux taches claires qui sautent
// a chaque foulee tiraient l'oeil hors du personnage. Le decalage seul est plus
// discret, et c'est celui qui est garde.
//
// Le sprite est cale sur les colonnes 1 a 14 et non 0 a 13 comme le reste du
// roster. Le miroir de render.js retourne le sprite autour de son centre, donc
// la colonne c devient la 15-c : un contenu cale de 0 a 13 se retrouve en 2 a
// 15 quand le perso se retourne et saute de deux pixels sur place. Les colonnes
// 1 a 14 se renvoient sur elles-memes, c'est le seul calage qui ne saute pas.
const PAL_FL = {
  L: '#d9c2ee',                 // mauve eclaire : museau, bras, avant du corps
  M: '#b795d8',                 // LE mauve de base
  m: '#8f6bb0',                 // son ombre, qui longe le contour
  o: '#6b4a87',                 // son creux
  V: '#a05a9c', v: '#7d3f78',   // le prune de la carapace et de la queue
  R: '#e8392f', r: '#a81f18',   // la crete
  C: '#f0e0bc', c: '#c9b283',   // l'os : liseré de carapace, pointes, griffes
  N: '#1a1620',                 // le cuir cloute et la monture
  A: '#e8edf6'                  // l'argent : verres, clous, reflets
};

const FL_IDLE  = [".....Rr.R..R....", "..r.rRRrRRRr....", ".rRrRRRRRRRrRR..", "rLRNmrRRRRRRR...", "rmLNNMrRRrrRRR..", ".rmMNNNrNNNrNN..", "rmmmNAANLLLLNAN.", "rRmMNNNNLNNLNNm.", ".rRmMMMLLLLLLm..", ".rRRNANNANNAN...", "..RcvvvCMMVVMM..", ".CCcovvCNNVVVML.", "..cvvoCoLLVVvNN.", "CCcvvvCoNNVVvLL.", "..cooooCLLVVvNN.", ".CcvvvCoNNVVvLL.", "..cvoCMVLLVVvmL.", ".VvcvCMVVLvvMMm.", ".vVVvmMMvv.MMm..", "..vv.CCC...CCC.."];
const FL_RUN1  = [".....Rr.R..R....", "..r.rRRrRRRr....", ".rRrRRRRRRRrRR..", "rLRNmrRRRRRRR...", "rmLNNMrRRrrRRR..", ".rmMNNNrNNNrNN..", "rmmmNAANLLLLNAN.", "rRmMNNNNLNNLNNm.", ".rRmMMMLLLLLLm..", ".rRRNANNANNAN...", "..RcvvvCMMVVMM..", ".CCcovvCLLVVVNN.", "..cvvoCoNNVVvLL.", "CCcvvvCoLLVVvNN.", "..cooooCNNVVvLL.", ".CcvvvCoLLVVvNN.", "..cvoCMVNNVVvmL.", ".VvcvCMVVLvvMMm.", ".vVVvmMMvv.CCC..", "..vv.CCC........"];
const FL_RUN2  = [".....Rr.R..R....", "..r.rRRrRRRr....", ".rRrRRRRRRRrRR..", "rLRNmrRRRRRRR...", "rmLNNMrRRrrRRR..", ".rmMNNNrNNNrNN..", "rmmmNAANLLLLNAN.", "rRmMNNNNLNNLNNm.", ".rRmMMMLLLLLLm..", ".rRRNANNANNAN...", "..RcvvvCMMVVMM..", ".CCcovvCLLVVVLL.", "..cvvoCoNNVVvNN.", "CCcvvvCoLLVVvLL.", "..cooooCNNVVvNN.", ".CcvvvCoLLVVvLL.", "..cvoCMVNNVVvmN.", ".VvcvCMVVLvvMMm.", ".vVVvCCCvv.MMm..", "..vv.......CCC.."];
const FL_THROW = [".....Rr.R..R....", "..r.rRRrRRRr....", ".rRrRRRRRRRrRR..", "rLRNmrRRRRRRR...", "rmLNNMrRRrrRRR..", ".rmMNNNrNNNrNN..", "rmmmNAANLLLLNAN.", "rRmMNNNNLNNLNNm.", ".rRmMMMLLLLLLm..", ".rRRNANNANNAN...", "..RcvvvCMMVVMM..", ".CCcovvCNNLLLLC.", "..cvvoCoLLVVvNN.", "CCcvvvCoNNVVvLL.", "..cooooCLLVVvNN.", ".CcvvvCoNNVVvLL.", "..cvoCMVCCVVvCC.", "VVvcvCMVVLvvMMm.", "vVVVvmMMvv.MMm..", "vv.v.CCC...CCC.."];
const FL_DASH  = ["RrR.R..R........", "rRRRRRRr........", "rRRRRRRRRr......", "rLRNmrRRRRRRR...", "rmLNNMrRRrrRRR..", ".rmMNNNrNNNrNN..", "rmmmNAANLLLLNAN.", "rRmMNNNNLNNLNNm.", ".rRmMMMLLLLLLm..", ".rRRNANNANNAN...", "..RcvvvCMMVVMM..", ".CCcovvCNNVVVML.", "..cvvoCoLLVVvNN.", "CCcvvvCoNNVVvLL.", "..cooooCLLVVvNN.", ".CcvvvCoNNVVvLL.", "..cvoCMVLLVVvmL.", "VVvcvCMVVLvvMMm.", "vVVvvmMMvv.MMm..", "vv..CCC...CCC..."];
const FL_DIVE  = ["RrR.R..R........", "rRRRRRRr........", "rRRRRRRRRr......", "rLRNmrRRRRRRR...", "rmLNNMrRRrrRRR..", ".rmMNNNrNNNrNN..", "rmmmNAANLLLLNAN.", "rRmMNNNNLNNLNNm.", ".rRmMMMLLLLLLm..", ".rRRNANNANNAN...", "..RcvvvCMMVVMM..", "CCCcovvCNNVVVML.", "CccvvoCoLLVVvNN.", "CCcvvvCoNNVVvLL.", "CcooooooCLLVVvN.", "vCcvvvCoNNVVvLL.", "vvcvoCMVLLVVMMm.", "vvvCCCCCCCCCCm..", "................", "................"];

// Ses trois grandes surfaces sont le mauve du corps, le prune de la carapace
// et le rouge de la crete : ce sont elles que les skins recolorent. La peau du
// museau suit le corps, sinon la tete se detache du reste.
const TEINTES_FL = {
  psychique: {},
  brasier:   { L: '#f7c9a8', M: '#e08a4a', m: '#a85c22', o: '#733a10',
               V: '#c4485a', v: '#8f2c3c', R: '#ffd23e', r: '#c48a12' },
  abysse:    { L: '#9fc4e8', M: '#5a7fb8', m: '#3d5885', o: '#26375a',
               V: '#2e6b8f', v: '#1b4560', R: '#35e0ff', r: '#1e8fa8' },
  venin:     { L: '#d4f0a8', M: '#8fc44a', m: '#638f26', o: '#3f6014',
               V: '#5aa832', v: '#357018', R: '#e8e83a', r: '#a8a812' },
  // Albinos : le corps devient presque blanc, donc la carapace DOIT s'assombrir
  // pour rester lisible. En clair sur clair elle disparaissait dans le dos,
  // exactement le defaut rencontre sur le Yoshi blanc.
  albinos:   { L: '#ffffff', M: '#e0dce8', m: '#b0aabd', o: '#7d7788',
               V: '#6b6478', v: '#453f52', R: '#e8392f', r: '#a81f18' }
};

const FL_POSES = { idle: FL_IDLE, run1: FL_RUN1, run2: FL_RUN2,
                   throw: FL_THROW, dive: FL_DIVE, dash: FL_DASH };

function construireSkinFL(teinte) {
  const pal = { ...PAL_FL, ...TEINTES_FL[teinte] };
  const out = {};
  for (const [nom, rows] of Object.entries(FL_POSES)) out[nom] = buildSprite(rows, pal);
  return out;
}

export const ROSTER = ['naruto', 'isaac', 'leon', 'jingle', 'cyberleek', 'mamie', 'chopper', 'yuki', 'yoshi', 'hollis', 'flowser'];

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

  mamie: {
    // Seul nom du roster qui n'est pas en capitales : demandé tel quel, il
    // doit s'afficher « Mamie Trayette ». Rien ne le met en majuscules au
    // rendu (aucun text-transform sur les libellés de perso), la casse
    // écrite ici est donc bien celle qu'on voit à l'écran.
    name: 'Mamie Trayette', short: 'Mamie Trayette', icon: '🧶', universe: 'MAISON DE MAMIE',
    // Profil d'artilleuse : la plus lente du roster et un bras moyen, mais la
    // charge d'ultime la plus rapide. Elle ne court pas après le disque, elle
    // attend d'avoir sa jauge — c'est sa mitraillette qui fait le travail.
    speed: 288, power: 1.02, catchR: 29, chargeT: .62,
    color: '#6b7a3d', accent: '#c9b380',
    stats: { spd: 2, pow: 4, ctl: 4 },
    ult: 'rafale',
    frames: {
      idle: buildSprite([...M_HEAD, ...M_IDLE_B], PAL_M),
      run1: buildSprite([...M_HEAD, ...M_RUN1_B], PAL_M),
      run2: buildSprite([...M_HEAD, ...M_RUN2_B], PAL_M),
      throw: buildSprite([...M_HEAD, ...M_THROW_B], PAL_M),
      dive: buildSprite([...M_HEAD, ...M_DIVE_B], PAL_M),
      dash: buildSprite([...M_HEAD, ...M_DASH_B], PAL_M)
    }
  },
  chopper: {
    name: 'CHOPPER', short: 'CHOPPER', icon: '🪝', universe: 'JUNKERTOWN',
    // Profil « mur » : le plus lent du roster de loin, mais la plus grande
    // zone d'attrapé du jeu. Il ne court pas après le disque — il attend
    // qu'il vienne, et son ultime le lui ramène. Sa charge d'ultime est
    // lente pour compenser : le crochet annule un but, ça ne peut pas
    // revenir toutes les dix secondes.
    speed: 270, power: 1.12, catchR: 34, chargeT: .95,
    color: '#4a4a52', accent: '#e8c23a',
    stats: { spd: 1, pow: 4, ctl: 5 },
    ult: 'grappin',
    frames: {
      idle: buildSprite([...CH_HEAD, ...CH_IDLE_B], PAL_CH),
      run1: buildSprite([...CH_HEAD, ...CH_RUN1_B], PAL_CH),
      run2: buildSprite([...CH_HEAD, ...CH_RUN2_B], PAL_CH),
      throw: buildSprite([...CH_HEAD, ...CH_THROW_B], PAL_CH),
      dive: buildSprite([...CH_HEAD, ...CH_DIVE_B], PAL_CH),
      dash: buildSprite([...CH_HEAD, ...CH_DASH_B], PAL_CH)
    }
  },
  yuki: {
    name: 'YUKI', short: 'YUKI', icon: '🐺', universe: 'MICHOU',
    // Profil de sprinteur : le plus rapide du roster de loin, mais le bras le
    // plus faible. Il gagne toutes les courses au disque et ne conclut presque
    // jamais d'un tir — son ultime est là pour ça.
    speed: 372, power: .86, catchR: 31, chargeT: .78,
    // Bleu clair et non blanc : la jauge d'ultime se remplit avec `color` sur
    // un fond blanc (render.js), donc un perso blanc avait une jauge
    // parfaitement invisible. Le bleu reste dans sa gamme — c'est celui de ses
    // yeux, éclairci — tout en se détachant du fond de la barre.
    color: '#7ab8ea', accent: '#3a86d6',
    stats: { spd: 5, pow: 2, ctl: 4 },
    ult: 'chien',
    frames: {
      idle: buildSprite([...Y_HEAD, ...Y_IDLE_B], PAL_Y),
      run1: buildSprite([...Y_HEAD, ...Y_RUN1_B], PAL_Y),
      run2: buildSprite([...Y_HEAD, ...Y_RUN2_B], PAL_Y),
      throw: buildSprite([...Y_HEAD, ...Y_THROW_B], PAL_Y),
      dive: buildSprite([...Y_HEAD, ...Y_DIVE_B], PAL_Y),
      dash: buildSprite([...Y_HEAD, ...Y_DASH_B], PAL_Y)
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
  },
  yoshi: {
    name: 'YOSHI', short: 'YOSHI', icon: '🥚', universe: "L'ILE DES YOSHI",
    // Profil « gourmand » : la plus grande zone d'attrape du roster, et la
    // charge la plus lente. Il avale tout ce qui passe et met longtemps a
    // repondre. Ces deux valeurs sont les extremes du casting dans les deux
    // sens — c'est voulu, mais c'est le premier endroit a regarder si le
    // personnage parait fort ou faible en match.
    speed: 318, power: .95, catchR: 35, chargeT: 1.05,
    color: '#63c23c', accent: '#8fd95e',
    stats: { spd: 3, pow: 3, ctl: 5 },
    ult: 'ruee',
    frames: {
      idle: buildSprite([...YO_HEAD, ...YO_IDLE_B], PAL_YO),
      run1: buildSprite([...YO_HEAD, ...YO_RUN1_B], PAL_YO),
      run2: buildSprite([...YO_HEAD, ...YO_RUN2_B], PAL_YO),
      throw: buildSprite([...YO_HEAD, ...YO_THROW_B], PAL_YO),
      dive: buildSprite([...YO_HEAD, ...YO_DIVE_B], PAL_YO),
      dash: buildSprite([...YO_HEAD, ...YO_DASH_B], PAL_YO)
    },
    skins: {
      vert: null,               // rempli plus bas : c'est `frames` lui-meme
      rouge: construireSkinYo('rouge'),
      bleu: construireSkinYo('bleu'),
      jaune: construireSkinYo('jaune'),
      violet: construireSkinYo('violet'),
      cyan: construireSkinYo('cyan'),
      orange: construireSkinYo('orange'),
      rose: construireSkinYo('rose'),
      noir: construireSkinYo('noir'),
      blanc: construireSkinYo('blanc')
    }
  },

  hollis: {
    name: '2HOLLIS', short: '2HOLLIS', icon: '\u{1F3A4}', universe: 'BOY SOFT',
    // Profil « lanceur » : le plus rapide a charger du roster et le plus
    // puissant au tir, paye par la plus petite zone d'attrape. Il touche de
    // loin et rate de pres — c'est le premier endroit a regarder s'il parait
    // fort ou faible en match. Ces chiffres sont la variante A du mockup, ils
    // n'ont pas ete tranches.
    speed: 340, power: 1.12, catchR: 25, chargeT: .72,
    color: '#e2c96e', accent: '#35e0ff',
    stats: { spd: 4, pow: 5, ctl: 2 },
    ult: 'whitetiger',
    frames: {
      idle: buildSprite([...H2_TETE, ...H2_IDLE_B], PAL_2H),
      run1: buildSprite([...H2_TETE, ...H2_RUN1_B], PAL_2H),
      run2: buildSprite([...H2_TETE, ...H2_RUN2_B], PAL_2H),
      throw: buildSprite([...H2_TETE, ...H2_THROW_B], PAL_2H),
      dive: buildSprite([...H2_TETE, ...H2_DIVE_B], PAL_2H),
      dash: buildSprite([...H2_TETE, ...H2_DASH_B], PAL_2H)
    },
    skins: {
      platine: null,            // rempli plus bas : c'est `frames` lui-meme
      corbeau: construireSkin2H('corbeau'),
      cerise: construireSkin2H('cerise'),
      argent: construireSkin2H('argent'),
      glacier: construireSkin2H('glacier')
    }
  },

  flowser: {
    name: 'FLOWSER-TWO', short: 'FLOWSER', icon: '\u{1F52E}', universe: 'UMBRA CORPORATION',
    // Profil « telekinesiste » : il charge son ultime plus vite que tout le
    // monde et frappe le moins fort. Il gagne par le controle du terrain, pas
    // par le bras — ce qui est exactement ce que fait Psycho-Shell.
    speed: 322, power: .9, catchR: 31, chargeT: .62,
    color: '#8b4fd6', accent: '#e8edf6',
    stats: { spd: 3, pow: 2, ctl: 4 },
    ult: 'psychoshell',
    frames: {
      idle: buildSprite(FL_IDLE, PAL_FL),
      run1: buildSprite(FL_RUN1, PAL_FL),
      run2: buildSprite(FL_RUN2, PAL_FL),
      throw: buildSprite(FL_THROW, PAL_FL),
      dive: buildSprite(FL_DIVE, PAL_FL),
      dash: buildSprite(FL_DASH, PAL_FL)
    },
    skins: {
      psychique: null,          // rempli plus bas : c'est `frames` lui-meme
      brasier: construireSkinFL('brasier'),
      abysse: construireSkinFL('abysse'),
      venin: construireSkinFL('venin'),
      albinos: construireSkinFL('albinos')
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
CHARS.yoshi.skins.vert = CHARS.yoshi.frames;
CHARS.hollis.skins.platine = CHARS.hollis.frames;
CHARS.flowser.skins.psychique = CHARS.flowser.frames;
