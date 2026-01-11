# 🔐 CDP Login with Vault - Complete Guide

## Overview

The vault integrates with your CDP browser automation system to enable **zero-knowledge credential usage**. The agent can fill login forms without ever seeing your passwords.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  YOUR MACHINE                                               │
│                                                             │
│  1. Vault (AES-256 encrypted)                              │
│     └─ gmail_email: user@gmail.com                         │
│     └─ gmail_password: ********                            │
│                                                             │
│  2. macOS Keychain (Touch ID)                              │
│     └─ Master Password (encrypted)                         │
│                                                             │
│  3. CDP Bridge (port 3001)                                 │
│     └─ REST API for browser control                        │
│                                                             │
│  4. Browser (Edge on port 9222)                            │
│     └─ Remote debugging enabled                            │
│                                                             │
│  5. BrowserAuth (vault/browser-auth.js)                    │
│     └─ Coordinates vault + CDP                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Store Your Credentials

```bash
# Store Gmail credentials
node vault/vault.js set gmail_email
# Enter: your-email@gmail.com

node vault/vault.js set gmail_password
# Enter: ******** (your password, hidden)
```

### 2. Start Browser with Remote Debugging

```bash
# Start Edge browser
npm run start-edge

# Or manually:
open -na "Microsoft Edge" --args \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/edge-cdp
```

### 3. Run Login Script

```bash
# Gmail login
node scripts/gmail-login.js

# Generic login for other services
node scripts/generic-login.js gmail
node scripts/generic-login.js github
```

**What happens:**
1. 👆 Touch ID prompts to unlock vault
2. Script connects to browser via CDP
3. Navigates to login page
4. Retrieves credentials from vault
5. Fills form (password never logged!)
6. Submits and verifies login

## Usage Patterns

### Pattern 1: Direct Script

Use the pre-built scripts:

```bash
# Gmail
node scripts/gmail-login.js

# Custom service
node scripts/generic-login.js <service-name>
```

### Pattern 2: Programmatic Usage

```javascript
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

async function autoLogin() {
  // Initialize (uses Keychain automatically)
  const auth = new BrowserAuth();
  
  // Connect to browser
  const client = await CDP({ port: 9222 });
  const { Page } = client;
  await Page.enable();
  
  // Navigate
  await Page.navigate({ url: 'https://example.com/login' });
  await Page.loadEventFired();
  
  // Login with vault credentials (Touch ID prompts once)
  await auth.fillLoginForm(client, {
    usernameKey: 'my_username',
    passwordKey: 'my_password',
    usernameSelector: '#email',
    passwordSelector: '#password',
    submitSelector: 'button.login'
  });
  
  console.log('✅ Logged in!');
  await client.close();
}

autoLogin();
```

### Pattern 3: Gmail-Specific Helper

```javascript
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

const auth = new BrowserAuth();
const client = await CDP({ port: 9222 });

// Gmail has special handling for multi-step auth
await auth.loginToGmail(client, 'gmail_email', 'gmail_password');
```

### Pattern 4: With CDP CLI

Integrate vault into your CDP CLI commands:

```bash
# Add to cdp-cli.js
node cdp-cli.js login gmail --use-vault
```

## Real-World Examples

### Example 1: Daily Gmail Check

```javascript
// scripts/check-gmail.js
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

async function checkGmail() {
  const auth = new BrowserAuth();
  const client = await CDP({ port: 9222 });
  const { Page, Runtime } = client;
  
  await Page.enable();
  await Runtime.enable();
  
  // Login
  await Page.navigate({ url: 'https://mail.google.com' });
  await Page.loadEventFired();
  await auth.loginToGmail(client, 'gmail_email', 'gmail_password');
  
  // Wait for inbox
  await new Promise(r => setTimeout(r, 5000));
  
  // Count unread
  const { result } = await Runtime.evaluate({
    expression: `
      document.querySelector('[aria-label*="unread"]')?.textContent || '0'
    `,
    returnByValue: true
  });
  
  console.log(`📧 Unread emails: ${result.value}`);
  
  await client.close();
}

checkGmail();
```

Run daily: `crontab -e` → `0 9 * * * cd /path/to/vision-site && node scripts/check-gmail.js`

### Example 2: Multi-Account Handling

