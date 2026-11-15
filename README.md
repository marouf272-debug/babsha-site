# Babsha website

Scroll journey around the Babsha board: Vite, Three.js, no framework. Board, landmarks, tokens and dice come from the game's own scene code (copied into `src/models`, data in `src/data`).

```bash
npm install
npm run dev      # http://127.0.0.1:5190
npm run build    # outputs dist/
```

- Play link: the `data-play` anchors in `index.html`.
- Stops and dice: `STOP_POS` in `src/main.ts`. Each stop's dice total equals the tile gap, so pips always match the hops.
- Logo marks: `public/logo`. The wordmark is live text in Bricolage Grotesque ExtraBold, not yet outlined.
- Deploy: `.github/workflows/pages.yml` publishes `dist` to GitHub Pages once this folder is its own repo with Pages set to "GitHub Actions". Nothing has been pushed.
