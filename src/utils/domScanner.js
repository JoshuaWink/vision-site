// DOM Scanner - Extract interactive elements from a webpage
const INTERACTIVE_SELECTORS = [
  'button', 'a[href]', 'input', 'select', 'textarea',
  '[role="button"]', '[onclick]', '[tabindex]', 'video', 'audio',
  'img', '[contenteditable="true"]', 'label', '[type="submit"]',
  '[type="checkbox"]', '[type="radio"]'
];

function getElementBounds(element) {
  const rect = element.getBoundingClientRect();
  return {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    w: Math.round(rect.width),
    h: Math.round(rect.height)
  };
}

function getElementInfo(element) {
  const tagName = element.tagName.toLowerCase();
  const info = {
    tag: tagName,
    type: element.type || null,
    text: element.textContent?.trim().substring(0, 50) || '',
    placeholder: element.placeholder || null,
    value: element.value || null,
    href: element.href || null,
    id: element.id || null,
    className: element.className || null,
    ariaLabel: element.getAttribute('aria-label') || null,
    role: element.getAttribute('role') || null,
    selector: getSelector(element)
  };
  
  return Object.fromEntries(
    Object.entries(info).filter(([_, v]) => v !== null && v !== '')
  );
}

function getSelector(element) {
  if (element.id) return '#' + element.id;
  if (element.className) {
    const classes = element.className.split(' ').filter(c => c).slice(0, 2).join('.');
    return element.tagName.toLowerCase() + '.' + classes;
  }
  return element.tagName.toLowerCase();
}

function isElementVisible(element) {
  const style = window.getComputedStyle(element);
  const bounds = element.getBoundingClientRect();
  
  return (
    style.display !== 'none' &    type: elemenbility !== 'hidden' &&
    style.opacity !== '0' &&
    bounds.width > 0 &&
    bounds.height > 0
  );
}

function scanPage() {
  const elements = [];
  const selector = INTERACTIVE_SELECTORS.join(', ');
  const found = document.querySelectorAll(selector);
  
  found.forEach((element, index) => {
    if (!isElementVisible(element)) return;
    
    const bounds = getElementBounds(element);
    if (bounds.w < 10 || bounds.h < 10) return;
    
    elements.push({
      id: index + 1,
      ...bounds,
      ...getElementInfo(element)
    });
  });
  
  return elements;
}

export default scanPage;
