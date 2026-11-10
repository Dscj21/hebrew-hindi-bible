// Hebrew–Hindi interlinear: lazy-loads data/{Book}/{ch}.json.gz, renders words (Hindi gloss / Hebrew / pronunciation),
// word details in a bottom sheet, book & chapter picker, prev/next + swipe, ad slots (ads.js).
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = s => s.replace(/\//g, '');
  const GROUPS = [['व्यवस्था (तोराह)', 5], ['इतिहास', 12], ['काव्य', 5], ['बड़े भविष्यद्वक्ता', 5], ['छोटे भविष्यद्वक्ता', 12]];
  let index = null, data = null, lex = null, sel = null, cur = null;

  // ---- options ----
  for (const [id, cls] of Object.entries({ optPron: 'nopron', optGloss: 'nogloss', optHindi: 'nohindi' })) {
    const el = $('#' + id), key = id + '_v2', saved = localStorage.getItem(key);
    if (saved !== null) el.checked = saved === '1';
    const apply = () => { document.body.classList.toggle(cls, !el.checked); localStorage.setItem(key, el.checked ? '1' : '0'); };
    el.addEventListener('change', apply); apply();
  }

  // ---- data ----
  async function getJSON(u) {
    let r = await fetch(u).catch(() => null);
    if ((!r || !r.ok) && u.endsWith('.gz')) { u = u.slice(0, -3); r = await fetch(u); }
    if (!r || !r.ok) throw new Error(u);
    if (!u.endsWith('.gz')) return r.json();
    const buf = await r.arrayBuffer(), b = new Uint8Array(buf);
    if (b[0] !== 0x1f || b[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(b)); // server already inflated
    const s = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')));
    return JSON.parse(await s.text());
  }
  // Android APK: aapt stores *.json.gz assets inflated as *.json
  const GZ = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ? '' : '.gz';
  let lexP = null;
  const loadLex = () => lexP || (lexP = getJSON('data/lex.json' + GZ).then(l => (lex = l)).catch(() => (lex = {})));

  // ---- routing: #Gen/1 ----
  const route = () => {
    const h = location.hash.slice(1) || localStorage.getItem('last') || 'Gen/1';
    const [b, c] = h.split('/'); return { b, c: +c || 1 };
  };
  const book = id => index.books.find(x => x.id === id);
  function neighbour(d) {
    const i = index.books.findIndex(x => x.id === cur.b); if (i < 0) return null;
    const c = cur.c + d;
    if (c >= 1 && c <= index.books[i].chapters) return `${cur.b}/${c}`;
    const nb = index.books[i + d]; if (!nb) return null;
    return `${nb.id}/${d > 0 ? 1 : nb.chapters}`;
  }
  const go = d => { const n = neighbour(d); if (n) location.hash = n; };

  async function load() {
    index = index || await getJSON('data/index.json');
    cur = route();
    if (!book(cur.b)) cur = { b: 'Gen', c: 1 };
    cur.c = Math.min(Math.max(cur.c, 1), book(cur.b).chapters);
    $('#text').innerHTML = '<p class="loading">लोड हो रहा है…</p>';
    try { data = await getJSON(`data/${cur.b}/${cur.c}.json` + GZ); }
    catch { $('#text').innerHTML = '<p class="loading">यह अध्याय लोड नहीं हो सका। इंटरनेट जाँचें।</p>'; return; }
    localStorage.setItem('last', `${cur.b}/${cur.c}`);
    document.title = `${data.n} ${cur.c} — इब्रानी–हिन्दी बाइबल`;
    $('#title').textContent = `${data.n} ${cur.c} ▾`;
    for (const [a, b, d] of [['#prev', '#prev2', -1], ['#next', '#next2', 1]]) { const ok = !!neighbour(d); $(a).disabled = $(b).disabled = !ok; }
    render(); window.scrollTo(0, 0); Ads.onChapter();
    loadLex().then(fillMissing);
  }

  function render() {
    const every = Ads.everyVerses();
    $('#text').innerHTML = data.v.map(([vn, hi, ws], i) => `
      <article class="verse" id="v${vn}">
        <span class="vn">${vn}</span>
        <div class="heb">${ws.map((w, j) => `<div class="w" data-i="${i}" data-j="${j}" role="button" tabindex="0">
          <span class="g">${esc(w[2])}</span><span class="h${w[5] ? ' mq' : ''}">${esc(strip(w[0]))}</span><span class="p">${esc(w[1])}${w[5] ? '-' : ''}</span></div>`).join('')}
        </div>
        ${hi ? `<p class="hi">${esc(hi)}</p>` : ''}
      </article>${every && (i + 1) % every === 0 && i + 1 < data.v.length ? '<div class="ad-slot ad-inline" data-slot="inline"></div>' : ''}`).join('');
    document.querySelectorAll('.ad-bottom').forEach(el => { el.removeAttribute('data-done'); el.className = 'ad-slot ad-bottom'; el.textContent = ''; });
    Ads.fill();
    if (lex) fillMissing();
  }
  // words without a Hindi gloss yet: show the English Strong's gloss, marked
  function fillMissing() {
    if (!lex || !data) return;
    document.querySelectorAll('.w .g:empty').forEach(el => {
      const w = data.v[el.parentNode.dataset.i][2][el.parentNode.dataset.j];
      const k = (w[3] || '').split('/').filter(x => /^\d/.test(x)).pop(), L = k && lex[k];
      if (L && L[4]) { el.textContent = L[4].split(',')[0]; el.classList.add('en'); }
    });
  }

  // ---- word sheet ----
  function partHTML(p) {
    const L = p.k && lex && lex[p.k];
    if (!p.k) return `<div class="part"><span class="ph">${esc(p.h)}</span><div class="mean">${esc(p.g || '')}</div><div class="role">${esc(p.m)}</div></div>`;
    if (!L) return `<div class="part"><span class="ph">${esc(p.h)}</span><div class="role">${esc(p.m)}</div></div>`;
    const s = 'H' + L[0];
    return `<div class="part"><span class="ph">${esc(p.h)}</span>
      <div class="mean"><b>${esc(L[3] || '—')}</b></div><div class="role">${esc(p.m)}</div>
      <dl><dt>मूल शब्द</dt><dd><span class="lh">${esc(L[1])}</span> — ${esc(L[2])}</dd>
      <dt>स्ट्रॉन्ग</dt><dd><a href="https://www.blueletterbible.org/lexicon/${s.toLowerCase()}/kjv/wlc/0-1/" target="_blank" rel="noopener">${s}</a></dd>
      <dt>English</dt><dd class="en">${esc(L[4])}</dd></dl></div>`;
  }
  async function open(el) {
    await loadLex();
    const v = data.v[+el.dataset.i], w = v[2][+el.dataset.j];
    sel && sel.classList.remove('sel'); sel = el; el.classList.add('sel');
    $('#sheetBody').innerHTML = `<div class="sh"><div class="h">${esc(strip(w[0]))}</div><div class="p">${esc(w[1])}</div>
      <div class="g">${esc(w[2] || '')}</div><div class="role">${esc(data.n)} ${data.c}:${v[0]}</div></div>
      ${Morph.parts(w).map(partHTML).join('')}`;
    $('#sheet').hidden = $('#shade').hidden = false; $('#sheet').scrollTop = 0;
  }
  function close() { $('#sheet').hidden = $('#shade').hidden = true; sel && sel.classList.remove('sel'); sel = null; }
  $('#text').addEventListener('click', e => { const w = e.target.closest('.w'); if (w) open(w); });
  $('#text').addEventListener('keydown', e => { const w = e.target.closest('.w'); if (w && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(w); } });
  $('#shade').onclick = close; $('#close').onclick = close;

  // ---- picker ----
  function showBooks() {
    $('#ptitle').textContent = 'पुस्तकें'; $('#pback').style.visibility = 'hidden';
    let i = 0;
    $('#pbody').innerHTML = GROUPS.map(([g, n]) => `<h3>${g}</h3><div class="books">${index.books.slice(i, i += n)
      .map(b => `<button data-b="${b.id}" class="${b.id === cur.b ? 'cur' : ''}">${esc(b.name)}</button>`).join('')}</div>`).join('');
  }
  function showChapters(id) {
    const b = book(id);
    $('#ptitle').textContent = b.name; $('#pback').style.visibility = 'visible';
    $('#pbody').innerHTML = `<div class="chs">${Array.from({ length: b.chapters }, (_, k) =>
      `<button data-go="${id}/${k + 1}" class="${id === cur.b && k + 1 === cur.c ? 'cur' : ''}">${k + 1}</button>`).join('')}</div>`;
  }
  const openPicker = () => { showChapters(cur.b); $('#picker').hidden = false; };
  $('#title').onclick = openPicker;
  $('#pclose').onclick = () => { $('#picker').hidden = true; };
  $('#pback').onclick = showBooks;
  $('#pbody').addEventListener('click', e => {
    const b = e.target.closest('[data-b]'), g = e.target.closest('[data-go]');
    if (b) showChapters(b.dataset.b);
    if (g) { $('#picker').hidden = true; location.hash = g.dataset.go; }
  });

  // ---- navigation ----
  $('#prev').onclick = $('#prev2').onclick = () => go(-1);
  $('#next').onclick = $('#next2').onclick = () => go(1);
  let tx = 0, ty = 0;
  $('#text').addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  $('#text').addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 80 && Math.abs(dx) > 2 * Math.abs(dy)) go(dx < 0 ? 1 : -1);
  }, { passive: true });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { close(); $('#picker').hidden = true; }
    if (!$('#sheet').hidden || !$('#picker').hidden || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1);
  });

  window.addEventListener('hashchange', () => { close(); load(); });
  Ads.init().finally(load);
  if ('serviceWorker' in navigator && !window.Capacitor) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
