// Programmatic PDF generation (pdfmake) — a clean, reliable A4 document
// with properly-shaped Arabic text. Registered with pdfmake lazily so the
// embedded fonts are only fetched when someone actually clicks
// "إرسال عبر واتساب". The layout mirrors PrintAgreement's preview but is
// typeset here, not rasterized — so no font-fallback / page-slicing issues.
//
// Arabic rendering model (the important part):
//   * pdfmake 0.3 does NOT shape (no OpenType GSUB pass) and does NOT apply
//     the Unicode Bidi Algorithm per word, but pdfkit DOES flip each
//     space-delimited word into visual order before placement. The usable
//     fonts are therefore only those whose cmap ships the Arabic
//     Presentation Forms (U+FE70–FEFC) STATICALLY — GSUB-only fonts (Zain,
//     Tajawal, Almarai, …) render connected text as blank/disconnected.
//     Noto Sans Arabic v2.013 (full build) passes 140/141 (U+FE75 is never
//     emitted by the reshaper).
//   * Every string is pre-processed by rtlPdf.processRTL:
//       1) arabic-persian-reshaper converts the base Arabic block into
//          Presentation Forms (positionally correct initial/medial/final
//          glyphs, incl. lam-alef ligatures) — no font shaping needed;
//       2) TOKEN order is reversed (shaped text split on whitespace).
//          Characters INSIDE a word are NOT touched — pdfkit re-flips them
//          during layout, and digits/Latin tokens must keep their order.
//   * pdfmake then lays each glyph left→right exactly as the reader should
//     see it: `direction` is intentionally NOT set anywhere, and alignment
//     is 'right' globally so lines hug the right edge like the preview.
//   * Columns / table bodies are still laid out in array order (left→right),
//     so every visually-RTL table is authored in REVERSE order here — the
//     first array cell is rendered leftmost, the last cell rightmost — giving
//     the reader, from the right: [rightmost … leftmost] = [first … last].
import { processRTL, wrapProcessRTL } from './rtlPdf';
import { computeBookingTotals, formatSAR } from './paymentUtils';
import { sanitizePhone } from './phoneUtils';

const GREY_900 = '#111111';
const GREY_600 = '#4b5563';
const GREY_500 = '#6b7280';
const GREY_400 = '#9ca3af';
const ACCENT = '#0f766e';

// Currency is always a PREFIX: ر.س 275, ر.س 0.00. The numeric part is passed
// in already-formatted (a string) so null/zero/fractional values are never
// dropped or turned into a bare ".". The cell wrapper (rtlTableValue) runs
// processRTL over the final "ر.س 275" string.
export function formatAmount(value) {
  return `ر.س ${value === null || value === undefined ? '' : value}`;
}

// Small grey label used as the header row cell of the financial tables.
export function rtlTableHeader(label) {
  return { text: processRTL(label), fontSize: 8, bold: true, color: GREY_400 };
}

// Bold value cell for the financial tables.
export function rtlTableValue(value, opts = {}) {
  return {
    text: processRTL(value),
    fontSize: opts.fontSize || 12,
    bold: true,
    color: opts.color || GREY_900
  };
}

// Section heading — light-grey pill with a solid accent bar on the RIGHT
// edge (mirrors `bg-gray-100 border-r-4 border-accent`). Because pdfmake
// lays table columns left→right, the 4pt accent cell is placed LAST, which
// lands it on the right side. Margin [0, 8, 0, 4] = consistent vertical
// rhythm between sections.
function sectionTitle(text) {
  return {
    margin: [0, 8, 0, 4],
    table: {
      widths: ['*', 4],
      body: [[
        {
          text: processRTL(text),
          fillColor: '#f3f4f6',
          color: GREY_900,
          bold: true,
          fontSize: 12,
          padding: [8, 6, 8, 6]
        },
        { text: '', fillColor: ACCENT, padding: [0, 0, 0, 0] }
      ]]
    },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: () => 0,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingTop: () => 0,
      paddingBottom: () => 0
    }
  };
}

