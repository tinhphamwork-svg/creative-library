import { useState } from 'react';

export default function Sidebar({ brands, selectedBrand, selectedProduct, selectedConcept,
  tree, onSelectBrand, onSelectProduct, onSelectConcept, onAddBrand }) {

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
    <aside className="w-52 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="px-3 pt-4 pb-2 text-xs font-bold text-slate-500 tracking-widest uppercase">
        Brands
      </div>

      {brands.map(brand => (
        <div key={brand}>
          <button
            onClick={() => onSelectBrand(brand)}
            className={`w-full text-left px-3 py-2 text-sm font-semibold flex items-center gap-1 transition-colors
              ${selectedBrand === brand ? 'bg-slate-700 text-violet-300' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <span>{selectedBrand === brand ? '▼' : '▶'}</span>
            <span>{brand}</span>
          </button>

          {selectedBrand === brand && Object.entries(tree).map(([product, concepts]) => (
            <div key={product}>
              <button
                onClick={() => onSelectProduct(selectedProduct === product ? null : product)}
                className={`w-full text-left pl-6 pr-3 py-1.5 text-xs flex items-center gap-1 transition-colors
                  ${selectedProduct === product ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <span>{selectedProduct === product ? '▼' : '▶'}</span>
                <span>{product}</span>
              </button>

              {selectedProduct === product && concepts.map(concept => (
                <button
                  key={concept}
                  onClick={() => onSelectConcept(selectedConcept === concept ? null : concept)}
                  className={`w-full text-left pl-10 pr-3 py-1 text-xs transition-colors
                    ${selectedConcept === concept
                      ? 'bg-indigo-900 text-indigo-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <span aria-hidden="true">{selectedConcept === concept ? '● ' : '○ '}</span>
                  <span>{concept}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}

      {/* Add Brand */}
      <div className="mt-auto px-3 pb-4 pt-2">
        {addingBrand ? (
          <div className="flex flex-col gap-1">
            <input
              autoFocus
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAddBrand(); if (e.key === 'Escape') setAddingBrand(false); }}
              className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-600 outline-none"
              placeholder="Tên brand..."
            />
            <div className="flex gap-1">
              <button onClick={submitAddBrand} className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white py-1 rounded">Thêm</button>
              <button onClick={() => setAddingBrand(false)} className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 rounded">Hủy</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingBrand(true)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add Brand
          </button>
        )}
      </div>
    </aside>
  );
}
