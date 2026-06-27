import { useState, useMemo } from 'react';
import CreativeCard from './CreativeCard';
import CreativeModal from './CreativeModal';
import MatrixView from './MatrixView';

export default function MainArea({ creatives, loading, error, viewMode, selectedBrand,
  selectedProduct, selectedConcept, selectedCreative, dropdowns, codes, brandCode,
  syncing, actions, actionsOpen,
  onViewModeChange, onSelectCreative, onSave, onSync, onActionsToggle, onMarkDone, onAddCode }) {

  const [filters, setFilters] = useState({ format: '', status: '', brief_status: '', assignee: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCreative, setEditingCreative] = useState(null);

  const filtered = creatives.filter(c => {
    if (filters.format       && c.format       !== filters.format)      return false;
    if (filters.status       && c.status       !== filters.status)      return false;
    if (filters.brief_status && c.brief_status !== filters.brief_status) return false;
    if (filters.assignee     && !c.assignee?.toLowerCase().includes(filters.assignee.toLowerCase())) return false;
    return true;
  });

  const lastSynced = useMemo(() => {
    const times = creatives.map(c => c.last_synced).filter(Boolean);
    if (!times.length) return null;
    const latest = new Date(Math.max(...times.map(t => new Date(t).getTime())));
    const diffMs = Date.now() - latest.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs} giờ trước`;
    return latest.toLocaleDateString('vi-VN');
  }, [creatives]);

  function handleNewCreative() {
    setEditingCreative(null);
    setModalOpen(true);
  }

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* TopBar */}
      <div className="flex items-center gap-2 px-4 h-[52px] bg-white border-b border-gray-100 flex-shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-gray-400">{selectedBrand}</span>
          {selectedProduct && <>
            <span className="text-gray-200">/</span>
            <span className="text-gray-400">{selectedProduct}</span>
          </>}
          {selectedConcept && <>
            <span className="text-gray-200">/</span>
            <span className="text-gray-700 font-semibold">{selectedConcept}</span>
          </>}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Filter chips */}
          <div className="flex gap-1.5">
            <select value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 bg-white
                focus:outline-none focus:border-violet-400 hover:border-violet-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <option value="">Format ▾</option>
              {(dropdowns.format || []).map(f => <option key={f}>{f}</option>)}
            </select>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 bg-white
                focus:outline-none focus:border-violet-400 hover:border-violet-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <option value="">Status ▾</option>
              {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 border border-gray-200">
            {[['gallery', 'Gallery'], ['table', 'Table'], ['matrix', 'Matrix']].map(([mode, label]) => (
              <button key={mode} onClick={() => onViewModeChange(mode)}
                className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium
                  ${viewMode === mode
                    ? 'bg-white text-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-gray-400 hover:text-gray-600'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Actions */}
          <button onClick={onActionsToggle}
            className={`relative flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors
              ${actionsOpen
                ? 'bg-amber-50 border-amber-200 text-amber-600'
                : 'border-gray-200 bg-white hover:border-gray-300 text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
            ⚡ Actions
            {actions.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {actions.length}
              </span>
            )}
          </button>

          {/* Sync Meta */}
          <button onClick={onSync} disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
              bg-violet-50 border border-violet-200 text-violet-700
              hover:bg-violet-100 disabled:opacity-40 transition-colors"
            title={lastSynced ? `Last synced: ${lastSynced}` : 'Chưa sync'}>
            <span className={syncing ? 'animate-spin inline-block' : ''}>⟳</span>
            {syncing ? 'Syncing…' : 'Sync Meta'}
          </button>

          <span className="text-xs text-gray-400 font-medium">{filtered.length}</span>

          {/* New */}
          <button onClick={handleNewCreative}
            className="bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold
              px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-violet-200">
            + New
          </button>
        </div>
      </div>

      {/* Actions Queue Panel */}
      {actionsOpen && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-600">⚡ Pending Actions ({actions.length})</span>
            <button onClick={onActionsToggle} className="text-amber-400 hover:text-amber-600 text-xs">✕</button>
          </div>
          {actions.length === 0 ? (
            <p className="text-xs text-amber-400">Không có action nào đang chờ.</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {actions.map(a => (
                <div key={a.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs shadow-sm">
                  <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px]
                    ${a.action === 'Scale' ? 'bg-green-100 text-green-700' :
                      a.action === 'Kill'  ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'}`}>
                    {a.action}
                  </span>
                  <span className="text-gray-500 font-mono">{a.creative_id}</span>
                  <span className="text-gray-400 flex-1">{a.brand}</span>
                  {a.notes && <span className="text-gray-400 truncate max-w-[120px]">{a.notes}</span>}
                  <span className="text-gray-300">{a.created_at ? new Date(a.created_at).toLocaleDateString('vi-VN') : ''}</span>
                  <button onClick={() => onMarkDone(a.id)}
                    className="ml-auto text-xs text-green-600 hover:text-green-700 font-semibold whitespace-nowrap">
                    ✓ Done
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#f7f7fa]">
        {loading && <div className="text-gray-400 text-sm">Đang tải...</div>}
        {error && <div className="text-red-500 text-sm">Lỗi: {error}</div>}

        {!loading && !error && viewMode === 'gallery' && (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(c => (
              <CreativeCard
                key={c.id}
                creative={c}
                isSelected={selectedCreative?.id === c.id}
                onClick={onSelectCreative}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-gray-400 text-sm py-16">
                Chưa có creative nào.{' '}
                <button onClick={handleNewCreative} className="text-violet-600 hover:text-violet-700">Thêm mới?</button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && viewMode === 'matrix' && (
          <MatrixView creatives={filtered} onSelectCreative={onSelectCreative} />
        )}

        {!loading && !error && viewMode === 'table' && (
          <table className="w-full text-xs bg-white rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-gray-100">
            <thead>
              <tr className="text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left py-2.5 px-3 font-semibold">Hook</th>
                <th className="text-left py-2.5 px-3 font-semibold">Concept</th>
                <th className="text-left py-2.5 px-3 font-semibold">Format</th>
                <th className="text-left py-2.5 px-3 font-semibold">Status</th>
                <th className="text-left py-2.5 px-3 font-semibold">ROAS</th>
                <th className="text-left py-2.5 px-3 font-semibold">CTR</th>
                <th className="text-left py-2.5 px-3 font-semibold">Spend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}
                  onClick={() => onSelectCreative(c)}
                  className={`border-b border-gray-50 cursor-pointer transition-colors
                    ${selectedCreative?.id === c.id ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                  <td className="py-2 px-3 font-medium text-gray-700">{c.hook}</td>
                  <td className="py-2 px-3 text-violet-600">{c.concept}</td>
                  <td className="py-2 px-3 text-gray-400">{c.format}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[11px]">{c.status}</span>
                  </td>
                  <td className="py-2 px-3 font-bold text-emerald-600">{c.roas ? `${Number(c.roas).toFixed(1)}x` : '—'}</td>
                  <td className="py-2 px-3 text-gray-400">{c.ctr ? `${c.ctr}%` : '—'}</td>
                  <td className="py-2 px-3 text-gray-400">{c.spend ? `$${Number(c.spend).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <CreativeModal
          creative={editingCreative}
          dropdowns={dropdowns}
          codes={codes}
          brandCode={brandCode}
          onClose={() => setModalOpen(false)}
          onSave={async (row) => { await onSave(row); setModalOpen(false); }}
          onAddCode={onAddCode}
        />
      )}
    </main>
  );
}
