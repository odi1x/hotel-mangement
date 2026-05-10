import { useState, useMemo } from 'react';
import { X, Calendar, Search, Home } from 'lucide-react';
import { useData } from '../../context/DataContext';
import Datepicker from "react-tailwindcss-datepicker";

export default function BookByDateModal({ onClose, onSelectApartment }) {
  const { apartments, bookings } = useData();
  const [dateValue, setDateValue] = useState({
    startDate: null,
    endDate: null
  });
  const [hasSearched, setHasSearched] = useState(false);

  // Check if an apartment is available during the given dates
  const isAvailable = (apartmentId) => {
    if (!dateValue.startDate || !dateValue.endDate) return false;

    const start = new Date(dateValue.startDate).setHours(0,0,0,0);
    const end = new Date(dateValue.endDate).setHours(0,0,0,0);

    // Check all bookings for this apartment
    for (const booking of bookings) {
      if (booking.apartmentId !== apartmentId) continue;

      const bStart = new Date(booking.startDate).setHours(0,0,0,0);
      const bEnd = new Date(booking.endDate).setHours(0,0,0,0);

      // Check for overlap: Date ranges overlap if (start1 < end2) AND (end1 > start2)
      // We use strictly less/greater than to allow check-in on the same day as checkout
      if (start < bEnd && end > bStart) {
        return false; // Found an overlap, not available
      }
    }
    return true; // No overlaps found
  };

  const availableApartments = useMemo(() => {
    if (!hasSearched) return [];
    return apartments.filter(apt => isAvailable(apt.id));
  }, [apartments, bookings, dateValue.startDate, dateValue.endDate, hasSearched]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (dateValue.startDate && dateValue.endDate) {
      setHasSearched(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
          <h2 className="text-xl font-black text-gray-800 dark:text-slate-100 flex items-center">
            <Calendar className="ml-2 text-blue-600" size={24} />
            البحث بالتاريخ
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSearch} className="mb-8">
            <div className="mb-4 relative z-50">
              <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">تاريخ الحجز</label>
              <Datepicker
                primaryColor="blue"
                value={dateValue}
                onChange={(newValue) => {
                  setDateValue(newValue);
                  setHasSearched(false);
                }}
                showShortcuts={true}
                i18n="ar"
                displayFormat="YYYY/MM/DD"
                placeholder="اختر فترة الحجز"
                inputClassName="w-full py-2.5 pr-12 pl-4 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all text-sm font-medium"
              />
            </div>

            <button
              type="submit"
              className="mt-4 w-full flex items-center justify-center space-x-reverse space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 dark:shadow-none active:scale-95"
            >
              <Search size={18} />
              <span className="mr-2">بحث عن الوحدات المتاحة</span>
            </button>
          </form>

          {hasSearched && (
            <div>
              <h3 className="font-bold text-gray-800 dark:text-slate-200 mb-4 flex items-center">
                النتائج المتاحة ({availableApartments.length})
              </h3>

              {availableApartments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {availableApartments.map(apt => (
                    <div
                      key={apt.id}
                      className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center space-x-reverse space-x-2 mb-2">
                          <Home size={18} className="text-blue-600 dark:text-blue-400" />
                          <span className="font-bold text-gray-800 dark:text-slate-200">{apt.name}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">{apt.type}</p>
                        <p className="text-sm font-black text-green-600 dark:text-green-400 mb-4">
                          {apt.basePrice} ر.س / ليلة
                        </p>
                      </div>
                      <button
                        onClick={() => onSelectApartment(apt.id, dateValue.startDate, dateValue.endDate)}
                        className="w-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 py-2 rounded-lg font-bold text-sm transition-colors"
                      >
                        حجز هذه الوحدة
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800 mb-3">
                    <Calendar size={24} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 font-medium">عذراً، لا توجد وحدات متاحة في هذه الفترة.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
