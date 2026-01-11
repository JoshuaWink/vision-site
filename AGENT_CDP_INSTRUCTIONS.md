# CDP Browser Control Instructions for AI Agents

**System**: Chrome DevTools Protocol (CDP) bridge for remote browser control
**Location**: `/vision-site/`
**Purpose**: Control any Chromium browser (Chrome, Edge, Brave) to navigate, scan, and interact with ANY website

---

## 🎯 Core Capabilities

### What You Can Do

1. **Navigate to ANY URL** - No CORS restrictions, no same-origin policy
2. **Scan pages for elements** - OmniParser-style numbered element detection
3. **Execute JavaScript** - Run custom scripts in the browser context
4. **Take screenshots** - Capture page visuals with base64 encoding
5. **Read page data** - Title, URL, dimensions, DOM content
6. **Handle authentication** - Use real browser sessions with cookies/logins
7. **Bypass bot detection** - Real Chrome session = no WebDriver flags
8. **Switch modes** - Toggle between headed (visible) and headless

---

## 🚀 Quick Start

### 1. Start Services

```bash
# Terminal 1: Start CDP bridge server
cd /vision-site
npm run cdp-bridge

# Terminal 2: Start browser (choose mode)
# Option A: Visible browser (default, isolated profile)
npm run start-edge

# Option B: Headless browser (fast, isolated profile)
./switch-browser-mode.sh headless

# Option C: Visible with shared profile (recommended for auth)
./switch-browser-mode-shared.sh headed

# Option D: Headless with shared profile
./switch-browser-mode-shared.sh headless
```

### 2. Basic Operations

```bash
# Connect to browser
node cdp-cli.js connect

# Navigate to any site
node cdp-cli.js navigate https://example.com

# Get page information
node cdp-cli.js page

# Scan for interactive elements
node cdp-cli.js scan

# Take screenshot
node cdp-cli.js screenshot

# Disconnect
node cdp-cli.js disconnect
```

---

## 📋 CDP CLI Commands Reference

### Connection Management

```bash
# Connect to browser on default port (9222)
node cdp-cli.js connect

# Connect to custom port
node cdp-cli.js connect 9223

# Check CDP bridge health
node cdp-cli.js health

# Disconnect from browser
node cdp-cli.js disconnect
```

### Navigation

```bash
# Navigate to URL
node cdp-cli.js navigate https://github.com

# Navigate shorthand
node cdp-cli.js nav https://amazon.com
```

### Page Inspection

```bash
# Get current page info (title, URL, dimensions)
node cdp-cli.js page
node cdp-cli.js info  # alias

# Scan page for interactive elements
node cdp-cli.js scan

# Take screenshot (returns base64)
node cdp-cli.js screenshot
node cdp-cli.js shot  # alias
```

---

## 🔧 Advanced: Custom JavaScript Execution

### Direct CDP Bridge API

The CDP bridge server (`http://localhost:3001`) exposes REST endpoints:

```javascript
// Execute custom JavaScript on the page
const response = await fetch('http://localhost:3001/api/cdp/execute', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: `
      // Your custom JavaScript here
      return document.querySelectorAll('button').length;
    `
  })
});

const result = await response.json();
console.log(result.value); // Returns: number of buttons
```

### Adding Custom Script Execution to CLI

Create `cdp-cli-extended.js`:

```javascript
#!/usr/bin/env node

const CDP_BRIDGE = 'http://localhost:3001';

async function executeScript(script) {
  console.log('⚙️  Executing custom script...');
  
  const response = await fetch(`${CDP_BRIDGE}/api/cdp/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script })
  });
  
  const result = await response.json();
  console.log('✅ Script result:', result.value);
  return result;
}

// Usage examples:
// Get all h1 text
executeScript(`
  Array.from(document.querySelectorAll('h1'))
    .map(h => h.textContent.trim())
`);

// Click a button by selector
executeScript(`
  document.querySelector('#submit-button').click();
  return 'Button clicked';
`);

// Extract table data
executeScript(`
  Array.from(document.querySelectorAll('table tr')).map(row =>
    Array.from(row.cells).map(cell => cell.textContent)
  )
`);
```

---

## 🔄 Mode Switching Strategies

### Isolated Profiles (Default)

**Script**: `./switch-browser-mode.sh [headed|headless]`

```bash
# Headless: /tmp/edge-headless
# Headed: /tmp/edge-cdp

