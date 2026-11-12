#!/usr/bin/env python3
"""Word of the Day lists: important high-frequency Hebrew and Greek words (+ a few hand-picked favourites).
Content words only (nouns, verbs, adjectives; no names, particles, pronouns, prepositions, conjunctions, articles),
except the curated SPECIAL words (Yeshua, Amen, Hallelujah, Abba, Phileo).

Versification: concordance refs are WLC (Hebrew) numbering, which is also what the reader uses for navigation.
The example reference shown to users is converted to IRV/English numbering with OSHB VerseMap.xml
(e.g. WLC Ps 76:13 = IRV Ps 76:12; Psalm superscriptions, which IRV doesn't number as verses, are skipped).
The Hindi verse comes from data/irv.json.gz, which build.py already aligned to the Hebrew verse via the same map.
An example verse is preferred only if its Hindi text contains one of the word's Hindi meanings.

data/wotd.json.gz = [[key, lemma, pron, hindi, english, count, refIRV, hindiVerse, navRefWLC, strongKey, numLabel], ...]
(index 8-10 optional: navRef defaults to refIRV, strongKey to key, numLabel derived from key)."""
import json, gzip, os, re, unicodedata, random
import xml.etree.ElementTree as ET
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = os.path.join(ROOT, 'data')
J = lambda n: json.loads(gzip.open(os.path.join(D, n + '.json.gz')).read())
idx = json.load(open(os.path.join(D, 'index.json')))['books']
BI = {b['id']: i for i, b in enumerate(idx)}
irv, irvn = J('irv'), J('irvn')
# WLC -> KJV/IRV verse map (OSHB). Superscription verses (WLC numbers them, IRV doesn't) are the
# WLC verses not in the map whose number is the target of another mapping (build.py treats them as titles).
VM = {}
for v in ET.parse(os.path.join(D, 'raw', 'VerseMap.xml')).getroot().iter():
    if v.get('wlc'): VM[v.get('wlc')] = v.get('kjv')
TARGET_OF = {}
for w, k in VM.items(): TARGET_OF.setdefault(k, w)
def irv_ref(b, c, v):
    o = f'{b}.{c}.{v}'
    if o in VM: kb, kc, kv = VM[o].split('.'); kv = re.sub(r'\D.*', '', kv) or '0'; return kb, int(kc), int(kv)
    if o in TARGET_OF and TARGET_OF[o] != o: return b, c, 0  # superscription
    return b, c, v
