/**
 * CATEGORIES.JS
 * Classifies domains/URLs into vendor categories.
 * Extend these lists to match your own vendor ecosystem.
 */

const VENDOR_CATEGORIES = [
  // ── ANALYTICS ──────────────────────────────────────────
  {
    category: 'analytics',
    label: 'Analytics',
    color: '#34d399',
    keywords: [
      'google-analytics.com', 'googletagmanager.com', 'googletagservices.com',
      'analytics.google.com', 'stats.g.doubleclick.net',
      'mixpanel.com', 'segment.com', 'cdn.segment.com',
      'amplitude.com', 'api.amplitude.com',
      'heap.com', 'heapanalytics.com',
      'clarity.ms',
      'quantserve.com', 'scorecardresearch.com',
      'newrelic.com', 'nr-data.net', 'js-agent.newrelic.com',
      'datadog.com', 'datadoghq.com',
      'tealiumiq.com', 'tags.tiqcdn.com'
    ]
  },
  // ── ADVERTISING / PIXELS ───────────────────────────────
  {
    category: 'advertising',
    label: 'Advertising / Pixel',
    color: '#fb923c',
    keywords: [
      'connect.facebook.net', 'facebook.com/tr', 'facebook.net',
      'bat.bing.com', 'bing.com/bat',
      'ads.twitter.com', 't.co/i/adsct', 'ads.linkedin.com',
      'snap.licdn.com', 'px.ads.linkedin.com',
      'static.ads-twitter.com', 'analytics.twitter.com',
      'adnxs.com', 'doubleclick.net',
      'googlesyndication.com', 'googleadservices.com',
      'ad.doubleclick.net', 'adsystem.amazon.com',
      'tradedoubler.com', 'pepperjam.com',
      's.pinimg.com', 'pinterest.com',
      'analytics.tiktok.com',
      'snapchat.com', 'sc-static.net',
      'criteo.net', 'criteo.com',
      'outbrain.com', 'taboola.com',
      'commission-junction.com', 'cj.com',
      'rakuten.com', 'linksynergy.com',
      'everesttech.net', 'cm.everesttech.net',
      'fls.doubleclick.net'
    ]
  },
  // ── HEATMAP / SESSION RECORDING ────────────────────────
  {
    category: 'heatmap',
    label: 'Heatmap / Session',
    color: '#a78bfa',
    keywords: [
      'contentsquare.net', 'contentsquare.com', 't.contentsquare.net',
      'hotjar.com', 'mouseflow.com', 'fullstory.com',
      'logrocket.com', 'smartlook.com', 'luckyorange.com',
      'sessioncam.com', 'dynatrace.com', 'clicktale.net',
      'crazyegg.com', 'decibel-insight.com', 'medallia.com',
      'usabilla.com', 'walkme.com', 'pendo.io', 'appcues.com',
      'inspectlet.com', 'ptengine.com'
    ]
  },
  // ── IDENTITY / CONSENT ─────────────────────────────────
  {
    category: 'identity',
    label: 'Identity / Consent',
    color: '#2dd4bf',
    keywords: [
      'onetrust.com', 'cookielaw.org', 'trustarc.com',
      'privacymanager.io', 'quantcast.com',
      'id5-sync.com', 'liveramp.com', 'rlcdn.com',
      'krux.com', 'sailthru.com'
    ]
  },
  // ── ADOBE (non-launch) ─────────────────────────────────
  // NOTE: adobedtm.com is intentionally NOT here — it's handled by isAdobeLaunchScript()
  // only for the specific launch-*.min.js pattern.
  // Other adobedtm.com paths (AppMeasurement, etc.) fall here as 'adobe'.
  {
    category: 'adobe',
    label: 'Adobe Suite',
    color: '#4f8ef7',
    keywords: [
      'omtrdc.net', 'demdex.net', 'adobedc.net',
      '2o7.net', 'adobetarget.net', 'tt.omtrdc.net',
      'scene7.com', 'adobedtm.com'          // catch-all for non-launch adobedtm paths
    ]
  },
  // ── CDN / PERFORMANCE ──────────────────────────────────
  {
    category: 'cdn',
    label: 'CDN / Performance',
    color: '#64748b',
    keywords: [
      'cloudflare.com', 'cloudfront.net', 'fastly.net',
      'akamaihd.net', 'akamai.net', 'edgesuite.net',
      'cdn.jsdelivr.net', 'cdnjs.cloudflare.com',
      'unpkg.com', 'maxcdn.bootstrapcdn.com'
    ]
  }
];

/**
 * Classify a URL into a vendor category.
 * NOTE: This intentionally does NOT classify Adobe Launch scripts —
 * use isAdobeLaunchScript() separately for that.
 * @param {string} url
 * @returns {{ category: string, label: string, color: string }}
 */
