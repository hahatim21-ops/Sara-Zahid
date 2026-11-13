// Builds every page's DOM from the generated scene data (src/data/scene.json).
import scene from './data/scene.json';
import candles2 from './data/candles-page2.json';
import candles3 from './data/candles-page3.json';
import candles4 from './data/candles-page4.json';
import pivots from './data/pivots.json';

export { scene };
const debug = new URLSearchParams(location.search).has('debug');
export const BASE = import.meta.env.BASE_URL;
const CANDLES = { 2: candles2, 3: candles3, 4: candles4 };
const FLAME_W = { 2: 0.62, 3: 0.5, 4: 0.78 }; // flame width in cqw per page (relative to glass size)
const SIZES = '(min-aspect-ratio: 9/16) 56.25vh, 100vw';

const SVGNS = 'http://www.w3.org/2000/svg';
export const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    }
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null) el.append(c);
  return el;
};
export const s = (tag, attrs = {}, ...kids) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) el.setAttribute(k, v);
  for (const c of kids.flat()) if (c != null) el.append(c);
  return el;
};

export const srcsetOf = (list) => list.map((x) => `${BASE}${x.src} ${x.w}w`).join(', ');
const pct = (v) => `${+v.toFixed(4)}%`;

/** Responsive background <img>. Lazy pages get data-srcset and are hydrated later. */
function bgImg(page, lazy) {
  const attrs = { class: 'bg', alt: '', sizes: SIZES, decoding: 'async', draggable: 'false' };
  const set = srcsetOf(page.bg);
  const fallback = `${BASE}${page.bg[page.bg.length - 1].src}`;
  if (lazy) Object.assign(attrs, { 'data-srcset': set, 'data-src': fallback });
  else Object.assign(attrs, { srcset: set, src: fallback });
  return h('img', attrs);
}

export function elementImg(page, name, alt = '', extra = '') {
  const e = page.elements[name];
  return h('img', {
    class: `el el-${name} ${extra}`.trim(), src: `${BASE}${e.src}`, alt, draggable: 'false', decoding: 'async',
    style: { left: pct(e.x), top: pct(e.y), width: pct(e.w), height: pct(e.h) },
  });
}

/** A live text line, positioned on the reference baseline. */
export function lineEl(page, l, { tag = 'p', extraClass = '' } = {}) {
  const fsCqw = (l.fs / page.w) * 100;
  const el = h(tag, {
    class: `line f-${l.font} ${l.credit ? 'is-credit' : ''} ${extraClass}`.trim(),
    'data-id': l.id,
    style: {
      left: pct((l.x / page.w) * 100),
      top: `calc(${pct((l.y / page.h) * 100)} - var(--bl-${l.font}) * ${fsCqw.toFixed(4)}cqw)`,
      fontSize: `${fsCqw.toFixed(4)}cqw`,
      color: l.color,
      letterSpacing: l.ls ? `${l.ls}em` : null,
    },
  });
  for (const [t, scale = 1, rise = 0] of l.segs) {
    if (scale === 1 && !rise) el.append(t);
    else el.append(h('sup', { style: { fontSize: `${scale}em`, verticalAlign: `${(rise / scale).toFixed(3)}em` } }, t));
  }
  return el;
}

