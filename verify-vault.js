#!/usr/bin/env node

/**
 * Verify vault credential storage and retrieval
 * Usage: node verify-vault.js <key> <expected-value>
 */

import { VaultAPI } from './vault/vault.js';

const [,, key, expectedValue] = process.argv;

if (!key) {
  console.log('Usage: node verify-vault.js <key> [expected-value]');
  console.log('');
  console.log('Examples:');
  console.log('  node verify-vault.js gmail_password');
  console.log('  node verify-vault.js test_key "expected value"');
  process.exit(1);
}

async function verify() {
  const vault = new VaultAPI();
  
  try {
    // Get the credential
    const value = await vault.getCredential(key);
    
    if (expectedValue !== undefined) {
      // Verify it matches expected
      if (value === expectedValue) {
        console.log(`✅ PASS: "${key}" matches expected value`);
        console.log(`   Value: ${value}`);
        process.exit(0);
      } else {
        console.log(`❌ FAIL: "${key}" does not match`);
        console.log(`   Expected: ${expectedValue}`);
        console.log(`   Got:      ${value}`);
        console.log(`   Length - Expected: ${expectedValue.length}, Got: ${value.length}`);
        process.exit(1);
      }
    } else {
      // Just display the value
      console.log(`🔑 Credential: ${key}`);
      console.log(`📝 Value: ${value}`);
      console.log(`📏 Length: ${value.length} characters`);
      console.log(`🔤 Type: ${typeof value}`);
      
      // Show hex dump for debugging special characters
      console.log(`🔍 Hex: ${Buffer.from(value).toString('hex')}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

verify();
