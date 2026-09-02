/**
 * Pricing rule resolution.
 *
 * The rules of the game:
 *   - A rule applies to a date if its [startDate, endDate] range contains it (inclusive).
 *   - A rule applies to an apartment if apartmentId is null (global) or matches.
 *   - When multiple rules match a single date, HIGHEST priority wins.
 *   - On priority tie, the apartment-specific rule beats the global rule.
 *   - Fixed rules return a set SAR/night; multipliers return basePrice × value.
 *   - No matching rule → apartment.basePrice is used.
 *
 * This lets you set a global "Ramadan ×1.5" and then override on a specific
 * unit with "Ramadan @ Al-Nuzhah = 800 SAR fixed, priority 60" and it Just Works.
 */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

// A single rule's active-on-this-date test
const ruleActiveOnDate = (rule, date, apartmentId) => {
  if (rule.apartmentId && rule.apartmentId !== apartmentId) return false;

  // Day-of-week filter: if the rule specifies days, only apply on those.
  // Empty array (default) = applies every day.
  if (Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.length > 0) {
    const dow = new Date(date).getDay(); // 0=Sun..6=Sat
    if (!rule.daysOfWeek.includes(dow)) return false;
  }

  const day = startOfDay(date).getTime();
  const start = startOfDay(rule.startDate).getTime();
  const end = startOfDay(rule.endDate).getTime();
  return day >= start && day <= end;
};

// Pick the winning rule for a specific date+apartment, or null.
export const resolveRuleForDate = (rules, apartment, date) => {
  if (!Array.isArray(rules) || !apartment) return null;

  const matches = rules.filter(r => ruleActiveOnDate(r, date, apartment.id));
  if (matches.length === 0) return null;

  // Sort: priority DESC, then apartment-specific over global
  matches.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    // Specificity tiebreak: apartmentId set wins over null
    const aSpec = a.apartmentId ? 1 : 0;
    const bSpec = b.apartmentId ? 1 : 0;
    return bSpec - aSpec;
  });

  return matches[0];
};

// The nightly price after all rules are considered.
export const resolvePricePerNight = (rules, apartment, date) => {
  const rule = resolveRuleForDate(rules, apartment, date);
  if (!rule) return Number(apartment.basePrice);

  const value = Number(rule.value);
  if (rule.priceMode === 'fixed') return value;
  // multiplier
  return Number(apartment.basePrice) * value;
};

/**
 * Compute the total for a stay by walking each night individually.
 * Returns { total, nights, breakdown: [{ date, price, ruleId, ruleLabel }] }
 *
 * This is what BookingForm should call to auto-fill totalPrice and show the
 * user which rules were applied.
 */
export const computeStayTotal = (rules, apartment, startDate, endDate) => {
  if (!apartment || !startDate || !endDate) {
    return { total: 0, nights: 0, breakdown: [], averagePerNight: 0 };
  }

  const start = startOfDay(startDate);
  const end = startOfDay(endDate);
  const dayMs = 1000 * 60 * 60 * 24;
  const nights = Math.max(0, Math.round((end - start) / dayMs));

  if (nights === 0) {
    return { total: 0, nights: 0, breakdown: [], averagePerNight: 0 };
  }

  const breakdown = [];
  let total = 0;
  for (let i = 0; i < nights; i++) {
    const nightDate = new Date(start.getTime() + i * dayMs);
    const rule = resolveRuleForDate(rules, apartment, nightDate);
    const price = rule
      ? (rule.priceMode === 'fixed' ? Number(rule.value) : Number(apartment.basePrice) * Number(rule.value))
      : Number(apartment.basePrice);
    total += price;
    breakdown.push({
      date: nightDate,
      price,
      ruleId: rule?.id || null,
      ruleLabel: rule?.label || null,
      ruleColor: rule?.color || null
    });
  }

  return {
    total,
    nights,
    breakdown,
    averagePerNight: total / nights
  };
};

/**
 * Group a breakdown into "seasons" — contiguous runs of the same rule.
 * Used in BookingForm's summary: "5 nights × 400 (base) + 3 nights × 1000 (Hajj)"
 */
