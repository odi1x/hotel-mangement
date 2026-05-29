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

  const fetchStaff = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/staff');
      setStaff(res.data);
    } catch (err) {
      toast.error('فشل في جلب قائمة الموظفين');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموظف؟ لن يمكن التراجع عن هذا الإجراء.')) return;

    try {
      await axios.delete(`/api/staff/${id}`);
      toast.success('تم حذف الموظف بنجاح');
      setStaff(staff.filter(s => s.id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'فشل في حذف الموظف');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/30">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Shield className="text-blue-600 dark:text-blue-400" />
            <span>إدارة الموظفين والصلاحيات</span>
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            أضف موظفين جدد وحدد صلاحيات وصولهم للنظام
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold transition-all active:scale-95 shadow-md shadow-blue-200 dark:shadow-none"
        >
          <Plus size={18} />
          <span>إضافة موظف</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-right">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-slate-400 text-sm">
              <th className="p-4 font-semibold">الموظف</th>
              <th className="p-4 font-semibold">اسم المستخدم</th>
              <th className="p-4 font-semibold">تاريخ الإضافة</th>
              <th className="p-4 font-semibold">الصلاحيات</th>
              <th className="p-4 font-semibold w-24">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center overflow-hidden border border-blue-200 dark:border-blue-800">
                      {s.profilePicture ? (
                        <img src={s.profilePicture} alt={s.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-bold text-sm">
                          {s.name ? s.name.charAt(0) : s.username.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-gray-800 dark:text-slate-200">{s.name || 'بدون اسم'}</span>
                  </div>
                </td>
                <td className="p-4 text-gray-600 dark:text-slate-300" dir="ltr">{s.username}</td>
                <td className="p-4 text-gray-500 dark:text-slate-400 text-sm">
                  {new Date(s.createdAt).toLocaleDateString('ar-SA')}
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1">
                    {s.canBook && <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-md">حجز</span>}
                    {s.canEdit && <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-md">تعديل</span>}
                    {s.canDelete && <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs rounded-md">حذف</span>}
                    {s.canViewAnalytics && <span className="px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 text-xs rounded-md">إحصائيات</span>}
                    {s.canViewSettings && <span className="px-2 py-1 bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-300 text-xs rounded-md">إعدادات</span>}
                    {!s.canBook && !s.canEdit && !s.canDelete && !s.canViewAnalytics && !s.canViewSettings && (
                      <span className="text-xs text-gray-400">لا توجد صلاحيات</span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEditModal(s)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                      title="تعديل الموظف"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteStaff(s.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
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
                <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-slate-400">
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
    </div>
  );
}