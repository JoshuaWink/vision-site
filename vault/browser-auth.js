import { VaultAPI } from './vault.js';
import { PlaceholderResolver } from './placeholder-resolver.js';

/**
 * Browser Authentication Helper
 * Uses vault credentials without exposing them to logs or agent
 * Supports placeholder resolution: ${{credential_name}} or ${{vault:credential_name}}
 */
export class BrowserAuth {
  constructor(vaultPassword = null) {
    this.vault = new VaultAPI(vaultPassword);
    this.resolver = new PlaceholderResolver(this.vault);
  }
  
  /**
   * Fill login form using credentials from vault
   * @param {Object} cdpClient - Chrome DevTools Protocol client
   * @param {string} usernameKey - Vault key for username
   * @param {string} passwordKey - Vault key for password
   * @param {string} usernameSelector - CSS selector for username field
   * @param {string} passwordSelector - CSS selector for password field
   * @param {string} submitSelector - CSS selector for submit button
   */
  async fillLoginForm(cdpClient, {
    usernameKey,
    passwordKey,
    usernameSelector = 'input[type="email"]',
    passwordSelector = 'input[type="password"]',
    submitSelector = 'button[type="submit"]'
  }) {
    const { Runtime } = cdpClient;
    
    // Get credentials from vault
    const username = await this.vault.getCredential(usernameKey);
    const password = await this.vault.getCredential(passwordKey);
    
    // Fill username
    await Runtime.evaluate({
      expression: `
        (function() {
          const field = document.querySelector('${usernameSelector}');
          if (field) {
            field.value = ${JSON.stringify(username)};
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    
    // Wait a bit for any validation
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Fill password
    await Runtime.evaluate({
      expression: `
        (function() {
          const field = document.querySelector('${passwordSelector}');
          if (field) {
            field.value = ${JSON.stringify(password)};
            field.dispatchEvent(new Event('input', { bubbles: true }));
            field.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    
    // Wait before submit
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click submit
    await Runtime.evaluate({
      expression: `
        (function() {
          const button = document.querySelector('${submitSelector}');
          if (button) {
            button.click();
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    
    console.log('✅ Login form filled (credentials not logged)');
  }
  
  /**
   * Gmail-specific login
   */
  async loginToGmail(cdpClient, emailKey = 'gmail_email', passwordKey = 'gmail_password') {
    const { Runtime, Page } = cdpClient;
    
    // Navigate to Gmail
    await Page.navigate({ url: 'https://accounts.google.com/signin' });
    await Page.loadEventFired();
    
    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fill email
    const email = await this.vault.getCredential(emailKey);
    await Runtime.evaluate({
      expression: `
        (function() {
          const field = document.querySelector('input[type="email"]');
          if (field) {
            field.value = ${JSON.stringify(email)};
            field.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click Next
    await Runtime.evaluate({
      expression: `
        (function() {
          const button = document.querySelector('button[jsname="LgbsSe"]') || 
                        document.querySelector('#identifierNext button');
          if (button) {
            button.click();
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    
    // Wait for password page
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Fill password
    const password = await this.vault.getCredential(passwordKey);
    await Runtime.evaluate({
      expression: `
        (function() {
          const field = document.querySelector('input[type="password"]');
          if (field) {
            field.value = ${JSON.stringify(password)};
            field.dispatchEvent(new Event('input', { bubbles: true }));
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Click Next
    await Runtime.evaluate({
      expression: `
        (function() {
          const button = document.querySelector('button[jsname="LgbsSe"]') || 
                        document.querySelector('#passwordNext button');
          if (button) {
            button.click();
            return true;
          }
          return false;
        })()
      `,
      returnByValue: true
    });
    
    console.log('✅ Gmail login submitted (credentials not logged)');
    
    // Wait for login to complete
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  /**
   * Fill form using configuration object with placeholder resolution
   * @param {Object} cdpClient - CDP client
   * @param {Object} config - Configuration with placeholders
   * @example
   * await auth.fillFormWithConfig(client, {
   *   url: "https://example.com/login",
   *   fields: {
   *     username: { selector: "#email", value: "${{gmail_email}}" },
   *     password: { selector: "#pass", value: "${{gmail_password}}" }
   *   },
   *   submit: { selector: "button[type='submit']" }
   * });
   */
  async fillFormWithConfig(cdpClient, config) {
    const { Runtime, Page } = cdpClient;
    
    // Resolve all placeholders in config
    const resolved = await this.resolver.resolve(config);
    
    // Navigate if URL provided
    if (resolved.url) {
      await Page.navigate({ url: resolved.url });
      await new Promise(r => setTimeout(r, 2000));
    }
    
    // Fill fields
    if (resolved.fields) {
      for (const [fieldName, fieldConfig] of Object.entries(resolved.fields)) {
        const { selector, value } = fieldConfig;
        await Runtime.evaluate({
          expression: `
            (function() {
              const field = document.querySelector('${selector}');
              if (field) {
                field.value = \`${value}\`;
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('change', { bubbles: true }));
                return true;
              }
              return false;
            })()
          `
        });
        await new Promise(r => setTimeout(r, 500));
      }
    }
    
    // Click submit button
    if (resolved.submit && resolved.submit.selector) {
      await Runtime.evaluate({
        expression: `document.querySelector('${resolved.submit.selector}')?.click()`
      });
    }
    
    return resolved;
  }
  
  /**
   * Validate that all placeholders in a config can be resolved
   */
  async validateConfig(config) {
    return await this.resolver.validateCredentials(config);
  }
  
  /**
   * Generic login helper
   */
  async performLogin(cdpClient, site, usernameKey, passwordKey) {
    switch (site.toLowerCase()) {
      case 'gmail':
      case 'google':
        return await this.loginToGmail(cdpClient, usernameKey, passwordKey);
      default:
        throw new Error(`No predefined login flow for: ${site}`);
    }
  }
}

export default BrowserAuth;
