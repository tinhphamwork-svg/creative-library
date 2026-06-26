# Motion-style Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Creative Library web app sang light theme theo aesthetics của Motion app — icon rail sidebar, nav flyout, metric-rich cards (Spend/ROAS/CTR), brand logo upload.

**Architecture:** Thay Sidebar.jsx bằng 2 component mới (Rail.jsx + NavFlyout.jsx). Redesign toàn bộ component sang light theme. Backend thêm BrandConfig sheet + uploadBrandLogo action. Logic/data không thay đổi.

**Tech Stack:** React 18, Vite, Tailwind CSS, Google Apps Script (GAS) backend qua `doGet`

## Global Constraints

- Tailwind classes only cho styling — không viết CSS inline trừ khi giá trị động
- Không đụng vào business logic: hooks, api.js calls, data shape (ngoại trừ getBrands và uploadBrandLogo đã ghi rõ)
- GAS backend: không có test framework — verify bằng cách deploy và gọi action thủ công
- `clasp push` để deploy GAS: `~/.npm-global/bin/clasp push`
- Dev server đang chạy ở port 5173: `npm run dev` trong thư mục `web/`
- Mọi Tailwind class màu light theme phải nằm trong color system của spec (xem section 5 của design doc)
- `getBrands()` sau khi thay đổi trả về `{ name: string, logoUrl: string }[]` — mọi consumer phải được update

---

## Task 1: Theme foundation — index.css + tailwind

**Files:**
- Modify: `web/src/index.css`
- Modify: `web/tailwind.config.js`

**Interfaces:**
- Produces: CSS custom properties và scrollbar style cho toàn bộ app

- [ ] **Step 1: Update index.css sang light theme**

```css
/* web/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #f7f7fa;
  color: #1f2937;
}

::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: #9ca3af; }

* { box-sizing: border-box; }
```

- [ ] **Step 2: Kiểm tra tailwind.config.js có safelist màu accent cần thiết**

Mở `web/tailwind.config.js`. Nếu có `content` array thì không cần thay đổi gì — Tailwind scan file tự động. Chỉ cần đảm bảo không có `darkMode: 'class'` hardcoded.

- [ ] **Step 3: Verify**

Chạy dev server (đang chạy ở 5173), refresh browser. Nền app phải chuyển sang trắng/xám nhạt thay vì đen.

- [ ] **Step 4: Commit**

```bash
git add web/src/index.css
git commit -m "style: light theme base — white bg, light scrollbar"
```

---

## Task 2: Backend — BrandConfig sheet + getBrands + uploadBrandLogo

**Files:**
- Modify: `src/Code.gs` (getBrands, doGet router, thêm 2 functions mới)
- Modify: `web/src/api.js` (uploadBrandLogo)
- Modify: `web/src/App.jsx` (brands state từ `string[]` → `{name,logoUrl}[]`)

**Interfaces:**
- Produces:
  - `getBrands()` GAS → `{ name: string, logoUrl: string }[]`
  - `uploadBrandLogo(brandName, fileBase64, mimeType)` GAS → `{ logoUrl: string }`
  - `api.js: uploadBrandLogo(brandName, file)` → `Promise<{ logoUrl: string }>`

- [ ] **Step 1: Tạo sheet BrandConfig và function getBrandConfig trong Code.gs**

Thêm vào `src/Code.gs`, phần READ (sau hàm `getBrands` hiện tại):

```javascript
const SHEET_BRAND_CONFIG = 'BrandConfig';
const BRAND_CONFIG_HEADERS = ['name', 'logoUrl'];

function ensureBrandConfigSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_BRAND_CONFIG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_BRAND_CONFIG);
    sheet.getRange(1, 1, 1, 2).setValues([BRAND_CONFIG_HEADERS]);
  }
  return sheet;
}

function getBrandConfigMap() {
  const sheet = ensureBrandConfigSheet();
  if (sheet.getLastRow() < 2) return {};
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const map = {};
  rows.forEach(([name, logoUrl]) => { if (name) map[name] = logoUrl || ''; });
  return map;
}
```

- [ ] **Step 2: Update getBrands() để trả về {name, logoUrl}**

Thay thế hàm `getBrands()` hiện tại trong `src/Code.gs`:

```javascript
function getBrands() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const names = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .map(r => r[0])
    .filter(b => b !== '');
  const logoMap = getBrandConfigMap();
  return names.map(name => ({ name, logoUrl: logoMap[name] || '' }));
}
```

- [ ] **Step 3: Thêm uploadBrandLogo vào Code.gs**

Thêm vào phần WRITE trong `src/Code.gs`:

