#!/usr/bin/env python3
"""Word of the Day list: 365 important high-frequency words, alternating Hebrew and Greek.
Content words only (nouns, verbs, adjectives; no names, particles, pronouns, prepositions, conjunctions, articles).
Each entry carries its own data so Home and notifications need no lexicon download:
data/wotd.json.gz = [[key, lemma, pron, hindi, english, count, ref, hindiVerse], ...]"""
import json, gzip, os, re, unicodedata
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); D = os.path.join(ROOT, 'data')
J = lambda n: json.loads(gzip.open(os.path.join(D, n + '.json.gz')).read())
idx = json.load(open(os.path.join(D, 'index.json')))['books']
irv, irvn = J('irv'), J('irvn')
def text(ref):
    b = idx[ref // 1000000]['id']; c = ref // 1000 % 1000; v = ref % 1000
    src = irvn if b in irvn else irv
    ch = src.get(b, [])[c - 1] if c - 1 < len(src.get(b, [])) else []
    return b, c, v, next((x[1] for x in ch if x[0] == v), '')
def pick(conc, lex, strongs, gk, n):
    rows = []
    for k, gl in conc.items():
        L = lex.get(k)
        if not L or (len(L) > 5 and L[5]) or not L[3]: continue
        num = str(L[0]); pos = (strongs.get(num) or [''])[0]
        if not re.match(r'^(n|v|a)(-[mf])?( |$)', pos) or 'pr' in pos: continue
        if not gk and num in ('3068', '3069', '853'): continue
        refs = []
        for g, dl in gl:
            acc = 0
            for d in dl: acc += d; refs.append(acc)
        rows.append((len(refs), k, L, sorted(refs)))
    rows.sort(key=lambda r: -r[0])
    out = []
    for cnt, k, L, refs in rows[:n]:
        best = None
        for r in refs:
            b, c, v, t = text(r)
            if 35 <= len(t) <= 130 and (best is None or abs(len(t) - 80) < abs(len(best[3]) - 80)): best = (b, c, v, t)
        if not best: b, c, v, t = text(refs[0]); best = (b, c, v, t)
        lem = unicodedata.normalize('NFC', re.sub('[\u0591-\u05AF\u05BD\u05C0\u05C3]', '', L[1])) if not gk else L[1]
        out.append([k, lem, L[2], L[3], L[4][:60], cnt, f'{best[0]}/{best[1]}/{best[2]}', best[3]])
    return out
H = pick(J('conc'), J('lex'), J('strongs'), False, 183)
G = pick(J('concg'), J('lexg'), J('strongsg'), True, 182)
import random  # mix frequencies within each language, then alternate Hebrew / Greek day by day
random.Random(7).shuffle(H); random.Random(11).shuffle(G)
lst = [x for pair in zip(H, G) for x in pair] + H[len(G):]
with gzip.GzipFile(os.path.join(D, 'wotd.json.gz'), 'wb', compresslevel=9, mtime=0) as f:
    f.write(json.dumps(lst, ensure_ascii=False, separators=(',', ':')).encode())
print(len(lst), lst[:4])
