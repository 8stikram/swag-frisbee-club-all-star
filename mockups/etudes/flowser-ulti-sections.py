# -*- coding: utf-8 -*-
"""Les sections du mockup de PSYCHO-SHELL."""

IDS = list('ABCDEFGHIJ')
SECS = []


# `multi` : les effets d'un ultime SE SUPERPOSENT. Demander d'en choisir un
# seul sur la chute, l'impact, la flaque ou la marque, c'est poser une fausse
# question — on veut trois ondes ET des fissures ET des morceaux. Ces
# sections-la se cochent, les autres se choisissent.
def sec(sid, titre, note, items, multi=False):
    SECS.append(dict(id=sid, titre=titre, note=note, multi=multi,
                     variantes=[dict(id=IDS[i], nom=n, desc=d, **p)
                                for i, (n, d, p) in enumerate(items)]))


# --- 1. LE CIBLAGE ---------------------------------------------------------
sec('cible', '1 · Le ciblage',
    "Le cahier des charges dit : placement libre à la souris, avec une ombre de "
    "carapace au sol qui montre où ça va tomber. Reste à décider ce que "
    "l'adversaire en voit — c'est ce qui sépare un ultime qu'on peut esquiver "
    "d'un ultime qu'on subit.",
    [
     ("LES DEUX LA VOIENT", "L'ombre violette est visible des deux côtés. L'adversaire peut sortir de la zone avant l'impact, ce qui rend l'ultime juste ; en contrepartie il n'atteindra presque jamais quelqu'un directement.", dict(cib='deux')),
     ("SEUL LE LANCEUR LA VOIT", "L'adversaire ne voit rien venir et découvre la flaque à l'impact. Beaucoup plus punitif, mais subir sans pouvoir réagir se vit très mal — c'est le reproche qu'on faisait déjà au tigre sans annonce.", dict(cib='moi')),
     ("ELLE APPARAÎT À LA DERNIÈRE SECONDE", "L'ombre ne s'allume qu'un quart de seconde avant la chute. Il reste juste de quoi dasher, donc l'esquive existe mais demande un réflexe. Le meilleur compromis, et le plus dur à régler.", dict(cib='tard')),
     ("PAS DE CIBLAGE : ELLE TOMBE SUR L'ADVERSAIRE", "Aucun choix de zone, elle vise la position de l'adversaire au moment du cast. Impossible à rater, mais on perd toute la couche stratégique du placement.", dict(cib='auto')),
     ("ELLE TOMBE TOUJOURS AU MÊME ENDROIT", "Devant le but adverse, systématiquement. Très lisible et facile à équilibrer, mais l'ultime devient une routine.", dict(cib='but')),
     ("LE LANCEUR CHOISIT PENDANT UN RALENTI", "Le temps se ralentit pendant qu'il vise. Très spectaculaire et confortable à jouer, mais un ralenti dans un jeu à deux gèle aussi l'adversaire.", dict(cib='ralenti')),
     ("LA ZONE SUIT LE DISQUE", "Elle tombe là où est le disque au moment du cast. Ça lie l'ultime au jeu plutôt qu'au personnage, mais l'effet dépend entièrement du placement du disque.", dict(cib='disque')),
     ("DEUX PETITES ZONES AU LIEU D'UNE", "Deux flaques moitié moins grandes, placées séparément. Beaucoup plus fin à jouer, mais deux petits cercles se contournent plus facilement qu'un grand.", dict(cib='deuxzones')),
     ("LA ZONE GRANDIT TANT QU'IL VISE", "Plus il attend, plus le cercle est large. Récompense le sang-froid, mais il reste immobile pendant ce temps et se fait punir.", dict(cib='grandit')),
     ("ELLE NE PEUT TOMBER QUE DANS SA MOITIÉ ADVERSE", "Le placement est libre mais borné au camp d'en face. C'est la règle la plus simple à comprendre et elle évite qu'il se protège lui-même, mais elle retire un usage défensif.", dict(cib='moitie')),
    ])

