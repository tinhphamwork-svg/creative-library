# Creative Library Web App — Design Spec

**Date:** 2026-06-06  
**Status:** Approved

---

## Overview

Rebuild Creative Library từ GAS sidebar (300px) thành standalone web app tương tự [motionapp.com](https://motionapp.com). Dữ liệu vẫn lưu trên Google Sheets. Web app cho phép nhập trực tiếp và đồng bộ với Sheets.

---

## Section 1 — Architecture & Tech Stack

```
┌─────────────────────────────┐     fetch/CORS     ┌──────────────────────────┐
│   React + Vite (Frontend)   │ ─────────────────▶ │  GAS Web App (Backend)   │
│   GitHub Pages / Vercel     │ ◀───────────────── │  doGet / doPost          │
│                             │      JSON          │  script.google.com/…/exec│
└─────────────────────────────┘                    └──────────┬───────────────┘
                                                              │ SpreadsheetApp
                                                   ┌──────────▼───────────────┐
                                                   │     Google Sheets        │
                                                   │  Tab: Config             │
                                                   │  Tab: Nike               │
                                                   │  Tab: Adidas             │
                                                   │  Tab: ...                │
                                                   └──────────────────────────┘
```

- **Frontend**: React 18 + Vite, deploy static lên GitHub Pages (free)
- **Styling**: Tailwind CSS
- **Backend**: GAS — expose `doGet`/`doPost` với query param `action`
- **Auth**: GAS deploy as "Execute as: Me, Access: Anyone" — không cần user login. GAS URL giữ private.
- **CORS**: GAS `ContentService` return với header cho phép cross-origin từ frontend domain

---

## Section 2 — Data Structure (Google Sheets Schema)

### Tab `Config`

| Brand |
|-------|
| Nike |
| Adidas |

Mỗi row = 1 brand name. Brand name phải khớp chính xác với tên tab tương ứng.

### Tab `{BrandName}` (ví dụ: `Nike`)

Mỗi row = 1 creative.

| Column | Type | Notes |
|--------|------|-------|
| `id` | string | Auto-generated: `CR-YYYYMMDD-XXXX`, unique per brand |
| `product` | string | Product line — dùng để build sidebar tree |
| `concept` | string | Concept name — dùng để build sidebar tree |
| `angle` | string | Sub-angle của concept |
| `hook` | string | Hook text / tên asset |
| `format` | enum | Video 9:16 · Static 1:1 · Static 4:5 · Carousel · Story |
| `status` | enum | Testing · Winning · Scaling · Fatigued · Killed |
| `brief_status` | enum | Not Briefed · Briefed · In Production · Ready to Launch · Live |
| `assignee` | string | |
| `launch_date` | date | ISO 8601 |
| `spend` | number | |
| `roas` | number | |
| `ctr` | number | % |
| `cpm` | number | |
| `preview_url` | string | Link thumbnail hoặc video để hiện trong card |
| `notes` | string | Performance notes |

**Sidebar tree được derive động** — không có sheet riêng cho Product hay Concept. App đọc unique values của cột `product` và `concept` để build tree. Thêm product/concept mới = gõ tên mới vào form khi tạo creative.

---

## Section 3 — GAS API Layer

### Read — `doGet(?action=…)`

| Action | Params | Returns |
|--------|--------|---------|
| `getBrands` | — | `string[]` — list brand names từ Config tab |
| `getCreatives` | `brand=Nike` | `Creative[]` — tất cả rows của tab đó |
| `getDropdowns` | — | Object chứa enum values cho format, status, brief_status |

### Write — `doPost(body: {action, …})`

| Action | Payload | Effect |
|--------|---------|--------|
| `saveCreative` | `{brand, row}` | Append nếu `id` mới, update row nếu `id` đã tồn tại |
| `deleteCreative` | `{brand, id}` | Xóa row có `id` đó khỏi tab brand |
| `addBrand` | `{brand}` | Thêm vào Config tab + tạo sheet tab mới với headers |

### Caching & Optimistic Updates

- Sau khi `getCreatives` load, data giữ trong React state (in-memory cache per brand)
- Mọi save/delete cập nhật state local ngay lập tức (optimistic update) — không chờ GAS
- GAS call chạy background để persist vào Sheets
- Nếu GAS call thất bại: revert state + hiện error toast

---

## Section 4 — Frontend Components & Navigation

### Component Tree

```
App
├── Sidebar
│   ├── BrandList
│   │   └── ProductList (unique products của brand đã load)
│   │       └── ConceptList (unique concepts của product)
│   └── AddBrandButton
├── MainArea
│   ├── TopBar
│   │   ├── Breadcrumb (Brand / Product / Concept)
│   │   ├── ViewToggle (Gallery ↔ Table)
│   │   ├── FilterBar (format, status, brief_status, assignee)
│   │   └── NewButton → CreativeModal
│   ├── GalleryView
│   │   └── CreativeCard (thumbnail, hook, status badge, ROAS)
│   └── TableView (sortable columns)
└── DetailPanel (slide-in khi click card)
    ├── MetricsGrid (ROAS, CTR, Spend, CPM)
    ├── FieldList (concept, angle, format, status, brief_status, notes…)
    └── ActionButtons
        ├── EditButton → CreativeModal
        └── DeleteButton → ConfirmDialog
CreativeModal (shared, dùng cho cả New và Edit)
    └── CreativeForm (controlled form, tất cả fields)
```

### Navigation State

3 biến state xác định view hiện tại:

| State | Type | Effect |
|-------|------|--------|
| `selectedBrand` | string | Load data tab đó từ GAS (nếu chưa cache) |
| `selectedProduct` | string \| null | Client-side filter theo cột `product` |
| `selectedConcept` | string \| null | Client-side filter theo cột `concept` |

Click brand trong sidebar → trigger GAS `getCreatives` call. Product/Concept filter là client-side, không call GAS thêm.

### View Toggle

- **Gallery** (default): Grid 3-4 columns, mỗi card hiện thumbnail, hook, status badge, ROAS
- **Table**: Sortable table — columns: Hook, Product, Concept, Format, Status, ROAS, CTR, Spend

### Filter Bar

Filter client-side theo: `format`, `status`, `brief_status`, `assignee`. Kết hợp được nhiều filter cùng lúc.

---

## Section 5 — Key UX Flows

### 1. Browse Creatives
Sidebar → click Brand → load data → click Product → filter → click Concept → thấy cards → click card → Detail Panel slide in từ phải

### 2. Add Creative
`+ New` (top bar) → `CreativeModal` mở form trống → `product`/`concept` field là text input với autocomplete từ existing values → Fill → Save → optimistic append vào gallery → GAS ghi Sheets background

### 3. Edit Creative
Click card → Detail Panel → `Edit` → `CreativeModal` pre-filled → sửa → Save → optimistic update

### 4. Delete Creative
Detail Panel → `Delete` → confirm dialog → optimistic remove khỏi gallery → GAS xóa row

### 5. Add New Brand
Sidebar → `+ Add Brand` → nhập tên → GAS tạo tab mới + thêm Config → brand xuất hiện trong sidebar ngay

### 6. Add New Product / Concept
Không có form riêng. Gõ tên mới vào field `product` hoặc `concept` khi tạo/edit creative. Sidebar derive lại tree tự động từ unique values.

---

## File Structure (sau khi build)

```
Creative app/
├── src/                        # GAS backend (giữ nguyên folder)
│   ├── Code.gs                 # Refactor: thêm doGet/doPost, xóa sidebar logic
│   └── appsscript.json
├── web/                        # React frontend (mới)
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── MainArea.jsx
│   │   │   ├── CreativeCard.jsx
│   │   │   ├── DetailPanel.jsx
│   │   │   ├── CreativeModal.jsx
│   │   │   └── CreativeForm.jsx
│   │   ├── hooks/
│   │   │   └── useSheets.js    # GAS API calls + cache logic
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── docs/
    └── superpowers/specs/
        └── 2026-06-06-creative-library-webapp-design.md
```

---

## Out of Scope

- Real-time sync / websockets (Sheets không support)
- Multi-user conflict resolution
- Image/video hosting (chỉ store URL, không upload file)
- Ads platform integration (Meta, Google Ads) — manual input only
