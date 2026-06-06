# Creative Library Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Creative Library từ GAS sidebar thành standalone React web app với layout 3 cột (Sidebar tree · Gallery/Table · Detail Panel), dùng GAS làm API backend và Google Sheets làm data store.

**Architecture:** GAS Web App expose doGet endpoint cho cả reads lẫn writes (dùng `?action=&data=` params để tránh CORS preflight). React 18 + Vite frontend hosted trên GitHub Pages. Data lưu trong Google Sheets: tab `Config` chứa danh sách brands, mỗi brand có 1 tab riêng với mỗi row = 1 creative. Frontend giữ in-memory cache và dùng optimistic updates.

**Tech Stack:** Google Apps Script + clasp (backend), React 18, Vite, Tailwind CSS 3, Vitest, React Testing Library (frontend), GitHub Pages (hosting)

---

## File Structure

### GAS Backend (`src/`)
| File | Vai trò |
|------|---------|
| `src/Code.gs` | Rewrite toàn bộ: doGet handler, getBrands, getCreatives, saveCreative, deleteCreative, addBrand, generateId |
| `src/appsscript.json` | Thêm `webapp` config block |

> `src/sidebar.html` sẽ bị xóa — không còn dùng.

### React Frontend (`web/`)
| File | Vai trò |
|------|---------|
| `web/package.json` | React, Vite, Tailwind, Vitest, RTL deps |
| `web/vite.config.js` | Vite config + Vitest config, base path cho GitHub Pages |
| `web/tailwind.config.js` | Tailwind content paths |
| `web/index.html` | HTML entry |
| `web/src/main.jsx` | React root mount |
| `web/src/App.jsx` | Global state, layout (Sidebar · MainArea · DetailPanel) |
| `web/src/api.js` | GAS fetch wrapper: getBrands, getCreatives, getDropdowns, saveCreative, deleteCreative, addBrand |
| `web/src/hooks/useCreatives.js` | Cache per brand, optimistic update helpers |
| `web/src/components/Sidebar.jsx` | Brand/Product/Concept tree |
| `web/src/components/MainArea.jsx` | TopBar + GalleryView / TableView switch |
| `web/src/components/CreativeCard.jsx` | Card: thumbnail, hook, status badge, ROAS |
| `web/src/components/DetailPanel.jsx` | Right panel: metrics grid + fields + Edit/Delete |
| `web/src/components/CreativeModal.jsx` | Modal wrapper (New & Edit) |
| `web/src/components/CreativeForm.jsx` | Form với tất cả fields + autocomplete |
| `web/src/test/api.test.js` | Unit tests cho api.js |
| `web/src/test/CreativeCard.test.jsx` | Unit tests cho CreativeCard |
| `web/src/test/Sidebar.test.jsx` | Unit tests cho Sidebar |

---

## Task 1: Refactor GAS Backend — appsscript.json + Code.gs

**Files:**
- Modify: `src/appsscript.json`
- Rewrite: `src/Code.gs`
- Delete: `src/sidebar.html`

- [ ] **Step 1: Cập nhật appsscript.json**

Thêm `webapp` block — bắt buộc để GAS deploy thành web app URL:

```json
{
  "timeZone": "Asia/Ho_Chi_Minh",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

- [ ] **Step 2: Rewrite Code.gs**

Xóa toàn bộ nội dung cũ, thay bằng:

```javascript
// ============================================================
// CREATIVE LIBRARY — Code.gs
// API backend via doGet: ?action=<name>&data=<JSON>
// ============================================================

const SHEET_CONFIG = 'Config';

const DROPDOWNS = {
  format:      ['Video 9:16', 'Static 1:1', 'Static 4:5', 'Carousel', 'Story'],
  status:      ['Testing', 'Winning', 'Scaling', 'Fatigued', 'Killed'],
  briefStatus: ['Not Briefed', 'Briefed', 'In Production', 'Ready to Launch', 'Live'],
};

// ============================================================
// ENTRY POINT
// ============================================================

