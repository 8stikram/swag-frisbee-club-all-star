# -*- coding: utf-8 -*-
"""Les pieces de Flowser-Two, version PROFIL. Une variante ne decrit que ce
qu'elle remplace, et elle doit etre un PARTI PRIS, pas un reglage fin : le
module de controle refuse deux variantes a moins de douze pixels d'ecart."""

# Le sprite RETOUCHE A LA MAIN dans l'editeur, adopte tel quel puis decale
# d'une colonne. Les variantes ci-dessous, elles, ont ete dessinees sur la
# base precedente : celles des sections que la retouche a refaites — les
# lunettes, la carapace, la crete — ne sont plus d'aplomb avec elle.
# Le sprite retouche a la main dans l'editeur, puis ADAPTE : la crete
# ramenee au front, le bras redessine comme un membre et non comme une
# colonne de taches, les lunettes rendues a une monture qui cerne les
# verres au lieu d'une bande qui traverse le visage.
# Le sprite tel que tu l'as redessine dans l'editeur, applique sans retouche.
SPR = [
    ".....Rr.R..R....",
    "..r.rRRrRRRr....",
    ".rRrRRRRRRRrRR..",
    "rLRNmrRRRRRRR...",
    "rmLNNMrRRrrRRR..",
    ".rmMNNNrNNNrNN..",
    "rmmmNAANLLLLNAN.",
    "rRmMNNNNLNNLNNm.",
    ".rRmMMMLLLLLLm..",
    ".rRRNANNANNAN...",
    "..RcvvvCMMVVMM..",
    ".CCcovvCNNVVVML.",
    "..cvvoCoLLVVvNN.",
    "CCcvvvCoNNVVvLL.",
    "..cooooCLLVVvNN.",
    ".CcvvvCoNNVVvLL.",
    "..cvoCMVLLVVvmL.",
    ".VvcvCMVVLvvMMm.",
    ".vVVvmMMvv.MMm..",
    "..vv.CCC...CCC..",
]

PAL = {
    'L': '#d9c2ee', 'M': '#b795d8', 'm': '#8f6bb0', 'o': '#6b4a87',
    'V': '#a05a9c', 'v': '#7d3f78',
    'R': '#e8392f', 'r': '#a81f18', 'O': '#f07a1e',
    'C': '#f0e0bc', 'c': '#c9b283', 'A': '#e8edf6',
    'N': '#1a1620', 'E': '#f2a03c', 'W': '#ffffff',
}


def S(**kw):
    o = list(SPR)
    for k, val in kw.items():
        o[int(k[1:])] = (val + '.' * 16)[:16]
    return o


IDS = list('ABCDEFGHIJ')

# ---------------------------------------------------------------------------
SECS = []


def sec(sid, titre, zoom, note, items):
    """zoom : (x0,y0,x1,y1) la zone du sprite qu'on montre en gros plan."""
    SECS.append(dict(id=sid, titre=titre, zoom=zoom, note=note,
                     variantes=[dict(id=IDS[i], nom=n, desc=d, spr=s)
                                for i, (n, d, s) in enumerate(items)]))