# --- 2. LA CHUTE -----------------------------------------------------------
sec('chute', '2 · La chute de la carapace',
    "Une carapace à pics d'énergie psychique violette, transparente et "
    "cristalline, qui tombe du ciel. Sur un jeu vu de DESSUS, une chute ne se "
    "lit pas toute seule : il faut que quelque chose grandisse et que l'ombre "
    "au sol se resserre, sinon on croit à une apparition.",
    [
     ("ELLE GRANDIT ET L'OMBRE SE RESSERRE", "La carapace grossit à l'écran pendant que son ombre rétrécit sous elle. C'est le seul couple qui fait lire une chute vue de dessus, et c'est la lecture la plus fidèle au cahier des charges.", dict(ch='grandit')),
     ("ELLE TOMBE EN DIAGONALE", "Elle arrive du coin de l'écran plutôt que de la verticale. Plus dynamique et on la voit venir de loin, mais le point de chute devient plus dur à lire.", dict(ch='diago')),
     ("ELLE SE MATÉRIALISE SUR PLACE", "Pas de chute : elle apparaît déjà au sol et se solidifie. Instantané et impossible à esquiver, mais on perd tout l'impact.", dict(ch='place')),
     ("ELLE TOURNE SUR ELLE-MÊME EN TOMBANT", "Comme une carapace lancée dans Mario. La référence est immédiate et c'est le plus amusant, mais la rotation brouille la silhouette à pics.", dict(ch='tourne')),
     ("ELLE TOMBE TRÈS LENTEMENT", "Une seconde entière de chute. On a largement le temps de sortir, ce qui est juste ; en contrepartie l'ultime perd son côté couperet.", dict(ch='lent')),
     ("ELLE S'ÉCRASE COMME UN MÉTÉORE", "Traînée d'énergie derrière elle pendant la chute. Le plus spectaculaire du lot, mais la traînée masque le point de chute.", dict(ch='meteore')),
     ("PLUSIEURS PETITES CARAPACES", "Une pluie de trois ou quatre carapaces sur la zone. Très riche visuellement, mais on ne sait plus laquelle regarder.", dict(ch='pluie')),
     ("ELLE MONTE DU SOL AU LIEU DE TOMBER", "Elle jaillit du terrain. Surprenant et graphique, mais rien dans l'univers du jeu ne justifie qu'on traverse le sol.", dict(ch='sol')),
     ("IL LA LANCE LUI-MÊME", "Sa vraie carapace se détache de son dos et part en télékinésie. La fusion est assumée à fond, mais il faut le dessiner sans carapace pendant tout l'ultime.", dict(ch='lance')),
     ("ELLE REBONDIT UNE FOIS AVANT DE SE POSER", "Un rebond, puis elle se pose. Ça donne du poids et de la matière, mais ça retarde la zone d'une demi-seconde.", dict(ch='rebond')),
    ], multi=True)

# --- 3. L'IMPACT -----------------------------------------------------------
sec('impact', "3 · L'impact",
    "Le moment où la carapace touche le sol. C'est le seul instant de tout "
    "l'ultime où quelque chose FRAPPE : c'est là que va la secousse, et nulle "
    "part ailleurs. Une secousse répartie partout ne se sent nulle part.",
    [
     ("ONDE DE CHOC ET ÉCLATS", "Un anneau violet qui s'élargit, des éclats cristallins projetés. La lecture du cahier des charges, et la plus lisible.", dict(im='onde')),
     ("TROIS ONDES SUCCESSIVES", "L'anneau part trois fois de suite. Le plus lourd et le plus impressionnant, mais ça allonge l'impact d'une demi-seconde.", dict(im='trois')),
     ("UN FLASH BLANC PLEIN ÉCRAN", "Deux images de blanc. Impossible à rater même en regardant ailleurs, mais ça masque l'action une fraction de seconde.", dict(im='flash')),
     ("LE SOL SE FISSURE", "Des fissures violettes partent du point d'impact. Très matériel et ça prépare bien la flaque, mais ça encombre le terrain avant que la zone n'apparaisse.", dict(im='fissure')),
     ("LA CARAPACE ÉCLATE EN MORCEAUX", "Elle se brise et les éclats retombent en formant le cercle. C'est le plus joli enchaînement vers la flaque, mais c'est aussi le plus long à dessiner.", dict(im='eclat')),
     ("PAS D'IMPACT : ELLE FOND DANS LE SOL", "Elle se dissout doucement en flaque. Le plus doux et le plus élégant, mais on ne sent plus qu'elle est tombée de haut.", dict(im='fond')),
     ("DES FAISCEAUX PARTENT DANS TOUS LES SENS", "Non pas une colonne centrale, qui masquerait ce qui se passe dessous, mais SEPT faisceaux violets qui jaillissent en étoile, chacun dans sa direction et à sa longueur. On voit l'impact de partout sur le terrain sans rien perdre du point de chute.", dict(im='faisceaux')),
     ("SECOUSSE SEULE, SANS EFFET", "L'écran tremble, rien d'autre. Le plus sobre et le plus propre, mais un ultime mérite mieux qu'un tremblement.", dict(im='secousse')),
     ("LES JOUEURS PROCHES SONT REPOUSSÉS", "Un souffle écarte qui se trouve au point de chute. Ça donne une raison de ne pas rester là, mais ça ajoute un effet que le cahier des charges n'a pas demandé.", dict(im='souffle')),
     ("LE DISQUE EST DÉVIÉ S'IL PASSE LÀ", "L'onde bouscule le disque. Ça lie l'ultime au jeu, mais le cahier des charges dit que l'ultime ne touche pas au disque.", dict(im='disque')),
    ], multi=True)

