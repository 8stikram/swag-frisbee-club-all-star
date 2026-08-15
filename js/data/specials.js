import { G, Mouse, comment } from '../game/state.js';
import { COURT, CY, GOAL_TOP, GOAL_BOTTOM } from '../core/constants.js';
import { norm, gauss, clamp } from '../core/utils.js';
import { sfx } from '../audio/audio.js';
import { burst } from '../game/fx.js';
import { throwDisc } from '../game/actions.js';
import { buildSprite } from './characters.js';

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

// Registre des attaques spéciales. Pour ajouter une spéciale : une entrée ici,
// puis `ult:'<clé>'` sur le personnage dans data/characters.js.
//   needsDisc : refuse le cast si le perso n'a pas le disque
//   cast(p)   : déclenche la spéciale
//   launch(p) : optionnel, appelé par la boucle à la fin de la cinématique
export const SPECIALS = {
  kurama: {
    name: 'KURAMA',
    desc: 'Invoque le Renard à Neuf Queues.',
    needsDisc: true,
    cast(p) {
      p.meter = 0; p.stats.specials++;
      p.charging = false; p.wasCharging = false; p.charge = 0;
      G.cine = { t: 0, p, launched: false, ult: 'kurama' };
      G.timescale = .22; G.tsTimer = 1.0; G.shake = 10;
      G.banner = { text: 'KURAMA !!!', color: '#ff5a1a', t: 0, dur: 1.3 };
      sfx('roar'); comment('KURAMA EST LÂCHÉ !!');
    },
    launch(p) {
      let dir;
      if (p.human) { dir = norm(Mouse.x - p.x, Mouse.y - p.y); }
      else {
        const zy = [GOAL_TOP + 34, GOAL_BOTTOM - 34, CY][(Math.random() * 3) | 0];
        const tx = p.side === 1 ? COURT.right : COURT.left;
        dir = norm(tx - p.x, zy + gauss() * 40 - p.y);
      }
      p.face = dir.x >= 0 ? 1 : -1;
      throwDisc(p, dir, 1150 * p.char.power, 'kurama');
      burst(p.x + dir.x * 30, p.y + dir.y * 30, '#ff8c1a', 30);
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
      sfx('special'); comment('RAFALE TRIPLE !');
      let dir;
      if (p.human) { dir = norm(Mouse.x - p.x, Mouse.y - p.y); }
      else {
        const zy = [GOAL_TOP + 34, GOAL_BOTTOM - 34, CY][(Math.random() * 3) | 0];
        const tx = p.side === 1 ? COURT.right : COURT.left;
        dir = norm(tx - p.x, zy + gauss() * 30 - p.y);
      }
      const a0 = Math.atan2(dir.y, dir.x), sp = 980 * p.char.power;
      throwDisc(p, { x: Math.cos(a0), y: Math.sin(a0) }, sp, 'matilda');
      for (const off of [-.26, .26]) {
        const a = a0 + off;
        G.decoys.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * sp * .93, vy: Math.sin(a) * sp * .93, life: 2.0, real: false, thrower: p });
      }
      if (p.foe.ai) p.foe.ai.tracked = Math.random() < p.foe.ai.diff.smart ? G.disc : G.decoys[(Math.random() * 2) | 0];
    }
  },

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
        y: CY, ring: 0, next: 0
      };
      G.banner = { text: 'CLOCHE DE MINUIT !!', color: '#f5c542', t: 0, dur: 1.3 };
      G.shake = 12;
      sfx('roar'); comment('LA CLOCHE SONNE MINUIT !');
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
      const tx = clamp(foe.x + foe.vx * .35 + gauss() * err, COURT.left + 40, COURT.right - 40);
      const ty = clamp(foe.y + foe.vy * .35 + gauss() * 20, COURT.top + 46, COURT.bottom - 46);
      G.leg = { x: tx, yTarget: ty, phase: 'shadow', t: 0, caster: p, side: foe.side, aiDodges: foe.ai ? Math.random() < foe.ai.diff.smart : false };
      G.banner = { text: 'LA JAMBE DE MAMAN !!', color: '#ff6a7a', t: 0, dur: 1.2 };
      sfx('legcast');
    }
  }
};
