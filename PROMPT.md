# Build: Sara & Zahid — animated scroll wedding invitation website

Build a single-page, mobile-first wedding invitation website from the designs and layers in this folder. It should feel like a premium animated e-invite reel, but as a website. A gold key unlocks the first page and its doors swing open onto the monogram. Guests then scroll smoothly through the rest of the invitation, with gentle, continuous motion everywhere: swinging lit chandeliers, swaying palm fronds, flickering candles, falling petals, text that writes itself in, a monogram that forms, and a scratch-to-reveal date.

Quality bar:
- The look matches the reference designs closely.
- Every movement is smooth (60 fps on a mid-range Android phone).
- Nothing pops in and nothing overlaps.
- The key opening is completely seamless.

---

## 0. Before you write any code

1. Inspect `assets/`. List every file in `assets/layers/` and map it to the table in §2. Tell me which expected layers are missing. For a missing layer, use the fallback in §2 instead of stopping.
2. Look at each image in `assets/reference/`. They are the source of truth for layout, colours, typography and spacing.
3. Check the fonts line in §12. If it is blank, choose the closest Google Fonts by comparing them to the references, and tell me what you chose.
4. Give me the build plan in a few bullets. Then build in the stages in §15, checking your work after each one.

---

## 1. Stack

- Vite, vanilla JS and modern CSS, with no framework. The output is a static `dist/` folder.
- GSAP with ScrollTrigger, SplitText, DrawSVGPlugin and MotionPathPlugin, all from the `gsap` npm package.
- Lenis smooth scrolling on desktop/trackpad only. Touch devices keep native scrolling (`syncTouch: false`). Connect it with `lenis.on('scroll', ScrollTrigger.update)`, drive Lenis from `gsap.ticker`, and set `gsap.ticker.lagSmoothing(0)`.
- `sharp` (dev dependency) for a build script that:
  - converts every image to WebP at 1080w and 1440w for `srcset`, keeping alpha;
  - measures layer bounding boxes (§2);
  - detects candle positions (§10).
- `opentype.js` (dev dependency) to turn the script-font names into SVG paths for the write-on effect.
- One fixed, full-viewport `<canvas>` with `pointer-events: none` for petals and sparkles.

---

## 2. Assets

```
assets/
  reference/              flattened final designs (layout/colour source of truth + fallbacks)
    page1-keyhole.jpg     page 1 – keyhole
    page2-monogram.png    page 2 – SZ monogram, "Sara | Zahid"
    page3-invitation.jpg  page 3 – Bismillah + family names
    page4-events.png      page 4 – Nikah card (top) + Reception card (bottom)
    page5-regards.jpg     page 5 – Regards, Vataoo Family
  key.png                 gold key with pink bow (transparent PNG)
  audio/rab-rakha.mp3     background song
  layers/page1 … page5/   separated layers exported from the design file
```

**Expected layers.** Every layer is exported at the full page canvas size as a transparent PNG, with the element in its exact position. That way all layers of a page stack with identical sizing and line up automatically.

| Page | File in `assets/layers/pageN/` | Contents |
|---|---|---|
| 1 | `bg.png` | Everything except the items below |
| 1 | `keyhole.png` | Gold keyhole plate |
| 1, 2, 3, 5 | `chandelier-left.png`, `chandelier-right.png` | Each chandelier/lantern including its chain |
| 1, 2, 3, 5 | `palm-left.png`, `palm-right.png` | Palm fronds only (trunk stays in bg) |
| 2 | `bg.png` | No monogram, names, divider, chandeliers or fronds |
| 2 | `monogram.svg` (best), or `monogram-S.png` + `monogram-Z.png`, or `monogram.png` | The SZ monogram (page 3 reuses it smaller) |
| 3 | `bg.png` | No text, monogram, flourish, chandeliers or fronds |
| 3 | `bismillah.svg` / `.png` (optional) | Arabic calligraphy, to keep its exact style |
| 3 | `flourish.svg` / `.png` (optional) | Bottom ornament |
| 4 | `bg.png` | Pink background with both staircases and candles, no cards |
| 4 | `card-nikah.png`, `card-reception.png` | Empty arched card frames with their florals, no text |
| 4 | `banner.png` (optional) | Empty maroon "Scratch to Reveal" banner. If missing, recreate it in SVG/CSS |
| 5 | `bg.png` | No text, chandeliers or fronds |
| any | `assets/petals/*.png` (optional) | Single-petal sprites |

**Pivots.** For each swinging or swaying layer, compute its alpha bounding box with sharp and set the `transform-origin`:
- Chandeliers pivot at the top of the chain.
- Palm fronds pivot where the fronds meet the trunk.

