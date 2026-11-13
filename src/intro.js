// Page 1: keyhole + gold key. After the key turns, light pours through the keyhole and the camera flies
// through it into the hall (page 2). The page-1 stage carries a keyhole-shaped window (CSS mask); scaling
// the stage around the keyhole grows that window until it fills the screen — transform-only, so it stays smooth.
import { gsap } from 'gsap';
import { scene, h, s, pageShell, elementImg, srcsetOf, BASE } from './scene.js';
import { startMusic, playClick } from './audio.js';
import { swingLoops } from './entries.js';

const REST = { x: 50, y: 73 }; // key centre at rest (% of canvas)
const KEY_W = 36; // key width in cqw

export function buildIntro(root) {
  const page = scene.pages[1];
  const kh = page.keyholeCenter;
  const side = h('div', { class: 'intro-side' }, h('img', { src: `${BASE}${page.side}`, alt: '' }));

  // --- behind the stage: what the keyhole window shows (dark opening at rest, then light) ---
  const fillGrad = s('linearGradient', { id: 'holeFill', x1: 0, y1: 0, x2: 0, y2: 1 },
    s('stop', { offset: '0', 'stop-color': '#5a301f' }), s('stop', { offset: '0.6', 'stop-color': '#7b4429' }), s('stop', { offset: '1', 'stop-color': '#9a5c39' }));
  const holeFill = s('svg', { class: 'hole-fill', viewBox: `0 0 ${page.w} ${page.h}`, preserveAspectRatio: 'none', style: 'position:absolute;inset:0;width:100%;height:100%' },
    s('defs', {}, fillGrad), s('path', { d: page.keyholePath, fill: 'url(#holeFill)' }));
  const holeLight = h('div', { class: 'hole-light', style: { left: `${kh.x}%`, top: `${kh.y}%` } });
  const rays = h('div', { class: 'keyhole-rays', style: { left: `${kh.x}%`, top: `${kh.y}%` } });
  // nearly-invisible (not 0) so the browser paints these layers up front, not on their first visible frame
  for (const el of [holeLight, rays]) Object.assign(el.style, { opacity: '0.001', willChange: 'transform, opacity' });
  const behind = h('div', { class: 'canvas canvas--cover intro-behind' }, holeFill, holeLight, rays);

  // --- the page-1 stage with its keyhole window ---
  const P = pageShell(1, { cover: true });
  const stage = P.canvas;
  stage.classList.add('intro-stage', 'is-windowed');
  const maskSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${page.w} ${page.h}" preserveAspectRatio="none"><path fill-rule="evenodd" fill="#000" d="M0 0H${page.w}V${page.h}H0Z${page.keyholePath}"/></svg>`;
  const maskUrl = `url("data:image/svg+xml,${encodeURIComponent(maskSvg)}")`;
  stage.style.webkitMaskImage = maskUrl;
  stage.style.maskImage = maskUrl;
  stage.style.transformOrigin = `${kh.x}% ${kh.y}%`;
  const keyhole = elementImg(page, 'keyhole', 'Gold keyhole');
  P.fg.append(keyhole);

  // --- key, flash and hint (not part of the zoom) ---
  const flash = h('div', { class: 'flash', style: { left: `${kh.x}%`, top: `${kh.y}%` } });
  const key = scene.key;
  const keyH = KEY_W / key.aspect;
  const keyImg = h('img', { srcset: srcsetOf(key.srcset), sizes: '30vh', src: `${BASE}${key.srcset[1].src}`, alt: '' });
  const glintUrl = `url("${BASE}${key.srcset[0].src}")`;
  const keyGlint = h('span', { class: 'key-glint', style: { webkitMaskImage: glintUrl, maskImage: glintUrl } });
  const keyFloat = h('span', { class: 'key-float' }, keyImg, keyGlint);
  const keyBtn = h('button', {
    class: 'key-btn', type: 'button', 'aria-label': 'Tap the gold key to open the invitation',
    style: {
      width: `${KEY_W}cqw`, left: `calc(${REST.x}% - ${KEY_W / 2}cqw)`, top: `calc(${REST.y}% - ${keyH / 2}cqw)`,
      transformOrigin: `${key.tip.x}% ${key.tip.y}%`,
    },
  }, keyFloat);
  const hint = h('p', { class: 'hint', style: { top: `calc(${REST.y}% + ${keyH / 2 + 4}cqw)` } }, 'Tap the key to open');
  const overlay = h('div', { class: 'canvas canvas--cover intro-canvas' }, flash, keyBtn, hint);
  const white = h('div', { class: 'intro-white' });
  const col = h('div', { class: 'intro-col' }, behind, stage, overlay, white);
  root.append(side, col);

  return {
    root, side, col, stage, glows: P.glows, layers: P.layers, holeFill, holeLight, rays,
    keyhole, flash, keyBtn, keyFloat, hint, white, overlay,
    images: [...stage.querySelectorAll('img'), keyImg],
  };
}

