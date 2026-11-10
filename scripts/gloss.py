"""Compose a short in-context Hindi gloss for one OSHB word from prefix + lemma + morphology + suffix.
Hand overrides (word_glosses_hi.json) win over this; this is the safe automatic fallback."""
import re
from hi_gender import gender as hi_gender

PRE_WORD = {'c': 'और', 'i': 'क्या', 's': 'जो'}
PRE_POST = {'b': 'में', 'l': 'को', 'k': 'के समान', 'm': 'से'}
OBJ = {'1cs': 'मुझे', '2ms': 'तुझे', '2fs': 'तुझे', '3ms': 'उसे', '3fs': 'उसे', '1cp': 'हमें', '2mp': 'तुम्हें',
       '2fp': 'तुम्हें', '3mp': 'उन्हें', '3fp': 'उन्हें', '3cp': 'उन्हें', '2cp': 'तुम्हें'}
OBL = {'1': 'मुझ', '2': 'तुझ', '3': 'उस'}
OBLP = {'1': 'हम', '2': 'तुम', '3': 'उन'}
POSS = {'1cs': 'मेर', '2ms': 'तेर', '2fs': 'तेर', '3ms': 'उसक', '3fs': 'उसक', '1cp': 'हमार', '2mp': 'तुम्हार',
        '2fp': 'तुम्हार', '3mp': 'उनक', '3fp': 'उनक', '3cp': 'उनक', '2cp': 'तुम्हार'}
SUBJ = {'1cs': 'मैं', '1cp': 'हम', '2ms': 'तू', '2fs': 'तू', '2mp': 'तुम', '2fp': 'तुम'}
OBLIQUE_WORDS = {'बेटा', 'लड़का', 'घोड़ा', 'गदहा', 'कपड़ा', 'उजियाला', 'अन्धियारा', 'बछड़ा', 'मेढ़ा', 'रास्ता',
                 'बकरा', 'पहिया', 'बूढ़ा', 'गुम्मट', 'कटोरा', 'हण्डा', 'छोटा', 'बड़ा', 'भला', 'बुरा', 'दूसरा', 'पहला',
                 'तीसरा', 'चौथा', 'सातवाँ', 'आठवाँ', 'दसवाँ', 'अगला', 'पिछला', 'नया', 'सीधा', 'ऊँचा', 'कड़वा', 'भारी'}
# -ā words that do NOT inflect (feminine Sanskrit nouns, kinship/agent nouns)
NO_OBL = set('राजा पिता दादा चाचा मामा नाना देवता योद्धा दाता आत्मा परमात्मा नेता कर्ता माता सेना दया कृपा शिक्षा आज्ञा सभा प्रजा पूजा यात्रा भाषा सीमा महिमा आशा इच्छा घटना रचना प्रार्थना वर्षा सेवा रक्षा परीक्षा दशा दिशा कथा व्यवस्था अवस्था आराधना प्रतिज्ञा निन्दा मात्रा क्षमा प्रशंसा चिन्ता शोभा कन्या माला शाला कला लता हवा दवा सज़ा याह यहोवा मन्ना जूफा प्रतिमा मूर्खता पवित्रता शुद्धता दुष्टता सच्चाई गदा ज्वाला ललकार घृणा तृष्णा लज्जा सहायता नम्रता विधवा वेश्या दासता बाधा'.split())
VOWEL_SIGNS = 'ािीुूेैोौ'
IND = {'ा': 'आ', 'ि': 'इ', 'ी': 'ई', 'ु': 'उ', 'ू': 'ऊ', 'े': 'ए', 'ै': 'ऐ', 'ो': 'ओ', 'ौ': 'औ'}
PAST_IRR = {'कर': ('किया', 'की', 'किए'), 'दे': ('दिया', 'दी', 'दिए'), 'ले': ('लिया', 'ली', 'लिए'),
            'हो': ('हुआ', 'हुई', 'हुए'), 'जा': ('गया', 'गई', 'गए'), 'पी': ('पिया', 'पी', 'पिए')}
