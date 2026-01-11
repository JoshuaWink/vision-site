#!/usr/bin/env node

import { VaultCLI, VaultAPI } from './vault/vault.js';

async function test() {
  console.log('Testing Vault with Keychain Integration\n');
  
  // Test 1: Initialize vault
  console.log('Test 1: Initialize vault');
  const cli = new VaultCLI();
  
  // Note: This will require manual password entry for initial test
  // Or use the CLI directly: node vault/vault.js init
  
  console.log('\n=== Run these commands to test: ===\n');
  console.log('1. Initialize: node vault/vault.js init');
  console.log('2. Store credential: node vault/vault.js set test_email user@example.com');
  console.log('3. List credentials: node vault/vault.js list');
  console.log('   ^-- This will trigger Touch ID prompt');
  console.log('4. Get credential: node vault/vault.js get test_email');
  console.log('   ^-- This will trigger Touch ID prompt again');
  console.log('\n=== Programmatic Test ===\n');
  
  // Test VaultAPI (will use Keychain automatically)
  const vault = new VaultAPI(); // No password needed - uses Keychain
  
  try {
    // This will trigger Touch ID
    const hasEmail = await vault.hasCredential('test_email');
    console.log('Has test_email:', hasEmail);
    
    if (hasEmail) {
      const email = await vault.getCredential('test_email');
      console.log('Retrieved:', email);
    }
  } catch (error) {
    console.log('Not ready yet:', error.message);
    console.log('\nRun the CLI commands above first!');
  }
}

test().catch(console.error);
