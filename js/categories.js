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

/**
 * Detect if a URL is an Adobe Launch CONTAINER script specifically.
 * Must be on adobedtm.com AND match the launch-XXXX.min.js pattern.
 * This deliberately excludes AppMeasurement.js, satellite.js, etc.
 */
function isAdobeLaunchScript(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  // Must be on adobedtm.com
  if (!lower.includes('adobedtm.com')) return false;
  // Must match the launch container pattern: launch-<hash>.min.js or launch-<hash>.js
  return /launch-[a-f0-9]+(?:\.min)?\.js/i.test(url);
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