FUT = {'1cs': 'ूँगा', '1cp': 'ेंगे', '2ms': 'ेगा', '2fs': 'ेगी', '2mp': 'ोगे', '2fp': 'ोगी', '3ms': 'ेगा',
       '3fs': 'ेगी', '3mp': 'ेंगे', '3fp': 'ेंगी', '3cp': 'ेंगे', '2cp': 'ोगे'}
SUB = {'1cs': 'ूँ', '1cp': 'ें', '2ms': 'े', '2fs': 'े', '2mp': 'ो', '2fp': 'ो', '3ms': 'े', '3fs': 'े',
       '3mp': 'ें', '3fp': 'ें', '3cp': 'ें', '2cp': 'ो'}


STEMNAME = {'h': 'हिफ़ील', 'H': 'होफ़ाल', 'p': 'पिएल', 'P': 'पुआल', 'N': 'निफ़ाल', 't': 'हितपाएल'}


def short(gl, stem=None):
    """first sense; for verbs a '(हिफ़ील) X' style sense matching the stem wins."""
    if not gl: return ''
    if stem in STEMNAME:
        m = re.search(r'\(' + STEMNAME[stem] + r'\)\s*([^,;()]+)', gl)
        if m: return m.group(1).strip()
    s = re.sub(r'\s*\(.*?\)\s*', ' ', gl)
    s = re.split(r'[,;]', s)[0]
    return s.strip()


def _attach(stem, end):
    """stem + matra-style ending, fixing vowel-final stems."""
    if not end: return stem
    last = stem[-1]
    if last in 'ेो':  # दे, ले, हो
        if end[0] == 'ू':  # 1cs future/subj: दूँगा, लूँ, होऊँ
            return (stem[:-1] + 'ू' + end[1:]) if last == 'े' else stem + 'ऊ' + end[1:]
        return stem + end[1:] if end[0] in 'ेो' else stem + end
    if last in VOWEL_SIGNS or last in 'अआइईउऊएओ':
        return stem + IND.get(end[0], end[0]) + end[1:]
    return stem + end


def conj(inf, typ, pgn):
    words = inf.split()
    if not words or not words[-1].endswith('ना'): return inf
    head, stem = words[:-1], words[-1][:-2]
    p, g, n = (pgn + '   ')[:3]
    if typ in 'pqw' and typ != 'q':
        ms, fs, pl = PAST_IRR.get(stem) or ((stem + 'या', stem + 'ई', stem + 'ए') if stem[-1] in VOWEL_SIGNS
                                            else (stem + 'ा', stem + 'ी', stem + 'े'))
        form = pl if n == 'p' else fs if g == 'f' else ms
        return ' '.join(head + [form])
    if typ in 'iq':
        form = _attach(stem, FUT.get(pgn, 'ेगा'))
    elif typ in 'jh':
        form = _attach(stem, SUB.get(pgn, 'े'))
    elif typ == 'v':
        form = {'दे': 'दो', 'ले': 'लो', 'हो': 'हो'}.get(stem, _attach(stem, 'ो')) if n == 'p' else stem
    elif typ == 'r':
        form = stem + ('नेवाली' if g == 'f' and n != 'p' else 'नेवाले' if n == 'p' else 'नेवाला')
    elif typ == 's':
        ms, fs, pl = PAST_IRR.get(stem) or ((stem + 'या', stem + 'ई', stem + 'ए') if stem[-1] in VOWEL_SIGNS
                                            else (stem + 'ा', stem + 'ी', stem + 'े'))
        form = (pl + ' हुए') if n == 'p' else (fs + ' हुई') if g == 'f' else (ms + ' हुआ')
    else:
        return inf
    sub = SUBJ.get(pgn) if typ in 'iqjh' else None
    return ' '.join(([sub] if sub else []) + head + [form])


