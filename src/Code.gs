// ============================================================
// CREATIVE LIBRARY — Code.gs
// API backend via doGet: ?action=<name>&data=<JSON>&token=<google_id_token>
// ============================================================

const SHEET_CONFIG = 'Config';

// Whitelist email được phép truy cập
const ALLOWED_EMAILS = ['tinhpham.work@gmail.com'];

function verifyAuth(token) {
  if (!token) throw new Error('Unauthorized');
  const res = UrlFetchApp.fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token),
    { muteHttpExceptions: true }
  );
  const info = JSON.parse(res.getContentText());
  if (!info.email || info.email_verified !== 'true') throw new Error('Unauthorized');
  if (!ALLOWED_EMAILS.includes(info.email)) throw new Error('Access denied: ' + info.email);
}

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
  const token  = (e.parameter && e.parameter.token)  || '';
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
    verifyAuth(token);
    if (action === 'getBrands')        result = getBrands();
    else if (action === 'getCreatives')  result = getCreatives(data.brand);
    else if (action === 'getDropdowns')  result = DROPDOWNS;
    else if (action === 'saveCreative')  result = saveCreative(data.brand, data.row);
    else if (action === 'deleteCreative') result = deleteCreative(data.brand, data.id);
    else if (action === 'addBrand')      result = addBrand(data.brand);
    else if (action === 'sync')          result = syncMetaData();
    else if (action === 'addAction')     result = addAction(data.brand, data.creativeId, data.action, data.notes);
    else if (action === 'markActionDone') result = markActionDone(data.actionId);
    else if (action === 'getActions')    result = getActions(data.brand);
    else if (action === 'getCodes')      result = getCodes();
    else if (action === 'saveCode')      result = saveCode(data.code, data.type, data.description);
    else if (action === 'uploadBrandLogo') result = uploadBrandLogo(data.brandName, data.fileBase64, data.mimeType);
    else result = { error: 'Unknown action: ' + action };
  } catch (err) {
    result = { error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// BRAND CONFIG
// ============================================================

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

// ============================================================
// READ
// ============================================================

// Hàm nội bộ — trả về string[] để dùng trong các hàm GAS khác
function getBrandNames() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CONFIG);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .map(r => r[0])
    .filter(b => b !== '');
}

// Public API — trả về { name, logoUrl }[] cho frontend
function getBrands() {
  const names   = getBrandNames();
  const logoMap = getBrandConfigMap();
  return names.map(name => ({ name, logoUrl: logoMap[name] || '' }));
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

const CREATIVE_HEADERS = ['id','product','concept','angle','hook','format','status',
                          'brief_status','assignee','launch_date','spend','roas',
                          'ctr','cpm','preview_url','notes','meta_ad_id','last_synced',
                          'concept_code','angle_code','framework','framework_code',
                          'format_code','version','ad_name_code'];

const SHEET_ACTIONS = 'Actions';
const ACTION_HEADERS = ['id','brand','creative_id','action','created_at','notes','done'];

const SHEET_CODES = 'Code Legend';
const CODE_HEADERS = ['code','type','description'];

const SAMPLE_CODES = [
  // Brands
  ['BR01','brand','CRC - Curacoro'],
  // Concepts
  ['C01','concept','Transformation'],
  ['C02','concept','Problem Solution'],
  ['C03','concept','Social Proof'],
  ['C04','concept','Product Feature'],
  ['C05','concept','Education'],
  // Frameworks
  ['F01','framework','Pain Point'],
  ['F02','framework','Social Proof'],
  ['F03','framework','Authority'],
  ['F04','framework','Curiosity'],
  ['F05','framework','FOMO / Urgency'],
  // Angles
  ['A01','angle','Da khô bong tróc khi makeup'],
  ['A02','angle','Dùng nhiều sản phẩm vẫn thiếu ẩm'],
  ['A03','angle','Chi tiền nhiều nhưng không thấy kết quả'],
  ['A04','angle','Da căng rát sau khi rửa mặt'],
  ['A05','angle','10,000 khách hàng thấy cải thiện sau 2 tuần'],
  ['A06','angle','Bác sĩ da liễu khuyên dùng'],
  ['A07','angle','Tại sao da khô dù uống đủ nước'],
  ['A08','angle','Da nhạy cảm không dùng được hóa chất mạnh'],
  // Formats
  ['FT01','format','Video 9:16'],
  ['FT02','format','Static 1:1'],
  ['FT03','format','Static 4:5'],
  ['FT04','format','Carousel'],
  ['FT05','format','Story'],
];

function ensureBrandSheet(ss, brand) {
  let sheet = ss.getSheetByName(brand);
  if (!sheet) {
    sheet = ss.insertSheet(brand);
    sheet.getRange(1, 1, 1, CREATIVE_HEADERS.length).setValues([CREATIVE_HEADERS])
      .setFontWeight('bold').setBackground('#f1f5f9');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function saveCreative(brand, row) {
  if (!brand || !row) throw new Error('brand và row bắt buộc');
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureBrandSheet(ss, brand);

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
  const existing = getBrandNames();
  if (existing.includes(trimmed)) throw new Error('Brand đã tồn tại: ' + trimmed);
  configSheet.appendRow([trimmed]);

  ensureBrandSheet(ss, trimmed);
  return { added: trimmed };
}

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

// ============================================================
// SETUP (chạy 1 lần nếu Config tab chưa có)
// ============================================================

function setupConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_CONFIG)) {
    const sheet = ss.insertSheet(SHEET_CONFIG);
    sheet.getRange(1, 1).setValue('Brand').setFontWeight('bold').setBackground('#f1f5f9');
    sheet.setFrozenRows(1);
    Logger.log('✅ Config sheet đã tạo.');
  } else {
    Logger.log('Config sheet đã tồn tại.');
  }
  ensureActionsSheet(ss);
  Logger.log('✅ Actions sheet sẵn sàng.');
  setupCodeLegend(ss);
  migrateSheets();
  Logger.log('✅ Code Legend và schema migration xong.');
}

