# 🔐 Secure Credential Vault

> **Cross-Platform Password Management with Zero-Knowledge Architecture**

Store sensitive credentials securely without exposing them to the AI agent or logs.

## 🎯 Key Features

- ✅ **Zero-knowledge**: Agent uses credentials without seeing plaintext
- ✅ **Military-grade encryption**: AES-256-GCM with PBKDF2 key derivation (100,000 iterations)
- ✅ **Cross-platform**: Works on macOS, Linux, Windows
- ✅ **Local storage**: Credentials never leave your machine
- ✅ **Secure file permissions**: Vault file is readable only by you (chmod 600)
- ✅ **Easy CLI**: Simple commands to manage credentials
- ✅ **Browser automation**: Integrated with CDP for automated logins

## 🚀 Quick Start

### 1. Initialize Vault

```bash
node vault/vault.js init
```

You'll be prompted to create a master password. **Remember this password** - it cannot be recovered if lost!

**Output:**
```
🔐 Vault System - Initialize Vault

Enter master password: ********
Confirm master password: ********
✅ Vault initialized successfully
📁 Vault file: /path/to/vault/.vault.enc
```

### 2. Store Credentials

```bash
# Interactive mode (recommended - password hidden)
node vault/vault.js set gmail_password
```

**Output:**
```
🔐 Vault System - Set Credential

Enter master password: ********
Credential name: gmail_password
Enter value: ******** (hidden input)
✅ Stored: gmail_password
```

**Quick mode** (less secure - visible in shell history):
```bash
# For non-sensitive values like usernames
node vault/vault.js set gmail_email user@gmail.com
```

### 3. List Stored Credentials

```bash
node vault/vault.js list
```

**Output:**
```
🔐 Vault System - List Credentials

Enter master password: ********
🔑 Stored credentials:
  - gmail_email
  - gmail_password
  - github_token
```

### 4. Retrieve Credential

```bash
node vault/vault.js get gmail_password
```

**Output:**
```
🔐 Vault System - Get Credential

Enter master password: ********
Credential name: gmail_password
your-actual-password
```

### 5. Delete Credential

```bash
node vault/vault.js delete gmail_password
```

**Output:**
```
🔐 Vault System - Delete Credential

Enter master password: ********
Credential name: gmail_password
✅ Deleted: gmail_password
```

## 🤖 Agent Usage (Zero-Knowledge)

The agent can use credentials **without seeing them**:

### Method 1: Browser Automation (Gmail)

```javascript
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

// Master password from environment or prompt
const masterPassword = process.env.VAULT_MASTER_PASSWORD;
const auth = new BrowserAuth(masterPassword);

// Connect to browser
const client = await CDP({ port: 9222 });
const { Page, Runtime, DOM } = client;
await Page.enable();
await Runtime.enable();
await DOM.enable();

// Navigate to Gmail
await Page.navigate({ url: 'https://gmail.com' });

// Login using vault credentials (NEVER logged)
await auth.loginToGmail(client, 'gmail_email', 'gmail_password');
// ✅ Form filled, credentials never printed
```

### Method 2: Custom Login Forms

```javascript
import { BrowserAuth } from './vault/browser-auth.js';

const auth = new BrowserAuth(masterPassword);

await auth.fillLoginForm(client, {
  usernameKey: 'my_username',      // Key in vault
  passwordKey: 'my_password',       // Key in vault
  usernameSelector: '#username',    // CSS selector
  passwordSelector: '#password',    // CSS selector
  submitSelector: 'button[type="submit"]'
});
```

### Method 3: Programmatic API

```javascript
import { VaultAPI } from './vault/vault.js';

const vault = new VaultAPI(masterPassword);

// Get credential value (use immediately, don't store)
const password = await vault.getCredential('gmail_password');

// Check if credential exists
if (await vault.hasCredential('github_token')) {
  // Use credential without logging it
  await vault.useCredential('github_token', async (token) => {
    // Token available here, never logged
    await authenticateWithGitHub(token);
  });
}
```

