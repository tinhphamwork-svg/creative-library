import { useState } from 'react';
import CreativeCard from './CreativeCard';
import CreativeModal from './CreativeModal';

export default function MainArea({ creatives, loading, error, viewMode, selectedBrand,
  selectedProduct, selectedConcept, selectedCreative, dropdowns,
  onViewModeChange, onSelectCreative, onSave }) {

  const [filters, setFilters] = useState({ format: '', status: '', brief_status: '', assignee: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCreative, setEditingCreative] = useState(null);

  // Client-side filter
  const filtered = creatives.filter(c => {
    if (filters.format     && c.format      !== filters.format)      return false;
    if (filters.status     && c.status      !== filters.status)      return false;
    if (filters.brief_status && c.brief_status !== filters.brief_status) return false;
    if (filters.assignee   && !c.assignee?.toLowerCase().includes(filters.assignee.toLowerCase())) return false;
    return true;
  });

  function handleNewCreative() {
    setEditingCreative(null);
    setModalOpen(true);
  }

  const breadcrumb = [selectedBrand, selectedProduct, selectedConcept].filter(Boolean).join(' / ') || 'Chọn brand';

  if (!selectedBrand) {
    return (
      <main className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        ← Chọn brand từ sidebar để bắt đầu
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* TopBar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <span className="font-bold text-slate-800 text-sm">{selectedConcept || selectedProduct || selectedBrand}</span>
          <span className="text-xs text-slate-400 ml-2">{breadcrumb}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-md p-0.5 gap-0.5">
            <button onClick={() => onViewModeChange('gallery')}
              className={`px-3 py-1 text-xs rounded transition-colors font-medium
                ${viewMode === 'gallery' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              ⊞ Gallery
            </button>
            <button onClick={() => onViewModeChange('table')}
              className={`px-3 py-1 text-xs rounded transition-colors font-medium
                ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              ☰ Table
            </button>
          </div>

          {/* Filters */}
          <select value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white">
            <option value="">Format</option>
            {(dropdowns.format || []).map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white">
            <option value="">Status</option>
            {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
          </select>

          <span className="text-xs text-slate-400">{filtered.length} creatives</span>

          <button onClick={handleNewCreative}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
            + New
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="text-slate-400 text-sm">Đang tải...</div>}
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
              <div className="col-span-full text-center text-slate-400 text-sm py-16">
                Chưa có creative nào.{' '}
                <button onClick={handleNewCreative} className="text-blue-500 hover:underline">Thêm mới?</button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && viewMode === 'table' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 px-3 font-semibold">Hook</th>
                <th className="text-left py-2 px-3 font-semibold">Concept</th>
                <th className="text-left py-2 px-3 font-semibold">Format</th>
                <th className="text-left py-2 px-3 font-semibold">Status</th>
                <th className="text-left py-2 px-3 font-semibold">ROAS</th>
                <th className="text-left py-2 px-3 font-semibold">CTR</th>
                <th className="text-left py-2 px-3 font-semibold">Spend</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}
                  onClick={() => onSelectCreative(c)}
                  className={`border-b border-slate-100 cursor-pointer transition-colors
                    ${selectedCreative?.id === c.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <td className="py-2 px-3 font-medium text-slate-800">{c.hook}</td>
                  <td className="py-2 px-3 text-indigo-600">{c.concept}</td>
                  <td className="py-2 px-3 text-slate-500">{c.format}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.status}</span>
                  </td>
                  <td className="py-2 px-3 font-bold text-emerald-600">{c.roas ? `${Number(c.roas).toFixed(1)}x` : '—'}</td>
                  <td className="py-2 px-3 text-slate-500">{c.ctr ? `${c.ctr}%` : '—'}</td>
                  <td className="py-2 px-3 text-slate-500">{c.spend ? `$${Number(c.spend).toLocaleString()}` : '—'}</td>
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
          existingProducts={[...new Set(creatives.map(c => c.product).filter(Boolean))]}
          existingConcepts={[...new Set(creatives.map(c => c.concept).filter(Boolean))]}
          existingAngles={[...new Set(creatives.map(c => c.angle).filter(Boolean))]}
          onClose={() => setModalOpen(false)}
          onSave={async (row) => { await onSave(row); setModalOpen(false); }}
        />
      )}
    </main>
  );
}