// Two-column list block (أطراف العقد / العقار ومدة الإيجار). The first item
// in `columns` renders leftmost, so pass the LEFT block first.
function rtlColumn(headerText, lines, { alignment = 'right' } = {}) {
  return {
    width: '*',
    stack: [
      { text: processRTL(headerText), fontSize: 8, color: GREY_400, bold: true, margin: [0, 0, 0, 4], alignment },
      ...lines.map((line) => ({ ...line, alignment: line.alignment || alignment }))
    ]
  };
}

// pdfmake needs images as PNG/JPEG data URLs — fetch any remote logo/stamp
// just-in-time and convert. ImageKit often serves WebP/AVIF, which pdfmake
// can't embed, so non-PNG/JPEG sources are re-encoded to PNG via canvas. A
// missing/broken image falls back to null (the element is skipped) instead
// of breaking the whole document.
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function toDataUrl(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const type = blob.type || '';
    if (type === 'image/png' || type === 'image/jpeg') {
      return blobToDataUrl(blob);
    }
    return await new Promise((resolve, reject) => {
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        } finally {
          URL.revokeObjectURL(objUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        reject(new Error('image decode failed'));
      };
      img.src = objUrl;
    });
  } catch {
    return null;
  }
}

let pdfMake = null;

async function ensurePdfMake() {
  if (pdfMake) return;
  const [pdfmakeMod, fontMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('./.pdfFonts.generated')
  ]);

  const maker = pdfmakeMod.default || pdfmakeMod;
  maker.addVirtualFileSystem({
    'NotoSansArabic-Regular.ttf': fontMod.NOTO_SANS_REGULAR_B64,
    'NotoSansArabic-Bold.ttf': fontMod.NOTO_SANS_BOLD_B64
  });
  maker.addFonts({
    NotoSansArabic: {
      normal: 'NotoSansArabic-Regular.ttf',
      bold: 'NotoSansArabic-Bold.ttf',
      italics: 'NotoSansArabic-Regular.ttf',
      bolditalics: 'NotoSansArabic-Bold.ttf'
    }
  });
  pdfMake = maker;
}

// Dates keep ARABIC month names but LATIN (Western) numerals via the
// `-u-nu-latn` locale extension. Arabic-Indic digits (U+0660–U+0669) are bidi
// class AN: pdfkit classifies a word made of them as RTL and reverses the
// digits internally (2026 → 6202). Western digits are class EN and are placed
// verbatim, so `22 سبتمبر 2026` stays correct after processRTL.
const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG-u-nu-latn', {
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

const calculateNights = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e - s);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
};

