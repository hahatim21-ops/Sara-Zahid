// Asset pipeline:
//  - cleans each reference design (lifts text + ornaments off it) so the text can be live,
//  - extracts ornaments (keyhole, monograms, bismillah, flourish) as transparent WebP,
//  - converts every image to WebP srcsets, blurred side fills, OG image and favicons,
//  - fits live-text positions/sizes to the reference with opentype.js and builds script-name paths,
//  - detects candle flames, measures layer pivots (if real layers are present).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import opentype from 'opentype.js';
import { PAGES, FONTS } from './config.mjs';
import { inkMask, objectMask, rectMask, orMasks, maskBBox, fillMasked, extractElement, dilate } from './lib/inpaint.mjs';
import { detectCandles } from './lib/candles.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1')), '..');
const A = (...p) => path.join(ROOT, 'assets', ...p);
const OUT_IMG = path.join(ROOT, 'public', 'img');
const OUT_DATA = path.join(ROOT, 'src', 'data');
const DEBUG_DIR = path.join(ROOT, 'tools', 'out');
for (const d of [OUT_IMG, OUT_DATA, DEBUG_DIR, path.join(ROOT, 'public', 'audio')]) fs.mkdirSync(d, { recursive: true });

const WIDTHS = [720, 1080, 1440];
const log = (...a) => console.log('[assets]', ...a);
const fallbacks = [];

// ---------- fonts ----------
const fonts = {};
for (const [k, f] of Object.entries(FONTS)) {
  const buf = fs.readFileSync(path.join(ROOT, f.file));
  fonts[k] = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

/** Lay out text segments; returns glyph paths + ink bbox (baseline at y=0, origin x=0). */
function layout(fontKey, segs, fsz, ls = 0) {
  const font = fonts[fontKey];
  const upm = font.unitsPerEm;
  let x = 0;
  const bb = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity };
  const paths = [];
  for (const [text, scale = 1, rise = 0] of segs) {
    const size = fsz * scale;
    const glyphs = font.stringToGlyphs(text);
    let prev = null;
    for (const g of glyphs) {
      if (prev) x += (font.getKerningValue(prev, g) * size) / upm;
      const p = g.getPath(x, -rise * fsz, size);
      const b = p.getBoundingBox();
      if (b.x2 > b.x1) {
        bb.x1 = Math.min(bb.x1, b.x1); bb.y1 = Math.min(bb.y1, b.y1);
        bb.x2 = Math.max(bb.x2, b.x2); bb.y2 = Math.max(bb.y2, b.y2);
        paths.push(p);
      }
      x += (g.advanceWidth * size) / upm + ls * fsz;
      prev = g;
    }
  }
  return { bb, paths, advance: x };
}
const median = (a) => { const s = [...a].sort((p, q) => p - q); return s[s.length >> 1]; };

/** Median colour of the darkest 5% of pixels in a box = the ink colour. */
function inkColor(img, [x0, y0, x1, y1]) {
  const px = [];
  for (let y = y0; y < y1; y++)
    for (let x = x0; x < x1; x++) {
      const i = (y * img.W + x) * img.ch;
      px.push([0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2], img.data[i], img.data[i + 1], img.data[i + 2]]);
    }
  px.sort((a, b) => a[0] - b[0]);
  const dark = px.slice(0, Math.max(1, Math.floor(px.length * 0.05)));
  const m = [1, 2, 3].map((c) => median(dark.map((p) => p[c])));
  return '#' + m.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

// ---------- image helpers ----------
async function loadRaw(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, ch: 3 };
}
const toSharp = (img) => sharp(Buffer.from(img.data.buffer, img.data.byteOffset, img.data.length), { raw: { width: img.W, height: img.H, channels: img.ch } });

