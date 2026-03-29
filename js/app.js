/**
 * APP.JS
 * Main application controller.
 * Handles: file upload, UI rendering, tab switching, filters, export.
 */

// ── STATE ─────────────────────────────────────────────────────────────────────
let state = {
  rawResults: null,   // full parse results
  filtered: null,     // filtered subset of injectedLibs
  filteredCookies: null
};

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setupDropZone();
  setupFileInput();
});

// ── DROP ZONE ─────────────────────────────────────────────────────────────────
function setupDropZone() {
  const zone = document.getElementById('dropZone');

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  zone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'BUTTON') {
      document.getElementById('harFileInput').click();
    }
  });
}

function setupFileInput() {
  document.getElementById('harFileInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  });
}

// ── FILE HANDLING ─────────────────────────────────────────────────────────────
function handleFile(file) {
  if (!file.name.endsWith('.har') && file.type !== 'application/json' && !file.name.endsWith('.json')) {
    showError('Please upload a .har file exported from Chrome DevTools.');
    return;
  }

  showLoading('Reading HAR file...');

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      showLoading('Parsing network entries...');
      const json = JSON.parse(e.target.result);
      validateHar(json);

      showLoading('Tracing Adobe Launch injection chains...');
      setTimeout(() => {
        try {
          const results = parseHar(json);
          state.rawResults = results;
          state.filtered = results.injectedLibs;
          state.filteredCookies = results.cookies;
          renderResults(results);
          hideLoading();
        } catch (err) {
          hideLoading();
          showError(err.message);
        }
      }, 50); // brief delay to let loading UI render

    } catch (err) {
      hideLoading();
      showError('Failed to parse file: ' + err.message);
    }
  };
  reader.onerror = () => {
    hideLoading();
    showError('Failed to read file.');
  };
  reader.readAsText(file);
}

// ── RENDER RESULTS ────────────────────────────────────────────────────────────
function renderResults(results) {
  // Hide upload, show filter + results
  document.getElementById('uploadSection').classList.add('hidden');
  document.getElementById('filterBar').classList.remove('hidden');
  document.getElementById('resultsSection').classList.remove('hidden');

  // Show the "Load Another HAR" button in the header
  document.getElementById('loadNewBtn').classList.remove('hidden');

  renderSummaryCards(results);
  renderLibTable(results.injectedLibs);
  renderCookieTable(results.cookies);
  renderRawChains(results.injectedLibs, results.launchScripts);
  renderGraph(results);

  // Show chain data warning if HAR lacks full stack trace info
  if (!results.hasFullChainData) {
    showChainWarning();
  }
}

