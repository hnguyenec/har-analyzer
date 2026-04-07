/* ============================================================
   ADOBE LAUNCH AUDIT TOOL — STYLES
   ============================================================ */

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg: #0f1117;
  --bg2: #161b27;
  --bg3: #1e2536;
  --border: #2a3347;
  --border-light: #3a4560;
  --text: #e2e8f0;
  --text-muted: #8892a4;
  --text-dim: #5a6478;
  --primary: #4f8ef7;
  --primary-dark: #3a74e0;
  --success: #34d399;
  --warn: #fbbf24;
  --danger: #f87171;
  --purple: #a78bfa;
  --orange: #fb923c;
  --teal: #2dd4bf;
  --pink: #f472b6;
  --font: 'Inter', system-ui, sans-serif;
  --mono: 'JetBrains Mono', monospace;
  --radius: 10px;
  --radius-sm: 6px;
  --shadow: 0 4px 24px rgba(0,0,0,0.4);
}

html { scroll-behavior: smooth; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font);
  font-size: 14px;
  line-height: 1.6;
  min-height: 100vh;
}

/* ── HEADER ─────────────────────────────────────────────── */
.header {
  background: linear-gradient(135deg, #1a2340 0%, #0f1625 100%);
  border-bottom: 1px solid var(--border);
  padding: 20px 32px;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(8px);
}
.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.header-brand { display: flex; align-items: center; gap: 16px; }
.brand-icon {
  width: 48px; height: 48px;
  background: linear-gradient(135deg, var(--primary), var(--purple));
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.header-brand h1 { font-size: 20px; font-weight: 700; color: var(--text); }
.header-brand p { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.header-badges { display: flex; gap: 8px; flex-wrap: wrap; }

/* Load Another HAR button — lives in the header */
.btn-load-new {
  background: transparent;
  color: var(--text);
  border: 1.5px solid var(--border-light);
  font-size: 13px;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  flex-shrink: 0;
  transition: all .2s;
}
.btn-load-new:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(79,142,247,0.07);
  transform: translateY(-1px);
}
.btn-load-new i { margin-right: 2px; }

/* ── BADGES ─────────────────────────────────────────────── */
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.badge-info    { background: rgba(79,142,247,0.15); color: var(--primary); border: 1px solid rgba(79,142,247,0.3); }
.badge-success { background: rgba(52,211,153,0.15); color: var(--success); border: 1px solid rgba(52,211,153,0.3); }
.badge-warn    { background: rgba(251,191,36,0.15);  color: var(--warn);    border: 1px solid rgba(251,191,36,0.3); }

/* ── HOW-TO BAR ──────────────────────────────────────────── */
.how-to-bar {
  background: rgba(15, 20, 35, 0.95);
  border-bottom: 1px solid var(--border);
  padding: 0 32px;
}
.how-to-inner {
  max-width: 1400px;
  margin: 0 auto;
  position: relative;
  padding: 20px 0 24px;
}
.close-btn {
  position: absolute;
  top: 16px;
  right: 0;
  background: var(--bg3);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 5px 9px;
  line-height: 1;
  transition: all .2s;
  z-index: 1;
}
.close-btn:hover { background: var(--border); color: var(--text); }

.how-to-content { padding-right: 36px; }

/* Alert banner inside how-to */
.how-to-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.25);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-bottom: 20px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}
.how-to-alert > i { color: var(--warn); font-size: 15px; margin-top: 2px; flex-shrink: 0; }
.how-to-alert strong { color: var(--warn); }
.how-to-alert em { color: var(--text); font-style: normal; }
.how-to-alert code {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  padding: 1px 5px; border-radius: 4px;
  font-family: var(--mono); font-size: 12px; color: var(--warn);
}

/* Three-column layout */
.how-to-columns {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.how-to-section {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 18px;
}

.how-to-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 14px;
}

.how-to-step-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--primary);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  flex-shrink: 0;
}

