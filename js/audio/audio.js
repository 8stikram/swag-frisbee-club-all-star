import { getTrackId, getTrack, setTrackId } from '../data/music.js';

// Bruitages toujours autorisés même pendant la démo IA-vs-IA jouée en fond
// de menu (clics/sélections) — tout le reste (buts, coups, cris...) est
// coupé pour ne pas parasiter la musique/l'ambiance des menus. Piloté depuis
// la boucle de jeu via setDemoMuted() plutôt qu'en important G directement
// ici, pour ne pas créer de cycle d'import audio.js <-> state.js.
const UI_SFX = new Set(['move', 'select']);
let demoMuted = false;
export function setDemoMuted(v) { demoMuted = v; }

let AC = null, masterG = null, sfxGain = null, noiseBuf = null;
let musicVol = 0.2, sfxVol = 0.9;
export let musicOn = true;
export function toggleMusic() {
  musicOn = !musicOn;
  if (bgmEl) musicOn ? bgmEl.play().catch(() => { }) : bgmEl.pause();
  return musicOn;
}

// ---- Musique : un vrai fichier audio en boucle (plus de synthé par défaut).
let bgmEl = null;

export function playTrack(id) {
  setTrackId(id);
  if (bgmEl) { bgmEl.pause(); bgmEl = null; }
  const t = getTrack(id);
  if (!t) return; // pas de piste choisie -> silence
  bgmEl = new Audio(t.src);
  bgmEl.loop = true;
  bgmEl.volume = musicVol;
  if (musicOn) bgmEl.play().catch(() => { });
}
export function stopTrack() {
  setTrackId(null);
  if (bgmEl) { bgmEl.pause(); bgmEl = null; }
}
export function hasRealTrack() { return !!bgmEl; }

// Reprend la piste choisie (ou celle par défaut de data/music.js) dès le
// premier geste utilisateur — les navigateurs bloquent l'audio avant ça.
function resumeSavedTrack() {
  const id = getTrackId();
  if (id) playTrack(id);
}

// Pendant le replay, tout le son passe par un filtre passe-bas : l'ambiance
// devient feutrée, comme entendue de loin, puis redevient normale à la fin.
let muffle = null;
export function setMuffled(on) {
  if (muffle) muffle.frequency.setTargetAtTime(on ? 700 : 20000, AC ? AC.currentTime : 0, .05);
  applyMusicVol();
}

// --- Atténuations temporaires, qui ne touchent jamais au réglage de l'utilisateur.
// duck : la pause fait descendre la musique à zéro en une seconde environ.
// solo : pendant qu'on règle un volume dans les options, on n'entend que la
//        catégorie concernée, pour l'ajuster à l'oreille sans interférence.
let duck = 1, duckTimer = null, solo = null;

function applyMusicVol() {
  if (!bgmEl) return;
  let v = musicVol * duck;
  if (solo === 'sfx') v = 0;
  bgmEl.volume = Math.max(0, Math.min(1, v));
}
function applySfxVol() {
  if (sfxGain) sfxGain.gain.value = (solo === 'music') ? 0 : sfxVol;
}

// Fondu de la musique, utilisé à la mise en pause et à la reprise.
export function duckMusic(on) {
  const cible = on ? 0 : 1;
  clearInterval(duckTimer);
  duckTimer = setInterval(() => {
    duck += (cible - duck) * .18;
    if (Math.abs(cible - duck) < .02) { duck = cible; clearInterval(duckTimer); }
    applyMusicVol();
  }, 40);
}

// Isole une catégorie le temps d'un réglage ; null rétablit tout.
export function setSolo(kind) { solo = kind; applyMusicVol(); applySfxVol(); }

export function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterG = AC.createGain(); masterG.gain.value = 0.9;
    muffle = AC.createBiquadFilter(); muffle.type = 'lowpass'; muffle.frequency.value = 20000;
    masterG.connect(muffle); muffle.connect(AC.destination);
    sfxGain = AC.createGain(); sfxGain.gain.value = sfxVol; sfxGain.connect(masterG);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    loadSamples();
    resumeSavedTrack();
  } catch (e) { }
}

// ---- Échantillons : presque tous les bruitages sont synthétisés ici, mais
// certains sons ne s'imitent pas correctement à l'oscillateur. Ils passent par
// le même gain que le reste, donc le réglage de volume, le mode solo et le
// filtre feutré du replay s'y appliquent aussi.
const SAMPLES = { bell: 'assets/audio/bell.wav' };
const bufs = {};

function loadSamples() {
  Object.entries(SAMPLES).forEach(([nom, url]) => {
    fetch(url)
      .then(r => r.arrayBuffer())
      .then(b => AC.decodeAudioData(b))
      .then(buf => { bufs[nom] = buf; })
      .catch(() => { });        // en cas d'échec, sfx() retombe sur le synthé
  });
}

// Chaque coup ouvre sa propre voix et personne ne coupe la précédente : les
// traînes s'additionnent, comme les résonances d'une vraie cloche.
function sample(nom, vol = .55) {
  const buf = bufs[nom];
  if (!AC || !buf) return false;
  const s = AC.createBufferSource(); s.buffer = buf;
  const g = AC.createGain(); g.gain.value = vol;
  s.connect(g); g.connect(sfxGain);
  s.start();
  return true;
}

function beep(f0, f1, dur, type = 'square', vol = .15, delay = 0) {
  if (!AC) return;
  const t = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + .02);
}

