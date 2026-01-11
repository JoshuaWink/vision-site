# Placeholder System - Declarative Credential Management

The placeholder system allows you to define login configurations with automatic credential resolution from the vault, environment variables, or direct values.

## Quick Start

### 1. Store Credentials in Vault

```bash
# Store your credentials
node vault/vault.js set gmail_email your-email@gmail.com
node vault/vault.js set gmail_password
# Enter password when prompted
```

### 2. Use Placeholders in Configuration

Create a config file or use the built-in templates:

```json
{
  "fields": {
    "username": {
      "selector": "#email",
      "value": "${{gmail_email}}"
    },
    "password": {
      "selector": "#password",
      "value": "${{gmail_password}}"
    }
  }
}
```

### 3. Run Automated Login

```bash
node scripts/config-login.js gmail
```

The system automatically:
- ✅ Resolves `${{gmail_email}}` from vault
- ✅ Resolves `${{gmail_password}}` from vault (via Touch ID)
- ✅ Fills the form
- ✅ Submits login
- ✅ Verifies success

---

## Placeholder Syntax

### Vault Credentials (Default)

```json
"value": "${{credential_name}}"
"value": "${{vault:credential_name}}"  // Explicit syntax
```

Both resolve the credential from your encrypted vault.

### Environment Variables

```json
"value": "${{env:API_KEY}}"
"value": "${{env:DATABASE_URL}}"
```

Resolves from `process.env`.

### Direct Values

```json
"value": "${{value:true}}"
"value": "${{value:123}}"
"value": "${{value:some-string}}"
```

Use for non-sensitive configuration values.

---

## Configuration Formats

### Format 1: Simple Fields

For basic username/password forms:

```json
{
  "url": "https://example.com/login",
  "fields": {
    "username": {
      "selector": "#email",
      "value": "${{example_username}}"
    },
    "password": {
      "selector": "#password",
      "value": "${{example_password}}"
    }
  },
  "submit": {
    "selector": "button[type='submit']"
  },
  "success": {
    "urlContains": "dashboard"
  }
}
```

### Format 2: Multi-Step Flow

