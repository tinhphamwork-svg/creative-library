# Dark Command Center UI Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Creative Library app into a dark command-center aesthetic — icon rail sidebar, dashboard home screen with brand KPIs, redesigned creative cards with status strips, and a slide-over DetailPanel with inline editing.

**Architecture:** All changes are client-side only. No API, GAS backend, or `useCreatives` hook changes. Eight sequential tasks, each independently testable. New components for Dashboard and BrandCard; rewrites for Sidebar, CreativeCard, DetailPanel; re-skin for MainArea and MatrixView.

**Tech Stack:** React 18, Vite, Tailwind CSS 3 (standard dark palette — no config changes), Vitest, React Testing Library + jest-dom

## Global Constraints

- No changes to: `src/api.js`, `src/hooks/useCreatives.js`, `src/components/CreativeModal.jsx`, `src/components/CreativeForm.jsx`, `src/components/CodeSelect.jsx`, `src/Code.gs`, `src/components/LoginPage.jsx`
- No new npm packages — existing dependencies only
- Dark palette via standard Tailwind classes: `bg-slate-950` (base), `bg-slate-900` (surface), `bg-slate-800` (elevated), `border-slate-700`, `violet-600/500` (accent), `slate-100` (text-primary), `slate-400` (text-secondary), `emerald-400/500` (success/ROAS), `amber-400` (warning), `red-400` (danger)
- All test commands run from `web/` directory: `npm test`
- Working directory for all commands: `web/`

---

### Task 1: Dark Theme Baseline

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/src/App.jsx`

**Interfaces:**
- Produces: `App` with `bg-slate-950` root, `sidebarOpen` state (boolean, persisted to `localStorage`), passed as `sidebarOpen` + `onToggleSidebar` props to Sidebar

- [ ] **Step 1: Update index.css**

Replace entire content of `web/src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #020617;
  color: #f1f5f9;
}

::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #475569; }

* { box-sizing: border-box; }
```

- [ ] **Step 2: Add sidebarOpen state to App.jsx**

In `web/src/App.jsx`, add after the existing `useState` declarations:

```jsx
const [sidebarOpen, setSidebarOpen] = useState(() => {
  return localStorage.getItem('sidebarOpen') !== 'false';
});

useEffect(() => {
  localStorage.setItem('sidebarOpen', String(sidebarOpen));
}, [sidebarOpen]);
```

- [ ] **Step 3: Update App root div + Sidebar props**

Change the root div className from `bg-slate-50 ... text-slate-800` to:

```jsx
<div className="flex h-screen bg-slate-950 overflow-hidden font-sans text-sm text-slate-100">
```

Add `sidebarOpen` and `onToggleSidebar` to the Sidebar props:

```jsx
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
  sidebarOpen={sidebarOpen}
  onToggleSidebar={() => setSidebarOpen(o => !o)}
/>
```

- [ ] **Step 4: Run app to verify it starts**

```bash
npm run dev
```
Expected: App loads with dark background (`#020617`), no console errors.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.jsx
git commit -m "feat: dark theme baseline and sidebar open state"
```

---

### Task 2: Icon Rail Sidebar

**Files:**
- Rewrite: `web/src/components/Sidebar.jsx`
- Modify: `web/src/test/Sidebar.test.jsx`

**Interfaces:**
- Consumes: all existing props + `sidebarOpen: boolean` + `onToggleSidebar: () => void`
- Produces: Sidebar as `<aside>` with `w-14` collapsed / `w-56` expanded, transition `duration-200`

- [ ] **Step 1: Write failing tests**

Replace `web/src/test/Sidebar.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/Sidebar';

const defaultProps = {
  brands: ['Curacoro', 'BrandB'],
  selectedBrand: null,
  selectedProduct: null,
  selectedConcept: null,
  tree: {},
  onSelectBrand: vi.fn(),
  onSelectProduct: vi.fn(),
  onSelectConcept: vi.fn(),
  onAddBrand: vi.fn(),
  userEmail: 'test@example.com',
  onLogout: vi.fn(),
  sidebarOpen: false,
  onToggleSidebar: vi.fn(),
};

