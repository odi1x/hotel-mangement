import React from 'react';
import { useData } from '../../context/DataContext';
import { Calendar, User, Phone, CheckCircle, XCircle, Clock, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RequestsView({ openBookingForm }) {
  const { bookings, apartments, deleteBooking } = useData();

  // Filter only pending requests
  const pendingRequests = (bookings || []).filter(b => b.status === 'pending');

  const handleDeny = async (id) => {
    if (confirm('هل أنت متأكد من رفض هذا الطلب؟ سيتم حذفه من النظام.')) {
      try {
        await deleteBooking(id);
        toast.success('تم رفض الطلب بنجاح');
      } catch (err) {
        toast.error('حدث خطأ أثناء رفض الطلب');
      }
    }
  };

  const handleConfirm = (booking) => {
    // Pass a copy of the booking to avoid direct state mutation,
    // overriding the status to active so it saves as active.
    openBookingForm({ ...booking, status: 'active' });
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center gap-3 mb-8">
          <div className="bg-amber-100 text-amber-600 p-3 rounded-xl">
            <Clock size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">طلبات الحجز المعلقة</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              لديك <span className="font-bold text-amber-600">{pendingRequests.length}</span> طلبات بانتظار التأكيد
            </p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-800">
            <CheckCircle className="mx-auto text-gray-300 dark:text-slate-700 mb-4" size={48} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">لا توجد طلبات معلقة</h3>
            <p className="text-gray-500 dark:text-gray-400">لقد قمت بمراجعة جميع طلبات الحجز الواردة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingRequests.map(request => {
              const apt = apartments.find(a => a.id === request.apartmentId);
              return (
                <div key={request.id} className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-amber-100 dark:border-amber-900/30 overflow-hidden flex flex-col">

                  <div className="p-5 border-b border-gray-50 dark:border-slate-800/50 flex justify-between items-start bg-amber-50/50 dark:bg-amber-900/10">
                    <div>
                      <span className="inline-block bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 text-xs font-bold px-2 py-1 rounded mb-2">
                        قيد المراجعة
                      </span>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white">{apt?.name || 'وحدة محذوفة'}</h3>
                      <p className="text-xs text-gray-500 mt-1">تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                    {apt?.coverPhoto ? (
                      <img src={apt.coverPhoto} alt="apartment" className="w-16 h-16 rounded-lg object-cover shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                        <ImageIcon className="text-gray-300" size={24} />
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-slate-300">
                        <User size={16} className="text-gray-400" />
                        <span className="font-semibold truncate">{request.residentName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-slate-300">
                        <Phone size={16} className="text-gray-400" />
                        <span dir="ltr" className="font-semibold truncate">{request.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700">
                       <Calendar size={18} className="text-blue-500 shrink-0 mt-0.5" />
                       <div className="flex-1">
                         <p className="text-xs text-gray-500 mb-1 font-medium">فترة الإقامة المطلوبة</p>
                         <div className="text-sm font-bold text-gray-900 dark:text-white flex justify-between">
                            <span>{new Date(request.startDate).toLocaleDateString('en-GB')}</span>
                            <span className="text-gray-400">←</span>
                            <span>{new Date(request.endDate).toLocaleDateString('en-GB')}</span>
                         </div>
                       </div>
                    </div>

                    {request.customerRequest && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 p-3 rounded-xl flex flex-col gap-1">
                        <span className="text-xs font-bold text-gray-500">ملاحظات إضافية من النزيل:</span>
                        <span className="italic">"{request.customerRequest}"</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 pt-0 mt-auto flex gap-3">
                    <button
                      onClick={() => handleConfirm(request)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 dark:shadow-none transition-all active:scale-95"
                    >
                      <CheckCircle size={18} />
                      تأكيد الحجز
                    </button>
                    <button
                      onClick={() => handleDeny(request.id)}
                      className="flex-1 bg-white hover:bg-red-50 dark:bg-slate-800 dark:hover:bg-slate-700 border-2 border-red-100 hover:border-red-200 dark:border-slate-700 dark:hover:border-red-900/50 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <XCircle size={18} />
                      رفض الطلب
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
