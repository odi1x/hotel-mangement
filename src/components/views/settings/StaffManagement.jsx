import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Edit2, Trash2, Shield, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import StaffFormModal from '../../ui/StaffFormModal';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/staff');
      setStaff(res.data);
    } catch {
      toast.error('فشل في جلب قائمة الموظفين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStaff();
  }, []);

  const handleOpenAddModal = () => {
    setSelectedStaff(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (s) => {
    setSelectedStaff(s);
    setIsModalOpen(true);
  };


  const handleDeleteStaff = async () => {
    if (!deleteConfirmId) return;

    try {
      await axios.delete(`/api/staff?id=${deleteConfirmId}`);
      toast.success('تم حذف الموظف بنجاح');
      setStaff(staff.filter(s => s.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل في حذف الموظف');
      setDeleteConfirmId(null);
    }
  };

  const confirmDelete = (id) => {
    setDeleteConfirmId(id);
  };


  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-ink dark:text-white" /></div>;
  }

  return (
    <div className="bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-hairline-dark overflow-hidden">
      <div className="p-6 border-b border-hairline-soft dark:border-hairline-dark flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink dark:text-white flex items-center gap-2">
            <Shield className="text-ink dark:text-white" />
            <span>إدارة الموظفين والصلاحيات</span>
          </h2>
          <p className="text-sm text-muted dark:text-body-dark mt-1">
            أضف موظفين جدد وحدد صلاحيات وصولهم للنظام
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>إضافة موظف</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="text-muted dark:text-body-dark text-sm border-b border-hairline-soft dark:border-hairline-dark">
              <th className="p-4 font-semibold">الموظف</th>
              <th className="p-4 font-semibold">اسم المستخدم</th>
              <th className="p-4 font-semibold">تاريخ الإضافة</th>
              <th className="p-4 font-semibold">الصلاحيات</th>
              <th className="p-4 font-semibold w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline-soft dark:divide-hairline-dark">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center overflow-hidden">
                      {s.profilePicture ? (
                        <img src={s.profilePicture} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-ink dark:text-white font-semibold text-sm">
                          {s.name ? s.name.charAt(0) : s.username.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="font-semibold text-ink dark:text-white">{s.name || 'بدون اسم'}</span>
                  </div>
                </td>
                <td className="p-4 text-body dark:text-body-dark" dir="ltr">{s.username}</td>
                <td className="p-4 text-muted dark:text-body-dark text-sm">
                  {new Date(s.createdAt).toLocaleDateString('ar-SA')}
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {s.canBook && <span className="badge-pill text-xs">حجز</span>}
                    {s.canEdit && <span className="badge-pill text-xs">تعديل</span>}
                    {s.canDelete && <span className="badge-pill text-xs">حذف</span>}
                    {s.canViewAnalytics && <span className="badge-pill text-xs">إحصائيات</span>}
                    {s.canViewSettings && <span className="badge-pill text-xs">إعدادات</span>}
                    {!s.canBook && !s.canEdit && !s.canDelete && !s.canViewAnalytics && !s.canViewSettings && (
                      <span className="text-xs text-muted-soft">لا توجد صلاحيات</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      className="icon-action"
                      title="تعديل الموظف"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => confirmDelete(s.id)}
                      className="icon-action"
                      title="حذف الموظف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {staff.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-muted dark:text-body-dark">
                  لا يوجد موظفين مضافين حالياً. انقر على "إضافة موظف" للبدء.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <StaffFormModal
          staff={selectedStaff}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            fetchStaff();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setDeleteConfirmId(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-sm overflow-hidden border border-hairline dark:border-hairline-dark-soft">
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-surface-card dark:bg-surface-dark-elevated flex items-center justify-center mx-auto mb-4 text-ink dark:text-white">
                <Trash2 size={32} />
              </div>
              <h3 className="font-semibold tracking-tight text-ink dark:text-white text-xl mb-2">تأكيد الحذف</h3>
              <p className="text-muted dark:text-body-dark text-sm">هل أنت متأكد من حذف هذا الموظف؟ لن يمكن التراجع عن هذا الإجراء.</p>
            </div>

            <div className="p-4 border-t border-hairline-soft dark:border-hairline-dark flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn-secondary flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteStaff}
                className="btn-primary flex-1"
              >
                حذف الموظف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
