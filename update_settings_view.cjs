const fs = require('fs');

let content = fs.readFileSync('src/components/views/SettingsView.jsx', 'utf8');

// Replace cleanerSalary/Scope in formData initial state
content = content.replace(
  /cleanerSalary: '',\s+cleanerScope: '',\s+generalExpenses: ''/g,
  "generalExpenses: ''"
);

// Replace cleanerSalary/Scope in User useEffect assignment
content = content.replace(
  /cleanerSalary: user.cleanerSalary \|\| '',\s+cleanerScope: user.cleanerScope \|\| '',\s+generalExpenses: user.generalExpenses \|\| ''/g,
  "generalExpenses: user.generalExpenses || ''"
);

content = content.replace(
  'const { apartments, licenses, addLicense, deleteLicense } = useData();',
  `const { apartments, licenses, addLicense, deleteLicense, staffExpenses, fetchStaffExpenses } = useData();
  const [newStaff, setNewStaff] = useState({ name: '', monthlySalary: '', scope: [] });`
);

// We need an axios import for posting staff
if (!content.includes("import axios from 'axios';")) {
    content = content.replace(
        "import { Save, Plus, Trash2, Settings, Shield } from 'lucide-react';",
        "import { Save, Plus, Trash2, Settings, Shield } from 'lucide-react';\nimport axios from 'axios';"
    );
}

const uiReplacement = `                    {/* Staff Expenses Management */}
                    <div className="mt-8 border-t border-gray-100 dark:border-slate-800 pt-8">
                      <h3 className="text-base font-bold text-gray-900 dark:text-white mb-6">الرواتب والموظفين</h3>

                      <div className="space-y-4 mb-6">
                        {staffExpenses?.map(staff => (
                          <div key={staff.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700">
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white text-sm">{staff.name}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">الراتب: {staff.monthlySalary} ر.س | النطاق: {staff.scope === 'all' ? 'جميع الوحدات' : staff.scope?.split(',').length + ' وحدات'}</p>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await axios.delete(\`/api/staff-expenses?id=\${staff.id}\`);
                                  fetchStaffExpenses();
                                  toast.success('تم الحذف بنجاح');
                                } catch(e) {
                                  toast.error('حدث خطأ');
                                }
                              }}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-700 space-y-4">
                        <h4 className="text-sm font-bold text-gray-700 dark:text-slate-300">إضافة مصروف راتب +</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <input
                              type="text"
                              value={newStaff.name}
                              onChange={(e) => setNewStaff({...newStaff, name: e.target.value})}
                              placeholder="المسمى الوظيفي / الاسم"
                              className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={newStaff.monthlySalary}
                              onChange={(e) => setNewStaff({...newStaff, monthlySalary: e.target.value})}
                              placeholder="الراتب الشهري (ر.س)"
                              className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div className="relative">
                            <select
                                className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white text-sm font-bold"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '') {
                                        setNewStaff({...newStaff, scope: []});
                                    } else {
                                        const current = [...newStaff.scope];
                                        if (current.includes(val)) {
                                            setNewStaff({...newStaff, scope: current.filter(id => id !== val)});
                                        } else {
                                            setNewStaff({...newStaff, scope: [...current, val]});
                                        }
                                    }
                                }}
                                value=""
                            >
                                <option value="" disabled className="font-bold">تحديد النطاق (اختر الشقق)...</option>
                                <option value="" className="font-bold text-blue-600">-- جميع الوحدات -- (مسح التحديد)</option>
                                {apartments.map(apt => (
                                    <option key={apt.id} value={apt.id} className="font-bold">
                                        {newStaff.scope.includes(apt.id) ? '✓ ' : ''}{apt.name}
                                    </option>
                                ))}
                            </select>

                            {newStaff.scope.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {newStaff.scope.map(id => {
                                        const apt = apartments.find(a => a.id === id);
                                        return apt ? (
                                            <span key={id} className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs font-bold">
                                                {apt.name}
                                                <button type="button" onClick={() => setNewStaff({...newStaff, scope: newStaff.scope.filter(s => s !== id)})} className="hover:text-blue-900">×</button>
                                            </span>
                                        ) : null;
                                    })}
                                </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if(!newStaff.name || !newStaff.monthlySalary) return toast.error('أكمل البيانات');
                            try {
                              await axios.post('/api/staff-expenses', {
                                name: newStaff.name,
                                monthlySalary: newStaff.monthlySalary,
                                scope: newStaff.scope.length ? newStaff.scope.join(',') : 'all'
                              });
                              setNewStaff({ name: '', monthlySalary: '', scope: [] });
                              fetchStaffExpenses();
                              toast.success('تم الإضافة بنجاح');
                            } catch(e) { toast.error('حدث خطأ'); }
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors w-full md:w-auto"
                        >
                          إضافة الموظف +
                        </button>
                      </div>
                    </div>`;

// Delete old cleaner blocks
content = content.replace(
  /<div>\s*<label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-2">راتب النظافة الشهري[^]*?<\/div>\s*<\/div>\s*<\/div>/,
  uiReplacement
);

fs.writeFileSync('src/components/views/SettingsView.jsx', content, 'utf8');
console.log('Settings view updated');