For complex logins (like Gmail's two-page flow):

```json
{
  "url": "https://accounts.google.com/signin",
  "steps": [
    {
      "type": "fill",
      "selector": "input[type='email']",
      "value": "${{gmail_email}}",
      "wait": 1000
    },
    {
      "type": "click",
      "selector": "#identifierNext",
      "wait": 2000
    },
    {
      "type": "fill",
      "selector": "input[type='password']",
      "value": "${{gmail_password}}",
      "wait": 1000
    },
    {
      "type": "click",
      "selector": "#passwordNext",
      "wait": 3000
    }
  ],
  "success": {
    "urlContains": "mail.google.com"
  }
}
```

---

## Built-In Templates

The system includes pre-configured templates for popular services in [configs/login-templates.json](configs/login-templates.json):

| Service | Command | Required Credentials |
|---------|---------|---------------------|
| **Gmail** | `node scripts/config-login.js gmail` | `gmail_email`, `gmail_password` |
| **GitHub** | `node scripts/config-login.js github` | `github_username`, `github_password` |
| **Twitter** | `node scripts/config-login.js twitter` | `twitter_username`, `twitter_password` |
| **LinkedIn** | `node scripts/config-login.js linkedin` | `linkedin_email`, `linkedin_password` |
| **Facebook** | `node scripts/config-login.js facebook` | `facebook_email`, `facebook_password` |
| **Instagram** | `node scripts/config-login.js instagram` | `instagram_username`, `instagram_password` |
| **Reddit** | `node scripts/config-login.js reddit` | `reddit_username`, `reddit_password` |

---

## Programmatic Usage

### Direct Resolution

```javascript
import { PlaceholderResolver } from './vault/placeholder-resolver.js';
import { VaultAPI } from './vault/vault.js';

const vault = new VaultAPI();
const resolver = new PlaceholderResolver(vault);

// Resolve a single string
const email = await resolver.resolveString("${{gmail_email}}");
console.log(email); // "user@gmail.com"

// Resolve an entire object
const config = {
  email: "${{gmail_email}}",
  password: "${{vault:gmail_password}}",
  apiKey: "${{env:API_KEY}}",
  rememberMe: "${{value:true}}"
};

const resolved = await resolver.resolve(config);
// {
//   email: "user@gmail.com",
//   password: "secret123",
//   apiKey: "abc-xyz-789",
//   rememberMe: "true"
// }
```

### With BrowserAuth

```javascript
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';

const auth = new BrowserAuth();
const client = await CDP({ port: 9222 });
await client.Page.enable();

// Option 1: Use configuration object
const config = {
  url: "https://example.com/login",
  fields: {
    username: { selector: "#email", value: "${{example_email}}" },
    password: { selector: "#pass", value: "${{example_password}}" }
  },
  submit: { selector: "button[type='submit']" }
};

await auth.fillFormWithConfig(client, config);

// Option 2: Validate before execution
const missing = await auth.validateConfig(config);
if (missing.length > 0) {
  console.error('Missing credentials:', missing);
  process.exit(1);
}
```

### Extract Placeholder References

```javascript
const resolver = new PlaceholderResolver();

const config = {
  email: "${{gmail_email}}",
  password: "${{vault:gmail_password}}",
  apiKey: "${{env:API_KEY}}"
};

const placeholders = resolver.extractPlaceholders(config);
console.log(placeholders);
// ["vault:gmail_email", "vault:gmail_password", "env:API_KEY"]
```

---

## Real-World Examples

### Example 1: Daily Gmail Check

```javascript
#!/usr/bin/env node
import CDP from 'chrome-remote-interface';
import { BrowserAuth } from './vault/browser-auth.js';
import fs from 'fs';

const auth = new BrowserAuth();
const config = JSON.parse(fs.readFileSync('./configs/login-templates.json'));

const client = await CDP({ port: 9222 });
await client.Page.enable();

// Login with automatic credential resolution
await auth.fillFormWithConfig(client, config.gmail);

// Wait for inbox to load
await new Promise(r => setTimeout(r, 5000));

// Check unread count
const { result } = await client.Runtime.evaluate({
  expression: 'document.querySelector(".aim")?.textContent'
});

console.log(`Unread emails: ${result.value || 0}`);
await client.close();
```

### Example 2: Multi-Account Management

```javascript
const accounts = ['work', 'personal', 'project'];

for (const account of accounts) {
  const config = {
    url: "https://accounts.google.com/signin",
    fields: {
      email: { 
        selector: "input[type='email']", 
        value: `${{gmail_email_${account}}}` 
      },
      password: { 
        selector: "input[type='password']", 
        value: `${{gmail_password_${account}}}` 
      }
    }
  };
  
  await auth.fillFormWithConfig(client, config);
  // Do work...
  await logout();
}
```

### Example 3: Custom Website Login

Create your own config:

```json
{
  "myapp": {
    "name": "My Application",
    "url": "https://myapp.com/login",
    "fields": {
      "email": {
        "selector": "input[name='user_email']",
        "value": "${{myapp_email}}"
      },
      "password": {
        "selector": "input[name='user_password']",
        "value": "${{myapp_password}}"
      },
      "mfa": {
        "selector": "input[name='totp_code']",
        "value": "${{env:MYAPP_MFA_TOKEN}}"
      }
    },
    "submit": {
      "selector": "button#login-btn"
    },
    "success": {
      "urlContains": "/dashboard"
    }
  }
}
```

Store credentials:
```bash
node vault/vault.js set myapp_email admin@myapp.com
node vault/vault.js set myapp_password
export MYAPP_MFA_TOKEN="123456"
```

Run:
```bash
node scripts/config-login.js myapp --config ./my-configs.json
```

---

## Security Considerations

### ✅ What's Secure

- **Vault credentials**: Encrypted with AES-256-GCM
- **Master password**: Stored in macOS Keychain with Touch ID
- **Runtime resolution**: Credentials never logged or stored in memory longer than needed
- **Zero-knowledge**: Agent code never sees plain-text passwords

### ⚠️ Important Notes

1. **Config files are NOT encrypted** - They contain placeholder references, not actual credentials
2. **Commit config files safely** - Safe to commit templates with `${{placeholders}}`
3. **Never commit `.vault` file** - Add to `.gitignore`
4. **Environment variables** - Be careful with `${{env:...}}` in shared environments
5. **Browser sessions** - Close CDP browser when done to clear session data

---

## Troubleshooting

### Missing Credentials

```bash
❌ Missing credentials in vault:
  gmail_password
  
Add them with: node vault/vault.js set gmail_password
```

**Solution**: Store the credential in your vault.

### Invalid Placeholder Syntax

```javascript
// ❌ Wrong
"value": "{{gmail_email}}"      // Missing $
"value": "${gmail_email}"       // Wrong delimiters
"value": "${{vault gmail_email}}"  // Space instead of :

// ✅ Correct
"value": "${{gmail_email}}"
"value": "${{vault:gmail_email}}"
```

### Selector Not Found

```bash
❌ Login verification failed: URL doesn't contain "dashboard"
```

**Solution**: Update selectors in config or verify the site hasn't changed its HTML structure.

### Touch ID Not Prompting

**This is expected behavior** - The Keychain password prompt IS the security layer. Enter your Mac password or use Touch ID on the prompt.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Config File (login-templates.json)                     │
│  { "username": "${{gmail_email}}" }                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  PlaceholderResolver                                    │
│  • Parse ${{...}} syntax                                │
│  • Identify source: vault / env / value                 │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
    ┌─────────┐ ┌─────────┐ ┌─────────┐
    │  Vault  │ │   Env   │ │  Value  │
    │   API   │ │  Vars   │ │ Literal │
    └────┬────┘ └────┬────┘ └────┬────┘
         │           │           │
         ▼           │           │
    ┌─────────┐      │           │
    │Keychain │      │           │
    │Touch ID │      │           │
    └────┬────┘      │           │
         │           │           │
         └───────────┴───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  Resolved Config                                        │
│  { "username": "user@gmail.com" }                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  BrowserAuth.fillFormWithConfig()                       │
│  • Navigate to URL                                      │
│  • Fill fields with resolved values                     │
│  • Submit form                                          │
│  • Verify success                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Best Practices

### 1. Organize Credentials by Service

```bash
# Gmail
node vault/vault.js set gmail_email_work work@company.com
node vault/vault.js set gmail_password_work
node vault/vault.js set gmail_email_personal me@gmail.com
node vault/vault.js set gmail_password_personal

# GitHub
node vault/vault.js set github_username myusername
node vault/vault.js set github_password
```

### 2. Use Descriptive Placeholder Names

```json
// ❌ Unclear
"value": "${{user}}"
"value": "${{pw}}"

// ✅ Clear
"value": "${{github_username}}"
"value": "${{github_password}}"
```

### 3. Separate Sensitive and Non-Sensitive

```json
{
  "url": "${{value:https://example.com}}",  // Non-sensitive
  "timeout": "${{value:5000}}",              // Non-sensitive
  "username": "${{example_user}}",           // Sensitive - from vault
  "password": "${{example_pass}}"            // Sensitive - from vault
}
```

### 4. Validate Before Production

```javascript
// Always check credentials exist before deployment
const missing = await auth.validateConfig(config);
if (missing.length > 0) {
  throw new Error(`Setup incomplete. Missing: ${missing.join(', ')}`);
}
```

---

## Next Steps

1. **Store your credentials**: `node vault/vault.js set <name>`
2. **Pick a service**: Choose from [login-templates.json](configs/login-templates.json)
3. **Run automated login**: `node scripts/config-login.js <service>`
4. **Create custom configs**: Add your own websites to templates
5. **Build workflows**: Combine with other CDP operations for powerful automation

---

*The placeholder system turns credential management from code into configuration - define once, use everywhere.*
