/**
 * Nottingham Bengali Association – Gift Aid declaration web app
 * Config.gs: everything a trustee might need to change lives here.
 *
 * Secrets (the Ideal Postcodes API key) are NOT stored in this file.
 * They live in Project Settings → Script Properties. See README.md.
 */

const CONFIG = {
  // About the charity
  CHARITY_NAME: 'Nottingham Bengali Association',
  CHARITY_NUMBER: '1211066',
  CONTACT_EMAIL: 'connect@nottinghambengaliassociation.co.uk',
  WEBSITE_URL: 'https://nottinghambengaliassociation.co.uk',

  // Link shown under the submit button. Leave '' to hide the link.
  PRIVACY_NOTICE_URL: '',

  // Where declarations are kept (created by setup())
  SPREADSHEET_NAME: 'nba-gift-aid-declaration-2026',
  DRIVE_FOLDER_NAME: 'NBA Gift Aid declarations',
  PDF_FOLDER_NAME: 'Declaration PDFs',
  DECLARATIONS_SHEET: 'Declarations',
  WORDING_SHEET: 'Wording',

  // References look like NBA-GAD-2026-0001
  REFERENCE_PREFIX: 'NBA-GAD',

  TIME_ZONE: 'Europe/London',

  // Emails
  SEND_DONOR_EMAIL: true,          // confirmation email to the donor
  ATTACH_PDF_TO_DONOR_EMAIL: true, // attach the PDF copy to that email
  NOTIFY_CHARITY: true,            // short notice to CONTACT_EMAIL for each new declaration

  // Postcode lookup
  POSTCODE_CACHE_SECONDS: 21600,   // reuse a postcode's results for 6 hours (saves lookups)
  LOOKUPS_PER_MINUTE_LIMIT: 60,    // simple brake against bots; real cap is set in Ideal Postcodes

  // Optional: an https link to a small PNG/ICO to use as the browser tab icon
  FAVICON_URL: ''
};

/**
 * The declaration wording. If you ever change it:
 *   1. give it a new version (v2, v3 …) and the date it comes into use,
 *   2. run setup() once, which adds the new wording to the Wording tab.
 * Every declaration row records which version the donor agreed to.
 */
const WORDING = {
  version: 'v1',
  inUseFrom: '2026-10-03'
};

function declarationParagraphs_() {
  return [
    'I want to Gift Aid any donations I make in the future or have made in the past 4 years to ' +
      CONFIG.CHARITY_NAME + '.',
    'I am a UK taxpayer and understand that if I pay less Income Tax and/or Capital Gains Tax than the ' +
      'amount of Gift Aid claimed on all my donations in that tax year it is my responsibility to pay any difference.'
  ];
}

const HIGHER_RATE_NOTE =
  'If you pay Income Tax at the higher or additional rate and want to receive the additional tax relief due to you, ' +
  'you must include all your Gift Aid donations on your Self Assessment tax return or ask HM Revenue and Customs ' +
  'to adjust your tax code.';

const NOTIFY_ITEMS = [
  'want to cancel this declaration',
  'change your name or home address',
  'no longer pay sufficient tax on your income and/or capital gains'
];

const TITLES = ['Mr', 'Mrs', 'Ms', 'Miss', 'Dr'];

/**
 * Spreadsheet columns. A–E match the HMRC Gift Aid schedule so they can be
 * copied straight across at claim time. Don't reorder these once live.
 */
const COLUMNS = [
  'Title',                      // A  (HMRC: up to 4 characters)
  'First name',                 // B  (HMRC: up to 35 characters, no spaces)
  'Last name',                  // C  (HMRC: up to 35 characters)
  'House name or number',       // D  (HMRC: up to 40 characters)
  'Postcode',                   // E  (HMRC: upper case with a space)
  'Reference',                  // F
  'Declaration date and time',  // G
  'First name as typed',        // H
  'Street',                     // I
  'Address line 2',             // J
  'Town or city',               // K
  'Email',                      // L
  'Wording version',            // M
  'Status',                     // N  Active / Cancelled
  'Cancelled on',               // O
  'Notes',                      // P
  'PDF'                         // Q
];

const COL = {
  STATUS: 14,
  NOTES: 16,
  PDF: 17
};
