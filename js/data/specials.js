import { G, Mouse, comment } from '../game/state.js';
import { COURT, CY, GOAL_TOP, GOAL_BOTTOM } from '../core/constants.js';
import { norm, gauss, clamp, pick } from '../core/utils.js';
import { gaussJeu, aleaJeu, pickJeu } from '../core/alea.js';
// `pick` (pas `pickJeu`) : ce choix ne décide de rien pour la simulation,
// seulement du texte affiché — comme pour les commentaires de but dans
// actions.js, pas besoin qu'il soit synchronisé entre l'hôte et l'invité.
import { Partie, etiquetteJoueur } from '../reseau/partie.js';
import { sfx } from '../audio/audio.js';
import { burst } from '../game/fx.js';
import { throwDisc, viseVersAvant } from '../game/actions.js';
import { buildSprite } from './characters.js';
// Le terminal du piratage vit dans son propre module, sans dépendance : le
// réseau doit pouvoir en fabriquer un chez l'invité, et l'importer d'ici
// aurait fermé un cycle (specials -> actions -> partie -> specials).
import { construireTerminal } from './hack-terminal.js';

// Commentaire de déclenchement d'un ultime : varié, et cite le pseudo en
// ligne plutôt qu'un texte générique — en multi les deux joueurs sont de
// vraies personnes, pas un « P1 »/« CPU ». `nommes` reçoit ce pseudo et
// renvoie ses propres variantes (accord/place du nom changent selon la
// phrase, un simple gabarit commun n'aurait pas suffi).
function commentUlti(p, generiques, nommes) {
  const nom = Partie.active ? etiquetteJoueur(p) : null;
  comment(nom ? pick(nommes(nom)) : pick(generiques), undefined, 'ultimate');
}

// Sprite pixel-art de la Jambe de Maman (référence Binding of Isaac : chair
// pâle et grumeleuse/malsaine, pas une jambe humaine propre, qui se termine
// en escarpin rouge à talon aiguille). 16 large, du haut de cuisse (rang 0)
// au talon qui touche le sol (dernier rang), même technique que les persos
// (buildSprite).
const PAL_LEG = { S: '#f4c9c9', s: '#dba3a8', d: '#c47f86', R: '#d81c4a', r: '#8f0f2c', H: '#ff5c7a', E: '#2a0f18' };
const LEG_ROWS = [
  "..sSSSSSSSSSSs..", "..sSSdSSSSSSSs..", "..sSSSSSSSSSSs..", "..sSSSSSSSSdSs..",
  "...sSSSSSSSSs...", "...sSSSdSSSSs...", "...sSSSSSSSSs...", "...sSSSSdSSSs...", "...sSSSSSSSSs...", "...sSdSSSSSSs...",
  "....sSSSSSSs....", "....sSSSdSSs....", "....sSSSSSSs....", "....sSdSSSSs....", "....sSSSSSSs....", "....sSSSSdSs....",
  "....sSSSSSSs....", "....sSSdSSSs....",
  ".....sSSSSs.....", ".....sSdSSs.....", ".....sSSSSs.....", ".....sSSdSs.....", ".....sSSSSs.....", ".....sdSSSs.....",
  "....RRRRRRR.....",
  "....RRRRRRRR....", "...RRRRRRRRRR...", "..RRRRRRRRRRRR..", "..RRRRRHRRRRRR..",
  "..rr..RRRRRRRR..", "...r...RRRRRR...",
  "...E...EEEEEE...",
];
export const LEG_SPRITE = buildSprite(LEG_ROWS, PAL_LEG);
export const LEG_SPRITE_SCALE = 4;

// Cloche de Minuit : la tête de Jingle Bells, devenue géante. Dessinée en pixel
// art comme le reste du jeu plutôt qu'au vectoriel, pour rester dans le même
// langage visuel. 24 de large, du crochet jusqu'au battant.
// C'est la seule image importée du jeu : tous les autres sprites sont peints
// pixel par pixel ici. L'ultime a le droit de trancher — la cloche reste sept
// secondes à l'écran, en grand, c'est le moment spectaculaire du personnage.
// Elle se charge de façon asynchrone : le rendu vérifie donc `complete` avant
// de la dessiner, pour ne pas cracher si l'ultime part avant la fin du
// chargement.
export const BELL_SPRITE = new Image();
BELL_SPRITE.src = 'assets/img/cloche-ulti.png';

