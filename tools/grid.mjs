// node tools/grid.mjs <img> x y w h scale step out.png  -> zoomed crop with labelled grid in source px
import sharp from 'sharp';
const [f, x, y, w, h, sc, step, out] = process.argv.slice(2);
const X = +x, Y = +y, Wd = +w, Ht = +h, s = +sc, st = +step;
const W = Math.round(Wd * s), H = Math.round(Ht * s);
let g = '';
for (let gx = Math.ceil(X / st) * st; gx < X + Wd; gx += st) {
  const px = (gx - X) * s;
  g += `<line x1="${px}" y1="0" x2="${px}" y2="${H}" stroke="#0af" stroke-opacity=".5"/><text x="${px + 2}" y="12" font-size="11" fill="#06c" font-family="Arial">${gx}</text>`;
}
for (let gy = Math.ceil(Y / st) * st; gy < Y + Ht; gy += st) {
  const py = (gy - Y) * s;
  g += `<line x1="0" y1="${py}" x2="${W}" y2="${py}" stroke="#0af" stroke-opacity=".5"/><text x="2" y="${py - 2}" font-size="11" fill="#06c" font-family="Arial">${gy}</text>`;
}
await sharp(f).extract({ left: X, top: Y, width: Wd, height: Ht }).resize(W, H)
  .composite([{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${g}</svg>`) }]).toFile(out);
