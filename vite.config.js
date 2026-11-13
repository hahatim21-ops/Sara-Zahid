import { defineConfig } from 'vite';

// WhatsApp / Instagram need an absolute og:image URL. Build with SITE_URL set, e.g.
//   SITE_URL=https://sara-zahid.netlify.app npm run build
// On Vercel the production domain is provided automatically.
const SITE_URL = (
  process.env.SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
).replace(/\/$/, '');

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  build: {
    target: ['es2020', 'safari16'],
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 800,
  },
  plugins: [
    {
      name: 'absolute-og-image',
      transformIndexHtml(html) {
        if (!SITE_URL) return html;
        return html
          .replace(/content="og\.jpg"/g, `content="${SITE_URL}/og.jpg"`)
          .replace('<meta property="og:type"', `<meta property="og:url" content="${SITE_URL}/" />\n    <meta property="og:type"`);
      },
    },
  ],
});
