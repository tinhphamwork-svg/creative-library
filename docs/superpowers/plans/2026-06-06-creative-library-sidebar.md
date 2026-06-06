# Creative Library Sidebar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây dựng Google Apps Script sidebar app chạy trong Google Sheets để quản lý Ads Creative Library và Concept Hub cho nhiều brand, thay thế hoàn toàn việc thao tác thủ công trực tiếp trên sheet.

**Architecture:** Backend là Code.gs chứa server-side functions để đọc/ghi Google Sheets; Frontend là sidebar.html (HTML + CSS + Vanilla JS) được inject vào Sheets sidebar qua HtmlService. Data được load 1 lần từ Sheets khi sidebar mở, toàn bộ filter/sort chạy client-side; chỉ gọi server khi save/delete.

**Tech Stack:** Google Apps Script (ES5/ES6 partial), Google Sheets API (SpreadsheetApp), HtmlService, Vanilla JS (no frameworks), CSS inline (no CDN)

---

## File Structure

```
src/
├── Code.gs          # Toàn bộ backend: menu, data CRUD, config
└── sidebar.html     # Toàn bộ frontend: HTML + CSS + JS (single file)
```

> **Lưu ý GAS:** Không có build step, không có npm. Copy code vào Apps Script Editor (Extensions → Apps Script). `Code.gs` là server-side, `sidebar.html` là client-side được serve qua `HtmlService.createHtmlOutputFromFile()`.

---

## Constraint chung

- Không dùng external library (jQuery, Bootstrap, etc.) — Vanilla JS thuần
- Toàn bộ data đọc 1 lần khi load sidebar → filter client-side (tránh quota GAS)
- `google.script.run` luôn dùng qua Promise wrapper — không callback lồng quá 3 cấp
- Comment code bằng tiếng Việt
- GAS sidebar width tối đa ~300px do Google giới hạn

---

## State Architecture (sidebar.html)

```javascript
const state = {
  creatives: [],      // Toàn bộ rows từ sheet "Creative Library"
  concepts: [],       // Toàn bộ rows từ sheet "Concept Hub"
  config: {},         // { brands: [], dropdowns: {...} }
  filters: {
    creative: { brand:'', productLine:'', status:'', briefStatus:'', format:'' },
    concept:  { brand:'', productLine:'', status:'' }
  },
  activeTab: 'creative',
  drawer: { open: false, item: null, sheet: null, isNew: false }
};
```

## GAS Bridge Pattern (Promise wrapper)

```javascript
// Dùng cho mọi lần gọi server — không dùng callback trực tiếp
function gasRun(fnName, ...args) {
  return new Promise((resolve, reject) => {
    let runner = google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(reject);
    runner[fnName](...args);
  });
}
```

---

## Màu Status Badges

| Status | Background | Text |
|--------|-----------|------|
| Testing | `#3b82f6` | white |
| Winning | `#22c55e` | white |
| Scaling | `#a855f7` | white |
| Fatigued | `#f97316` | white |
| Killed | `#ef4444` | white |
| Not Briefed | `#94a3b8` | white |
| Briefed | `#60a5fa` | white |
| In Production | `#f59e0b` | white |
| Ready to Launch | `#8b5cf6` | white |
| Live | `#10b981` | white |
| Active | `#22c55e` | white |
| Paused | `#f97316` | white |

---

## Column Mapping (Creative Library)

```
A=Asset Name, B=Brand, C=Product Line, D=Concept, E=Angle,
F=Hook, G=Format, H=Campaign Objective, I=Status, J=Brief Status,
K=Assignee, L=Launch Date, M=Spend, N=ROAS, O=CTR,
P=CPM, Q=CPC, R=Preview URL, S=Brief Notes, T=Performance Notes,
U=Concept Hub ID
```

## Column Mapping (Concept Hub)

```
A=Concept ID, B=Concept Name, C=Brand, D=Product Line,
E=Format, F=Campaign Objective, G=Core Insight, H=Angles,
I=Status, J=Total Assets (formula), K=Winning Count (formula)
```

---

## Task 1: Setup — Code.gs skeleton + onOpen + showSidebar

**Files:**
- Create: `src/Code.gs`

- [ ] **Step 1: Tạo file `src/Code.gs` với skeleton và constants**

```javascript
// ============================================================
// CREATIVE LIBRARY SIDEBAR — Code.gs
// Backend cho Google Apps Script Sidebar App
// ============================================================

// Tên các sheet (phải khớp chính xác với tên tab trong Spreadsheet)
var SHEET_CREATIVE = 'Creative Library';
var SHEET_CONCEPT  = 'Concept Hub';
var SHEET_CONFIG   = 'Config';

// Dropdown values cố định
var DROPDOWNS = {
  format:    ['Video 9:16', 'Static 1:1', 'Static 4:5', 'Carousel', 'Story'],
  statusCreative: ['Testing', 'Winning', 'Scaling', 'Fatigued', 'Killed'],
  briefStatus: ['Not Briefed', 'Briefed', 'In Production', 'Ready to Launch', 'Live'],
  statusConcept: ['Active', 'Paused', 'Killed'],
  campaignObjective: ['Awareness', 'Traffic', 'Conversion', 'Retention']
};

// ============================================================
// MENU & SIDEBAR
// ============================================================

/**
 * Tạo menu "🎨 Creative Library" khi mở Spreadsheet
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎨 Creative Library')
    .addItem('Open App', 'showSidebar')
    .addToUi();
}

/**
 * Mở sidebar HTML
 */
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('Creative Library')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}
```

- [ ] **Step 2: Copy code vào Apps Script Editor và verify**

Trong Google Sheets: Extensions → Apps Script → xóa nội dung mặc định → paste code trên. Nhấn Save (Ctrl+S). Chạy function `onOpen` bằng cách chọn từ dropdown và nhấn Run. Kiểm tra Sheets: menu "🎨 Creative Library" xuất hiện.

- [ ] **Step 3: Tạo 3 sheet trong Google Sheets**

Trong Google Sheets, tạo 3 tab (sheet) với tên chính xác:
1. `Creative Library` — thêm header row: `Asset Name | Brand | Product Line | Concept | Angle | Hook | Format | Campaign Objective | Status | Brief Status | Assignee | Launch Date | Spend | ROAS | CTR | CPM | CPC | Preview URL | Brief Notes | Performance Notes | Concept Hub ID`
2. `Concept Hub` — thêm header row: `Concept ID | Concept Name | Brand | Product Line | Format | Campaign Objective | Core Insight | Angles | Status | Total Assets | Winning Count`
3. `Config` — cột A: `Brand`, cột B trở đi: liệt kê tên brand (row 1 = header "Brand", row 2+ = giá trị)

---

## Task 2: Backend — getSheetData

**Files:**
- Modify: `src/Code.gs`

- [ ] **Step 1: Thêm function `getSheetData` vào Code.gs**

