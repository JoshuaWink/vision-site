import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KEYCHAIN_SERVICE = 'vision-site-master-key';
const VAULT_DIR = path.join(process.env.HOME, '.vision-site');
const VAULT_FILE = path.join(VAULT_DIR, '.passwordvault');
const KEY_LENGTH = 32;
const ALGORITHM = 'aes-256-gcm';

function ensureVaultDir() {
  if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true, mode: 0o700 });
  }
}

async function getKeychainKey() {
  try {
    const result = execSync(
      `security find-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_SERVICE}" -w 2>/dev/null`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    ).trim();
    if (!result) {
      return { success: false, error: 'Key not found in Keychain' };
    }
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: 'Failed to retrieve key from Keychain' };
  }
}

async function setKeychainKey(key) {
  try {
    execSync(
      `security add-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_SERVICE}" -w "${key}" -U 2>/dev/null || security update-generic-password -s "${KEYCHAIN_SERVICE}" -a "${KEYCHAIN_SERVICE}" -w "${key}" -U`,
      { encoding: 'utf-8' }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to store key in Keychain: ' + error.message };
  }
}

function generateKey() {
  return crypto.randomBytes(KEY_LENGTH).toString('base64');
}

export async function initKeychain() {
  try {
    ensureVaultDir();
    const existingResult = await getKeychainKey();
    if (existingResult.success) {
      return { success: true, data: existingResult.data };
    }
    const newKey = generateKey();
    const setResult = await setKeychainKey(newKey);
    if (!setResult.success) {
      return setResult;
    }
    return { success: true, data: newKey };
  } catch (error) {
    return { success: false, error: 'Failed to initialize Keychain: ' + error.message };
  }
}

function loadVault() {
  try {
    if (fs.existsSync(VAULT_FILE)) {
      const data = fs.readFileSync(VAULT_FILE, 'utf-8');
      return JSON.parse(data);
    }
    return { entries: [] };
  } catch (error) {
    return { entries: [] };
  }
}

function saveVault(vault) {
  try {
    ensureVaultDir();
    fs.writeFileSync(VAULT_FILE, JSON.stringify(vault, null, 2), { mode: 0o600 });
    return true;
  } catch (error) {
    console.error('Failed to save vault:', error.message);
    return false;
  }
}

function encryptPassword(password, masterKey) {
  try {
    const key = Buffer.from(masterKey, 'base64');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(password, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return {
      encrypted_password: encrypted,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  } catch (error) {
    throw new Error('Encryption failed: ' + error.message);
  }
}

function decryptPassword(encryptedPassword, iv, authTag, masterKey) {
  try {
    const key = Buffer.from(masterKey, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    let decrypted = decipher.update(encryptedPassword, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed: ' + error.message);
  }
}

export async function addPassword(service, username, password) {
  try {
    if (!service || !username || !password) {
      return { success: false, error: 'Service, username, and password are required' };
    }
    const keyResult = await initKeychain();
    if (!keyResult.success) {
      return keyResult;
    }
    const masterKey = keyResult.data;
    const vault = loadVault();
    const encryptedData = encryptPassword(password, masterKey);
    const now = new Date().toISOString();
    const existingIndex = vault.entries.findIndex(e => e.service === service && e.username === username);
    const entry = {
      service,
      username,
      encrypted_password: encryptedData.encrypted_password,
      iv: encryptedData.iv,
      authTag: encryptedData.authTag,
      createdAt: existingIndex !== -1 ? vault.entries[existingIndex].createdAt : now,
      lastModified: now
    };
    if (existingIndex !== -1) {
      vault.entries[existingIndex] = entry;
    } else {
      vault.entries.push(entry);
    }
    if (!saveVault(vault)) {
      return { success: false, error: 'Failed to save vault' };
    }
    return {
      success: true,
      data: {
        service: entry.service,
        username: entry.username,
        createdAt: entry.createdAt,
        lastModified: entry.lastModified
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function getPassword(service, username) {
  try {
    if (!service || !username) {
      return { success: false, error: 'Service and username are required' };
    }
    const keyResult = await initKeychain();
    if (!keyResult.success) {
      return keyResult;
    }
    const masterKey = keyResult.data;
    const vault = loadVault();
    const entry = vault.entries.find(e => e.service === service && e.username === username);
    if (!entry) {
      return { success: false, error: `Credential not found for ${service}/${username}` };
    }
    const decrypted = decryptPassword(entry.encrypted_password, entry.iv, entry.authTag, masterKey);
    return { success: true, data: decrypted };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function listPasswords() {
  try {
    const vault = loadVault();
    const entries = vault.entries.map(entry => ({
      service: entry.service,
      username: entry.username,
      createdAt: entry.createdAt,
      lastModified: entry.lastModified
    }));
    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function deletePassword(service, username) {
  try {
    if (!service || !username) {
      return { success: false, error: 'Service and username are required' };
    }
    const vault = loadVault();
    const initialLength = vault.entries.length;
    vault.entries = vault.entries.filter(e => !(e.service === service && e.username === username));
    if (vault.entries.length === initialLength) {
      return { success: false, error: `Credential not found for ${service}/${username}` };
    }
    if (!saveVault(vault)) {
      return { success: false, error: 'Failed to save vault' };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function clearVault() {
  try {
    const emptyVault = { entries: [] };
    if (!saveVault(emptyVault)) {
      return { success: false, error: 'Failed to clear vault' };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}