function doGet(e) {
  const action = (e.parameter && e.parameter.action) || '';
  const data   = (e.parameter && e.parameter.data)
    ? JSON.parse(e.parameter.data)
    : {};

  let result;
  try {
    if (action === 'getBrands')      result = getBrands();
    else if (action === 'getCreatives') result = getCreatives(data.brand);
    else if (action === 'getDropdowns') result = DROPDOWNS;
    else if (action === 'saveCreative') result = saveCreative(data.brand, data.row);
    else if (action === 'deleteCreative') result = deleteCreative(data.brand, data.id);
    else if (action === 'addBrand')  result = addBrand(data.brand);
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// READ
// ============================================================

function getBrands() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .map(r => r[0])
    .filter(b => b !== '');
}

function getCreatives(brand) {
  if (!brand) throw new Error('brand param required');
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(brand);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values  = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values[0];

  return values.slice(1)
    .filter(row => row.some(cell => cell !== ''))
    .map((row, i) => {
      const obj = { _rowIndex: i + 2 };
      headers.forEach((h, j) => { obj[h] = row[j]; });
      return obj;
    });
}

// ============================================================
// WRITE
// ============================================================

function saveCreative(brand, row) {
  if (!brand || !row) throw new Error('brand và row bắt buộc');
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(brand);
  if (!sheet) throw new Error('Sheet không tồn tại: ' + brand);

  const headers   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowValues = headers.map(h => (row[h] !== undefined ? row[h] : ''));

  if (!row.id || String(row.id).trim() === '') {
    // New: generate ID rồi append
    const newId = generateId();
    rowValues[headers.indexOf('id')] = newId;
    sheet.appendRow(rowValues);
    return { id: newId, rowIndex: sheet.getLastRow() };
  }

  // Update: tìm row theo id
  const idColIdx = headers.indexOf('id');
  if (idColIdx === -1) throw new Error('Cột id không tìm thấy trong sheet ' + brand);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Creative không tìm thấy: ' + row.id);
  const ids    = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues().flat();
  const rowIdx = ids.indexOf(row.id);
  if (rowIdx === -1) throw new Error('Creative không tìm thấy: ' + row.id);
  sheet.getRange(rowIdx + 2, 1, 1, rowValues.length).setValues([rowValues]);
  return { id: row.id, rowIndex: rowIdx + 2 };
}

function deleteCreative(brand, id) {
  if (!brand || !id) throw new Error('brand và id bắt buộc');
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(brand);
  if (!sheet) throw new Error('Sheet không tồn tại: ' + brand);

  const headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf('id');
  if (idColIdx === -1) throw new Error('Cột id không tìm thấy');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Creative không tìm thấy: ' + id);
  const ids    = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues().flat();
  const rowIdx = ids.indexOf(id);
  if (rowIdx === -1) throw new Error('Creative không tìm thấy: ' + id);
  sheet.deleteRow(rowIdx + 2);
  return { deleted: id };
}

function addBrand(brand) {
  if (!brand || String(brand).trim() === '') throw new Error('Tên brand không được trống');
  const trimmed = String(brand).trim();
  const ss      = SpreadsheetApp.getActiveSpreadsheet();

  const configSheet = ss.getSheetByName(SHEET_CONFIG);
  if (!configSheet) throw new Error('Config sheet không tồn tại. Chạy setupConfig() trước.');
  configSheet.appendRow([trimmed]);

  if (!ss.getSheetByName(trimmed)) {
    const newSheet = ss.insertSheet(trimmed);
    const headers  = ['id','product','concept','angle','hook','format','status',
                      'brief_status','assignee','launch_date','spend','roas',
                      'ctr','cpm','preview_url','notes'];
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#f1f5f9');
    newSheet.setFrozenRows(1);
  }
  return { added: trimmed };
}

// ============================================================
// SETUP (chạy 1 lần nếu Config tab chưa có)
// ============================================================

function setupConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_CONFIG)) {
    const sheet = ss.insertSheet(SHEET_CONFIG);
    sheet.getRange(1, 1).setValue('Brand').setFontWeight('bold').setBackground('#f1f5f9');
    sheet.setFrozenRows(1);
    SpreadsheetApp.getUi().alert('✅ Config sheet đã tạo. Thêm brand names vào cột A.');
  } else {
    SpreadsheetApp.getUi().alert('Config sheet đã tồn tại.');
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎨 Creative Library')
    .addItem('Setup Config (chạy lần đầu)', 'setupConfig')
    .addToUi();
}

// ============================================================
// UTILITIES
// ============================================================

function generateId() {
  const now  = new Date();
  const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return 'CR-' + date + '-' + rand;
}
```

- [ ] **Step 3: Xóa sidebar.html**

```bash
rm "/Users/tinhpham/Documents/Creative app/src/sidebar.html"
```

- [ ] **Step 4: Push lên GAS**

```bash
cd "/Users/tinhpham/Documents/Creative app"
~/.npm-global/bin/clasp push
```

Expected output: `Pushed N files.`

- [ ] **Step 5: Deploy GAS Web App**

```bash
~/.npm-global/bin/clasp open
```

Trong GAS editor: Deploy → New deployment → Web app → Execute as: Me → Access: Anyone → Deploy. Lưu lại URL dạng `https://script.google.com/macros/s/AKfy.../exec`.

- [ ] **Step 6: Verify getBrands endpoint**

Mở trong browser (thay `<GAS_URL>` bằng URL vừa lấy):

```
<GAS_URL>?action=getBrands
```

Expected: `[]` hoặc `["Nike","Adidas"]` nếu Config tab đã có data.

- [ ] **Step 7: Verify getDropdowns endpoint**

```
<GAS_URL>?action=getDropdowns
```

