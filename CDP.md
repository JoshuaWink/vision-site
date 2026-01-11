# CDP Bridge CLI - Browser Automation

**CDP Bridge** (`cdp.sh`) provides a clean shell interface to control browser automation without JSON escaping headaches. It accepts arguments as literals and handles the complexity server-side.

## Quick Start

```bash
# Start services (browser + bridge)
./manage.sh start

# Scan page for interactive elements
./cdp.sh scan

# Fill form field (element #20) with text
./cdp.sh fill 20 "search term"

# Click element #23
./cdp.sh click 23

# Execute JavaScript
./cdp.sh execute "document.title"
```

## Design Philosophy

Instead of passing complex JavaScript strings through JSON (causing escaping nightmares), `cdp.sh`:

1. **Accepts simple literal arguments** - No shell escaping needed
2. **Handles JSON encoding server-side** - The server manages all escaping
3. **Returns clean structured data** - Easy to parse with `jq` or other tools
4. **Follows the `manage.sh` pattern** - Consistent CLI interface across tools

### Before (Escaping Hell)
```bash
curl -X POST http://localhost:3001/api/cdp/execute \
  -H "Content-Type: application/json" \
  -d '{"script":"const x = \"my value\"; console.log(x);"}'
```

### After (Clean Interface)
```bash
./cdp.sh execute 'const x = "my value"; console.log(x);'
# OR
./cdp.sh fill 5 "my value"  # No escaping needed
```

## Commands

### `./cdp.sh health`
Check bridge connection status.

```bash
$ ./cdp.sh health
{
  "success": true,
  "connected": true,
  "chrome": {
    "host": "localhost",
    "port": 9222
  }
}
```

### `./cdp.sh navigate <url>`
Navigate to a URL.

```bash
$ ./cdp.sh navigate "https://ebay.com"
→ Navigating to: https://ebay.com
{
  "success": true,
  "message": "Navigated to https://www.ebay.com/"
}
```

### `./cdp.sh page-info`
Get current page information (title, URL, dimensions).

```bash
$ ./cdp.sh page-info
{
  "success": true,
  "url": "https://www.ebay.com/",
  "title": "Electronics, Cars, Fashion, Collectibles & More | eBay",
  "width": 1835,
  "height": 1035
}
```

### `./cdp.sh screenshot [output-file]`
Take a screenshot. Defaults to `screenshot.png`.

```bash
$ ./cdp.sh screenshot
→ Taking screenshot...
✓ Screenshot saved to: screenshot.png
4.2M screenshot.png

$ ./cdp.sh screenshot /tmp/page.png
→ Taking screenshot...
✓ Screenshot saved to: /tmp/page.png
3.8M /tmp/page.png
```

### `./cdp.sh scan`
Scan page for interactive elements with IDs for reference.

```bash
$ ./cdp.sh scan
→ Scanning page for interactive elements...
✓ Found 521 interactive elements:
  [1] button (submit) - Hi Joshua!
  [2] svg - 
  [3] a - Daily Deals
  [4] a - Brand Outlet
  [5] a - Gift Cards
  ...
  [521] a - ...
```

Returns JSON with element details:

```bash
$ curl -s -X POST http://localhost:3001/api/cdp/scan | jq '.elements[0]'
{
  "id": 1,
  "x": 189,
  "y": 0,
  "w": 89,
  "h": 32,
  "tag": "button",
  "text": "Hi Joshua!",
  "type": "submit"
}
```

### `./cdp.sh click <elementId>`
Click element by ID (from scan results).

```bash
$ ./cdp.sh click 23
→ Clicking element #23...
{
  "success": true,
  "clicked": "BUTTON",
  "text": "Search"
}
```

### `./cdp.sh fill <elementId> <value>`
Fill form field by ID. **No escaping needed** - pass value as literal argument.

```bash
$ ./cdp.sh fill 20 "galaxy fold 6"
→ Filling element #20 with: galaxy fold 6
{
  "success": true,
  "filled": "INPUT",
  "value": "galaxy fold 6"
}

# Works with special characters too
$ ./cdp.sh fill 5 'search: "galaxy" OR "foldable"'
→ Filling element #5 with: search: "galaxy" OR "foldable"
{
  "success": true,
  "filled": "INPUT",
  "value": "search: \"galaxy\" OR \"foldable\""
}
```

### `./cdp.sh execute <javascript>`
Execute JavaScript in browser context. Returns result.

```bash
$ ./cdp.sh execute "document.title"
{
  "success": true,
  "result": "Electronics, Cars, Fashion, Collectibles & More | eBay"
}

$ ./cdp.sh execute "Math.random()"
{
  "success": true,
  "result": 0.8234759283
}

$ ./cdp.sh execute "document.querySelectorAll('a').length"
{
  "success": true,
  "result": 847
}
```