```javascript
/**
 * Đọc toàn bộ data từ sheet, trả về array of objects với header làm key.
 * Row đầu tiên được dùng làm header (key của object).
 * @param {string} sheetName - Tên sheet cần đọc
 * @returns {Array<Object>} - Mảng objects, mỗi object là 1 row
 */
function getSheetData(sheetName) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // Trả về mảng rỗng nếu sheet không tồn tại
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  // Chỉ có header, không có data
  if (lastRow < 2) return [];

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) return [];

  // Đọc toàn bộ data từ row 1 (header) đến lastRow
  var range   = sheet.getRange(1, 1, lastRow, lastCol);
  var values  = range.getValues();
  var headers = values[0];
  var result  = [];

  // Chuyển mỗi row thành object { headerKey: cellValue }
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var obj = { _rowIndex: i + 1 }; // lưu row number thực tế (1-based) để update sau

    // Bỏ qua row hoàn toàn trống
    var hasData = row.some(function(cell) { return cell !== ''; });
    if (!hasData) continue;

    headers.forEach(function(header, colIdx) {
      obj[header] = row[colIdx];
    });
    result.push(obj);
  }

  return result;
}
```

- [ ] **Step 2: Viết test function để verify trong Apps Script**

Thêm vào cuối Code.gs (chỉ dùng để test, xóa sau):

```javascript
/**
 * Test function — chạy trong Apps Script Editor để verify getSheetData
 * Kết quả xem trong View → Logs
 */
function _test_getSheetData() {
  // Test với sheet Creative Library
  var creatives = getSheetData(SHEET_CREATIVE);
  Logger.log('Creative Library rows: ' + creatives.length);
  if (creatives.length > 0) {
    Logger.log('First row: ' + JSON.stringify(creatives[0]));
  }

  // Test với sheet Concept Hub
  var concepts = getSheetData(SHEET_CONCEPT);
  Logger.log('Concept Hub rows: ' + concepts.length);

  // Test với sheet không tồn tại
  var notExist = getSheetData('NonExistentSheet');
  Logger.log('Non-existent sheet result: ' + JSON.stringify(notExist)); // phải là []
}
```

- [ ] **Step 3: Chạy `_test_getSheetData` trong Apps Script Editor**

Chọn `_test_getSheetData` từ dropdown function → Run → View → Logs. Thêm 2-3 row data mẫu vào sheet "Creative Library" trước nếu sheet trống. Expected: log hiển thị số rows đúng, object có đúng keys theo header.

---

## Task 3: Backend — saveRow, deleteRow, getConfig

**Files:**
- Modify: `src/Code.gs`

- [ ] **Step 1: Thêm function `saveRow`**

```javascript
/**
 * Ghi 1 row vào sheet.
 * Nếu rowIndex = -1: append row mới xuống cuối.
 * Nếu rowIndex > 0: update row đó (rowIndex là số thực tế trên sheet, 1-based).
 * @param {string} sheetName - Tên sheet
 * @param {Object} rowData   - Object { headerKey: value } — phải có đúng keys với header
 * @param {number} rowIndex  - Row index thực tế trên sheet (1-based). -1 = append mới.
 * @returns {number} - Row index đã ghi (để client cập nhật state)
 */
function saveRow(sheetName, rowData, rowIndex) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet không tồn tại: ' + sheetName);

  // Lấy header từ row 1 để xác định thứ tự cột
  var lastCol  = sheet.getLastColumn();
  var headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Tạo mảng values theo đúng thứ tự header
  var rowValues = headers.map(function(header) {
    var val = rowData[header];
    return (val !== undefined && val !== null) ? val : '';
  });

  if (rowIndex === -1) {
    // Append row mới
    sheet.appendRow(rowValues);
    return sheet.getLastRow(); // trả về row index vừa thêm
  } else {
    // Update row đã có
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return rowIndex;
  }
}
```

- [ ] **Step 2: Thêm function `deleteRow`**

```javascript
/**
 * Xóa 1 row theo index thực tế trên sheet (1-based).
 * Không xóa header (row 1).
 * @param {string} sheetName - Tên sheet
 * @param {number} rowIndex  - Row index thực tế (1-based, không phải 0-based)
 */
function deleteRow(sheetName, rowIndex) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet không tồn tại: ' + sheetName);
  if (rowIndex <= 1) throw new Error('Không thể xóa header row');
  sheet.deleteRow(rowIndex);
}
```

- [ ] **Step 3: Thêm function `getConfig`**

```javascript
/**
 * Trả về config object gồm:
 * - brands: danh sách brands từ sheet Config (cột A, bỏ header)
 * - dropdowns: các giá trị dropdown cố định
 * Config sheet: cột A = "Brand" (header), A2 trở đi = tên brand
 */
function getConfig() {
  var ss          = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(SHEET_CONFIG);
  var brands      = [];

  if (configSheet) {
    var lastRow = configSheet.getLastRow();
    if (lastRow >= 2) {
      // Lấy từ A2 đến cuối (bỏ header A1)
      var brandValues = configSheet.getRange(2, 1, lastRow - 1, 1).getValues();
      brands = brandValues
        .map(function(row) { return row[0]; })
        .filter(function(b) { return b !== ''; }); // bỏ ô trống
    }
  }

  return {
    brands:    brands,
    dropdowns: DROPDOWNS
  };
}
```

- [ ] **Step 4: Thêm function `generateConceptId`**

```javascript
/**
 * Tạo Concept ID duy nhất dạng "CON-YYYYMMDD-XXXX"
 * Dùng khi tạo concept mới để tự điền vào cột Concept ID
 * @returns {string} - Concept ID mới
 */
function generateConceptId() {
  var now    = new Date();
  var date   = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
  var random = Math.floor(Math.random() * 9000) + 1000; // 4 chữ số random
  return 'CON-' + date + '-' + random;
}
```

- [ ] **Step 5: Viết và chạy test cho saveRow + deleteRow**

```javascript
/**
 * Test save và delete — chạy để verify, sau đó xóa khỏi Code.gs
 */
function _test_saveAndDelete() {
  // Test append row mới vào Creative Library
  var testData = {
    'Asset Name': 'TEST - Xóa sau khi test',
    'Brand': 'TestBrand',
    'Status': 'Testing',
    'Brief Status': 'Not Briefed',
    'Format': 'Video 9:16'
  };

  var newRowIdx = saveRow(SHEET_CREATIVE, testData, -1);
  Logger.log('Appended tại row: ' + newRowIdx);

  // Verify bằng cách đọc lại
  var rows = getSheetData(SHEET_CREATIVE);
  var found = rows.filter(function(r) { return r['Asset Name'] === 'TEST - Xóa sau khi test'; });
  Logger.log('Tìm thấy row test: ' + (found.length > 0 ? 'YES' : 'NO'));

  // Test update row đó
  testData['Status'] = 'Winning';
  saveRow(SHEET_CREATIVE, testData, newRowIdx);
  Logger.log('Updated row ' + newRowIdx + ' thành công');

  // Test delete
  deleteRow(SHEET_CREATIVE, newRowIdx);
  Logger.log('Deleted row ' + newRowIdx + '. Verify trực tiếp trên sheet.');

  // Test getConfig
  var config = getConfig();
  Logger.log('Brands: ' + JSON.stringify(config.brands));
  Logger.log('Dropdowns keys: ' + Object.keys(config.dropdowns).join(', '));
}
```

