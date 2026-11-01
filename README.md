# Scent Atlas

A beginner-friendly perfume explorer. Search ~36,700 perfumes and see each one explained in plain words:

- **Living note pyramid (3D):** top, heart and base notes float as orbs. Each note family moves the way it smells: citrus fizzes, florals swirl like petals, woods drift as slow slivers, resins glow and sink, musks diffuse like haze, smoke curls upward.
- **Time on skin:** scrub (or "Play the day") from spray to 12 hours. Top notes evaporate and drift away, the heart blooms, the base lingers. A live readout says what you'd smell right now.
- **Weather & skin:** a temperature slider changes evaporation speed and projection (the ring around the bottle), and a dry/normal/oily toggle changes how long it lasts.
- **Plain-English summary**, main-accord bars, heat/cold/skin advice, seasons, "good to know" facts, and similar perfumes.
- **Per-perfume theme:** each perfume page is tinted with its own accord colours, with text contrast checked automatically.
- **Real photography:** bottle photos become 3D models in the browser (background removed, silhouette extruded into a glass-edged solid, photo mapped on the faces), and the page palette is sampled from the bottle itself. Notes show photos of the actual ingredient as floating medallions.
- **Find your scent:** a 3-question quiz that produces a scent profile, notes to look for, an "average match" and recommendations from the 4,000 most-loved perfumes.
- Note pages ("everything with almond"), a Perfume 101 primer, and an "almond notes" collection.

## Run it

```bash
npm install
npm run dev
```

## Data

The site reads static JSON from `public/data/` (already built). To rebuild from source:

```bash
npm run data:fetch   # downloads the raw CSVs into data-raw/
npm run data:build   # merges, cleans, computes similar perfumes, writes public/data/
```

Images are already in `public/images/` (validated and re-encoded). To re-import them from the
open image sets (clone the repos listed in DATA.md first):

```bash
python3 -I scripts/import_images.py notes   <fragrance-notes repo>
python3 -I scripts/import_images.py bottles <perfume-images repo> <profumi repo>/public/images
```

Optional extra photos from Wikimedia Commons (needs network access to it):

```bash
npm run images:notes
```

Perfumes without a bottle photo get a modelled 3D bottle; notes without a photo get a drawn illustration.

See [DATA.md](DATA.md) for sources, caveats and licensing.

## Deploy on Vercel

The repo is ready to import as-is: Vercel → **Add New → Project** → pick this repo → **Deploy**.
`vercel.json` sets everything, so no settings need changing:

- Build: `npm ci` then `npm run build`, output `dist/` (Vite preset, Node 22 from `.nvmrc`).
- Caching: hashed JS/CSS in `/assets` is cached for a year (`immutable`); perfume data in `/data`
  is cached at the edge for a day and served stale while it refreshes; images for a week.
  Vercel compresses the JSON automatically (the 4.3 MB search index ships as ~1.4 MB).
- Security headers: a strict Content-Security-Policy (only this site plus Google Fonts),
  HSTS, `nosniff`, a referrer policy and a permissions policy.
- Routing is hash-based (`#perfume-123`), so no rewrites are needed.

Updating the data: run `npm run data:fetch && npm run data:build` locally, commit `public/data/`,
and push; Vercel redeploys on every push to `main`.

## Stack

Vite + React + TypeScript, Three.js via @react-three/fiber and drei, and framer-motion. Builds to plain static files (`npm run build` → `dist/`), deployable anywhere.

## Code map

- `scripts/fetch-data.sh`: downloads the raw datasets, pinned to commits and SHA-256 checked
- `scripts/build_data.py`: data pipeline (merge 7 sources, de-duplicate, sanitise, shard, similarity)
- `scripts/import_images.py`: validates, cleans and re-encodes note and bottle images
- `src/lib/families.ts`: note → family (colour, motion, plain description)
- `src/lib/behavior.ts`: longevity, projection, time/heat/skin model, advice copy
- `src/lib/theme.ts`: per-perfume colour theme with contrast checks
- `src/three/ScentCloud.tsx`: the 3D note pyramid; `HeroScene.tsx`: landing animation; `Bottle.tsx`: procedural bottle
- `src/pages/`: Home, PerfumePage, NotePage
