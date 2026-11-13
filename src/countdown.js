// Live countdown to the Nikah (Monday 30 November 2026, 12:00 pm India time), shown on the last page.
import { gsap } from 'gsap';
import { h } from './scene.js';

export const NIKAH_AT = Date.parse('2026-11-30T12:00:00+05:30');
const UNITS = [
  { key: 'd', label: 'Days', ms: 864e5 },
  { key: 'h', label: 'Hours', ms: 36e5 },
  { key: 'm', label: 'Minutes', ms: 6e4 },
  { key: 's', label: 'Seconds', ms: 1e3 },
];

function parts(now = Date.now()) {
  let rest = Math.max(0, NIKAH_AT - now);
  const out = {};
  for (const u of UNITS) { out[u.key] = Math.floor(rest / u.ms); rest -= out[u.key] * u.ms; }
  return out;
}
const pad = (v) => String(v).padStart(2, '0');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/** DOM: title + four arched tiles. `box` = [x0, y0, x1, y1] in source px of the page. */
export function buildCountdown(page, box, color) {
  const [x0, y0, x1] = box;
  const cells = UNITS.map((u) => {
    const val = h('span', { class: 'cd-val' }, '00');
    return { u, val, el: h('div', { class: 'cd-cell' }, h('span', { class: 'cd-num' }, val), h('span', { class: 'cd-label' }, u.label)) };
  });
  const title = h('p', { class: 'cd-title' }, 'Countdown to the Nikah');
  const done = h('p', { class: 'cd-done', hidden: true }, 'Alhamdulillah · Nikah Mubarak');
  const grid = h('div', { class: 'cd-cells' }, cells.map((c) => c.el));
  const foot = h('p', { class: 'cd-foot' }, 'In - Sha - Allah');
  const el = h('div', {
    class: 'countdown', role: 'timer', 'aria-live': 'off',
    style: {
      left: `${((x0 / page.w) * 100).toFixed(3)}%`, top: `${((y0 / page.h) * 100).toFixed(3)}%`,
      width: `${(((x1 - x0) / page.w) * 100).toFixed(3)}%`, '--cd-color': color,
    },
  }, title, grid, foot, done);

  let timer = null, shown = null;
  const render = (p, animate) => {
    for (const c of cells) {
      const text = pad(p[c.u.key]);
      if (c.val.textContent === text) continue;
      if (!animate || REDUCED) { c.val.textContent = text; continue; }
      // slot roll: the new value slides up into place while the old one slides out — never blank
      const old = c.val;
      const nu = h('span', { class: 'cd-val' }, text);
      old.parentNode.append(nu);
      c.val = nu;
      gsap.fromTo(nu, { yPercent: 100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.42, ease: 'power3.out' });
      gsap.to(old, { yPercent: -100, opacity: 0, duration: 0.42, ease: 'power3.out', onComplete: () => old.remove() });
    }
    const left = NIKAH_AT - Date.now();
    el.setAttribute('aria-label', left > 0 ? `${p.d} days, ${p.h} hours and ${p.m} minutes to the Nikah` : 'The Nikah has taken place');
    if (left <= 0) { grid.hidden = true; title.hidden = true; foot.hidden = true; done.hidden = false; stop(); }
  };
  const tick = () => { shown = parts(); render(shown, true); };
  const start = () => {
    if (timer) return;
    tick();
    // align ticks to the wall-clock second
    setTimeout(() => { tick(); timer = setInterval(tick, 1000); }, 1000 - (Date.now() % 1000));
  };
  const stop = () => { clearInterval(timer); timer = null; };
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (shown) start(); });

  return {
    el, title, foot, cells: cells.map((c) => c.el),
    /** count up from zero to the live value, then keep ticking */
    countIn(duration = 1.4) {
      const target = parts(Date.now() + duration * 1000);
      if (NIKAH_AT - Date.now() <= 0) return render(target, false);
      const o = { t: 0 };
      gsap.to(o, {
        t: 1, duration, ease: 'power2.out',
        onUpdate: () => render(Object.fromEntries(UNITS.map((u) => [u.key, Math.round(target[u.key] * o.t)])), false),
        onComplete: start,
      });
    },
    showNow() { render(parts(), false); start(); },
  };
}
