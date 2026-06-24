import { useState } from 'react';

export default function Sidebar({ brands, selectedBrand, selectedProduct, selectedConcept,
  tree, onSelectBrand, onSelectProduct, onSelectConcept, onAddBrand, userEmail, onLogout,
  sidebarOpen, onToggleSidebar }) {

  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  function submitAddBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    onAddBrand(name);
    setNewBrandName('');
    setAddingBrand(false);
  }

  return (
    <aside className={`flex flex-col flex-shrink-0 bg-slate-900 border-r border-slate-700 transition-all duration-200 overflow-hidden ${sidebarOpen ? 'w-56' : 'w-14'}`}>

      {/* Toggle */}
      <div className="flex items-center h-12 px-3 border-b border-slate-700 flex-shrink-0">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {sidebarOpen && (
          <span className="ml-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase whitespace-nowrap">Library</span>
        )}
      </div>

      {/* Brand list */}
      <div className="flex-1 overflow-y-auto py-2">
        {brands.map(brand => {
          const isSelected = selectedBrand === brand;
          return (
            <div key={brand}>
              <button
                title={brand}
                onClick={() => onSelectBrand(brand)}
                className={`w-full flex items-center gap-2 px-3 py-2 transition-colors ${isSelected ? 'text-violet-300' : 'text-slate-400 hover:text-slate-100'}`}
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isSelected ? 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                  {brand[0].toUpperCase()}
                </span>
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{brand}</span>
                )}
              </button>

              {sidebarOpen && isSelected && Object.entries(tree).map(([product, concepts]) => (
                <div key={product}>
                  <button
                    onClick={() => onSelectProduct(selectedProduct === product ? null : product)}
                    className={`w-full text-left pl-12 pr-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${selectedProduct === product ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="text-[9px]">{selectedProduct === product ? '▼' : '▶'}</span>
                    <span className="truncate">{product}</span>
                  </button>

                  {selectedProduct === product && concepts.map(concept => (
                    <button
                      key={concept}
                      onClick={() => onSelectConcept(selectedConcept === concept ? null : concept)}
                      className={`w-full text-left pl-16 pr-3 py-1 text-xs transition-colors ${selectedConcept === concept ? 'bg-slate-800 text-violet-300 font-semibold' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      {concept}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Add Brand */}
      <div className="px-2 py-2 border-t border-slate-700">
        {addingBrand ? (
          <div className="flex flex-col gap-1 px-1">
            <input
              autoFocus
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAddBrand(); if (e.key === 'Escape') setAddingBrand(false); }}
              className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-600 outline-none focus:border-violet-500"
              placeholder="Tên brand..."
            />
            <div className="flex gap-1">
              <button onClick={submitAddBrand} className="flex-1 text-xs bg-violet-600 hover:bg-violet-500 text-white py-1 rounded">Thêm</button>
              <button onClick={() => setAddingBrand(false)} className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 rounded">Hủy</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingBrand(true)}
            title="Thêm brand"
            className="w-full flex items-center gap-2 px-1 py-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-lg border border-dashed border-slate-600 flex items-center justify-center text-sm">+</span>
            {sidebarOpen && <span className="text-xs">Add Brand</span>}
          </button>
        )}
      </div>

      {/* User / Logout */}
      {userEmail && (
        <div className="px-2 py-2 border-t border-slate-700 flex items-center gap-2">
          {sidebarOpen ? (
            <>
              <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userEmail[0].toUpperCase()}
              </div>
              <span className="text-xs text-slate-400 truncate flex-1">{userEmail}</span>
              <button onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"
                className="text-xs text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                ↪
              </button>
            </>
          ) : (
            <button onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"
              className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
              {userEmail[0].toUpperCase()}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
