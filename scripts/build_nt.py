#!/usr/bin/env python3
"""Build the Greek New Testament (Greek -> Hindi interlinear), same shape as the OT build.

Usage:  python3 scripts/build_nt.py
Inputs: data/raw/nt/OpenGNT_version3_3.csv (OpenGNT, CC BY-SA 4.0), data/raw/nt/sgd.json (Strong's Greek, PD),
        data/raw/hin2017 (IRV Hindi NT USFM), scripts/lexg/*.txt (hand Hindi lemma glosses `num|hindi[~m|~f]`),
        scripts/lexg/names.txt (IRV spellings of proper names).
Output: data/{Book}/{ch}.json.gz = {"b","n","c","g":1,"v":[[verse, hindi, [[greek, pron, gloss, "G976", rmac],..]],..]}
        data/lexg.json.gz {"G976":[976, lemma, pron, hindi, english, proper?]}, data/strongsg.json.gz, data/concg.json.gz,
        data/irvn.json.gz (NT Hindi text for search), index.json (NT books appended, "t":"nt").
"""
import json, re, os, glob, sys, collections, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
from translit_gk import translit
from gloss import short, plural_f, NO_OBL, OBLIQUE_WORDS, PAST_IRR, VOWEL_SIGNS, _attach, FUT, SUB
import hi_gender
from build import irv_book, dump, BOOKS as OT_BOOKS, DIGITS
import build

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, S, OUT = os.path.join(ROOT, 'data', 'raw'), os.path.join(ROOT, 'scripts'), os.path.join(ROOT, 'data')
NT = dict(zip('Matt Mark Luke John Acts Rom 1Cor 2Cor Gal Eph Phil Col 1Thess 2Thess 1Tim 2Tim Titus Phlm Heb Jas 1Pet 2Pet 1John 2John 3John Jude Rev'.split(),
              'MAT MRK LUK JHN ACT ROM 1CO 2CO GAL EPH PHP COL 1TH 2TH 1TI 2TI TIT PHM HEB JAS 1PE 2PE 1JN 2JN 3JN JUD REV'.split()))
NTL = list(NT)
OT_IDS = list(OT_BOOKS)
build.BOOKS.update(NT)  # irv_book() looks codes up here

def lexg():
    lx, names = {}, {}
    for f in sorted(glob.glob(os.path.join(S, 'lexg', '*.txt'))):
        for line in open(f, encoding='utf8'):
            if '|' not in line or line.startswith('#'): continue
            k, v = line.rstrip('\n').split('|', 1); k = 'G' + k.strip(); v = v.strip()
            m = re.search(r'\s*~([mf])$', v)
            if m: hi_gender.LEX_G[k] = m.group(1); v = v[:m.start()]
            (names if f.endswith('names.txt') else lx)[k] = v
    return lx, names

LEX, NAMES = lexg()
SGD = json.load(open(os.path.join(RAW, 'nt', 'sgd.json'), encoding='utf8'))

# ---------- Hindi morphology helpers ----------
def is_v(ch): return ch in VOWEL_SIGNS or ch in 'अआइईउऊएओ'
def past(stem, g='m', n='s'):
    ms, fs, pl = PAST_IRR.get(stem) or ((stem + 'या', stem + 'ई', stem + 'ए') if is_v(stem[-1]) else (stem + 'ा', stem + 'ी', stem + 'े'))
    return pl if n == 'p' else fs if g == 'f' else ms
def impf(stem, g='m', n='s'): return stem + ('ते' if n == 'p' else 'ती' if g == 'f' else 'ता')
def adj_infl(w, g, n, obl):
    """बड़ा -> बड़ी / बड़े"""
    if not w.endswith('ा') or w in NO_OBL or len(w) < 3: return w
    if g == 'f': return w[:-1] + 'ी'
    return w[:-1] + 'े' if (n == 'p' or obl) else w
def noun_infl(w, g, n, obl):
    if n == 'p':
        if obl:
            if w.endswith('ा') and g == 'm' and w not in NO_OBL: return w[:-1] + 'ों'
            if w.endswith(('ी', 'ि', 'ू', 'ा')) or g == 'f': return plural_f(w, True) or w
            if w[-1] in VOWEL_SIGNS or w[-1] in 'ंँ': return w
            return w + 'ों'
        if g == 'f': return plural_f(w, False) or w
        if w.endswith('ा') and w not in NO_OBL and not w.endswith('ता') and len(w) > 2: return w[:-1] + 'े'
        return w
    if obl and g == 'm' and w.endswith('ा') and (w in OBLIQUE_WORDS or (w not in NO_OBL and not w.endswith(('ता', 'ना')) and len(w) > 2)):
        return w[:-1] + 'े'
    return w

