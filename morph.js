// OSHB morphology code -> Hindi description; prefix/suffix explanations; word -> parts.
const Morph = (() => {
  const G = { m: 'पुल्लिंग', f: 'स्त्रीलिंग', b: 'उभयलिंग', c: 'सामान्य लिंग' }, N = { s: 'एकवचन', p: 'बहुवचन', d: 'द्विवचन' };
  const ST = { a: 'सामान्य रूप', c: 'सम्बन्ध रूप (…का/के)', d: 'निश्चित' }, P = { 1: 'उत्तम पुरुष', 2: 'मध्यम पुरुष', 3: 'अन्य पुरुष' };
  const STEM = { q: 'क़ल', N: 'निफ़ाल', p: 'पिएल', P: 'पुआल', h: 'हिफ़ील', H: 'होफ़ाल', t: 'हितपाएल', o: 'पोलेल', O: 'पोलाल', r: 'हितपोलेल', m: 'पोएल', M: 'पोआल', k: 'पालेल', K: 'पुलाल', Q: 'क़ल कर्मवाच्य', l: 'पिलपेल', L: 'पोलपाल', f: 'हितपालपेल', D: 'नितपाएल', j: 'पएलाल', i: 'पिलेल', u: 'होतपाल', c: 'तिफ़ील', v: 'हिश्तफ़ेल', w: 'नितपालेल', y: 'नितपोएल', z: 'हितपोएल' };
  const ASTEM = { q: 'पेअल', Q: 'पेइल', u: 'हितपेएल', N: 'निफ़ाल', p: 'पाएल', P: 'पुअल', M: 'हितपाअल', a: 'अफ़ेल', h: 'हफ़ेल', s: 'सफ़ेल', e: 'शफ़ेल', H: 'होफ़ाल', i: 'इश्तफ़ाल', t: 'हितपाअल', v: 'हिश्तफ़ाल', w: 'हितपोएल', o: 'पोएल', z: 'हितपोलेल', m: 'पोलेल', r: 'हितपेएल', f: 'हितपालपेल', b: 'हफ़ेल', c: 'तफ़ेल', d: 'इत्तफ़ाल', g: 'पेलपेल', j: 'हितपेलपेल', k: 'पालेल', l: 'हितपालेल', n: 'इतपअल', x: 'अपअल' };
  const VT = { p: 'पूर्ण', q: 'क्रमिक पूर्ण (वे+पूर्ण)', i: 'अपूर्ण', w: 'क्रमिक अपूर्ण (वय्यिक़तोल: "तब…किया")', h: 'इच्छार्थक (कोहोर्टेटिव)', j: 'इच्छार्थक आज्ञा (जस्सिव: "…हो")', v: 'आज्ञार्थ', r: 'कृदन्त (कर्तृवाच्य)', s: 'कृदन्त (कर्मवाच्य)', a: 'क्रियार्थक संज्ञा (पूर्ण रूप)', c: 'क्रियार्थक संज्ञा (सम्बन्ध रूप)' };
  const T = { a: 'स्वीकारात्मक अव्यय', d: 'निश्चयवाचक उपपद (the)', e: 'प्रेरणार्थक अव्यय', i: 'प्रश्नवाचक अव्यय', j: 'विस्मयादिबोधक', m: 'ध्यानाकर्षक अव्यय', n: 'निषेधवाचक अव्यय', o: 'कर्म-चिह्न', r: 'सम्बन्धवाचक अव्यय' };
  const A = { a: 'विशेषण', c: 'संख्यावाचक विशेषण', g: 'जातिवाचक विशेषण', o: 'क्रमसूचक विशेषण', x: 'विशेषण' };
  const SUF = { '1cs': 'मेरा / मुझे', '2ms': 'तेरा / तुझे', '2fs': 'तेरा / तुझे (स्त्री.)', '3ms': 'उसका / उसे', '3fs': 'उसका / उसे (स्त्री.)', '1cp': 'हमारा / हमें', '2mp': 'तुम्हारा / तुम्हें', '2fp': 'तुम्हारा / तुम्हें (स्त्री.)', '3mp': 'उनका / उन्हें', '3fp': 'उनका / उन्हें (स्त्री.)', '3cp': 'उनका / उन्हें', '2cp': 'तुम्हारा / तुम्हें' };
  const PREFIX = { b: 'में, से, के द्वारा', c: 'और, तब', d: 'वह (निश्चयवाचक "the")', k: 'के समान, जैसे', l: 'को, के लिये', m: 'से, में से', i: 'क्या? (प्रश्नवाचक)', s: 'जो' };
  const gnx = s => [G[s[0]], N[s[1]], ST[s[2]]].filter(Boolean);
  function hi(code, aram) {
    const c = code[0], r = code.slice(1);
    if (c === 'N') return [r[0] === 'p' ? 'व्यक्तिवाचक संज्ञा' : 'संज्ञा', ...gnx(r.slice(1))].join(', ');
    if (c === 'A') return [A[r[0]] || 'विशेषण', ...gnx(r.slice(1))].join(', ');
    if (c === 'V') {
      const ty = r[1], x = r.slice(2), bits = ['क्रिया', (aram ? ASTEM : STEM)[r[0]] || r[0], VT[ty] || ty];
      if ('rs'.includes(ty)) bits.push(...gnx(x));
      else if (!'ac'.includes(ty)) { let y = x; if (P[y[0]]) { bits.push(P[y[0]]); y = y.slice(1); } bits.push(...[G[y[0]], N[y[1]]].filter(Boolean)); }
      return bits.join(', ');
    }
    if (c === 'R') return 'सम्बन्धबोधक (पूर्वसर्ग)' + (r === 'd' ? ' + निश्चयवाचक उपपद' : '');
    if (c === 'C') return 'समुच्चयबोधक (संयोजक)';
    if (c === 'D') return 'क्रियाविशेषण';
    if (c === 'T') return T[r[0]] || 'अव्यय';
    if (c === 'P') return ['सर्वनाम', P[r[1]], G[r[2]], N[r[3]]].filter(Boolean).join(', ');
    if (c === 'S') return r[0] === 'p' ? 'सर्वनाम प्रत्यय, ' + [P[r[1]], G[r[2]], N[r[3]]].filter(Boolean).join(', ') : ({ d: 'दिशासूचक प्रत्यय (की ओर)', h: 'अतिरिक्त ה प्रत्यय', n: 'अतिरिक्त न प्रत्यय' }[r[0]] || 'प्रत्यय');
    return code;
  }
  function parts(w) {
    const tp = w[0].split('/'), lp = (w[3] || '').split('/'), mc = (w[4] || '').slice(1).split('/'), aram = (w[4] || '')[0] === 'A';
    let li = 0;
    return mc.map((m, i) => {
      const p = { h: tp[i] || '', m: hi(m, aram) };
      if (m[0] === 'S') { if (m[1] === 'p') p.g = SUF[m.slice(2, 5)] || ''; }
      else { const l = lp[li++] || ''; if (/^\d/.test(l)) p.k = l; else { p.g = PREFIX[l] || ''; if (m === 'Rd') p.g += ' + वह (the)'; } }
      return p;
    });
  }
  // compact chip text, e.g. 'यो-व | क्रि-क़ल-कथा-3पु.ब', 'सं-पु.ब.सम्ब | 3पु.ए'
  const GA = { m: 'पु', f: 'स्त्री', b: 'उ', c: 'सा' }, NA = { s: 'ए', p: 'ब', d: 'द्वि' }, SA = { c: 'सम्ब', d: 'नि' };
  const VA = { p: 'पूर्ण', q: 'क्र.पूर्ण', i: 'अपूर्ण', w: 'कथा', h: 'इच्छा', j: 'जस', v: 'आज्ञा', r: 'कृद', s: 'कृद.कर्म', a: 'क्रियार्थ', c: 'क्रियार्थ.सम्ब' };
  const LA = { b: 'ब', c: 'व', k: 'क', l: 'ल', m: 'म', d: 'ह', s: 'श', i: 'ह' };
  const TA = { a: 'स्वी', d: 'उपपद', e: 'प्रेर', i: 'प्रश्न', j: 'विस्म', m: 'ध्यान', n: 'निषेध', o: 'कर्म', r: 'सम्ब' };
  const gns = s => [GA[s[0]], NA[s[1]], SA[s[2]]].filter(Boolean).join('.');
  function abbr(m, lem, aram) {
    const c = m[0], r = m.slice(1);
    const L = lem && !/^\d/.test(lem) && LA[lem] ? '-' + LA[lem] : '';
    if (c === 'N') return (r[0] === 'p' ? 'नाम' : 'सं') + (gns(r.slice(1)) ? '-' + gns(r.slice(1)) : '');
    if (c === 'A') return 'वि' + (gns(r.slice(1)) ? '-' + gns(r.slice(1)) : '');
    if (c === 'V') {
      const ty = r[1], x = r.slice(2), st = ((aram ? ASTEM : STEM)[r[0]] || r[0]).split(' ')[0];
      let tail = '';
      if ('rs'.includes(ty)) tail = gns(x);
      else if (!'ac'.includes(ty)) tail = (P[x[0]] ? x[0] : '') + [GA[x[P[x[0]] ? 1 : 0]], NA[x[P[x[0]] ? 2 : 1]]].filter(Boolean).join('.');
      return ['क्रि', st, VA[ty] || ty, tail].filter(Boolean).join('-');
    }
    if (c === 'R') return 'पूर्व' + L + (r === 'd' ? '+ह' : '');
    if (c === 'C') return 'यो' + L;
    if (c === 'D') return 'क्रिवि';
    if (c === 'T') return (TA[r[0]] || 'अव्य') + L;
    if (c === 'P') return 'सर्व' + ([r[1], [GA[r[2]], NA[r[3]]].filter(Boolean).join('.')].filter(Boolean).join(''));
    if (c === 'S') return r[0] === 'p' ? r[1] + [GA[r[2]], NA[r[3]]].filter(Boolean).join('.') : ({ d: 'दिशा', h: 'प्र', n: 'प्र' }[r[0]] || 'प्र');
    return m;
  }
  function chip(w) {
    const lp = (w[3] || '').split('/'), mc = (w[4] || '').slice(1).split('/'), aram = (w[4] || '')[0] === 'A';
    let li = 0;
    const segs = mc.map(m => abbr(m, m[0] === 'S' ? null : lp[li++], aram));
    const verb = mc.some(m => m[0] === 'V');
    return { t: segs.join(' | '), verb };
  }
  // ---- English ----
  const GE = { m: 'masculine', f: 'feminine', b: 'both genders', c: 'common' }, NE = { s: 'singular', p: 'plural', d: 'dual' }, STE = { c: 'construct', d: 'definite' };
  const PE = { 1: '1st person', 2: '2nd person', 3: '3rd person' };
  const SE = { q: 'Qal', N: 'Niphal', p: 'Piel', P: 'Pual', h: 'Hiphil', H: 'Hophal', t: 'Hithpael', o: 'Polel', O: 'Polal', r: 'Hithpolel', m: 'Poel', M: 'Poal', k: 'Palel', K: 'Pulal', Q: 'Qal passive', l: 'Pilpel', L: 'Polpal', f: 'Hithpalpel', D: 'Nithpael', j: 'Pealal', i: 'Pilel', u: 'Hothpaal', c: 'Tiphil', v: 'Hishtaphel', w: 'Nithpalel', y: 'Nithpoel', z: 'Hithpoel' };
  const VE = { p: 'perfect', q: 'sequential perfect (weqatal)', i: 'imperfect', w: 'sequential imperfect (wayyiqtol: “and he …”)', h: 'cohortative', j: 'jussive', v: 'imperative', r: 'participle (active)', s: 'participle (passive)', a: 'infinitive absolute', c: 'infinitive construct' };
  const VA2 = { p: 'Perf', q: 'WeqPerf', i: 'Impf', w: 'Wayy', h: 'Coh', j: 'Juss', v: 'Impv', r: 'Ptc', s: 'PtcPass', a: 'InfAbs', c: 'InfCon' };
  const TE = { a: 'affirmative particle', d: 'definite article (the)', e: 'exhortation particle', i: 'interrogative particle', j: 'interjection', m: 'demonstrative particle', n: 'negative particle', o: 'direct object marker', r: 'relative particle' };
  const TA2 = { a: 'Aff', d: 'Art', e: 'Exh', i: 'Interr', j: 'Interj', m: 'Dem', n: 'Neg', o: 'DirObj', r: 'Rel' };
  const AE = { a: 'adjective', c: 'cardinal number', g: 'gentilic adjective', o: 'ordinal number', x: 'adjective' };
  const SUFE = { '1cs': 'my / me', '2ms': 'your / you', '2fs': 'your / you (f.)', '3ms': 'his / him', '3fs': 'her', '1cp': 'our / us', '2mp': 'your / you (pl.)', '2fp': 'your / you (f. pl.)', '3mp': 'their / them', '3fp': 'their / them (f.)', '3cp': 'their / them', '2cp': 'your / you (pl.)' };
  const PREFE = { b: 'in, with, by', c: 'and, then', d: 'the', k: 'like, as', l: 'to, for', m: 'from', i: 'interrogative (?)', s: 'who, which' };
  const gne = s => [GE[s[0]], NE[s[1]], STE[s[2]]].filter(Boolean);
  function en(code) {
    const c = code[0], r = code.slice(1);
    if (c === 'N') return [r[0] === 'p' ? 'Proper noun' : 'Noun', ...gne(r.slice(1))].join(', ');
    if (c === 'A') return [AE[r[0]] || 'adjective', ...gne(r.slice(1))].join(', ').replace(/^./, x => x.toUpperCase());
    if (c === 'V') {
      const ty = r[1], x = r.slice(2), bits = ['Verb', SE[r[0]] || r[0], VE[ty] || ty];
      if ('rs'.includes(ty)) bits.push(...gne(x));
      else if (!'ac'.includes(ty)) { let y = x; if (PE[y[0]]) { bits.push(PE[y[0]]); y = y.slice(1); } bits.push(...[GE[y[0]], NE[y[1]]].filter(Boolean)); }
      return bits.join(', ');
    }
    if (c === 'R') return 'Preposition' + (r === 'd' ? ' + article' : '');
    if (c === 'C') return 'Conjunction';
    if (c === 'D') return 'Adverb';
    if (c === 'T') return (TE[r[0]] || 'particle').replace(/^./, x => x.toUpperCase());
    if (c === 'P') return ['Pronoun', PE[r[1]], GE[r[2]], NE[r[3]]].filter(Boolean).join(', ');
    if (c === 'S') return r[0] === 'p' ? 'Pronominal suffix, ' + [PE[r[1]], GE[r[2]], NE[r[3]]].filter(Boolean).join(', ') : ({ d: 'Directional suffix (toward)', h: 'Paragogic he', n: 'Paragogic nun' }[r[0]] || 'Suffix');
    return code;
  }
  const gnsE = s => (s[0] && s[0] !== 'x' ? s[0] : '') + (s[1] || '') + (s[2] && s[2] !== 'a' ? s[2] : '');
  function abbrEn(m, lem) {
    const c = m[0], r = m.slice(1), L = lem && !/^\d/.test(lem) ? '-' + ({ c: 'w' }[lem] || lem) : '';
    if (c === 'N') return (r[0] === 'p' ? 'Np' : 'N') + (gnsE(r.slice(1)) ? '-' + gnsE(r.slice(1)) : '');
    if (c === 'A') return 'Adj' + (gnsE(r.slice(1)) ? '-' + gnsE(r.slice(1)) : '');
    if (c === 'V') { const ty = r[1], x = r.slice(2); return ['V', SE[r[0]] || r[0], VA2[ty] || ty, x.replace(/x/g, '')].filter(Boolean).join('-'); }
    if (c === 'R') return 'Prep' + L + (r === 'd' ? '+Art' : '');
    if (c === 'C') return 'Cj' + L;
    if (c === 'D') return 'Adv';
    if (c === 'T') return (TA2[r[0]] || 'Prt') + (r[0] === 'd' ? '' : L);
    if (c === 'P') return 'Pro-' + r.slice(1);
    if (c === 'S') return r[0] === 'p' ? r.slice(1) : ({ d: 'Dir', h: 'Par', n: 'Par' }[r[0]] || 'Suf');
    return m;
  }
  function chipL(w, lang) {
    if (lang !== 'en') return chip(w);
    const lp = (w[3] || '').split('/'), mc = (w[4] || '').slice(1).split('/');
    let li = 0;
    return { t: mc.map(m => abbrEn(m, m[0] === 'S' ? null : lp[li++])).join(' | '), verb: mc.some(m => m[0] === 'V') };
  }
  function partsL(w, lang) {
    const ps = parts(w); if (lang !== 'en') return ps;
    const mc = (w[4] || '').slice(1).split('/'), lp = (w[3] || '').split('/');
    let li = 0;
    return ps.map((p, i) => {
      const m = mc[i] || '', q = Object.assign({}, p, { m: en(m) });
      if (m[0] === 'S') { if (m[1] === 'p') q.g = SUFE[m.slice(2, 5)] || ''; }
      else { const l = lp[li++] || ''; if (!/^\d/.test(l)) q.g = (PREFE[l] || '') + (m === 'Rd' ? ' + the' : ''); }
      return q;
    });
  }
  return { hi, en, parts, chip, chipL, partsL };
})();
