#!/bin/bash

# CDP Bridge Automation Example - eBay Product Search
# This demonstrates the clean interface without JSON escaping issues

set -e

BRIDGE_URL="${BRIDGE_URL:-http://localhost:3001}"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}=== eBay Product Search Automation ===${NC}\n"

# 1. Navigate to eBay
echo "1. Navigating to eBay..."
curl -s -X POST "$BRIDGE_URL/api/cdp/navigate" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://ebay.com"}' > /dev/null
echo -e "${GREEN}✓ Navigated${NC}\n"

# 2. Scan for elements
echo "2. Scanning page for interactive elements..."
ELEMENTS=$(curl -s -X POST "$BRIDGE_URL/api/cdp/scan")
ELEMENT_COUNT=$(echo "$ELEMENTS" | jq '.elements | length')
echo -e "${GREEN}✓ Found $ELEMENT_COUNT interactive elements${NC}\n"

# 3. Find the search input and submit button
echo "3. Finding search input and button..."
SEARCH_INPUT=$(echo "$ELEMENTS" | jq '.elements[] | select(.tag == "input" and .type == "text") | .id' | head -1)
SEARCH_BUTTON=$(echo "$ELEMENTS" | jq '.elements[] | select(.tag == "button" and .text | contains("Search")) | .id' | head -1)
echo -e "   Search input: element #$SEARCH_INPUT"
echo -e "   Search button: element #$SEARCH_BUTTON${NC}\n"

# 4. Fill search box - NO ESCAPING NEEDED!
SEARCH_TERM="macbook pro 14"
echo "4. Filling search box with: \"$SEARCH_TERM\""
FILL_RESULT=$(curl -s -X POST "$BRIDGE_URL/api/cdp/fill" \
  -H "Content-Type: application/json" \
  -d "{\"elementId\":$SEARCH_INPUT,\"value\":\"$SEARCH_TERM\"}")
echo -e "${GREEN}✓ $(echo "$FILL_RESULT" | jq -r '.filled')${NC}\n"

# 5. Click search button
echo "5. Clicking search button..."
curl -s -X POST "$BRIDGE_URL/api/cdp/click" \
  -H "Content-Type: application/json" \
  -d "{\"elementId\":$SEARCH_BUTTON}" > /dev/null
echo -e "${GREEN}✓ Clicked${NC}\n"

# 6. Wait for results
echo "6. Waiting for search results to load..."
sleep 2

# 7. Get page info
echo "7. Getting updated page info..."
PAGE_INFO=$(curl -s "$BRIDGE_URL/api/cdp/page-info")
TITLE=$(echo "$PAGE_INFO" | jq -r '.title')
URL=$(echo "$PAGE_INFO" | jq -r '.url')
echo -e "   Title: $TITLE"
echo -e "   URL: $URL${NC}\n"

# 8. Extract product data using JavaScript
echo "8. Extracting product listings..."
PRODUCTS=$(curl -s -X POST "$BRIDGE_URL/api/cdp/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Array.from(document.querySelectorAll('"'"'[data-component-type=\"s-search-result\"]'"'"')).slice(0, 5).map(el => ({ title: el.querySelector('"'"'span'"'"')?.textContent }))"
  }')
echo -e "$PRODUCTS" | jq '.result[]' 2>/dev/null || echo "   (Product extraction requires specific selectors)"

echo -e "\n${GREEN}✓ Automation complete!${NC}"
echo -e "   No JSON escaping issues - all arguments passed as clean literals\n"
