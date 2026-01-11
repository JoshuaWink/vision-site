# 🔓 Enable Touch ID for Keychain Access

## Current Behavior

When you run `node vault/vault.js list`, macOS prompts for your **user account password** to unlock the Keychain, not Touch ID.

## Why This Happens

By default, the `security` command on macOS requires your user password to access Keychain items. Touch ID is only enabled if:

1. Your Mac has Touch ID hardware (MacBook Pro with Touch Bar, Magic Keyboard with Touch ID, or newer MacBooks)
2. Touch ID is enabled in System Settings for unlocking your Mac
3. Your user account password is properly configured with Touch ID

## ✅ Solution 1: Enable Touch ID for Terminal

### Step 1: Check Touch ID Status

```bash
# Check if Touch ID is available
bioutil -rs
```

**Expected output:**
```
Touch ID sensor available
```

### Step 2: Enable Touch ID for sudo (This enables it for security commands)

```bash
# Edit PAM configuration
sudo nano /etc/pam.d/sudo
```

**Add this line at the TOP of the file:**
```
auth       sufficient     pam_tid.so
```

Save and exit (Ctrl+X, Y, Enter)

### Step 3: Test Touch ID

```bash
# This should now prompt for Touch ID instead of password
sudo ls
```

👆 **You should see a Touch ID prompt!**

### Step 4: Test with Vault

```bash
node vault/vault.js list
```

👆 **Touch ID should now appear for Keychain access!**

## ✅ Solution 2: Use Keychain Access App Settings

### Step 1: Open Keychain Access

```bash
open "/Applications/Utilities/Keychain Access.app"
```

### Step 2: Find the Vault Entry

1. Select **login** keychain (left sidebar)
2. Search for: `vision-site-vault-master`
3. Double-click the entry

### Step 3: Configure Access Control

1. Click the **Access Control** tab
2. Select: **"Ask for Keychain password"** (this enables Touch ID prompt)
3. Or select: **"Confirm before allowing access"** + Enable Touch ID in the dropdown
4. Click **Save Changes**

### Step 4: Test

```bash
node vault/vault.js list
```

## ✅ Solution 3: Accept User Password (Alternative)

If Touch ID isn't working or your Mac doesn't have it:

### What Happens Now

- First access: Enter your **macOS user password** (the one you use to log in)
- Keychain remembers: For ~5 minutes, subsequent accesses don't prompt
- More secure: Your password unlocks the Keychain which contains the vault master password

This is actually **still secure** because:
1. Your user password protects the Keychain
2. The master password is encrypted in Keychain
3. The vault file is encrypted with the master password
4. **Three layers of protection!**

## 🔍 Troubleshooting

### "User interaction is not allowed"

**Problem:** Running in a non-interactive shell (scripts, automation)

**Solution:** Set environment variable:
```bash
export VAULT_MASTER_PASSWORD="your-master-password"
```

Then agents won't trigger Keychain prompts at all.

### "Authentication failed" or keeps prompting

**Problem:** Keychain is locked or password is incorrect

**Solution:**
```bash
# Unlock keychain manually
security unlock-keychain ~/Library/Keychains/login.keychain-db

# Then try vault command
node vault/vault.js list
```

### Touch ID not available on this Mac

**Check hardware:**
```bash
system_profiler SPiBridgeDataType | grep "Touch ID"
```

If empty, your Mac doesn't have Touch ID hardware. The password prompt is normal.

## 📝 What Actually Happens

### With Touch ID Enabled:
```
You run: node vault/vault.js list
         ↓
macOS shows: 👆 "Terminal wants to access key 'vision-site-vault-master'"
         ↓
You: Touch sensor
         ↓
Keychain: Returns encrypted master password
         ↓
Vault: Decrypts vault file, shows credentials
```

### With Password Only:
```
You run: node vault/vault.js list
         ↓
macOS shows: 🔑 "Enter your password to allow this"
         ↓
You: Type macOS user password
         ↓
Keychain: Returns encrypted master password (cached for ~5 min)
         ↓
Vault: Decrypts vault file, shows credentials
```

## 🎯 Recommended Setup

### For Interactive Use (You running commands):
1. Enable Touch ID for Terminal (Solution 1)
2. Accept password prompts if no Touch ID (Solution 3)

### For Agent/Script Use (Automated):
1. Set `VAULT_MASTER_PASSWORD` environment variable
2. No Keychain access needed, no prompts

```bash
# In ~/.zshrc
export VAULT_MASTER_PASSWORD="your-master-password"

# Or use macOS Keychain for the env var itself:
export VAULT_MASTER_PASSWORD=$(security find-generic-password -a "$USER" -s "vault-master-password" -w 2>/dev/null)
```

## ✨ Test Your Setup

```bash
# Should prompt for Touch ID or password (first time)
node vault/vault.js list

# Should not prompt (within 5 min of last unlock)
node vault/vault.js get test_credential

# For agents, set env var to bypass prompts entirely
export VAULT_MASTER_PASSWORD="YourMasterPassword123!"
node vault/vault.js list  # No prompt!
```

---

**Bottom Line:** The Keychain password prompt **is** the security layer. Touch ID is a biometric shortcut to entering that password. Both are secure!
