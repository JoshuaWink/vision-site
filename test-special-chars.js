#!/usr/bin/env node

/**
 * Test vault with special characters in passwords
 * This tests that the vault can handle passwords with:
 * - Quotes (single and double)
 * - Backslashes
 * - Dollar signs
 * - Backticks
 * - Spaces
 * - Unicode characters
 */

import { VaultCLI, VaultAPI } from './vault/vault.js';
import { execSync } from 'child_process';

const testPasswords = [
  { name: 'simple', value: 'password123' },
  { name: 'with_quotes', value: 'pass"word\'123' },
  { name: 'with_backslash', value: 'pass\\word\\123' },
  { name: 'with_dollar', value: 'pass$word$123' },
  { name: 'with_backtick', value: 'pass`word`123' },
  { name: 'with_spaces', value: 'pass word 123' },
  { name: 'with_unicode', value: 'pāss🔐wörd123' },
  { name: 'complex', value: '!@#$%^&*()_+-=[]{}|;:",.<>?/~`\'' },
  { name: 'very_complex', value: '$password"with\'all`the\\special/chars!' }
];

async function testVault() {
  console.log('🧪 Testing Vault with Special Characters\n');
  
  // Test storing and retrieving special character passwords
  const vault = new VaultAPI();
  
  console.log('Testing storage and retrieval...\n');
  
  for (const test of testPasswords) {
    try {
      // Simulate storing via CLI by directly using vault functions
      const cli = new VaultCLI();
      
      // Store the test password
      await cli.set(`test_${test.name}`, test.value);
      
      // Retrieve it
      const retrieved = await vault.getCredential(`test_${test.name}`);
      
      // Verify it matches
      if (retrieved === test.value) {
        console.log(`✅ ${test.name}: PASS`);
      } else {
        console.log(`❌ ${test.name}: FAIL`);
        console.log(`   Expected: ${test.value}`);
        console.log(`   Got:      ${retrieved}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\n🎉 Testing complete!');
  console.log('\nTo clean up test credentials, run:');
  testPasswords.forEach(test => {
    console.log(`node vault/vault.js delete test_${test.name}`);
  });
}

// Check if vault is initialized
try {
  execSync('node vault/vault.js list', { stdio: 'pipe' });
  testVault().catch(console.error);
} catch (error) {
  console.log('❌ Vault not initialized yet.');
  console.log('Run: node vault/vault.js init');
  console.log('\nThen run this test again.');
}
