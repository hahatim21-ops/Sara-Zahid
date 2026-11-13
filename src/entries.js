// Entry choreography for pages 2–5 + ambient loops (chandeliers, candles, parallax).
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

// ---------- helpers ----------
/** letter-spacing tighten that stays centred (lines are left-anchored, so offset by half the growth) */
export function tighten(el, fromEm, toEm, vars = {}) {
  const n = el.textContent.length;
  const shift = () => (-(n * (fromEm - toEm)) / 2) * parseFloat(getComputedStyle(el).fontSize);
  return gsap.fromTo(el, { opacity: 0, letterSpacing: `${fromEm}em`, x: shift }, { opacity: 1, letterSpacing: `${toEm}em`, x: 0, duration: 1.1, ease: 'power3.out', ...vars });
}

const setMask = (el, x, y = 0) => { el.style.webkitMaskPosition = `${x}% ${y}%`; el.style.maskPosition = `${x}% ${y}%`; };

/** feathered mask wipe; dir: 'ltr' | 'rtl' | 'diag' */
export function wipe(el, dir = 'ltr', duration = 1.2, ease = 'power2.inOut') {
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1, duration, ease,
    onStart: () => { el.style.opacity = 1; },
    onUpdate: () => {
      if (dir === 'ltr') setMask(el, 100 - o.p * 100);
      else if (dir === 'rtl') setMask(el, o.p * 100);
      else setMask(el, 100 - o.p * 100, 100 - o.p * 100);
    },
    onComplete: () => el.classList.add('wipe-done'),
  });
}

/** stroke write-on of a script name (outline draw, then fill) with a sparkle pen tip */
export function writeOn(wrap, duration = 1.6) {
  const strokes = [...wrap.querySelectorAll('.w-stroke path')];
  const strokeG = wrap.querySelector('.w-stroke');
  const fill = wrap.querySelector('.w-fill');
  const pen = wrap.querySelector('.w-pen');
  const lens = strokes.map((p) => p.getTotalLength());
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const tl = gsap.timeline();
  let t = 0;
  tl.set(wrap, { opacity: 1 }, 0);
  tl.to(pen, { opacity: 1, duration: 0.15 }, 0);
  strokes.forEach((p, i) => {
    const d = Math.max(0.08, (duration * lens[i]) / total);
    tl.fromTo(p, { drawSVG: '0%' }, {
      drawSVG: '100%', duration: d, ease: 'none',
      onUpdate() {
        const pt = p.getPointAtLength(lens[i] * this.progress());
        pen.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
      },
    }, t);
    t += d;
  });
  tl.to(pen, { opacity: 0, duration: 0.35 }, t - 0.05);
  tl.to(fill, { opacity: 1, duration: 0.8, ease: 'power2.out' }, t - 0.4);
  tl.to(strokeG, { opacity: 0, duration: 0.7, ease: 'power1.out' }, t);
  return tl;
}
export function prepWriteOn(wrap) {
  gsap.set(wrap.querySelectorAll('.w-stroke path'), { drawSVG: '0%' });
  gsap.set(wrap.querySelector('.w-fill'), { opacity: 0 });
}

/** soft rise: y 14px → 0, blur 6 → 0, fade */
export function rise(targets, { stagger = 0.15, duration = 0.9 } = {}) {
  return gsap.fromTo(targets, { opacity: 0, y: 14, filter: 'blur(6px)' }, {
    opacity: 1, y: 0, filter: 'blur(0px)', duration, ease: 'power3.out', stagger, clearProps: 'filter',
  });
}
export const fadeUp = (targets, { stagger = 0.15, duration = 0.8, y = 10 } = {}) =>
  gsap.fromTo(targets, { opacity: 0, y }, { opacity: 1, y: 0, duration, ease: 'power2.out', stagger });

/** divider: diamond pops, lines draw outward from it */
export function drawDivider(div, duration = 0.9) {
  const tl = gsap.timeline();
  tl.fromTo(div.diamond, { scale: 0, opacity: 0, svgOrigin: `${div.cx} ${div.cy}` }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)', svgOrigin: `${div.cx} ${div.cy}` }, 0);
  tl.fromTo([div.left, div.right], { drawSVG: '0%' }, { drawSVG: '100%', duration, ease: 'power2.out' }, 0.15);
  return tl;
}
export const drawLines = (lines, duration = 0.8) => gsap.fromTo(lines, { drawSVG: '0%' }, { drawSVG: '100%', duration, ease: 'power2.out' });