function classifyUrl(url) {
  if (!url) return { category: 'other', label: 'Other', color: '#64748b' };

  // Strip any __domain__ prefix (internal graph key)
  const cleanUrl = url.startsWith('__') ? url.replace(/^__[^_]+__/, '') : url;
  const lower = cleanUrl.toLowerCase();

  for (const cat of VENDOR_CATEGORIES) {
    if (cat.keywords.some(k => lower.includes(k))) {
      return { category: cat.category, label: cat.label, color: cat.color };
    }
  }

  return { category: 'other', label: 'Other', color: '#94a3b8' };
}

/**
 * Extract the readable domain from a URL string.
 */
function extractDomain(url) {
  if (!url || url.startsWith('__')) return url || '';
  try {
    return new URL(url).hostname;
  } catch {
    const m = url.match(/^(?:https?:\/\/)?([^/?#]+)/i);
    return m ? m[1] : url;
  }
}

// ── ADOBE LAUNCH DETECTION ───────────────────────────────────────────────────
//
// Adobe Launch (Adobe Experience Platform Tags) container scripts appear under
// several URL patterns depending on the deployment method and era:
//
//  MODERN (AEP Tags / Launch):
//   • https://assets.adobedtm.com/<orgId>/<propertyId>/launch-EN<alphanumeric>.min.js
//   • https://assets.adobedtm.com/<orgId>/<propertyId>/launch-EN<alphanumeric>.js          (debug)
//   • https://assets.adobedtm.com/<orgId>/<propertyId>/launch-<hex>.min.js                 (older hash IDs)
//   • https://assets.adobedtm.com/<orgId>/<propertyId>/launch-<hex>.js
//
//  LEGACY (Adobe DTM — pre-Launch):
//   • https://assets.adobedtm.com/<account>/<property>/satelliteLib-<hash>.js
//   • https://assets.adobedtm.com/<account>/satelliteLib-<hash>.min.js
//   • Inline/self-hosted: any URL containing "satelliteLib" in the path/filename
//
//  SELF-HOSTED / CUSTOM CDN:
//   • Some enterprises host the container on their own domain.
//     Pattern: any filename matching launch-EN*.js, launch-*.min.js, or satelliteLib*.js
//     regardless of hostname.
//
//  NOT a Launch script (must not match):
//   • AppMeasurement.js          — Adobe Analytics measurement library
//   • s_code.js / s_code.min.js  — legacy AA code
//   • satellite.js               — Launch runtime (loaded BY the container, not the container itself)
//   • AT.js / at.js              — Adobe Target
//   • visitor.js / VisitorAPI.js — ECID / Visitor ID service
//   • alloy.js / alloy.min.js    — AEP Web SDK (not a Launch container)

/**
 * Detect if a URL is an Adobe Launch (or legacy DTM) CONTAINER script.
 *
 * Detection rules (any one match = true):
 *  1. Hosted on assets.adobedtm.com  AND  filename starts with "launch-"  AND  ends with ".js"
 *  2. Hosted on assets.adobedtm.com  AND  filename contains "satelliteLib"
 *  3. Self-hosted: filename matches  launch-EN[A-Za-z0-9]+(?:\.min)?\.js   (AEP Tags "EN" IDs)
 *  4. Self-hosted: filename matches  launch-[a-f0-9]{12,}(?:\.min)?\.js    (older hex IDs)
 *  5. Self-hosted: filename matches  satelliteLib-[A-Za-z0-9]+(?:\.min)?\.js (DTM)
 *
 * @param {string} url
 * @returns {boolean}
 */
function isAdobeLaunchScript(url) {
  if (!url) return false;

  const lower = url.toLowerCase();

  // Extract just the filename (last path segment, before query string)
  let filename = '';
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    filename = parts[parts.length - 1].toLowerCase();
  } catch {
    // Fallback for relative or malformed URLs
    const parts = url.split('?')[0].split('/');
    filename = parts[parts.length - 1].toLowerCase();
  }

  const onAdobeDTM = lower.includes('assets.adobedtm.com');

  // ── Rule 1: adobedtm.com + filename starts with "launch-" and is a .js file
  if (onAdobeDTM && filename.startsWith('launch-') && filename.endsWith('.js')) {
    return true;
  }

  // ── Rule 2: adobedtm.com + filename contains "satellitelib" (DTM legacy)
  if (onAdobeDTM && filename.includes('satellitelib')) {
    return true;
  }

  // ── Rule 3: Self-hosted — AEP Tags "EN" alphanumeric ID pattern
  //    launch-EN<alphanumeric>.min.js  or  launch-EN<alphanumeric>.js
  if (/^launch-en[a-z0-9]+(?:\.min)?\.js$/i.test(filename)) {
    return true;
  }

  // ── Rule 4: Self-hosted — older hex hash ID pattern
  //    launch-<12+ hex chars>.min.js  or  launch-<12+ hex chars>.js
  if (/^launch-[a-f0-9]{12,}(?:\.min)?\.js$/i.test(filename)) {
    return true;
  }

  // ── Rule 5: Self-hosted — DTM satelliteLib pattern
  //    satelliteLib-<hash>.min.js  or  satelliteLib-<hash>.js
  if (/^satellitelib-[a-z0-9]+(?:\.min)?\.js$/i.test(filename)) {
    return true;
  }

  return false;
}

/**
 * Return a descriptive label for an Adobe Launch script URL.
 * Useful for display in the graph / table.
 * @param {string} url
 * @returns {string}
 */
function adobeLaunchScriptLabel(url) {
  if (!url) return 'Adobe Launch';
  const lower = url.toLowerCase();

  if (lower.includes('satellitelib')) return 'Adobe DTM (Legacy)';
  if (/launch-en[a-z0-9]/i.test(url))  return 'Adobe Launch (AEP Tags)';
  if (/launch-[a-f0-9]{12,}/i.test(url)) return 'Adobe Launch';
  return 'Adobe Launch';
}

/**
 * Map category key → pill CSS class
 */
function pillClass(category) {
  const map = {
    launch:      'pill-adobe',
    adobe:       'pill-adobe',
    analytics:   'pill-analytics',
    advertising: 'pill-advertising',
    heatmap:     'pill-heatmap',
    identity:    'pill-heatmap',
    cdn:         'pill-other',
    other:       'pill-other'
  };
  return map[category] || 'pill-other';
}

/**
 * Map resource type from HAR entry to display label
 */
function resourceTypeLabel(entry) {
  const mime = (entry.response?.content?.mimeType || '').toLowerCase();
  const type = (entry._resourceType || '').toLowerCase();

  if (type === 'script' || mime.includes('javascript')) return 'script';
  if (type === 'image' || mime.includes('image') || mime.includes('gif')) return 'image';
  if (type === 'fetch' || type === 'xhr') return 'fetch';
  if (type === 'stylesheet' || mime.includes('css')) return 'stylesheet';
  if (type === 'document' || mime.includes('html')) return 'document';
  return type || 'other';
}

/**
 * Friendly vendor name from a domain (for graph node labels).
 * Returns a short human-readable name instead of raw domain.
 */
function friendlyVendorName(domain) {
  const map = {
    // Adobe
    'dpm.demdex.net': 'Adobe AAM (demdex)',
    'demdex.net': 'Adobe AAM',
    'omtrdc.net': 'Adobe Analytics',
    'tt.omtrdc.net': 'Adobe Target',
    'adobedc.net': 'Adobe DC',
    '2o7.net': 'Adobe Analytics (2o7)',
    'cm.everesttech.net': 'Adobe AdCloud',
    'talservices.demdex.net': 'Adobe AAM Dest',
    // Advertising
    'connect.facebook.net': 'Facebook Pixel',
    'www.facebook.com': 'Facebook Beacon',
    'bat.bing.com': 'Bing UET',
    'fls.doubleclick.net': 'DoubleClick Floodlight',
    'stats.g.doubleclick.net': 'Google DoubleClick',
    'snap.licdn.com': 'LinkedIn Insight',
    'px.ads.linkedin.com': 'LinkedIn Beacon',
    'analytics.twitter.com': 'Twitter Pixel',
    'www.google.com': 'Google Ads Audiences',
    // Analytics
    'www.googletagmanager.com': 'Google Tag Manager',
    'www.google-analytics.com': 'Google Analytics',
    'js-agent.newrelic.com': 'New Relic Agent',
    'bam.nr-data.net': 'New Relic Beacon',
    // Heatmap
    't.contentsquare.net': 'ContentSquare',
    'hotjar.com': 'Hotjar',
    'fullstory.com': 'FullStory',
    // Consent
    'cdn.cookielaw.org': 'OneTrust',
    'geolocation.onetrust.com': 'OneTrust Geo'
  };

  // Exact match
  if (map[domain]) return map[domain];

  // Partial match
  for (const [key, label] of Object.entries(map)) {
    if (domain.endsWith(key) || domain.includes(key)) return label;
  }

  // Shorten known TLDs: strip www., strip common suffixes
  let name = domain
    .replace(/^www\./, '')
    .replace(/\.(com|net|org|io|co)\.(au|uk|us)$/, '')
    .replace(/\.(com|net|org|io)$/, '');

  // Capitalize first letter
  return name.charAt(0).toUpperCase() + name.slice(1);
}
