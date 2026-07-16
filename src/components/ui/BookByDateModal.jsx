import { useState, useMemo } from 'react';
import { X, CalendarPlus, Home } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import DatePickerCal from './DatePickerCal';

export default function BookByDateModal({ onClose, onSelectApartment }) {
  const { apartments, bookings, updateApartment } = useData();
  const { user } = useAuth();
  const [dateValue, setDateValue] = useState({ startDate: null, endDate: null });

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

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-canvas dark:bg-surface-dark rounded-xl w-full max-w-2xl shadow-soft border border-hairline dark:border-hairline-dark-soft flex flex-col max-h-[90vh]">
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
                الوحدات المتاحة <span className="text-muted font-medium">({availableApartments.length})</span>
              </h3>

              {availableApartments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableApartments.map(apt => {
                    const isNotClean = apt.needsCleaning;
                    return (
                      <div
                        key={apt.id}
                        className="card-surface p-4 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 rounded-md bg-surface-card dark:bg-surface-dark text-ink dark:text-white"><Home size={16} /></div>
                              <span className="font-semibold text-ink dark:text-white">{apt.name}</span>
                            </div>
                            {isNotClean && (
                              <span className="inline-flex items-center gap-1.5 rounded-full text-xs font-semibold px-2.5 py-1 bg-canvas dark:bg-surface-dark text-ink dark:text-white border border-dashed border-muted-soft">تحتاج تنظيف</span>
                            )}
                          </div>
                          <p className="text-xs text-muted dark:text-body-dark mb-2">{apt.type}</p>
                          <p className="text-lg font-semibold tracking-tight text-ink dark:text-white mb-4">
                            {apt.basePrice} <span className="text-xs text-muted font-semibold">ر.س / ليلة</span>
                          </p>
                        </div>

                        {isNotClean ? (
                          (user?.role === 'admin' || user?.permissions?.canEdit) ? (
                            <button
                              onClick={async () => await updateApartment({ ...apt, needsCleaning: false })}
                              className="w-full bg-canvas dark:bg-surface-dark border border-hairline dark:border-hairline-dark-soft hover:bg-surface-soft dark:hover:bg-hairline-dark text-ink dark:text-white py-2 rounded-md font-semibold text-sm transition-colors"
                            >
                              تحديد كـ "تم التنظيف"
                            </button>
                          ) : (
                            <div className="w-full bg-surface-card dark:bg-surface-dark text-muted dark:text-body-dark py-2 rounded-md font-semibold text-sm text-center">
                              الوحدة تحتاج لتنظيف
                            </div>
                          )
                        ) : (
                          <button
                            onClick={() => onSelectApartment(apt.id, dateValue.startDate, dateValue.endDate)}
                            className="btn-accent w-full h-9 text-sm"
                          >
                            حجز هذه الوحدة
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 bg-surface-card dark:bg-surface-dark-elevated rounded-lg">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-canvas dark:bg-surface-dark mb-3 border border-hairline dark:border-hairline-dark-soft">
                    <CalendarPlus size={24} className="text-muted-soft" />
                  </div>
                  <p className="text-muted dark:text-body-dark font-medium">لا توجد وحدات متاحة في هذه الفترة.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