```javascript
function uploadBrandLogo(brandName, fileBase64, mimeType) {
  if (!brandName || !fileBase64) throw new Error('brandName và fileBase64 là bắt buộc');

  // Upload lên Google Drive, folder "creative-library/brand-logos"
  const folderName = 'creative-library/brand-logos';
  let folder;
  const folderIt = DriveApp.getFoldersByName(folderName);
  if (folderIt.hasNext()) {
    folder = folderIt.next();
  } else {
    folder = DriveApp.createFolder(folderName);
  }

  // Xóa logo cũ của brand này nếu có
  const oldFiles = folder.getFilesByName(brandName);
  while (oldFiles.hasNext()) oldFiles.next().setTrashed(true);

  // Upload file mới
  const blob = Utilities.newBlob(
    Utilities.base64Decode(fileBase64),
    mimeType || 'image/png',
    brandName
  );
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const logoUrl = `https://drive.google.com/uc?export=view&id=${file.getId()}`;

  // Lưu URL vào BrandConfig sheet
  const sheet = ensureBrandConfigSheet();
  const rows = sheet.getLastRow() < 2 ? [] :
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();

  const existingRow = rows.findIndex(r => r[0] === brandName);
  if (existingRow !== -1) {
    sheet.getRange(existingRow + 2, 2).setValue(logoUrl);
  } else {
    sheet.appendRow([brandName, logoUrl]);
  }

  return { logoUrl };
}
```

- [ ] **Step 4: Thêm uploadBrandLogo vào doGet router**

Trong hàm `doGet` ở `src/Code.gs`, thêm vào phần `if/else if` chain:

```javascript
else if (action === 'uploadBrandLogo') result = uploadBrandLogo(data.brandName, data.fileBase64, data.mimeType);
```

- [ ] **Step 5: Deploy GAS**

```bash
~/.npm-global/bin/clasp push
```

- [ ] **Step 6: Verify getBrands trả về đúng shape**

Mở browser, vào URL GAS web app:
`<GAS_URL>?action=getBrands&token=<token>`

Kết quả phải là array of `{ name, logoUrl }` thay vì array of string.

- [ ] **Step 7: Update api.js — thêm uploadBrandLogo**

Thêm vào cuối `web/src/api.js`:

```javascript
export const uploadBrandLogo = (brandName, file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        // Strip data URL prefix: "data:image/png;base64,<data>"
        const dataUrl = reader.result;
        const [meta, fileBase64] = dataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)[1];
        const result = await gasCall('uploadBrandLogo', { brandName, fileBase64, mimeType });
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Không đọc được file'));
    reader.readAsDataURL(file);
  });
};
```

- [ ] **Step 8: Update App.jsx — brands state shape**

Trong `web/src/App.jsx`, brands state hiện là `string[]`. Sau khi `getBrands()` trả về `{name,logoUrl}[]`, cần update các chỗ dùng:

Thêm handler upload logo:

```javascript
async function handleUploadLogo(brandName, file) {
  try {
    await uploadBrandLogoApi(brandName, file);
    const b = await getBrands();
    setBrands(b);
    showToast('success', `Đã upload logo cho ${brandName}`);
  } catch (err) {
    showToast('error', err.message);
  }
}
```

Thêm import ở đầu file:
```javascript
import { ..., uploadBrandLogo as uploadBrandLogoApi } from './api';
```

Trong JSX, thay `brands.map(...)` → brands là `{name,logoUrl}[]` nên truyền xuống Rail component như sau:
```jsx
<Rail
  brands={brands}
  selectedBrand={selectedBrand}
  onSelectBrand={(b) => { setSelectedBrand(b); setSelectedProduct(null); setSelectedConcept(null); setSelectedCreative(null); }}
  onAddBrand={handleAddBrand}
  onUploadLogo={handleUploadLogo}
  userEmail={userEmail}
  onLogout={handleLogout}
/>
```

- [ ] **Step 9: Commit**

```bash
git add src/Code.gs web/src/api.js web/src/App.jsx
git commit -m "feat: BrandConfig sheet, getBrands returns {name,logoUrl}, uploadBrandLogo action"
```

---

## Task 3: Rail.jsx — icon rail 56px

**Files:**
- Create: `web/src/components/Rail.jsx`

**Interfaces:**
- Consumes:
  - `brands: { name: string, logoUrl: string }[]`
  - `selectedBrand: string | null`
  - `onSelectBrand: (name: string) => void`
  - `onAddBrand: (name: string) => void`
  - `onUploadLogo: (brandName: string, file: File) => void`
  - `userEmail: string`
  - `onLogout: () => void`
- Produces: rendered Rail component

- [ ] **Step 1: Tạo Rail.jsx**

```jsx
// web/src/components/Rail.jsx
import { useRef } from 'react';

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
  const [adding, setAdding] = useLocalState(false);
  const [name, setName] = useLocalState('');
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

