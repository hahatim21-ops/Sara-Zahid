// Small image-processing toolkit used to lift text/ornaments off the flattened reference designs.
// Images are { data: Uint8Array RGB(A), W, H, ch }.

export const lumAt = (img, x, y) => {
  const i = (y * img.W + x) * img.ch;
  return 0.299 * img.data[i] + 0.587 * img.data[i + 1] + 0.114 * img.data[i + 2];
};

function maxFilter1D(src, w, h, r, horizontal) {
  const out = new Float32Array(src.length);
  if (horizontal) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let m = -1e9;
        for (let k = Math.max(0, x - r); k <= Math.min(w - 1, x + r); k++) m = Math.max(m, src[y * w + k]);
        out[y * w + x] = m;
      }
  } else {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let m = -1e9;
        for (let k = Math.max(0, y - r); k <= Math.min(h - 1, y + r); k++) m = Math.max(m, src[k * w + x]);
        out[y * w + x] = m;
      }
  }
  return out;
}

export function dilate(mask, W, H, r) {
  if (r <= 0) return mask.slice();
  const f = new Float32Array(mask);
  const a = maxFilter1D(f, W, H, r, true);
  const b = maxFilter1D(a, W, H, r, false);
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < out.length; i++) out[i] = b[i] > 0 ? 1 : 0;
  return out;
}
export function erode(mask, W, H, r) {
  const inv = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i++) inv[i] = mask[i] ? 0 : 1;
  const d = dilate(inv, W, H, r);
  for (let i = 0; i < d.length; i++) d[i] = d[i] ? 0 : 1;
  return d;
}

/** Ink mask inside a rect: pixels clearly darker than their local background. Returns full-size mask. */
export function inkMask(img, [x0, y0, x1, y1], { core = 38, weak = 9, win = 12, grow = 2, colorTest = null } = {}) {
  const { W, H } = img;
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
  const pad = win;
  const ax = Math.max(0, x0 - pad), ay = Math.max(0, y0 - pad), bx = Math.min(W, x1 + pad), by = Math.min(H, y1 + pad);
  const w = bx - ax, h = by - ay;
  const L = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) L[y * w + x] = lumAt(img, ax + x, ay + y);
  const bg = maxFilter1D(maxFilter1D(L, w, h, win, true), w, h, win, false);
  const coreM = new Uint8Array(w * h), weakM = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const gx = ax + x, gy = ay + y;
      if (gx < x0 || gx >= x1 || gy < y0 || gy >= y1) continue;
      const i = y * w + x, d = bg[i] - L[i];
      if (d > weak) weakM[i] = 1;
      if (d > core) {
        if (!colorTest) coreM[i] = 1;
        else {
          const j = (gy * W + gx) * img.ch;
          if (colorTest(img.data[j], img.data[j + 1], img.data[j + 2])) coreM[i] = 1;
        }
      }
    }
  const near = dilate(coreM, w, h, 3);
  let m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = weakM[i] && near[i] ? 1 : 0;
  m = dilate(m, w, h, grow);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const gx = ax + x, gy = ay + y;
      if (gx < x0 || gx >= x1 || gy < y0 || gy >= y1) continue;
      if (m[y * w + x]) out[gy * W + gx] = 1;
    }
  return out;
}

/** Object mask: everything differing from the rect's border colour, holes filled (for plates on flat walls). */
export function objectMask(img, [x0, y0, x1, y1], { thr = 16, grow = 3 } = {}) {
  const { W, H, ch, data } = img;
  const border = [];
  for (let x = x0; x < x1; x++) border.push([x, y0], [x, y1 - 1]);
  for (let y = y0; y < y1; y++) border.push([x0, y], [x1 - 1, y]);
  const med = [0, 1, 2].map((c) => {
    const v = border.map(([x, y]) => data[(y * W + x) * ch + c]).sort((a, b) => a - b);
    return v[v.length >> 1];
  });
  const w = x1 - x0, h = y1 - y0;
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * W + (x0 + x)) * ch;
      const d = Math.abs(data[i] - med[0]) + Math.abs(data[i + 1] - med[1]) + Math.abs(data[i + 2] - med[2]);
      if (d > thr) m[y * w + x] = 1;
    }
  let c = erode(dilate(m, w, h, 3), w, h, 3);
  // fill holes: flood the background from the border
  const reach = new Uint8Array(w * h);
  const st = [];
  for (let x = 0; x < w; x++) st.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) st.push(y * w, y * w + w - 1);
  while (st.length) {
    const p = st.pop();
    if (reach[p] || c[p]) continue;
    reach[p] = 1;
    const x = p % w;
    if (x > 0) st.push(p - 1);
    if (x < w - 1) st.push(p + 1);
    if (p >= w) st.push(p - w);
    if (p < w * (h - 1)) st.push(p + w);
  }
  for (let i = 0; i < c.length; i++) c[i] = reach[i] ? 0 : 1;
  c = dilate(c, w, h, grow);
  const out = new Uint8Array(W * H);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (c[y * w + x]) out[(y0 + y) * W + x0 + x] = 1;
  return out;
}

