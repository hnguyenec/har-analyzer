/**
 * GRAPH.JS
 * Builds and renders the ECharts force-directed graph
 * showing the Adobe Launch injection call chain.
 *
 * Graph structure:
 *   [Your App] → [Adobe Launch] → [Library A]
 *                               → [Library B] → [Beacon from B]
 *                               → [Library C]
 */

let chartInstance = null;
let currentGraphLayout = 'force';
let currentGraphData = null;

const CATEGORY_COLORS = {
  root:        '#ffffff',
  launch:      '#ff6b35',
  analytics:   '#34d399',
  advertising: '#fb923c',
  heatmap:     '#a78bfa',
  adobe:       '#4f8ef7',
  identity:    '#2dd4bf',
  cdn:         '#64748b',
  other:       '#94a3b8'
};

/**
 * Main entry: build graph data from HAR parse results and render.
 */
function renderGraph(results) {
  const { launchScripts, injectedLibs } = results;

  const nodes = [];   // ECharts node objects
  const links = [];   // ECharts link objects

  // Keyed maps to avoid duplicates
  const domainToNodeId = new Map();  // domain string → node id
  let nextId = 0;

  // ── Helper: add or get a domain node ─────────────────────────────────
  function getOrCreateDomainNode(domain, category, overrideLabel) {
    if (domainToNodeId.has(domain)) {
      return domainToNodeId.get(domain);
    }

    const id = nextId++;
    domainToNodeId.set(domain, id);

    const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
    const label = overrideLabel || friendlyVendorName(domain);

    nodes.push({
      id,
      name: label,
      domain,
      category,
      categoryLabel: getCategoryLabel(category),
      symbolSize: getSizeForCategory(category),
      itemStyle: {
        color,
        borderColor: '#ffffff',
        borderWidth: (category === 'root' || category === 'launch') ? 2 : 0,
        shadowBlur: category === 'root' ? 12 : 0,
        shadowColor: 'rgba(255,255,255,0.3)'
      },
      label: {
        show: true,
        formatter: truncate(label, 20),
        fontSize: category === 'root' ? 13 : category === 'launch' ? 12 : 11,
        fontWeight: (category === 'root' || category === 'launch') ? 700 : 500,
        color: '#e2e8f0',
        position: 'bottom',
        distance: 8
      }
    });

    return id;
  }

  // ── Helper: add a directed edge (no duplicates) ───────────────────────
  const edgeSet = new Set();
  function addEdge(fromId, toId, category) {
    if (fromId === toId) return;
    const key = `${fromId}→${toId}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);

    const color = CATEGORY_COLORS[category] || '#64748b';
    links.push({
      source: fromId,
      target: toId,
      lineStyle: {
        color,
        width: category === 'launch' ? 2.5 : 1.5,
        opacity: 0.7,
        curveness: 0.1
      },
      symbol: ['none', 'arrow'],
      symbolSize: [4, 8]
    });
  }

  // ── 1. Root node: Your App ────────────────────────────────────────────
  const appDomain = 'your-app';
  const appId = getOrCreateDomainNode(appDomain, 'root', 'Your App');

  // ── 2. Adobe Launch node(s) ───────────────────────────────────────────
  // We show ONE "Adobe Launch" node regardless of how many container scripts
  // were loaded (usually just one).
  const launchDomain = 'adobe-launch';
  const launchId = getOrCreateDomainNode(launchDomain, 'launch', 'Adobe Launch');
  addEdge(appId, launchId, 'launch');

  // Map launch script URLs → the single launch node id
  const launchUrlToId = new Map();
  for (const lu of launchScripts) {
    launchUrlToId.set(lu, launchId);
  }

  // ── 3. Build parent resolution map ───────────────────────────────────
  // For each injected entry, figure out which domain node should be its parent
  // in the graph.
  //
  // initiatorChain[0] = most immediate JS caller
  // initiatorChain[1] = what called that, etc.
  //
  // We look for the first chain URL that is either:
  //   a) A launch script → parent is Launch node
  //   b) Already a known domain node → parent is that domain node
  //   c) Otherwise → parent is Launch node (fallback)

  // We need two passes: first create all domain nodes, then wire edges.
  // This handles the case where Library B is a parent of beacon B, but B
  // might not have been processed yet when we process beacon B.

  // Pass 1: Create all domain nodes for injected libs
  for (const lib of injectedLibs) {
    const domain = lib.domain;
    if (!domain || domain === launchDomain || domain === appDomain) continue;

    // Skip if it's a launch script itself
    if (isAdobeLaunchScript(lib.url)) continue;

    const cat = lib.category === 'launch' ? 'adobe' : lib.category;
    getOrCreateDomainNode(domain, cat);
  }

  // Pass 2: Wire edges based on initiator chains
  for (const lib of injectedLibs) {
    const domain = lib.domain;
    if (!domain || isAdobeLaunchScript(lib.url)) continue;

    const childId = domainToNodeId.get(domain);
    if (childId === undefined) continue;

    // Find the correct parent node
    const parentId = resolveParentId(
      lib.initiatorChain,
      launchId,
      launchScripts,
      domainToNodeId
    );

    addEdge(parentId, childId, lib.category);
  }

  // ── 4. Render ────────────────────────────────────────────────────────
  currentGraphData = { nodes, links };
  drawChart(nodes, links);
}

/**
 * Given an initiator chain, find the best matching parent node.
 * Chain is ordered: [most_immediate_caller, ..., root_caller]
 *
 * Strategy:
 * 1. Walk the chain from most-immediate outward
 * 2. If we find a launch script URL → return launchId
 * 3. If we find a URL whose domain is already a known node → return that node
 * 4. Fallback → return launchId
 */
function resolveParentId(chain, launchId, launchScripts, domainToNodeId) {
  if (!chain || chain.length === 0) return launchId;

  for (const url of chain) {
    if (!url) continue;

    // Is it a launch script?
    if (isAdobeLaunchScript(url) || launchScripts.includes(url)) {
      return launchId;
    }

    // Is it a known domain node (an intermediate library)?
    const domain = extractDomain(url);
    if (domain && domainToNodeId.has(domain)) {
      return domainToNodeId.get(domain);
    }
  }

  // Fallback: parent is Adobe Launch
  return launchId;
}

// ── Node sizing & labeling helpers ───────────────────────────────────────────

function getSizeForCategory(cat) {
  const sizes = { root: 44, launch: 38, analytics: 28, advertising: 28, heatmap: 28, adobe: 28, identity: 26, cdn: 22, other: 24 };
  return sizes[cat] || 24;
}

function getCategoryLabel(cat) {
  const labels = {
    root: 'Your App',
    launch: 'Adobe Launch',
    analytics: 'Analytics',
    advertising: 'Advertising / Pixel',
    heatmap: 'Heatmap / Session',
    adobe: 'Adobe Suite',
    identity: 'Identity / Consent',
    cdn: 'CDN',
    other: 'Other'
  };
  return labels[cat] || 'Other';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

// ── ECharts rendering ─────────────────────────────────────────────────────────

function drawChart(nodes, links) {
  const container = document.getElementById('graphChart');
  if (!container) return;

  // Re-init if needed
  if (chartInstance) {
    chartInstance.dispose();
  }
  chartInstance = echarts.init(container, null, { renderer: 'canvas', backgroundColor: '#161b27' });

  window.removeEventListener('resize', onResize);
  window.addEventListener('resize', onResize);

  const option = {
    backgroundColor: '#161b27',
    tooltip: {
      trigger: 'item',
      confine: true,
      backgroundColor: '#1e2536',
      borderColor: '#3a4560',
      borderWidth: 1,
      padding: [8, 12],
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter(params) {
        if (params.dataType !== 'node') return '';
        const n = params.data;
        const catColor = CATEGORY_COLORS[n.category] || '#94a3b8';
        return `
          <div style="min-width:180px">
            <div style="font-weight:700;font-size:13px;margin-bottom:4px">${escHtmlGraph(n.name)}</div>
            <div style="color:${catColor};font-size:11px;margin-bottom:4px">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${catColor};margin-right:4px"></span>
              ${escHtmlGraph(n.categoryLabel)}
            </div>
            <div style="color:#64748b;font-size:11px;border-top:1px solid #2a3347;margin-top:6px;padding-top:6px">
              Domain: <span style="color:#94a3b8">${escHtmlGraph(n.domain)}</span>
            </div>
          </div>`;
      }
    },
    series: [{
      type: 'graph',
      layout: currentGraphLayout,
      data: nodes,
      links,
      roam: true,
      focusNodeAdjacency: true,
      lineStyle: { curveness: 0.15 },
      emphasis: {
        focus: 'adjacency',
        scale: 1.2,
        lineStyle: { width: 3, opacity: 1 }
      },
      blur: {
        itemStyle: { opacity: 0.2 },
        lineStyle: { opacity: 0.1 }
      },
      force: {
        repulsion: 500,
        gravity: 0.05,
        edgeLength: [120, 280],
        friction: 0.65,
        layoutAnimation: true
      },
      circular: {
        rotateLabel: true
      },
      animation: true,
      animationDurationUpdate: 1200,
      animationEasingUpdate: 'cubicInOut'
    }]
  };

  chartInstance.setOption(option);
}

function onResize() {
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.resize();
  }
}

function resetGraphZoom() {
  if (chartInstance && !chartInstance.isDisposed()) {
    chartInstance.dispatchAction({ type: 'restore' });
  }
}

function toggleGraphLayout() {
  currentGraphLayout = currentGraphLayout === 'force' ? 'circular' : 'force';
  if (currentGraphData) {
    drawChart(currentGraphData.nodes, currentGraphData.links);
  }
}

function escHtmlGraph(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
