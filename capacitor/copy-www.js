// Copy the web app (all data, offline) into ./www for Capacitor.
const fs = require('fs'), path = require('path');
const src = path.resolve(__dirname, '..'), dst = path.join(__dirname, 'www');
fs.rmSync(dst, { recursive: true, force: true });
const files = ['index.html', 'style.css', 'app.js', 'morph.js', 'ads.js', 'ads.json', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png'];
for (const f of files) fs.cpSync(path.join(src, f), path.join(dst, f));
fs.cpSync(path.join(src, 'fonts'), path.join(dst, 'fonts'), { recursive: true });
fs.cpSync(path.join(src, 'data'), path.join(dst, 'data'), { recursive: true, filter: s => !/[\\/]data[\\/](raw|stats\.json)/.test(s) });
console.log('www ready');
