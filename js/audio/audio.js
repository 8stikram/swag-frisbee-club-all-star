import { mtof } from '../core/utils.js';

let AC = null, masterG = null, musicGain = null, sfxGain = null, noiseBuf = null;
let musicVol = 0.8, sfxVol = 0.9;
export let musicOn = true;
export function toggleMusic() { musicOn = !musicOn; return musicOn; }

const MUS = {
  bpm: 132, step: 0, next: 0,
  bass: [45, 0, 45, 0, 48, 0, 45, 0, 43, 0, 43, 0, 50, 0, 48, 0, 45, 0, 45, 0, 48, 0, 45, 0, 41, 0, 43, 0, 45, 0, 43, 41],
  lead: [69, 0, 0, 72, 0, 74, 0, 0, 76, 0, 74, 0, 72, 0, 69, 0, 69, 0, 0, 72, 0, 74, 0, 76, 79, 0, 76, 0, 74, 0, 72, 0]
};

export function initAudio() {
  if (AC) return;
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    masterG = AC.createGain(); masterG.gain.value = 0.9; masterG.connect(AC.destination);
    musicGain = AC.createGain(); musicGain.gain.value = musicVol; musicGain.connect(masterG);
    sfxGain = AC.createGain(); sfxGain.gain.value = sfxVol; sfxGain.connect(masterG);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    MUS.next = AC.currentTime + .1;
    setInterval(tickMusic, 30);
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

function beep2(f, dur, type, vol, delay) {
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + dur + .02);
}

function kick(delay) {
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(45, t + .12);
  g.gain.setValueAtTime(.22, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + .13);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + .15);
}

function tickMusic() {
  if (!AC || !musicOn) return;
  const spb = 60 / MUS.bpm / 4;
  while (MUS.next < AC.currentTime + .15) {
    const s = MUS.step, t = Math.max(0, MUS.next - AC.currentTime);
    const b = MUS.bass[s]; if (b) beep2(mtof(b), spb * .9, 'square', .085, t);
    const l = MUS.lead[s]; if (l) beep2(mtof(l), spb * .8, 'sawtooth', .035, t);
    if (s % 4 === 0) kick(t);
    if (s % 2 === 1) noise(.03, .03, 8000, t);
    if (s % 8 === 4) noise(.09, .06, 1800, t);
    MUS.next += spb;
    MUS.step = (MUS.step + 1) % 32;
  }
}

const musicSlider = document.getElementById('musicVol');
const sfxSlider = document.getElementById('sfxVol');
musicSlider.addEventListener('input', function () {
  musicVol = this.value / 100;
  if (musicGain) musicGain.gain.value = musicVol;
  document.getElementById('musicVal').textContent = Math.round(musicVol * 100) + '%';
});
sfxSlider.addEventListener('input', function () {
  sfxVol = this.value / 100;
  if (sfxGain) sfxGain.gain.value = sfxVol;
  document.getElementById('sfxVal').textContent = Math.round(sfxVol * 100) + '%';
});
