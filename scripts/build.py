#!/usr/bin/env python3
"""Build compact chapter data for the Hebrew-Hindi interlinear.

Usage:  python3 scripts/build.py all            (whole OT)
        python3 scripts/build.py Gen [1 2 ...]  (one book / chapters)
Inputs: data/raw (scripts/fetch_sources.sh): OSHB wlc/*.xml + VerseMap.xml, HebrewStrong.xml, IRV hin2017 USFM.
Hand-made: lexicon_hi.json + lex/*.txt (Hindi lemma glosses), word_glosses_hi.json (positional overrides),
           pron_overrides.json, lemma_pron_overrides.json.
Output: data/{Book}/{ch}.json = {"b","n","c","v":[[verse, hindi, [[heb(with /), pron, gloss, lemma, morph, maqaf?],..]],..]}
        data/lex.json = {lemma: [strongNum, hebrew, pron, hindi, english, proper?]}, data/index.json, data/stats.json
"""
import json, re, sys, os, glob, unicodedata
import xml.etree.ElementTree as ET
from translit import translit, CANT
from gloss import compose, short

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, S, OUT = os.path.join(ROOT, 'data', 'raw'), os.path.join(ROOT, 'scripts'), os.path.join(ROOT, 'data')
OSIS = '{http://www.bibletechnologies.net/2003/OSIS/namespace}'
BOOKS = dict(zip(
    'Gen Exod Lev Num Deut Josh Judg Ruth 1Sam 2Sam 1Kgs 2Kgs 1Chr 2Chr Ezra Neh Esth Job Ps Prov Eccl Song Isa Jer Lam Ezek Dan Hos Joel Amos Obad Jonah Mic Nah Hab Zeph Hag Zech Mal'.split(),
    'GEN EXO LEV NUM DEU JOS JDG RUT 1SA 2SA 1KI 2KI 1CH 2CH EZR NEH EST JOB PSA PRO ECC SNG ISA JER LAM EZK DAN HOS JOL AMO OBA JON MIC NAM HAB ZEP HAG ZEC MAL'.split()))
DIGITS = str.maketrans('०१२३४५६७८९', '0123456789')
YHWH = ('3068', '3069')

def load(name):
    p = os.path.join(S, name)
    return json.load(open(p, encoding='utf8')) if os.path.exists(p) else {}

def lexicon():
    lx = {}
    for f in sorted(glob.glob(os.path.join(S, 'lex', '*.txt'))):
        for line in open(f, encoding='utf8'):
            if '|' in line and not line.startswith('#'):
                k, v = line.rstrip('\n').split('|', 1)
                if k.strip() and v.strip(): lx[k.strip()] = v.strip()
    lx.update({k: v for k, v in load('lexicon_hi.json').items() if not k.startswith('_')})
    return lx

LEX_HI = lexicon(); PRON_OV = load('pron_overrides.json'); LEMMA_PRON_OV = load('lemma_pron_overrides.json')
WORD_GL = load('word_glosses_hi.json')

def dump(path, obj):
    """Write path + '.gz' (deployed; app inflates with DecompressionStream). Plain JSON is not kept."""
    import gzip
    data = json.dumps(obj, ensure_ascii=False, separators=(',', ':')).encode('utf8')
    with gzip.GzipFile(path + '.gz', 'wb', compresslevel=9, mtime=0) as f: f.write(data)
    if os.path.exists(path): os.remove(path)

def bare(s):
    return unicodedata.normalize('NFC', CANT.sub('', unicodedata.normalize('NFD', s)).replace('\u05BD', ''))

def strongs():
    ns = '{http://openscriptures.github.com/morphhb/namespace}'
    out = {}
    for e in ET.parse(os.path.join(RAW, 'HebrewStrong.xml')).iter(ns + 'entry'):
        w = e.find(ns + 'w'); m = e.find(ns + 'meaning')
        defs = [d.text for d in m.iter(ns + 'def')] if m is not None else []
        en = ', '.join(dict.fromkeys(d.strip() for d in defs if d))
        if not en and m is not None: en = re.sub(r'\s+', ' ', ''.join(m.itertext())).strip()
        out[e.get('id')] = dict(h=w.text or '', pos=w.get('pos') or '', en=en[:90])
    return out

