# 🔗 Vault Integration Guide

This project now has **TWO vault systems**:

## Systems Comparison

| Feature | **Original Vault** (`lib/passwordManager.js`) | **New Vault** (`vault/vault.js`) |
|---------|--------------------------------------|--------------------------------|
| **Storage** | macOS Keychain | Encrypted file (`.vault.enc`) |
| **Encryption** | System keychain | AES-256-GCM with master password |
| **Platform** | macOS only | Cross-platform |
| **CLI** | `bin/vault.js` | `node vault/vault.js` |
| **Use Case** | System-level credentials | Project-specific credentials |
| **Agent API** | `lib/credentialLoader.js` | `vault/browser-auth.js` |

## Recommendation: Use New Vault

The **new vault system** (`vault/vault.js`) is recommended for browser automation because:

✅ Cross-platform (works on macOS, Linux, Windows)  
✅ Zero-knowledge architecture (agent never sees passwords)  
✅ Integrated with CDP browser automation  
✅ Military-grade encryption (AES-256-GCM)  
✅ No system dependencies (doesn't require Keychain)

## Migration Path

If you have credentials in the old vault:

```bash
# 1. Export from old vault
node bin/vault.js get --service gmail --username user@gmail.com > temp.txt

# 2. Initialize new vault
node vault/vault.js init

# 3. Import to new vault
node vault/vault.js set gmail_password
# (paste password from temp.txt)

# 4. Securely delete temp file
shred -u temp.txt  # Linux
rm -P temp.txt     # macOS
```

## Browser Automation Workflow

### Step 1: Store Credentials

```bash
# Initialize vault (one time)
node vault/vault.js init
# Enter master password: ********

# Store Gmail credentials
node vault/vault.js set gmail_email
# Enter value: your-email@gmail.com

node vault/vault.js set gmail_password
# Enter value: ******** (hidden)
```

### Step 2: Use in Automation

Create a script to login to Gmail:

```javascript
// scripts/gmail-login.js
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';
import readline from 'readline';

async function getMasterPassword() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('Enter vault master password: ', (password) => {
      rl.close();
      resolve(password);
    });
  });
}

async function loginToGmail() {
  // Get master password (user enters once)
  const masterPassword = await getMasterPassword();
  
  // Initialize browser auth
  const auth = new BrowserAuth(masterPassword);
  
  // Connect to browser
  const client = await CDP({ port: 9222 });
  const { Page } = client;
  await Page.enable();
  
  // Navigate to Gmail
  await Page.navigate({ url: 'https://gmail.com' });
  await Page.loadEventFired();
  
  // Login using vault credentials (never logged)
  await auth.loginToGmail(client, 'gmail_email', 'gmail_password');
  
  console.log('✅ Logged in to Gmail');
  await client.close();
}

loginToGmail().catch(console.error);
```

### Step 3: Run Automation

```bash
# Start browser with remote debugging
open -na "Microsoft Edge" --args --remote-debugging-port=9222 --user-data-dir=/tmp/edge-cdp

# Run automation
node scripts/gmail-login.js
# Enter vault master password: ********
# ✅ Logged in to Gmail
```

## Agent Integration

For agent workflows, set the master password as an environment variable:

```bash
# In ~/.zshrc or ~/.bashrc
export VAULT_MASTER_PASSWORD="your-master-password"
```

Then agents can use credentials without prompting:

```javascript
import { BrowserAuth } from './vault/browser-auth.js';

const auth = new BrowserAuth(process.env.VAULT_MASTER_PASSWORD);
await auth.loginToGmail(client, 'gmail_email', 'gmail_password');
```

## Security Best Practices

### ✅ DO

1. **Use strong master password** (16+ characters, mixed case, numbers, symbols)
2. **Store master password in environment variable** for automation
3. **Use interactive CLI** for entering passwords (not command line arguments)
4. **Backup `.vault.enc` file** (it's encrypted, safe to backup)
5. **Use different master passwords** for different projects

### ❌ DON'T

1. **Don't commit `.vault.enc`** (already in `.gitignore`)
2. **Don't share master password** (defeats encryption)
3. **Don't type passwords in shell** (visible in history)
4. **Don't log credentials** (agent APIs prevent this)
5. **Don't lose master password** (no recovery mechanism)

## Quick Reference

### New Vault CLI

```bash
# Initialize
node vault/vault.js init

# Manage credentials
node vault/vault.js set <key>
node vault/vault.js get <key>
node vault/vault.js list
node vault/vault.js delete <key>
```

### Old Vault CLI

```bash
# Initialize
node bin/vault.js init

# Manage credentials
node bin/vault.js add -s <service> -u <username> -p <password>
node bin/vault.js get -s <service> -u <username>
node bin/vault.js list
node bin/vault.js delete -s <service> -u <username>
```

## Troubleshooting

### New Vault Issues

**"Vault not found"**
```bash
node vault/vault.js init
```

**"Wrong password"**
- Master password is case-sensitive
- No recovery if forgotten (reinitialize and re-add credentials)

**"Permission denied"**
```bash
chmod 600 vault/.vault.enc
```

### Old Vault Issues

**"Keychain access denied"**
```bash
security find-generic-password -s "vision-site-master-key"
```

**"Vault file corrupted"**
```bash
ls -la ~/.vision-site/
# Should show: drwx------ (0o700)
```

## Next Steps

1. ✅ Vault systems created
2. ⏭️ Test new vault CLI
3. ⏭️ Store Gmail credentials
4. ⏭️ Test browser authentication
5. ⏭️ Integrate with CDP CLI

See [VAULT_GUIDE.md](./VAULT_GUIDE.md) for detailed documentation.
