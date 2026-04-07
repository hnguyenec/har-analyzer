import { useState, useCallback, useRef } from "react";

// ─── HAR Parsing ─────────────────────────────────────────────────────────────

function getAllStackUrls(initiator) {
  const urls = [];
  let stack = initiator?.stack;
  while (stack) {
    for (const frame of stack.callFrames || []) {
      if (frame.url && frame.url.trim()) urls.push(frame.url.trim());
    }
    stack = stack.parent;
  }
  return urls;
}

function stripQuery(url) {
  try { return new URL(url).origin + new URL(url).pathname; } catch { return url; }
}

function getDomain(url) {
  try { return new URL(url).hostname; } catch { return url; }
}

function getFilename(url) {
  try {
    const p = new URL(url).pathname;
    return p.split("/").filter(Boolean).pop() || getDomain(url);
  } catch { return url; }
}

function isLaunchScript(url) {
  return (
    /launch-EN[a-zA-Z0-9_-]+/.test(url) ||
    url.includes("assets.adobedtm.com") ||
    url.includes("satelliteLib") ||
    url.includes("dtm.adobe") ||
    (url.includes("launch") && url.includes(".min.js") && url.includes("adobe"))
  );
}

function getResourceType(entry) {
  const url = entry.request?.url || "";
  const contentType = entry.response?.content?.mimeType || "";
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (contentType.includes("javascript") || ext === "js") return "script";
  if (contentType.includes("css") || ext === "css") return "stylesheet";
  if (contentType.includes("image") || ["png","jpg","jpeg","gif","svg","webp","ico"].includes(ext)) return "image";
  if (contentType.includes("json") || entry._resourceType === "fetch" || entry._resourceType === "xhr") return "fetch/xhr";
  if (contentType.includes("html")) return "document";
  if (ext === "woff" || ext === "woff2" || ext === "ttf") return "font";
  if (contentType.includes("pixel") || url.includes("pixel") || url.includes("collect") || url.includes("track")) return "tracking";
  return entry._resourceType || "other";
}

function parseSetCookieHeader(raw) {
  const parts = raw.split(";").map(s => s.trim());
  const [nameVal, ...attrs] = parts;
  const eqIdx = nameVal.indexOf("=");
  const name  = eqIdx >= 0 ? nameVal.slice(0, eqIdx).trim() : nameVal.trim();
  const value = eqIdx >= 0 ? nameVal.slice(eqIdx + 1).trim() : "";
  const attrMap = {};
  for (const attr of attrs) {
    const eq = attr.indexOf("=");
    const k = (eq >= 0 ? attr.slice(0, eq) : attr).trim().toLowerCase();
    const v = eq >= 0 ? attr.slice(eq + 1).trim() : true;
    attrMap[k] = v;
  }
  return {
    raw,
    name,
    value: value.length > 60 ? value.slice(0, 60) + "…" : value,
    domain:   attrMap["domain"]   || null,
    path:     attrMap["path"]     || null,
    expires:  attrMap["expires"]  || attrMap["max-age"] || null,
    secure:   !!attrMap["secure"],
    httpOnly: !!attrMap["httponly"],
    sameSite: attrMap["samesite"] || null,
  };
}

function extractCookies(entry) {
  const headers = entry.response?.headers || [];
  const cookies = [];
  for (const h of headers) {
    if (h.name.toLowerCase() === "set-cookie") {
      cookies.push(parseSetCookieHeader(h.value));
    }
  }
  for (const c of entry.response?.cookies || []) {
    if (!cookies.find(x => x.name === c.name)) {
      cookies.push({
        raw: "",
        name: c.name,
        value: (c.value || "").length > 60 ? (c.value || "").slice(0, 60) + "…" : (c.value || ""),
        domain:   c.domain   || null,
        path:     c.path     || null,
        expires:  c.expires  || null,
        secure:   !!c.secure,
        httpOnly: !!c.httpOnly,
        sameSite: c.sameSite || null,
      });
    }
  }
  return cookies;
}

