import { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronLeft,
  LogOut,
  MessageCircle,
  Phone,
  Users,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { formatSAR } from '../../lib/paymentUtils';
import { buildWhatsAppUrl } from '../../lib/documentShare';
import { sanitizePhone } from '../../lib/phoneUtils';
import NotificationFeed from '../layout/NotificationFeed';
import SegmentedControl from '../ui/SegmentedControl';

const DAY_MS = 86400000;

function dayKey(value) {
  return new Date(value).toLocaleDateString('sv-SE');
}

function keyToDate(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function daysBetween(fromKey, toKey) {
  const [fromYear, fromMonth, fromDay] = fromKey.split('-').map(Number);
  const [toYear, toMonth, toDay] = toKey.split('-').map(Number);
  const from = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const to = Date.UTC(toYear, toMonth - 1, toDay);
  return Math.round((to - from) / DAY_MS);
}

function formatLongDate(value) {
  return new Date(value).toLocaleDateString('ar-EG', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function formatShortDate(value) {
  return new Date(value).toLocaleDateString('ar-EG', {
    day: 'numeric',
    month: 'short',
  });
}

function bookingNights(booking) {
  const start = new Date(booking.startDate);
  const end = new Date(booking.endDate);
  return Math.max(1, Math.ceil((end - start) / DAY_MS));
}

function isLiveBooking(booking) {
  return booking.status !== 'cancelled'
    && booking.status !== 'pending'
    && booking.status !== 'checked_out_early';
}

function MetricCell({ label, value, note }) {
  return (
    <div className="px-4 py-4 min-w-0">
      <p className="text-[13px] text-muted dark:text-body-dark">{label}</p>
      <p className="text-2xl font-semibold text-ink dark:text-white mt-1 tabular-nums">{value}</p>
      {note && <p className="text-[13px] text-muted-soft dark:text-body-dark mt-1 truncate">{note}</p>}
    </div>
  );
}

function ContactActions({ booking }) {
  const whatsappUrl = buildWhatsAppUrl(booking.phone);

  return (
    <div className="flex items-center gap-1 shrink-0">
      {whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-soft dark:text-body-dark dark:hover:text-white dark:hover:bg-hairline-dark transition-colors"
          aria-label={`مراسلة ${booking.residentName} عبر واتساب`}
          title="واتساب"
        >
          <MessageCircle className="w-4 h-4" />
        </a>
      )}
      <a
        href={`tel:${sanitizePhone(booking.phone).replace(/\s/g, '')}`}
        className="h-9 w-9 inline-flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface-soft dark:text-body-dark dark:hover:text-white dark:hover:bg-hairline-dark transition-colors"
        aria-label={`اتصال بـ ${booking.residentName}`}
        title="اتصال"
      >
        <Phone className="w-4 h-4" />
      </a>
    </div>
  );
}

function MovementList({ bookings, kind, apartmentMap }) {
  if (bookings.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm font-semibold text-ink dark:text-white">
          {kind === 'arrival' ? 'لا يوجد وصول اليوم' : 'لا توجد مغادرة اليوم'}
        </p>
        <p className="text-[13px] text-muted dark:text-body-dark mt-1">
          {kind === 'arrival' ? 'لا حجوزات تبدأ في تاريخ اليوم.' : 'لا حجوزات تنتهي في تاريخ اليوم.'}
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
      {bookings.map((booking) => (
        <li key={`${kind}-${booking.id}`} className="px-4 py-3.5 flex items-center gap-3 hover:bg-surface-soft/60 dark:hover:bg-hairline-dark/50 transition-colors">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="text-sm font-semibold text-ink dark:text-white truncate">{booking.residentName}</p>
              <span className={`badge-pill text-xs shrink-0 ${kind === 'arrival' ? 'badge-outline' : 'badge-ghost'}`}>
                {kind === 'arrival' ? 'وصول' : 'مغادرة'}
              </span>
            </div>
            <p className="text-[13px] text-muted dark:text-body-dark mt-1 truncate">
              {apartmentMap.get(booking.apartmentId)?.name || 'وحدة غير معروفة'}
              <span className="mx-1.5 text-muted-soft">·</span>
              {bookingNights(booking)} {bookingNights(booking) === 1 ? 'ليلة' : 'ليالٍ'}
              {booking.source && (
                <>
                  <span className="mx-1.5 text-muted-soft">·</span>
                  {booking.source}
                </>
              )}
            </p>
          </div>
          <ContactActions booking={booking} />
        </li>
      ))}
    </ul>
  );
}

function BookingRow({ booking, apartment, canSeePrices }) {
  return (
    <li className="px-4 py-3.5 flex items-center gap-3 hover:bg-surface-soft/60 dark:hover:bg-hairline-dark/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-ink dark:text-white truncate">{booking.residentName}</p>
          {booking.status === 'pending' && (
            <span className="badge-pill badge-dashed text-xs shrink-0">طلب معلّق</span>
          )}
        </div>
          <p className="text-[13px] text-muted dark:text-body-dark mt-1 truncate">
            {apartment?.name || 'وحدة غير معروفة'}
            <span className="mx-1.5 text-muted-soft">·</span>
            {bookingNights(booking)} {bookingNights(booking) === 1 ? 'ليلة' : 'ليالٍ'}
            {booking.source && (
              <>
                <span className="mx-1.5 text-muted-soft">·</span>
                {booking.source}
              </>
            )}
          </p>
      </div>
      {canSeePrices && (
        <div className="text-left shrink-0">
          <p className="text-sm font-semibold text-ink dark:text-white tabular-nums">{formatSAR(booking.pricePerNight)} ر.س</p>
          <p className="text-xs text-muted-soft dark:text-body-dark mt-1">للكل ليلة</p>
        </div>
      )}
      <ContactActions booking={booking} />
    </li>
  );
}

function UpcomingPanel({ bookings, apartments, canSeePrices, onNavigate, range, onRangeChange }) {
  const apartmentMap = useMemo(() => new Map(apartments.map((apartment) => [apartment.id, apartment])), [apartments]);
  const grouped = useMemo(() => {
    return bookings.reduce((groups, booking) => {
      const key = dayKey(booking.startDate);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(booking);
      return groups;
    }, new Map());
  }, [bookings]);

  return (
    <section className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden">
      <div className="px-4 md:px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink dark:text-white">الحجوزات القادمة</h2>
          <p className="text-[13px] text-muted dark:text-body-dark mt-1">
            {bookings.length} حجزاً خلال {range === 7 ? '7 أيام' : '30 يوماً'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="seg-group" role="tablist" aria-label="نطاق الحجوزات القادمة">
            <button
              type="button"
              role="tab"
              aria-selected={range === 7}
              onClick={() => onRangeChange(7)}
              className={`seg-item text-[13px] ${range === 7 ? 'seg-item-active' : ''}`}
            >
              7 أيام
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={range === 30}
              onClick={() => onRangeChange(30)}
              className={`seg-item text-[13px] ${range === 30 ? 'seg-item-active' : ''}`}
            >
              30 يوماً
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('residents')}
            className="hidden sm:inline-flex items-center gap-1 text-[13px] font-semibold text-accent-strong dark:text-accent hover:underline underline-offset-2"
          >
            عرض السجل
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <CalendarDays className="w-8 h-8 text-muted-soft dark:text-body-dark mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm font-semibold text-ink dark:text-white">لا توجد حجوزات في هذه الفترة</p>
          <p className="text-[13px] text-muted dark:text-body-dark mt-1">ستظهر الحجوزات الجديدة هنا فور تسجيلها.</p>
        </div>
      ) : (
        <div className="divide-y divide-hairline-soft dark:divide-hairline-dark">
          {[...grouped.entries()].map(([key, dateBookings]) => (
            <section key={key}>
              <div className="px-4 md:px-5 py-2.5 bg-surface-soft/70 dark:bg-surface-dark-elevated/50 flex items-center justify-between gap-3">
                <h3 className="text-[13px] font-semibold text-ink dark:text-white">{formatLongDate(keyToDate(key))}</h3>
                <span className="text-[13px] text-muted dark:text-body-dark">{dateBookings.length} حجوزات</span>
              </div>
              <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                {dateBookings.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    apartment={apartmentMap.get(booking.apartmentId)}
                    canSeePrices={canSeePrices}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

export default function TodayView({ onNavigate, initialFilter = null }) {
  const { apartments, bookings, loading } = useData();
  const { user } = useAuth();
  const { unreadCount, openNotificationsPanel } = useNotifications();
  const [activeTab, setActiveTab] = useState(
    initialFilter?.focus === 'notifications' ? 'notifications' : 'today'
  );
  const [upcomingRange, setUpcomingRange] = useState(30);

  const canSeePrices = user?.role === 'admin' || user?.permissions?.canViewPrices !== false;

  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => dayKey(today), [today]);
  const apartmentMap = useMemo(() => new Map(apartments.map((apartment) => [apartment.id, apartment])), [apartments]);

  const {
    arrivals,
    departures,
    inHouse,
    occupiedTonight,
    upcoming,
    pendingRequests,
  } = useMemo(() => {
    const liveBookings = (bookings || []).filter(isLiveBooking);
    const next = {
      arrivals: [],
      departures: [],
      inHouse: [],
      occupiedTonight: [],
      upcoming: [],
      pendingRequests: [],
    };

    liveBookings.forEach((booking) => {
      const startKey = dayKey(booking.startDate);
      const endKey = dayKey(booking.endDate);

      if (startKey === todayKey) next.arrivals.push(booking);
      if (endKey === todayKey) next.departures.push(booking);
      if (startKey < todayKey && endKey > todayKey) next.inHouse.push(booking);
      if (startKey <= todayKey && endKey > todayKey) next.occupiedTonight.push(booking);
      if (startKey > todayKey) next.upcoming.push(booking);
    });

    (bookings || []).forEach((booking) => {
      if (booking.status === 'pending' && dayKey(booking.startDate) >= todayKey) {
        next.pendingRequests.push(booking);
      }
    });

    next.arrivals.sort((a, b) => (apartmentMap.get(a.apartmentId)?.name || '').localeCompare(apartmentMap.get(b.apartmentId)?.name || '', 'ar'));
    next.departures.sort((a, b) => (apartmentMap.get(a.apartmentId)?.name || '').localeCompare(apartmentMap.get(b.apartmentId)?.name || '', 'ar'));
    next.inHouse.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
    next.upcoming.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    next.pendingRequests.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

    return next;
  }, [apartmentMap, bookings, todayKey]);

  const visibleUpcoming = useMemo(() => {
    return upcoming.filter((booking) => {
      const distance = daysBetween(todayKey, dayKey(booking.startDate));
      return distance > 0 && distance <= upcomingRange;
    });
  }, [todayKey, upcoming, upcomingRange]);

  const activeApartmentCount = apartments.filter((apartment) => apartment.isActive !== false).length;
  const occupancyRate = activeApartmentCount > 0
    ? Math.round((occupiedTonight.length / activeApartmentCount) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-0">
        <div className="space-y-4">
          <div className="h-12 bg-surface-card dark:bg-surface-dark-elevated rounded-lg" />
          <div className="h-28 bg-surface-card dark:bg-surface-dark-elevated rounded-lg" />
          <div className="h-[280px] bg-surface-card dark:bg-surface-dark-elevated rounded-lg" />
          <div className="h-[180px] bg-surface-card dark:bg-surface-dark-elevated rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pb-24 md:pb-0">
      <div className="flex justify-center mb-5">
        <SegmentedControl
          options={[
            { value: 'today', label: 'اليوم' },
            { value: 'upcoming', label: 'القادمة' },
            { value: 'notifications', label: 'الإشعارات', icon: Bell, badge: unreadCount },
          ]}
          value={activeTab}
          onChange={setActiveTab}
          ariaLabel="عرض اليوم والقادمة والإشعارات"
        />
      </div>

      {activeTab === 'notifications' ? (
        <aside
          id="today-notifications"
          className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden scroll-mt-4"
        >
          <NotificationFeed onNavigate={onNavigate} onOpenAll={openNotificationsPanel} />
        </aside>
      ) : activeTab === 'today' ? (
        <div className="space-y-4">
          <div className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden grid grid-cols-2 lg:grid-cols-4 divide-x divide-x-reverse divide-hairline-soft dark:divide-hairline-dark">
            <MetricCell label="وصول اليوم" value={arrivals.length} note={`${occupiedTonight.length} مبيتات هذه الليلة`} />
            <MetricCell label="مغادرة اليوم" value={departures.length} note={`${inHouse.length} نزيلاً حالياً`} />
            <MetricCell label="الإشغال الليلة" value={`${occupancyRate}%`} note={`${occupiedTonight.length} من ${activeApartmentCount} وحدات`} />
            <MetricCell label="إشعارات جديدة" value={unreadCount} note={unreadCount > 0 ? 'تحتاج إلى مراجعة' : 'لا شيء معلّق'} />
          </div>

          <section className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden">
            <div className="px-4 md:px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink dark:text-white">حركة اليوم</h2>
                <p className="text-[13px] text-muted dark:text-body-dark mt-1">{formatLongDate(today)}</p>
              </div>
              <span className="text-[13px] font-semibold text-muted dark:text-body-dark tabular-nums">
                {arrivals.length + departures.length} حركة
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-hairline-soft dark:divide-hairline-dark">
              <div className="min-w-0">
                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-surface-soft/50 dark:bg-surface-dark-elevated/40">
                  <h3 className="text-sm font-semibold text-ink dark:text-white flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-muted dark:text-body-dark" strokeWidth={1.8} />
                    الوصول
                  </h3>
                  <span className="text-[13px] text-muted dark:text-body-dark tabular-nums">{arrivals.length}</span>
                </div>
                <MovementList bookings={arrivals} kind="arrival" apartmentMap={apartmentMap} />
              </div>
              <div className="min-w-0">
                <div className="px-4 py-3 flex items-center justify-between gap-3 bg-surface-soft/50 dark:bg-surface-dark-elevated/40">
                  <h3 className="text-sm font-semibold text-ink dark:text-white flex items-center gap-2">
                    <LogOut className="w-4 h-4 text-muted dark:text-body-dark" strokeWidth={1.8} />
                    المغادرة
                  </h3>
                  <span className="text-[13px] text-muted dark:text-body-dark tabular-nums">{departures.length}</span>
                </div>
                <MovementList bookings={departures} kind="departure" apartmentMap={apartmentMap} />
              </div>
            </div>
          </section>

          <section className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden">
            <div className="px-4 md:px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-ink dark:text-white">النزلاء المقيمون</h2>
                <p className="text-[13px] text-muted dark:text-body-dark mt-1">الإقامات الجارية حتى تاريخ المغادرة</p>
              </div>
              <span className="text-[13px] font-semibold text-muted dark:text-body-dark tabular-nums">{inHouse.length}</span>
            </div>
            {inHouse.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Users className="w-8 h-8 text-muted-soft dark:text-body-dark mx-auto mb-3" strokeWidth={1.5} />
                <p className="text-sm font-semibold text-ink dark:text-white">لا يوجد نزلاء مقيمون حالياً</p>
                <p className="text-[13px] text-muted dark:text-body-dark mt-1">ستظهر هنا إقامات اليوم الحالية.</p>
              </div>
            ) : (
              <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                {inHouse.map((booking) => (
                  <li key={booking.id} className="px-4 py-3.5 flex items-center gap-3 hover:bg-surface-soft/60 dark:hover:bg-hairline-dark/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink dark:text-white truncate">{booking.residentName}</p>
                      <p className="text-[13px] text-muted dark:text-body-dark mt-1 truncate">
                        {apartmentMap.get(booking.apartmentId)?.name || 'وحدة غير معروفة'}
                        <span className="mx-1.5 text-muted-soft">·</span>
                        يغادر {formatShortDate(booking.endDate)}
                      </p>
                    </div>
                    <ContactActions booking={booking} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <UpcomingPanel
            bookings={visibleUpcoming}
            apartments={apartments}
            canSeePrices={canSeePrices}
            onNavigate={onNavigate}
            range={upcomingRange}
            onRangeChange={setUpcomingRange}
          />

          {pendingRequests.length > 0 && (
            <section className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden">
              <div className="px-4 md:px-5 py-4 border-b border-hairline-soft dark:border-hairline-dark flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-ink dark:text-white">طلبات تحتاج مراجعة</h2>
                  <p className="text-[13px] text-muted dark:text-body-dark mt-1">طلبات الحجز العامة غير المعتمدة</p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('requests')}
                  className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent-strong dark:text-accent hover:underline underline-offset-2"
                >
                  مراجعة الطلبات
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="divide-y divide-hairline-soft dark:divide-hairline-dark">
                {pendingRequests.map((booking) => (
                  <BookingRow
                    key={booking.id}
                    booking={booking}
                    apartment={apartmentMap.get(booking.apartmentId)}
                    canSeePrices={canSeePrices}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
