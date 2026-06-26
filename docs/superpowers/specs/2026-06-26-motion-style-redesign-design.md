# Creative Library — Motion-style Redesign (Option B)

**Date:** 2026-06-26  
**Status:** Approved  

---

## Overview

Full redesign của Creative Library web app theo aesthetics của Motion app: light theme, icon rail sidebar, nav flyout, metric-rich creative cards, và smooth transitions. Giữ nguyên toàn bộ logic/data — chỉ thay đổi UI layer.

---

## 1. Layout Architecture

Bố cục 4 zone ngang:

```
[Rail 56px] [Nav Flyout 210px] [Main Content flex-1] [Detail Panel 280px — khi có card selected]
```

### 1.1 Icon Rail (56px)

- Background: `#ffffff`, border-right: `#f0f0f5`
- App logo ở top (violet gradient, 32×32, border-radius 9px)
- Brand icons xếp dọc (36×36, border-radius 10px):
  - **Có logo upload:** hiển thị ảnh brand, hover → overlay camera icon để re-upload
  - **Chưa có logo:** fallback 2 chữ viết tắt, background `#f5f5f8`, text `#9ca3af`
  - **Active brand:** background `#ede9fe`, text `#6d28d9`, accent bar 3px màu violet ở cạnh trái
- Divider mỏng giữa brand list và "Add brand" button
- Bottom: avatar user (32px circle, violet gradient)
- Transition: `all 150ms ease` khi hover/active

### 1.2 Nav Flyout (210px)

- Background: `#fafafa`, border-right: `#f0f0f5`
- Header: brand name (font-weight 700) + subtitle "N creatives · N live"
- Search input inline (background trắng, border `#e5e7eb`, border-radius 8px)
- Section label "Products" (uppercase, 10px, color `#d1d5db`)
- Product items: hover → `#f3f4f6`, active → `#ede9fe` + text `#6d28d9`
- Concept children: indent 30px, active → `#f5f3ff` + text `#6d28d9`
- Expand/collapse concept list khi click product

### 1.3 Topbar (height 52px)

- Background: `#ffffff`, border-bottom: `#ebebf0`
- Left: Breadcrumb — `Brand / Product / Concept` (muted → muted → bold)
- Right (trái sang phải):
  - Filter chips: "Last 14 days ▾", "Format ▾", "Status ▾" — style: border `#e5e7eb`, hover border `#a78bfa`
  - View toggle: Table / Gallery / Matrix — active tab có white bg + shadow
  - **Sync Meta** button — `#f5f3ff` bg, border `#ddd6fe`, text `#6d28d9`, icon `⟳` (animate-spin khi syncing)
  - **+ New** button — `#6d28d9` bg, white text, box-shadow violet

### 1.4 Metric Selector Bar

Bar nằm giữa topbar và content grid:

- Metric chips (có số thứ tự màu): Spend (violet), ROAS (pink), CTR (green)
- Mỗi chip có × để remove
- "+ Add metric" button dạng dashed border
- Right side: count badge + view mode icon buttons (list / chart / grid)

### 1.5 Content Grid

- Background: `#f7f7fa`
- Padding: 16px, gap: 12px
- **Gallery mode:** 4 cột (responsive xuống 3, 2 tùy width)
- **Table mode:** giữ nguyên như hiện tại
- **Matrix mode:** giữ nguyên như hiện tại

---

## 2. Creative Card (Gallery mode)

```
┌─────────────────────────┐
│  [Thumbnail 130px tall] │  ← gradient bg hoặc ảnh thật
│  [Status badge]         │  ← float top-right
├─────────────────────────┤
│  CRC-SC-CV-001          │  ← code, monospace 10px, #9ca3af
│  Hook: Da mặt sáng...   │  ← name, 12px 600, #1f2937
│  ─────────────────────  │
│  Spend      ₫15.7M +78% │  ← metric row
│  ROAS       4.5   +44%  │
│  CTR        2.3%  +12%  │  ← metric row
│  ─────────────────────  │
│  [Video 9:16]    Minh   │  ← format tag + assignee
└─────────────────────────┘
```

**Card states:**
- Default: border `#ebebf0`, shadow `0 1px 3px rgba(0,0,0,0.05)`
- Hover: border `#c4b5fd`, shadow violet, translateY(-1px)
- Selected: border `#7c3aed`, double ring shadow

**Thumbnail:**
- Nếu creative có link ảnh/video thumbnail → hiển thị ảnh thật (object-fit: cover)
- Fallback: gradient màu theo status (live=green, review=amber, draft=indigo, paused=red)
- Status badge float top-right với backdrop-blur

**Metrics hiển thị:**
- Metrics mặc định: Spend, ROAS, CTR
- Nếu creative chưa live (draft) → Spend/ROAS/CTR hiển thị "—"
- Delta % hiển thị màu green nếu dương, red nếu âm