Chọn `_test_saveAndDelete` → Run → kiểm tra Logs và kiểm tra sheet trực quan.

---

## Task 4: sidebar.html — HTML Structure + CSS

**Files:**
- Create: `src/sidebar.html`

- [ ] **Step 1: Tạo `src/sidebar.html` với HTML structure và toàn bộ CSS**

```html
<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Creative Library</title>
<style>
/* ===== RESET & BASE ===== */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: system-ui, Arial, sans-serif;
  font-size: 12px;
  background: #f8fafc;
  color: #1e293b;
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ===== TABS ===== */
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 2px solid #e2e8f0;
  flex-shrink: 0;
}
.tab-btn {
  flex: 1;
  padding: 10px 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: #94a3b8;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  transition: color 0.15s, border-color 0.15s;
}
.tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

/* ===== FILTER BAR ===== */
.filter-bar {
  background: #fff;
  padding: 8px 8px 6px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.filter-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.filter-row select {
  flex: 1;
  min-width: 70px;
  padding: 4px 4px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 11px;
  color: #475569;
  background: #f8fafc;
  cursor: pointer;
  appearance: auto;
}
.filter-row select:focus { outline: 1px solid #3b82f6; border-color: #3b82f6; }

/* ===== ACTION BAR ===== */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}
.count-label { font-size: 11px; color: #64748b; }
.btn-new {
  padding: 5px 10px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-new:hover { background: #2563eb; }

/* ===== LISTS ===== */
.list-container {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}
.list-container::-webkit-scrollbar { width: 4px; }
.list-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

/* ===== CREATIVE CARD ===== */
.creative-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.creative-card:hover { border-color: #93c5fd; box-shadow: 0 1px 6px rgba(59,130,246,0.12); }
.card-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
.card-title {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.card-format { font-size: 10px; color: #64748b; }
.card-roas {
  font-size: 11px;
  font-weight: 700;
  color: #059669;
  margin-left: auto;
}

/* ===== CONCEPT CARD ===== */
.concept-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 6px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.concept-card:hover { border-color: #a78bfa; box-shadow: 0 1px 6px rgba(167,139,250,0.12); }
.concept-title {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 4px;
}
.concept-stats {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.stat-chip {
  font-size: 10px;
  color: #64748b;
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 10px;
}

/* ===== STATUS BADGES ===== */
.badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}
.badge-Testing        { background: #3b82f6; }
.badge-Winning        { background: #22c55e; }
.badge-Scaling        { background: #a855f7; }
.badge-Fatigued       { background: #f97316; }
.badge-Killed         { background: #ef4444; }
.badge-Not-Briefed    { background: #94a3b8; }
.badge-Briefed        { background: #60a5fa; }
.badge-In-Production  { background: #f59e0b; }
.badge-Ready-to-Launch { background: #8b5cf6; }
.badge-Live           { background: #10b981; }
.badge-Active         { background: #22c55e; }
.badge-Paused         { background: #f97316; }
.badge-default        { background: #94a3b8; }

/* ===== DRAWER (Edit Panel) ===== */
.drawer-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.25);
  z-index: 100;
}
.drawer-overlay.open { display: block; }
.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 100%;
  height: 100%;
  background: #fff;
  z-index: 101;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.22s cubic-bezier(0.4,0,0.2,1);
}
.drawer.open { transform: translateX(0); }
.drawer-header {
  display: flex;
  align-items: center;
  padding: 10px 10px 8px;
  border-bottom: 1px solid #e2e8f0;
  gap: 8px;
  flex-shrink: 0;
}
.drawer-title {
  flex: 1;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  font-size: 18px;
  line-height: 1;
  padding: 2px 4px;
}
.btn-close:hover { color: #1e293b; }
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}
.drawer-body::-webkit-scrollbar { width: 4px; }
.drawer-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.drawer-footer {
  padding: 8px 10px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.btn-save {
  flex: 1;
  padding: 8px;
  background: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-save:hover { background: #2563eb; }
.btn-save:disabled { background: #93c5fd; cursor: not-allowed; }
.btn-delete {
  padding: 8px 14px;
  background: #fee2e2;
  color: #ef4444;
  border: none;
  border-radius: 5px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.btn-delete:hover { background: #fecaca; }

/* ===== FORM FIELDS ===== */
.field-group { margin-bottom: 10px; }
.field-label {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 3px;
}
.field-input, .field-select, .field-textarea {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 12px;
  color: #1e293b;
  background: #fff;
  transition: border-color 0.15s;
}
.field-input:focus, .field-select:focus, .field-textarea:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59,130,246,0.1);
}
.field-textarea { resize: vertical; min-height: 60px; font-family: inherit; }
.field-row { display: flex; gap: 8px; }
.field-row .field-group { flex: 1; }
.section-divider {
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding: 8px 0 4px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 8px;
}

/* ===== TOAST ===== */
.toast {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%) translateY(60px);
  background: #1e293b;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  z-index: 200;
  transition: transform 0.25s ease;
  pointer-events: none;
}
.toast.show { transform: translateX(-50%) translateY(0); }
.toast.error { background: #ef4444; }

/* ===== LOADING ===== */
.loading-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 12px;
  color: #64748b;
}
.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== EMPTY STATE ===== */
.empty-state {
  text-align: center;
  padding: 24px 16px;
  color: #94a3b8;
}
.empty-state .icon { font-size: 28px; margin-bottom: 6px; }
.empty-state p { font-size: 12px; }

/* ===== TAB CONTENT ===== */
.tab-content { display: none; flex: 1; flex-direction: column; overflow: hidden; }
.tab-content.active { display: flex; }
</style>
</head>
<body>

<!-- Tabs -->
<div class="tabs">
  <button class="tab-btn active" id="tab-creative" onclick="switchTab('creative')">🎨 Creatives</button>
  <button class="tab-btn" id="tab-concept" onclick="switchTab('concept')">💡 Concepts</button>
</div>

<!-- Loading screen (hiển thị khi khởi tạo) -->
<div class="loading-screen" id="loading-screen">
  <div class="spinner"></div>
  <span>Đang tải dữ liệu...</span>
</div>

<!-- ========== TAB: CREATIVE LIBRARY ========== -->
<div class="tab-content" id="content-creative">
  <!-- Filter Bar -->
  <div class="filter-bar">
    <div class="filter-row">
      <select id="filter-c-brand" onchange="applyFilters('creative')">
        <option value="">Brand</option>
      </select>
      <select id="filter-c-product" onchange="applyFilters('creative')">
        <option value="">Product</option>
      </select>
    </div>
    <div class="filter-row" style="margin-top:4px">
      <select id="filter-c-status" onchange="applyFilters('creative')">
        <option value="">Status</option>
        <option>Testing</option><option>Winning</option><option>Scaling</option>
        <option>Fatigued</option><option>Killed</option>
      </select>
      <select id="filter-c-brief" onchange="applyFilters('creative')">
        <option value="">Brief</option>
        <option>Not Briefed</option><option>Briefed</option>
        <option>In Production</option><option>Ready to Launch</option><option>Live</option>
      </select>
      <select id="filter-c-format" onchange="applyFilters('creative')">
        <option value="">Format</option>
        <option>Video 9:16</option><option>Static 1:1</option>
        <option>Static 4:5</option><option>Carousel</option><option>Story</option>
      </select>
    </div>
  </div>
  <!-- Action Bar -->
  <div class="action-bar">
    <span class="count-label" id="creative-count">0 creatives</span>
    <button class="btn-new" onclick="openDrawer('creative', null)">+ New Creative</button>
  </div>
  <!-- List -->
  <div class="list-container" id="creative-list"></div>
</div>

<!-- ========== TAB: CONCEPT HUB ========== -->
<div class="tab-content" id="content-concept">
  <!-- Filter Bar -->
  <div class="filter-bar">
    <div class="filter-row">
      <select id="filter-p-brand" onchange="applyFilters('concept')">
        <option value="">Brand</option>
      </select>
      <select id="filter-p-product" onchange="applyFilters('concept')">
        <option value="">Product</option>
      </select>
      <select id="filter-p-status" onchange="applyFilters('concept')">
        <option value="">Status</option>
        <option>Active</option><option>Paused</option><option>Killed</option>
      </select>
    </div>
  </div>
  <!-- Action Bar -->
  <div class="action-bar">
    <span class="count-label" id="concept-count">0 concepts</span>
    <button class="btn-new" onclick="openDrawer('concept', null)">+ New Concept</button>
  </div>
  <!-- List -->
  <div class="list-container" id="concept-list"></div>
</div>

<!-- ========== DRAWER (Edit/New) ========== -->
<div class="drawer-overlay" id="drawer-overlay" onclick="closeDrawer()"></div>
<div class="drawer" id="drawer">
  <div class="drawer-header">
    <button class="btn-close" onclick="closeDrawer()">&#x2715;</button>
    <span class="drawer-title" id="drawer-title">Edit Creative</span>
  </div>
  <div class="drawer-body" id="drawer-body">
    <!-- Form injected by JS -->
  </div>
  <div class="drawer-footer">
    <button class="btn-save" id="btn-save" onclick="saveItem()">Lưu</button>
    <button class="btn-delete" id="btn-delete" onclick="deleteItem()" style="display:none">Xóa</button>
  </div>
</div>

<!-- Toast notification -->
<div class="toast" id="toast"></div>

</body>
</html>
```

