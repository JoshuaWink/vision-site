#!/bin/bash
# Multi-bridge CDP startup for concurrent browsers
# Usage: ./start-bridges.sh 9222 9223 9224

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔗 Multi-Bridge CDP Startup${NC}"

cleanup() {
  pkill -f "node cdp-bridge" 2>/dev/null || true
  sleep 1
}

trap cleanup EXIT
cleanup

PORTS=${@:-9222}
BRIDGE_PORT=3001
ID=1

for port in $PORTS; do
  if lsof -i :$port &>/dev/null; then
    echo -e "${YELLOW}→${NC} Bridge $ID: port $((BRIDGE_PORT + ID - 1)) → localhost:$port"
    CHROME_HOST=localhost CHROME_PORT=$port BRIDGE_PORT=$((BRIDGE_PORT + ID - 1)) npm run cdp-bridge &
    sleep 2
    ((ID++))
  fi
done

echo -e "${GREEN}✓${NC} All bridges running"
wait