def versemap():
    out = {}
    for v in ET.parse(os.path.join(RAW, 'VerseMap.xml')).getroot().iter():
        if v.get('wlc'): out[v.get('wlc')] = v.get('kjv')
    return out

def irv_book(book):
    d = os.path.join(RAW, 'hin2017')
    f = next(x for x in os.listdir(d) if x.endswith(BOOKS[book] + 'hin2017.usfm'))
    txt = open(os.path.join(d, f), encoding='utf8').read()
    name = re.search(r'\\h (.+)', txt).group(1).strip().translate(DIGITS)
    verses, titles = {}, {}
    for cm in re.finditer(r'\\c (\d+)\s(.*?)(?=\\c \d+\s|\Z)', txt, re.S):
        c, m = int(cm.group(1)), cm.group(2)
        m = re.sub(r'\\f .*?\\f\*', '', m, flags=re.S)
        m = re.sub(r'\\x .*?\\x\*', '', m, flags=re.S)
        m = re.sub(r'\\bdit .*?\\bdit\*', '', m, flags=re.S)
        dm = re.search(r'\\d (.*)', m)
        if dm: titles[c] = clean(dm.group(1))
        m = re.sub(r'\\(s\d?|ms\d?|mr|r|d|sp|cl|qa|is\d?|ip)\s.*', '', m)
        for vm in re.finditer(r'\\v (\d+)(?:-(\d+))?\S*\s(.*?)(?=\\v \d|\Z)', m, re.S):
            verses[(c, int(vm.group(1)))] = clean(vm.group(3))
            if vm.group(2):
                for k in range(int(vm.group(1)) + 1, int(vm.group(2)) + 1): verses.setdefault((c, k), '')
    return name, verses, titles

def clean(t):
    t = re.sub(r'\\[a-z0-9]+\*?', ' ', t)
    t = re.sub(r'\s+', ' ', t).strip().translate(DIGITS)
    return re.sub(r'\s+([,.;:!?।”’])', r'\1', re.sub(r'([“‘])\s+', r'\1', t))

def build_book(book, chaps, SG, VM, LEX, LEXV):
    root = ET.parse(os.path.join(RAW, book + '.xml')).getroot()
    name, hi, titles = irv_book(book)
    targets = {}
    for w, k in VM.items():
        if w.startswith(book + '.'): targets.setdefault(k, w)
    st = dict(words=0, glossed=0, hand=0)
    nch = 0
    for ch in root.iter(OSIS + 'chapter'):
        c = int(ch.get('osisID').split('.')[1]); nch = max(nch, c)
        if chaps and c not in chaps: continue
        verses, shown = [], set()
        for v in ch.iter(OSIS + 'verse'):
            ref = v.get('osisID'); vn = int(ref.split('.')[-1])
            if ref in VM: kb, kc, kv = VM[ref].split('.')
            elif ref in targets and targets[ref] != ref: kb, kc, kv = None, c, 0  # psalm title
            else: kb, kc, kv = book, c, vn
            kv = re.sub(r'\D.*', '', str(kv)) or 0
            key = (int(kc), int(kv))
            if key[1] == 0: htxt = titles.get(c, '') if ('t', c) not in shown else ''; shown.add(('t', c))
            elif key in shown: htxt = ''
            else: htxt = hi.get(key, ''); shown.add(key)
            words, kids = [], list(v)
            for i, w in enumerate(kids):
                if w.tag != OSIS + 'w': continue
                maq = i + 1 < len(kids) and kids[i + 1].tag == OSIS + 'seg' and kids[i + 1].get('type') == 'x-maqqef'
                b = bare(w.text); lem = w.get('lemma') or ''; morph = w.get('morph') or ''
                key2 = b.replace('/', '')
                lparts = lem.split('/'); mparts = morph[1:].split('/')
                parts, li = [], 0
                for mc in mparts:
                    if mc[:1] == 'S': parts.append((None, mc))
                    else:
                        parts.append((lparts[li] if li < len(lparts) else None, mc)); li += 1
                for l in lparts:
                    if l and l[0].isdigit(): LEX.add(l)
                # pronunciation
                if any(l.split(' ')[0] in YHWH for l in lparts if l):
                    tp = b.split('/'); pre = ''.join(tp[:-1]) if len(tp) > 1 else ''
                    pron = (translit(pre) if pre else '') + 'यहोवा'
                else:
                    pron = PRON_OV.get(key2) or translit(b, maqaf_after=maq)
                g = WORD_GL.get(f'{book}.{c}.{vn}.{len(words)+1}')
                hand = g is not None
                if g is None: g = compose(parts, LEXV, lambda l: SG.get('H' + (re.match(r'\d+', l).group() if re.match(r'\d+', l) else ''), {}).get('pos', '').startswith('n-pr'))
                st['words'] += 1; st['glossed'] += bool(g); st['hand'] += hand
                wd = [b, pron, g, lem, morph]
                if maq: wd.append(1)
                words.append(wd)
            verses.append([vn, htxt, words])
        od = os.path.join(OUT, book); os.makedirs(od, exist_ok=True)
        dump(os.path.join(od, f'{c}.json'), dict(b=book, n=name, c=c, v=verses))
    return name, nch, st

