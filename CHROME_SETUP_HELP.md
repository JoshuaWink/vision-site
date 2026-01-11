# Finding and Starting Chrome for CDP

## Your Chrome isn't in the standard location

Here are **3 options** to get Chrome working with CDP:

---

## Option 1: Find Your Chrome Installation

Run this in Terminal:
```bash
# Search your entire system for Chrome
sudo find / -name "Google Chrome" -type f 2>/dev/null | grep MacOS

# Or check your home directory
find ~ -name "Google Chrome" 2>/dev/null
```

Once you find it, start Chrome like this:
```bash
"/full/path/to/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp &
```

---

## Option 2: Use Chrome from Spotlight/Finder

1. **Open Chrome normally** (click the app icon)
2. **Quit Chrome completely** (Cmd+Q)
3. **Open Terminal** and run:
   ```bash
   open -a "Google Chrome" --args --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
   ```

This works even if Chrome isn't in your PATH!

---

## Option 3: Use Alternative Browser (Chromium-based)

CDP works with any Chromium-based browser:

### Brave Browser
```bash
open -a "Brave Browser" --args --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
```

### Microsoft Edge
```bash
open -a "Microsoft Edge" --args --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
```

### Chromium
```bash
open -a "Chromium" --args --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp
```

---

## Quick Test: Is Chrome Running?

After starting Chrome, check if the debugging port is active:
```bash
curl -s http://localhost:9222/json | head -5
```

If you see JSON output with "webSocketDebuggerUrl", **it's working!** ✅

---

## Then Connect in Vision Site

1. Go to http://localhost:3000
2. Click "🔌 Connect to Chrome"
3. Start scanning!

---

## Still Having Issues?

Try this diagnostic:
```bash
# Check what browsers you have installed
ls /Applications/*.app | grep -iE 'chrome|chromium|brave|edge'

# Check if debugging port is in use
lsof -i :9222
```

Let me know what you find and I can help further!
