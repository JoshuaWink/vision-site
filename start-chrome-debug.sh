#!/bin/bash

# Start Chrome with Remote Debugging for CDP
# This script finds Chrome and starts it with the debugging port enabled

echo "🔍 Looking for Chrome..."

# Try common macOS Chrome locations
CHROME_PATHS=(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Chrome.app/Contents/MacOS/Chrome"
  "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  "/Applications/Chromium.app/Contents/MacOS/Chromium"
)

CHROME_PATH=""
for path in "${CHROME_PATHS[@]}"; do
  if [ -f "$path" ]; then
    CHROME_PATH="$path"
    echo "✅ Found Chrome at: $path"
    break
  fi
done

if [ -z "$CHROME_PATH" ]; then
  echo "❌ Chrome not found in standard locations."
  echo ""
  echo "Please manually locate Chrome and run:"
  echo '  "/path/to/Google Chrome" --remote-debugging-port=9222 --user-data-dir=/tmp/chrome-cdp &'
  exit 1
fi

echo "🚀 Starting Chrome with remote debugging..."
echo "   Port: 9222"
echo "   Profile: /tmp/chrome-cdp (temporary)"
echo ""

# Start Chrome with remote debugging
"$CHROME_PATH" \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/chrome-cdp \
  > /dev/null 2>&1 &

CHROME_PID=$!

echo "✅ Chrome started! (PID: $CHROME_PID)"
echo ""
echo "📋 Next steps:"
echo "   1. Chrome should open automatically"
echo "   2. Navigate to any website"
echo "   3. Go to http://localhost:3000 (vision-site)"
echo "   4. Click '🔌 Connect to Chrome'"
echo ""
echo "To stop Chrome debugging session:"
echo "   kill $CHROME_PID"
