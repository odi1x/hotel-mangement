import { useMemo, useState } from 'react';
import { Plus, Wrench, AlertTriangle, Circle, CheckCircle2, CircleDashed, Search, Filter, Trash2, Pencil } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import {
  MAINTENANCE_CATEGORIES,
  categoryLabel,
  severityLabel,
  statusLabel,
  daysOpen,
  daysOpenLabel
} from '../../lib/maintenanceUtils';
import MaintenanceIssueForm from '../ui/MaintenanceIssueForm';

// Ordering used in the triage sort. Hoisted out of the component so React
// doesn't complain about missing useMemo deps for these constants.
const SEVERITY_RANK = { urgent: 0, normal: 1, improvement: 2 };
const STATUS_RANK = { open: 0, in_progress: 1, resolved: 2 };

/**
 * Triage board for maintenance issues.
 *
 * Design intent: this is NOT a Kanban with three columns. It's a chronological
 * list — a shop clipboard — that surfaces urgent open items to the top and
 * shows how long each one has been open. That "days open" counter is the
 * point: it's a reality check that makes forgotten issues obvious.
 */
export default function MaintenanceView() {
  const { apartments, maintenanceIssues, deleteMaintenanceIssue } = useData();
  const { user } = useAuth();
  const canDelete = user?.role === 'admin' || user?.permissions?.canDelete;

  const [showAdd, setShowAdd] = useState(false);
  const [editIssue, setEditIssue] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open'); // 'all' | 'open' | 'in_progress' | 'resolved'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [apartmentFilter, setApartmentFilter] = useState('all');

  const filtered = useMemo(() => {
    return maintenanceIssues
      .filter(i => {
        if (statusFilter !== 'all' && i.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
        if (apartmentFilter !== 'all' && i.apartmentId !== apartmentFilter) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const hay = `${i.title} ${i.description || ''} ${i.contractor || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Unresolved issues first, then urgent severity first, then newest report first
        if (STATUS_RANK[a.status] !== STATUS_RANK[b.status]) {
          return STATUS_RANK[a.status] - STATUS_RANK[b.status];
        }
        if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]) {
          return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        }
        return new Date(b.reportedAt) - new Date(a.reportedAt);
      });
  }, [maintenanceIssues, statusFilter, categoryFilter, apartmentFilter, search]);

  const stats = useMemo(() => {
    const open = maintenanceIssues.filter(i => i.status !== 'resolved');
    return {
      totalOpen: open.length,
      urgent: open.filter(i => i.severity === 'urgent').length,
      inProgress: maintenanceIssues.filter(i => i.status === 'in_progress').length,
      resolvedThisMonth: maintenanceIssues.filter(i => {
        if (i.status !== 'resolved' || !i.resolvedAt) return false;
        const d = new Date(i.resolvedAt);
        const now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }).length
    };
  }, [maintenanceIssues]);

  const dateFormat = (d) => new Date(d).toLocaleDateString('ar-EG', {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  const severityBadge = (s) => {
    const map = {
      urgent:      { cls: 'bg-accent-strong text-white', dot: null },
      normal:      { cls: 'bg-surface-soft text-body dark:bg-surface-dark-elevated dark:text-[#a1a1aa]', dot: null },
      improvement: { cls: 'bg-transparent text-muted-soft border border-hairline dark:border-[#2e2e2e]', dot: null }
    };
    const v = map[s] || map.normal;
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${v.cls}`}>
        {s === 'urgent' && <AlertTriangle size={11} strokeWidth={2.5} />}
        {severityLabel(s)}
      </span>
    );
  };

  const statusBadge = (s) => {
    const map = {
      open:        { cls: 'border border-accent/60 text-accent-strong bg-accent-soft', Icon: Circle },
      in_progress: { cls: 'border border-dashed border-accent/60 text-accent-strong bg-transparent', Icon: CircleDashed },
      resolved:    { cls: 'bg-surface-soft text-muted dark:bg-surface-dark-elevated dark:text-[#a1a1aa]', Icon: CheckCircle2 }
    };
    const v = map[s] || map.open;
    return (
      <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2.5 py-0.5 ${v.cls}`}>
        <v.Icon size={11} strokeWidth={2.5} />
        {statusLabel(s)}
      </span>
    );
  };

  return (
    <>
      {/* Add button + stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <Wrench size={13} className="text-muted dark:text-[#a1a1aa]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa]">
              مفتوحة الآن
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {stats.totalOpen}
          </p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-accent-soft">
              <AlertTriangle size={13} className="text-accent-strong" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa]">
              عاجلة
            </p>
          </div>
          <p className={`text-2xl font-bold tracking-tight leading-none ${stats.urgent > 0 ? 'text-accent-strong' : 'text-muted-soft'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
            {stats.urgent}
          </p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <CircleDashed size={13} className="text-muted dark:text-[#a1a1aa]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa]">
              قيد المعالجة
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {stats.inProgress}
          </p>
        </div>

        <div className="card-surface p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-surface-soft dark:bg-surface-dark-elevated">
              <CheckCircle2 size={13} className="text-muted dark:text-[#a1a1aa]" />
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted dark:text-[#a1a1aa]">
              أُنجزت هذا الشهر
            </p>
          </div>
          <p className="text-2xl font-bold tracking-tight text-ink dark:text-white leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {stats.resolvedThisMonth}
          </p>
        </div>
      </div>

      {/* Main list */}
      <div className="flex-1 bg-canvas dark:bg-surface-dark rounded-lg border border-hairline dark:border-[#242424] overflow-hidden flex flex-col min-h-0">
        <div className="p-4 border-b border-hairline-soft dark:border-[#242424] shrink-0">
          <div className="flex justify-between items-center gap-4 mb-4">
            <h3 className="font-semibold tracking-tight text-ink dark:text-white shrink-0">
              سجل البلاغات
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="ابحث..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 pr-4 py-2"
                />
                <Search size={16} className="absolute left-3 top-2.5 text-muted-soft" />
              </div>
              <button onClick={() => setShowAdd(true)} className="btn-accent h-10 px-4 shrink-0">
                <Plus size={16} />
                <span>بلاغ جديد</span>
              </button>
            </div>
          </div>

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 mr-1">
              <Filter size={12} className="text-muted-soft" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-soft">تصفية:</span>
            </div>

            <div className="nav-pill-group">
              {[
                { v: 'open',        label: 'مفتوح' },
                { v: 'in_progress', label: 'قيد المعالجة' },
                { v: 'resolved',    label: 'منجَز' },
                { v: 'all',         label: 'الكل' }
              ].map(o => (
                <button
                  key={o.v}
                  onClick={() => setStatusFilter(o.v)}
                  className={`h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
                    statusFilter === o.v
                      ? 'bg-canvas text-ink shadow-pill dark:bg-[#2e2e2e] dark:text-white'
                      : 'text-muted hover:text-ink dark:hover:text-white'
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field h-7 py-0 text-xs w-auto"
            >
              <option value="all">كل التصنيفات</option>
              {MAINTENANCE_CATEGORIES.map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>

            <select
              value={apartmentFilter}
              onChange={(e) => setApartmentFilter(e.target.value)}
              className="input-field h-7 py-0 text-xs w-auto"
            >
              <option value="all">كل الوحدات</option>
              {apartments.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {filtered.length === 0 ? (
            <div className="py-20 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-surface-soft dark:bg-surface-dark-elevated flex items-center justify-center mb-4">
                <Wrench size={22} className="text-muted-soft" />
              </div>
              <p className="text-base font-semibold text-ink dark:text-white mb-1">
                لا توجد بلاغات مطابقة
              </p>
              <p className="text-sm text-muted dark:text-[#a1a1aa]">
                {maintenanceIssues.length === 0
                  ? 'ابدأ بتوثيق مشكلة صيانة أولى.'
                  : 'جرّب تعديل عوامل التصفية أعلاه.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline-soft dark:divide-[#242424]">
              {filtered.map(issue => {
                const apt = apartments.find(a => a.id === issue.apartmentId);
                const days = daysOpen(issue);
                const isOpen = issue.status !== 'resolved';
                const isUrgentOpen = isOpen && issue.severity === 'urgent';

                return (
                  <li
                    key={issue.id}
                    className={`px-6 py-4 hover:bg-surface-soft/60 dark:hover:bg-surface-dark-elevated/40 transition-colors group ${
                      isUrgentOpen ? 'border-r-2 border-accent' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <p className="font-semibold text-ink dark:text-white leading-tight">
                            {issue.title}
                          </p>
                          {severityBadge(issue.severity)}
                          {statusBadge(issue.status)}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted dark:text-[#a1a1aa] mb-1">
                          <span className="font-medium">{apt?.name || 'وحدة محذوفة'}</span>
                          <span className="text-muted-soft">·</span>
                          <span>{categoryLabel(issue.category)}</span>
                          <span className="text-muted-soft">·</span>
                          <span
                            className={`font-medium ${
                              isUrgentOpen && days >= 3 ? 'text-accent-strong' : ''
                            }`}
                          >
                            {daysOpenLabel(days)}
                          </span>
                          {issue.reportedBy && (
                            <>
                              <span className="text-muted-soft">·</span>
                              <span>{issue.reportedBy}</span>
                            </>
                          )}
                        </div>
                        {issue.description && (
                          <p className="text-xs text-muted dark:text-[#a1a1aa] mt-1 line-clamp-2">
                            {issue.description}
                          </p>
                        )}
                        {issue.status === 'resolved' && (issue.cost || issue.contractor) && (
                          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-soft">
                            {issue.cost != null && (
                              <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                                التكلفة: <span className="font-semibold text-body">{Number(issue.cost)} ر.س</span>
                              </span>
                            )}
                            {issue.contractor && (
                              <>
                                <span>·</span>
                                <span>المُنفِّذ: <span className="font-semibold text-body">{issue.contractor}</span></span>
                              </>
                            )}
                            {issue.resolvedAt && (
                              <>
                                <span>·</span>
                                <span>أُنجز {dateFormat(issue.resolvedAt)}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditIssue(issue)}
                          className="icon-action hover:text-accent"
                          title="تعديل"
                        >
                          <Pencil size={16} />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setConfirmDelete(issue.id)}
                            className="icon-action hover:text-accent"
                            title="حذف"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {showAdd && <MaintenanceIssueForm onClose={() => setShowAdd(false)} />}
      {editIssue && (
        <MaintenanceIssueForm
          onClose={() => setEditIssue(null)}
          initialData={editIssue}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir="rtl">
          <div className="absolute inset-0" onClick={() => setConfirmDelete(null)}></div>
          <div className="relative z-10 bg-canvas dark:bg-surface-dark rounded-xl shadow-soft w-full max-w-sm border border-hairline dark:border-[#2e2e2e] overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-surface-card dark:bg-surface-dark-elevated mb-4">
                <AlertTriangle className="h-7 w-7 text-ink dark:text-white" />
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-ink dark:text-white mb-1.5">
                حذف هذا البلاغ؟
              </h3>
              <p className="text-sm text-muted dark:text-[#a1a1aa]">
                سيتم فقدان سجل البلاغ نهائياً. يفضّل تحديث حالته إلى «منجَز» بدلاً من الحذف.
              </p>
            </div>
            <div className="p-4 border-t border-hairline-soft dark:border-[#242424] flex gap-3">
              <button
                onClick={() => { deleteMaintenanceIssue(confirmDelete); setConfirmDelete(null); }}
                className="btn-primary flex-1"
              >
                تأكيد الحذف
              </button>
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