async function writeSrcset(input, base, srcW, { quality = 80, alpha = false } = {}) {
  const widths = [...new Set(WIDTHS.map((w) => Math.min(w, srcW)))];
  const out = [];
  for (const w of widths) {
    const file = `${base}-${w}.webp`;
    await input.clone().resize({ width: w }).webp({ quality, alphaQuality: alpha ? 90 : undefined, effort: 5 }).toFile(path.join(OUT_IMG, file));
    out.push({ src: `img/${file}`, w });
  }
  return out;
}

// ---------- layers (if exported later from the design file) ----------
function listLayers(n) {
  const dir = A('layers', `page${n}`);
  if (!fs.existsSync(dir)) return {};
  const res = {};
  for (const f of fs.readdirSync(dir)) if (/\.(png|svg)$/i.test(f)) res[f.replace(/\.(png|svg)$/i, '')] = path.join(dir, f);
  return res;
}

async function alphaBBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 24) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1, W: info.width, H: info.height };
}

// ---------- main ----------
const scene = { pages: {}, key: null, fonts: Object.fromEntries(Object.entries(FONTS).map(([k, f]) => [k, { css: f.css, weight: f.weight || 400, style: f.style || 'normal' }])) };
const pivots = {};

for (const [n, cfg] of Object.entries(PAGES)) {
  const refFile = A('reference', cfg.src);
  const ref = await loadRaw(refFile);
  const { W, H } = ref;
  const layers = listLayers(n);
  const page = { w: W, h: H, elements: {}, lines: [], shapes: {}, chandeliers: [], layers: {} };
  const pct = (x, y) => [+((x / W) * 100).toFixed(3), +((y / H) * 100).toFixed(3)];

  // --- masks for everything that will be re-drawn live ---
  const masks = [];
  const elementMasks = {};
  for (const [name, el] of Object.entries(cfg.elements)) {
    const m = el.mode === 'object' ? objectMask(ref, el.rect, { thr: el.thr }) : inkMask(ref, el.rect, { grow: 1 });
    elementMasks[name] = m;
    masks.push(dilate(m, W, H, 2));
  }
  const lineInk = {};
  for (const l of cfg.lines) {
    const m = inkMask(ref, l.rect, { grow: 0 });
    lineInk[l.id] = maskBBox(m, W, H);
    masks.push(dilate(m, W, H, 2));
  }
  for (const e of cfg.erase) {
    const m = e.all ? rectMask(W, H, e.rect) : dilate(inkMask(ref, e.rect, { grow: 0 }), W, H, 2);
    page.shapes[e.id] = e.all ? e.rect : maskBBox(inkMask(ref, e.rect, { grow: 0 }), W, H) || e.rect;
    masks.push(m);
  }
  const all = orMasks(W, H, masks);

  // --- background: real layer if present, otherwise the cleaned reference ---
  let bgSharp;
  if (layers.bg) {
    bgSharp = sharp(layers.bg);
    log(`page ${n}: using bg layer`);
  } else {
    const clean = masks.length ? fillMasked(ref, all, { seed: +n * 13 }) : ref;
    bgSharp = toSharp(clean);
    await bgSharp.clone().jpeg({ quality: 88 }).toFile(path.join(DEBUG_DIR, `page${n}-clean.jpg`));
    fallbacks.push(`page ${n}: no layers → cleaned reference used as background${masks.length ? ' (text/ornaments lifted off and redrawn live)' : ''}`);
  }
  page.bg = await writeSrcset(bgSharp, `p${n}-bg`, W, { quality: 80 });

  // blurred, dimmed side fill for desktop
  await bgSharp.clone().resize({ width: 90 }).blur(4).modulate({ brightness: 0.92, saturation: 0.95 }).webp({ quality: 70 }).toFile(path.join(OUT_IMG, `side-p${n}.webp`));
  page.side = `img/side-p${n}.webp`;

  // --- extracted elements ---
  for (const [name, el] of Object.entries(cfg.elements)) {
    const layerName = name === 'monogram' && layers.monogram ? 'monogram' : null;
    if (layerName) { /* a real layer would be used here */ }
    const bb = maskBBox(elementMasks[name], W, H);
    const pad = 3;
    const box = [Math.max(0, bb[0] - pad), Math.max(0, bb[1] - pad), Math.min(W, bb[2] + pad), Math.min(H, bb[3] + pad)];
    const { buf, w, h } = extractElement(ref, elementMasks[name], box, { close: el.close ?? 2, feather: 1 });
    if (name === 'keyhole') {
      // trace the key opening (dark region flooded from the darkest central pixel); it becomes the window we fly through
      const Lum = (x, y) => { const i = (y * W + x) * 3; return 0.299 * ref.data[i] + 0.587 * ref.data[i + 1] + 0.114 * ref.data[i + 2]; };
      const cx0 = Math.round((box[0] + box[2]) / 2), cy0 = Math.round((box[1] + box[3]) / 2);
      let seed = null, best = 1e9;
      for (let y = cy0 - 40; y < cy0 + 40; y++) for (let x = cx0 - 20; x < cx0 + 20; x++) { const L = Lum(x, y); if (L < best) { best = L; seed = [x, y]; } }
      const inHole = new Set();
      const st = [seed];
      while (st.length) {
        const [x, y] = st.pop();
        const k = y * W + x;
        if (inHole.has(k) || x < box[0] || x >= box[2] || y < box[1] || y >= box[3] || Lum(x, y) > 135) continue;
        inHole.add(k);
        st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
      const rows = new Map();
      for (const k of inHole) { const x = k % W, y = (k - x) / W; const r = rows.get(y) || [1e9, -1]; r[0] = Math.min(r[0], x); r[1] = Math.max(r[1], x); rows.set(y, r); }
      const ys = [...rows.keys()].sort((a, b) => a - b);
      const left = [], right = [];
      for (let i = 0; i < ys.length; i += 3) { const [a, b] = rows.get(ys[i]); left.push([a - 1, ys[i]]); right.push([b + 2, ys[i]]); }
      const last = ys[ys.length - 1];
      left.push([rows.get(last)[0] - 1, last + 1]); right.push([rows.get(last)[1] + 2, last + 1]);
      left[0][1] -= 1; right[0][1] -= 1;
      const poly = [...left, ...right.reverse()];
      page.keyholePath = 'M' + poly.map(([x, y]) => `${x} ${y}`).join('L') + 'Z';
      let sx = 0, sy = 0;
      for (const k of inHole) { const x = k % W; sx += x; sy += (k - x) / W; }
      const [hx, hy] = pct(sx / inHole.size, sy / inHole.size);
      page.keyholeCenter = { x: hx, y: hy, h: +(((last - ys[0]) / H) * 100).toFixed(3) };
      // punch the opening out of the plate image (with a 1px soft edge) so we can see through it
      for (const k of inHole) {
        const x = k % W, y = (k - x) / W;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const lx = x + dx - box[0], ly = y + dy - box[1];
          if (lx < 0 || ly < 0 || lx >= w || ly >= h) continue;
          const o = (ly * w + lx) * 4 + 3;
          buf[o] = dx === 0 && dy === 0 ? 0 : Math.min(buf[o], 110);
        }
      }
      log(`keyhole opening: ${inHole.size}px, rows ${ys[0]}-${last}`);
    }
    const file = `p${n}-${name}.webp`;
    const s = sharp(buf, { raw: { width: w, height: h, channels: 4 } });
    await s.clone().webp({ quality: 90, alphaQuality: 95 }).toFile(path.join(OUT_IMG, file));
    await s.clone().png().toFile(path.join(DEBUG_DIR, `p${n}-${name}.png`));
    const [x, y] = pct(box[0], box[1]);
    page.elements[name] = { src: `img/${file}`, x, y, w: +((w / W) * 100).toFixed(3), h: +((h / H) * 100).toFixed(3), pxW: w, pxH: h };
  }

  // --- edge colours (top / bottom 1.5% rows) used to blend the seams between stacked pages ---
  {
    const avgRows = (y0, y1) => {
      const s = [0, 0, 0]; let c = 0;
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; s[0] += ref.data[i]; s[1] += ref.data[i + 1]; s[2] += ref.data[i + 2]; c++; }
      return s.map((v) => Math.round(v / c));
    };
    const band = Math.max(4, Math.round(H * 0.015));
    page.edgeTop = avgRows(0, band);
    page.edgeBottom = avgRows(H - band, H);
  }

  // --- live text: fit size + position to the reference ink ---
  const fits = cfg.lines.filter((l) => !l.shape).map((l) => {
    const segs = l.segs || [[l.text]];
    const ink = lineInk[l.id];
    const t = layout(l.font, segs, 100, l.ls || 0);
    const fsz = ((ink[2] - ink[0]) / (t.bb.x2 - t.bb.x1)) * 100;
    return { l, segs, ink, fsz };
  });
  const groups = {};
  for (const f of fits) if (f.l.group) (groups[f.l.group] ||= []).push(f.fsz);
  for (const f of fits) {
    const { l, segs, ink } = f;
    const fsz = l.group ? median(groups[l.group]) : f.fsz;
    const t = layout(l.font, segs, fsz, l.ls || 0);
    const cx = (ink[0] + ink[2]) / 2, cy = (ink[1] + ink[3]) / 2;
    const ox = cx - (t.bb.x1 + t.bb.x2) / 2;
    const by = cy - (t.bb.y1 + t.bb.y2) / 2;
    const line = {
      id: l.id, font: l.font, segs, fs: +fsz.toFixed(2), x: +ox.toFixed(2), y: +by.toFixed(2), ls: l.ls || 0,
      ink: ink, credit: !!l.credit, adv: +t.advance.toFixed(2), color: inkColor(ref, ink),
    };
    if (l.write) {
      // per-glyph outline paths (absolute source px) for the stroke write-on
      const g = layout(l.font, segs, fsz, l.ls || 0);
      line.paths = g.paths.map((p) => {
        p.commands.forEach((c) => { for (const k of ['x', 'y', 'x1', 'y1', 'x2', 'y2']) if (k in c) c[k] += k.startsWith('x') ? ox : by; });
        return p.toPathData(1);
      });
      const pad = fsz * 0.12;
      line.box = [ox + g.bb.x1 - pad, by + g.bb.y1 - pad, ox + g.bb.x2 + pad, by + g.bb.y2 + pad].map((v) => +v.toFixed(1));
    }
    page.lines.push(line);
  }
  for (const l of cfg.lines.filter((x) => x.shape)) page.shapes[l.id] = lineInk[l.id];

  // --- chandeliers (fallback glow anchors) ---
  page.chandeliers = (cfg.chandeliers || []).map((c) => ({ x: +((c.x / W) * 100).toFixed(2), y: +((c.y / H) * 100).toFixed(2), w: +((c.w / W) * 100).toFixed(2), h: +((c.h / H) * 100).toFixed(2), top: +((c.top / H) * 100).toFixed(2) }));

  // --- real layers (only when exported) ---
  pivots[`page${n}`] = {};
  for (const [name, file] of Object.entries(layers)) {
    if (name === 'bg' || !file.endsWith('.png')) continue;
    const bb = await alphaBBox(file);
    const outName = `p${n}-layer-${name}`;
    page.layers[name] = { srcset: await writeSrcset(sharp(file), outName, bb.W, { quality: 82, alpha: true }) };
    let px = (bb.x0 + bb.x1) / 2, py = bb.y0; // chandeliers: top of chain
    if (name.startsWith('palm')) { py = bb.y1; px = name.endsWith('left') ? bb.x0 + (bb.x1 - bb.x0) * 0.25 : bb.x1 - (bb.x1 - bb.x0) * 0.25; }
    pivots[`page${n}`][name] = { x: +((px / bb.W) * 100).toFixed(2), y: +((py / bb.H) * 100).toFixed(2), bbox: [bb.x0, bb.y0, bb.x1, bb.y1].map((v, i) => +((v / (i % 2 ? bb.H : bb.W)) * 100).toFixed(2)) };
  }
  if (!Object.keys(layers).length) fallbacks.push(`page ${n}: chandelier/palm layers missing → glow + twinkle overlays instead of swinging layers`);

  // --- candles ---
  if (cfg.candles) {
    let pts;
    if (cfg.candles.manual) pts = cfg.candles.manual.map(([x, y]) => ({ x: +((x / W) * 100).toFixed(2), y: +((y / H) * 100).toFixed(2), size: 1.1 }));
    else pts = detectCandles(ref.data, W, H, cfg.candles.detect);
    pts.sort((a, b) => b.y - a.y);
    fs.writeFileSync(path.join(OUT_DATA, `candles-page${n}.json`), JSON.stringify(pts));
    log(`page ${n}: ${pts.length} candles`);
  }

  scene.pages[n] = page;
  log(`page ${n} done (${W}x${H})`);
}