SUBJ = {'1S': 'मैं', '2S': 'तू', '1P': 'हम', '2P': 'तुम'}
AUX_P = {'1S': 'हूँ', '2S': 'है', '3S': 'है', '1P': 'हैं', '2P': 'हो', '3P': 'हैं'}
PGN = {'1S': '1cs', '2S': '2ms', '3S': '3ms', '1P': '1cp', '2P': '2mp', '3P': '3mp'}
BE = {'P': AUX_P, 'I': {'1S': 'था', '2S': 'था', '3S': 'था', '1P': 'थे', '2P': 'थे', '3P': 'थे'}}
PERS = {  # personal pronouns: (nom, gen-stem, obj)
    '1S': ('मैं', 'मेर', 'मुझे'), '1P': ('हम', 'हमार', 'हमें'), '2S': ('तू', 'तेर', 'तुझे'), '2P': ('तुम', 'तुम्हार', 'तुम्हें'),
    '3S': ('वह', 'उसक', 'उसे'), '3P': ('वे', 'उनक', 'उन्हें')}
DEM = {'यह': ('यह', 'ये', 'इसक', 'इनक', 'इसे', 'इन्हें'), 'वह': ('वह', 'वे', 'उसक', 'उनक', 'उसे', 'उन्हें')}
CASEPOST = {'G': 'का', 'D': 'को'}

def verb(base, rm, prev, g_hint):
    """rm like V-PAI-3S, V-2AAP-NSM, V-PAN. prev = previous token's rmac (article detection)."""
    if not base: return ''
    words = base.split()
    if not words[-1].endswith('ना'): return base
    head, stem = words[:-1], words[-1][:-2]
    m = re.match(r'V-2?([PIFARLX])([AMPEDON])([ISOMNP])(?:-(\d[SP]))?(?:-([NGDAV])([SP])([MFN]))?', rm)
    if not m: return base
    t, voice, mood, pn, case, num, gen = m.groups()
    if g_hint.get('key') == 'G1492':  # οἶδα: perfect = know (present), aorist = saw
        if t in 'RL': t = 'P' if t == 'R' else 'I'
        elif t == 'A': head, stem = [], 'देख'
    pn = pn or '3S'; n = (num or pn[1]).lower(); g = 'f' if gen == 'F' else 'm'
    passive = voice == 'P' and stem not in ('हो', 'जा') and not base.endswith(('होना', 'जाना', 'पाना', 'रहना'))
    if passive:  # कहा जाना
        head = head + [past(stem, g, n)]; stem = 'जा'
    J = lambda form: ' '.join(head + [form])
    sub = SUBJ.get(pn) if mood in 'ISOM' or mood == 'I' else None
    if stem == 'हो' and not head and mood == 'I' and t in 'PI':  # εἰμί
        return ' '.join(([sub] if sub else []) + [BE[t][pn]])
    if mood == 'I':
        if t == 'P': f = J(impf(stem, 'm', pn[1].lower()) + ' ' + AUX_P[pn])
        elif t == 'I': f = J(impf(stem, 'm', pn[1].lower()) + ' ' + BE['I'][pn])
        elif t == 'F': f = J(_attach(stem, FUT[PGN[pn]]))
        elif t == 'A': f = J(past(stem, 'm', pn[1].lower()))
        elif t == 'R': f = J(past(stem, 'm', pn[1].lower()) + ' ' + AUX_P[pn])
        else: f = J(past(stem, 'm', pn[1].lower()) + ' ' + BE['I'][pn])
        return ' '.join(([sub] if sub else []) + [f])
    if mood in 'SO':
        return ' '.join(([sub] if sub else []) + [J(_attach(stem, SUB[PGN[pn]]))])
    if mood == 'M':
        if pn[0] == '2':
            f = stem if pn[1] == 'S' else {'दे': 'दो', 'ले': 'लो', 'हो': 'हो', 'जा': 'जाओ'}.get(stem, _attach(stem, 'ो'))
            return J(f)
        return J(_attach(stem, SUB[PGN[pn]]))
    if mood == 'N':
        pc = prev[:3] if prev else ''
        if pc == 'T-G': return J(stem + 'ने को')
        if pc == 'T-D': return J(stem + 'ते समय')
        return J(stem + 'ना')
    # participle
    art = prev and prev.startswith('T-') and case and prev[2:4] == case + num
    if art:
        if passive: return J(past('जा', g, n) + (' हुए' if n == 'p' else ' हुई' if g == 'f' else ' हुआ')) if False else ' '.join(head) + (' हुए' if n == 'p' else ' हुई' if g == 'f' else ' हुआ')
        return J(stem + ('नेवाले' if n == 'p' else 'नेवाली' if g == 'f' else 'नेवाला'))
    if passive or t in 'RL':
        if passive: return ' '.join(head) + (' हुए' if n == 'p' else ' हुई' if g == 'f' else ' हुआ')
        return J(past(stem, g, n) + (' हुए' if n == 'p' else ' हुई' if g == 'f' else ' हुआ'))
    if t == 'A': return J('करके' if stem == 'कर' else stem + 'कर')
    if t == 'F': return J(stem + 'नेवाला')
    return J(impf(stem, 'm', 'p') + ' हुए')

