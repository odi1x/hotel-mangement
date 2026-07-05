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
          <div className="bg-surface-card dark:bg-surface-dark-elevated text-ink dark:text-white p-3 rounded-lg">
            <Clock size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink dark:text-white">طلبات الحجز المعلقة</h1>
            <p className="text-muted dark:text-[#a1a1aa] mt-1">
              لديك <span className="font-semibold text-ink dark:text-white">{pendingRequests.length}</span> طلبات بانتظار التأكيد
            </p>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="text-center py-20 bg-canvas dark:bg-surface-dark rounded-xl border border-dashed border-hairline dark:border-[#2e2e2e]">
            <CheckCircle className="mx-auto text-hairline dark:text-[#2e2e2e] mb-4" size={48} />
            <h3 className="text-lg font-semibold text-ink dark:text-white mb-2">لا توجد طلبات معلقة</h3>
            <p className="text-muted dark:text-[#a1a1aa]">لقد قمت بمراجعة جميع طلبات الحجز الواردة.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pendingRequests.map(request => {
              const apt = apartments.find(a => a.id === request.apartmentId);
              return (
                <div key={request.id} className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-[#242424] overflow-hidden flex flex-col">

                  <div className="p-5 border-b border-hairline-soft dark:border-[#242424] flex justify-between items-start">
                    <div>
                      <span className="badge-pill mb-2">
                        قيد المراجعة
                      </span>
                      <h3 className="font-semibold text-lg tracking-tight text-ink dark:text-white">{apt?.name || 'وحدة محذوفة'}</h3>
                      <p className="text-xs text-muted mt-1">تاريخ الطلب: {new Date(request.createdAt).toLocaleDateString('ar-SA')}</p>
                    </div>
                    {apt?.coverPhoto ? (
                      <img src={apt.coverPhoto} alt="apartment" className="w-16 h-16 rounded-md object-cover" />
                    ) : (
                      <div className="w-16 h-16 bg-surface-card dark:bg-surface-dark-elevated rounded-md flex items-center justify-center">
                        <ImageIcon className="text-muted-soft" size={24} />
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 text-sm text-body dark:text-[#a1a1aa]">
                        <User size={16} className="text-muted-soft" />
                        <span className="font-medium truncate">{request.residentName}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-body dark:text-[#a1a1aa]">
                        <Phone size={16} className="text-muted-soft" />
                        <span dir="ltr" className="font-medium truncate">{request.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 bg-surface-card dark:bg-surface-dark-elevated p-3 rounded-lg">
                       <Calendar size={18} className="text-ink dark:text-white shrink-0 mt-0.5" />
                       <div className="flex-1">
                         <p className="text-xs text-muted mb-1 font-medium">فترة الإقامة المطلوبة</p>
                         <div className="text-sm font-semibold text-ink dark:text-white flex justify-between">
                            <span>{new Date(request.startDate).toLocaleDateString('en-GB')}</span>
                            <span className="text-muted-soft">←</span>
                            <span>{new Date(request.endDate).toLocaleDateString('en-GB')}</span>
                         </div>
                       </div>
                    </div>

                    {request.customerRequest && (
                      <div className="text-sm text-body dark:text-[#a1a1aa] bg-surface-soft dark:bg-surface-dark-elevated p-3 rounded-lg flex flex-col gap-1">
                        <span className="text-xs font-semibold text-muted">ملاحظات إضافية من النزيل:</span>
                        <span className="italic">"{request.customerRequest}"</span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 pt-0 mt-auto flex gap-3">
                    <button
                      onClick={() => handleConfirm(request)}
                      className="btn-primary flex-1"
                    >
                      <CheckCircle size={18} />
                      تأكيد الحجز
                    </button>
                    <button
                      onClick={() => handleDeny(request.id)}
                      className="btn-secondary flex-1"
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
