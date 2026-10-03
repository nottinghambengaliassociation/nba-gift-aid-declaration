/**
 * Documents.gs: the PDF copy of each declaration and the two emails.
 *
 * Google's HTML-to-PDF converter only understands simple CSS, so these
 * layouts use tables and inline styles rather than the form's flexbox/grid.
 */

const INK = '#221C19';
const MUTED = '#5E5550';
const ACCENT = '#9B1C20';
const GOLD = '#D9A23A';
const RULE = '#DDD5CF';
const SOFT = '#F6F3F1';
const DECL_BG = '#FBF3F1';
const DECL_LINE = '#EBD3CE';

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatWhen_(now) {
  return Utilities.formatDate(now, CONFIG.TIME_ZONE, 'd MMMM yyyy, HH:mm');
}

/* ---------- PDF ---------- */

function createDeclarationPdf_(d, reference, now) {
  const html = buildPdfHtml_(d, reference, now);
  const pdf = Utilities.newBlob(html, 'text/html', reference + '.html').getAs('application/pdf');
  pdf.setName(reference + ' ' + d.lastName.replace(/[\\/:*?"<>|]/g, '') + '.pdf');
  return getPdfFolder_().createFile(pdf);
}

function buildPdfHtml_(d, reference, now) {
  const label = function (t) {
    return '<div style="font-size:9pt;font-weight:bold;color:' + MUTED + ';">' + esc_(t) + '</div>';
  };
  const value = function (t) {
    return '<div style="font-size:12pt;">' + (t ? esc_(t) : '–') + '</div>';
  };
  const addressLine = [(d.house + ' ' + d.street).trim(), d.line2, d.town].filter(String).join(', ');
  const paragraphs = declarationParagraphs_().map(function (p) {
    return '<p style="margin:0 0 8px 0;font-size:12pt;line-height:1.45;">' + esc_(p) + '</p>';
  }).join('');
  const notify = NOTIFY_ITEMS.map(function (i) { return '<li>' + esc_(i) + '</li>'; }).join('');

  return '<!doctype html><html><head><meta charset="utf-8"><style>' +
    '@page { size: A4; margin: 14mm 16mm; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: ' + INK + '; font-size: 11pt; line-height: 1.4; margin: 0; }' +
    'table { border-collapse: collapse; width: 100%; }' +
    'td { vertical-align: top; }' +
    '</style></head><body>' +

    '<div style="height:6px;background:' + ACCENT + ';"></div>' +
    '<div style="height:2px;background:' + GOLD + ';margin-bottom:18px;"></div>' +

    '<table><tr>' +
      '<td style="width:64px;"><img src="' + getLogoDataUri_() + '" width="56" height="56" alt=""></td>' +
      '<td style="padding-left:10px;vertical-align:middle;">' +
        '<div style="font-size:14pt;font-weight:bold;">' + esc_(CONFIG.CHARITY_NAME) + '</div>' +
        '<div style="font-size:9.5pt;color:' + MUTED + ';">Registered Charity No. ' + esc_(CONFIG.CHARITY_NUMBER) + '</div>' +
      '</td>' +
      '<td style="text-align:right;vertical-align:middle;font-size:9.5pt;color:' + MUTED + ';">' +
        esc_(CONFIG.WEBSITE_URL.replace(/^https?:\/\//, '')) + '<br>' + esc_(CONFIG.CONTACT_EMAIL) +
      '</td>' +
    '</tr></table>' +

    '<div style="margin-top:18px;font-size:22pt;font-weight:bold;">Gift Aid declaration</div>' +
    '<div style="color:' + MUTED + ';margin-bottom:14px;">Covers donations made in the 4 years before the date below, and all future donations</div>' +

    '<table style="background:' + SOFT + ';border:1px solid ' + RULE + ';"><tr>' +
      '<td style="padding:8px 10px;border-right:1px solid ' + RULE + ';">' + label('Reference') + '<b>' + esc_(reference) + '</b></td>' +
      '<td style="padding:8px 10px;border-right:1px solid ' + RULE + ';">' + label('Date and time') + '<b>' + esc_(formatWhen_(now)) + '</b></td>' +
      '<td style="padding:8px 10px;border-right:1px solid ' + RULE + ';">' + label('Made by') + '<b>Online form</b></td>' +
      '<td style="padding:8px 10px;">' + label('Wording version') + '<b>' + esc_(WORDING.version) + '</b></td>' +
    '</tr></table>' +

    '<div style="margin-top:18px;font-size:14pt;font-weight:bold;padding-bottom:4px;border-bottom:1px solid ' + RULE + ';">Donor details</div>' +
    '<table style="margin-top:8px;">' +
      '<tr>' +
        '<td style="width:20%;padding:4px 10px 8px 0;">' + label('Title') + value(d.title) + '</td>' +
        '<td style="width:40%;padding:4px 10px 8px 0;">' + label('First name') + value(d.firstName) + '</td>' +
        '<td style="width:40%;padding:4px 0 8px 0;">' + label('Last name') + value(d.lastName) + '</td>' +
      '</tr>' +
      '<tr><td colspan="3" style="padding:4px 0 8px 0;">' + label('Home address') + value(addressLine) + '</td></tr>' +
      '<tr>' +
        '<td style="padding:4px 10px 4px 0;">' + label('Postcode') + value(d.postcode) + '</td>' +
        '<td colspan="2" style="padding:4px 0;">' + label('Email') + value(d.email) + '</td>' +
      '</tr>' +
    '</table>' +

    '<div style="margin-top:16px;font-size:14pt;font-weight:bold;padding-bottom:4px;border-bottom:1px solid ' + RULE + ';">Declaration</div>' +
    '<div style="margin-top:8px;background:' + DECL_BG + ';border:1px solid ' + DECL_LINE + ';padding:12px 14px;">' +
      '<div style="font-size:12.5pt;font-weight:bold;margin-bottom:8px;">' +
        '<span style="display:inline-block;width:14px;height:14px;border:1.5px solid ' + INK + ';text-align:center;line-height:14px;font-size:11pt;color:' + ACCENT + ';margin-right:8px;">&#10003;</span>' +
        'Yes, I want to Gift Aid my donations' +
      '</div>' +
      paragraphs +
    '</div>' +

    '<div style="margin-top:16px;font-size:12pt;font-weight:bold;">Please notify the charity if you</div>' +
    '<ul style="margin:4px 0 8px 0;padding-left:20px;">' + notify + '</ul>' +
    '<div style="font-size:9.5pt;color:' + MUTED + ';">' + esc_(HIGHER_RATE_NOTE) + '</div>' +

    '<table style="margin-top:28px;border-top:1px solid ' + RULE + ';font-size:9pt;color:' + MUTED + ';"><tr>' +
      '<td style="padding-top:6px;">' + esc_(CONFIG.CHARITY_NAME) + ' · Registered Charity No. ' + esc_(CONFIG.CHARITY_NUMBER) + '</td>' +
      '<td style="padding-top:6px;text-align:right;">Reference ' + esc_(reference) + '</td>' +
    '</tr></table>' +

    '</body></html>';
}

/* ---------- Donor confirmation email ---------- */

function sendDonorEmail_(d, reference, now, pdfFile) {
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily email quota used up');

  const subject = 'Your Gift Aid declaration – thank you';
  const options = {
    name: CONFIG.CHARITY_NAME,
    replyTo: CONFIG.CONTACT_EMAIL,
    htmlBody: buildDonorEmailHtml_(d, reference, now),
    inlineImages: { logo: getLogoBlob_() }
  };
  if (CONFIG.ATTACH_PDF_TO_DONOR_EMAIL && pdfFile) {
    options.attachments = [pdfFile.getAs('application/pdf')];
  }
  MailApp.sendEmail(d.email, subject, buildDonorEmailText_(d, reference, now), options);
}

function buildDonorEmailHtml_(d, reference, now) {
  const row = function (k, v) {
    return '<tr>' +
      '<td style="padding:5px 14px 5px 0;font-weight:bold;color:' + MUTED + ';white-space:nowrap;vertical-align:top;">' + esc_(k) + '</td>' +
      '<td style="padding:5px 0;vertical-align:top;">' + v + '</td>' +
    '</tr>';
  };
  const addr = esc_([(d.house + ' ' + d.street).trim(), d.line2, d.town, d.postcode].filter(String).join(', '));
  const paragraphs = declarationParagraphs_().map(function (p) {
    return '<p style="margin:0 0 10px 0;">' + esc_(p) + '</p>';
  }).join('');
  const notify = NOTIFY_ITEMS.map(function (i) { return '<li>' + esc_(i) + '</li>'; }).join('');
  const font = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";

  return '<!doctype html><html><body style="margin:0;padding:0;background:#EFEBE8;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEBE8;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#FFFFFF;' + font + 'color:' + INK + ';font-size:16px;line-height:1.6;">' +
      '<tr><td style="height:8px;background:' + ACCENT + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +
      '<tr><td style="height:3px;background:' + GOLD + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +
      '<tr><td style="padding:28px 32px 8px 32px;">' +
        '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
          '<td style="padding-right:12px;"><img src="cid:logo" width="56" height="56" alt="' + esc_(CONFIG.CHARITY_NAME) + ' logo" style="display:block;"></td>' +
          '<td style="vertical-align:middle;"><div style="font-weight:bold;font-size:16px;line-height:1.25;">' + esc_(CONFIG.CHARITY_NAME) + '</div>' +
          '<div style="font-size:13px;color:' + MUTED + ';">Registered Charity No. ' + esc_(CONFIG.CHARITY_NUMBER) + '</div></td>' +
        '</tr></table>' +
      '</td></tr>' +
      '<tr><td style="padding:12px 32px 0 32px;">' +
        '<h1 style="margin:0 0 10px 0;font-size:26px;line-height:1.2;">Thank you for your Gift Aid declaration</h1>' +
        '<p style="margin:0 0 10px 0;">Dear ' + esc_(d.firstName) + ',</p>' +
        '<p style="margin:0 0 18px 0;">Thank you for choosing to Gift Aid your donations to ' + esc_(CONFIG.CHARITY_NAME) +
          '. For every £1 you give, we can now claim an extra 25p from HMRC. Please keep this email' +
          (CONFIG.ATTACH_PDF_TO_DONOR_EMAIL ? ' and the attached PDF' : '') + ' as your copy of the declaration.</p>' +
      '</td></tr>' +
      '<tr><td style="padding:0 32px;">' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + SOFT + ';"><tr><td style="padding:16px 18px;">' +
          '<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;">' +
            row('Name', esc_([d.title, d.firstName, d.lastName].filter(String).join(' '))) +
            row('Home address', addr) +
            row('Date', esc_(formatWhen_(now))) +
            row('Reference', esc_(reference)) +
          '</table>' +
        '</td></tr></table>' +
      '</td></tr>' +
      '<tr><td style="padding:20px 32px 0 32px;">' +
        '<h2 style="margin:0 0 8px 0;font-size:18px;">What you agreed to</h2>' +
        '<div style="background:' + DECL_BG + ';border:1px solid ' + DECL_LINE + ';padding:14px 16px;">' + paragraphs + '</div>' +
      '</td></tr>' +
      '<tr><td style="padding:20px 32px 0 32px;">' +
        '<h2 style="margin:0 0 6px 0;font-size:18px;">Please let us know if you</h2>' +
        '<ul style="margin:0 0 10px 0;padding-left:22px;">' + notify + '</ul>' +
        '<p style="margin:0;">Just reply to this email, or write to <a href="mailto:' + esc_(CONFIG.CONTACT_EMAIL) + '" style="color:' + ACCENT + ';">' + esc_(CONFIG.CONTACT_EMAIL) + '</a>.</p>' +
      '</td></tr>' +
      '<tr><td style="padding:16px 32px 24px 32px;font-size:13px;color:' + MUTED + ';">' + esc_(HIGHER_RATE_NOTE) + '</td></tr>' +
      '<tr><td style="padding:14px 32px;border-top:1px solid #EEE7E2;font-size:12px;color:' + MUTED + ';">' +
        esc_(CONFIG.CHARITY_NAME) + ' · Registered Charity No. ' + esc_(CONFIG.CHARITY_NUMBER) + ' · ' +
        '<a href="' + esc_(CONFIG.WEBSITE_URL) + '" style="color:' + MUTED + ';">' + esc_(CONFIG.WEBSITE_URL.replace(/^https?:\/\//, '')) + '</a>' +
      '</td></tr>' +
    '</table>' +
    '</td></tr></table>' +
    '</body></html>';
}

function buildDonorEmailText_(d, reference, now) {
  return [
    'Dear ' + d.firstName + ',',
    '',
    'Thank you for choosing to Gift Aid your donations to ' + CONFIG.CHARITY_NAME + '. For every £1 you give, we can now claim an extra 25p from HMRC. Please keep this email as your copy of the declaration.',
    '',
    'Name: ' + [d.title, d.firstName, d.lastName].filter(String).join(' '),
    'Home address: ' + [(d.house + ' ' + d.street).trim(), d.line2, d.town, d.postcode].filter(String).join(', '),
    'Date: ' + formatWhen_(now),
    'Reference: ' + reference,
    '',
    'What you agreed to:',
    declarationParagraphs_().join('\n'),
    '',
    'Please let us know if you:',
    NOTIFY_ITEMS.map(function (i) { return '- ' + i; }).join('\n'),
    'Just reply to this email, or write to ' + CONFIG.CONTACT_EMAIL + '.',
    '',
    HIGHER_RATE_NOTE,
    '',
    CONFIG.CHARITY_NAME + ' · Registered Charity No. ' + CONFIG.CHARITY_NUMBER
  ].join('\n');
}

/* ---------- Notice to the charity ---------- */

function sendCharityNotification_(d, reference, now, pdfFile) {
  if (MailApp.getRemainingDailyQuota() < 1) throw new Error('Daily email quota used up');
  const ssUrl = getSpreadsheet_().getUrl();
  const body = [
    'A new Gift Aid declaration has been made.',
    '',
    'Reference: ' + reference,
    'Name: ' + [d.title, d.firstName, d.lastName].filter(String).join(' '),
    'Postcode: ' + d.postcode,
    'Date: ' + formatWhen_(now),
    '',
    'Spreadsheet: ' + ssUrl,
    pdfFile ? 'PDF: ' + pdfFile.getUrl() : 'PDF: not created – see the Notes column.'
  ].join('\n');
  MailApp.sendEmail(CONFIG.CONTACT_EMAIL, 'New Gift Aid declaration ' + reference, body, { name: 'Gift Aid form' });
}
