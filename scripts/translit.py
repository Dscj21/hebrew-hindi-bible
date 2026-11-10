"""Rule-based Hebrew (pointed) -> Devanagari transliterator (modern-ish Israeli reading).

Input may contain '/' morpheme separators (OSHB); they are used for analysis
(a morpheme start behaves like a word start for shva) and never appear in output.
Hand-reviewed exceptions live in pron_overrides.json and are applied by build.py.
"""
import re, unicodedata

CANT = re.compile('[\u0591-\u05AF\u05C0\u05C3-\u05C6\u05BF]')  # accents, paseq, sof pasuq, rafe
SHVA, HSEG, HPAT, HQAM, HIRIQ, TSERE, SEGOL, PATAH, QAMATS, HOLAM, HOLAM_HASER, QUBUTS, DAGESH, METEG, SHIN, SIN, QQATAN = (
    '\u05B0', '\u05B1', '\u05B2', '\u05B3', '\u05B4', '\u05B5', '\u05B6', '\u05B7', '\u05B8', '\u05B9', '\u05BA',
    '\u05BB', '\u05BC', '\u05BD', '\u05C1', '\u05C2', '\u05C7')
VOWEL = {SHVA: '@', HSEG: 'e', HPAT: 'h', HQAM: 'o', HIRIQ: 'i', TSERE: 'e', SEGOL: 'e', PATAH: 'a',
         QAMATS: 'A', HOLAM: 'o', HOLAM_HASER: 'o', QUBUTS: 'u', QQATAN: 'o'}
FINALS = {'ך': 'כ', 'ם': 'מ', 'ן': 'נ', 'ף': 'פ', 'ץ': 'צ'}
CONS = {'ב': ('ब', 'व'), 'ג': ('ग', 'ग'), 'ד': ('द', 'द'), 'ה': ('ह', 'ह'), 'ו': ('व', 'व'), 'ז': ('ज़', 'ज़'),
        'ח': ('ख़', 'ख़'), 'ט': ('त', 'त'), 'י': ('य', 'य'), 'כ': ('क', 'ख़'), 'ל': ('ल', 'ल'), 'מ': ('म', 'म'),
        'נ': ('न', 'न'), 'ס': ('स', 'स'), 'פ': ('प', 'फ़'), 'צ': ('त्स', 'त्स'), 'ק': ('क', 'क'), 'ר': ('र', 'र'),
        'ת': ('त', 'त'), 'ש': ('श', 'श'), 'ס': ('स', 'स'), 'א': ('', ''), 'ע': ('', '')}
BGDKPT = set('בגדכפת')
# vowel -> (matra after consonant, independent letter)
MATRA = {'a': ('ा', 'आ'), 'a0': ('', 'अ'), 'e': ('े', 'ए'), 'i': ('ि', 'इ'), 'I': ('ी', 'ई'), 'o': ('ो', 'ओ'),
         'u': ('ु', 'उ'), 'U': ('ू', 'ऊ'), '@': ('े', 'ए')}
HAL = '्'
FULL = set('aAheiIouU')


def parse(word):
    w = CANT.sub('', unicodedata.normalize('NFD', word))
    letters, start = [], True
    for ch in w:
        if ch == '/':
            start = True
            continue
        if '\u05D0' <= ch <= '\u05EA':
            letters.append(dict(c=FINALS.get(ch, ch), v=None, dag=False, dot=None, meteg=False, start=start))
            start = False
        elif letters:
            L = letters[-1]
            if ch in VOWEL: L['v'] = VOWEL[ch]
            elif ch == DAGESH: L['dag'] = True
            elif ch == METEG: L['meteg'] = True
            elif ch in (SHIN, SIN): L['dot'] = ch
    return letters


def resolve_maters(L):
    out = []
    for i, x in enumerate(L):
        prev = out[-1] if out else None
        last = i == len(L) - 1
        c, v = x['c'], x['v']
        if c == 'ו' and v is None and x['dag']:  # shuruq
            if prev is not None and prev['v'] is None:
                prev['v'] = 'U'; continue
            out.append(dict(x, c='א', v='U', dag=False)); continue
        if c == 'ו' and v == 'o' and not x['dag'] and prev is not None and prev['v'] is None:
            prev['v'] = 'o'; continue  # holam male
        if c == 'י' and v is None and not x['dag'] and prev is not None:
            if prev['v'] == 'i': prev['v'] = 'I'; continue
            if prev['v'] == 'e': continue
            if prev['v'] in ('a', 'A') and i + 1 == len(L) - 1 and L[i + 1]['c'] == 'ו' and not L[i + 1]['dag']: continue
        if c == 'ה' and v is None and not x['dag'] and last and prev is not None: continue
        out.append(dict(x))
    return [x for x in out if not (x['c'] == 'א' and x['v'] is None)]  # quiescent aleph


def translit(word, maqaf_after=False):
    L = resolve_maters(parse(word))
    n = len(L)
    # pass: forte / shva type
    for i, x in enumerate(L):
        prev = L[i - 1] if i else None
        x['forte'] = bool(x['dag'] and prev is not None and prev['v'] in FULL and x['c'] not in 'אעהר')
        if x['v'] == '@':
            if i == n - 1: x['v'] = None
            elif i == 0 or x['forte']: x['v'] = '@'
            elif x['start'] and prev['v'] in ('@', 'U', 'e', 'o'): x['v'] = '@'  # after prefix וּ / לְ / shva
            elif prev is not None and prev.get('nach'): x['v'] = '@'
            elif i + 1 < n and L[i + 1]['c'] == x['c']: x['v'] = '@'
            else: x['v'] = None; x['nach'] = True
    res = []
    for i, x in enumerate(L):
        c, v = x['c'], x['v']
        nxt = L[i + 1] if i + 1 < n else None
        lene = x['dag'] or c not in BGDKPT
        cons = CONS[c][0 if lene else 1]
        if c == 'ש': cons = 'स' if x['dot'] == SIN else 'श'
        if c == 'ס': cons = 'स'
        if x['forte'] and cons: res.append(cons + HAL)
        # furtive patah
        if i == n - 1 and v == 'a' and c in 'חעה' and i > 0 and L[i - 1]['v'] in FULL:
            res.append('अ' + cons); continue
        if v in ('a', 'A', 'h'):
            silent_end = nxt is not None and i + 1 == n - 1 and nxt['c'] in 'אע' and nxt['v'] is None
            closed = nxt is not None and not silent_end and (nxt['v'] is None or nxt.get('forte'))
            if nxt is not None and nxt['c'] == 'י' and nxt['v'] == 'i' and not nxt.get('forte'): closed = True  # -ayim
            if v == 'A' and closed and maqaf_after and nxt is not None and i + 1 == n - 1: v = 'o'
            elif v == 'A' and closed and i + 1 == n - 1 and not maqaf_after: v = 'a'  # stressed final qamats
            elif v == 'h' or closed: v = 'a0'
            else: v = 'a'
        if v is None:
            res.append(cons + (HAL if (nxt is not None and cons) else ''))
            continue
        m, ind = MATRA[v]
        res.append(cons + m if cons else ind)
    s = ''.join(res)
    s = re.sub(HAL + '(?=[अआइईउऊएओ])', '', s)  # no halant before a vowel letter
    s = s.replace('््', '्')
    return unicodedata.normalize('NFC', s)


if __name__ == '__main__':
    import sys
    for a in sys.argv[1:]: print(a, translit(a))