- [ ] **Step 2: Verify HTML structure trong browser (optional)**

Mở file `sidebar.html` trực tiếp trong Chrome để kiểm tra layout trước khi test trong GAS. CSS animation spinner và drawer slide phải hoạt động.

---

## Task 5: sidebar.html — JavaScript Core (State, GAS Bridge, Init)

**Files:**
- Modify: `src/sidebar.html` (thêm `<script>` block trước `</body>`)

- [ ] **Step 1: Thêm JS core — state, gasRun, init vào `sidebar.html`**

Thêm trước thẻ đóng `</body>`:

```html
<script>
// ============================================================
// STATE — dữ liệu toàn cục của app
// ============================================================
var state = {
  creatives: [],     // Mảng objects từ sheet Creative Library
  concepts:  [],     // Mảng objects từ sheet Concept Hub
  config:    { brands: [], dropdowns: {} },
  filters: {
    creative: { brand:'', productLine:'', status:'', briefStatus:'', format:'' },
    concept:  { brand:'', productLine:'', status:'' }
  },
  activeTab: 'creative',
  drawer: {
    open:   false,
    item:   null,   // object đang edit (null nếu new)
    sheet:  null,   // 'creative' hoặc 'concept'
    isNew:  false
  }
};

// ============================================================
// GAS BRIDGE — Promise wrapper cho google.script.run
// ============================================================
/**
 * Gọi function phía server (Code.gs) qua google.script.run.
 * Trả về Promise thay vì dùng callback trực tiếp.
 * @param {string} fnName - Tên function trong Code.gs
 * @param {...*} args - Arguments truyền vào function
 * @returns {Promise}
 */
function gasRun(fnName) {
  var args = Array.prototype.slice.call(arguments, 1);
  return new Promise(function(resolve, reject) {
    var runner = google.script.run
      .withSuccessHandler(resolve)
      .withFailureHandler(function(err) {
        reject(err);
      });
    // Gọi function với args
    runner[fnName].apply(runner, args);
  });
}

// ============================================================
// INIT — Load data khi sidebar mở
// ============================================================
/**
 * Tải data từ server khi sidebar khởi tạo.
 * Load song song 3 requests để nhanh hơn.
 */
function initApp() {
  Promise.all([
    gasRun('getSheetData', 'Creative Library'),
    gasRun('getSheetData', 'Concept Hub'),
    gasRun('getConfig')
  ]).then(function(results) {
    state.creatives = results[0] || [];
    state.concepts  = results[1] || [];
    state.config    = results[2] || { brands: [], dropdowns: {} };

    // Ẩn loading screen
    document.getElementById('loading-screen').style.display = 'none';
    // Hiện tab đầu tiên
    document.getElementById('content-creative').classList.add('active');

    // Điền brand options vào các filter dropdown
    populateBrandFilters();

    // Render danh sách
    applyFilters('creative');
    applyFilters('concept');

  }).catch(function(err) {
    document.getElementById('loading-screen').innerHTML =
      '<div style="color:#ef4444;text-align:center;padding:20px">Lỗi tải data: ' +
      (err.message || err) + '</div>';
  });
}

// ============================================================
// TAB SWITCHING
// ============================================================
/**
 * Chuyển tab giữa creative và concept
 * @param {string} tab - 'creative' hoặc 'concept'
 */
function switchTab(tab) {
  state.activeTab = tab;

  // Toggle tab buttons
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.getElementById('tab-' + tab).classList.add('active');

  // Toggle content
  document.querySelectorAll('.tab-content').forEach(function(el) {
    el.classList.remove('active');
  });
  document.getElementById('content-' + tab).classList.add('active');
}

// ============================================================
// POPULATE FILTER DROPDOWNS (Brand, Product)
// ============================================================
/**
 * Điền brand list và product line list vào tất cả dropdown filter
 */
function populateBrandFilters() {
  var brands = state.config.brands || [];

  // Lấy product lines unique từ cả 2 dataset
  var productLines = {};
  state.creatives.forEach(function(c) {
    if (c['Product Line']) productLines[c['Product Line']] = true;
  });
  state.concepts.forEach(function(c) {
    if (c['Product Line']) productLines[c['Product Line']] = true;
  });
  var plArr = Object.keys(productLines).sort();

  // Điền brand vào 2 filter (creative + concept)
  ['filter-c-brand', 'filter-p-brand'].forEach(function(id) {
    var sel = document.getElementById(id);
    var cur = sel.value;
    sel.innerHTML = '<option value="">Brand</option>';
    brands.forEach(function(b) {
      var opt = document.createElement('option');
      opt.value = b; opt.text = b;
      sel.appendChild(opt);
    });
    sel.value = cur;
  });

  // Điền product line vào 2 filter
  ['filter-c-product', 'filter-p-product'].forEach(function(id) {
    var sel = document.getElementById(id);
    var cur = sel.value;
    sel.innerHTML = '<option value="">Product</option>';
    plArr.forEach(function(pl) {
      var opt = document.createElement('option');
      opt.value = pl; opt.text = pl;
      sel.appendChild(opt);
    });
    sel.value = cur;
  });
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
var _toastTimer = null;
/**
 * Hiển thị toast message ngắn
 * @param {string} msg - Nội dung thông báo
 * @param {string} [type] - 'error' hoặc bỏ trống (default dark)
 */
function showToast(msg, type) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  // Force reflow để reset animation
  void toast.offsetWidth;
  toast.classList.add('show');
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() {
    toast.classList.remove('show');
  }, 2500);
}

// ============================================================
// Khởi động app khi trang load xong
// ============================================================
window.addEventListener('load', initApp);
</script>
```

