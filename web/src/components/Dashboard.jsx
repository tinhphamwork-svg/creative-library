import BrandCard from './BrandCard';

export default function Dashboard({ brands, cache, actions, onSelectBrand, onActionsToggle }) {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f7f7fa]">
      {actions.length > 0 && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex-shrink-0">
          <span className="text-xs font-medium text-amber-600">
            ⚡ {actions.length} pending action{actions.length !== 1 ? 's' : ''}
          </span>
          <button onClick={onActionsToggle} className="text-xs text-amber-500 hover:text-amber-700 transition-colors">
            View all →
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-800">Creative Library</h1>
            <p className="text-sm text-gray-400 mt-1">Select a brand to get started</p>
          </div>

          {brands.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <p className="text-4xl mb-4">🎨</p>
              <p className="font-medium text-gray-500 mb-2">No brands yet</p>
              <p className="text-sm">Add a brand using the rail to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {brands.map(b => {
                const name = typeof b === 'string' ? b : b.name;
                return (
                  <BrandCard
                    key={name}
                    brand={name}
                    creatives={cache[name] || []}
                    onClick={() => onSelectBrand(name)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