// ---------------------------------------------------------------------------
// WHITE TIGER, l'ultime de 2hollis. Modele : l'ultime de Seraphine dans League
// of Legends — une onde qui file en ligne droite, immobilise ce qu'elle touche
// et ATTIRE la cible vers le lanceur. Reglages arretes dans
// mockups/2hollis-ulti.html : 1A 2A 3A 4A 5B 6B 7A 8A.
export const WT_CHANT = .55;      // le chant AVANT que le tigre parte : c'est
                                  // l'annonce, et c'est elle qui le rend
                                  // esquivable. Sans elle l'adversaire subit
                                  // sans comprendre, ce qui se vit tres mal.
export const WT_VITESSE = 980;    // px/s, la traversee
export const WT_RAYON = 52;       // demi-largeur du contact
export const WT_BANDE = 62;       // demi-hauteur de la bande touchee
export const WT_STUN = 1.2;       // choix 6B, la valeur de Seraphine
export const WT_ATTIRE = 210;     // px/s, la vitesse a laquelle il est traine
export const WT_SORTIE = .22;     // le tigre s'efface au contact, en ce temps
// L'image du tigre, la seule que je ne peins pas pixel par pixel — comme la
// cloche de Jingle. Elle porte deja son canal alpha, aucun detourage.
export const TIGRE_SPRITE = new Image();
TIGRE_SPRITE.src = 'assets/img/2hollis-tigre.webp';

// ---------------------------------------------------------------------------
// PSYCHO-SHELL, l'ultime de Flowser-Two. Reglages arretes dans
// mockups/flowser-ulti.html : 1A 2ADE 3ABDEG 4ABEGH 5A 6ABC 7A 8A.
//
// C'est le seul ultime du jeu qui pose une ZONE QUI DURE, le seul qui draine
// la jauge d'en face, et le seul qui COUTE quelque chose a son lanceur pendant
// qu'il agit.
export const PS_CHANT = .55;    // l'incantation : le cercle de runes s'ecrit
export const PS_CHUTE = .45;    // la carapace se recompose et tombe
export const PS_IMPACT = .3;    // l'impact, sans secousse : la camera recule
export const PS_DUREE = 7;      // la flaque, et le gel de la jauge du lanceur
export const PS_SLOW = .25;     // ce qu'elle retire a la vitesse de l'adversaire
export const PS_DRAIN = 12;     // %/s de sa jauge, soit 84 % sur sept secondes
// Le chiffre est parti de 2,5, puis 7,5, et il est ici a DOUZE — six fois le
// haut de la fourchette du cahier des charges, qui disait 1,5 a 2 %/s.
//
// Ce que ca veut dire concretement : rester dans le cercle du debut a la fin
// vide QUATRE CINQUIEMES de sa jauge. La zone n'est plus une gene ni meme une
// punition, c'est un INTERDIT — on ne la traverse pas, on en fait le tour. Et
// comme elle couvre jusqu'a 45 % de son camp, ca l'oblige a jouer sur les
// bords pendant sept secondes.
//
// C'est le premier chiffre a rebaisser si elle parait trop forte en match, et
// il vit seul ici : une ligne, aucune autre a toucher.
export const PS_RAY = .30;      // part de l'aire de la moitie adverse
// Le rayon GRANDIT avec l'ecart entre les deux joueurs, jusqu'a moitie plus :
// ca recompense de poser la zone au bon moment plutot que sur lui.
export const PS_RAY_ECART = .5;

// Registre des attaques spéciales. Pour ajouter une spéciale : une entrée ici,
// puis `ult:'<clé>'` sur le personnage dans data/characters.js.
//   needsDisc : refuse le cast si le perso n'a pas le disque
//   cast(p)   : déclenche la spéciale
//   launch(p) : optionnel, appelé par la boucle à la fin de la cinématique
// Le bleu du Rasengan, porté par le tir : traînée, disque et impacts. La tenue
// et les orbes restent dorées — le chakra ne vire au bleu qu'au moment du tir.
export const RASENGAN = '#5ad2ff';

// Durée de la tenue Six Paths après le cast. À 4,2 s elle ne couvrait guère
// que le tir d'ultime et un échange ; à 8 s elle laisse le temps de plusieurs
// Rasengan, ce qui en fait un vrai passage de puissance et plus un éclair.
export const SIX_DUREE = 8;
// Les six orbes : rayon de l'anneau, hauteur au-dessus des pieds, et vitesse de
// rotation. Volontairement lente — à pleine vitesse elles tiraient l'œil hors
// du disque, qui est la seule chose que le joueur doit suivre.
export const SIX_ORBES = { n: 6, rayon: 40, hauteur: 34, vitesse: .55 };

