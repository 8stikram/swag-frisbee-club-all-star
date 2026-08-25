import { G, Mouse, comment } from '../game/state.js';
import { COURT, CY, GOAL_TOP, GOAL_BOTTOM } from '../core/constants.js';
import { norm, gauss, clamp } from '../core/utils.js';
import { gaussJeu, aleaJeu, pickJeu } from '../core/alea.js';
import { sfx } from '../audio/audio.js';
import { burst } from '../game/fx.js';
import { throwDisc, viseVersAvant } from '../game/actions.js';
import { buildSprite } from './characters.js';
// Le terminal du piratage vit dans son propre module, sans dépendance : le
// réseau doit pouvoir en fabriquer un chez l'invité, et l'importer d'ici
// aurait fermé un cycle (specials -> actions -> partie -> specials).
import { construireTerminal } from './hack-terminal.js';

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
      sfx('sixpaths'); comment('LES SIX CHEMINS !!');
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
      sfx('special'); comment('RAFALE TRIPLE !');
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
      G.bell = {
        owner: p, side: p.side, t: 0, dur: 7,
        x: p.side === 1 ? COURT.left + 54 : COURT.right - 54,
        y: CY, ring: 0, bal: 0, sens: undefined
      };
      G.banner = { text: 'CLOCHE DE MINUIT !!', color: '#f5c542', t: 0, dur: 1.3 };
      G.shake = 12;
      sfx('roar'); comment('LA CLOCHE SONNE MINUIT !');
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
      sfx('mamie-ulti'); comment('C\'EST L\'HEURE DE LA RAFALE !');
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
      sfx('hack'); comment('IL PREND LA MAIN !');
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
