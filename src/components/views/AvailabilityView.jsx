import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function AvailabilityView({ openBookingForm }) {
  const { apartments, bookings } = useData();
  const [timelineStart, setTimelineStart] = useState(new Date());

  const timelineDates = useMemo(() => {
    const dates = [];
    const start = new Date(timelineStart);
    for (let i = 0; i < 14; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [timelineStart]);

  const isDateBetween = (date, start, end) => {
    const d = new Date(date).setHours(0,0,0,0);
    const s = new Date(start).setHours(0,0,0,0);
    const e = new Date(end).setHours(0,0,0,0);
    return d >= s && d <= e;
  };

  const getOccupancyStatus = (aptId, date) => {
    return bookings.find(b => b.apartmentId === aptId && isDateBetween(date, b.startDate, b.endDate));
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-180px)]">
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
        <div className="flex items-center space-x-reverse space-x-4">
          <h3 className="font-bold text-gray-800 dark:text-slate-100 flex items-center">
            <Calendar size={18} className="ml-2 text-blue-600" /> الجدول الزمني
          </h3>
          <div className="flex items-center space-x-reverse space-x-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg p-1 mr-4 shadow-sm">
            <button onClick={() => { const d = new Date(timelineStart); d.setDate(d.getDate() - 7); setTimelineStart(d); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 transition-colors"><ChevronRight size={18} /></button>
            <button onClick={() => setTimelineStart(new Date())} className="px-4 text-xs font-bold text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded py-1 transition-colors">اليوم</button>
            <button onClick={() => { const d = new Date(timelineStart); d.setDate(d.getDate() + 7); setTimelineStart(d); }} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-gray-500 transition-colors"><ChevronLeft size={18} /></button>
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium bg-blue-50 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-blue-100 dark:border-slate-700">اضغط على أي خلية للحجز المباشر</p>
      </div>

      <div className="flex-1 overflow-auto relative">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="sticky top-0 z-20 bg-white dark:bg-slate-900 shadow-sm">
              <th className="px-6 py-4 text-right font-black text-gray-800 dark:text-slate-200 border-b border-l border-gray-100 dark:border-slate-800 sticky right-0 z-30 bg-white dark:bg-slate-900 w-48 shadow-[inset_1px_0_0_0_#f3f4f6] dark:shadow-[inset_1px_0_0_0_#1e293b]">الوحدة</th>
              {timelineDates.map((date, i) => (
                <th key={i} className={`px-2 py-4 text-center border-b border-gray-100 dark:border-slate-800 min-w-[100px] ${date.toDateString() === new Date().toDateString() ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}>
                  <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-slate-500">{date.toLocaleDateString('ar-EG', { weekday: 'short' })}</p>
                  <p className={`text-lg ${date.toDateString() === new Date().toDateString() ? 'text-blue-600 font-black' : 'text-gray-700 dark:text-slate-300 font-bold'}`}>{date.getDate()}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apartments.map((apt) => (
              <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/30 group">
                <td className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 border-l sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover:bg-gray-50 dark:group-hover:bg-slate-800/80 font-bold text-gray-700 dark:text-slate-200 shadow-[inset_1px_0_0_0_#f3f4f6] dark:shadow-[inset_1px_0_0_0_#1e293b]">
                  {apt.name}
                  <span className="block text-[10px] text-gray-400 font-medium">{apt.type}</span>
                </td>
                {timelineDates.map((date, i) => {
                  const booking = getOccupancyStatus(apt.id, date);
                  const isStart = booking && new Date(booking.startDate).toDateString() === date.toDateString();
                  return (
                    <td key={i} className={`border-b border-gray-100 dark:border-slate-800 text-center relative p-0 h-16 ${date.toDateString() === new Date().toDateString() ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''}`}>
                      {booking ? (
                        <div className="h-full flex items-center justify-center p-1.5">
                          <div className="w-full h-full min-h-[40px] bg-blue-600 text-white text-[11px] rounded-lg flex items-center px-3 overflow-hidden whitespace-nowrap shadow-sm">
                            {isStart ? <span className="font-bold truncate">{booking.residentName}</span> : ''}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            openBookingForm({ apartmentId: apt.id, startDate: date.toISOString().split('T')[0], pricePerNight: apt.basePrice || '' });
                          }}
                          className="w-full h-full opacity-0 hover:opacity-100 flex items-center justify-center text-blue-500 bg-blue-50/50 dark:bg-blue-900/20 transition-all cursor-pointer border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
                        >
                          <Plus size={20} />
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
