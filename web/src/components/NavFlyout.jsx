// web/src/components/NavFlyout.jsx
import { useState } from 'react';

export default function NavFlyout({
  brand, creativeCount, liveCount,
  tree, selectedProduct, selectedConcept,
  onSelectProduct, onSelectConcept
}) {
  const [search, setSearch] = useState('');

  if (!brand) return null;

  const products = Object.keys(tree);
  const filteredProducts = search
    ? products.filter(p =>
        p.toLowerCase().includes(search.toLowerCase()) ||
        (tree[p] || []).some(c => c.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  function handleProductClick(product) {
    if (selectedProduct === product) {
      onSelectProduct(null);
      onSelectConcept(null);
    } else {
      onSelectProduct(product);
      onSelectConcept(null);
    }
  }

  function handleConceptClick(concept) {
    onSelectConcept(selectedConcept === concept ? null : concept);
  }

  return (
    <nav className="w-[210px] flex-shrink-0 flex flex-col bg-[#fafafa] border-r border-gray-100">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-gray-100">
        <div className="text-sm font-bold text-gray-900">{brand.name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {creativeCount} creatives · {liveCount} live
        </div>
      </div>

      {/* Search */}
      <div className="mx-2.5 my-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200
          rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="flex-1 text-[11px] text-gray-600 outline-none bg-transparent placeholder-gray-300"
          />
        </div>
      </div>

      {/* Product list */}
      {products.length > 0 && (
        <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide px-3.5 pb-1 pt-2">
          Products
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1">
        {filteredProducts.map(product => {
          const isProductActive = selectedProduct === product;
          const concepts = tree[product] || [];

          return (
            <div key={product}>
              <button
                onClick={() => handleProductClick(product)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-all duration-120
                  ${isProductActive
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isProductActive ? 'bg-violet-600' : 'bg-gray-300'}`} />
                <span className="truncate">{product}</span>
              </button>

              {/* Concepts — chỉ hiện khi product active */}
              {isProductActive && concepts.map(concept => {
                const isConceptActive = selectedConcept === concept;
                return (
                  <button
                    key={concept}
                    onClick={() => handleConceptClick(concept)}
                    className={`w-full flex items-center gap-2 pl-[30px] pr-2.5 py-1 rounded-md text-left text-[11px] transition-all duration-120
                      ${isConceptActive
                        ? 'bg-violet-50 text-violet-600 font-medium'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isConceptActive ? 'bg-violet-500' : 'bg-gray-300'}`} />
                    <span className="truncate">{concept}</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {filteredProducts.length === 0 && search && (
          <p className="text-[11px] text-gray-300 text-center py-4">Không tìm thấy</p>
        )}
      </div>
    </nav>
  );
}