export const summarizeBreakdown = (breakdown) => {
  if (!breakdown || breakdown.length === 0) return [];
  const groups = [];
  for (const b of breakdown) {
    const last = groups[groups.length - 1];
    if (last && last.ruleId === b.ruleId && last.price === b.price) {
      last.count += 1;
      last.subtotal += b.price;
    } else {
      groups.push({
        ruleId: b.ruleId,
        ruleLabel: b.ruleLabel,
        ruleColor: b.ruleColor,
        price: b.price,
        count: 1,
        subtotal: b.price
      });
    }
  }
  return groups;
};

/**
 * Curated palette for rule colors — muted, print-friendly, distinguishable
 * on a white background. Emerald first because it's the app's brand accent.
 */
export const RULE_COLORS = [
  { value: '#059669', label: 'زمردي' },   // emerald (default / accent)
  { value: '#64748b', label: 'رصاصي' },   // slate
  { value: '#d97706', label: 'كهرماني' }, // amber
  { value: '#e11d48', label: 'وردي داكن' },// rose
  { value: '#6366f1', label: 'بنفسجي' },  // indigo
  { value: '#0f766e', label: 'أخضر بحري' } // teal
];

export const PRICE_MODES = [
  { value: 'multiplier', label: 'مضاعف السعر الأساسي', hint: 'مثال: 2.5 يعني ٢٫٥ × سعر الوحدة الأساسي' },
  { value: 'fixed',      label: 'سعر ثابت',              hint: 'سعر ليلة مقطوع بالريال' }
];

// Format a rule's effect for display: "×2.5" or "800 ر.س"
export const formatRuleValue = (rule) => {
  if (rule.priceMode === 'fixed') return `${Number(rule.value)} ر.س`;
  return `×${Number(rule.value)}`;
};

/**
 * Days of week (Arabic labels) — Saudi calendar week starts on Sunday.
 * value = JS Date.getDay() (0=Sun..6=Sat)
 */
export const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد',   shortLabel: 'أح' },
  { value: 1, label: 'الاثنين', shortLabel: 'اث' },
  { value: 2, label: 'الثلاثاء', shortLabel: 'ثل' },
  { value: 3, label: 'الأربعاء', shortLabel: 'أر' },
  { value: 4, label: 'الخميس',  shortLabel: 'خم' },
  { value: 5, label: 'الجمعة',  shortLabel: 'جم' },
  { value: 6, label: 'السبت',   shortLabel: 'سب' }
];

// Saudi weekend and workweek presets — the two cases users will actually hit
export const WEEKEND_DAYS = [5, 6];     // Friday + Saturday
export const WORKWEEK_DAYS = [0, 1, 2, 3, 4]; // Sunday–Thursday

/**
 * Human-friendly summary of a rule's day scope, for showing in the rule list.
 * "كل الأيام" | "عطلة نهاية الأسبوع فقط" | "أيام العمل فقط" | "الجمعة، السبت"
 */
export const summarizeDaysOfWeek = (days) => {
  if (!Array.isArray(days) || days.length === 0) return 'كل الأيام';
  if (days.length === 7) return 'كل الأيام';
  const set = new Set(days);
  const isWeekend = WEEKEND_DAYS.every(d => set.has(d)) && set.size === 2;
  if (isWeekend) return 'عطلة نهاية الأسبوع فقط';
  const isWorkweek = WORKWEEK_DAYS.every(d => set.has(d)) && set.size === 5;
  if (isWorkweek) return 'أيام العمل فقط';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map(d => DAYS_OF_WEEK.find(x => x.value === d)?.label)
    .filter(Boolean)
    .join('، ');
};

/**
 * Priority levels — replacing the confusing 0–100 number input with three
 * meaningful buckets. Stored value stays a number so backend logic is unchanged.
 */
export const PRIORITY_LEVELS = [
  { value: 25, label: 'منخفضة', hint: 'تتراجع أمام أي قاعدة أخرى' },
  { value: 50, label: 'عادية',   hint: 'الوضع الافتراضي' },
  { value: 75, label: 'عالية',  hint: 'تتقدم على القواعد الأخرى' }
];

// Categorize any priority number into one of the three buckets (for edit view)
export const priorityLevel = (n) => {
  if (n == null) return 50;
  if (n <= 33) return 25;
  if (n >= 67) return 75;
  return 50;
};
