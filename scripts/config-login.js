#!/usr/bin/env node

/**
 * Config-Based Login Script
 * Uses login-templates.json with automatic placeholder resolution
 * 
 * Usage:
 *   node scripts/config-login.js gmail
 *   node scripts/config-login.js github
 *   node scripts/config-login.js custom --config path/to/config.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from '../vault/browser-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ConfigLogin {
  constructor() {
    this.auth = new BrowserAuth();
    this.cdpPort = 9222;
  }

  /**
   * Load login configuration
   */
  loadConfig(serviceName, customConfigPath = null) {
    const configPath = customConfigPath || 
      path.join(__dirname, '../configs/login-templates.json');
    
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found: ${configPath}`);
    }

    const configs = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!configs[serviceName]) {
      const available = Object.keys(configs).join(', ');
      throw new Error(
        `Service "${serviceName}" not found in config.\n` +
        `Available services: ${available}`
      );
    }

    return configs[serviceName];
  }

  /**
   * Validate required credentials exist in vault
   */
  async validateCredentials(config) {
    console.error('🔍 Validating credentials...');
    const missing = await this.auth.validateConfig(config);
    
    if (missing.length > 0) {
      throw new Error(
        `Missing credentials in vault:\n  ${missing.join('\n  ')}\n\n` +
        `Add them with: node vault/vault.js set <credential_name>`
      );
    }
    
    console.error('✅ All credentials available');
  }

  /**
   * Execute login using config with "fields" format
   */
  async executeFieldsLogin(client, config) {
    const { Page, Runtime } = client;
    
    // Navigate to login page
    console.error(`🌐 Navigating to ${config.url}...`);
    await Page.navigate({ url: config.url });
    await new Promise(r => setTimeout(r, 2000));

    // Use BrowserAuth's new method
    await this.auth.fillFormWithConfig(client, config);
    
    // Wait for redirect
    await new Promise(r => setTimeout(r, 3000));
    
    // Verify success
    if (config.success) {
      const { result } = await Runtime.evaluate({
        expression: 'window.location.href'
      });
      const currentUrl = result.value;
      
      if (config.success.urlContains && !currentUrl.includes(config.success.urlContains)) {
        throw new Error(`Login verification failed: URL doesn't contain "${config.success.urlContains}"`);
      }
      
      if (config.success.notContains && currentUrl.includes(config.success.notContains)) {
        throw new Error(`Login verification failed: URL still contains "${config.success.notContains}"`);
      }
      
      console.error('✅ Login successful!');
      console.error(`📍 Current URL: ${currentUrl}`);
    }
  }

  /**
   * Execute login using config with "steps" format
   */
  async executeStepsLogin(client, config) {
    const { Page, Runtime } = client;
    
    // Resolve placeholders in entire config first
    const resolved = await this.auth.resolver.resolve(config);
    
    // Navigate to login page
    console.error(`🌐 Navigating to ${resolved.url}...`);
    await Page.navigate({ url: resolved.url });
    await new Promise(r => setTimeout(r, 2000));

    // Execute each step
    for (const [index, step] of resolved.steps.entries()) {
      console.error(`⚡ Step ${index + 1}: ${step.type} ${step.selector || ''}`);
      
      if (step.type === 'fill') {
        await Runtime.evaluate({
          expression: `
            (function() {
              const el = document.querySelector('${step.selector}');
              if (el) {
                el.value = \`${step.value}\`;
                el.dispatchEvent(new Event('input', { bubbles: true }));
                el.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })()
          `
        });
      } else if (step.type === 'click') {
        await Runtime.evaluate({
          expression: `document.querySelector('${step.selector}')?.click()`
        });
      }
      
      if (step.wait) {
        await new Promise(r => setTimeout(r, step.wait));
      }
    }

    // Verify success
    if (resolved.success) {
      const { result } = await Runtime.evaluate({
        expression: 'window.location.href'
      });
      const currentUrl = result.value;
      
      if (resolved.success.urlContains && !currentUrl.includes(resolved.success.urlContains)) {
        throw new Error(`Login verification failed: URL doesn't contain "${resolved.success.urlContains}"`);
      }
      
      console.error('✅ Login successful!');
      console.error(`📍 Current URL: ${currentUrl}`);
    }
  }

  /**
   * Main login execution
   */
  async login(serviceName, customConfigPath = null) {
    let client;
    
    try {
      // Load and validate configuration
      console.error(`📋 Loading configuration for: ${serviceName}`);
      const config = this.loadConfig(serviceName, customConfigPath);
      console.error(`   ${config.name}`);
      
      await this.validateCredentials(config);
      
      // Connect to CDP
      console.error(`🔌 Connecting to browser on port ${this.cdpPort}...`);
      client = await CDP({ port: this.cdpPort });
      const { Page, Runtime } = client;
      await Page.enable();
      await Runtime.enable();
      console.error('✅ Connected to browser');
      
      // Execute login based on config format
      if (config.fields) {
        await this.executeFieldsLogin(client, config);
      } else if (config.steps) {
        await this.executeStepsLogin(client, config);
      } else {
        throw new Error('Invalid config format: must have "fields" or "steps"');
      }
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      process.exit(1);
    } finally {
      if (client) {
        await client.close();
      }
    }
  }
}

// CLI Entry Point
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/config-login.js <service-name> [--config path/to/config.json]');
  console.error('');
  console.error('Available services in default config:');
  console.error('  gmail, github, twitter, linkedin, facebook, instagram, reddit');
  console.error('');
  console.error('Examples:');
  console.error('  node scripts/config-login.js gmail');
  console.error('  node scripts/config-login.js github');
  console.error('  node scripts/config-login.js custom --config ./my-site-config.json');
  process.exit(1);
}

const serviceName = args[0];
const configIndex = args.indexOf('--config');
const customConfig = configIndex !== -1 ? args[configIndex + 1] : null;

const configLogin = new ConfigLogin();
await configLogin.login(serviceName, customConfig);
