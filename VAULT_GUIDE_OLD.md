# 🔐 Secure Password Vault Guide

Store sensitive credentials securely without exposing them to the AI agent or logs.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  User (You)                                             │
│  - Stores plaintext passwords ONLY in your terminal     │
│  - Never typed in code or config files                  │
└────────────┬────────────────────────────────────────────┘
             │
             ├──► 🔑 macOS Keychain (Master Key)
             │    └─ Secure system keystore
             │       Stored: `vision-site-master-key`
             │
             ├──► 🗄️ ~/.vision-site/.passwordvaulnitialize the Vault

```bash
node bin/vault.js init
```

This creates the master encryption key in macOS Keychain.

**Output:**
```
🔑 Initializing password vault...
✅ Vault initialized! Master key stored in mac│  User (You)                                             │
│  - Stores plaint
# Service name: gmail
# Username/email: your-email@gmail.com
# Password: (hidden)
```

Or with CLI options:
```bash
node bin/vault.js add --service github --username octocat --password "your-token"
```

**Security:**
- Passwords are **never echoed** during input
- Stored encrypted in `~/.vision-site/.passwordvault`
- Only the encrypted version is saved

### 3. List Stored Credentials

```bash
node bin/vault.js list
```

**Output:**
```
📋 Stored Credentials:

1. user@gmail.com@gmail
   Created: 2026-01-10T20:00:00.000Z
   Modified: 2026-01-10T20:00:00.000Z

2. octocat@github
   Created: 2026-01-10T20:05:00.000Z
   Modified: 2026-01-100:05:00.000Z
```

## Usage

### Option A: Load Credentials in Script

**Before running automation:**

```bash
# Load credentials as environment variables
node -e "
import('./lib/credentialLoader.js').then(async (m) => {
  await m.setupCredentials({
    GMAIL_PASSWORD: 'gmail:your-email@gmail.com',
    GITHUB_TOKEN: 'github:octocat'
  });
  console.log('✅ Credentials loaded');
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
"
```

### Option B: Retrieve Individu```

**Security:**
- Passwords are **never echoed** `bash
node bin/vault.js env gmail your-email@gmail.com
# Output: (plaintext password - use immediately, don't store)
```

### Option C: Use in Agent Workflow

When the agent needs Gmail credentials:

```javascript
import { setupCredentials } from './lib/credentialLoader.js';

// Load credentials before agent runs
await setupCredentials({
  GMAIL_PASSWORD: 'gmail:your-email@gmail.com'
});

// Now process.env.GMAIL_PASSWORD is available
// Agent receives env var, never sees plaintext
```

## Security Features

### 🔐 Encryption

- **Algorit
```bash
# Load cralois/Counter Mode)
- **Master Key:** Stored in macOS Keychain (never on disk)
- **Per-Password:** Unique IV and authentication tag

### 🛡️ Protection

- **No Plaintext Storage:** Encrypted at rest
- **No Agent Access:** Agent gets env vars, not plaintext
- **No Log Exposure:** Passwords never printed to logs
- **Keychain Integration:** Protected by macOS security

### ✅ Validation

- Encrypted data is authenticated (prevents tampering)
- Corrupted vault recovers gracefully
- Keychain access errors are handled

## File Locations

| File | Purpose | Permissions |
|------|---------|-------------|
| `~/.vision-site/.passwordvault` | Encrypted credential store | 
/ead/write owner only) |
| macOS Keychain | Master encryption key | Protected by system keychain |

## Commands Reference

```bash
# Initialize vault
node bin/vault.js init

# Add credentials
node bin/vault.js add
node bin/vault.js add -s gmail -u user@gmail.com -p "password"

# List credentials
node bin/vault.js list

# Get password (outputs plaintext, use carefully)
node bin/vault.js get gmail user@gmail.com
node bin/vault.js env gmail user@gmail.com

# Delete credential
node bin/vault.js delete gma- **No Agent Access:** Agent gets env vars, GEROUS)
node bin/vault.js clear
```

## Workflow: Gmail Login with Agent

```bash
# 1. Store Gmail password
node bin/vault.js add --service gmail --username your-email@gmail.com

# 2. Create automation script
cat > gmail-automation.js << 'JS'
import { setupCredentials } from './lib/credentialLoader.js';
import { agentFunction } from './agent.js';

// Load password as env var (agent never sees plaintext)
await setupCredentials({
  GMAIL_PASSWORD: 'gmail:your-email@gmail.com'
});

// Run agent (it receives env var only)
await agentFunction();
JS

# 3. Run automation
node gmail-automation.js
```

## Troubleshooting

###
# Addhain access denied"
```bash
# Verify Keychain is accessible
security find-generic-password -s "vision-site-master-key"
```

### "Vault file corrupted"
```bash
# Vault auto-recovers; check permissions
ls -la ~/.vision-site/
# Should show: drwx------ (0o700)
```

### "Password not found"
```bash
# List all stored credentials
node bin/vault.js list

# Check service/username match
node bin/vault.js get SERVICE USERNAME
```

## Best Practices

✅ **DO:**
- Store passwords in vault before running automation
- Use `setupCredentials()` to load before agent runs
- Keep Keychain locked when not using vault
- Review stored credentials periodically

❌ **DON'T:**
- Never commit passwords to Git
- Never print env vars in logs
- Never pass plaintext to agent
- Never share vault files

## Privacy & Security

- The AI agent **never sees plaintext passwords**
- Passwords are encrypted with your master key
- Master key is stored in macOS Keychain (system-protected)
- Vault file is encrypted and only readable by the master key owner
- All communication security find-generic-passwordI Reference

### `credentialLoader.js`

```javascript
// Load credentials from vault
const creds = await loadCredentials({
  GMAIL_PASSWORD: 'gmail:user@gmail.com'
});

// Set as environment variables
setEnvVariables(creds);

// Do both in one call
const count = await setupCredentials({
  GMAIL_PASSWORD: 'gmail:user@gmail.com',
  GITHUB_TOKEN: 'github:octocat'
});
```

### `passwordManager.js`

```javascript
// Initialize vault
await initKeychain();

// Add password
await addPassword('service', 'us- Review stored credentials periodicallconst result = await getPassword('service', 'username');

// List all credentials
await listPasswords();

// Delete credential
await deletePassword('service', 'username');

// Clear vault
await clearVault();
```

