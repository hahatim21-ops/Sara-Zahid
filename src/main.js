import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/great-vibes/400.css';
import 'lenis/dist/lenis.css';
import './styles.css';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';

import { scene, h, BASE } from './scene.js';
import { buildPage2, buildPage3, buildPage4, buildPage5 } from './pages.js';
import { buildIntro, runIntro } from './intro.js';
import { createFX } from './fx.js';
import { initMuteButton, showMuteButton } from './audio.js';
import { initScratch } from './scratch.js';
import {
  initPage2, page2Timeline, initPage3, initPage4, initPage5, ambient, parallax, shimmer, gust,
} from './entries.js';

gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
gsap.ticker.lagSmoothing(0);

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const debug = new URLSearchParams(location.search).has('debug');
if (debug) { root.classList.add('debug'); window.__debug = true; window.gsap = gsap; window.ScrollTrigger = ScrollTrigger; }
const isStatic = new URLSearchParams(location.search).has('static'); // dev: skip intro, everything in its final state
if (isStatic) window.__static = true;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
window.scrollTo(0, 0);

// ---------- build ----------
const col = document.getElementById('col');
const P2 = buildPage2();
const P3 = buildPage3();
const P4 = buildPage4();
const P5 = buildPage5();
col.append(P2.section, P3.section, P4.section, P5.section);
const nikahDateBlock = P4.nikahDate;
nikahDateBlock.style.cssText = 'position:absolute;inset:0;pointer-events:none;visibility:hidden';

const introRoot = document.getElementById('intro');
const I = buildIntro(introRoot);

// desktop side fill (blurred copy of the current page)
const sideWrap = document.querySelector('.side-bgs');
const sides = [2, 3, 4, 5].map((n) => {
  const img = h('img', { src: `${BASE}${scene.pages[n].side}`, alt: '', 'data-page': n });
  sideWrap.append(img);
  return img;
});
sides[0].classList.add('is-active');

const fx = createFX(document.getElementById('fx'), { reduced });
initMuteButton();

// ---------- smooth scrolling (desktop / trackpad only) ----------
let lenis = null;
if (matchMedia('(pointer: fine)').matches && !reduced) {
  lenis = new Lenis({ lerp: 0.09, syncTouch: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  lenis.stop();
}

// ---------- preload (pages 1–2 + key, decoded) ----------
const decodeAll = (imgs) => Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())));
const fontsReady = Promise.all([
  document.fonts.load('400 40px "Great Vibes"', 'Sara Zahid Vataoo Family'),
  document.fonts.load('400 40px "EB Garamond"', 'Tap the key'),
  document.fonts.load('500 40px "EB Garamond"', 'Nikah'),
  document.fonts.load('600 40px "EB Garamond"', '@BESPOKE'),
  document.fonts.load('italic 400 40px "EB Garamond"', 'Scratch'),
]).catch(() => {});
const timeout = (ms) => new Promise((r) => setTimeout(r, ms));

function measureBaselines() {
  const probe = h('div', { style: { position: 'absolute', left: '-9999px', top: '0', lineHeight: '1', fontSize: '100px', whiteSpace: 'nowrap' } });
  document.body.append(probe);
  for (const k of Object.keys(scene.fonts)) {
    probe.className = `f-${k}`;
    probe.innerHTML = 'Hxg<span style="display:inline-block;width:1px;height:0;vertical-align:baseline"></span>';
    const r0 = probe.getBoundingClientRect(), r1 = probe.lastChild.getBoundingClientRect();
    const ratio = (r1.top - r0.top) / 100;
    if (ratio > 0.3 && ratio < 1.4) root.style.setProperty(`--bl-${k}`, ratio.toFixed(4));
  }
  probe.remove();
}

function hydrateLazy() {
  for (const img of document.querySelectorAll('img[data-srcset]')) {
    img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
    img.removeAttribute('data-srcset');
  }
}

