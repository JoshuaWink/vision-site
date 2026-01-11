# 🔐 Vault Quick Start

Secure password storage that keeps plaintext away from the AI agent.

## One-Minute Setup

```bash
# 1. Initialize vault (setup master key in Keychain)
node bin/vault.js init

# 2. Add your Gmail password
node bin/vault.js add --service gmail --username your-email@gmail.com

# 3. Verify it's stored
node bin/vault.js list

# 4. Use in automation
node cdp-cli.js --load-credentials gmail:your-email@gmail.com navigate https://gmail.com
```

## Why This Matters

✅ **Your Passwords Stay Encrypted** - Stored in `~/.vision-site/.passwordvault` (AES-256-GCM)
✅ **Agent Never Sees Plaintext** - Receives only environment variables
✅ **Keychain Protected** - Master key in macOS Keychain, not on disk
✅ **No Logs Exposed** - Passwords never printed anywhere

## Common Commands

```bash
# Add a credential
node bin/vault.js add -s SERVICE -u USERNAME

# List what you've stored
node bin/vault.js list

# Retrieve a pareful - it prints plaintext!)
node bin/vault.js get SERVICE USERNAME

# Get password for piping to env var
node bin/vault.js env SERVICE USERNAME

# Delete a credential
node bin/vault.js delete SERVICE USERNAME
```

## Integration with CDP CLI

Before running automation, load credentials:

```javascript
// In your script
import { setupCredentials } from './lib/credentialLoader.js';

// Load passwords as env vars (agent gets them, not plaintext)
await setupCredentials({
  GMAIL_PASSWORD: 'gmail:your-email@gmail.com'
});

// Now agent can access via process.env.GMAIL_PASSWORD
// But never sees: "your-email@gmail.com" or plaintext password
```

## File Layo✅ **Keychain Pn-site/
├── .passwordvault       ← Encrypted credentials (0o600)

macOS Keychain:
├── vision-site-master-key  ← Master encryption key (system protected)
```

## Security Features

- **AES-256-GCM Encryption** with unique IVs per password
- **Authentication Tags** prevent tampering
- **Keychain Integration** for master key protection
- **Process Memory Only** - Credentials never written to disk outside vault

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Keychain access denied" | Run `security find-generic-password -s "vision-site-master-key"` |
| "No credentials found" | Run `node bin/vault.js l// In your s| "Password lookup failed" | Check service/username match exactly: `node bin/vault.js get SERVICE USERNAME` |

## Next Steps

👉 See [VAULT_GUIDE.md](VAULT_GUIDE.md) for complete documentation