def gloss(key, rm, prev, ctx):
    """ctx: dict with the last noun's Hindi gender/number for possessive agreement."""
    if key == 'G3588': return '—'
    raw = NAMES.get(key) or LEX.get(key, '')
    base = short(raw) if key not in NAMES else raw
    if not base: return ''
    parts = rm.split('-')
    pos = parts[0]
    if pos == 'PREP': ctx['prep'] = True; return base
    gov = ctx.get('prep') and pos in ('N', 'P', 'D', 'R', 'F', 'I', 'X')
    if gov: ctx['prep'] = False
    after_noun = ctx.pop('noun_just', False)
    if pos == 'V':
        ctx['key'] = key
        return verb(base, rm, prev, ctx)
    if pos == 'P' and len(parts) > 1:  # personal pronoun
        m = re.match(r'(?:(\d))?([NGDAV])([SP])([MFN])?', parts[1])
        if m:
            per, case, num, gen = m.groups(); per = per or '3'
            if key == 'G846' and case == 'N': return 'वह स्वयं' if num == 'S' else 'वे स्वयं'
            nom, gst, obj = PERS[per + num]
            if case == 'N': return nom
            if case == 'G':
                if gov: return gst + 'े'
                end = ('े' if (ctx.get('n') == 'p' or ctx.get('obl')) else 'ी' if ctx.get('g') == 'f' else 'ा') if after_noun else 'ा'
                return gst + end
            return {'मैं': 'मुझ', 'तू': 'तुझ', 'वह': 'उस', 'वे': 'उन'}.get(nom, nom) if gov else obj
    if pos == 'D' and base in DEM and len(parts) > 1:
        case, num = parts[1][0], parts[1][1]
        sg, pl, gs, gp, os_, op = DEM[base]
        if case == 'N': return sg if num == 'S' else pl
        if case == 'G': return (gs if num == 'S' else gp) + ('े' if gov else 'ा')
        if gov: return {'इसे': 'इस', 'इन्हें': 'इन', 'उसे': 'उस', 'उन्हें': 'उन'}[os_ if num == 'S' else op]
        return os_ if num == 'S' else op
    if pos in ('N', 'A') and len(parts) > 1 and re.match(r'[NGDAV][SP][MFN]$', parts[1]):
        case, num, gen = parts[1]
        ws = base.split(); lw = ws[-1]; n = num.lower(); obl = case in 'GD'
        proper = key in NAMES
        if pos == 'N':
            g = hi_gender.gender(lw, key)
            if not proper: ws[-1] = noun_infl(lw, g, n, obl)
            ctx.update(g=g, n=n, obl=obl or gov, noun_just=True)
            out = ' '.join(ws)
            if case in CASEPOST and not gov: out += ' ' + CASEPOST[case]
            if case == 'V': out = 'हे ' + out
            return out
        ws[-1] = adj_infl(lw, 'f' if gen == 'F' and False else 'm', n, obl)
        return ' '.join(ws)
    if pos == 'N' and key in NAMES: ctx.update(g='m', n='s', obl=False, noun_just=True)
    if pos == 'N' and key in NAMES and not gov and len(parts) > 1 and parts[1][:1] in 'GD' and parts[1] != 'PRI':
        return base + ' ' + CASEPOST[parts[1][0]]
    return base

def rpos(rm):
    p = rm.split('-')
    if p[0] == 'N': return 'n-pr' if p[-1] in ('P', 'L', 'T', 'LG', 'PG') or p[1:2] == ['PRI'] else 'n'
    return {'V': 'v', 'A': 'a', 'ADV': 'adv', 'PREP': 'prep', 'CONJ': 'conj', 'T': 'art', 'PRT': 'prt', 'INJ': 'inj',
            'ARAM': 'x', 'HEB': 'x', 'COND': 'conj'}.get(p[0], 'pron' if p[0] in 'PRDFIXKQSC' else 'x')

def clean_pm(s):
    return re.sub(r'<pm>(.*?)</pm>', lambda m: m.group(1) if m.group(1) in ',.·;—' else '', s)

