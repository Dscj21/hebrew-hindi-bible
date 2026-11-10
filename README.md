# इब्रानी–हिन्दी अन्तर्रेखीय बाइबल (Hebrew–Hindi interlinear) — demo: उत्पत्ति 1

Static app, no build step: `index.html` + `style.css` + `app.js` (+ `sw.js` for offline cache) reading `data/{Book}/{chapter}.json`.
Open `index.html#Gen/1` via any static server (e.g. `python3 -m http.server`).

## Generate data
    scripts/fetch_sources.sh Gen          # downloads OSHB Gen.xml, Strong's, IRV Hindi USFM into data/raw/ (not deployed)
    python3 scripts/build.py Gen 1        # -> data/Gen/1.json + data/index.json   (also: Gen 1 2 3 / Gen all)

Hand-made inputs (edit these when adding chapters; build prints `MISSING Hindi gloss` for new lemmas):
- `scripts/translit.py` — rule-based pointed Hebrew → Devanagari (shva na/nach, dagesh forte/lene, begadkefat, maters, furtive patach, shin/sin, finals, maqaf).
- `scripts/pron_overrides.json` — reviewed per-word pronunciation fixes; `scripts/lemma_pron_overrides.json` for dictionary forms.
- `scripts/lexicon_hi.json` — Hindi gloss per OSHB lemma id (e.g. `"1254 a"`), IRV vocabulary.
- `scripts/word_glosses_hi.json` — contextual Hindi gloss per word form (or `ch:v:index`).
- `scripts/screenshot.js` — mobile (390×844) screenshots via playwright-core.

## Deploy
Upload everything except `data/raw/`, `scripts/`, `screenshots/` to any static host (GitHub Pages, Cloudflare Pages, Netlify).

## Licenses
- Hebrew: OSHB morphhb (WLC text public domain; morphology/lemmas CC BY 4.0).
- Strong's Hebrew Dictionary: public domain (openscriptures/HebrewLexicon).
- Hindi: Indian Revised Version (IRV) Hindi 2019, © Bridge Connectivity Solutions, CC BY-SA 4.0 (ebible.org hin2017). Footnotes/cross-refs removed.
- Added Devanagari pronunciation, Hindi glosses and morphology labels: CC BY-SA 4.0. Fonts: Noto (SIL OFL).
