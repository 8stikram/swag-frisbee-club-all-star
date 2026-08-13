export const TAU = Math.PI * 2;

export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
export const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) * 0.8;
export const pick = a => a[(Math.random() * a.length) | 0];
export const approach = (cur, tgt, rate, dt) => cur + (tgt - cur) * (1 - Math.exp(-rate * dt));
export const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
export const norm = (x, y) => { const l = Math.hypot(x, y) || 1; return { x: x / l, y: y / l }; };
