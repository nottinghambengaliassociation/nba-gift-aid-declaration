/**
 * Code.gs: serves the form and receives submissions.
 *
 * Functions whose names end in "_" are private: the browser cannot call them.
 * The browser can only call lookupPostcode() (Postcode.gs) and submitDeclaration().
 */

function doGet() {
  const template = HtmlService.createTemplateFromFile('Index');
  template.cfg = {
    charityName: CONFIG.CHARITY_NAME,
    charityNumber: CONFIG.CHARITY_NUMBER,
    contactEmail: CONFIG.CONTACT_EMAIL,
    websiteUrl: CONFIG.WEBSITE_URL,
    privacyUrl: CONFIG.PRIVACY_NOTICE_URL
  };
  template.logo = getLogoDataUri_();
  template.paragraphs = declarationParagraphs_();
  template.notifyItems = NOTIFY_ITEMS;
  template.higherRateNote = HIGHER_RATE_NOTE;
  template.titles = TITLES;

  const page = template.evaluate()
    .setTitle('Gift Aid declaration – ' + CONFIG.CHARITY_NAME)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  if (CONFIG.FAVICON_URL) page.setFaviconUrl(CONFIG.FAVICON_URL);
  return page;
}

/** Used by Index.html to pull in Styles.html and Client.html. */
function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

function getLogoDataUri_() {
  return HtmlService.createHtmlOutputFromFile('Logo').getContent().trim();
}

function getLogoBlob_() {
  const b64 = getLogoDataUri_().replace(/^data:image\/png;base64,/, '');
  return Utilities.newBlob(Utilities.base64Decode(b64), 'image/png', 'nba-logo.png');
}

/**
 * Called from the browser with the form's values.
 * Returns { ok: true, ... } or { ok: false, errors: { field: message } }.
 */
function submitDeclaration(input) {
  input = input || {};

  // Honeypot: a hidden field people never see. Bots that fill it get a
  // normal-looking reply, and nothing is saved.
  if (input.website) {
    return { ok: true, reference: 'Received', firstName: '', email: '', name: '', address: '', dateText: '', sinceText: '' };
  }

  const checked = validateDeclaration_(input);
  if (!checked.ok) return { ok: false, errors: checked.errors };
  const d = checked.value;

  // Stop accidental double submissions (same person within 10 minutes).
  const cache = CacheService.getScriptCache();
  const dupKey = 'dup_' + hash_([d.email.toLowerCase(), d.postcode, d.lastName.toLowerCase()].join('|'));
  const previous = cache.get(dupKey);
  if (previous) return JSON.parse(previous);

  const now = new Date();
  let reference;
  let row;
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    reference = nextReference_(now);
    row = appendDeclaration_(d, reference, now);
  } finally {
    lock.releaseLock();
  }

  // The declaration is now safely recorded. PDF and emails come next;
  // if either fails, the row says so in the Notes column.
  const problems = [];
  let pdfFile = null;

  try {
    pdfFile = createDeclarationPdf_(d, reference, now);
    setPdfLink_(row, pdfFile.getUrl());
  } catch (err) {
    console.error('PDF failed for ' + reference + ': ' + err);
    problems.push('PDF not created: ' + err.message);
  }

  if (CONFIG.SEND_DONOR_EMAIL) {
    try {
      sendDonorEmail_(d, reference, now, pdfFile);
    } catch (err) {
      console.error('Donor email failed for ' + reference + ': ' + err);
      problems.push('Confirmation email not sent: ' + err.message);
    }
  }

  if (CONFIG.NOTIFY_CHARITY) {
    try {
      sendCharityNotification_(d, reference, now, pdfFile);
    } catch (err) {
      console.error('Charity notification failed for ' + reference + ': ' + err);
      problems.push('Charity notification not sent: ' + err.message);
    }
  }

  if (problems.length) addNote_(row, problems.join(' | '));

  const since = new Date(now.getTime());
  since.setFullYear(since.getFullYear() - 4);

  const result = {
    ok: true,
    reference: reference,
    firstName: d.firstName,
    email: d.email,
    name: [d.title, d.firstName, d.lastName].filter(String).join(' '),
    address: addressLines_(d).join('\n'),
    dateText: Utilities.formatDate(now, CONFIG.TIME_ZONE, 'd MMMM yyyy'),
    sinceText: Utilities.formatDate(since, CONFIG.TIME_ZONE, 'd MMMM yyyy')
  };
  cache.put(dupKey, JSON.stringify(result), 600);
  return result;
}

/** Server-side checks. These mirror the checks in the browser, which can't be trusted on their own. */
function validateDeclaration_(f) {
  const clean = function (v, max) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  };

  const v = {
    title: clean(f.title, 10),
    firstName: clean(f.firstName, 35),
    lastName: clean(f.lastName, 35),
    email: clean(f.email, 254),
    house: clean(f.house, 40),
    street: clean(f.street, 100),
    line2: clean(f.line2, 100),
    town: clean(f.town, 60),
    postcode: formatPostcode_(clean(f.postcode, 10)),
    agree: f.agree === true
  };
  if (TITLES.indexOf(v.title) === -1) v.title = '';

  const e = {};
  if (!v.firstName) e.first = 'Enter your first name';
  if (!v.lastName) e.last = 'Enter your last name';
  if (!v.email) e.email = 'Enter your email address';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Enter an email address in the correct format, like name@example.com';
  if (!v.house) e.house = 'Enter your house name or number';
  if (!v.street) e.line1 = 'Enter your street';
  if (!v.town) e.town = 'Enter your town or city';
  if (!isValidPostcode_(v.postcode)) e.addrPc = 'Enter a full UK postcode, like NG1 1AB';
  if (!v.agree) e.agree = 'Tick the box to confirm you want to Gift Aid your donations';

  return Object.keys(e).length ? { ok: false, errors: e } : { ok: true, value: v };
}

function isValidPostcode_(pc) {
  return /^[A-Z]{1,2}[0-9][A-Z0-9]? [0-9][A-Z]{2}$/.test(pc || '');
}

/** "ng11ab" → "NG1 1AB" */
function formatPostcode_(pc) {
  const c = String(pc || '').replace(/\s+/g, '').toUpperCase();
  return c.length > 3 ? c.slice(0, -3) + ' ' + c.slice(-3) : c;
}

/** HMRC's schedule wants first names with no spaces: "Mary Ann" → "Mary-Ann". */
function hmrcFirstName_(name) {
  return String(name || '').trim().replace(/\s+/g, '-').slice(0, 35);
}

function addressLines_(d) {
  return [(d.house + ' ' + d.street).trim(), d.line2, d.town, d.postcode].filter(String);
}

function hash_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).slice(0, 32);
}
