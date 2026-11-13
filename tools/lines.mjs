// Usage: node lines.mjs <image> x0 y0 x1 y1  -> prints ink line boxes inside rect
import sharp from 'sharp';
const [file, ...r] = process.argv.slice(2);
const [x0, y0, x1, y1] = r.map(Number);
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const isInk = (x, y) => {
  const i = (y * W + x) * 3;
  const R = data[i], G = data[i + 1], B = data[i + 2];
  const L = 0.299 * R + 0.587 * G + 0.114 * B;
  return L < 175 && R > G + 25;
};
const rows = [];
for (let y = y0; y < y1; y++) {
  let c = 0, mn = 1e9, mx = -1;
  for (let x = x0; x < x1; x++) if (isInk(x, y)) { c++; if (x < mn) mn = x; if (x > mx) mx = x; }
  rows.push({ y, c, mn, mx });
}
let cur = null; const out = [];
for (const r of rows) {
  if (r.c > 1) {
    if (!cur) cur = { y0: r.y, y1: r.y, x0: r.mn, x1: r.mx, n: 0 };
    cur.y1 = r.y; cur.x0 = Math.min(cur.x0, r.mn); cur.x1 = Math.max(cur.x1, r.mx); cur.n += r.c;
  } else if (cur && r.y - cur.y1 > 2) { out.push(cur); cur = null; }
}
if (cur) out.push(cur);
for (const b of out) if (b.n > 30) console.log(`y ${b.y0}-${b.y1} (h${b.y1 - b.y0})  x ${b.x0}-${b.x1}  cx ${((b.x0 + b.x1) / 2).toFixed(0)}  n${b.n}`);