def pron_with_post(pgn, post):
    """pronoun suffix on a preposition: उस पर, उसके साथ, उसकी ओर, उसे."""
    if post == 'को': return OBJ.get(pgn, '')
    if post.startswith(('के', 'की', 'का')):
        return POSS.get(pgn, 'उसक') + {'के': 'े', 'की': 'ी', 'का': 'ा'}[post[:2]] + post[2:]
    p, n = pgn[:1], pgn[2:3]
    return ((OBLP if n == 'p' else OBL).get(p, 'उस')) + ' ' + post


def compose(parts, lexhi, ispropn):
    """parts: list of (lemma_or_letter_or_None, morphcode). Returns Hindi gloss or ''."""
    pre, posts, main, suf = [], [], None, None
    for lem, mc in parts:
        if mc[0] == 'S':
            suf = mc
        elif lem and lem[0].isdigit():
            if main is not None:  # e.g. two content lemmas: treat earlier as a preposition-like word
                posts.append(short(lexhi.get(main[0], '')))
            main = (lem, mc)
        elif lem:
            if lem in PRE_WORD: pre.append(PRE_WORD[lem])
            elif lem in PRE_POST: posts.append(PRE_POST[lem])
    post = ' '.join(x for x in posts if x)
    sp = suf[2:5] if suf and suf[1:2] == 'p' else None
    if main is None:
        core = pron_with_post(sp, post) if (sp and post) else (OBJ.get(sp, '') if sp else post)
        return ' '.join(x for x in pre + [core] if x)
    lem, mc = main
    base = short(lexhi.get(lem, ''), mc[1:2] if mc[0] == 'V' else None)
    if not base: return ''
    pos = mc[0]
    if pos == 'V':
        typ, pgn = mc[2:3], mc[3:6]
        if typ in 'rs': pgn = '3' + mc[3:5]
        if typ in 'ac' and base.split()[-1].endswith('ना'):
            stem = base[:-2]
            core = {'को': stem + 'ने को', 'में': stem + 'ते समय', 'के समान': stem + 'ते समय', 'से': stem + 'ने से'}.get(post, base)
            post = ''
        else:
            core = conj(base, typ, pgn)
        if sp and typ in 'rs':  # participle with suffix behaves like a noun: मेरा चरवाहा
            g, n = mc[3:4], mc[4:5]
            core = POSS.get(sp, 'उसक') + ('ी' if g == 'f' and n != 'p' else 'े' if n == 'p' or post else 'ा') + ' ' + core
        elif sp: core = OBJ.get(sp, '') + ' ' + core
    elif lem.startswith('853'):  # object marker
        core = OBJ.get(sp, '(को)') if sp else '(को)'
    elif pos in 'RD' or (pos == 'T' and sp):
        core = pron_with_post(sp, base) if sp else base
    elif pos in 'NA':
        noun = base
        g, n = mc[2:3], mc[3:4]
        ws = noun.split(); lw = ws[-1] if ws else ''
        if pos == 'N' and lw: g = hi_gender(lw, lem)  # agreement follows the Hindi noun (मेरी शिक्षा), not Hebrew
        if (post or n == 'p') and lw and not ispropn(lem) and (lw in OBLIQUE_WORDS or (
                lw.endswith('ा') and not lw.endswith('ना') and g == 'm' and lw not in NO_OBL and not lw.endswith('ता') and len(lw) > 2)):
            ws[-1] = lw[:-1] + 'े'; noun = ' '.join(ws)
        if sp and not ispropn(lem):
            end = 'ी' if g == 'f' else 'े' if (post or n == 'p') else 'ा'
            noun = POSS.get(sp, 'उसक') + end + ' ' + noun
        core = noun
    elif pos == 'P':
        core = base
    else:
        core = pron_with_post(sp, base) if sp else base
    if post: core = core + ' ' + post
    return ' '.join(x for x in pre + [core] if x)