// Durée pendant laquelle Leon garde le bras tendu après le Tir Matilda.
export const MATILDA_VISEE = .75;
// Le pistolet, tenu au bout du bras tendu. Dessiné en pixel art comme le reste.
// buildSprite produit toujours une toile de 16 de large : le pistolet n'occupe
// que les 8 premières colonnes, le rendu ne découpe donc que cette moitié.
const PAL_GUN = { K: '#23262e', k: '#14161c', V: '#8b929e', B: '#5a4028' };
export const GUN_SPRITE = buildSprite([
  "KKKKKKV.",
  "KkkkkkV.",
  "KKKKKKK.",
  ".BBK.K..",
  ".BBK....",
  ".BB.....",
  "..B.....",
  "........"
], PAL_GUN);

// --- Piratage de Cyberleek --------------------------------------------------
// Six secondes de commandes inversées. Assez pour perdre un échange, trop court
// pour rendre la partie injouable — c'est le réglage qu'on cherche : l'ultime
// doit coûter un point, pas la partie.
export const PIRATAGE_DUREE = 6;
export const PIRATAGE_INTRO = 1.35;

// --- La ruée des Yoshi -------------------------------------------------------
// Choix arrêtés dans mockups/yoshi-ulti.html : 1A 2A 3A 4J 5B 6B 7E 8C. La
// horde débarque de derrière Yoshi, pousse le disque devant elle ET bouscule
// l'adversaire, en grappe désordonnée multicolore, sur un réglage agressif.
//
// Elle cumule donc les deux effets, ce que le mockup signalait comme le vrai
// risque d'équilibrage : sur ce réglage elle peut gagner le point à elle
// seule. Le premier bouton à baisser, si ça se confirme en match, est
// RUEE_POUSSEE — pas la durée, qui est déjà la plus courte du roster.
export const RUEE_DUREE = 1.2;      // la traversée, d'un bord à l'autre
export const RUEE_N = 16;           // seize Yoshi, en grappe désordonnée
export const RUEE_POUSSEE = 540;    // ce que la horde ajoute à la vitesse de l'adversaire
export const RUEE_DISQUE = 430;     // la vitesse minimale qu'elle impose au disque
export const RUEE_CTRL = 1;         // seconde de contrôle perdu par l'adversaire
export const RUEE_LARGEUR = 46;     // demi-épaisseur du front, en unités de terrain

// --- Le chien de Yuki --------------------------------------------------------
// Trois secondes plein écran. C'est long : dans un jeu de disque, ne pas voir
// le disque pendant trois secondes revient à ne pas pouvoir l'attraper. Le
// réglage est assumé tel quel pour l'instant, à revoir en jouant.
export const CHIEN_DUREE = 3;
// La vidéo du chien, détourée à la volée. Elle se charge en arrière-plan dès
// le démarrage : la décoder au moment du cast aurait fait apparaître le chien
// une demi-seconde trop tard. Muette et en boucle — on ne la « joue » jamais
// vraiment, on lui prend juste son image courante.
export const CHIEN_VIDEO = document.createElement('video');
CHIEN_VIDEO.src = 'assets/video/yuki-chien.mp4';
CHIEN_VIDEO.muted = true; CHIEN_VIDEO.loop = true;
CHIEN_VIDEO.playsInline = true; CHIEN_VIDEO.preload = 'auto';
CHIEN_VIDEO.addEventListener('loadeddata', () => { CHIEN_VIDEO.play().catch(() => { }); });


