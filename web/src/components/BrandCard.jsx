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
      className="text-left bg-white border border-gray-100 rounded-xl p-5
        shadow-[0_1px_3px_rgba(0,0,0,0.05)]
        hover:border-violet-200 hover:shadow-[0_4px_16px_rgba(109,40,217,0.08)]
        transition-all duration-150 group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-700 to-indigo-600
          flex items-center justify-center text-white font-bold text-base flex-shrink-0
          shadow-sm shadow-violet-200">
          {brand[0].toUpperCase()}
        </div>
        <h3 className="text-gray-800 font-semibold text-sm group-hover:text-violet-700 transition-colors truncate">{brand}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Spend</p>
          <p className="text-sm font-semibold text-gray-700">
            {totalSpend > 0 ? `$${totalSpend.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Avg ROAS</p>
          <p className={`text-sm font-semibold ${avgRoas ? 'text-emerald-600' : 'text-gray-300'}`}>
            {avgRoas ? `${avgRoas}x` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Winning</p>
          <p className="text-sm font-semibold text-gray-700">
            {creatives.length > 0 ? `${winningCount} winning` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-gray-400 mb-0.5">Total</p>
          <p className="text-sm font-semibold text-gray-700">
            {creatives.length > 0 ? `${creatives.length} creatives` : '—'}
          </p>
        </div>
      </div>
    </button>
  );
}
