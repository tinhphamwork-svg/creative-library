export default function BrandCard({ brand, creatives = [], onClick }) {
  const winningCount = creatives.filter(c => c.status === 'Winning').length;
  const totalSpend = creatives.reduce((sum, c) => sum + (Number(c.spend) || 0), 0);
  const roasValues = creatives.map(c => Number(c.roas)).filter(r => r > 0);
  const avgRoas = roasValues.length > 0
    ? (roasValues.reduce((a, b) => a + b, 0) / roasValues.length).toFixed(1)
    : null;

  return (
    <button
      onClick={onClick}
      className="text-left bg-slate-900 border border-slate-700 rounded-xl p-5 hover:border-violet-500 hover:bg-slate-800/60 transition-all duration-150 group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          {brand[0].toUpperCase()}
        </div>
        <h3 className="text-slate-100 font-semibold text-sm group-hover:text-violet-300 transition-colors truncate">{brand}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Spend</p>
          <p className="text-sm font-semibold text-slate-200">
            {totalSpend > 0 ? `$${totalSpend.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Avg ROAS</p>
          <p className={`text-sm font-semibold ${avgRoas ? 'text-emerald-400' : 'text-slate-600'}`}>
            {avgRoas ? `${avgRoas}x` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Winning</p>
          <p className="text-sm font-semibold text-slate-200">
            {creatives.length > 0 ? `${winningCount} winning` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Total</p>
          <p className="text-sm font-semibold text-slate-200">
            {creatives.length > 0 ? `${creatives.length} creatives` : '—'}
          </p>
        </div>
      </div>
    </button>
  );
}