# --- 4. LA FLAQUE ----------------------------------------------------------
sec('flaque', '4 · La flaque au sol',
    "C'est ELLE, la zone active — pas la carapace, qui n'est qu'une mise en "
    "scène. Elle doit trancher nettement sur le sol et pulser doucement, et "
    "elle reste six à huit secondes : c'est l'élément qu'on regardera le plus "
    "longtemps de tout l'ultime, donc celui qui a le moins le droit de fatiguer.",
    [
     ("CERCLE PULSANT AVEC DES RUNES", "Un disque violet translucide qui respire, avec des runes psychiques dedans. La lecture du cahier des charges, et la plus lisible sur un sol sombre.", dict(fl='runes')),
     ("DES FISSURES PSYCHIQUES", "Pas de runes mais un réseau de fêlures lumineuses. Plus brutal et plus Bowser, mais moins Mewtwo.", dict(fl='fissures')),
     ("UN SIMPLE DISQUE PLEIN", "Aucun motif, juste un aplat violet qui pulse. Le plus propre et celui qui gêne le moins la lecture du jeu, mais aussi le plus fade.", dict(fl='plein')),
     ("SEULEMENT UN ANNEAU, CREUX AU MILIEU", "Le bord est marqué, l'intérieur reste clair. On voit parfaitement où est la limite — et la limite est ce qui compte — mais on oublie qu'on est dedans.", dict(fl='anneau')),
     ("UNE GRILLE PSYCHIQUE, LÉGÈRE ET CLIGNOTANTE", "Un quadrillage à peine visible qui s'allume et s'éteint lentement, comme un champ de force qui grésille. À pleine opacité il se disputait avec les lignes du terrain ; discret et intermittent, il ajoute la texture sans encombrer.", dict(fl='grille')),
     ("ELLE TOURNE LENTEMENT", "Le motif pivote sur lui-même. Ça la rend vivante sans qu'elle clignote, mais une rotation lente pendant huit secondes finit par attirer l'œil.", dict(fl='tourne')),
     ("ELLE RÉTRÉCIT AVEC LE TEMPS", "Le cercle se resserre à mesure que la durée s'écoule. C'est un compte à rebours qu'on lit sans chiffre, et c'est le plus élégant du lot ; en revanche l'adversaire regagne du terrain tout seul.", dict(fl='retrecit')),
     ("UN BROUILLARD BAS PLUTÔT QU'UN DÉCALQUE", "De la brume violette au ras du sol. Très atmosphérique, mais on ne voit plus le bord, donc on ne sait plus si on est dedans.", dict(fl='brume')),
     ("DES PICS D'ÉNERGIE PLANTÉS DEDANS", "La carapace laisse ses pics fichés dans le sol. Ça garde le lien avec Bowser, mais ça encombre une zone où les deux joueurs vont passer.", dict(fl='pics')),
     ("ELLE CLIGNOTE QUAND ELLE VA DISPARAÎTRE", "Rien ne change pendant six secondes, puis elle bat plus vite sur la fin. Prévient honnêtement, mais un clignotement rapide finit par agacer.", dict(fl='fin')),
    ], multi=True)

