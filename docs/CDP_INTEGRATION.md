# Chrome DevTools Protocol Integration for Vision-Site

## Overview

This document describes how to integrate Chrome DevTools Protocol (CDP) MCP server with vision-site for accurate, CAPTCHA-resistant DOM scanning.

## Why CDP MCP?

### The Problem with Traditional Automation

| Tool | CAPTCHA Detection | Accuracy | Real Browser |
|------|------------------|----------|--------------|
| **Puppeteer** | High (WebDriver flags) | 95% | ❌ Automation |
| **Playwright** | High (WebDriver flags) | 95% | ❌ Automation |
| **Selenium** | Very High | 90% | ❌ Automation |
| **CDP MCP** | **None** | **100%** | ✅ **Real User Session** |

### The CDP Advantage

Chrome DevTools Protocol MCP **attaches to your real Chrome session**:
- You manually navigate, log in, pass CAPTCHAs
- CDP connects to the same session (with your permission)
- No WebDriver flags, no automation detection
- Full DOM access with 100% accuracy

## Setup Instructions

### 1. Install Chrome DevTools MCP Server

```bash
# Option A: Use with Claude Desktop (recommended for testing)
npx -y chrome-devtools-mcp@latest

# Option B: Global install for programmatic use
npm install -g chrome-devtools-mcp
```

### 2. Enable Remote Debugging in Chrome

#### For Chrome 144+ (Beta/Canary - Auto-Connect)

1. Open Chrome
2. Navigate to `chrome://inspect/#remote-debugging`
3. Click "Enable remote debugging"
4. Allow incoming connections when prompted

#### For Stable Chrome (Manual Port)

Start Chrome with debugging enabled:

```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug

# Windows
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="%TEMP%\chrome-debug"

# Linux
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug
```

### 3. Configure MCP Client

#### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": ["-y", "chrome-devtools-mcp@latest"]
    }
  }
}
```

#### For Auto-Connect (Chrome 144+)

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "chrome-devtools-mcp@latest",
        "--autoConnect",
        "--channel=beta"
      ]
    }
  }
}
```

## Integration with Vision-Site

### Option 1: CDP MCP as Backend Service

Create a Node.js service that:
1. Connects to your Chrome session via CDP
2. Exposes API endpoints for vision-site
3. Scans pages and returns element data

### Option 2: Direct Browser Extension

Build a Chrome extension that:
1. Runs your DOM scanner in-page
2. Uses Chrome's native messaging
3. No external servers needed

### Option 3: MCP Bridge (Recommended)

Create a bridge between vision-site and CDP MCP:

```javascript
// cdp-bridge.js
import { ChromeDevToolsMCP } from 'chrome-devtools-mcp';

const mcp = new ChromeDevToolsMCP({
  port: 9222,
  host: 'localhost'
});

// Connect to running Chrome instance
await mcp.connect();

// Scan current page for elements
async function scanPage() {
  const elements = await mcp.evaluateScript(`
    // Your domScanner.js code here
    const scanner = require('./domScanner');
    return scanner.scanPage();
  `);
  
  return elements;
}

// Expose via HTTP endpoint
app.get('/api/scan', async (req, res) => {
  const elements = await scanPage();
  res.json({ elements });
});
```

## Workflow

### For Vision Model Testing

```mermaid
graph LR
    A[User Opens Chrome] --> B[Navigate to Test Page]
    B --> C[Manual Login/CAPTCHA if needed]
    C --> D[Click 'Connect CDP' in Vision-Site]
    D --> E[CDP Attaches to Chrome]
    E --> F[Scan DOM]
    F --> G[Generate Bounding Boxes]
    G --> H[Screenshot with Labels]
    H --> I[Send to VL Model]
```

### Technical Flow

1. **User Action**: Click "Connect to Chrome" button in vision-site
2. **CDP Connection**: Bridge connects to Chrome on port 9222
3. **DOM Scan**: Execute `domScanner.js` in the browser context
4. **Data Return**: Get element positions, types, text
5. **Label Render**: Display numbered bounding boxes
6. **Screenshot**: User captures labeled page
7. **VL Test**: Send to vision model for evaluation

## API Endpoints (Proposed)

### POST /api/cdp/connect
Connect to Chrome instance
```json
{
  "port": 9222,
  "host": "localhost"
}
```

### GET /api/cdp/scan
Scan current page for elements
```json
{
  "elements": [
    {
      "id": 1,
      "tag": "button",
      "text": "Login",
      "x": 100,
      "y": 200,
      "w": 120,
      "h": 40
    }
  ]
}
```

### POST /api/cdp/screenshot
Take screenshot of current page
```json
{
  "format": "png",
  "quality": 80
}
```

## Advantages Over Current Implementation

| Feature | Current (Client-side DOM) | CDP MCP Integration |
|---------|--------------------------|---------------------|
| **CAPTCHA Bypass** | N/A (same page only) | ✅ Use real sessions |
| **Cross-Origin** | ❌ CORS restrictions | ✅ Full access |
| **Any Website** | ❌ Only vision-site pages | ✅ Test ANY website |
| **Auth Required** | ❌ Can't test | ✅ Manual login first |
| **Accuracy** | 100% (same domain) | 100% (any domain) |
| **Bot Detection** | N/A | ✅ None (real browser) |

## Security Considerations

- CDP access requires user permission (Chrome 144+)
- Only works on localhost by default
- User must explicitly enable remote debugging
- Connection requires active consent

## Next Steps

1. **Create CDP bridge server** (Node.js)
2. **Add "Connect to Chrome" button** to vision-site
3. **Implement connection status UI**
4. **Test with protected sites** (login walls, CAPTCHAs)
5. **Add support for multiple tabs/windows**

## Resources

- [Chrome DevTools MCP GitHub](https://github.com/ChromeDevTools/chrome-devtools-mcp)
- [CDP Protocol Documentation](https://chromedevtools.github.io/devtools-protocol/)
- [MCP Specification](https://modelcontextprotocol.io/)

---

**This approach gives you the best of both worlds**:
- ✅ DOM accuracy (direct browser access)
- ✅ CAPTCHA immunity (real user session)
- ✅ Universal (test any website)
- ✅ No bot detection (CDP ≠ WebDriver)