def write_lex(SG, used):
    out, miss = {}, 0
    for k in sorted(used, key=lambda x: (int(re.match(r'\d+', x).group()), x)):
        s = SG.get('H' + re.match(r'\d+', k).group(), {})
        h = bare(s.get('h', ''))
        proper = s.get('pos', '').startswith('n-pr')
        p = LEMMA_PRON_OV.get(k) or (translit(h) if h else '')
        hi = LEX_HI.get(k, '')
        if not hi and proper: hi = p  # names: Devanagari reading until an IRV spelling is added
        if not hi: miss += 1
        out[k] = [int(re.match(r'\d+', k).group()), h, p, hi, s.get('en', '')] + ([1] if proper else [])
    dump(os.path.join(OUT, 'lex.json'), out)
    return len(out), miss

if __name__ == '__main__':
    args = sys.argv[1:]
    books = list(BOOKS) if args[:1] == ['all'] else [args[0]]
    chaps = set(int(x) for x in args[1:]) if args[:1] != ['all'] else set()
    SG, VM, LEX = strongs(), versemap(), set()
    NAMES = {}  # proper nouns without a hand gloss: use their Devanagari reading
    class LexView(dict):
        def get(self, k, d=None):
            v = LEX_HI.get(k)
            if v: return v
            if k not in NAMES:
                s = SG.get('H' + (re.match(r'\d+', k).group() if re.match(r'\d+', k) else ''), {})
                NAMES[k] = (LEMMA_PRON_OV.get(k) or translit(bare(s.get('h', '')))) if s.get('pos', '').startswith('n-pr') else ''
            return NAMES[k] or d
    LEXV = LexView()
    idxp = os.path.join(OUT, 'index.json')
    idx = json.load(open(idxp)) if os.path.exists(idxp) and args[:1] != ['all'] else {'books': []}
    stats = {}
    for bk in books:
        name, nch, st = build_book(bk, chaps, SG, VM, LEX, LEXV)
        stats[bk] = st
        e = next((x for x in idx['books'] if x['id'] == bk), None)
        if not e: e = {'id': bk}; idx['books'].append(e)
        e.update(name=name, chapters=nch)
        print(f"{bk:6} {name:14} ch={nch:3} words={st['words']:6} glossed={st['glossed']/max(1,st['words'])*100:5.1f}%", flush=True)
    order = list(BOOKS); idx['books'].sort(key=lambda b: order.index(b['id']))
    json.dump(idx, open(idxp, 'w', encoding='utf8'), ensure_ascii=False, indent=0)
    if args[:1] == ['all']:
        n, miss = write_lex(SG, LEX)
        json.dump(stats, open(os.path.join(OUT, 'stats.json'), 'w'), indent=0)
        print('lexicon', n, 'lemmas, without Hindi:', miss)
