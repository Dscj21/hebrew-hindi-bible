// Hebrew–Hindi Bible v3 — app shell. i18n (locales/*.json, English default), tabs, interlinear reader, sheets,
// gestures (swipe chapters, pull-down picker, long-press verse, pinch text size, double-tap Strong's, swipe-down sheets),
// Strong's + concordance, search, saved, share cards, streak. No libraries. Links (share/YouTube/store) come from app.json.
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = s => String(s || '').replace(/\//g, '');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const CAP = window.Capacitor, NATIVE = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
  const PLUG = n => NATIVE && CAP.Plugins && CAP.Plugins[n];
  const GZ = NATIVE ? '' : '.gz'; // Android: aapt stores *.json.gz assets inflated as *.json
  const GROUP_N = [5, 12, 5, 5, 12], GROUP_NT = [4, 1, 13, 8, 1];
  const TABS = ['home', 'read', 'search', 'saved', 'settings'];
  const VOTD = ['Gen/1/1', 'Deut/6/4', 'Josh/1/9', 'Ps/23/1', 'Ps/27/1', 'Ps/46/2', 'Ps/91/1', 'Ps/119/105', 'Prov/3/5', 'Isa/40/31',
    'Isa/41/10', 'Isa/53/5', 'Jer/29/11', 'Lam/3/22', 'Mic/6/8', 'Num/6/24', 'Gen/12/2', 'Exod/14/14', 'Ps/34/9', 'Ps/37/4',
    'Ps/103/2', 'Ps/139/14', 'Prov/18/10', 'Isa/26/3', 'Isa/43/2', 'Zeph/3/17', 'Hab/3/19', 'Ps/1/1', 'Jer/33/3', 'Isa/9/6',
    'John/3/16', 'Rom/8/28', 'Phil/4/13', 'Matt/11/28', 'John/14/6', 'Rom/12/2', '1Cor/13/4', 'Eph/2/8', 'Heb/11/1', 'Matt/6/33', 'John/1/1', '2Tim/3/16', 'Gal/2/20', '1John/4/8', 'Rev/21/4'];
  const QUICK = [['Gen', 'בְּרֵאשִׁית'], ['Exod', 'שְׁמוֹת'], ['Deut', 'דְּבָרִים'], ['Ps', 'תְּהִלִּים'], ['Prov', 'מִשְׁלֵי'], ['Isa', 'יְשַׁעְיָהוּ'], ['Ruth', 'רוּת'], ['Jonah', 'יוֹנָה']];
  const QUICK_NT = [['Matt', 'Ματθαῖος'], ['Mark', 'Μᾶρκος'], ['Luke', 'Λουκᾶς'], ['John', 'Ἰωάννης'], ['Acts', 'Πράξεις'], ['Rom', 'Ῥωμαίους'], ['Heb', 'Ἑβραίους'], ['Rev', 'Ἀποκάλυψις']];
  const isGk = w => /^G\d/.test((w && w[3]) || '');
  const noAcc = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/ς/g, 'σ');
  const ico = (n, c = '') => `<svg class="ic${c ? ' ' + c : ''}"><use href="#i-${n}"/></svg>`;

  // ---------- storage & settings ----------
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('hhb.' + k)); return v ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('hhb.' + k, JSON.stringify(v)); } catch {} }
  };
  const DEF = { theme: 'auto', fs: 1, chip: false, gloss: true, pron: true, dots: true, split: true, sn: true, root: false, hindi: true, haptic: true };
  if (!store.get('v3', false)) { const o = store.get('set', {}); delete o.chip; delete o.root; store.set('set', o); store.set('v3', true); }
  let set = Object.assign({}, DEF, store.get('set', {}));
  const mq = matchMedia('(prefers-color-scheme: dark)');
  function applySet() {
    const t = set.theme === 'auto' ? (mq.matches ? 'dark' : 'light') : set.theme;
    document.documentElement.dataset.theme = t;
    const meta = $('meta[name=theme-color]'); if (meta) meta.content = { dark: '#09090b', sepia: '#f8f2e6' }[t] || '#ffffff';
    const SB = PLUG('StatusBar'); if (SB) try { SB.setStyle({ style: t === 'dark' ? 'DARK' : 'LIGHT' }); } catch {}
    document.documentElement.style.setProperty('--fs', set.fs);
    const b = document.body.classList;
    for (const k of ['chip', 'gloss', 'pron', 'sn', 'root', 'hindi']) b.toggle('hide-' + k, !set[k]);
    b.toggle('nosplit', !set.split);
  }
  const saveSet = () => { store.set('set', set); applySet(); };
  mq.addEventListener && mq.addEventListener('change', applySet);
  applySet();

  // ---------- i18n ----------
  let CFG = { shareUrl: '', youtubeUrl: '', playStoreUrl: '', version: '3.0', languages: ['en', 'hi'], defaultLanguage: 'en' };
  let EN = {}, S = {}, LANG = 'en';
  const LOC = {};
  const deep = (a, b) => { const o = Array.isArray(a) ? a.slice() : Object.assign({}, a); for (const k in b) o[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a && typeof a[k] === 'object' ? deep(a[k], b[k]) : b[k]; return o; };
  const pick = (o, k) => k.split('.').reduce((x, p) => (x == null ? x : x[p]), o);
  function t(k, vars) {
    let s = pick(S, k); if (s == null) s = pick(EN, k); if (s == null) return k;
    if (typeof s !== 'string') return s;
    return vars ? s.replace(/\{(\w+)\}/g, (m, n) => (n in vars ? vars[n] : m)) : s;
  }
  const loadLoc = l => LOC[l] || (LOC[l] = fetch(`locales/${l}.json`).then(r => r.json()));
  async function setLang(l) {
    if (!CFG.languages.includes(l)) l = CFG.defaultLanguage || 'en';
    EN = await loadLoc('en'); S = l === 'en' ? EN : deep(EN, await loadLoc(l).catch(() => ({})));
    LANG = l; document.documentElement.lang = l; document.documentElement.dir = (S._meta && S._meta.dir) || 'ltr';
    applyI18n();
  }
  function applyI18n(root = document) {
    $$('[data-i18n]', root).forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-ph]', root).forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $$('[data-i18n-aria]', root).forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    const q = $('#q'); if (q) q.placeholder = t('search.ph');
    document.title = t('app');
  }
  const nf = n => Number(n).toLocaleString(LANG === 'hi' ? 'en-IN' : 'en-US');

  // ---------- feedback ----------
  function buzz(strong) {
    if (!set.haptic) return;
    const H = PLUG('Haptics');
    if (H) H.impact({ style: strong ? 'MEDIUM' : 'LIGHT' }).catch(() => {});
    else if (navigator.vibrate) try { navigator.vibrate(strong ? 18 : 8); } catch {}
  }
  let toastT;
  function toast(msg) {
    const el = $('#toast'); el.textContent = msg; el.classList.add('in');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('in'), 1900);
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
  let index = null, lex = {}, strongs = null, conc = null, irv = null, numKey = null, strongsG = null, concG = null, irvN = null;
  const loadIndex = once(() => getJSON('data/index.json').then(x => (index = x)));
  const loadLex = once(() => getJSON('data/lex.json' + GZ).then(x => (lex = Object.assign(x, lex))).catch(() => lex));
  const loadLexG = once(() => getJSON('data/lexg.json' + GZ).then(x => { Object.assign(lex, x); }));
  const loadStrongsG = once(() => getJSON('data/strongsg.json' + GZ).then(x => (strongsG = x)));
  const loadConcG = once(() => getJSON('data/concg.json' + GZ).then(x => (concG = x)));
  const loadIrvN = once(() => getJSON('data/irvn.json' + GZ).then(x => (irvN = x)));
  const loadIrvAll = () => Promise.all([loadIrv(), loadIrvN()]);
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
  const isNT = id => ((book(id) || {}).t === 'nt');
  const bname = id => (S.books && S.books[id]) || (EN.books && EN.books[id]) || (book(id) || {}).name || id;
  const keyOfNum = n => {
    if (!numKey) { numKey = {}; for (const k in lex) if (k[0] !== 'G' && !(lex[k][0] in numKey)) numKey[lex[k][0]] = k; }
    return numKey[n];
  };
  const mainLemma = w => isGk(w) ? w[3] : (w[3] || '').split('/').filter(x => /^\d/.test(x)).pop();
  const hebOf = ws => ws.map(w => strip(w[0]) + (w[5] ? '־' : ' ')).join('').trim();
  const refName = k => { const [b, c, v] = k.split('/'); return `${bname(b)} ${c}${v ? ':' + v : ''}`; };
  const withUrl = (txt, hash) => CFG.shareUrl ? `${txt}\n${CFG.shareUrl}${hash ? '#' + hash : ''}` : txt;

  // ---------- streak ----------
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function markDay() { const d = store.get('days', []), k = dayKey(); if (d[d.length - 1] !== k) { d.push(k); store.set('days', d.slice(-400)); } }
  function streak() {
    const s = new Set(store.get('days', [])); let n = 0; const d = new Date();
    if (!s.has(dayKey(d))) d.setDate(d.getDate() - 1);
    while (s.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- sheets (stack, swipe-down to close, Android back closes) ----------
  const stack = []; let popWaiters = 0, popResolve = null;
  const shh = title => `<div class="shh"><h3>${title}</h3><button class="icbtn" data-x aria-label="${esc(t('act.close'))}">${ico('x')}</button></div>`;
  function sheet(html, { foot = '', cls = '', onClose = null, title = '' } = {}) {
    const sh = document.createElement('div'), el = document.createElement('section');
    sh.className = 'shade'; el.className = 'sheet ' + cls; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    el.innerHTML = `<div class="grip"></div><div class="sbody">${title ? shh(title) : ''}${html}</div>${foot ? `<div class="foot">${foot}</div>` : ''}`;
    sh.style.zIndex = 50 + stack.length * 2; el.style.zIndex = 51 + stack.length * 2;
    $('#layers').append(sh, el);
    requestAnimationFrame(() => requestAnimationFrame(() => { sh.classList.add('in'); el.classList.add('in'); }));
    sh.addEventListener('click', () => closeTop());
    el.addEventListener('click', e => { if (e.target.closest('[data-x]')) closeTop(); });
    dragDismiss(el, sh);
    stack.push({ el, sh, onClose }); Ads.suspend();
    history.pushState({ sheet: stack.length }, '');
    return el;
  }
  function closeTop(viaPop) {
    const o = stack.pop(); if (!o) return;
    o.el.style.transform = 'translateY(105%)'; o.el.classList.remove('drag'); o.sh.classList.remove('in');
    setTimeout(() => { o.el.remove(); o.sh.remove(); }, 380);
    o.onClose && o.onClose();
    if (!stack.length && $('#menu').hidden) Ads.resume();
    if (!viaPop) { popWaiters++; history.back(); }
  }
  function closeAll() {
    const n = stack.length; if (!n) return Promise.resolve();
    while (stack.length) {
      const o = stack.pop(); o.el.style.transform = 'translateY(105%)'; o.sh.classList.remove('in');
      setTimeout(() => { o.el.remove(); o.sh.remove(); }, 380); o.onClose && o.onClose();
    }
    if ($('#menu').hidden) Ads.resume();
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
      if (e.touches.length > 1 || (!grip && body.scrollTop > 0) || e.target.closest('input,textarea,.seg,.tags,.segc')) { y0 = null; return; }
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
  const listItem = (icon, label, act) => `<button class="li" data-act="${act}">${ico(icon)}<span>${esc(label)}</span></button>`;

  // ---------- routing ----------
  let view = null, cur = null, curV = 1, pendingDir = 0, quietScroll = 0;
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
      for (const tb of TABS) $('#v-' + tb).hidden = tb !== tab;
      $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
      view = tab; if (tab !== 'read') window.scrollTo(0, 0);
    }
    $('#fab').hidden = tab !== 'read';
    $('#top').hidden = tab !== 'read'; $('#top').classList.remove('hid');
    if (tab === 'read' && cur) setTitle();
  }
  const setTitle = () => { $('#titleTxt').textContent = `${bname(cur.b)} ${cur.c}:${curV}`; };
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
  function skeleton() {
    const w = () => `<i><span class="sk" style="width:${44 + Math.random() * 36 | 0}px;height:12px"></span><span class="sk" style="width:${50 + Math.random() * 40 | 0}px;height:30px"></span><span class="sk" style="width:${40 + Math.random() * 30 | 0}px;height:10px"></span></i>`;
    const v = () => `<div class="verse"><span class="sk" style="display:block;width:18px;height:12px;margin-bottom:12px"></span><div class="skw">${Array.from({ length: 6 }, w).join('')}</div>
<span class="sk" style="display:block;height:14px;margin-top:16px"></span><span class="sk" style="display:block;height:14px;width:70%;margin-top:8px"></span></div>`;
    return `<div class="chhead"><span class="sk" style="display:block;width:90px;height:12px"></span><span class="sk" style="display:block;width:160px;height:34px;margin-top:8px"></span></div>${v()}${v()}${v()}`;
  }
  async function loadChapter(b, c, v) {
    const pg = $('#page'), dir = pendingDir; pendingDir = 0;
    const dataP = Promise.all([getChapter(b, c), loadLex(), isNT(b) ? loadLexG().catch(() => {}) : null]);
    if (dir) {
      pg.style.transition = 'transform .2s ease-in, opacity .2s ease-in';
      pg.style.transform = `translateX(${dir > 0 ? -100 : 100}%)`; pg.style.opacity = '.2';
      await sleep(190);
    } else if (!cur || cur.b !== b) pg.innerHTML = skeleton();
    let data;
    try { [data] = await dataP; }
    catch { pg.style.transform = pg.style.opacity = ''; pg.innerHTML = `<p class="empty">${esc(t('read.failed'))}</p>`; return; }
    cur = { b, c, data }; curV = v || 1;
    render();
    document.title = `${bname(b)} ${c} — ${t('app')}`;
    quietScroll = Date.now() + 500;
    if (v) scrollToVerse(v, !dir); else window.scrollTo(0, 0);
    if (dir) {
      pg.style.transition = 'none'; pg.style.transform = `translateX(${dir > 0 ? 60 : -60}%)`; pg.style.opacity = '.2';
      void pg.offsetWidth;
      pg.style.transition = 'transform .34s cubic-bezier(.22,.8,.24,1), opacity .25s';
      pg.style.transform = ''; pg.style.opacity = '';
    }
    $('#top').classList.remove('hid');
    setTitle(); saveLast(); addHistory(); markDay();
    Ads.onChapter();
    for (const d of [1, -1]) { const n = neighbour(d); if (n) { const [nb, nc] = n.split('/'); setTimeout(() => getChapter(nb, +nc).catch(() => {}), 600); } }
  }
  function partsOf(w) {
    if (isGk(w)) return esc(w[0]);
    const tp = w[0].split('/'), mc = (w[4] || '').slice(1).split('/'), lp = (w[3] || '').split('/');
    if (tp.length !== mc.length) return esc(strip(w[0]));
    let li = 0, seenMain = false;
    return tp.map((x, k) => {
      if (mc[k][0] === 'S') return `<span class="suf">${esc(x)}</span>`;
      const l = lp[li++] || '';
      if (/^\d/.test(l)) { seenMain = true; return esc(x); }
      return seenMain ? esc(x) : `<span class="pre">${esc(x)}</span>`;
    }).join('');
  }
  const pronOf = p => { let s = p || ''; if (!set.dots) s = s.replace(/·/g, ''); if (!set.split) s = s.replace(/-/g, ''); return s; };
  function wordHTML(w, i, j) {
    if (isGk(w)) {
      const L = lex[w[3]], chg = set.chip ? Morph.chipL(w, LANG) : null;
      return `<div class="w" data-i="${i}" data-j="${j}" role="button" tabindex="0">${chg ? `<span class="chip${chg.verb ? ' v' : ''}">${esc(chg.t)}</span>` : ''}<span class="g">${esc(w[2])}</span><span class="h gk" lang="grc">${esc(w[0])}</span><span class="p">${esc(pronOf(w[1]))}</span>${set.sn ? `<span class="sn">${esc(w[3])}</span>` : ''}${set.root && L && !L[5] ? `<span class="rt gk">${esc(L[1])}</span><span class="rp">${esc(L[2])}</span>` : ''}</div>`;
    }
    const lems = (w[3] || '').split('/').filter(x => /^\d/.test(x));
    const L = lems.length && lex[lems[lems.length - 1]];
    const sn = lems.map(l => 'H' + parseInt(l)).join(' ');
    const ch = set.chip ? Morph.chipL(w, LANG) : null;
    return `<div class="w" data-i="${i}" data-j="${j}" role="button" tabindex="0">${ch ? `<span class="chip${ch.verb ? ' v' : ''}">${esc(ch.t)}</span>` : ''}<span class="g">${esc(w[2])}</span><span class="h${w[5] ? ' mq' : ''}">${partsOf(w)}</span><span class="p">${esc(pronOf(w[1]))}</span>${sn ? `<span class="sn">${sn}</span>` : ''}${set.root && L && !L[5] ? `<span class="rt">${esc(L[1])}</span><span class="rp">${esc(L[2])}</span>` : ''}</div>`;
  }
  function render() {
    const { data, b, c } = cur, favs = new Set(store.get('fav', []).map(f => f.k)), every = Ads.everyVerses();
    const html = [`<header class="chhead"><span class="over">${esc(bname(b))}</span><h2>${esc(t('picker.chapter'))} ${c}</h2><small>${esc(t('read.verses', { n: data.v.length }))}</small></header>`];
    data.v.forEach(([vn, hi, ws], i) => {
      html.push(`<article class="verse" id="v${vn}" data-i="${i}" data-v="${vn}"><div class="vhead"><span class="vn">${vn}</span>${favs.has(`${b}/${c}/${vn}`) ? '<svg class="vfav"><use href="#i-heart"/></svg>' : ''}</div>
<div class="words">${ws.map((w, j) => wordHTML(w, i, j)).join('')}</div>${hi ? `<p class="hi">${esc(hi)}</p>` : ''}</article>`);
      if (every && (i + 1) % every === 0 && i + 1 < data.v.length) html.push('<div class="ad-slot ad-inline" data-slot="inline"></div>');
    });
    const p = neighbour(-1), n = neighbour(1);
    const lbl = k => esc(bname(k.split('/')[0]) + ' ' + k.split('/')[1]);
    html.push(`<nav class="navbtns"><button data-nav="-1" ${p ? '' : 'disabled'}><small>${ico('chev-l', 'sm')}${esc(t('read.prev'))}</small><b>${p ? lbl(p) : '—'}</b></button><button data-nav="1" ${n ? '' : 'disabled'}><small>${esc(t('read.next'))}${ico('chev-r', 'sm')}</small><b>${n ? lbl(n) : '—'}</b></button></nav>
<p class="credit">${esc(t(data.g ? 'read.creditNT' : 'read.credit'))}<br><a href="#" data-act="about">${esc(t('read.sources'))}</a></p>`);
    $('#page').classList.toggle('grk', !!data.g);
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
    quietScroll = Date.now() + 500; $('#top').classList.remove('hid');
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 60);
    curV = v; if (cur) setTitle();
    if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }
  const saveLast = () => cur && store.set('last', `${cur.b}/${cur.c}/${curV}`);
  function addHistory() {
    const k = `${cur.b}/${cur.c}`, h = store.get('hist', []).filter(x => x.k !== k);
    h.unshift({ k, t: Date.now() }); store.set('hist', h.slice(0, 60));
  }

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
  $('#page').addEventListener('contextmenu', e => { const v = e.target.closest('.verse'); if (v && v.dataset.i) { e.preventDefault(); if (!stack.length) openVerseActions(+v.dataset.i); } });
  const markSel = el => { sel && sel.classList.remove('sel'); sel = el; el && el.classList.add('sel'); };
  function partHTML(p) {
    const L = p.k && lex[p.k];
    if (!L) return `<div class="part"><div class="top"><div><div class="mean">${esc(p.g || '—')}</div><div class="role">${esc(p.m)}</div></div><span class="ph">${esc(p.h)}</span></div></div>`;
    return `<div class="part"><div class="top"><div><div class="mean">${esc(L[3] || '—')}</div><div class="role">${esc(p.m)}</div></div><span class="ph${p.k[0] === 'G' ? ' gk' : ''}">${esc(p.h)}</span></div>
<div class="rootl">${esc(t(p.k[0] === 'G' ? 'word.lemma' : 'word.root'))}: <span${p.k[0] === 'G' ? ' class="gk" lang="grc"' : ''}>${esc(L[1])}</span> · ${esc(L[2])}</div>
<button class="sbtn" data-sk="${esc(p.k)}">${esc(t(p.k[0] === 'G' ? 'word.viewG' : 'word.view', { n: L[0] }))}${ico('chev-r', 'sm')}</button></div>`;
  }
  function openWord(el) {
    const w = wordAt(el), v = cur.data.v[+el.dataset.i];
    markSel(el);
    const ch = Morph.chipL(w, LANG);
    const s = sheet(`<div class="wsh"><div class="g">${esc(w[2])}</div><div class="h${isGk(w) ? ' gk' : ''}">${isGk(w) ? esc(w[0].replace(/[,.·;—]+$/, '')) : partsOf(w)}</div><div class="p">${esc(pronOf(w[1]))}</div>
<span class="chip${ch.verb ? ' v' : ''}">${esc(ch.t)}</span><div class="ref">${esc(bname(cur.b))} ${cur.c}:${v[0]}</div></div>
${Morph.partsL(w, LANG).map(partHTML).join('')}<p class="tipline">${esc(t('read.tipDouble'))}</p>`, { onClose: () => markSel(null) });
    s.addEventListener('click', e => { const b = e.target.closest('[data-sk]'); if (b) openStrong(b.dataset.sk); });
  }

  // ---------- Strong's & concordance ----------
  const posL = p => { const P = t('pos'), q = p || ''; return (P && (P[q] || P[q.split('-').slice(0, 2).join('-')] || P[q.split('-')[0]])) || q || '—'; };
  const linkRefs = s => esc(s).replace(/H0*(\d+)/g, '<a class="lnk" data-sn="$1">H$1</a>').replace(/G0*(\d+)/g, '<a class="lnk" data-sn="G$1">G$1</a>');
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
    const C = k[0] === 'G' ? concG : conc, rows = (C && C[k]) || [];
    return rows.map(([g, dl]) => { let acc = 0; return { g, refs: dl.map(d => (acc += d)) }; });
  }
  const fld = (lb, val) => `<div class="fld"><div class="lb">${esc(lb)}</div><div class="val">${val}</div></div>`;
  async function openStrong(k, onClose) {
    k = String(k); const gk = k[0] === 'G';
    await loadLex(); if (gk) await loadLexG().catch(() => {});
    if (!lex[k] && /^\d+$/.test(k)) k = keyOfNum(+k) || k;
    const L = lex[k] || [parseInt(k.replace(/\D/g, '')), '', '', '', ''], num = L[0];
    const CC = () => (gk ? concG : conc), loadC = gk ? loadConcG : loadConc;
    const el = sheet(`<div class="stb"><div class="sthead"><span class="sk" style="width:90px;height:52px"></span><div class="meta"><span class="sk" style="width:140px;height:18px"></span><span class="sk" style="width:90px;height:14px"></span></div></div>
${'<span class="sk" style="display:block;height:14px;margin:16px 0"></span>'.repeat(5)}</div>`, {
      title: esc(t(gk ? 'st.titleG' : 'st.title', { n: num })),
      foot: `<button class="btn" data-act="copy">${ico('copy', 'sm')}${esc(t('act.copy'))}</button><button class="btn pri" data-act="conc">${esc(t('act.concordance'))}</button>`, onClose });
    let SG;
    try { if (gk) { await loadStrongsG(); SG = strongsG[num] || ['', '', '', '', '', '']; } else { await loadStrongs(); SG = strongs[num] || ['', '', '', '', '', '']; } }
    catch { $('.stb', el).innerHTML = `<p class="empty">${esc(t('st.failed'))}</p>`; return; }
    const draw = () => {
      const rows = concRows(k), total = rows.reduce((a, r) => a + r.refs.length, 0);
      const usage = SG[5] ? (SG[5].length > 170 ? SG[5].slice(0, 170).replace(/[,;]?\s*\S*$/, '') + '…' : SG[5]) : '';
      $('.stb', el).innerHTML = `<div class="sthead"><span class="heb${gk ? ' gk' : ''}"${gk ? ' lang="grc"' : ''}>${esc(L[1])}</span><div class="meta"><span class="tr">${esc(L[2])}<small>${esc(SG[2])}</small></span>
<div class="pills">${gk ? `<span class="pill">${esc(t('st.greek'))}</span>` : ''}<span class="pill">${esc(posL(SG[0]))}</span>${CC() ? `<span class="pill n">${nf(total)}×</span>` : ''}</div></div></div>
${fld(t('st.hindi'), `<span class="big">${esc(L[3] || '—')}</span>`)}
${fld(t('st.defn'), esc(SG[4] || L[4] || '—'))}
${fld(t('st.origin'), LANG === 'hi' && !gk ? `${originHi(SG[3])}${SG[3] ? `<span class="en">${linkRefs(SG[3])}</span>` : ''}` : (SG[3] ? linkRefs(SG[3]) : '—'))}
${fld(t('st.phon'), esc(SG[1] || '—'))}
${fld(t('st.usage'), `${CC() ? esc(t(gk ? 'st.usageNG' : 'st.usageN', { n: nf(total) })) : esc(t('st.loadingCount'))}${usage ? `<span class="en">${esc(t('st.kjv'))}: ${esc(usage)}</span>` : ''}`)}
${rows.length ? fld(`${t('st.translated')} (${rows.length})`, `<div class="tags">${rows.slice(0, 24).map((r, i) => `<button class="tag" data-g="${i}">${esc(r.g || '—')}<b>${r.refs.length}</b></button>`).join('')}</div>`) : ''}`;
    };
    draw();
    if (!CC()) loadC().then(draw).catch(() => {});
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'), sn = e.target.closest('[data-sn]'), tg = e.target.closest('[data-g]');
      if (sn) { openStrong(sn.dataset.sn); return; }
      if (tg) { openConc(k, +tg.dataset.g); return; }
      if (!a) return;
      if (a.dataset.act === 'conc') openConc(k, -1);
      if (a.dataset.act === 'copy') copyText(withUrl(`${t(gk ? 'st.titleG' : 'st.title', { n: num })} — ${L[1]} (${L[2]})\n${t('st.hindi')}: ${L[3]}\n${t('st.pos')}: ${posL(SG[0])}\n${SG[4] || ''}\n— ${t('app')}`));
    });
  }
  const decodeRef = r => { const bi = Math.floor(r / 1e6), c = Math.floor(r / 1000) % 1000, v = r % 1000; return { b: index.books[bi].id, c, v }; };
  const irvText = (b, c, v) => { const src = isNT(b) ? irvN : irv, ch = src && src[b] && src[b][c - 1]; const x = ch && ch.find(y => y[0] === v); return x ? x[1] : ''; };
  async function openConc(k, gi) {
    const gk = String(k)[0] === 'G', L = lex[k] || [parseInt(String(k).replace(/\D/g, ''))];
    const el = sheet(`<div class="cb">${'<span class="sk" style="display:block;height:44px;margin:12px 0"></span>'.repeat(4)}</div>`,
      { title: `${esc(t('act.concordance'))} · ${gk ? 'G' : 'H'}${L[0]} <span class="${gk ? 'gk' : ''}" style="font-family:${gk ? '"Noto Serif Greek",serif' : 'var(--heb)'};font-weight:400">${esc(L[1] || '')}</span>` });
    try { await (gk ? loadConcG() : loadConc()); } catch { $('.cb', el).innerHTML = `<p class="empty">${esc(t('st.failed'))}</p>`; return; }
    const rows = concRows(k);
    let filter = gi, shown = 120;
    const items = () => { const out = []; rows.forEach((r, i) => { if (filter < 0 || filter === i) for (const x of r.refs) out.push([x, r.g]); }); return out.sort((a, b) => a[0] - b[0]); };
    const draw = () => {
      const it = items();
      $('.cb', el).innerHTML = `<div class="tags" style="margin-bottom:8px"><button class="tag${filter < 0 ? ' on' : ''}" data-f="-1">${esc(t('st.all'))}<b>${rows.reduce((a, r) => a + r.refs.length, 0)}</b></button>${rows.slice(0, 30).map((r, i) => `<button class="tag${filter === i ? ' on' : ''}" data-f="${i}">${esc(r.g || '—')}<b>${r.refs.length}</b></button>`).join('')}</div>
${it.slice(0, shown).map(([r, g]) => { const x = decodeRef(r); return `<div class="cc" data-go="${x.b}/${x.c}/${x.v}"><span class="r">${esc(bname(x.b))} ${x.c}:${x.v}</span><span class="gg">${esc(g)}</span><div class="t">${esc(irvText(x.b, x.c, x.v))}</div></div>`; }).join('')}
${it.length > shown ? `<button class="btn" data-more style="width:100%;margin-top:12px">${esc(t('act.more', { n: it.length - shown }))}</button>` : ''}`;
    };
    draw();
    if (gk ? !irvN : !irv) (gk ? loadIrvN() : loadIrv()).then(draw).catch(() => {});
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
    return { k: `${cur.b}/${cur.c}/${vn}`, heb: hebOf(ws), hi, gk: !!cur.data.g };
  }
  const isFav = k => store.get('fav', []).some(x => x.k === k);
  function toggleFav(info) {
    let f = store.get('fav', []); const has = f.some(x => x.k === info.k);
    f = has ? f.filter(x => x.k !== info.k) : [{ k: info.k, heb: info.heb, hi: info.hi, gk: !!info.gk, t: Date.now() }, ...f];
    store.set('fav', f); toast(t(has ? 'verse.favRemoved' : 'verse.favAdded')); buzz();
    return !has;
  }
  function openVerseActions(i) {
    const info = verseInfo(i), fav = isFav(info.k);
    const vEl = document.getElementById('v' + cur.data.v[i][0]);
    const el = sheet(`<p class="hi" style="margin:0 0 12px;font-size:15px;color:var(--mute);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(info.hi)}</p><div class="list">
${listItem('heart', t(fav ? 'verse.unfav' : 'verse.fav'), 'fav')}${listItem('copy', t('verse.copy'), 'copy')}${listItem('image', t('verse.card'), 'card')}${listItem('share', t('verse.link'), 'link')}</div>`,
      { title: esc(refName(info.k)), onClose: () => vEl && vEl.classList.remove('lp') });
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'fav') { toggleFav(info); closeTop(); const y = window.scrollY; render(); window.scrollTo(0, y); }
      if (act === 'copy') { copyText(withUrl(`${info.heb}\n\n${info.hi}\n— ${refName(info.k)}`, info.k)); closeTop(); }
      if (act === 'card') { closeTop(); setTimeout(() => openCard(info), 60); }
      if (act === 'link') { closeTop(); shareText(`${refName(info.k)} — ${info.hi}\n\n${t('card.footer')} · ${t('app')}`, CFG.shareUrl ? CFG.shareUrl + '#' + info.k : ''); }
    });
  }
  async function copyText(s) {
    try { await navigator.clipboard.writeText(s); }
    catch { const ta = document.createElement('textarea'); ta.value = s; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch {} ta.remove(); }
    toast(t('toast.copied')); buzz();
  }
  async function shareText(text, url) {
    const SH = PLUG('Share'), o = { title: t('app'), text }; if (url) o.url = url;
    try {
      if (SH) await SH.share(o);
      else if (navigator.share) await navigator.share(o);
      else await copyText(url ? text + ' ' + url : text);
    } catch {}
  }
  // verse share card: 1080x1350 PNG, content measured then vertically centred
  function wrap(ctx, text, maxW) {
    const words = text.split(/\s+/).filter(Boolean), lines = []; let line = '';
    for (const w of words) { const s = line ? line + ' ' + w : w; if (ctx.measureText(s).width > maxW && line) { lines.push(line); line = w; } else line = s; }
    if (line) lines.push(line); return lines;
  }
  function fit(ctx, text, font, size, min, maxW, maxH, lh) {
    let s = size, lines = [];
    for (; s >= min; s -= 2) { ctx.font = font.replace('{s}', s); lines = wrap(ctx, text, maxW); if (lines.length * s * lh <= maxH) break; }
    return { s: Math.max(s, min), lines };
  }
  async function drawCard(info) {
    const ref = refName(info.k), UI = '"Inter", "Noto Sans Devanagari", sans-serif';
    const gk = info.gk || isNT(info.k.split('/')[0]), HF = gk ? '"Noto Serif Greek", "Noto Serif", serif' : '"Noto Serif Hebrew", serif';
    try { await Promise.all([document.fonts.load(`56px ${gk ? '"Noto Serif Greek"' : '"Noto Serif Hebrew"'}`, info.heb), document.fonts.load('500 44px "Noto Sans Devanagari"', (info.hi || '') + ref), document.fonts.load('600 30px "Inter"', 'A')]); } catch {}
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    x.fillStyle = '#0d0d12'; x.fillRect(0, 0, W, H);
    const rg = x.createRadialGradient(W * .9, 0, 20, W * .9, 0, 900); rg.addColorStop(0, 'rgba(99,102,241,.45)'); rg.addColorStop(1, 'rgba(99,102,241,0)');
    x.fillStyle = rg; x.fillRect(0, 0, W, H);
    const rg2 = x.createRadialGradient(0, H, 20, 0, H, 700); rg2.addColorStop(0, 'rgba(139,92,246,.22)'); rg2.addColorStop(1, 'rgba(139,92,246,0)');
    x.fillStyle = rg2; x.fillRect(0, 0, W, H);
    // header
    x.fillStyle = '#6366f1'; x.beginPath(); if (x.roundRect) x.roundRect(90, 90, 64, 64, 18); else x.rect(90, 90, 64, 64); x.fill();
    x.fillStyle = '#fff'; x.font = `700 38px ${HF}`; x.textAlign = 'center'; x.fillText(gk ? 'Ω' : 'א', 122, 136);
    x.textAlign = 'left'; x.font = `600 30px ${UI}`; x.fillStyle = 'rgba(255,255,255,.92)'; x.fillText(t('app'), 176, 133);
    // measure body
    const maxW = W - 180;
    const hb = fit(x, info.heb, `{s}px ${HF}`, gk ? 58 : 66, 30, maxW, 440, 1.55);
    const hh = fit(x, info.hi || '', `400 {s}px ${UI}`, 46, 26, maxW, 440, 1.6);
    const hH = hb.lines.length * hb.s * 1.55, hhH = hh.lines.length * hh.s * 1.6, gap = 70, refH = 60;
    const total = hH + gap + hhH + 50 + refH, top = 200, bottom = H - 200;
    let y = top + Math.max(0, (bottom - top - total) / 2);
    x.font = `${hb.s}px ${HF}`; x.fillStyle = '#ffffff'; x.textAlign = gk ? 'left' : 'right'; x.direction = gk ? 'ltr' : 'rtl';
    for (const l of hb.lines) { y += hb.s * 1.2; x.fillText(l, gk ? 90 : W - 90, y); y += hb.s * .35; }
    x.direction = 'ltr'; x.textAlign = 'left';
    y += gap / 2; x.fillStyle = '#818cf8'; x.fillRect(90, y - 3, 72, 5); y += gap / 2;
    x.font = `400 ${hh.s}px ${UI}`; x.fillStyle = 'rgba(255,255,255,.88)';
    for (const l of hh.lines) { y += hh.s * 1.2; x.fillText(l, 90, y); y += hh.s * .4; }
    y += 50; x.font = `600 38px ${UI}`; x.fillStyle = '#a5b4fc'; x.fillText(ref, 90, y + 30);
    // footer
    x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(90, H - 150, W - 180, 2);
    x.font = `500 28px ${UI}`; x.fillStyle = 'rgba(255,255,255,.65)'; x.fillText(t(gk ? 'card.footerNT' : 'card.footer'), 90, H - 92);
    if (CFG.shareUrl) { x.textAlign = 'right'; x.fillStyle = 'rgba(255,255,255,.5)'; x.fillText(CFG.shareUrl.replace(/^https?:\/\//, '').replace(/\/$/, ''), W - 90, H - 92); x.textAlign = 'left'; }
    return cv;
  }
  async function openCard(info) {
    const el = sheet(`<div class="cardp"><div class="sk" style="aspect-ratio:4/5;border-radius:18px"></div></div>`, {
      title: esc(t('card.title')),
      foot: `<button class="btn" data-act="save">${ico('arrow-up', 'sm')}${esc(t('card.save'))}</button><button class="btn pri" data-act="share">${ico('share', 'sm')}${esc(t('card.share'))}</button>` });
    const cv = await drawCard(info), url = cv.toDataURL('image/png');
    $('.cardp', el).innerHTML = `<img class="share-prev" src="${url}" alt="${esc(refName(info.k))}">`;
    const text = withUrl(`${refName(info.k)} — ${info.hi}`, info.k);
    el.addEventListener('click', async e => {
      const a = e.target.closest('[data-act]'); if (!a) return; buzz();
      const name = `hebrew-hindi-${info.k.replace(/\//g, '-')}.png`;
      if (a.dataset.act === 'share') {
        const SH = PLUG('Share'), F = PLUG('Filesystem');
        if (SH && F) {
          try { const r = await F.writeFile({ path: name, data: url.split(',')[1], directory: 'CACHE' }); await SH.share({ title: t('app'), text, files: [r.uri] }); return; } catch (err) { console.warn(err); }
        }
        try {
          const blob = await new Promise(r => cv.toBlob(r, 'image/png')), file = new File([blob], name, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: t('app') }); return; }
        } catch (err) { if (err && err.name === 'AbortError') return; }
        download(url, name); toast(t('card.savedShare'));
      } else {
        const F = PLUG('Filesystem');
        if (F) { try { await F.writeFile({ path: 'Pictures/' + name, data: url.split(',')[1], directory: 'DOCUMENTS', recursive: true }); toast(t('card.saved')); return; } catch (err) { console.warn(err); } }
        download(url, name); toast(t('card.saved'));
      }
    });
  }
  const download = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };

  // ---------- picker (book → chapter → verse) ----------
  async function openPicker(step) {
    await loadIndex();
    const st = { b: cur ? cur.b : 'Gen', c: cur ? cur.c : 1 };
    st.t = isNT(st.b) ? 'nt' : 'ot';
    const el = sheet('<div class="picker"></div>', { cls: 'pk' });
    const box = $('.picker', el);
    const books = () => {
      box.innerHTML = `${shh(esc(t('picker.books')))}<div class="tswitch" role="tablist">${['ot', 'nt'].map(x => `<button data-tt="${x}" role="tab" aria-selected="${st.t === x}" class="${st.t === x ? 'on' : ''}">${esc(t('picker.' + x))}</button>`).join('')}</div><div class="sbox" style="margin:0 0 4px">${ico('search', 'sm')}<input id="pkq" placeholder="${esc(t('picker.find'))}" autocomplete="off"></div><div class="pkl"></div>`;
      const list = () => {
        let i = 0; const v = $('#pkq', box).value.trim().toLowerCase();
        const match = b => !v || bname(b.id).toLowerCase().includes(v) || b.name.includes(v) || (EN.books[b.id] || '').toLowerCase().includes(v) || b.id.toLowerCase().startsWith(v);
        const tests = v ? ['ot', 'nt'] : [st.t];
        $('.pkl', box).innerHTML = tests.map(tt => { const list0 = index.books.filter(b => (b.t || 'ot') === tt), groups = t(tt === 'nt' ? 'picker.groupsNT' : 'picker.groups'); i = 0;
          return (tt === 'nt' ? GROUP_NT : GROUP_N).map((n, gi) => { const bs = list0.slice(i, i += n).filter(match);
          return bs.length ? `<div class="pkgroup">${esc(groups[gi])}</div><div class="blist">${bs.map(b => `<button data-b="${b.id}" class="${b.id === st.b ? 'cur' : ''}"><span>${esc(bname(b.id))}</span><small>${b.chapters}</small></button>`).join('')}</div>` : ''; }).join(''); }).join('');
      };
      list(); $('#pkq', box).oninput = list;
    };
    const head = (back, title) => `<div class="pkhead"><button class="back" data-step="${back}">${ico('chev-l', 'sm')}${esc(back === 'books' ? t('picker.books') : bname(st.b))}</button><h3>${esc(title)}</h3></div>`;
    const chapters = () => {
      const b = book(st.b);
      box.innerHTML = `${head('books', bname(st.b))}<div class="pkgroup">${esc(t('picker.chapters'))}</div>
<div class="grid">${Array.from({ length: b.chapters }, (_, k) => `<button data-c="${k + 1}" class="${cur && st.b === cur.b && k + 1 === cur.c ? 'cur' : ''}">${k + 1}</button>`).join('')}</div>`;
    };
    const verses = async () => {
      const hd = head('chapters', `${t('picker.chapter')} ${st.c}`);
      box.innerHTML = hd + `<div class="grid">${'<span class="sk" style="aspect-ratio:1;border-radius:14px"></span>'.repeat(12)}</div>`;
      let d; try { d = await getChapter(st.b, st.c); } catch { box.innerHTML = hd + `<p class="empty">${esc(t('read.failed'))}</p>`; return; }
      box.innerHTML = `${hd}<div class="pkgroup">${esc(t('picker.verses'))}</div><div class="grid">${d.v.map(v => `<button data-v="${v[0]}" class="${cur && st.b === cur.b && st.c === cur.c && v[0] === curV ? 'cur' : ''}">${v[0]}</button>`).join('')}</div>`;
    };
    (step === 'books' ? books : chapters)();
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.hasAttribute('data-x')) return;
      if (b.dataset.tt) { st.t = b.dataset.tt; buzz(); books(); return; }
      if (b.dataset.step === 'books') books();
      else if (b.dataset.step === 'chapters') chapters();
      else if (b.dataset.b) { st.b = b.dataset.b; buzz(); chapters(); }
      else if (b.dataset.c) { st.c = +b.dataset.c; buzz(); verses(); }
      else if (b.dataset.v) { buzz(); const k = `${st.b}/${st.c}/${b.dataset.v}`; closeAll().then(() => { location.hash = k; }); }
    });
  }

  // ---------- gestures on the reader ----------
  let G = null, lpT = null;
  const pull = $('#pull'), page = $('#page');
  const dist = x => Math.hypot(x[0].clientX - x[1].clientX, x[0].clientY - x[1].clientY);
  const cancelLP = () => { clearTimeout(lpT); lpT = null; };
  document.addEventListener('touchstart', e => {
    if (e.target.closest('#layers,#tabs,.pop,#fab,input,textarea,#langpick')) { G = null; return; }
    const inRead = view === 'read' && !!e.target.closest('#v-read');
    if (e.touches.length === 2 && inRead) { cancelLP(); clearTimeout(tapT); G = { mode: 'pinch', d0: dist(e.touches), fs0: set.fs, fs: set.fs }; page.style.transform = ''; return; }
    if (e.touches.length !== 1) { G = null; return; }
    const p = e.touches[0];
    G = { x0: p.clientX, y0: p.clientY, t0: Date.now(), mode: null, top: window.scrollY <= 2, inRead: inRead || (view === 'read' && !!e.target.closest('#top')), inHead: !!e.target.closest('#top') };
    suppressClick = false;
    const vEl = inRead && e.target.closest('.verse');
    if (vEl && vEl.dataset.i && !stack.length) lpT = setTimeout(() => {
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
    const p = e.touches[0], dx = p.clientX - G.x0, dy = p.clientY - G.y0;
    if (!G.mode) {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
      cancelLP();
      if (G.inRead && !G.inHead && Math.abs(dx) > Math.abs(dy) * 1.3) G.mode = 'swipe';
      else if (G.inRead && (G.top || G.inHead) && dy > 0 && dy > Math.abs(dx)) G.mode = 'pull';
      else G.mode = 'scroll';
    }
    if (G.mode === 'swipe') {
      const has = neighbour(dx < 0 ? 1 : -1), tx = has ? dx : dx * 0.25;
      page.style.transition = 'none'; page.style.transform = `translateX(${tx}px)`; page.style.opacity = String(1 - Math.min(0.5, Math.abs(tx) / innerWidth));
    } else if (G.mode === 'pull') {
      if (window.scrollY > 2 && !G.inHead) { G.mode = 'scroll'; resetPull(); return; }
      const q = Math.min(dy * 0.55, 110), ready = q >= 64;
      $('b', pull).textContent = t('picker.books') + ' · ' + t('picker.chapters');
      pull.style.transition = 'none'; pull.style.transform = `translateY(${q - 60}px)`; pull.style.opacity = String(Math.min(1, q / 50));
      if (ready !== G.ready) { G.ready = ready; pull.classList.toggle('ready', ready); if (ready) buzz(); }
    }
  }, { passive: true });
  function resetPull() { pull.style.transition = 'transform .25s, opacity .25s'; pull.style.transform = ''; pull.style.opacity = ''; pull.classList.remove('ready'); }
  const springBack = () => { page.style.transition = 'transform .3s cubic-bezier(.22,.8,.24,1), opacity .2s'; page.style.transform = ''; page.style.opacity = ''; };
  function touchEnd(e) {
    cancelLP();
    if (!G) return;
    const g = G;
    if (g.mode === 'pinch') { G = null; set.fs = Math.round(g.fs * 20) / 20; saveSet(); toast(t('toast.size', { n: Math.round(set.fs * 100) })); return; }
    if (e.touches && e.touches.length) return;
    G = null;
    const p = e.changedTouches && e.changedTouches[0];
    if (!p || e.type === 'touchcancel') { if (g.mode === 'swipe') springBack(); resetPull(); return; }
    const dx = p.clientX - g.x0, dt = Date.now() - g.t0;
    if (g.mode === 'swipe') {
      const d = dx < 0 ? 1 : -1;
      if (neighbour(d) && (Math.abs(dx) > innerWidth * 0.22 || Math.abs(dx) / dt > 0.45)) { buzz(); go(d); }
      else springBack();
    } else if (g.mode === 'pull') { if (g.ready) { buzz(true); openPicker(); } resetPull(); }
  }
  document.addEventListener('touchend', touchEnd, { passive: true });
  document.addEventListener('touchcancel', touchEnd, { passive: true });
  // top bar + FAB hide on scroll down, reappear on scroll up
  let lastY = 0;
  window.addEventListener('scroll', () => {
    const y = window.scrollY; if (Date.now() < quietScroll) { lastY = y; return; } if (Math.abs(y - lastY) < 6) return;
    const down = y > lastY && y > 120;
    $('#fab').classList.toggle('hide', down); $('#top').classList.toggle('hid', down && view === 'read' && !stack.length);
    lastY = y;
  }, { passive: true });

  // ---------- top bar, menu, tabs, FAB, Aa ----------
  $('#title').onclick = () => { buzz(); openPicker('chapters'); };
  $$('#tabs button').forEach(b => b.onclick = () => {
    buzz(); const tb = b.dataset.tab;
    if (tb === view) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    location.hash = tb === 'read' ? lastRef() : tb;
  });
  const MENU = [['settings', 'settings'], ['faq', 'help'], ['new', 'sparkle'], ['share', 'share'], ['rate', 'star'], ['about', 'info']];
  const drawMenu = () => { $('#menu').innerHTML = MENU.map(([k, i]) => `<button data-m="${k}">${ico(i)}<span>${esc(t('menu.' + k))}</span></button>`).join(''); };
  const menuShow = on => { $('#menu').hidden = !on; if (on) Ads.suspend(); else if (!stack.length) Ads.resume(); };
  $('#btnMenu').onclick = e => { e.stopPropagation(); drawMenu(); menuShow($('#menu').hidden); };
  document.addEventListener('click', e => { if (!e.target.closest('#menu') && !$('#menu').hidden) menuShow(false); });
  const shareApp = () => shareText(`${t('app')} — ${t('tagline')}`, CFG.shareUrl || CFG.playStoreUrl || '');
  const rateApp = () => {
    if (CFG.playStoreUrl) window.open(CFG.playStoreUrl, '_blank', 'noopener');
    else if (NATIVE) window.open('market://details?id=in.hebrewhindi.bible', '_system');
    else toast(t('toast.soon'));
  };
  $('#menu').addEventListener('click', e => {
    const m = e.target.closest('[data-m]'); if (!m) return; menuShow(false);
    ({ settings: () => (location.hash = 'settings'), faq: openFAQ, new: openNew, about: openAbout, share: shareApp, rate: rateApp }[m.dataset.m] || (() => {}))();
  });
  // Aa: quick display sheet
  const tgRow = (k, l, s) => `<label class="row"><span class="lb">${esc(l)}${s ? `<small>${esc(s)}</small>` : ''}</span><span class="sw"><input type="checkbox" data-k="${k}" ${set[k] ? 'checked' : ''}><span></span></span></label>`;
  const themeSeg = () => `<div class="segc">${['auto', 'light', 'dark', 'sepia'].map(k => `<button data-t="${k}" class="${set.theme === k ? 'on' : ''}">${esc(t('set.themes.' + k))}</button>`).join('')}</div>`;
  const sizeRow = () => `<div class="range"><span style="font-size:14px">A</span><input type="range" class="fsr" min="70" max="200" step="5" value="${Math.round(set.fs * 100)}"><span style="font-size:22px">A</span></div>`;
  function openAa() {
    const el = sheet(`<div class="group" style="background:var(--card2);padding:12px">${themeSeg()}${sizeRow()}</div>
<div class="gt" style="margin:20px 4px 8px">${esc(t('set.words'))}</div><div class="group" style="background:var(--card2)">${tgRow('gloss', t('set.gloss'))}${tgRow('pron', t('set.pron'))}${tgRow('sn', t('set.sn'))}${tgRow('chip', t('set.chip'))}${tgRow('root', t('set.root'))}${tgRow('hindi', t('set.hindi'))}</div>`, { title: esc(t('set.appearance')) });
    el.addEventListener('change', e => { const k = e.target.dataset.k; if (k) { set[k] = e.target.checked; saveSet(); buzz(); if (cur) { const y = scrollY; render(); scrollTo(0, y); } } });
    el.addEventListener('input', e => { if (e.target.classList.contains('fsr')) { set.fs = +e.target.value / 100; saveSet(); } });
    el.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) { set.theme = b.dataset.t; saveSet(); buzz(); $$('[data-t]', el).forEach(x => x.classList.toggle('on', x === b)); } });
  }
  $('#btnAa').onclick = () => { buzz(); openAa(); };
  $('#fab').onclick = () => {
    buzz(); if (!cur) return;
    const k = `${cur.b}/${cur.c}`, has = store.get('bm', []).some(x => x.k === k);
    const el = sheet(`<div class="list">${listItem('bookmark', t(has ? 'bm.remove' : 'bm.add'), 'bm')}
${listItem('heart', t('bm.favs'), 'fav')}${listItem('clock', t('bm.hist'), 'hist')}${listItem('type', t('bm.size'), 'aa')}${listItem('arrow-up', t('bm.top'), 'top')}</div>`, { title: esc(`${bname(cur.b)} ${cur.c}`) });
    el.addEventListener('click', e => {
      const a = e.target.closest('[data-act]'); if (!a) return; const act = a.dataset.act;
      if (act === 'bm') { let b = store.get('bm', []); b = has ? b.filter(x => x.k !== k) : [{ k, t: Date.now() }, ...b]; store.set('bm', b); toast(t(has ? 'bm.removed' : 'bm.added')); buzz(); closeTop(); }
      if (act === 'fav' || act === 'hist') { savedMode = act; closeAll().then(() => (location.hash = 'saved')); }
      if (act === 'aa') { closeTop(); setTimeout(openAa, 80); }
      if (act === 'top') { closeTop(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (stack.length) closeTop(); if (!$('#menu').hidden) menuShow(false); return; }
    if (stack.length || view !== 'read' || /INPUT|TEXTAREA/.test(e.target.tagName)) return;
    if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1);
  });

  // ---------- info sheets ----------
  function openAbout() {
    sheet(`<div class="about"><p>${esc(t('about.body', { app: t('app') }))}</p><p class="s">${esc(t('about.heb'))}</p><p class="s">${esc(t('about.lex'))}</p><p class="s">${esc(t('about.gnt'))}</p><p class="s">${esc(t('about.irv'))}</p>
<p class="s">${esc(t('about.ours'))}</p><p class="s">${esc(t('about.fonts'))}</p><p class="s">${esc(t('set.version', { v: CFG.version }))}</p></div>`, { title: esc(t('about.title')) });
  }
  const gestureHTML = () => `<div class="group">${t('g').map(([a, b]) => `<div class="row"><span class="lb">${esc(a)}<small>${esc(b)}</small></span></div>`).join('')}</div>`;
  function openFAQ() {
    sheet(`${t('faq').map(([q, a]) => `<div class="part"><div class="mean">${esc(q)}</div><div style="margin-top:6px;color:var(--ink2);font-size:14.5px;line-height:1.6">${esc(a)}</div></div>`).join('')}
<div class="gt" style="margin:20px 4px 8px">${esc(t('set.gestures'))}</div><div style="background:var(--card2);border-radius:var(--r)">${gestureHTML()}</div>`, { title: esc(t('menu.faq')) });
  }
  function openNew() {
    sheet(`<div class="list">${t('new').map(s => `<div class="li" style="cursor:default">${ico('check')}<span>${esc(s)}</span></div>`).join('')}</div>`, { title: esc(t('menu.new')) + ' · ' + esc(CFG.version) });
  }

  // ---------- home ----------
  const greet = () => { const h = new Date().getHours(); return t('greet.' + (h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night')); };
  function weekHTML() {
    const s = new Set(store.get('days', [])), d = new Date(), out = [];
    d.setDate(d.getDate() - 6);
    for (let i = 0; i < 7; i++) {
      const k = dayKey(d), on = s.has(k), today = i === 6;
      out.push(`<div><i class="${on ? 'on' : ''}${today ? ' today' : ''}">${on ? ico('check') : ''}</i>${esc(d.toLocaleDateString(LANG === 'hi' ? 'hi-IN' : 'en-US', { weekday: 'narrow' }))}</div>`);
      d.setDate(d.getDate() + 1);
    }
    return out.join('');
  }
  async function renderHome() {
    const last = lastRef(), [lb, lc] = last.split('/'), lbk = book(lb) || { chapters: 1 };
    const started = !!store.get('hist', []).length;
    const vk = VOTD[Math.floor(Date.now() / 864e5) % VOTD.length];
    const n = streak(), favN = store.get('fav', []).length, bmN = store.get('bm', []).length;
    const qb = QUICK.find(q => q[0] === lb) || QUICK_NT.find(q => q[0] === lb), lbg = isNT(lb);
    const ht = store.get('homeT', lbg ? 'nt' : 'ot'), QL = ht === 'nt' ? QUICK_NT : QUICK, vgk = isNT(vk.split('/')[0]);
    const el = $('#v-home');
    el.innerHTML = `<header class="hhead"><div><div class="over">${esc(greet())}</div><h1>${esc(t('app'))}</h1></div>
<button class="streak${n ? ' on' : ''}" data-act="streak" aria-label="${esc(t('home.streak', { n }))}">${ico('flame')}${n}</button></header>
<article class="votd"><div class="lbl">${ico('sparkle')}${esc(t('home.votd'))}</div>
<div class="sk-votd"><span class="sk" style="display:block;height:28px;margin-top:16px"></span><span class="sk" style="display:block;height:28px;width:75%;margin-left:auto"></span><span class="sk" style="display:block;height:16px;margin-top:18px"></span><span class="sk" style="display:block;height:16px;width:60%"></span></div>
<div class="hh${vgk ? ' gk' : ''}" ${vgk ? 'lang="grc" ' : ''}hidden></div><div class="ht" hidden></div><div class="hr">${esc(refName(vk))}</div>
<div class="vrow"><button class="btn pri" data-go="${vk}">${esc(t('act.read'))}</button><span class="sp"></span>
<button class="icbtn" data-act="vfav" aria-label="${esc(t('act.save'))}">${ico('heart')}</button><button class="icbtn" data-act="vcard" aria-label="${esc(t('act.share'))}">${ico('share')}</button></div></article>
<section class="section"><div class="stitle"><h2>${esc(t(started ? 'home.cont' : 'home.start'))}</h2></div>
<button class="card cont" data-go="${last}"><span class="bk${lbg ? ' gk' : ''}">${esc(qb ? qb[1].normalize('NFD').replace(/[\u0591-\u05C7\u0300-\u036f]/g, '')[0] : (lbg ? 'Ω' : 'א'))}</span><span class="m"><small>${esc(bname(lb))}</small><b>${esc(refName(last))}</b>
<span class="bar"><i style="width:${Math.max(4, Math.round(+lc / lbk.chapters * 100))}%"></i></span><small style="display:block;margin-top:6px">${esc(t('home.chapterOf', { c: lc, n: lbk.chapters }))}</small></span>${ico('chev-r')}</button></section>
<section class="section"><div class="stitle"><h2>${esc(t('home.books'))}</h2><button data-act="books">${esc(t('home.seeAll'))}</button></div>
<div class="tswitch" role="tablist" aria-label="${esc(t('home.testament'))}">${['ot', 'nt'].map(x => `<button data-act="t-${x}" role="tab" aria-selected="${ht === x}" class="${ht === x ? 'on' : ''}">${esc(t('picker.' + x))}</button>`).join('')}</div>
<div class="hscroll">${QL.map(([id, h]) => { const b = book(id); return `<button class="btile" data-go="${id}/1"><div class="hn${ht === 'nt' ? ' gk' : ''}"${ht === 'nt' ? ' lang="grc"' : ''}>${esc(h)}</div><b>${esc(bname(id))}</b><small>${esc(t('picker.chapters'))} · ${b ? b.chapters : ''}</small></button>`; }).join('')}</div></section>
<section class="section"><div class="card" style="cursor:default"><div class="rowcard"><span class="ib" style="background:#fff1e6;color:#ea580c">${ico('flame')}</span><span class="m"><b>${esc(n > 1 ? t('home.streak', { n }) : n === 1 ? t('home.streak1') : t('home.streak0'))}</b></span></div><div class="week">${weekHTML()}</div></div></section>
<section class="section"><div class="stitle"><h2>${esc(t('home.explore'))}</h2></div><div class="grid2">
<button class="qt" data-act="lexi"><span class="ib">${ico('alpha')}</span><b>${esc(t('home.lexicon'))}</b><small>${esc(t('home.lexiconSub', { n: nf(Object.keys(lex).length || 8674) }))}</small></button>
<button class="qt" data-tab="search"><span class="ib">${ico('search')}</span><b>${esc(t('tab.search'))}</b><small>${esc(t('home.searchSub'))}</small></button>
<button class="qt" data-tab="saved"><span class="ib">${ico('bookmark')}</span><b>${esc(t('tab.saved'))}</b><small>${esc(t('home.savedSub', { f: favN, b: bmN }))}</small></button>
<button class="qt" data-act="learn"><span class="ib">${ico('help')}</span><b>${esc(t('home.learn'))}</b><small>${esc(t('set.gestures'))} · FAQ</small></button>
${CFG.youtubeUrl ? `<button class="qt" data-act="yt" style="grid-column:1/-1"><span class="ib" style="background:#ffe9e9;color:#dc2626">${ico('play')}</span><b>${esc(t('home.watch'))}</b><small>${esc(t('home.watchSub'))}</small></button>` : ''}</div></section>
<section class="section" style="margin-bottom:28px"><button class="card" data-act="shareapp"><div class="rowcard"><span class="ib">${ico('share')}</span><span class="m"><b>${esc(t('home.shareTitle'))}</b><small>${esc(t('home.shareSub'))}</small></span>${ico('chev-r')}</div></button></section>`;
    try {
      const [vb, vc, vv] = vk.split('/'), d = await getChapter(vb, +vc), v = d.v.find(x => x[0] === +vv) || d.v[0];
      if (view !== 'home') return;
      const hh = $('.hh', el), ht = $('.ht', el);
      hh.textContent = hebOf(v[2]); ht.textContent = v[1]; hh.hidden = ht.hidden = false; $('.sk-votd', el).remove();
      el._votd = { k: vk, heb: hebOf(v[2]), hi: v[1], gk: vgk };
      if (isFav(vk)) $('[data-act=vfav]', el).classList.add('on');
    } catch { const s = $('.sk-votd', el); s && s.remove(); }
  }
  $('#v-home').addEventListener('click', e => {
    const b = e.target.closest('[data-go],[data-act],[data-tab]'); if (!b) return; buzz();
    if (b.dataset.go) location.hash = b.dataset.go;
    else if (b.dataset.tab) location.hash = b.dataset.tab;
    else {
      const a = b.dataset.act, vo = $('#v-home')._votd;
      if (a === 'books') openPicker('books');
      if (a === 't-ot' || a === 't-nt') { store.set('homeT', a.slice(2)); const y = scrollY; renderHome(); scrollTo(0, y); }
      if (a === 'lexi') { setMode('strong'); location.hash = 'search'; setTimeout(() => $('#q').focus(), 80); }
      if (a === 'shareapp') shareApp();
      if (a === 'learn') openFAQ();
      if (a === 'yt' && CFG.youtubeUrl) window.open(CFG.youtubeUrl, '_blank', 'noopener');
      if (a === 'vcard' && vo) openCard(vo);
      if (a === 'vfav' && vo) { const on = toggleFav(vo); b.classList.toggle('on', on); }
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
  const ENB = { psalm: 'Ps', song: 'Song', songofsongs: 'Song', songofsolomon: 'Song' };
  function parseRef(q) {
    const m = deva(q).trim().match(/^(.+?)\s*(\d+)(?:\s*[:.\s,]\s*(\d+))?$/); if (!m) return null;
    const nb = m[1].replace(/\s+/g, '').toLowerCase(); if (!nb) return null;
    const names = b => [b.name, EN.books[b.id] || '', S.books[b.id] || ''].map(x => x.replace(/\s+/g, '').toLowerCase());
    const bk = index.books.find(b => names(b).includes(nb) || b.id.toLowerCase() === nb) || book(ENB[nb]) ||
      index.books.find(b => names(b).some(x => x && x.startsWith(nb))) || (nb.length >= 2 && index.books.find(b => b.id.toLowerCase().startsWith(nb)));
    if (!bk) return null;
    const c = +m[2]; if (c < 1 || c > bk.chapters) return null;
    return { b: bk.id, c, v: m[3] ? +m[3] : 0 };
  }
  function renderSearchEmpty() {
    const rq = store.get('recentQ', []);
    const ex = LANG === 'hi' ? ['उत्पत्ति 37:35', 'यूहन्ना 3:16', 'H430', 'G26', 'चरवाहा', 'שָׁלוֹם', 'λόγος'] : ['Genesis 37:35', 'John 3:16', 'H430', 'G26', 'shepherd', 'שָׁלוֹם', 'λόγος'];
    $('#sres').innerHTML = `<div class="sec">${esc(t('search.examples'))}</div><div class="tags">${ex.map(x => `<button class="tag" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
${rq.length ? `<div class="sec">${esc(t('search.recent'))}</div><div class="tags">${rq.map(x => `<button class="tag" data-q="${esc(x)}">${ico('clock', 'sm')} ${esc(x)}</button>`).join('')}</div>` : ''}
<div class="sec"></div><div class="card" style="cursor:default;color:var(--ink2);font-size:14.5px;line-height:1.6;display:flex;gap:12px">${ico('info')}<span>${esc(t('search.tips'))}</span></div>`;
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
    await loadIndex(); await loadLex(); await loadLexG().catch(() => {});
    const parts = [], m = sMode, isNum = /^[hHgG]?\s*\d{1,4}$/.test(q), isG = /^[gG]/.test(q), isHeb = /[\u0590-\u05FF]/.test(q), isGrk = /[\u0370-\u03FF\u1F00-\u1FFF]/.test(q), isLat = /^[a-z ]{3,}$/i.test(q);
    const ref = parseRef(q);
    if (m === 'all' || m === 'ref') {
      if (ref) { const k = `${ref.b}/${ref.c}${ref.v ? '/' + ref.v : ''}`; parts.push(`<div class="sec">${esc(t('search.refRes'))}</div><button class="card" data-go="${k}"><div class="rowcard"><span class="ib">${ico('book')}</span><span class="m"><b>${esc(t('search.openRef', { r: refName(k) }))}</b></span>${ico('chev-r')}</div></button>`); }
      else if (m === 'ref') parts.push(`<p class="empty">${esc(t('search.noRef'))}</p>`);
    }
    if (m === 'all' || m === 'strong') {
      const ql = q.toLowerCase(), hq = noNiq(q), gq = noAcc(q); let hits = [];
      if (isNum) { const n = +q.replace(/\D/g, ''); hits = Object.keys(lex).filter(k => lex[k][0] === n && (k[0] === 'G') === isG); }
      else if (q.length >= 2 || isHeb || isGrk) {
        for (const k in lex) {
          const L = lex[k];
          if ((L[3] && L[3].includes(q)) || (isHeb && noNiq(L[1]).includes(hq)) || (isGrk && k[0] === 'G' && noAcc(L[1]).includes(gq)) || (isLat && (L[4] || '').toLowerCase().includes(ql))) hits.push(k);
        }
        const score = k => { const h = lex[k][3] || '', e = (lex[k][4] || '').toLowerCase(), first = h.split(/[;,]/)[0].trim();
          return (first === q || noNiq(lex[k][1]) === hq || (isGrk && noAcc(lex[k][1]) === gq) || e.split(/[;,]/)[0].trim() === ql) ? 0 : (h.startsWith(q) || e.startsWith(ql)) ? 1 : 2; };
        hits.sort((a, b) => score(a) - score(b) || ((conc && conc[b] ? 1 : 0) - (conc && conc[a] ? 1 : 0)));
      }
      if (hits.length) parts.push(`<div class="sec">${esc(t('search.lexRes', { n: hits.length }))}</div>${hits.slice(0, m === 'strong' ? 100 : 12).map(k => { const L = lex[k];
        const g = k[0] === 'G';
        return `<button class="card" data-sk="${esc(k)}"><div class="lexrow"><span class="heb${g ? ' gk' : ''}">${esc(L[1])}</span><span class="m"><b>${esc(L[3] || L[4])}</b><div class="x">${g ? 'G' : 'H'}${L[0]} · ${esc(L[2])}${LANG === 'en' && L[4] ? ' · ' + esc(L[4]) : ''}</div></span>${ico('chev-r')}</div></button>`; }).join('')}`);
      else if (m === 'strong') parts.push(`<p class="empty">${esc(t('search.none'))}</p>`);
    }
    const wantV = (m === 'all' || m === 'word') && q.length >= 2 && !isNum && !isHeb && !isGrk && !ref && !isLat;
    out.innerHTML = parts.join('') + (wantV ? `<div class="sec">${esc(t('search.verses'))}</div><div id="vres">${'<span class="sk" style="display:block;height:72px;border-radius:18px;margin-bottom:10px"></span>'.repeat(3)}</div>` : '') + (!parts.length && !wantV ? `<p class="empty">${esc(t('search.none'))}</p>` : '');
    if (!wantV) return;
    try { await loadIrvAll(); } catch { $('#vres') && ($('#vres').innerHTML = `<p class="empty">${esc(t('search.idxFail'))}</p>`); return; }
    if ($('#q').value.trim() !== q) return;
    const res = []; let n = 0;
    for (const b of index.books) (((b.t === 'nt' ? irvN : irv) || {})[b.id] || []).forEach((ch, ci) => { for (const [vn, x] of ch) if (x && x.includes(q)) { n++; if (res.length < 200) res.push([b.id, ci + 1, vn, x]); } });
    const hl = x => esc(x).split(esc(q)).join(`<mark>${esc(q)}</mark>`);
    const vr = $('#vres'); if (!vr) return;
    vr.innerHTML = n ? `<p style="color:var(--mute);font-size:13px;margin:0 4px 10px">${esc(t('search.found', { n: nf(n) }))}${n > 200 ? esc(t('search.first200')) : ''}</p>${res.map(([b, c, v, x]) => `<button class="card" data-go="${b}/${c}/${v}"><div class="r">${esc(bname(b))} ${c}:${v}</div><div class="t">${hl(x)}</div></button>`).join('')}` : `<p class="empty">${esc(t('search.noVerses'))}</p>`;
    const rq = store.get('recentQ', []).filter(x => x !== q); rq.unshift(q); store.set('recentQ', rq.slice(0, 8));
  }

  // ---------- saved ----------
  $('#svmode').onclick = e => { const b = e.target.closest('[data-m]'); if (b) { buzz(); savedMode = b.dataset.m; renderSaved(); } };
  function renderSaved() {
    $$('#svmode button').forEach(b => b.classList.toggle('on', b.dataset.m === savedMode));
    const L = $('#svlist'), list = store.get(savedMode, []);
    const when = x => new Date(x).toLocaleDateString(LANG === 'hi' ? 'hi-IN-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'short' });
    if (!list.length) { L.innerHTML = `<div class="empty">${ico({ fav: 'heart', bm: 'bookmark', hist: 'clock' }[savedMode], 'lg')}<p>${esc(t({ fav: 'saved.emptyFav', bm: 'saved.emptyBm', hist: 'saved.emptyHist' }[savedMode]))}</p></div>`; return; }
    L.innerHTML = (savedMode === 'hist' ? `<div style="text-align:right;margin-bottom:8px"><button class="tag" data-clear>${esc(t('saved.clearHist'))}</button></div>` : '') + list.map((x, i) => savedMode === 'fav'
      ? `<div class="card" data-go="${x.k}"><div class="r">${esc(refName(x.k))}</div><div class="hb${x.gk || isNT(x.k.split('/')[0]) ? ' gk' : ''}">${esc(x.heb)}</div><div class="t">${esc(x.hi)}</div>
<div class="acts2"><button data-card="${i}">${ico('image')}${esc(t('act.card'))}</button><button data-copy="${i}">${ico('copy')}${esc(t('act.copy'))}</button><button data-del="${i}">${ico('x')}${esc(t('act.remove'))}</button></div></div>`
      : `<div class="card" data-go="${x.k}"><div class="rowcard"><span class="ib">${ico(savedMode === 'bm' ? 'bookmark' : 'book')}</span><span class="m"><b>${esc(refName(x.k))}</b><small>${when(x.t)}</small></span>${savedMode === 'bm' ? `<button class="icbtn" data-del="${i}" aria-label="${esc(t('act.remove'))}">${ico('x', 'sm')}</button>` : ico('chev-r')}</div></div>`).join('');
  }
  $('#svlist').addEventListener('click', e => {
    const list = store.get(savedMode, []), x0 = e.target;
    if (x0.closest('[data-clear]')) { store.set('hist', []); renderSaved(); return; }
    const d = x0.closest('[data-del]'); if (d) { list.splice(+d.dataset.del, 1); store.set(savedMode, list); buzz(); renderSaved(); return; }
    const c = x0.closest('[data-card]'); if (c) { openCard(list[+c.dataset.card]); return; }
    const cp = x0.closest('[data-copy]'); if (cp) { const x = list[+cp.dataset.copy]; copyText(withUrl(`${x.heb}\n\n${x.hi}\n— ${refName(x.k)}`, x.k)); return; }
    const g = x0.closest('[data-go]'); if (g) location.hash = g.dataset.go;
  });

  // ---------- settings ----------
  const META = { en: { name: 'English' }, hi: { name: 'हिन्दी' } };
  const langName = l => (META[l] && META[l].name) || l;
  function renderSettings() {
    const prev = `<div class="w" style="display:inline-flex;cursor:default">${set.chip ? `<span class="chip v">${LANG === 'en' ? 'Cj-w | V-Qal-Wayy-3mp' : 'यो-व | क्रि-क़ल-कथा-3पु.ब'}</span>` : ''}<span class="g">और उठे</span><span class="h"><span class="pre">וַ</span>יָּקֻמוּ</span><span class="p">${esc(pronOf('वय्·या·कु·मू'))}</span>${set.sn ? '<span class="sn">H6965</span>' : ''}${set.root ? '<span class="rt">קוּם</span><span class="rp">कूम</span>' : ''}</div>`;
    $('#v-settings').innerHTML = `<div class="phead"><h1>${esc(t('set.title'))}</h1></div><div class="set">
<div class="group" style="margin-top:8px"><button class="row" data-x="lang">${ico('globe')}<span class="lb">${esc(t('set.language'))}</span><span class="val">${esc(langName(LANG))}</span>${ico('chev-r', 'sm')}</button></div>
<div class="gt">${esc(t('set.appearance'))}</div><div class="group"><div class="row col"><span class="lb" style="margin-bottom:10px">${esc(t('set.theme'))}</span>${themeSeg()}</div>
<div class="row col"><span class="lb">${esc(t('set.textSize'))} <span class="val" id="fsv">${Math.round(set.fs * 100)}%</span><small>${esc(t('set.pinchHint'))}</small></span>${sizeRow()}<div class="preview">${prev}</div></div></div>
<div class="gt">${esc(t('set.words'))}</div><div class="group">${tgRow('gloss', t('set.gloss'))}${tgRow('pron', t('set.pron'))}${tgRow('dots', t('set.dots'), t('set.dotsSub'))}
${tgRow('split', t('set.split'), t('set.splitSub'))}${tgRow('sn', t('set.sn'))}${tgRow('chip', t('set.chip'), t('set.chipSub'))}${tgRow('root', t('set.root'))}${tgRow('hindi', t('set.hindi'))}</div>
<div class="gt">${esc(t('set.experience'))}</div><div class="group">${tgRow('haptic', t('set.haptic'), t('set.hapticSub'))}</div>
<div class="gt">${esc(t('set.gestures'))}</div>${gestureHTML()}
${CFG.youtubeUrl ? `<div class="gt">${esc(t('set.follow'))}</div><div class="group"><button class="row" data-x="yt">${ico('play')}<span class="lb">${esc(t('set.youtube'))}</span>${ico('chev-r', 'sm')}</button></div>` : ''}
<div class="gt">${esc(t('set.data'))}</div><div class="group"><button class="row" data-x="hist">${ico('clock')}<span class="lb">${esc(t('set.clearHist'))}</span></button><button class="row" data-x="reset">${ico('settings')}<span class="lb">${esc(t('set.reset'))}</span></button>
<button class="row" data-x="share">${ico('share')}<span class="lb">${esc(t('menu.share'))}</span>${ico('chev-r', 'sm')}</button><button class="row" data-x="about">${ico('info')}<span class="lb">${esc(t('set.about'))}</span><span class="val">${esc(CFG.version)}</span>${ico('chev-r', 'sm')}</button></div></div>`;
  }
  $('#v-settings').addEventListener('change', e => { const k = e.target.dataset.k; if (k) { set[k] = e.target.checked; saveSet(); buzz(); if (cur) render(); renderSettings(); } });
  $('#v-settings').addEventListener('input', e => { if (e.target.classList.contains('fsr')) { set.fs = +e.target.value / 100; $('#fsv').textContent = e.target.value + '%'; saveSet(); } });
  $('#v-settings').addEventListener('click', e => {
    const b = e.target.closest('[data-t]'); if (b) { set.theme = b.dataset.t; saveSet(); buzz(); renderSettings(); return; }
    const x = e.target.closest('[data-x]'); if (!x) return;
    ({ lang: openLangSheet, hist: () => { store.set('hist', []); toast(t('set.histCleared')); }, reset: () => { set = Object.assign({}, DEF); saveSet(); if (cur) render(); renderSettings(); toast(t('set.resetDone')); },
      about: openAbout, share: shareApp, yt: () => CFG.youtubeUrl && window.open(CFG.youtubeUrl, '_blank', 'noopener') }[x.dataset.x] || (() => {}))();
  });

  // ---------- language ----------
  const langOpts = sel => CFG.languages.map(l => `<button class="lopt${l === sel ? ' on' : ''}" data-l="${l}"><span class="ab">${l.toUpperCase()}</span><span><b>${esc(langName(l))}</b><small>${esc(l === 'en' ? 'English' : l === 'hi' ? 'Hindi' : l)}</small></span><span class="ck">${ico('check')}</span></button>`).join('');
  async function changeLang(l) {
    store.set('lang', l); await setLang(l); buzz();
    if (cur) { render(); setTitle(); }
    $('#q').value = ''; route();
  }
  function openLangSheet() {
    const el = sheet(`<div>${langOpts(LANG)}</div>`, { title: esc(t('set.language')) });
    el.addEventListener('click', e => { const b = e.target.closest('[data-l]'); if (!b) return; $$('.lopt', el).forEach(x => x.classList.toggle('on', x === b)); setTimeout(() => { closeTop(); changeLang(b.dataset.l); }, 160); });
  }
  function firstLaunch() {
    return new Promise(res => {
      const lp = $('#langpick'); let sel = CFG.defaultLanguage || 'en';
      const draw = () => { lp.innerHTML = `<div class="lp-logo">א</div><h1>${esc(t('lang.title'))}<span>${LANG === 'hi' ? 'Choose your language' : 'अपनी भाषा चुनें'}</span></h1><p>${esc(t('lang.sub'))}</p>${langOpts(sel)}<button class="btn pri" data-go>${esc(t('lang.cont'))}</button>`; };
      draw(); lp.hidden = false;
      lp.addEventListener('click', async e => {
        const b = e.target.closest('[data-l]');
        if (b) { sel = b.dataset.l; buzz(); await setLang(sel); draw(); return; }
        if (e.target.closest('[data-go]')) { buzz(); store.set('lang', sel); lp.style.transition = 'opacity .3s'; lp.style.opacity = '0'; setTimeout(() => { lp.hidden = true; lp.style.opacity = ''; }, 300); res(); }
      });
    });
  }

  // ---------- boot ----------
  window.addEventListener('hashchange', () => { if (!$('#menu').hidden) menuShow(false); route(); });
  if (!location.hash) history.replaceState(null, '', '#home');
  (async () => {
    try { CFG = Object.assign(CFG, await (await fetch('app.json')).json()); } catch {}
    let l = store.get('lang', null);
    await setLang(l || CFG.defaultLanguage || 'en');
    for (const x of CFG.languages) loadLoc(x).then(d => { if (d._meta) META[x] = d._meta; }).catch(() => {});
    if (!l) await firstLaunch();
    await Promise.all([Ads.init().catch(() => {}), loadIndex(), loadLex()]);
    route();
  })();
  if ('serviceWorker' in navigator && !NATIVE) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