// ---------- pages: initial states + scroll-driven entries ----------
initPage2(P2, { reduced });
initPage3(P3, { reduced });
initPage4(P4, { reduced });
initPage5(P5, { reduced, fx });
for (const P of [P2, P3, P5]) parallax(P.section, P.bgWrap, { reduced });
if (reduced) gsap.set(P4.bgWrap, { scale: 1 });
const ambientLoops = [P2, P3, P4, P5].flatMap((P) => ambient(P.section, P.glows, { reduced, layers: P.layers }));
window.addEventListener('breeze', () => gust(ambientLoops));
// card frame layers (only if exported) rise in with their card
for (const [name, el] of Object.entries(P4.layers)) {
  if (!name.startsWith('card')) continue;
  gsap.set(el, { opacity: 0 });
  ScrollTrigger.create({
    trigger: name.includes('reception') ? P4.recZone : P4.nikahZone, start: 'top 65%', once: true,
    onEnter: () => gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }),
  });
}

[P2, P3, P4, P5].forEach((P, i) => {
  ScrollTrigger.create({
    trigger: P.section, start: 'top center', end: 'bottom center',
    onToggle: (self) => { if (self.isActive) sides.forEach((s, j) => s.classList.toggle('is-active', j === i)); },
  });
});

// scratch card + Reception date
const scratch = initScratch({
  wrap: P4.foilWrap,
  button: P4.revealBtn,
  onReveal(rect) {
    nikahDateBlock.removeAttribute('aria-hidden');
    nikahDateBlock.style.visibility = 'visible';
    fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { petals: 22, glitter: 60, speed: 300 });
    gsap.delayedCall(0.25, () => shimmer(P4.dateShimmer, 1.1));
    gsap.timeline()
      .to(P4.txtScratch, { opacity: 0, duration: 0.5 }, 0.2)
      .to(P4.txtSave, { opacity: 1, duration: 0.6 }, 0.45)
      .fromTo(P4.sheenRect, { opacity: 1, attr: { x: 70 } }, { attr: { x: 700 }, duration: 1, ease: 'power1.inOut' }, 0.4);
    const rb = [...P4.section.querySelectorAll('.rblur')];
    gsap.set(rb, { filter: 'blur(7px)' });
    rb.forEach((el) => el.classList.remove('rblur'));
    gsap.to(rb, {
      filter: 'blur(0px)', opacity: (i, el) => (gsap.getProperty(el, 'opacity') > 0 ? 1 : 0),
      duration: 1, delay: 0.6, ease: 'power2.out', clearProps: 'filter',
      onStart: () => { if (gsap.getProperty(rb[0], 'opacity') > 0) shimmer(P4.rDateShimmer, 1.2); },
    });
  },
});

// ---------- debug overlay ----------
if (debug) {
  console.table(Object.fromEntries([2, 3, 4].map((n) => [`page${n}`, document.querySelectorAll(`.page-${n} .flame`).length])));
  console.log('scene', scene);
}

// ---------- start ----------
(async function start() {
  const p1p2Images = [...I.images, P2.section.querySelector('.bg'), P2.mono];
  await Promise.race([Promise.all([fontsReady, decodeAll(p1p2Images)]), timeout(9000)]);
  measureBaselines();
  scratch.paint();
  window.addEventListener('resize', () => { if (!scratch.done) gsap.delayedCall(0.2, () => scratch.paint()); });

  root.classList.remove('is-loading');
  document.getElementById('loader').classList.add('is-done');
  setTimeout(() => document.getElementById('loader').remove(), 800);

  const p2tl = page2Timeline(P2, {
    reduced,
    onCue: () => {
      if (window.scrollY > 10) return;
      gsap.to(P2.cue, { opacity: 1, duration: 0.8 });
      const hide = () => { gsap.to(P2.cue, { opacity: 0, duration: 0.4 }); window.removeEventListener('scroll', hide); };
      window.addEventListener('scroll', hide, { passive: true });
    },
  });
  p2tl.pause();

  if (isStatic) {
    hydrateLazy();
    p2tl.progress(1);
    introRoot.remove();
    root.classList.remove('is-locked');
    lenis?.start();
    ScrollTrigger.refresh();
    return;
  }

  runIntro(I, {
    reduced, fx, page2: P2.canvas,
    onOpenStart: () => hydrateLazy(),
    onDoorsNearlyOpen: () => p2tl.play(),
    onDone: () => {
      root.classList.remove('is-locked');
      window.scrollTo(0, 0);
      lenis?.start();
      ScrollTrigger.refresh();
      showMuteButton();
    },
  });
})();
