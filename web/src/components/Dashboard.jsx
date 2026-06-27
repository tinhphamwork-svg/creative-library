import BrandCard from './BrandCard';

export default function Dashboard({ brands, cache, actions, onSelectBrand, onActionsToggle }) {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {actions.length > 0 && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
          <span className="text-xs font-medium text-amber-400">
            ⚡ {actions.length} pending action{actions.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onActionsToggle}
            className="text-xs text-amber-500 hover:text-amber-300 transition-colors"
          >
            View all →
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100">Creative Library</h1>
            <p className="text-sm text-slate-400 mt-1">Select a brand to get started</p>
          </div>

          {brands.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <p className="text-4xl mb-4">🎨</p>
              <p className="font-medium text-slate-300 mb-2">No brands yet</p>
              <p className="text-sm">Add a brand using the sidebar to get started.</p>
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