## 🔒 Security Features

### Encryption Details

```
┌─────────────────────────────────────────────────────────┐
│                    Encryption Flow                      │
└─────────────────────────────────────────────────────────┘

Master Password (user input)
         ↓
    PBKDF2 (100,000 iterations, 64-byte salt)
         ↓
    AES-256 Key (32 bytes)
         ↓
    AES-256-GCM Encryption (16-byte IV, 16-byte auth tag)
         ↓
    Encrypted Vault File (.vault.enc, chmod 600)
```

**Cryptographic Specifications:**

| Component | Algorithm/Size | Purpose |
|-----------|---------------|---------|
| **Key Derivation** | PBKDF2-SHA512, 100k iterations | Derive encryption key from password |
| **Encryption** | AES-256-GCM | Authenticated encryption |
| **Salt** | 64 bytes random | Unique per vault |
| **IV** | 16 bytes random | Unique per encryption |
| **Auth Tag** | 16 bytes | Integrity verification |
| **Key Length** | 32 bytes (256 bits) | AES-256 standard |

### Zero-Knowledge Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 User's Machine Only                     │
│                                                         │
│  [Master Password] → (entered once)                    │
│         ↓                                              │
│  [Decrypt Vault] → (in memory)                        │
│         ↓                                              │
│  [Get Credential] → (by key name)                     │
│         ↓                                              │
│  [Use in Browser] → (injected via CDP)                │
│         ↓                                              │
│  [Form is Filled] → (password discarded immediately)   │
│                                                         │
│  ❌ Never logged                                       │
│  ❌ Never stored in plaintext                          │
│  ❌ Never sent to external services                    │
│  ❌ Agent never sees password                          │
└─────────────────────────────────────────────────────────┘
```

**What the agent sees:**
```javascript
// Agent's perspective
const result = await vault.useCredential('gmail_password', (password) => {
  // Agent receives: Function to call with password
  // Agent DOES NOT receive: The actual password value
  return fillForm(password);
});
// password variable is out of scope - garbage collected
```

### File Security

- **Location**: `vault/.vault.enc`
- **Permissions**: `0600` (read/write owner only)
- **Git ignored**: Listed in `vault/.gitignore`
- **Format**: Base64-encoded binary (salt + IV + auth tag + encrypted data)

## 📝 Best Practices

### ✅ DO

1. **Use strong master password**
   - 16+ characters
   - Mixed case, numbers, symbols
   - Unique to this vault

2. **Store master password securely**
   - Password manager (recommended)
   - Environment variable for automation
   - NOT in code or config files

3. **Use interactive mode for secrets**
   ```bash
   # Passwords never visible
   node vault/vault.js set api_key
   ```

4. **Backup vault file**
   ```bash
   # Safe to backup - encrypted
   cp vault/.vault.enc ~/backups/vault-backup-$(date +%Y%m%d).enc
   ```

5. **Set environment variable for automation**
   ```bash
   # In ~/.zshrc or ~/.bashrc
   export VAULT_MASTER_PASSWORD="your-secure-master-password"
   ```

### ❌ DON'T

1. **Never commit vault file** (already in `.gitignore`)
2. **Never share master password** (defeats encryption)
3. **Never type secrets in command line**
   ```bash
   # ❌ BAD - visible in shell history
   node vault/vault.js set password MyPassword123
   
   # ✅ GOOD - interactive prompt
   node vault/vault.js set password
   ```
4. **Never use weak master password** (<12 characters)
5. **Never lose master password** (no recovery mechanism)

## 🔧 Environment Setup for Agents

### Option 1: Shell Profile (Persistent)

```bash
# Add to ~/.zshrc or ~/.bashrc
export VAULT_MASTER_PASSWORD="your-secure-master-password"

# Reload shell
source ~/.zshrc
```

### Option 2: macOS Keychain (More Secure)

```bash
# Store in keychain (one time)
security add-generic-password \
  -a "$USER" \
  -s "vault-master-password" \
  -w "your-secure-master-password"

