const STATUS_STRIP = {
  Winning:  'bg-emerald-500',
  Scaling:  'bg-violet-500',
  Testing:  'bg-amber-500',
  Fatigued: 'bg-orange-500',
  Killed:   'bg-red-500',
};

const FORMAT_LABEL = {
  'Video 9:16': 'bg-blue-900/60 text-blue-300',
  'Static 1:1': 'bg-pink-900/60 text-pink-300',
  'Static 4:5': 'bg-fuchsia-900/60 text-fuchsia-300',
  'Carousel':   'bg-emerald-900/60 text-emerald-300',
  'Story':      'bg-orange-900/60 text-orange-300',
};

export default function CreativeCard({ creative, isSelected, onClick }) {
  const { hook, concept, angle, format, status, roas, preview_url } = creative;
  const stripClass = STATUS_STRIP[status] || 'bg-slate-700';
  const fmtClass   = FORMAT_LABEL[format]  || 'bg-slate-800 text-slate-400';

  return (
    <div
      onClick={() => onClick(creative)}
      className={`relative bg-slate-900 rounded-lg overflow-hidden cursor-pointer transition-all duration-150
        ${isSelected
          ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-slate-950 shadow-lg shadow-violet-900/20'
          : 'border border-slate-700 hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/40'}`}
    >
      {/* Status strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${stripClass}`} />

      {/* Thumbnail */}
      <div className={`ml-1 h-24 flex items-center justify-center text-xs font-semibold ${fmtClass}`}>
        {preview_url
          ? <img src={preview_url} alt={hook} className="h-full w-full object-cover" />
          : <span className="px-2 text-center">{format}</span>}
      </div>

      {/* Body */}
      <div className="p-3">
        <div className="text-xs font-semibold text-slate-100 truncate mb-0.5">{hook || '(no hook)'}</div>
        <div className="text-xs text-slate-500 truncate mb-2">
          <span>{concept}</span>
          {angle ? <span> · {angle}</span> : null}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">{status}</span>
          {roas ? (
            <span className="text-xs font-bold text-emerald-400">{Number(roas).toFixed(1)}x</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
