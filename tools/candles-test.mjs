// Visual check for candle detection: node tools/candles-test.mjs <img> '<json opts>' <out.png>
import sharp from 'sharp';
import { detectCandles } from '../scripts/lib/candles.mjs';
const [file, opts, out] = process.argv.slice(2);
const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const c = detectCandles(data, info.width, info.height, JSON.parse(opts));
console.log(c.length, 'candles');
const W = info.width, H = info.height;
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${c
  .map((p) => `<circle cx="${(p.x / 100) * W}" cy="${(p.y / 100) * H}" r="${Math.max(5, (p.size / 100) * W)}" fill="none" stroke="#00f" stroke-width="2"/>`)
  .join('')}</svg>`;
await sharp(file).composite([{ input: Buffer.from(svg) }]).toFile(out);
