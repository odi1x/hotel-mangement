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

let pdfMake = null;
let fontsReady = false;

async function ensurePdfMake() {
  if (pdfMake) return;
  const [pdfmakeMod, fontMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('./.pdfFonts.generated')
  ]);

  const maker = pdfmakeMod.default || pdfmakeMod;
  maker.vfs = {
    'Zain-Regular.ttf': fontMod.ZAIN_REGULAR_B64,
    'Zain-Bold.ttf': fontMod.ZAIN_BOLD_B64
  };
  maker.fonts = {
    Zain: {
      normal: 'Zain-Regular.ttf',
      bold: 'Zain-Bold.ttf',
      italics: 'Zain-Regular.ttf',
      bolditalics: 'Zain-Bold.ttf'
    }
  };
  pdfMake = maker;
  fontsReady = true;
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

function column(prefixLabel, lines) {
  return {
    stack: [
      { text: prefixLabel, fontSize: 8, color: GREY_400, bold: true, decoration: 'underline', decorationColor: GREY_400, margin: [0, 0, 0, 4] },
      ...lines
    ]
  };
}

function sectionTitle(text) {
  return {
    text,
    fontSize: 11,
    bold: true,
    color: GREY_900,
    background: '#f3f4f6',
    margin: [0, 0, 0, 10],
    padding: [8, 6, 8, 6],
    decoration: 'underline',
    decorationColor: '#9ca3af',
    decorationStyle: 'dashed'
  };
}