# --- 1. LA CRETE -----------------------------------------------------------
sec('crete', '1 · La crête', (0, 0, 13, 5),
    "Trois lignes de haut, pas deux : à deux elle est plus large que haute, et "
    "quoi qu'on fasse de sa ligne du sommet, une barre entaillée reste une barre "
    "entaillée. C'est la seule couleur chaude du personnage et ce qui se voit de "
    "plus loin sur un terrain sombre.",
    [
     ("TROIS ÉPIS, HAUTS ET SÉPARÉS",
      "Trois épis plus hauts que larges, séparés jusqu'à la troisième ligne. La lecture la plus fidèle aux références et la seule qui donne vraiment des épis plutôt qu'une barre.",
      S()),
     ("UNE SEULE CORNE, TRÈS HAUTE",
      "Une pointe unique qui monte de deux lignes au-dessus du crâne. Silhouette la plus reconnaissable du roster de loin, mais il perd le côté hérissé de Bowser.",
      S(l0="........RR......", l1=".......rRRr.....", l2=".L.....rRRr.....", l3=".LLLmMMRRRLLm...")),
     ("UNE MASSE PLEINE, SANS TROU",
      "La crête est un bloc rouge continu qui couvre tout le dessus du crâne. Impossible à rater même à l'échelle du match, mais elle se lit comme un casque plutôt que comme des cheveux.",
      S(l0="....RRRRRRRR....", l1="...rRRRRRRRRr...", l2=".L.rRRRRRRRRr...", l3=".LLLrRRRRRRRm...")),
     ("ELLE PART EN ARRIÈRE",
      "Les épis sont couchés vers la nuque, comme pris par la course. Elle donne du mouvement même à l'arrêt et allonge la silhouette, mais elle déséquilibre la tête vers l'arrière.",
      S(l0=".RR.R..R........", l1=".rRRRRRRr.......", l2=".LrRRRRRRr......", l3=".LLLmMMMMMLLm...")),
     ("CINQ ÉPIS COURTS, EN BROSSE",
      "Cinq pointes courtes et serrées sur toute la longueur du crâne. Très punk et raccord avec le cuir clouté, mais à l'échelle du match les trous se referment.",
      S(l0=".R.R.R.R.R.R.R..", l1=".rRRRRRRRRRRRr..", l2=".LRRRRRRRRRRr...", l3=".LLLrRRRRRRRm...")),
     ("ELLE DESCEND JUSQU'À LA NUQUE",
      "La crête part du sommet et descend le long du cou. Masse maximale, vraie crinière de dragon, mais elle mange la carapace et l'oreille.",
      S(l0=".....R..R..R....", l1="....rRRRRRRr....", l2=".R..rRRRRRRr....", l3=".RRRmMMMMMLLm...", l4=".rRRmMMMMMLLLm..")),
     ("EN ORANGE VIF",
      "La même crête, en orange plutôt qu'en rouge. Beaucoup plus proche de la référence en 3D et elle ressort mieux sur un terrain bleu, mais elle se rapproche de l'orange de l'œil.",
      S(l0=".O.O..O..O.O....", l1=".OOOOOOOOOOr....", l2=".LOOOOOOOOOr....", l3=".LLLmOOOOOLLm...")),
     ("DEUX GRANDES POINTES SEULEMENT",
      "Deux épis larges et hauts, rien entre les deux. Le plus lisible en petit de tout le lot, mais on lit deux cornes plutôt qu'une crête.",
      S(l0="....RR...RR.....", l1="...rRRr.rRRr....", l2=".L.rRRRRRRRr....", l3=".LLLmMMMMMLLm...")),
     ("ELLE RETOMBE SUR LE FRONT",
      "Une mèche déborde vers l'avant, au-dessus du verre. Effet décoiffé très vivant et unique dans le roster, mais elle vient toucher les lunettes.",
      S(l0=".....R..R..R....", l1="....rRRRRRRRr...", l2=".L..rRRRRRRRRr..", l3=".LLLmMMMRRRRRr..", l4=".mLLmMMMMRRRRr..", l5="..mMNNNMRRRRr...")),
     ("UNE CRÊTE D'IROQUOIS, TRÈS FINE",
      "Une bande de trois pixels de large qui monte très haut du milieu du crâne. La plus punk et la plus verticale, mais elle laisse le reste du crâne complètement nu.",
      S(l0="........R.......", l1="........R.......", l2=".L......R.......", l3=".LLLmMMMRMLLm...", l4=".mLLmMMMRMLLLm..")),
    ])