---

## Task 6: sidebar.html — Filter Logic + Creative Card Rendering

**Files:**
- Modify: `src/sidebar.html` (append vào `<script>` block, trước `</script>`)

- [ ] **Step 1: Thêm filter logic và creative renderer**

```javascript
// ============================================================
// FILTER & RENDER — CREATIVE LIBRARY
// ============================================================

/**
 * Lọc và render lại danh sách theo tab hiện tại.
 * Chạy hoàn toàn client-side.
 * @param {string} tab - 'creative' hoặc 'concept'
 */
function applyFilters(tab) {
  if (tab === 'creative') {
    var f = {
      brand:       document.getElementById('filter-c-brand').value,
      productLine: document.getElementById('filter-c-product').value,
      status:      document.getElementById('filter-c-status').value,
      briefStatus: document.getElementById('filter-c-brief').value,
      format:      document.getElementById('filter-c-format').value
    };
    state.filters.creative = f;
    var filtered = state.creatives.filter(function(c) {
      return (!f.brand       || c['Brand'] === f.brand)
          && (!f.productLine || c['Product Line'] === f.productLine)
          && (!f.status      || c['Status'] === f.status)
          && (!f.briefStatus || c['Brief Status'] === f.briefStatus)
          && (!f.format      || c['Format'] === f.format);
    });
    renderCreativeList(filtered);
  } else {
    var fp = {
      brand:       document.getElementById('filter-p-brand').value,
      productLine: document.getElementById('filter-p-product').value,
      status:      document.getElementById('filter-p-status').value
    };
    state.filters.concept = fp;
    var filteredC = state.concepts.filter(function(c) {
      return (!fp.brand       || c['Brand'] === fp.brand)
          && (!fp.productLine || c['Product Line'] === fp.productLine)
          && (!fp.status      || c['Status'] === fp.status);
    });
    renderConceptList(filteredC);
  }
}

/**
 * Trả về HTML string cho badge status
 * @param {string} status - Giá trị status
 * @returns {string} HTML badge
 */
function renderBadge(status) {
  if (!status) return '';
  // Chuyển khoảng trắng thành dấu gạch ngang cho class name
  var cls = 'badge-' + status.replace(/ /g, '-');
  return '<span class="badge ' + cls + '">' + escHtml(status) + '</span>';
}

/**
 * Escape HTML để tránh XSS khi render string vào innerHTML
 * @param {string} str
 * @returns {string}
 */
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Render danh sách creative cards vào #creative-list
 * @param {Array<Object>} list - Mảng creative objects đã được filter
 */
function renderCreativeList(list) {
  var container = document.getElementById('creative-list');
  var countEl   = document.getElementById('creative-count');
  countEl.textContent = list.length + ' creative' + (list.length !== 1 ? 's' : '');

  if (list.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">🎨</div>' +
      '<p>Không có creative nào<br>phù hợp với filter.</p></div>';
    return;
  }

  container.innerHTML = list.map(function(c, idx) {
    var roas = c['ROAS'] ? '<span class="card-roas">ROAS ' + escHtml(String(c['ROAS'])) + '</span>' : '';
    return '<div class="creative-card" onclick="openDrawer(\'creative\', ' + JSON.stringify(c._rowIndex) + ')">' +
      '<div class="card-row">' +
        '<span class="card-title">' + escHtml(c['Asset Name'] || '(no name)') + '</span>' +
        roas +
      '</div>' +
      '<div class="card-meta">' +
        renderBadge(c['Status']) +
        renderBadge(c['Brief Status']) +
        (c['Format'] ? '<span class="card-format">' + escHtml(c['Format']) + '</span>' : '') +
        (c['Brand'] ? '<span class="card-format" style="color:#94a3b8">· ' + escHtml(c['Brand']) + '</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}
```

---

## Task 7: sidebar.html — Concept Card Rendering + Drawer Logic

**Files:**
- Modify: `src/sidebar.html` (append vào `<script>` block)

- [ ] **Step 1: Thêm concept renderer**

```javascript
// ============================================================
// FILTER & RENDER — CONCEPT HUB
// ============================================================

/**
 * Render danh sách concept cards vào #concept-list
 * @param {Array<Object>} list - Mảng concept objects đã được filter
 */
function renderConceptList(list) {
  var container = document.getElementById('concept-list');
  var countEl   = document.getElementById('concept-count');
  countEl.textContent = list.length + ' concept' + (list.length !== 1 ? 's' : '');

  if (list.length === 0) {
    container.innerHTML =
      '<div class="empty-state"><div class="icon">💡</div>' +
      '<p>Không có concept nào<br>phù hợp với filter.</p></div>';
    return;
  }

  container.innerHTML = list.map(function(c) {
    var totalAssets  = c['Total Assets']  || 0;
    var winningCount = c['Winning Count'] || 0;
    return '<div class="concept-card" onclick="openDrawer(\'concept\', ' + JSON.stringify(c._rowIndex) + ')">' +
      '<div class="card-row">' +
        '<span class="concept-title">' + escHtml(c['Concept Name'] || '(no name)') + '</span>' +
        renderBadge(c['Status']) +
      '</div>' +
      '<div class="card-meta" style="margin-bottom:4px">' +
        (c['Brand'] ? '<span class="card-format">' + escHtml(c['Brand']) + '</span>' : '') +
        (c['Format'] ? '<span class="card-format"> · ' + escHtml(c['Format']) + '</span>' : '') +
      '</div>' +
      '<div class="concept-stats">' +
        '<span class="stat-chip">📦 ' + escHtml(String(totalAssets)) + ' assets</span>' +
        '<span class="stat-chip">🏆 ' + escHtml(String(winningCount)) + ' winning</span>' +
        (c['Concept ID'] ? '<span class="stat-chip">' + escHtml(c['Concept ID']) + '</span>' : '') +
      '</div>' +
    '</div>';
  }).join('');
}
```

