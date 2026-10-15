import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, CalendarClock, Banknote, Coins, Pencil, AlertTriangle, TagsIcon, Wrench } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { sanitizePhone } from '../../lib/phoneUtils';
import DatePickerCal from './DatePickerCal';
import { computeStayTotal, summarizeBreakdown } from '../../lib/pricingUtils';
import toast from 'react-hot-toast';

export default function BookingForm({ onClose, initialData }) {
  const { apartments, bookings, addBooking, updateBooking, pricingRules, maintenanceIssues } = useData();
  const { user } = useAuth();

  const [bookingSources, setBookingSources] = useState(['زيارة مباشرة', 'Booking.com', 'Airbnb']);

  useEffect(() => {
    if (user && user.bookingSources) {
      setBookingSources(user.bookingSources.split(',').map(s => s.trim()).filter(Boolean));
    }
  }, [user]);

  // DatePickerCal strictly expects 'YYYY-MM-DD' strings — it parses via
  // s.split('-').map(Number), so a full ISO datetime string (what the API
  // returns for existing bookings, e.g. "2026-08-05T00:00:00.000Z") breaks
  // it: the day segment becomes "05T00:00:00.000Z" and Number(...) on that
  // is NaN. Convert on the way in so editing an existing booking's dates
  // shows correctly instead of "undefined NaN".
  const toDateStr = (d) => {
    if (!d) return null;
    const date = new Date(d);
    if (isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const [dateValue, setDateValue] = useState({
    startDate: toDateStr(initialData?.startDate),
    endDate: toDateStr(initialData?.endDate)
  });
  const [showCal, setShowCal] = useState(!(initialData?.startDate && initialData?.endDate));

  const [formData, setFormData] = useState({
    id: initialData?.id || null,
    apartmentId: initialData?.apartmentId || '',
    residentName: initialData?.residentName || '',
    residentId: initialData?.residentId || '',
    phone: initialData?.phone || '',
    address: initialData?.address || '',
    pricePerNight: initialData?.pricePerNight ?? '',
    source: initialData?.source || 'زيارة مباشرة',
    notes: initialData?.notes || '',
    customerRequest: initialData?.customerRequest || '',
    status: initialData?.status || undefined
  });

  // Track whether the user manually edited pricePerNight — if so, we stop
  // auto-overwriting it from the rules (they're overriding on purpose).
  const [priceManuallyEdited, setPriceManuallyEdited] = useState(!!initialData?.id);

  // Which way the operator thinks about money for this booking:
  //   per_night → they type the nightly rate, we derive the total
  //   total     → they type the grand total, we derive the nightly rate
  // Both columns are always persisted; this only decides which one is the input.
  const [pricingMode, setPricingMode] = useState(initialData?.pricingMode === 'total' ? 'total' : 'per_night');
  const [totalInput, setTotalInput] = useState(
    initialData?.totalPrice != null ? String(Number(initialData.totalPrice)) : ''
  );
  // True once the operator types their own grand total, so an extension's
  // computed total stops overwriting them.
  const [totalManuallyEdited, setTotalManuallyEdited] = useState(false);
  // Custom rate for the added nights. null = follow the seasonal engine.
  const [customAddedRate, setCustomAddedRate] = useState(null);

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const money = (n) => round2(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

  const [retrievedNotes, setRetrievedNotes] = useState(null);

  useEffect(() => {
    if (formData.id) return;
    const hasPhone = formData.phone && formData.phone.length >= 8;
    const hasId = formData.residentId && formData.residentId.length >= 5;
    if (hasPhone || hasId) {
      const pastBookings = bookings.filter(b => {
        if (!b.notes || b.notes.trim() === '') return false;
        const phoneMatch = hasPhone && b.phone === formData.phone;
        const idMatch = hasId && b.residentId === formData.residentId;
        return phoneMatch || idMatch;
      });
      if (pastBookings.length > 0) {
        pastBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const latestNote = pastBookings[0].notes;
        if (formData.notes !== latestNote && retrievedNotes !== latestNote) setRetrievedNotes(latestNote);
      } else {
        setRetrievedNotes(null);
      }
    } else {
      setRetrievedNotes(null);
    }
  }, [formData.phone, formData.residentId, bookings, formData.notes, formData.id]);

  const [error, setError] = useState('');

  const isOverlapping = (start, end, aptId) => {
    return bookings.some(b => {
      if (b.apartmentId !== aptId) return false;
      if (formData.id && b.id === formData.id) return false;
      const bStart = new Date(b.startDate).setHours(0, 0, 0, 0);
      const bEnd = new Date(b.endDate).setHours(0, 0, 0, 0);
      return start < bEnd && end > bStart;
    });
  };

  const nights = (dateValue.startDate && dateValue.endDate)
    ? Math.max(1, Math.round((new Date(dateValue.endDate) - new Date(dateValue.startDate)) / 86400000))
    : 0;

  // Resolve seasonal pricing for the selected apartment + date range
  const selectedApt = apartments.find(a => a.id === formData.apartmentId);

  const stayCalc = useMemo(() => {
    if (!selectedApt || !dateValue.startDate || !dateValue.endDate) return null;
    return computeStayTotal(pricingRules, selectedApt, dateValue.startDate, dateValue.endDate);
  }, [selectedApt, dateValue.startDate, dateValue.endDate, pricingRules]);

  // Auto-fill price when apartment / dates change (unless user manually edited
  // or is in total mode, where they own the number outright).
  useEffect(() => {
    if (pricingMode !== 'per_night') return;
    if (priceManuallyEdited || !stayCalc || stayCalc.nights === 0) return;
    const avg = Math.round(stayCalc.averagePerNight * 100) / 100;
    if (avg !== Number(formData.pricePerNight)) {
      setFormData(prev => ({ ...prev, pricePerNight: String(avg) }));
    }
  }, [stayCalc, priceManuallyEdited, pricingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const breakdownSummary = useMemo(() => {
    if (!stayCalc) return [];
    return summarizeBreakdown(stayCalc.breakdown);
  }, [stayCalc]);

  const hasSeasonalPricing = breakdownSummary.some(g => g.ruleId);

  // The estimated total: use the seasonal-priced total when available (no
  // manual override), otherwise fall back to nightly-price × nights.
  const total = useMemo(() => {
    if (!priceManuallyEdited && stayCalc && stayCalc.nights > 0) return stayCalc.total;
    return nights > 0 && formData.pricePerNight ? nights * Number(formData.pricePerNight) : 0;
  }, [priceManuallyEdited, stayCalc, nights, formData.pricePerNight]);

  // ----- Extending a stay ------------------------------------------------
  // A "pure extension" = same unit, same check-in, later check-out. Only the
  // ADDED nights are re-priced at today's rate; the nights the guest already
  // has keep the price they were booked at. Changing the unit or the check-in
  // is a different booking, so we fall back to a full recompute for those.
  const originalNights = (initialData?.startDate && initialData?.endDate)
    ? Math.max(1, Math.round((new Date(initialData.endDate) - new Date(initialData.startDate)) / 86400000))
    : 0;

  const extension = (() => {
    if (!formData.id || !selectedApt || !initialData?.startDate || !initialData?.endDate) return null;
    if (!dateValue.startDate || !dateValue.endDate) return null;
    if (formData.apartmentId !== initialData.apartmentId) return null;
    const origStart = toDateStr(initialData.startDate);
    const origEnd = toDateStr(initialData.endDate);
    if (dateValue.startDate !== origStart) return null;
    if (dateValue.endDate <= origEnd) return null; // not an extension

    const added = computeStayTotal(pricingRules, selectedApt, origEnd, dateValue.endDate);
    if (added.nights <= 0) return null;

    const preservedTotal = initialData.totalPrice != null
      ? Number(initialData.totalPrice)
      : originalNights * Number(initialData.pricePerNight || 0);

    return {
      originalNights,
      addedNights: added.nights,
      defaultRate: added.nights > 0 ? added.total / added.nights : 0,
      preservedTotal
    };
  })();

  // An extension spans two nightly rates, so a single "per night" figure is
  // meaningless — force the grand-total view while still letting the operator
  // fine-tune both the added-night rate and the final total.
  const effectiveMode = extension ? 'total' : pricingMode;

  const effectiveAddedRate = (customAddedRate != null && customAddedRate !== '')
    ? Number(customAddedRate)
    : (extension?.defaultRate ?? 0);
  const effectiveAddedCost = extension ? round2(effectiveAddedRate * extension.addedNights) : 0;
  const autoNewTotal = extension ? round2(extension.preservedTotal + effectiveAddedCost) : 0;

  const effectiveTotalInput = extension && !totalManuallyEdited
    ? String(autoNewTotal)
    : totalInput;

  const perNightFromTotal = nights > 0 && Number(effectiveTotalInput) > 0 ? Number(effectiveTotalInput) / nights : 0;
  const displayTotal = effectiveMode === 'total' ? (Number(effectiveTotalInput) || 0) : total;
  const displayPerNight = effectiveMode === 'per_night' ? (Number(formData.pricePerNight) || 0) : perNightFromTotal;

  const handleTotalChange = (value) => {
    setTotalManuallyEdited(true);
    setTotalInput(value);
  };

  const switchToPerNight = () => {
    setPricingMode('per_night');
    if (nights > 0 && Number(effectiveTotalInput) > 0) {
      setFormData(prev => ({ ...prev, pricePerNight: String(round2(Number(effectiveTotalInput) / nights)) }));
      setPriceManuallyEdited(true);
    }
  };

  const switchToTotal = () => {
    setPricingMode('total');
    const current = total || (nights > 0 && formData.pricePerNight ? nights * Number(formData.pricePerNight) : 0);
    setTotalManuallyEdited(true);
    setTotalInput(current ? String(round2(current)) : '');
  };

  const fmtShort = (d) => d ? new Date(d).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' }) : '';

  // Warn about urgent open maintenance on the selected unit (warn-only, doesn't block)
  const urgentOpenIssues = useMemo(() => {
    if (!formData.apartmentId) return [];
    return (maintenanceIssues || []).filter(i =>
      i.apartmentId === formData.apartmentId &&
      i.status !== 'resolved' &&
      i.severity === 'urgent'
    );
  }, [maintenanceIssues, formData.apartmentId]);

  // Advisory (warn-only) — booking an uncleaned unit is allowed, but the
  // operator is told so they can arrange cleaning before the guest arrives.
  const selectedApartment = apartments.find(a => a.id === formData.apartmentId);
  const needsCleaningWarning = !!selectedApartment?.needsCleaning;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!dateValue.startDate || !dateValue.endDate) { setError('يرجى تحديد تواريخ الدخول والمغادرة'); return; }
    const start = new Date(dateValue.startDate).setHours(0, 0, 0, 0);
    const end = new Date(dateValue.endDate).setHours(0, 0, 0, 0);
    if (end < start) { setError('تاريخ المغادرة لا يمكن أن يكون قبل تاريخ الوصول'); return; }
    if (isOverlapping(start, end, formData.apartmentId)) { setError('هذه الوحدة محجوزة بالفعل في الفترة المحددة'); return; }
    try {
      // Persist both columns consistently with the mode the operator used.
      const finalTotal = effectiveMode === 'total' ? (Number(effectiveTotalInput) || 0) : total;
      const finalPerNight = effectiveMode === 'total'
        ? (nights > 0 ? round2(Number(effectiveTotalInput) / nights) : Number(formData.pricePerNight) || 0)
        : Number(formData.pricePerNight) || 0;

      const payload = {
        ...formData,
        pricePerNight: finalPerNight,
        totalPrice: finalTotal || undefined,
        pricingMode: effectiveMode,
        startDate: dateValue.startDate,
        endDate: dateValue.endDate
      };

      if (formData.id) {
        await updateBooking({ ...payload, status: formData.status === 'pending' ? 'active' : formData.status });
      } else {
        await addBooking(payload);
      }
      toast.success('تم الحفظ بنجاح');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء الحجز');
    }
  };

  const eyebrow = "block text-2xs font-semibold text-muted dark:text-body-dark uppercase tracking-wide mb-1.5";

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active dir="rtl">
      <div className="bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl shadow-soft border border-hairline dark:border-hairline-dark-soft w-full max-w-2xl flex flex-col max-h-[92vh] overflow-hidden anim-sheet">
        <div className="sheet-handle shrink-0" />
        <div className="p-6 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-soft text-accent flex items-center justify-center"><Calendar size={20} /></div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white leading-none mb-1">{formData.id ? 'تعديل الحجز' : 'حجز جديد'}</h2>
              <p className="text-xs text-muted dark:text-body-dark">أدخل التفاصيل لإعداد عقد الإيجار.</p>
            </div>
          </div>
          <button onClick={onClose} className="icon-action"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-8 flex-1 overflow-y-auto min-h-0">
          {error && (
            <div className="mb-6 bg-surface-card dark:bg-surface-dark-elevated text-ink dark:text-white p-3 rounded-md text-sm font-medium border border-hairline dark:border-hairline-dark-soft">
              {error}
            </div>
          )}

          {/* Maintenance warn — advisory, doesn't block. Shows when unit has urgent open issues. */}
          {urgentOpenIssues.length > 0 && (
            <div className="mb-6 border border-dashed border-accent/60 bg-accent-soft rounded-md p-3 flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-accent/15 text-accent-strong shrink-0">
                <AlertTriangle size={14} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-accent-strong mb-0.5">
                  تنبيه: هذه الوحدة لديها {urgentOpenIssues.length} {urgentOpenIssues.length === 1 ? 'بلاغ صيانة عاجل' : 'بلاغات صيانة عاجلة'} مفتوحة
                </p>
                <ul className="text-xs text-body dark:text-body-dark space-y-0.5 mt-1">
                  {urgentOpenIssues.slice(0, 3).map(i => (
                    <li key={i.id} className="flex items-center gap-1.5">
                      <Wrench size={10} className="text-muted-soft" />
                      <span>{i.title}</span>
                    </li>
                  ))}
                  {urgentOpenIssues.length > 3 && (
                    <li className="text-muted-soft">... و {urgentOpenIssues.length - 3} أخرى</li>
                  )}
                </ul>
                <p className="text-2xs text-muted-soft mt-1.5">يمكنك المتابعة، لكن تأكّد من حل المشكلة قبل الوصول.</p>
              </div>
            </div>
          )}

          {/* Cleaning warn — advisory, doesn't block. Shows when the unit still needs cleaning. */}
          {needsCleaningWarning && (
            <div className="mb-6 border border-dashed border-amber-400/70 bg-amber-50 dark:bg-amber-500/10 rounded-md p-3 flex items-start gap-3">
              <div className="p-1.5 rounded-md bg-amber-500/15 text-amber-600 shrink-0">
                <AlertTriangle size={14} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">
                  تنبيه: هذه الوحدة غير نظيفة حالياً
                </p>
                <p className="text-2xs text-muted-soft mt-1.5">يمكنك المتابعة بالحجز، لكن تأكّد من تنظيف الوحدة قبل وصول النزيل.</p>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="mb-8">
            <label className={eyebrow}>فترة الإقامة</label>
            {(dateValue.startDate && dateValue.endDate && !showCal) ? (
              <button type="button" onClick={() => setShowCal(true)}
                className="w-full flex items-center justify-between bg-surface-card dark:bg-surface-dark-elevated rounded-lg px-4 py-3 text-right transition-colors hover:bg-surface-strong/50 dark:hover:bg-hairline-dark">
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className="text-2xs text-muted-soft">الوصول</div>
                    <div className="font-semibold text-ink dark:text-white text-sm">{fmtShort(dateValue.startDate)}</div>
                  </div>
                  <span className="text-muted-soft">←</span>
                  <div className="text-center">
                    <div className="text-2xs text-muted-soft">المغادرة</div>
                    <div className="font-semibold text-ink dark:text-white text-sm">{fmtShort(dateValue.endDate)}</div>
                  </div>
                  {nights > 0 && <span className="badge-pill bg-accent-soft text-accent-strong font-semibold mr-2">{nights} ليالٍ</span>}
                </div>
                <span className="flex items-center gap-1 text-xs link-accent"><Pencil size={13} /> تعديل</span>
              </button>
            ) : (
              <div className="border border-hairline dark:border-hairline-dark-soft rounded-lg p-4 max-w-sm mx-auto">
                <DatePickerCal
                  value={dateValue}
                  onChange={(v) => { setDateValue(v); setTotalManuallyEdited(false); if (v.startDate && v.endDate) setShowCal(false); }}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2">معلومات النزيل</h4>
              <div>
                <label className={eyebrow}>الاسم الكامل</label>
                <input required type="text" placeholder="مثلاً: أحمد محمد" className="input-field" value={formData.residentName} onChange={(e) => setFormData({ ...formData, residentName: e.target.value })} />
              </div>
              <div>
                <label className={eyebrow}>رقم الهوية / الجواز</label>
                <input required type="text" placeholder="10XXXXXXXX" className="input-field" value={formData.residentId} onChange={(e) => setFormData({ ...formData, residentId: e.target.value })} />
              </div>
              <div>
                <label className={eyebrow}>رقم الهاتف</label>
                <input
                  required
                  type="tel"
                  dir="ltr"
                  placeholder="05XXXXXXXX"
                  className="input-field text-right"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: sanitizePhone(e.target.value) })}
                />
              </div>

              {initialData?.customerRequest && (
                <div className="bg-surface-card dark:bg-surface-dark-elevated border border-hairline dark:border-hairline-dark-soft rounded-md p-3 flex flex-col gap-1">
                  <p className="text-2xs font-semibold text-muted dark:text-body-dark uppercase">طلب النزيل الإضافي</p>
                  <p className="text-xs text-ink dark:text-white">{initialData.customerRequest}</p>
                </div>
              )}

              {retrievedNotes && (
                <div className="bg-accent-soft border border-accent/30 rounded-md p-3 flex flex-col gap-2">
                  <p className="text-xs text-accent-strong font-semibold">يوجد ملاحظة سابقة لهذا النزيل:</p>
                  <p className="text-xs text-body dark:text-body-dark bg-canvas dark:bg-surface-dark p-2 rounded border border-hairline dark:border-hairline-dark-soft">{retrievedNotes}</p>
                  <button
                    type="button"
                    onClick={() => { setFormData({ ...formData, notes: retrievedNotes }); setRetrievedNotes(null); }}
                    className="text-xs bg-accent hover:bg-accent-strong text-white py-1.5 rounded-md font-semibold transition-colors mt-1"
                  >
                    استعادة هذه الملاحظة للحجز الحالي
                  </button>
                </div>
              )}

              <div>
                <label className={eyebrow}>العنوان</label>
                <input type="text" placeholder="الشارع، المدينة، الدولة" className="input-field" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-muted dark:text-body-dark uppercase tracking-widest border-b border-hairline-soft dark:border-hairline-dark pb-2">تفاصيل الإقامة</h4>
              <div>
                <label className={eyebrow}>الوحدة</label>
                <select required className="input-field" value={formData.apartmentId} onChange={(e) => {
                  const selectedAptId = e.target.value;
                  // Changing unit resets the manual-override flag — a new unit is a fresh price context.
                  setPriceManuallyEdited(false);
                  setCustomAddedRate(null);
                  setTotalManuallyEdited(false);
                  const apt = apartments.find(a => a.id === selectedAptId);
                  setFormData({ ...formData, apartmentId: selectedAptId, pricePerNight: apt ? apt.basePrice : formData.pricePerNight });
                }}>
                  <option value="">اختر الشقة...</option>
                  {apartments.map(a => <option key={a.id} value={a.id}>{a.name} ({a.basePrice} ر.س)</option>)}
                </select>
              </div>
              {/* Pricing mode — do they think in nightly rate or grand total? */}
              <div>
                <label className={eyebrow}>طريقة التسعير</label>
                <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-card dark:bg-surface-dark-elevated">
                  <button
                    type="button"
                    onClick={switchToPerNight}
                    disabled={!!extension}
                    title={extension ? 'لا يمكن استخدام تسعير الليلة عند تمديد الإقامة' : undefined}
                    className={`flex items-center justify-center gap-1.5 h-9 rounded-md text-xs transition-colors ${
                      effectiveMode === 'per_night'
                        ? 'bg-canvas dark:bg-surface-dark text-ink dark:text-white font-semibold shadow-sm'
                        : 'text-muted dark:text-body-dark hover:text-ink dark:hover:text-white'
                    } ${extension ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Coins size={14} /> سعر الليلة
                  </button>
                  <button
                    type="button"
                    onClick={switchToTotal}
                    className={`flex items-center justify-center gap-1.5 h-9 rounded-md text-xs transition-colors ${
                      effectiveMode === 'total'
                        ? 'bg-canvas dark:bg-surface-dark text-ink dark:text-white font-semibold shadow-sm'
                        : 'text-muted dark:text-body-dark hover:text-ink dark:hover:text-white'
                    }`}
                  >
                    <Banknote size={14} /> الإجمالي
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {effectiveMode === 'per_night' ? (
                    <>
                      <label className={eyebrow}>
                        السعر / الليلة
                        {hasSeasonalPricing && !priceManuallyEdited && (
                          <span className="text-accent-strong mr-1 normal-case">· متوسط موسمي</span>
                        )}
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          placeholder="0"
                          className="input-field font-semibold pl-12"
                          value={formData.pricePerNight}
                          onChange={(e) => {
                            setPriceManuallyEdited(true);
                            setFormData({ ...formData, pricePerNight: e.target.value });
                          }}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-soft font-medium pointer-events-none">ر.س</span>
                      </div>
                      {hasSeasonalPricing && priceManuallyEdited && (
                        <button
                          type="button"
                          onClick={() => setPriceManuallyEdited(false)}
                          className="text-2xs text-accent-strong hover:underline mt-1 font-semibold"
                        >
                          إعادة حساب السعر تلقائياً حسب القواعد الموسمية
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <label className={eyebrow}>
                        الإجمالي
                        {extension && <span className="text-accent-strong mr-1 normal-case">· بعد التمديد</span>}
                      </label>
                      <div className="relative">
                        <input
                          required
                          type="number"
                          placeholder="0"
                          className="input-field font-semibold pl-12"
                          value={effectiveTotalInput}
                          onChange={(e) => handleTotalChange(e.target.value)}
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-soft font-medium pointer-events-none">ر.س</span>
                      </div>
                    </>
                  )}
                </div>
                <div>
                  <label className={eyebrow}>مصدر الوصول</label>
                  <select className="input-field" value={formData.source} onChange={(e) => setFormData({ ...formData, source: e.target.value })}>
                    {bookingSources.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Seasonal pricing breakdown — only meaningful when pricing per night */}
              {effectiveMode === 'per_night' && hasSeasonalPricing && !priceManuallyEdited && breakdownSummary.length > 0 && (
                <div className="border border-dashed border-accent/40 rounded-md p-3 bg-accent-soft/40">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TagsIcon size={11} className="text-accent-strong" />
                    <span className="text-2xs font-semibold text-accent-strong uppercase tracking-wider">
                      تسعير موسمي
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {breakdownSummary.map((g, i) => (
                      <li key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {g.ruleColor && (
                            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: g.ruleColor }}></div>
                          )}
                          <span className="text-body dark:text-body-dark truncate">
                            {g.ruleLabel || 'السعر الأساسي'}
                          </span>
                        </div>
                        <span className="text-ink dark:text-white font-semibold shrink-0" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {g.count} × {g.price} = {g.subtotal} ر.س
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extension summary — old nights stay priced, new nights at today's rate */}
              {extension && (
                <div className="rounded-lg border border-accent/40 bg-accent-soft/50 overflow-hidden">
                  <div className="flex items-center gap-1.5 px-3 py-2 border-b border-accent/20 bg-accent/5">
                    <CalendarClock size={13} className="text-accent-strong" />
                    <span className="text-2xs font-semibold text-accent-strong uppercase tracking-wider">تمديد الإقامة</span>
                    <span className="mr-auto text-2xs font-bold text-accent-strong">+{extension.addedNights} ليالٍ</span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-body dark:text-body-dark">الليالي الأصلية ({extension.originalNights})</span>
                      <span className="font-semibold text-ink dark:text-white" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(extension.preservedTotal)} ر.س</span>
                    </div>

                    <div className="text-xs">
                      <span className="text-body dark:text-body-dark">الليالي الإضافية ({extension.addedNights}) · سعر قابل للتعديل</span>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="relative w-24 shrink-0">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={customAddedRate != null ? customAddedRate : String(round2(extension.defaultRate))}
                            onChange={(e) => { setCustomAddedRate(e.target.value); setTotalManuallyEdited(false); }}
                            className="input-field !py-1.5 !pl-10 !pr-2 !text-xs font-semibold text-left"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          />
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-2xs text-muted-soft pointer-events-none">ر.س</span>
                        </div>
                        <span className="text-muted-soft shrink-0">× {extension.addedNights}</span>
                        <span className="font-semibold text-ink dark:text-white mr-auto" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(effectiveAddedCost)} ر.س</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm font-bold border-t border-accent/20 pt-2 mt-1">
                      <span className="text-ink dark:text-white flex items-center gap-1.5">
                        الإجمالي الجديد
                        {totalManuallyEdited && (
                          <span className="text-2xs font-semibold text-accent-strong bg-accent/10 rounded px-1.5 py-0.5">معدّل يدوياً</span>
                        )}
                      </span>
                      <span className="text-accent-strong" style={{ fontVariantNumeric: 'tabular-nums' }}>{money(Number(effectiveTotalInput) || 0)} ر.س</span>
                    </div>
                    <p className="text-2xs text-muted-soft leading-relaxed pt-1.5">
                      الأسعار تتغيّر حسب الموسم والمدة: الليالي المحجوزة مسبقاً تحتفظ بسعرها الأصلي، والليالي الإضافية تُحسب بسعر اليوم ويمكنك تعديل سعرها.
                    </p>
                  </div>
                </div>
              )}

              {/* Derived readout — the number the operator did NOT type */}
              <div className="flex items-center justify-between bg-surface-card dark:bg-surface-dark-elevated rounded-lg px-4 py-3 mt-2">
                <span className="text-sm text-muted dark:text-body-dark">
                  {effectiveMode === 'per_night'
                    ? `الإجمالي التقديري${nights > 0 ? ` (${nights} ليالٍ)` : ''}`
                    : 'السعر لكل ليلة'}
                </span>
                <span className="text-lg font-bold tracking-tight text-accent" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {effectiveMode === 'per_night'
                    ? (displayTotal ? money(displayTotal) : '—')
                    : (displayPerNight ? money(displayPerNight) : '—')}
                  <span className="text-xs text-muted-soft font-semibold"> ر.س</span>
                </span>
              </div>
            </div>
          </div>

          <button type="submit" className="btn-accent w-full h-12 text-base mt-8">{formData.id ? 'حفظ التعديلات' : 'تأكيد الحجز'}</button>
        </form>
      </div>
    </div>
  ,
    document.body
  );
}
