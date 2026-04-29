import { useState } from 'react';
import { Home, Edit3, Trash2, Plus, X } from 'lucide-react';
import { useData } from '../../context/DataContext';

export default function ApartmentsView() {
  const { apartments, addApartment, updateApartment, deleteApartment } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', type: 'استوديو', description: '', basePrice: '' });

  const handleOpenModal = (apt = null) => {
    if (apt) {
      setFormData({ ...apt });
      setEditingId(apt.id);
    } else {
      setFormData({ name: '', type: 'استوديو', description: '', basePrice: '' });
      setEditingId(null);
    }
    setIsModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (editingId) {
      updateApartment(formData);
    } else {
      addApartment(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if(confirm('هل أنت متأكد من حذف هذه الشقة وجميع حجوزاتها؟')) {
      deleteApartment(id);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apartments.map((apt) => (
          <div key={apt.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col h-full relative group transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"><Home size={24} /></div>
              <div className="flex space-x-reverse space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleOpenModal(apt)}
                  className="text-gray-400 hover:text-blue-600 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                >
                  <Edit3 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(apt.id)}
                  className="text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-slate-100">{apt.name}</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6 mt-1 font-medium">{apt.type} • {apt.description}</p>
            <div className="mt-auto pt-4 border-t border-gray-50 dark:border-slate-800">
              <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">السعر الأساسي</p>
              <p className="text-2xl font-black text-green-600 dark:text-green-400">{apt.basePrice} <span className="text-sm text-gray-400 font-bold">ر.س / ليلة</span></p>
            </div>
          </div>
        ))}
        <button
          onClick={() => handleOpenModal()}
          className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-600 dark:hover:bg-slate-800 transition-all cursor-pointer bg-transparent min-h-[200px]"
        >
          <div className="p-3 rounded-full bg-gray-50 dark:bg-slate-800 mb-3"><Plus size={24} /></div>
          <span className="font-bold">إضافة وحدة جديدة</span>
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50 dark:bg-slate-900">
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
                {editingId ? 'تعديل بيانات الوحدة' : 'إضافة وحدة جديدة'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">اسم/رقم الوحدة</label>
                <input required type="text" placeholder="مثال: شقة 101" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">النوع</label>
                    <select className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                        <option>استوديو</option><option>غرفة وصالة</option><option>غرفتين وصالة</option><option>جناح ملكي</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">السعر الافتراضي</label>
                    <input required type="number" placeholder="200" className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 dark:text-slate-100 transition-all" value={formData.basePrice} onChange={(e) => setFormData({...formData, basePrice: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">ملاحظات/وصف</label>
                <textarea className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-28 bg-white dark:bg-slate-800 dark:text-slate-100 resize-none transition-all" placeholder="وصف الشقة أو ملاحظات داخلية..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}></textarea>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 mt-4">
                {editingId ? 'تحديث البيانات' : 'حفظ الوحدة'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