Save the pivots to `src/data/pivots.json`. Add a `?debug` URL flag that outlines every layer, its pivot and every candle point.

**Fallback.** If a layer is missing:
- Use that page's reference image as the background.
- Fake the effect with overlays (glows, flicker, sparkles) at positions measured from the reference.
- Reveal any text baked into the image with soft feathered mask wipes instead of live text.

Tell me whenever you use a fallback.

---

## 3. Global layout and scroll

- Design for phones first. Each page is a 9:16 composition: one "stage" element holding all of that page's layers with identical sizing (`object-fit: cover`, centred). Use `svh` units so the iOS address bar doesn't cause jumps.
- **Pages stack vertically in normal document flow, one after another, with no overlap.** No sticky or stacked cards, and no page sliding over another. Each page scrolls fully away as the next one arrives.
- Section heights: pages 2, 3 and 5 are `100svh`, page 4 is `200svh`, and page 1 is the intro overlay (§4).
- To blend the seams, feather the top and bottom 6–8 vh of each background into the shared blush colour with a mask gradient. Content must never overlap across pages.
- Parallax happens only *inside* a page, and only subtly:
  - The background moves about 4% slower than the foreground layers (scrubbed).
  - The background is scaled to 1.06 so its edges never show.
- Desktop/tablet:
  - Show the invitation as a centred 9:16 column, `100svh` tall and `100svh × 9/16` wide.
  - Fill the side areas with a heavily blurred, slightly dimmed copy of the current page's background, crossfading as the guest scrolls.
- Never allow horizontal scroll.

---

## 4. Page 1 — keyhole, key and doors (the intro)

Reference: `page1-keyhole.jpg`. Key: `assets/key.png`.

**Structure.**
- Page 1 is a fixed full-screen overlay above everything. Body scroll is locked until the doors open.
- After opening, page 1 is removed. Scrolling back up must never show the closed door again; the scroll starts at page 2.

**Preload (critical for seamlessness).**
- Before the key can be tapped, preload all page 1 and page 2 assets plus the key, and call `img.decode()` on them.
- While loading, show the blush background with a tiny pulsing gold diamond.
- Then fade page 1 in from soft white over 1 s.

**Idle state.**
- Chandeliers are lit and swinging, palms sway, and a light petal fall runs (§10).
- The key rests in the lower third:
  - It floats gently (y ±6 px, rotate ±2°, 3.5 s yoyo).
  - A soft gold glint sweeps across it every ~3 s.
- Below the key, "Tap the key to open" appears in small, widely spaced serif caps with breathing opacity.

**On tap** (on the key, anywhere on page 1, or Enter/Space). Guard against double taps.

1. Music starts (§11) and the hint fades out.
2. The key lifts and travels along a gentle curved MotionPath to the keyhole with the bit end leading (1.4 s, `power2.inOut`). It scales down so the bit fits the keyhole opening, then gives a slight push-in (scale ×0.92) as if entering.
3. **Turn.**
   - Simulate a rotation around the key's long axis: `rotateX` 0→75° with perspective, plus a slight `scaleY` squash, over 0.45 s.
   - Play a soft synthesized metallic click (Web Audio, about 80 ms).
   - Show a warm gold flash from the keyhole and a small gold particle burst.
4. The key and keyhole plate fade out (0.3 s).
5. **Doors.**
   - Page 1 splits vertically down the centre into two halves: two copies of the full page-1 stage, clipped left and right, with their ambient animations in sync.
   - Each half swings open around its outer edge (`rotateY` to −105° / +105°, perspective ~1400 px, 1.8 s, `power3.inOut`).
   - Each half gets a darkening gradient as it turns, to fake lighting.
   - Warm light spills from the widening gap, and a burst of petals blows through it.
6. **Behind the doors**, page 2 is already rendered. It starts at scale 1.12, blur 6 px and brightness 1.15, and settles to scale 1, blur 0 and brightness 1 as the doors open, like walking through the doorway. Page 2's entry sequence (§5) starts 0.3 s before the doors finish.
7. Remove the overlay and unlock scrolling.

Animate only transform, opacity, filter and clip-path. Nothing changes layout during the sequence.

---

## 5. Page 2 — monogram formation

Reference: `page2-monogram.png`.

