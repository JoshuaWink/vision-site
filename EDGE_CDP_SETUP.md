# 🎯 Quick CDP Setup (You Have Edge!)

You have **Microsoft Edge** installed, which works perfectly with CDP (it's Chromium-based).

## ✅ Simple 2-Step Setup

### Step 1: Start Edge with Debugging

**Open Terminal and run this:**
```bash
/Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/edge-cdp &
```

### Step 2: Test Connection

**You should see a new Edge window open.** Navigate to any website (like https://github.com).

**Then in vision-site (http://localhost:3000):**
1. Click "🔌 Connect to Chrome" (it works with Edge too!)
2. Click "🔍 Scan Chrome Tab"
3. See the elements detected!

---

## 🔍 Verify It's Working

Run this to check if the debugging port is active:
```bash
curl http://localhost:9222/json
```

You should see JSON output with browser tabs. If so, **you're ready to connect!**

---

## 💡 Alternative: Manual Method

1. **Quit Edge completely** (if it's open)
2. **Open Terminal**
3. **Run:**
   ```bash
   /Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge --remote-debugging-port=9222 &
   ```
4. **Wait 5 seconds** for Edge to fully start
5. **Test:** `curl http://localhost:9222/json`
6. **Connect in vision-site!**

---

## 🚨 Troubleshooting

### "Address already in use"
```bash
# Kill whatever is using port 9222
kill $(lsof -t -i:9222)
# Then restart Edge
```

### "curl: (7) Failed to connect"
- Edge might still be starting (wait 5-10 seconds)
- Or Edge didn't start with the flag (try quitting and restarting)

### "No tabs found" in vision-site
- Make sure Edge has at least one tab open
- Navigate to a real website (not about:blank)

---

## 📝 Ready to Test?

1. ✅ CDP Bridge: Running (port 3001)
2. ✅ Vision Site: Running (port 3000)  
3. ⏳ **Edge with CDP: Start it now!**

Once Edge is running with debugging, go to http://localhost:3000 and click "Connect to Chrome"!