export function shimmer(el, duration = 1.1) {
  return gsap.timeline()
    .set(el, { opacity: 1, backgroundPosition: '120% 0' })
    .to(el, { backgroundPosition: '-20% 0', duration, ease: 'power1.inOut' })
    .set(el, { opacity: 0 });
}

/** candles ignite in a cascade from the bottom step upward */
export function ignite(flames, { stagger = 0.04 } = {}) {
  const sorted = [...flames].sort((a, b) => parseFloat(b.style.top) - parseFloat(a.style.top));
  return gsap.timeline()
    .fromTo(sorted, { opacity: 0 }, { opacity: 1, duration: 0.25, stagger, ease: 'power1.out' }, 0)
    .fromTo(sorted.map((f) => f.firstChild), { scale: 1.9 }, { scale: 1, duration: 0.6, stagger, ease: 'power2.out' }, 0);
}

/** chandelier "lights up": glow ramps 0 → full with a gentle flare */
export function lightUp(glows) {
  const g = glows.map((c) => c.querySelector('.chand-glow'));
  return gsap.timeline()
    .fromTo(g, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1.15, duration: 0.8, ease: 'power2.out' })
    .to(g, { scale: 1, duration: 0.4, ease: 'sine.inOut' });
}

/**
 * Play a timeline once when `trigger` enters (~65% of the viewport). If the guest scrolls past
 * before it finishes, jump it to the end — text is never left hidden.
 */
export function onEnter(trigger, tl, { start = 'top 65%' } = {}) {
  tl.pause();
  if (window.__static) { tl.progress(1); return tl; } // ?static: final state, for layout checks
  ScrollTrigger.create({
    trigger, start, end: 'bottom top',
    onEnter: () => { if (tl.progress() === 0) tl.play(); },
    onLeave: () => tl.progress(1),
    onEnterBack: () => { if (tl.progress() < 1) tl.progress(1); },
  });
  // if the block is already leaving the top of the viewport, finish it
  ScrollTrigger.create({ trigger, start: 'top 4%', onEnter: () => { if (tl.progress() < 1) tl.progress(1); } });
  return tl;
}

// ---------- ambient loops (per page; paused offscreen) ----------
/**
 * Pendulum swing for chandeliers (±2°, 5.5 s / 6.3 s, around the chain top) and frond sway for palms
 * (±1.2° + skewX ±1°, 6–8 s, around the frond base). Glow anchors swing with their chandelier.
 * Uses fixed phases so cloned stages (the two doors) stay in sync.
 */
export function swingLoops(glows, layers = {}, { random = true } = {}) {
  const loops = [];
  const ph = (p) => (random ? -Math.random() * p : 0);
  // each chandelier swings together with its glow (same pivot, same tween)
  const sides = ['left', 'right'];
  const used = new Set();
  glows.forEach((g, i) => {
    const period = i % 2 ? 6.3 : 5.5;
    const layer = layers[`chandelier-${sides[i % 2]}`];
    if (layer) used.add(layer);
    loops.push(gsap.fromTo(layer ? [g, layer] : g, { rotation: -2 }, { rotation: 2, duration: period / 2, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: ph(period) }));
  });
  for (const [name, el] of Object.entries(layers)) {
    if (used.has(el)) continue;
    if (name.startsWith('chandelier')) {
      const period = name.endsWith('right') ? 6.3 : 5.5;
      loops.push(gsap.fromTo(el, { rotation: -2 }, { rotation: 2, duration: period / 2, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: ph(period) }));
    } else if (name.startsWith('palm')) {
      const period = name.endsWith('right') ? 7.6 : 6.4;
      loops.push(gsap.fromTo(el, { rotation: -1.2, skewX: -1 }, { rotation: 1.2, skewX: 1, duration: period / 2, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: ph(period) }));
    }
  }
  return loops;
}