function parseHAR(harData) {
  const entries = harData.log?.entries;
  if (!entries) throw new Error("Invalid HAR: no entries found");

  const urlToEntry    = new Map();
  const strippedToFull = new Map();

  for (const entry of entries) {
    const url = entry.request?.url;
    if (!url) continue;
    const stripped = stripQuery(url);
    if (!urlToEntry.has(stripped)) {
      urlToEntry.set(stripped, entry);
      strippedToFull.set(stripped, url);
    }
  }

  // initiatorMap: childStripped -> parentStripped
  const initiatorMap = new Map();
  for (const entry of entries) {
    const url = entry.request?.url;
    if (!url) continue;
    const childStripped = stripQuery(url);
    const stackUrls = getAllStackUrls(entry._initiator);
    for (const stackUrl of stackUrls) {
      const parentStripped = stripQuery(stackUrl);
      if (parentStripped !== childStripped && urlToEntry.has(parentStripped)) {
        initiatorMap.set(childStripped, parentStripped);
        break;
      }
    }
  }

  // Find Launch roots
  const launchUrls = [];
  for (const [stripped] of urlToEntry) {
    if (isLaunchScript(stripped)) launchUrls.push(stripped);
  }
  if (launchUrls.length === 0) {
    for (const [stripped] of urlToEntry) {
      if (stripped.toLowerCase().includes("launch") && stripped.endsWith(".js")) {
        launchUrls.push(stripped);
      }
    }
  }

  // BFS tree
  const childrenMap = new Map();
  const visited     = new Set(launchUrls);
  const queue       = [...launchUrls];
  for (const lu of launchUrls) childrenMap.set(lu, []);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!childrenMap.has(current)) childrenMap.set(current, []);
    for (const [child, parent] of initiatorMap) {
      if (parent === current && !visited.has(child)) {
        visited.add(child);
        childrenMap.get(current).push(child);
        childrenMap.set(child, []);
        queue.push(child);
      }
    }
  }

  // Walk up to find closest visited ancestor for cookie attribution
  function findLaunchAncestor(stripped) {
    let cur = initiatorMap.get(stripped);
    while (cur) {
      if (visited.has(cur)) return cur;
      cur = initiatorMap.get(cur);
    }
    return null;
  }

  // Collect cookies from all entries with attribution
  const cookieAttribution = [];
  for (const entry of entries) {
    const url = entry.request?.url;
    if (!url) continue;
    const stripped = stripQuery(url);
    const cookies  = extractCookies(entry);
    if (!cookies.length) continue;

    let attributedTo = visited.has(stripped)
      ? stripped
      : findLaunchAncestor(stripped);

    for (const cookie of cookies) {
      cookieAttribution.push({
        cookie,
        requestUrl:      strippedToFull.get(stripped) || url,
        requestStripped: stripped,
        requestFilename: getFilename(stripped),
        attributedTo,
      });
    }
  }

  // Build tree nodes with cookies attached
  const buildNode = (stripped) => {
    const entry    = urlToEntry.get(stripped);
    const fullUrl  = strippedToFull.get(stripped) || stripped;
    const nodeCookies = cookieAttribution
      .filter(ca => ca.requestStripped === stripped)
      .map(ca => ca.cookie);
    return {
      url:      fullUrl,
      stripped,
      domain:   getDomain(stripped),
      filename: getFilename(stripped),
      type:     entry ? getResourceType(entry) : "unknown",
      status:   entry?.response?.status,
      cookies:  nodeCookies,
      children: (childrenMap.get(stripped) || []).map(buildNode),
    };
  };

  const tree    = launchUrls.map(buildNode);
  const domains = new Set([...visited].map(u => getDomain(u)));

  // Group by library
  const cookiesByLib       = new Map();
  const unattributedCookies = [];
  for (const ca of cookieAttribution) {
    if (ca.attributedTo) {
      if (!cookiesByLib.has(ca.attributedTo)) cookiesByLib.set(ca.attributedTo, []);
      cookiesByLib.get(ca.attributedTo).push(ca);
    } else {
      unattributedCookies.push(ca);
    }
  }

  return {
    tree,
    totalCaptured: visited.size,
    totalEntries:  entries.length,
    domains:       [...domains],
    cookiesByLib,
    unattributedCookies,
    totalCookies:  cookieAttribution.length,
    strippedToFull,
  };
}

