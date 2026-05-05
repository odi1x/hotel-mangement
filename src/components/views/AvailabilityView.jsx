import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function AvailabilityView({ openBookingForm }) {
  const { apartments, bookings } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday, 1 is Monday

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];

    // Previous month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonthDays - i),
        isCurrentMonth: false
      });
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month padding
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [year, month, daysInMonth, firstDayOfMonth]);

  const isDateBetween = (date, start, end) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(start).setHours(0,0,0,0);
    const e = new Date(end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(b => isDateBetween(date, b.startDate, b.endDate));
  };

  const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Predefined colors for apartments
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
    'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  ];

  const getAptColor = (aptId) => {
    const index = apartments.findIndex(a => a.id === aptId);
    return colors[index % colors.length] || colors[0];
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
        <div className="flex items-center space-x-reverse space-x-4">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center text-lg">
            <Calendar size={20} className="ml-2 text-blue-600" />
            {monthNames[month]} {year}
          </h3>
          <div className="flex items-center space-x-reverse space-x-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-1 mr-4 shadow-sm">
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 transition-colors"><ChevronRight size={18} /></button>
            <button onClick={handleToday} className="px-4 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded py-1 transition-colors">اليوم</button>
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 transition-colors"><ChevronLeft size={18} /></button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium bg-blue-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-blue-100 dark:border-slate-700">اضغط على أي يوم لإضافة حجز</p>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 dark:bg-slate-900/50">
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day) => (
            <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-l border-gray-100 dark:border-slate-800 last:border-l-0">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr h-full">
          {calendarDays.map((dayObj, i) => {
            const dateStr = dayObj.date.toDateString();
            const isToday = dateStr === new Date().toDateString();
            const dayBookings = getBookingsForDate(dayObj.date);

            return (
              <div
                key={i}
                className={`min-h-[120px] p-2 border-b border-l border-gray-200 dark:border-slate-800 last:border-l-0 relative group transition-colors
                  ${!dayObj.isCurrentMonth ? 'bg-gray-50/50 dark:bg-slate-900/30' : 'bg-white dark:bg-slate-900 hover:bg-gray-50 dark:hover:bg-slate-800/50'}
                  ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}
                `}
                onClick={() => {
                  openBookingForm({ startDate: dayObj.date.toISOString().split('T')[0] });
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-blue-600 text-white shadow-md' :
                      !dayObj.isCurrentMonth ? 'text-gray-400 dark:text-slate-600' : 'text-gray-700 dark:text-slate-300'
                    }
                  `}>
                    {dayObj.date.getDate()}
                  </span>
                  {isToday && <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">اليوم</span>}
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[calc(100%-35px)] pr-1 custom-scrollbar">
                  {dayBookings.map(booking => {
                    const apt = apartments.find(a => a.id === booking.apartmentId);
                    if (!apt) return null;

                    const colorClass = getAptColor(apt.id);
                    const isStart = new Date(booking.startDate).toDateString() === dateStr;
                    const isEnd = new Date(booking.endDate).toDateString() === dateStr;

                    return (
                      <div
                        key={booking.id}
                        title={`${apt.name} - ${booking.residentName}`}
                        className={`text-[10px] px-2 py-1 rounded-md font-bold truncate cursor-pointer transition-all hover:opacity-80 border border-transparent
                          ${colorClass}
                          ${isStart ? 'rounded-r-full ml-1' : ''}
                          ${isEnd ? 'rounded-l-full mr-1' : ''}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Could open edit form here if needed
                        }}
                      >
                        <span className="opacity-70 ml-1">{apt.name}:</span>
                        {booking.residentName}
                      </div>
                    );
                  })}
                </div>

                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
                  <div className="bg-white dark:bg-slate-800 rounded-full p-2 shadow-lg text-blue-600">
                    <Plus size={20} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
