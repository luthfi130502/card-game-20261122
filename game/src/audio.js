// Emberclash — all sound is synthesised with WebAudio: short oscillator blips
// for clicks, card plays, hits, heals and the win/lose stingers. No audio
// files, no network. The context is created on the first user gesture.
let context = null;
let muted = false;

/** The game calls this when the player presses M. */
export function setMuted(value) {
  muted = value;
}

function audio() {
  if (muted) return null;
  if (context === null) {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

/** One tone: frequency slide from `from` to `to` over `seconds`, then silence. */
function tone(from, to, seconds, type, gainValue, when = 0) {
  const ctx = audio();
  if (ctx === null) return;
  const start = ctx.currentTime + when;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, start);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), start + seconds);
  gain.gain.setValueAtTime(gainValue, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + seconds);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + seconds + 0.02);
}

export const SOUND = {
  click() { tone(660, 520, 0.06, 'triangle', 0.12); },
  draw() { tone(420, 760, 0.09, 'sine', 0.1); },
  play() { tone(330, 660, 0.12, 'triangle', 0.16); tone(495, 990, 0.1, 'sine', 0.08, 0.05); },
  hit() { tone(180, 60, 0.22, 'sawtooth', 0.2); },
  heal() { tone(520, 880, 0.25, 'sine', 0.12); },
  guard() { tone(240, 180, 0.15, 'square', 0.08); },
  turn() { tone(440, 440, 0.07, 'triangle', 0.1); tone(587, 587, 0.07, 'triangle', 0.1, 0.08); },
  win() {
    [523, 659, 784, 1047].forEach((note, index) => tone(note, note, 0.28, 'triangle', 0.16, index * 0.13));
  },
  lose() {
    [392, 330, 262, 196].forEach((note, index) => tone(note, note * 0.94, 0.3, 'sawtooth', 0.1, index * 0.15));
  },
};

/** Call once from a user gesture so later sounds are allowed to play. */
export function unlockAudio() {
  audio();
}
