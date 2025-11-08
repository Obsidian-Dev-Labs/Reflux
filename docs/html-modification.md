# HTML Modification Guide

Learn how to modify HTML content on websites using Reflux plugins.

## Overview

Reflux plugins can modify HTML in two ways:

1. **Browser-Side**: Inject JavaScript that runs in the page context
2. **Server-Side**: Transform HTML before it reaches the browser

## Browser-Side HTML Modification

Browser-side code runs in the page context and can interact with the DOM.

### Basic DOM Manipulation

```javascript
await api.addPlugin({
  name: "com.example.dom-modifier",
  sites: ["example.com"],
  function: `
    /* @browser */
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', modifyPage);
    } else {
      modifyPage();
    }
    
    function modifyPage() {
      // Change all h1 elements
      document.querySelectorAll('h1').forEach(h1 => {
        h1.style.color = 'red';
        h1.textContent = '🚀 ' + h1.textContent;
      });
    }
    /* @/browser */
  `
});
```

### Adding Visual Elements

```javascript
await api.addPlugin({
  name: "com.example.banner",
  sites: ["*"],
  function: `
    /* @browser */
    const banner = document.createElement('div');
    banner.innerHTML = 'Enhanced by Reflux';
    banner.style.cssText = \`
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(90deg, #667eea, #764ba2);
      color: white;
      text-align: center;
      padding: 10px;
      z-index: 999999;
      font-weight: bold;
    \`;
    document.body.appendChild(banner);
    document.body.style.marginTop = '40px';
    /* @/browser */
  `
});
```

### Modifying Existing Elements

```javascript
await api.addPlugin({
  name: "com.example.link-modifier",
  sites: ["example.com"],
  function: `
    /* @browser */
    // Add target="_blank" to all external links
    document.querySelectorAll('a[href^="http"]').forEach(link => {
      link.setAttribute('target', '_blank');
      link.style.color = '#0066cc';
    });
    
    // Add custom class to all images
    document.querySelectorAll('img').forEach(img => {
      img.classList.add('reflux-enhanced');
      img.style.border = '2px solid #0066cc';
    });
    /* @/browser */
  `
});
```

### Removing Elements

```javascript
await api.addPlugin({
  name: "com.example.ad-blocker",
  sites: ["example.com"],
  function: `
    /* @browser */
    // Remove elements by selector
    const selectorsToRemove = [
      '.advertisement',
      '#ad-container',
      '[class*="sponsored"]'
    ];
    
    selectorsToRemove.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => el.remove());
    });
    /* @/browser */
  `
});
```

## Server-Side HTML Transformation

Server-side code transforms HTML before it reaches the browser. This is processed in the middleware layer.

### Basic HTML Injection

```javascript
await api.addPlugin({
  name: "com.example.title-modifier",
  sites: ["example.com"],
  function: `
    // Modify the title tag
    if (body.includes('<title>')) {
      return body.replace('<title>', '<title>[MODIFIED] ');
    }
    return body;
  `
});
```

### Injecting Custom CSS

```javascript
await api.addPlugin({
  name: "com.example.custom-css",
  sites: ["example.com"],
  function: `
    if (body.includes('</head>')) {
      const customCSS = \`
        <style>
          body {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .custom-theme {
            filter: brightness(1.1);
          }
        </style>
      \`;
      return body.replace('</head>', customCSS + '</head>');
    }
    return body;
  `
});
```

### Injecting JavaScript Libraries

```javascript
await api.addPlugin({
  name: "com.example.jquery-injector",
  sites: ["example.com"],
  function: `
    if (body.includes('</head>')) {
      const script = '<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>';
      return body.replace('</head>', script + '</head>');
    }
    return body;
  `
});
```

### Complex HTML Transformation

```javascript
await api.addPlugin({
  name: "com.example.advanced-modifier",
  sites: ["github.com"],
  function: `
    if (!body.includes('</head>')) return body;
    
    // Add custom CSS
    const customCSS = \`
      <style>
        .reflux-sidebar {
          position: fixed;
          right: 0;
          top: 0;
          width: 250px;
          height: 100vh;
          background: #2d3748;
          color: white;
          padding: 20px;
          z-index: 999999;
        }
        body { margin-right: 250px !important; }
      </style>
    \`;
    
    // Add custom HTML widget
    const widget = \`
      <div class="reflux-sidebar">
        <h3>Reflux Tools</h3>
        <p>Custom sidebar content</p>
      </div>
    \`;
    
    let modifiedBody = body.replace('</head>', customCSS + '</head>');
    
    // Inject widget after body tag
    const bodyMatch = modifiedBody.match(/<body[^>]*>/);
    if (bodyMatch) {
      modifiedBody = modifiedBody.replace(
        bodyMatch[0], 
        bodyMatch[0] + widget
      );
    }
    
    return modifiedBody;
  `
});
```

## Combining Browser and Server-Side

You can use both approaches in the same plugin:

```javascript
await api.addPlugin({
  name: "com.example.hybrid",
  sites: ["example.com"],
  function: `
    // Server-side: Inject CSS into head
    if (body.includes('</head>')) {
      const css = '<style>.enhanced { border: 2px solid blue; }</style>';
      body = body.replace('</head>', css + '</head>');
    }
    
    /* @browser */
    // Browser-side: Apply the class dynamically
    document.querySelectorAll('img').forEach(img => {
      img.classList.add('enhanced');
    });
    
    // Add interaction
    document.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', (e) => {
        console.log('Link clicked:', e.target.href);
      });
    });
    /* @/browser */
    
    return body;
  `
});
```

## Advanced Patterns

### Mutation Observer for Dynamic Content

```javascript
await api.addPlugin({
  name: "com.example.dynamic-observer",
  sites: ["*"],
  function: `
    /* @browser */
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) { // Element node
            if (node.classList && node.classList.contains('dynamic-content')) {
              node.style.background = 'yellow';
            }
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    /* @/browser */
  `
});
```

### Content Replacement with Regex

```javascript
await api.addPlugin({
  name: "com.example.text-replacer",
  sites: ["example.com"],
  function: `
    // Replace specific words in the entire HTML
    body = body.replace(/\\bfoo\\b/gi, 'bar');
    
    // Replace patterns in text content
    body = body.replace(
      /(\\d{3})-(\\d{3})-(\\d{4})/g,
      '<a href="tel:$1$2$3">$1-$2-$3</a>'
    );
    
    return body;
  `
});
```

### Conditional Modifications

```javascript
await api.addPlugin({
  name: "com.example.conditional",
  sites: ["example.com"],
  function: `
    // Check URL for specific paths
    const urlPath = new URL(url).pathname;
    
    if (urlPath.startsWith('/blog/')) {
      // Only modify blog pages
      if (body.includes('</head>')) {
        const blogCSS = '<style>.blog-post { max-width: 800px; }</style>';
        body = body.replace('</head>', blogCSS + '</head>');
      }
    }
    
    /* @browser */
    // Browser-side conditional logic
    if (window.location.pathname === '/special-page') {
      document.body.style.background = 'lightblue';
    }
    /* @/browser */
    
    return body;
  `
});
```

## Best Practices

### 1. Performance Optimization

```javascript
// ❌ Bad: Query DOM repeatedly
for (let i = 0; i < 100; i++) {
  document.querySelector('.item').style.color = 'red';
}

