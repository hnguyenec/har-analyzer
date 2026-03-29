/**
 * PARSER.JS
 * Parses a HAR (HTTP Archive) file and extracts:
 *  1. All requests initiated directly or indirectly by Adobe Launch
 *  2. The full initiator call chain for each request
 *  3. ALL cookies set via Set-Cookie response headers
 *
 * HAR format reference: http://www.softwareishard.com/blog/har-12-spec/
 *
 * Key fields used:
 *   entry._initiator         — Chrome-specific, contains the call stack / URL that triggered the request
 *   entry.response.cookies   — Cookies parsed from Set-Cookie response headers by Chrome
 *   entry.request.cookies    — Cookies sent in the Cookie request header
 */

/**
 * Main parse function.
 * @param {object} har  — parsed HAR JSON object
 * @returns {object}
 */
function parseHar(har) {
  const entries = har?.log?.entries || [];

  if (entries.length === 0) {
    throw new Error('No network entries found in HAR file. Make sure you exported a valid HAR from Chrome DevTools.');
  }

  // ── Step 1: Find Adobe Launch script(s) ─────────────────────────────
  const launchScriptEntries = entries.filter(e => isAdobeLaunchScript(e.request?.url || ''));
  const launchUrls = new Set(launchScriptEntries.map(e => e.request?.url || ''));
  const launchDomains = new Set([...launchUrls].map(u => extractDomain(u)));

  // ── Step 2: Process all entries ──────────────────────────────────────
  const processed = entries.map(entry => {
    const url = entry.request?.url || '';
    const initiatorChain = extractInitiatorChain(entry);
    // directInitiator = the most immediate caller (first item in chain = top of JS stack)
    const directInitiator = initiatorChain[0] || 'unknown';
    const category = classifyUrl(url);
    const resourceType = resourceTypeLabel(entry);
    const isLaunch = isAdobeLaunchScript(url);

    return {
      url,
      domain: extractDomain(url),
      initiatorChain,
      directInitiator,
      category: isLaunch ? 'launch' : category.category,
      categoryLabel: isLaunch ? 'Adobe Launch' : category.label,
      categoryColor: isLaunch ? '#ff6b35' : category.color,
      resourceType,
      status: entry.response?.status || 0,
      isLaunch,
      depth: initiatorChain.length,
      // HAR response.cookies = cookies parsed from Set-Cookie headers by Chrome DevTools
      responseCookies: entry.response?.cookies || [],
      requestCookies: entry.request?.cookies || [],
      startedDateTime: entry.startedDateTime,
      time: entry.time || 0,
      _raw: entry  // keep raw for debugging
    };
  });

  // ── Step 3: Find all entries in the Launch-initiated subtree ─────────
  // An entry is "launched" if any URL in its initiator chain is a launch script.
  const injectedLibs = processed.filter(entry => {
    if (entry.isLaunch) return false; // skip the launch script itself
    return isLaunchInitiated(entry.initiatorChain, launchUrls, launchDomains);
  });

  // ── Step 4: Fallback — if no chain data, use timing heuristic ────────
  const hasChainData = processed.some(e => e.initiatorChain.length > 0);
  let finalInjected = injectedLibs;

  if (injectedLibs.length === 0 && launchScriptEntries.length > 0) {
    // No _initiator data — fall back to: all third-party requests after launch loaded
    const launchTime = launchScriptEntries[0]?.startedDateTime
      ? new Date(launchScriptEntries[0].startedDateTime).getTime()
      : 0;

    finalInjected = processed.filter(entry => {
      if (entry.isLaunch) return false;
      const entryTime = entry.startedDateTime
        ? new Date(entry.startedDateTime).getTime()
        : 0;
      const isThirdParty = !launchUrls.has(entry.url);
      const afterLaunch = entryTime >= launchTime;
      // Skip CDN requests and same-origin requests
      return isThirdParty && afterLaunch && entry.category !== 'cdn';
    });
  }

  // ── Step 5: Collect ALL cookies from response headers ────────────────
  // We collect from ALL entries — not just injected ones — because
  // Set-Cookie can come from any domain (including first-party responses
  // triggered by third-party scripts).
  const cookies = collectAllCookies(processed, launchUrls, launchDomains);

  return {
    entries: processed,
    launchScripts: [...launchUrls],
    launchDomains,
    injectedLibs: finalInjected,
    cookies,
    allEntries: processed,
    hasFullChainData: hasChainData,
    totalRequests: entries.length
  };
}

/**
 * Check if a request's initiator chain contains any Adobe Launch script.
 */
function isLaunchInitiated(chain, launchUrls, launchDomains) {
  for (const url of chain) {
    if (!url) continue;
    if (launchUrls.has(url)) return true;
    // Also match by domain (handles version changes in URL)
    const domain = extractDomain(url);
    if (launchDomains.has(domain)) return true;
    // Check if any frame URL looks like a launch script
    if (isAdobeLaunchScript(url)) return true;
  }
  return false;
}

