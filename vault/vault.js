import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VAULT_FILE = path.join(__dirname, '.vault.enc');
const KEYCHAIN_SERVICE = 'vision-site-vault-master';
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Store master password in macOS Keychain (with Touch ID protection)
 * Uses stdin to avoid shell escaping issues with special characters
 */
function storeMasterPasswordInKeychain(password) {
  try {
    // Delete existing entry if present
    try {
      execSync(`security delete-generic-password -a "$USER" -s "${KEYCHAIN_SERVICE}" 2>/dev/null`, {
        stdio: 'pipe'
      });
    } catch (e) {
      // Ignore if doesn't exist
    }
    
    // Add new password to Keychain with Touch ID access
    // Use stdin to pass password safely (handles all special characters)
    execSync(
      `security add-generic-password -a "$USER" -s "${KEYCHAIN_SERVICE}" -w`,
      { 
        input: password,
        stdio: ['pipe', 'pipe', 'pipe']
      }
    );
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieve master password from macOS Keychain (triggers Touch ID prompt)
 */
function getMasterPasswordFromKeychain() {
  try {
    // This will trigger Touch ID/password prompt via macOS
    const password = execSync(
      `security find-generic-password -a "$USER" -s "${KEYCHAIN_SERVICE}" -w`,
      { 
        stdio: ['inherit', 'pipe', 'pipe'], // inherit stdin for interactive prompt
        encoding: 'utf8'
      }
    ).trim();
    
    return { success: true, password };
  } catch (error) {
    if (error.status === 128) {
      // User cancelled the prompt
      return { success: false, error: 'Authentication cancelled' };
    }
    return { success: false, error: 'Master password not found in Keychain. Run: node vault/vault.js init' };
  }
}

/**
 * Check if master password exists in Keychain
 */
function hasMasterPasswordInKeychain() {
  try {
    execSync(
      `security find-generic-password -a "$USER" -s "${KEYCHAIN_SERVICE}" 2>/dev/null`,
      { stdio: 'pipe' }
    );
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Derive encryption key from password using PBKDF2
 */
function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt data
 */
function encrypt(text, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(password, salt);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  // Combine: salt + iv + tag + encrypted
  return Buffer.concat([
    salt,
    iv,
    tag,
    Buffer.from(encrypted, 'hex')
  ]).toString('base64');
}

/**
 * Decrypt data
 */
function decrypt(encryptedData, password) {
  const buffer = Buffer.from(encryptedData, 'base64');
  
  // Extract components
  const salt = buffer.slice(0, SALT_LENGTH);
  const iv = buffer.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = buffer.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = buffer.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  
  const key = deriveKey(password, salt);
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Load vault from disk
 */
function loadVault(masterPassword) {
  if (!fs.existsSync(VAULT_FILE)) {
    throw new Error('Vault not found. Run: node vault/vault.js init');
  }
  
  const encrypted = fs.readFileSync(VAULT_FILE, 'utf8');
  const decrypted = decrypt(encrypted, masterPassword);
  return JSON.parse(decrypted);
}

/**
 * Save vault to disk
 */
function saveVault(vault, masterPassword) {
  const encrypted = encrypt(JSON.stringify(vault), masterPassword);
  fs.writeFileSync(VAULT_FILE, encrypted);
  fs.chmodSync(VAULT_FILE, 0o600);
}

/**
 * Prompt user for input (with hidden input for passwords)
 * Properly handles all special characters including quotes, backslashes, etc.
 */
function promptUser(question, hideInput = false) {
  return new Promise((resolve) => {
    if (hideInput && process.stdin.isTTY) {
      // Interactive terminal with hidden input
      process.stdout.write(question);
      
      const stdin = process.stdin;
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
      
      let password = '';
      
      const dataHandler = (char) => {
        const charStr = char.toString('utf8');
        
        switch (charStr) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl-D
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', dataHandler);
            process.stdout.write('\n');
            resolve(password);
            break;
          case '\u0003': // Ctrl-C
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', dataHandler);
            process.stdout.write('\n');
            process.exit(1);
            break;
          case '\u007f': // Backspace
          case '\b':
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.clearLine();
              process.stdout.cursorTo(0);
              process.stdout.write(question + '*'.repeat(password.length));
            }
            break;
          default:
            // Accept all other characters (including special chars)
            password += charStr;
            process.stdout.write('*');
            break;
        }
      };
      
      stdin.on('data', dataHandler);
      
    } else if (hideInput && !process.stdin.isTTY) {
      // Non-interactive (piped) - read once until newline
      process.stdout.write(question);
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      });
      
      rl.once('line', (line) => {
        rl.close();
        process.stdout.write('\n');
        resolve(line);
      });
      
    } else {
      // Normal visible input
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * CLI Commands
 */
export class VaultCLI {
  async init() {
    if (fs.existsSync(VAULT_FILE)) {
      console.log('⚠️  Vault already exists at:', VAULT_FILE);
      const overwrite = await promptUser('Overwrite? (yes/no): ');
      if (overwrite.toLowerCase() !== 'yes') {
        console.log('Cancelled.');
        return;
      }
    }
    
    console.log('🔐 Initialize Secure Vault');
    console.log('');
    
    const password1 = await promptUser('Enter master password: ', true);
    const password2 = await promptUser('Confirm master password: ', true);
    
    if (password1 !== password2) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }
    
    if (password1.length < 8) {
      console.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }
    
    // Store in Keychain for Touch ID access
    console.log('🔑 Storing master password in macOS Keychain...');
    const keychainResult = storeMasterPasswordInKeychain(password1);
    
    if (!keychainResult.success) {
      console.log('⚠️  Failed to store in Keychain:', keychainResult.error);
      console.log('    You will need to enter the password manually each time');
    } else {
      console.log('✅ Master password stored in Keychain (Touch ID protected)');
    }
    
    saveVault({}, password1);
    console.log('✅ Vault initialized successfully');
    console.log('📁 Location:', VAULT_FILE);
  }
  
  async set(key, value) {
    const masterPassword = await this.getMasterPassword();
    
    try {
      const vault = loadVault(masterPassword);
      
      if (!key) {
        key = await promptUser('Enter credential name (e.g., gmail_password): ');
      }
      
      if (!value) {
        value = await promptUser(`Enter value for "${key}": `, true);
      }
      
      // Trim any whitespace from the value
      vault[key] = value.trim();
      saveVault(vault, masterPassword);
      
      console.log(`✅ Stored: ${key}`);
    } catch (error) {
      console.error('❌', error.message);
      process.exit(1);
    }
  }
  
  async get(key) {
    const masterPassword = await this.getMasterPassword();
    
    try {
      const vault = loadVault(masterPassword);
      
      if (!key) {
        key = await promptUser('Enter credential name: ');
      }
      
      if (!(key in vault)) {
        console.error(`❌ Credential "${key}" not found`);
        process.exit(1);
      }
      
      // Output ONLY the credential value (for piping/scripting)
      process.stdout.write(vault[key]);
      if (process.stdout.isTTY) {
        // Add newline only for interactive terminals
        process.stdout.write('\n');
      }
    } catch (error) {
      console.error('❌', error.message);
      process.exit(1);
    }
  }
  
  async list() {
    const masterPassword = await this.getMasterPassword();
    
    try {
      const vault = loadVault(masterPassword);
      const keys = Object.keys(vault);
      
      if (keys.length === 0) {
        console.log('🔒 Vault is empty');
        return;
      }
      
      console.log('🔑 Stored credentials:');
      keys.forEach(key => {
        console.log(`  - ${key}`);
      });
    } catch (error) {
      console.error('❌', error.message);
      process.exit(1);
    }
  }
  
  async delete(key) {
    const masterPassword = await this.getMasterPassword();
    
    try {
      const vault = loadVault(masterPassword);
      
      if (!key) {
        key = await promptUser('Enter credential name to delete: ');
      }
      
      if (!(key in vault)) {
        console.error(`❌ Credential "${key}" not found`);
        process.exit(1);
      }
      
      delete vault[key];
      saveVault(vault, masterPassword);
      
      console.log(`✅ Deleted: ${key}`);
    } catch (error) {
      console.error('❌', error.message);
      process.exit(1);
    }
  }
  
  /**
   * Get master password (from Keychain with Touch ID, or prompt)
   */
  async getMasterPassword() {
    // Try to get from Keychain first (triggers Touch ID)
    if (hasMasterPasswordInKeychain()) {
      // Output authentication messages to stderr so they don't interfere with credential output
      process.stderr.write('🔐 Authenticating via Touch ID...\n');
      const result = getMasterPasswordFromKeychain();
      
      if (result.success) {
        process.stderr.write('✅ Authenticated\n');
        return result.password;
      } else {
        process.stderr.write(`⚠️  Touch ID failed: ${result.error}\n`);
      }
    }
    
    // Fallback to manual entry
    return await promptUser('Enter master password: ', true);
  }
}

/**
 * Programmatic API for agent use
 */
export class VaultAPI {
  constructor(masterPassword = null) {
    this.masterPassword = masterPassword;
  }
  
  /**
   * Get master password (from Keychain, env var, or provided)
   */
  async _getMasterPassword() {
    if (this.masterPassword) {
      return this.masterPassword;
    }
    
    // Try Keychain with Touch ID
    if (hasMasterPasswordInKeychain()) {
      const result = getMasterPasswordFromKeychain();
      if (result.success) {
        return result.password;
      }
    }
    
    // Fallback to environment variable
    if (process.env.VAULT_MASTER_PASSWORD) {
      return process.env.VAULT_MASTER_PASSWORD;
    }
    
    throw new Error('Master password not available. Set VAULT_MASTER_PASSWORD, use Keychain, or provide to constructor.');
  }
  
  /**
   * Get credential value (agent never sees this in logs)
   */
  async getCredential(key) {
    try {
      const masterPassword = await this._getMasterPassword();
      const vault = loadVault(masterPassword);
      if (!(key in vault)) {
        throw new Error(`Credential "${key}" not found in vault`);
      }
      return vault[key];
    } catch (error) {
      throw new Error(`Vault access failed: ${error.message}`);
    }
  }
  
  /**
   * Check if credential exists
   */
  async hasCredential(key) {
    try {
      const masterPassword = await this._getMasterPassword();
      const vault = loadVault(masterPassword);
      return key in vault;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Use credential in a callback (value never logged)
   */
  async useCredential(key, callback) {
    const value = await this.getCredential(key);
    try {
      return await callback(value);
    } finally {
      // Ensure value is not retained
    }
  }
}

// CLI Entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const cli = new VaultCLI();
    const command = process.argv[2];
    const arg1 = process.argv[3];
    const arg2 = process.argv[4];
    
    switch (command) {
      case 'init':
        await cli.init();
        break;
      case 'set':
        await cli.set(arg1, arg2);
        break;
      case 'get':
        await cli.get(arg1);
        break;
      case 'list':
        await cli.list();
        break;
      case 'delete':
      case 'del':
        await cli.delete(arg1);
        break;
      default:
        console.log('Usage: node vault/vault.js <command> [args]');
        console.log('');
        console.log('Commands:');
        console.log('  init              Initialize vault');
        console.log('  set <key> [value] Store credential');
        console.log('  get <key>         Retrieve credential');
        console.log('  list              List all credential keys');
        console.log('  delete <key>      Delete credential');
        break;
    }
  })();
}
