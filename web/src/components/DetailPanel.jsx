import { useState, useEffect } from 'react';
import CreativeModal from './CreativeModal';

function MetricBox({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
      <div className={`text-base font-bold ${highlight ? 'text-green-700' : 'text-gray-700'}`}>
        {value || <span className="text-gray-300">—</span>}
      </div>
      <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}

export default function DetailPanel({ creative, dropdowns, codes, brandCode,
  onClose, onSave, onDelete, onAction, onAddCode }) {

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionSent, setActionSent] = useState(null);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState({});

  useEffect(() => {
    setDraft({
      status:       creative.status       || '',
      brief_status: creative.brief_status || '',
      assignee:     creative.assignee     || '',
      launch_date:  creative.launch_date  || '',
      notes:        creative.notes        || '',
    });
    setConfirmDelete(false);
  }, [creative.id]);

  function handleFieldChange(field, value) {
    setDraft(d => ({ ...d, [field]: value }));
  }

  function handleFieldBlur(field) {
    if (draft[field] !== (creative[field] || '')) {
      onSave({ ...creative, [field]: draft[field] });
    }
  }

  function handleSelectChange(field, value) {
    setDraft(d => ({ ...d, [field]: value }));
    onSave({ ...creative, [field]: value });
  }

  function copyAdName() {
    navigator.clipboard.writeText(creative.ad_name_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAction(action) {
    setActionSent(action);
    await onAction(creative.id, action);
    setTimeout(() => setActionSent(null), 2000);
  }

  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const inputClass = "w-full bg-white border border-gray-200 text-gray-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-violet-400 transition-colors";
  const labelClass = "text-[11px] font-semibold text-gray-400 uppercase tracking-wide block mb-1";

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-30" onClick={onClose} />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-screen w-[280px] bg-white border-l border-gray-100
        shadow-[-8px_0_32px_rgba(0,0,0,0.06)] flex flex-col z-40 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
          {creative.ad_name_code ? (
            <button onClick={copyAdName}
              className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5 flex-1 min-w-0 hover:bg-gray-100 transition-colors group"
              title="Click to copy">
              <span className="font-mono text-violet-600 text-xs font-bold truncate">{creative.ad_name_code}</span>
              <span className="text-gray-300 group-hover:text-gray-500 text-xs flex-shrink-0">{copied ? '✓' : '⎘'}</span>
            </button>
          ) : (
            <h3 className="font-semibold text-gray-800 text-sm flex-1 truncate">{creative.hook}</h3>
          )}
          <button onClick={onClose}
            className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-400
              hover:bg-gray-200 hover:text-gray-600 transition-colors text-sm flex-shrink-0">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Thumbnail */}
          {creative.preview_url ? (
            <div className="aspect-video w-full overflow-hidden">
              <img src={creative.preview_url} alt={creative.hook} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="aspect-video w-full flex items-center justify-center text-sm font-semibold text-gray-300 bg-gray-50 border-b border-gray-100">
              {creative.format || 'No preview'}
            </div>
          )}

          <div className="p-4 flex flex-col gap-4">
            {/* Hook + tags */}
            <div>
              <h3 className="font-bold text-gray-800 text-sm leading-snug mb-2">{creative.hook}</h3>
              <div className="flex flex-wrap gap-1.5">
                {creative.format && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{creative.format}</span>
                )}
                {creative.concept && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{creative.concept}</span>
                )}
                {creative.angle && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{creative.angle}</span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <MetricBox label="ROAS"  value={creative.roas  ? `${Number(creative.roas).toFixed(1)}x` : null} highlight={!!creative.roas} />
              <MetricBox label="CTR"   value={creative.ctr   ? `${creative.ctr}%` : null} />
              <MetricBox label="Spend" value={creative.spend ? `$${Number(creative.spend).toLocaleString()}` : null} />
              <MetricBox label="CPM"   value={creative.cpm   ? `$${creative.cpm}` : null} />
            </div>
            {creative.last_synced && (
              <p className="text-[11px] text-gray-300 -mt-2">
                Synced {new Date(creative.last_synced).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}

            {/* Inline editable fields */}
            <div className="flex flex-col gap-3">
              <div>
                <label className={labelClass}>Status</label>
                <select value={draft.status} onChange={e => handleSelectChange('status', e.target.value)} className={inputClass}>
                  {draft.status && !(dropdowns.status || []).includes(draft.status) && (
                    <option value={draft.status}>{draft.status}</option>
                  )}
                  {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Brief Status</label>
                <select value={draft.brief_status} onChange={e => handleSelectChange('brief_status', e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {draft.brief_status && draft.brief_status !== '' && !(dropdowns.briefStatus || []).includes(draft.brief_status) && (
                    <option value={draft.brief_status}>{draft.brief_status}</option>
                  )}
                  {(dropdowns.briefStatus || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Assignee</label>
                <input type="text" value={draft.assignee}
                  onChange={e => handleFieldChange('assignee', e.target.value)}
                  onBlur={() => handleFieldBlur('assignee')}
                  className={inputClass} placeholder="—" />
              </div>

              <div>
                <label className={labelClass}>Launch Date</label>
                <input type="text" value={draft.launch_date}
                  onChange={e => handleFieldChange('launch_date', e.target.value)}
                  onBlur={() => handleFieldBlur('launch_date')}
                  className={inputClass} placeholder="—" />
              </div>

              <div>
                <label className={labelClass}>Notes</label>
                <textarea value={draft.notes}
                  onChange={e => handleFieldChange('notes', e.target.value)}
                  onBlur={() => handleFieldBlur('notes')}
                  rows={3} className={`${inputClass} resize-none`} placeholder="—" />
              </div>
            </div>

            {/* Quick Actions */}
            {onAction && (
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick Action</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Scale', 'Pause', 'Kill'].map(act => (
                    <button key={act} onClick={() => handleAction(act)}
                      disabled={actionSent === act}
                      className={`text-xs font-semibold py-1.5 rounded-lg transition-colors border
                        ${act === 'Scale' ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' :
                          act === 'Kill'  ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' :
                          'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}
                        ${actionSent === act ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {actionSent === act ? '✓' : act}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-300 mt-1.5">→ Thêm vào Actions Queue để execute trên Ads Manager</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          <button onClick={() => setEditOpen(true)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold border border-violet-300
              text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
            ✎ Edit Full
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200
                text-gray-500 bg-white hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">
              Delete
            </button>
          ) : (
            <button onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
              Confirm?
            </button>
          )}
        </div>
      </aside>

      {editOpen && (
        <CreativeModal
          creative={creative}
          dropdowns={dropdowns}
          codes={codes}
          brandCode={brandCode}
          onClose={() => setEditOpen(false)}
          onSave={async (row) => { await onSave(row); setEditOpen(false); }}
          onAddCode={onAddCode}
        />
      )}
    </>
  );
}
