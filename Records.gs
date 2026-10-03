/**
 * Records.gs: writing declarations to the spreadsheet.
 */

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('No spreadsheet yet. Run setup() first.');
  return SpreadsheetApp.openById(id);
}

function getDeclarationsSheet_() {
  const sheet = getSpreadsheet_().getSheetByName(CONFIG.DECLARATIONS_SHEET);
  if (!sheet) throw new Error('The "' + CONFIG.DECLARATIONS_SHEET + '" tab is missing. Run setup() again.');
  return sheet;
}

function getPdfFolder_() {
  const id = PropertiesService.getScriptProperties().getProperty('PDF_FOLDER_ID');
  if (!id) throw new Error('No PDF folder yet. Run setup() first.');
  return DriveApp.getFolderById(id);
}

/** NBA-GAD-2026-0001, NBA-GAD-2026-0002 … numbering restarts each calendar year. Call inside the script lock. */
function nextReference_(now) {
  const props = PropertiesService.getScriptProperties();
  const year = Utilities.formatDate(now, CONFIG.TIME_ZONE, 'yyyy');
  const key = 'SEQ_' + year;
  const n = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(n));
  return CONFIG.REFERENCE_PREFIX + '-' + year + '-' + String(n).padStart(4, '0');
}

/** Stops spreadsheet formulas sneaking in through form fields. */
function safeText_(v) {
  const s = String(v == null ? '' : v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/** Appends one declaration and returns its row number. Call inside the script lock. */
function appendDeclaration_(d, reference, now) {
  const sheet = getDeclarationsSheet_();
  const row = sheet.getLastRow() + 1;
  if (row > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 200);

  const values = [
    safeText_(d.title),
    safeText_(hmrcFirstName_(d.firstName)),
    safeText_(d.lastName),
    safeText_(d.house),
    d.postcode,
    reference,
    now,
    safeText_(d.firstName),
    safeText_(d.street),
    safeText_(d.line2),
    safeText_(d.town),
    safeText_(d.email),
    WORDING.version,
    'Active',
    '',
    '',
    ''
  ];

  // Keep everything as plain text except the two date columns, so that a
  // house number like "10" or "1-3" isn't turned into a number or a date.
  const formats = COLUMNS.map(function (_, i) {
    if (i === 6) return 'dd/mm/yyyy hh:mm';
    if (i === 14) return 'dd/mm/yyyy';
    return '@';
  });

  const range = sheet.getRange(row, 1, 1, COLUMNS.length);
  range.setNumberFormats([formats]);
  range.setValues([values]);
  return row;
}

function setPdfLink_(row, url) {
  const link = SpreadsheetApp.newRichTextValue().setText('Open PDF').setLinkUrl(url).build();
  getDeclarationsSheet_().getRange(row, COL.PDF).setRichTextValue(link);
}

function addNote_(row, text) {
  const cell = getDeclarationsSheet_().getRange(row, COL.NOTES);
  const existing = String(cell.getValue() || '');
  cell.setValue(safeText_(existing ? existing + ' | ' + text : text));
}
