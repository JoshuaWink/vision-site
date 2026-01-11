# CDP Bridge Server

Backend service that connects vision-site to Chrome via Chrome DevTools Protocol.

## Quick Start

```bash
# Install dependencies
cd cdp-bridge
npm install

# Start Chrome with debugging enabled
chrome --remote-debugging-port=9222

# In another terminal, start the bridge
npm start
```

The bridge server will run on `http://localhost:3001`

## Usage from Vision-Site

### 1. Connect to Chrome

```javascript
const response = await fetch('http://localhost:3001/api/cdp/connect', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ port: 9222, host: 'localhost' })
});
```

### 2. Scan Current Page

```javascript
const response = await fetch('http://localhost:3001/api/cdp/scan');
const { elements } = await response.json();

// elements array contains all interactive elements with positions
```

### 3. Get Page Info

```javascript
const response = await fetch('http://localhost:3001/api/cdp/page-info');
const { url, title, dimensions } = await response.json();
```

### 4. Take Screenshot

```javascript
const response = await fetch('http://localhost:3001/api/cdp/screenshot', {
  method: 'POST'
});
const { screenshot } = await response.json(); // Base64 PNG
```

## API Reference

### POST /api/cdp/connect
Connect to Chrome instance

**Request:**
```json
{
  "port": 9222,
  "host": "localhost"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to Chrome",
  "port": 9222,
  "host": "localhost"
}
```

### GET /api/cdp/scan
Scan current page for interactive elements

**Response:**
```json
{
  "success": true,
  "elements": [
    {
      "id": 1,
      "x": 100,
      "y": 200,
      "w": 120,
      "h": 40,
      "tag": "button",
      "text": "Login"
    }
  ],
  "count": 1
}
```

### GET /api/cdp/page-info
Get current page information

**Response:**
```json
{
  "success": true,
  "url": "https://example.com",
  "title": "Example Page",
  "dimensions": {
    "width": 1920,
    "height": 1080
  }
}
```

### POST /api/cdp/screenshot
Capture screenshot of current page

**Response:**
```json
{
  "success": true,
  "screenshot": "iVBORw0KGgoAAAANSUhEUgA..." // Base64 encoded PNG
}
```

### POST /api/cdp/navigate
Navigate to a URL

**Request:**
```json
{
  "url": "https://example.com"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com"
}
```

### POST /api/cdp/disconnect
Disconnect from Chrome

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from Chrome"
}
```

## Starting Chrome with Remote Debugging

### macOS
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug
```

### Windows
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="%TEMP%\chrome-debug"
```

### Linux
```bash
google-chrome \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-debug
```

## Advantages

✅ **No CAPTCHA detection** - Uses real Chrome session  
✅ **100% DOM accuracy** - Direct browser access  
✅ **Test ANY website** - Not limited to vision-site pages  
✅ **Manual auth** - Login normally before connecting  
✅ **Cross-origin** - No CORS restrictions  

## Troubleshooting

**"Failed to connect to Chrome"**
- Make sure Chrome is running with `--remote-debugging-port=9222`
- Check that port 9222 is not blocked by firewall

**"Port already in use"**
- Stop other processes using port 3001
- Or change PORT in server.js

**"Elements not found"**
- Ensure page has finished loading
- Check browser console for JavaScript errors
