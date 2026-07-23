/**
 * Expense category catalog. Kept in one place so ExpensesView, ExpenseForm,
 * and anything that displays a category (Analytics, maintenance-linked
 * expense badges, etc.) share the same labels. `iconKey` maps to a
 * lucide-react icon name — resolved at render time in the consumer so this
 * file stays free of React / Lucide imports (it's just data + logic, safe
 * to use in Node contexts too).
 */
export const EXPENSE_CATEGORIES = [
  { value: 'rent',        label: 'إيجارات',         iconKey: 'Home' },
  { value: 'utilities',   label: 'مرافق',            iconKey: 'Zap' },
  { value: 'staff',       label: 'رواتب وموظفين',    iconKey: 'Users' },
  { value: 'maintenance', label: 'صيانة',            iconKey: 'Wrench' },
  { value: 'marketing',   label: 'تسويق وإعلانات',   iconKey: 'Megaphone' },
  { value: 'licenses',    label: 'تراخيص ورسوم',     iconKey: 'Shield' },
  { value: 'supplies',    label: 'مستلزمات وأدوات',  iconKey: 'Package' },
  { value: 'insurance',   label: 'تأمين',            iconKey: 'ShieldCheck' },
  { value: 'zakat',       label: 'زكاة',             iconKey: 'HandCoins' },
  { value: 'other',       label: 'أخرى',             iconKey: 'MoreHorizontal' },
];

export const EXPENSE_SCOPES = [
  { value: 'global', label: 'كل الأنشطة' },
  { value: 'unit',   label: 'وحدة محددة' },
];

export const RECURRING_PERIODS = [
  { value: 'monthly', label: 'شهرياً' },
  { value: 'yearly',  label: 'سنوياً' },
];

export function categoryLabel(value) {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || 'أخرى';
}
export function categoryIconKey(value) {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.iconKey || 'MoreHorizontal';
}

/**
 * Return start-of-day for the first day of the current month, in local time.
 */
function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}
function monthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * All expenses whose date falls within [from, to] (inclusive both ends).
 */
export function filterExpensesByRange(expenses, from, to) {
  return (expenses || []).filter(e => {
    const d = new Date(e.date);
    return d >= from && d <= to;
  });
}

/**
 * Sum amounts (Decimal from Prisma → number). Empty array → 0.
 */
export function sumAmounts(expenses) {
  return (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
}

/**
 * Given a full expense array, compute headline stats for the current month:
 *   - thisMonth: sum of expenses dated this month
 *   - lastMonth: sum of expenses dated last month
 *   - deltaPct : percentage change from last month (null if last was 0)
 *   - byCategory : [{ category, total, share, deltaPct }] sorted by total desc
 *   - dailyTrend : [{ day, total }] one entry per day of this month up to today
 *   - monthTrend : [{ monthKey, total }] last 6 months including this one
 */
export function computeExpenseStats(expenses) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisRows = filterExpensesByRange(expenses, thisMonthStart, thisMonthEnd);
  const lastRows = filterExpensesByRange(expenses, lastMonthStart, lastMonthEnd);

  const thisMonth = sumAmounts(thisRows);
  const lastMonth = sumAmounts(lastRows);
  const deltaPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  // Category breakdown for this month.
  const thisByCat = new Map();
  for (const e of thisRows) {
    thisByCat.set(e.category, (thisByCat.get(e.category) || 0) + Number(e.amount));
  }
  const lastByCat = new Map();
  for (const e of lastRows) {
    lastByCat.set(e.category, (lastByCat.get(e.category) || 0) + Number(e.amount));
  }
  const byCategory = Array.from(thisByCat.entries())
    .map(([category, total]) => {
      const lastTotal = lastByCat.get(category) || 0;
      return {
        category,
        total,
        share: thisMonth > 0 ? (total / thisMonth) * 100 : 0,
        deltaPct: lastTotal > 0 ? ((total - lastTotal) / lastTotal) * 100 : null,
      };
    })
    .sort((a, b) => b.total - a.total);

  // Last 6 months trend (oldest → newest)
  const monthTrend = [];
  for (let i = 5; i >= 0; i--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rangeStart = startOfMonth(anchor);
    const rangeEnd = endOfMonth(anchor);
    monthTrend.push({
      monthKey: monthKey(anchor),
      total: sumAmounts(filterExpensesByRange(expenses, rangeStart, rangeEnd)),
    });
  }

  return { thisMonth, lastMonth, deltaPct, byCategory, monthTrend };
}

/**
 * Format a number as SAR with tabular-friendly grouping.
 *   1234.5  → "1,235"
 * The " ر.س" is appended by the consumer (usually with a lighter weight).
 */
export function formatSAR(value) {
  const n = Math.round(Number(value || 0));
  return n.toLocaleString('en-US');
}