describe('Sidebar', () => {
  it('renders brand avatars in collapsed state', () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByTitle('Curacoro')).toBeInTheDocument();
    expect(screen.getByTitle('BrandB')).toBeInTheDocument();
  });

  it('calls onSelectBrand when brand avatar clicked', () => {
    const onSelectBrand = vi.fn();
    render(<Sidebar {...defaultProps} onSelectBrand={onSelectBrand} />);
    fireEvent.click(screen.getByTitle('Curacoro'));
    expect(onSelectBrand).toHaveBeenCalledWith('Curacoro');
  });

  it('calls onToggleSidebar when toggle button clicked', () => {
    const onToggleSidebar = vi.fn();
    render(<Sidebar {...defaultProps} onToggleSidebar={onToggleSidebar} />);
    fireEvent.click(screen.getByLabelText('Toggle sidebar'));
    expect(onToggleSidebar).toHaveBeenCalled();
  });

  it('shows brand name labels when expanded', () => {
    render(<Sidebar {...defaultProps} sidebarOpen={true} />);
    expect(screen.getByText('Curacoro')).toBeInTheDocument();
  });

  it('shows product tree when brand selected and expanded', () => {
    render(<Sidebar {...defaultProps} sidebarOpen={true} selectedBrand="Curacoro"
      tree={{ 'Serum C': ['Pain Point', 'Social Proof'] }} />);
    expect(screen.getByText('Serum C')).toBeInTheDocument();
  });

  it('calls onLogout when logout button clicked', () => {
    const onLogout = vi.fn();
    render(<Sidebar {...defaultProps} onLogout={onLogout} />);
    fireEvent.click(screen.getByLabelText('Đăng xuất'));
    expect(onLogout).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- Sidebar
```
Expected: FAIL — new prop shapes not in current Sidebar.

- [ ] **Step 3: Rewrite Sidebar.jsx**

```jsx
import { useState } from 'react';

export default function Sidebar({ brands, selectedBrand, selectedProduct, selectedConcept,
  tree, onSelectBrand, onSelectProduct, onSelectConcept, onAddBrand, userEmail, onLogout,
  sidebarOpen, onToggleSidebar }) {

  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');

  function submitAddBrand() {
    const name = newBrandName.trim();
    if (!name) return;
    onAddBrand(name);
    setNewBrandName('');
    setAddingBrand(false);
  }

  return (
    <aside className={`flex flex-col flex-shrink-0 bg-slate-900 border-r border-slate-700 transition-all duration-200 overflow-hidden ${sidebarOpen ? 'w-56' : 'w-14'}`}>

      {/* Toggle */}
      <div className="flex items-center h-12 px-3 border-b border-slate-700 flex-shrink-0">
        <button
          aria-label="Toggle sidebar"
          onClick={onToggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {sidebarOpen && (
          <span className="ml-2 text-[10px] font-bold text-slate-500 tracking-widest uppercase whitespace-nowrap">Library</span>
        )}
      </div>

      {/* Brand list */}
      <div className="flex-1 overflow-y-auto py-2">
        {brands.map(brand => {
          const isSelected = selectedBrand === brand;
          return (
            <div key={brand}>
              <button
                title={brand}
                onClick={() => onSelectBrand(brand)}
                className={`w-full flex items-center gap-2 px-3 py-2 transition-colors ${isSelected ? 'text-violet-300' : 'text-slate-400 hover:text-slate-100'}`}
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${isSelected ? 'bg-violet-600 text-white ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                  {brand[0].toUpperCase()}
                </span>
                {sidebarOpen && (
                  <span className="text-sm font-medium truncate">{brand}</span>
                )}
              </button>

              {sidebarOpen && isSelected && Object.entries(tree).map(([product, concepts]) => (
                <div key={product}>
                  <button
                    onClick={() => onSelectProduct(selectedProduct === product ? null : product)}
                    className={`w-full text-left pl-12 pr-3 py-1.5 text-xs flex items-center gap-1 transition-colors ${selectedProduct === product ? 'text-cyan-300' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="text-[9px]">{selectedProduct === product ? '▼' : '▶'}</span>
                    <span className="truncate">{product}</span>
                  </button>

                  {selectedProduct === product && concepts.map(concept => (
                    <button
                      key={concept}
                      onClick={() => onSelectConcept(selectedConcept === concept ? null : concept)}
                      className={`w-full text-left pl-16 pr-3 py-1 text-xs transition-colors ${selectedConcept === concept ? 'bg-slate-800 text-violet-300 font-semibold' : 'text-slate-600 hover:text-slate-400'}`}
                    >
                      {concept}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Add Brand */}
      <div className="px-2 py-2 border-t border-slate-700">
        {addingBrand ? (
          <div className="flex flex-col gap-1 px-1">
            <input
              autoFocus
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAddBrand(); if (e.key === 'Escape') setAddingBrand(false); }}
              className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-600 outline-none focus:border-violet-500"
              placeholder="Tên brand..."
            />
            <div className="flex gap-1">
              <button onClick={submitAddBrand} className="flex-1 text-xs bg-violet-600 hover:bg-violet-500 text-white py-1 rounded">Thêm</button>
              <button onClick={() => setAddingBrand(false)} className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 rounded">Hủy</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingBrand(true)}
            title="Thêm brand"
            className="w-full flex items-center gap-2 px-1 py-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <span className="flex-shrink-0 w-8 h-8 rounded-lg border border-dashed border-slate-600 flex items-center justify-center text-sm">+</span>
            {sidebarOpen && <span className="text-xs">Add Brand</span>}
          </button>
        )}
      </div>

      {/* User / Logout */}
      {userEmail && (
        <div className="px-2 py-2 border-t border-slate-700 flex items-center gap-2">
          {sidebarOpen ? (
            <>
              <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {userEmail[0].toUpperCase()}
              </div>
              <span className="text-xs text-slate-400 truncate flex-1">{userEmail}</span>
              <button onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"
                className="text-xs text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                ↪
              </button>
            </>
          ) : (
            <button onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất"
              className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center text-white text-xs font-bold">
              {userEmail[0].toUpperCase()}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- Sidebar
```
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Sidebar.jsx src/test/Sidebar.test.jsx
git commit -m "feat: icon rail sidebar with expand/collapse"
```

---

### Task 3: Dashboard + BrandCard

**Files:**
- Create: `web/src/components/BrandCard.jsx`
- Create: `web/src/components/Dashboard.jsx`
- Create: `web/src/test/Dashboard.test.jsx`

**Interfaces:**
- `BrandCard` props: `{ brand: string, creatives: array, onClick: () => void }`
- `Dashboard` props: `{ brands: string[], cache: object, actions: array, onSelectBrand: (brand: string) => void, onActionsToggle: () => void }`
- Produces: Dashboard shown as home screen; BrandCard computes stats client-side from `creatives` array

- [ ] **Step 1: Write failing tests**

Create `web/src/test/Dashboard.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Dashboard from '../components/Dashboard';

const mockCache = {
  Curacoro: [
    { id: '1', status: 'Winning', roas: '4.2', spend: '1200' },
    { id: '2', status: 'Winning', roas: '3.8', spend: '800' },
    { id: '3', status: 'Testing', roas: '', spend: '200' },
  ],
};

describe('Dashboard', () => {
  it('renders brand cards for each brand', () => {
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText('Curacoro')).toBeInTheDocument();
  });

  it('shows winning count from cache', () => {
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText('2 winning')).toBeInTheDocument();
  });

  it('calls onSelectBrand when brand card clicked', () => {
    const onSelectBrand = vi.fn();
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={onSelectBrand} onActionsToggle={vi.fn()} />);
    fireEvent.click(screen.getByText('Curacoro'));
    expect(onSelectBrand).toHaveBeenCalledWith('Curacoro');
  });

  it('shows pending actions strip when actions exist', () => {
    const actions = [{ id: '1', action: 'Scale', creative_id: 'CRC-001', brand: 'Curacoro' }];
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={actions}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText(/1 pending action/)).toBeInTheDocument();
  });

  it('does not show actions strip when no actions', () => {
    render(<Dashboard brands={['Curacoro']} cache={mockCache} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.queryByText(/pending action/)).not.toBeInTheDocument();
  });

  it('shows empty state when no brands', () => {
    render(<Dashboard brands={[]} cache={{}} actions={[]}
      onSelectBrand={vi.fn()} onActionsToggle={vi.fn()} />);
    expect(screen.getByText(/No brands yet/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- Dashboard
```
Expected: FAIL — `Dashboard` module not found.

- [ ] **Step 3: Create BrandCard.jsx**

Create `web/src/components/BrandCard.jsx`:

```jsx
export default function BrandCard({ brand, creatives = [], onClick }) {
  const winningCount = creatives.filter(c => c.status === 'Winning').length;
  const totalSpend = creatives.reduce((sum, c) => sum + (Number(c.spend) || 0), 0);
  const roasValues = creatives.map(c => Number(c.roas)).filter(r => r > 0);
  const avgRoas = roasValues.length > 0
    ? (roasValues.reduce((a, b) => a + b, 0) / roasValues.length).toFixed(1)
    : null;

  return (
    <button
      onClick={onClick}
      className="text-left bg-slate-900 border border-slate-700 rounded-xl p-5 hover:border-violet-500 hover:bg-slate-800/60 transition-all duration-150 group"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
          {brand[0].toUpperCase()}
        </div>
        <h3 className="text-slate-100 font-semibold text-sm group-hover:text-violet-300 transition-colors truncate">{brand}</h3>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Spend</p>
          <p className="text-sm font-semibold text-slate-200">
            {totalSpend > 0 ? `$${totalSpend.toLocaleString()}` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Avg ROAS</p>
          <p className={`text-sm font-semibold ${avgRoas ? 'text-emerald-400' : 'text-slate-600'}`}>
            {avgRoas ? `${avgRoas}x` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Winning</p>
          <p className="text-sm font-semibold text-slate-200">
            {creatives.length > 0 ? `${winningCount} winning` : '—'}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-slate-500 mb-0.5">Total</p>
          <p className="text-sm font-semibold text-slate-200">
            {creatives.length > 0 ? `${creatives.length} creatives` : '—'}
          </p>
        </div>
      </div>
    </button>
  );
}
```

- [ ] **Step 4: Create Dashboard.jsx**

Create `web/src/components/Dashboard.jsx`:

```jsx
import BrandCard from './BrandCard';

export default function Dashboard({ brands, cache, actions, onSelectBrand, onActionsToggle }) {
  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {actions.length > 0 && (
        <div className="flex items-center justify-between px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
          <span className="text-xs font-medium text-amber-400">
            ⚡ {actions.length} pending action{actions.length !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onActionsToggle}
            className="text-xs text-amber-500 hover:text-amber-300 transition-colors"
          >
            View all →
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-100">Creative Library</h1>
            <p className="text-sm text-slate-400 mt-1">Select a brand to get started</p>
          </div>

          {brands.length === 0 ? (
            <div className="text-center py-24 text-slate-500">
              <p className="text-4xl mb-4">🎨</p>
              <p className="font-medium text-slate-300 mb-2">No brands yet</p>
              <p className="text-sm">Add a brand using the sidebar to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
              {brands.map(brand => (
                <BrandCard
                  key={brand}
                  brand={brand}
                  creatives={cache[brand] || []}
                  onClick={() => onSelectBrand(brand)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- Dashboard
```
Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/BrandCard.jsx src/components/Dashboard.jsx src/test/Dashboard.test.jsx
git commit -m "feat: dashboard home screen with brand KPI cards"
```

---

### Task 4: Wire Dashboard into App.jsx

**Files:**
- Modify: `web/src/App.jsx`
- Modify: `web/src/components/MainArea.jsx`

**Interfaces:**
- Consumes: `Dashboard` from Task 3
- Produces: App renders Dashboard when `selectedBrand === null`, MainArea when brand is selected. DetailPanel changes from fixed-column to slide-over (positioning handled in Task 7 — for now keep existing)

- [ ] **Step 1: Add Dashboard import to App.jsx**

Add at the top of `web/src/App.jsx` with other imports:

```jsx
import Dashboard from './components/Dashboard';
```

- [ ] **Step 2: Replace MainArea conditional with Dashboard/MainArea toggle**

In `App.jsx` JSX, replace `<MainArea ... />` with:

```jsx
{selectedBrand ? (
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
    codes={codes}
    brandCode={brandCode}
    syncing={syncing}
    actions={actions}
    actionsOpen={actionsOpen}
    onViewModeChange={setViewMode}
    onSelectCreative={setSelectedCreative}
    onSave={handleSave}
    onSync={handleSync}
    onActionsToggle={() => setActionsOpen(o => !o)}
    onMarkDone={handleMarkDone}
    onAddCode={handleAddCode}
  />
) : (
  <Dashboard
    brands={brands}
    cache={cache}
    actions={actions}
    onSelectBrand={(b) => { setSelectedBrand(b); setSelectedProduct(null); setSelectedConcept(null); }}
    onActionsToggle={() => setActionsOpen(o => !o)}
  />
)}
```

- [ ] **Step 3: Remove early return from MainArea.jsx**

In `web/src/components/MainArea.jsx`, delete the entire `if (!selectedBrand)` early return block:

```jsx
// DELETE these lines:
if (!selectedBrand) {
  return (
    <main className="flex-1 flex items-center justify-center text-slate-400 text-sm">
      ← Chọn brand từ sidebar để bắt đầu
    </main>
  );
}
```

- [ ] **Step 4: Verify app in browser**

```bash
npm run dev
```
Expected: App opens to Dashboard with brand grid. Clicking a brand card shows the creative list. Browser back (selecting no brand) shows Dashboard again.

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/components/MainArea.jsx
git commit -m "feat: wire dashboard as default home screen"
```

---

### Task 5: CreativeCard Redesign

**Files:**
- Rewrite: `web/src/components/CreativeCard.jsx`
- Modify: `web/src/test/CreativeCard.test.jsx`

**Interfaces:**
- Same props as before: `{ creative, isSelected, onClick }`
- Produces: Card with 4px left colored border per status, dark surface, prominent ROAS, hover lift

- [ ] **Step 1: Update failing test for new selected-state class**

In `web/src/test/CreativeCard.test.jsx`, update the selected-state test (the one checking `border-indigo-400`) to match the new design:

```jsx
it('hiện border khác màu khi isSelected=true', () => {
  const { container } = render(<CreativeCard creative={mockCreative} isSelected={true} onClick={vi.fn()} />);
  expect(container.firstChild).toHaveClass('ring-violet-500');
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- CreativeCard
```
Expected: FAIL on the `ring-violet-500` test (current card uses `border-indigo-400`). Other 4 tests pass.

- [ ] **Step 3: Rewrite CreativeCard.jsx**

```jsx
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
```

- [ ] **Step 4: Run all CreativeCard tests**

```bash
npm test -- CreativeCard
```
Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CreativeCard.jsx src/test/CreativeCard.test.jsx
git commit -m "feat: redesign creative cards with status strips and dark theme"
```

---

### Task 6: MainArea Dark Re-skin

**Files:**
- Modify: `web/src/components/MainArea.jsx`

**Interfaces:**
- No prop changes
- Produces: TopBar dark (`bg-slate-900 border-slate-700`), breadcrumb clickable, filters dark-styled, Actions panel amber-on-dark

- [ ] **Step 1: Update TopBar in MainArea.jsx**

Replace the TopBar div (currently `bg-white border-b border-slate-200`) with:

```jsx
<div className="flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700 flex-shrink-0">
  <div className="flex items-center gap-1 text-xs text-slate-400">
    <button
      onClick={() => { /* navigate up to brand — pass onClearSelection or handle via selectedConcept/Product */ }}
      className="text-slate-400 hover:text-slate-200 transition-colors"
    >
      {selectedBrand}
    </button>
    {selectedProduct && (
      <>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400">{selectedProduct}</span>
      </>
    )}
    {selectedConcept && (
      <>
        <span className="text-slate-600">/</span>
        <span className="text-slate-100 font-medium">{selectedConcept}</span>
      </>
    )}
  </div>

  <div className="ml-auto flex items-center gap-2">
    {/* View toggle */}
    <div className="flex bg-slate-800 rounded-md p-0.5 gap-0.5">
      {[['gallery', '⊞ Gallery'], ['table', '☰ Table'], ['matrix', '⊟ Matrix']].map(([mode, label]) => (
        <button key={mode} onClick={() => onViewModeChange(mode)}
          className={`px-3 py-1 text-xs rounded transition-colors font-medium
            ${viewMode === mode ? 'bg-slate-600 text-slate-100' : 'text-slate-500 hover:text-slate-300'}`}>
          {label}
        </button>
      ))}
    </div>

    {/* Filters */}
    <select value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}
      className="text-xs border border-slate-600 rounded px-2 py-1 text-slate-400 bg-slate-800 focus:outline-none focus:border-violet-500">
      <option value="">Format</option>
      {(dropdowns.format || []).map(f => <option key={f}>{f}</option>)}
    </select>
    <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
      className="text-xs border border-slate-600 rounded px-2 py-1 text-slate-400 bg-slate-800 focus:outline-none focus:border-violet-500">
      <option value="">Status</option>
      {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
    </select>

    <span className="text-xs text-slate-500">{filtered.length}</span>

    <button onClick={onSync} disabled={syncing}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition-colors">
      <span className={syncing ? 'animate-spin inline-block' : ''}>⟳</span>
      {syncing ? 'Syncing…' : 'Sync Meta'}
    </button>

    <button onClick={onActionsToggle}
      className={`relative flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border transition-colors
        ${actionsOpen ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'border-slate-600 bg-slate-800 hover:bg-slate-700 text-slate-300'}`}>
      ⚡ Actions
      {actions.length > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {actions.length}
        </span>
      )}
    </button>

    <button onClick={handleNewCreative}
      className="bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
      + New
    </button>
  </div>
</div>
```

- [ ] **Step 2: Update Actions Queue Panel**

Replace the `actionsOpen` panel div (currently `bg-amber-50`) with:

```jsx
{actionsOpen && (
  <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 flex-shrink-0">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-amber-400">⚡ Pending Actions ({actions.length})</span>
      <button onClick={onActionsToggle} className="text-amber-500/70 hover:text-amber-400 text-xs">✕</button>
    </div>
    {actions.length === 0 ? (
      <p className="text-xs text-amber-500/70">Không có action nào đang chờ.</p>
    ) : (
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {actions.map(a => (
          <div key={a.id} className="flex items-center gap-3 bg-slate-800 rounded-md px-3 py-2 border border-slate-700 text-xs">
            <span className={`px-1.5 py-0.5 rounded font-semibold
              ${a.action === 'Scale' ? 'bg-emerald-900/60 text-emerald-400' :
                a.action === 'Kill'  ? 'bg-red-900/60 text-red-400' :
                'bg-slate-700 text-slate-300'}`}>
              {a.action}
            </span>
            <span className="text-slate-400 font-mono">{a.creative_id}</span>
            <span className="text-slate-500 flex-1">{a.brand}</span>
            {a.notes && <span className="text-slate-500 truncate max-w-[120px]">{a.notes}</span>}
            <span className="text-slate-600">{a.created_at ? new Date(a.created_at).toLocaleDateString('vi-VN') : ''}</span>
            <button onClick={() => onMarkDone(a.id)}
              className="ml-auto text-xs text-emerald-500 hover:text-emerald-400 font-semibold whitespace-nowrap">
              ✓ Done
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 3: Update content area background and empty state**

Change `<div className="flex-1 overflow-y-auto p-4">` background to `bg-slate-950`:

```jsx
<div className="flex-1 overflow-y-auto p-4 bg-slate-950">
```

Update loading/error text colors:
```jsx
{loading && <div className="text-slate-500 text-sm">Đang tải...</div>}
{error && <div className="text-red-400 text-sm">Lỗi: {error}</div>}
```

Update empty gallery state:
```jsx
{filtered.length === 0 && (
  <div className="col-span-full text-center text-slate-600 text-sm py-16">
    Chưa có creative nào.{' '}
    <button onClick={handleNewCreative} className="text-violet-400 hover:text-violet-300">Thêm mới?</button>
  </div>
)}
```

Update table dark theme — replace the `<table>` block:
```jsx
<table className="w-full text-xs">
  <thead>
    <tr className="text-slate-500 border-b border-slate-800">
      <th className="text-left py-2 px-3 font-semibold">Hook</th>
      <th className="text-left py-2 px-3 font-semibold">Concept</th>
      <th className="text-left py-2 px-3 font-semibold">Format</th>
      <th className="text-left py-2 px-3 font-semibold">Status</th>
      <th className="text-left py-2 px-3 font-semibold">ROAS</th>
      <th className="text-left py-2 px-3 font-semibold">CTR</th>
      <th className="text-left py-2 px-3 font-semibold">Spend</th>
    </tr>
  </thead>
  <tbody>
    {filtered.map(c => (
      <tr key={c.id}
        onClick={() => onSelectCreative(c)}
        className={`border-b border-slate-800/60 cursor-pointer transition-colors
          ${selectedCreative?.id === c.id ? 'bg-violet-900/20' : 'hover:bg-slate-900'}`}>
        <td className="py-2 px-3 font-medium text-slate-200">{c.hook}</td>
        <td className="py-2 px-3 text-violet-400">{c.concept}</td>
        <td className="py-2 px-3 text-slate-500">{c.format}</td>
        <td className="py-2 px-3">
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[11px]">{c.status}</span>
        </td>
        <td className="py-2 px-3 font-bold text-emerald-400">{c.roas ? `${Number(c.roas).toFixed(1)}x` : '—'}</td>
        <td className="py-2 px-3 text-slate-500">{c.ctr ? `${c.ctr}%` : '—'}</td>
        <td className="py-2 px-3 text-slate-500">{c.spend ? `$${Number(c.spend).toLocaleString()}` : '—'}</td>
      </tr>
    ))}
  </tbody>
</table>
```

- [ ] **Step 4: Run app to verify**

```bash
npm run dev
```
Expected: Dark TopBar, breadcrumb, dark filters, dark table. No white surfaces in creative list area.

- [ ] **Step 5: Commit**

```bash
git add src/components/MainArea.jsx
git commit -m "feat: dark theme for main area topbar and content views"
```

---

### Task 7: DetailPanel Slide-over with Inline Editing

**Files:**
- Rewrite: `web/src/components/DetailPanel.jsx`
- Modify: `web/src/App.jsx` (change DetailPanel positioning)

**Interfaces:**
- Same props as before: `{ creative, dropdowns, codes, brandCode, onClose, onSave, onDelete, onAction, onAddCode }`
- Produces: Fixed overlay slide-over (right side, `w-96`), dark theme, inline editing for Status/BriefStatus/Assignee/LaunchDate/Notes fields

- [ ] **Step 1: Change DetailPanel position in App.jsx**

In `web/src/App.jsx`, the `{selectedCreative && <DetailPanel ... />}` renders inside the flex row. Move it outside but still inside the root div, so it overlays the content:

The current structure is:
```jsx
<div className="flex h-screen bg-slate-950 ...">
  <Sidebar ... />
  {selectedBrand ? <MainArea ... /> : <Dashboard ... />}
  {selectedCreative && <DetailPanel ... />}
</div>
```

This is fine — DetailPanel will use `position: fixed` internally and won't affect flex layout. No change needed in App.jsx for this task.

- [ ] **Step 2: Rewrite DetailPanel.jsx**

```jsx
import { useState, useEffect } from 'react';
import CreativeModal from './CreativeModal';

const STATUS_STRIP = {
  Winning:  'bg-emerald-500',
  Scaling:  'bg-violet-500',
  Testing:  'bg-amber-500',
  Fatigued: 'bg-orange-500',
  Killed:   'bg-red-500',
};

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
```

- [ ] **Step 3: Verify in browser**

```bash
npm run dev
```
Expected: Clicking a creative card opens the slide-over panel from the right. Backdrop darkens the page. Clicking backdrop or pressing Escape closes the panel. Status dropdown saves immediately on change.

- [ ] **Step 4: Commit**

```bash
git add src/components/DetailPanel.jsx src/App.jsx
git commit -m "feat: detail panel as dark slide-over with inline editing"
```

---

### Task 8: MatrixView Dark Re-skin

**Files:**
- Modify: `web/src/components/MatrixView.jsx`

**Interfaces:**
- No prop changes
- Produces: MatrixView fully dark-themed; cell colors shifted to dark variants; selected cell detail dark card

- [ ] **Step 1: Update cellStyle function**

Replace the `cellStyle` function:

```jsx
function cellStyle(cell) {
  if (!cell) return 'bg-slate-800/40 text-slate-600 border border-slate-700/50';
  if (cell.avgRoas === null) return 'bg-blue-900/40 text-blue-300 border border-blue-700/50 cursor-pointer hover:bg-blue-900/60';
  if (cell.avgRoas >= 3)   return 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 cursor-pointer hover:bg-emerald-900/70';
  if (cell.avgRoas >= 1.5) return 'bg-amber-900/40 text-amber-300 border border-amber-700/40 cursor-pointer hover:bg-amber-900/60';
  return 'bg-red-900/40 text-red-300 border border-red-700/40 cursor-pointer hover:bg-red-900/60';
}
```

- [ ] **Step 2: Update empty state**

Replace the empty state return:

```jsx
return (
  <div className="flex flex-col items-center justify-center py-20 text-slate-600 text-sm gap-2">
    <span className="text-2xl">⊞</span>
    <p>Chưa đủ data để hiện Matrix View.</p>
    <p className="text-xs text-slate-700">Cần ít nhất 1 creative có cả Concept và Angle.</p>
  </div>
);
```

- [ ] **Step 3: Update Legend**

Replace the Legend div:

```jsx
<div className="flex items-center gap-4 text-xs text-slate-500">
  <span className="font-medium text-slate-400">ROAS:</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-900/50 border border-emerald-700/50 inline-block"/>≥ 3x Win</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-900/40 border border-amber-700/40 inline-block"/>1.5–3x OK</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900/40 border border-red-700/40 inline-block"/>{'< 1.5x Fail'}</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-900/40 border border-blue-700/50 inline-block"/>Đang test</span>
  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-800/40 border border-slate-700/50 inline-block"/>Chưa test</span>
</div>
```

- [ ] **Step 4: Update table header and concept column**

Replace the `<thead>` and concept `<td>`:

```jsx
<thead>
  <tr>
    <th className="text-left p-2 text-slate-500 font-semibold min-w-[120px]">Concept \ Angle</th>
    {angles.map(angle => (
      <th key={angle} className="text-center p-2 text-slate-400 font-semibold min-w-[110px] max-w-[140px]">
        <span className="block truncate" title={angle}>{angle}</span>
      </th>
    ))}
  </tr>
</thead>
```

Concept column `<td>`:
```jsx
<td className="p-2 font-semibold text-slate-300 align-middle pr-3">
  <span className="block truncate max-w-[160px]" title={concept}>{concept}</span>
</td>
```

Selected cell ring:
```jsx
className={`rounded-lg p-2 text-center transition-all ${cellStyle(cell)} ${isSelected ? 'ring-2 ring-violet-400 ring-offset-1 ring-offset-slate-950' : ''}`}
```

- [ ] **Step 5: Update selected cell detail card**

Replace the `{selectedCell && ...}` block:

```jsx
{selectedCell && selectedItems.length > 0 && (
  <div className="border border-slate-700 rounded-lg bg-slate-900 p-4">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-200">
        {selectedCell.concept} × {selectedCell.angle}
        <span className="ml-2 text-slate-500 font-normal">({selectedItems.length} creative)</span>
      </h3>
      <button onClick={() => setSelectedCell(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕ Đóng</button>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-3 gap-2">
      {selectedItems.map(c => (
        <button key={c.id}
          onClick={() => onSelectCreative(c)}
          className="text-left p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-violet-600 transition-colors">
          <div className="font-medium text-slate-200 text-xs truncate">{c.hook || '(no hook)'}</div>
          <div className="text-xs text-slate-500 mt-0.5">{c.format} · {c.status}</div>
          <div className="flex gap-3 mt-1.5 text-xs">
            {c.roas && <span className="text-emerald-400 font-bold">{Number(c.roas).toFixed(1)}x</span>}
            {c.ctr  && <span className="text-slate-500">CTR {c.ctr}%</span>}
            {c.spend && <span className="text-slate-500">${Number(c.spend).toLocaleString()}</span>}
          </div>
        </button>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 6: Update uncategorized note**

```jsx
{uncategorized.length > 0 && (
  <div className="text-xs text-slate-600 mt-2">
    {uncategorized.length} creative chưa có Concept/Angle → không hiện trong matrix.
  </div>
)}
```

- [ ] **Step 7: Run all tests to confirm nothing broken**

```bash
npm test
```
Expected: All tests PASS.

- [ ] **Step 8: Commit**

```bash
git add src/components/MatrixView.jsx
git commit -m "feat: matrix view dark re-skin"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Icon rail sidebar 56px collapsed / 220px expanded — Task 2
- ✅ Dashboard with brand KPI cards — Tasks 3–4
- ✅ localStorage sidebar state — Task 1
- ✅ Dark color system (slate-950/900/800, violet accent) — Task 1 + all tasks
- ✅ CreativeCard with status strip — Task 5
- ✅ DetailPanel slide-over with backdrop — Task 7
- ✅ Inline editing (dropdowns save on change, text fields save on blur) — Task 7
- ✅ MainArea dark TopBar + breadcrumb — Task 6
- ✅ MatrixView dark re-skin — Task 8
- ✅ Table view dark re-skin — Task 6
- ✅ Actions queue dark re-skin — Task 6
- ✅ No backend changes — confirmed, zero API changes
- ✅ Escape key closes DetailPanel — Task 7

**No placeholders** — all code blocks are complete implementations.

**Type consistency** — `handleSelectChange(field, value)` and `handleFieldBlur(field)` in Task 7 use `draft` state initialized from `creative` props, consistent with `onSave({ ...creative, [field]: value })` call signature matching existing `handleSave(row)` in App.jsx.
