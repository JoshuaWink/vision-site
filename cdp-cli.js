#!/usr/bin/env node

/**
 * CDP CLI - Simple command-line interface for CDP bridge
 * Usage: node cdp-cli.js <command> [options]
 */

const CDP_BRIDGE = 'http://localhost:3001';

async function request(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${CDP_BRIDGE}${endpoint}`, options);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Request failed: ${error}`);
  }
  
  return await response.json();
}

async function connect(port = 9222) {
  console.log(`🔌 Connecting to browser on port ${port}...`);
  const result = await request('/api/cdp/connect', 'POST', { port });
  
  if (result.success) {
    console.log('✅ Connected!');
    console.log(`   Port: ${result.port}`);
    console.log(`   Host: ${result.host}`);
  } else {
    console.log('❌ Connection failed');
  }
  
  return result;
}

async function scan() {
  console.log('🔍 Scanning page for elements...');
  const result = await request('/api/cdp/scan', 'GET');
  
  console.log(`✅ Found ${result.elements.length} interactive elements\n`);
  
  result.elements.slice(0, 20).forEach(el => {
    const text = el.text ? ` "${el.text.substring(0, 40)}"` : '';
    console.log(`  #${el.id} - ${el.tag}${text}`);
    console.log(`      Position: (${el.x}, ${el.y}) ${el.w}x${el.h}`);
    console.log(`      Selector: ${el.selector}`);
    console.log('');
  });
  
  if (result.elements.length > 20) {
    console.log(`  ... and ${result.elements.length - 20} more elements`);
  }
  
  return result;
}

async function pageInfo() {
  console.log('📄 Getting page info...');
  const result = await request('/api/cdp/page-info', 'GET');
  
  console.log(`✅ Page Info:`);
  console.log(`   Title: ${result.title}`);
  console.log(`   URL: ${result.url}`);
  console.log(`   Dimensions: ${result.width}x${result.height}`);
  
  return result;
}

async function screenshot() {
  console.log('📸 Taking screenshot...');
  const result = await request('/api/cdp/screenshot', 'POST');
  
  console.log(`✅ Screenshot captured (${result.screenshot.length} bytes base64)`);
  console.log(`   Save with: echo "${result.screenshot}" | base64 -d > screenshot.png`);
  
  return result;
}

async function navigate(url) {
  console.log(`🌐 Navigating to ${url}...`);
  const result = await request('/api/cdp/navigate', 'POST', { url });
  
  console.log(`✅ Navigated to: ${result.url}`);
  
  return result;
}

async function disconnect() {
  console.log('🔌 Disconnecting...');
  const result = await request('/api/cdp/disconnect', 'POST');
  
  console.log('✅ Disconnected');
  
  return result;
}

async function health() {
  const result = await request('/api/health', 'GET');
  
  if (result.success) {
    console.log('✅ CDP Bridge is healthy');
    console.log(`   Connected: ${result.connected ? 'Yes' : 'No'}`);
  }
  
  return result;
}

// Main CLI
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  try {
    switch (command) {
      case 'connect':
        await connect(arg ? parseInt(arg) : 9222);
        break;
      
      case 'scan':
        await scan();
        break;
      
      case 'page':
      case 'info':
        await pageInfo();
        break;
      
      case 'screenshot':
      case 'shot':
        await screenshot();
        break;
      
      case 'navigate':
      case 'nav':
        if (!arg) {
          console.error('❌ URL required: node cdp-cli.js navigate <url>');
          process.exit(1);
        }
        await navigate(arg);
        break;
      
      case 'disconnect':
        await disconnect();
        break;
      
      case 'health':
        await health();
        break;
      
      default:
        console.log(`
CDP CLI - Simple command-line interface for CDP bridge

Usage:
  node cdp-cli.js <command> [options]

Commands:
  connect [port]       Connect to browser (default port: 9222)
  scan                 Scan page for interactive elements
  page | info          Get current page information
  screenshot | shot    Take screenshot of current page
  navigate <url>       Navigate to URL
  disconnect           Disconnect from browser
  health               Check CDP bridge health

Examples:
  node cdp-cli.js connect
  node cdp-cli.js scan
  node cdp-cli.js navigate https://github.com
  node cdp-cli.js screenshot
  node cdp-cli.js disconnect

Make sure CDP bridge is running:
  npm run cdp-bridge
`);
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
