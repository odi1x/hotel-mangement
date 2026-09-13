import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';
import { sanitizePhone } from './phoneUtils';

// Interpolate {name} / {businessName} / {ref} placeholders in a message
// template. Unknown placeholders are left untouched so the admin can see
// exactly which token they mistyped.
export function fillTemplate(template, vars = {}) {
  const map = {
    name: vars.name || '',
    businessName: vars.businessName || '',
    ref: vars.ref || ''
  };
  return (template || '').replace(/\{(name|businessName|ref)\}/g, (match, key) => map[key]);
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

// Rasterize a DOM node and lay it out on A4 pages, returning a PDF blob.
// Rendered in a fixed A4-width clone so the output matches the print
// layout regardless of the device's screen width (html2canvas would
// otherwise capture at the phone's narrow width → completely different
// document). Fonts are awaited so the Zain typeface is embedded.
export async function renderNodeToPdfBlob(node) {
  await document.fonts.ready;

  const canvas = await html2canvas(node, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
    windowWidth: 794,   // A4 width @96dpi — reflows the paper like print
    scrollX: 0,
    scrollY: 0
  });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const printableH = pageH - margin * 2;
  const imgW = pageW - margin * 2;
  const imgH = (canvas.height * imgW) / canvas.width;

  let heightLeft = imgH;
  pdf.addImage(imgData, 'PNG', margin, margin, imgW, imgH);
  heightLeft -= printableH;

  while (heightLeft > 0) {
    pdf.addPage();
    const position = margin - (imgH - heightLeft);
    pdf.addImage(imgData, 'PNG', margin, position, imgW, imgH);
    heightLeft -= printableH;
  }

  return pdf.output('blob');
}

// Mobile: hand the PDF + prefilled text to the OS share sheet so the user
// picks WhatsApp and then the contact. Desktop (or unsupported browsers):
// download the PDF and open the WhatsApp chat with the text.
// Returns 'shared' | 'cancelled' | 'downloaded'.
export async function shareDocumentToWhatsApp({ node, filename, message, phone }) {
  const blob = await renderNodeToPdfBlob(node);
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