// Build a fully-styled A4 document definition from the same booking data
// the preview uses. Mirrors the on-screen sections: header, parties,
// unit/rental period, financial terms (table), payment status (voucher
// only), terms + signatures (confirmation only).
export default async function generateDocumentPdf({ booking, apartment, user, documentType }) {
  await ensurePdfMake();

  const [logoDataUrl, stampDataUrl] = await Promise.all([
    user?.logoUrl ? toDataUrl(user.logoUrl) : null,
    user?.stampUrl ? toDataUrl(user.stampUrl) : null
  ]);

  const licenseNumber = apartment?.licenseNumber || user?.tourismLicense;
  const nights = calculateNights(booking.startDate, booking.endDate);
  const subtotal = parseFloat(booking.pricePerNight) * nights;
  const taxAmount = user?.taxEnabled && user?.taxPercentage
    ? (subtotal * parseFloat(user.taxPercentage)) / 100
    : 0;
  const total = subtotal + taxAmount;
  const { totalReceived, balanceDue } = computeBookingTotals(booking);

  const isVoucher = documentType === 'voucher';
  const docTitle = isVoucher ? 'حجز مبدئي' : 'حجز مؤكد';
  const pageWidth = 515; // A4 minus 40px margins each side

  const taxLabel = user?.taxEnabled && user?.taxPercentage
    ? `الضريبة (${user.taxPercentage}%)`
    : 'الضريبة';
  const paymentStatus = balanceDue <= 0.01
    ? 'مسدد بالكامل'
    : totalReceived > 0.01 ? 'سداد جزئي' : 'غير مسدد';

  const content = [
    /* ── Header — title + ref on the RIGHT, business identity on the LEFT,
       separated by the document's 2px bottom rule (border-b-2). Because
       pdfmake lays columns left→right, the LEFT block (business) is listed
       first in the array. ── */
    {
      columns: [
        {
          width: 'auto',
          stack: [
            ...(logoDataUrl ? [{ image: logoDataUrl, width: 64, fit: [64, 64], alignment: 'left', margin: [0, 0, 0, 4] }] : []),
            { text: processRTL(user?.businessName || 'رنت فلو العقارية'), fontSize: 15, bold: true, color: GREY_900, alignment: 'left', margin: [0, 0, 0, 2] },
            ...(licenseNumber ? [
              { text: processRTL(`ترخيص رقم: ${licenseNumber}`), fontSize: 8, color: GREY_500, alignment: 'left' }
            ] : [])
          ]
        },
        {
          width: '*',
          stack: [
            { text: processRTL(docTitle), fontSize: 26, bold: true, color: GREY_900, margin: [0, 0, 0, 2] },
            { text: processRTL(`المرجع: #${booking.id.toUpperCase()}`), fontSize: 9, color: GREY_500, margin: [0, 0, 0, 4] }
          ]
        }
      ],
      columnGap: 16,
      margin: [0, 0, 0, 14]
    },
    /* 2px solid bottom rule (border-b-2) */
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: pageWidth, y2: 0, lineWidth: 2, lineColor: GREY_900 }], margin: [0, 0, 0, 18] },

    /* 1) أطراف العقد — LEFT col = المستأجر, RIGHT col = المؤجر */
    sectionTitle('أولاً: أطراف العقد'),
    {
      columns: [
        rtlColumn('المستأجر / النزيل', [
          { text: processRTL(booking.residentName), fontSize: 12, bold: true, color: GREY_900 },
          { text: processRTL(`رقم الهوية: ${booking.residentId}`), fontSize: 9, color: GREY_600, margin: [0, 2, 0, 0] },
          { text: processRTL(`هاتف: ${sanitizePhone(booking.phone)}`), fontSize: 9, color: GREY_600 },
          ...(booking.address ? [{ text: processRTL(booking.address), fontSize: 8, color: GREY_600, margin: [0, 2, 0, 0] }] : [])
        ]),
        rtlColumn('المؤجر / المدير', [
          { text: processRTL(user?.businessName || 'مجموعة رنت فلو العقارية'), fontSize: 12, bold: true, color: GREY_900 }
        ])
      ],
      columnGap: 20,
      margin: [0, 6, 0, 10]
    },

    /* 2) العقار ومدة الإيجار — LEFT col = فترة الإيجار, RIGHT col = بيانات الوحدة */
    sectionTitle('ثانياً: العقار ومدة الإيجار'),
    {
      columns: [
        rtlColumn('فترة الإيجار', [
          { text: processRTL(`${formatDate(booking.startDate)} — ${formatDate(booking.endDate)}`), fontSize: 11, bold: true, color: GREY_900 },
          { text: processRTL(`${nights} ليلة إجمالية`), fontSize: 10, bold: true, color: ACCENT, margin: [0, 2, 0, 0] }
        ]),
        rtlColumn('بيانات الوحدة', [
          { text: processRTL(apartment?.name || ''), fontSize: 12, bold: true, color: GREY_900 },
          ...(apartment?.type ? [{ text: processRTL(apartment.type), fontSize: 9, color: GREY_600, margin: [0, 2, 0, 0] }] : [])
        ])
      ],
      columnGap: 20,
      margin: [0, 6, 0, 10]
    },

    /* 3) الشروط المالية — a real table with a header row. pdfmake renders
       table columns in array order left→right, so both rows are authored in
       REVERSE order here: الإجمالي الشامل is the first (leftmost) cell and
       سعر الليلة the last (rightmost) — giving the reader, from the right:
       [سعر الليلة | المبلغ الأساسي | الضريبة | الإجمالي الشامل]. */
    sectionTitle('ثالثاً: الشروط المالية'),
    {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            rtlTableHeader('الإجمالي الشامل'),
            rtlTableHeader(taxLabel),
            rtlTableHeader('المبلغ الأساسي'),
            rtlTableHeader('سعر الليلة')
          ],
          [
            rtlTableValue(formatAmount(total.toFixed(2)), { fontSize: 14, color: ACCENT }),
            rtlTableValue(formatAmount(taxAmount.toFixed(2))),
            rtlTableValue(formatAmount(String(subtotal))),
            rtlTableValue(formatAmount(booking.pricePerNight))
          ]
        ]
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingLeft: () => 6,
        paddingRight: () => 6,
        paddingTop: () => 4,
        paddingBottom: () => 4
      },
      margin: [0, 0, 0, 10]
    },

    /* 4) حالة السداد — voucher only. A proper horizontal 3-column row that
       reads right→left exactly like the reference: from the right
       [حالة السداد | المبلغ المتبقي | المبلغ المدفوع]. Because pdfmake lays
       table columns left→right, the row is authored in REVERSE order: the
       LAST array cell (حالة السداد / مسدد بالكامل) renders rightmost. */
    ...(isVoucher ? [
      sectionTitle('رابعاً: حالة السداد'),
      {
        table: {
          widths: ['*', '*', '*'],
          body: [
            [
              rtlTableHeader('المبلغ المدفوع'),
              rtlTableHeader('المبلغ المتبقي'),
              rtlTableHeader('حالة السداد')
            ],
            [
              rtlTableValue(formatAmount(formatSAR(totalReceived))),
              rtlTableValue(formatAmount(formatSAR(balanceDue)), { fontSize: 13, color: ACCENT }),
              rtlTableValue(paymentStatus)
            ]
          ]
        },
        layout: {
          hLineWidth: () => 0,
          vLineWidth: () => 0,
          paddingLeft: () => 6,
          paddingRight: () => 6,
          paddingTop: () => 4,
          paddingBottom: () => 4
        },
        margin: [0, 0, 0, 10]
      }
    ] : []),

    /* Terms + signatures — confirmation only */
    ...(!isVoucher ? [
      /* dashed divider (border-t-2 border-dashed) */
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: pageWidth, y2: 0, lineWidth: 1, lineColor: '#e5e7eb', dash: { length: 4 } }], margin: [0, 8, 0, 14] },
      {
        text: wrapProcessRTL(user?.customTerms
          ? user.customTerms
          : 'يقر المستأجر بموجب هذا العقد بالالتزام بكافة لوائح المبنى والحفاظ على الوحدة السكنية بحالة جيدة وإخلائها في موعد تسجيل الخروج المحدد. أي تلفيات تلحق بالوحدة سيتحمل المستأجر تكاليف إصلاحها. تم إعداد هذا العقد لتوثيق فترة الإقامة وحقوق الطرفين.'),
        fontSize: 9,
        color: GREY_600,
        alignment: 'justify',
        margin: [0, 0, 0, 24]
      },
      /* signatures — LEFT = المستأجر, RIGHT = المؤجر + stamp */
      {
        columns: [
          rtlColumn('توقيع المستأجر', [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 1, lineColor: '#d1d5db' }], margin: [0, 0, 0, 4] }
          ], { alignment: 'center' }),
          rtlColumn('توقيع وختم المؤجر', [
            ...(stampDataUrl ? [{ image: stampDataUrl, width: 65, fit: [65, 65], alignment: 'center', margin: [0, 0, 0, 6] }] : []),
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 1, lineColor: '#d1d5db' }], margin: [0, 0, 0, 4] }
          ], { alignment: 'center' })
        ],
        columnGap: 30
      }
    ] : [])
  ];

  const docDefinition = {
    content,
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: {
      font: 'NotoSansArabic',
      fontSize: 10,
      color: GREY_900,
      lineHeight: 1.35,
      alignment: 'right'
    }
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  return pdfDoc.getBlob();
}