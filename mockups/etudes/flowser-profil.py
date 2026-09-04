# -*- coding: utf-8 -*-
"""Flowser-Two DE PROFIL, dans la position de Yoshi.

Releve de Yoshi, pixel par pixel, avant de dessiner :

  tete  : le sommet du crane occupe les colonnes 4-8 ; les epines rouges sont
          a GAUCHE, c'est-a-dire DERRIERE, sur l'arriere du crane ; l'oeil est
          a la colonne 5-6, HAUT sur la tete ; le museau file vers la DROITE
          jusqu'a la colonne 12 ; et la machoire claire tient les trois
          dernieres lignes, sous le museau — c'est elle qui arrete la tete,
          sans elle le crane n'a plus de bas.
  corps : la carapace rouge est a GAUCHE (le dos), le ventre clair a DROITE
          (le devant), les jambes aux colonnes 3-6 et 9-12, les bottes en
          dessous avec leur semelle.

Ce que ca donne pour lui, et pourquoi le profil lui va mieux que la face :
  - la CARAPACE et la QUEUE sont des elements de DOS. De face on n'en voyait
    que deux pointes aux epaules ; de profil elles sont entierement lisibles.
  - les LUNETTES ne perdent rien : de profil on voit le verre ET la BRANCHE
    qui part vers l'oreille. C'est meme la lecture la plus claire des deux —
    de face, la branche tenait dans un seul pixel de chaque cote.
"""
import sys
sys.path.insert(0, '.')
from pix import png, rgb

PAL = {
    'L': '#d9c2ee', 'M': '#b795d8', 'm': '#8f6bb0', 'o': '#6b4a87',
    'V': '#a05a9c', 'v': '#7d3f78',
    'R': '#e8392f', 'r': '#a81f18',
    'C': '#f0e0bc', 'c': '#c9b283',
    'N': '#1a1620', 'E': '#f2a03c',
}
LARG, HAUT = 16, 20


def L(*ls):
    o = [(s + '.' * LARG)[:LARG] for s in ls]
    assert len(o) == HAUT, 'il faut %d lignes, pas %d' % (HAUT, len(o))
    return o


SPR = L(
    # ---- TETE, tournee vers la DROITE -------------------------------------
    # 0  LA CRETE prend TROIS lignes. A deux, elle etait plus large que haute :
    #    quoi qu'on fasse de sa ligne du haut, une barre entaillee reste une
    #    barre entaillee. Avec une ligne de plus les epis sont enfin plus hauts
    #    que larges, et c'est ca qui fait lire des epis. Le crane descend d'un
    #    cran pour la payer, et le museau et la machoire fusionnent.
    "....R..R..R.....",
    # 1  ils s'epaississent sans se rejoindre
    "...rRRRRRRr.....",
    # 2  la base de la crete, et L'OREILLE DE MEWTWO qui pointe vers l'arriere
    "L..rRRRRRRr.....",
    # 3  l'oreille s'epaissit, le crane apparait sous la crete
    "LLLmMMMMMLLm....",
    # 4  le crane, et LE MUSEAU qui commence deja en clair
    "mLLmMMMMMLLLm...",
    # 5  LE VERRE, monture haute
    ".mMNNNMLLLLLm...",
    # 6  l'oeil orange dans le verre, et LA BRANCHE qui rejoint l'oreille
    "mNNNENMLLLLLLm..",
    # 7  monture basse, le museau au plus long
    ".mMNNNMLLLLLLm..",
    # 8  la machoire, plus courte que le museau
    "..mMMMLLLLLLm...",
    # 9  LE COLLIER cloute, au cou
    "..NNCNNCNNm.....",
    # ---- CORPS ------------------------------------------------------------
    # 10 LA CARAPACE commence. Elle est SEPAREE du corps par un LISERE OS :
    #    sans lui le prune et le mauve se touchent et l'ensemble se lit comme
    #    une seule masse un peu plus sombre d'un cote. C'est le liseré qui en
    #    fait un objet POSE sur le dos.
    "..cvvvCMMMMMm...",
    # 11 elle s'elargit, une POINTE creme en depasse, le ventre devant
    "CcvvvvCMMMVVMm..",
    # 12 la carapace pleine
    ".cvvvvCMMMMVVMm.",
    # 13 deuxieme POINTE, et LE BRACELET cloute sur le bras, devant
    "CcvvvvCMMNNVVMm.",
    # 14 la main a griffes tendue devant lui
    ".cvvvvCMMMMVVC..",
    # 15 troisieme POINTE, le bas de la carapace
    "CcvvvCMMMMMVVMm.",
    # 16 la carapace se referme
    ".cvvCMMMMMMMMm..",
    # 17 LA QUEUE part du bas du dos et descend derriere lui, epaisse et
    #    ATTACHEE : en pixels isoles en diagonale elle se lisait comme des
    #    debris tombes a cote de la jambe.
    "VVcvCMMMo.oMMm..",
    # 18 elle s'enroule vers l'arriere
    "vVV.mMMo.oMMMm..",
    # 19 les griffes cremes devant chaque pied
    "vv..CCC...CCC...",
)

E = 26
W = LARG * E + 40
H = HAUT * E + 40
px = [rgb('#101828')] * (W * H)
for y in range(HAUT):
    for x in range(LARG):
        ch = SPR[y][x]
        if ch == '.':
            continue
        assert ch in PAL, 'lettre inconnue %r ligne %d' % (ch, y)
        c = rgb(PAL[ch])
        for dy in range(E):
            for dx in range(E):
                px[(20 + y * E + dy) * W + 20 + x * E + dx] = c
png('flowser-profil.png', px, W, H)

E2 = 5
W2 = LARG * E2 * 4 + 60
H2 = HAUT * E2 + 40
px2 = [rgb('#101828')] * (W2 * H2)
for k in range(4):
    for y in range(HAUT):
        for x in range(LARG):
            ch = SPR[y][x]
            if ch == '.':
                continue
            c = rgb(PAL[ch])
            for dy in range(E2):
                for dx in range(E2):
                    px2[(20 + y * E2 + dy) * W2 + 15 + k * (LARG * E2 + 6) + x * E2 + dx] = c
png('flowser-profil-petit.png', px2, W2, H2)
print('flowser-profil.png ecrit')