// ✅ Good: Query once, iterate efficiently
const items = document.querySelectorAll('.item');
items.forEach(item => item.style.color = 'red');
```

### 2. Error Handling

```javascript
await api.addPlugin({
  name: "com.example.safe-modifier",
  sites: ["*"],
  function: `
    /* @browser */
    try {
      // Your modification code
      document.querySelector('.header').style.color = 'blue';
    } catch (error) {
      console.error('Plugin error:', error);
    }
    /* @/browser */
  `
});
```

### 3. Wait for DOM

```javascript
/* @browser */
function safeModify() {
  // Your code here
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeModify);
} else {
  safeModify();
}
/* @/browser */
```

### 4. Check Before Modifying

```javascript
// Server-side: Always check if content exists
if (body.includes('</head>')) {
  body = body.replace('</head>', '<style>...</style></head>');
}

/* @browser */
// Browser-side: Check elements exist
const header = document.querySelector('.header');
if (header) {
  header.style.color = 'blue';
}
/* @/browser */
```

## Common Use Cases

### Dark Mode Injector

```javascript
await api.addPlugin({
  name: "com.example.dark-mode",
  sites: ["*"],
  function: `
    if (body.includes('</head>')) {
      const darkMode = \`
        <style>
          body {
            background: #1a1a1a !important;
            color: #e0e0e0 !important;
          }
          a { color: #4a9eff !important; }
          img { filter: brightness(0.8); }
        </style>
      \`;
      return body.replace('</head>', darkMode + '</head>');
    }
    return body;
  `
});
```

### Custom Toolbar

```javascript
await api.addPlugin({
  name: "com.example.toolbar",
  sites: ["*"],
  function: `
    /* @browser */
    const toolbar = document.createElement('div');
    toolbar.innerHTML = \`
      <button onclick="alert('Button 1')">Tool 1</button>
      <button onclick="alert('Button 2')">Tool 2</button>
    \`;
    toolbar.style.cssText = \`
      position: fixed; bottom: 0; left: 0; right: 0;
      background: #333; color: white; padding: 10px;
      display: flex; gap: 10px; justify-content: center;
      z-index: 999999;
    \`;
    document.body.appendChild(toolbar);
    /* @/browser */
  `
});
```

## Next Steps

- [WebSocket Middleware](./websocket-middleware.md) - Intercept WebSocket traffic
- [Request/Response Middleware](./request-response-middleware.md) - Modify HTTP requests
- [Examples](./examples.md) - More complete plugin examples
