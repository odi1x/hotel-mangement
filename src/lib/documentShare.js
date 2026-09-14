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