function authorizeExternalRequest() {
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
  Logger.log('✅ UrlFetchApp authorized.');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎨 Creative Library')
    .addItem('Setup Config (chạy lần đầu)', 'setupConfig')
    .addToUi();
}

// ============================================================
// CODE LEGEND
// ============================================================

function setupCodeLegend(ss) {
  let sheet = ss.getSheetByName(SHEET_CODES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CODES);
    sheet.getRange(1, 1, 1, CODE_HEADERS.length).setValues([CODE_HEADERS])
      .setFontWeight('bold').setBackground('#e0f2fe');
    sheet.setFrozenRows(1);
    if (SAMPLE_CODES.length > 0) {
      sheet.getRange(2, 1, SAMPLE_CODES.length, 3).setValues(SAMPLE_CODES);
    }
    Logger.log('✅ Code Legend sheet đã tạo với sample data.');
  } else {
    Logger.log('Code Legend sheet đã tồn tại.');
  }
  return sheet;
}

function getCodes() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CODES);
  if (!sheet || sheet.getLastRow() < 2) return {};
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  const grouped = {};
  values.forEach(([code, type, description]) => {
    if (!code || !type) return;
    if (!grouped[type]) grouped[type] = [];
    grouped[type].push({ code: String(code), description: String(description) });
  });
  return grouped;
}

function saveCode(code, type, description) {
  if (!code || !type || !description) throw new Error('code, type, description bắt buộc');
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_CODES);
  if (!sheet) throw new Error('Code Legend chưa tồn tại. Chạy setupConfig() trước.');
  const existing = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat().map(String)
    : [];
  if (existing.includes(String(code))) throw new Error('Code đã tồn tại: ' + code);
  sheet.appendRow([code, type, description]);
  return { saved: code };
}

function migrateSheets() {
  const ss     = SpreadsheetApp.getActiveSpreadsheet();
  const brands = getBrandNames();
  const log    = [];
  brands.forEach(brand => {
    const sheet = ss.getSheetByName(brand);
    if (!sheet) return;
    let headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const missing = CREATIVE_HEADERS.filter(h => !headers.includes(h));
    missing.forEach(h => {
      const col = headers.length + 1;
      sheet.getRange(1, col).setValue(h).setFontWeight('bold').setBackground('#f1f5f9');
      headers = [...headers, h];
    });
    if (missing.length > 0) log.push(brand + ': +' + missing.join(', '));
  });
  Logger.log(log.length ? log.join('\n') : 'Tất cả sheets đã up-to-date.');
  return log;
}

// ============================================================
// META SYNC
// ============================================================

// Pattern mới: CRC-C01-A01-F01-FT01-V1 (bắt đầu bằng code, phần còn lại tự do)
const CODE_AD_PATTERN = /^([A-Z0-9]+-C\d+-A\d+-F\d+-FT\d+-V\d+)/;
// Pattern cũ: [CR-YYYYMMDD-XXXX] (backward compat)
const LEGACY_AD_PATTERN = /\[CR-[\w-]+\]/;

