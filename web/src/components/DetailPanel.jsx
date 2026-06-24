import { useState, useEffect } from 'react';
import CreativeModal from './CreativeModal';

function MetricBox({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-emerald-900/30' : 'bg-slate-800'}`}>
      <div className={`text-base font-bold ${highlight ? 'text-emerald-400' : 'text-slate-200'}`}>
        {value || <span className="text-slate-600">—</span>}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
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

  // Sync draft when creative changes
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

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-30"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-screen w-96 bg-slate-900 border-l border-slate-700 flex flex-col z-40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 flex-shrink-0">
          {creative.ad_name_code ? (
            <button onClick={copyAdName}
              className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 flex-1 min-w-0 hover:bg-slate-700 transition-colors group"
              title="Click to copy">
              <span className="font-mono text-emerald-400 text-xs font-bold truncate">{creative.ad_name_code}</span>
              <span className="text-slate-500 group-hover:text-slate-300 text-xs flex-shrink-0">{copied ? '✓' : '⎘'}</span>
            </button>
          ) : (
            <h3 className="font-semibold text-slate-100 text-sm flex-1 truncate">{creative.hook}</h3>
          )}
          <button onClick={onClose}
            className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0 text-xl leading-none">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Thumbnail */}
          {creative.preview_url ? (
            <div className="aspect-video w-full overflow-hidden">
              <img src={creative.preview_url} alt={creative.hook} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className={`aspect-video w-full flex items-center justify-center text-sm font-semibold text-slate-500 bg-slate-800 border-b border-slate-700`}>
              {creative.format || 'No preview'}
            </div>
          )}

          <div className="p-4 flex flex-col gap-4">
            {/* Hook + tags */}
            <div>
              <h3 className="font-bold text-slate-100 text-sm leading-snug mb-2">{creative.hook}</h3>
              <div className="flex flex-wrap gap-1.5">
                {creative.format && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{creative.format}</span>
                )}
                {creative.concept && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-900/50 text-violet-300">{creative.concept}</span>
                )}
                {creative.angle && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">{creative.angle}</span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <MetricBox label="ROAS"  value={creative.roas  ? `${Number(creative.roas).toFixed(1)}x` : null} highlight={!!creative.roas} />
              <MetricBox label="CTR"   value={creative.ctr   ? `${creative.ctr}%`                    : null} />
              <MetricBox label="Spend" value={creative.spend ? `$${Number(creative.spend).toLocaleString()}` : null} />
              <MetricBox label="CPM"   value={creative.cpm   ? `$${creative.cpm}`                    : null} />
            </div>
            {creative.last_synced && (
              <p className="text-[11px] text-slate-600 -mt-2">
                Synced {new Date(creative.last_synced).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            )}

            {/* Inline editable fields */}
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Status</label>
                <select
                  value={draft.status}
                  onChange={e => handleSelectChange('status', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
                >
                  {draft.status && !(dropdowns.status || []).includes(draft.status) && (
                    <option value={draft.status}>{draft.status}</option>
                  )}
                  {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Brief Status</label>
                <select
                  value={draft.brief_status}
                  onChange={e => handleSelectChange('brief_status', e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
                >
                  <option value="">—</option>
                  {draft.brief_status && draft.brief_status !== '' && !(dropdowns.briefStatus || []).includes(draft.brief_status) && (
                    <option value={draft.brief_status}>{draft.brief_status}</option>
                  )}
                  {(dropdowns.briefStatus || []).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Assignee</label>
                <input
                  type="text"
                  value={draft.assignee}
                  onChange={e => handleFieldChange('assignee', e.target.value)}
                  onBlur={() => handleFieldBlur('assignee')}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
                  placeholder="—"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Launch Date</label>
                <input
                  type="text"
                  value={draft.launch_date}
                  onChange={e => handleFieldChange('launch_date', e.target.value)}
                  onBlur={() => handleFieldBlur('launch_date')}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-violet-500"
                  placeholder="—"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes</label>
                <textarea
                  value={draft.notes}
                  onChange={e => handleFieldChange('notes', e.target.value)}
                  onBlur={() => handleFieldBlur('notes')}
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-md px-3 py-2 focus:outline-none focus:border-violet-500 resize-none"
                  placeholder="—"
                />
              </div>
            </div>

            {/* Quick Actions */}
            {onAction && (
              <div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-2">Quick Action</div>
                <div className="grid grid-cols-3 gap-1.5">
                  {['Scale', 'Pause', 'Kill'].map(act => (
                    <button key={act} onClick={() => handleAction(act)}
                      disabled={actionSent === act}
                      className={`text-xs font-semibold py-1.5 rounded-md transition-colors
                        ${act === 'Scale' ? 'bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900 border border-emerald-700' :
                          act === 'Kill'  ? 'bg-red-900/50 text-red-400 hover:bg-red-900 border border-red-700' :
                          'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-600'}
                        ${actionSent === act ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {actionSent === act ? '✓' : act}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-600 mt-1.5">→ Thêm vào Actions Queue để execute trên Ads Manager</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex gap-2 flex-shrink-0">
          <button onClick={() => setEditOpen(true)}
            className="flex-1 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold py-2 rounded-md transition-colors">
            ✎ Edit Full
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex-1 bg-slate-800 hover:bg-red-900/50 hover:text-red-400 text-slate-400 text-xs font-semibold py-2 rounded-md border border-slate-700 transition-colors">
              Delete
            </button>
          ) : (
            <button onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold py-2 rounded-md transition-colors">
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
