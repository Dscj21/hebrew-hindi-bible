# Hebrew Greek Hindi Bible (हिब्रू ग्रीक हिंदी बाइबल) — Hebrew OT + Greek NT interlinear with Hindi

Live: https://dscj21.github.io/hebrew-hindi-bible/

Every Hebrew word shows: Hindi meaning (top) · Hebrew with niqqud · Devanagari pronunciation; tap a word for lemma, Strong's, Hindi grammar and English gloss. IRV Hindi verse under each verse. All 39 OT books / 929 chapters; static, no build step for the app.

## Layout
- `index.html`, `style.css`, `app.js` (render, picker, nav, swipe), `morph.js` (morphology → Hindi), `ads.js` + `ads.json` (single ad config), `sw.js` (offline cache)
- `data/index.json` – books; `data/<Book>/<ch>.json.gz` – chapters; `data/lex.json.gz` – lexicon
  - word = `[hebrew(with / morpheme breaks), pron, hindiGloss, lemma, morph, maqaf?]`
- `scripts/` – `fetch_sources.sh`, `build.py`, `translit.py` (Hebrew→Devanagari), `gloss.py` (auto-composed in-context glosses), `lex/*.txt` (hand Hindi lemma glosses), overrides JSON
- `capacitor/` – Android app (Capacitor 8 + @capacitor-community/admob). `capacitor/build-apk.sh` → `dist/*.apk`
- `deploy-gh-pages.sh` – commit + push to GitHub Pages (`--build` to rebuild data first)

## Ads
Edit `ads.json` only: web AdSense client/slot IDs; Android AdMob app/banner/interstitial IDs (currently Google TEST IDs; also update `admob_app_id` in `capacitor/android/app/src/main/res/values/strings.xml`). `?adsdemo=1` shows placeholder slots.

## Sources & licenses
- Hebrew: OSHB / morphhb (WLC text public domain; lemma & morphology CC BY 4.0)
- Strong's Hebrew Dictionary (public domain) via openscriptures/HebrewLexicon
- Hindi: Indian Revised Version (IRV) Hindi 2019, © Bridge Connectivity Solutions, CC BY-SA 4.0 (eBible.org hin2017)
- Added pronunciations, Hindi glosses and grammar notes: CC BY-SA 4.0
- Fonts: Noto Serif Hebrew, Noto Sans Devanagari (SIL OFL)