# --- 2. L'OREILLE DE MEWTWO ------------------------------------------------
sec('oreille', "2 · L'oreille de Mewtwo", (0, 0, 8, 9),
    "Dans l'anime, Mewtwo porte deux pointes qui partent vers l'arrière du "
    "crâne, et un tube qui relie sa nuque à son dos. De profil on n'en voit "
    "qu'un côté, et il doit rester une pièce DISTINCTE de la crête : l'oreille "
    "est mauve et va en arrière, la crête est rouge et monte.",
    [
     ("COURTE, EN POINTE VERS L'ARRIÈRE",
      "Une pointe mauve nette qui part vers la nuque, sous la crête. Discrète, elle ne gêne ni la crête ni la carapace, mais c'est la plus timide du lot.",
      S()),
     ("LONGUE, ELLE DESCEND JUSQU'AU COLLIER",
      "L'oreille file vers l'arrière et descend le long du cou jusqu'au cuir. C'est la lecture la plus fidèle à l'anime et la plus reconnaissable, mais elle vient toucher la carapace.",
      S(l2=".LL.rRRRRRRr....", l3=".LLLmMMMMMLLm...", l4=".LLLmMMMMMLLLm..", l5=".LLMNNNMLLLLLm..", l6=".LLNNENMLLLLLLm.", l7=".LLMNNNMLLLLLLm.", l8=".LLmMMMLLLLLLm..")),
     ("DEUX POINTES SUPERPOSÉES",
      "Deux oreilles l'une au-dessus de l'autre, comme sur les visuels vus de trois quarts. Très caractérisé et unique dans le roster, mais on croit à une deuxième crête.",
      S(l0=".LL..R..R..R....", l1=".LL.rRRRRRRr....", l2="....rRRRRRRr....", l3="...LmMMMMMLLm...", l4=".LLLmMMMMMLLLm..", l5=".LLMNNNMLLLLLm..")),
     ("LE TUBE DE NUQUE",
      "Pas une oreille : le tube qui relie le crâne au dos, comme dans le film. C'est le détail le plus juste de tout le personnage, mais il faut connaître Mewtwo pour le comprendre.",
      S(l2="....rRRRRRRr....", l3="...LmMMMMMLLm...", l4=".LLLmMMMMMLLLm..", l5=".mLMNNNMLLLLLm..", l6=".mLNNENMLLLLLLm.", l7=".mLMNNNMLLLLLLm.", l8=".mLmMMMLLLLLLm..", l9=".mLNNCNNCNNm....")),
     ("TRÈS LONGUE, EN CORNE RELEVÉE",
      "Une corne mauve qui part loin en arrière, au-dessus de la carapace, presque à la hauteur de la crête. La silhouette la plus large et la plus impressionnante, mais elle sort du gabarit à l'arrière.",
      S(l0=".LL..R..R..R....", l1=".LLLrRRRRRRr....", l2=".LLLrRRRRRRr....", l3=".LLLmMMMMMLLm...", l4="..LLmMMMMMLLLm..")),
     ("PAS D'OREILLE, CRÂNE ALLONGÉ",
      "Le crâne file en arrière sans rien qui dépasse, comme un museau à l'envers. La silhouette la plus propre et la crête ressort mieux, mais on perd la moitié de ce qui dit Mewtwo.",
      S(l2="....rRRRRRRr....", l3=".MMMmMMMMMLLm...", l4=".MMMmMMMMMLLLm..", l5=".MMMNNNMLLLLLm..", l6=".MMNNENMLLLLLLm.", l7=".MMMNNNMLLLLLLm.", l8=".MMmMMMLLLLLLm..")),
     ("ELLE MONTE, COMME UNE OREILLE DE CHAT",
      "L'oreille part vers le haut au lieu de partir en arrière. Très féline et très lisible en petit, mais elle entre en collision avec la crête et on ne sait plus laquelle est laquelle.",
      S(l0=".LL..R..R..R....", l1=".LLLrRRRRRRr....", l2=".LLLrRRRRRRr....", l3=".LLLmMMMMMLLm...", l4=".mLLmMMMMMLLLm..", l5="..mMNNNMLLLLLm..")),
     ("ÉPAISSE, PRESQUE UNE NAGEOIRE",
      "Une pièce large et arrondie plutôt qu'une pointe, qui couvre tout l'arrière du crâne. Elle donne beaucoup de volume à la nuque, mais elle se lit comme un capuchon.",
      S(l2=".LLLrRRRRRRr....", l3=".LLLmMMMMMLLm...", l4=".LLLmMMMMMLLLm..", l5=".LLLNNNMLLLLLm..", l6=".LLNNENMLLLLLLm.", l7=".LLMNNNMLLLLLLm.")),
     ("EN CRÈME, ASSORTIE AUX POINTES",
      "L'oreille est en os plutôt qu'en mauve, et plus longue. Elle relie la tête à la carapace par la couleur, mais on croit à une troisième corne de Bowser.",
      S(l1=".C..rRRRRRRr....", l2=".CC.rRRRRRRr....", l3=".CCcmMMMMMLLm...", l4=".cCCmMMMMMLLLm..", l5=".cCMNNNMLLLLLm..", l6="..CNNENMLLLLLLm.")),
     ("DEUX POINTES TRÈS ÉCARTÉES",
      "Une pointe tout en haut, une au niveau de la mâchoire. Silhouette identifiable même en ombre chinoise, mais elle encombre tout l'arrière du personnage.",
      S(l0=".LL..R..R..R....", l1=".LLLrRRRRRRr....", l2="....rRRRRRRr....", l3="...LmMMMMMLLm...", l4="...LmMMMMMLLLm..", l5="..LMNNNMLLLLLm..", l6=".LLNNENMLLLLLLm.", l7=".LLMNNNMLLLLLLm.")),
    ])

