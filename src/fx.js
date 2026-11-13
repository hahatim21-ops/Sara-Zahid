// One fixed full-viewport canvas for falling petals, drifting sparkles and gold glitter bursts.
import { gsap } from 'gsap';

const PALETTE = [
  ['#fbe3df', '#eeb2b4'],
  ['#f9d6d3', '#e39ba2'],
  ['#fde9e4', '#f0bcbd'],
  ['#f7cfcf', '#d98d97'],
  ['#fff1ec', '#f2c4c0'],
];

function petalSprite([c0, c1], soft) {
  const W = 40, H = 52;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const draw = (ox, oy, alpha) => {
    g.save();
    g.globalAlpha = alpha;
    g.translate(W / 2 + ox, H / 2 + oy);
    const w = 15, h = 22;
    g.beginPath();
    g.moveTo(-w * 0.18, -h);
    g.quadraticCurveTo(0, -h * 0.8, w * 0.18, -h);
    g.bezierCurveTo(w * 1.15, -h * 0.75, w * 1.05, h * 0.45, 0, h);
    g.bezierCurveTo(-w * 1.05, h * 0.45, -w * 1.15, -h * 0.75, -w * 0.18, -h);
    g.closePath();
    const grad = g.createLinearGradient(-w, -h, w, h);
    grad.addColorStop(0, c0);
    grad.addColorStop(1, c1);
    g.fillStyle = grad;
    g.fill();
    if (!soft) {
      g.globalAlpha = alpha * 0.35;
      g.strokeStyle = '#fff';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(0, h * 0.85);
      g.quadraticCurveTo(w * 0.15, 0, 0, -h * 0.7);
      g.stroke();
    }
    g.restore();
  };
  if (soft) {
    // cheap blur: stacked offset copies at low alpha
    for (const [ox, oy] of [[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [0.9, 0.9], [-0.9, -0.9]]) draw(ox, oy, 0.22);
  } else draw(0, 0, 1);
  return cv;
}

export function createFX(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  let dpr = 1, vw = 0, vh = 0;
  const isSmall = () => Math.min(window.innerWidth, window.innerHeight) < 700 || matchMedia('(pointer: coarse)').matches;
  const sprites = PALETTE.map((p) => petalSprite(p, false));
  const softSprites = PALETTE.map((p) => petalSprite(p, true));
  const petals = [];
  const extras = []; // burst petals (not respawned)
  const glitter = [];
  const sparkles = [];
  let wind = 0, windTarget = 0, shower = 0, running = true, last = performance.now();
  let target = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    vw = window.innerWidth; vh = window.innerHeight;
    canvas.width = Math.round(vw * dpr); canvas.height = Math.round(vh * dpr);
    target = isSmall() ? 18 : 35;
  }
  resize();
  window.addEventListener('resize', resize);

  function makePetal(spawnTop) {
    const z = 0.35 + Math.random() * 0.65; // depth: smaller = farther
    const idx = (Math.random() * sprites.length) | 0;
    return {
      x: Math.random() * vw,
      y: spawnTop ? -30 - Math.random() * vh * 0.3 : Math.random() * vh,
      z,
      size: (10 + Math.random() * 10) * (0.45 + z * 0.75),
      vy: (18 + Math.random() * 22) * (0.4 + z * 0.8),
      vx: (Math.random() - 0.5) * 10,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 1.6,
      flip: Math.random() * Math.PI * 2,
      vflip: 1.2 + Math.random() * 2.2,
      sway: Math.random() * Math.PI * 2,
      swayAmp: 12 + Math.random() * 26,
      swaySpeed: 0.6 + Math.random() * 0.9,
      sprite: z < 0.6 ? softSprites[idx] : sprites[idx],
      alpha: 0.55 + z * 0.45,
    };
  }

  for (let i = 0; i < 9; i++) {
    sparkles.push({ x: Math.random(), y: Math.random(), p: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.2, r: 1.2 + Math.random() * 1.6, dx: (Math.random() - 0.5) * 0.004, dy: -0.002 - Math.random() * 0.004 });
  }

  function drawPetal(p, t) {
    const sx = Math.cos(p.flip) * 0.9 + 0.1 * Math.sign(Math.cos(p.flip) || 1);
    const s = p.size / 40;
    const cos = Math.cos(p.rot), sin = Math.sin(p.rot);
    ctx.globalAlpha = p.alpha * (p.fade ?? 1);
    ctx.setTransform(cos * sx * s * dpr, sin * sx * s * dpr, -sin * s * dpr, cos * s * dpr, (p.x + Math.sin(p.sway) * p.swayAmp) * dpr, p.y * dpr);
    ctx.drawImage(p.sprite, -20, -26);
  }

  function step(p, dt, t) {
    p.y += p.vy * dt;
    p.x += (p.vx + wind * (0.5 + p.z)) * dt;
    p.rot += p.vr * dt;
    p.flip += p.vflip * dt;
    p.sway += p.swaySpeed * dt;
  }

  function tick() {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (!running) return;
    dt = Math.min(dt, 0.05);
    wind += (windTarget - wind) * Math.min(1, dt * 1.8);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!reduced) {
      const want = target + (shower > 0 ? target * 1.6 : 0);
      if (shower > 0) shower -= dt;
      while (petals.length < want) petals.push(makePetal(petals.length > 2));
      for (let i = petals.length - 1; i >= 0; i--) {
        const p = petals[i];
        step(p, dt, now);
        if (p.y > vh + 40 || p.x < -80 || p.x > vw + 80) {
          if (petals.length > want) petals.splice(i, 1);
          else petals[i] = makePetal(true);
          continue;
        }
        drawPetal(p, now);
      }
      // sparkles
      for (const s of sparkles) {
        s.x += s.dx * dt; s.y += s.dy * dt; s.p += s.sp * dt;
        if (s.y < -0.05) { s.y = 1.05; s.x = Math.random(); }
        if (s.x < -0.05) s.x = 1.05; if (s.x > 1.05) s.x = -0.05;
        const a = Math.max(0, Math.sin(s.p)) ** 3;
        if (a < 0.02) continue;
        star(s.x * vw, s.y * vh, s.r * 2.6, a * 0.9, '#fffaf0');
      }
    }
    // burst petals
    for (let i = extras.length - 1; i >= 0; i--) {
      const p = extras[i];
      p.vx *= 1 - dt * 1.2; p.vy += (30 - p.vy) * dt * 1.4;
      step(p, dt, now);
      p.life -= dt;
      p.fade = Math.min(1, p.life / 0.8);
      if (p.life <= 0 || p.y > vh + 40) { extras.splice(i, 1); continue; }
      drawPetal(p, now);
    }
    // glitter
    for (let i = glitter.length - 1; i >= 0; i--) {
      const g = glitter[i];
      g.vx *= 1 - dt * 2.2; g.vy *= 1 - dt * 2.2; g.vy += 60 * dt;
      g.x += g.vx * dt; g.y += g.vy * dt; g.life -= dt; g.tw += dt * 14;
      if (g.life <= 0) { glitter.splice(i, 1); continue; }
      const a = Math.min(1, g.life / 0.5) * (0.6 + 0.4 * Math.sin(g.tw));
      if (g.star) star(g.x, g.y, g.r * 2.4, a, g.c);
      else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = a;
        ctx.fillStyle = g.c;
        ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  function star(x, y, r, a, c) {
    ctx.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
    ctx.globalAlpha = a;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.18, -r * 0.18); ctx.lineTo(r, 0); ctx.lineTo(r * 0.18, r * 0.18);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.18, r * 0.18); ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.18, -r * 0.18);
    ctx.closePath(); ctx.fill();
  }

  gsap.ticker.add(tick);
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    last = performance.now();
  });

  // breeze gusts every 12–15 s
  const gustLoop = () => {
    gsap.delayedCall(12 + Math.random() * 3, () => { api.gust(); gustLoop(); });
  };
  gustLoop();

  const api = {
    /** petals + glitter from a point; dir in radians (default: all around), spread in radians */
    burst(x, y, { petals: np = 18, glitter: ng = 30, speed = 260, dir = null, spread = Math.PI * 2, gold = true } = {}) {
      if (reduced) np = 0;
      for (let i = 0; i < np; i++) {
        const p = makePetal(false);
        const a = dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * spread;
        const v = speed * (0.35 + Math.random() * 0.75);
        Object.assign(p, { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 2.4 + Math.random() * 1.6, swayAmp: 6 + Math.random() * 10, sprite: sprites[(Math.random() * sprites.length) | 0], z: 0.8, size: 12 + Math.random() * 10, alpha: 0.95 });
        extras.push(p);
      }
      for (let i = 0; i < ng; i++) {
        const a = dir == null ? Math.random() * Math.PI * 2 : dir + (Math.random() - 0.5) * spread;
        const v = speed * (0.3 + Math.random() * 0.9);
        glitter.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.8 + Math.random() * 0.9, tw: Math.random() * 6,
          r: 0.8 + Math.random() * 1.6, star: Math.random() < 0.35, c: gold ? ['#f3d48f', '#e9c27a', '#fff3cf', '#d9a85c'][(Math.random() * 4) | 0] : '#fff6ea',
        });
      }
    },
    /** heavier petal fall for `sec` seconds */
    shower(sec = 3) { if (!reduced) shower = sec; },
    gust() {
      if (reduced) return;
      windTarget = (Math.random() < 0.5 ? -1 : 1) * (40 + Math.random() * 30);
      gsap.delayedCall(2, () => { windTarget = 0; });
      window.dispatchEvent(new CustomEvent('breeze'));
    },
  };
  return api;
}
