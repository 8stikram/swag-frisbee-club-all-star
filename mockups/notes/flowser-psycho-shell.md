# PSYCHO-SHELL — direction artistique

Ultime de **Flowser-Two** (Bowser × Mewtwo). Document de référence pour la
séquence in-game, en vue de dessus.

---

## 0. LE PROBLÈME À RÉGLER D'ABORD

La contrainte de différenciation n'a de sens que vérifiée. Les dix ultimes du
jeu ont donc été relus dans `js/data/specials.js` avant d'écrire une ligne, et
il en sort une collision réelle :

**LA JAMBE DE MAMAN fait déjà exactement ça.** Son déroulé, dans
`updateLeg()` : une ombre au sol qui grandit et pulse pendant 0,55 s, puis une
chute de 0,16 s depuis 420 px au-dessus, puis un impact de 0,4 s avec secousse
18, poussière et gerbe de particules. C'est le squelette de Psycho-Shell,
temps pour temps.

Ce n'est pas une raison d'abandonner la chute — le cahier des charges la
demande. C'est une raison de **changer radicalement tout ce qui l'entoure**, et
c'est ce que fait ce document. La différence de fond tient en une phrase :

> **La Jambe est un ÉVÉNEMENT. Psycho-Shell est un LIEU.**

La Jambe tombe, écrase, disparaît : tout est fini en 1,1 s. La carapace tombe
et **reste** — elle se dépose et occupe le terrain sept secondes. Tout le
langage visuel doit dire cette différence, et c'est de là que viennent les
trois décisions les plus importantes ci-dessous.

En revanche, trois choses sont libres et le restent :

- **aucun ultime du jeu n'est violet.** Le roster va du doré au cyan en passant
  par le vert, le bleu, le rose et le beige. La couleur est entièrement à
  prendre ;
- **aucun ultime ne pose une zone qui dure.** Tout est instantané, projectile,
  traversée, ou objet posé devant une cage. Une zone de sol de sept secondes
  est structurellement neuve ;
- **aucun ultime ne draine la jauge d'en face.**

---

## 1. LA SÉQUENCE IN-GAME

**Début — l'incantation (0 → 0,7 s).** Flowser-Two s'arrête net et lévite de
quelques pixels, une main tendue vers l'avant. Sous le curseur, dans le camp
adverse, un cercle de runes violettes **s'écrit** : les runes apparaissent une
par une le long du cercle, dans le sens des aiguilles, comme une phrase qui se
termine. Le cercle ne pulse pas et ne grandit pas — il se remplit. C'est le
premier écart avec la Jambe, dont l'ombre grandit et bat vite : ici on lit un
compte à rebours, pas une masse qui approche.

**Milieu — la convergence (0,7 → 1,15 s).** Des éclats cristallins violets
arrivent de tous les bords de l'écran et convergent au-dessus du cercle. Ils
s'assemblent en vol : la carapace à pics n'existe pas avant d'être arrivée, elle
**se recompose** dans les trois dernières images. Elle est translucide — on voit
le terrain au travers — et elle tourne d'un quart de tour pendant sa descente.

**Impact — le dézoom (1,15 → 1,45 s).** La carapace touche. **Il n'y a pas de
secousse d'écran.** C'est le choix le plus fort du document et c'est
volontairement l'inverse du réflexe : la caméra **recule** au lieu de trembler.
Ce qui compte ici n'est pas le point de chute, c'est l'étendue de ce qui vient
d'être posé, et un tremblement dirait « ça a frappé » alors qu'il faut dire
« ça s'installe ». Les pics se plantent, la coque se fend, et le cercle de runes
s'allume d'un coup sur tout son pourtour.

**Fin — la zone (1,45 → 8,45 s).** La carapace n'est plus là ; la flaque, si.
Un disque violet translucide qui respire lentement, ses runes tournant à peine.
Quand l'adversaire y entre, ses pas laissent des traînées et l'air se tord
autour de lui. Sa barre d'ultime se vide. Celle du lanceur est gelée, grise, et
un fil violet ténu le relie à sa zone : c'est lui qui la tient.