# --- 5. L'EFFET SUR L'ADVERSAIRE -------------------------------------------
sec('effet', "5 · Ce que la zone fait à l'adversaire",
    "Le cahier des charges fixe le principe : ralenti de 20 à 30 %, dash "
    "autorisé mais ralenti lui aussi, et sa jauge d'ultime qui se vide de 1,5 "
    "à 2 % par seconde. Les variantes règlent le curseur entre « il l'évite "
    "par confort » et « il ne peut plus jouer ».",
    [
     ("RALENTI 25 %, 60 % DE SA JAUGE — RETENU", "Le drain est réglé comme une PART DE LA JAUGE et non comme une vitesse : rester dedans du début à la fin coûte 60 % de sa barre, soit 8,6 %/s sur sept secondes. Le cahier des charges disait 1,5 à 2 %/s ; l'écart est assumé. C'est assez pour que la traverser soit une vraie décision, pas assez pour que ce soit un interdit — à 84 % on ne la traversait plus, on en faisait le tour, et un ultime qu'on contourne ne crée aucune situation. C'est le premier chiffre à rebaisser si elle paraît trop forte.", dict(ef={'slow': .25, 'drain': 60/7})),
     ("RALENTI 20 %, DRAIN 1,5 %/s", "Le bas de la fourchette. Le plus doux à subir, mais il risque de traverser la zone sans y penser.", dict(ef={'slow': .20, 'drain': 1.5})),
     ("RALENTI 30 %, DRAIN 2 %/s", "Le haut de la fourchette. La zone devient un vrai mur, mais le contrôle perdu se vit mal sur un jeu de réflexe.", dict(ef={'slow': .30, 'drain': 2.0})),
     ("RALENTI SEUL, PAS DE DRAIN", "La zone gêne mais ne punit pas. Beaucoup plus juste, mais l'ultime perd son intention — vider la jauge d'en face.", dict(ef={'slow': .30, 'drain': 0})),
     ("DRAIN SEUL, PAS DE RALENTI", "Il traverse normalement mais perd sa jauge, encore plus vite. Très original et sans frustration de contrôle, mais on ne SENT rien quand on y entre.", dict(ef={'slow': 0, 'drain': 9})),
     ("LE RALENTI S'AGGRAVE AVEC LE TEMPS PASSÉ DEDANS", "Léger à l'entrée, lourd si on s'attarde. Récompense celui qui réagit vite, mais ça ajoute une règle invisible à comprendre.", dict(ef={'slow': .35, 'drain': 1.75})),
     ("LE DASH EST INTERDIT DANS LA ZONE", "Il peut marcher mais pas s'élancer. Beaucoup plus fort et très lisible, mais le cahier des charges dit explicitement que le dash reste autorisé.", dict(ef={'slow': .25, 'drain': 1.75})),
     ("SA VISÉE TREMBLE AUSSI", "En plus du ralenti, son tir part de travers. Très Mewtwo, mais c'est déjà ce que fait la cloche de Jingle.", dict(ef={'slow': .25, 'drain': 1.75})),
     ("SON ATTRAPÉ EST RÉDUIT", "Son rayon d'attrapé rétrécit dans la zone. Ça touche le cœur du jeu et pas seulement le déplacement, mais ça se voit très mal.", dict(ef={'slow': .25, 'drain': 1.75})),
     ("ÇA MARCHE AUSSI SUR LE LANCEUR", "La zone ne fait pas de distinction. Le plus équitable et le plus facile à équilibrer, mais on se punit soi-même en la posant.", dict(ef={'slow': .25, 'drain': 1.75})),
    ])