// Local useState helper to avoid import repetition
function useLocalState(init) {
  const { useState } = require('react');
  return useState(init);
}
```

> **Lưu ý:** `useLocalState` là pattern không chuẩn — thay bằng import trực tiếp. Xem step 2.

- [ ] **Step 2: Fix import trong Rail.jsx**

`useLocalState` ở trên là placeholder. Thay bằng import đúng cách ở đầu file:

```jsx
// web/src/components/Rail.jsx
import { useRef, useState } from 'react';
```

Và trong `AddBrandButton`, thay `useLocalState` thành `useState`:

```jsx
function AddBrandButton({ onAdd }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef(null);
  // ... phần còn lại giữ nguyên
```

Xóa function `useLocalState` khỏi file.

- [ ] **Step 3: Verify**

Tạm thời thêm `<Rail brands={[{name:'Test',logoUrl:''}]} selectedBrand="Test" onSelectBrand={()=>{}} onAddBrand={()=>{}} onUploadLogo={()=>{}} userEmail="t@t.com" onLogout={()=>{}} />` vào App.jsx để kiểm tra render. Chạy browser, kiểm tra:
- Rail 56px xuất hiện bên trái
- Logo CL gradient ở top
- Brand avatar "TE" hiển thị
- Hover → camera overlay xuất hiện

- [ ] **Step 4: Commit**

```bash
git add web/src/components/Rail.jsx
git commit -m "feat: Rail component — icon rail 56px với brand avatars và logo upload"
```

---

## Task 4: NavFlyout.jsx — navigation flyout 210px

**Files:**
- Create: `web/src/components/NavFlyout.jsx`

**Interfaces:**
- Consumes:
  - `brand: { name: string, logoUrl: string } | null`
  - `creativeCount: number`
  - `liveCount: number`
  - `tree: Record<string, string[]>` — `{ [product]: [concept1, concept2] }`
  - `selectedProduct: string | null`
  - `selectedConcept: string | null`
  - `onSelectProduct: (product: string | null) => void`
  - `onSelectConcept: (concept: string | null) => void`
- Produces: rendered NavFlyout component

- [ ] **Step 1: Tạo NavFlyout.jsx**

```jsx
// web/src/components/NavFlyout.jsx
import { useState } from 'react';

export default function NavFlyout({
  brand, creativeCount, liveCount,
  tree, selectedProduct, selectedConcept,
  onSelectProduct, onSelectConcept
}) {
  const [search, setSearch] = useState('');

  if (!brand) return null;

  const products = Object.keys(tree);
  const filteredProducts = search
    ? products.filter(p =>
        p.toLowerCase().includes(search.toLowerCase()) ||
        (tree[p] || []).some(c => c.toLowerCase().includes(search.toLowerCase()))
      )
    : products;

  function handleProductClick(product) {
    if (selectedProduct === product) {
      onSelectProduct(null);
      onSelectConcept(null);
    } else {
      onSelectProduct(product);
      onSelectConcept(null);
    }
  }

  function handleConceptClick(concept) {
    onSelectConcept(selectedConcept === concept ? null : concept);
  }

  return (
    <nav className="w-[210px] flex-shrink-0 flex flex-col bg-[#fafafa] border-r border-gray-100">
      {/* Header */}
      <div className="px-3.5 py-3 border-b border-gray-100">
        <div className="text-sm font-bold text-gray-900">{brand.name}</div>
        <div className="text-[11px] text-gray-400 mt-0.5">
          {creativeCount} creatives · {liveCount} live
        </div>
      </div>

      {/* Search */}
      <div className="mx-2.5 my-2">
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200
          rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Tìm kiếm..."
            className="flex-1 text-[11px] text-gray-600 outline-none bg-transparent placeholder-gray-300"
          />
        </div>
      </div>

      {/* Product list */}
      {products.length > 0 && (
        <div className="text-[10px] font-semibold text-gray-300 uppercase tracking-wide px-3.5 pb-1 pt-2">
          Products
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-1">
        {filteredProducts.map(product => {
          const isProductActive = selectedProduct === product;
          const concepts = tree[product] || [];

          return (
            <div key={product}>
              <button
                onClick={() => handleProductClick(product)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-all duration-120
                  ${isProductActive
                    ? 'bg-violet-50 text-violet-700 font-medium'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isProductActive ? 'bg-violet-600' : 'bg-gray-300'}`} />
                <span className="truncate">{product}</span>
              </button>

              {/* Concepts — chỉ hiện khi product active */}
              {isProductActive && concepts.map(concept => {
                const isConceptActive = selectedConcept === concept;
                return (
                  <button
                    key={concept}
                    onClick={() => handleConceptClick(concept)}
                    className={`w-full flex items-center gap-2 pl-[30px] pr-2.5 py-1 rounded-md text-left text-[11px] transition-all duration-120
                      ${isConceptActive
                        ? 'bg-violet-50 text-violet-600 font-medium'
                        : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                  >
                    <span className={`w-1 h-1 rounded-full flex-shrink-0 ${isConceptActive ? 'bg-violet-500' : 'bg-gray-300'}`} />
                    <span className="truncate">{concept}</span>
                  </button>
                );
              })}
            </div>
          );
        })}

        {filteredProducts.length === 0 && search && (
          <p className="text-[11px] text-gray-300 text-center py-4">Không tìm thấy</p>
        )}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Verify**

Tạm thời thêm `<NavFlyout brand={{name:'Test',logoUrl:''}} creativeCount={5} liveCount={2} tree={{Product1:['Concept A','Concept B']}} selectedProduct={null} selectedConcept={null} onSelectProduct={()=>{}} onSelectConcept={()=>{}} />` vào App.jsx. Kiểm tra:
- Flyout 210px rộng, nền xám nhạt
- Search input hoạt động filter
- Click product → expand concepts

- [ ] **Step 3: Commit**

```bash
git add web/src/components/NavFlyout.jsx
git commit -m "feat: NavFlyout component — nav flyout 210px với search và product/concept tree"
```

---

## Task 5: App.jsx — wire Rail + NavFlyout, xóa Sidebar

**Files:**
- Modify: `web/src/App.jsx`
- Delete: `web/src/components/Sidebar.jsx` (thay bằng Rail + NavFlyout)

**Interfaces:**
- Consumes: Rail, NavFlyout (từ Task 3, 4)
- `brands` state shape: `{ name: string, logoUrl: string }[]`

- [ ] **Step 1: Update App.jsx imports**

Thay thế import Sidebar:

```jsx
// Xóa:
import Sidebar from './components/Sidebar';

// Thêm:
import Rail from './components/Rail';
import NavFlyout from './components/NavFlyout';
```

- [ ] **Step 2: Thêm handler upload logo vào App.jsx**

Sau `handleAddBrand`, thêm:

```jsx
async function handleUploadLogo(brandName, file) {
  try {
    await uploadBrandLogoApi(brandName, file);
    const b = await getBrands();
    setBrands(b);
    showToast('success', `Đã upload logo cho ${brandName}`);
  } catch (err) {
    showToast('error', err.message);
  }
}
```

Update import api.js:
```jsx
import { getBrands, getDropdowns, addBrand, setAuthToken, getAuthToken,
         syncMeta, getActions, addAction, markActionDone,
         getCodes, saveCode, uploadBrandLogo as uploadBrandLogoApi } from './api';
```

- [ ] **Step 3: Update brands state consumers trong App.jsx**

`selectedBrand` là string (tên), không phải object — giữ nguyên. Chỉ cần update chỗ `onSelectBrand` được gọi với brand name (đã đúng).

Tính `liveCount` và `creativeCount` cho NavFlyout:

```jsx
const brandCreatives = selectedBrand ? (cache[selectedBrand] || []) : [];
const liveCount = brandCreatives.filter(c => c.status === 'Winning' || c.status === 'Scaling').length;
const selectedBrandObj = brands.find(b => b.name === selectedBrand) || null;
```

- [ ] **Step 4: Thay Sidebar trong JSX bằng Rail + NavFlyout**

Trong return của App.jsx, thay thế:

```jsx
{/* Xóa toàn bộ <Sidebar ... /> */}

{/* Thêm: */}
<Rail
  brands={brands}
  selectedBrand={selectedBrand}
  onSelectBrand={(b) => { setSelectedBrand(b); setSelectedProduct(null); setSelectedConcept(null); setSelectedCreative(null); }}
  onAddBrand={handleAddBrand}
  onUploadLogo={handleUploadLogo}
  userEmail={userEmail}
  onLogout={handleLogout}
/>

{selectedBrand && (
  <NavFlyout
    brand={selectedBrandObj}
    creativeCount={brandCreatives.length}
    liveCount={liveCount}
    tree={tree}
    selectedProduct={selectedProduct}
    selectedConcept={selectedConcept}
    onSelectProduct={(p) => { setSelectedProduct(p); setSelectedConcept(null); setSelectedCreative(null); }}
    onSelectConcept={(c) => { setSelectedConcept(c); setSelectedCreative(null); }}
  />
)}
```

- [ ] **Step 5: Update root div className**

Thay `bg-slate-950` thành `bg-[#f7f7fa]`:

```jsx
<div className="flex h-screen bg-[#f7f7fa] overflow-hidden font-sans text-sm text-gray-800">
```

- [ ] **Step 6: Xóa Sidebar.jsx**

```bash
rm "web/src/components/Sidebar.jsx"
```

- [ ] **Step 7: Verify**

Mở browser. Kiểm tra:
- Rail 56px bên trái, NavFlyout 210px kế tiếp
- Chọn brand → flyout hiện ra với tree đúng
- Flyout ẩn khi chưa chọn brand (Dashboard hiển thị thay thế)

- [ ] **Step 8: Commit**

```bash
git add web/src/App.jsx web/src/components/Rail.jsx
git rm web/src/components/Sidebar.jsx
git commit -m "feat: wire Rail + NavFlyout, remove Sidebar — app shell light theme"
```

---

## Task 6: MainArea — topbar + metric bar redesign

**Files:**
- Modify: `web/src/components/MainArea.jsx`

**Interfaces:**
- Không thay đổi props interface — chỉ re-skin UI

- [ ] **Step 1: Update TopBar trong MainArea.jsx**

Thay toàn bộ `{/* TopBar */}` section (div từ dòng `<div className="flex items-center gap-3 px-4 py-3 bg-slate-900..."`):

```jsx
{/* TopBar */}
<div className="flex items-center gap-2 px-4 h-[52px] bg-white border-b border-gray-100 flex-shrink-0">
  {/* Breadcrumb */}
  <div className="flex items-center gap-1 text-xs">
    <span className="text-gray-400">{selectedBrand}</span>
    {selectedProduct && <>
      <span className="text-gray-200">/</span>
      <span className="text-gray-400">{selectedProduct}</span>
    </>}
    {selectedConcept && <>
      <span className="text-gray-200">/</span>
      <span className="text-gray-700 font-semibold">{selectedConcept}</span>
    </>}
  </div>

  <div className="ml-auto flex items-center gap-2">
    {/* Filter chips */}
    <div className="flex gap-1.5">
      <select value={filters.format} onChange={e => setFilters(f => ({ ...f, format: e.target.value }))}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 bg-white
          focus:outline-none focus:border-violet-400 hover:border-violet-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <option value="">Format ▾</option>
        {(dropdowns.format || []).map(f => <option key={f}>{f}</option>)}
      </select>
      <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
        className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-500 bg-white
          focus:outline-none focus:border-violet-400 hover:border-violet-300 transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <option value="">Status ▾</option>
        {(dropdowns.status || []).map(s => <option key={s}>{s}</option>)}
      </select>
    </div>

    {/* View toggle */}
    <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 border border-gray-200">
      {[['gallery', 'Gallery'], ['table', 'Table'], ['matrix', 'Matrix']].map(([mode, label]) => (
        <button key={mode} onClick={() => onViewModeChange(mode)}
          className={`px-2.5 py-1 text-xs rounded-md transition-all font-medium
            ${viewMode === mode
              ? 'bg-white text-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
              : 'text-gray-400 hover:text-gray-600'}`}>
          {label}
        </button>
      ))}
    </div>

    {/* Actions */}
    <button onClick={onActionsToggle}
      className={`relative flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors
        ${actionsOpen
          ? 'bg-amber-50 border-amber-200 text-amber-600'
          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-500 shadow-[0_1px_2px_rgba(0,0,0,0.04)]'}`}>
      ⚡ Actions
      {actions.length > 0 && (
        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
          {actions.length}
        </span>
      )}
    </button>

    {/* Sync Meta */}
    <button onClick={onSync} disabled={syncing}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg
        bg-violet-50 border border-violet-200 text-violet-700
        hover:bg-violet-100 disabled:opacity-40 transition-colors"
      title={lastSynced ? `Last synced: ${lastSynced}` : 'Chưa sync'}>
      <span className={syncing ? 'animate-spin inline-block' : ''}>⟳</span>
      {syncing ? 'Syncing…' : 'Sync Meta'}
    </button>

    <span className="text-xs text-gray-400 font-medium">{filtered.length}</span>

    {/* New */}
    <button onClick={handleNewCreative}
      className="bg-violet-700 hover:bg-violet-800 text-white text-xs font-semibold
        px-3 py-1.5 rounded-lg transition-colors shadow-sm shadow-violet-200">
      + New
    </button>
  </div>
</div>
```

- [ ] **Step 2: Thêm Metric Bar sau TopBar**

Sau TopBar div, thêm:

```jsx
{/* Metric Bar */}
<div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-100 flex-shrink-0">
  {[
    { key: 'spend', label: 'Spend', color: 'bg-violet-100 text-violet-700' },
    { key: 'roas',  label: 'ROAS',  color: 'bg-pink-100 text-pink-700' },
    { key: 'ctr',   label: 'CTR',   color: 'bg-green-100 text-green-700' },
  ].map(({ key, label, color }, i) => (
    <div key={key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>
      <span className="w-3.5 h-3.5 rounded-full bg-current opacity-70 flex items-center justify-center text-white text-[8px] font-black"
        style={{ background: 'currentColor', color: 'white', opacity: 1 }}>
        {i + 1}
      </span>
      {label}
    </div>
  ))}
  <div className="ml-auto text-xs text-gray-400 font-medium">{filtered.length} creatives</div>
</div>
```

- [ ] **Step 3: Tính lastSynced trong MainArea**

Thêm vào đầu MainArea function (sau các useState hiện có):

```jsx
const lastSynced = useMemo(() => {
  const times = creatives.map(c => c.last_synced).filter(Boolean);
  if (!times.length) return null;
  const latest = new Date(Math.max(...times.map(t => new Date(t).getTime())));
  const diffMs = Date.now() - latest.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs} giờ trước`;
  return latest.toLocaleDateString('vi-VN');
}, [creatives]);
```

Thêm import `useMemo` vào đầu file:
```jsx
import { useState, useMemo } from 'react';
```

- [ ] **Step 4: Update content area background**

Tìm `<div className="flex-1 overflow-y-auto p-4 bg-slate-950">` và thay thành:

```jsx
<div className="flex-1 overflow-y-auto p-4 bg-[#f7f7fa]">
```

- [ ] **Step 5: Update Actions Queue Panel sang light theme**

Tìm `actionsOpen &&` block, thay màu:

```jsx
{actionsOpen && (
  <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 flex-shrink-0">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold text-amber-600">⚡ Pending Actions ({actions.length})</span>
      <button onClick={onActionsToggle} className="text-amber-400 hover:text-amber-600 text-xs">✕</button>
    </div>
    {actions.length === 0 ? (
      <p className="text-xs text-amber-400">Không có action nào đang chờ.</p>
    ) : (
      <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
        {actions.map(a => (
          <div key={a.id} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-100 text-xs shadow-sm">
            <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px]
              ${a.action === 'Scale' ? 'bg-green-100 text-green-700' :
                a.action === 'Kill'  ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'}`}>
              {a.action}
            </span>
            <span className="text-gray-500 font-mono">{a.creative_id}</span>
            <span className="text-gray-400 flex-1">{a.brand}</span>
            {a.notes && <span className="text-gray-400 truncate max-w-[120px]">{a.notes}</span>}
            <span className="text-gray-300">{a.created_at ? new Date(a.created_at).toLocaleDateString('vi-VN') : ''}</span>
            <button onClick={() => onMarkDone(a.id)}
              className="ml-auto text-xs text-green-600 hover:text-green-700 font-semibold whitespace-nowrap">
              ✓ Done
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
)}
```

- [ ] **Step 6: Verify**

Mở browser, chọn 1 brand. Kiểm tra:
- Topbar trắng, breadcrumb đúng
- Sync Meta button tím nhạt
- Metric bar hiện Spend / ROAS / CTR chips
- Actions panel sang màu amber nhạt

- [ ] **Step 7: Commit**

```bash
git add web/src/components/MainArea.jsx
git commit -m "feat: MainArea topbar + metric bar light theme redesign"
```

---

## Task 7: CreativeCard — full redesign

**Files:**
- Modify: `web/src/components/CreativeCard.jsx`

**Interfaces:**
- Consumes: `{ creative, isSelected, onClick }` — không thay đổi
- `creative` object có các field: `hook, concept, angle, format, status, roas, spend, ctr, preview_url, last_synced, assignee, id`

- [ ] **Step 1: Rewrite CreativeCard.jsx**

```jsx
// web/src/components/CreativeCard.jsx

const STATUS_GRADIENT = {
  Winning:  'from-emerald-100 to-emerald-200',
  Scaling:  'from-violet-100 to-violet-200',
  Testing:  'from-amber-100 to-amber-200',
  Fatigued: 'from-orange-100 to-orange-200',
  Killed:   'from-red-100 to-red-200',
};

const STATUS_BADGE = {
  Winning:  'bg-emerald-100 text-emerald-700 border-emerald-200',
  Scaling:  'bg-violet-100 text-violet-700 border-violet-200',
  Testing:  'bg-amber-100 text-amber-700 border-amber-200',
  Fatigued: 'bg-orange-100 text-orange-700 border-orange-200',
  Killed:   'bg-red-100 text-red-700 border-red-200',
};

const FORMAT_STYLE = {
  'Video 9:16': 'bg-blue-50 text-blue-600',
  'Static 1:1': 'bg-pink-50 text-pink-600',
  'Static 4:5': 'bg-fuchsia-50 text-fuchsia-600',
  'Carousel':   'bg-green-50 text-green-600',
  'Story':      'bg-orange-50 text-orange-600',
};

function formatSpend(val) {
  const n = parseFloat(val);
  if (!n) return null;
  if (n >= 1000000) return `₫${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `₫${Math.round(n / 1000)}k`;
  return `₫${n}`;
}

function formatRoas(val) {
  const n = parseFloat(val);
  if (!n) return null;
  return n.toFixed(1) + 'x';
}

function formatCtr(val) {
  const n = parseFloat(val);
  if (!n) return null;
  return n.toFixed(2) + '%';
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-400">{label}</span>
      <span className="text-[11px] font-semibold text-gray-700">
        {value || <span className="text-gray-200 font-normal">—</span>}
      </span>
    </div>
  );
}

export default function CreativeCard({ creative, isSelected, onClick }) {
  const { hook, format, status, roas, spend, ctr, preview_url, assignee, last_synced, id } = creative;

  const gradientClass = STATUS_GRADIENT[status] || 'from-gray-100 to-gray-200';
  const badgeClass    = STATUS_BADGE[status]    || 'bg-gray-100 text-gray-600 border-gray-200';
  const formatClass   = FORMAT_STYLE[format]    || 'bg-gray-50 text-gray-500';
  const hasSyncData   = !!last_synced;

  return (
    <div
      onClick={() => onClick(creative)}
      className={`bg-white rounded-xl overflow-hidden cursor-pointer transition-all duration-150
        ${isSelected
          ? 'border-2 border-violet-600 shadow-[0_0_0_3px_rgba(109,40,217,0.12),0_4px_16px_rgba(109,40,217,0.12)]'
          : 'border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.05)] hover:border-violet-200 hover:shadow-[0_4px_16px_rgba(109,40,217,0.08)] hover:-translate-y-px'}`}
    >
      {/* Thumbnail */}
      <div className={`relative h-[130px] bg-gradient-to-br ${gradientClass} flex items-center justify-center overflow-hidden`}>
        {preview_url
          ? <img src={preview_url} alt={hook} className="w-full h-full object-cover" />
          : <span className="text-4xl opacity-20">🎨</span>}

        {/* Status badge */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}
          style={{ backdropFilter: 'blur(8px)' }}>
          {status}
        </div>
      </div>

      {/* Body */}
      <div className="p-3 pb-3.5">
        {/* Code */}
        {id && (
          <div className="font-mono text-[10px] text-gray-300 mb-1 tracking-wide">{id}</div>
        )}

        {/* Hook */}
        <div className="text-xs font-semibold text-gray-800 leading-snug mb-2.5 line-clamp-2">
          {hook || '(no hook)'}
        </div>

        {/* Metrics */}
        <div className="flex flex-col gap-1 mb-2.5">
          <MetricRow label="Spend" value={hasSyncData ? formatSpend(spend) : null} />
          <MetricRow label="ROAS"  value={hasSyncData ? formatRoas(roas) : null} />
          <MetricRow label="CTR"   value={hasSyncData ? formatCtr(ctr) : null} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          {format && (
            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${formatClass}`}>
              {format}
            </span>
          )}
          {assignee && (
            <span className="text-[10px] text-gray-300 ml-auto">{assignee}</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Chọn brand có creatives. Kiểm tra:
- Card trắng, thumbnail gradient màu theo status
- Status badge float top-right
- Metric rows Spend/ROAS/CTR hiển thị (hoặc "—" nếu chưa sync)
- Hover: border violet nhạt, shadow, translateY
- Selected: border violet đậm, double ring

- [ ] **Step 3: Commit**

```bash
git add web/src/components/CreativeCard.jsx
git commit -m "feat: CreativeCard redesign — light theme, gradient thumbnail, Spend/ROAS/CTR metrics"
```

---

## Task 8: DetailPanel — re-skin sang light

**Files:**
- Modify: `web/src/components/DetailPanel.jsx`

**Interfaces:**
- Không thay đổi props interface

- [ ] **Step 1: Thay MetricBox component trong DetailPanel.jsx**

Tìm hàm `MetricBox` (đầu file), thay:

```jsx
function MetricBox({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 text-center ${highlight ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
      <div className={`text-base font-bold ${highlight ? 'text-green-700' : 'text-gray-700'}`}>
        {value || <span className="text-gray-300">—</span>}
      </div>
      <div className="text-[11px] text-gray-400 mt-0.5">{label}</div>
    </div>
  );
}
```

- [ ] **Step 2: Re-skin wrapper DetailPanel**

Tìm return statement của `DetailPanel`, thay outer div:

```jsx
// Tìm:
<div className={`fixed inset-y-0 right-0 w-80 bg-slate-900 border-l border-slate-700 ...`}>

// Thay thành:
<div className={`fixed inset-y-0 right-0 w-[280px] bg-white border-l border-gray-100
  shadow-[-8px_0_32px_rgba(0,0,0,0.06)] flex flex-col z-40
  transition-transform duration-[250ms] cubic-bezier(0.2,0,0,1)`}>
```

- [ ] **Step 3: Re-skin header DetailPanel**

Tìm header section (có code + close button), thay classNames:

```jsx
{/* Header */}
<div className="flex items-center justify-between px-4 py-3.5 border-b border-gray-100 flex-shrink-0">
  <span className="text-sm font-bold text-gray-800">{creative.ad_name_code || creative.id}</span>
  <button onClick={onClose}
    className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center text-gray-400
      hover:bg-gray-200 hover:text-gray-600 transition-colors text-sm">
    ✕
  </button>
</div>
```

- [ ] **Step 4: Re-skin section labels và values**

Tất cả label trong panel: thay `text-slate-500` → `text-gray-400`, `text-slate-200` → `text-gray-700`, `bg-slate-800` → `bg-gray-50`, `border-slate-700` → `border-gray-100`.

Dùng find-replace trong file với các class cụ thể:

| Cũ | Mới |
|---|---|
| `text-slate-500` | `text-gray-400` |
| `text-slate-400` | `text-gray-500` |
| `text-slate-200` | `text-gray-700` |
| `text-slate-100` | `text-gray-800` |
| `bg-slate-800` | `bg-gray-50` |
| `bg-slate-900` | `bg-gray-50` |
| `border-slate-700` | `border-gray-100` |
| `border-slate-600` | `border-gray-200` |

- [ ] **Step 5: Re-skin action buttons**

Tìm "Edit" và "Queue action" buttons, thay:

```jsx
<button onClick={() => setEditOpen(true)}
  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-violet-300
    text-violet-700 bg-violet-50 hover:bg-violet-100 transition-colors">
  Edit
</button>
<button onClick={() => { /* queue action logic */ }}
  className="flex-1 py-2 rounded-lg text-xs font-semibold border border-gray-200
    text-gray-500 bg-white hover:bg-gray-50 transition-colors">
  Queue action
</button>
```

- [ ] **Step 6: Re-skin select/input fields trong panel**

Tất cả `<select>` và `<input>` trong DetailPanel: thay `bg-slate-800 border-slate-600` → `bg-white border-gray-200`, `text-slate-200` → `text-gray-700`.

- [ ] **Step 7: Verify**

Click vào 1 creative card. Kiểm tra:
- Panel trắng slide từ phải
- Header rõ ràng, các section có label/value đúng màu
- Buttons đúng style
- Close button hoạt động

- [ ] **Step 8: Commit**

```bash
git add web/src/components/DetailPanel.jsx
git commit -m "style: DetailPanel re-skin sang light theme"
```

---

## Task 9: Dashboard + LoginPage + BrandCard re-skin

**Files:**
- Modify: `web/src/components/Dashboard.jsx`
- Modify: `web/src/components/BrandCard.jsx`
- Modify: `web/src/components/LoginPage.jsx`

**Interfaces:**
- Không thay đổi props — chỉ re-skin

- [ ] **Step 1: Read BrandCard.jsx để hiểu structure hiện tại**

```bash
cat "web/src/components/BrandCard.jsx"
```

- [ ] **Step 2: Re-skin Dashboard.jsx**

Tìm và thay:

```jsx
// Outer wrapper:
<main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f7f7fa]">

// Heading:
<h1 className="text-2xl font-bold text-gray-800">Creative Library</h1>
<p className="text-sm text-gray-400 mt-1">Select a brand to get started</p>

// Actions banner:
<div className="flex items-center justify-between px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex-shrink-0">
  <span className="text-xs font-medium text-amber-600">
    ⚡ {actions.length} pending action{actions.length !== 1 ? 's' : ''}
  </span>
  <button onClick={onActionsToggle} className="text-xs text-amber-500 hover:text-amber-700 transition-colors">
    View all →
  </button>
</div>
```

- [ ] **Step 3: Re-skin BrandCard.jsx**

Thay toàn bộ dark classes sang light. Pattern chung:
- Card background: `bg-white border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-200`
- Heading: `text-gray-800`
- Sub text: `text-gray-400`
- Stats: `text-gray-600`
- Accent: giữ `violet-*`

- [ ] **Step 4: Re-skin LoginPage.jsx**

```jsx
// Background:
<div className="min-h-screen bg-[#f7f7fa] flex items-center justify-center">

// Card:
<div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-gray-100 p-10 w-full max-w-sm">

// Title:
<h1 className="text-xl font-bold text-gray-800">Creative Library</h1>
<p className="text-sm text-gray-400 mt-1">Đăng nhập để tiếp tục</p>

// Google button: giữ nguyên style Google button hiện tại (trắng + shadow)
```

- [ ] **Step 5: Verify**

- Logout → LoginPage trắng, card shadow nhẹ
- Login → Dashboard trắng với brand cards sáng

- [ ] **Step 6: Commit**

```bash
git add web/src/components/Dashboard.jsx web/src/components/BrandCard.jsx web/src/components/LoginPage.jsx
git commit -m "style: Dashboard, BrandCard, LoginPage re-skin sang light theme"
```

---

## Task 10: MatrixView re-skin

**Files:**
- Modify: `web/src/components/MatrixView.jsx`

**Interfaces:**
- Không thay đổi props

- [ ] **Step 1: Read MatrixView.jsx**

```bash
cat "web/src/components/MatrixView.jsx"
```

- [ ] **Step 2: Re-skin toàn bộ dark classes**

Pattern replace:

| Cũ | Mới |
|---|---|
| `bg-slate-900` / `bg-slate-800` | `bg-white` / `bg-gray-50` |
| `border-slate-700` / `border-slate-600` | `border-gray-100` / `border-gray-200` |
| `text-slate-*` | `text-gray-*` (map 100→700, 200→600, 300→500, 400→400, 500→400, 600→300) |
| `hover:bg-slate-800` | `hover:bg-gray-50` |
| `bg-violet-600` header cells | giữ nguyên accent violet |

- [ ] **Step 3: Verify**

Switch sang Matrix view. Kiểm tra grid hiển thị đúng màu light.

- [ ] **Step 4: Commit**

```bash
git add web/src/components/MatrixView.jsx
git commit -m "style: MatrixView re-skin sang light theme"
```

---

## Task 11: CreativeModal + CreativeForm re-skin

**Files:**
- Modify: `web/src/components/CreativeModal.jsx`
- Modify: `web/src/components/CreativeForm.jsx`

**Interfaces:**
- Không thay đổi props

- [ ] **Step 1: Read cả 2 files**

```bash
cat "web/src/components/CreativeModal.jsx"
cat "web/src/components/CreativeForm.jsx"
```

- [ ] **Step 2: Re-skin CreativeModal.jsx**

Modal overlay: `bg-black/20` (giảm từ `/60`).  
Modal box: `bg-white border border-gray-100 shadow-[0_16px_48px_rgba(0,0,0,0.12)] rounded-2xl`.  
Header: `text-gray-800 border-b border-gray-100`.

- [ ] **Step 3: Re-skin CreativeForm.jsx**

Tất cả `<input>`, `<select>`, `<textarea>`:
```jsx
className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
  bg-white focus:outline-none focus:border-violet-400 placeholder-gray-300"
```

Labels: `text-xs font-medium text-gray-500`.  
Submit button: `bg-violet-700 hover:bg-violet-800 text-white`.

- [ ] **Step 4: Verify**

Click "+ New" → modal mở, form trắng sạch với labels rõ ràng.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/CreativeModal.jsx web/src/components/CreativeForm.jsx
git commit -m "style: CreativeModal + CreativeForm re-skin sang light theme"
```

---

## Task 12: Toast re-skin + final polish

**Files:**
- Modify: `web/src/App.jsx` (toast)

- [ ] **Step 1: Re-skin toast trong App.jsx**

Tìm toast JSX (cuối return), thay:

```jsx
{toast && (
  <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium z-50
    border ${toast.type === 'success'
      ? 'bg-white text-green-700 border-green-200 shadow-green-100'
      : 'bg-white text-red-600 border-red-200 shadow-red-100'}`}>
    {toast.type === 'success' ? '✓ ' : '✕ '}{toast.msg}
  </div>
)}
```

- [ ] **Step 2: Kiểm tra toàn bộ app lần cuối**

Thực hiện full walkthrough:
1. Login page → đăng nhập
2. Dashboard → click brand
3. NavFlyout → click product → click concept
4. Gallery view → cards với metrics
5. Click card → DetailPanel slide ra
6. Table view → kiểm tra màu
7. Matrix view → kiểm tra màu
8. Click Sync Meta → spinner
9. Hover brand icon trong Rail → camera overlay
10. "+ New" → modal form

- [ ] **Step 3: Final commit**

```bash
git add web/src/App.jsx
git commit -m "style: toast re-skin, final light theme polish"
```