.how-to-section ol {
  list-style: decimal;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.how-to-section ol li {
  color: var(--text-muted);
  font-size: 12.5px;
  line-height: 1.5;
}
.how-to-section ol li strong { color: var(--text); }
.how-to-section ul {
  list-style: disc;
  padding-left: 16px;
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.how-to-section ul li { font-size: 12px; color: var(--text-muted); }
.how-to-section ul li strong { color: var(--text); }

kbd {
  background: var(--bg3);
  border: 1px solid var(--border-light);
  padding: 1px 6px;
  border-radius: 4px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--text);
  white-space: nowrap;
}
.kbd-sep { color: var(--text-dim); margin: 0 2px; font-size: 11px; }

code {
  background: var(--bg3);
  border: 1px solid var(--border);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: var(--mono);
  font-size: 11px;
  color: var(--warn);
}

/* Inline record button dot */
.inline-dot {
  display: inline-block;
  width: 9px; height: 9px;
  border-radius: 50%;
  vertical-align: middle;
  margin-bottom: 1px;
}
.red-dot { background: #ef4444; box-shadow: 0 0 4px rgba(239,68,68,0.6); }

/* Security warning box in Step 3 */
.how-to-warning {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 14px;
  padding: 10px 12px;
  background: rgba(248,113,113,0.07);
  border: 1px solid rgba(248,113,113,0.2);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
.how-to-warning > i { color: var(--danger); margin-top: 2px; flex-shrink: 0; }
.how-to-warning strong { color: var(--text); }

/* Responsive: stack columns on smaller screens */
@media (max-width: 1024px) {
  .how-to-columns { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
  .how-to-bar { padding: 0 16px; }
  .how-to-columns { grid-template-columns: 1fr; }
  .how-to-content { padding-right: 0; }
  .close-btn { top: 14px; }
}

/* ── MAIN ────────────────────────────────────────────────── */
.main { max-width: 1400px; margin: 0 auto; padding: 32px; }

/* ── UPLOAD SECTION ──────────────────────────────────────── */
.upload-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 48px 24px;
}
.drop-zone {
  width: 100%;
  max-width: 680px;
  background: var(--bg2);
  border: 2px dashed var(--border-light);
  border-radius: 16px;
  padding: 48px 32px;
  text-align: center;
  transition: border-color .3s, background .3s;
  cursor: pointer;
}
.drop-zone.drag-over {
  border-color: var(--primary);
  background: rgba(79,142,247,0.08);
}
.drop-icon { font-size: 52px; color: var(--primary); margin-bottom: 16px; opacity: 0.8; }
.drop-zone h2 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
.drop-zone p { color: var(--text-muted); margin-bottom: 24px; }
.upload-hint {
  display: flex; align-items: flex-start; gap: 8px;
  margin-top: 20px; padding: 12px 16px;
  background: rgba(251,191,36,0.08);
  border: 1px solid rgba(251,191,36,0.2);
  border-radius: var(--radius-sm);
  text-align: left;
  font-size: 12.5px;
  color: var(--text-muted);
}
.upload-hint i { color: var(--warn); margin-top: 2px; flex-shrink: 0; }


/* ── BUTTONS ─────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font-family: var(--font);
  font-size: 13.5px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all .2s;
  text-decoration: none;
}
.btn-primary {
  background: var(--primary);
  color: #fff;
}
.btn-primary:hover { background: var(--primary-dark); transform: translateY(-1px); }
.btn-outline {
  background: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-light);
}
.btn-outline:hover { border-color: var(--primary); color: var(--primary); }
.btn-sm { padding: 6px 12px; font-size: 12px; }

/* ── FILTER BAR ──────────────────────────────────────────── */
.filter-bar {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  margin-bottom: 24px;
  padding: 16px 20px;
}
.filter-bar-inner {
  display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap;
}
.filter-group { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 160px; }
.filter-group label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
.filter-group input, .filter-group select {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: var(--radius-sm); padding: 7px 10px;
  color: var(--text); font-family: var(--font); font-size: 13px;
  outline: none; transition: border-color .2s;
}
.filter-group input:focus, .filter-group select:focus { border-color: var(--primary); }
.filter-group select option { background: var(--bg3); }
.filter-actions { display: flex; gap: 8px; align-items: flex-end; padding-bottom: 1px; }

/* ── SUMMARY CARDS ───────────────────────────────────────── */
.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.summary-card {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 18px 20px;
  display: flex; flex-direction: column; gap: 6px;
  position: relative;
  overflow: hidden;
  transition: border-color .2s;
}
.summary-card:hover { border-color: var(--border-light); }
.summary-card::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
}
.card-analytics::before   { background: var(--success); }
.card-advertising::before { background: var(--orange); }
.card-heatmap::before     { background: var(--purple); }
.card-adobe::before       { background: var(--primary); }
.card-total::before       { background: linear-gradient(90deg, var(--primary), var(--purple)); }
.card-cookies::before     { background: var(--warn); }
.card-other::before       { background: var(--text-dim); }
.summary-card .card-label {
  font-size: 11px; font-weight: 600; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.5px;
}
.summary-card .card-value {
  font-size: 32px; font-weight: 700; color: var(--text);
  line-height: 1;
}
.summary-card .card-icon {
  position: absolute; right: 16px; top: 16px;
  font-size: 22px; opacity: 0.15;
}

/* ── TABS ────────────────────────────────────────────────── */
.tabs {
  display: flex; gap: 4px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.tab-btn {
  background: none; border: none;
  padding: 10px 18px;
  color: var(--text-muted);
  font-family: var(--font); font-size: 13.5px; font-weight: 500;
  cursor: pointer; border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all .2s;
  display: flex; align-items: center; gap: 7px;
}
.tab-btn:hover { color: var(--text); background: var(--bg2); }
.tab-btn.active { color: var(--primary); border-bottom-color: var(--primary); background: var(--bg2); }

/* ── TAB CONTENT ─────────────────────────────────────────── */
.tab-content { display: none; }
.tab-content.active { display: block; }

/* ── PANEL ───────────────────────────────────────────────── */
.panel {
  background: var(--bg2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap; gap: 10px;
}
.panel-header h3 {
  font-size: 15px; font-weight: 600;
  display: flex; align-items: center; gap: 8px;
}
.panel-header h3 i { color: var(--primary); }
.panel-count {
  font-size: 12px; color: var(--text-muted);
  background: var(--bg3);
  padding: 3px 10px; border-radius: 20px;
  border: 1px solid var(--border);
}
.panel-hint { font-size: 12px; color: var(--text-muted); font-style: italic; }
.panel-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* ── GRAPH ───────────────────────────────────────────────── */
.graph-legend {
  display: flex; gap: 16px; flex-wrap: wrap;
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}
.legend-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-muted); }
.dot {
  width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
}
.dot-root        { background: #f8faff; box-shadow: 0 0 6px rgba(255,255,255,0.5); }
.dot-launch      { background: #ff6b35; box-shadow: 0 0 6px rgba(255,107,53,0.5); }
.dot-analytics   { background: #34d399; }
.dot-advertising { background: #fb923c; }
.dot-heatmap     { background: #a78bfa; }
.dot-adobe       { background: #4f8ef7; }
.dot-other       { background: #64748b; }
.graph-tip {
  padding: 10px 20px;
  font-size: 11.5px;
  color: var(--text-dim);
  border-top: 1px solid var(--border);
  display: flex; align-items: center; gap: 7px;
}
.graph-tip i { color: var(--primary); }

/* ── TABLE ───────────────────────────────────────────────── */
.table-wrapper { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.data-table thead th {
  background: var(--bg3);
  padding: 11px 14px;
  text-align: left;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}
.data-table tbody tr { border-bottom: 1px solid var(--border); transition: background .15s; }
.data-table tbody tr:hover { background: rgba(255,255,255,0.02); }
.data-table tbody tr:last-child { border-bottom: none; }
.data-table td { padding: 10px 14px; vertical-align: middle; }
.data-table td .url-cell { display: flex; flex-direction: column; gap: 2px; }
.data-table td .url-domain { font-weight: 600; color: var(--text); font-family: var(--mono); font-size: 12px; }
.data-table td .url-path { color: var(--text-muted); font-family: var(--mono); font-size: 11px; word-break: break-all; }
.data-table td a { color: var(--primary); text-decoration: none; }
.data-table td a:hover { text-decoration: underline; }

/* ── CATEGORY PILLS ──────────────────────────────────────── */
.pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
}
.pill-analytics   { background: rgba(52,211,153,0.15);  color: #34d399; }
.pill-advertising { background: rgba(251,146,60,0.15);  color: #fb923c; }
.pill-heatmap     { background: rgba(167,139,250,0.15); color: #a78bfa; }
.pill-adobe       { background: rgba(79,142,247,0.15);  color: #4f8ef7; }
.pill-other       { background: rgba(100,116,139,0.15); color: #94a3b8; }

/* ── STATUS DOTS ─────────────────────────────────────────── */
.status-ok  { color: var(--success); font-weight: 600; }
.status-err { color: var(--danger);  font-weight: 600; }
.status-red { color: var(--warn);    font-weight: 600; }

/* ── DEPTH BADGE ─────────────────────────────────────────── */
.depth-badge {
  display: inline-block;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: var(--bg3);
  border: 1px solid var(--border-light);
  text-align: center;
  line-height: 22px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

/* ── INITIATOR CHIP ──────────────────────────────────────── */
.initiator-chip {
  font-family: var(--mono);
  font-size: 11px;
  background: var(--bg3);
  border: 1px solid var(--border);
  padding: 2px 7px;
  border-radius: 4px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  display: inline-block;
}

/* ── COOKIE NOTE ─────────────────────────────────────────── */
.cookie-note {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 20px;
  background: rgba(251,191,36,0.07);
  border-bottom: 1px solid rgba(251,191,36,0.15);
  font-size: 13px;
  color: var(--text-muted);
}
.cookie-note i { color: var(--warn); margin-top: 2px; flex-shrink: 0; }

/* ── RAW CHAINS ──────────────────────────────────────────── */
#rawChains { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.raw-chain-item {
  background: var(--bg3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.raw-chain-header {
  padding: 10px 14px;
  background: rgba(255,255,255,0.03);
  border-bottom: 1px solid var(--border);
  font-family: var(--mono);
  font-size: 12px;
  color: var(--primary);
  font-weight: 600;
  display: flex; align-items: center; gap: 8px;
  cursor: pointer;
  user-select: none;
}
.raw-chain-body {
  padding: 12px 14px;
  font-family: var(--mono);
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.8;
}
.chain-arrow { color: var(--text-dim); margin: 0 4px; }
.chain-item { color: var(--text); }
.chain-item.chain-launch { color: var(--orange); }
.chain-item.chain-root   { color: var(--success); }

/* ── LOADING ─────────────────────────────────────────────── */
.loading-overlay {
  position: fixed; inset: 0;
  background: rgba(15,17,23,0.85);
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
  backdrop-filter: blur(4px);
}
.loading-box {
  background: var(--bg2);
  border: 1px solid var(--border-light);
  border-radius: 16px;
  padding: 40px 48px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.spinner {
  width: 44px; height: 44px;
  border: 3px solid var(--border-light);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
#loadingMsg { color: var(--text-muted); font-size: 14px; }

/* ── EMPTY STATE ─────────────────────────────────────────── */
.empty-state {
  padding: 48px;
  text-align: center;
  color: var(--text-dim);
  display: flex; flex-direction: column; align-items: center; gap: 10px;
}
.empty-state i { font-size: 36px; opacity: 0.4; }

/* ── UTILS ───────────────────────────────────────────────── */
.hidden { display: none !important; }
.mono { font-family: var(--mono); }

/* ── COOKIE THIRD-PARTY HIGHLIGHT ────────────────────────── */
.cookie-third-party { color: var(--orange); font-weight: 600; }
.cookie-first-party { color: var(--text-muted); }

/* ── VIA LAUNCH BADGE ────────────────────────────────────── */
.via-launch-badge {
  font-size: 10px;
  background: rgba(255,107,53,0.15);
  color: #ff6b35;
  border: 1px solid rgba(255,107,53,0.3);
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 4px;
  vertical-align: middle;
}

/* ── SCROLLBAR ───────────────────────────────────────────── */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-dim); }

/* ── RESPONSIVE ──────────────────────────────────────────── */
@media (max-width: 768px) {
  .main { padding: 16px; }
  .header { padding: 14px 16px; }
  .how-to-bar { padding: 12px 16px; }
  .how-to-inner { flex-direction: column; }
  .how-to-inner ol { flex-direction: column; }
  .summary-cards { grid-template-columns: repeat(2, 1fr); }
  .filter-bar-inner { flex-direction: column; }
}