# --- 6. COMMENT ON VOIT QU'IL EST DEDANS -----------------------------------
sec('marque', "6 · Comment on voit qu'il est ralenti",
    "Un effet qu'on ne voit pas n'existe pas : sans marque sur le personnage, "
    "l'adversaire croit à une latence et pas à un ultime. Le cahier des charges "
    "propose des traînées violettes aux pieds et une distorsion de l'air.",
    [
     ("TRAÎNÉES AUX PIEDS ET DISTORSION", "Ses pas laissent une traînée violette et l'air ondule autour de lui. La lecture du cahier des charges, et celle qui se voit des deux côtés.", dict(ma='trainee')),
     ("UNE AURA VIOLETTE AUTOUR DE LUI", "Un halo qui le suit tant qu'il est dedans. Le plus lisible de loin, mais il masque son sprite.", dict(ma='aura')),
     ("DES CHAÎNES PSYCHIQUES AUX CHEVILLES", "Deux liens lumineux qui le retiennent au sol. Très parlant et très beau, mais ça suggère une immobilisation qui n'existe pas.", dict(ma='chaines')),
     ("SON SPRITE DEVIENT VIOLET", "Il se teinte entièrement. Impossible à rater, mais on ne reconnaît plus quel personnage c'est.", dict(ma='teinte')),
     ("DES IMAGES RÉMANENTES DERRIÈRE LUI", "Comme un décalage entre lui et son image. Très juste pour dire « tu es ralenti », mais on peut le lire comme du lag.", dict(ma='remanence')),
     ("RIEN SUR LUI, TOUT SUR LE SOL", "Seule la flaque marque. Le plus propre visuellement, mais celui qui subit ne comprend pas ce qui lui arrive.", dict(ma='rien')),
     ("SA BARRE D'ULTIME CLIGNOTE EN ROUGE", "Le drain est montré sur le HUD plutôt que sur le perso. C'est là qu'on regarde quand on perd sa jauge, mais l'effet quitte le terrain.", dict(ma='hud')),
     ("DES PARTICULES QUI MONTENT DE LUI", "Son énergie s'échappe vers le haut. C'est le drain rendu visible, et c'est le plus juste des dix ; en revanche ça ne dit rien du ralenti.", dict(ma='drainvfx')),
     ("LE SOL COLLE À SES PIEDS", "De la matière violette s'étire quand il lève le pied. Très matériel et très satisfaisant, mais c'est le plus coûteux à dessiner.", dict(ma='colle')),
     ("TOUT EN MÊME TEMPS", "Traînées, aura, particules et HUD. Impossible de ne pas comprendre, mais l'écran devient illisible.", dict(ma='tout')),
    ], multi=True)

# --- 7. LE GEL DE SA PROPRE JAUGE ------------------------------------------
sec('gel', '7 · Le gel de sa propre jauge',
    "La règle anti-spam du cahier des charges : tant que la flaque est active, "
    "le lanceur ne peut plus charger son ultime. C'est une contrainte qu'il "
    "s'impose, donc il faut qu'il la VOIE — sinon il croira à un bug.",
    [
     ("SA JAUGE SE GRISE ET SE GÈLE", "La barre devient grise et cesse de bouger. Le plus clair et le plus sobre, et on comprend tout de suite que c'est voulu.", dict(ge='gris')),
     ("UN CADENAS SUR LA JAUGE", "Une icône par-dessus la barre. Impossible à mal comprendre, mais une icône de plus dans un HUD déjà chargé.", dict(ge='cadenas')),
     ("LA JAUGE PORTE LE COMPTE À REBOURS", "Elle affiche les secondes restantes de la zone. Deux informations pour le prix d'une, mais des chiffres dans le HUD pendant l'action se lisent mal.", dict(ge='compte')),
     ("ELLE SE REMPLIT DE VIOLET AU LIEU DE SE GELER", "La barre montre la durée de la zone plutôt que la charge. Élégant et sans élément nouveau, mais on croit qu'on recharge.", dict(ge='violet')),
     ("RIEN : LE GEL EST SILENCIEUX", "Aucune indication. Le plus propre visuellement, mais le joueur croira à un bug la première fois.", dict(ge='rien')),
     ("UN LIEN LUMINEUX ENTRE LUI ET LA FLAQUE", "Un fil violet le relie à sa zone. On comprend que la zone lui coûte quelque chose, et c'est le plus joli du lot ; en contrepartie ça révèle sa position.", dict(ge='lien')),
     ("PAS DE GEL, MAIS UNE RECHARGE DEUX FOIS PLUS LENTE", "Il charge quand même, moitié moins vite. Plus doux à jouer, mais l'anti-spam est moins net.", dict(ge='moitie')),
     ("PAS DE GEL, MAIS LA ZONE COÛTE PLUS CHER À POSER", "La jauge n'est pas gelée, l'ultime demande simplement une recharge plus longue. Le plus simple à comprendre, mais on perd la couche stratégique voulue.", dict(ge='cher')),
     ("LE GEL DURE PLUS LONGTEMPS QUE LA ZONE", "Deux secondes de plus après la disparition. Punit vraiment le mauvais timing, mais c'est le plus sévère pour le lanceur.", dict(ge='plus')),
     ("IL PEUT ANNULER SA ZONE POUR DÉGELER", "Un deuxième appui fait disparaître la flaque et rend la charge. Beaucoup de contrôle et une vraie décision, mais une commande de plus à expliquer.", dict(ge='annule')),
    ])

