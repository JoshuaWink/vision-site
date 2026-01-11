#!/bin/bash

# Browser Mode Switcher - Toggle between headless and headed Edge

MODE="${1:-headed}"  # Default to headed mode
PORT="${2:-9222}"

echo "🔄 Switching to $MODE mode..."

# Kill any existing Edge instances with remote debugging
echo "   Stopping current browser..."
pkill -f "Microsoft Edge.*remote-debugging-port" 2>/dev/null
sleep 2

# Start Edge based on mode
if [ "$MODE" = "headless" ]; then
    echo "   Starting Edge in HEADLESS mode (no window)..."
    /Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge \
        --headless \
        --remote-debugging-port=$PORT \
        --user-data-dir=/tmp/edge-headless \
        --disable-gpu \
        --no-first-run \
        --no-default-browser-check \
        > /dev/null 2>&1 &
    
    echo "✅ Headless browser started on port $PORT"
    echo "   Faster, less resources, but may trigger bot detection"
elif [ "$MODE" = "headed" ] || [ "$MODE" = "visible" ]; then
    echo "   Starting Edge in HEADED mode (visible window)..."
    /Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge \
        --remote-debugging-port=$PORT \
        --user-data-dir=/tmp/edge-cdp \
        --no-first-run \
        --no-default-browser-check \
        > /dev/null 2>&1 &
    
    echo "✅ Visible browser started on port $PORT"
    echo "   Real user session, better for logins and CAPTCHAs"
else
    echo "❌ Unknown mode: $MODE"
    echo "Usage: $0 [headless|headed] [port]"
    echo "Example: $0 headless 9222"
    exit 1
fi

echo ""
echo "⏳ Waiting for browser to initialize..."
sleep 3

# Test connection
if curl -s http://localhost:$PORT/json/version > /dev/null 2>&1; then
    echo "✅ Browser is ready!"
    echo ""
    echo "📋 Next steps:"
    echo "   node cdp-cli.js connect"
    echo "   node cdp-cli.js navigate https://example.com"
    echo "   node cdp-cli.js scan"
else
    echo "⚠️  Browser may still be starting (wait a few more seconds)"
fi
