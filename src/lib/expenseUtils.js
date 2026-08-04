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
/**
 * How many *occurrences* of a recurring rule fall inside a given period?
 *
 * Design decision: recurring is counted by calendar unit, NOT prorated by days.
 * A "monthly" rule generates 1 occurrence per calendar month it's active in.
 * A "yearly" rule contributes amount/12 per calendar month (so it plays nice
 * with month/quarter filters — otherwise a yearly rent would show 0 for
 * 11 months and its full annual cost in one month, which is bewildering).
 *
 * Why not days-based proration? Because "monthly rent 1000" should show
 * exactly 1000 in any calendar month. Days-based math gives 1000×31/30 =
 * 1033 in July and 1000×28/30 = 933 in February. Averages out over a year
 * but each individual month looks wrong.
 */
function calendarMonthsInRange(start, end) {
  if (end < start) return 0;
  return (end.getFullYear() - start.getFullYear()) * 12 +
         (end.getMonth() - start.getMonth()) + 1;
}

/**
 * Contribution a single expense makes to a given period. Returns 0 if the
 * expense doesn't apply to this period (rule not started yet, ended, or
 * one-time date outside range).
 *
 * Analytics.js uses the same logic — both files agreeing is the whole point.
 */
export function contributionInPeriod(expense, periodStart, periodEnd) {
  const amount = Number(expense.amount || 0);
  if (amount <= 0) return 0;

  if (!expense.isRecurring) {
    const d = new Date(expense.date);
    return (d >= periodStart && d <= periodEnd) ? amount : 0;
  }

  // Recurring: clip the rule's active window against the period AND today.
  // Effective end is min(rule end, period end, today) — never counts future
  // occurrences (you haven't paid August salary yet in July).
  const ruleStart = new Date(expense.date);
  const ruleEnd = expense.recurringUntil ? new Date(expense.recurringUntil) : null;
  if (ruleEnd && ruleEnd < periodStart) return 0;
  if (ruleStart > periodEnd) return 0;

  const today = new Date();
  const effStart = ruleStart > periodStart ? ruleStart : periodStart;
  let effEnd = periodEnd;
  if (ruleEnd && ruleEnd < effEnd) effEnd = ruleEnd;
  if (today < effEnd) effEnd = today;
  const months = Math.max(0, calendarMonthsInRange(effStart, effEnd));

  if (expense.recurringPeriod === 'yearly') {
    // Yearly rule spread evenly across 12 months — matches "one twelfth per month"
    return (amount / 12) * months;
  }
  // Monthly (default)
  return amount * months;
}

/**
 * Sum contributions of every expense over a given period. Handles both
 * one-time and recurring correctly.
 */
export function computePeriodTotal(expenses, periodStart, periodEnd) {
  let total = 0;
  for (const e of expenses || []) {
    total += contributionInPeriod(e, periodStart, periodEnd);
  }
  return total;
}

export function computeExpenseStats(expenses) {
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const thisMonthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const lastMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const thisMonth = computePeriodTotal(expenses, thisMonthStart, thisMonthEnd);
  const lastMonth = computePeriodTotal(expenses, lastMonthStart, lastMonthEnd);
  const deltaPct = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : null;

  // Category breakdown for this month — also uses proration for recurring.
  const thisByCat = new Map();
  const lastByCat = new Map();
  for (const e of expenses || []) {
    const thisContrib = contributionInPeriod(e, thisMonthStart, thisMonthEnd);
    if (thisContrib > 0) thisByCat.set(e.category, (thisByCat.get(e.category) || 0) + thisContrib);
    const lastContrib = contributionInPeriod(e, lastMonthStart, lastMonthEnd);
    if (lastContrib > 0) lastByCat.set(e.category, (lastByCat.get(e.category) || 0) + lastContrib);
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

  // Last 6 months trend (oldest → newest) — uses proration.
  const monthTrend = [];
  for (let i = 5; i >= 0; i--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const rangeStart = startOfMonth(anchor);
    const rangeEnd = endOfMonth(anchor);
    monthTrend.push({
      monthKey: monthKey(anchor),
      total: computePeriodTotal(expenses, rangeStart, rangeEnd),
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
