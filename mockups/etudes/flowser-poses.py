# -*- coding: utf-8 -*-
"""Les six poses de Flowser-Two, dessinees d'apres la carte d'anatomie.

Ce qui bouge et ce qui ne bouge pas, tranche piece par piece :
  la crete, les lunettes, le museau, le collier et la CARAPACE ne bougent pas —
  la carapace est le bloc de reference, tout se dessine par rapport a elle ;
  LES DEUX BRAS balancent A CONTRETEMPS l'un de l'autre. C'est ca qui fait
  courir : deux bras qui balancent ensemble donnent un pantin ;
  les DEUX JAMBES alternent ;
  la QUEUE ne bouge pas en course — elle se tend au dash et fouette au tir.
"""
import sys
sys.path.insert(0, '.')
from pix import png, rgb

PAL = {
    'L': '#d9c2ee', 'M': '#b795d8', 'm': '#8f6bb0', 'o': '#6b4a87',
    'V': '#a05a9c', 'v': '#7d3f78',
    'R': '#e8392f', 'r': '#a81f18',
    'C': '#f0e0bc', 'c': '#c9b283',
    'N': '#1a1620', 'A': '#e8edf6',
}

IDLE = [
    ".....Rr.R..R....", "..r.rRRrRRRr....", ".rRrRRRRRRRrRR..", "rLRNmrRRRRRRR...",
    "rmLNNMrRRrrRRR..", ".rmMNNNrNNNrNN..", "rmmmNAANLLLLNAN.", "rRmMNNNNLNNLNNm.",
    ".rRmMMMLLLLLLm..", ".rRRNANNANNAN...",
    "..RcvvvCMMVVMM..", ".CCcovvCNNVVVML.", "..cvvoCoLLVVvNN.", "CCcvvvCoNNVVvLL.",
    "..cooooCLLVVvNN.", ".CcvvvCoNNVVvLL.", "..cvoCMVLLVVvmL.", ".VvcvCMVVLvvMMm.",
    ".vVVvmMMvv.MMm..", "..vv.CCC...CCC..",
]


def pose(**kw):
    o = list(IDLE)
    for k, v in kw.items():
        o[int(k[1:])] = (v + '.' * 16)[:16]
    for i, r in enumerate(o):
        assert len(r) == 16 and r[15] == '.', 'ligne %d hors gabarit : %r' % (i, r)
        for ch in r:
            assert ch == '.' or ch in PAL, 'lettre %r ligne %d' % (ch, i)
    return o


# --- COURSE ----------------------------------------------------------------
# LES MAINS SONT CE QUI FAIT LIRE UN BRAS QUI BOUGE. Les bras sont des bandes
# rayees (le cuir cloute) : deplacer les rayures d'un cran fait defiler un
# motif, pas balancer un membre. C'est la MAIN qui donne le sens du mouvement,
# et il n'y en avait aucune. Chaque bras porte maintenant une main creme, et
# les deux montent et descendent A CONTRETEMPS l'un de l'autre — c'est ce
# contretemps qui fait courir, deux bras qui balancent ensemble donnent un
# pantin.
#
# Au repos les deux mains pendent en bas, a la meme hauteur.
IDLE = pose(
    l16="..cvoCMVCCVVvCC.",
)
# Premiere foulee : la main PROCHE remonte, la main LOIN descend.
RUN1 = pose(
    l11=".CCcovvCLLVVVNN.", l12="..cvvoCoCCVVvLL.", l13="CCcvvvCoLLVVvNN.",
    l14="..cooooCNNVVvLL.", l15=".CcvvvCoLLVVvNN.", l16="..cvoCMVNNVVvCC.",
    l18=".vVVvmMMvv.CCC..", l19="..vv.CCC........",
)
# Deuxieme foulee : tout s'inverse, mains comprises.
RUN2 = pose(
    l11=".CCcovvCLLVVVCC.", l12="..cvvoCoNNVVvNN.", l13="CCcvvvCoLLVVvLL.",
    l14="..cooooCNNVVvNN.", l15=".CcvvvCoCCVVvLL.", l16="..cvoCMVLLVVvNN.",
    l18=".vVVvCCCvv.MMm..", l19="..vv.......CCC..",
)

# --- LE TIR ----------------------------------------------------------------
# Le bras proche part DEVANT, a hauteur d'epaule, griffe au bout. Et la queue
# fouette : elle se detend vers l'arriere.
THROW = pose(
    l11=".CCcovvCNNLLLLC.", l12="..cvvoCoLLVVvNN.",
    l17="VVvcvCMVVLvvMMm.", l18="vVVVvmMMvv.MMm..", l19="vv.v.CCC...CCC..",
)

# --- LE DASH ---------------------------------------------------------------
# On ne peut pas pencher la tete vers l'AVANT : les lignes du visage touchent
# deja la colonne 14, et le gabarit reserve la 15. C'est donc le BAS qui recule
# — jambes et queue tirees en arriere — ce qui penche la silhouette tout aussi
# bien. Et LA CRETE SE COUCHE vers l'arriere : c'est le seul moment ou elle
# bouge, et c'est ce qui rend le dash lisible d'un coup d'oeil.
DASH = pose(
    l0="RrR.R..R........",
    l1="rRRRRRRr........",
    l2="rRRRRRRRRr......",
    l16="..cvoCMVLLVVvmL.",
    l17="VVvcvCMVVLvvMMm.",
    l18="vVVvvmMMvv.MMm..",
    l19="vv..CCC...CCC...",
)

# --- LE PLONGEON -----------------------------------------------------------
# Le corps s'allonge et s'aplatit : la tete garde sa place, le corps s'etale
# vers l'arriere et les jambes se tendent en une seule masse. La carapace suit
# le corps, elle ne s'en detache jamais.
DIVE = pose(
    l0="RrR.R..R........",
    l1="rRRRRRRr........",
    l2="rRRRRRRRRr......",
    l10="..RcvvvCMMVVMM..",
    l11="CCCcovvCNNVVVML.",
    l12="CccvvoCoLLVVvNN.",
    l13="CCcvvvCoNNVVvLL.",
    l14="Ccooooo CLLVVvNN".replace(' ', 'o')[:15] + '.',
    l15="vCcvvvCoNNVVvLL.",
    l16="vvcvoCMVLLVVMMm.",
    l17="vvvCCCCCCCCCCm..",
    l18="................",
    l19="................",
)

POSES = [('idle', IDLE), ('run1', RUN1), ('run2', RUN2),
         ('throw', THROW), ('dash', DASH), ('dive', DIVE)]

E = 11
COL = 16 * E + 14
W = len(POSES) * COL + 14
H = 20 * E + 40
px = [rgb('#101828')] * (W * H)
ox = 14
for nom, spr in POSES:
    for y in range(20):
        for x in range(16):
            ch = spr[y][x]
            if ch == '.':
                continue
            c = rgb(PAL[ch])
            for dy in range(E):
                for dx in range(E):
                    px[(20 + y * E + dy) * W + ox + x * E + dx] = c
    ox += COL
png('flowser-poses.png', px, W, H)
print('flowser-poses.png ecrit')
for nom, spr in POSES:
    print(nom, '=', spr)