def main():
    rows = collections.defaultdict(lambda: collections.defaultdict(list))
    for i, l in enumerate(open(os.path.join(RAW, 'nt', 'OpenGNT_version3_3.csv'), encoding='utf8')):
        if i == 0: continue
        f = l.rstrip('\n').split('\t')
        b, c, v = (int(x) for x in f[6].strip('〔〕').split('｜'))
        g = f[7].strip('〔〕').split('｜')
        pm = f[11].strip('〔〕').split('｜')
        en = f[10].strip('〔〕').split('｜')[0]
        rows[NTL[b - 40]][(c, v)].append((clean_pm(pm[0]), g[2], clean_pm(pm[1]), g[3], g[4], g[5], en))
    idxp = os.path.join(OUT, 'index.json'); idx = json.load(open(idxp, encoding='utf8'))
    idx['books'] = [x for x in idx['books'] if x['id'] in OT_IDS]
    for x in idx['books']: x['t'] = 'ot'
    CONC, IRV, USED, EN, POS = {}, {}, collections.Counter(), {}, {}
    st = dict(words=0, glossed=0, hand=0, verses=0, irv_missing=0)
    for bi, book in enumerate(NTL):
        name, hi, titles = irv_book(book)
        chs = sorted({c for c, v in rows[book]} | {c for c, v in hi})
        for c in chs:
            vs = sorted({v for cc, v in rows[book] if cc == c} | {v for cc, v in hi if cc == c})
            verses = []
            for v in vs:
                ctx, prev, words = {}, '', []
                for pre, wa, fol, lemma, rm, sn, en in rows[book].get((c, v), []):
                    key = 'G' + str(int(sn[1:]))
                    USED[key] += 1; POS.setdefault(key, collections.Counter())[rpos(rm)] += 1; EN.setdefault(key, collections.Counter())[en] += 1
                    gl = gloss(key, rm, prev, ctx)
                    if rm.startswith(('N-', 'A-')) is False and not rm.startswith('P-'): pass
                    prev = rm
                    st['words'] += 1; st['glossed'] += bool(gl)
                    CONC.setdefault(key, {}).setdefault(gl, []).append((39 + bi) * 1000000 + c * 1000 + v)
                    words.append([pre + wa + fol, translit(wa), gl, key, rm])
                htxt = hi.get((c, v), '')
                if not htxt: st['irv_missing'] += 1
                verses.append([v, htxt, words]); st['verses'] += 1
                IRV.setdefault(book, {}).setdefault(c, []).append([v, htxt])
            od = os.path.join(OUT, book); os.makedirs(od, exist_ok=True)
            dump(os.path.join(od, f'{c}.json'), dict(b=book, n=name, c=c, g=1, v=verses))
        idx['books'].append(dict(id=book, name=name, chapters=max(chs), t='nt'))
        print(f'{book:6} {name:16} ch={max(chs):3}', flush=True)
    json.dump(idx, open(idxp, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    # lexicon
    lex, miss = {}, []
    for k in sorted(USED, key=lambda x: int(x[1:])):
        s = SGD.get('G' + k[1:]) or SGD.get(k) or {}
        lem = s.get('lemma', '')
        en = EN[k].most_common(1)[0][0] if EN.get(k) else ''
        en = re.sub(r'[\[\]]', '', s.get('kjv_def', '') or en)[:90]
        hi = NAMES.get(k) or LEX.get(k, '')
        if not hi: miss.append(k)
        lex[k] = [int(k[1:]), lem, translit(lem) if lem else '', hi, en] + ([1] if k in NAMES else [])
    dump(os.path.join(OUT, 'lexg.json'), lex)
    sg = {k[1:].lstrip('0') or '0': [POS[('G' + str(int(k[1:])))].most_common(1)[0][0] if ('G' + str(int(k[1:]))) in POS else '', v.get('translit', ''), '', (v.get('derivation') or '').strip(),
                                     (v.get('strongs_def') or '').strip(), (v.get('kjv_def') or '').strip()] for k, v in SGD.items()}
    dump(os.path.join(OUT, 'strongsg.json'), sg)
    conc = {}
    for k, d in CONC.items():
        rows_ = []
        for g_, refs in sorted(d.items(), key=lambda x: -len(x[1])):
            refs = sorted(refs); p = 0; dl = []
            for r in refs: dl.append(r - p); p = r
            rows_.append([g_, dl])
        conc[k] = rows_
    dump(os.path.join(OUT, 'concg.json'), conc)
    dump(os.path.join(OUT, 'irvn.json'), {b: [IRV[b][c] for c in sorted(IRV[b])] for b in NTL})
    st['lemmas'] = len(USED); st['lemmas_without_hindi'] = len(miss); st['missing'] = miss[:40]
    st['glossed_pct'] = round(st['glossed'] / st['words'] * 100, 2)
    json.dump(st, open(os.path.join(OUT, 'stats_nt.json'), 'w'), indent=0, ensure_ascii=False)
    print(json.dumps(st, ensure_ascii=False))

if __name__ == '__main__':
    main()