1. The chandeliers "light up" as the doors open: their glow ramps from 0 to full over 1.2 s with a gentle flare.
2. **Monogram formation (~2.4 s):**
   - **With `monogram.svg`:**
     - Draw each path's outline in sequence with DrawSVG: the S first, then the Z, then the flourishes, using a thin rose stroke.
     - Fade in the fill in the monogram colour while the stroke fades out.
     - Sweep a soft diagonal light shimmer across it.
   - **With `monogram-S.png` + `monogram-Z.png`:**
     - The S glides in from the left and the Z from the right (blur 8 px→0, fading in, slight rotation).
     - They interlock and settle with a tiny scale overshoot, then the shimmer sweeps across.
   - **With a single PNG:** use a diagonal feathered mask reveal followed by the shimmer.
3. **"Sara" writes itself on:** an outline stroke draw of the script-font path (§12), then the fill fades in. A tiny sparkle "pen tip" leads the stroke.
4. The vertical divider grows from its centre, then "Zahid" writes on the same way.
5. The line–diamond–line divider draws outward from the diamond.
6. After the sequence, show a subtle scroll cue: a thin line with a dot travelling down and "scroll" in tiny caps. It disappears on the first scroll.

---

## 6. Page 3 — the invitation

Reference: `page3-invitation.jpg`. All text is live HTML/SVG (content in §13).

Give each block its own ScrollTrigger so content reveals as it comes on screen, in this order:

1. The small monogram fades in, scales 0.9→1 and gets a shimmer.
2. The Bismillah reveals **right to left** with a feathered mask wipe, because Arabic reads right to left (1.2 s).
3. The English lines rise in one by one (y 14 px→0, blur 6 px→0, opacity), staggered 0.15 s.
4. The divider draws outward from the diamond.
5. The grandparents' names (italic script) write on with a left-to-right feathered wipe.
6. The "request the honour…" lines fade up, split by line.
7. "Sara" writes on (stroke draw, then fill), and the D/o lines fade up.
8. "With": the side lines extend outward, then the word fades in.
9. "Zahid" writes on, and the S/o lines fade up.
10. The bottom flourish draws from its centre outward.
11. The candles on the staircase ignite in a cascade from the bottom step upward (§10).

---

## 7. Page 4 — Nikah first, then Reception (200svh)

Reference: `page4-events.png`.

**Layout.**
- One continuous `bg.png` covers the whole 200svh section.
- The Nikah card is centred in the first 100svh, and the Reception card in the second 100svh. The guest sees the Nikah card first, and the Reception card arrives as they keep scrolling.
- The card frames are layers. The text inside them is live HTML, positioned using the reference.

**Card entry choreography** (same for both cards; the Reception card triggers when it reaches 65% of the viewport):
1. The frame rises in (y 40 px→0, fading in).
2. "Nikah Ceremony" / "Reception" characters rise in with a SplitText stagger.
3. "IN - SHA - ALLAH" fades in while its letter-spacing tightens from 0.6em to its final value.
4. The divider draws outward.
5. The venue name and address lines fade up, and the "~ At ~" side lines extend outward.
6. The staircase candles ignite in a cascade.

**Scratch to reveal (Nikah card):**
- **What it covers:** the maroon "Scratch to Reveal" banner stays visible as the label. A scratch foil covers the date block below it:
  - `30th November 2026`
  - `Monday, 12.00 pm`
  - `(19 Jumada Al-Thani 1448 Hijri)`
- **Foil:**
  - A `<canvas>` sized to the date block plus padding, DPR-aware.
  - Rose-gold metallic gradient with fine grain noise.
  - A diagonal light sheen sweeps across it every ~3 s until it is first touched.
  - When the card enters, the banner pops in (scale 0.9→1, soft back ease) with a sheen.
- **Scratching:**
  - Pointer events, covering both mouse and touch.
  - `touch-action: none` on the canvas only, so the rest of the page keeps scrolling normally.
  - A soft round brush with about a 26 CSS px radius, with points interpolated so strokes are continuous.
  - Composite with `destination-out`.
- **Completion:**
  - Measure the cleared percentage on a downsampled grid, throttled.
  - At 50% or more:
    - the remaining foil dissolves (fade plus a tiny scale);
    - gold glitter and petals burst from the date;
    - `navigator.vibrate?.(30)` fires;
    - a shimmer sweeps across the date;
    - the banner text crossfades from "Scratch to Reveal" to "Save the Date".
- **Accessibility:** add a visually hidden "Reveal the Nikah date" button that does the same thing.

**Reception date stays hidden until the Nikah date is scratched.** The Reception card repeats the same date, so its date block stays softly blurred (blur 7 px, opacity 0.55) until the Nikah scratch completes. The blurred lines are:
- `Monday,`
- `30th November 2026,`
- `8.00 pm onwards`
- `(19 Jumada Al-Thani 1448 Hijri)`