function noise(dur, vol, freq = 2000, delay = 0) {
  if (!AC) return;
  const t = AC.currentTime + delay;
  const s = AC.createBufferSource(); s.buffer = noiseBuf;
  const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = AC.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t); s.stop(t + dur);
}

export function sfx(n) {
  if (!AC) return;
  if (demoMuted && !UI_SFX.has(n)) return;
  switch (n) {
    case 'move': beep(760, 760, .05, 'square', .06); break;
    case 'select': beep(620, 990, .12, 'square', .12); beep(990, 1320, .1, 'square', .08, .06); break;
    case 'deny': beep(220, 150, .14, 'square', .12); break;
    case 'bounce': beep(190, 120, .07, 'triangle', .22); noise(.05, .08, 900); break;
    case 'catch': beep(500, 330, .08, 'sine', .2); noise(.06, .06, 600); break;
    case 'throw': noise(.16, .16, 1600); beep(300, 700, .12, 'sawtooth', .07); break;
    case 'dash': noise(.14, .12, 2600); beep(500, 900, .1, 'sine', .05); break;
    case 'goal': [660, 830, 990, 1320].forEach((f, i) => beep(f, f, .14, 'square', .16, i * .09)); noise(.5, .14, 500); break;
    case 'count': beep(660, 660, .09, 'square', .16); break;
    case 'go': beep(1040, 1040, .3, 'square', .18); break;
    case 'whistle': beep(1560, 1560, .16, 'square', .13); beep(1560, 1150, .22, 'square', .12, .14); break;
    case 'talk': beep(920, 700, .05, 'square', .05); beep(700, 940, .05, 'square', .04, .06); break;
    case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => beep(f, f, .2, 'square', .15, i * .13)); break;
    case 'lose': [392, 330, 262, 196].forEach((f, i) => beep(f, f, .25, 'triangle', .16, i * .18)); break;
    case 'charge': beep(440, 520, .04, 'square', .05); break;
    case 'full': beep(700, 1400, .16, 'square', .14); beep(1400, 1400, .08, 'sine', .1, .1); break;
    case 'superthrow': noise(.2, .2, 2000); beep(200, 900, .16, 'sawtooth', .12); beep(900, 400, .1, 'square', .08, .05); break;
    case 'perfect': [990, 1320, 1760].forEach((f, i) => beep(f, f, .1, 'square', .13, i * .05)); break;
    case 'roar': beep(90, 55, .5, 'sawtooth', .22); noise(.5, .16, 300); break;
    // Six Paths : une montée d'énergie, pas un cri de bête. Deux sinus qui
    // montent à la quinte donnent l'afflux, un souffle aigu remplace le
    // grondement du renard, un scintillement arrive au sommet, et un grave
    // sourd tombe pile quand l'écran sature en blanc.
    case 'sixpaths':
      beep(180, 900, .45, 'sine', .18);
      beep(270, 1350, .45, 'sine', .10);
      noise(.5, .10, 5200);
      beep(1600, 2400, .18, 'triangle', .07, .30);
      beep(70, 55, .5, 'sine', .20, .42);
      break;
    case 'special': [700, 990, 1320, 1760].forEach((f, i) => beep(f, f, .1, 'square', .14, i * .06)); noise(.3, .1, 1200); break;
    case 'legcast': beep(180, 90, .4, 'sawtooth', .16); break;
    case 'splat': noise(.18, .22, 400); beep(160, 70, .16, 'sine', .18); break;
    case 'stun': beep(300, 500, .08, 'square', .1); beep(500, 300, .08, 'square', .1, .1); beep(300, 500, .08, 'square', .1, .2); break;
    case 'bigbounce': beep(140, 90, .12, 'triangle', .26); noise(.1, .12, 700); break;
    case 'replay': beep(1200, 400, .3, 'sine', .12); break;
    // Crissement de basket au Cancel Dash : bruit filtré qui descend, très léger.
    case 'skid': noise(.16, .07, 3200); noise(.12, .05, 1600, .03); break;
    // Claquement sec du disque qui revient en main à la fin d'une feinte.
    case 'swish': noise(.07, .06, 5200); beep(1500, 900, .06, 'sine', .06); break;
    // Cloche de Minuit : un vrai échantillon, avec repli sur le synthé si le
    // fichier n'a pas encore fini de charger.
    case 'bell':
      if (!sample('bell')) { beep(1320, 660, .6, 'sine', .18); beep(1980, 990, .4, 'sine', .08); }
      break;
  }
}

const musicSlider = document.getElementById('musicVol');
const sfxSlider = document.getElementById('sfxVol');
// Pendant qu'on règle la musique, les bruitages se taisent — et inversement —
// pour juger chaque volume à l'oreille sans que l'autre vienne parasiter.
musicSlider.addEventListener('input', function () {
  musicVol = this.value / 100;
  setSolo('music');
  applyMusicVol();
  document.getElementById('musicVal').textContent = Math.round(musicVol * 100) + '%';
});
['change', 'pointerup', 'blur'].forEach(ev => musicSlider.addEventListener(ev, () => setSolo(null)));
sfxSlider.addEventListener('input', function () {
  sfxVol = this.value / 100;
  setSolo('sfx');
  applySfxVol();
  sfx('select');                 // un repère sonore pour juger le niveau
  document.getElementById('sfxVal').textContent = Math.round(sfxVol * 100) + '%';
});
['change', 'pointerup', 'blur'].forEach(ev => sfxSlider.addEventListener(ev, () => setSolo(null)));