# Use when:
# - Testing with clean state
# - Preventing session pollution
# - Running parallel browsers
```

**Data Isolation**:
- ❌ Cookies do NOT transfer
- ❌ Login sessions separate
- ❌ Browser history independent
- ✅ Clean slate each mode

### Shared Profile (Recommended for Auth)

**Script**: `./switch-browser-mode-shared.sh [headed|headless]`

```bash
# Both modes: /tmp/edge-shared-cdp

# Use when:
# - Need persistent login sessions
# - Switching between visual debugging and automation
# - Want cookies to persist
```

**Data Persistence**:
- ✅ Cookies persist
- ✅ Login sessions maintained
- ✅ Browser history shared
- ✅ Extensions available in both modes

### Authentication Workflow (Killer Feature)

```bash
# 1. Start visible browser with shared profile
./switch-browser-mode-shared.sh headed

# 2. Navigate and login manually (you can see it)
node cdp-cli.js navigate https://reddit.com
# (Manually login in the browser window, solve CAPTCHA, 2FA, etc.)

# 3. Switch to headless (keeps login!)
./switch-browser-mode-shared.sh headless

# 4. Continue automation while authenticated
node cdp-cli.js scan
# Now you're scraping as an authenticated user!
```

---

## 🎨 Element Scanning Deep Dive

### What Gets Detected

The DOM scanner finds these interactive elements:
- `button` - All buttons
- `a[href]` - Links with URLs
- `input` - Text fields, checkboxes, radios
- `select` - Dropdowns
- `textarea` - Multi-line inputs
- `[role="button"]` - ARIA buttons
- `[onclick]` - Click handlers
- `[tabindex]` - Keyboard navigable
- `video`, `audio` - Media elements
- `img` - Images
- `[contenteditable]` - Editable regions
- `label` - Form labels

### Element Data Structure

```javascript
{
  id: 42,                    // Numbered sequentially (#1, #2, ...)
  x: 150,                    // Position from top-left
  y: 200,
  w: 120,                    // Width
  h: 40,                     // Height
  tag: 'button',             // HTML tag name
  text: 'Submit Form',       // Visible text (truncated to 50 chars)
  type: 'submit',            // Input type (if applicable)
  href: 'https://...',       // Link URL (if applicable)
  id: 'submit-btn',          // Element ID attribute
  className: 'btn primary',  // CSS classes
  ariaLabel: 'Submit',       // Accessibility label
  role: 'button',            // ARIA role
  selector: '#submit-btn'    // CSS selector
}
```

### Filtering Scan Results

```bash
# Get only buttons
node cdp-cli.js scan | grep "button"

# Get first 20 elements
node cdp-cli.js scan | head -80  # 4 lines per element

# Get elements with specific text
node cdp-cli.js scan | grep -A3 '"Login"'

# Count total elements
node cdp-cli.js scan | grep "Found" | cut -d' ' -f3
```

---

## 🌐 Use Case Patterns

### Pattern 1: Public Data Collection

```bash
# Navigate to target
node cdp-cli.js navigate https://news.ycombinator.com

# Scan elements
node cdp-cli.js scan > hn_elements.json

# Extract specific data with custom script
# (Add execute endpoint to bridge first)
```

### Pattern 2: Authenticated Scraping

```bash
# Start visible browser
./switch-browser-mode-shared.sh headed

# Navigate and login
node cdp-cli.js navigate https://reddit.com/r/programming
# Manually login in browser window

# Switch to headless (faster, less resources)
./switch-browser-mode-shared.sh headless

# Scrape while logged in
node cdp-cli.js scan > reddit_feed.json
```

### Pattern 3: Multi-Site Testing

```bash
# Test element detection across sites
SITES=(
  "https://github.com"
  "https://amazon.com"
  "https://news.ycombinator.com"
  "https://wikipedia.org"
)

for site in "${SITES[@]}"; do
  echo "Testing $site..."
  node cdp-cli.js navigate "$site"
  sleep 2
  node cdp-cli.js scan | grep "Found"
done
```

### Pattern 4: CAPTCHA-Protected Sites

```bash
# Start visible to solve CAPTCHA
./switch-browser-mode-shared.sh headed

# Navigate to protected site
node cdp-cli.js navigate https://some-captcha-site.com

# Manually solve CAPTCHA in browser window
# (Watch the browser, click checkboxes, etc.)

# Once solved, scan the page
node cdp-cli.js scan