function syncMetaData() {
  const ss       = SpreadsheetApp.getActiveSpreadsheet();
  const rawSheet = ss.getSheetByName('Meta_Raw');
  if (!rawSheet || rawSheet.getLastRow() < 2) return { updated: 0, skipped: 0, errors: [] };

  const rawValues  = rawSheet.getRange(1, 1, rawSheet.getLastRow(), rawSheet.getLastColumn()).getValues();
  const rawHeaders = rawValues[0];

  const col    = (name) => rawHeaders.indexOf(name);
  const adNameCol = col('ad_name');
  const adIdCol   = col('ad_id');
  const spendCol  = col('spend');
  const roasCol   = col('purchase_roas') !== -1 ? col('purchase_roas') : col('roas');
  const ctrCol    = col('ctr');
  const cpmCol    = col('cpm');

  if (adNameCol === -1) return { updated: 0, skipped: 0, errors: ['Meta_Raw thiếu cột ad_name'] };

  let updated = 0, skipped = 0;
  const errors = [];

  rawValues.slice(1).forEach((row) => {
    const adName = String(row[adNameCol] || '');
    const get    = (c) => c !== -1 ? row[c] : '';

    const updates = {
      spend:       get(spendCol),
      roas:        get(roasCol),
      ctr:         get(ctrCol),
      cpm:         get(cpmCol),
      meta_ad_id:  adIdCol !== -1 ? row[adIdCol] : '',
      last_synced: new Date().toISOString(),
    };

    // Thử match code pattern mới trước
    const newMatch = adName.match(CODE_AD_PATTERN);
    if (newMatch) {
      const adNameCode = newMatch[1];
      try {
        const found = findCreativeByAdCode(ss, adNameCode);
        if (!found) { skipped++; return; }
        applyUpdates(found, updates);
        updated++;
      } catch (e) { errors.push(adNameCode + ': ' + e.message); }
      return;
    }

    // Fallback: legacy [CR-ID] pattern
    const legacyMatch = adName.match(LEGACY_AD_PATTERN);
    if (legacyMatch) {
      const creativeId = legacyMatch[0].slice(1, -1);
      try {
        const found = findCreativeById(ss, creativeId);
        if (!found) { skipped++; return; }
        applyUpdates(found, updates);
        updated++;
      } catch (e) { errors.push(creativeId + ': ' + e.message); }
      return;
    }

    skipped++;
  });

  return { updated, skipped, errors };
}

function applyUpdates(found, updates) {
  const { sheet, rowIndex, headers } = found;
  Object.entries(updates).forEach(([key, val]) => {
    const colIdx = headers.indexOf(key);
    if (colIdx !== -1 && val !== '') {
      sheet.getRange(rowIndex, colIdx + 1).setValue(val);
    }
  });
}

function findCreativeByAdCode(ss, adNameCode) {
  const brands = getBrandNames();
  for (const brand of brands) {
    const sheet = ss.getSheetByName(brand);
    if (!sheet || sheet.getLastRow() < 2) continue;
    const headers    = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const codeColIdx = headers.indexOf('ad_name_code');
    if (codeColIdx === -1) continue;
    const codes  = sheet.getRange(2, codeColIdx + 1, sheet.getLastRow() - 1, 1).getValues().flat().map(String);
    const rowIdx = codes.indexOf(adNameCode);
    if (rowIdx !== -1) return { sheet, rowIndex: rowIdx + 2, headers };
  }
  return null;
}

function findCreativeById(ss, creativeId) {
  const brands = getBrandNames();
  for (const brand of brands) {
    const sheet = ss.getSheetByName(brand);
    if (!sheet || sheet.getLastRow() < 2) continue;
    const headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idColIdx = headers.indexOf('id');
    if (idColIdx === -1) continue;
    const ids    = sheet.getRange(2, idColIdx + 1, sheet.getLastRow() - 1, 1).getValues().flat().map(String);
    const rowIdx = ids.indexOf(creativeId);
    if (rowIdx !== -1) return { sheet, rowIndex: rowIdx + 2, headers };
  }
  return null;
}

// ============================================================
// ACTIONS QUEUE
// ============================================================

function ensureActionsSheet(ss) {
  let sheet = ss.getSheetByName(SHEET_ACTIONS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_ACTIONS);
    sheet.getRange(1, 1, 1, ACTION_HEADERS.length).setValues([ACTION_HEADERS])
      .setFontWeight('bold').setBackground('#f1f5f9');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function addAction(brand, creativeId, action, notes) {
  if (!brand || !creativeId || !action) throw new Error('brand, creativeId và action bắt buộc');
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ensureActionsSheet(ss);
  const id    = 'ACT-' + new Date().getTime();
  sheet.appendRow([id, brand, creativeId, action, new Date().toISOString(), notes || '', false]);
  return { id };
}

function markActionDone(actionId) {
  if (!actionId) throw new Error('actionId bắt buộc');
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheet   = ss.getSheetByName(SHEET_ACTIONS);
  if (!sheet || sheet.getLastRow() < 2) throw new Error('Actions tab trống');
  const headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idColIdx = headers.indexOf('id');
  const doneIdx  = headers.indexOf('done');
  if (idColIdx === -1 || doneIdx === -1) throw new Error('Actions tab thiếu cột id hoặc done');
  const ids    = sheet.getRange(2, idColIdx + 1, sheet.getLastRow() - 1, 1).getValues().flat();
  const rowIdx = ids.indexOf(actionId);
  if (rowIdx === -1) throw new Error('Action không tìm thấy: ' + actionId);
  sheet.getRange(rowIdx + 2, doneIdx + 1).setValue(true);
  return { done: actionId };
}

function getActions(brand) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ACTIONS);
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values  = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const headers = values[0];
  return values.slice(1)
    .filter(row => row.some(c => c !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i]; });
      return obj;
    })
    .filter(row => row.done !== true && row.done !== 'TRUE')
    .filter(row => !brand || row.brand === brand);
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
