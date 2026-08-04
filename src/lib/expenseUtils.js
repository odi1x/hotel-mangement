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
/**
 * Count the number of occurrences of a recurring rule that fall inside a
 * given period AND have already happened (are on or before today). The rule
 * fires on its `date`, then again every N months (or 1 year for yearly).
 *
 * This is the "actual payments made" model — not "months touched". Example:
 *   Rule dated Oct 15, monthly, today = Nov 3
 *   → occurrences: Oct 15 (past), Nov 15 (future)
 *   → count for "this year" filter: 1  (not 2 — only Oct 15 has happened)
 *
 * Previously we counted calendar months the rule was active in, which
 * over-counted at month boundaries: Oct 15 through Nov 3 touches Oct AND
 * Nov (2 calendar months), so a 1000/mo rule would show 2000 even though
 * only one salary payment had been made. This new model matches what shows
 * up on a bank statement.
 */
function occurrencesInPeriod(rule, periodStart, periodEnd) {
  const ruleStart = new Date(rule.date);
  const ruleEnd = rule.recurringUntil ? new Date(rule.recurringUntil) : null;
  const today = new Date();

  // Effective cutoff — occurrences after this don't count.
  //   - today (future payments haven't happened yet)
  //   - periodEnd (occurrences outside the filter window don't count)
  //   - ruleEnd (occurrences after rule ended don't count)
  let effEnd = periodEnd;
  if (today < effEnd) effEnd = today;
  if (ruleEnd && ruleEnd < effEnd) effEnd = ruleEnd;
  if (ruleStart > effEnd) return 0;

  // Step forward one period at a time and count in-range occurrences.
  // Monthly steps by 1 month, yearly by 12. Cursor is a copy — never mutates
  // the caller's rule.date.
  const stepMonths = rule.recurringPeriod === 'yearly' ? 12 : 1;
  const cursor = new Date(ruleStart);
  let count = 0;
  // Safety cap to prevent runaway loops if data is malformed.
  let iterations = 0;
  const MAX_ITERATIONS = 1200; // 100 years of monthly occurrences
  while (cursor <= effEnd && iterations < MAX_ITERATIONS) {
    if (cursor >= periodStart) count++;
    cursor.setMonth(cursor.getMonth() + stepMonths);
    iterations++;
  }
  return count;
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

  return amount * occurrencesInPeriod(expense, periodStart, periodEnd);
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