Expected:
```json
{"format":["Video 9:16","Static 1:1","Static 4:5","Carousel","Story"],"status":["Testing","Winning","Scaling","Fatigued","Killed"],"briefStatus":["Not Briefed","Briefed","In Production","Ready to Launch","Live"]}
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add src/Code.gs src/appsscript.json
git rm src/sidebar.html
git commit -m "feat: refactor GAS to doGet API backend, remove sidebar"
```

---

## Task 2: Khởi tạo React + Vite + Tailwind

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.js`
- Create: `web/tailwind.config.js`
- Create: `web/index.html`
- Create: `web/src/main.jsx`

- [ ] **Step 1: Tạo web/ directory và package.json**

```bash
mkdir -p "/Users/tinhpham/Documents/Creative app/web/src/components"
mkdir -p "/Users/tinhpham/Documents/Creative app/web/src/hooks"
mkdir -p "/Users/tinhpham/Documents/Creative app/web/src/test"
```

Tạo `web/package.json`:

```json
{
  "name": "creative-library-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.38",
    "tailwindcss": "^3.4.4",
    "vite": "^5.3.1",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Tạo vite.config.js**

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/creative-library/',  // GitHub Pages repo name — đổi nếu khác
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
```

- [ ] **Step 3: Tạo tailwind.config.js**

```javascript
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {} },
  plugins: [],
};
```

- [ ] **Step 4: Tạo postcss.config.js**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 5: Tạo web/index.html**

```html
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Creative Library</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Tạo web/src/main.jsx**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

- [ ] **Step 7: Tạo web/src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Tạo test setup file**

```javascript
// web/src/test/setup.js
import '@testing-library/jest-dom';
```

- [ ] **Step 9: Install dependencies**

```bash
cd "/Users/tinhpham/Documents/Creative app/web"
npm install
```

Expected: `added N packages` with no errors.

- [ ] **Step 10: Thêm .env.example**

Tạo `web/.env.example`:

```
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Tạo `web/.env.local` (không commit):
```
VITE_GAS_URL=https://script.google.com/macros/s/AKfy.../exec
```

Thêm `.env.local` vào `.gitignore`:

```bash
echo "web/.env.local" >> "/Users/tinhpham/Documents/Creative app/.gitignore"
```

- [ ] **Step 11: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/ .gitignore
git commit -m "feat: scaffold React+Vite+Tailwind frontend"
```

---

## Task 3: API Client (`api.js`)

**Files:**
- Create: `web/src/api.js`
- Create: `web/src/test/api.test.js`

- [ ] **Step 1: Viết failing tests trước**

Tạo `web/src/test/api.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBrands, getCreatives, saveCreative, deleteCreative, addBrand } from '../api';

const MOCK_URL = 'https://fake-gas.example.com/exec';

beforeEach(() => {
  vi.stubEnv('VITE_GAS_URL', MOCK_URL);
  vi.restoreAllMocks();
});

describe('getBrands', () => {
  it('trả về mảng brand names', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ['Nike', 'Adidas'],
    });

    const result = await getBrands();
    expect(result).toEqual(['Nike', 'Adidas']);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=getBrands')
    );
  });

  it('throw error nếu GAS trả về { error: ... }', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'Config sheet không tồn tại' }),
    });

    await expect(getBrands()).rejects.toThrow('Config sheet không tồn tại');
  });
});

describe('getCreatives', () => {
  it('trả về array of creative objects', async () => {
    const mockCreatives = [
      { id: 'CR-20260606-1234', product: 'Running', concept: 'Pain Point', hook: 'Hook A' },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCreatives,
    });

    const result = await getCreatives('Nike');
    expect(result).toEqual(mockCreatives);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=getCreatives')
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(encodeURIComponent('"brand":"Nike"'))
    );
  });
});

describe('saveCreative', () => {
  it('gửi đúng params khi create mới (không có id)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'CR-20260606-9999', rowIndex: 3 }),
    });

    const row = { product: 'Running', concept: 'Pain Point', hook: 'Hook A' };
    const result = await saveCreative('Nike', row);
    expect(result.id).toBe('CR-20260606-9999');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=saveCreative')
    );
  });

  it('gửi đúng params khi update (có id)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 'CR-20260606-1234', rowIndex: 2 }),
    });

    const row = { id: 'CR-20260606-1234', product: 'Running', hook: 'Hook A Updated' };
    const result = await saveCreative('Nike', row);
    expect(result.id).toBe('CR-20260606-1234');
  });
});

describe('deleteCreative', () => {
  it('gọi đúng action và trả về { deleted: id }', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ deleted: 'CR-20260606-1234' }),
    });

    const result = await deleteCreative('Nike', 'CR-20260606-1234');
    expect(result.deleted).toBe('CR-20260606-1234');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('action=deleteCreative')
    );
  });
});
```

- [ ] **Step 2: Chạy tests để confirm chúng fail**

```bash
cd "/Users/tinhpham/Documents/Creative app/web"
npm test
```

Expected: FAIL — `Cannot find module '../api'`

- [ ] **Step 3: Implement api.js**

Tạo `web/src/api.js`:

```javascript
const GAS_URL = import.meta.env.VITE_GAS_URL;

async function gasCall(action, data = null) {
  let url = `${GAS_URL}?action=${encodeURIComponent(action)}`;
  if (data) url += `&data=${encodeURIComponent(JSON.stringify(data))}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json && json.error) throw new Error(json.error);
  return json;
}

export const getBrands     = ()              => gasCall('getBrands');
export const getDropdowns  = ()              => gasCall('getDropdowns');
export const getCreatives  = (brand)         => gasCall('getCreatives', { brand });
export const saveCreative  = (brand, row)    => gasCall('saveCreative', { brand, row });
export const deleteCreative = (brand, id)   => gasCall('deleteCreative', { brand, id });
export const addBrand      = (brand)         => gasCall('addBrand', { brand });
```

- [ ] **Step 4: Chạy tests để confirm pass**

```bash
cd "/Users/tinhpham/Documents/Creative app/web"
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/src/api.js web/src/test/api.test.js
git commit -m "feat: add GAS API client with tests"
```

---

## Task 4: Global State — `App.jsx` + `useCreatives.js`

**Files:**
- Create: `web/src/hooks/useCreatives.js`
- Create: `web/src/App.jsx`

- [ ] **Step 1: Tạo useCreatives.js**

Hook này manage cache per brand và expose optimistic update helpers:

```javascript
// web/src/hooks/useCreatives.js
import { useState, useCallback } from 'react';
import { getCreatives, saveCreative as apiSave, deleteCreative as apiDelete } from '../api';

