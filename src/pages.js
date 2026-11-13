// Page 2–5 content (live text, ornaments, dividers) layered over the cleaned backgrounds.
import {
  scene, h, s, pageShell, elementImg, lineEl, writeOnEl, shapesSvg, divider, lineFromCenter, lineById, BASE,
} from './scene.js';

const pctW = (page, v) => `${((v / page.w) * 100).toFixed(4)}%`;
const pctH = (page, v) => `${((v / page.h) * 100).toFixed(4)}%`;

/** Light sweep masked to an image element's alpha. */
export function shimmerFor(img, page, name) {
  const e = page.elements[name];
  const url = `url("${BASE}${e.src}")`;
  return h('div', {
    class: 'shimmer',
    style: { left: `${e.x}%`, top: `${e.y}%`, width: `${e.w}%`, height: `${e.h}%`, webkitMaskImage: url, maskImage: url },
  });
}
/** Light sweep over a rectangular block (source px box). */
export function shimmerBox(page, [x0, y0, x1, y1]) {
  return h('div', {
    class: 'shimmer',
    style: { left: pctW(page, x0), top: pctH(page, y0), width: pctW(page, x1 - x0), height: pctH(page, y1 - y0), borderRadius: '8px' },
  });
}

// ---------------- page 2 ----------------
export function buildPage2() {
  const P = pageShell(2, { label: 'Sara and Zahid' });
  const { page, fg } = P;
  const mono = elementImg(page, 'monogram', 'SZ monogram', 'wipe-diag');
  const monoShimmer = shimmerFor(mono, page, 'monogram');
  const sara = writeOnEl(page, lineById(page, 'sara'));
  const zahid = writeOnEl(page, lineById(page, 'zahid'));
  const color = lineById(page, 'sara').color;
  const svg = shapesSvg(page);
  const [bx0, by0, bx1, by1] = page.shapes.bar;
  const bcx = (bx0 + bx1) / 2, bcy = (by0 + by1) / 2;
  const barUp = s('path', { d: `M${bcx} ${bcy}L${bcx} ${by0 + 2}`, stroke: color, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' });
  const barDown = s('path', { d: `M${bcx} ${bcy}L${bcx} ${by1 - 2}`, stroke: color, 'stroke-width': 2.2, fill: 'none', 'stroke-linecap': 'round' });
  svg.append(barUp, barDown);
  const div = divider(svg, page.shapes.div, color, { sw: 2, gap: 0.035 });
  const cue = h('div', { class: 'scroll-cue', 'aria-hidden': 'true' }, h('div', { class: 'track' }, h('i', { class: 'dot' })), h('span', {}, 'scroll'));
  fg.append(mono, monoShimmer, svg, sara, zahid);
  document.body.append(cue); // fixed to the bottom of the screen
  return { ...P, mono, monoShimmer, sara, zahid, bar: [barUp, barDown], div, cue };
}

// ---------------- page 3 ----------------
export function buildPage3() {
  const P = pageShell(3, { lazy: true, label: 'Invitation' });
  const { page, fg } = P;
  const L = (id, opts) => lineEl(page, lineById(page, id), opts);
  const mono = elementImg(page, 'monogram', 'SZ monogram');
  const monoShimmer = shimmerFor(mono, page, 'monogram');
  const bism = elementImg(page, 'bismillah', 'بسم الله الرحمن الرحيم', 'wipe-rtl');
  bism.setAttribute('lang', 'ar');
  const flourish = elementImg(page, 'flourish', '');
  const color = lineById(page, 'l1').color;
  const svg = shapesSvg(page);
  const div1 = divider(svg, page.shapes.div1, color, { sw: 2.4, gap: 0.03 });
  const wl = page.shapes.withL, wr = page.shapes.withR;
  const wy = ((wl[1] + wl[3]) / 2 + (wr[1] + wr[3]) / 2) / 2;
  const withL = lineFromCenter(svg, wl[2], wy, wl[0], color, 2.4);
  const withR = lineFromCenter(svg, wr[0], wy, wr[2], color, 2.4);
  const els = {
    l1: L('l1'), l2: L('l2'),
    gp1: L('gp1', { extraClass: 'wipe-ltr' }), gp2: L('gp2', { extraClass: 'wipe-ltr' }),
    r1: L('r1'), r2: L('r2'),
    sara: writeOnEl(page, lineById(page, 'sara')),
    d1: L('d1'), d2: L('d2'),
    with: L('with'),
    zahid: writeOnEl(page, lineById(page, 'zahid')),
    s1: L('s1'), s2: L('s2'),
    credit: L('credit'),
  };
  fg.append(mono, monoShimmer, bism, svg, flourish, ...Object.values(els));
  return { ...P, mono, monoShimmer, bism, flourish, div1, withL, withR, els };
}

// ---------------- page 4 ----------------
export function buildPage4() {
  const P = pageShell(4, { lazy: true, label: 'Nikah and Reception' });
  const { page, fg } = P;
  const L = (id, opts) => lineEl(page, lineById(page, id), opts);
  const color = lineById(page, 'nTitle').color;
  const svg = shapesSvg(page);
  const nDiv = divider(svg, page.shapes.nDiv, color, { sw: 1.6, gap: 0.035, ornate: true });
  const rDiv = divider(svg, page.shapes.rDiv, color, { sw: 1.6, gap: 0.035, ornate: true });
  const atLines = (lk, rk) => {
    const a = page.shapes[lk], b = page.shapes[rk];
    const y = ((a[1] + a[3]) / 2 + (b[1] + b[3]) / 2) / 2;
    return [lineFromCenter(svg, a[2], y, a[0], color, 1.6), lineFromCenter(svg, b[0], y, b[2], color, 1.6)];
  };
  const nAt = atLines('nAtL', 'nAtR');
  const rAt = atLines('rAtL', 'rAtR');

  // banner (recreated: no banner layer was supplied)
  const [bx0, by0, bx1, by1] = page.shapes.nBanner;
  const x0 = bx0 + 10, x1 = bx1 - 9, y0 = by0 + 10, y1 = by1 - 8, cy = (y0 + y1) / 2, k = 26;
  const outline = (i) => `M${x0 + i} ${cy}Q${x0 + k * 0.55 + i} ${y0 + (cy - y0) * 0.35 + i * 0.5} ${x0 + k + i} ${y0 + i}H${x1 - k - i}Q${x1 - k * 0.55 - i} ${y0 + (cy - y0) * 0.35 + i * 0.5} ${x1 - i} ${cy}Q${x1 - k * 0.55 - i} ${y1 - (y1 - cy) * 0.35 - i * 0.5} ${x1 - k - i} ${y1 - i}H${x0 + k + i}Q${x0 + k * 0.55 + i} ${y1 - (y1 - cy) * 0.35 - i * 0.5} ${x0 + i} ${cy}Z`;
  const grad = s('linearGradient', { id: 'bannerFill', x1: 0, y1: 0, x2: 0, y2: 1 },
    s('stop', { offset: '0', 'stop-color': '#9a3a4c' }), s('stop', { offset: '0.55', 'stop-color': '#86283b' }), s('stop', { offset: '1', 'stop-color': '#73202f' }));
  const sheen = s('linearGradient', { id: 'bannerSheen', x1: 0, y1: 0, x2: 1, y2: 0 },
    s('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': 0 }), s('stop', { offset: '0.5', 'stop-color': '#fff', 'stop-opacity': 0.55 }), s('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': 0 }));
  const clip = s('clipPath', { id: 'bannerClip' }, s('path', { d: outline(0) }));
  const sheenRect = s('rect', { x: x0 - 140, y: y0, width: 120, height: y1 - y0, fill: 'url(#bannerSheen)', 'clip-path': 'url(#bannerClip)', opacity: 0 });
  const bannerText = (t, op) => s('text', {
    x: (x0 + x1) / 2, y: cy + 13, 'text-anchor': 'middle', fill: '#fbeae3', opacity: op,
    'font-family': "'EB Garamond', serif", 'font-style': 'italic', 'font-size': 40, 'letter-spacing': 0.6,
  }, t);
  const txtScratch = bannerText('Scratch to Reveal', 1);
  const txtSave = bannerText('Save the Date', 0);
  const banner = s('g', { class: 'banner', opacity: 0 },
    s('defs', {}, grad, sheen, clip),
    s('path', { d: outline(-3), fill: '#f6d8cf', stroke: '#e2b2a8', 'stroke-width': 1.2 }),
    s('path', { d: outline(0), fill: 'url(#bannerFill)' }),
    s('path', { d: outline(5), fill: 'none', stroke: '#e9b6ad', 'stroke-width': 1.3, opacity: 0.85 }),
    sheenRect, txtScratch, txtSave);
  svg.append(banner);

  const ids = ['nTitle', 'nInsha', 'nDate', 'nDay', 'nHijri', 'nAt', 'nVenue', 'nAddr1', 'nAddr2',
    'rTitle', 'rInsha', 'rDay', 'rDate', 'rTime', 'rHijri', 'rAt', 'rVenue', 'rAddr1', 'rAddr2'];
  const els = {};
  for (const id of ids) els[id] = L(id, { tag: /Title/.test(id) ? 'h2' : 'p' });
  // Nikah date sits under the scratch foil; hidden from screen readers until revealed
  const nikahDate = h('div', { class: 'date-block', 'aria-hidden': 'true' }, els.nDate, els.nDay, els.nHijri);
  // Reception date stays blurred until the Nikah scratch is complete
  for (const id of ['rDay', 'rDate', 'rTime', 'rHijri']) els[id].classList.add('rblur');

  // foil covers the Nikah date block
  const fb = [158, 463, 729, 630];
  const foilWrap = h('div', {
    class: 'foil-wrap',
    style: { left: pctW(page, fb[0]), top: pctH(page, fb[1]), width: pctW(page, fb[2] - fb[0]), height: pctH(page, fb[3] - fb[1]) },
  }, h('canvas', { class: 'foil', 'aria-label': 'Scratch card covering the Nikah date. Scratch to reveal.', role: 'img' }), h('div', { class: 'foil-sheen' }));
  const revealBtn = h('button', { type: 'button', class: 'sr-only sr-only-focusable reveal-btn' }, 'Reveal the Nikah date');
  const dateShimmer = shimmerBox(page, [165, 465, 722, 622]);
  const rDateShimmer = shimmerBox(page, [220, 1184, 668, 1370]);

  fg.append(svg, ...Object.entries(els).filter(([k]) => !['nDate', 'nDay', 'nHijri'].includes(k)).map(([, v]) => v),
    nikahDate, dateShimmer, rDateShimmer, foilWrap, revealBtn);
  // card containers used as scroll triggers (Nikah = top half, Reception = bottom half)
  const nikahZone = h('div', { class: 'zone', style: { position: 'absolute', left: 0, right: 0, top: '4%', height: '46%', pointerEvents: 'none' } });
  const recZone = h('div', { class: 'zone', style: { position: 'absolute', left: 0, right: 0, top: '54%', height: '42%', pointerEvents: 'none' } });
  fg.prepend(nikahZone, recZone);
  return {
    ...P, els, nDiv, rDiv, nAt, rAt, banner, sheenRect, txtScratch, txtSave, nikahDate, foilWrap, revealBtn,
    dateShimmer, rDateShimmer, nikahZone, recZone,
  };
}

// ---------------- page 5 ----------------
export function buildPage5() {
  const P = pageShell(5, { lazy: true, label: 'Regards' });
  const { page, fg } = P;
  const regards = lineEl(page, lineById(page, 'regards'), { tag: 'p' });
  const color = lineById(page, 'regards').color;
  const svg = shapesSvg(page);
  const a = page.shapes.regL, b = page.shapes.regR;
  const y = ((a[1] + a[3]) / 2 + (b[1] + b[3]) / 2) / 2;
  const lines = [lineFromCenter(svg, a[2], y, a[0], color, 2.6), lineFromCenter(svg, b[0], y, b[2], color, 2.6)];
  const family = writeOnEl(page, lineById(page, 'family'));
  const credit = lineEl(page, lineById(page, 'credit'));
  fg.append(svg, regards, family, credit);
  return { ...P, regards, lines, family, credit };
}

export { scene };
