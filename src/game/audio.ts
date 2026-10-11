let ctx: AudioContext | null = null;
let musicStop: (() => void) | null = null;
let musicKind: "title" | "story" | "battle" | "off" | null = null;

function ac() {
  if (typeof window === "undefined") return null;
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") {
    void ctx.resume().then(() => {
      if (musicKind && musicKind !== "off" && !musicStop) startLoop(musicKind);
    });
  }
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

const LOOPS: Record<"title" | "story" | "battle", number[]> = {
  title: [262, 330, 392, 330, 294, 349, 440, 349],
  story: [196, 247, 294, 330, 294, 247, 220, 196],
  battle: [147, 175, 220, 196, 175, 220, 262, 220],
};

function startLoop(kind: "title" | "story" | "battle") {
  const c = ac();
  if (!c) return;
  const notes = LOOPS[kind];
  const master = c.createGain();
  master.gain.value = kind === "battle" ? 0.03 : 0.045;
  master.connect(c.destination);
  let step = 0;
  let stopped = false;
  const tick = () => {
    if (stopped || !ctx) return;
    const now = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = kind === "battle" ? "triangle" : "sine";
    o.frequency.setValueAtTime(notes[step % notes.length] ?? 220, now);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.9, now + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, now + (kind === "story" ? 0.7 : 0.42));
    o.connect(g);
    g.connect(master);
    o.start(now);
    o.stop(now + 0.8);
    if (kind === "battle" && step % 2 === 0) noise(ctx, 0.05, 180, 0.6, 0.04, "lowpass");
    step += 1;
  };
  tick();
  const id = window.setInterval(tick, kind === "story" ? 720 : 460);
  musicStop = () => {
    stopped = true;
    window.clearInterval(id);
    master.disconnect();
  };
}

export function playBgm(kind: "title" | "story" | "battle" | "off") {
  if (musicKind === kind) return;
  musicStop?.();
  musicStop = null;
  musicKind = kind;
  if (kind === "off") return;
  startLoop(kind);
}
