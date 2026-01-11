#!/usr/bin/env node

/**
 * Test Placeholder System
 * Validates placeholder resolution without actually logging in
 */

import { PlaceholderResolver } from '../vault/placeholder-resolver.js';
import { VaultAPI } from '../vault/vault.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testPlaceholderResolution() {
  console.log('🧪 Testing Placeholder System\n');
  
  const vault = new VaultAPI();
  const resolver = new PlaceholderResolver(vault);
  
  // Test 1: Simple vault placeholder
  console.log('Test 1: Simple Vault Placeholder');
  try {
    const testConfig = {
      email: "${{gmail_email}}"
    };
    
    const placeholders = resolver.extractPlaceholders(testConfig);
    console.log('  Placeholders found:', placeholders);
    
    const missing = await resolver.validateCredentials(testConfig);
    if (missing.length > 0) {
      console.log('  ⚠️  Missing credentials:', missing);
      console.log('  ℹ️  Add with: node vault/vault.js set gmail_email');
    } else {
      const resolved = await resolver.resolve(testConfig);
      console.log('  ✅ Resolved:', { email: resolved.email.substring(0, 3) + '***' });
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }
  
  // Test 2: Explicit vault syntax
  console.log('\nTest 2: Explicit Vault Syntax');
  try {
    const testConfig = {
      password: "${{vault:gmail_password}}"
    };
    
    const missing = await resolver.validateCredentials(testConfig);
    if (missing.length > 0) {
      console.log('  ⚠️  Missing credentials:', missing);
    } else {
      const resolved = await resolver.resolve(testConfig);
      console.log('  ✅ Resolved: [password hidden for security]');
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }
  
  // Test 3: Environment variable
  console.log('\nTest 3: Environment Variable');
  process.env.TEST_VAR = 'test_value_123';
  try {
    const testConfig = {
      apiKey: "${{env:TEST_VAR}}"
    };
    
    const resolved = await resolver.resolve(testConfig);
    console.log('  ✅ Resolved:', resolved);
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }
  
  // Test 4: Direct value
  console.log('\nTest 4: Direct Value');
  try {
    const testConfig = {
      rememberMe: "${{value:true}}",
      timeout: "${{value:5000}}"
    };
    
    const resolved = await resolver.resolve(testConfig);
    console.log('  ✅ Resolved:', resolved);
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }
  
  // Test 5: Mixed placeholders
  console.log('\nTest 5: Mixed Placeholders');
  try {
    const testConfig = {
      url: "${{value:https://example.com}}",
      apiKey: "${{env:TEST_VAR}}",
      username: "${{gmail_email}}",
      rememberMe: "${{value:false}}"
    };
    
    const placeholders = resolver.extractPlaceholders(testConfig);
    console.log('  Placeholders found:', placeholders);
    
    const missing = await resolver.validateCredentials(testConfig);
    if (missing.length > 0) {
      console.log('  ⚠️  Missing credentials:', missing);
    } else {
      const resolved = await resolver.resolve(testConfig);
      console.log('  ✅ Resolved:', {
        url: resolved.url,
        apiKey: resolved.apiKey,
        username: resolved.username.substring(0, 3) + '***',
        rememberMe: resolved.rememberMe
      });
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }
  
  // Test 6: Load actual config file
  console.log('\nTest 6: Validate Login Templates');
  try {
    const configPath = path.join(__dirname, '../configs/login-templates.json');
    const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    console.log('  Services available:', Object.keys(configs).join(', '));
    
    // Check Gmail config
    const gmailPlaceholders = resolver.extractPlaceholders(configs.gmail);
    console.log('  Gmail requires:', gmailPlaceholders);
    
    const missing = await resolver.validateCredentials(configs.gmail);
    if (missing.length > 0) {
      console.log('  ⚠️  To use Gmail automation, add these credentials:');
      missing.forEach(cred => {
        console.log(`      node vault/vault.js set ${cred}`);
      });
    } else {
      console.log('  ✅ Gmail credentials ready!');
    }
  } catch (error) {
    console.log('  ❌ Error:', error.message);
  }
  
  console.log('\n✨ Placeholder system test complete!\n');
}

testPlaceholderResolution().catch(console.error);
