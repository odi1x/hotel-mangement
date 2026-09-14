// RTL pre-processing for pdfmake: every Arabic string destined for the PDF is
// (1) re-shaped by arabic-persian-reshaper into Arabic Presentation Forms —
//     needed because pdfmake 0.3 runs no OpenType GSUB/GPOS shaping pass, so
//     the connecting forms must already be encoded; Noto Sans Arabic carries
//     those forms statically in its cmap, so the glyphs map 1:1.
// (2) reversed at the WORD / TOKEN level only — pdfmake's canvas lays glyphs
//     strictly left→right with no bidi pass, so an Arabic reader scanning
//     right→left must encounter the tokens in logical order. Characters
//     inside a word are NEVER reversed (that would spell each word backwards),
//     and numeric/Latin tokens (phones, IDs, amounts, codes) keep their
//     internal LTR order by staying whole tokens. Tokens are re-joined with a
//     single space so words never blend together on the line.
import reshaper from 'arabic-persian-reshaper';

// Reshape + reorder a single logical line for pdfmake's LTR canvas.
export function processRTL(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;

  // 1) Cursive reshaping: base Arabic block → Presentation Forms (ل+ا pairs
  //    collapse into a single lam-alef ligature, so token boundaries survive).
  const shaped = reshaper.ArabicShaper.convertArabic(text);

  // 2) Reverse TOKEN order, never splitting characters inside a word. Every
  //    reversed token is joined with exactly one standard space (U+0020) so
  //    adjacent words keep visible separation in the rendered PDF. Splitting
  //    on the literal space (already collapsed above) keeps `/`, `:` and any
  //    punctuation glued to its word instead of being misread as a separator.
  return shaped.trim().split(' ').reverse().join(' ');
}

// For a "label: number" pair whose number contains spaces (e.g. a phone
// "+966 54 488 1113"). pdfmake lays glyphs left→right with no bidi pass, so
// feeding the phone through the generic token-reversal turns its chunks into
// separate flipped tokens ("1113 488 54 +966"). Gluing the spaces into
// non-breaking spaces (U+00A0) keeps the number ONE atomic EN run that the
// canvas places verbatim left→right, while the Arabic label stays its own
// shaped word. (Unicode bidi controls like U+202A/U+202C cannot isolate here:
// pdfmake has no bidi algorithm, Noto Sans Arabic carries no glyph for those
// code points, and sanitizePhone strips them anyway — a NBSP-joined token
// achieves the same isolation safely.)
export function processRTLPhone(label, number, fallback = '') {
  const labelPart = processRTL(label, fallback);
  const digits = String(number === null || number === undefined ? '' : number)
    .replace(/\s+/g, '\u00A0')
    .trim();
  if (!digits) return labelPart;
  // Physical left→right layout: the whole phone first, the shaped label last
  // so it hugs the right edge (right-aligned line). Reading right→left the
  // reader hits "هاتف:" then the intact "+966 54 488 1113".
  return `${digits} ${labelPart}`;
}

// For long paragraphs that wrap across multiple physical lines, each wrapped
// line is processed independently so the lines keep their top→bottom logical
// order while every line reads correctly right→left. `maxChars` is a
// conservative per-line budget — pdfmake fills shorter lines with
// justification without ever re-wrapping a reversed line.
export function wrapProcessRTL(value, maxChars = 80) {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';

  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines.map((line) => processRTL(line)).join('\n');
}