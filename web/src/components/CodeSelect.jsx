import { useState, useRef, useEffect } from 'react';

export default function CodeSelect({ label, value, onChange, options = [], placeholder, onAddNew }) {
  // value = code string (e.g. "C01") or empty
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const ref = useRef(null);

  const selected = options.find(o => o.code === value);

  const filtered = options.filter(o =>
    !search ||
    o.code.toLowerCase().includes(search.toLowerCase()) ||
    o.description.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
        setAddingNew(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(code) {
    onChange(code);
    setOpen(false);
    setSearch('');
  }

  async function handleAddNew() {
    if (!newDesc.trim() || !onAddNew) return;
    const newCode = await onAddNew(newDesc.trim());
    if (newCode) {
      onChange(newCode);
      setAddingNew(false);
      setNewDesc('');
      setOpen(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>

      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-left focus:outline-none focus:border-blue-400 bg-white flex items-center justify-between">
        {selected
          ? <span><span className="text-slate-400 font-mono text-xs">[{selected.code}]</span> {selected.description}</span>
          : <span className="text-slate-400">{placeholder || '— chọn —'}</span>
        }
        <span className="text-slate-300 ml-2">▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg">
          <div className="p-2 border-b border-slate-100">
            <input autoFocus
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm code hoặc tên..."
              className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-blue-400"
            />
          </div>

          <ul className="max-h-44 overflow-y-auto py-1">
            {value && (
              <li onMouseDown={() => handleSelect('')}
                className="px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50 cursor-pointer">
                — Xóa chọn
              </li>
            )}
            {filtered.map(o => (
              <li key={o.code} onMouseDown={() => handleSelect(o.code)}
                className={`px-3 py-1.5 text-sm cursor-pointer flex items-center gap-2
                  ${o.code === value ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'}`}>
                <span className="text-xs font-mono text-slate-400 w-10 shrink-0">{o.code}</span>
                <span className="truncate">{o.description}</span>
              </li>
            ))}
            {filtered.length === 0 && !addingNew && (
              <li className="px-3 py-2 text-xs text-slate-400 text-center">Không tìm thấy</li>
            )}
          </ul>

          {onAddNew && (
            <div className="border-t border-slate-100 p-2">
              {!addingNew ? (
                <button type="button" onMouseDown={() => setAddingNew(true)}
                  className="w-full text-xs text-blue-500 hover:text-blue-700 text-left px-1">
                  + Thêm mới
                </button>
              ) : (
                <div className="flex gap-1">
                  <input autoFocus value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    placeholder="Mô tả đầy đủ..."
                    onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                    className="flex-1 text-xs px-2 py-1 border border-slate-200 rounded focus:outline-none focus:border-blue-400" />
                  <button type="button" onMouseDown={handleAddNew}
                    className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">OK</button>
                  <button type="button" onMouseDown={() => { setAddingNew(false); setNewDesc(''); }}
                    className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
