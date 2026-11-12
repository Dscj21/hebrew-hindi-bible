"""Koine Greek (polytonic) -> Devanagari pronunciation, Erasmian-style reading as taught in Indian seminaries.
Syllables are joined with '·' (like the Hebrew side). Examples: λόγος लो·गोस, ἀρχῇ आर्·ख़े, ὁ हो, θεόν थे·ओन,
Χριστός ख़्रि·स्तोस, ἄγγελος आङ्·गे·लोस, εὐαγγέλιον एउ·आङ्·गे·लि·ओन, αὐτοῦ आउ·तू."""
import unicodedata, re

CONS = {'β': 'ब', 'γ': 'ग', 'δ': 'द', 'ζ': 'ज़', 'θ': 'थ', 'κ': 'क', 'λ': 'ल', 'μ': 'म', 'ν': 'न', 'ξ': 'क्स',
        'π': 'प', 'ρ': 'र', 'σ': 'स', 'ς': 'स', 'τ': 'त', 'φ': 'फ़', 'χ': 'ख़', 'ψ': 'प्स', 'h': 'ह'}
# vowel unit -> (matra, independent)
V = {'a': ('ा', 'आ'), 'e': ('े', 'ए'), 'i': ('ि', 'इ'), 'o': ('ो', 'ओ'), 'u': ('ु', 'उ'),
     'ai': ('ै', 'ऐ'), 'ei': ('ी', 'ई'), 'oi': ('ोइ', 'ओइ'), 'ou': ('ू', 'ऊ'), 'ui': ('ुइ', 'उइ'),
     'au': ('ाउ', 'आउ'), 'eu': ('ेउ', 'एउ')}
VBASE = {'α': 'a', 'ε': 'e', 'η': 'e', 'ι': 'i', 'ο': 'o', 'ω': 'o', 'υ': 'u'}
DIPH = {('a', 'ι'): 'ai', ('e', 'ι'): 'ei', ('o', 'ι'): 'oi', ('o', 'υ'): 'ou', ('u', 'ι'): 'ui',
        ('a', 'υ'): 'au', ('e', 'υ'): 'eu'}
STOPS = set('βγδθκπτφχ')
ONSET2 = {(a, b) for a in STOPS for b in 'λρμν'} | {('σ', b) for b in 'κπτθφχμ'}
HAL = '्'


def units(word):
    """-> list of ('C', letter) / ('V', unit); rough breathing becomes an 'h' consonant."""
    w = unicodedata.normalize('NFD', word.lower())
    out, i, chars = [], 0, []
    for ch in w:
        if ch in '\u0314':  # rough breathing on previous base
            if chars: chars[-1][1].add('rough')
        elif ch == '\u0308':
            if chars: chars[-1][1].add('dia')
        elif unicodedata.combining(ch):
            continue
        elif ch in VBASE or ch in CONS:
            chars.append([ch, set()])
    k = 0
    while k < len(chars):
        ch, fl = chars[k]
        if ch in VBASE:
            v = VBASE[ch]
            nxt = chars[k + 1] if k + 1 < len(chars) else None
            d = DIPH.get((v if ch != 'η' else 'e', nxt[0])) if nxt and 'dia' not in nxt[1] else None
            if ch == 'η' and d not in ('eu',): d = 'eu' if (nxt and nxt[0] == 'υ' and 'dia' not in nxt[1]) else None
            if ch == 'ω': d = None
            rough = 'rough' in fl or (d and 'rough' in nxt[1])
            if rough: out.append(('C', 'h'))
            out.append(('V', d or v)); k += 2 if d else 1
        else:
            if ch == 'ρ' and 'rough' in fl: pass
            out.append(('C', ch)); k += 1
    return out


def translit(word, dots=True):
    u = units(word)
    if not u: return ''
    # nasal gamma
    for i in range(len(u) - 1):
        if u[i] == ('C', 'γ') and u[i + 1][0] == 'C' and u[i + 1][1] in 'γκξχ': u[i] = ('C', 'ŋ')
    vi = [i for i, x in enumerate(u) if x[0] == 'V']
    if not vi: return ''.join(CONS.get(c, '') for _, c in u)
    # split points: syllable starts
    starts = [0]
    for a, b in zip(vi, vi[1:]):
        gap = list(range(a + 1, b))
        if len(gap) == 0: starts.append(b)
        elif len(gap) == 1: starts.append(gap[0])
        else:
            l2 = (u[gap[-2]][1], u[gap[-1]][1])
            starts.append(gap[-2] if l2 in ONSET2 else gap[-1])
    syl = [u[s:e] for s, e in zip(starts, starts[1:] + [len(u)])]
    out = []
    for si, s in enumerate(syl):
        txt, seen_v, last = '', False, si == len(syl) - 1
        cons_run = []
        for j, (t, x) in enumerate(s):
            if t == 'C':
                cons_run.append('ङ' if x == 'ŋ' else CONS[x])
            else:
                if cons_run:
                    txt += HAL.join(cons_run) + V[x][0]
                else:
                    txt += V[x][1]
                cons_run = []; seen_v = True
        if cons_run:  # coda
            coda = HAL.join(cons_run)
            txt += coda if last else coda + HAL
        out.append(txt)
    return ('·' if dots else '').join(out)


if __name__ == '__main__':
    import sys
    for w in (sys.argv[1:] or 'Ἐν ἀρχῇ ἦν ὁ λόγος καὶ θεὸν Ἰησοῦ Χριστοῦ ἄγγελος εὐαγγέλιον αὐτοῦ ὑμεῖς ἐγένετο ἡμέρᾳ υἱὸς Ἀβραάμ οἶκος πνεῦμα ἐκκλησία ῥῆμα σάρξ ἄνθρωπος βασιλεία'.split()):
        print(w, translit(w))
