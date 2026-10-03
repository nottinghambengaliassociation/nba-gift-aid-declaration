/**
 * Postcode.gs: address lookup through Ideal Postcodes.
 *
 * The API key is read from Script Properties (IDEAL_POSTCODES_API_KEY),
 * so it never appears in the code or in the donor's browser.
 *
 * Free test postcode (no lookup charged): ID1 1QD
 */

const IDEAL_POSTCODES_URL = 'https://api.ideal-postcodes.co.uk/v1/postcodes/';

const LOOKUP_UNAVAILABLE = 'Address search isn’t working right now. Enter your address manually instead.';

/**
 * Called from the browser.
 * Returns { ok: true, postcode, addresses: [...] } or { ok: false, message, manual }.
 */
function lookupPostcode(rawPostcode) {
  const postcode = formatPostcode_(String(rawPostcode || '').slice(0, 10));
  if (!isValidPostcode_(postcode)) {
    return { ok: false, message: 'Enter a full UK postcode, like NG1 1AB' };
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = 'pc_' + postcode.replace(' ', '');
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  if (!underLookupLimit_(cache)) {
    return { ok: false, message: LOOKUP_UNAVAILABLE, manual: true };
  }

  const apiKey = PropertiesService.getScriptProperties().getProperty('IDEAL_POSTCODES_API_KEY');
  if (!apiKey) {
    console.error('IDEAL_POSTCODES_API_KEY is not set in Script Properties.');
    return { ok: false, message: LOOKUP_UNAVAILABLE, manual: true };
  }

  let response;
  try {
    response = UrlFetchApp.fetch(
      IDEAL_POSTCODES_URL + encodeURIComponent(postcode.replace(' ', '')) + '?api_key=' + encodeURIComponent(apiKey),
      { muteHttpExceptions: true, followRedirects: true }
    );
  } catch (err) {
    console.error('Ideal Postcodes request failed: ' + err);
    return { ok: false, message: LOOKUP_UNAVAILABLE, manual: true };
  }

  let body = {};
  try {
    body = JSON.parse(response.getContentText() || '{}');
  } catch (err) {
    body = {};
  }

  if (body.code === 4040 || response.getResponseCode() === 404) {
    const result = { ok: false, message: 'We couldn’t find that postcode. Check it, or enter your address manually.' };
    cache.put(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  if (response.getResponseCode() !== 200 || body.code !== 2000 || !Array.isArray(body.result)) {
    // 4010 bad key, 4020 balance used up, 4021 daily limit reached, etc.
    console.error('Ideal Postcodes error ' + response.getResponseCode() + ' / ' + body.code + ': ' + body.message);
    return { ok: false, message: LOOKUP_UNAVAILABLE, manual: true };
  }

  const addresses = body.result.map(function (a, i) {
    const street = [a.dependant_thoroughfare, a.thoroughfare].filter(Boolean).join(', ');
    const locality = [a.double_dependant_locality, a.dependant_locality].filter(Boolean).join(', ');
    const house = a.premise || a.building_name || a.building_number || a.line_1 || '';
    return {
      id: 'a' + i,
      house: String(house).slice(0, 40),
      street: street || (a.premise ? '' : a.line_2 || ''),
      line2: locality,
      town: a.post_town || '',
      postcode: formatPostcode_(a.postcode || postcode),
      label: [a.line_1, a.line_2, a.line_3, a.post_town].filter(Boolean).join(', ')
    };
  });

  const result = { ok: true, postcode: postcode, addresses: addresses };
  try {
    cache.put(cacheKey, JSON.stringify(result), CONFIG.POSTCODE_CACHE_SECONDS);
  } catch (err) {
    // Very large postcodes can exceed the cache size limit; that's fine.
  }
  return result;
}

/** Rough per-minute brake on lookups, shared by all visitors. */
function underLookupLimit_(cache) {
  const key = 'lk_' + Math.floor(Date.now() / 60000);
  const count = Number(cache.get(key) || 0);
  if (count >= CONFIG.LOOKUPS_PER_MINUTE_LIMIT) return false;
  cache.put(key, String(count + 1), 120);
  return true;
}
