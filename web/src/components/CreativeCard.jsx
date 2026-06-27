const STATUS_GRADIENT = {
  Winning:  'from-emerald-100 to-emerald-200',
  Scaling:  'from-violet-100 to-violet-200',
  Testing:  'from-amber-100 to-amber-200',
  Fatigued: 'from-orange-100 to-orange-200',
  Killed:   'from-red-100 to-red-200',
};

const STATUS_BADGE = {
  Winning:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  Scaling:  'bg-violet-100 text-violet-700 border-violet-200',
  Testing:  'bg-amber-100 text-amber-700 border-amber-200',
  Fatigued: 'bg-orange-100 text-orange-700 border-orange-200',
  Killed:   'bg-red-100 text-red-700 border-red-200',
};

const FORMAT_STYLE = {
  'Video 9:16': 'bg-blue-50 text-blue-600',
  'Static 1:1': 'bg-pink-50 text-pink-600',
  'Static 4:5': 'bg-fuchsia-50 text-fuchsia-600',
  'Carousel':   'bg-green-50 text-green-600',
  'Story':      'bg-orange-50 text-orange-600',
};

function formatSpend(val) {
  const n = parseFloat(val);
  if (!n) return null;
  if (n >= 1000000) return `₫${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `₫${Math.round(n / 1000)}k`;
  return `₫${n}`;
}

function formatRoas(val) {
  const n = parseFloat(val);
  return n ? n.toFixed(1) + 'x' : null;
}

function formatCtr(val) {
  const n = parseFloat(val);
  return n ? n.toFixed(2) + '%' : null;
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className="text-[11px] font-semibold text-gray-700">
        {value || <span className="text-gray-200 font-normal">—</span>}
      </span>
    </div>
  );
}

export default function CreativeCard({ creative, isSelected, onClick }) {
  const { hook, format, status, roas, spend, ctr, preview_url, assignee, last_synced, id } = creative;

  const gradientClass = STATUS_GRADIENT[status] || 'from-gray-100 to-gray-200';
  const badgeClass    = STATUS_BADGE[status]    || 'bg-gray-100 text-gray-600 border-gray-200';
  const formatClass   = FORMAT_STYLE[format]    || 'bg-gray-50 text-gray-500';
  const hasSyncData   = !!last_synced;

  return (
    <div
      onClick={() => onClick(creative)}
      className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-150
        ${isSelected
          ? 'border-2 border-violet-600 shadow-[0_0_0_3px_rgba(109,40,217,0.12),0_4px_16px_rgba(109,40,217,0.12)]'
          : 'border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-violet-200 hover:shadow-[0_4px_16px_rgba(109,40,217,0.08)] hover:-translate-y-px'}`}
    >
      {/* Thumbnail */}
      <div className={`relative h-[130px] bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden`}>
        {preview_url
          ? <img src={preview_url} alt={hook} className="w-full h-full object-cover" />
          : <span className="text-4xl opacity-20">🎨</span>}

        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}
          style={{ backdropFilter: 'blur(8px)' }}>
          {status}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 pb-3.5">
        {id && (
          <div className="font-mono text-[10px] text-gray-300 mb-1 tracking-wide">{id}</div>
        )}

        <div className="text-xs font-semibold text-gray-800 leading-snug mb-2.5 line-clamp-2">
          {hook || '(no hook)'}
        </div>

        <div className="flex flex-col gap-1 mb-2.5">
          <MetricRow label="Spend" value={hasSyncData ? formatSpend(spend) : null} />
          <MetricRow label="ROAS"  value={hasSyncData ? formatRoas(roas) : null} />
          <MetricRow label="CTR"   value={hasSyncData ? formatCtr(ctr) : null} />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          {format && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${formatClass}`}>
              {format}
            </span>
          )}
          {assignee && (
            <span className="text-[10px] text-gray-300 ml-auto">{assignee}</span>
          )}
        </div>
      </div>
    </div>
  );
}