/**
 * Extract the full initiator chain from a HAR entry.
 * Returns array of URLs, ordered from MOST IMMEDIATE caller → ROOT caller.
 *
 * Chrome's `_initiator` field structure:
 * {
 *   type: "script",
 *   stack: {
 *     callFrames: [{ url, lineNumber, columnNumber, functionName }],
 *     parent: {            ← parent stack = what called this script
 *       callFrames: [...],
 *       parent: { ... }   ← grandparent, etc.
 *     }
 *   }
 * }
 */
function extractInitiatorChain(entry) {
  const initiator = entry._initiator;
  if (!initiator) return [];

  const chain = [];

  if (initiator.type === 'parser' && initiator.url) {
    // Initiated by HTML parser (e.g. <script src="...">)
    chain.push(initiator.url);
    return chain;
  }

  if (initiator.type === 'script' && initiator.stack) {
    walkStack(initiator.stack, chain);
    return chain;
  }

  if ((initiator.type === 'preload' || initiator.type === 'preflight') && initiator.url) {
    chain.push(initiator.url);
    return chain;
  }

  // Sometimes _initiator has a direct url property
  if (initiator.url) {
    chain.push(initiator.url);
  }

  return chain;
}

/**
 * Recursively walk Chrome DevTools stack frames to extract URLs.
 * Collects the first meaningful URL from each stack level.
 * Result: [immediate_caller, parent_caller, grandparent_caller, ...]
 */
function walkStack(stack, chain) {
  if (!stack) return;

  // Get the first meaningful URL from this stack level's callFrames
  if (stack.callFrames && stack.callFrames.length > 0) {
    for (const frame of stack.callFrames) {
      if (frame.url && frame.url.trim() !== '') {
        if (!chain.includes(frame.url)) {
          chain.push(frame.url);
        }
        break; // one URL per stack level is enough
      }
    }
  }

  // Walk up to parent
  if (stack.parent) {
    walkStack(stack.parent, chain);
  }
}

/**
 * Collect ALL cookies from response Set-Cookie headers across all entries.
 * Marks each cookie as launch-related if it was set by a request that is
 * in the Launch-initiated subtree.
 *
 * IMPORTANT: Chrome DevTools HAR files include `entry.response.cookies`
 * which are parsed directly from the Set-Cookie response headers.
 * This covers ALL domains — including third-party domains like .demdex.net,
 * .facebook.com, etc. — not just first-party .tal.com.au cookies.
 */
function collectAllCookies(processed, launchUrls, launchDomains) {
  const cookies = [];
  const seen = new Set();

  // Build set of URLs in the launch-initiated subtree (for the isLaunchRelated flag)
  const launchInitiatedUrls = new Set(
    processed
      .filter(e => e.isLaunch || isLaunchInitiated(e.initiatorChain, launchUrls, launchDomains))
      .map(e => e.url)
  );

  for (const entry of processed) {
    const responseCookies = entry.responseCookies;
    if (!responseCookies || responseCookies.length === 0) continue;

    const isLaunchRelated = entry.isLaunch || launchInitiatedUrls.has(entry.url);
    const cat = classifyUrl(entry.url);
    const entryDomain = extractDomain(entry.url);

    for (const cookie of responseCookies) {
      // Deduplicate: same name + domain + setByUrl
      const cookieDomain = cookie.domain || entryDomain;
      const key = `${cookie.name}||${cookieDomain}||${entry.url}`;

      if (seen.has(key)) continue;
      seen.add(key);

      cookies.push({
        name: cookie.name || '(empty)',
        value: cookie.value || '',
        domain: cookieDomain,
        path: cookie.path || '/',
        expires: cookie.expires || null,
        httpOnly: cookie.httpOnly === true,
        secure: cookie.secure === true,
        sameSite: cookie.sameSite || '',
        setByUrl: entry.url,
        setByDomain: entryDomain,
        category: entry.isLaunch ? 'launch' : cat.category,
        categoryLabel: entry.isLaunch ? 'Adobe Launch' : cat.label,
        categoryColor: entry.isLaunch ? '#ff6b35' : cat.color,
        isLaunchRelated
      });
    }
  }

  // Sort: launch-related first, then alphabetically by domain
  cookies.sort((a, b) => {
    if (a.isLaunchRelated !== b.isLaunchRelated) return a.isLaunchRelated ? -1 : 1;
    return a.domain.localeCompare(b.domain);
  });

  return cookies;
}

/**
 * Validate that the uploaded file looks like a HAR file.
 */
function validateHar(data) {
  if (!data || typeof data !== 'object') throw new Error('Invalid file format — expected JSON.');
  if (!data.log) throw new Error('Invalid HAR: missing "log" property.');
  if (!data.log.entries || !Array.isArray(data.log.entries)) {
    throw new Error('Invalid HAR: "log.entries" is missing or not an array.');
  }
  return true;
}


