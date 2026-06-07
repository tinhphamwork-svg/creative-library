const STATUS_COLORS = {
  Winning:  'bg-emerald-100 text-emerald-700',
  Scaling:  'bg-violet-100 text-violet-700',
  Testing:  'bg-amber-100 text-amber-700',
  Fatigued: 'bg-orange-100 text-orange-700',
  Killed:   'bg-red-100 text-red-700',
};

const FORMAT_BG = {
  'Video 9:16': 'bg-blue-100 text-blue-600',
  'Static 1:1': 'bg-pink-100 text-pink-600',
  'Static 4:5': 'bg-fuchsia-100 text-fuchsia-600',
  'Carousel':   'bg-emerald-100 text-emerald-600',
  'Story':      'bg-orange-100 text-orange-600',
};

export default function CreativeCard({ creative, isSelected, onClick }) {
  const { hook, concept, angle, format, status, roas, preview_url } = creative;
  const statusClass = STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
  const fmtClass    = FORMAT_BG[format] || 'bg-slate-100 text-slate-600';

  return (
    <div
      onClick={() => onClick(creative)}
      className={`bg-white rounded-lg p-3 cursor-pointer transition-all
        ${isSelected ? 'border-2 border-indigo-400 shadow-md shadow-indigo-100' : 'border border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
    >
      {/* Thumbnail */}
      <div className={`h-20 rounded-md mb-2 flex items-center justify-center text-xs font-semibold ${fmtClass}`}>
        {preview_url
          ? <img src={preview_url} alt={hook} className="h-full w-full object-cover rounded-md" />
          : format}
      </div>

      {/* Hook */}
      <div className="text-xs font-semibold text-slate-800 truncate mb-0.5">{hook || '(no hook)'}</div>

      {/* Concept + Angle — rendered as separate spans so getByText('Pain Point') matches exactly */}
      <div className="text-xs text-slate-400 truncate mb-2">
        <span>{concept}</span>
        {angle ? <span> · {angle}</span> : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass}`}>{status}</span>
        {roas ? <span className="text-xs font-bold text-emerald-600">{Number(roas).toFixed(1)}x</span> : null}
      </div>
    </div>
  );
}