# --- 3. LES LUNETTES -------------------------------------------------------
sec('lun', '3 · Les lunettes', (0, 3, 10, 9),
    "Sa signature, et l'élément le plus cher du sprite. De profil elles sont "
    "bien plus lisibles que de face : on voit le VERRE et la BRANCHE qui part "
    "vers l'oreille, et c'est la branche qui les sépare d'un simple gros œil "
    "sombre.",
    [
     ("VERRE CERCLÉ, ŒIL ORANGE",
      "Une monture noire qui fait le tour du verre, l'œil orange au centre, et la branche qui file vers l'oreille. La lecture la plus claire, et la plus fidèle.",
      S()),
     ("VERRE OPAQUE, AUCUN REGARD",
      "Le verre est entièrement noir. Le plus menaçant et le plus lisible de loin, mais le visage devient un masque et il perd toute émotion.",
      S(l4=".mLLNNNNNLLLm...", l5="..mNNNNNNLLLLm..", l6=".mNNNNNNNLLLLLm.", l7="..mNNNNNNLLLLLm.", l8="...mNNNNLLLLLm..")),
     ("VERRE BLANC, LUNETTES DE SAVANT",
      "Le verre reflète, l'œil disparaît derrière. Effet très drôle sur un monstre de laboratoire, mais on perd son regard.",
      S(l4=".mLLmNNNmLLLm...", l5="..mMNWWNMLLLLm..", l6=".mNNNWWNMLLLLLm.", l7="..mMmNNNmLLLLLm.")),
     ("UN VERRE ROND, PLUS PETIT",
      "Une monture ronde et fine, deux fois plus petite. Beaucoup plus proche des lunettes des références, mais à l'échelle du match elle disparaît presque.",
      S(l5="..mMMMMMLLLLLm..", l6=".mNNNENMLLLLLLm.", l7="..mMMNMMLLLLLLm.")),
     ("MONTURE ÉNORME, ELLE MANGE LE CRÂNE",
      "Un verre qui couvre la moitié de la tête. Impossible à rater et très cartoon, mais il ne reste plus de joue ni de front.",
      S(l4=".mLLNNNNNNLLm...", l5="..mNNNNNNNLLLm..", l6=".mNNNEENNLLLLLm.", l7="..mNNNNNNNLLLLm.", l8="...mNNNNNLLLLm..")),
     ("RELEVÉES SUR LE FRONT",
      "Les lunettes sont remontées sur le crâne, l'œil nu en dessous. On voit enfin son regard et le détail reste là, mais il faut deux éléments là où il n'y a la place que d'un.",
      S(l3=".LLLNNNNNNLLm...", l4=".mLLmMMMMMLLLm..", l5="..mMMEMMLLLLLm..", l6=".mMMMMMMLLLLLLm.", l7="..mMMMMMLLLLLLm.")),
     ("MONTURE CRÈME, ASSORTIE AUX POINTES",
      "Le cerclage est en os plutôt qu'en noir. L'ensemble gagne en cohérence de couleur, mais sur un crâne clair la monture claire s'efface.",
      S(l5="..mMCCCMLLLLLm..", l6=".mCCCECMLLLLLLm.", l7="..mMCCCMLLLLLLm.")),
     ("UN BANDEAU, PAS DES LUNETTES",
      "Une visière qui traverse tout le visage, façon cyclope. Le plus lisible de tous et très science-fiction, mais on quitte complètement les lunettes rondes.",
      S(l5="..mMMMMMLLLLLm..", l6=".mNNNNNNNNNNNNm.", l7="..mMMMMMLLLLLLm.")),
     ("VERRE DOUBLE, DEUX CERCLES",
      "Deux verres l'un derrière l'autre, comme une loupe de bijoutier. Détail très savant et unique dans le roster, mais il alourdit l'avant du crâne.",
      S(l5="..mNNNNNNLLLLm..", l6=".mNNENNENLLLLLm.", l7="..mNNNNNNLLLLLm.")),
     ("BRANCHE LARGE, VERRE SANS CERCLE BAS",
      "Le verre n'est cerclé que sur trois côtés, et la branche est épaisse. C'est la construction de vraies lunettes vue de côté, mais le verre paraît ouvert.",
      S(l4=".mNNNNNNNLLLm...", l5=".NNMNNNMLLLLLm..", l6=".NNNNENMLLLLLLm.", l7=".NNMNNNMLLLLLLm.")),
    ])

