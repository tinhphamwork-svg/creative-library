// web/src/App.jsx
import { useState, useEffect } from 'react';
import { getBrands, getDropdowns, addBrand } from './api';
import { useCreatives } from './hooks/useCreatives';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import DetailPanel from './components/DetailPanel';

export default function App() {
  const [brands, setBrands] = useState([]);
  const [dropdowns, setDropdowns] = useState({ format: [], status: [], briefStatus: [] });
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [selectedCreative, setSelectedCreative] = useState(null);
  const [viewMode, setViewMode] = useState('gallery');
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  const { loading, error, load, save, remove, getFiltered, getTree } = useCreatives();

  // Load brands + dropdowns on mount
  useEffect(() => {
    Promise.all([getBrands(), getDropdowns()])
      .then(([b, d]) => { setBrands(b); setDropdowns(d); })
      .catch(err => showToast('error', err.message));
  }, []);

  // Load creatives khi đổi brand
  useEffect(() => {
    if (selectedBrand) load(selectedBrand);
  }, [selectedBrand, load]);

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSave(row) {
    try {
      await save(selectedBrand, row);
      showToast('success', row.id ? 'Đã cập nhật creative' : 'Đã thêm creative mới');
      setSelectedCreative(null);
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await remove(selectedBrand, id);
      showToast('success', 'Đã xóa creative');
      setSelectedCreative(null);
    } catch (err) {
      showToast('error', err.message);
    }
  }

  async function handleAddBrand(name) {
    try {
      await addBrand(name);
      setBrands(prev => [...prev, name]);
      showToast('success', `Đã thêm brand: ${name}`);
    } catch (err) {
      showToast('error', err.message);
    }
  }

  const tree = selectedBrand ? getTree(selectedBrand) : {};
  const creatives = getFiltered(selectedBrand, selectedProduct, selectedConcept);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-sm text-slate-800">
      <Sidebar
        brands={brands}
        selectedBrand={selectedBrand}
        selectedProduct={selectedProduct}
        selectedConcept={selectedConcept}
        tree={tree}
        onSelectBrand={(b) => { setSelectedBrand(b); setSelectedProduct(null); setSelectedConcept(null); setSelectedCreative(null); }}
        onSelectProduct={(p) => { setSelectedProduct(p); setSelectedConcept(null); setSelectedCreative(null); }}
        onSelectConcept={(c) => { setSelectedConcept(c); setSelectedCreative(null); }}
        onAddBrand={handleAddBrand}
      />

      <MainArea
        creatives={creatives}
        loading={loading}
        error={error}
        viewMode={viewMode}
        selectedBrand={selectedBrand}
        selectedProduct={selectedProduct}
        selectedConcept={selectedConcept}
        selectedCreative={selectedCreative}
        dropdowns={dropdowns}
        onViewModeChange={setViewMode}
        onSelectCreative={setSelectedCreative}
        onSave={handleSave}
      />

      {selectedCreative && (
        <DetailPanel
          creative={selectedCreative}
          onClose={() => setSelectedCreative(null)}
          onDelete={() => handleDelete(selectedCreative.id)}
          onSave={handleSave}
          dropdowns={dropdowns}
          existingProducts={Object.keys(tree)}
          existingConcepts={selectedProduct ? (tree[selectedProduct] || []) : []}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg text-white text-sm font-medium z-50 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-500'
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
