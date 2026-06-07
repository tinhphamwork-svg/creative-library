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
  let data = {};
  if (e.parameter && e.parameter.data) {
    try {
      data = JSON.parse(e.parameter.data);
    } catch (_) {
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'data param không phải JSON hợp lệ' }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

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
    const idColIdx = headers.indexOf('id');
    if (idColIdx === -1) throw new Error('Cột id không tìm thấy trong sheet ' + brand);
    const newId = generateId();
    rowValues[idColIdx] = newId;
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
  const existing = getBrands();
  if (existing.includes(trimmed)) throw new Error('Brand đã tồn tại: ' + trimmed);
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
