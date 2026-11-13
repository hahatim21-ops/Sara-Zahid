// Detects candle flames: small, bright, warm-yellow blobs (high R, G well above B).
// Returns [{ x, y, size }] in % of image width/height (size in % of width).
export function detectCandles(data, W, H, {
  yMinFrac = 0.5, xRanges = null, exclude = [], minArea = 2, maxArea = 400,
  minR = 238, minG = 160, maxB = 165, minGB = 55, maxRG = 80, minWhite = 4, white = [246, 240, 225],
} = {}) {
  const ch = data.length / (W * H);
  const mask = new Uint8Array(W * H);
  const y0 = Math.floor(H * yMinFrac);
  for (let y = y0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * ch;
      const R = data[i], G = data[i + 1], B = data[i + 2];
      if (R >= minR && G >= minG && B <= maxB && G - B >= minGB && R - G <= maxRG) mask[y * W + x] = 1;
    }
  }
  // a real flame sits on glowing wax: require several near-white pixels right around it
  const rad = Math.max(5, Math.round(W * 0.007));
  const whiteAround = (cx, cy) => {
    let n = 0;
    for (let y = Math.max(0, cy - rad); y <= Math.min(H - 1, cy + rad); y++)
      for (let x = Math.max(0, cx - rad); x <= Math.min(W - 1, cx + rad); x++) {
        const i = (y * W + x) * ch;
        if (data[i] >= white[0] && data[i + 1] >= white[1] && data[i + 2] >= white[2]) n++;
      }
    return n;
  };
  // connected components (4-neighbour flood fill)
  const seen = new Uint8Array(W * H);
  const out = [];
  const stack = [];
  for (let p = y0 * W; p < W * H; p++) {
    if (!mask[p] || seen[p]) continue;
    let n = 0, sx = 0, sy = 0, minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;
    stack.push(p); seen[p] = 1;
    while (stack.length) {
      const q = stack.pop();
      const x = q % W, y = (q - x) / W;
      n++; sx += x; sy += y;
      if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      for (const nb of [q - 1, q + 1, q - W, q + W]) {
        if (nb >= 0 && nb < W * H && mask[nb] && !seen[nb]) { seen[nb] = 1; stack.push(nb); }
      }
    }
    if (n < minArea || n > maxArea) continue;
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    if (bw > bh * 2.2) continue; // flames are upright, not wide streaks
    const cx = sx / n, cy = sy / n;
    if (xRanges && !xRanges.some(([a, b]) => cx >= a * W && cx <= b * W)) continue;
    if (exclude.some(([ax, ay, bx, by]) => cx >= ax * W && cx <= bx * W && cy >= ay * H && cy <= by * H)) continue;
    if (whiteAround(Math.round(cx), Math.round(cy)) < minWhite) continue;
    out.push({ x: +((cx / W) * 100).toFixed(2), y: +((cy / H) * 100).toFixed(2), size: +((Math.max(bw, bh) / W) * 100).toFixed(2) });
  }
  // merge detections closer than ~0.9% width (split blobs of the same flame)
  const merged = [];
  for (const c of out.sort((a, b) => a.y - b.y)) {
    const m = merged.find((d) => Math.abs(d.x - c.x) < 0.9 && Math.abs(d.y - c.y) * (H / W) < 1.2);
    if (m) { m.x = (m.x + c.x) / 2; m.y = Math.min(m.y, c.y); m.size = Math.max(m.size, c.size); }
    else merged.push({ ...c });
  }
  return merged;
}