/** breeze gust: palm loops briefly sway faster (~2 s), then settle */
export function gust(loops) {
  for (const t of loops) {
    if (!t.targets()[0]?.classList?.contains('layer')) continue;
    if (!t.targets()[0].className.includes('palm')) continue;
    gsap.timeline().to(t, { timeScale: 2.1, duration: 0.7, ease: 'sine.out' }).to(t, { timeScale: 1, duration: 1.3, ease: 'sine.inOut' });
  }
}
export function ambient(section, glows, { reduced, layers = {} }) {
  const loops = [];
  if (!reduced) loops.push(...swingLoops(glows, layers));
  const io = new IntersectionObserver(([e]) => {
    section.classList.toggle('is-offscreen', !e.isIntersecting);
    loops.forEach((t) => (e.isIntersecting ? t.resume() : t.pause()));
  }, { rootMargin: '10% 0px' });
  io.observe(section);
  return loops;
}

/** in-page parallax: background drifts ~4% slower than the foreground */
export function parallax(section, bgWrap, { reduced }) {
  if (reduced) { gsap.set(bgWrap, { scale: 1 }); return; }
  gsap.set(bgWrap, { scale: 1.04 });
  gsap.fromTo(bgWrap, { yPercent: -1.5 }, {
    yPercent: 1.5, ease: 'none',
    scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
  });
}

// ---------- page 2 (played by the intro) ----------
export function initPage2(P, { reduced }) {
  gsap.set(P.mono, { opacity: 0 });
  prepWriteOn(P.sara); prepWriteOn(P.zahid);
  gsap.set([P.sara, P.zahid], { opacity: 0 });
  gsap.set([...P.bar, P.div.left, P.div.right], { drawSVG: '0%' });
  gsap.set(P.div.diamond, { opacity: 0 });
  gsap.set(P.glows.map((c) => c.querySelector('.chand-glow')), { opacity: 0 });
  gsap.set(P.flames, { opacity: 0 });
}

export function page2Timeline(P, { reduced, onCue }) {
  const tl = gsap.timeline();
  if (reduced) {
    tl.set([...P.bar, P.div.left, P.div.right], { drawSVG: '100%' })
      .set([P.sara, P.zahid].map((w) => w.querySelector('.w-fill')), { opacity: 1 })
      .set([P.sara, P.zahid].map((w) => w.querySelector('.w-stroke')), { opacity: 0 })
      .to([P.mono, P.sara, P.zahid, P.div.diamond, ...P.glows.map((c) => c.querySelector('.chand-glow')), ...P.flames], { opacity: 1, duration: 1 });
    P.mono.classList.add('wipe-done');
    tl.add(() => onCue?.());
    return tl;
  }
  tl.add(lightUp(P.glows), 0);
  tl.add(ignite(P.flames, { stagger: 0.04 }), 0.3);
  // monogram: diagonal feathered reveal (single-PNG path) + soft focus pull, then shimmer
  tl.set(P.mono, { opacity: 1 }, 0.1);
  tl.add(wipe(P.mono, 'diag', 1.9, 'power2.inOut'), 0.1);
  tl.fromTo(P.mono, { filter: 'blur(8px)', scale: 1.04 }, { filter: 'blur(0px)', scale: 1, duration: 1.9, ease: 'power2.out', clearProps: 'filter' }, 0.1);
  tl.add(shimmer(P.monoShimmer, 1.0), 1.75);
  tl.add(writeOn(P.sara, 1.35), 2.2);
  tl.fromTo(P.bar, { drawSVG: '0%' }, { drawSVG: '100%', duration: 0.5, ease: 'power2.out' }, 3.45);
  tl.add(writeOn(P.zahid, 1.5), 3.75);
  tl.add(drawDivider(P.div, 0.9), 5.2);
  tl.add(() => onCue?.(), 6.1);
  return tl;
}

