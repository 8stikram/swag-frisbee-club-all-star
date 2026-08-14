import { getTrackId, getTrack, setTrackId } from '../data/music.js';

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

export function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterG = AC.createGain(); masterG.gain.value = 0.9; masterG.connect(AC.destination);
    sfxGain = AC.createGain(); sfxGain.gain.value = sfxVol; sfxGain.connect(masterG);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    resumeSavedTrack();
  } catch (e) { }
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
    case 'special': [700, 990, 1320, 1760].forEach((f, i) => beep(f, f, .1, 'square', .14, i * .06)); noise(.3, .1, 1200); break;
    case 'legcast': beep(180, 90, .4, 'sawtooth', .16); break;
    case 'splat': noise(.18, .22, 400); beep(160, 70, .16, 'sine', .18); break;
    case 'stun': beep(300, 500, .08, 'square', .1); beep(500, 300, .08, 'square', .1, .1); beep(300, 500, .08, 'square', .1, .2); break;
    case 'bigbounce': beep(140, 90, .12, 'triangle', .26); noise(.1, .12, 700); break;
    case 'replay': beep(1200, 400, .3, 'sine', .12); break;
  }
}

const musicSlider = document.getElementById('musicVol');
const sfxSlider = document.getElementById('sfxVol');
musicSlider.addEventListener('input', function () {
  musicVol = this.value / 100;
  if (bgmEl) bgmEl.volume = musicVol;
  document.getElementById('musicVal').textContent = Math.round(musicVol * 100) + '%';
});
sfxSlider.addEventListener('input', function () {
  sfxVol = this.value / 100;
  if (sfxGain) sfxGain.gain.value = sfxVol;
  document.getElementById('sfxVal').textContent = Math.round(sfxVol * 100) + '%';
});