```javascript
const accounts = [
  { name: 'Personal', email: 'gmail_email_personal', pass: 'gmail_password_personal' },
  { name: 'Work', email: 'gmail_email_work', pass: 'gmail_password_work' }
];

for (const account of accounts) {
  console.log(`Checking ${account.name}...`);
  await auth.loginToGmail(client, account.email, account.pass);
  // Do something...
  await logout();
}
```

### Example 3: Form Automation

```javascript
// Fill any web form with vault data
import { VaultAPI } from './vault/vault.js';

const vault = new VaultAPI();

await Runtime.evaluate({
  expression: `
    document.querySelector('#name').value = '${await vault.getCredential('full_name')}';
    document.querySelector('#email').value = '${await vault.getCredential('email')}';
    document.querySelector('#phone').value = '${await vault.getCredential('phone')}';
  `
});
```

## Advanced: CDP Bridge Integration

If you're using the CDP bridge (Docker container), you can expose vault to it:

### Option 1: Environment Variable

```yaml
# docker-compose.yml
services:
  cdp-bridge:
    environment:
      - VAULT_MASTER_PASSWORD=${VAULT_MASTER_PASSWORD}
```

```bash
export VAULT_MASTER_PASSWORD="your-master-password"
docker-compose up
```

### Option 2: Mount Vault

```yaml
services:
  cdp-bridge:
    volumes:
      - ./vault:/app/vault:ro
```

The bridge can then use vault credentials for automated browser operations.

## Security Considerations

### ✅ What's Secure

1. **Master password** in macOS Keychain (encrypted by system)
2. **Vault file** encrypted with AES-256-GCM
3. **Credentials never logged** - BrowserAuth prevents password exposure
4. **Touch ID authentication** - Biometric unlock for vault access
5. **Zero-knowledge execution** - Agent uses credentials without seeing them

### ⚠️ Important Notes

1. **Browser security**: The automated browser session is logged in - anyone with physical access to your machine can see it
2. **Environment variables**: If you set `VAULT_MASTER_PASSWORD`, it's visible to all processes
3. **Script execution**: Running scripts gives them vault access for the duration of the session
4. **2FA**: Two-factor authentication will require manual intervention

## Troubleshooting

### "Vault not found"

```bash
node vault/vault.js init
```

### "Credential not found"

```bash
# List what's stored
node vault/vault.js list

# Add missing credential
node vault/vault.js set gmail_email
```

### "Could not connect to browser"

```bash
# Check browser is running
curl http://localhost:9222/json

# Start browser if needed
npm run start-edge
```

### "Wrong password retrieved"

```bash
# Verify what's stored
node verify-vault.js gmail_password

# Re-store if corrupted
node vault/vault.js delete gmail_password
node vault/vault.js set gmail_password
```

### Touch ID keeps prompting

This is normal - macOS requires authentication to access Keychain items. To reduce prompts:

```bash
# Set environment variable for session
export VAULT_MASTER_PASSWORD="your-master-password"

# Or use keychain for longer cache
security set-keychain-settings -t 3600 ~/Library/Keychains/login.keychain-db
```

## Complete Workflow Example

```bash
# 1. Setup (one time)
node vault/vault.js init
node vault/vault.js set gmail_email your-email@gmail.com
node vault/vault.js set gmail_password

# 2. Start browser
npm run start-edge

# 3. Run automation
node scripts/gmail-login.js

# Output:
# 🌐 Gmail Auto-Login with Vault
# 🔐 Initializing vault authentication...
# 🔌 Connecting to browser on port 9222...
# ✅ Connected to browser
# 🌐 Navigating to Gmail...
# ✅ Gmail loaded
# 🔑 Logging in with vault credentials...
#    (Touch ID will prompt to unlock vault)
# ✅ Login form filled and submitted
# ⏳ Waiting for authentication...
# 🎉 Successfully logged in to Gmail!
# 📍 Current URL: https://mail.google.com/mail/u/0/#inbox
```

## Next Steps

1. **Store more credentials**: `node vault/vault.js set github_token`
2. **Create custom scripts**: Copy and modify `scripts/generic-login.js`
3. **Integrate with CI/CD**: Use environment variables for automated workflows
4. **Add CDP CLI commands**: Extend `cdp-cli.js` with vault-powered commands

---

**Your CDP system now has secure, automated login capabilities powered by the vault!** 🎉
