// web/src/components/DetailPanel.jsx
import { useState, useCallback } from 'react';
import CreativeModal from './CreativeModal';

const STATUS_COLORS = {
  Winning:  'bg-emerald-100 text-emerald-700',
  Scaling:  'bg-violet-100 text-violet-700',
  Testing:  'bg-amber-100 text-amber-700',
  Fatigued: 'bg-orange-100 text-orange-700',
  Killed:   'bg-red-100 text-red-700',
};

function MetricBox({ label, value, highlight }) {
  return (
    <div className={`rounded-lg p-3 text-center ${highlight ? 'bg-emerald-50' : 'bg-slate-50'}`}>
      <div className={`text-base font-bold ${highlight ? 'text-emerald-600' : 'text-slate-800'}`}>{value || '—'}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

export default function DetailPanel({ creative, dropdowns, codes, brandCode,
  onClose, onSave, onDelete, onAction, onAddCode }) {

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionSent, setActionSent] = useState(null);
  const [copied, setCopied] = useState(false);

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

  const statusClass = STATUS_COLORS[creative.status] || 'bg-slate-100 text-slate-600';

  return (
    <>
      <aside className="w-64 bg-white border-l border-slate-200 flex flex-col flex-shrink-0 overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-sm leading-tight flex-1 pr-2">{creative.hook}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0">×</button>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-4">
          {/* Ad Name Code */}
          {creative.ad_name_code && (
            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-2">
              <span className="font-mono text-emerald-400 text-xs font-bold flex-1 truncate">
                {creative.ad_name_code}
              </span>
              <button onClick={copyAdName}
                className="text-xs text-slate-300 hover:text-white shrink-0">
                {copied ? '✓' : '⎘'}
              </button>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusClass}`}>{creative.status}</span>
            {creative.format && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{creative.format}</span>}
          </div>

          {/* Fields */}
          {[
            ['Concept',      creative.concept],
            ['Angle',        creative.angle],
            ['Product',      creative.product],
            ['Assignee',     creative.assignee],
            ['Brief Status', creative.brief_status],
            ['Launch Date',  creative.launch_date],
          ].filter(([, v]) => v).map(([label, value]) => (
            <div key={label}>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">{label}</div>
              <div className="text-sm text-slate-700">{String(value)}</div>
            </div>
          ))}

          {/* Metrics */}
          {(creative.roas || creative.ctr || creative.spend || creative.cpm) && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Performance</div>
              <div className="grid grid-cols-2 gap-2">
                <MetricBox label="ROAS" value={creative.roas ? `${Number(creative.roas).toFixed(1)}x` : null} highlight={!!creative.roas} />
                <MetricBox label="CTR"  value={creative.ctr  ? `${creative.ctr}%` : null} />
                <MetricBox label="Spend" value={creative.spend ? `$${Number(creative.spend).toLocaleString()}` : null} />
                <MetricBox label="CPM"  value={creative.cpm  ? `$${creative.cpm}` : null} />
              </div>
            </div>
          )}

          {/* Preview URL */}
          {creative.preview_url && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Preview</div>
              <a href={creative.preview_url} target="_blank" rel="noreferrer"
                className="text-xs text-blue-500 hover:underline truncate block">
                {creative.preview_url}
              </a>
            </div>
          )}

          {/* Notes */}
          {creative.notes && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</div>
              <p className="text-xs text-slate-600 leading-relaxed">{creative.notes}</p>
            </div>
          )}

          {/* Last synced */}
          {creative.last_synced && (
            <div className="text-xs text-slate-400">
              Synced {new Date(creative.last_synced).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
            </div>
          )}

          {/* Quick Actions */}
          {onAction && (
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Quick Action</div>
              <div className="grid grid-cols-3 gap-1.5">
                {['Scale', 'Pause', 'Kill'].map(act => (
                  <button key={act} onClick={() => handleAction(act)}
                    disabled={actionSent === act}
                    className={`text-xs font-semibold py-1.5 rounded-md transition-colors
                      ${act === 'Scale' ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200' :
                        act === 'Kill'  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' :
                        'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}
                      ${actionSent === act ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    {actionSent === act ? '✓' : act}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">→ Thêm vào Actions Queue để execute trên Ads Manager</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-slate-100 flex gap-2">
          <button onClick={() => setEditOpen(true)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 rounded-md transition-colors">
            Edit
          </button>
          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              className="flex-1 bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 text-xs font-semibold py-2 rounded-md transition-colors">
              Delete
            </button>
          ) : (
            <button onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold py-2 rounded-md transition-colors">
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