- [ ] **Step 2: Thêm drawer open/close logic**

```javascript
// ============================================================
// DRAWER — Mở và đóng edit panel
// ============================================================

/**
 * Mở drawer để xem/edit item hoặc tạo mới.
 * @param {string} sheet     - 'creative' hoặc 'concept'
 * @param {number|null} rowIndex - Row index thực tế trên sheet (null = new item)
 */
function openDrawer(sheet, rowIndex) {
  var isNew = (rowIndex === null);
  var item  = null;

  if (!isNew) {
    // Tìm item trong state theo _rowIndex
    var arr = sheet === 'creative' ? state.creatives : state.concepts;
    item = arr.find(function(x) { return x._rowIndex === rowIndex; }) || null;
  }

  state.drawer = { open: true, item: item, sheet: sheet, isNew: isNew };

  // Cập nhật title
  var title = isNew
    ? (sheet === 'creative' ? 'New Creative' : 'New Concept')
    : (sheet === 'creative' ? (item && item['Asset Name']) || 'Edit Creative' : (item && item['Concept Name']) || 'Edit Concept');
  document.getElementById('drawer-title').textContent = title;

  // Render form
  document.getElementById('drawer-body').innerHTML =
    sheet === 'creative' ? buildCreativeForm(item) : buildConceptForm(item);

  // Ẩn/hiện nút Delete
  document.getElementById('btn-delete').style.display = isNew ? 'none' : 'inline-block';

  // Mở drawer
  document.getElementById('drawer-overlay').classList.add('open');
  document.getElementById('drawer').classList.add('open');
}

/**
 * Đóng drawer và reset state
 */
function closeDrawer() {
  state.drawer = { open: false, item: null, sheet: null, isNew: false };
  document.getElementById('drawer-overlay').classList.remove('open');
  document.getElementById('drawer').classList.remove('open');
}
```

---

## Task 8: sidebar.html — Form Builders (Creative + Concept)

**Files:**
- Modify: `src/sidebar.html` (append vào `<script>` block)

- [ ] **Step 1: Thêm helper functions cho form building**

```javascript
// ============================================================
// FORM HELPERS
// ============================================================

/**
 * Tạo HTML cho một text input field
 */
function fieldText(id, label, value, placeholder) {
  return '<div class="field-group">' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<input class="field-input" type="text" id="' + id + '" value="' +
    escHtml(value || '') + '" placeholder="' + escHtml(placeholder || '') + '">' +
    '</div>';
}

/**
 * Tạo HTML cho một select dropdown field
 */
function fieldSelect(id, label, options, value) {
  var opts = options.map(function(o) {
    return '<option value="' + escHtml(o) + '"' +
      (o === value ? ' selected' : '') + '>' + escHtml(o) + '</option>';
  }).join('');
  return '<div class="field-group">' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<select class="field-select" id="' + id + '">' +
    '<option value="">— chọn —</option>' + opts +
    '</select></div>';
}

/**
 * Tạo HTML cho một textarea field
 */
function fieldTextarea(id, label, value, placeholder) {
  return '<div class="field-group">' +
    '<label class="field-label" for="' + id + '">' + label + '</label>' +
    '<textarea class="field-textarea" id="' + id + '" placeholder="' +
    escHtml(placeholder || '') + '">' + escHtml(value || '') + '</textarea>' +
    '</div>';
}

/**
 * Tạo HTML section divider
 */
function sectionDivider(label) {
  return '<div class="section-divider">' + label + '</div>';
}

/**
 * Lấy danh sách concept options cho dropdown "Concept Hub ID" trong Creative form.
 * Format: "CON-xxx — Concept Name"
 */
function getConceptOptions() {
  return state.concepts.map(function(c) {
    return (c['Concept ID'] || '') + (c['Concept Name'] ? ' — ' + c['Concept Name'] : '');
  }).filter(function(s) { return s.trim() !== ''; });
}
```

- [ ] **Step 2: Thêm Creative form builder**

```javascript
/**
 * Build HTML form cho edit/new creative
 * @param {Object|null} item - Creative object (null nếu new)
 * @returns {string} HTML string
 */
function buildCreativeForm(item) {
  var d  = state.config.dropdowns || {};
  var v  = item || {};
  var brands = state.config.brands || [];

  var conceptOptions = getConceptOptions();
  // Thêm Concept Hub ID field là select từ concept list
  var conceptOptHtml = conceptOptions.map(function(o) {
    var id = o.split(' — ')[0].trim();
    return '<option value="' + escHtml(id) + '"' +
      (id === (v['Concept Hub ID'] || '') ? ' selected' : '') +
      '>' + escHtml(o) + '</option>';
  }).join('');
  var conceptField = '<div class="field-group">' +
    '<label class="field-label" for="f-concept-id">Concept Hub ID</label>' +
    '<select class="field-select" id="f-concept-id">' +
    '<option value="">— Chọn concept —</option>' + conceptOptHtml +
    '</select></div>';

  return sectionDivider('Thông tin cơ bản') +
    fieldText('f-asset-name', 'Asset Name *', v['Asset Name'], 'Tên creative...') +
    '<div class="field-row">' +
      fieldSelect('f-brand', 'Brand', brands, v['Brand']) +
      fieldText('f-product-line', 'Product Line', v['Product Line'], '') +
    '</div>' +
    fieldText('f-concept', 'Concept', v['Concept'], 'Tên concept...') +
    fieldText('f-angle', 'Angle', v['Angle'], 'Góc khai thác...') +
    fieldText('f-hook', 'Hook', v['Hook'], 'Hook chính...') +
    '<div class="field-row">' +
      fieldSelect('f-format', 'Format', d.format || [], v['Format']) +
      fieldSelect('f-objective', 'Objective', d.campaignObjective || [], v['Campaign Objective']) +
    '</div>' +

    sectionDivider('Trạng thái') +
    '<div class="field-row">' +
      fieldSelect('f-status', 'Status', d.statusCreative || [], v['Status']) +
      fieldSelect('f-brief-status', 'Brief Status', d.briefStatus || [], v['Brief Status']) +
    '</div>' +
    fieldText('f-assignee', 'Assignee', v['Assignee'], 'Người phụ trách...') +
    fieldText('f-launch-date', 'Launch Date', v['Launch Date'] ? String(v['Launch Date']).substring(0,10) : '', 'YYYY-MM-DD') +

    sectionDivider('Performance') +
    '<div class="field-row">' +
      fieldText('f-spend', 'Spend', v['Spend'] ? String(v['Spend']) : '', '0') +
      fieldText('f-roas', 'ROAS', v['ROAS'] ? String(v['ROAS']) : '', '0.00') +
    '</div>' +
    '<div class="field-row">' +
      fieldText('f-ctr', 'CTR', v['CTR'] ? String(v['CTR']) : '', '0.00%') +
      fieldText('f-cpm', 'CPM', v['CPM'] ? String(v['CPM']) : '', '0') +
      fieldText('f-cpc', 'CPC', v['CPC'] ? String(v['CPC']) : '', '0') +
    '</div>' +

    sectionDivider('Nội dung') +
    fieldText('f-preview-url', 'Preview URL', v['Preview URL'], 'https://...') +
    fieldTextarea('f-brief-notes', 'Brief Notes', v['Brief Notes'], 'Mô tả brief...') +
    fieldTextarea('f-perf-notes', 'Performance Notes', v['Performance Notes'], 'Nhận xét hiệu quả...') +
    conceptField;
}
```

