// Human-friendly booking reference, e.g. "260917-X7K4".
//
// The database UUID stays the real identifier — this code exists purely so
// people can read/quote a booking. It is DERIVED deterministically from the
// booking's creation date + id, which means:
//   * the same booking always shows the same code (no flicker between
//     renders, documents and WhatsApp messages);
//   * code collisions are effectively impossible (UUID → token);
//   * EXISTING bookings get a nice short code automatically — no schema
//     migration or backfill script needed.
//
// Format: YYMMDD (creation date, local) + "-" + 4 chars from a confusion-free
// alphabet (no 0/O, 1/I/L lookalikes), e.g. #260917-X7K4.

const TOKEN_CHARS = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'; // drop I, L, O, 0, 1

function pad2(n) {
  return String(n).padStart(2, '0');
}

// FNV-1a over the id, spread over TOKEN_CHARS for a 4-char code.
function tokenFromId(id) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += TOKEN_CHARS[h % TOKEN_CHARS.length];
    h = Math.floor(h / TOKEN_CHARS.length);
  }
  return out;
}

export function bookingRef(booking) {
  const date = new Date(booking?.createdAt || booking?.startDate || Date.now());
  const yy = pad2(date.getFullYear() % 100);
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  return `${yy}${mm}${dd}-${tokenFromId(booking?.id || '')}`;
}