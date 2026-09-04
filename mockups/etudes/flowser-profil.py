# -*- coding: utf-8 -*-
"""Flowser-Two v3 : tes retouches, adaptees.

Ce que je garde de ta version, parce que c'etait juste :
  - DEUX VERRES et non un. Le verre proche en grand, et l'eclat du verre
    lointain qui depasse par-dessus le museau. C'est comme ca qu'une paire de
    lunettes se lit sur un visage tourne, et je n'avais pas ose.
  - LA CRETE PLUS GROSSE et qui deborde vers l'avant au lieu d'etre posee a
    plat sur le crane.
  - L'ARGENT COMME COULEUR A PART ENTIERE : les verres, les clous, les reflets.
    Je ne m'en servais nulle part.
  - UN BRAS VISIBLE. Tu avais raison de le poser : je n'en avais dessine aucun,
    le bracelet flottait tout seul sur le torse.

Ce que j'adapte, et pourquoi :
  - LA CRETE ETAIT TROP GROSSE. Elle mangeait la moitie de la hauteur du sprite
    et debordait sur le visage : le crane disparaissait, et un perso sans crane
    n'a plus de tete. Elle garde son volume et son elan vers l'avant, mais elle
    s'arrete au front.
  - LE BRAS N'AVAIT PAS DE FORME. Une colonne de taches claires et sombres
    alignees se lit comme un motif, pas comme un membre. Un bras se lit a
    trois choses : il part de l'EPAULE, il a une EPAISSEUR constante, et il se
    termine par une MAIN. Il est maintenant d'un ton plus clair que le torse,
    ce qui le pose DEVANT lui, avec le bracelet cloute a l'avant-bras et les
    griffes au bout.
  - LES TACHES CLAIRES SUR LA CARAPACE sont retirees. Deux pixels blancs isoles
    au milieu du prune ne se lisent pas comme des plaques, ils se lisent comme
    des TROUS. Une plaque a besoin d'un bord, et un bord ne tient pas en un
    pixel : le liseré os fait deja ce travail sur tout le pourtour.
"""
import sys
sys.path.insert(0, '.')
from pix import png, rgb

PAL = {
    'L': '#d9c2ee', 'M': '#b795d8', 'm': '#8f6bb0', 'o': '#6b4a87',
    'V': '#a05a9c', 'v': '#7d3f78',
    'R': '#e8392f', 'r': '#a81f18',
    'C': '#f0e0bc', 'c': '#c9b283',
    'N': '#1a1620', 'A': '#e8edf6', 'E': '#f2a03c',
}
LARG, HAUT = 16, 20


def L(*ls):
    o = [(s + '.' * LARG)[:LARG] for s in ls]
    assert len(o) == HAUT, '%d lignes' % len(o)
    for i, r in enumerate(o):
        assert r[15] == '.', 'ligne %d deborde en colonne 15' % i
    return o


SPR = L(
    # ---- TETE -------------------------------------------------------------
    # 0  la crete : des epis, separes au sommet
    ".....R..R.R.....",
    # 1  ils se rejoignent
    "....rRRRRRRr....",
    # 2  la masse, elle s'elargit vers l'avant
    "..rRRRRRRRRRr...",
    # 3  elle deborde en avant du crane, qui apparait dessous. Elle s'ARRETE
    #    la : plus bas elle mangeait le visage, et un perso sans crane n'a
    #    plus de tete.
    ".rRRRmMMMMRRRr..",
    # 4  le crane, et le museau qui commence deja en clair
    ".rmLLmMMMMLLLm..",
    # 5  LA MONTURE. Elle CERNE le verre proche et va rejoindre le verre
    #    lointain par un pont ; elle ne traverse plus le visage d'un bord a
    #    l'autre. Une bande pleine sur toute la largeur se lit comme un
    #    masque de ski, pas comme une paire de lunettes — c'est l'erreur que
    #    j'avais deja faite sur la marque de 2hollis.
    ".rmMNNNNMMNNm...",
    # 6  LE VERRE PROCHE en grand (AA), le museau, puis L'ECLAT DU VERRE
    #    LOINTAIN qui depasse par-dessus. C'est ce deuxieme eclat qui fait lire
    #    une PAIRE de lunettes et non un oeil cercle.
    ".rmNAANMLLLNAN..",
    # 7  la monture basse
    ".rmMNNNNMLLNNm..",
    # 8  le museau et la machoire
    "..rmMMMLLLLLm...",
    # 9  LE COLLIER, clous argentes
    "..rRNNANNANNA...",
    # ---- CORPS ------------------------------------------------------------
    # 10 les epaules, et le haut de la carapace
    "..RcvvvCMMMMVm..",
    # 11 LE BRAS part de l'epaule. Il est plus CLAIR que le torse ET borde
    #    d'ombre des deux cotes : c'est le liseré d'ombre qui le DETACHE du
    #    corps. Sans lui, un bras clair pose sur un torse mauve se lit comme
    #    un reflet, pas comme un membre.
    ".CcvvvCmLLmVVMm.",
    # 12 il descend, epaisseur constante — c'est ce qui fait un membre plutot
    #    qu'une tache
    "..cvvvCmLLmVVMm.",
    # 13 idem
    ".CcvvvCmLLmVVMm.",
    # 14 LE BRACELET cloute a l'avant-bras
    "..cvvvCmNNmVVMm.",
    # 15 la fin de l'avant-bras
    ".CcvvvCmLLmVVMm.",
    # 16 LA MAIN, plus large que l'avant-bras, et sa griffe creme
    "..cvvvCmMLLCVMm.",
    # 17 le bas de la carapace, la queue, le haut des cuisses
    ".VvcvCMMMoLCMMm.",
    # 18 les jambes
    ".vVVvmMMo..MMMm.",
    # 19 les griffes des pieds
    "..vv.CCC...CCC..",
)

E = 24
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
png('flowser-v3.png', px, W, H)

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
png('flowser-v3-petit.png', px2, W2, H2)
print('flowser-v3.png ecrit')
