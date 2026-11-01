# Data sources & caveats

Snapshot built 31 Oct 2026: **118,509 perfumes** from 4,600+ houses, released from the 1700s to **2026**
(2,173 from 2025 and 693 from 2026), with 4,325 distinct notes and 97 accords.

## Perfume data

| File (data-raw/) | Source | What it adds | Rows | Newest |
|---|---|---|---|---|
| `fragrantica_recent.csv` | [aStyxxx/dataset_Fragrantica_perfumes](https://github.com/aStyxxx/dataset_Fragrantica_perfumes) `perfumes_actual.csv` | Most detailed and most recent: weighted notes and accords, longevity and sillage averages, vote counts, ratings | 33,113 | 2026 |
| `fragrantica_2024.csv` | [leev75/Fragrance-Analytics-Dashboard-](https://github.com/leev75/Fragrance-Analytics-Dashboard-) `fra_perfumes.csv` (mirror of the Kaggle "Fragrantica.com Fragrance Dataset") | Breadth: accords, notes, ratings | 70,103 | 2024 |
| `parfumo_2024.csv` | [rfordatascience/tidytuesday](https://github.com/rfordatascience/tidytuesday/tree/main/data/2024/2024-12-10), 10 Dec 2024 | Perfumes the Fragrantica sets lack (niche, indie, older) | 59,325 | 2024 |
| `perfume_database.csv` | [ThatCoryGirl/Project4-Perfume](https://github.com/ThatCoryGirl/Project4-Perfume) | Original base set | ~38k | ~2017 |
| `perfume_data_combined.csv` | [sir-omoreno/perfume_designer_app](https://github.com/sir-omoreno/perfume_designer_app) | Labelled longevity/sillage votes, accord strengths | ~480 | ~2020 |
| `scento_perfumes.csv`, `scento_materials.csv` | [Scento-com/perfume-dataset](https://github.com/Scento-com/perfume-dataset) (**CC BY 4.0**) | Plain-language perfume descriptions; smell descriptions for 667 notes | 1,479 + 420 | 2026 |
| `scripts/curated.json` | hand-added | Perfumes from the reference image missing elsewhere | 4 | |

**How they're merged** (`scripts/build_data.py`): perfumes are matched on house + name (tolerant of
accents that some sources lost, punctuation, "&", and house suffixes like "Parfums"), and on the
Fragrantica perfume id where two sources share it. Later, richer sources override earlier ones; the
2026 set wins on notes, accords, votes and spelling. Parfumo only adds perfumes no Fragrantica set has.
Houses get one display spelling (the one with accents, used by their most popular perfumes).

**Considered but not used:**
- FragDB (142k, refreshed Oct 2026): only a 10-row free sample is public; the full data is a paid commercial licence.
- Kaggle "ledecanteur/fragrantica-perfumes" (140k, updated ~Sep 2026): Kaggle is not reachable from the build environment. The aStyxxx set appears to be a subset of it.
- Fragella, Fragplace, Noteboxd and ScentRev APIs: paid or key-gated. Fragella is the best candidate for a licensed launch.
- Arab perfume pyramids ([AminYoub/perfume-arabe-datos](https://github.com/AminYoub/perfume-arabe-datos), CC BY 4.0, 152 perfumes): notes are in Spanish, and the perfumes are already covered.

### Licensing

The Fragrantica and Parfumo sets were scraped from those sites by their authors and carry no licence
(the Kaggle originals are CC BY-NC-SA). They're fine for a private prototype. **Before a public or
commercial launch, replace them with licensed data** such as the Fragella API, FragDB's commercial
licence, or brand/retailer feeds. Scento data is CC BY 4.0 and is credited wherever it's shown.

## Images

| Folder | Source | Licence | Count |
|---|---|---|---|
| `public/images/notes/` | [asifnawaz/fragrance-notes](https://github.com/asifnawaz/fragrance-notes) | MIT (the repo doesn't say how the images were made; they look AI-generated) | 214 images covering the 403 notes used by 20+ perfumes (rarer notes keep a drawn illustration) |
| `public/images/bottles/` | [Doesntwork123/perfume-images](https://github.com/Doesntwork123/perfume-images), [mich-de/profumi](https://github.com/mich-de/profumi) | **None**: product photos of brand packaging. Private preview only. | 215 perfumes |

Bottle photos become 3D models in the browser: the transparent cut-out is traced into a silhouette,
extruded with bevelled glass edges, and the photo is mapped onto it (`src/three/PhotoBottle.tsx`).
The bottle's colours also drive the page palette. Perfumes without a photo get a modelled bottle.

Every Fragrantica-based perfume stores its Fragrantica id (`fid`), so a licensed bottle-image feed keyed
on that id (or on brand + name) can be dropped in with `scripts/fetch_images.py bottles --csv`.

## Security checks

All downloaded data and images are treated as untrusted:

- **Pinned downloads:** `scripts/fetch-data.sh` pins every dataset to an exact upstream commit and checks its SHA-256. A changed file is rejected.
- **Nothing executed:** nothing from these repositories is ever run. Data is read only with Python's csv/json parsers (plus `ast.literal_eval` for list literals, which can't call code), and Python runs with `-I`.
- **Text cleaned:**
  - control and bidi characters, HTML tags and `javascript:`/event-handler patterns are removed
  - spreadsheet-formula prefixes (`=`, `@`) are stripped
  - lengths are capped, numbers are range-checked, and years are limited to 1700–2026
  - only https links to expected hosts are kept
  - in the current build only 6 rows were dropped (missing name or brand) and 2 numbers were out of range; no dangerous patterns were found
- **Images re-encoded:**
  - each file needs an allowed extension *and* matching magic bytes, a size cap, and a pixel budget (decompression-bomb guard)
  - it is fully decoded and re-saved as a new WebP, which drops metadata and anything hidden in the file
  - SVG, TIFF and GIF are refused; SVG can carry script, and 12 SVGs were refused
  - 4 files whose contents didn't match their extension were refused
  - links are never followed, `.git` folders are skipped, and output names are generated, never taken from source file names
- **Rendered as text:** in the app, all data is rendered as text by React (no `innerHTML`), so even unexpected text can't run as code.

## Model caveats

- Longevity/sillage in the 2026 set are published as averages. The build turns them into a two-bucket vote histogram with the same mean, which is what the behaviour model uses.
- The oldest dataset's longevity/sillage votes are unlabelled and inconsistent, so they're blended with an estimate. The UI says when a value is estimated.
- Heat, cold, skin and season guidance is modelled from note families and accords using common perfumery rules of thumb. It is not lab-measured.
- Accord bars from sources that only give accord order use rank-based widths (the UI notes this).