export function runIntro(I, { reduced, fx, page2, onDoorsNearlyOpen, onOpenStart, onDone }) {
  // idle state
  const float = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: 'sine.inOut', duration: 1.75 } })
    .fromTo(I.keyFloat, { y: -6, rotation: -2 }, { y: 6, rotation: 2 });
  if (reduced) float.pause();
  const chandSway = reduced ? [] : swingLoops(I.glows, I.layers);
  gsap.to(I.stage.querySelectorAll('.chand-glow'), { opacity: 1, duration: 1.2, delay: 0.6 });

  // fade in from soft white
  gsap.to(I.white, { opacity: 0, duration: 1, ease: 'power1.out', onComplete: () => I.white.remove() });

  let opened = false;
  const open = (e) => {
    if (opened) return;
    if (e?.type === 'keydown' && !['Enter', ' ', 'Spacebar'].includes(e.key)) return;
    if (e?.type === 'keydown') e.preventDefault();
    opened = true;
    I.root.style.cursor = 'default';
    startMusic(); // must run inside the tap (browser gesture rule)
    // the hint's breathing is a CSS animation (it would override inline opacity) — freeze it, then fade
    const hintOpacity = getComputedStyle(I.hint).opacity;
    I.hint.style.animation = 'none';
    gsap.fromTo(I.hint, { opacity: hintOpacity }, { opacity: 0, duration: 0.4, overwrite: true });
    // Build the sequence on the next frame, paused, and start it one frame later: the one-off setup cost
    // (audio, layout reads) then can't make the animation skip ahead.
    requestAnimationFrame(() => {
      const tl = reduced ? crossfade() : sequence();
      tl.pause();
      onOpenStart?.();
      requestAnimationFrame(() => tl.play());
    });
  };
  I.root.addEventListener('click', open);
  I.keyBtn.addEventListener('keydown', open);

  function crossfade() {
    float.kill();
    return gsap.timeline({ onComplete: finish })
      .to(I.keyBtn, { opacity: 0, duration: 0.5 })
      .add(() => onDoorsNearlyOpen?.(), 0.4)
      .to(I.root, { opacity: 0, duration: 1 }, 0.3);
  }

  function sequence() {
    const ov = I.overlay.getBoundingClientRect();
    const btn = I.keyBtn.getBoundingClientRect();
    const tip = scene.key.tip;
    // key tip in px (relative to overlay) — untransformed (the float lives on the inner span)
    const tipX = btn.left - ov.left + (btn.width * tip.x) / 100;
    const tipY = btn.top - ov.top + (btn.height * tip.y) / 100;
    const kh = scene.pages[1].keyholeCenter;
    const hx = (ov.width * kh.x) / 100, hy = (ov.height * kh.y) / 100;
    const dx = hx - tipX, dy = hy - tipY;
    const sFinal = 0.6;

    const tl = gsap.timeline({ defaults: { overwrite: 'auto' }, onComplete: finish });
    float.pause();
    tl.to(I.side, { opacity: 0, duration: 0.8 }, 0); // desktop side fill: page 2's blurred copy sits underneath
    tl.to(I.keyFloat, { y: 0, rotation: 0, duration: 0.35, ease: 'power2.out' }, 0);
    // 2. lift and travel along a gentle curve, bit leading
    tl.to(I.keyBtn, { y: -10, duration: 0.25, ease: 'power2.out' }, 0);
    tl.to(I.keyBtn, {
      motionPath: { path: [{ x: 0, y: -10 }, { x: dx * 0.35 + ov.width * 0.12, y: dy * 0.55 }, { x: dx, y: dy }], curviness: 1.15 },
      scale: sFinal, duration: 1.4, ease: 'power2.inOut',
    }, 0.2);
    tl.to(I.keyBtn, { keyframes: { rotation: [0, -9, -4, 0], easeEach: 'sine.inOut' }, duration: 1.4 }, 0.2);
    // push in
    tl.to(I.keyBtn, { scale: sFinal * 0.92, duration: 0.25, ease: 'power2.in' }, 1.6);
    // 3. turn around the long axis + click + gold flash
    tl.to(I.keyBtn, { rotationX: 75, scaleY: sFinal * 0.92 * 0.82, transformPerspective: 500, duration: 0.45, ease: 'power2.inOut' }, 1.9);
    tl.add(() => {
      playClick();
      const r = I.flash.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, { petals: 0, glitter: 36, speed: 180 });
    }, 2.2);
    tl.fromTo(I.flash, { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1.1, duration: 0.22, ease: 'power2.out' }, 2.2)
      .to(I.flash, { opacity: 0, scale: 1.5, duration: 0.6, ease: 'power2.in' }, 2.42);

    // 4. the lock gives: light pours through the keyhole, the key dissolves into it
    tl.to(I.holeFill, { opacity: 0, duration: 0.6, ease: 'power1.inOut' }, 2.25);
    tl.fromTo(I.holeLight, { opacity: 0.001, scale: 0.25 }, { opacity: 1, scale: 0.7, duration: 0.7, ease: 'power2.out' }, 2.25);
    tl.fromTo(I.rays, { opacity: 0.001, rotation: 0, scale: 0.6 }, { opacity: 0.9, rotation: 20, scale: 1, duration: 1.3, ease: 'power1.out' }, 2.3);
    tl.to(I.keyBtn, { opacity: 0, duration: 0.35, ease: 'power1.out' }, 2.45);

    // 5. fly through the keyhole: the page-1 stage zooms around the keyhole, its window grows past the screen
    // Fly all the way through the keyhole (scale ×28). The zoom is driven in log-space — scale = 28^z —
    // so the perceived speed builds evenly instead of saving all the motion for the last frames (no lurch,
    // no halt). The plate dissolves during the final stretch so the arrival is seamless.
    const T = 2.9, D = 2.3, MAX = 28;
    const z = { v: 0 };
    gsap.set([I.stage, page2].filter(Boolean), { willChange: 'transform', force3D: true });
    tl.to(z, {
      v: 1, duration: D, ease: 'power1.in',
      onUpdate: () => gsap.set(I.stage, { scale: Math.pow(MAX, z.v) }),
    }, T);
    tl.to(I.stage, { opacity: 0.001, duration: D * 0.32, ease: 'sine.in' }, T + D * 0.68);
    tl.to(I.holeLight, { scale: 7, duration: D, ease: 'power2.in' }, T + 0.1)
      .to(I.holeLight, { opacity: 0.001, duration: D * 0.55, ease: 'sine.inOut' }, T + D * 0.6);
    tl.to(I.rays, { opacity: 0.001, scale: 3, rotation: 60, duration: D * 0.75, ease: 'sine.in' }, T);
    tl.add(() => {
      const r = I.flash.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, { petals: 24, glitter: 22, speed: 320, gold: true });
    }, T + D * 0.55);
    // 6. page 2 beyond the keyhole: one continuous settle that carries on past the landing (transform only)
    if (page2) {
      // independent of the intro timeline, so the overlay is released (and scrolling unlocked) the moment we land
      gsap.set(page2, { scale: 1.18 });
      tl.add(() => gsap.to(page2, { scale: 1, duration: D + 0.9, ease: 'power2.out', clearProps: 'transform' }), T); // keep will-change: dropping it re-rasterises the plate (a hitch)
    }
    tl.add(() => onDoorsNearlyOpen?.(), T + D + 0.05);
    if (window.__debug) window.__introTL = tl;
    return tl;
  }

  function finish() {
    chandSway.forEach((t) => t.kill());
    float.kill();
    // hide now (cheap), tear down later when the page is idle — removing the big layers mid-landing hitches
    I.root.style.visibility = 'hidden';
    I.root.style.pointerEvents = 'none';
    onDone?.();
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1500));
    setTimeout(() => idle(() => I.root.remove(), { timeout: 4000 }), 2500);
  }

  return { open };
}
