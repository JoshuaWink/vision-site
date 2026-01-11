# CDP Quick Start Guide

## 🚀 How to Use CDP Mode (CAPTCHA-Resistant Scanning)

### Step 1: Start Chrome with Remote Debugging

**Option A: Chrome 144+ (Auto-connect)**
```bash
# Latest Chrome automatically enables CDP
# Just open Chrome normally
```

**Option B: Stable Chrome (Manual Port)**
```bash
# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222

# Windows
chrome.exe --remote-debugging-port=9222

# Linux
google-chrome --remote-debugging-port=9222
```

### Step 2: Start CDP Bridge Server

In a new terminal:
```bash
cd vision-site
npm run cdp-bridge
```

Expected output:
```
CDP Bridge Server running on http://localhost:9223
Waiting for CDP connection on port 9222...
```

### Step 3: Start Vision Site (if not already running)

In another terminal:
```bash
cd vision-site
npm run dev
```

Open: http://localhost:3000

### Step 4: Connect and Scan

1. **Navigate in Chrome**: Go to ANY website (e.g., https://amazon.com, https://github.com)
2. **In Vision Site**: Click "🔌 Connect to Chrome" in the control panel
3. **Scan**: Click "🔍 Scan Chrome Tab" to detect all elements on the page
4. **View Results**: See numbered bounding boxes overlaid on the JSON output

---

## ✅ Why CDP is Better

| Feature | Local DOM Scanner | CDP Mode |
|---------|-------------------|----------|
| **Works on any website** | ❌ Only vision-site pages | ✅ ANY website |
| **CAPTCHA resistance** | ❌ N/A (local only) | ✅ Uses your real Chrome session |
| **Login-required sites** | ❌ Can't access | ✅ Preserves cookies/auth |
| **Bot detection** | ❌ N/A | ✅ No WebDriver flags |
| **Cross-origin** | ❌ Blocked by CORS | ✅ Full DOM access |

---

## 🔍 Testing Workflow

### Visual Model Testing with CDP

1. **Open target site in Chrome** (login if needed, solve CAPTCHA manually)
2. **Connect CDP bridge** to that Chrome tab
3. **Scan page** → Get numbered element labels
4. **Take screenshot** (with numbered overlays visible)
5. **Send to VL model**: "What is element #42?"
6. **Model responds** using the numbered references

### Example Prompt for VL Model

```
Here's a screenshot of a website with numbered elements.

Question: What is element #8?
Expected: "Submit Button" or "Search Icon" (not coordinates)
```

---

## 🛠️ Troubleshooting

### "CDP Bridge server not running"
- Run `npm run cdp-bridge` in a separate terminal

### "Connection failed"
- Ensure Chrome is running with `--remote-debugging-port=9222`
- Check if port 9222 is already in use: `lsof -i :9222` (macOS/Linux)

### "No tabs found"
- Make sure Chrome has at least one tab open
- Try refreshing the page in Chrome

### "CORS error"
- CDP bypasses CORS automatically
- If you see CORS errors, ensure CDP bridge is running on `localhost:9223`

---

## 📋 Supported Chrome Versions

- **Chrome 144+**: Auto-connect (no flags needed)
- **Chrome 120-143**: Manual `--remote-debugging-port=9222`
- **Chrome 119 or earlier**: Upgrade Chrome for best experience

---

## 🔒 Security Notes

- CDP gives **full access** to the connected Chrome tab
- Only connect to **your own** Chrome instance
- Bridge server runs on `localhost` only (not accessible remotely)
- Disconnect when done to free the debugging port

---

## 🎯 Next Steps

- Test on login-required sites (GitHub, Gmail, banking)
- Test on CAPTCHA-protected sites (Cloudflare pages)
- Compare element detection accuracy vs. screenshot-only models
- Export element data for fine-tuning VL models

---

**Ready to test?** Start all three services and connect! 🚀