---

## 2. LES TROIS ÉLÉMENTS SIGNATURE

**#1 — Le cercle de runes qui s'écrit.** Aucun autre ultime n'a de télégraphe
qui *se remplit* plutôt que de grandir ou de clignoter. On reconnaît
Psycho-Shell avant même que quoi que ce soit tombe, et à l'endroit exact où ça
va tomber.

**#2 — La carapace cristalline et translucide.** Une forme de carapace à pics
dont on voit le terrain au travers. Le roster n'a aucune forme translucide :
tout y est opaque, du tigre à la cloche. Elle ne se confond avec rien.

**#3 — Le dézoom silencieux à l'impact.** La caméra recule et le son se coupe
une demi-seconde. C'est le seul ultime du jeu où il ne se passe *rien* au moment
où on attend le plus fort, et c'est exactement ce qui le rendra mémorable.

---

## 3. LA PALETTE

| Part | Couleur | Rôle |
|---|---|---|
| **60 %** | Violet améthyste translucide `#8b4fd6` | la carapace, la flaque, les traînées, le fil |
| **30 %** | Blanc-lilas cristallin `#efe4fa` | le cœur des éclats, la ligne du cercle, les runes |
| **10 %** | Cyan glacé `#7ef0ff` | les étincelles d'impact et la distorsion |

**Vérifié contre le roster :** doré `#ffd23e` (Six Paths), jaune `#f5c542`
(Cloche) et `#e8c23a` (Crochet), cyan `#35e0ff` (White Tiger), `#9fe8ff`
(Matilda) et `#4fe8ff` (Piratage), vert `#63c23c` (Ruée), bleu `#3a86d6`
(Chien), rose `#ff6a7a` (Jambe), beige `#c9b380` (Rafale). **Le violet est
libre**, et c'est la seule famille qui l'est.

Un point de vigilance : le cyan d'accent est proche de celui de White Tiger. Il
est cantonné à 10 %, en étincelles brèves, jamais en masse — un accent ponctuel
ne fait pas une identité, mais s'il devait déborder, il faudrait le passer au
blanc pur.

---

## 4. LES CINQ EFFETS

**1 — Particules : les éclats convergents.** Vingt éclats cristallins arrivent
des bords de l'écran et convergent, chacun avec sa traînée. Tirage
**déterministe** (`Math.sin(i*12.9898)*43758.5453`), comme pour tous les effets
du jeu : sans ça, deux machines en ligne verraient deux animations différentes,
et une carte figée de mockup ne rendrait pas ce que l'aperçu montre au même
instant.

**2 — Lumière : la flaque éclaire par en dessous.** Le sol autour du cercle est
teinté de violet en `lighter`, avec un dégradé radial qui décroît vers
l'extérieur. Les lumières s'ajoutent au lieu de se recouvrir — c'est la
différence entre un effet posé *sur* l'image et un effet qui l'éclaire.

**3 — Distorsion : la pesanteur.** Autour de l'adversaire dans la zone, deux ou
trois anneaux concentriques très fins, aplatis, qui remontent lentement le long
de son corps. Pas de vrai shader : à cette échelle, trois ellipses qui montent
suffisent à dire que l'air est lourd.

**4 — Effet d'écran : le dézoom et le silence.** 0,3 s de recul de caméra à
l'impact, sans secousse, et un vignettage violet qui se referme légèrement sur
les bords pendant toute la durée de la zone. Le vignettage est ce qui dit que
le terrain n'est plus tout à fait normal.

**5 — Animation secondaire : le fil du lanceur.** Un trait violet ténu et
ondulant entre Flowser-Two et sa flaque, qui bat au rythme de la pulsation.
C'est la règle anti-spam rendue visible : on comprend que la zone lui coûte
quelque chose, sans lire un mot.

---

## 5. L'AMBIANCE SONORE