// ── RESET APP ─────────────────────────────────────────────────────────────────
function resetApp() {
  // 1. Clear state
  state.rawResults = null;
  state.filtered = null;
  state.filteredCookies = null;

  // 2. Destroy the ECharts graph instance so it re-initialises cleanly
  if (typeof chartInstance !== 'undefined' && chartInstance && !chartInstance.isDisposed()) {
    chartInstance.dispose();
    chartInstance = null;
  }

  // 3. Clear all table bodies
  document.getElementById('libTableBody').innerHTML = '';
  document.getElementById('cookieTableBody').innerHTML = '';
  document.getElementById('rawChains').innerHTML = '';
  document.getElementById('graphChart').innerHTML = '';
  document.getElementById('summaryCards').innerHTML = '';

  // 4. Reset tab to graph (first tab)
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-graph').classList.add('active');
  document.querySelector('.tab-btn').classList.add('active');

  // 5. Reset filters
  document.getElementById('domainFilter').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('typeFilter').value = '';

  // 6. Remove the chain warning banner if present
  const warning = document.getElementById('chainWarning');
  if (warning) warning.remove();

  // 7. Reset file input (so the same file can be re-selected and fires 'change')
  const fileInput = document.getElementById('harFileInput');
  fileInput.value = '';

  // 8. Hide results / filter bar, show upload section
  document.getElementById('filterBar').classList.add('hidden');
  document.getElementById('resultsSection').classList.add('hidden');
  document.getElementById('uploadSection').classList.remove('hidden');

  // 9. Hide the Load Another button
  document.getElementById('loadNewBtn').classList.add('hidden');

  // 10. Scroll back to top smoothly
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── SUMMARY CARDS ─────────────────────────────────────────────────────────────
function renderSummaryCards(results) {
  const libs = results.injectedLibs;
  const cookies = results.cookies;

  // Count by category — deduplicate by domain
  const domainCats = {};
  for (const lib of libs) {
    const domain = lib.domain;
    if (!domainCats[domain]) domainCats[domain] = lib.category;
  }
  const counts = {};
  for (const cat of Object.values(domainCats)) {
    counts[cat] = (counts[cat] || 0) + 1;
  }

  // Unique domains injected
  const uniqueDomains = new Set(libs.map(l => l.domain)).size;
  // Third-party cookie domains
  const thirdPartyCookieDomains = new Set(
    cookies.filter(c => c.isLaunchRelated).map(c => c.setByDomain)
  ).size;

  const cards = [
    { label: 'Unique Domains', value: uniqueDomains, icon: 'fa-layer-group', cls: 'card-total' },
    { label: 'Analytics', value: (counts['analytics'] || 0), icon: 'fa-chart-line', cls: 'card-analytics' },
    { label: 'Advertising', value: (counts['advertising'] || 0), icon: 'fa-rectangle-ad', cls: 'card-advertising' },
    { label: 'Heatmap / Session', value: (counts['heatmap'] || 0) + (counts['identity'] || 0), icon: 'fa-eye', cls: 'card-heatmap' },
    { label: 'Adobe Suite', value: (counts['adobe'] || 0), icon: 'fa-a', cls: 'card-adobe' },
    { label: 'Other', value: (counts['other'] || 0) + (counts['cdn'] || 0), icon: 'fa-boxes-stacked', cls: 'card-other' },
    { label: 'Total Cookies', value: cookies.length, icon: 'fa-cookie-bite', cls: 'card-cookies' },
    { label: '3rd-Party Cookie Domains', value: thirdPartyCookieDomains, icon: 'fa-globe', cls: 'card-cookies' }
  ];

  const container = document.getElementById('summaryCards');
  container.innerHTML = cards.map(c => `
    <div class="summary-card ${c.cls}">
      <span class="card-label">${c.label}</span>
      <span class="card-value">${c.value}</span>
      <i class="fa-solid ${c.icon} card-icon"></i>
    </div>
  `).join('');
}

// ── LIBRARY TABLE ─────────────────────────────────────────────────────────────
function renderLibTable(libs) {
  const tbody = document.getElementById('libTableBody');
  document.getElementById('tableCount').textContent = `${libs.length} entries`;

  if (libs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6">
      <div class="empty-state">
        <i class="fa-solid fa-circle-xmark"></i>
        <p>No injected libraries found. Try loading a HAR file from a page that uses Adobe Launch.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = libs.map(lib => {
    const statusClass = lib.status >= 400 ? 'status-err' : lib.status >= 300 ? 'status-red' : 'status-ok';
    const initiatorDisplay = lib.directInitiator && !lib.directInitiator.startsWith('unknown')
      ? `<span class="initiator-chip" title="${escHtml(lib.directInitiator)}">${escHtml(shortenUrl(lib.directInitiator))}</span>`
      : `<span style="color:var(--text-dim)">—</span>`;

    // Shorten URL for display
    let displayUrl = lib.url;
    let displayPath = '';
    try {
      const u = new URL(lib.url);
      displayUrl = u.hostname;
      displayPath = u.pathname + (u.search ? u.search.slice(0, 40) + (u.search.length > 40 ? '…' : '') : '');
    } catch {}

    return `<tr>
      <td>
        <div class="url-cell">
          <a href="${escHtml(lib.url)}" target="_blank" class="url-domain">${escHtml(displayUrl)}</a>
          <span class="url-path">${escHtml(displayPath)}</span>
        </div>
      </td>
      <td><span class="pill ${pillClass(lib.category)}">${escHtml(lib.categoryLabel)}</span></td>
      <td><span class="pill pill-other">${escHtml(lib.resourceType)}</span></td>
      <td>${initiatorDisplay}</td>
      <td><span class="depth-badge">${lib.depth}</span></td>
      <td><span class="${statusClass}">${lib.status || '—'}</span></td>
    </tr>`;
  }).join('');
}

// ── COOKIE TABLE ──────────────────────────────────────────────────────────────
function renderCookieTable(cookies) {
  const tbody = document.getElementById('cookieTableBody');
  document.getElementById('cookieCount').textContent = `${cookies.length} cookie${cookies.length !== 1 ? 's' : ''}`;

  if (cookies.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">
      <div class="empty-state">
        <i class="fa-solid fa-cookie"></i>
        <p>No Set-Cookie response headers found in this HAR file.</p>
        <p style="font-size:12px;margin-top:4px">Make sure DevTools was open before page load and Adobe Launch was detected.</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = cookies.map(c => {
    // Expiry display
    let expiresDisplay;
    if (!c.expires || c.expires === '' || c.expires === null) {
      expiresDisplay = `<span style="color:var(--warn);font-size:11px">Session</span>`;
    } else {
      const formatted = formatDate(c.expires);
      const isExpired = new Date(c.expires) < new Date();
      expiresDisplay = `<span style="font-size:11px;color:${isExpired ? 'var(--danger)' : 'var(--text-muted)'}">${formatted}${isExpired ? ' ⚠️' : ''}</span>`;
    }

    // Cookie domain — highlight third-party vs first-party
    const isThirdParty = !c.domain.includes('.tal.com.au') && !c.domain.includes('tal.com.au');
    const domainStyle = isThirdParty
      ? 'color:var(--orange);font-weight:600'
      : 'color:var(--text-muted)';

    // Launch-related badge
    const launchBadge = c.isLaunchRelated
      ? `<span style="font-size:10px;background:rgba(255,107,53,0.15);color:#ff6b35;border:1px solid rgba(255,107,53,0.3);border-radius:4px;padding:1px 5px;margin-left:4px">via Launch</span>`
      : '';

    return `<tr>
      <td>
        <code style="font-family:var(--mono);font-size:12px;color:var(--warn)">${escHtml(c.name)}</code>
        ${launchBadge}
      </td>
      <td>
        <span class="mono" style="font-size:12px;${domainStyle}" title="${isThirdParty ? '3rd-party domain' : '1st-party domain'}">
          ${isThirdParty ? '🌐 ' : ''}${escHtml(c.domain || '—')}
        </span>
      </td>
      <td>
        <span class="initiator-chip" title="${escHtml(c.setByUrl)}">${escHtml(c.setByDomain || c.setByUrl)}</span>
      </td>
      <td><span class="pill ${pillClass(c.category)}">${escHtml(c.categoryLabel)}</span></td>
      <td>${expiresDisplay}</td>
      <td>${boolIcon(c.secure)}</td>
      <td>${boolIcon(c.httpOnly)}</td>
      <td><span style="font-size:11px;color:var(--text-muted)">${escHtml(c.sameSite || '—')}</span></td>
      <td>
        <span style="font-size:10px;padding:1px 6px;border-radius:4px;font-weight:600;
          ${isThirdParty
            ? 'background:rgba(251,146,60,0.15);color:#fb923c;border:1px solid rgba(251,146,60,0.3)'
            : 'background:rgba(52,211,153,0.1);color:#34d399;border:1px solid rgba(52,211,153,0.2)'
          }">
          ${isThirdParty ? '3rd-party' : '1st-party'}
        </span>
      </td>
    </tr>`;
  }).join('');
}

// ── RAW CHAINS ────────────────────────────────────────────────────────────────
function renderRawChains(libs, launchScripts) {
  const container = document.getElementById('rawChains');

  if (libs.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-link-slash"></i><p>No chain data available.</p></div>`;
    return;
  }

  // Group by domain
  const byDomain = {};
  for (const lib of libs) {
    if (!byDomain[lib.domain]) byDomain[lib.domain] = [];
    byDomain[lib.domain].push(lib);
  }

  container.innerHTML = Object.entries(byDomain).map(([domain, entries]) => {
    const representative = entries[0];
    const chain = representative.initiatorChain || [];

    // Build chain HTML — from root → ... → immediate caller → this domain
    // chain is [immediate_caller, parent, grandparent, ...]
    // We reverse to display: root → grandparent → parent → immediate → domain
    const chainReversed = [...chain].reverse();
    const chainHtml = chainReversed.length > 0
      ? [
          `<span class="chain-item chain-root">Your App</span>`,
          ...chainReversed.map(u => {
            const isLaunch = isAdobeLaunchScript(u) || launchScripts.some(l => u === l);
            const uDomain = extractDomain(u);
            const label = isLaunch ? 'Adobe Launch' : (uDomain || shortenUrl(u));
            return `<span class="chain-item ${isLaunch ? 'chain-launch' : ''}" title="${escHtml(u)}">${escHtml(label)}</span>`;
          }),
          `<span class="chain-item" style="color:var(--primary)">${escHtml(friendlyVendorName(domain))}</span>`
        ].join(`<span class="chain-arrow"> → </span>`)
      : `<span class="chain-item chain-root">Your App</span><span class="chain-arrow"> → </span><span class="chain-item chain-launch">Adobe Launch</span><span class="chain-arrow"> → </span><span class="chain-item" style="color:var(--primary)">${escHtml(friendlyVendorName(domain))}</span>`;

    const subUrls = entries.slice(0, 5).map(e => {
      let path = e.url;
      try { path = new URL(e.url).pathname + (new URL(e.url).search || ''); } catch {}
      if (path.length > 80) path = path.slice(0, 77) + '...';
      return `<div style="color:var(--text-dim);padding-left:16px;border-left:2px solid var(--border);margin:2px 0">${escHtml(path)}</div>`;
    }).join('');

    const more = entries.length > 5 ? `<div style="color:var(--text-dim);padding-left:16px;font-size:11px">+ ${entries.length - 5} more requests...</div>` : '';

    return `
      <div class="raw-chain-item">
        <div class="raw-chain-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
          <i class="fa-solid fa-link"></i>
          <span>${escHtml(friendlyVendorName(domain))}</span>
          <span style="color:var(--text-dim);font-weight:400;font-size:11px;margin-left:4px">(${escHtml(domain)})</span>
          <span style="margin-left:auto;font-size:11px;font-weight:400;color:var(--text-dim)">${entries.length} request(s) ▾</span>
        </div>
        <div class="raw-chain-body">
          <div style="margin-bottom:10px;line-height:2">${chainHtml}</div>
          <div style="font-size:11px;margin-top:8px;display:flex;flex-direction:column;gap:2px">
            ${subUrls}
            ${more}
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── FILTERS ───────────────────────────────────────────────────────────────────
function applyFilters() {
  if (!state.rawResults) return;

  const domainVal = document.getElementById('domainFilter').value.toLowerCase().trim();
  const catVal    = document.getElementById('categoryFilter').value;
  const typeVal   = document.getElementById('typeFilter').value;

  state.filtered = state.rawResults.injectedLibs.filter(lib => {
    const matchDomain = !domainVal || lib.domain.toLowerCase().includes(domainVal) || lib.url.toLowerCase().includes(domainVal);
    const matchCat    = !catVal    || lib.category === catVal;
    const matchType   = !typeVal   || lib.resourceType === typeVal;
    return matchDomain && matchCat && matchType;
  });

  renderLibTable(state.filtered);
}

function resetFilters() {
  document.getElementById('domainFilter').value = '';
  document.getElementById('categoryFilter').value = '';
  document.getElementById('typeFilter').value = '';
  applyFilters();
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
function exportCSV() {
  const libs = state.filtered || [];
  const cookies = state.rawResults?.cookies || [];

  const libRows = [
    ['URL', 'Domain', 'Category', 'Type', 'Initiator', 'Chain Depth', 'HTTP Status'],
    ...libs.map(l => [
      l.url, l.domain, l.categoryLabel, l.resourceType,
      l.directInitiator || '', l.depth, l.status
    ])
  ];

  const cookieRows = [
    [],
    ['--- COOKIES (from Set-Cookie response headers) ---'],
    ['Cookie Name', 'Cookie Domain', 'Party', 'Set By Domain', 'Set By URL', 'Category', 'Via Launch', 'Expires', 'Secure', 'HttpOnly', 'SameSite'],
    ...cookies.map(c => {
      const isThirdParty = !c.domain.includes('.tal.com.au') && !c.domain.includes('tal.com.au');
      return [
        c.name, c.domain, isThirdParty ? '3rd-party' : '1st-party',
        c.setByDomain || '', c.setByUrl, c.categoryLabel,
        c.isLaunchRelated ? 'Yes' : 'No',
        c.expires || 'Session', c.secure, c.httpOnly, c.sameSite
      ];
    })
  ];

  const allRows = [...libRows, ...cookieRows];
  const csv = allRows.map(row => row.map(cell => {
    const str = String(cell ?? '');
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  }).join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'adobe-launch-audit.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── TAB SWITCHING ─────────────────────────────────────────────────────────────
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

  document.getElementById(`tab-${tabName}`).classList.add('active');
  btn.classList.add('active');

  // Resize chart if switching to graph tab
  if (tabName === 'graph' && chartInstance) {
    setTimeout(() => chartInstance.resize(), 50);
  }
}

// ── LOADING / ERROR ───────────────────────────────────────────────────────────
function showLoading(msg) {
  document.getElementById('loadingMsg').textContent = msg || 'Processing...';
  document.getElementById('loadingOverlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.add('hidden');
}

function showError(msg) {
  alert('⚠️ Error: ' + msg);
}

function showChainWarning() {
  const resultsSection = document.getElementById('resultsSection');
  const existing = document.getElementById('chainWarning');
  if (existing) return;

  const banner = document.createElement('div');
  banner.id = 'chainWarning';
  banner.style.cssText = `
    background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.25);
    border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;
    display: flex; gap: 10px; align-items: flex-start; font-size: 13px;
    color: var(--text-muted);
  `;
  banner.innerHTML = `
    <i class="fa-solid fa-triangle-exclamation" style="color:#fbbf24;margin-top:2px;flex-shrink:0"></i>
    <span>
      <strong style="color:#fbbf24">Limited chain data detected.</strong>
      Your HAR file doesn't contain full JavaScript stack trace data in the <code>_initiator</code> field.
      This can happen if the HAR was captured without DevTools open from page load.
      Try: <strong>open DevTools first → hard reload → then export HAR</strong>.
      The tool has fallen back to showing all third-party requests that loaded after Adobe Launch.
    </span>
  `;
  resultsSection.prepend(banner);
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function shortenUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    const path = u.pathname;
    const shortened = path.length > 30 ? '…' + path.slice(-28) : path;
    return u.hostname + shortened;
  } catch {
    return url.length > 50 ? url.slice(0, 47) + '…' : url;
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
}

function boolIcon(val) {
  return val
    ? `<i class="fa-solid fa-check" style="color:var(--success)"></i>`
    : `<i class="fa-solid fa-xmark" style="color:var(--text-dim)"></i>`;
}