// ---------- page 3 ----------
export function initPage3(P, { reduced }) {
  const E = P.els;
  const lines = [E.l1, E.l2, E.r1, E.r2, E.d1, E.d2, E.with, E.s1, E.s2, E.credit, E.gp1, E.gp2];
  gsap.set([P.mono, P.bism, P.flourish, ...lines, P.div1.diamond], { opacity: 0 });
  gsap.set([P.div1.left, P.div1.right, P.withL, P.withR], { drawSVG: '0%' });
  prepWriteOn(E.sara); prepWriteOn(E.zahid);
  gsap.set([E.sara, E.zahid], { opacity: 0 });
  gsap.set(P.glows.map((c) => c.querySelector('.chand-glow')), { opacity: 0 });
  gsap.set(P.flames, { opacity: 0 });

  if (reduced) {
    const all = [P.mono, P.bism, P.flourish, ...lines, P.div1.diamond, E.sara, E.zahid];
    P.bism.classList.add('wipe-done'); E.gp1.classList.add('wipe-done'); E.gp2.classList.add('wipe-done');
    gsap.set([P.div1.left, P.div1.right, P.withL, P.withR], { drawSVG: '100%' });
    gsap.set([E.sara, E.zahid].map((w) => w.querySelector('.w-fill')), { opacity: 1 });
    gsap.set([E.sara, E.zahid].map((w) => w.querySelector('.w-stroke')), { opacity: 0 });
    onEnter(P.section, gsap.timeline().to([...all, ...P.flames, ...P.glows.map((c) => c.querySelector('.chand-glow'))], { opacity: 1, duration: 0.8, stagger: 0.03 }), { start: 'top 70%' });
    return;
  }

  onEnter(P.section, lightUp(P.glows), { start: 'top 70%' });
  // 1 monogram
  onEnter(P.mono, gsap.timeline()
    .fromTo(P.mono, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 1.1, ease: 'power3.out' })
    .add(shimmer(P.monoShimmer, 1), 0.7));
  // 2 bismillah, right to left
  onEnter(P.bism, wipe(P.bism, 'rtl', 1.2));
  // 3 english lines
  onEnter(E.l1, rise([E.l1, E.l2]));
  // 4 divider
  onEnter(P.div1.left, drawDivider(P.div1));
  // 5 grandparents: left-to-right feathered wipe
  onEnter(E.gp1, gsap.timeline().add(wipe(E.gp1, 'ltr', 1.1), 0).add(wipe(E.gp2, 'ltr', 1.1), 0.35));
  // 6 request lines
  onEnter(E.r1, fadeUp([E.r1, E.r2]));
  // 7 Sara + D/o
  onEnter(E.sara, gsap.timeline().add(writeOn(E.sara, 1.3)).add(fadeUp([E.d1, E.d2]), '-=0.6'));
  // 8 With
  onEnter(E.with, gsap.timeline()
    .add(drawLines([P.withL, P.withR], 0.7))
    .fromTo(E.with, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' }, 0.35));
  // 9 Zahid + S/o
  onEnter(E.zahid, gsap.timeline().add(writeOn(E.zahid, 1.5)).add(fadeUp([E.s1, E.s2]), '-=0.6'));
  // 10 flourish from the centre outward
  onEnter(P.flourish, gsap.fromTo(P.flourish, { opacity: 1, clipPath: 'inset(0% 50% 0% 50%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power2.out', clearProps: 'clipPath' }));
  // 11 staircase candles + credit
  const firstFlame = P.flames.reduce((a, b) => (parseFloat(a.style.top) < parseFloat(b.style.top) ? a : b));
  onEnter(firstFlame, gsap.timeline().add(ignite(P.flames, { stagger: 0.035 })).fromTo(E.credit, { opacity: 0 }, { opacity: 1, duration: 1 }, 0.6), { start: 'top 85%' });
}

// ---------- page 4 ----------
export function initPage4(P, { reduced }) {
  const E = P.els;
  const nik = { title: E.nTitle, insha: E.nInsha, div: P.nDiv, at: P.nAt, atText: E.nAt, venue: [E.nVenue, E.nAddr1, E.nAddr2] };
  const rec = { title: E.rTitle, insha: E.rInsha, div: P.rDiv, at: P.rAt, atText: E.rAt, venue: [E.rVenue, E.rAddr1, E.rAddr2], date: [E.rDay, E.rDate, E.rTime, E.rHijri] };
  const allText = Object.values(E).filter((el) => !['nDate', 'nDay', 'nHijri'].includes(el.dataset.id));
  gsap.set(allText, { opacity: 0 });
  gsap.set([P.nDiv.left, P.nDiv.right, P.rDiv.left, P.rDiv.right, ...P.nAt, ...P.rAt], { drawSVG: '0%' });
  gsap.set([P.nDiv.diamond, P.rDiv.diamond, P.banner, P.foilWrap], { opacity: 0 });
  gsap.set(P.flames, { opacity: 0 });
  const half = (top) => P.flames.filter((f) => (parseFloat(f.style.top) < 50) === top);

  if (reduced) {
    gsap.set([P.nDiv.left, P.nDiv.right, P.rDiv.left, P.rDiv.right, ...P.nAt, ...P.rAt], { drawSVG: '100%' });
    onEnter(P.nikahZone, gsap.timeline().to([...allText.filter((e) => !rec.date.includes(e)), P.nDiv.diamond, P.rDiv.diamond, P.banner, P.foilWrap, ...P.flames], { opacity: 1, duration: 0.8 })
      .to(rec.date, { opacity: (i, el) => (el.classList.contains('rblur') ? 0.55 : 1), duration: 0.8 }, 0)
      .set(P.nikahDate, { visibility: 'visible' }));
    return;
  }

  const card = (c, isNikah) => {
    const tl = gsap.timeline();
    const split = new SplitText(c.title, { type: 'chars', charsClass: 'ch' });
    tl.set(c.title, { opacity: 1 }, 0);
    tl.fromTo(split.chars, { opacity: 0, yPercent: 60 }, { opacity: 1, yPercent: 0, duration: 0.7, ease: 'power3.out', stagger: 0.035 }, 0.1);
    const ls = parseFloat(c.insha.style.letterSpacing) || 0.2;
    tl.add(tighten(c.insha, 0.6, ls), 0.45);
    tl.add(drawDivider(c.div, 0.8), 0.7);
    if (isNikah) {
      tl.fromTo(P.banner, { opacity: 0, scale: 0.9, svgOrigin: '443 415' }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.5)', svgOrigin: '443 415' }, 0.95);
      tl.fromTo(P.sheenRect, { opacity: 1, attr: { x: 70 } }, { attr: { x: 700 }, duration: 1, ease: 'power1.inOut' }, 1.3).set(P.sheenRect, { opacity: 0 });
      tl.fromTo(P.foilWrap, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, 1.1);
      tl.set(P.nikahDate, { visibility: 'visible' }, 1.85); // only once the foil is fully opaque
    } else {
      tl.fromTo(c.date, { opacity: 0, y: 10 }, { opacity: (i, el) => (el.classList.contains('rblur') ? 0.55 : 1), y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.12 }, 1.0);
    }
    tl.add(drawLines(c.at, 0.7), 1.45);
    tl.fromTo(c.atText, { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.55);
    tl.add(fadeUp(c.venue, { stagger: 0.14 }), 1.7);
    tl.add(ignite(half(isNikah), { stagger: 0.04 }), 0.2);
    return tl;
  };
  onEnter(P.nikahZone, card(nik, true));
  onEnter(P.recZone, card(rec, false));
}

// ---------- page 5 ----------
export function initPage5(P, { reduced, fx }) {
  gsap.set([P.regards, P.credit], { opacity: 0 });
  gsap.set(P.lines, { drawSVG: '0%' });
  prepWriteOn(P.family);
  gsap.set(P.family, { opacity: 0 });
  gsap.set(P.glows.map((c) => c.querySelector('.chand-glow')), { opacity: 0 });
  if (reduced) {
    gsap.set(P.lines, { drawSVG: '100%' });
    gsap.set(P.family.querySelector('.w-fill'), { opacity: 1 });
    gsap.set(P.family.querySelector('.w-stroke'), { opacity: 0 });
    onEnter(P.regards, gsap.timeline().to([P.regards, P.family, P.credit, ...P.glows.map((c) => c.querySelector('.chand-glow'))], { opacity: 1, duration: 1 }));
    return;
  }
  onEnter(P.section, lightUp(P.glows), { start: 'top 70%' });
  const ls = parseFloat(P.regards.style.letterSpacing) || 0;
  onEnter(P.regards, gsap.timeline()
    .add(tighten(P.regards, 0.45, ls, { duration: 1.2 }))
    .add(drawLines(P.lines, 0.9), 0.25)
    .add(writeOn(P.family, 2.0), 0.9)
    .add(() => fx.shower(3), 1.2)
    .fromTo(P.credit, { opacity: 0 }, { opacity: 1, duration: 1.2 }, 3));
}
