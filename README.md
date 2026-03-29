# Adobe Launch Audit Tool

A browser-based static tool to audit which **external libraries Adobe Launch (Adobe Experience Platform Tags) injects** into your web application, visualise the call chain, and inspect cookies set by those third-party libraries.

---

## Problem This Solves

Adobe Launch is a tag management system. When you load its container script (e.g. `assets.adobedtm.com/…/launch-xxxx.min.js`), it dynamically injects many third-party libraries based on configured rules — analytics, advertising pixels, heatmap tools, consent managers, etc.

Manually auditing which libraries are injected is tedious. This tool automates it by parsing a **HAR (HTTP Archive) file** exported from Chrome DevTools and reconstructing the full initiator call chain.

---

## How to Use

### Step 1 — Export a HAR file from Chrome
1. Navigate to your site (e.g. `https://mytal.tal.com.au`)
2. Open Chrome DevTools (`F12`)
3. Go to the **Network** tab
4. **Hard reload** the page: `Ctrl+Shift+R` (Win/Linux) or `Cmd+Shift+R` (Mac)
   > ⚠️ DevTools must be open BEFORE the reload to capture `_initiator` stack trace metadata
4. Wait for the page to fully load
5. Right-click anywhere in the request list → **"Save all as HAR with content"**
6. Save the `.har` file

### Step 2 — Load the HAR file
- Drop the `.har` file onto the upload zone, **or** click "Browse HAR File"


### Step 3 — Explore Results

| Tab | What it shows |
|-----|--------------|
| **Call Chain Graph** | Interactive force-directed graph: Your App → Adobe Launch → injected libs |
| **Injected Libraries** | Filterable table of all third-party requests with category, type, initiator, depth |
| **Cookie Audit** | All cookies set in HTTP response headers from Adobe Launch and its libraries |
| **Raw Initiator Chains** | Exact call stack chains as recorded in the HAR `_initiator` field |

---

## Features

- ✅ Parse HAR files exported from Chrome DevTools
- ✅ Detect Adobe Launch container scripts automatically
- ✅ Trace JavaScript initiator call chains (`_initiator.stack`)
- ✅ Classify each request by vendor category (Analytics, Advertising, Heatmap, Adobe, etc.)
- ✅ Interactive ECharts force-directed graph of the injection tree
- ✅ Cookie audit table (from HTTP Set-Cookie response headers)
- ✅ Filter by domain, category, resource type
- ✅ Export full audit to CSV
- ✅ Demo mode with realistic sample data (Facebook Pixel, Bing UET, ContentSquare, GA4, LinkedIn, OneTrust, New Relic, Adobe Analytics/Target/Audience Manager)

---

## Vendor Categories Detected

| Category | Examples |
|----------|---------|
| **Adobe Suite** | AppMeasurement.js, Adobe Target (tt.omtrdc.net), Audience Manager (demdex.net) |
| **Adobe Launch** | assets.adobedtm.com, launch-*.min.js |
| **Analytics** | Google Analytics (GA4), Segment, Amplitude, Heap, Clarity, New Relic |
| **Advertising / Pixel** | Facebook Pixel, Bing UET, LinkedIn Insight, Twitter Pixel, Pinterest, TikTok, Criteo |
| **Heatmap / Session** | ContentSquare, Hotjar, FullStory, Mouseflow, Medallia |
| **Identity / Consent** | OneTrust, TrustArc, LiveRamp, ID5 |
| **CDN / Performance** | Cloudflare, Fastly, Akamai |

> Extend `js/categories.js` to add your own vendor patterns.

---

## How Initiator Chain Detection Works

Chrome DevTools records a non-standard `_initiator` field in HAR files:

```json
"_initiator": {
  "type": "script",
  "stack": {
    "callFrames": [
      { "url": "https://connect.facebook.net/en_US/fbevents.js", "lineNumber": 1 }
    ],
    "parent": {
      "callFrames": [
        { "url": "https://assets.adobedtm.com/.../launch-abc.min.js", "lineNumber": 42 }
      ]
    }
  }
}
```

The tool walks this nested stack to reconstruct: `Your App → Adobe Launch → fbevents.js → facebook.com/tr/?...`

### Fallback Mode
If the HAR file lacks full stack trace data (DevTools wasn't open at page load), the tool falls back to: **all third-party requests that occurred after Adobe Launch loaded**, sorted by time.

---

## Cookie Audit Notes

The HAR-based cookie audit covers **cookies set via HTTP `Set-Cookie` response headers**.

It does **NOT** capture cookies set via `document.cookie` (JavaScript). For those:
- Chrome DevTools → **Application** tab → **Cookies** → filter by domain
- Or use the **Storage** panel in Firefox DevTools

---

## Limitations

| Limitation | Explanation |
|------------|-------------|
| No `_initiator` in some HAR exports | Must open DevTools before page load |
| JS-set cookies not captured | Use DevTools Application panel for those |
| Dynamic/lazy-loaded libraries | Only captures requests made during the recorded session |
| CORS/mixed content | Some beacons use `navigator.sendBeacon` which may not appear in HAR |

---

## File Structure

```
index.html          — Main page
css/
  style.css         — All styles (dark theme)
js/
  categories.js     — Vendor classification rules
  parser.js         — HAR file parser & initiator chain extractor
  graph.js          — ECharts graph renderer
  app.js            — UI controller, filters, export
```

---

## Technology

- **ECharts 5** — graph/network visualisation
- **Font Awesome 6** — icons
- **Google Fonts (Inter, JetBrains Mono)** — typography
- Pure vanilla JavaScript — no frameworks required
- Fully client-side — HAR files are never uploaded to a server