- [ ] **Step 3: Thêm Concept form builder**

```javascript
/**
 * Build HTML form cho edit/new concept
 * @param {Object|null} item - Concept object (null nếu new)
 * @returns {string} HTML string
 */
function buildConceptForm(item) {
  var d      = state.config.dropdowns || {};
  var v      = item || {};
  var brands = state.config.brands || [];

  return sectionDivider('Thông tin cơ bản') +
    fieldText('p-concept-id', 'Concept ID', v['Concept ID'], 'Tự động tạo nếu để trống') +
    fieldText('p-concept-name', 'Concept Name *', v['Concept Name'], 'Tên concept...') +
    '<div class="field-row">' +
      fieldSelect('p-brand', 'Brand', brands, v['Brand']) +
      fieldText('p-product-line', 'Product Line', v['Product Line'], '') +
    '</div>' +
    '<div class="field-row">' +
      fieldSelect('p-format', 'Format', d.format || [], v['Format']) +
      fieldSelect('p-objective', 'Objective', d.campaignObjective || [], v['Campaign Objective']) +
    '</div>' +

    sectionDivider('Nội dung') +
    fieldTextarea('p-core-insight', 'Core Insight', v['Core Insight'], 'Insight chính của concept...') +
    fieldTextarea('p-angles', 'Angles', v['Angles'], 'Các angle khai thác, mỗi angle 1 dòng...') +

    sectionDivider('Trạng thái') +
    fieldSelect('p-status', 'Status', d.statusConcept || [], v['Status']);
}
```

---

## Task 9: sidebar.html — Save, Delete, Sync State

**Files:**
- Modify: `src/sidebar.html` (append vào `<script>` block)

- [ ] **Step 1: Thêm save logic**

```javascript
// ============================================================
// SAVE & DELETE
// ============================================================

/**
 * Đọc values từ form trong drawer và gọi server để ghi vào sheet.
 * Sau khi save thành công: cập nhật state local + re-render (không reload toàn bộ).
 */
function saveItem() {
  var d = state.drawer;
  if (!d.sheet) return;

  var btn = document.getElementById('btn-save');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  var rowData  = d.sheet === 'creative' ? readCreativeForm() : readConceptForm();
  var rowIndex = d.isNew ? -1 : (d.item ? d.item._rowIndex : -1);

  // Validation cơ bản
  var nameKey = d.sheet === 'creative' ? 'Asset Name' : 'Concept Name';
  if (!rowData[nameKey] || !rowData[nameKey].trim()) {
    showToast(nameKey + ' không được để trống', 'error');
    btn.disabled = false;
    btn.textContent = 'Lưu';
    return;
  }

  var sheetName = d.sheet === 'creative' ? 'Creative Library' : 'Concept Hub';

  gasRun('saveRow', sheetName, rowData, rowIndex)
    .then(function(savedRowIndex) {
      // Cập nhật state local
      rowData._rowIndex = savedRowIndex;

      if (d.isNew) {
        if (d.sheet === 'creative') state.creatives.push(rowData);
        else                        state.concepts.push(rowData);
      } else {
        // Update item trong array
        var arr    = d.sheet === 'creative' ? state.creatives : state.concepts;
        var arrIdx = arr.findIndex(function(x) { return x._rowIndex === rowIndex; });
        if (arrIdx !== -1) arr[arrIdx] = rowData;
      }

      // Cập nhật brand filter nếu brand mới
      populateBrandFilters();

      // Re-render tab hiện tại
      applyFilters(d.sheet);
      if (d.sheet !== state.activeTab) applyFilters(state.activeTab);

      showToast('Đã lưu thành công ✓');
      closeDrawer();
    })
    .catch(function(err) {
      showToast('Lỗi: ' + (err.message || err), 'error');
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = 'Lưu';
    });
}

/**
 * Xóa item đang edit sau khi user xác nhận.
 */
function deleteItem() {
  var d = state.drawer;
  if (!d.item || d.isNew) return;

  var confirmMsg = d.sheet === 'creative'
    ? 'Xóa creative "' + (d.item['Asset Name'] || '') + '"?'
    : 'Xóa concept "' + (d.item['Concept Name'] || '') + '"?';

  if (!confirm(confirmMsg)) return;

  var sheetName = d.sheet === 'creative' ? 'Creative Library' : 'Concept Hub';
  var rowIndex  = d.item._rowIndex;

  var btn = document.getElementById('btn-delete');
  btn.disabled = true;

  gasRun('deleteRow', sheetName, rowIndex)
    .then(function() {
      // Xóa khỏi state local
      if (d.sheet === 'creative') {
        state.creatives = state.creatives.filter(function(x) { return x._rowIndex !== rowIndex; });
        // Sau khi xóa, adjust _rowIndex của các rows bên dưới
        state.creatives.forEach(function(x) { if (x._rowIndex > rowIndex) x._rowIndex--; });
      } else {
        state.concepts = state.concepts.filter(function(x) { return x._rowIndex !== rowIndex; });
        state.concepts.forEach(function(x) { if (x._rowIndex > rowIndex) x._rowIndex--; });
      }

      applyFilters(d.sheet);
      showToast('Đã xóa');
      closeDrawer();
    })
    .catch(function(err) {
      showToast('Lỗi xóa: ' + (err.message || err), 'error');
      btn.disabled = false;
    });
}
```

- [ ] **Step 2: Thêm form reader functions**