When the Nikah scratch completes, the block unblurs after 0.6 s with a shimmer sweep. If the guest scratches while the Reception card is offscreen, it is simply already revealed when they get there.

---

## 8. Page 5 — Regards

Reference: `page5-regards.jpg`.

1. "Regards" fades in while its letter-spacing tightens, and its side lines draw outward from the word.
2. "Vataoo Family" writes itself on (stroke draw, then fill, with the sparkle pen tip).
3. A heavier petal shower runs for ~3 s, then returns to normal.
4. The small "@BESPOKEDESIGNS._" credit fades in at the bottom, as in the reference.

---

## 9. Entry animation rules (all pages)

- Each entry timeline plays once when its block enters (about 60–65% of the viewport). Don't scrub text animations; scrubbed text feels jittery.
- **Never leave text hidden.** If the guest scrolls fast and a block starts leaving the viewport before its timeline finishes, jump it to the end. Anything above the fold must be fully visible.
- Easing: `power2/power3.out` for reveals and `sine.inOut` for ambient loops. Use no bouncy easing except the tiny settles mentioned above.

---

## 10. Ambient motion

**Chandeliers (pages 1, 2, 3, 5)**
- Pendulum swing of ±2° around the chain top. Left and right have different periods (5.5 s and 6.3 s, `sine.inOut`) so they're out of phase.
- Lit glow:
  - A warm radial glow (`#FFE7C2`, `mix-blend-mode: screen`) around the crystal body.
  - Opacity breathes between 0.6 and 0.85 over 3–4 s.
  - 6–10 tiny star glints twinkle at random points on the crystals.
- The glow ramps on ("lights up") each time the page first appears.

**Palm fronds (pages 1, 2, 3, 5)**
- Rotate ±1.2° plus skewX ±1° around the frond base, over 6–8 s, left and right out of phase.
- Every 12–15 s a gentle breeze gust makes the fronds sway a little more, and the petals drift sideways for about 2 s.

**Candles (pages 2, 3, 4)**
- **Find the flames.** A sharp script detects each flame position (the small bright warm blobs at the top of each glass) from the bg layer or reference. Write them to `src/data/candles-pageN.json` as x%, y% and size. Verify them with `?debug` and hand-correct any misses.
- **Draw the flames.** Each candle gets a tiny CSS/SVG flame (a teardrop with a white-yellow core and amber edge) plus a soft glow halo.
- **Flicker.** Randomise scaleY, skew and opacity, with independent timing for each candle.
- **Lighting up.** When a page enters, its candles ignite in a cascade from the bottom step upward (30–50 ms stagger), each with a small flare.

**Falling petals (whole site)**
- **Look:**
  - Drawn on the canvas, either as procedural petals (bezier shapes with blush→rose gradients from the palette) or from `assets/petals/*.png` if provided.
  - Varied size and depth: smaller petals fall slower and slightly blurred.
- **Motion:** each petal falls with drift, sway and rotation, plus a 3D flip done with scaleX oscillation.
- **Count:** about 18 on mobile and 35 on desktop.
- **Bursts:** at the door opening, the scratch reveal and the last page.
- **Performance:** cap DPR at 2, and pause when the tab is hidden.

**Sparkles:** a few tiny twinkling stars drifting very subtly, like the reference reel.

Pause each page's loops (chandeliers, palms, candles) while that page is offscreen, using IntersectionObserver.

---

## 11. Music

- Play `assets/audio/rab-rakha.mp3` from 0:00, starting on the key tap. The tap is the user gesture browsers require. Loop it.
- Fade in to about 0.7 volume over 2.5 s using a Web Audio `GainNode`, because iOS ignores `audio.volume`.
- Add a floating round mute/unmute button:
  - rose-gold, bottom-right, aware of the safe area;
  - it appears after the doors open, and its icon morphs between states;
  - remember the choice for the session.
- Pause on `visibilitychange` when hidden, and resume when visible if not muted.
- If `play()` fails, show the button in its muted state. Never block the experience.

---

## 12. Fonts and colours

