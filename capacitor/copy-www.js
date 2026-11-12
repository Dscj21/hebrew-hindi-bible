// Copy the web app (all data, offline) into ./www for Capacitor.
const fs = require('fs'), path = require('path');
const src = path.resolve(__dirname, '..'), dst = path.join(__dirname, 'www');
fs.rmSync(dst, { recursive: true, force: true });
const files = ['index.html', 'style.css', 'app.js', 'morph.js', 'ads.js', 'ads.json', 'app.json', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'favicon.ico', 'favicon-32.png', 'logo-256.png'];
for (const f of files) fs.cpSync(path.join(src, f), path.join(dst, f));
fs.cpSync(path.join(src, 'locales'), path.join(dst, 'locales'), { recursive: true });
fs.cpSync(path.join(src, 'fonts'), path.join(dst, 'fonts'), { recursive: true });
fs.cpSync(path.join(src, 'data'), path.join(dst, 'data'), { recursive: true, filter: s => !/[\\/]data[\\/](raw|stats\.json)/.test(s) });
// Debug APK: override ads.json with Google's TEST ad units (debug assets win over main assets when merged).
const ads = JSON.parse(fs.readFileSync(path.join(src, 'ads.json'), 'utf8'));
if (ads.androidDebug) {
  const dbg = path.join(__dirname, 'android/app/src/debug/assets/public');
  fs.mkdirSync(dbg, { recursive: true });
  fs.writeFileSync(path.join(dbg, 'ads.json'), JSON.stringify({ ...ads, android: ads.androidDebug }, null, 2));
}
console.log('www ready');
