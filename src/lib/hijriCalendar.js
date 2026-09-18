// Helper utilities for Umm al-Qura Hijri Calendar conversions using native Intl
// Single source of truth in DB remains Gregorian dates (YYYY-MM-DD).

const HIJRI_MONTH_NAMES = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الآخرة',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة'
];

/**
 * Convert a JS Date or date string to Hijri parts { year, month, day }
 */
export function gregorianToHijri(dateInput) {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return { year: 1448, month: 1, day: 1 };

  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    timeZone: 'UTC'
  });

  const parts = formatter.formatToParts(date);
  let year = 1448, month = 1, day = 1;
  for (const p of parts) {
    if (p.type === 'year') year = parseInt(p.value, 10) || 1448;
    if (p.type === 'month') month = parseInt(p.value, 10) || 1;
    if (p.type === 'day') day = parseInt(p.value, 10) || 1;
  }
  return { year, month, day };
}

/**
 * Find Gregorian Date for a given Hijri year, month, and day
 */
export function hijriToGregorianDate(hYear, hMonth = 1, hDay = 1) {
  let gYear = Math.floor(hYear * 0.97022 + 621.577);
  let bestDate = new Date(Date.UTC(gYear, 0, 1));
  let minDiff = Infinity;

  for (let offset = -100; offset <= 500; offset++) {
    const d = new Date(Date.UTC(gYear, 0, 1 + offset));
    const h = gregorianToHijri(d);
    
    if (h.year === hYear && h.month === hMonth && h.day === hDay) {
      return d;
    }

    const hTotalDays = (h.year * 354 + h.month * 29.5 + h.day);
    const targetTotalDays = (hYear * 354 + hMonth * 29.5 + hDay);
    const diff = Math.abs(hTotalDays - targetTotalDays);
    if (diff < minDiff) {
      minDiff = diff;
      bestDate = d;
    }
  }
  return bestDate;
}

const toDateStr = (d) =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

/**
 * Get Gregorian start and end date strings (YYYY-MM-DD) for a Hijri Year
 */
export function hijriYearToGregorianRange(hYear) {
  const startDate = hijriToGregorianDate(hYear, 1, 1);
  const nextYearStart = hijriToGregorianDate(hYear + 1, 1, 1);
  const endDate = new Date(nextYearStart.getTime() - 86400000);

  return {
    startDate: toDateStr(startDate),
    endDate: toDateStr(endDate)
  };
}

/**
 * Get Gregorian start and end date strings for a Hijri Quarter (Q1-Q4)
 */
export function hijriQuarterToGregorianRange(hYear, quarterNum) {
  const startMonth = (quarterNum - 1) * 3 + 1;
  const endMonth = startMonth + 2;

  const startDate = hijriToGregorianDate(hYear, startMonth, 1);
  
  let endDate;
  if (endMonth === 12) {
    const nextYearStart = hijriToGregorianDate(hYear + 1, 1, 1);
    endDate = new Date(nextYearStart.getTime() - 86400000);
  } else {
    const nextMonthStart = hijriToGregorianDate(hYear, endMonth + 1, 1);
    endDate = new Date(nextMonthStart.getTime() - 86400000);
  }

  return {
    startDate: toDateStr(startDate),
    endDate: toDateStr(endDate)
  };
}

/**
 * Get Gregorian start and end date strings for a Hijri Month
 */
export function hijriMonthToGregorianRange(hYear, hMonth) {
  const startDate = hijriToGregorianDate(hYear, hMonth, 1);
  let endDate;
  if (hMonth === 12) {
    const nextYearStart = hijriToGregorianDate(hYear + 1, 1, 1);
    endDate = new Date(nextYearStart.getTime() - 86400000);
  } else {
    const nextMonthStart = hijriToGregorianDate(hYear, hMonth + 1, 1);
    endDate = new Date(nextMonthStart.getTime() - 86400000);
  }

  return {
    startDate: toDateStr(startDate),
    endDate: toDateStr(endDate)
  };
}

/**
 * Extract unique Hijri years from available bookings/records to avoid empty years
 */
export function getAvailableHijriYears(records = []) {
  const yearsSet = new Set();
  records.forEach(r => {
    const dateVal = r.startDate || r.date || r.createdAt;
    if (dateVal) {
      const h = gregorianToHijri(dateVal);
      if (h && h.year) yearsSet.add(h.year);
    }
  });

  const currentYear = gregorianToHijri(new Date()).year;
  yearsSet.add(currentYear);

  return Array.from(yearsSet).sort((a, b) => b - a);
}

export function getHijriMonthName(monthNumber) {
  return HIJRI_MONTH_NAMES[(monthNumber - 1) % 12] || '';
}

/**
 * Format any Gregorian date string or Date into a Hijri month/year label for charts
 */
export function formatHijriLabelFromDateStr(nameStr) {
  const d = new Date(nameStr);
  if (isNaN(d.getTime())) return nameStr;
  const h = gregorianToHijri(d);
  return `${getHijriMonthName(h.month)} ${h.year}`;
}