export function rectMask(W, H, [x0, y0, x1, y1]) {
  const out = new Uint8Array(W * H);
  for (let y = Math.max(0, y0); y < Math.min(H, y1); y++) for (let x = Math.max(0, x0); x < Math.min(W, x1); x++) out[y * W + x] = 1;
  return out;
}

export function orMasks(W, H, masks) {
  const out = new Uint8Array(W * H);
  for (const m of masks) for (let i = 0; i < out.length; i++) if (m[i]) out[i] = 1;
  return out;
}

export function maskBBox(mask, W, H) {
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (mask[y * W + x]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : [x0, y0, x1 + 1, y1 + 1];
}

/** Fill masked pixels from their surroundings: multi-scale normalised box convolution + fine grain. */
export function fillMasked(img, mask, { seed = 7 } = {}) {
  const { W, H, ch, data } = img;
  const W1 = W + 1;
  const S = [0, 1, 2].map(() => new Float64Array(W1 * (H + 1)));
  const Sw = new Float64Array(W1 * (H + 1));
  for (let y = 0; y < H; y++) {
    const rs = [0, 0, 0];
    let rw = 0;
    for (let x = 0; x < W; x++) {
      const p = y * W + x, i = p * ch;
      const w = mask[p] ? 0 : 1;
      rw += w;
      for (let c = 0; c < 3; c++) rs[c] += data[i + c] * w;
      const q = (y + 1) * W1 + x + 1;
      Sw[q] = Sw[q - W1] + rw;
      for (let c = 0; c < 3; c++) S[c][q] = S[c][q - W1] + rs[c];
    }
  }
  const box = (arr, x, y, r) => {
    const ax = Math.max(0, x - r), ay = Math.max(0, y - r), bx = Math.min(W, x + r + 1), by = Math.min(H, y + r + 1);
    return arr[by * W1 + bx] - arr[ay * W1 + bx] - arr[by * W1 + ax] + arr[ay * W1 + ax];
  };
  let s = seed;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const radii = [4, 7, 11, 16, 24, 36, 54, 80, 120, 180, 270, 400];
  const out = new Uint8Array(data);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const p = y * W + x;
      if (!mask[p]) continue;
      let k = 0;
      for (; k < radii.length; k++) {
        const r = radii[k];
        const area = (2 * r + 1) ** 2;
        if (box(Sw, x, y, r) > area * 0.3) break;
      }
      k = Math.min(k, radii.length - 1);
      const acc = [0, 0, 0];
      let wsum = 0;
      for (const r of [radii[k], Math.round(radii[k] * 1.5), radii[k] * 2]) {
        const sw = box(Sw, x, y, r);
        if (sw <= 0) continue;
        for (let c = 0; c < 3; c++) acc[c] += box(S[c], x, y, r) / sw;
        wsum++;
      }
      const n = (rnd() + rnd() - 1) * 2.2;
      for (let c = 0; c < 3; c++) out[p * ch + c] = Math.max(0, Math.min(255, Math.round(acc[c] / wsum + n)));
    }
  // soften the filled area a touch (3x3 blur inside the mask only)
  const res = new Uint8Array(out);
  for (let y = 1; y < H - 1; y++)
    for (let x = 1; x < W - 1; x++) {
      const p = y * W + x;
      if (!mask[p]) continue;
      for (let c = 0; c < 3; c++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += out[((y + dy) * W + x + dx) * ch + c];
        res[p * ch + c] = Math.round((sum / 9) * 0.6 + out[p * ch + c] * 0.4);
      }
    }
  return { ...img, data: res };
}

/** Cut an element out as RGBA using a binary mask (closed + feathered). */
export function extractElement(img, mask, bbox, { close = 2, feather = 1 } = {}) {
  const { W, ch, data } = img;
  const [x0, y0, x1, y1] = bbox;
  const w = x1 - x0, h = y1 - y0;
  let m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) m[y * w + x] = mask[(y0 + y) * W + x0 + x];
  if (close) m = erode(dilate(m, w, h, close), w, h, close);
  const a = new Float32Array(w * h);
  for (let i = 0; i < a.length; i++) a[i] = m[i] * 255;
  // box feather
  const fa = new Float32Array(a.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let s = 0, n = 0;
      for (let dy = -feather; dy <= feather; dy++)
        for (let dx = -feather; dx <= feather; dx++) {
          const yy = y + dy, xx = x + dx;
          if (yy < 0 || yy >= h || xx < 0 || xx >= w) { n++; continue; }
          s += a[yy * w + xx]; n++;
        }
      fa[y * w + x] = s / n;
    }
  const out = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = ((y0 + y) * W + x0 + x) * ch, o = (y * w + x) * 4;
      out[o] = data[i]; out[o + 1] = data[i + 1]; out[o + 2] = data[i + 2]; out[o + 3] = Math.round(fa[y * w + x]);
    }
  return { buf: out, w, h };
}
