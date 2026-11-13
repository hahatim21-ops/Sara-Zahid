# Sara & Zahid — animated invitation

## Commands
- `npm install` — once
- `npm run dev -- --host` — dev server (open the "Network" URL on your phone, same Wi-Fi)
- `npm run assets` — rebuild images/data from `assets/` (run after adding layers)
- `npm run build` — assets + production build into `dist/`

Dev flags: `?debug` (outlines layers, candle points, pivots; exposes the intro timeline),
`?static` (skips the intro and shows every page in its final state).

## How it is built
No separated layers were supplied, so `scripts/build-assets.mjs` lifts the text and ornaments off
each reference image (`scripts/config.mjs` holds the measured boxes), fills the gaps, and re-draws
everything live: text positions and sizes are fitted to the reference with opentype.js.
If you later export layers into `assets/layers/pageN/`, run `npm run assets`: a `bg.png` replaces the
cleaned background, chandelier/palm layers swing around pivots measured into `src/data/pivots.json`,
and `card-*.png` frames rise in on page 4.

## Deploy (Netlify Drop)
1. `SITE_URL=https://your-site.netlify.app npm run build` (makes the WhatsApp preview image an absolute URL;
   on Windows PowerShell: `$env:SITE_URL="https://your-site.netlify.app"; npm run build`).
2. Drag the `dist/` folder onto https://app.netlify.com/drop.
