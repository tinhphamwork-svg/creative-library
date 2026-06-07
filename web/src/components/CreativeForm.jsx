// web/src/components/CreativeForm.jsx
import { useState } from 'react';

function AutocompleteInput({ label, value, onChange, suggestions, placeholder }) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()) && s !== value);

  return (
    <div className="relative">
      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</label>
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-36 overflow-y-auto">
          {filtered.map(s => (
            <li key={s} onMouseDown={() => { onChange(s); setOpen(false); }}
              className="px-3 py-1.5 text-sm hover:bg-blue-50 cursor-pointer">{s}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function CreativeForm({ creative, dropdowns, existingProducts,
  existingConcepts, existingAngles, onSave, onCancel }) {

  const [form, setForm] = useState({
    id:           creative?.id || '',
    product:      creative?.product || '',
    concept:      creative?.concept || '',
    angle:        creative?.angle || '',
    hook:         creative?.hook || '',
    format:       creative?.format || '',
    status:       creative?.status || 'Testing',
    brief_status: creative?.brief_status || 'Not Briefed',
    assignee:     creative?.assignee || '',
    launch_date:  creative?.launch_date || '',
    spend:        creative?.spend || '',
    roas:         creative?.roas || '',
    ctr:          creative?.ctr || '',
    cpm:          creative?.cpm || '',
    preview_url:  creative?.preview_url || '',
    notes:        creative?.notes || '',
  });

  const [saving, setSaving] = useState(false);

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.hook.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <AutocompleteInput label="Product" value={form.product} onChange={v => set('product', v)}
          suggestions={existingProducts} placeholder="Running Shoes" />
        <AutocompleteInput label="Concept" value={form.concept} onChange={v => set('concept', v)}
          suggestions={existingConcepts} placeholder="Pain Point" />
        <AutocompleteInput label="Angle" value={form.angle} onChange={v => set('angle', v)}
          suggestions={existingAngles} placeholder="Recovery Pain" />
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Hook *</label>
          <input required value={form.hook} onChange={e => set('hook', e.target.value)}
            placeholder="Hook text / tên asset"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Format</label>
          <select value={form.format} onChange={e => set('format', e.target.value)}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
            <option value="">— chọn —</option>
            {(dropdowns.format || []).map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
            {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Brief Status</label>
          <select value={form.brief_status} onChange={e => set('brief_status', e.target.value)}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
            {(dropdowns.briefStatus || []).map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Assignee</label>
          <input value={form.assignee} onChange={e => set('assignee', e.target.value)}
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[['spend','Spend ($)'],['roas','ROAS'],['ctr','CTR (%)'],['cpm','CPM']].map(([field, lbl]) => (
          <div key={field}>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{lbl}</label>
            <input type="number" step="any" value={form[field]} onChange={e => set(field, e.target.value)}
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Preview URL</label>
        <input value={form.preview_url} onChange={e => set('preview_url', e.target.value)}
          placeholder="https://..."
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Notes</label>
        <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-md transition-colors">
          Hủy
        </button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors disabled:opacity-50">
          {saving ? 'Đang lưu...' : (form.id ? 'Cập nhật' : 'Thêm creative')}
        </button>
      </div>
    </form>
  );
}