/** Script name drawn as outline paths (stroke write-on, then fill), with a sparkle pen tip. */
export function writeOnEl(page, l) {
  const [x0, y0, x1, y1] = l.box;
  const sw = (l.fs * 0.011).toFixed(2);
  const fills = s('g', { class: 'w-fill', fill: l.color, opacity: 0 }, l.paths.map((d) => s('path', { d })));
  const strokes = s('g', { class: 'w-stroke', fill: 'none', stroke: l.color, 'stroke-width': sw, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
    l.paths.map((d) => s('path', { d })));
  const r = l.fs * 0.05;
  const pen = s('g', { class: 'w-pen', opacity: 0 },
    s('circle', { r: r * 2.2, fill: '#fff3d6', opacity: 0.35 }),
    s('circle', { r: r * 0.7, fill: '#fffaf0' }),
    s('path', { d: `M0 ${-r * 2.6}L${r * 0.35} 0 0 ${r * 2.6} ${-r * 0.35} 0Z M${-r * 2.6} 0L0 ${r * 0.35} ${r * 2.6} 0 0 ${-r * 0.35}Z`, fill: '#fffdf5' }));
  const svg = s('svg', { viewBox: `${x0} ${y0} ${x1 - x0} ${y1 - y0}`, 'aria-hidden': 'true', focusable: 'false' }, fills, strokes, pen);
  const text = l.segs.map((x) => x[0]).join('');
  return h('div', {
    class: 'writeon', 'data-id': l.id, role: 'heading', 'aria-level': '2',
    style: { left: pct((x0 / page.w) * 100), top: pct((y0 / page.h) * 100), width: pct(((x1 - x0) / page.w) * 100), height: pct(((y1 - y0) / page.h) * 100) },
  }, svg, h('span', { class: 'sr-only' }, text));
}

/** Shared overlay SVG for dividers, side lines and the banner (source-pixel coordinates). */
export function shapesSvg(page) {
  return s('svg', { class: 'shapes', viewBox: `0 0 ${page.w} ${page.h}`, preserveAspectRatio: 'none', 'aria-hidden': 'true' });
}

export function lineFromCenter(svg, cx, cy, x, color, sw) {
  // drawn from the inner end outward, so DrawSVG 0→100% grows outward
  const p = s('path', { d: `M${cx} ${cy}L${x} ${cy}`, stroke: color, 'stroke-width': sw, fill: 'none', 'stroke-linecap': 'round' });
  svg.append(p);
  return p;
}

export function diamond(svg, cx, cy, w, hgt, color, ornate = false) {
  let el;
  if (ornate) {
    const r = w / 2;
    const petal = (dx, dy) => `M${cx + dx * r * 0.18} ${cy + dy * r * 0.18}L${cx + dx * r * 0.62 - dy * r * 0.22} ${cy + dy * r * 0.62 + dx * r * 0.22}L${cx + dx * r} ${cy + dy * r}L${cx + dx * r * 0.62 + dy * r * 0.22} ${cy + dy * r * 0.62 - dx * r * 0.22}Z`;
    el = s('path', { d: [petal(1, 0), petal(-1, 0), petal(0, 1), petal(0, -1)].join(''), fill: color });
  } else {
    el = s('path', { d: `M${cx} ${cy - hgt / 2}L${cx + w / 2} ${cy}L${cx} ${cy + hgt / 2}L${cx - w / 2} ${cy}Z`, fill: color });
  }
  svg.append(el);
  return el;
}

/** Divider "—— ◆ ——" built from its measured ink box. */
export function divider(svg, box, color, { sw = 2, gap = 0.06, ornate = false, dw } = {}) {
  const [x0, y0, x1, y1] = box;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, bh = y1 - y0;
  const dW = dw || bh * 0.62;
  const g = (x1 - x0) * gap + dW / 2;
  const left = lineFromCenter(svg, cx - g, cy, x0, color, sw);
  const right = lineFromCenter(svg, cx + g, cy, x1, color, sw);
  const d = diamond(svg, cx, cy, ornate ? bh * 0.85 : dW, bh * 0.8, color, ornate);
  return { left, right, diamond: d, cx, cy };
}

/** Chandelier glow anchors (fallback for missing chandelier layers). */
export function chandelierEls(page) {
  return page.chandeliers.map((c, i) => {
    const glowSize = c.w * 2.1;
    const span = c.y - c.top;
    const glints = [];
    for (let k = 0; k < 8; k++) {
      const g = h('i', { class: 'glint', style: { left: `${15 + Math.random() * 70}%`, top: `${8 + Math.random() * 80}%` } });
      g.style.setProperty('--d', `${(2 + Math.random() * 2).toFixed(2)}s`);
      g.style.setProperty('--dl', `${(-Math.random() * 4).toFixed(2)}s`);
      glints.push(g);
    }
    const body = h('div', {
      class: 'chand-body',
      style: { position: 'absolute', left: '0', width: '100%', top: `${(1 - c.h / 2 / span) * 100}%`, height: `${(c.h / span) * 100}%` },
    }, glints);
    return h('div', {
      class: `chand chand-${i ? 'r' : 'l'}`,
      style: { left: pct(c.x - c.w / 2), width: pct(c.w), top: pct(c.top), height: pct(span) },
    }, h('div', { class: 'chand-glow', style: { width: `${glowSize}cqw`, height: `${glowSize}cqw` } }), body);
  });
}

export function candleEls(n) {
  const list = CANDLES[n] || [];
  const fw = FLAME_W[n] || 0.6;
  return list.map((c) => h('i', {
    class: 'flame',
    style: {
      left: pct(c.x), top: pct(c.y), '--fw': `${fw}cqw`,
      '--fd': `${(1.4 + Math.random() * 1.4).toFixed(2)}s`, '--fdl': `${(-Math.random() * 3).toFixed(2)}s`,
    },
  }, h('i', { class: 'flame-halo' }), h('i', { class: 'flame-core' })));
}

/** Real design layers (only when exported into assets/layers/pageN): full-canvas PNGs, pivots from pivots.json */
function layerEls(n, page, lazy) {
  const out = {};
  for (const [name, L] of Object.entries(page.layers || {})) {
    const pv = pivots[`page${n}`]?.[name];
    const set = srcsetOf(L.srcset);
    const attrs = { class: `layer layer-${name}`, alt: '', sizes: SIZES, decoding: 'async', draggable: 'false' };
    if (lazy) Object.assign(attrs, { 'data-srcset': set, 'data-src': `${BASE}${L.srcset[L.srcset.length - 1].src}` });
    else Object.assign(attrs, { srcset: set, src: `${BASE}${L.srcset[L.srcset.length - 1].src}` });
    const img = h('img', attrs);
    Object.assign(img.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'cover' });
    if (pv) img.style.transformOrigin = `${pv.x}% ${pv.y}%`;
    out[name] = img;
  }
  // fallback sprites cut from the artwork (chandeliers, palm fronds) — positioned boxes with their own pivot
  for (const sp of page.sprites || []) {
    if (out[sp.name]) continue;
    const src = `${BASE}${sp.src}`;
    const img = h('img', {
      class: `layer layer-${sp.name} sprite`, alt: '', draggable: 'false', decoding: 'async',
      ...(lazy ? { 'data-src': src, 'data-srcset': `${src} 1x` } : { src }),
      style: { position: 'absolute', left: `${sp.x}%`, top: `${sp.y}%`, width: `${sp.w}%`, height: `${sp.h}%`, transformOrigin: `${sp.ox}% ${sp.oy}%` },
    });
    out[sp.name] = img;
  }
  return out;
}

