#!/usr/bin/env node

/**
 * Generic Login Script
 * 
 * Use this template for logging into any website with vault credentials
 */

import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

async function genericLogin(config) {
  const {
    url,
    usernameKey,
    passwordKey,
    usernameSelector = 'input[type="email"], input[name="username"], input[id="username"]',
    passwordSelector = 'input[type="password"]',
    submitSelector = 'button[type="submit"], input[type="submit"]',
    successUrl = null
  } = config;
  
  console.log(`🌐 Auto-Login to ${url}\n`);
  
  const auth = new BrowserAuth();
  let client;
  
  try {
    // Connect to browser
    console.log('🔌 Connecting to browser...');
    client = await CDP({ port: 9222 });
    
    const { Page, Runtime, DOM } = client;
    await Page.enable();
    await Runtime.enable();
    await DOM.enable();
    
    console.log('✅ Connected\n');
    
    // Navigate
    console.log(`🌐 Navigating to ${url}...`);
    await Page.navigate({ url });
    await Page.loadEventFired();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Page loaded\n');
    
    // Login
    console.log('🔑 Filling login form with vault credentials...');
    await auth.fillLoginForm(client, {
      usernameKey,
      passwordKey,
      usernameSelector,
      passwordSelector,
      submitSelector
    });
    
    console.log('✅ Form submitted\n');
    
    // Wait and verify
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { result: { value: currentUrl } } = await Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    
    if (successUrl && currentUrl.includes(successUrl)) {
      console.log('🎉 Successfully logged in!');
    } else {
      console.log('⚠️  Login attempted, check browser');
    }
    
    console.log(`📍 Current URL: ${currentUrl}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Example configurations
const configs = {
  gmail: {
    url: 'https://accounts.google.com/signin',
    usernameKey: 'gmail_email',
    passwordKey: 'gmail_password',
    successUrl: 'mail.google.com'
  },
  github: {
    url: 'https://github.com/login',
    usernameKey: 'github_username',
    passwordKey: 'github_password',
    usernameSelector: 'input[name="login"]',
    passwordSelector: 'input[name="password"]',
    successUrl: 'github.com'
  },
  twitter: {
    url: 'https://twitter.com/i/flow/login',
    usernameKey: 'twitter_email',
    passwordKey: 'twitter_password',
    successUrl: 'twitter.com/home'
  }
};

// Get service from command line
const service = process.argv[2];

if (!service || !configs[service]) {
  console.log('Usage: node scripts/generic-login.js <service>');
  console.log('\nAvailable services:');
  Object.keys(configs).forEach(key => {
    console.log(`  - ${key}`);
  });
  console.log('\nExample:');
  console.log('  node scripts/generic-login.js gmail');
  process.exit(1);
}

genericLogin(configs[service]);
