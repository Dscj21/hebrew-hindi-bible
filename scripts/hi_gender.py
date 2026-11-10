"""Grammatical gender of Hindi nouns (for possessive agreement: मेरा घर / मेरी शिक्षा).
Order: explicit per-lemma marker in lex (~m/~f) > scripts/hi_gender.txt word list > suffix heuristics > Hebrew gender."""
import os
_D = {}
_p = os.path.join(os.path.dirname(__file__), 'hi_gender.txt')
if os.path.exists(_p):
    for line in open(_p, encoding='utf8'):
        line = line.split('#')[0].strip()
        if '|' in line:
            w, g = line.split('|', 1); _D[w.strip()] = g.strip()

def guess(w):
    if w in _D: return _D[w]
    if w.endswith(('ी', 'ई', 'ि', 'ता', 'आहट', 'ाहट', 'ावट', 'ियाँ', 'िया', 'िन', 'ानी')): return 'f'
    if w.endswith(('पन', 'त्व', 'ापा', 'वाला', 'कार', 'दार')): return 'm'
    if w.endswith('ा'): return 'm'
    return None


LEX_G = {}  # lemma key -> 'm'/'f' from a '~m'/'~f' marker on the lex gloss (filled by build.py)


def gender(word, lemma=None):
    """Hindi gender of the gloss head word; Hindi's default for unlisted consonant-final nouns is masculine."""
    return LEX_G.get(lemma) or guess(word) or 'm'
