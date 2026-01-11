#!/bin/bash

# CDP Bridge CLI - Clean interface for browser automation
# Usage:
#   ./cdp.sh health
#   ./cdp.sh navigate <url>
#   ./cdp.sh page-info
#   ./cdp.sh screenshot [output-file]
#   ./cdp.sh scan
#   ./cdp.sh click <elementId>
#   ./cdp.sh fill <elementId> <value>
#   ./cdp.sh execute <javascript>

set -e

BRIDGE_URL="${BRIDGE_URL:-http://localhost:3001}"
COMMAND="${1:-help}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error() {
  echo -e "${RED}✗ Error: $1${NC}" >&2
  exit 1
}

success() {
  echo -e "${GREEN}✓ $1${NC}"
}

info() {
  echo -e "${YELLOW}→ $1${NC}"
}

# Check if bridge is running
health_check() {
  if ! curl -s "$BRIDGE_URL/api/health" > /dev/null 2>&1; then
    error "Bridge not responding at $BRIDGE_URL. Start it with: ./manage.sh start"
  fi
}

case "$COMMAND" in
  health)
    health_check
    curl -s "$BRIDGE_URL/api/health" | jq .
    ;;

  navigate)
    [[ -z "$2" ]] && error "navigate requires URL argument"
    health_check
    info "Navigating to: $2"
    curl -s -X POST "$BRIDGE_URL/api/cdp/navigate" \
      -H "Content-Type: application/json" \
      -d "{\"url\":\"$2\"}" | jq .
    ;;

  page-info)
    health_check
    curl -s "$BRIDGE_URL/api/cdp/page-info" | jq .
    ;;

  screenshot)
    health_check
    OUTPUT="${2:-screenshot.png}"
    info "Taking screenshot..."
    curl -s "$BRIDGE_URL/api/cdp/screenshot" > "$OUTPUT"
    success "Screenshot saved to: $OUTPUT"
    ls -lh "$OUTPUT" | awk '{print $5, $9}'
    ;;

  scan)
    health_check
    info "Scanning page for interactive elements..."
    RESULT=$(curl -s -X POST "$BRIDGE_URL/api/cdp/scan" \
      -H "Content-Type: application/json")
    
    ELEMENT_COUNT=$(echo "$RESULT" | jq '.elements | length')
    
    if [[ "$ELEMENT_COUNT" -eq 0 ]]; then
      echo -e "${YELLOW}No interactive elements found${NC}"
      echo "$RESULT" | jq .
    else
      success "Found $ELEMENT_COUNT interactive elements:"
      echo "$RESULT" | jq '.elements[] | 
        "  [\(.id)] \(.tag)\(.type | if . then " (\(.))" else "" end) - \(.text // .href // .value // "")"' -r | head -20
      if [[ "$ELEMENT_COUNT" -gt 20 ]]; then
        echo "  ... and $((ELEMENT_COUNT - 20)) more"
      fi
    fi
    ;;

  click)
    [[ -z "$2" ]] && error "click requires elementId argument"
    health_check
    info "Clicking element #$2..."
    curl -s -X POST "$BRIDGE_URL/api/cdp/click" \
      -H "Content-Type: application/json" \
      -d "{\"elementId\":$2}" | jq .
    ;;

  fill)
    [[ -z "$2" ]] && error "fill requires elementId argument"
    [[ -z "$3" ]] && error "fill requires value argument"
    health_check
    info "Filling element #$2 with: $3"
    # Properly escape the value for JSON
    ESCAPED_VALUE=$(echo "$3" | jq -Rs .)
    curl -s -X POST "$BRIDGE_URL/api/cdp/fill" \
      -H "Content-Type: application/json" \
      -d "{\"elementId\":$2,\"value\":$ESCAPED_VALUE}" | jq .
    ;;

  execute)
    [[ -z "$2" ]] && error "execute requires JavaScript argument"
    health_check
    # Properly escape the script for JSON
    ESCAPED_SCRIPT=$(echo "$2" | jq -Rs .)
    curl -s -X POST "$BRIDGE_URL/api/cdp/execute" \
      -H "Content-Type: application/json" \
      -d "{\"script\":$ESCAPED_SCRIPT}" | jq .
    ;;

  *)
    cat << EOF
${GREEN}CDP Bridge CLI${NC} - Control browser automation via clean shell interface

${YELLOW}Usage:${NC}
  ./cdp.sh <command> [args]

${YELLOW}Commands:${NC}
  health              Check bridge connection status
  navigate <url>      Navigate to URL
  page-info          Get current page info (title, URL, dimensions)
  screenshot [file]  Take screenshot (default: screenshot.png)
  scan               Scan page for interactive elements
  click <id>         Click element by ID (from scan)
  fill <id> <value>  Fill form field by ID
  execute <js>       Execute JavaScript in browser

${YELLOW}Examples:${NC}
  ./cdp.sh scan
  ./cdp.sh click 3
  ./cdp.sh fill 5 "search term"
  ./cdp.sh execute "document.title"
  ./cdp.sh navigate "https://ebay.com"

${YELLOW}Environment:${NC}
  BRIDGE_URL - CDP bridge address (default: http://localhost:3001)

EOF
    ;;
esac
