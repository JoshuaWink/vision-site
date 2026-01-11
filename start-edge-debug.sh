#!/bin/bash

# Start Microsoft Edge with Remote Debugging for CDP
# Edge is Chromium-based and fully compatible with Chrome DevTools Protocol

echo "🚀 Starting Microsoft Edge with remote debugging..."
echo "   Port: 9222"
echo "   Profile: /tmp/edge-cdp (temporary)"
echo ""

# Kill any existing Edge instances on port 9222
if lsof -Pi :9222 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 9222 is already in use. Killing existing process..."
    kill $(lsof -t -i:9222) 2>/dev/null
    sleep 1
fi

# Start Edge with remote debugging
open -a "Microsoft Edge" --args \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/edge-cdp \
  --no-first-run \
  --no-default-browser-check

echo "⏳ Waiting for Edge to start..."
sleep 3

# Test connection
if curl -s http://localhost:9222/json/version > /dev/null 2>&1; then
    echo "✅ Edge debugging is active on port 9222!"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Navigate to any website in Edge"
    echo "   2. Go to http://localhost:3000 (vision-site)"
    echo "   3. Click '🔌 Connect to Chrome'"
    echo "   4. Click '🔍 Scan Chrome Tab'"
    echo ""
else
    echo "❌ Edge debugging port not responding yet"
    echo "   Wait a few more seconds and try connecting in vision-site"
    echo ""
fi

echo "💡 Tip: Edge works identically to Chrome for CDP!"
