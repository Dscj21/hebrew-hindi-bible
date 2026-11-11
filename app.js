// इब्रानी–हिन्दी बाइबल — app shell: tabs (होम/पढ़ें/खोजें/सहेजे/सेटिंग्स), interlinear reader, bottom sheets,
// gestures (swipe chapters, pull-down picker, long-press verse, pinch font size, double-tap Strong's, swipe-down sheets),
// Strong's dialog + concordance, Hindi search, favourites/bookmarks/history, verse share-card images. No libraries.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = s => String(s || '').replace(/\//g, '');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const fmt = n => Number(n).toLocaleString('en-IN');
  const SITE = 'https://dscj21.github.io/hebrew-hindi-bible/';
  const APP = 'इब्रानी–हिन्दी बाइबल';
  const CAP = window.Capacitor, NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  const PLUG = n => NATIVE && CAP.Plugins && CAP.Plugins[n];
  const GZ = NATIVE ? '' : '.gz'; // Android: aapt stores *.json.gz assets inflated as *.json
  const GROUPS = [['व्यवस्था (तोराह)', 5], ['इतिहास', 12], ['काव्य', 5], ['बड़े भविष्यद्वक्ता', 5], ['छोटे भविष्यद्वक्ता', 12]];
  const TABS = ['home', 'read', 'search', 'saved', 'settings'];
  const VOTD = ['Gen/1/1', 'Deut/6/4', 'Josh/1/9', 'Ps/23/1', 'Ps/27/1', 'Ps/46/2', 'Ps/91/1', 'Ps/119/105', 'Prov/3/5', 'Isa/40/31',
    'Isa/41/10', 'Isa/53/5', 'Jer/29/11', 'Lam/3/22', 'Mic/6/8', 'Num/6/24', 'Gen/12/2', 'Exod/14/14', 'Ps/34/9', 'Ps/37/4',
    'Ps/103/2', 'Ps/139/14', 'Prov/18/10', 'Isa/26/3', 'Isa/43/2', 'Zeph/3/17', 'Hab/3/19', 'Ps/1/1', 'Jer/33/3', 'Isa/9/6'];

  // ---------- storage & settings ----------
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('hhb.' + k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('hhb.' + k, JSON.stringify(v)); } catch {} }
  };
  const DEF = { theme: 'auto', fs: 1, chip: true, gloss: true, pron: true, dots: true, split: true, sn: true, root: true, hindi: true, haptic: true };
  let set = Object.assign({}, DEF, store.get('set', {}));
  const mq = matchMedia('(prefers-color-scheme: dark)');
  function applySet() {
    const t = set.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : set.theme;
    document.documentElement.dataset.theme = t;
    const meta = $('meta[name=theme-color]'); if (meta) meta.content = { dark: '#111a2e', sepia: '#6b4423' }[t] || '#1f4fa3';
    document.documentElement.style.setProperty('--fs', set.fs);
    const b = document.body.classList;
    for (const k of ['chip', 'gloss', 'pron', 'sn', 'root', 'hindi']) b.toggle('hide-' + k, !set[k]);
    b.toggle('nosplit', !set.split);
  }
  const saveSet = () => { store.set('set', set); applySet(); };
  mq.addEventListener && mq.addEventListener('change', applySet);
  applySet();

  // ---------- feedback ----------
  function buzz(strong) {
    if (!set.haptic) return;
    const H = PLUG('Haptics');
    if (H) H.impact({ style: strong ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
    else if (navigator.vibrate) try { navigator.vibrate(strong ? 18 : 8); } catch {}
  }
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('in');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('in'), 1900);
  }

  // ---------- data ----------
  async function getJSON(u) {
    let r = await fetch(u).catch(() => null);
    if ((!r || !r.ok) && u.endsWith('.gz')) { u = u.slice(0, -3); r = await fetch(u).catch(() => null); }
    if (!r || !r.ok) throw new Error(u);
    if (!u.endsWith('.gz')) return r.json();
    const buf = await r.arrayBuffer(), b = new Uint8Array(buf);
    if (b[0] !== 0x1f || b[1] !== 0x8b) return JSON.parse(new TextDecoder().decode(b));
    const s = new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip')));
    return JSON.parse(await s.text());
  }
  const once = f => { let p = null; return () => p || (p = f().catch(e => { p = null; throw e; })); };
  let index = null, lex = {}, strongs = null, conc = null, irv = null, numKey = null;
  const loadIndex = once(() => getJSON('data/index.json').then(x => (index = x)));
  const loadLex = once(() => getJSON('data/lex.json' + GZ).then(x => (lex = x)).catch(() => (lex = {})));
  const loadStrongs = once(() => getJSON('data/strongs.json' + GZ).then(x => (strongs = x)));
  const loadConc = once(() => getJSON('data/conc.json' + GZ).then(x => (conc = x)));
  const loadIrv = once(() => getJSON('data/irv.json' + GZ).then(x => (irv = x)));
  const chCache = new Map();
  function getChapter(b, c) {
    const k = b + '/' + c;
    if (!chCache.has(k)) chCache.set(k, getJSON(`data/${b}/${c}.json` + GZ).catch(e => { chCache.delete(k); throw e; }));
    if (chCache.size > 12) chCache.delete(chCache.keys().next().value);
    return chCache.get(k);
  }
  const book = id => index && index.books.find(x => x.id === id);
  const bname = id => (book(id) || {}).name || id;
  const keyOfNum = n => {
    if (!numKey) { numKey = {}; for (const k in lex) if (!(lex[k][0] in numKey)) numKey[lex[k][0]] = k; }
    return numKey[n];
  };
  const mainLemma = w => (w[3] || '').split('/').filter(x => /^\d/.test(x)).pop();
  const hebOf = ws => ws.map(w => strip(w[0]) + (w[5] ? '־' : ' ')).join('').trim();

  // ---------- sheets (stack, swipe-down to close, Android back closes) ----------
  const stack = []; let popWaiters = 0, popResolve = null;
  function sheet(html, { foot = '', cls = '', onClose = null } = {}) {
    const sh = document.createElement('div'), el = document.createElement('section');
    sh.className = 'shade'; el.className = 'sheet ' + cls; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="grip" aria-label="नीचे खींचकर बंद करें"></div><div class="sbody">${html}</div>${foot ? `<div class="foot">${foot}</div>` : ''}`;
    sh.style.zIndex = 50 + stack.length * 2; el.style.zIndex = 51 + stack.length * 2;
    $('#layers').append(sh, el);
    requestAnimationFrame(() => requestAnimationFrame(() => { sh.classList.add('in'); el.classList.add('in'); }));
    sh.addEventListener('click', () => closeTop());
    dragDismiss(el, sh);
    stack.push({ el, sh, onClose });
    history.pushState({ sheet: stack.length }, '');
    return el;
  }
  function closeTop(viaPop) {
    const o = stack.pop(); if (!o) return;
    o.el.style.transform = 'translateY(105%)'; o.el.classList.remove('drag'); o.sh.classList.remove('in');
    setTimeout(() => { o.el.remove(); o.sh.remove(); }, 320);
    o.onClose && o.onClose();
    if (!viaPop) { popWaiters++; history.back(); }
  }
  function closeAll() {
    const n = stack.length; if (!n) return Promise.resolve();
    while (stack.length) {
      const o = stack.pop(); o.el.style.transform = 'translateY(105%)'; o.sh.classList.remove('in');
      setTimeout(() => { o.el.remove(); o.sh.remove(); }, 320); o.onClose && o.onClose();
    }
    popWaiters++;
    return new Promise(r => { popResolve = r; history.go(-n); setTimeout(() => { if (popResolve === r) { popResolve = null; r(); } }, 400); });
  }
  window.addEventListener('popstate', () => {
    if (popWaiters) { popWaiters--; if (popResolve) { const r = popResolve; popResolve = null; r(); } return; }
    if (stack.length) closeTop(true);
  });
  function dragDismiss(el, sh) {
    const body = $('.sbody', el);
    let y0 = null, x0 = 0, t0 = 0, dy = 0, active = false, grip = false;
    el.addEventListener('touchstart', e => {
      grip = !!e.target.closest('.grip');
      if (e.touches.length > 1 || (!grip && body.scrollTop > 0) || e.target.closest('input,textarea,.seg,.chips')) { y0 = null; return; }
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; t0 = Date.now(); dy = 0; active = false;
    }, { passive: true });
    el.addEventListener('touchmove', e => {
      if (y0 === null) return;
      dy = e.touches[0].clientY - y0; const dx = e.touches[0].clientX - x0;
      if (!active) {
        if (dy > 8 && dy > Math.abs(dx)) { active = true; el.classList.add('drag'); }
        else if (Math.abs(dy) > 8 || Math.abs(dx) > 8) { if (!grip) { y0 = null; return; } }
        else return;
      }
      if (e.cancelable) e.preventDefault();
      const d = Math.max(0, dy);
      el.style.transform = `translateY(${d}px)`; sh.style.opacity = String(Math.max(0.15, 1 - d / 500));
    }, { passive: false });
    const end = () => {
      if (y0 === null) return; y0 = null;
      if (!active) return; active = false; el.classList.remove('drag'); sh.style.opacity = '';
      const v = dy / Math.max(1, Date.now() - t0);
      if (dy > 110 || v > 0.6) { buzz(); closeTop(); } else el.style.transform = '';
    };
    el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
  }
  const listItem = (icon, label, act) => `<button class="li" data-act="${act}"><svg><use href="#i-${icon}"/></svg><span>${label}</span></button>`;

  // ---------- routing ----------
  let view = null, cur = null, curV = 1, pendingDir = 0, highlightV = 0;
  function parseHash() {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h || h === 'home') return { tab: 'home' };
    if (TABS.includes(h)) return { tab: h };
    const [b, c, v] = h.split('/');
    return { tab: 'read', b, c: +c || 1, v: +v || 0 };
  }
  const lastRef = () => store.get('last', 'Gen/1/1');
  async function route() {
    await loadIndex();
    const r = parseHash();
    if (r.tab === 'read' && !book(r.b)) { location.replace('#' + lastRef()); return; }
    showView(r.tab);
    if (r.tab === 'read') {
      const bk = book(r.b), c = Math.min(Math.max(r.c, 1), bk.chapters);
      if (cur && cur.b === r.b && cur.c === c) { if (r.v) scrollToVerse(r.v, true); }
      else await loadChapter(r.b, c, r.v);
    } else if (r.tab === 'home') renderHome();
    else if (r.tab === 'saved') renderSaved();
    else if (r.tab === 'settings') renderSettings();
    else if (r.tab === 'search') { const q = $('#q'); if (q.value) doSearch(); else renderSearchEmpty(); }
  }
  function showView(tab) {
    if (view !== tab) {
      for (const t of TABS) $('#v-' + t).hidden = t !== tab;
      $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      view = tab; if (tab !== 'read') window.scrollTo(0, 0);
    }
    $('#fab').hidden = tab !== 'read';
    $('#title').classList.toggle('plain', tab !== 'read');
    if (tab !== 'read') $('#titleTxt').textContent = { home: APP, search: 'खोजें', saved: 'सहेजे गए', settings: 'सेटिंग्स' }[tab];
    else if (cur) setTitle();
  }
  const setTitle = () => { $('#titleTxt').textContent = `${cur.data.n} ${cur.c}:${curV}`; };
  function neighbour(d, b = cur && cur.b, c = cur && cur.c) {
    if (!index || !b) return null;
    const i = index.books.findIndex(x => x.id === b); if (i < 0) return null;
    const n = c + d;
    if (n >= 1 && n <= index.books[i].chapters) return `${b}/${n}`;
    const nb = index.books[i + d]; if (!nb) return null;
    return `${nb.id}/${d > 0 ? 1 : nb.chapters}`;
  }
  function go(d) { const n = neighbour(d); if (n) { pendingDir = d; location.hash = n; } }

  // ---------- reader ----------
  async function loadChapter(b, c, v) {
    const pg = $('#page'), dir = pendingDir; pendingDir = 0;
    const dataP = Promise.all([getChapter(b, c), loadLex()]);
    if (dir) {
      pg.style.transition = 'transform .2s ease-in, opacity .2s ease-in';
      pg.style.transform = `translateX(${dir > 0 ? -100 : 100}%)`; pg.style.opacity = '.2';
      await sleep(190);
    } else if (!cur) pg.innerHTML = '<p class="loading">लोड हो रहा है…</p>';
    let data;
    try { [data] = await dataP; }
    catch { pg.style.transform = pg.style.opacity = ''; pg.innerHTML = '<p class="loading">यह अध्याय लोड नहीं हो सका। इंटरनेट जाँचें और फिर कोशिश करें।</p>'; return; }
    cur = { b, c, data }; curV = v || 1;
    render();
    document.title = `${data.n} ${c} — ${APP}`;
    if (v) scrollToVerse(v, !dir); else window.scrollTo(0, 0);
    if (dir) {
      pg.style.transition = 'none'; pg.style.transform = `translateX(${dir > 0 ? 60 : -60}%)`; pg.style.opacity = '.2';
      void pg.offsetWidth;
      pg.style.transition = 'transform .32s cubic-bezier(.2,.8,.2,1), opacity .25s';
      pg.style.transform = ''; pg.style.opacity = '';
    }
    setTitle(); saveLast(); addHistory();
    Ads.onChapter();
    for (const d of [1, -1]) { const n = neighbour(d); if (n) { const [nb, nc] = n.split('/'); setTimeout(() => getChapter(nb, +nc).catch(() => {}), 600); } }
  }
  function partsOf(w) {
    const tp = w[0].split('/'), mc = (w[4] || '').slice(1).split('/'), lp = (w[3] || '').split('/');
    if (tp.length !== mc.length) return esc(strip(w[0]));
    let li = 0, seenMain = false;
    return tp.map((t, k) => {
      if (mc[k][0] === 'S') return `<span class="suf">${esc(t)}</span>`;
      const l = lp[li++] || '';
      if (/^\d/.test(l)) { seenMain = true; return esc(t); }
      return seenMain ? esc(t) : `<span class="pre">${esc(t)}</span>`;
    }).join('');
  }
  const pronOf = p => { let s = p || ''; if (!set.dots) s = s.replace(/·/g, ''); if (!set.split) s = s.replace(/-/g, ''); return s; };
  function wordHTML(w, i, j) {
    const ch = Morph.chip(w), lems = (w[3] || '').split('/').filter(x => /^\d/.test(x));
    const L = lems.length && lex[lems[lems.length - 1]];
    const sn = lems.map(l => 'H' + parseInt(l)).join(' ');
    return `<div class="w" data-i="${i}" data-j="${j}" role="button" tabindex="0">
<span class="chip${ch.verb ? ' v' : ''}">${esc(ch.t)}</span><span class="g">${esc(w[2])}</span><span class="h${w[5] ? ' mq' : ''}">${partsOf(w)}</span><span class="p">${esc(pronOf(w[1]))}</span>${sn ? `<span class="sn">${sn}</span>` : ''}${L && !L[5] ? `<span class="rt">${esc(L[1])}</span><span class="rp">${esc(L[2])}</span>` : ''}</div>`;
  }
  function render() {
    const { data, b, c } = cur, favs = new Set(store.get('fav', []).map(f => f.k)), every = Ads.everyVerses();
    const html = [`<div class="chhead"><h2>${esc(data.n)} ${c}</h2><small>${data.v.length} पद</small></div>`];
    data.v.forEach(([vn, hi, ws], i) => {
      html.push(`<article class="verse" id="v${vn}" data-i="${i}" data-v="${vn}"><div class="vhead"><span class="vn">${vn}</span>${favs.has(`${b}/${c}/${vn}`) ? '<svg class="vstar"><use href="#i-star-f"/></svg>' : ''}</div>
<div class="words">${ws.map((w, j) => wordHTML(w, i, j)).join('')}</div>${hi ? `<p class="hi">${esc(hi)}</p>` : ''}</article>`);
      if (every && (i + 1) % every === 0 && i + 1 < data.v.length) html.push('<div class="ad-slot ad-inline" data-slot="inline"></div>');
    });
    const p = neighbour(-1), n = neighbour(1);
    const lbl = k => esc(bname(k.split('/')[0]) + ' ' + k.split('/')[1]);
    html.push(`<div class="navbtns"><button data-nav="-1" ${p ? '' : 'disabled'}>‹ ${p ? lbl(p) : 'पिछला'}</button><button data-nav="1" ${n ? '' : 'disabled'}>${n ? lbl(n) : 'अगला'} ›</button></div>
<p class="credit">इब्रानी: OSHB/WLC (CC BY 4.0) · हिन्दी पद: IRV हिंदी 2019 (CC BY-SA 4.0) · <a href="#" data-act="about">स्रोत व लाइसेंस</a></p>`);
    $('#page').innerHTML = html.join('');
    Ads.fill(); observeVerses();
  }
  let io = null;
  function observeVerses() {
    io && io.disconnect();
    io = new IntersectionObserver(es => {
      let best = null;
      for (const e of es) if (e.isIntersecting && (!best || e.boundingClientRect.top < best.boundingClientRect.top)) best = e;
      if (best && view === 'read' && !G) { curV = +best.target.dataset.v; setTitle(); saveLast(); }
    }, { rootMargin: '-64px 0px -65% 0px' });
    $$('.verse', $('#page')).forEach(v => io.observe(v));
  }
  function scrollToVerse(v, flash) {
    const el = document.getElementById('v' + v); if (!el) return;
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 66);
    curV = v; if (cur) setTitle();
    if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }
  const saveLast = () => cur && store.set('last', `${cur.b}/${cur.c}/${curV}`);
  function addHistory() {
    const k = `${cur.b}/${cur.c}`, h = store.get('hist', []).filter(x => x.k !== k);
    h.unshift({ k, n: `${cur.data.n} ${cur.c}`, t: Date.now() }); store.set('hist', h.slice(0, 60));
  }
  const refName = k => { const [b, c, v] = k.split('/'); return `${bname(b)} ${c}${v ? ':' + v : ''}`; };

  // ---------- word interactions ----------
  let sel = null, tapT = null, lastTap = { el: null, t: 0 }, suppressClick = false;
  const wordAt = el => cur.data.v[+el.dataset.i][2][+el.dataset.j];
  $('#page').addEventListener('click', e => {
    const nav = e.target.closest('[data-nav]'); if (nav) { buzz(); go(+nav.dataset.nav); return; }
    const a = e.target.closest('[data-act=about]'); if (a) { e.preventDefault(); openAbout(); return; }
    if (suppressClick) { suppressClick = false; return; }
    const el = e.target.closest('.w'); if (!el) return;
    const now = Date.now();
    if (lastTap.el === el && now - lastTap.t < 320) {
      clearTimeout(tapT); lastTap = { el: null, t: 0 }; buzz();
      const k = mainLemma(wordAt(el)); if (k) { markSel(el); openStrong(k, () => markSel(null)); }
      return;
    }
    lastTap = { el, t: now }; clearTimeout(tapT);
    tapT = setTimeout(() => openWord(el), 260);
  });
  $('#page').addEventListener('keydown', e => { const el = e.target.closest('.w'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openWord(el); } });
  $('#page').addEventListener('contextmenu', e => { const v = e.target.closest('.verse'); if (v) { e.preventDefault(); if (!stack.length) openVerseActions(+v.dataset.i); } });
  const markSel = el => { sel && sel.classList.remove('sel'); sel = el; el && el.classList.add('sel'); };
  function partHTML(p) {
    const L = p.k && lex[p.k];
    if (!p.k) return `<div class="part"><span class="ph">${esc(p.h)}</span><div class="mean">${esc(p.g || '')}</div><div class="role">${esc(p.m)}</div></div>`;
    if (!L) return `<div class="part"><span class="ph">${esc(p.h)}</span><div class="role">${esc(p.m)}</div></div>`;
    return `<div class="part"><span class="ph">${esc(p.h)}</span><div class="mean">${esc(L[3] || '—')}</div><div class="role">${esc(p.m)}</div>
<div class="role">मूल शब्द: <span style="font-family:var(--heb);font-size:1.15rem">${esc(L[1])}</span> — ${esc(L[2])}</div>
<button class="sbtn" data-sk="${esc(p.k)}">स्ट्रॉन्ग H${L[0]} देखें ›</button></div>`;
  }
  function openWord(el) {
    const w = wordAt(el), v = cur.data.v[+el.dataset.i];
    markSel(el);
    const ch = Morph.chip(w);
    const s = sheet(`<div class="wsh"><div class="h">${partsOf(w)}</div><div class="p">${esc(pronOf(w[1]))}</div><div class="g">${esc(w[2])}</div>
<span class="chip${ch.verb ? ' v' : ''}" style="display:inline-block">${esc(ch.t)}</span><div class="ref">${esc(cur.data.n)} ${cur.c}:${v[0]}</div></div>
${Morph.parts(w).map(partHTML).join('')}<p style="color:var(--mute);font-size:.8rem;text-align:center">सुझाव: शब्द पर डबल-टैप करें — सीधे स्ट्रॉन्ग शब्दकोश खुलेगा।</p>`, { onClose: () => markSel(null) });
    s.addEventListener('click', e => { const b = e.target.closest('[data-sk]'); if (b) openStrong(b.dataset.sk); });
  }

  // ---------- Strong's dialog & concordance ----------
  const POS = { v: 'क्रिया', n: 'संज्ञा', 'n-m': 'संज्ञा (पुल्लिंग)', 'n-f': 'संज्ञा (स्त्रीलिंग)', a: 'विशेषण', 'a-m': 'विशेषण (पुल्लिंग)', 'a-f': 'विशेषण (स्त्रीलिंग)',
    'n-pr-m': 'व्यक्तिवाचक संज्ञा (पुरुष का नाम)', 'n-pr-f': 'व्यक्तिवाचक संज्ञा (स्त्री का नाम)', 'n-pr-loc': 'स्थान का नाम', 'n-pr': 'व्यक्तिवाचक संज्ञा',
    'n-pr-g': 'जाति/गोत्र का नाम', adv: 'क्रियाविशेषण', prep: 'पूर्वसर्ग', conj: 'योजक (समुच्चयबोधक)', pron: 'सर्वनाम', prt: 'अव्यय', inj: 'विस्मयादिबोधक',
    'p-m': 'सर्वनाम (पुल्लिंग)', 'p-f': 'सर्वनाम (स्त्रीलिंग)', 'a-gent': 'जातिवाचक विशेषण', x: 'अव्यय' };
  const posHi = p => POS[p] || POS[(p || '').split('-').slice(0, 2).join('-')] || POS[(p || '').split('-')[0]] || p || '—';
  function originHi(src) {
    if (!src) return '—';
    const s = src.toLowerCase(), refs = [...new Set(src.match(/H\d+/g) || [])];
    const L = refs.map(r => `<a class="lnk" data-sn="${r.slice(1)}">${r}</a>`).join(' और ') || '—';
    const kinds = [
      [/primitive root/, () => 'मूल धातु'], [/primitive (word|particle)/, () => 'मूल शब्द'], [/uncertain/, () => 'अनिश्चित व्युत्पत्ति'], [/foreign/, () => 'विदेशी मूल'],
      [/^(patronymic|patrial)/, () => `वंश/देशसूचक — ${L} से`], [/^feminine of/, () => `${L} का स्त्रीलिंग रूप`], [/^plural of/, () => `${L} का बहुवचन`],
      [/^(a )?(prolonged|lengthened|fuller) form/, () => `${L} का विस्तारित रूप`], [/^(a )?(contract|abbreviat|shortened)/, () => `${L} का संक्षिप्त रूप`],
      [/^corresponding to/, () => `${L} के अनुरूप (अरामी)`], [/^(the )?same as/, () => `${L} के समान`], [/^(apparently|probably|perhaps)/, () => `संभवतः ${L} से`],
      [/^(intensive )?from/, () => `${L} से व्युत्पन्न`], [/^by permutation/, () => `${L} का रूपान्तर`], [/variation/, () => `${L} का वर्तनी-भेद`], [/participle/, () => `${L} का कृदन्त`]];
    for (const [re, f] of kinds) if (re.test(s)) return f();
    return refs.length ? `${L} से सम्बन्धित` : '—';
  }
  function concRows(k) {
    const rows = (conc && conc[k]) || [];
    return rows.map(([g, dl]) => { let acc = 0; return { g, refs: dl.map(d => (acc += d)) }; });
  }
  async function openStrong(k, onClose) {
    await loadLex();
    if (!lex[k] && /^\d+$/.test(k)) k = keyOfNum(+k) || k;
    const L = lex[k] || [parseInt(k), '', '', '', ''], num = L[0];
    const el = sheet(`<div class="st-h"><h3>स्ट्रॉन्ग H${num}</h3></div><div class="stb"><p class="loading" style="padding:20px">लोड हो रहा है…</p></div>`, {
      foot: '<button class="btn" data-act="copy">कॉपी</button><button class="btn" data-act="close">बंद करें</button><button class="btn pri" data-act="conc">कॉनकॉर्डेंस</button>', onClose });
    let S;
    try { await loadStrongs(); S = strongs[num] || ['', '', '', '', '', '']; }
    catch { $('.stb', el).innerHTML = '<p class="loading">शब्दकोश लोड नहीं हो सका।</p>'; return; }
    const draw = () => {
      const rows = concRows(k), total = rows.reduce((a, r) => a + r.refs.length, 0);
      $('.stb', el).innerHTML = `<dl class="kv">
<dt>शब्द</dt><dd class="heb">${esc(L[1])}</dd>
<dt>लिप्यंतरण</dt><dd><b>${esc(L[2])}</b><span class="en">${esc(S[2])}</span></dd>
<dt>शब्द-भेद</dt><dd>${esc(posHi(S[0]))}</dd>
<dt>ध्वन्यात्मक वर्तनी</dt><dd>${esc(S[1] || '—')}</dd>
<dt>परिभाषा</dt><dd><b>${esc(L[3] || '—')}</b><span class="en">${esc(S[4] || L[4])}</span></dd>
<dt>उत्पत्ति</dt><dd>${originHi(S[3])}${S[3] ? `<span class="en">${esc(S[3])}</span>` : ''}</dd>
<dt>प्रयोग</dt><dd>${conc ? `पुराने नियम में <b>${fmt(total)}</b> बार` : 'गिनती लोड हो रही है…'}${S[5] ? `<span class="en">KJV: ${esc(S[5].length > 170 ? S[5].slice(0, 170) + '…' : S[5])}</span>` : ''}</dd>
<dt>अनुवाद${rows.length ? ` (${rows.length})` : ''}</dt><dd><div class="tags">${rows.slice(0, 24).map((r, i) => `<button class="tag" data-g="${i}">${esc(r.g || '—')}<b>${r.refs.length}</b></button>`).join('') || '—'}</div></dd></dl>`;
    };
    draw();
    if (!conc) loadConc().then(draw).catch(() => {});
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'), sn = e.target.closest('[data-sn]'), tg = e.target.closest('[data-g]');
      if (sn) { openStrong(sn.dataset.sn); return; }
      if (tg) { openConc(k, +tg.dataset.g); return; }
      if (!a) return;
      if (a.dataset.act === 'close') closeTop();
      if (a.dataset.act === 'conc') openConc(k, -1);
      if (a.dataset.act === 'copy') copyText(`स्ट्रॉन्ग H${num} — ${L[1]} (${L[2]})\nअर्थ: ${L[3]}\nशब्द-भेद: ${posHi(S[0])}\n${S[4] || ''}\n— ${APP}: ${SITE}`);
    });
  }
  const decodeRef = r => { const bi = Math.floor(r / 1e6), c = Math.floor(r / 1000) % 1000, v = r % 1000; return { b: index.books[bi].id, c, v }; };
  const irvText = (b, c, v) => { const ch = irv && irv[b] && irv[b][c - 1]; const x = ch && ch.find(y => y[0] === v); return x ? x[1] : ''; };
  async function openConc(k, gi) {
    const L = lex[k] || [parseInt(k)];
    const el = sheet(`<h3>कॉनकॉर्डेंस · H${L[0]} <span style="font-family:var(--heb)">${esc(L[1] || '')}</span></h3><div class="cb"><p class="loading">लोड हो रहा है…</p></div>`);
    try { await loadConc(); } catch { $('.cb', el).innerHTML = '<p class="loading">लोड नहीं हो सका।</p>'; return; }
    const rows = concRows(k);
    let filter = gi, shown = 120;
    const items = () => { const out = []; rows.forEach((r, i) => { if (filter < 0 || filter === i) for (const x of r.refs) out.push([x, r.g]); }); return out.sort((a, b) => a[0] - b[0]); };
    const draw = () => {
      const it = items();
      $('.cb', el).innerHTML = `<div class="tags" style="margin-bottom:8px"><button class="tag${filter < 0 ? ' on' : ''}" data-f="-1">सभी<b>${rows.reduce((a, r) => a + r.refs.length, 0)}</b></button>${rows.slice(0, 30).map((r, i) => `<button class="tag${filter === i ? ' on' : ''}" data-f="${i}">${esc(r.g || '—')}<b>${r.refs.length}</b></button>`).join('')}</div>
${it.slice(0, shown).map(([r, g]) => { const x = decodeRef(r); return `<div class="cc" data-go="${x.b}/${x.c}/${x.v}"><span class="r">${esc(bname(x.b))} ${x.c}:${x.v}</span><span class="gg">${esc(g)}</span><div class="t">${esc(irvText(x.b, x.c, x.v))}</div></div>`; }).join('')}
${it.length > shown ? `<button class="btn" data-more style="width:100%;margin-top:10px">और दिखाएँ (${it.length - shown})</button>` : ''}`;
    };
    draw();
    if (!irv) loadIrv().then(draw).catch(() => {});
    el.addEventListener('click', e => {
      const f = e.target.closest('[data-f]'), g = e.target.closest('[data-go]');
      if (f) { filter = +f.dataset.f; shown = 120; draw(); }
      else if (e.target.closest('[data-more]')) { shown += 200; draw(); }
      else if (g) openRef(g.dataset.go);
    });
  }
  function openRef(k) { closeAll().then(() => { location.hash = k; }); }

  // ---------- verse actions, copy, share ----------
  function verseInfo(i) {
    const [vn, hi, ws] = cur.data.v[i];
    return { k: `${cur.b}/${cur.c}/${vn}`, ref: `${cur.data.n} ${cur.c}:${vn}`, heb: hebOf(ws), hi };
  }
  function toggleFav(info) {
    let f = store.get('fav', []); const has = f.some(x => x.k === info.k);
    f = has ? f.filter(x => x.k !== info.k) : [{ k: info.k, ref: info.ref, heb: info.heb, hi: info.hi, t: Date.now() }, ...f];
    store.set('fav', f); toast(has ? 'पसंदीदा से हटाया' : '★ पसंदीदा में सहेजा'); buzz();
    return !has;
  }
  function openVerseActions(i) {
    const info = verseInfo(i), isFav = store.get('fav', []).some(x => x.k === info.k);
    const vEl = document.getElementById('v' + cur.data.v[i][0]);
    const el = sheet(`<h3>${esc(info.ref)}</h3><div class="list">
${listItem(isFav ? 'star-f' : 'star', isFav ? 'पसंदीदा से हटाएँ' : 'पसंदीदा में सहेजें', 'fav')}
${listItem('copy', 'कॉपी करें (इब्रानी + हिन्दी)', 'copy')}${listItem('img', 'चित्र कार्ड बनाएँ और शेयर करें', 'card')}${listItem('link', 'लिंक शेयर करें', 'link')}</div>`,
      { onClose: () => vEl && vEl.classList.remove('lp') });
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'fav') { toggleFav(info); closeTop(); const y = window.scrollY; render(); window.scrollTo(0, y); }
      if (act === 'copy') { copyText(`${info.heb}\n\n${info.hi}\n— ${info.ref}\n${SITE}#${info.k}`); closeTop(); }
      if (act === 'card') { closeTop(); setTimeout(() => openCard(info), 60); }
      if (act === 'link') { closeTop(); shareText(`${info.ref} — ${info.hi}\n\nइब्रानी शब्द-दर-शब्द हिन्दी अर्थ के साथ पढ़ें:`, `${SITE}#${info.k}`); }
    });
  }
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); }
    catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
    toast('कॉपी हो गया'); buzz();
  }
  async function shareText(text, url) {
    const S = PLUG('Share');
    try {
      if (S) await S.share({ title: APP, text, url });
      else if (navigator.share) await navigator.share({ title: APP, text, url });
      else await copyText(text + ' ' + url);
    } catch {}
  }
  // verse share card: 1080x1350 PNG (WhatsApp/Instagram friendly) with Hebrew + Hindi + reference + app link
  function wrap(ctx, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function fit(ctx, text, font, size, min, maxW, maxH, lh) {
    let s = size, lines = [];
    for (; s >= min; s -= 2) { ctx.font = font.replace('{s}', s); lines = wrap(ctx, text, maxW); if (lines.length * s * lh <= maxH) break; }
    return { s: Math.max(s, min), lines };
  }
  async function drawCard(info) {
    try { await Promise.all([document.fonts.load('56px "Noto Serif Hebrew"', info.heb), document.fonts.load('600 44px "Noto Sans Devanagari"', (info.hi || '') + info.ref)]); } catch {}
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b1640'); g.addColorStop(.55, '#1e3a8a'); g.addColorStop(1, '#2563eb');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const rg = x.createRadialGradient(W * .85, H * .1, 10, W * .85, H * .1, 600); rg.addColorStop(0, 'rgba(147,197,253,.35)'); rg.addColorStop(1, 'rgba(147,197,253,0)');
    x.fillStyle = rg; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(255,255,255,.06)'; x.font = '700 520px "Noto Serif Hebrew", serif'; x.textAlign = 'right'; x.direction = 'rtl'; x.fillText('א', W + 40, H - 120);
    x.direction = 'ltr'; x.textAlign = 'left';
    x.fillStyle = 'rgba(255,255,255,.85)'; x.font = '600 34px "Noto Sans Devanagari", sans-serif'; x.fillText('✦  ' + APP, 80, 120);
    // measure both blocks first, then centre them vertically between the header label and the footer pill
    const hb = fit(x, info.heb, '{s}px "Noto Serif Hebrew", serif', 64, 30, W - 160, 440, 1.5);
    const hh = fit(x, info.hi || '', '500 {s}px "Noto Sans Devanagari", sans-serif', 50, 28, W - 160, 560, 1.55);
    const block = hb.lines.length * hb.s * 1.5 + 60 + hh.lines.length * hh.s * 1.55 + 90;
    let y = 170 + Math.max(0, (H - 200 - 170 - block) / 2) + hb.s;
    x.font = `${hb.s}px "Noto Serif Hebrew", serif`; x.fillStyle = '#ffffff'; x.textAlign = 'right'; x.direction = 'rtl';
    for (const l of hb.lines) { x.fillText(l, W - 80, y); y += hb.s * 1.5; }
    x.direction = 'ltr'; x.textAlign = 'left';
    x.fillStyle = '#fbbf24'; x.fillRect(80, y - hb.s * .55, 120, 6); y += 40 + hh.s * .2;
    x.font = `500 ${hh.s}px "Noto Sans Devanagari", sans-serif`; x.fillStyle = 'rgba(255,255,255,.96)';
    for (const l of hh.lines) { x.fillText(l, 80, y); y += hh.s * 1.55; }
    x.font = '700 46px "Noto Sans Devanagari", sans-serif'; x.fillStyle = '#fbbf24'; x.fillText('— ' + info.ref, 80, Math.min(y + 20, H - 200));
    const py = H - 150; x.fillStyle = 'rgba(255,255,255,.12)';
    x.beginPath(); if (x.roundRect) x.roundRect(60, py, W - 120, 96, 48); else x.rect(60, py, W - 120, 96); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(118, py + 48, 30, 0, 7); x.fill();
    x.fillStyle = '#1e3a8a'; x.font = '700 34px "Noto Serif Hebrew", serif'; x.textAlign = 'center'; x.fillText('א', 118, py + 60);
    x.textAlign = 'left'; x.fillStyle = '#fff'; x.font = '600 30px "Noto Sans Devanagari", sans-serif'; x.fillText('हर इब्रानी शब्द का हिन्दी अर्थ — मुफ़्त', 168, py + 42);
    x.fillStyle = 'rgba(255,255,255,.8)'; x.font = '500 26px system-ui, sans-serif'; x.fillText(SITE.replace('https://', '').replace(/\/$/, ''), 168, py + 78);
    return cv;
  }
  async function openCard(info) {
    const el = sheet('<h3>शेयर कार्ड</h3><div class="cardp"><p class="loading">चित्र बन रहा है…</p></div>', {
      foot: '<button class="btn" data-act="save">सेव करें</button><button class="btn pri" data-act="share">शेयर करें (WhatsApp)</button>' });
    const cv = await drawCard(info), url = cv.toDataURL('image/png');
    $('.cardp', el).innerHTML = `<img class="share-prev" src="${url}" alt="${esc(info.ref)} शेयर कार्ड">`;
    const text = `${info.ref} — ${info.hi}\n\nइब्रानी शब्द-दर-शब्द हिन्दी अर्थ के साथ पढ़ें: ${SITE}#${info.k}`;
    el.addEventListener('click', async e => {
      const a = e.target.closest('[data-act]'); if (!a) return; buzz();
      const name = `hebrew-hindi-${info.k.replace(/\//g, '-')}.png`;
      if (a.dataset.act === 'share') {
        const S = PLUG('Share'), F = PLUG('Filesystem');
        if (S && F) {
          try { const r = await F.writeFile({ path: name, data: url.split(',')[1], directory: 'CACHE' }); await S.share({ title: APP, text, files: [r.uri] }); return; } catch (err) { console.warn(err); }
        }
        try {
          const blob = await new Promise(r => cv.toBlob(r, 'image/png')), file = new File([blob], name, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: APP }); return; }
        } catch (err) { if (err && err.name === 'AbortError') return; }
        download(url, name); toast('चित्र सेव हुआ — अब WhatsApp में भेजें');
      } else {
        const F = PLUG('Filesystem');
        if (F) { try { await F.writeFile({ path: 'Pictures/' + name, data: url.split(',')[1], directory: 'DOCUMENTS', recursive: true }); toast('Documents/Pictures में सेव हुआ'); return; } catch (err) { console.warn(err); } }
        download(url, name); toast('चित्र सेव हुआ');
      }
    });
  }
  const download = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

  // ---------- picker (book → chapter → verse) ----------
  async function openPicker(step) {
    await loadIndex();
    const st = { b: cur ? cur.b : 'Gen', c: cur ? cur.c : 1 };
    const el = sheet('<div class="picker"></div>', { cls: 'pk' });
    const box = $('.picker', el);
    const books = (f = '') => {
      let i = 0; const fl = f.trim();
      box.innerHTML = `<h3>पुस्तक चुनें</h3><div class="sbox" style="margin:0 0 4px"><svg><use href="#i-search"/></svg><input id="pkq" placeholder="पुस्तक खोजें…" value="${esc(fl)}" autocomplete="off"></div><div class="pkl"></div>`;
      const list = () => { i = 0; const v = $('#pkq', box).value.trim();
        $('.pkl', box).innerHTML = GROUPS.map(([g, n]) => { const bs = index.books.slice(i, i += n).filter(b => !v || b.name.includes(v) || b.id.toLowerCase().startsWith(v.toLowerCase()));
          return bs.length ? `<h4>${g}</h4><div class="books">${bs.map(b => `<button data-b="${b.id}" class="${b.id === st.b ? 'cur' : ''}">${esc(b.name)}</button>`).join('')}</div>` : ''; }).join(''); };
      list(); $('#pkq', box).oninput = list;
    };
    const chapters = () => {
      const b = book(st.b);
      box.innerHTML = `<div class="crumb"><button data-step="books">‹ पुस्तकें</button><b>${esc(b.name)}</b></div><h4>अध्याय</h4>
<div class="grid">${Array.from({ length: b.chapters }, (_, k) => `<button data-c="${k + 1}" class="${cur && st.b === cur.b && k + 1 === cur.c ? 'cur' : ''}">${k + 1}</button>`).join('')}</div>`;
    };
    const verses = async () => {
      const b = book(st.b), crumb = `<div class="crumb"><button data-step="books">‹ पुस्तकें</button><button data-step="chapters">${esc(b.name)}</button><b>अध्याय ${st.c}</b></div>`;
      box.innerHTML = crumb + '<p class="loading">…</p>';
      let d; try { d = await getChapter(st.b, st.c); } catch { $('.loading', box).textContent = 'लोड नहीं हो सका'; return; }
      box.innerHTML = `${crumb}<h4>पद</h4><div class="grid">${d.v.map(v => `<button data-v="${v[0]}" class="${cur && st.b === cur.b && st.c === cur.c && v[0] === curV ? 'cur' : ''}">${v[0]}</button>`).join('')}</div>`;
    };
    (step === 'books' ? books : chapters)();
    box.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.step === 'books') books();
      else if (t.dataset.step === 'chapters') chapters();
      else if (t.dataset.b) { st.b = t.dataset.b; buzz(); chapters(); }
      else if (t.dataset.c) { st.c = +t.dataset.c; buzz(); verses(); }
      else if (t.dataset.v) { buzz(); const k = `${st.b}/${st.c}/${t.dataset.v}`; closeAll().then(() => { location.hash = k; }); }
    });
  }

  // ---------- gestures on the reader & header ----------
  let G = null, lpT = null;
  const pull = $('#pull'), page = $('#page');
  const dist = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  const cancelLP = () => { clearTimeout(lpT); lpT = null; };
  document.addEventListener('touchstart', e => {
    if (e.target.closest('#layers,#tabs,.pop,#fab,input,textarea')) { G = null; return; }
    const inRead = view === 'read' && !!e.target.closest('#v-read');
    if (e.touches.length === 2 && inRead) { cancelLP(); clearTimeout(tapT); G = { mode: 'pinch', d0: dist(e.touches), fs0: set.fs, fs: set.fs }; page.style.transform = ''; return; }
    if (e.touches.length !== 1) { G = null; return; }
    const t = e.touches[0];
    G = { x0: t.clientX, y0: t.clientY, t0: Date.now(), mode: null, top: window.scrollY <= 2, inRead, inHead: !!e.target.closest('#top') };
    suppressClick = false;
    const vEl = inRead && e.target.closest('.verse');
    if (vEl && !stack.length) lpT = setTimeout(() => {
      lpT = null; if (!G || G.mode) return;
      G.mode = 'lp'; suppressClick = true; clearTimeout(tapT); buzz(true); vEl.classList.add('lp'); openVerseActions(+vEl.dataset.i);
    }, 480);
  }, { passive: true });
  let raf = 0;
  document.addEventListener('touchmove', e => {
    if (!G) return;
    if (G.mode === 'pinch') {
      if (e.touches.length < 2) return;
      G.fs = Math.min(2, Math.max(0.7, G.fs0 * dist(e.touches) / G.d0));
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (G && G.mode === 'pinch') document.documentElement.style.setProperty('--fs', G.fs.toFixed(3)); });
      return;
    }
    const t = e.touches[0], dx = t.clientX - G.x0, dy = t.clientY - G.y0;
    if (!G.mode) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      cancelLP();
      if (G.inRead && Math.abs(dx) > Math.abs(dy) * 1.3) G.mode = 'swipe';
      else if ((G.top || G.inHead) && dy > 0 && dy > Math.abs(dx)) G.mode = 'pull';
      else G.mode = 'scroll';
    }
    if (G.mode === 'swipe') {
      const has = neighbour(dx < 0 ? 1 : -1), tx = has ? dx : dx * 0.25;
      page.style.transition = 'none'; page.style.transform = `translateX(${tx}px)`; page.style.opacity = String(1 - Math.min(0.5, Math.abs(tx) / innerWidth));
    } else if (G.mode === 'pull') {
      if (window.scrollY > 2 && !G.inHead) { G.mode = 'scroll'; resetPull(); return; }
      const p = Math.min(dy * 0.55, 110), ready = p >= 64;
      pull.style.transition = 'none'; pull.style.transform = `translateY(${p - 60}px)`; pull.style.opacity = String(Math.min(1, p / 50));
      if (ready !== G.ready) { G.ready = ready; pull.classList.toggle('ready', ready); if (ready) buzz(); }
    }
  }, { passive: true });
  function resetPull() { pull.style.transition = 'transform .25s, opacity .25s'; pull.style.transform = ''; pull.style.opacity = ''; pull.classList.remove('ready'); }
  const springBack = () => { page.style.transition = 'transform .28s cubic-bezier(.2,.8,.2,1), opacity .2s'; page.style.transform = ''; page.style.opacity = ''; };
  function touchEnd(e) {
    cancelLP();
    if (!G) return;
    const g = G;
    if (g.mode === 'pinch') {
      G = null; set.fs = Math.round(g.fs * 20) / 20; saveSet(); toast(`अक्षर आकार ${Math.round(set.fs * 100)}%`); return;
    }
    if (e.touches && e.touches.length) return;
    G = null;
    const t = e.changedTouches && e.changedTouches[0];
    if (!t || e.type === 'touchcancel') { if (g.mode === 'swipe') springBack(); resetPull(); return; }
    const dx = t.clientX - g.x0, dt = Date.now() - g.t0;
    if (g.mode === 'swipe') {
      const d = dx < 0 ? 1 : -1;
      if (neighbour(d) && (Math.abs(dx) > innerWidth * 0.22 || Math.abs(dx) / dt > 0.45)) { buzz(); go(d); }
      else springBack();
    } else if (g.mode === 'pull') { if (g.ready) { buzz(true); openPicker(); } resetPull(); }
  }
  document.addEventListener('touchend', touchEnd, { passive: true });
  document.addEventListener('touchcancel', touchEnd, { passive: true });
  let lastY = 0;
  window.addEventListener('scroll', () => { const y = window.scrollY; if (Math.abs(y - lastY) > 6) { $('#fab').classList.toggle('hide', y > lastY && y > 200); lastY = y; } }, { passive: true });

  // ---------- header, menu, tabs, FAB ----------
  $('#title').onclick = () => { buzz(); openPicker(view === 'read' ? 'chapters' : 'books'); };
  $('#btnSearch').onclick = () => { location.hash = 'search'; setTimeout(() => $('#q').focus(), 80); };
  $('#btnLex').onclick = () => { setMode('strong'); location.hash = 'search'; setTimeout(() => $('#q').focus(), 80); };
  $$('#tabs button').forEach(b => b.onclick = () => {
    buzz(); const t = b.dataset.tab;
    if (t === view) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    location.hash = t === 'read' ? lastRef() : t;
  });
  const MENU = [['settings', 'सेटिंग्स'], ['faq', 'सामान्य प्रश्न (FAQ)'], ['new', 'नया क्या है'], ['shareapp', 'ऐप शेयर करें'], ['rate', 'रेटिंग दें'],
    ['apps', 'अन्य ऐप्स'], ['contact', 'संपर्क करें'], ['about', 'हमारे बारे में']];
  $('#menu').innerHTML = MENU.map(([k, l]) => `<button data-m="${k}">${l}</button>`).join('');
  $('#btnMenu').onclick = e => { e.stopPropagation(); $('#menu').hidden = !$('#menu').hidden; };
  document.addEventListener('click', e => { if (!e.target.closest('#menu')) $('#menu').hidden = true; });
  const shareApp = () => shareText(`${APP} — हर इब्रानी शब्द के साथ हिन्दी अर्थ, उच्चारण, व्याकरण और स्ट्रॉन्ग शब्दकोश। मुफ़्त:`, SITE);
  $('#menu').addEventListener('click', e => {
    const m = e.target.closest('[data-m]'); if (!m) return; $('#menu').hidden = true;
    ({
      settings: () => (location.hash = 'settings'), faq: openFAQ, new: openNew, about: openAbout, shareapp: shareApp,
      rate: () => { if (NATIVE) window.open('market://details?id=in.hebrewhindi.bible', '_system'); else toast('ऐप जल्द ही Play Store पर — धन्यवाद! 🙏'); },
      apps: () => sheet('<h3>अन्य ऐप्स</h3><p>हमारे और ऐप्स जल्द आ रहे हैं।</p>'),
      contact: () => sheet(`<h3>संपर्क करें</h3><p>सुझाव, ग़लती की सूचना या अनुरोध के लिए GitHub पर लिखें:</p><p><a class="lnk" href="https://github.com/Dscj21/hebrew-hindi-bible/issues" target="_blank" rel="noopener">github.com/Dscj21/hebrew-hindi-bible/issues</a></p>`)
    }[m.dataset.m] || (() => {}))();
  });
  $('#fab').onclick = () => {
    buzz(); if (!cur) return;
    const k = `${cur.b}/${cur.c}`, has = store.get('bm', []).some(x => x.k === k);
    const el = sheet(`<h3>${esc(cur.data.n)} ${cur.c}</h3><div class="list">${listItem('bookmark', has ? 'बुकमार्क हटाएँ' : 'इस अध्याय को बुकमार्क करें', 'bm')}
${listItem('star', 'पसंदीदा पद', 'fav')}${listItem('clock', 'इतिहास', 'hist')}${listItem('up', 'ऊपर जाएँ', 'top')}
<div class="row" style="padding:10px 6px;border:0"><span class="lb">अक्षर आकार</span><button class="btn" data-act="fsm" style="flex:none;width:56px">A−</button><button class="btn" data-act="fsp" style="flex:none;width:56px">A+</button></div></div>`);
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
      if (act === 'bm') { let b = store.get('bm', []); b = has ? b.filter(x => x.k !== k) : [{ k, n: `${cur.data.n} ${cur.c}`, t: Date.now() }, ...b]; store.set('bm', b); toast(has ? 'बुकमार्क हटाया' : 'बुकमार्क सहेजा'); buzz(); closeTop(); }
      if (act === 'fav' || act === 'hist') { savedMode = act; closeAll().then(() => (location.hash = 'saved')); }
      if (act === 'top') { closeTop(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
      if (act === 'fsm' || act === 'fsp') { set.fs = Math.min(2, Math.max(0.7, Math.round((set.fs + (act === 'fsp' ? 0.1 : -0.1)) * 20) / 20)); saveSet(); buzz(); toast(`अक्षर आकार ${Math.round(set.fs * 100)}%`); }
    });
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (stack.length) closeTop(); $('#menu').hidden = true; return; }
    if (stack.length || view !== 'read' || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1);
  });

  // ---------- info sheets ----------
  function openAbout() {
    sheet(`<h3>हमारे बारे में</h3><p>${APP}: पुराने नियम का इब्रानी पाठ — हर शब्द के साथ हिन्दी अर्थ, देवनागरी उच्चारण, व्याकरण चिप, स्ट्रॉन्ग संख्या और मूल शब्द; हर पद के नीचे IRV हिन्दी अनुवाद। मुफ़्त, विज्ञापन-समर्थित।</p>
<div class="about"><p><b>इब्रानी पाठ:</b> <a href="https://github.com/openscriptures/morphhb" target="_blank" rel="noopener">Open Scriptures Hebrew Bible (OSHB / morphhb)</a>, Westminster Leningrad Codex पर आधारित — लेम्मा व व्याकरण: CC BY 4.0, WLC पाठ: Public Domain.</p>
<p><b>शब्दकोश:</b> Strong's Hebrew Dictionary (Public Domain), <a href="https://github.com/openscriptures/HebrewLexicon" target="_blank" rel="noopener">openscriptures/HebrewLexicon</a> से।</p>
<p><b>हिन्दी पद:</b> इंडियन रिवाइज्ड वर्जन (IRV) हिंदी – 2019, © 2017, 2018, 2019 Bridge Connectivity Solutions Pvt. Ltd., <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.hi" target="_blank" rel="noopener">CC BY-SA 4.0</a> के अन्तर्गत; स्रोत: <a href="https://ebible.org/find/details.php?id=hin2017" target="_blank" rel="noopener">eBible.org</a>। फ़ुटनोट और क्रॉस-रेफ़रेंस हटाए गए हैं; पाठ में कोई और बदलाव नहीं है।</p>
<p>देवनागरी उच्चारण, हिन्दी शब्दार्थ और हिन्दी व्याकरण-विवरण इस परियोजना ने जोड़े हैं (CC BY-SA 4.0); कई शब्दार्थ स्वचालित रूप से बने हैं और जाँच जारी है। मूल लाइसेंसदाता इन बदलावों का समर्थन करते हों, यह ज़रूरी नहीं।</p>
<p>फ़ॉन्ट: Noto Serif Hebrew, Noto Sans Devanagari (SIL OFL)। संस्करण 2.0</p></div>`);
  }
  const GESTURES = [['← → स्वाइप', 'अगला / पिछला अध्याय'], ['ऊपर से नीचे खींचें', 'पुस्तक / अध्याय / पद चुनें'], ['शब्द पर टैप', 'शब्द का पूरा विवरण'],
    ['शब्द पर डबल-टैप', 'स्ट्रॉन्ग शब्दकोश'], ['पद को देर तक दबाएँ', 'सहेजें, कॉपी, चित्र कार्ड शेयर'], ['दो उँगलियों से पिंच', 'अक्षर छोटे / बड़े'], ['पॉप-अप को नीचे खींचें', 'बंद करें']];
  const gestureHTML = () => `<div class="group">${GESTURES.map(([a, b]) => `<div class="row"><span class="lb"><b>${a}</b><small>${b}</small></span></div>`).join('')}</div>`;
  function openFAQ() {
    const qa = [['हिन्दी अर्थ कहाँ से आते हैं?', 'हर इब्रानी मूल शब्द (लेम्मा) का हिन्दी अर्थ IRV की शब्दावली के अनुसार लिखा गया है; उपसर्ग (व = और, ब = में…) और प्रत्यय (उसका, मेरा…) जोड़कर हर शब्द का संदर्भ-अर्थ बनता है।'],
      ['रंगीन चिप का क्या अर्थ है?', 'व्याकरण का संक्षेप: सं = संज्ञा, नाम = व्यक्तिवाचक संज्ञा, क्रि = क्रिया, वि = विशेषण, पूर्व = पूर्वसर्ग, यो = योजक, सर्व = सर्वनाम; पु/स्त्री = लिंग; ए/ब/द्वि = वचन; सम्ब = सम्बन्ध रूप; 3पु.ए = अन्य पुरुष, पुल्लिंग, एकवचन; कथा = वय्यिक़तोल ("तब…किया")। गुलाबी चिप = क्रिया।'],
      ['नारंगी अक्षर क्या हैं?', 'शब्द के आगे जुड़े उपसर्ग (जैसे וְ "और", בְּ "में") नारंगी में और अंत के सर्वनाम-प्रत्यय बैंगनी में दिखते हैं, ताकि शब्द के टुकड़े अलग पहचाने जा सकें। सेटिंग्स में बंद कर सकते हैं।'],
      ['उच्चारण में · और - क्यों?', '· अक्षरों (सिलेबल) को अलग करता है; - उपसर्ग को मुख्य शब्द से अलग करता है (वे-ख़ोल = "और सब")।'],
      ['क्या यह बिना इंटरनेट चलता है?', 'Android ऐप में पूरा पुराना नियम ऐप के अंदर है। वेबसाइट पर पढ़े हुए अध्याय अपने-आप सहेजे जाते हैं।'],
      ['ग़लती मिली?', '⋮ मेनू → संपर्क करें से बताएँ।']];
    sheet(`<h3>सामान्य प्रश्न</h3>${qa.map(([q, a]) => `<div class="part"><div class="mean">${q}</div><div style="margin-top:4px">${a}</div></div>`).join('')}<div class="gt">इशारे</div>${gestureHTML()}`);
  }
  function openNew() {
    sheet(`<h3>नया क्या है — संस्करण 2.0</h3>${['नया रूप: हर शब्द में व्याकरण चिप, हिन्दी अर्थ, बड़ा इब्रानी, अक्षर-विभाजित उच्चारण, स्ट्रॉन्ग संख्या और मूल शब्द',
      'उपसर्ग (וְ = और) अलग रंग में', 'स्ट्रॉन्ग शब्दकोश — शब्द-भेद, परिभाषा, उत्पत्ति, प्रयोग की गिनती और कॉनकॉर्डेंस', 'हिन्दी खोज: शब्द, स्ट्रॉन्ग संख्या या संदर्भ से',
      'स्वाइप, पिंच, डबल-टैप और देर तक दबाने वाले इशारे', 'पसंदीदा, बुकमार्क और इतिहास', 'पद का सुंदर चित्र कार्ड बनाकर WhatsApp पर शेयर करें', 'डार्क और सीपिया थीम',
      'पूरे पुराने नियम के हर शब्द का हिन्दी अर्थ'].map(t => `<div class="part">✓ ${t}</div>`).join('')}`);
  }

  // ---------- home ----------
  async function renderHome() {
    const last = lastRef();
    const vk = VOTD[Math.floor(Date.now() / 864e5) % VOTD.length], [vb, vc, vv] = vk.split('/');
    const el = $('#v-home');
    el.innerHTML = `<div class="hero"><div class="lbl">✦ आज का वचन</div><div class="hh">…</div><div class="ht"></div><div class="hr">${esc(refName(vk))}</div>
<div class="hrow"><button class="w1" data-go="${vk}">पढ़ें</button><button data-act="vcard">शेयर कार्ड</button><button data-act="vfav">★ सहेजें</button></div></div>
<div class="tiles"><button class="tile wide" data-go="${last}"><svg><use href="#i-book"/></svg><span><small>पढ़ना जारी रखें</small><b>${esc(refName(last))}</b></span></button>
<button class="tile" data-act="books"><b>पुस्तकें</b><small>39 पुस्तकें · 929 अध्याय</small></button><button class="tile" data-act="lexi"><b>α शब्दकोश</b><small>स्ट्रॉन्ग · ${fmt(Object.keys(lex).length || 9504)} मूल शब्द</small></button>
<button class="tile" data-tab="search"><b>खोजें</b><small>शब्द, संदर्भ, H-संख्या</small></button><button class="tile" data-tab="saved"><b>सहेजे</b><small>${store.get('fav', []).length} पसंदीदा · ${store.get('bm', []).length} बुकमार्क</small></button></div>
<div class="hsec">लोकप्रिय अध्याय</div><div class="chips">${['Gen/1', 'Exod/20', 'Deut/6', 'Ps/23', 'Ps/91', 'Ps/119', 'Prov/3', 'Isa/53', 'Jer/31', 'Ruth/1', 'Jonah/1'].map(k => `<button data-go="${k}">${esc(refName(k))}</button>`).join('')}</div>
<div class="stats"><div><b>39</b><small>पुस्तकें</small></div><div><b>23,213</b><small>पद</small></div><div><b>3,05,507</b><small>इब्रानी शब्द</small></div><div><b>100%</b><small>हिन्दी अर्थ</small></div></div>
<div class="hsec">इशारे — तेज़ी से पढ़ें</div><div style="margin:0 12px">${gestureHTML()}</div>
<div class="tiles" style="margin-bottom:20px"><button class="tile wide" data-act="shareapp"><svg><use href="#i-share"/></svg><span><b>मित्रों को भेजें</b><small>इब्रानी सीखने वालों के साथ यह मुफ़्त ऐप शेयर करें</small></span></button></div>`;
    try {
      const d = await getChapter(vb, +vc), v = d.v.find(x => x[0] === +vv) || d.v[0];
      $('.hh', el).textContent = hebOf(v[2]); $('.ht', el).textContent = v[1];
      el._votd = { k: vk, ref: refName(vk), heb: hebOf(v[2]), hi: v[1] };
    } catch { $('.hh', el).textContent = ''; }
  }
  $('#v-home').addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-act],[data-tab]'); if (!t) return; buzz();
    if (t.dataset.go) location.hash = t.dataset.go;
    else if (t.dataset.tab) location.hash = t.dataset.tab;
    else {
      const a = t.dataset.act, vo = $('#v-home')._votd;
      if (a === 'books') openPicker('books');
      if (a === 'lexi') $('#btnLex').click();
      if (a === 'shareapp') shareApp();
      if (a === 'vcard' && vo) openCard(vo);
      if (a === 'vfav' && vo) toggleFav(vo);
    }
  });

  // ---------- search ----------
  let sMode = 'all', sT = null, savedMode = 'fav';
  function setMode(m) { sMode = m; $$('#smode button').forEach(b => b.classList.toggle('on', b.dataset.m === m)); }
  $('#smode').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { buzz(); setMode(b.dataset.m); doSearch(); } };
  $('#q').addEventListener('input', () => { clearTimeout(sT); sT = setTimeout(doSearch, 250); });
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(sT); doSearch(); e.target.blur(); } });
  const deva = s => s.replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
  const noNiq = s => (s || '').normalize('NFD').replace(/[\u0591-\u05C7]/g, '');
  const ENB = { genesis: 'Gen', exodus: 'Exod', psalm: 'Ps', psalms: 'Ps', proverbs: 'Prov', isaiah: 'Isa', jeremiah: 'Jer', daniel: 'Dan', ruth: 'Ruth', job: 'Job', jonah: 'Jonah' };
  function parseRef(q) {
    const m = deva(q).trim().match(/^(.+?)\s*(\d+)(?:\s*[:.\s,]\s*(\d+))?$/); if (!m) return null;
    const nb = m[1].replace(/\s+/g, '').toLowerCase(); if (!nb) return null;
    const flat = b => b.name.replace(/\s+/g, '');
    const bk = index.books.find(b => flat(b) === nb || b.id.toLowerCase() === nb) || book(ENB[nb]) ||
      index.books.find(b => flat(b).startsWith(nb)) || (nb.length >= 2 && index.books.find(b => b.id.toLowerCase().startsWith(nb)));
    if (!bk) return null;
    const c = +m[2]; if (c < 1 || c > bk.chapters) return null;
    return { b: bk.id, c, v: m[3] ? +m[3] : 0 };
  }
  function renderSearchEmpty() {
    const rq = store.get('recentQ', []);
    $('#sres').innerHTML = `<div class="sec">उदाहरण</div><div class="tags">${['उत्पत्ति 37:35', 'भजन 23', 'H430', 'चरवाहा', 'शान्ति', 'שָׁלוֹם', 'Isa 53'].map(x => `<button class="tag" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
${rq.length ? `<div class="sec">हाल की खोजें</div><div class="tags">${rq.map(x => `<button class="tag" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : ''}
<div class="sec">सुझाव</div><div class="card" style="cursor:default">संदर्भ लिखें (उत्पत्ति 1:1, Gen 1 1), स्ट्रॉन्ग संख्या (H7965 या 7965), कोई हिन्दी शब्द (हिन्दी पदों और शब्दार्थ दोनों में खोजा जाएगा) या इब्रानी शब्द।</div>`;
  }
  $('#sres').addEventListener('click', e => {
    const q = e.target.closest('[data-q]'), go = e.target.closest('[data-go]'), sk = e.target.closest('[data-sk]');
    if (q) { $('#q').value = q.dataset.q; doSearch(); }
    else if (sk) openStrong(sk.dataset.sk);
    else if (go) { buzz(); location.hash = go.dataset.go; }
  });
  async function doSearch() {
    const q = $('#q').value.trim(), out = $('#sres');
    if (!q) { renderSearchEmpty(); return; }
    await loadIndex(); await loadLex();
    const parts = [], m = sMode, isNum = /^[hH]?\s*\d{1,4}$/.test(q), isHeb = /[\u0590-\u05FF]/.test(q);
    if (m === 'all' || m === 'ref') {
      const r = parseRef(q);
      if (r) { const k = `${r.b}/${r.c}${r.v ? '/' + r.v : ''}`; parts.push(`<div class="sec">संदर्भ</div><button class="card" data-go="${k}"><div class="r">${esc(refName(k))} खोलें ›</div></button>`); }
      else if (m === 'ref') parts.push('<p class="empty">संदर्भ नहीं पहचाना। उदाहरण: उत्पत्ति 37:35</p>');
    }
    if (m === 'all' || m === 'strong') {
      const ql = q.toLowerCase(), hq = noNiq(q); let hits = [];
      if (isNum) { const n = +q.replace(/\D/g, ''); hits = Object.keys(lex).filter(k => lex[k][0] === n); }
      else if (q.length >= 2 || isHeb) {
        for (const k in lex) {
          const L = lex[k];
          if ((L[3] && L[3].includes(q)) || (isHeb && noNiq(L[1]).includes(hq)) || (/^[a-z ]{3,}$/i.test(q) && (L[4] || '').toLowerCase().includes(ql))) hits.push(k);
        }
        const score = k => { const h = lex[k][3] || '', first = h.split(/[;,]/)[0].trim(); return (first === q || noNiq(lex[k][1]) === hq) ? 0 : h.startsWith(q) ? 1 : 2; };
        hits.sort((a, b) => score(a) - score(b) || ((conc && conc[b] ? 1 : 0) - (conc && conc[a] ? 1 : 0)));
      }
      if (hits.length) parts.push(`<div class="sec">शब्दकोश (${hits.length})</div>${hits.slice(0, m === 'strong' ? 100 : 12).map(k => { const L = lex[k];
        return `<button class="card" data-sk="${esc(k)}"><div class="lexrow"><span class="heb">${esc(L[1])}</span><span class="m"><span class="sn">H${L[0]}</span> · <span style="color:var(--mute)">${esc(L[2])}</span><div class="t">${esc(L[3])}</div></span></div></button>`; }).join('')}`);
      else if (m === 'strong') parts.push('<p class="empty">कोई शब्द नहीं मिला।</p>');
    }
    const wantV = (m === 'all' || m === 'word') && q.length >= 2 && !isNum && !isHeb && !parseRef(q);
    out.innerHTML = parts.join('') + (wantV ? '<div class="sec">हिन्दी पद</div><div id="vres"><p class="loading">खोज रहे हैं…</p></div>' : '') + (!parts.length && !wantV ? '<p class="empty">कुछ नहीं मिला।</p>' : '');
    if (!wantV) return;
    try { await loadIrv(); } catch { $('#vres') && ($('#vres').innerHTML = '<p class="empty">खोज-सूची लोड नहीं हो सकी।</p>'); return; }
    if ($('#q').value.trim() !== q) return;
    const res = []; let n = 0;
    for (const b of index.books) (irv[b.id] || []).forEach((ch, ci) => { for (const [vn, t] of ch) if (t && t.includes(q)) { n++; if (res.length < 200) res.push([b.id, ci + 1, vn, t]); } });
    const hl = t => esc(t).split(esc(q)).join(`<mark>${esc(q)}</mark>`);
    const vr = $('#vres'); if (!vr) return;
    vr.innerHTML = n ? `<p style="color:var(--mute);font-size:.85rem;margin:0 2px">${fmt(n)} पद मिले${n > 200 ? ' — पहले 200 दिखाए गए' : ''}</p>${res.map(([b, c, v, t]) => `<button class="card" data-go="${b}/${c}/${v}"><div class="r">${esc(bname(b))} ${c}:${v}</div><div class="t">${hl(t)}</div></button>`).join('')}` : '<p class="empty">हिन्दी पदों में नहीं मिला।</p>';
    const rq = store.get('recentQ', []).filter(x => x !== q); rq.unshift(q); store.set('recentQ', rq.slice(0, 8));
  }

  // ---------- saved ----------
  $('#svmode').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { buzz(); savedMode = b.dataset.m; renderSaved(); } };
  function renderSaved() {
    $$('#svmode button').forEach(b => b.classList.toggle('on', b.dataset.m === savedMode));
    const L = $('#svlist'), list = store.get(savedMode, []);
    const when = t => new Date(t).toLocaleDateString('hi-IN-u-nu-latn', { day: 'numeric', month: 'short' });
    if (!list.length) { L.innerHTML = `<p class="empty">${{ fav: 'अभी कोई पसंदीदा पद नहीं।<br>पढ़ते समय किसी पद को देर तक दबाएँ → ★ सहेजें।', bm: 'कोई बुकमार्क नहीं।<br>पढ़ते समय ••• बटन → बुकमार्क।', hist: 'इतिहास खाली है।' }[savedMode]}</p>`; return; }
    L.innerHTML = (savedMode === 'hist' ? '<div style="text-align:right"><button class="tag" data-clear>इतिहास साफ़ करें</button></div>' : '') + list.map((x, i) => savedMode === 'fav'
      ? `<div class="card" data-go="${x.k}"><div class="r">${esc(refName(x.k))}</div><div class="t" style="font-family:var(--heb);direction:rtl;font-size:1.15rem;margin:4px 0">${esc(x.heb)}</div><div class="t">${esc(x.hi)}</div>
<div class="acts2"><button data-card="${i}">चित्र कार्ड</button><button data-copy="${i}">कॉपी</button><button data-del="${i}">हटाएँ</button></div></div>`
      : `<div class="card" data-go="${x.k}"><div class="r">${esc(refName(x.k))}</div><div class="t" style="color:var(--mute);font-size:.82rem">${when(x.t)}</div>${savedMode === 'bm' ? `<div class="acts2"><button data-del="${i}">हटाएँ</button></div>` : ''}</div>`).join('');
  }
  $('#svlist').addEventListener('click', e => {
    const list = store.get(savedMode, []), t = e.target;
    if (t.closest('[data-clear]')) { store.set('hist', []); renderSaved(); return; }
    const d = t.closest('[data-del]'); if (d) { list.splice(+d.dataset.del, 1); store.set(savedMode, list); buzz(); renderSaved(); return; }
    const c = t.closest('[data-card]'); if (c) { const x = list[+c.dataset.card]; openCard({ ...x, ref: refName(x.k) }); return; }
    const cp = t.closest('[data-copy]'); if (cp) { const x = list[+cp.dataset.copy]; copyText(`${x.heb}\n\n${x.hi}\n— ${refName(x.k)}\n${SITE}#${x.k}`); return; }
    const g = t.closest('[data-go]'); if (g) location.hash = g.dataset.go;
  });

  // ---------- settings ----------
  function renderSettings() {
    const tg = (k, l, s) => `<label class="row"><span class="lb">${l}${s ? `<small>${s}</small>` : ''}</span><span class="sw"><input type="checkbox" data-k="${k}" ${set[k] ? 'checked' : ''}><span></span></span></label>`;
    $('#v-settings').innerHTML = `<div class="set">
<div class="gt">दिखावट</div><div class="group"><div class="row" style="border:0;padding-bottom:4px"><span class="lb">थीम</span></div><div class="seg" style="margin:0 12px 12px">${[['auto', 'सिस्टम'], ['light', 'हल्का'], ['dark', 'गहरा'], ['sepia', 'सीपिया']].map(([k, l]) => `<button data-t="${k}" class="${set.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div>
<div class="row" style="display:block;border-top:1px solid var(--line)"><span class="lb">अक्षर आकार — <b id="fsv">${Math.round(set.fs * 100)}%</b><small>पढ़ते समय दो उँगलियों से पिंच करके भी बदलें</small></span>
<input type="range" id="fsr" min="70" max="200" step="5" value="${Math.round(set.fs * 100)}"><div class="preview"><div class="w" style="display:inline-flex;cursor:default"><span class="chip v">यो-व | क्रि-क़ल-कथा-3पु.ब</span><span class="g">और उठे</span><span class="h"><span class="pre">וַ</span>יָּקֻמוּ</span><span class="p">${esc(pronOf('वय्·या·कु·मू'))}</span><span class="sn">H6965</span><span class="rt">קוּם</span><span class="rp">कूम</span></div></div></div></div>
<div class="gt">हर शब्द में दिखाएँ</div><div class="group">${tg('chip', 'व्याकरण चिप', 'जैसे सं-पु.ब.सम्ब | 3पु.ए')}${tg('gloss', 'हिन्दी अर्थ')}${tg('pron', 'देवनागरी उच्चारण')}${tg('dots', 'उच्चारण में अक्षर-विभाजन (·)', 'वय्·या·कु·मू')}
${tg('split', 'उपसर्ग / प्रत्यय अलग दिखाएँ', 'וְ (और), בְּ (में) नारंगी में; उच्चारण में वे-ख़ोल')}${tg('sn', 'स्ट्रॉन्ग संख्या')}${tg('root', 'मूल शब्द (धातु)')}${tg('hindi', 'पद के नीचे हिन्दी अनुवाद (IRV)')}</div>
<div class="gt">अनुभव</div><div class="group">${tg('haptic', 'कंपन प्रतिक्रिया', 'स्वाइप और टैप पर हल्का कंपन')}</div>
<div class="gt">इशारे</div>${gestureHTML()}
<div class="gt">डेटा</div><div class="group"><button class="li" data-x="hist" style="padding:13px 14px">इतिहास साफ़ करें</button><button class="li" data-x="reset" style="padding:13px 14px">सभी सेटिंग्स रीसेट करें</button><button class="li" data-x="about" style="padding:13px 14px">स्रोत, लाइसेंस और संस्करण</button></div></div>`;
  }
  $('#v-settings').addEventListener('change', e => { const k = e.target.dataset.k; if (k) { set[k] = e.target.checked; saveSet(); buzz(); if (cur) render(); renderSettings(); } });
  $('#v-settings').addEventListener('input', e => { if (e.target.id === 'fsr') { set.fs = +e.target.value / 100; $('#fsv').textContent = e.target.value + '%'; saveSet(); } });
  $('#v-settings').addEventListener('click', e => {
    const t = e.target.closest('[data-t]'); if (t) { set.theme = t.dataset.t; saveSet(); buzz(); renderSettings(); return; }
    const x = e.target.closest('[data-x]'); if (!x) return;
    if (x.dataset.x === 'hist') { store.set('hist', []); toast('इतिहास साफ़ किया'); }
    if (x.dataset.x === 'reset') { set = Object.assign({}, DEF); saveSet(); if (cur) render(); renderSettings(); toast('सेटिंग्स रीसेट'); }
    if (x.dataset.x === 'about') openAbout();
  });

  // ---------- boot ----------
  window.addEventListener('hashchange', () => { $('#menu').hidden = true; route(); });
  if (!location.hash) history.replaceState(null, '', '#home');
  Promise.all([Ads.init().catch(() => {}), loadIndex(), loadLex()]).finally(route);
  if ('serviceWorker' in navigator && !NATIVE) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
