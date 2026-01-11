#!/bin/bash

# Comprehensive vault test with verification

echo "🧪 Comprehensive Vault Test"
echo "============================"
echo ""

# Test case 1: Simple password
echo "Test 1: Simple password"
TEST_PASS="SimplePassword123"
echo "$TEST_PASS" | node vault/vault.js set test_simple >/dev/null 2>&1
RESULT=$(node vault/vault.js get test_simple 2>/dev/null)
if [ "$RESULT" = "$TEST_PASS" ]; then
  echo "✅ PASS: Simple password"
else
  echo "❌ FAIL: Expected '$TEST_PASS', got '$RESULT'"
fi

# Test case 2: Password with special characters
echo "Test 2: Special characters"
TEST_PASS='P@ss$word!123'
echo "$TEST_PASS" | node vault/vault.js set test_special >/dev/null 2>&1
RESULT=$(node vault/vault.js get test_special 2>/dev/null)
if [ "$RESULT" = "$TEST_PASS" ]; then
  echo "✅ PASS: Special characters"
else
  echo "❌ FAIL: Expected '$TEST_PASS', got '$RESULT'"
fi

# Test case 3: Password with quotes
echo "Test 3: Quotes"
TEST_PASS='Pass"word'"'"'123'
echo "$TEST_PASS" | node vault/vault.js set test_quotes >/dev/null 2>&1
RESULT=$(node vault/vault.js get test_quotes 2>/dev/null)
if [ "$RESULT" = "$TEST_PASS" ]; then
  echo "✅ PASS: Quotes"
else
  echo "❌ FAIL: Expected '$TEST_PASS', got '$RESULT'"
fi

# Test case 4: Password with spaces
echo "Test 4: Spaces"
TEST_PASS='Pass word 123'
echo "$TEST_PASS" | node vault/vault.js set test_spaces >/dev/null 2>&1
RESULT=$(node vault/vault.js get test_spaces 2>/dev/null)
if [ "$RESULT" = "$TEST_PASS" ]; then
  echo "✅ PASS: Spaces"
else
  echo "❌ FAIL: Expected '$TEST_PASS', got '$RESULT'"
fi

# Test case 5: Long password
echo "Test 5: Long password"
TEST_PASS='ThisIsAVeryLongPasswordWithManyCharactersIncludingSpecialOnes!@#$%^&*()_+-=[]{}|;:",.<>?/~'
echo "$TEST_PASS" | node vault/vault.js set test_long >/dev/null 2>&1
RESULT=$(node vault/vault.js get test_long 2>/dev/null)
if [ "$RESULT" = "$TEST_PASS" ]; then
  echo "✅ PASS: Long password"
else
  echo "❌ FAIL: Expected length ${#TEST_PASS}, got ${#RESULT}"
fi

echo ""
echo "🎉 Test complete!"
echo ""
echo "Cleanup:"
echo "  node vault/vault.js delete test_simple"
echo "  node vault/vault.js delete test_special"
echo "  node vault/vault.js delete test_quotes"
echo "  node vault/vault.js delete test_spaces"
echo "  node vault/vault.js delete test_long"