**FONTS** (fill in if known, otherwise match by eye and tell me what you chose):
- Script (names, "Sara", "Zahid", "Vataoo Family", parents' names): `________`
- Serif (body text, headings): `________`
- Arabic: `________`

If blank, compare these against the references:
- Script: Pinyon Script, Great Vibes, Alex Brush.
- Serif: Cormorant Garamond, EB Garamond.
- Arabic: Amiri.

Self-host the fonts and subset them to the characters used.

**Colours.** Sample them from the references. Approximate values:

| Use | Colour |
|---|---|
| Maroon text | `#8A2C3E` |
| Rose (monogram/names) | `#A8576A` |
| Blush background | `#F7E4DC` |
| Rose-gold | `#D9A5A0` |
| Gold | `#C9A26B` |
| Warm light | `#FFE7C2` |

---

## 13. Content (verbatim; ask me before changing any wording)

**Page 2**
```
[SZ monogram]
Sara | Zahid
```

**Page 3**
```
[small SZ monogram]
بسم الله الرحمن الرحيم
In the name of Allah,
The Most Gracious, The Most Merciful.
—— ◆ ——
Mr. Abdul Rehman Abdal Razak &
Mrs. Rehana Abdul Majeed
request the honour of your presence & blessings at
the Nikah & Reception Ceremony of their granddaughter
Sara
D/o Mr. Mohamed Ibrahim (Sohail) &
Mrs. Samina Mohamed Ibrahim
—— With ——
Zahid
S/o Mr. Ashfaque Ishaque Moulvi &
Mrs. Farzana Ashfaque Moulvi
[flourish]
@BESPOKEDESIGNS._
```

**Page 4, Nikah card**
```
Nikah Ceremony
IN - SHA - ALLAH
—— ◆ ——
[banner] Scratch to Reveal
30th November 2026          ← "th" superscript
Monday, 12.00 pm
(19 Jumada Al-Thani 1448 Hijri)
—— ~ At ~ ——
Minara Masjid
22, Mohamed Ali Road,
Mumbai - 400003
```

**Page 4, Reception card**
```
Reception
IN - SHA - ALLAH
—— ◆ ——
Monday,
30th November 2026,         ← "th" superscript
8.00 pm onwards
(19 Jumada Al-Thani 1448 Hijri)
—— ~ At ~ ——
Cutchi Memon Jamat Khana
131, Kambekar Street,
Mumbai - 400003
```

**Page 5**
```
—— Regards ——
Vataoo Family
@BESPOKEDESIGNS._
```

---

## 14. Performance, accessibility, sharing

**Performance**
- Keep the initial load (pages 1–2 plus the key) at or below about 2.5 MB.
- Lazy-load pages 3–5 as soon as page 2 starts. Use WebP with `srcset`.
- Animate only transform, opacity, clip-path/mask and (sparingly) filter. Set `will-change` only while an element is animating.
- Aim for 60 fps on a mid-range Android phone and an iPhone. Test with Chrome's 4× CPU throttle.

**Reduced motion** (`prefers-reduced-motion`): no petals, sway or parallax; simple fades instead; the doors become a crossfade.

**Accessibility**
- All text is real text, so it is selectable and screen-reader friendly.
- Images have alt text, focus styles are visible, and the key is a real `<button>`.

**Link previews (WhatsApp/Instagram)**
- Title: "Sara & Zahid · Nikah & Reception".
- Description: "You're invited — tap the key to open". **Do not put the date in any meta tag or the page title**, because it would spoil the scratch reveal.
- `og:image` at 1200×630, generated from page 2 (the monogram on blush).
- `theme-color` set to blush, and a favicon made from the monogram.

**Compatibility:** no console errors. It must work in iOS Safari 16+, Android Chrome, and desktop Chrome, Safari and Firefox.

---

## 15. Build stages (check your work after each stage)

1. **Static layout.**
   - Scaffold the project and the asset pipeline (WebP, `pivots.json`, `candles-*.json`).
   - Build the static layout of every page.
   - Screenshot at 390×844 and compare side by side with each reference until they match closely.
2. **Intro:** key → turn → doors → page 2. Capture frames throughout and check there are no pops or jumps.
3. **Page entry animations:** monogram formation and all the text reveals.
4. **Ambient motion:** chandeliers, palms, candles, petals, sparkles and in-page parallax.
5. **Scratch:** the scratch card and the Reception date reveal. Test that scratching works with a finger and that scrolling still works everywhere else.
6. **Music:** playback and the mute button.
7. **Finishing:** desktop layout, reduced motion, a performance pass and meta tags.
8. **Final check.**
   - Run `npm run dev -- --host` and give me the network URL so I can test on my phone.
   - Then run `npm run build`.

After each stage, tell me briefly what you built and what I should look at.

---

## 16. Deploy

When everything is done, explain the deployment to me in plain steps. The easiest option is Netlify Drop: drag the `dist/` folder onto app.netlify.com/drop. Vercel is the alternative.
