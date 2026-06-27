// web/src/components/CreativeForm.jsx
import { useState } from 'react';
import CodeSelect from './CodeSelect';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, required }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-violet-400 transition-colors" />
  );
}

function buildAdName(codes, brandCode) {
  const { concept_code, angle_code, framework_code, format_code, version } = codes;
  if (!concept_code || !angle_code || !framework_code || !format_code) return '';
  const br = brandCode || 'BR';
  const v  = version || '1';
  return `${br}-${concept_code}-${angle_code}-${framework_code}-${format_code}-V${v}`;
}

export default function CreativeForm({ creative, dropdowns, codes = {}, brandCode,
  onSave, onCancel, onAddCode }) {

  const [form, setForm] = useState({
    id:             creative?.id || '',
    product:        creative?.product || '',
    concept:        creative?.concept || '',
    concept_code:   creative?.concept_code || '',
    angle:          creative?.angle || '',
    angle_code:     creative?.angle_code || '',
    framework:      creative?.framework || '',
    framework_code: creative?.framework_code || '',
    hook:           creative?.hook || '',
    format:         creative?.format || '',
    format_code:    creative?.format_code || '',
    version:        creative?.version || '1',
    ad_name_code:   creative?.ad_name_code || '',
    status:         creative?.status || 'Testing',
    brief_status:   creative?.brief_status || 'Not Briefed',
    assignee:       creative?.assignee || '',
    launch_date:    creative?.launch_date || '',
    spend:          creative?.spend || '',
    roas:           creative?.roas || '',
    ctr:            creative?.ctr || '',
    cpm:            creative?.cpm || '',
    preview_url:    creative?.preview_url || '',
    notes:          creative?.notes || '',
    meta_ad_id:     creative?.meta_ad_id || '',
  });

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  function set(field, value) {
    setForm(f => {
      const next = { ...f, [field]: value };
      // Sync label fields khi chọn code
      if (field === 'concept_code') {
        const found = (codes.concept || []).find(c => c.code === value);
        if (found) next.concept = found.description;
      }
      if (field === 'angle_code') {
        const found = (codes.angle || []).find(c => c.code === value);
        if (found) next.angle = found.description;
      }
      if (field === 'framework_code') {
        const found = (codes.framework || []).find(c => c.code === value);
        if (found) next.framework = found.description;
      }
      if (field === 'format') {
        const found = (codes.format || []).find(c => c.description === value);
        if (found) next.format_code = found.code;
      }
      if (field === 'format_code') {
        const found = (codes.format || []).find(c => c.code === value);
        if (found) next.format = found.description;
      }
      // Auto-generate ad_name_code
      const updated = { ...next };
      updated.ad_name_code = buildAdName(updated, brandCode);
      return updated;
    });
  }

  function copyAdName() {
    if (!form.ad_name_code) return;
    navigator.clipboard.writeText(form.ad_name_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleAddCode(type, description) {
    if (!onAddCode) return null;
    // Auto-generate next code: C01→C02, A08→A09...
    const prefix = { concept: 'C', angle: 'A', framework: 'F', format: 'FT' }[type] || 'X';
    const existing = (codes[type] || []).map(c => c.code);
    const nums = existing.map(c => parseInt(c.replace(/\D/g, '')) || 0);
    const next = (Math.max(0, ...nums) + 1).toString().padStart(2, '0');
    const newCode = prefix + next;
    await onAddCode(newCode, type, description);
    return newCode;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.hook.trim()) return;
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  }

  const adNameReady = !!form.ad_name_code;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">

      {/* Ad Name Code — hiện ở đầu nếu đã generate được */}
      {adNameReady && (
        <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3">
          <span className="font-mono text-violet-700 text-sm font-bold tracking-wider flex-1">{form.ad_name_code}</span>
          <button type="button" onClick={copyAdName}
            className="text-xs text-violet-600 hover:text-violet-800 bg-violet-100 hover:bg-violet-200 px-2.5 py-1 rounded-lg transition-colors">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      )}

      {/* Codes */}
      <div className="grid grid-cols-2 gap-3">
        <CodeSelect label="Concept" value={form.concept_code}
          onChange={v => set('concept_code', v)}
          options={codes.concept || []}
          placeholder="Chọn concept..."
          onAddNew={desc => handleAddCode('concept', desc)} />

        <CodeSelect label="Angle" value={form.angle_code}
          onChange={v => set('angle_code', v)}
          options={codes.angle || []}
          placeholder="Chọn angle..."
          onAddNew={desc => handleAddCode('angle', desc)} />

        <CodeSelect label="Framework" value={form.framework_code}
          onChange={v => set('framework_code', v)}
          options={codes.framework || []}
          placeholder="Chọn framework..."
          onAddNew={desc => handleAddCode('framework', desc)} />

        <CodeSelect label="Format" value={form.format_code}
          onChange={v => set('format_code', v)}
          options={codes.format || []}
          placeholder="Chọn format..."  />
      </div>

      {/* Version */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Version">
          <input type="number" min="1" value={form.version} onChange={e => set('version', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-violet-400 transition-colors" />
        </Field>
        <Field label="Product">
          <TextInput value={form.product} onChange={v => set('product', v)} placeholder="Tên sản phẩm" />
        </Field>
      </div>

      {/* Hook */}
      <Field label="Hook *">
        <TextInput required value={form.hook} onChange={v => set('hook', v)} placeholder="Hook text / tên asset" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Status">
          <select value={form.status} onChange={e => set('status', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-violet-400 transition-colors">
            {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Brief Status">
          <select value={form.brief_status} onChange={e => set('brief_status', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-violet-400 transition-colors">
            {(dropdowns.briefStatus || []).map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Assignee">
          <TextInput value={form.assignee} onChange={v => set('assignee', v)} />
        </Field>
        <Field label="Launch Date">
          <input type="date" value={form.launch_date} onChange={e => set('launch_date', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-violet-400 transition-colors" />
        </Field>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[['spend','Spend ($)'],['roas','ROAS'],['ctr','CTR (%)'],['cpm','CPM']].map(([field, lbl]) => (
          <Field key={field} label={lbl}>
            <input type="number" step="any" value={form[field]} onChange={e => set(field, e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-violet-400 transition-colors" />
          </Field>
        ))}
      </div>

      <Field label="Preview URL">
        <TextInput value={form.preview_url} onChange={v => set('preview_url', v)} placeholder="https://..." />
      </Field>

      <Field label="Notes">
        <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none" />
      </Field>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button type="button" onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">Hủy</button>
        <button type="submit" disabled={saving}
          className="px-4 py-2 text-sm bg-violet-700 hover:bg-violet-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
          {saving ? 'Đang lưu...' : (form.id ? 'Cập nhật' : 'Thêm creative')}
        </button>
      </div>
    </form>
  );
}
