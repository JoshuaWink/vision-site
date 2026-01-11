#!/usr/bin/env node

/**
 * Gmail Login with Vault Credentials
 * 
 * This script demonstrates how to:
 * 1. Connect to browser via CDP
 * 2. Navigate to Gmail
 * 3. Use vault credentials to login (zero-knowledge - agent never sees password)
 * 4. Verify successful login
 */

import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

async function loginToGmail() {
  console.log('🌐 Gmail Auto-Login with Vault\n');
  
  // Step 1: Initialize BrowserAuth (uses Keychain automatically)
  console.log('🔐 Initializing vault authentication...');
  const auth = new BrowserAuth(); // No password needed - uses Keychain!
  
  let client;
  
  try {
    // Step 2: Connect to browser
    console.log('🔌 Connecting to browser on port 9222...');
    client = await CDP({ port: 9222 });
    
    const { Page, Runtime, DOM } = client;
    
    // Enable CDP domains
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    console.log('✅ Connected to browser\n');
    
    // Step 3: Navigate to Gmail
    console.log('🌐 Navigating to Gmail...');
    await Page.navigate({ url: 'https://accounts.google.com/signin' });
    
    // Wait for page load
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Gmail loaded\n');
    
    // Step 4: Login using vault credentials
    console.log('🔑 Logging in with vault credentials...');
    console.log('   (Touch ID will prompt to unlock vault)');
    
    await auth.loginToGmail(client, 'gmail_email_default', 'gmail_password_default');
    
    console.log('✅ Login form filled and submitted\n');
    
    // Step 5: Wait for redirect
    console.log('⏳ Waiting for authentication...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check current URL
    const { result: { value: currentUrl } } = await Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    
    if (currentUrl.includes('mail.google.com') || currentUrl.includes('myaccount.google.com')) {
      console.log('🎉 Successfully logged in to Gmail!');
      console.log(`📍 Current URL: ${currentUrl}`);
    } else {
      console.log('⚠️  Login may have failed or requires 2FA');
      console.log(`📍 Current URL: ${currentUrl}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\n💡 Make sure:');
    console.error('   1. Browser is running: npm run start-edge');
    console.error('   2. Vault is initialized: node vault/vault.js init');
    console.error('   3. Credentials are stored:');
    console.error('      node vault/vault.js set gmail_email_default');
    console.error('      node vault/vault.js set gmail_password_default');
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Run it!
loginToGmail();
