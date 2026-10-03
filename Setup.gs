/**
 * Setup.gs: run these from the Apps Script editor (not from the web page).
 *
 *   setup()               creates the Drive folders and spreadsheet (safe to run again)
 *   checkSetup()          reports what's in place and what's missing
 *   testPostcodeLookup()  looks up Ideal Postcodes' free test postcode ID1 1QD
 *   testPdf()             makes a sample PDF in the PDF folder
 *   testEmail()           sends a sample confirmation email to you
 */

function setup() {
  const props = PropertiesService.getScriptProperties();

  const folder = getOrCreateFolder_(props, 'FOLDER_ID', CONFIG.DRIVE_FOLDER_NAME, DriveApp.getRootFolder());
  const pdfFolder = getOrCreateFolder_(props, 'PDF_FOLDER_ID', CONFIG.PDF_FOLDER_NAME, folder);

  let ss;
  const existingId = props.getProperty('SPREADSHEET_ID');
  if (existingId) {
    ss = SpreadsheetApp.openById(existingId);
  } else {
    ss = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
    DriveApp.getFileById(ss.getId()).moveTo(folder);
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  ss.setSpreadsheetTimeZone(CONFIG.TIME_ZONE);

  ensureDeclarationsSheet_(ss);
  ensureWordingSheet_(ss);

  console.log('Setup complete.');
  console.log('Folder:      ' + folder.getUrl());
  console.log('PDF folder:  ' + pdfFolder.getUrl());
  console.log('Spreadsheet: ' + ss.getUrl());
}

function getOrCreateFolder_(props, key, name, parent) {
  const id = props.getProperty(key);
  if (id) {
    try {
      const f = DriveApp.getFolderById(id);
      if (!f.isTrashed()) return f;
    } catch (err) {
      // fall through and create a new one
    }
  }
  const folder = parent.createFolder(name);
  props.setProperty(key, folder.getId());
  return folder;
}

function ensureDeclarationsSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.DECLARATIONS_SHEET);
  if (!sheet) {
    const first = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && first.getLastRow() === 0 && first.getName() !== CONFIG.WORDING_SHEET) {
      sheet = first.setName(CONFIG.DECLARATIONS_SHEET);
    } else {
      sheet = ss.insertSheet(CONFIG.DECLARATIONS_SHEET, 0);
    }
  }

  const header = sheet.getRange(1, 1, 1, COLUMNS.length);
  header.setValues([COLUMNS])
    .setFontWeight('bold')
    .setBackground('#F6F3F1')
    .setVerticalAlignment('middle')
    .setWrap(true);
  // Columns A–E match the HMRC schedule: highlight them.
  sheet.getRange(1, 1, 1, 5).setBackground('#FBE3E1');
  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 42);

  const widths = [60, 120, 140, 150, 90, 160, 150, 130, 180, 140, 130, 220, 80, 90, 100, 220, 90];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  // Plain text everywhere except the two date columns.
  const last = sheet.getMaxRows();
  sheet.getRange(2, 1, last - 1, 6).setNumberFormat('@');
  sheet.getRange(2, 7, last - 1, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  sheet.getRange(2, 8, last - 1, 7).setNumberFormat('@');
  sheet.getRange(2, 15, last - 1, 1).setNumberFormat('dd/mm/yyyy');
  sheet.getRange(2, 16, last - 1, 2).setNumberFormat('@');

  // Status: Active / Cancelled
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Active', 'Cancelled'], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, COL.STATUS, last - 1, 1).setDataValidation(statusRule);

  // Grey out cancelled rows.
  const whole = sheet.getRange(2, 1, last - 1, COLUMNS.length);
  const rules = sheet.getConditionalFormatRules().filter(function (r) {
    const c = r.getBooleanCondition();
    return !(c && String(c.getCriteriaValues()[0]).indexOf('Cancelled') !== -1);
  });
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$N2="Cancelled"')
    .setBackground('#EEEEEE')
    .setFontColor('#767676')
    .setRanges([whole])
    .build());
  sheet.setConditionalFormatRules(rules);

  // Warn (not block) anyone about to edit the header row.
  const already = sheet.getProtections(SpreadsheetApp.ProtectionType.RANGE).some(function (p) {
    return p.getDescription() === 'Header row';
  });
  if (!already) {
    sheet.getRange(1, 1, 1, COLUMNS.length).protect().setDescription('Header row').setWarningOnly(true);
  }
}

function ensureWordingSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.WORDING_SHEET);
  if (!sheet) sheet = ss.insertSheet(CONFIG.WORDING_SHEET);
  const paragraphs = declarationParagraphs_();
  const headers = ['Version', 'In use from'].concat(paragraphs.map(function (_, i) { return 'Paragraph ' + (i + 1); }));
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#F6F3F1');
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 80);
  sheet.setColumnWidth(2, 110);
  for (let i = 3; i <= headers.length; i++) sheet.setColumnWidth(i, 420);

  const versions = sheet.getLastRow() > 1
    ? sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().map(function (r) { return String(r[0]); })
    : [];
  if (versions.indexOf(WORDING.version) === -1) {
    const row = sheet.getLastRow() + 1;
    const range = sheet.getRange(row, 1, 1, headers.length);
    range.setNumberFormat('@');
    range.setValues([[WORDING.version, WORDING.inUseFrom].concat(paragraphs)]);
    range.setWrap(true).setVerticalAlignment('top');
  }
}

/* ---------- Checks and tests ---------- */

function checkSetup() {
  const props = PropertiesService.getScriptProperties();
  const lines = [];
  lines.push('Ideal Postcodes key: ' + (props.getProperty('IDEAL_POSTCODES_API_KEY') ? 'set' : 'MISSING – add IDEAL_POSTCODES_API_KEY in Project Settings → Script Properties'));
  try {
    lines.push('Spreadsheet: ' + getSpreadsheet_().getUrl());
  } catch (err) {
    lines.push('Spreadsheet: MISSING – run setup()');
  }
  try {
    lines.push('PDF folder: ' + getPdfFolder_().getUrl());
  } catch (err) {
    lines.push('PDF folder: MISSING – run setup()');
  }
  lines.push('Running as: ' + Session.getEffectiveUser().getEmail());
  lines.push('Emails left today: ' + MailApp.getRemainingDailyQuota());
  lines.push('Privacy notice link: ' + (CONFIG.PRIVACY_NOTICE_URL || 'not set (link hidden on the form)'));
  console.log(lines.join('\n'));
}

function testPostcodeLookup() {
  const result = lookupPostcode('ID1 1QD');
  console.log(JSON.stringify(result, null, 2));
}

function sampleDeclaration_() {
  return {
    title: 'Mrs', firstName: 'Test', lastName: 'Donor', email: Session.getEffectiveUser().getEmail(),
    house: '1', street: 'Example Road', line2: '', town: 'Nottingham', postcode: 'NG1 1AB', agree: true
  };
}

function testPdf() {
  const file = createDeclarationPdf_(sampleDeclaration_(), 'TEST-0000', new Date());
  console.log('Sample PDF: ' + file.getUrl() + '\nMove it to the bin once you have checked it.');
}

function testEmail() {
  const d = sampleDeclaration_();
  const pdf = createDeclarationPdf_(d, 'TEST-0000', new Date());
  sendDonorEmail_(d, 'TEST-0000', new Date(), pdf);
  console.log('Sample email sent to ' + d.email + '. Sample PDF: ' + pdf.getUrl());
}
