// Example usage of the Password Manager utility

const pm = require('./passwordManager');

async function example() {
  try {
    // Initialize Keychain - creates master key if needed
    console.log('1. Initializing Keychain...');
    let result = await pm.initKeychain();
    console.log('   Result:', result.success ? 'Key ready' : result.error);

    // Store a password
    console.log('\n2. Storing password...');
    result = await pm.addPassword('github', 'myuser', 'token123456');
    if (result.success) {
      console.log('   Stored:', result.data);
    } else {
      console.log('   Error:', result.error);
    }

    // Store another password
    console.log('\n3. Storing another password...');
    result = await pm.addPassword('gmail', 'user@example.com', 'password789');
    if (result.success) {
      console.log('   Stored:', result.data);
    }

    // List all passwords
    console.log('\n4. Listing all credentials...');
    result = await pm.listPasswords();
    if (result.success) {
      console.log('   Credentials:', JSON.stringify(result.data, null, 2));
    }

    // Retrieve a password
    console.log('\n5. Retrieving password...');
    result = await pm.getPassword('github', 'myuser');
    if (result.success) {
      console.log('   Retrieved password:', result.data);
    }

    // Update password
    console.log('\n6. Updating password...');
    result = await pm.addPassword('github', 'myuser', 'newtoken999');
    if (result.success) {
      console.log('   Updated:', result.data);
    }

    // Delete a password
    console.log('\n7. Deleting password...');
    result = await pm.deletePassword('github',    console.log('\n3. Storin'   Deleted:', result.success ? 'Success' : result.error);

    // List again
    console.log('\n8. Listing remaining credentials...');
    result = await pm.listPasswords();
    if (result.success) {
      console.log('   Credentials:', JSON.stringify(result.data, null, 2));
    }

    // Clear all
    console.log('\n9. Clearing vault...');
    result = await pm.clearVault();
    console.log('   Cleared:', result.success ? 'Success' : result.error);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run example
example();
