// RTL pre-processing for pdfmake: every Arabic string destined for the PDF is
// (1) re-shaped by arabic-persian-reshaper into Arabic Presentation Forms —
// which need no OpenType GSUB pass to connect (pdfmake 0.3 can't shape), and
// (2) re-ordered by bidi-js into VISUAL order, so pdfmake can lay the glyphs
// out left→right exactly as the reader will see them. pdfmake's own bidi is
// bypassed entirely: no `direction` prop is used anywhere in the document.
import bidiFactory from 'bidi-js';
import reshaper from 'arabic-persian-reshaper';

const bidi = bidiFactory();

// Reverse characters in `str` between `start` and `end` (inclusive).
function reverseRange(str, start, end) {
  const chars = str.split('');
  for (let i = start, j = end; i < j; i += 1, j -= 1) {
    const tmp = chars[i];
    chars[i] = chars[j];
    chars[j] = tmp;
  }
  return chars.join('');
}

// Shape + reorder a single logical line into its visual-order representation.
export function processRTL(value, fallback = '') {
  if (value === null || value === undefined) return fallback;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;

  // 1) Cursive reshaping: base Arabic block → Presentation Forms (1 char → 1
  //    form char; ل+ا pairs collapse into a single lam-alef ligature).
  const shaped = reshaper.ArabicShaper.convertArabic(text);

  // 2) Bidi resolution. Direction is auto-detected per string, so pure-Latin
  //    runs (business names, phone numbers) stay LTR while Arabic paragraphs
  //    resolve RTL, and digit runs keep their logical LTR order.
  const levels = bidi.getEmbeddingLevels(shaped);

  // 3) Swap mirrored characters (parentheses, brackets, …) for their RTL
  //    counterparts BEFORE reordering, so the swap travels with the glyphs.
  let out = shaped;
  const mirrored = bidi.getMirroredCharactersMap(out, levels);
  if (mirrored.size) {
    const chars = out.split('');
    for (const [index, replacement] of mirrored) chars[index] = replacement;
    out = chars.join('');
  }

  // 4) Reverse each RTL run into visual order (pdfmake typesets LTR).
  for (const [start, end] of bidi.getReorderSegments(out, levels)) {
    out = reverseRange(out, start, end);
  }

  return out;
}

// For long paragraphs that wrap across lines: split on words first, then
// process each line independently, so per-line bidi stays correct. `maxChars`
// is a conservative per-line budget — pdfmake will fill shorter lines with
// justification without ever re-wrapping a visual-order line.
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