# --- 4. LA CARAPACE --------------------------------------------------------
sec('cara', '4 · La carapace', (0, 9, 10, 19),
    "Elle est SÉPARÉE DU CORPS PAR UN LISERÉ OS. Sans lui le prune et le mauve "
    "se touchent et l'ensemble se lit comme une seule masse un peu plus sombre "
    "d'un côté : c'est le liseré qui en fait un objet POSÉ sur le dos, et c'est "
    "ce que montrent les références.",
    [
     ("LISERÉ OS, TROIS POINTES ESPACÉES",
      "Une carapace prune bordée d'os, avec trois pointes crème réparties le long du dos. La lecture la plus fidèle et celle qui détache le mieux la carapace du corps.",
      S()),
     ("SANS LISERÉ, PRUNE À VIF",
      "La carapace touche directement le corps. La silhouette est plus simple, mais elle redevient une tache sombre sur le dos plutôt qu'une carapace.",
      S(l10="...cvvvvMMMMMm..", l11="Ccvvvvv MMVVMm..".replace(' ', 'M'), l12="..cvvvvMMMMVVMm.", l13=".CcvvvvMMNNVVMm.", l14="..cvvvvvMMMMVVC.", l15=".CcvvvvMMMMVVMm.", l16="..cvvvMMMMMMMMm.")),
     ("SIX POINTES, SERRÉES",
      "Deux fois plus de pointes, sur toute la hauteur du dos. Présence maximale et vraie carapace de Bowser, mais le crème finit par former une frange continue.",
      S(l10=".CC.cvvCMMMMMm..", l11=".CCcvvvCMMMVVMm.", l12=".CC.cvvCMMMVVMm.", l13=".CCcvvvCMNNVVMm.", l14=".CC.cvvCMMMVVC..", l15=".CCcvvCMMMMVVMm.", l16=".C.cvCMMMMMMMm..")),
     ("UNE SEULE POINTE, ÉNORME",
      "Une pointe unique et large au milieu du dos. Silhouette nette et très lisible en petit, mais on croit à une aile plutôt qu'à une carapace.",
      S(l10="...cvvvCMMMMMm..", l11="..cvvvvCMMMVVMm.", l12=".CCvvvCMMMMVVMm.", l13=".CCvvvCMMNNVVMm.", l14=".CCvvvvCMMMMVVC.", l15="..cvvvCMMMMVVMm.")),
     ("ELLE REMONTE EN COL DERRIÈRE LA TÊTE",
      "Le haut de la carapace dépasse au-dessus des épaules et encadre la nuque. C'est le plus reconnaissable du lot, mais ça encombre l'oreille et le collier.",
      S(l9="...NNCNNCNNm....", l10=".CcvvvCMMMMMm...", l11=".CcvvvvCMMMVVMm.", l12=".CcvvvCMMMMVVMm.")),
     ("PLATE, PRESQUE UN SAC À DOS",
      "Une carapace fine et haute, collée au dos. Elle libère beaucoup de place et il paraît plus vif, mais elle perd le volume d'une vraie carapace.",
      S(l10="....cvCMMMMMMm..", l11=".C.cvvCMMMMVVMm.", l12="..cvvvCMMMMVVMm.", l13=".C.cvCMMNNMVVMm.", l14="..cvvvCMMMMMVVC.", l15=".C.cvvCMMMMVVMm.", l16="...cvCMMMMMMMMm.")),
     ("ÉNORME, ELLE DOUBLE SA LARGEUR",
      "Une carapace qui déborde loin derrière lui. Impressionnante et vraiment Bowser, mais il occupe presque deux fois la largeur des autres persos.",
      S(l10="Ccvvvv CMMMMm...".replace(' ', 'v'), l11=".CcvvvvvCMMVVMm.", l12=".CcvvvvCMMMVVMm.", l13=".CcvvvvCMNNVVMm.", l14=".CcvvvvvCMMMVVC.", l15=".CcvvvvCMMMVVMm.", l16="..cvvvvCMMMMMMm.")),
     ("POINTES NOIRES, PAS CRÈME",
      "Les pointes prennent le noir du cuir clouté. L'ensemble devient très cohérent et très punk, mais elles se confondent avec le bracelet et le collier.",
      S(l10=".N.cvvvCMMMMMm..", l11=".NNcvvvCMMMVVMm.", l12=".N.cvvCMMMVVMm..", l13=".NNcvvCMMNNVVMm.", l14=".N.cvvCMMMVVC...", l15=".NNcvvCMMMMVVMm.")),
     ("À ÉCAILLES, SANS POINTE",
      "Un dos couvert d'écailles prune et os, sans piques. Très reptilien et très propre, mais plus rien ne pique et Bowser s'efface.",
      S(l10="...cvCvCMMMMMm..", l11="..cvCvCCMMMVVMm.", l12="..cCvCvCMMMVVMm.", l13="..cvCvCMMNNVVMm.", l14="..cCvCvCMMMMVVC.", l15="..cvCvCMMMMVVMm.")),
     ("BASSE, ELLE NE COUVRE QUE LES REINS",
      "La carapace démarre à mi-dos et laisse les épaules nues. Il paraît beaucoup plus élancé, mais on la prend pour une selle.",
      S(l10="....mMMMMMMMMm..", l11="...mMMMMMMMVVMm.", l12=".CcvvvCMMMMVVMm.", l13=".CcvvvCMMNNVVMm.", l14="..cvvvvCMMMMVVC.", l15=".CcvvvCMMMMVVMm.")),
    ])