# --- 8. LES CHIFFRES -------------------------------------------------------
sec('chiffres', '8 · Les chiffres',
    "Durée de la zone, recharge, rayon. Le cahier des charges donne les "
    "fourchettes : six à huit secondes de zone, vingt-cinq à trente de "
    "recharge après la fin, et un rayon qui couvre environ 30 % de la moitié "
    "adverse.",
    [
     ("7 s, RAYON QUI GRANDIT AVEC L'ÉCART — RETENU", "Sept secondes de zone. Aucune recharge en secondes : la jauge est simplement INCHARGEABLE pendant ces sept secondes, puis elle repart normalement — l'anti-spam est le gel lui-même, pas un compteur en plus. Et le rayon part de 30 % mais GRANDIT avec la distance entre les deux joueurs : plus l'adversaire est loin, plus la zone est large. Ça récompense le fait de le poser au bon moment plutôt que de le poser sur lui.", dict(ch2={'dur': 7, 'cd': 0, 'ray': .30, 'ecart': True})),
     ("6 s, 25 s, RAYON 30 %", "Le bas de la fourchette : la zone passe vite et revient vite. Plus nerveux, mais moins marquant.", dict(ch2={'dur': 6, 'cd': 25, 'ray': .30})),
     ("8 s, 30 s, RAYON 30 %", "Le haut de la fourchette : une zone qui pèse longtemps et se mérite. Plus stratégique, mais deux ultimes par match seulement.", dict(ch2={'dur': 8, 'cd': 30, 'ray': .30})),
     ("7 s, 27 s, RAYON 20 %", "Une zone plus petite, donc un placement plus exigeant. Récompense la précision, mais rate souvent.", dict(ch2={'dur': 7, 'cd': 27, 'ray': .20})),
     ("7 s, 27 s, RAYON 45 %", "Une zone énorme, presque la moitié du camp. Impossible à éviter en jouant normalement, donc probablement trop fort.", dict(ch2={'dur': 7, 'cd': 27, 'ray': .45})),
     ("4 s, 15 s, RAYON 30 %", "Courte et fréquente. L'ultime devient un outil de harcèlement, mais il perd son statut d'ultime.", dict(ch2={'dur': 4, 'cd': 15, 'ray': .30})),
     ("12 s, 40 s, RAYON 30 %", "Une zone qui dure un quart de point. Mémorable et vraiment décisive, mais elle sort une fois par match.", dict(ch2={'dur': 12, 'cd': 40, 'ray': .30})),
     ("7 s, RECHARGE SUR JAUGE SEULE", "Pas de recharge en secondes : il revient quand la jauge se remplit, comme le reste du roster. Cohérent avec le jeu, mais moins réglable finement.", dict(ch2={'dur': 7, 'cd': 0, 'ray': .30})),
     ("LA DURÉE DÉPEND DU TEMPS DE CHARGE", "Plus la jauge était pleine, plus la zone dure. Récompense la patience, mais ajoute une règle à expliquer.", dict(ch2={'dur': 9, 'cd': 27, 'ray': .30})),
     ("7 s, 27 s, LE RAYON GRANDIT AVEC LE SCORE", "Plus il est mené, plus la zone est grande. Rattrape les matchs déséquilibrés, mais récompense le fait de perdre.", dict(ch2={'dur': 7, 'cd': 27, 'ray': .35})),
    ])
