import { sanitizePhone } from './phoneUtils';

// Interpolate {name} / {businessName} / {apartment} / {ref} placeholders in
// a message template. Unknown placeholders are left untouched so the admin
// can see exactly which token they mistyped.
export function fillTemplate(template, vars = {}) {
  const map = {
    name: vars.name || '',
    businessName: vars.businessName || '',
    apartment: vars.apartment || '',
    ref: vars.ref || ''
  };
  return (template || '').replace(/\{(name|businessName|apartment|ref)\}/g, (match, key) => map[key]);
}

// wa.me deep link — digits only, message URL-encoded.
export function buildWhatsAppUrl(phone, message) {
  const digits = sanitizePhone(phone).replace(/\D/g, '');
  if (!digits) return '';
  const text = (message || '').trim();
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

// Filesystem-safe document name, matching the print dialog's convention.
export function buildDocumentFilename(booking, apartment) {
  const aptName = apartment?.name ? apartment.name.replace(/\s+/g, '_') : 'شقة';
  const resName = booking?.residentName ? booking.residentName.replace(/\s+/g, '_') : 'نزيل';
  const startDateStr = booking?.startDate ? new Date(booking.startDate).toISOString().split('T')[0] : '';
  return `حجز_${resName}_${aptName}${startDateStr ? '_' + startDateStr : ''}.pdf`;
}

// Mobile: hand the PDF + prefilled text to the OS share sheet so the user
// picks WhatsApp and then the contact. Desktop (or unsupported browsers):
// download the PDF and open the WhatsApp chat with the text.
// Returns 'shared' | 'cancelled' | 'downloaded'.
export async function shareDocumentToWhatsApp({ generateBlob, filename, message, phone }) {
  const blob = await generateBlob();
  const file = new File([blob], filename, { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: message || undefined });
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'cancelled';
      // any other failure → fall through to the download + link path
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  const waUrl = buildWhatsAppUrl(phone, message);
  if (waUrl) window.open(waUrl, '_blank', 'noopener,noreferrer');
  return 'downloaded';
}