# --- 5. LE CUIR CLOUTE -----------------------------------------------------
sec('cuir', '5 · Le cuir clouté', (0, 8, 14, 15),
    "Le collier au cou et le bracelet sur le bras. C'est du Bowser pur, et le "
    "collier a un deuxième rôle : il sépare nettement la tête du corps, comme "
    "le col de Leon. Sur un perso de profil on ne voit qu'un seul bras, donc "
    "un seul bracelet.",
    [
     ("COLLIER ET BRACELET, CLOUS CRÈME",
      "Un collier noir à deux clous et un bracelet sur l'avant-bras. La lecture complète, et la plus fidèle aux références.",
      S()),
     ("COLLIER À POINTES",
      "Des pointes crème qui dépassent du collier au lieu de clous plats. Beaucoup plus agressif et raccord avec la carapace, mais le crème est alors partout.",
      S(l8="...CmMMCLLCLLm..", l9="...NCNNCNNCm....")),
     ("COLLIER LARGE, SUR DEUX RANGÉES",
      "Un collier de deux pixels de haut, couvrant tout le cou. Très fort et très lisible en petit, mais il mange la mâchoire et il paraît sans cou.",
      S(l8="...NNCNNCNNm....", l9="...NNNNNNNNm....")),
     ("DEUX BRACELETS SUPERPOSÉS",
      "Deux bandes noires sur l'avant-bras. Le plus riche et le plus punk du lot, mais le noir prend alors tout le bras.",
      S(l12="..cvvvCMMNNVVMm.", l13=".CcvvvCMMNNVVMm.")),
     ("UNE CEINTURE EN PLUS",
      "Une ceinture cloutée à la taille, sous la plaque de ventre. Elle coupe la silhouette et donne une vraie tenue, mais elle traverse le ventre.",
      S(l15=".CcvvvCNNNNNNMm.")),
     ("CLOUS ARGENTÉS",
      "Les clous passent du crème à l'argent. Ils ressortent bien mieux sur le noir, mais ils ajoutent une cinquième famille de couleur.",
      S(l8="...AmMMAMMAMm...", l9="...NANANANANm...", l12="..cvvvCMMNAVVMm.", l13=".CcvvvCMMANVVMm.")),
     ("COLLIER FIN, RAS DU COU",
      "Une simple bande noire sans clou, très serrée. Le plus élégant et celui qui laisse le plus de peau, mais il ne sépare plus vraiment la tête du corps.",
      S(l9="....NNNNNm......")),
     ("DES CHAÎNES PLUTÔT QUE DES CLOUS",
      "Le collier pend en chaîne sur le poitrail. Très opium et très lisible, mais l'argent traverse la plaque de ventre.",
      S(l9="...NNCNNCNNm....", l10="...cvvvCMAMMMm..", l11=".CcvvvvCMMAVVMm.", l12="..cvvvvCMMMAVMm.")),
     ("BRACELETS AUX DEUX POIGNETS ET AUX CHEVILLES",
      "Du cuir partout : bras et pattes. Le plus complet et le plus punk, mais quatre bandes noires découpent la silhouette en morceaux.",
      S(l13=".CcvvvCMMNNVVMm.", l17=".VVcvCNNNo.oNNm.")),
     ("CUIR ENTIÈREMENT NOIR, SANS CLOU",
      "Ni clous ni pointes, juste la bande de cuir. Le plus sobre et le plus net à l'échelle du match, mais on perd la moitié punk du personnage.",
      S(l8="...NNNNNNNNm....", l9="...NNNNNNNNNm...", l12="..cvvvCMMNNVVMm.", l13=".CcvvvCMMNNVVMm.")),
    ])

