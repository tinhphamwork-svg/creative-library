// web/src/components/CreativeModal.jsx
import CreativeForm from './CreativeForm';

export default function CreativeModal({ creative, dropdowns, codes, brandCode,
  onClose, onSave, onAddCode }) {

  const isEdit = !!creative?.id;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">
            {isEdit ? 'Chỉnh sửa creative' : 'Thêm creative mới'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        <div className="overflow-y-auto px-6 py-4">
          <CreativeForm
            creative={creative}
            dropdowns={dropdowns}
            codes={codes}
            brandCode={brandCode}
            onSave={onSave}
            onCancel={onClose}
            onAddCode={onAddCode}
          />
        </div>
      </div>
    </div>
  );
}