export function useCreatives() {
  // { Nike: Creative[], Adidas: Creative[] }
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (brand) => {
    if (!brand) return;
    if (cache[brand]) return; // đã có cache
    setLoading(true);
    setError(null);
    try {
      const data = await getCreatives(brand);
      setCache(prev => ({ ...prev, [brand]: data }));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [cache]);

  const save = useCallback(async (brand, row) => {
    const isNew = !row.id;
    // Optimistic: thêm/update ngay với temp id nếu mới
    const tempId = isNew ? `__temp__${Date.now()}` : row.id;
    const optimisticRow = { ...row, id: tempId };

    setCache(prev => {
      const existing = prev[brand] || [];
      if (isNew) return { ...prev, [brand]: [...existing, optimisticRow] };
      return { ...prev, [brand]: existing.map(c => c.id === row.id ? optimisticRow : c) };
    });

    try {
      const result = await apiSave(brand, row);
      // Replace temp với real id
      setCache(prev => {
        const existing = prev[brand] || [];
        if (isNew) {
          return { ...prev, [brand]: existing.map(c => c.id === tempId ? { ...optimisticRow, id: result.id } : c) };
        }
        return prev;
      });
      return result;
    } catch (err) {
      // Revert
      setCache(prev => {
        const existing = prev[brand] || [];
        if (isNew) return { ...prev, [brand]: existing.filter(c => c.id !== tempId) };
        return { ...prev, [brand]: existing.map(c => c.id === row.id ? row : c) };
      });
      throw err;
    }
  }, []);

  const remove = useCallback(async (brand, id) => {
    const snapshot = cache[brand] || [];
    // Optimistic remove
    setCache(prev => ({ ...prev, [brand]: (prev[brand] || []).filter(c => c.id !== id) }));
    try {
      await apiDelete(brand, id);
    } catch (err) {
      // Revert
      setCache(prev => ({ ...prev, [brand]: snapshot }));
      throw err;
    }
  }, [cache]);

  const getFiltered = useCallback((brand, product, concept) => {
    let list = cache[brand] || [];
    if (product) list = list.filter(c => c.product === product);
    if (concept) list = list.filter(c => c.concept === concept);
    return list;
  }, [cache]);

  const getTree = useCallback((brand) => {
    const list = cache[brand] || [];
    const tree = {};
    list.forEach(c => {
      const p = c.product || '(No Product)';
      const con = c.concept || '(No Concept)';
      if (!tree[p]) tree[p] = new Set();
      tree[p].add(con);
    });
    // Convert Sets to sorted arrays
    return Object.fromEntries(
      Object.entries(tree).map(([p, cons]) => [p, [...cons].sort()])
    );
  }, [cache]);

  return { cache, loading, error, load, save, remove, getFiltered, getTree };
}
```

- [ ] **Step 2: Tạo App.jsx**

```jsx
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
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/src/App.jsx web/src/hooks/useCreatives.js
git commit -m "feat: add App root state and useCreatives hook"
```

---

## Task 5: Sidebar Component

**Files:**
- Create: `web/src/components/Sidebar.jsx`
- Create: `web/src/test/Sidebar.test.jsx`

- [ ] **Step 1: Viết failing tests**

```jsx
// web/src/test/Sidebar.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Sidebar from '../components/Sidebar';

const mockProps = {
  brands: ['Nike', 'Adidas'],
  selectedBrand: null,
  selectedProduct: null,
  selectedConcept: null,
  tree: {},
  onSelectBrand: vi.fn(),
  onSelectProduct: vi.fn(),
  onSelectConcept: vi.fn(),
  onAddBrand: vi.fn(),
};

describe('Sidebar', () => {
  it('hiện danh sách brands', () => {
    render(<Sidebar {...mockProps} />);
    expect(screen.getByText('Nike')).toBeInTheDocument();
    expect(screen.getByText('Adidas')).toBeInTheDocument();
  });

  it('gọi onSelectBrand khi click brand', () => {
    const onSelectBrand = vi.fn();
    render(<Sidebar {...mockProps} onSelectBrand={onSelectBrand} />);
    fireEvent.click(screen.getByText('Nike'));
    expect(onSelectBrand).toHaveBeenCalledWith('Nike');
  });

  it('hiện product tree khi brand được chọn', () => {
    render(<Sidebar {...mockProps} selectedBrand="Nike" tree={{ 'Running': ['Pain Point', 'Social Proof'] }} />);
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('hiện concept list khi product được chọn', () => {
    render(<Sidebar {...mockProps} selectedBrand="Nike" selectedProduct="Running"
      tree={{ 'Running': ['Pain Point', 'Social Proof'] }} />);
    expect(screen.getByText('Pain Point')).toBeInTheDocument();
    expect(screen.getByText('Social Proof')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy tests — confirm fail**

```bash
cd "/Users/tinhpham/Documents/Creative app/web" && npm test -- Sidebar
```

Expected: FAIL — `Cannot find module '../components/Sidebar'`

- [ ] **Step 3: Implement Sidebar.jsx**

```jsx
// web/src/components/Sidebar.jsx
import { useState } from 'react';

export default function Sidebar({ brands, selectedBrand, selectedProduct, selectedConcept,
  tree, onSelectBrand, onSelectProduct, onSelectConcept, onAddBrand }) {

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
    <aside className="w-52 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 overflow-y-auto">
      <div className="px-3 pt-4 pb-2 text-xs font-bold text-slate-500 tracking-widest uppercase">
        Brands
      </div>

      {brands.map(brand => (
        <div key={brand}>
          <button
            onClick={() => onSelectBrand(brand)}
            className={`w-full text-left px-3 py-2 text-sm font-semibold flex items-center gap-1 transition-colors
              ${selectedBrand === brand ? 'bg-slate-700 text-violet-300' : 'hover:bg-slate-800 text-slate-300'}`}
          >
            <span>{selectedBrand === brand ? '▼' : '▶'}</span>
            <span>{brand}</span>
          </button>

          {selectedBrand === brand && Object.entries(tree).map(([product, concepts]) => (
            <div key={product}>
              <button
                onClick={() => onSelectProduct(selectedProduct === product ? null : product)}
                className={`w-full text-left pl-6 pr-3 py-1.5 text-xs flex items-center gap-1 transition-colors
                  ${selectedProduct === product ? 'text-cyan-300' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <span>{selectedProduct === product ? '▼' : '▶'}</span>
                <span>{product}</span>
              </button>

              {selectedProduct === product && concepts.map(concept => (
                <button
                  key={concept}
                  onClick={() => onSelectConcept(selectedConcept === concept ? null : concept)}
                  className={`w-full text-left pl-10 pr-3 py-1 text-xs transition-colors
                    ${selectedConcept === concept
                      ? 'bg-indigo-900 text-indigo-300 font-semibold'
                      : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {selectedConcept === concept ? '● ' : '○ '}{concept}
                </button>
              ))}
            </div>
          ))}
        </div>
      ))}

      {/* Add Brand */}
      <div className="mt-auto px-3 pb-4 pt-2">
        {addingBrand ? (
          <div className="flex flex-col gap-1">
            <input
              autoFocus
              value={newBrandName}
              onChange={e => setNewBrandName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitAddBrand(); if (e.key === 'Escape') setAddingBrand(false); }}
              className="bg-slate-800 text-slate-200 text-xs px-2 py-1 rounded border border-slate-600 outline-none"
              placeholder="Tên brand..."
            />
            <div className="flex gap-1">
              <button onClick={submitAddBrand} className="flex-1 text-xs bg-blue-600 hover:bg-blue-500 text-white py-1 rounded">Thêm</button>
              <button onClick={() => setAddingBrand(false)} className="flex-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 py-1 rounded">Hủy</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAddingBrand(true)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            + Add Brand
          </button>
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Chạy tests — confirm pass**

```bash
cd "/Users/tinhpham/Documents/Creative app/web" && npm test -- Sidebar
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/src/components/Sidebar.jsx web/src/test/Sidebar.test.jsx
git commit -m "feat: add Sidebar component with brand/product/concept tree"
```

---

## Task 6: CreativeCard Component

**Files:**
- Create: `web/src/components/CreativeCard.jsx`
- Create: `web/src/test/CreativeCard.test.jsx`

- [ ] **Step 1: Viết failing tests**

```jsx
// web/src/test/CreativeCard.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CreativeCard from '../components/CreativeCard';

const mockCreative = {
  id: 'CR-20260606-1234',
  hook: 'Hook A — Speed',
  concept: 'Pain Point',
  angle: 'Recovery Pain',
  format: 'Video 9:16',
  status: 'Winning',
  roas: 4.2,
  ctr: 3.2,
  preview_url: '',
};

describe('CreativeCard', () => {
  it('hiện hook và concept', () => {
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Hook A — Speed')).toBeInTheDocument();
    expect(screen.getByText('Pain Point')).toBeInTheDocument();
  });

  it('hiện ROAS khi có giá trị', () => {
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('4.2x')).toBeInTheDocument();
  });

  it('hiện status badge', () => {
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={vi.fn()} />);
    expect(screen.getByText('Winning')).toBeInTheDocument();
  });

  it('gọi onClick khi click', () => {
    const onClick = vi.fn();
    render(<CreativeCard creative={mockCreative} isSelected={false} onClick={onClick} />);
    fireEvent.click(screen.getByText('Hook A — Speed'));
    expect(onClick).toHaveBeenCalledWith(mockCreative);
  });

  it('hiện border khác màu khi isSelected=true', () => {
    const { container } = render(<CreativeCard creative={mockCreative} isSelected={true} onClick={vi.fn()} />);
    expect(container.firstChild).toHaveClass('border-indigo-400');
  });
});
```

- [ ] **Step 2: Chạy tests — confirm fail**

```bash
cd "/Users/tinhpham/Documents/Creative app/web" && npm test -- CreativeCard
```

Expected: FAIL.

- [ ] **Step 3: Implement CreativeCard.jsx**

```jsx
// web/src/components/CreativeCard.jsx

const STATUS_COLORS = {
  Winning:  'bg-emerald-100 text-emerald-700',
  Scaling:  'bg-violet-100 text-violet-700',
  Testing:  'bg-amber-100 text-amber-700',
  Fatigued: 'bg-orange-100 text-orange-700',
  Killed:   'bg-red-100 text-red-700',
};

const FORMAT_BG = {
  'Video 9:16': 'bg-blue-100 text-blue-600',
  'Static 1:1': 'bg-pink-100 text-pink-600',
  'Static 4:5': 'bg-fuchsia-100 text-fuchsia-600',
  'Carousel':   'bg-emerald-100 text-emerald-600',
  'Story':      'bg-orange-100 text-orange-600',
};

export default function CreativeCard({ creative, isSelected, onClick }) {
  const { hook, concept, angle, format, status, roas, preview_url } = creative;
  const statusClass = STATUS_COLORS[status] || 'bg-slate-100 text-slate-600';
  const fmtClass    = FORMAT_BG[format] || 'bg-slate-100 text-slate-600';

  return (
    <div
      onClick={() => onClick(creative)}
      className={`bg-white rounded-lg p-3 cursor-pointer transition-all
        ${isSelected ? 'border-2 border-indigo-400 shadow-md shadow-indigo-100' : 'border border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
    >
      {/* Thumbnail */}
      <div className={`h-20 rounded-md mb-2 flex items-center justify-center text-xs font-semibold ${fmtClass}`}>
        {preview_url
          ? <img src={preview_url} alt={hook} className="h-full w-full object-cover rounded-md" />
          : format}
      </div>

      {/* Hook */}
      <div className="text-xs font-semibold text-slate-800 truncate mb-0.5">{hook || '(no hook)'}</div>

      {/* Concept */}
      <div className="text-xs text-slate-400 truncate mb-2">{concept}{angle ? ` · ${angle}` : ''}</div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusClass}`}>{status}</span>
        {roas ? <span className="text-xs font-bold text-emerald-600">{Number(roas).toFixed(1)}x</span> : null}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Chạy tests — confirm pass**

```bash
cd "/Users/tinhpham/Documents/Creative app/web" && npm test -- CreativeCard
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/src/components/CreativeCard.jsx web/src/test/CreativeCard.test.jsx
git commit -m "feat: add CreativeCard component"
```

---

## Task 7: MainArea Component

**Files:**
- Create: `web/src/components/MainArea.jsx`

- [ ] **Step 1: Implement MainArea.jsx**

```jsx
// web/src/components/MainArea.jsx
import { useState } from 'react';
import CreativeCard from './CreativeCard';
import CreativeModal from './CreativeModal';

export default function MainArea({ creatives, loading, error, viewMode, selectedBrand,
  selectedProduct, selectedConcept, selectedCreative, dropdowns,
  onViewModeChange, onSelectCreative, onSave }) {

  const [filters, setFilters] = useState({ format: '', status: '', brief_status: '', assignee: '' });
  const [sortBy, setSortBy] = useState('hook'); // hook | roas | status
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCreative, setEditingCreative] = useState(null);

  // Client-side filter
  const filtered = creatives.filter(c => {
    if (filters.format     && c.format      !== filters.format)      return false;
    if (filters.status     && c.status      !== filters.status)      return false;
    if (filters.brief_status && c.brief_status !== filters.brief_status) return false;
    if (filters.assignee   && !c.assignee?.toLowerCase().includes(filters.assignee.toLowerCase())) return false;
    return true;
  });

  function handleNewCreative() {
    setEditingCreative(null);
    setModalOpen(true);
  }

  function handleEditCreative(creative) {
    setEditingCreative(creative);
    setModalOpen(true);
  }

  const breadcrumb = [selectedBrand, selectedProduct, selectedConcept].filter(Boolean).join(' / ') || 'Chọn brand';

  if (!selectedBrand) {
    return (
      <main className="flex-1 flex items-center justify-center text-slate-400 text-sm">
        ← Chọn brand từ sidebar để bắt đầu
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* TopBar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0">
        <div>
          <span className="font-bold text-slate-800 text-sm">{selectedConcept || selectedProduct || selectedBrand}</span>
          <span className="text-xs text-slate-400 ml-2">{breadcrumb}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-slate-100 rounded-md p-0.5 gap-0.5">
            <button onClick={() => onViewModeChange('gallery')}
              className={`px-3 py-1 text-xs rounded transition-colors font-medium
                ${viewMode === 'gallery' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              ⊞ Gallery
            </button>
            <button onClick={() => onViewModeChange('table')}
              className={`px-3 py-1 text-xs rounded transition-colors font-medium
                ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              ☰ Table
            </button>
          </div>

          {/* Filters */}
          <select value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white">
            <option value="">Format</option>
            {(dropdowns.format || []).map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white">
            <option value="">Status</option>
            {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
          </select>

          <span className="text-xs text-slate-400">{filtered.length} creatives</span>

          <button onClick={handleNewCreative}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-md transition-colors">
            + New
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && <div className="text-slate-400 text-sm">Đang tải...</div>}
        {error && <div className="text-red-500 text-sm">Lỗi: {error}</div>}

        {!loading && !error && viewMode === 'gallery' && (
          <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map(c => (
              <CreativeCard
                key={c.id}
                creative={c}
                isSelected={selectedCreative?.id === c.id}
                onClick={onSelectCreative}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-4 text-center text-slate-400 text-sm py-16">
                Chưa có creative nào.{' '}
                <button onClick={handleNewCreative} className="text-blue-500 hover:underline">Thêm mới?</button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && viewMode === 'table' && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 border-b border-slate-200">
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
                  className={`border-b border-slate-100 cursor-pointer transition-colors
                    ${selectedCreative?.id === c.id ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}>
                  <td className="py-2 px-3 font-medium text-slate-800">{c.hook}</td>
                  <td className="py-2 px-3 text-indigo-600">{c.concept}</td>
                  <td className="py-2 px-3 text-slate-500">{c.format}</td>
                  <td className="py-2 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{c.status}</span>
                  </td>
                  <td className="py-2 px-3 font-bold text-emerald-600">{c.roas ? `${Number(c.roas).toFixed(1)}x` : '—'}</td>
                  <td className="py-2 px-3 text-slate-500">{c.ctr ? `${c.ctr}%` : '—'}</td>
                  <td className="py-2 px-3 text-slate-500">{c.spend ? `$${Number(c.spend).toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <CreativeModal
          creative={editingCreative}
          dropdowns={dropdowns}
          existingProducts={[...new Set(creatives.map(c => c.product).filter(Boolean))]}
          existingConcepts={[...new Set(creatives.map(c => c.concept).filter(Boolean))]}
          existingAngles={[...new Set(creatives.map(c => c.angle).filter(Boolean))]}
          onClose={() => setModalOpen(false)}
          onSave={async (row) => { await onSave(row); setModalOpen(false); }}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/src/components/MainArea.jsx
git commit -m "feat: add MainArea with gallery/table toggle and filters"
```

---

## Task 8: CreativeForm + CreativeModal

**Files:**
- Create: `web/src/components/CreativeForm.jsx`
- Create: `web/src/components/CreativeModal.jsx`

- [ ] **Step 1: Implement CreativeForm.jsx**

Form với tất cả fields, autocomplete cho product/concept/angle:

```jsx
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
```

- [ ] **Step 2: Implement CreativeModal.jsx**

```jsx
// web/src/components/CreativeModal.jsx
import CreativeForm from './CreativeForm';

export default function CreativeModal({ creative, dropdowns, existingProducts,
  existingConcepts, existingAngles, onClose, onSave }) {

  const isEdit = !!creative?.id;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">
            {isEdit ? 'Chỉnh sửa creative' : 'Thêm creative mới'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto px-6 py-4">
          <CreativeForm
            creative={creative}
            dropdowns={dropdowns}
            existingProducts={existingProducts}
            existingConcepts={existingConcepts}
            existingAngles={existingAngles}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/src/components/CreativeForm.jsx web/src/components/CreativeModal.jsx
git commit -m "feat: add CreativeForm and CreativeModal with autocomplete"
```

---

## Task 9: DetailPanel Component

**Files:**
- Create: `web/src/components/DetailPanel.jsx`

- [ ] **Step 1: Implement DetailPanel.jsx**

```jsx
// web/src/components/DetailPanel.jsx
import { useState } from 'react';
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

export default function DetailPanel({ creative, dropdowns, existingProducts,
  existingConcepts, onClose, onSave, onDelete }) {

  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
          existingProducts={existingProducts}
          existingConcepts={existingConcepts}
          existingAngles={[]}
          onClose={() => setEditOpen(false)}
          onSave={async (row) => { await onSave(row); setEditOpen(false); }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add web/src/components/DetailPanel.jsx
git commit -m "feat: add DetailPanel with metrics and edit/delete actions"
```

---

## Task 10: Local Dev Test + Integration Verify

**Files:** No new files — verify full app works.

- [ ] **Step 1: Chạy dev server**

```bash
cd "/Users/tinhpham/Documents/Creative app/web"
npm run dev
```

Expected output:
```
  VITE v5.x.x  ready in Xms
  ➜  Local:   http://localhost:5173/creative-library/
```

Mở http://localhost:5173/creative-library/ trong browser.

- [ ] **Step 2: Verify getBrands**

App phải load brands từ GAS (nếu có VITE_GAS_URL trong .env.local). Nếu chưa có Config data trong Sheets, sidebar sẽ trống — đó là behavior đúng.

- [ ] **Step 3: Test thêm brand**

Click `+ Add Brand` → nhập tên → Verify:
- Brand xuất hiện trong sidebar ngay (optimistic)
- Tab mới xuất hiện trong Google Sheets

- [ ] **Step 4: Test thêm creative**

Chọn brand → `+ New` → điền form → Save → Verify:
- Card xuất hiện trong gallery ngay
- Row mới xuất hiện trong Google Sheets tab

- [ ] **Step 5: Test edit + delete**

Click card → Detail Panel → Edit → sửa → Save → Verify row cập nhật trong Sheets.
Click card → Delete → Confirm → Verify row bị xóa khỏi Sheets.

- [ ] **Step 6: Run all tests**

```bash
cd "/Users/tinhpham/Documents/Creative app/web" && npm test
```

Expected: All tests PASS.

- [ ] **Step 7: Commit**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add -A
git commit -m "test: verify full integration — GAS + React app working"
```

---

## Task 11: Build + Deploy lên GitHub Pages

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Build production bundle**

```bash
cd "/Users/tinhpham/Documents/Creative app/web"
npm run build
```

Expected: `dist/` folder được tạo trong `web/dist/`. Không có errors.

- [ ] **Step 2: Tạo GitHub Actions workflow**

Tạo `.github/workflows/deploy.yml`:

```yaml
name: Deploy Creative Library to GitHub Pages

on:
  push:
    branches: [main]
    paths:
      - 'web/**'

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      - run: npm ci
        working-directory: web
      - run: npm run build
        working-directory: web
        env:
          VITE_GAS_URL: ${{ secrets.VITE_GAS_URL }}
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: web/dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 3: Thêm VITE_GAS_URL vào GitHub Secrets**

Trong GitHub repo → Settings → Secrets → Actions → New secret:
- Name: `VITE_GAS_URL`
- Value: GAS web app URL (từ Task 1 Step 5)

- [ ] **Step 4: Enable GitHub Pages**

GitHub repo → Settings → Pages → Source: `GitHub Actions`

- [ ] **Step 5: Push và verify deploy**

```bash
cd "/Users/tinhpham/Documents/Creative app"
git add .github/
git commit -m "ci: add GitHub Pages deployment workflow"
git push origin main
```

Vào GitHub → Actions tab → Verify workflow chạy thành công.

- [ ] **Step 6: Mở deployed URL**

URL dạng `https://<username>.github.io/creative-library/`. Verify app load được và gọi GAS thành công.

---

## Checklist Coverage vs Spec

| Spec Requirement | Task |
|-----------------|------|
| GAS doGet API backend | Task 1 |
| getBrands, getCreatives, saveCreative, deleteCreative, addBrand | Task 1 |
| React + Vite + Tailwind setup | Task 2 |
| GAS API client với optimistic update | Task 3, 4 |
| Sidebar tree: Brand → Product → Concept | Task 5 |
| Gallery view với CreativeCard | Task 6, 7 |
| Table view toggle | Task 7 |
| Filter bar (format, status) | Task 7 |
| Detail Panel với metrics | Task 9 |
| Add/Edit creative modal | Task 8 |
| Delete creative với confirm | Task 9 |
| Add new Brand | Task 5 |
| Add new Product/Concept qua form typing | Task 8 |
| Deploy GitHub Pages | Task 11 |
| Optimistic updates + error revert | Task 4 |
