import express from 'express';
import CDP from 'chrome-remote-interface';

const CHROME_HOST = process.env.CHROME_HOST || 'localhost';
const CHROME_PORT = parseInt(process.env.CHROME_PORT || '9222', 10);
const SERVER_PORT = process.env.BRIDGE_PORT || 3001;

const app = express();
app.use(express.json());
let cdpClient = null;

async function connectWithRetry(maxAttempts = 30) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[CDP] Connection attempt ${attempt}/${maxAttempts} to ${CHROME_HOST}:${CHROME_PORT}`);
      const client = await CDP({ host: CHROME_HOST, port: CHROME_PORT });
      const { Page, Runtime, DOM } = client;
      await Promise.all([Page.enable(), Runtime.enable(), DOM.enable()]);
      console.log(`[CDP] Successfully connected to Chrome at ${CHROME_HOST}:${CHROME_PORT}`);
      return client;
    } catch (err) {
      console.log(`[CDP] Connection attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Failed to connect to Chrome after 30 attempts');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    connected: cdpClient !== null, 
    chrome: { host: CHROME_HOST, port: CHROME_PORT } 
  });
});

// Navigate to URL
app.post('/api/cdp/navigate', async (req, res) => {
  try {
    if (!cdpClient) return res.status(503).json({ success: false, error: 'Not connected to Chrome' });
    const { url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'URL required' });
    
    await cdpClient.Page.navigate({ url });
    res.json({ success: true, message: `Navigated to ${url}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get page info
app.get('/api/cdp/page-info', async (req, res) => {
  try {
    if (!cdpClient) return res.status(503).json({ success: false, error: 'Not connected' });
    
    const navHistory = await cdpClient.Page.getNavigationHistory();
    const currentEntry = navHistory.entries[navHistory.currentIndex];
    
    const titleResult = await cdpClient.Runtime.evaluate({ expression: 'document.title' });
    const title = titleResult.result.value;
    
    const metricsResult = await cdpClient.Page.getLayoutMetrics();
    const width = metricsResult.cssLayoutViewport.clientWidth;
    const height = metricsResult.cssLayoutViewport.clientHeight;
    
    res.json({
      success: true,
      url: currentEntry.url,
      title,
      width,
      height
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Take screenshot
app.post('/api/cdp/screenshot', async (req, res) => {
  try {
    if (!cdpClient) return res.status(503).json({ success: false, error: 'Not connected' });
    
    const screenshot = await cdpClient.Page.captureScreenshot({ format: 'png' });
    const buffer = Buffer.from(screenshot.data, 'base64');
    
    res.setHeader('Content-Type', 'image/png');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scan page for elements (numbered for easy reference)
app.post('/api/cdp/scan', async (req, res) => {
  try {
    if (!cdpClient) return res.status(503).json({ success: false, error: 'Not connected' });
    
    const scanScript = `
      (() => {
        const INTERACTIVE_SELECTORS = [
          'button', 'a[href]', 'input', 'select', 'textarea',
          '[role="button"]', '[onclick]', '[tabindex]', 'video', 'audio',
          'img', '[contenteditable="true"]', 'label', '[type="submit"]',
          '[type="checkbox"]', '[type="radio"]'
        ];

        function isElementVisible(element) {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            bounds.width > 0 &&
            bounds.height > 0
          );
        }

        const elements = [];
        const selector = INTERACTIVE_SELECTORS.join(', ');
        const found = document.querySelectorAll(selector);
        
        let id = 0;
        found.forEach((element) => {
          if (!isElementVisible(element)) return;
          
          const rect = element.getBoundingClientRect();
          if (rect.width < 10 || rect.height < 10) return;
          
          id++;
          elements.push({
            id: id,
            x: Math.round(rect.left + window.scrollX),
            y: Math.round(rect.top + window.scrollY),
            w: Math.round(rect.width),
            h: Math.round(rect.height),
            tag: element.tagName.toLowerCase(),
            text: element.textContent?.trim().substring(0, 50) || '',
            href: element.href || undefined,
            type: element.type || undefined
          });
        });
        
        return elements;
      })()
    `;
    
    const result = await cdpClient.Runtime.evaluate({
      expression: scanScript,
      returnByValue: true
    });
    
    res.json({ 
      success: true, 
      elements: result.result?.value || [] 
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Click element by ID (from scan results)
app.post('/api/cdp/click', async (req, res) => {
  try {
    const { elementId } = req.body;
    if (!elementId) {
      return res.status(400).json({ success: false, error: 'elementId required' });
    }
    
    if (!cdpClient) {
      return res.status(503).json({ success: false, error: 'Not connected' });
    }
    
    const clickScript = `
      (() => {
        const INTERACTIVE_SELECTORS = [
          'button', 'a[href]', 'input', 'select', 'textarea',
          '[role="button"]', '[onclick]', '[tabindex]', 'video', 'audio',
          'img', '[contenteditable="true"]', 'label', '[type="submit"]',
          '[type="checkbox"]', '[type="radio"]'
        ];
        
        function isElementVisible(element) {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && bounds.width > 0 && bounds.height > 0;
        }
        
        const found = document.querySelectorAll(INTERACTIVE_SELECTORS.join(','));
        let id = 0;
        for (let el of found) {
          if (!isElementVisible(el)) continue;
          const bounds = el.getBoundingClientRect();
          if (bounds.width < 10 || bounds.height < 10) continue;
          
          id++;
          if (id === ${elementId}) {
            el.click();
            return { success: true, clicked: el.tagName, text: el.textContent?.substring(0, 50) };
          }
        }
        return { success: false, error: 'Element not found' };
      })()
    `;
    
    const result = await cdpClient.Runtime.evaluate({
      expression: clickScript,
      returnByValue: true
    });
    
    res.json(result.result?.value || { success: false, error: 'evaluation failed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fill form field by ID
app.post('/api/cdp/fill', async (req, res) => {
  try {
    const { elementId, value } = req.body;
    if (!elementId || value === undefined) {
      return res.status(400).json({ success: false, error: 'elementId and value required' });
    }
    
    if (!cdpClient) {
      return res.status(503).json({ success: false, error: 'Not connected' });
    }
    
    const fillValue = String(value).replace(/`/g, '\\`').replace(/\$/g, '\\$');
    
    const fillScript = `
      (() => {
        const INTERACTIVE_SELECTORS = [
          'button', 'a[href]', 'input', 'select', 'textarea',
          '[role="button"]', '[onclick]', '[tabindex]', 'video', 'audio',
          'img', '[contenteditable="true"]', 'label', '[type="submit"]',
          '[type="checkbox"]', '[type="radio"]'
        ];
        
        function isElementVisible(element) {
          const style = window.getComputedStyle(element);
          const bounds = element.getBoundingClientRect();
          return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && bounds.width > 0 && bounds.height > 0;
        }
        
        const found = document.querySelectorAll(INTERACTIVE_SELECTORS.join(','));
        let id = 0;
        for (let el of found) {
          if (!isElementVisible(el)) continue;
          const bounds = el.getBoundingClientRect();
          if (bounds.width < 10 || bounds.height < 10) continue;
          
          id++;
          if (id === ${elementId}) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
              el.focus();
              el.value = \`${fillValue}\`;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return { success: true, filled: el.tagName, value: el.value };
            }
            return { success: false, error: 'Element is not a form input' };
          }
        }
        return { success: false, error: 'Element not found' };
      })()
    `;
    
    const result = await cdpClient.Runtime.evaluate({
      expression: fillScript,
      returnByValue: true
    });
    
    res.json(result.result?.value || { success: false, error: 'evaluation failed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Execute JavaScript in browser context
app.post('/api/cdp/execute', async (req, res) => {
  try {
    const { script } = req.body;
    if (!script) {
      return res.status(400).json({ success: false, error: 'script required' });
    }
    
    if (!cdpClient) {
      return res.status(503).json({ success: false, error: 'browser not connected' });
    }
    
    const { Runtime } = cdpClient;
    const result = await Runtime.evaluate({
      expression: script,
      returnByValue: true
    });
    
    res.json({
      success: !result.exceptionDetails,
      result: result.result?.value,
      error: result.exceptionDetails?.text
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Initialize server
async function start() {
  try {
    console.log(`[Server] CDP Bridge listening on port ${SERVER_PORT}`);
    console.log(`[Server] Environment: CHROME_HOST=${CHROME_HOST}, CHROME_PORT=${CHROME_PORT}`);
    
    cdpClient = await connectWithRetry();
    
    app.listen(SERVER_PORT, () => {
      console.log(`✓ Bridge ready on http://localhost:${SERVER_PORT}`);
    });
  } catch (err) {
    console.error('[Server] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
