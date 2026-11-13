// Background music through a Web Audio GainNode (iOS ignores audio.volume) + synthesized key click.
import { gsap } from 'gsap';

const KEY = 'sz-muted';
const TARGET = 0.7;
let ctx = null, gain = null, el = null, started = false;
let muted = false;
try { muted = sessionStorage.getItem(KEY) === '1'; } catch { /* storage blocked */ }
const btn = () => document.getElementById('mute');

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

function rampTo(v, sec) {
  if (gain && ctx) {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(v, t + sec);
  } else if (el) {
    gsap.to(el, { volume: v, duration: sec, ease: 'none' });
  }
}

function syncButton() {
  const b = btn();
  if (!b) return;
  b.classList.toggle('is-muted', muted);
  b.setAttribute('aria-pressed', String(muted));
  b.setAttribute('aria-label', muted ? 'Play music' : 'Mute music');
}

async function play() {
  try {
    if (ctx && ctx.state === 'suspended') await ctx.resume();
    await el.play();
    return true;
  } catch {
    return false;
  }
}

/** Call synchronously inside the key-tap handler (that tap is the required user gesture). */
export function startMusic() {
  el = document.getElementById('music');
  if (!el || started) return;
  started = true;
  const c = ensureCtx();
  if (c) {
    try {
      const src = c.createMediaElementSource(el);
      gain = c.createGain();
      gain.gain.value = 0;
      src.connect(gain).connect(c.destination);
      if (c.state === 'suspended') c.resume();
    } catch { gain = null; }
  }
  if (!gain) el.volume = 0;
  el.currentTime = 0;
  if (muted) { syncButton(); return; }
  play().then((ok) => {
    if (ok) rampTo(TARGET, 2.5);
    else { muted = true; syncButton(); }
  });
}

export function toggleMute() {
  muted = !muted;
  try { sessionStorage.setItem(KEY, muted ? '1' : '0'); } catch { /* ignore */ }
  syncButton();
  if (!el) return;
  if (muted) {
    rampTo(0, 0.35);
    gsap.delayedCall(0.4, () => { if (muted) el.pause(); });
  } else {
    play().then((ok) => {
      if (ok) rampTo(TARGET, 1);
      else { muted = true; syncButton(); }
    });
  }
}

export function initMuteButton() {
  const b = btn();
  syncButton();
  b.addEventListener('click', toggleMute);
  document.addEventListener('visibilitychange', () => {
    if (!el || !started) return;
    if (document.hidden) el.pause();
    else if (!muted) play().then((ok) => ok && rampTo(TARGET, 0.8));
  });
}

export function showMuteButton() {
  const b = btn();
  b.hidden = false;
  gsap.to(b, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.6)' });
}

/** ~80 ms soft metallic click: filtered noise transient + two bright partials. */
export function playClick() {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.value = 0.55;
  out.connect(c.destination);
  // noise tick
  const len = Math.floor(c.sampleRate * 0.08);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.12));
  const n = c.createBufferSource();
  n.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 2.2;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.9, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
  n.connect(bp).connect(ng).connect(out);
  n.start(t);
  // metallic partials
  for (const [f, v, dur] of [[2350, 0.18, 0.08], [5200, 0.08, 0.05], [1250, 0.1, 0.06]]) {
    const o = c.createOscillator();
    o.type = 'triangle'; o.frequency.value = f;
    const g = c.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t); o.stop(t + dur + 0.02);
  }
}