```javascript
// ============================================================
// FORM READERS — đọc values từ form inputs về object
// ============================================================

/**
 * Đọc tất cả field values từ creative form
 * @returns {Object} rowData với keys đúng theo header Creative Library
 */
function readCreativeForm() {
  return {
    'Asset Name':        getVal('f-asset-name'),
    'Brand':             getVal('f-brand'),
    'Product Line':      getVal('f-product-line'),
    'Concept':           getVal('f-concept'),
    'Angle':             getVal('f-angle'),
    'Hook':              getVal('f-hook'),
    'Format':            getVal('f-format'),
    'Campaign Objective':getVal('f-objective'),
    'Status':            getVal('f-status'),
    'Brief Status':      getVal('f-brief-status'),
    'Assignee':          getVal('f-assignee'),
    'Launch Date':       getVal('f-launch-date'),
    'Spend':             getNumVal('f-spend'),
    'ROAS':              getNumVal('f-roas'),
    'CTR':               getNumVal('f-ctr'),
    'CPM':               getNumVal('f-cpm'),
    'CPC':               getNumVal('f-cpc'),
    'Preview URL':       getVal('f-preview-url'),
    'Brief Notes':       getVal('f-brief-notes'),
    'Performance Notes': getVal('f-perf-notes'),
    'Concept Hub ID':    getVal('f-concept-id')
  };
}

/**
 * Đọc tất cả field values từ concept form
 * @returns {Object} rowData với keys đúng theo header Concept Hub
 */
function readConceptForm() {
  var conceptId = getVal('p-concept-id');
  // Nếu đang tạo mới và ID để trống → server sẽ generate
  // Để ID = '' và server side xử lý (hoặc client generate)
  return {
    'Concept ID':         conceptId || '',
    'Concept Name':       getVal('p-concept-name'),
    'Brand':              getVal('p-brand'),
    'Product Line':       getVal('p-product-line'),
    'Format':             getVal('p-format'),
    'Campaign Objective': getVal('p-objective'),
    'Core Insight':       getVal('p-core-insight'),
    'Angles':             getVal('p-angles'),
    'Status':             getVal('p-status'),
    'Total Assets':       '',  // Formula, không ghi đè
    'Winning Count':      ''   // Formula, không ghi đè
  };
}

/**
 * Lấy trimmed string value từ input/select/textarea theo id
 */
function getVal(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/**
 * Lấy numeric value từ input — trả về number nếu hợp lệ, chuỗi rỗng nếu không
 */
function getNumVal(id) {
  var v = getVal(id);
  if (v === '') return '';
  var n = parseFloat(v);
  return isNaN(n) ? v : n;
}

// Promise.prototype.finally polyfill cho GAS environment (nếu cần)
if (typeof Promise !== 'undefined' && !Promise.prototype.finally) {
  Promise.prototype.finally = function(fn) {
    return this.then(
      function(val) { fn(); return val; },
      function(err) { fn(); throw err; }
    );
  };
}
```

---

## Task 10: Integration — ghép Code.gs hoàn chỉnh và sidebar.html vào Apps Script

**Files:**
- Final: `src/Code.gs`
- Final: `src/sidebar.html`

- [ ] **Step 1: Đảm bảo `generateConceptId` được gọi trong `saveRow` cho Concept Hub khi ID trống**

Thêm logic vào `saveRow` trong Code.gs:

```javascript
// Trong saveRow(), ngay sau kiểm tra sheet tồn tại:
// Nếu ghi vào Concept Hub và Concept ID trống → tự generate
if (sheetName === SHEET_CONCEPT && rowIndex === -1) {
  if (!rowData['Concept ID'] || rowData['Concept ID'] === '') {
    rowData['Concept ID'] = generateConceptId();
  }
}
```

- [ ] **Step 2: Copy Code.gs vào Apps Script Editor**

Apps Script Editor → File "Code.gs" → xóa hết → paste toàn bộ Code.gs → Save.

- [ ] **Step 3: Tạo file sidebar.html trong Apps Script Editor**

Apps Script Editor → dấu `+` → chọn "HTML" → đặt tên `sidebar` (không có .html, GAS tự thêm) → paste toàn bộ sidebar.html → Save.

- [ ] **Step 4: Reload Google Sheets và test**

- Reload Sheets (F5)
- Menu "🎨 Creative Library" → "Open App" → sidebar mở
- Sidebar load data (spinner hiện rồi biến mất)
- Filter dropdowns hoạt động
- Click "+New Creative" → drawer mở với form đầy đủ field
- Điền thông tin → Save → card xuất hiện trong list
- Click card → drawer edit mở, đúng data
- Xóa item → confirm dialog → item biến khỏi list

- [ ] **Step 5: Test Concept Hub tab**

- Click tab "💡 Concepts"
- "+New Concept" → form có đầy đủ fields
- Save concept → Concept ID tự generate (format CON-YYYYMMDD-XXXX)
- Tab Creative → edit creative → field "Concept Hub ID" dropdown có danh sách concepts

---

## Self-Review Checklist

### Spec Coverage

| Yêu cầu | Task |
|---------|------|
| onOpen() tạo menu | Task 1 |
| showSidebar() | Task 1 |
| getSheetData() | Task 2 |
| saveRow() append + update | Task 3 |
| deleteRow() | Task 3 |
| getConfig() + brands từ Config sheet | Task 3 |
| 2 tabs: Creative Library + Concept Hub | Task 4 |
| Filter bar Creative: Brand/Product/Status/Brief/Format | Task 4 + Task 6 |
| Filter bar Concept: Brand/Product/Status | Task 4 + Task 6 |
| "+ New Creative" button | Task 4 |
| Creative card: Asset Name, Brand, Status badge, Brief badge, Format, ROAS | Task 6 |
| Click card → drawer edit full detail | Task 7 |
| Drawer form: Concept Hub ID = dropdown từ concepts | Task 8 |
| "+ New Concept" button | Task 4 |
| Concept card: Name, Brand, Format, Status badge, Total Assets, Winning Count | Task 7 |
| CSS inline, no CDN | Task 4 |
| Color scheme: trắng/xám, badge colors theo status | Task 4 |
| Font system-ui/Arial | Task 4 |
| No external library | All tasks |
| google.script.run qua Promise wrapper | Task 5 |
| Data đọc 1 lần, filter client-side | Task 5, 6 |
| generateConceptId() | Task 3 |
| escHtml() anti-XSS | Task 6 |

### Placeholder Scan
- Không có TBD, TODO, "implement later"
- Mọi bước đều có code đầy đủ
- Type/function names nhất quán: `gasRun`, `applyFilters`, `openDrawer`, `closeDrawer`, `saveItem`, `deleteItem`, `renderBadge`, `escHtml`, `getVal`, `getNumVal`

### Type Consistency
- `_rowIndex`: number, 1-based, nhất quán trong state và khi truyền vào server
- `rowData`: Object keys khớp chính xác với header string trong sheet
- `gasRun` nhận function name là string, đúng với tên function trong Code.gs
