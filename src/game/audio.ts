let ctx: AudioContext | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(c: AudioContext, dur: number, freq: number, q: number, gain: number, type: BiquadFilterType) {
  const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = n.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = n;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = c.createGain();
  const now = c.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start(now);
  src.stop(now + dur + 0.02);
}

function ping(c: AudioContext, freq: number, dur: number, gain: number, type: OscillatorType) {
  const o = c.createOscillator();
  const g = c.createGain();
  const now = c.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(freq, now);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.55), now + dur);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(now);
  o.stop(now + dur + 0.02);
}

export type SfxKind = "click" | "move" | "hit" | "hurt" | "clash" | "crit" | "heal" | "win" | "lose";

export function sfx(kind: SfxKind) {
  unlockAudio();
  const c = ac();
  if (!c) return;
  if (kind === "clash") {
    noise(c, 0.09, 2800, 5, 0.09, "highpass");
    ping(c, 1680, 0.08, 0.045, "square");
    ping(c, 2420, 0.07, 0.03, "square");
    return;
  }
  if (kind === "hurt" || kind === "hit") {
    noise(c, 0.14, 380, 0.8, 0.14, "lowpass");
    ping(c, 210, 0.18, 0.06, "sawtooth");
    return;
  }
  if (kind === "crit") {
    noise(c, 0.16, 520, 0.7, 0.12, "lowpass");
    ping(c, 440, 0.2, 0.06, "square");
    return;
  }
  const o = c.createOscillator();
  const g = c.createGain();
  o.connect(g);
  g.connect(c.destination);
  const now = c.currentTime;
  const tone = kind === "heal" ? 620 : kind === "win" ? 520 : kind === "lose" ? 110 : kind === "move" ? 240 : 300;
  o.type = kind === "lose" ? "triangle" : "square";
  o.frequency.setValueAtTime(tone, now);
  if (kind === "win") o.frequency.exponentialRampToValueAtTime(780, now + 0.22);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.045, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "win" ? 0.36 : 0.14));
  o.start(now);
  o.stop(now + 0.4);
}

/** Track ids match `public/game/bgm/<id>.m4a`. */
export type BgmTrack =
  | "op"
  | "happy"
  | "event"
  | "tragic"
  | "march"
  | "battle"
  | "battle-fierce"
  | "battle-tense"
  | "battle-grand"
  | "battle-cautious"
  | "battle-march"
  | "battle-tragic"
  | "off";

const BGM_VOL = 0.55;
const FADE_MS = 450;

let unlocked = false;
let hooksInstalled = false;
/** Last requested track (same-track calls are no-ops). */
let desiredTrack: BgmTrack | null = null;
/** Track actually loaded into the current element. */
let playingTrack: BgmTrack | null = null;
let audioEl: HTMLAudioElement | null = null;
let fadeTimer: ReturnType<typeof setInterval> | null = null;
let gen = 0;

function clearFade() {
  if (fadeTimer != null) {
    clearInterval(fadeTimer);
    fadeTimer = null;
  }
}

function srcFor(track: Exclude<BgmTrack, "off">) {
  return `/game/bgm/${track}.m4a`;
}

function stopEl(el: HTMLAudioElement) {
  el.pause();
  el.removeAttribute("src");
  el.load();
}

function fadeOutThen(myGen: number, done: () => void) {
  clearFade();
  const el = audioEl;
  if (!el) {
    done();
    return;
  }
  const startVol = el.volume;
  const steps = 8;
  let i = 0;
  fadeTimer = setInterval(() => {
    if (myGen !== gen) {
      clearFade();
      return;
    }
    i += 1;
    el.volume = Math.max(0, startVol * (1 - i / steps));
    if (i >= steps) {
      clearFade();
      stopEl(el);
      if (audioEl === el) audioEl = null;
      playingTrack = null;
      done();
    }
  }, FADE_MS / steps);
}

function startTrack(track: Exclude<BgmTrack, "off">, myGen: number) {
  if (myGen !== gen || desiredTrack !== track) return;
  clearFade();
  if (audioEl) {
    stopEl(audioEl);
    audioEl = null;
  }
  const el = new Audio(srcFor(track));
  el.loop = true;
  el.volume = 0;
  el.preload = "auto";
  audioEl = el;
  playingTrack = track;
  void el
    .play()
    .then(() => {
      if (myGen !== gen || desiredTrack !== track || audioEl !== el) return;
      const steps = 6;
      let i = 0;
      clearFade();
      fadeTimer = setInterval(() => {
        if (myGen !== gen || audioEl !== el) {
          clearFade();
          return;
        }
        i += 1;
        el.volume = Math.min(BGM_VOL, (BGM_VOL * i) / steps);
        if (i >= steps) clearFade();
      }, 40);
    })
    .catch(() => {
      // Autoplay blocked — unlockAudio() will retry after a gesture.
      if (myGen === gen) playingTrack = null;
    });
}

function applyDesired() {
  const track = desiredTrack;
  if (track == null) return;
  const myGen = ++gen;
  if (track === "off") {
    fadeOutThen(myGen, () => undefined);
    return;
  }
  if (playingTrack === track && audioEl && !audioEl.paused) return;
  if (!unlocked) {
    // Keep desired; start after first gesture.
    fadeOutThen(myGen, () => undefined);
    return;
  }
  fadeOutThen(myGen, () => startTrack(track, myGen));
}

/** Call from any user gesture so BGM can start under browser autoplay rules. */
export function unlockAudio() {
  if (typeof window === "undefined") return;
  const was = unlocked;
  unlocked = true;
  ac();
  if (!was) {
    applyDesired();
    return;
  }
  if (audioEl && audioEl.paused && desiredTrack && desiredTrack !== "off" && playingTrack === desiredTrack) {
    void audioEl.play().catch(() => undefined);
  } else if (desiredTrack && desiredTrack !== "off" && playingTrack !== desiredTrack) {
    applyDesired();
  }
}

function ensureUnlockHooks() {
  if (typeof window === "undefined" || hooksInstalled) return;
  hooksInstalled = true;
  const onGesture = () => unlockAudio();
  window.addEventListener("pointerdown", onGesture, { passive: true });
  window.addEventListener("keydown", onGesture, { passive: true });
}

/**
 * Play looping scene BGM from `/game/bgm/*.m4a`.
 * Same track is a no-op (does not restart). `"off"` fades out and stops.
 */
export function playBgm(track: BgmTrack) {
  ensureUnlockHooks();
  if (desiredTrack === track) return;
  desiredTrack = track;
  applyDesired();
}