---

## 3. Detail Panel (280px)

Slide từ phải khi click card. Không thay đổi nhiều so với hiện tại, chỉ re-skin sang light:

- Background: `#ffffff`, border-left: `#ebebf0`
- Header: code + × close button
- Sections: label (10px uppercase muted) + value
- Status badge có colored dot
- Action buttons bottom: "Edit" (violet outline) + "Queue action" (gray)
- Transition: `transform 250ms cubic-bezier(0.2, 0, 0, 1)` slide từ phải

---

## 4. Brand Logo Upload

**UX flow:**
1. Hover vào brand icon trong rail → hiện overlay tối 40% + icon camera ở giữa
2. Click → mở file picker (PNG/JPG, max 2MB)
3. Upload ảnh lên Google Drive (folder `creative-library/brand-logos/`)
4. Lưu URL vào Google Sheets tab config (cột `brand_logo_url`)
5. Rail load URL đó thay chữ viết tắt
6. Fallback: nếu URL lỗi hoặc chưa có → hiển thị 2 chữ viết tắt

**API change cần thiết:**
- `getBrands()` trả về array of `{ name, logoUrl }` thay vì array of string
- `uploadBrandLogo(brandName, file)` → upload + save URL
- Backend (Code.gs): thêm tab `BrandConfig` trong Sheet với cột `name | logoUrl`

---

## 5. Color System

| Token | Value | Dùng cho |
|-------|-------|----------|
| `bg-root` | `#f7f7fa` | Content area background |
| `bg-surface` | `#ffffff` | Cards, topbar, rail, panel |
| `bg-subtle` | `#fafafa` | Nav flyout |
| `border` | `#ebebf0` | Dividers, card borders |
| `border-strong` | `#e5e7eb` | Input borders |
| `text-primary` | `#1f2937` | Card names, headings |
| `text-secondary` | `#6b7280` | Nav items, labels |
| `text-muted` | `#9ca3af` | Codes, assignees, subtitles |
| `accent` | `#6d28d9` | Active states, CTA buttons |
| `accent-light` | `#ede9fe` | Active bg, hover |
| `accent-border` | `#ddd6fe` | Sync button border |

---

## 6. Transitions & Interactions

- **Rail brand hover:** `all 150ms ease`
- **Card hover:** `border-color 150ms, box-shadow 150ms, transform 150ms`
- **Detail panel open/close:** `transform 250ms cubic-bezier(0.2, 0, 0, 1)`
- **Nav flyout expand (concept list):** `max-height 200ms ease`
- **Sync button spinning:** `rotate 1s linear infinite` khi đang sync

---

## 7. Data Pipeline: Meta → Sheet → App

### Hiện trạng (đã có trong Code.gs)

```
Meta Ads export (manual)
    ↓
Google Sheet tab: Meta_Raw
    ↓ syncMetaData() — match by ad_name code
Creative rows (spend, roas, ctr, cpm, last_synced được update)
    ↓ getCreatives()
Frontend
```

`syncMetaData()` đã hoạt động: đọc `Meta_Raw`, match creative bằng code trong ad_name, ghi `spend / roas / ctr / cpm / last_synced` vào row creative.

### Thay đổi cần thiết

**Backend (Code.gs):**
- Không cần thêm logic sync mới — `syncMetaData()` đã đủ
- `getCreatives()` cần trả về thêm field `last_synced` để frontend hiển thị "synced X phút trước"

**Frontend — UI changes cho sync:**
- Nút **Sync Meta** trên topbar: hiển thị `last_synced` timestamp của brand (lấy max của tất cả creatives)
- Tooltip khi hover: "Last synced: 2 giờ trước"
- Khi đang sync: icon `⟳` animate-spin, button disabled
- Sau sync xong: toast success + cards tự refresh metrics

**Card — hiển thị metrics:**
- `spend`: format `₫X.XM` hoặc `₫XXk`
- `roas`: hiển thị số thập phân 1 chữ số (e.g. `4.5`)
- `ctr`: hiển thị % (e.g. `2.3%`)
- Nếu `last_synced` null (chưa sync lần nào) → hiển thị `—` thay vì số
- Delta % (so sánh period) — **để sau**, hiện tại chỉ hiển thị giá trị tuyệt đối

### Future: tự động hóa Meta → Sheet

Ngoài scope redesign này. Có thể làm sau bằng:
- Google Apps Script trigger gọi Meta Marketing API tự động theo schedule
- Hoặc n8n workflow export CSV → import vào Meta_Raw

---

## 9. Out of Scope

- Command palette (Cmd+K) — để sau
- Dashboard redesign — để sau
- Mobile responsive — không cần thiết (internal tool)
- Drag-and-drop reorder — để sau