export const SPECIALS = {
  kurama: {
    name: 'SIX PATHS',
    desc: 'Passe en mode Six Paths : tenue dorée, six orbes, et un tir qui traverse tout.',
    needsDisc: true,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      p.charging = false; p.wasCharging = false; p.charge = 0;
      G.cine = { t: 0, p, launched: false, ult: 'kurama' };
      G.timescale = .22; G.tsTimer = 1.0; G.shake = 10;
      G.banner = { text: 'SIX PATHS !!!', color: '#ffd23e', t: 0, dur: 1.3 };
      // L'écran blanchit d'un coup : quand il redevient lisible, Naruto a
      // changé de tenue. La transformation ne se regarde pas, elle se constate
      // — c'est ce qui la rend brutale plutôt que longue.
      // Volontairement en dessous du seuil de saturation (1.82) : l'écran
      // s'éclaircit fortement sans jamais devenir entièrement blanc, et
      // s'éteint en six dixièmes. On perd le voile aveuglant, on garde la
      // bascule — c'est encore le flash qui cache le changement de tenue.
      G.flash = 1.3;
      // Tenue dorée et six orbes, le temps que l'échange se joue.
      p.sixT = SIX_DUREE; p.sixA = 0;
      sfx('sixpaths'); commentUlti(p,
        ['LES SIX CHEMINS !!', 'LE MODE SIX CHEMINS !!', 'NARUTO LIBÈRE LE CHAKRA !'],
        n => [`${n} PASSE EN SIX CHEMINS !!`, `${n} LIBÈRE TOUT SON CHAKRA !`, `LE MODE SIX CHEMINS DE ${n} !!`]);
    },
    launch(p) {
      let dir;
      if (p.human) {
        dir = norm(Mouse.x - p.x, Mouse.y - p.y);
        // L'ultime est déjà consommé quand on arrive ici : contrairement à un
        // tir ordinaire, on ne peut pas simplement l'annuler. Une visée partie
        // vers l'arrière est donc retournée vers la cage adverse.
        if (!viseVersAvant(p, dir)) dir = norm(-dir.x, dir.y);
      } else {
        // Semé : ce tirage choisit où part le disque, donc l'issue du point.
        const zy = pickJeu([GOAL_TOP + 34, GOAL_BOTTOM - 34, CY]);
        const tx = p.side === 1 ? COURT.right : COURT.left;
        dir = norm(tx - p.x, zy + gaussJeu() * 40 - p.y);
      }
      p.face = dir.x >= 0 ? 1 : -1;
      throwDisc(p, dir, 1150 * p.char.power, 'kurama');
      burst(p.x + dir.x * 30, p.y + dir.y * 30, RASENGAN, 30);
      G.shake = 16; sfx('special');
    }
  },

  matilda: {
    name: 'TIR MATILDA',
    desc: 'Rafale triple.',
    needsDisc: true,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      G.banner = { text: 'TIR MATILDA !!', color: '#9fe8ff', t: 0, dur: 1.2 };
      G.timescale = .15; G.tsTimer = .14;
      // Bras tendu, canon à l'horizontale : la lecture la plus directe, on voit
      // qu'il vise avant même que les disques partent.
      p.viseT = MATILDA_VISEE;
      sfx('special'); commentUlti(p,
        ['RAFALE TRIPLE !', 'TIR MATILDA !', 'TROIS DISQUES D\'UN COUP !'],
        n => [`RAFALE TRIPLE DE ${n} !`, `${n} DÉGAINE LE TIR MATILDA !`, `${n} ENVOIE TROIS DISQUES D'UN COUP !`]);
      let dir;
      if (p.human) { dir = norm(Mouse.x - p.x, Mouse.y - p.y); }
      else {
        // Semé : ce tirage choisit où part le disque, donc l'issue du point.
        const zy = pickJeu([GOAL_TOP + 34, GOAL_BOTTOM - 34, CY]);
        const tx = p.side === 1 ? COURT.right : COURT.left;
        dir = norm(tx - p.x, zy + gaussJeu() * 30 - p.y);
      }
      const a0 = Math.atan2(dir.y, dir.x), sp = 980 * p.char.power;
      throwDisc(p, { x: Math.cos(a0), y: Math.sin(a0) }, sp, 'matilda');
      for (const off of [-.26, .26]) {
        const a = a0 + off;
        G.decoys.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * sp * .93, vy: Math.sin(a) * sp * .93, life: 2.0, real: false, thrower: p });
      }
      // Semé : c'est une décision d'IA, et deux IA qui ne suivent pas le même
      // leurre ne jouent plus le même match.
      if (p.foe.ai) p.foe.ai.tracked = aleaJeu() < p.foe.ai.diff.smart ? G.disc : G.decoys[(aleaJeu() * 2) | 0];
    }
  },

  // eslint-disable-next-line no-unused-vars
  bell: {
    name: 'CLOCHE DE MINUIT',
    desc: 'Sa tête devient une cloche géante qui protège sa cage.',
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      // Sa tête quitte ses épaules pour aller grossir devant sa propre cage.
      // 2,5 s (était 7) : ce n'est plus une nuisance qui traîne, c'est un
      // arrêt décisif — de quoi couper un échange dangereux d'un coup, pas
      // tenir un siège. Elle couvre toute la hauteur du but pendant qu'elle
      // sonne (voir clocheBloque() dans disc.js) : rien ne passe au-dessus
      // ni en dessous, mais ça ne dure plus longtemps que ça.
      G.bell = {
        owner: p, side: p.side, t: 0, dur: 2.5,
        x: p.side === 1 ? COURT.left + 54 : COURT.right - 54,
        y: CY, ring: 0, bal: 0, sens: undefined
      };
      G.banner = { text: 'CLOCHE DE MINUIT !!', color: '#f5c542', t: 0, dur: 1.3 };
      G.shake = 12;
      sfx('roar'); commentUlti(p,
        ['LA CLOCHE SONNE MINUIT !', 'MINUIT SONNE !', 'LA CLOCHE DE MINUIT !!'],
        n => [`${n} FAIT SONNER MINUIT !`, `LA CLOCHE DE ${n} RETENTIT !`, `${n} DÉCLENCHE LA CLOCHE DE MINUIT !`]);
    }
  },

  whitetiger: {
    name: 'WHITE TIGER',
    desc: 'Il chante, un tigre blanc file droit devant, immobilise l\'adversaire et l\'attire vers lui.',
    // Il part MEME DISQUE EN MAIN : aucune condition de possession, la jauge
    // pleine suffit. C'est ce qui le separe du grappin de Chopper, qui n'a de
    // sens que sans le disque.
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      const dir = p.side === 1 ? 1 : -1;
      G.tigre = { owner: p, t: 0, dir, x: p.x + dir * 30, y: p.y,
                  touche: 0, prise: 0 };
      G.banner = { text: 'WHITE TIGER !!', color: '#35e0ff', t: 0, dur: 1.3 };
      // Pas de secousse au cast : l'annonce retenue est la pose de chant
      // (section 7, variante A), pas un tremblement. La secousse est reservee
      // au CONTACT, ou elle veut dire quelque chose.
      sfx('whiteTiger'); comment('IL CHANTE !!', undefined, 'ultimate');
    }
  },

  psychoshell: {
    name: 'PSYCHO-SHELL',
    desc: 'Une carapace psychique s\'ecrase et laisse une zone qui ralentit l\'adversaire et vide sa jauge.',
    // Il part meme disque en main : c'est une pose de zone, pas un tir.
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      const dir = p.side === 1 ? 1 : -1;
      // PLACEMENT LIBRE A LA SOURIS, borne au camp d'en face. Sans cette borne
      // il pourrait se poser la zone sur lui-meme pour couvrir son propre but,
      // ce qui n'a aucun sens pour un ultime qui ne genera que l'adversaire.
      // Le milieu se recalcule : ce module importe COURT mais pas CX.
      const mid = (COURT.left + COURT.right) / 2;
      const minX = dir > 0 ? mid + 60 : COURT.left + 80;
      const maxX = dir > 0 ? COURT.right - 80 : mid - 60;
      const foe = p.foe;
      // L'IA n'a pas de souris : elle vise l'adversaire, decale devant lui.
      const vx = p.human ? Mouse.x : (foe ? foe.x + dir * 40 : (minX + maxX) / 2);
      const vy = p.human ? Mouse.y : (foe ? foe.y : CY);
      const ecart = foe ? Math.min(1, Math.abs(foe.x - p.x) / ((COURT.right - COURT.left) * .8)) : .5;
      const part = PS_RAY * (1 + ecart * PS_RAY_ECART);
      const r = Math.sqrt(part * ((COURT.right - COURT.left) / 2)
                          * (COURT.bottom - COURT.top) / Math.PI);
      G.psycho = {
        owner: p, t: 0, phase: 0,
        x: clamp(vx, minX, maxX),
        y: clamp(vy, COURT.top + r * .4, COURT.bottom - r * .4),
        r
      };
      G.banner = { text: 'PSYCHO-SHELL !!', color: '#8b4fd6', t: 0, dur: 1.3 };
      // Pas de secousse au cast NI a l'impact : la camera recule au lieu de
      // trembler. C'est le seul ultime du jeu qui fait ca, et c'est voulu —
      // ce qui compte n'est pas le point de chute mais l'etendue de ce qui
      // vient d'etre pose.
      sfx('psycho'); comment('LA CARAPACE TOMBE !!', undefined, 'ultimate');
    }
  },

  ruee: {
    name: 'LA RUÉE DES YOSHI',
    desc: 'Une horde traverse le terrain, pousse le disque et bouscule l\'adversaire.',
    // Elle part de DERRIÈRE Yoshi et fonce vers le but adverse : elle va
    // toujours dans le sens de son attaque, jamais contre lui.
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      const dir = p.side === 1 ? 1 : -1;
      G.ruee = {
        owner: p, t: 0, dur: RUEE_DUREE, dir,
        // Le front part hors du terrain, derrière la ligne de fond de Yoshi.
        x: dir > 0 ? COURT.left - 70 : COURT.right + 70
      };
      G.banner = { text: 'LA RUÉE DES YOSHI !!', color: '#63c23c', t: 0, dur: 1.3 };
      // La secousse EST l'annonce : c'est la variante retenue en section 7.
      // Sans elle l'adversaire subirait une horde sortie de nulle part.
      G.shake = 18;
      sfx('roar'); commentUlti(p,
        ['LA HORDE DÉBOULE !!', 'LA RUÉE DES YOSHI !!', 'ÇA CHARGE DE PARTOUT !'],
        n => [`${n} LÂCHE LA HORDE !!`, `LA RUÉE DES YOSHI DE ${n} !!`, `${n} FAIT DÉBOULER LA HORDE !`]);
    }
  },

  chien: {
    name: 'LE CHIEN DE YUKI',
    desc: 'Un chien débarque plein écran et aveugle l\'adversaire.',
    // Comme l'objet Nintendogs de Smash : aucun dégât, il masque la vue. Ici
    // il ne masque que celle de l'ADVERSAIRE — Yuki continue de voir le
    // terrain. C'est un choix assumé, plus fort que l'objet d'origine qui
    // aveugle tout le monde.
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      // Le chien apparaît d'un coup, sans entrée : `t` sert seulement à savoir
      // quand il repart, et à faire trembler l'image à l'instant du surgissement.
      G.chien = { owner: p, t: 0, dur: CHIEN_DUREE };
      G.banner = { text: 'LE CHIEN DE YUKI !!', color: '#3a86d6', t: 0, dur: 1.3 };
      G.shake = 14;
      sfx('roar'); comment('MAIS D\'OÙ SORT CE CHIEN ?!', undefined, 'ultimate');
    }
  },

  grappin: {
    name: 'CROCHET DE CHOPPER',
    desc: 'Il harponne le disque en vol et se le ramène en main.',
    // Il ne doit PAS avoir le disque : tout l'ultime consiste à aller le
    // chercher. Le garde-fou est dans `cast` — sans disque libre à accrocher,
    // le crochet part dans le vide et gâche la jauge.
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      const d = G.disc;
      // La visée vient de la fiche d'intentions, jamais de la souris : un
      // joueur distant n'a pas de curseur sur cette machine, et son crochet
      // partirait vers le curseur de l'hôte.
      const c = p.cmd;
      let vx = (c && (c.visee.x || c.visee.y)) ? c.visee.x : (p.side === 1 ? 1 : -1);
      let vy = (c && (c.visee.x || c.visee.y)) ? c.visee.y : 0;
      // Si le disque est libre et à portée, le crochet se verrouille dessus :
      // c'est un ultime de sauvetage, pas un tir d'adresse. Sinon il part
      // droit devant et revient bredouille.
      const cible = (d && !d.heldBy) ? d : null;
      if (cible) { const dx = cible.x - p.x, dy = cible.y - p.y;
        const n = Math.hypot(dx, dy) || 1; vx = dx / n; vy = dy / n; }
      p.face = vx >= 0 ? 1 : -1;
      // Le disque se fige à l'instant de l'activation, et reste figé jusqu'à
      // ce que le crochet le morde. Sans ça l'ultime ne servait à rien : le
      // disque franchissait la ligne pendant l'armement et le vol du crochet,
      // alors que tout son intérêt est d'annuler un but déjà parti. Sa vitesse
      // est mise de côté pour lui être rendue si le crochet le rate.
      const vitesse = cible ? { x: cible.vx, y: cible.vy } : null;
      if (cible) { cible.vx = 0; cible.vy = 0; }
      // Les cinq phases du Chain Hook d'origine : armement, vol, accroche,
      // traction, fenêtre de contrôle. `phase` avance dans updateGrappin.
      G.grappin = {
        owner: p, phase: 'arme', t: 0,
        ax: vx, ay: vy,
        hx: p.x, hy: p.y - 18,      // position courante du crochet
        prise: false, verrou: !!cible, vitesse
      };
      G.banner = { text: 'CROCHET DE CHOPPER !!', color: '#e8c23a', t: 0, dur: 1.3 };
      G.shake = 8;
      sfx('throw'); commentUlti(p,
        ['IL VA CHERCHER LE DISQUE !', 'LE CROCHET DE CHOPPER !', 'ACCROCHE-LE !'],
        n => [`${n} VA CHERCHER LE DISQUE !`, `LE CROCHET DE ${n} PART !`, `${n} DÉGAINE LE CROCHET !`]);
    }
  },

  rafale: {
    name: 'RAFALE DE MAMIE',
    desc: 'Elle mitraille dans la direction visée et repousse l\'adversaire.',
    // Comme le Piratage, cet ultime ne touche pas au disque : Mamie tire même
    // les mains vides, ce qui en fait une arme de harcèlement plutôt qu'une
    // conclusion de point.
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      // La rafale dure le temps de la jauge, sans dépendre d'un appui
      // maintenu : en ligne, l'invité n'a pas le clavier de l'hôte, et faire
      // dépendre la durée d'une touche aurait coupé la rafale chez lui.
      G.rafale = { owner: p, t: 0, dur: 2.6, prochainTir: 0 };
      G.banner = { text: 'RAFALE DE MAMIE !!', color: '#c9b380', t: 0, dur: 1.3 };
      G.shake = 10;
      sfx('mamie-ulti'); commentUlti(p,
        ['C\'EST L\'HEURE DE LA RAFALE !', 'MAMIE SORT LA MITRAILLETTE !', 'ATTENTION, RAFALE !'],
        n => [`${n} SORT LA MITRAILLETTE !`, `C'EST L'HEURE DE LA RAFALE DE ${n} !`, `${n} OUVRE LE FEU !`]);
    }
  },

  piratage: {
    name: 'PIRATAGE',
    desc: 'Prend la main sur l\'adversaire : ses commandes partent à l\'envers.',
    // Le seul ultime du jeu qui ne touche ni au disque ni au terrain. Il ne
    // demande donc pas le disque : Cyberleek frappe quand il n'a rien, ce qui
    // en fait une riposte plutôt qu'une conclusion.
    needsDisc: false,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      const foe = p.foe;
      // L'inversion part tout de suite, l'animation se joue par-dessus. La
      // faire attendre la fin du terminal offrirait une seconde de répit à
      // l'adversaire, exactement quand il vient de voir qu'il allait la subir.
      if (foe) foe.piratage = PIRATAGE_DUREE;
      G.hack = { t: 0, dur: PIRATAGE_INTRO, source: p, cible: foe, lignes: construireTerminal() };
      G.timescale = .3; G.tsTimer = .55; G.shake = 9;
      G.banner = { text: 'PIRATAGE !!', color: '#4fe8ff', t: 0, dur: 1.3 };
      sfx('hack'); commentUlti(p,
        ['IL PREND LA MAIN !', 'PIRATAGE EN COURS !', 'LES COMMANDES PARTENT À L\'ENVERS !'],
        n => [`${n} PREND LA MAIN !`, `${n} LANCE LE PIRATAGE !`, `${n} INVERSE LES COMMANDES !`]);
    }
  },

  leg: {
    name: 'LA JAMBE DE MAMAN',
    desc: 'La jambe de Mom tombe du ciel.',
    needsDisc: false,
    cast(p) {
      const foe = p.foe;
      p.meter = 0; p.stats.specials++;
      const err = p.ai ? p.ai.diff.err * .5 : 0;
      const tx = clamp(foe.x + foe.vx * .35 + gaussJeu() * err, COURT.left + 40, COURT.right - 40);
      const ty = clamp(foe.y + foe.vy * .35 + gaussJeu() * 20, COURT.top + 46, COURT.bottom - 46);
      G.leg = { x: tx, yTarget: ty, phase: 'shadow', t: 0, caster: p, side: foe.side, aiDodges: foe.ai ? aleaJeu() < foe.ai.diff.smart : false };
      G.banner = { text: 'LA JAMBE DE MAMAN !!', color: '#ff6a7a', t: 0, dur: 1.2 };
      sfx('legcast');
    }
  }
};
