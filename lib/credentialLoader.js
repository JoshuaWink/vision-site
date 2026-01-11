import { getPassword } from './passwordManager.js';

/**
 * Load credentials from vault based on credential map
 * @param {Object} credentialMap - Map of ENV_VAR_NAME: 'service:username'
 * @returns {Promise<Object>} Object with loaded credentials
 */
export async function loadCredentials(credentialMap) {
  const credentials = {};
  const results = [];

  for (const [envVarName, serviceKey] of Object.entries(credentialMap)) {
    try {
      const password = await getPassword(serviceKey);
      
      if (!password) {
        results.push(`⚠️  ${envVarName}: Not found in vault`);
        continue;
      }

      credentials[envVarName] = password;
      results.push(`✅ ${envVarName}: Loaded`);
    } catch (error) {
      results.push(`❌ ${envVarName}: ${error.message}`);
    }
  }

  return {
    success: Object.keys(credentials).length > 0,
    count: Object.keys(credentials).length,
    credentials,
    logs: results
 **
 * Set credentials as process.env variables
 * @param {Object} credentials - Object with ENV_VAR_NAME: password pairs
 * @returns {Object} Result with count and logs
 */
export function setEnvVariables(credentials) {
  const results = [];
  let count = 0;

  for (const [envVarName, value] of Object.entries(credentials)) {
    try {
      process.env[envVarName] = value;
      results.push(`✅ process.env.${envVarName} set`);
      count++;
    } catch (error) {
      results.push(`❌ Failed to set ${envVarName}: ${error.message}`);
    }
  }

  return {
    success: count > 0,
    count,
    logs: results
  };
}

/**
 * Setup credentials: load from vault and set as env variables
 * @param {Object} credentialMap - Map of ENV_VAR_NAME: 'service:username'
 * @returns {Promise<Object>} Result with count, success status, and logs
 */
export async function setupCrede
 (credentialMap) {
  const logs = [];
  
  logs.push('🔐 Starting credential setup...');

  // Load credentials from vault
  const loadResult = await loadCredentials(credentialMap);
  logs.push(...loadResult.logs);

  if (!loadResult.success) {
    logs.push('⚠️  No credentials loaded from vault');
    return {
      success: false,
      count: 0,
      logs
    };
  }

  // Set environment variables
  const setResult = setEnvVariables(loadResult.credentials);
  logs.push(...setResult.logs);

  logs.push(`?     count++;
    } catch (error) {
      results.push;

  return {
    success: setResult.success,
    count: setResult.count,
    logs
  };
}

export default {
  loadCredentials,
  setEnvVariables,
  setupCredentials
};
