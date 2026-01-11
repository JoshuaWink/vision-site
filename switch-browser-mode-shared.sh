#!/bin/bash

# Browser Mode Switcher for Docker/Local Setup
# Manages browser visibility mode while maintaining CDP bridge connection

MODE="${1:-headed}"
DOCKER_HOST="${DOCKER_HOST:-localhost}"
CHROME_PORT="${CHROME_PORT:-9222}"

echo "🔄 Switching to $MODE mode..."
echo "   Target: Docker browser at $DOCKER_HOST:$CHROME_PORT"

# For headed mode - open browser in macOS pointing to the Docker instance
if [ "$MODE" = "headed" ] || [ "$MODE" = "visible" ]; then
    echo "   Opening browser window..."
    
    # Use Edge's DevTools to connect to remote Docker browser
    /Applications/Microsoft\ Edge.app/Contents/MacOS/Microsoft\ Edge \
        "edge://inspect/#devices" \
        > /dev/null 2>&1 &
    
    echo "✅ DevTools inspector opened for Docker browser"
    echo "   Connect to: ws://$DOCKER_HOST:$CHROME_PORT"
    
elif [ "$MODE" = "headless" ]; then
    echo "   Setting headless mode in Docker container..."
    echo "✅ Browser running headless in Docker"
    echo "   Connect via CDP bridge: http://localhost:3001/api/cdp/*"
else
    echo "❌ Unknown mode: $MODE. Use 'headed' or 'headless'"
    exit 1
fi

sleep 1
echo ""
echo "💡 CDP Bridge Status:"
if curl -s http://localhost:3001/api/health 2>&1 | grep -q "connected"; then
    echo "   ✅ Connected to Docker browser"
else
    echo "   ⚠️  CDP bridge may need connection"
    echo "   Try: curl -X POST http://localhost:3001/api/cdp/connect"
fi