Grave et minéral pendant l'incantation — un bourdon sourd qui monte, avec les
runes qui tintent une par une, cristallines et aiguës, comme un compte à
rebours. Puis **le silence** : un demi-temps de rien juste avant l'impact, qui
est ce qui donnera toute sa violence à un moment où l'image, elle, ne tremble
pas. L'impact est un craquement de verre, pas une explosion. Ensuite, pendant
les sept secondes de zone, un bourdonnement bas et continu, à peine audible,
qui ne s'arrête que quand la flaque disparaît.

---

## 6. HÉRITAGE VISUEL

**Ce qui est repris de White Tiger**, parce que ça a été validé : la
**visionneuse** du mockup — ralenti jusqu'à vingt fois, arrêt sur image, pas à
pas, frise cliquable qui sert de chapitrage. Une action de deux secondes ne se
juge pas en boucle. Et l'**arrêt sur image au déclenchement**, qui donne du
poids au départ.

**Ce qui est appris des erreurs de White Tiger**, et appliqué d'emblée :

- une traînée ne se fait **pas** au `fillRect` à dégradé horizontal — ses bords
  haut et bas restent nets et ça se lit comme une bande de peinture posée sur
  le terrain. C'est une suite de halos. La flaque est bâtie pareil ;
- une rémanence se lit par son **espacement**, pas par son opacité. Serrée, elle
  fait une masse collée. Les éclats convergents sont donc largement espacés ;
- un effet qui accompagne quelque chose doit être posé **sur sa trajectoire**
  avec un retard, pas en orbite autour de lui — en orbite, il le couvre ;
- l'étirement d'une forme suit sa **vitesse instantanée**, jamais sa phase :
  accroché à la phase, il saute d'un coup au changement.

**Ce qui est délibérément inversé par rapport à la Jambe de Maman** : la
secousse. La Jambe met `G.shake = 18` à l'impact ; Psycho-Shell n'en met aucune
et dézoome. Deux attaques qui tombent du ciel avec la même secousse seraient la
même attaque.

---

## 7. CHECKLIST DE DIFFÉRENCIATION

- [x] **Palette unique** — le violet est la seule famille libre du roster.
      Vérifié contre les dix bannières.
- [x] **Forme principale unique** — aucune carapace ailleurs, et surtout aucune
      forme **translucide** : le roster est entièrement opaque.
- [ ] **Type d'animation** — *la chute télégraphiée est déjà celle de la Jambe
      de Maman.* Corrigé par : le télégraphe qui s'écrit au lieu de grandir, la
      convergence d'éclats au lieu d'une chute droite, l'absence de secousse, et
      surtout le fait que la carapace **reste** au lieu de disparaître. Le
      squelette est le même, la lecture est l'inverse. **À revérifier une fois
      les deux animées côte à côte** — c'est le seul point de ce document qui ne
      peut pas se trancher sur le papier.
- [x] **Comportement de caméra unique** — c'est le seul ultime qui **dézoome**
      et le seul qui ne secoue pas.
- [x] **Ambiance distincte** — minérale et froide. La Jambe est organique et
      saturée, le Tigre est lyrique, la Ruée est joyeuse, le Chien est comique.
- [x] **Mécanique unique** — seule zone persistante du jeu, seul drain de jauge
      adverse, et seul ultime qui **coûte quelque chose au lanceur** pendant
      qu'il agit.

---

## 8. LE CHIFFRE QUI A BOUGÉ APRÈS COUP

Le drain est passé de 2,5 à **7,5 %/s** — trois fois la valeur d'abord posée,
et cinq fois le haut de la fourchette du cahier des charges (1,5 à 2 %/s).

Sur les sept secondes de zone, ça prend **52,5 % de la jauge adverse** : plus de
la moitié d'un ultime. Le changement d'intention est net et il faut le dire —
à 2,5 la zone **gênait**, à 7,5 elle **punit**. La traverser coûte, y camper est
impensable, et l'adversaire doit contourner un tiers de son propre camp pendant
sept secondes.

C'est aussi le premier chiffre à rebaisser si elle paraît trop forte en match :
il vit seul dans `PS_DRAIN`, une ligne de `js/data/specials.js`.
