# 🔤 Handling Special Characters in Passwords

The vault now **properly handles ALL special characters** in passwords, including:

- ✅ Quotes: `"` and `'`
- ✅ Backslashes: `\`
- ✅ Dollar signs: `$`
- ✅ Backticks: `` ` ``
- ✅ Spaces
- ✅ Unicode: `emoji 🔐 and accènts`
- ✅ All special chars: `!@#$%^&*()_+-=[]{}|;:",.<>?/~`

## What Was Fixed

### Before ❌

Special characters in passwords could cause issues:
- Shell escaping problems
- Command injection vulnerabilities
- Truncated passwords
- Failed storage/retrieval

### After ✅

1. **Raw mode password input** - Characters captured directly without shell interpretation
2. **stdin-based Keychain storage** - Password never appears in command arguments
3. **Proper character handling** - All UTF-8 characters supported including emoji

## Usage Examples

### Simple Password
```bash
node vault/vault.js set my_password
# Enter: MyPassword123
# ✅ Works
```

### Password with Quotes
```bash
node vault/vault.js set my_password
# Enter: My"Pass'word
# ✅ Works - quotes are stored literally
```

### Password with Backslashes
```bash
node vault/vault.js set my_password
# Enter: My\Pass\word
# ✅ Works - backslashes preserved
```

### Password with Dollar Signs
```bash
node vault/vault.js set my_password
# Enter: $MyP@$$word$
# ✅ Works - dollar signs are literal, not variable expansion
```

### Complex Password
```bash
node vault/vault.js set my_password
# Enter: !@#$%^&*()_+-=[]{}|;:",.<>?/~`\'
# ✅ Works - all special characters supported
```

### Unicode Password
```bash
node vault/vault.js set my_password
# Enter: Pāsswörd🔐123
# ✅ Works - full UTF-8 support
```

## Testing

Run the comprehensive test:

```bash
node test-special-chars.js
```

This tests:
- Simple passwords
- Quotes (single and double)
- Backslashes
- Dollar signs
- Backticks
- Spaces
- Unicode characters
- Complex combinations

**Expected output:**
```
🧪 Testing Vault with Special Characters

Testing storage and retrieval...

✅ simple: PASS
✅ with_quotes: PASS
✅ with_backslash: PASS
✅ with_dollar: PASS
✅ with_backtick: PASS
✅ with_spaces: PASS
✅ with_unicode: PASS
✅ complex: PASS
✅ very_complex: PASS

🎉 Testing complete!
```

## How It Works

### Password Input (Raw Mode)

```javascript
// Before: Used readline (could lose special chars)
rl.question(question, (answer) => resolve(answer));

// After: Raw mode captures every character
stdin.setRawMode(true);
stdin.on('data', (char) => {
  password += char; // Captures exactly what you type
});
```

### Keychain Storage (stdin, not args)

```javascript
// Before: Password in command args (shell escaping issues)
execSync(`security add-generic-password ... -w "${password}"`);

// After: Password via stdin (no shell interpretation)
execSync(`security add-generic-password ... -w`, {
  input: password,  // Passed securely via stdin
  stdio: ['pipe', 'pipe', 'pipe']
});
```

### Benefits

1. **No escaping needed** - Characters stored exactly as typed
2. **No shell injection** - Password never in command string
3. **Full UTF-8 support** - Any valid Unicode character
4. **Secure** - Password not visible in process list
5. **Reliable** - What you type is what gets stored

## Real-World Examples

### LastPass-style Password
```
Password: Tr7&4$mK#9@pL2!qN
Status: ✅ Works perfectly
```

### 1Password-style Password
```
Password: correct-horse-battery-staple-42!
Status: ✅ Works with hyphens and special chars
```

### Generated Password with Everything
```
Password: aB3$dE6*hI9@lM2#pQ5&tU8!xY1^zA4%cF7
Status: ✅ All characters preserved
```

### Password with Intentional Quotes
```
Password: "my secret" password
Status: ✅ Quotes are literal characters
```

### Path-like Password
```
Password: /usr/local/bin:$PATH/secrets
Status: ✅ Slashes and dollar signs work
```

## Common Issues (Now Fixed)

### ❌ Before: "Password contains unsafe characters"
**Now:** ✅ All characters are safe

### ❌ Before: Password truncated at special char
**Now:** ✅ Full password preserved

### ❌ Before: Shell expansion of variables
```
Password: $HOME/secret  →  Stored as: /Users/jwink/secret (WRONG!)
```
**Now:** ✅ Stored as: `$HOME/secret` (CORRECT!)

### ❌ Before: Backslash escape issues
```
Password: C:\Windows\System32  →  Stored as: C:WindowsSystem32 (WRONG!)
```
**Now:** ✅ Stored as: `C:\Windows\System32` (CORRECT!)

## Best Practices

### ✅ DO
- Use any characters you want in passwords
- Include special characters for stronger passwords
- Test your password after storing: `node vault/vault.js get <key>`

### ❌ DON'T
- Don't type passwords on command line: `node vault/vault.js set key mypassword` (visible in history!)
- Use interactive mode instead: `node vault/vault.js set key` (prompts securely)

## Security Notes

1. **Character limitations:** None - all UTF-8 characters supported
2. **Length limitations:** Technically unlimited, practically ~8KB for Keychain
3. **Shell safety:** Password never exposed to shell interpretation
4. **Process safety:** Password not visible in `ps aux` output
5. **History safety:** Not recorded in shell history when using interactive mode

## Verification

To verify a password was stored correctly:

```bash
# Store password
node vault/vault.js set test_password
# Enter: My$Special"Password'123

# Retrieve and check
node vault/vault.js get test_password
# Output: My$Special"Password'123

# Should match exactly what you entered!
```

---

**Your passwords are now stored exactly as you type them, with full support for all special characters!** 🎉