# --- 6. LA QUEUE -----------------------------------------------------------
sec('queue', '6 · La queue', (0, 14, 13, 19),
    "La queue de Mewtwo. De profil elle sort DERRIÈRE lui, donc à gauche quand "
    "il regarde à droite. Elle porte le mauve rose du ventre et non l'ombre du "
    "corps : en ombre de corps elle se confond avec le contour, et en pixels "
    "isolés posés en diagonale elle se lit comme des débris tombés à côté.",
    [
     ("COURTE, ELLE S'ENROULE AU SOL",
      "Une queue épaisse qui part du bas de la carapace et s'enroule derrière lui. Discrète, elle ne déborde presque pas.",
      S()),
     ("LONGUE, ELLE REMONTE EN S",
      "Une queue qui part loin en arrière puis remonte, comme sur les références. La plus reconnaissable et la plus élégante, mais elle déborde beaucoup à l'arrière.",
      S(l14=".V.vvvvCMMMMVVC.", l15=".VVvvvCMMMMVVMm.", l16=".Vv.vCMMMMMMMMm.", l17=".VV.vCMMMo.oMMm.", l18=".vV..mMMo.oMMMm.")),
     ("PAS DE QUEUE",
      "Elle disparaît complètement. La silhouette est la plus compacte et se retourne sans rien faire sauter, mais il perd la moitié de ce qui dit Mewtwo.",
      S(l17="...cvCMMMo.oMMm.", l18=".....mMMo.oMMMm.", l19=".....CCC...CCC..")),
     ("RELEVÉE EN PANACHE",
      "La queue monte au lieu de descendre, au-dessus de la carapace. Très vivante et elle allonge la silhouette vers le haut, mais elle touche l'oreille.",
      S(l10=".V.cvvvCMMMMMm..", l11=".VVcvvvCMMMVVMm.", l12=".vVcvvvCMMMVVMm.", l13=".CcvvvCMMNNVVMm.", l17="...cvCMMMo.oMMm.", l18=".....mMMo.oMMMm.", l19=".....CCC...CCC..")),
     ("TRÈS ÉPAISSE, PRESQUE UNE MASSUE",
      "Une queue large qui s'élargit au bout. Impossible à confondre avec du décor, mais on croit à une troisième patte.",
      S(l16=".VvvvCMMMMMMMMm.", l17=".VVvvCMMMo.oMMm.", l18=".VVV.mMMo.oMMMm.", l19=".vvv.CCC...CCC..")),
     ("FINE ET TRÈS LONGUE",
      "Un trait de deux pixels qui traverse tout l'arrière. La plus fidèle à Mewtwo et la plus élégante, mais un trait fin se lit comme un défaut d'affichage.",
      S(l15=".VcvvvCMMMMVVMm.", l16=".V.vvCMMMMMMMMm.", l17=".V.cvCMMMo.oMMm.", l18=".V...mMMo.oMMMm.", l19=".V...CCC...CCC..")),
     ("BOUT CRÈME",
      "La queue se termine en pointe couleur os, assortie à la carapace. Le détail accroche l'œil et relie la queue au reste, mais rien dans les références ne le montre.",
      S(l17=".CVcvCMMMo.oMMm.", l18=".CVV.mMMo.oMMMm.", l19=".Cv..CCC...CCC..")),
     ("ELLE PASSE ENTRE LES JAMBES",
      "La queue revient vers l'avant, sous le corps. Placement inhabituel qui supprime tout débordement, mais à cette échelle elle se lit très mal.",
      S(l17="...cvCMMMo.oMMm.", l18=".....mMMoVoMMMm.", l19=".....CCCVV.CCC..")),
     ("DEUX SEGMENTS, COMME UNE ANTENNE",
      "Une queue en deux morceaux séparés par une articulation claire. Très mécanique et unique dans le roster, mais on croit à un bug de dessin.",
      S(l16="..cvvCMMMMMMMMm.", l17=".V.cvCMMMo.oMMm.", l18=".vV..mMMo.oMMMm.", l19=".Vv..CCC...CCC..")),
     ("ELLE TRAÎNE AU SOL, VERS L'AVANT",
      "La queue passe sous les pattes et ressort devant lui. Silhouette la plus large au sol et très lisible, mais elle croise les pieds.",
      S(l17="...cvCMMMo.oMMm.", l18=".v...mMMo.oMMMm.", l19=".vVVCCC...CCCVV.")),
    ])

# --- 7. LA PALETTE ---------------------------------------------------------
PALS = {
 'A': {},
 'B': {'L': '#c9a2e8', 'M': '#a06fd0', 'm': '#7a4aa8', 'o': '#55307a'},
 'C': {'L': '#efe4fa', 'M': '#d6c4ea', 'm': '#ab97c4', 'o': '#7d6a96'},
 'D': {'L': '#c2cdf0', 'M': '#8f9ed8', 'm': '#6a76aa', 'o': '#464e78'},
 'E': {'L': '#f7c2e0', 'M': '#e88ac0', 'm': '#b85a90', 'o': '#853f68',
       'V': '#c4485a', 'v': '#8f2c3c'},
 'F': {'L': '#cdc6d6', 'M': '#9b93a8', 'm': '#736c80', 'o': '#4e4857',
       'V': '#6e6678', 'v': '#4a4452'},
 'G': {'L': '#cdeeb4', 'M': '#98d47a', 'm': '#6ca352', 'o': '#4a7336',
       'V': '#4a8f3a', 'v': '#2f6624'},
 'H': {'L': '#7d94d8', 'M': '#4a5ea8', 'm': '#32407a', 'o': '#1f294f',
       'V': '#35e0ff', 'v': '#1e8fa8'},
 'I': {'L': '#5a5460', 'M': '#3a353f', 'm': '#262229', 'o': '#151318',
       'V': '#c4485a', 'v': '#8f2c3c'},
 'J': {'L': '#f7e2a8', 'M': '#e0c060', 'm': '#ab8f34', 'o': '#786220',
       'V': '#c49a2a', 'v': '#8a6a12', 'C': '#ffffff', 'c': '#d6d6de'},
}
PAL_NOMS = ['MAUVE CLAIR DES RÉFÉRENCES', 'MAUVE SATURÉ', 'LILAS TRÈS PÂLE',
            'MAUVE FROID, BLEUTÉ', 'ROSE ET GRENAT', 'GRIS-VIOLET',
            'VERT PÂLE', 'BLEU NUIT ET CYAN', 'NOIR ET ROUGE', 'DORÉ']