# Optional: Switch to headless for batch work
./switch-browser-mode-shared.sh headless
```

---

## 🛠️ Extending the CDP Bridge

### Adding Execute Endpoint

Edit `cdp-bridge/server.js`:

```javascript
/**
 * Execute custom JavaScript on page
 */
app.post('/api/cdp/execute', async (req, res) => {
  if (!client) {
    return res.status(400).json({
      success: false,
      error: 'Not connected to Chrome'
    });
  }

  const { script } = req.body;
  
  if (!script) {
    return res.status(400).json({
      success: false,
      error: 'Script is required'
    });
  }

  try {
    const { Runtime } = client;

    const result = await Runtime.evaluate({
      expression: script,
      returnByValue: true,
      awaitPromise: true
    });

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || 'Script execution failed');
    }

    res.json({
      success: true,
      value: result.result.value
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Adding Element Click

```javascript
/**
 * Click element by selector
 */
app.post('/api/cdp/click', async (req, res) => {
  if (!client) {
    return res.status(400).json({
      success: false,
      error: 'Not connected to Chrome'
    });
  }

  const { selector } = req.body;
  
  try {
    const { Runtime } = client;

    const result = await Runtime.evaluate({
      expression: `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return { success: false, error: 'Element not found' };
          el.click();
          return { success: true };
        })()
      `,
      returnByValue: true
    });

    res.json(result.result.value);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

### Adding Form Fill

```javascript
/**
 * Fill form input by selector
 */
app.post('/api/cdp/fill', async (req, res) => {
  if (!client) {
    return res.status(400).json({
      success: false,
      error: 'Not connected to Chrome'
    });
  }

  const { selector, value } = req.body;
  
  try {
    const { Runtime } = client;

    const result = await Runtime.evaluate({
      expression: `
        (function() {
          const el = document.querySelector('${selector}');
          if (!el) return { success: false, error: 'Element not found' };
          el.value = '${value}';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return { success: true };
        })()
      `,
      returnByValue: true
    });

    res.json(result.result.value);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## 🔒 Security & Best Practices

### Security Considerations

1. **Localhost Only**: CDP bridge runs on `localhost:3001` - not exposed to network
2. **Port Ownership**: Only local processes can connect to debugging port
3. **Profile Isolation**: Use separate profiles for testing vs. personal browsing
4. **Credential Safety**: Never log or expose passwords/tokens in scripts
5. **Temporary Profiles**: `/tmp/*` profiles are ephemeral (deleted on reboot)

### Best Practices

1. **Connection Management**:
   - Always disconnect when done: `node cdp-cli.js disconnect`
   - Check health before operations: `node cdp-cli.js health`

2. **Error Handling**:
   - Wait for page load: `sleep 2` after navigate
   - Check scan results for empty arrays
   - Verify element exists before interaction

3. **Mode Selection**:
   - Use **headed + shared** for initial authentication
   - Switch to **headless + shared** for batch automation
   - Use **isolated profiles** for parallel testing

4. **Performance**:
   - Headless is ~30% faster for scanning
   - Limit scan results with `| head` for large pages
   - Close unused tabs (reduces memory)

5. **Bot Detection**:
   - Avoid rapid requests (add delays)
   - Randomize user-agent if needed
   - Use headed mode for CAPTCHA challenges
   - Maintain session cookies

---

## 📊 Monitoring & Debugging

### Check System Status

```bash
# Is CDP bridge running?
curl -s http://localhost:3001/api/health | python3 -m json.tool

# Is browser accepting connections?
curl -s http://localhost:9222/json/version | python3 -m json.tool

# How many tabs are open?
curl -s http://localhost:9222/json | python3 -m json.tool | grep '"type": "page"' | wc -l

# What processes are running?
ps aux | grep -E "(cdp-bridge|Microsoft Edge.*9222)" | grep -v grep
```

### Debugging Scans

```bash
# Verbose scan output
node cdp-cli.js scan | tee scan_output.txt

# Check for JavaScript errors in page
# (Add error logging to bridge)

# Verify element selectors work
# Use browser DevTools alongside CDP
```

### Performance Metrics

```bash
# Time a scan
time node cdp-cli.js scan > /dev/null

# Compare headless vs headed
./switch-browser-mode-shared.sh headed
time node cdp-cli.js navigate https://github.com && sleep 2 && node cdp-cli.js scan > /dev/null

./switch-browser-mode-shared.sh headless
time node cdp-cli.js navigate https://github.com && sleep 2 && node cdp-cli.js scan > /dev/null
```

---

## 🎯 Real-World Examples

### Example 1: GitHub Repository Analysis

```bash
# Connect
node cdp-cli.js connect

# Navigate to repo
node cdp-cli.js navigate https://github.com/torvalds/linux

# Wait for load
sleep 3

# Scan elements
node cdp-cli.js scan > linux_repo_elements.json

# Extract specific data (with custom script)
# - Number of commits
# - Latest release tag
# - Contributors count
```

### Example 2: E-Commerce Price Monitoring

```bash
# Navigate to product page
node cdp-cli.js navigate https://amazon.com/dp/PRODUCT_ID

# Scan for price elements
node cdp-cli.js scan | grep -iE '(price|\$[0-9])'

# Extract exact price with custom script
# (Add execute endpoint first)
```

### Example 3: News Aggregation

```bash
#!/bin/bash

SITES=(
  "https://news.ycombinator.com"
  "https://reddit.com/r/programming"
  "https://lobste.rs"
)

for site in "${SITES[@]}"; do
  echo "Fetching from $site..."
  node cdp-cli.js navigate "$site"
  sleep 2
  node cdp-cli.js scan | grep -A3 '"a"' > "headlines_$(basename $site).json"
done
```

---

## 🚦 Troubleshooting

### Common Issues

**"CDP Bridge server not running"**
```bash
# Start the bridge
npm run cdp-bridge
```

**"Connection failed: fetch failed"**
```bash
# Ensure browser is running with debugging port
curl http://localhost:9222/json/version

# If no response, start browser:
./switch-browser-mode.sh headed
```

**"No inspectable targets"**
```bash
# Browser has no tabs open
# Navigate to any page first:
node cdp-cli.js navigate https://example.com
```

**"Scan returns 0 elements"**
```bash
# Page may not be loaded yet
# Add delay after navigation:
sleep 3

# Or page may be empty (about:blank)
# Navigate to a real site first
```

**"Port 9222 already in use"**
```bash
# Kill existing browser
pkill -f "Microsoft Edge.*remote-debugging-port"

# Or use different port
./switch-browser-mode.sh headed 9223
```

---

## 📚 Architecture Overview

```
┌─────────────────────┐
│   AI Agent          │  You
│   (cdp-cli.js)      │  
└──────────┬──────────┘
           │ HTTP Fetch
           │ (localhost:3001)
           ▼
┌─────────────────────┐
│   CDP Bridge        │  Express REST API
│   (Node.js)         │  - /api/cdp/connect
│                     │  - /api/cdp/scan
│                     │  - /api/cdp/navigate
│                     │  - /api/cdp/screenshot
│                     │  - /api/health
└──────────┬──────────┘
           │ chrome-remote-interface
           │ (WebSocket: localhost:9222)
           ▼
┌─────────────────────┐
│   Browser           │  Edge/Chrome
│   (Headed/Headless) │  - Real DOM
│                     │  - Cookies/Sessions
│                     │  - User Profile
└─────────────────────┘
           │
           ▼
    ┌────────────┐
    │  Websites  │  ANY URL
    └────────────┘
```

---

## 🎓 Learning Path

### Beginner Tasks
1. Connect to browser and navigate to 3 different sites
2. Scan each site and count total elements
3. Switch between headed and headless modes
4. Take screenshots of pages

### Intermediate Tasks
1. Use shared profile to login to a site
2. Switch to headless after login
3. Scan authenticated pages
4. Extract specific element types (buttons only, links only)

### Advanced Tasks
1. Add custom execute endpoint to CDP bridge
2. Implement form filling automation
3. Create a multi-site scraper with rate limiting
4. Build a CAPTCHA-solving workflow (manual + automation)

---

## 📖 Summary for AI Agents

**You can:**
- Control any Chromium browser remotely
- Navigate to ANY website (no CORS)
- Scan pages for numbered interactive elements
- Execute custom JavaScript in browser context
- Preserve login sessions between modes
- Avoid bot detection using real browser sessions
- Switch between visual (debugging) and headless (fast) modes

**Key files:**
- `cdp-cli.js` - Command-line interface
- `cdp-bridge/server.js` - REST API server
- `switch-browser-mode.sh` - Mode switcher (isolated)
- `switch-browser-mode-shared.sh` - Mode switcher (persistent sessions)

**Start here:**
```bash
npm run cdp-bridge &
./switch-browser-mode-shared.sh headed
node cdp-cli.js connect
node cdp-cli.js navigate https://github.com
node cdp-cli.js scan
```

**That's everything you need to control browsers at scale!** 🚀