## Practical Workflows

### Example 1: Search eBay
```bash
# Navigate to eBay
./cdp.sh navigate "https://ebay.com"

# Scan for elements
./cdp.sh scan > /tmp/ebay-elements.json

# Fill search box (element #20) and click search (element #23)
./cdp.sh fill 20 "iphone 15"
./cdp.sh click 23

# Wait and get new page info
sleep 1
./cdp.sh page-info
```

### Example 2: Extract Data
```bash
# Navigate to page
./cdp.sh navigate "https://example.com"

# Execute JavaScript to extract data
./cdp.sh execute "
  Array.from(document.querySelectorAll('.product')).map(el => ({
    title: el.querySelector('h2').textContent,
    price: el.querySelector('.price').textContent
  }))
"
```

### Example 3: Form Submission
```bash
# Scan for form elements
./cdp.sh scan | grep -E "input|button"

# Fill form fields (IDs from scan)
./cdp.sh fill 15 "John Doe"
./cdp.sh fill 20 "john@example.com"
./cdp.sh fill 25 "my password"

# Click submit button
./cdp.sh click 30
```

## Integration in Scripts

```bash
#!/bin/bash

# Ensure bridge is running
./manage.sh start || exit 1

# Navigate
./cdp.sh navigate "https://api.github.com"

# Extract data
RESULT=$(./cdp.sh execute "document.body.textContent")
echo "$RESULT" | jq .

# Take screenshot on error
if [ $? -ne 0 ]; then
  ./cdp.sh screenshot /tmp/error.png
  exit 1
fi
```

## JSON API (Direct curl)

If you prefer to call the bridge directly:

```bash
# Scan
curl -s -X POST http://localhost:3001/api/cdp/scan | jq .

# Click
curl -s -X POST http://localhost:3001/api/cdp/click \
  -H "Content-Type: application/json" \
  -d '{"elementId":23}'

# Fill
curl -s -X POST http://localhost:3001/api/cdp/fill \
  -H "Content-Type: application/json" \
  -d '{"elementId":20,"value":"text here"}'

# Execute
curl -s -X POST http://localhost:3001/api/cdp/execute \
  -H "Content-Type: application/json" \
  -d '{"script":"document.title"}'
```

## Environment Variables

```bash
# Override default bridge URL (default: http://localhost:3001)
export BRIDGE_URL="http://192.168.1.100:3001"
./cdp.sh health

# Or set inline
BRIDGE_URL="http://remote-host:3001" ./cdp.sh scan
```

## Endpoints Reference

| Endpoint | Method | Args | Purpose |
|----------|--------|------|---------|
| `/api/health` | GET | - | Check bridge status |
| `/api/cdp/navigate` | POST | `{url}` | Navigate to URL |
| `/api/cdp/page-info` | GET | - | Get page metadata |
| `/api/cdp/screenshot` | POST | - | Take screenshot |
| `/api/cdp/scan` | POST | - | Scan for elements |
| `/api/cdp/click` | POST | `{elementId}` | Click element |
| `/api/cdp/fill` | POST | `{elementId, value}` | Fill form field |
| `/api/cdp/execute` | POST | `{script}` | Execute JavaScript |

## Troubleshooting

**"Bridge not responding"**
```bash
./manage.sh start  # Start services
```

**Element not found**
```bash
# Re-scan to get latest element IDs (page may have changed)
./cdp.sh scan
```

**JavaScript error**
```bash
# Check the error message in response
./cdp.sh execute "invalid js here" | jq .error
```

**Want to see all elements returned by API**
```bash
curl -s -X POST http://localhost:3001/api/cdp/scan | jq '.elements'
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Your Script                           │
│  (cdp.sh or direct curl)                                    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              CDP Bridge (Express.js)                         │
│  - Handles JSON encoding/escaping                           │
│  - Routes requests to Chrome                               │
└────────────────────┬────────────────────────────────────────┘
                     │ Chrome DevTools Protocol
                     ▼
┌─────────────────────────────────────────────────────────────┐
│        Microsoft Edge (Remote Debugging)                    │
│  - Executes code in real browser context                   │
│  - Returns results back to bridge                          │
└─────────────────────────────────────────────────────────────┘
```

## Key Insight

The bridge abstracts away JSON escaping complexity by being smart about argument handling:

- **`cdp.sh fill 20 "value with $special & chars"`** ✅ Works perfectly
- **`./cdp.sh execute 'var x = "quoted"; console.log(x);'`** ✅ No escaping needed
- Server handles `jq -Rs` to safely escape for JSON internally

This follows the same philosophy as `manage.sh` - move complexity to the infrastructure, keep the CLI clean.
