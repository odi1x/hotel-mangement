import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, CalendarPlus, Home, Search, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import DatePickerCal from './DatePickerCal';

export default function BookByDateModal({ onClose, onSelectApartment }) {
  const { apartments, bookings } = useData();
  const [dateValue, setDateValue] = useState({ startDate: null, endDate: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [cleanConfirm, setCleanConfirm] = useState(null);

  const hasRange = !!(dateValue.startDate && dateValue.endDate);

  const isAvailable = (apartmentId) => {
    if (!hasRange) return false;
    const start = new Date(dateValue.startDate).setHours(0, 0, 0, 0);
    const end = new Date(dateValue.endDate).setHours(0, 0, 0, 0);
    for (const booking of bookings) {
      if (booking.apartmentId !== apartmentId) continue;
      const bStart = new Date(booking.startDate).setHours(0, 0, 0, 0);
      const bEnd = new Date(booking.endDate).setHours(0, 0, 0, 0);
      if (start < bEnd && end > bStart) return false;
    }
    return true;
  };

  const availableApartments = useMemo(() => {
    if (!hasRange) return [];
    return apartments.filter(apt => isAvailable(apt.id));
  }, [apartments, bookings, dateValue.startDate, dateValue.endDate, hasRange]);

  const filteredApartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return availableApartments;
    return availableApartments.filter(apt =>
      (apt.name || '').toLowerCase().includes(q) ||
      (apt.type || '').toLowerCase().includes(q)
    );
  }, [availableApartments, searchQuery]);

  const selectApartment = (apt) => {
    onSelectApartment(apt.id, dateValue.startDate, dateValue.endDate);
  };

  const handleBook = (apt) => {
    if (apt.needsCleaning) {
      setCleanConfirm(apt);
      return;
    }
    selectApartment(apt);
  };

  const confirmUncleaned = () => {
    const apt = cleanConfirm;
    setCleanConfirm(null);
    if (apt) selectApartment(apt);
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex z-50 items-end p-0 md:items-center md:justify-center md:p-4" data-modal-active>
      <div className="bg-canvas dark:bg-surface-dark rounded-t-2xl md:rounded-xl anim-sheet w-full max-w-2xl shadow-soft border border-hairline dark:border-hairline-dark-soft flex flex-col max-h-[90vh]">
        <div className="sheet-handle" />
        <div className="p-5 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white flex items-center gap-2">
            <CalendarPlus className="text-ink dark:text-white" size={22} />
            حجز جديد
          </h2>
          <button onClick={onClose} className="icon-action">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* Calendar shown directly */}
          <div className="max-w-sm mx-auto">
            <DatePickerCal value={dateValue} onChange={setDateValue} />
          </div>

          {/* Available units appear once a range is chosen */}
          {hasRange && (
            <div className="mt-6 pt-6 border-t border-hairline-soft dark:border-hairline-dark">
              <h3 className="font-semibold text-ink dark:text-white mb-4">
                الوحدات المتاحة <span className="text-muted font-medium">({filteredApartments.length})</span>
              </h3>

              {/* Search — locate a unit by name or number */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="ابحث عن رقم أو اسم الوحدة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10 pr-4 py-2 w-full"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-muted-soft" />
              </div>

              {filteredApartments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredApartments.map(apt => {
                    const isNotClean = apt.needsCleaning;
                    return (
                      <div
                        key={apt.id}
                        className="card-surface p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-1.5 rounded-md bg-surface-card dark:bg-surface-dark text-ink dark:text-white shrink-0"><Home size={16} /></div>
                              <span className="font-semibold text-ink dark:text-white truncate">{apt.name}</span>
                            </div>
                            {isNotClean && (
                              <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0 rounded-full text-xs font-semibold px-2.5 py-1 bg-canvas dark:bg-surface-dark text-ink dark:text-white border border-dashed border-muted-soft">تحتاج تنظيف</span>
                            )}
                          </div>
                          <p className="text-xs text-muted dark:text-body-dark mb-2">{apt.type}</p>
                          <p className="text-lg font-semibold tracking-tight text-ink dark:text-white mb-4">
                            {apt.basePrice} <span className="text-xs text-muted font-semibold">ر.س / ليلة</span>
                          </p>
                        </div>

                        <button
                          onClick={() => handleBook(apt)}
                          className="btn-accent w-full h-9 text-sm"
                        >
                          حجز هذه الوحدة
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : availableApartments.length === 0 ? (
                <div className="text-center py-10 bg-surface-card dark:bg-surface-dark-elevated rounded-lg">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-canvas dark:bg-surface-dark mb-3 border border-hairline dark:border-hairline-dark-soft">
                    <CalendarPlus size={24} className="text-muted-soft" />
                  </div>
                  <p className="text-muted dark:text-body-dark font-medium">لا توجد وحدات متاحة في هذه الفترة.</p>
                </div>
              ) : (
                <div className="text-center py-10 bg-surface-card dark:bg-surface-dark-elevated rounded-lg">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-canvas dark:bg-surface-dark mb-3 border border-hairline dark:border-hairline-dark-soft">
                    <Search size={24} className="text-muted-soft" />
                  </div>
                  <p className="text-muted dark:text-body-dark font-medium">لا توجد وحدات مطابقة للبحث.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Uncleaned-unit confirmation — allow booking, but warn first */}
      {cleanConfirm && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" data-modal-active>
          <div className="bg-canvas dark:bg-surface-dark rounded-xl shadow-soft border border-hairline dark:border-hairline-dark-soft w-full max-w-sm p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-amber-50 dark:bg-surface-dark-elevated mb-4">
              <AlertTriangle className="h-7 w-7 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white mb-2">
              الوحدة غير نظيفة
            </h3>
            <p className="text-sm text-muted dark:text-body-dark font-medium mb-5">
              تنبيه: الوحدة <span className="font-semibold text-ink dark:text-white">{cleanConfirm.name}</span> غير نظيفة حالياً. هل أنت متأكد من رغبتك في حجزها؟
            </p>
            <div className="flex flex-col gap-2">
              <button onClick={confirmUncleaned} className="btn-accent h-11 w-full">
                متابعة الحجز
              </button>
              <button onClick={() => setCleanConfirm(null)} className="btn-secondary h-11 w-full">
                رجوع
              </button>
            </div>
          </div>
        </div>
      , document.body)}
    </div>
  ,
    document.body
  );
}
