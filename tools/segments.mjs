// node tools/segments.mjs <img> gap x0,y0,x1,y1 [x0,y0,x1,y1 ...]
// Prints ink bbox of each rect and its horizontal segments (split on gaps wider than `gap` px).
import sharp from 'sharp';
import { inkMask, maskBBox } from '../scripts/lib/inpaint.mjs';
const [file, gap, ...rects] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const img = { data, W: info.width, H: info.height, ch: 3 };
for (const r of rects) {
  const rect = r.split(',').map(Number);
  const m = inkMask(img, rect, { grow: 0 });
  const bb = maskBBox(m, img.W, img.H);
  if (!bb) { console.log(r, 'no ink'); continue; }
  const cols = [];
  for (let x = bb[0]; x < bb[2]; x++) {
    let any = false;
    for (let y = bb[1]; y < bb[3]; y++) if (m[y * img.W + x]) { any = true; break; }
    cols.push(any);
  }
  const segs = [];
  let s = null, last = -1e9;
  cols.forEach((on, i) => {
    const x = bb[0] + i;
    if (!on) return;
    if (s && x - last > +gap) { segs.push(s); s = null; }
    if (!s) s = { x0: x, x1: x };
    s.x1 = x; last = x;
  });
  if (s) segs.push(s);
  const segBoxes = segs.map(({ x0, x1 }) => {
    let y0 = 1e9, y1 = -1;
    for (let y = bb[1]; y < bb[3]; y++) for (let x = x0; x <= x1; x++) if (m[y * img.W + x]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return `[${x0}-${x1 + 1} y${y0}-${y1 + 1}]`;
  });
  console.log(`${r} => bbox [${bb.join(',')}]  segs ${segBoxes.join(' ')}`);
}
