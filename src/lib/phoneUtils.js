/**
 * Phone number sanitization.
 *
 * Problem: pasting a phone number copied from a Contacts app, WhatsApp, or
 * any Arabic-context source often carries INVISIBLE Unicode bidi control
 * characters (e.g. RLM — Right-to-Left Mark, U+200F) embedded alongside the
 * digits. These characters are invisible when you look at the text, but
 * they force the browser's bidi algorithm to treat the surrounding content
 * as right-to-left — which reorders the visual grouping of digits/spaces
 * even though the underlying digit sequence never changed.
 *
 * This is why typing a number looks fine (no bidi chars get typed) but
 * pasting one looks reversed (the source app's hidden RLM mark comes along
 * for the ride) — and why the corruption then shows up EVERYWHERE that
 * phone number is later displayed (lists, receipts, printouts), not just
 * in the input field itself. The bad character is baked into the stored
 * string.
 *
 * Fix: strip these control characters (and normalize Arabic-Indic digits
 * to Western digits, in case those got pasted in too) both:
 *   1. On input — so new data is clean going forward.
 *   2. On display — so already-corrupted existing data self-heals without
 *      needing a database migration.
 */

// Bidi control characters + zero-width marks that can hitch a ride in
// pasted text: LRM/RLM, LRE/RLE/PDF, LRO/RLO, LRI/RLI/FSI/PDI, and the
// general zero-width space/joiner range.
const BIDI_CONTROL_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

// Arabic-Indic (٠-٩) and Extended Arabic-Indic / Persian (۰-۹) digits,
// mapped to their Western equivalents. Some phone/keyboard apps insert
// these instead of 0-9 when the system locale is Arabic.
const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹';

function normalizeDigits(str) {
  return str.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
            .replace(/[۰-۹]/g, (d) => String(EXTENDED_ARABIC_INDIC.indexOf(d)));
}

/**
 * Clean a phone number string: strip invisible bidi control characters,
 * normalize any Arabic-Indic digits to Western digits, collapse repeated
 * whitespace. Safe to call on both fresh input and already-stored values —
 * idempotent (running it twice gives the same result as running it once).
 */
export function sanitizePhone(raw) {
  if (!raw) return '';
  let s = String(raw);
  s = s.replace(BIDI_CONTROL_CHARS, '');
  s = normalizeDigits(s);
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}
