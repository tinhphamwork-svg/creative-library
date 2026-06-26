// web/src/components/Rail.jsx
import { useRef, useState } from 'react';

function BrandAvatar({ brand, isActive, onSelect, onUploadLogo }) {
  const fileRef = useRef(null);
  const initials = brand.name.slice(0, 2).toUpperCase();

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('File phải nhỏ hơn 2MB'); return; }
    onUploadLogo(brand.name, file);
    e.target.value = '';
  }

  return (
    <div className="relative group flex-shrink-0">
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-violet-700 rounded-r" />
      )}
      <button
        title={brand.name}
        onClick={() => onSelect(brand.name)}
        className={`w-9 h-9 rounded-[10px] flex items-center justify-center text-xs font-bold overflow-hidden transition-all duration-150
          ${isActive ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-400 hover:bg-violet-50 hover:text-violet-600'}`}
      >
        {brand.logoUrl
          ? <img src={brand.logoUrl} alt={brand.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; }} />
          : initials}
      </button>

      {/* Hover overlay upload */}
      <button
        title="Upload logo"
        onClick={() => fileRef.current?.click()}
        className="absolute inset-0 rounded-[10px] bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
      >
        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp"
        className="hidden" onChange={handleFileChange} />
    </div>
  );
}

export default function Rail({ brands, selectedBrand, onSelectBrand, onAddBrand, onUploadLogo, userEmail, onLogout }) {
  const initials = userEmail ? userEmail[0].toUpperCase() : '?';

  return (
    <aside className="w-14 flex-shrink-0 flex flex-col items-center py-3 gap-1
      bg-white border-r border-gray-100">

      {/* App logo */}
      <div className="w-8 h-8 rounded-[9px] bg-gradient-to-br from-violet-700 to-indigo-600
        flex items-center justify-center text-white text-xs font-black mb-3 shadow-md shadow-violet-200">
        CL
      </div>

      {/* Brand list */}
      <div className="flex flex-col items-center gap-1 flex-1 w-full px-2">
        {brands.map(brand => (
          <BrandAvatar
            key={brand.name}
            brand={brand}
            isActive={selectedBrand === brand.name}
            onSelect={onSelectBrand}
            onUploadLogo={onUploadLogo}
          />
        ))}

        <div className="w-5 h-px bg-gray-100 my-1" />

        {/* Add brand */}
        <AddBrandButton onAdd={onAddBrand} />
      </div>

      {/* User avatar / logout */}
      <button
        title={`${userEmail} — Đăng xuất`}
        onClick={onLogout}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-700 to-indigo-600
          flex items-center justify-center text-white text-xs font-bold
          shadow-sm shadow-violet-200 hover:opacity-80 transition-opacity mt-1"
      >
        {initials}
      </button>
    </aside>
  );
}

function AddBrandButton({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setName('');
    setAdding(false);
  }

  if (adding) {
    return (
      <div className="flex flex-col gap-1 items-center w-full">
        <input
          ref={inputRef}
          autoFocus
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setAdding(false); }}
          className="w-full text-[10px] px-1.5 py-1 border border-violet-300 rounded-md outline-none
            focus:border-violet-500 text-center bg-white text-gray-700"
          placeholder="Tên..."
        />
        <div className="flex gap-1 w-full">
          <button onClick={submit}
            className="flex-1 text-[10px] bg-violet-700 text-white rounded py-0.5 font-semibold">✓</button>
          <button onClick={() => setAdding(false)}
            className="flex-1 text-[10px] bg-gray-100 text-gray-500 rounded py-0.5">✕</button>
        </div>
      </div>
    );
  }

  return (
    <button
      title="Thêm brand"
      onClick={() => setAdding(true)}
      className="w-9 h-9 rounded-[10px] border-2 border-dashed border-gray-200
        flex items-center justify-center text-gray-300 text-lg
        hover:border-violet-300 hover:text-violet-400 transition-colors"
    >
      +
    </button>
  );
}