// Build a fully-styled A4 document definition from the same booking data
// the preview uses. Mirrors the on-screen sections: parties, unit/rental
// period, financial terms, payment status (voucher only), terms + signatures
// (confirmation only).
export default async function generateDocumentPdf({ booking, apartment, user, documentType, message }) {
  await ensurePdfMake();

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

  const content = [
    { text: docTitle, fontSize: 22, bold: true, color: GREY_900, margin: [0, 0, 0, 2] },
    { text: `المرجع: #${booking.id.toUpperCase()}`, fontSize: 9, color: GREY_600, margin: [0, 0, 0, 6] },
    ...(message ? [
      { text: message, fontSize: 11, bold: true, color: '#0f766e', background: '#f0fdfa', margin: [0, 2, 0, 10], padding: [8, 6, 8, 6] }
    ] : []),

    /* Business header — logo (if present) above the business name + license */
    ...(user?.logoUrl ? [
      { image: user.logoUrl, width: 70, alignment: 'left', margin: [0, 6, 0, 4] }
    ] : []),
    { text: user?.businessName || 'رنت فلو العقارية', fontSize: 14, bold: true, color: GREY_900, alignment: 'left', margin: [0, 0, 0, 2] },
    ...(licenseNumber ? [
      { text: `ترخيص رقم: ${licenseNumber}`, fontSize: 9, color: GREY_600, alignment: 'left', margin: [0, 0, 0, 10] }
    ] : [
      { text: '', margin: [0, 0, 0, 8] }
    ]),

    /* 1) Parties */
    sectionTitle('أولاً: أطراف العقد'),
    {
      columns: [
        column('المؤجر / المدير', [
          { text: user?.businessName || 'مجموعة رنت فلو العقارية', fontSize: 11, bold: true, color: GREY_900 }
        ]),
        column('المستأجر / النزيل', [
          { text: booking.residentName, fontSize: 11, bold: true, color: GREY_900 },
          { text: `رقم الهوية: ${booking.residentId}`, fontSize: 9, color: GREY_600, margin: [0, 2, 0, 0] },
          { text: `هاتف: ${sanitizePhone(booking.phone)}`, fontSize: 9, color: GREY_600 },
          { text: booking.address || '', fontSize: 8, color: GREY_600, margin: [0, 2, 0, 0] }
        ])
      ],
      margin: [0, 0, 0, 16]
    },

    /* 2) Unit & rental period */
    sectionTitle('ثانياً: العقار ومدة الإيجار'),
    {
      columns: [
        column('بيانات الوحدة', [
          { text: apartment?.name || '', fontSize: 11, bold: true, color: GREY_900 },
          { text: apartment?.type || '', fontSize: 9, color: GREY_600 }
        ]),
        column('فترة الإيجار', [
          { text: `${formatDate(booking.startDate)} — ${formatDate(booking.endDate)}`, fontSize: 11, bold: true, color: GREY_900 },
          { text: `${nights} ليلة إجمالية`, fontSize: 9, bold: true, color: '#0f766e', margin: [0, 2, 0, 0] }
        ])
      ],
      margin: [0, 0, 0, 16]
    },

    /* 3) Financial terms */
    sectionTitle('ثالثاً: الشروط المالية'),
    {
      columns: [
        { stack: [{ text: 'سعر الليلة', fontSize: 8, color: GREY_400, bold: true }, { text: `${booking.pricePerNight} ر.س`, fontSize: 11, bold: true, color: GREY_900, margin: [0, 4, 0, 0] }] },
        { stack: [{ text: 'المبلغ الأساسي', fontSize: 8, color: GREY_400, bold: true }, { text: `${subtotal} ر.س`, fontSize: 11, bold: true, color: GREY_900, margin: [0, 4, 0, 0] }] },
        { stack: [{ text: `الضريبة${user?.taxEnabled && user?.taxPercentage ? ` (${user.taxPercentage}%)` : ''}`, fontSize: 8, color: GREY_400, bold: true }, { text: `${taxAmount.toFixed(2)} ر.س`, fontSize: 11, bold: true, color: GREY_900, margin: [0, 4, 0, 0] }] },
        { stack: [{ text: 'الإجمالي الشامل', fontSize: 8, color: GREY_400, bold: true }, { text: `${total.toFixed(2)} ر.س`, fontSize: 13, bold: true, color: '#0f766e', margin: [0, 4, 0, 0] }] }
      ],
      margin: [0, 0, 0, 16]
    },

    /* 4) Payment status — voucher only */
    ...(isVoucher ? [
      sectionTitle('رابعاً: حالة السداد'),
      {
        columns: [
          { stack: [{ text: 'المبلغ المدفوع', fontSize: 8, color: GREY_400, bold: true }, { text: `${formatSAR(totalReceived)} ر.س`, fontSize: 11, bold: true, color: GREY_900, margin: [0, 4, 0, 0] }] },
          { stack: [{ text: 'المبلغ المتبقي', fontSize: 8, color: GREY_400, bold: true }, { text: `${formatSAR(balanceDue)} ر.س`, fontSize: 11, bold: true, color: '#0f766e', margin: [0, 4, 0, 0] }] },
          { stack: [{ text: 'حالة السداد', fontSize: 8, color: GREY_400, bold: true }, { text: balanceDue <= 0.01 ? 'مسدد بالكامل' : totalReceived > 0.01 ? 'سداد جزئي' : 'غير مسدد', fontSize: 11, bold: true, color: GREY_900, margin: [0, 4, 0, 0] }] }
        ],
        margin: [0, 0, 0, 16]
      }
    ] : []),

    /* Terms + signatures — confirmation only */
    ...(!isVoucher ? [
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db', dash: { length: 3 } }], margin: [0, 8, 0, 14] },
      {
        text: user?.customTerms
          ? user.customTerms
          : 'يقر المستأجر بموجب هذا العقد بالالتزام بكافة لوائح المبنى والحفاظ على الوحدة السكنية بحالة جيدة وإخلائها في موعد تسجيل الخروج المحدد. أي تلفيات تلحق بالوحدة سيتحمل المستأجر تكاليف إصلاحها. تم إعداد هذا العقد لتوثيق فترة الإقامة وحقوق الطرفين.',
        fontSize: 9,
        color: GREY_600,
        alignment: 'justify',
        margin: [0, 0, 0, 24]
      },
      {
        columns: [
          {
            stack: [
              ...(user?.stampUrl ? [{ image: user.stampUrl, width: 70, fit: [70, 70], margin: [0, 0, 0, 4] }] : []),
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: GREY_600 }] },
              { text: 'توقيع وختم المؤجر', fontSize: 9, bold: true, color: GREY_600, alignment: 'center', margin: [0, 4, 0, 0] }
            ]
          },
          {
            stack: [
              { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 200, y2: 0, lineWidth: 1, lineColor: GREY_600 }] },
              { text: 'توقيع المستأجر', fontSize: 9, bold: true, color: GREY_600, alignment: 'center', margin: [0, 4, 0, 0] }
            ]
          }
        ],
        columnGap: 60
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
      lineHeight: 1.35
    }
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  return new Promise((resolve, reject) => {
    pdfDoc.getBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PDF generation returned no blob'));
    });
  });
}