// ---------- key ----------
{
  const trimmed = await sharp(A('key.png')).trim({ threshold: 10 }).toBuffer({ resolveWithObject: true });
  const { data, info } = await sharp(trimmed.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const kw = info.width, kh = info.height;
  // shaft tip = leftmost opaque column; its vertical centre over the first few columns
  let tipX = 0;
  outer: for (let x = 0; x < kw; x++) for (let y = 0; y < kh; y++) if (data[(y * kw + x) * 4 + 3] > 128) { tipX = x; break outer; }
  let sy = 0, c = 0;
  for (let x = tipX; x < tipX + 12; x++) for (let y = 0; y < kh; y++) if (data[(y * kw + x) * 4 + 3] > 128) { sy += y; c++; }
  const tipY = sy / c;
  await sharp(trimmed.data).resize({ width: 900 }).webp({ quality: 88, alphaQuality: 95 }).toFile(path.join(OUT_IMG, 'key-900.webp'));
  await sharp(trimmed.data).resize({ width: 600 }).webp({ quality: 88, alphaQuality: 95 }).toFile(path.join(OUT_IMG, 'key-600.webp'));
  scene.key = { srcset: [{ src: 'img/key-600.webp', w: 600 }, { src: 'img/key-900.webp', w: 900 }], aspect: +(kw / kh).toFixed(4), tip: { x: +((tipX / kw) * 100).toFixed(2), y: +((tipY / kh) * 100).toFixed(2) } };
  log('key', kw, kh, 'tip', scene.key.tip);
}

// ---------- OG image + favicons ----------
{
  const p2 = A('reference', PAGES[2].src);
  await sharp(p2).extract({ left: 0, top: 600, width: 941, height: 494 }).resize(1200, 630).jpeg({ quality: 84 }).toFile(path.join(ROOT, 'public', 'og.jpg'));
  const mono = path.join(DEBUG_DIR, 'p2-monogram.png');
  const blush = { r: 247, g: 228, b: 220, alpha: 1 };
  for (const [size, name] of [[64, 'favicon.png'], [180, 'apple-touch-icon.png']]) {
    const inner = Math.round(size * 0.8);
    const m = await sharp(mono).resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: blush } }).composite([{ input: m, gravity: 'center' }]).png().toFile(path.join(ROOT, 'public', name));
  }
}

// ---------- audio ----------
fs.copyFileSync(A('audio', 'rab-rakha.mp3'), path.join(ROOT, 'public', 'audio', 'rab-rakha.mp3'));

fs.writeFileSync(path.join(OUT_DATA, 'scene.json'), JSON.stringify(scene));
fs.writeFileSync(path.join(OUT_DATA, 'pivots.json'), JSON.stringify(pivots, null, 2));
log('fallbacks used:\n  - ' + fallbacks.join('\n  - '));