// ─── Colors ───────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  script:     { bg: "#1a2a1a", border: "#4ade80", text: "#4ade80", dot: "#4ade80" },
  stylesheet: { bg: "#1a1a2a", border: "#818cf8", text: "#818cf8", dot: "#818cf8" },
  image:      { bg: "#2a1a1a", border: "#fb923c", text: "#fb923c", dot: "#fb923c" },
  "fetch/xhr":{ bg: "#1a2a2a", border: "#22d3ee", text: "#22d3ee", dot: "#22d3ee" },
  tracking:   { bg: "#2a1a2a", border: "#e879f9", text: "#e879f9", dot: "#e879f9" },
  font:       { bg: "#2a2a1a", border: "#facc15", text: "#facc15", dot: "#facc15" },
  document:   { bg: "#1a1a1a", border: "#94a3b8", text: "#94a3b8", dot: "#94a3b8" },
  other:      { bg: "#1a1a1a", border: "#475569", text: "#94a3b8", dot: "#475569" },
  unknown:    { bg: "#1a1a1a", border: "#334155", text: "#64748b", dot: "#334155" },
};
function typeColor(type) { return TYPE_COLORS[type] || TYPE_COLORS.other; }

// ─── Cookie Chip ──────────────────────────────────────────────────────────────

function CookieChip({ cookie }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "#1a1008", border: "1px solid #b4530044",
          borderRadius: 4, padding: "2px 8px", cursor: "pointer",
          fontSize: 11, fontFamily: "monospace",
        }}
      >
        <span style={{ color: "#fb923c" }}>🍪</span>
        <span style={{ color: "#fcd34d", fontWeight: 600 }}>{cookie.name}</span>
        {cookie.httpOnly && <span style={{ color: "#475569", fontSize: 10 }}>HttpOnly</span>}
        {cookie.secure   && <span style={{ color: "#475569", fontSize: 10 }}>Secure</span>}
        <span style={{ color: "#475569", fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && (
        <div style={{
          marginTop: 4, marginLeft: 8, background: "#0f1117",
          border: "1px solid #1e293b", borderRadius: 6, padding: "8px 12px",
          fontSize: 11, fontFamily: "monospace",
          display: "grid", gridTemplateColumns: "80px 1fr", rowGap: 3, columnGap: 8,
        }}>
          {[
            ["value",    cookie.value    || "—"],
            ["domain",   cookie.domain   || "—"],
            ["path",     cookie.path     || "—"],
            ["expires",  cookie.expires  || "session"],
            ["sameSite", cookie.sameSite || "—"],
            ["secure",   cookie.secure   ? "yes" : "no"],
            ["httpOnly", cookie.httpOnly ? "yes" : "no"],
          ].map(([k, v]) => [
            <span key={k+"-k"} style={{ color: "#475569" }}>{k}</span>,
            <span key={k+"-v"} style={{ color: "#94a3b8", wordBreak: "break-all" }}>{v}</span>,
          ])}
        </div>
      )}
    </div>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0 }) {
  const [expanded,    setExpanded]    = useState(depth < 2);
  const [showCookies, setShowCookies] = useState(false);
  const hasChildren = node.children.length > 0;
  const hasCookies  = node.cookies?.length > 0;
  const colors = typeColor(node.type);
  const indent = depth * 24;

  return (
    <div>
      <div
        style={{
          display: "flex", alignItems: "flex-start", gap: 8,
          padding: "6px 8px", borderRadius: 6,
          cursor: hasChildren ? "pointer" : "default",
          transition: "background 0.15s", marginLeft: indent, position: "relative",
        }}
        onClick={() => hasChildren && setExpanded(e => !e)}
        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        {depth > 0 && (
          <div style={{
            position: "absolute", left: -16, top: 0, bottom: 0,
            width: 1, background: "rgba(255,255,255,0.08)",
          }} />
        )}
        <span style={{ fontSize: 10, color: "#475569", minWidth: 12, marginTop: 2, fontFamily: "monospace", userSelect: "none" }}>
          {hasChildren ? (expanded ? "▼" : "▶") : "·"}
        </span>
        <span style={{
          width: 8, height: 8, borderRadius: "50%", background: colors.dot,
          flexShrink: 0, marginTop: 5, boxShadow: `0 0 6px ${colors.dot}88`,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: colors.text, wordBreak: "break-all" }}>
              {node.filename}
            </span>
            <span style={{
              fontSize: 10, padding: "1px 6px", borderRadius: 3,
              background: colors.bg, border: `1px solid ${colors.border}44`,
              color: colors.text, opacity: 0.8, flexShrink: 0,
            }}>
              {node.type}
            </span>
            {node.status && (
              <span style={{
                fontSize: 10, fontFamily: "monospace",
                color: node.status < 300 ? "#4ade80" : node.status < 400 ? "#facc15" : "#f87171",
              }}>
                {node.status}
              </span>
            )}
            {hasCookies && (
              <span
                onClick={e => { e.stopPropagation(); setShowCookies(s => !s); }}
                style={{
                  fontSize: 10, padding: "1px 7px", borderRadius: 3,
                  background: "#1a1008", border: "1px solid #b4530055",
                  color: "#fb923c", cursor: "pointer", flexShrink: 0, userSelect: "none",
                }}
              >
                🍪 {node.cookies.length} cookie{node.cookies.length !== 1 ? "s" : ""}
              </span>
            )}
            {node.children.length > 0 && (
              <span style={{ fontSize: 10, color: "#475569", marginLeft: "auto" }}>
                {node.children.length} child{node.children.length !== 1 ? "ren" : ""}
              </span>
            )}
          </div>
          <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginTop: 2, wordBreak: "break-all" }}>
            {node.url.length > 100 ? node.url.slice(0, 100) + "…" : node.url}
          </div>
          {hasCookies && showCookies && (
            <div style={{ marginTop: 8, marginLeft: 4 }}>
              {node.cookies.map((c, i) => <CookieChip key={i} cookie={c} />)}
            </div>
          )}
        </div>
      </div>
      {hasChildren && expanded && (
        <div style={{ marginLeft: indent + 24, borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
          {node.children.map((child) => <TreeNode key={child.url} node={child} depth={0} />)}
        </div>
      )}
    </div>
  );
}

