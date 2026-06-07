// web/src/App.jsx
import { useState, useEffect } from 'react';
import { getBrands, getDropdowns, addBrand, setAuthToken, getAuthToken } from './api';
import { useCreatives } from './hooks/useCreatives';
import Sidebar from './components/Sidebar';
import MainArea from './components/MainArea';
import DetailPanel from './components/DetailPanel';
import LoginPage from './components/LoginPage';

export default function App() {
  const [authed, setAuthed] = useState(!!getAuthToken());
  const [authError, setAuthError] = useState(null);
  const [userEmail, setUserEmail] = useState(() => {
    try { return JSON.parse(atob(getAuthToken().split('.')[1])).email || ''; } catch { return ''; }
  });
  const [brands, setBrands] = useState([]);
  const [dropdowns, setDropdowns] = useState({ format: [], status: [], briefStatus: [] });
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [selectedCreative, setSelectedCreative] = useState(null);
  const [viewMode, setViewMode] = useState('gallery');
  const [toast, setToast] = useState(null);

  const { cache, loading, error, load, save, remove, getFiltered, getTree } = useCreatives();

  async function handleLogin(credential) {
    setAuthToken(credential);
    try {
      const payload = JSON.parse(atob(credential.split('.')[1]));
      setUserEmail(payload.email || '');
      const [b, d] = await Promise.all([getBrands(), getDropdowns()]);
      setBrands(b);
      setDropdowns(d);
      setAuthed(true);
      setAuthError(null);
    } catch (err) {
      setAuthToken('');
      setAuthError(err.message.includes('Unauthorized') || err.message.includes('Access denied')
        ? 'Tài khoản không có quyền truy cập.'
        : err.message);
    }
  }

  function handleLogout() {
    setAuthToken('');
    setAuthed(false);
    setUserEmail('');
    setBrands([]);
  }

  // Load brands + dropdowns on mount nếu đã có token trong sessionStorage
  useEffect(() => {
    if (authed && brands.length === 0) {
      Promise.all([getBrands(), getDropdowns()])
        .then(([b, d]) => { setBrands(b); setDropdowns(d); })
        .catch(err => {
          if (err.message.includes('Unauthorized') || err.message.includes('Access denied')) {
            setAuthToken('');
            setAuthed(false);
          } else {
            showToast('error', err.message);
          }
        });
    }
  }, [authed]);

  if (!authed) return <LoginPage onLogin={handleLogin} error={authError} />;

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
  const existingAngles = selectedBrand
    ? [...new Set((cache[selectedBrand] || []).map(c => c.angle).filter(Boolean))]
    : [];

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
        userEmail={userEmail}
        onLogout={handleLogout}
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
          existingAngles={existingAngles}
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