def text(ref):
    b = idx[ref // 1000000]['id']; c = ref // 1000 % 1000; v = ref % 1000
    src = irvn if b in irvn else irv
    ch = src.get(b, [])[c - 1] if c - 1 < len(src.get(b, [])) else []
    return b, c, v, next((x[1] for x in ch if x[0] == v), '')
def stems(meaning):
    """Hindi meaning -> searchable stems ('स्तुति करना' -> 'स्तुति'; 'आत्मा; साँस, वायु' -> आत्मा/साँस/वायु)."""
    out = set()
    for p in re.split(r'[;,/()]', meaning):
        p = p.strip().replace('\u093c', '')
        q = re.sub(r'\s+(करना|होना|देना|लेना|रखना|जाना)$', '', p).strip()
        p = q if q else p
        p = re.sub(r'ना$', '', p) if len(p) > 3 and ' ' not in p else p
        for w in p.split():
            if len(w) >= 2 and w not in ('का', 'की', 'के', 'में', 'से', 'को', 'और', 'या', 'एक'): out.add(w)
    return out
def best_example(refs, meaning, needle=None, prefer=None):
    S = [needle] if needle else stems(meaning)
    cands = []
    for r in refs:
        b, c, v, t = text(r)
        ib, ic, iv = irv_ref(b, c, v)
        if not t or iv == 0: continue
        tn = t.replace('\u093c', '')
        hit = any(s.replace('\u093c', '') in tn for s in S)
        cands.append((hit, b, c, v, ib, ic, iv, t))
    if prefer:
        for p in prefer:
            for x in cands:
                if f'{x[4]}/{x[5]}/{x[6]}' == p and x[0]: return x
    def score(x): return (not x[0], 0 if 35 <= len(x[7]) <= 130 else 1, abs(len(x[7]) - 80))
    return min(cands, key=score) if cands else None
def refs_of(conc, k):
    out = []
    for g, dl in conc.get(k, []):
        acc = 0
        for d in dl: acc += d; out.append(acc)
    return sorted(out)
def entry(k, L, cnt, ex, gk, lemma=None, hindi=None, pron=None, strong=None, label=None, english=None):
    hit, b, c, v, ib, ic, iv, t = ex
    lem = lemma or (L[1] if gk else unicodedata.normalize('NFC', re.sub('[\u0591-\u05AF\u05BD\u05C0\u05C3]', '', L[1])))
    e = [k, lem, pron or L[2], hindi or L[3], (english or L[4])[:60], cnt, f'{ib}/{ic}/{iv}', t]
    nav = f'{b}/{c}/{v}'
    if nav != e[6] or strong or label: e += [nav, strong or k, label or '']
    return e, hit
def pick(conc, lex, strongs, gk, n):
    rows = []
    for k, gl in conc.items():
        L = lex.get(k)
        if not L or (len(L) > 5 and L[5]) or not L[3]: continue
        num = str(L[0]); pos = (strongs.get(num) or [''])[0]
        if not re.match(r'^(n|v|a)(-[mf])?( |$)', pos) or 'pr' in pos: continue
        if not gk and num in ('3068', '3069', '853'): continue
        refs = refs_of(conc, k); rows.append((len(refs), k, L, refs))
    rows.sort(key=lambda r: -r[0])
    out, miss = [], []
    for cnt, k, L, refs in rows[:n]:
        e, hit = entry(k, L, cnt, best_example(refs, L[3]), gk)
        out.append(e)
        if not hit: miss.append((k, L[3], e[6]))
    return out, miss
conc, lex, concg, lexg = J('conc'), J('lex'), J('concg'), J('lexg')
H, mH = pick(conc, lex, J('strongs'), False, 183)
G, mG = pick(concg, lexg, J('strongsg'), True, 182)
random.Random(7).shuffle(H); random.Random(11).shuffle(G)
# ---- curated favourites (Strong's, Hindi meaning, pronunciation, example checked against the IRV text) ----
def special(gk, k, needle, prefer, **kw):
    C, X = (concg, lexg) if gk else (conc, lex)
    refs = refs_of(C, kw.pop('conc_key', k)); L = X[kw.pop('lex_key', k)]
    ex = best_example(refs, L[3], needle=needle, prefer=prefer)
    cnt = kw.pop('count', len(refs))
    e, hit = entry(kw.pop('key', k), L, cnt, ex, gk, **kw)
    assert hit, (k, needle, e[6], e[7])
    return e
hall_refs = sorted(set(refs_of(conc, '1984 b')) & set(refs_of(conc, '3050')))
SH = [
    special(False, '3442', 'येशु', ['Ezra/3/2'], pron='येशूअ', hindi='येशुअ / येशू (यहोशू का बाद का रूप; अर्थ: “यहोवा उद्धार है”)', english='Jeshua / Yeshua (“the LORD saves”)'),
    special(False, '543', 'आमीन', ['Neh/8/6', 'Ps/41/13'], hindi='आमीन; ऐसा ही हो, सचमुच', english='amen; truly, so be it'),
    special(False, '1984 b', 'स्तुति', ['Ps/150/6', 'Ps/150/1'], key='1984+3050', lemma='הַלְלוּ־יָהּ', pron='हल्·लू-याह',
            hindi='हालेलूय्याह; याह (यहोवा) की स्तुति करो', count=len(hall_refs), strong='1984 b', label='H1984 + H3050', english='hallelujah; praise Yah (the LORD)'),
]
SG = [
    special(True, 'G2424', 'यीशु', ['Matt/1/21'], hindi='यीशु (“यहोवा उद्धार है”)', english='Jesus (Yeshua, “the LORD saves”)'),
    special(True, 'G281', 'आमीन', ['Rev/22/20', '2Cor/1/20'], english='amen; truly, so be it'),
    special(True, 'G239', 'हालेलूय्याह', ['Rev/19/1', 'Rev/19/6'], hindi='हालेलूय्याह; याह की स्तुति करो', english='hallelujah; praise Yah (the LORD)'),
    special(True, 'G5', 'अब्बा', ['Rom/8/15', 'Gal/4/6', 'Mark/14/36'], hindi='अब्बा; हे पिता (प्यार भरा संबोधन)', english='Abba; father (intimate address)'),
    special(True, 'G5368', 'प्रीति', ['John/21/17', 'John/21/15'], hindi='प्रीति रखना, स्नेह करना', english='to love (as a friend), have affection'),
]
# drop the plain 'praise' entry only if it would duplicate a special key; then place favourites in the first days
skeys = {e[0] for e in SH + SG}
H = [e for e in H if e[0] not in skeys]; G = [e for e in G if e[0] not in skeys]
def place(lst, sp):
    # spread favourites over the coming days: positions relative to today's index
    import datetime
    day = (datetime.date.today() - datetime.date(1970, 1, 1)).days
    n = len(lst) + len(sp)
    for i, e in enumerate(sp):
        lst.insert(0, e)
    # rotate so favourite i lands on day+1+2*i
    out = [None] * n; rest = [e for e in lst if e not in sp]
    for i, e in enumerate(sp): out[(day + 1 + 2 * i) % n] = e
    it = iter(rest)
    for i in range(n):
        if out[i] is None: out[i] = next(it)
    return out
H = place(H, SH); G = place(G, SG)
lst = [x for pair in zip(H, G) for x in pair] + H[len(G):] + G[len(H):]
with gzip.GzipFile(os.path.join(D, 'wotd.json.gz'), 'wb', compresslevel=9, mtime=0) as f:
    f.write(json.dumps(lst, ensure_ascii=False, separators=(',', ':')).encode())
print('entries', len(lst), 'Hebrew', len(H), 'Greek', len(G))
print('no meaning-match example (fallback by length):', len(mH), 'Hebrew,', len(mG), 'Greek')
for m in (mH + mG)[:40]: print('  ', m)
for e in SH + SG: print('SPECIAL', e[0], e[1], e[3], e[6], e[7][:70], e[8:] if len(e) > 8 else '')