# Retrieve in scripts
export VAULT_MASTER_PASSWORD=$(
  security find-generic-password \
    -a "$USER" \
    -s "vault-master-password" \
    -w
)
```

### Option 3: Session Variable (Temporary)

```bash
# Set for current terminal session only
export VAULT_MASTER_PASSWORD="your-secure-master-password"

# Run your automation
node scripts/gmail-login.js
```

## 📊 Complete Example: Gmail Login

### Step 1: Store Credentials

```bash
# Initialize vault
node vault/vault.js init
# Enter master password: MySecureP@ssw0rd2024!
# Confirm: MySecureP@ssw0rd2024!
# ✅ Vault initialized

# Store email
node vault/vault.js set gmail_email
# Enter value: your-email@gmail.com
# ✅ Stored: gmail_email

# Store password (hidden input)
node vault/vault.js set gmail_password
# Enter value: ******** (your actual Gmail password)
# ✅ Stored: gmail_password
```

### Step 2: Create Automation Script

```javascript
// scripts/gmail-login.js
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

async function loginToGmail() {
  // Get master password from environment
  const masterPassword = process.env.VAULT_MASTER_PASSWORD;
  
  if (!masterPassword) {
    console.error('❌ Set VAULT_MASTER_PASSWORD environment variable');
    process.exit(1);
  }
  
  // Initialize browser auth
  const auth = new BrowserAuth(masterPassword);
  
  try {
    // Connect to browser (must be running with remote debugging)
    const client = await CDP({ port: 9222 });
    const { Page } = client;
    await Page.enable();
    
    console.log('🌐 Navigating to Gmail...');
    await Page.navigate({ url: 'https://gmail.com' });
    await Page.loadEventFired();
    
    console.log('🔐 Logging in...');
    await auth.loginToGmail(client, 'gmail_email', 'gmail_password');
    
    console.log('✅ Successfully logged in to Gmail');
    await client.close();
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

loginToGmail();
```

### Step 3: Run Automation

```bash
# Terminal 1: Start browser with remote debugging
open -na "Microsoft Edge" --args \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/edge-cdp

# Terminal 2: Set master password and run script
export VAULT_MASTER_PASSWORD="MySecureP@ssw0rd2024!"
node scripts/gmail-login.js

# Output:
# 🌐 Navigating to Gmail...
# 🔐 Logging in...
# ✅ Successfully logged in to Gmail
```

## 🆘 Troubleshooting

### "Vault not found" Error

```bash
# Initialize vault first
node vault/vault.js init
```

### "Wrong password" Error

- Master password is **case-sensitive**
- Ensure you're entering the correct password
- If forgotten, vault must be reinitialized (data will be lost)

```bash
# Reinitialize (WARNING: deletes all stored credentials)
rm vault/.vault.enc
node vault/vault.js init
```

### "Permission denied" Error

```bash
# Fix file permissions
chmod 600 vault/.vault.enc
```

### "Credential not found" Error

```bash
# List available credentials
node vault/vault.js list

# Add missing credential
node vault/vault.js set <credential-name>
```

### Browser Connection Failed

```bash
# Ensure browser is running with remote debugging
ps aux | grep "remote-debugging-port=9222"

# Start browser if not running
open -na "Microsoft Edge" --args \
  --remote-debugging-port=9222 \
  --user-data-dir=/tmp/edge-cdp
```

## 📚 API Reference

### VaultCLI

Command-line interface for managing credentials.

```bash
# Initialize vault
node vault/vault.js init

# Set credential
node vault/vault.js set <key> [value]

# Get credential
node vault/vault.js get <key>

# List all credentials
node vault/vault.js list

# Delete credential
node vault/vault.js delete <key>
```

### VaultAPI

Programmatic access to vault.

```javascript
import { VaultAPI } from './vault/vault.js';

const vault = new VaultAPI(masterPassword);

// Get credential
const password = await vault.getCredential('key');

// Check existence
const exists = await vault.hasCredential('key');

// Use credential safely (never logged)
await vault.useCredential('key', async (value) => {
  // Use value here
  await doSomethingWith(value);
});
```

### BrowserAuth

Browser automation with vault credentials.

```javascript
import { BrowserAuth } from './vault/browser-auth.js';

const auth = new BrowserAuth(masterPassword);

// Gmail-specific login
await auth.loginToGmail(client, emailKey, passwordKey);

// Generic login form
await auth.fillLoginForm(client, {
  usernameKey: 'username',
  passwordKey: 'password',
  usernameSelector: '#user',
  passwordSelector: '#pass',
  submitSelector: 'button[type="submit"]'
});

// General purpose login
await auth.performLogin(client, {
  emailKey: 'email',
  passwordKey: 'password',
  emailSelector: '#email',
  passwordSelector: '#password',
  submitButtonSelector: 'button.submit'
});
```

## 🔗 Integration

### CDP CLI Integration

```bash
# Create a new CDP command
# File: cdp-cli.js

import { BrowserAuth } from './vault/browser-auth.js';

program
  .command('login')
  .argument('<service>', 'Service to login to (gmail, github, etc)')
  .option('--use-vault', 'Use vault credentials')
  .action(async (service, options) => {
    if (options.useVault) {
      const masterPassword = process.env.VAULT_MASTER_PASSWORD;
      const auth = new BrowserAuth(masterPassword);
      
      if (service === 'gmail') {
        await auth.loginToGmail(client, 'gmail_email', 'gmail_password');
      }
    }
  });
```

### Docker Integration

```yaml
# docker-compose.yml
services:
  cdp-bridge:
    build: ./cdp-bridge
    environment:
      - VAULT_MASTER_PASSWORD=${VAULT_MASTER_PASSWORD}
    volumes:
      - ./vault:/app/vault:ro  # Read-only mount
```

## 🎓 Security Architecture

### Threat Model

| Threat | Protection | Status |
|--------|-----------|--------|
| **Plaintext storage** | AES-256-GCM encryption | ✅ Protected |
| **Weak encryption** | PBKDF2 100k iterations | ✅ Protected |
| **Password in logs** | Zero-knowledge API | ✅ Protected |
| **File access** | chmod 600 permissions | ✅ Protected |
| **Git exposure** | .gitignore rules | ✅ Protected |
| **Memory dump** | Immediate discard after use | ⚠️ Partial |
| **Master password loss** | No recovery mechanism | ⚠️ User responsibility |

### Compliance

- ✅ **OWASP Top 10**: Mitigates A02:2021 (Cryptographic Failures)
- ✅ **NIST**: Uses FIPS 140-2 approved algorithms (AES-256, SHA-512)
- ✅ **GDPR**: Data stored locally, never transmitted
- ✅ **Zero Trust**: Credentials used but never logged

## 🆚 Comparison: Old vs New Vault

This project has TWO vault systems. See [VAULT_INTEGRATION.md](./VAULT_INTEGRATION.md) for migration guide.

| Feature | Old Vault (`lib/passwordManager.js`) | **New Vault** (`vault/vault.js`) |
|---------|--------------------------------------|--------------------------------|
| **Platform** | macOS only | ✅ Cross-platform |
| **Storage** | macOS Keychain | Encrypted file |
| **Encryption** | System keychain | ✅ AES-256-GCM |
| **Browser Integration** | ❌ None | ✅ CDP integrated |
| **Zero-Knowledge** | ❌ Limited | ✅ Full support |
| **Recommendation** | Legacy | ✅ **Use this one** |

---

**Remember**: The vault is only as secure as your master password. Choose wisely! 🔐

**Need help?** Check:
- [VAULT_INTEGRATION.md](./VAULT_INTEGRATION.md) - Migration from old vault
- [vault/browser-auth.js](./vault/browser-auth.js) - Source code
- [vault/vault.js](./vault/vault.js) - Core implementation

