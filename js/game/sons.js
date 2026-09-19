import { sfx } from '../audio/audio.js';

// Joue un bruitage du match avec son contexte : la force du geste (0-1) et le
// personnage qui le fait. Le tout tient dans le nom du son (« throw|0.73|leon »),
// si bien que l'écho réseau le transporte tel quel et que l'invité entend le
// même tir que l'hôte. La map, elle, est la même des deux côtés : audio.js la
// lit lui-même.
export function sonMatch(nom, force, p) {
  const f = Math.max(0, Math.min(1, force || 0));
  sfx(nom + '|' + f.toFixed(2) + '|' + ((p && p.ck) || ''));
}

// Vitesse du disque ramenée à une force : un tir faible part vers 420 px/s,
// un tir chargé à fond plafonne vers 1190 (throwSpeed × DISC_SPEED).
export const forceDeVitesse = v => (v - 420) / 770;