// ─── Cookies Panel ────────────────────────────────────────────────────────────

function CookiesPanel({ cookiesByLib, unattributedCookies, strippedToFull }) {
  const [openLib, setOpenLib] = useState(null);
  const libEntries = [...cookiesByLib.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      {libEntries.length === 0 && unattributedCookies.length === 0 && (
        <div style={{ color: "#475569", fontSize: 13, padding: "20px 0", lineHeight: 1.7 }}>
          No <code style={{ color: "#94a3b8" }}>Set-Cookie</code> response headers found attributed to Launch.
          <br />
          JS-set cookies (via <code style={{ color: "#94a3b8" }}>document.cookie</code>) are not visible in HAR — use the runtime interceptor snippet for those.
        </div>
      )}

      {libEntries.map(([libStripped, cas]) => {
        const libFull  = strippedToFull.get(libStripped) || libStripped;
        const libName  = getFilename(libStripped);
        const isOpen   = openLib === libStripped;
        const uniqueNames = [...new Set(cas.map(ca => ca.cookie.name))];

        return (
          <div key={libStripped} style={{
            marginBottom: 10, background: "#0c1018",
            border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden",
          }}>
            <div
              onClick={() => setOpenLib(isOpen ? null : libStripped)}
              style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 14 }}>🍪</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", fontFamily: "monospace" }}>
                  {libName}
                </div>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginTop: 2, wordBreak: "break-all" }}>
                  {libFull.length > 90 ? libFull.slice(0, 90) + "…" : libFull}
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                  {uniqueNames.map(n => (
                    <span key={n} style={{
                      fontSize: 10, fontFamily: "monospace",
                      background: "#1a1008", border: "1px solid #b4530044",
                      borderRadius: 3, padding: "1px 6px", color: "#fcd34d",
                    }}>{n}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: "#fb923c",
                  background: "#1a0e08", border: "1px solid #b4530044",
                  borderRadius: 4, padding: "2px 8px",
                }}>
                  {cas.length} set
                </span>
                <span style={{ fontSize: 10, color: "#475569" }}>{isOpen ? "▲" : "▼"}</span>
              </div>
            </div>

            {isOpen && (
              <div style={{ borderTop: "1px solid #1e293b", padding: "12px 16px" }}>
                {cas.map((ca, i) => (
                  <div key={i} style={{
                    marginBottom: 10, paddingBottom: 10,
                    borderBottom: i < cas.length - 1 ? "1px solid #0f172a" : "none",
                  }}>
                    <div style={{ fontSize: 11, color: "#475569", fontFamily: "monospace", marginBottom: 6 }}>
                      via request → <span style={{ color: "#64748b" }}>{ca.requestFilename}</span>
                    </div>
                    <CookieChip cookie={ca.cookie} />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {unattributedCookies.length > 0 && (
        <div style={{
          marginTop: 16, background: "#0c1018",
          border: "1px solid #1e293b", borderRadius: 8, overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid #0f172a",
            fontSize: 12, color: "#475569", display: "flex", alignItems: "center", gap: 8,
          }}>
            <span>⚠️</span>
            <span>{unattributedCookies.length} cookie{unattributedCookies.length !== 1 ? "s" : ""} not attributed to any Launch library</span>
          </div>
          <div style={{ padding: "12px 16px" }}>
            {unattributedCookies.map((ca, i) => (
              <div key={i} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace", marginBottom: 3 }}>{ca.requestFilename}</div>
                <CookieChip cookie={ca.cookie} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: 16, background: "#0c1018", border: "1px solid #1e2940",
        borderRadius: 8, padding: "12px 16px", fontSize: 12, color: "#334155", lineHeight: 1.7,
      }}>
        💡 <span style={{ color: "#475569" }}>These are server-set cookies via <code style={{ color: "#64748b" }}>Set-Cookie</code> response headers, attributed to their nearest Launch ancestor in the call chain.</span>
        <br />
        <span style={{ color: "#334155" }}>JS-set cookies (<code style={{ color: "#475569" }}>document.cookie = …</code>) are invisible in HAR — use the runtime interceptor snippet to capture those.</span>
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: "#0f1117", border: "1px solid #1e293b",
      borderRadius: 8, padding: "12px 16px", flex: 1, minWidth: 100,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || "#f8fafc", fontFamily: "monospace" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{label}</div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function AdobeLaunchAuditor() {
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState("tree");
  const fileRef = useRef();

  const processFile = useCallback((file) => {
    if (!file) return;
    setLoading(true); setError(null); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        setResult(parseHAR(JSON.parse(e.target.result)));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => { setError("Failed to read file"); setLoading(false); };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragging(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  function countNodes(nodes) {
    let c = 0;
    for (const n of nodes) { c++; c += countNodes(n.children); }
    return c;
  }
  function collectTypes(nodes, acc = {}) {
    for (const n of nodes) { acc[n.type] = (acc[n.type] || 0) + 1; collectTypes(n.children, acc); }
    return acc;
  }

  const instructions = [
    "Open Chrome DevTools (F12)",
    "Go to the Network tab",
    "Reload the page with Network tab open",
    'Right-click any request → "Save all as HAR with content"',
    "Drop the .har file below",
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#070910", color: "#e2e8f0", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #0f172a", padding: "20px 32px",
        background: "#080b12", display: "flex", alignItems: "center", gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "linear-gradient(135deg, #ff6b35, #f72585)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, flexShrink: 0,
        }}>⬡</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" }}>Adobe Launch Auditor</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 1 }}>
            Trace every library &amp; cookie injected by your Launch container
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto" }}>

        {/* Upload state */}
        {!result && (
          <>
            <div style={{
              background: "#0c1018", border: "1px solid #1e293b",
              borderRadius: 10, padding: "20px 24px", marginBottom: 20,
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>
                How to export a HAR file
              </div>
              {instructions.map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, fontFamily: "monospace", color: "#ff6b35",
                    background: "#1a0e08", border: "1px solid #ff6b3530",
                    borderRadius: 4, padding: "1px 7px", flexShrink: 0, marginTop: 1,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 13, color: "#94a3b8" }}>{step}</span>
                </div>
              ))}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragging ? "#ff6b35" : "#1e293b"}`,
                borderRadius: 12, padding: "48px 32px", textAlign: "center",
                cursor: "pointer", transition: "all 0.2s",
                background: dragging ? "#1a0e08" : "#0c1018", marginBottom: 24,
              }}
            >
              <input ref={fileRef} type="file" accept=".har,application/json"
                style={{ display: "none" }} onChange={(e) => processFile(e.target.files[0])} />
              <div style={{ fontSize: 36, marginBottom: 12 }}>📂</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#e2e8f0", marginBottom: 6 }}>Drop your .har file here</div>
              <div style={{ fontSize: 13, color: "#475569" }}>or click to browse</div>
            </div>
          </>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: 48, color: "#475569" }}>
            <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>Parsing HAR file…
          </div>
        )}

        {error && (
          <div style={{
            background: "#1a0808", border: "1px solid #7f1d1d",
            borderRadius: 8, padding: "14px 18px", color: "#fca5a5", fontSize: 13, marginBottom: 20,
          }}>❌ {error}</div>
        )}

        {result && (
          <>
            {/* Stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
              <StatCard label="Launch scripts"       value={result.tree.length}       color="#ff6b35" />
              <StatCard label="Injected resources"   value={countNodes(result.tree)}  color="#4ade80" />
              <StatCard label="Unique domains"       value={result.domains.length}    color="#22d3ee" />
              <StatCard label="Cookies attributed"   value={result.totalCookies}      color="#fb923c" />
              <StatCard label="Libs setting cookies" value={result.cookiesByLib.size} color="#fcd34d" />
              <StatCard label="HAR entries"          value={result.totalEntries}      color="#818cf8" />
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
              {Object.entries(TYPE_COLORS).filter(([k]) => k !== "unknown").map(([type, c]) => (
                <div key={type} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot, display: "inline-block", boxShadow: `0 0 4px ${c.dot}88` }} />
                  <span style={{ fontSize: 11, color: "#64748b" }}>{type}</span>
                </div>
              ))}
            </div>

            {/* Type breakdown */}
            {(() => {
              const types = collectTypes(result.tree);
              return (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                  {Object.entries(types).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                    const c = typeColor(type);
                    return (
                      <div key={type} style={{
                        background: c.bg, border: `1px solid ${c.border}55`,
                        borderRadius: 6, padding: "4px 10px", fontSize: 12, color: c.text,
                        display: "flex", gap: 6, alignItems: "center",
                      }}>
                        <span style={{ fontWeight: 700 }}>{count}</span>
                        <span style={{ opacity: 0.7 }}>{type}</span>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {result.tree.length === 0 && (
              <div style={{
                background: "#1a1000", border: "1px solid #78350f",
                borderRadius: 8, padding: "14px 18px", color: "#fde68a", fontSize: 13, marginBottom: 20,
              }}>
                ⚠️ No Adobe Launch script detected. Make sure the page loaded with Launch active, or the Launch URL may use an unusual pattern.
              </div>
            )}

            {/* Domains */}
            <div style={{
              background: "#0c1018", border: "1px solid #1e293b",
              borderRadius: 10, padding: "16px 20px", marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                Third-party domains detected
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {result.domains.sort().map(d => (
                  <span key={d} style={{
                    fontSize: 11, fontFamily: "monospace", background: "#0f172a",
                    border: "1px solid #1e293b", borderRadius: 4, padding: "3px 8px", color: "#94a3b8",
                  }}>{d}</span>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #1e293b" }}>
              {[
                { id: "tree",    label: "📡  Request Call Chain" },
                { id: "cookies", label: `🍪  Cookies by Library  (${result.totalCookies})` },
              ].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  background: tab === t.id ? "#0c1018" : "transparent",
                  border: "none",
                  borderBottom: tab === t.id ? "2px solid #ff6b35" : "2px solid transparent",
                  color: tab === t.id ? "#e2e8f0" : "#475569",
                  fontSize: 13, padding: "10px 18px", cursor: "pointer",
                  fontWeight: tab === t.id ? 600 : 400, transition: "all 0.15s",
                }}>{t.label}</button>
              ))}
            </div>

            <div style={{
              background: "#0c1018", border: "1px solid #1e293b", borderTop: "none",
              borderRadius: "0 0 10px 10px", padding: "16px", marginBottom: 20,
            }}>
              {tab === "tree" && (
                <>
                  <div style={{ fontSize: 11, color: "#334155", marginBottom: 12, textAlign: "right" }}>
                    Click rows to expand/collapse · 🍪 badge = cookies set by that request
                  </div>
                  {result.tree.length === 0
                    ? <div style={{ color: "#475569", fontSize: 13, padding: "12px 0" }}>No tree to display.</div>
                    : result.tree.map((node) => <TreeNode key={node.url} node={node} depth={0} />)
                  }
                </>
              )}
              {tab === "cookies" && (
                <CookiesPanel
                  cookiesByLib={result.cookiesByLib}
                  unattributedCookies={result.unattributedCookies}
                  strippedToFull={result.strippedToFull}
                />
              )}
            </div>

            <button
              onClick={() => { setResult(null); setError(null); setTab("tree"); }}
              style={{
                background: "transparent", border: "1px solid #1e293b",
                borderRadius: 6, padding: "8px 16px", color: "#64748b", fontSize: 12, cursor: "pointer",
              }}
            >← Load another HAR file</button>
          </>
        )}
      </div>
    </div>
  );
}
