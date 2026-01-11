#!/bin/bash
# Single CDP Bridge startup with auto env configuration

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔗 CDP Bridge Startup${NC}"

cleanup() {
  pkill -f "node cdp-bridge" 2>/dev/null || true
  sleep 1
}

cleanup

PORT=${1:-9222}
BRIDGE_PORT=${2:-3001}

if ! lsof -i :$PORT &>/dev/null; then
  echo -e "${RED}✗${NC} No browser on port $PORT"
  exit 1
fi

echo -e "${GREEN}✓${NC} Browser detected on port $PORT"
echo "Starting bridge: port $BRIDGE_PORT → localhost:$PORT"

CHROME_HOST=localhost CHROME_PORT=$PORT BRIDGE_PORT=$BRIDGE_PORT npm run cdp-bridge &
sleep 2

if curl -s http://localhost:$BRIDGE_PORT/api/health &>/dev/null; then
  echo -e "${GREEN}✓${NC} Bridge ready on http://localhost:$BRIDGE_PORT"
  wait
else
  echo -e "${RED}✗${NC} Bridge failed"
  exit 1
fi
