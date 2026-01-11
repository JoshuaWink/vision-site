#!/bin/bash

# Quick test script for special character passwords

echo "🧪 Testing Vault Special Character Support"
echo ""

# Test passwords with various special characters
TEST_CASES=(
  "simple:SimplePass123"
  "with_quotes:My\"Pass'word"
  "with_dollar:Pass\$word\$123"
  "with_backslash:Pass\\word\\123"
  "with_spaces:Pass word 123"
  "complex:!@#$%^&*()_+-="
)

echo "This will store and retrieve passwords with special characters."
echo "You'll be prompted to authenticate via Keychain for each operation."
echo ""
read -p "Press Enter to continue..."

for test_case in "${TEST_CASES[@]}"; do
  IFS=':' read -r name password <<< "$test_case"
  
  echo ""
  echo "Testing: $name"
  echo "Password: $password"
  echo ""
  
  # Store password
  echo "$password" | node vault/vault.js set "test_${name}" > /dev/null 2>&1
  
  # Retrieve password
  retrieved=$(node vault/vault.js get "test_${name}" 2>/dev/null)
  
  # Compare
  if [ "$retrieved" = "$password" ]; then
    echo "✅ PASS: Password stored and retrieved correctly"
  else
    echo "❌ FAIL: Mismatch!"
    echo "   Expected: $password"
    echo "   Got:      $retrieved"
  fi
done

echo ""
echo "🎉 Testing complete!"
echo ""
echo "To clean up test credentials:"
for test_case in "${TEST_CASES[@]}"; do
  IFS=':' read -r name _ <<< "$test_case"
  echo "  node vault/vault.js delete test_${name}"
done
