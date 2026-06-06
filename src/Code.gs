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
  format:            ['Video 9:16', 'Static 1:1', 'Static 4:5', 'Carousel', 'Story'],
  statusCreative:    ['Testing', 'Winning', 'Scaling', 'Fatigued', 'Killed'],
  briefStatus:       ['Not Briefed', 'Briefed', 'In Production', 'Ready to Launch', 'Live'],
  statusConcept:     ['Active', 'Paused', 'Killed'],
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
 * Mở sidebar HTML — file 'sidebar.html' phải tồn tại trong Apps Script project
 */
function showSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('Creative Library')
    .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ============================================================
// DATA READ
// ============================================================

/**
 * Đọc toàn bộ data từ sheet, trả về array of objects với header làm key.
 * Row đầu tiên được dùng làm header (key của object).
 * @param {string} sheetName - Tên sheet cần đọc
 * @returns {Array<Object>} - Mảng objects, mỗi object là 1 row, có thêm _rowIndex
 */
function getSheetData(sheetName) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);

  // Trả về mảng rỗng nếu sheet không tồn tại
  if (!sheet) return [];

  var lastRow = sheet.getLastRow();
  // Chỉ có header hoặc sheet trống, không có data
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

    // Bỏ qua row hoàn toàn trống
    var hasData = row.some(function(cell) { return cell !== ''; });
    if (!hasData) continue;

    var obj = { _rowIndex: i + 1 }; // row number thực tế trên sheet (1-based, row 1 = header)
    headers.forEach(function(header, colIdx) {
      obj[header] = row[colIdx];
    });
    result.push(obj);
  }

  return result;
}

// ============================================================
// DATA WRITE
// ============================================================

/**
 * Ghi 1 row vào sheet.
 * Nếu rowIndex = -1: append row mới xuống cuối.
 * Nếu rowIndex > 0: update row đó (rowIndex là số thực tế trên sheet, 1-based).
 *
 * Đặc biệt: khi ghi vào Concept Hub với row mới và Concept ID trống → tự generate ID.
 *
 * @param {string} sheetName - Tên sheet
 * @param {Object} rowData   - Object { headerKey: value } — keys phải khớp với header
 * @param {number} rowIndex  - Row index thực tế trên sheet (1-based). -1 = append mới.
 * @returns {number} - Row index đã ghi (để client cập nhật _rowIndex trong state)
 */
function saveRow(sheetName, rowData, rowIndex) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet không tồn tại: ' + sheetName);

  // Khi tạo concept mới và Concept ID để trống → tự generate
  if (sheetName === SHEET_CONCEPT && rowIndex === -1) {
    if (!rowData['Concept ID'] || String(rowData['Concept ID']).trim() === '') {
      rowData['Concept ID'] = generateConceptId();
    }
  }

  // Lấy header từ row 1 để xác định thứ tự cột
  var lastCol  = sheet.getLastColumn();
  var headers  = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

  // Kiểm tra duplicate header để tránh ghi sai cột
  var _seen = {};
  headers.forEach(function(h) {
    if (h && _seen[h]) throw new Error('Duplicate header trong sheet ' + sheetName + ': ' + h);
    if (h) _seen[h] = true;
  });

  // Tạo mảng values theo đúng thứ tự header
  var rowValues = headers.map(function(header) {
    var val = rowData[header];
    return (val !== undefined && val !== null) ? val : '';
  });

  if (rowIndex === -1) {
    // Append row mới xuống cuối sheet
    var newRowIndex = sheet.getLastRow() + 1; // tính trước để tránh race condition
    sheet.appendRow(rowValues);
    return newRowIndex;
  } else {
    // Update row đã có — ghi đè toàn bộ row
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    return rowIndex;
  }
}

/**
 * Xóa 1 row theo index thực tế trên sheet (1-based).
 * Không cho phép xóa header (row 1).
 * @param {string} sheetName - Tên sheet
 * @param {number} rowIndex  - Row index thực tế (1-based)
 */
function deleteRow(sheetName, rowIndex) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet không tồn tại: ' + sheetName);
  if (rowIndex <= 1) throw new Error('Không thể xóa header row (row 1)');
  sheet.deleteRow(rowIndex);
}

// ============================================================
// CONFIG
// ============================================================

/**
 * Trả về config object gồm:
 * - brands: danh sách brands từ sheet Config (cột A, bỏ header)
 * - dropdowns: các giá trị dropdown cố định
 *
 * Sheet Config: row 1 = header "Brand", row 2+ = tên brand
 * Nếu không có sheet Config → brands = []
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

// ============================================================
// UTILITIES
// ============================================================

/**
 * Tạo Concept ID duy nhất dạng "CON-YYYYMMDD-XXXX"
 * Kiểm tra trùng với Concept ID đã có trong sheet trước khi return
 * @returns {string} - Concept ID mới, đảm bảo không trùng
 */
function generateConceptId() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_CONCEPT);

  // Lấy danh sách Concept ID đã tồn tại để tránh trùng
  var existing = [];
  if (sheet && sheet.getLastRow() >= 2) {
    var rows = getSheetData(SHEET_CONCEPT);
    existing = rows.map(function(r) { return r['Concept ID'] || ''; });
  }

  var id, attempts = 0;
  do {
    var now    = new Date();
    var date   = Utilities.formatDate(now, Session.getScriptTimeZone(), 'yyyyMMdd');
    var random = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    id = 'CON-' + date + '-' + random;
    attempts++;
  } while (existing.indexOf(id) !== -1 && attempts < 20);

  return id;
}