PAL_DESCS = [
 "Le mauve clair des références, sur quatre valeurs, carapace prune. La lecture la plus fidèle et la plus lumineuse sur un terrain sombre.",
 "Un mauve nettement plus saturé. Il ressort beaucoup mieux au milieu de l'action, mais il s'éloigne du lilas pâle des visuels.",
 "Un lilas presque blanc, comme la référence en 3D. Le plus élégant du lot, mais il se rapproche dangereusement du blanc de Yuki.",
 "Un mauve froid tirant sur le bleu. Très spectral et très Mewtwo, mais il se confond avec le fond de la station orbitale.",
 "Rose franc et carapace grenat. Impossible à confondre avec un autre perso, mais on quitte Mewtwo.",
 "Gris-violet désaturé. Le plus sobre et le plus adulte, mais il perd toute la fantaisie du personnage.",
 "Vert pâle, un Bowser albinos. Très surprenant et très drôle, mais il entre en collision avec Yoshi.",
 "Bleu nuit avec une carapace cyan. Le plus lisible sur les terrains clairs, mais il devient un autre personnage.",
 "Noir et rouge. Cohérent avec le cuir clouté et très fort, mais un perso sombre se perd sur un terrain sombre.",
 "Doré, pointes blanches. Parfait comme skin de récompense, illisible en couleur de base.",
]
sec('pal', '7 · La palette', None,
    "Ses trois grandes surfaces sont le mauve du corps, le prune de la carapace "
    "et le rose de la queue. Le mauve porte QUATRE valeurs, comme le vert de "
    "Yoshi : en dessous de trois le personnage devient un aplat où le volume ne "
    "se lit plus. Constaté sur Yuki, puis sur Yoshi.",
    [(PAL_NOMS[i], PAL_DESCS[i], None) for i in range(10)])
SECS[-1]['pals'] = [PALS[k] for k in IDS]

PROFILS = [
 ('ÉQUILIBRÉ', "Bon partout, excellent nulle part. Le plus facile à équilibrer, le moins mémorable.",
  dict(spd=3, pow=3, ctl=3, speed=330, power=1.0, catchR=30, chargeT=.8)),
 ('COGNEUR', "Frappe le plus fort du roster, se déplace le plus lentement. Cohérent avec Bowser, mais il subit les persos rapides.",
  dict(spd=2, pow=5, ctl=3, speed=296, power=1.22, catchR=28, chargeT=1.0)),
 ('GARDIEN', "La deuxième zone d'attrapé du jeu après Yoshi, très lent. Il tient son but mais ne conclut jamais.",
  dict(spd=2, pow=4, ctl=5, speed=292, power=1.1, catchR=34, chargeT=.95)),
 ('TÉLÉKINÉSISTE', "Charge son ultime le plus vite du roster, bras faible. Cohérent avec Mewtwo, mais il gagne sur sa spéciale et pas sur son jeu.",
  dict(spd=3, pow=2, ctl=4, speed=326, power=.88, catchR=30, chargeT=.6)),
 ('SPRINTEUR LOURD', "Rapide ET puissant, mais la plus petite zone d'attrapé du jeu. Spectaculaire, probablement trop fort.",
  dict(spd=5, pow=5, ctl=1, speed=364, power=1.2, catchR=24, chargeT=.85)),
 ('TECHNICIEN', "Charge courte et grande zone d'attrapé, puissance faible. Le plus agréable à jouer, le moins impressionnant.",
  dict(spd=3, pow=2, ctl=5, speed=328, power=.9, catchR=33, chargeT=.66)),
 ('TANK', "Lent, puissant, immense zone d'attrapé. Il ne rate rien mais ne rattrape jamais un contre.",
  dict(spd=1, pow=4, ctl=5, speed=282, power=1.12, catchR=35, chargeT=1.05)),
 ('FRAGILE', "Très rapide, très puissant, tout le reste au plancher. À haut risque et difficile à équilibrer.",
  dict(spd=5, pow=5, ctl=1, speed=372, power=1.25, catchR=23, chargeT=1.1)),
 ('BOWSER PUR', "Lent, très puissant, charge très lente. Le plus fidèle à cette moitié-là, le plus punitif à jouer.",
  dict(spd=2, pow=5, ctl=2, speed=290, power=1.28, catchR=26, chargeT=1.15)),
 ('MEWTWO PUR', "Rapide, technique, charge rapide, puissance faible. Fidèle à l'autre moitié, mais il ressemble alors à Yuki.",
  dict(spd=4, pow=2, ctl=4, speed=352, power=.87, catchR=31, chargeT=.62)),
]
sec('profil', '8 · Le profil de jeu', None,
    "Les chiffres réels. speed en px/s, power en multiplicateur de puissance de "
    "tir, catchR le rayon d'attrapé, chargeT le temps de charge.",
    [(n, d, None) for n, d, _ in PROFILS])
SECS[-1]['stats'] = [st for _, _, st in PROFILS]
