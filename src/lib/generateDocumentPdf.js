// Programmatic PDF generation (pdfmake) — a clean, reliable A4 document
// with properly-shaped Arabic text. Registered with pdfmake lazily so the
// ~500KB embedded fonts are only fetched when someone actually clicks
// "إرسال عبر واتساب". The layout mirrors PrintAgreement's preview but is
// typeset here, not rasterized — so no font-fallback / page-slicing issues.
import { computeBookingTotals, formatSAR } from './paymentUtils';
import { sanitizePhone } from './phoneUtils';

const GREY_900 = '#111111';
const GREY_600 = '#4b5563';
const GREY_400 = '#9ca3af';
const ACCENT = '#0f766e';

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
    'Zain-Regular.ttf': fontMod.ZAIN_REGULAR_B64,
    'Zain-Bold.ttf': fontMod.ZAIN_BOLD_B64
  });
  maker.addFonts({
    Zain: {
      normal: 'Zain-Regular.ttf',
      bold: 'Zain-Bold.ttf',
      italics: 'Zain-Regular.ttf',
      bolditalics: 'Zain-Bold.ttf'
    }
  });
  pdfMake = maker;
}

const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', {
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

// Section heading — light-grey pill with a solid accent bar on the *right*
// edge (mirrors `bg-gray-100 border-r-4 border-accent`). pdfmake renders
// table columns left→right, so the 4pt accent cell sits last = right side.
function sectionTitle(text) {
  return {
    margin: [0, 0, 0, 12],
    table: {
      widths: ['*', 4],
      body: [[
        {
          text,
          fillColor: '#f3f4f6',
          color: GREY_900,
          bold: true,
          fontSize: 12,
          padding: [8, 6, 8, 6],
          alignment: 'right'
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

// Two-column row with a header label + stacked content lines, RTL-first.
function rtlColumn(headerText, lines) {
  return {
    width: '*',
    stack: [
      { text: headerText, fontSize: 8, color: GREY_400, bold: true, margin: [0, 0, 0, 4] },
      ...lines
    ]
  };
}

// Horizontal grid of labeled values (for financial rows).
function labelValue(label, value, opts = {}) {
  return {
    width: '*',
    stack: [
      { text: label, fontSize: 8, color: GREY_400, bold: true, margin: [0, 0, 0, 3] },
      { text: value, fontSize: opts.fontSize || 11, bold: true, color: opts.color || GREY_900, margin: [0, 0, 0, 0] }
    ]
  };
}

// Build a fully-styled A4 document definition from the same booking data
// the preview uses. Mirrors the on-screen sections: parties, unit/rental
// period, financial terms, payment status (voucher only), terms + signatures
// (confirmation only).
export default async function generateDocumentPdf({ booking, apartment, user, documentType, message }) {
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

  const content = [
    /* ── Header: title + ref (right) and business identity (left),
       separated by the document's 2px bottom rule — mirrors the preview's
       `border-b-2 border-gray-900 pb-6 mb-8`. ── */
    {
      columns: [
        {
          width: 'auto',
          stack: [
            ...(logoDataUrl ? [{ image: logoDataUrl, width: 64, fit: [64, 64], alignment: 'left', margin: [0, 0, 0, 4] }] : []),
            { text: user?.businessName || 'رنت فلو العقارية', fontSize: 15, bold: true, color: GREY_900, alignment: 'left', margin: [0, 0, 0, 2] },
            ...(licenseNumber ? [
              { text: `ترخيص رقم: ${licenseNumber}`, fontSize: 8, color: GREY_600, alignment: 'left' }
            ] : [])
          ]
        },
        {
          width: '*',
          stack: [
            { text: docTitle, fontSize: 26, bold: true, color: GREY_900, margin: [0, 0, 0, 2] },
            { text: `المرجع: #${booking.id.toUpperCase()}`, fontSize: 9, color: GREY_600, margin: [0, 0, 0, 4] }
          ]
        }
      ],
      columnGap: 16,
      margin: [0, 0, 0, 22],
      direction: 'rtl'
    },
    /* ~2px solid bottom rule (border-b-2) */
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: pageWidth, y2: 0, lineWidth: 2, lineColor: GREY_900 }], margin: [0, 0, 0, 20] },

    /* Share message box — shown on-screen only, keeps the text when sharing. */
    ...(message ? [
      {
        table: {
          widths: ['*'],
          body: [[{
            text: message,
            fontSize: 11,
            bold: true,
            color: ACCENT,
            margin: [0, 0, 0, 0]
          }]]
        },
        layout: { hLineWidth: () => 0.5, vLineWidth: () => 0.5, hLineColor: () => '#99f6e4', vLineColor: () => '#99f6e4', fillColor: () => '#f0fdfa', paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 8, paddingBottom: () => 8 },
        margin: [0, 4, 0, 16],
        direction: 'rtl'
      }
    ] : []),

    /* 1) Parties — pdfmake lays columns left→right in array order, so to
       mirror the RTL preview (first DOM child = rightmost) the LEFT visual
       block goes first in the array. */
    sectionTitle('أولاً: أطراف العقد'),
    {
      columns: [
        rtlColumn('المستأجر / النزيل', [
          { text: booking.residentName, fontSize: 12, bold: true, color: GREY_900 },
          { text: `رقم الهوية: ${booking.residentId}`, fontSize: 9, color: GREY_600, margin: [0, 2, 0, 0], direction: 'ltr' },
          { text: `هاتف: ${sanitizePhone(booking.phone)}`, fontSize: 9, color: GREY_600, direction: 'ltr' },
          ...(booking.address ? [{ text: booking.address, fontSize: 8, color: GREY_600, margin: [0, 2, 0, 0] }] : [])
        ]),
        rtlColumn('المؤجر / المدير', [
          { text: user?.businessName || 'مجموعة رنت فلو العقارية', fontSize: 12, bold: true, color: GREY_900 }
        ])
      ],
      columnGap: 20,
      margin: [0, 0, 0, 16]
    },

    /* 2) Unit & rental period */
    sectionTitle('ثانياً: العقار ومدة الإيجار'),
    {
      columns: [
        rtlColumn('فترة الإيجار', [
          { text: `${formatDate(booking.startDate)} — ${formatDate(booking.endDate)}`, fontSize: 11, bold: true, color: GREY_900 },
          { text: `${nights} ليلة إجمالية`, fontSize: 10, bold: true, color: ACCENT, margin: [0, 2, 0, 0] }
        ]),
        rtlColumn('بيانات الوحدة', [
          { text: apartment?.name || '', fontSize: 12, bold: true, color: GREY_900 },
          ...(apartment?.type ? [{ text: apartment.type, fontSize: 9, color: GREY_600, margin: [0, 2, 0, 0] }] : [])
        ])
      ],
      columnGap: 20,
      margin: [0, 0, 0, 16]
    },

    /* 3) Financial terms — tabular grid */
    sectionTitle('ثالثاً: الشروط المالية'),
    {
      columns: [
        labelValue('الإجمالي الشامل', `${total.toFixed(2)} ر.س`, { fontSize: 13, color: ACCENT }),
        labelValue(`الضريبة${user?.taxEnabled && user?.taxPercentage ? ` (${user.taxPercentage}%)` : ''}`, `${taxAmount.toFixed(2)} ر.س`),
        labelValue('المبلغ الأساسي', `${subtotal} ر.س`),
        labelValue('سعر الليلة', `${booking.pricePerNight} ر.س`)
      ],
      columnGap: 12,
      margin: [0, 0, 0, 16]
    },

    /* 4) Payment status — voucher only */
    ...(isVoucher ? [
      sectionTitle('رابعاً: حالة السداد'),
      {
        columns: [
          labelValue('حالة السداد', balanceDue <= 0.01 ? 'مسدد بالكامل' : totalReceived > 0.01 ? 'سداد جزئي' : 'غير مسدد'),
          labelValue('المبلغ المتبقي', `${formatSAR(balanceDue)} ر.س`, { fontSize: 12, color: ACCENT }),
          labelValue('المبلغ المدفوع', `${formatSAR(totalReceived)} ر.س`)
        ],
        columnGap: 12,
        margin: [0, 0, 0, 16]
      }
    ] : []),

    /* Terms + signatures — confirmation only */
    ...(!isVoucher ? [
      /* dashed divider */
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: pageWidth, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db', dash: { length: 4 } }], margin: [0, 8, 0, 14] },
      {
        text: user?.customTerms
          ? user.customTerms
          : 'يقر المستأجر بموجب هذا العقد بالالتزام بكافة لوائح المبنى والحفاظ على الوحدة السكنية بحالة جيدة وإخلائها في موعد تسجيل الخروج المحدد. أي تلفيات تلحق بالوحدة سيتحمل المستأجر تكاليف إصلاحها. تم إعداد هذا العقد لتوثيق فترة الإقامة وحقوق الطرفين.',
        fontSize: 9,
        color: GREY_600,
        alignment: 'justify',
        direction: 'rtl',
        margin: [0, 0, 0, 24]
      },
      {
        columns: [
          rtlColumn('توقيع المستأجر', [
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 1, lineColor: GREY_400 }], margin: [0, 0, 0, 4] }
          ]),
          rtlColumn('توقيع وختم المؤجر', [
            ...(stampDataUrl ? [{ image: stampDataUrl, width: 65, fit: [65, 65], alignment: 'center', margin: [0, 0, 0, 6] }] : []),
            { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 1, lineColor: GREY_400 }], margin: [0, 0, 0, 4] }
          ])
        ],
        columnGap: 30,
        direction: 'rtl'
      }
    ] : [])
  ];

  const docDefinition = {
    content,
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 40],
    defaultStyle: {
      font: 'Zain',
      fontSize: 10,
      color: GREY_900,
      lineHeight: 1.4,
      direction: 'rtl'
    }
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  return pdfDoc.getBlob();
}