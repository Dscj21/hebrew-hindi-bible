// node scripts/screenshot.js [baseUrl]  -> screenshots/*.png at 390x844 (uses playwright-core + cached chromium)
const path = require('path');
let pw; try { pw = require('playwright-core'); } catch { pw = require('/node_modules/playwright-core'); }
const base = process.argv[2] || 'http://127.0.0.1:8417/';
const out = path.join(__dirname, '..', 'screenshots');
(async () => {
  const b = await pw.chromium.launch({ executablePath: process.env.CHROME || require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-linux64/chrome-headless-shell' });
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto(base + '#Gen/1', { waitUntil: 'networkidle' });
  await p.waitForSelector('.w'); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: path.join(out, 'gen1-verses-390x844.png') });
  await p.locator('.w').nth(0).click(); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(out, 'gen1-popup-bereshit-390x844.png') });
  await p.locator('#close').click();
  await p.locator('#v2 .w').nth(0).click(); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(out, 'gen1-popup-vehaarets-390x844.png') });
  await p.locator('#close').click();
  await p.check('#optGloss'); await p.locator('#v26').scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(out, 'gen1-v26-with-gloss-390x844.png') });
  const n = await p.locator('.verse').count(), wn = await p.locator('.w').count();
  console.log(JSON.stringify({ verses: n, words: wn, title: await p.textContent('#title'), errors: errs }));
  await b.close();
})();
