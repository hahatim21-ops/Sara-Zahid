// Rose-gold scratch foil over the Nikah date.
import { gsap } from 'gsap';

export function initScratch({ wrap, button, onReveal }) {
  const canvas = wrap.querySelector('.foil');
  const sheen = wrap.querySelector('.foil-sheen');
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  const probe = document.createElement('canvas');
  probe.width = 48; probe.height = 16;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  let ready = false, done = false, touched = false, drawing = false, last = null, scale = 1, lastCheck = 0;

  function paint() {
    const r = wrap.getBoundingClientRect();
    if (r.width < 4) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    scale = canvas.width / r.width;
    const W = canvas.width, H = canvas.height;
    const rad = Math.min(W, H) * 0.08;
    ctx.save();
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, 0, W, H, rad); else ctx.rect(0, 0, W, H);
    ctx.clip();
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#e7b8ad');
    g.addColorStop(0.22, '#f8dcd2');
    g.addColorStop(0.42, '#d29d93');
    g.addColorStop(0.6, '#f3d0c6');
    g.addColorStop(0.8, '#c98f86');
    g.addColorStop(1, '#ecc3b9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // brushed-metal streaks
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? '#fff' : '#a8706a';
      ctx.fillRect(0, Math.random() * H, W, Math.random() * 1.6 * scale);
    }
    // fine grain
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 22;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    }
    ctx.putImageData(img, 0, 0);
    ctx.globalAlpha = 1;
    // subtle sparkle flecks + inner border
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = `rgba(255,250,240,${0.3 + Math.random() * 0.6})`;
      const s = (0.6 + Math.random() * 1.2) * scale;
      ctx.fillRect(Math.random() * W, Math.random() * H, s, s);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(4 * scale, 4 * scale, W - 8 * scale, H - 8 * scale, rad * 0.8); else ctx.rect(4 * scale, 4 * scale, W - 8 * scale, H - 8 * scale);
    ctx.stroke();
    // hint glyph
    ctx.fillStyle = 'rgba(138, 60, 66, 0.45)';
    ctx.font = `italic ${Math.round(H * 0.16)}px 'EB Garamond', serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦  scratch here  ✦', W / 2, H / 2);
    ctx.restore();
    ctx.globalCompositeOperation = 'destination-out';
    ready = true;
    return true;
  }

  function brush(x, y) {
    const r = 26 * scale;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function stroke(to) {
    if (!last) { brush(to.x, to.y); last = to; return; }
    const dx = to.x - last.x, dy = to.y - last.y;
    const dist = Math.hypot(dx, dy);
    const stepLen = 26 * scale * 0.3;
    const n = Math.max(1, Math.ceil(dist / stepLen));
    for (let i = 1; i <= n; i++) brush(last.x + (dx * i) / n, last.y + (dy * i) / n);
    last = to;
  }

  function clearedFraction() {
    pctx.clearRect(0, 0, probe.width, probe.height);
    pctx.drawImage(canvas, 0, 0, probe.width, probe.height);
    const d = pctx.getImageData(0, 0, probe.width, probe.height).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 64) clear++;
    return clear / (d.length / 4);
  }

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) * scale, y: (e.clientY - r.top) * scale };
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (done) return;
    if (!ready) paint();
    drawing = true;
    last = null;
    canvas.setPointerCapture?.(e.pointerId);
    if (!touched) {
      touched = true;
      gsap.to(sheen, { opacity: 0, duration: 0.4, onComplete: () => sheen.remove() });
    }
    stroke(pos(e));
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drawing || done) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ce of evs.length ? evs : [e]) stroke(pos(ce));
    const now = performance.now();
    if (now - lastCheck > 120) {
      lastCheck = now;
      if (clearedFraction() >= 0.5) reveal();
    }
  });
  const end = () => {
    if (!drawing) return;
    drawing = false;
    last = null;
    if (!done && clearedFraction() >= 0.5) reveal();
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);

  function reveal() {
    if (done) return;
    done = true;
    drawing = false;
    gsap.to(canvas, { opacity: 0, scale: 1.04, duration: 0.7, ease: 'power2.out', onComplete: () => { wrap.style.display = 'none'; } });
    if (sheen.isConnected) sheen.remove();
    button.remove();
    if (navigator.userActivation?.hasBeenActive !== false) { try { navigator.vibrate?.(30); } catch { /* unsupported */ } }
    onReveal?.(wrap.getBoundingClientRect());
  }

  button.addEventListener('click', reveal);
  return {
    paint,
    get done() { return done; },
    reveal,
  };
}
