#!/usr/bin/env node

import { program } from 'commander';
import * as pm from '../lib/passwordManager.js';

program.name('vault').description('Password Vault CLI').version('1.0.0');

program
  .command('init')
  .description('Initialize vault')
  .action(async () => {
    const result = await pm.initKeychain();
    if (result.success) {
      console.log('✅ Vault initialized. Master key stored in Keychain.');
      process.exit(0);
    } else {
      console.error('❌ Failed to initialize vault');
      process.exit(1);
    }
  });

program
  .command('add')
  .option('-s, --service <name>', 'Service')
  .option('-u, --username <name>', 'Username')
  .option('-p, --password <pw>', 'Password')
  .action(async (opts) => {
    if (!opts.service || !opts.username || !opts.password) {
      console.error('❌ Missing --service, --username, or --password');
      process.exit(1);
    }
    const result = await pm.addPassword(opts.servics.username, opts.password);
    if (result.success) {
      console.log(`✅ Stored: ${opts.service}/${opts.username}`);
      process.exit(0);
    } else {
      console.error(`❌ Failed: ${result.error}`);
      process.exit(1);
    }
  });

program
  .command('get')
  .option('-s, --service <name>', 'Service')
  .option('-u, --username <name>', 'Username')
  .action(async (opts) => {
    if (!opts.service || !opts.username) {
      console.error('❌ Missing --service or --username');
      process.exit(1);
    }
    const result = await pm.getPassword(opts.service, opts.username);
    if (result.success) {
      console.log(result.data.password);
      process.exit(0);
    } else {
      console.error('❌ Not found');
     .action(async (opts) 

program
  .command('list')
  .action(async () => {
    const result = await pm.listPasswords();
    if (result.success && result.data.credentials.length > 0) {
      console.log('📋 Stored Credentials:');
      console.table(result.data.credentials);
      process.exit(0);
    } else if (result.success) {
      console.log('No credentials stored');
      process.exit(0);
    } else {
      console.error('❌ Failed to list credentials');
      process.exit(1);
    }
  });

program
  .command('delete')
  .option('-s, --service <name>', 'Service')
  .option('-u, --username <name>', 'Username')
  .action(async (opts) => {
    if (!opts.service || !opts.username) {
      console.error('❌      process.exit(1);
    }
    const result = await pm.gt = await pm.deletePassword(opts.service, opts.username);
    if (result.success) {
      console.log(`✅ Deleted: ${opts.service}/${opts.username}`);
      process.exit(0);
    } else {
      console.error(`❌ Failed: ${result.error}`);
      process.exit(1);
    }
  });

program
  .command('clear')
  .action(async () => {
    const result = await pm.clearVault();
    if (result.success) {
      console.log('✅ Vault cleared');
      process.exit(0);
    } else {
      console.error(`❌ Failed: ${result.error}`);
      process.exit(1);
    }
  });

program.parse(process.argv);
if (!process.argv.slice(2).length) program.outputHelp();