const ORDER = [2, 3, 4, 5];
const mix = (a, b) => `rgb(${a.map((v, i) => Math.round((v + b[i]) / 2)).join(',')})`;
/** colour shared by the bottom edge of one page and the top edge of the next */
function joins(n) {
  const i = ORDER.indexOf(+n);
  if (i < 0) return {};
  const prev = scene.pages[ORDER[i - 1]], next = scene.pages[ORDER[i + 1]], p = scene.pages[n];
  return {
    top: prev ? mix(prev.edgeBottom, p.edgeTop) : null,
    bottom: next ? mix(p.edgeBottom, next.edgeTop) : null,
  };
}

/** Generic page shell: section > canvas > (bg-wrap: bg + glows + candles) + seams + fg */
export function pageShell(n, { lazy = false, label = '', cover = false } = {}) {
  const page = scene.pages[n];
  const bgWrap = h('div', { class: 'bg-wrap' }, bgImg(page, lazy));
  const layers = layerEls(n, page, lazy);
  bgWrap.append(...Object.entries(layers).filter(([k]) => !k.startsWith('card')).map(([, v]) => v));
  const glows = chandelierEls(page);
  bgWrap.append(...glows);
  const flames = candleEls(n);
  if (flames.length) bgWrap.append(h('div', { class: 'candles' }, flames));
  const fg = h('div', { class: 'fg' });
  // card frame layers (page 4) sit in the foreground so they can rise in with their text
  fg.append(...Object.entries(layers).filter(([k]) => k.startsWith('card')).map(([, v]) => v));
  const j = cover ? {} : joins(n);
  const seams = [
    j.top && h('div', { class: 'seam seam-top', style: { '--join': j.top } }),
    j.bottom && h('div', { class: 'seam seam-bottom', style: { '--join': j.bottom } }),
  ].filter(Boolean);
  const canvas = h('div', { class: `canvas${cover ? ' canvas--cover' : ''}` }, bgWrap, ...seams, fg);
  const section = h('section', { class: `page page-${n}`, id: `page-${n}`, 'data-page': n, 'aria-label': label }, canvas);
  if (debug) {
    for (const [name, pv] of Object.entries(pivots[`page${n}`] || {})) {
      bgWrap.append(h('i', { class: 'pivot-dot', title: name, style: { position: 'absolute', left: `${pv.x}%`, top: `${pv.y}%`, width: '10px', height: '10px', margin: '-5px', borderRadius: '50%', background: '#00f', zIndex: 9 } }));
    }
  }
  return { page, section, canvas, bgWrap, fg, glows, flames, layers };
}

export const lineById = (page, id) => page.lines.find((l) => l.id === id);
