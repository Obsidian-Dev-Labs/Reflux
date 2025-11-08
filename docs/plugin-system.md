# Plugin System

Learn about Reflux's powerful plugin architecture.

## Overview

The Reflux plugin system allows you to dynamically load and execute custom JavaScript code on specific websites. Plugins can run code in two contexts:

1. **Server-Side (Middleware)**: Transforms content before it reaches the browser
2. **Browser-Side (Injected)**: Executes in the page context after loading

## Plugin Structure

```javascript
{
  name: "com.example.plugin-name",  // Unique identifier
  sites: ["example.com"],            // Target sites
  function: "/* plugin code */"      // JavaScript code as string
}
```

### Name

Use reverse domain notation for uniqueness:
- `com.company.feature`
- `org.project.plugin`
- `io.github.username.tool`

### Sites

Array of site patterns to match:

```javascript
// Exact match
sites: ["example.com"]

// All sites
sites: ["*"]

// Multiple sites
sites: ["example.com", "test.com", "api.example.com"]

// Wildcard subdomain
sites: ["*.example.com"]

// Wildcard TLD
sites: ["example.*"]

// Complex patterns
sites: ["*.example.com", "test.org", "api.*"]
```

### Function Code

The function is JavaScript code as a string with special markers for different execution contexts.

## Code Execution Contexts

### Server-Side (Middleware)

Runs in the middleware layer, before the response reaches the browser.

```javascript
function: `
  // This code runs server-side
  // Available: body, url, headers
  
  if (body.includes('</head>')) {
    return body.replace('</head>', '<style>...</style></head>');
  }
  
  return body;  // Must return body
`
```

**Available Variables:**
- `body` (string): HTML content
- `url` (string): Target URL
- `headers` (object): Response headers

**Must Return:**
- The (possibly modified) `body` string

### Browser-Side (Injected)

Runs in the page context after the page loads.

```javascript
function: `
  /* @browser */
  // This code runs in the browser
  // Available: url, pluginName, all browser APIs
  
  console.log('Running on:', url);
  document.body.style.background = 'lightblue';
  /* @/browser */
`
```

**Available Variables:**
- `url` (string): Current page URL
- `pluginName` (string): Name of this plugin
- All standard browser APIs

**Markers:**
- Start: `/* @browser */`
- End: `/* @/browser */`

## Complete Plugin Example

```javascript
await api.addPlugin({
  name: "com.example.complete",
  sites: ["example.com"],
  function: `
    // Server-side: Inject CSS
    if (body.includes('</head>')) {
      const customCSS = \`
        <style>
          .reflux-enhanced {
            border: 2px solid blue;
            box-shadow: 0 0 10px rgba(0,0,255,0.3);
          }
        </style>
      \`;
      body = body.replace('</head>', customCSS + '</head>');
    }
    
    /* @browser */
    // Browser-side: Apply class to images
    console.log('Enhancing images on:', url);
    
    document.querySelectorAll('img').forEach(img => {
      img.classList.add('reflux-enhanced');
    });
    
    // Add event listener
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') {
        console.log('Image clicked:', e.target.src);
      }
    });
    /* @/browser */
    
    return body;
  `
});
```

## Plugin Lifecycle

### 1. Installation

```javascript
await api.addPlugin(plugin);
```

- Plugin code stored in IndexedDB
- Metadata (sites, name) stored separately
- Plugin disabled by default

### 2. Activation

```javascript
await api.enablePlugin("plugin-name");
```

- Plugin marked as enabled
- Loaded into middleware on next request

### 3. Execution

**Server-Side:**
1. Request matches site pattern
2. Response is HTML (`text/html`)
3. Plugin's server-side code executes
4. Modified response sent to browser

**Browser-Side:**
1. Page loads in browser
2. HTML contains injected script
3. Script executes in page context
4. Can interact with DOM and page APIs

### 4. Management

```javascript
// Disable temporarily
await api.disablePlugin("plugin-name");

// Re-enable
await api.enablePlugin("plugin-name");

// Update sites
await api.updatePluginSites("plugin-name", ["new-site.com"]);

// Remove completely
await api.removePlugin("plugin-name");
```

## Advanced Patterns

### Conditional Execution

```javascript
function: `
  const urlObj = new URL(url);
  
  // Only on specific paths
  if (urlObj.pathname.startsWith('/blog/')) {
    /* @browser */
    document.body.classList.add('blog-enhanced');
    /* @/browser */
  }
  
  // Only on specific query params
  if (urlObj.searchParams.has('debug')) {
    /* @browser */
    console.log('Debug mode active');
    /* @/browser */
  }
  
  return body;
`
```

### State Management

```javascript
function: `
  /* @browser */
  // Initialize state
  if (!window.pluginState) {
    window.pluginState = {
      visitCount: 0,
      lastVisit: null
    };
  }
  
  // Update state
  window.pluginState.visitCount++;
  window.pluginState.lastVisit = new Date();
  
  console.log('Visit #' + window.pluginState.visitCount);
  /* @/browser */
  
  return body;
`
```

### Storage Integration

```javascript
function: `
  /* @browser */
  // Load preferences
  const prefs = localStorage.getItem('plugin-prefs');
  const settings = prefs ? JSON.parse(prefs) : { theme: 'light' };
  
  // Apply preferences
  if (settings.theme === 'dark') {
    document.body.classList.add('dark-mode');
  }
  
  // Save preferences
  function savePrefs(newSettings) {
    localStorage.setItem('plugin-prefs', JSON.stringify(newSettings));
  }
  /* @/browser */
  
  return body;
`
```

### Multiple Injection Points

```javascript
function: `
  // Inject in head
  if (body.includes('</head>')) {
    body = body.replace('</head>', '<style>...</style></head>');
  }
  
  // Inject at start of body
  const bodyMatch = body.match(/<body[^>]*>/);
  if (bodyMatch) {
    body = body.replace(bodyMatch[0], bodyMatch[0] + '<div>...</div>');
  }
  
  // Inject before closing body
  if (body.includes('</body>')) {
    body = body.replace('</body>', '<script>...</script></body>');
  }
  
  return body;
`
```

## Plugin Templates

### Logger Plugin

```javascript
{
  name: "com.debug.logger",
  sites: ["*"],
  function: `
    /* @browser */
    console.log('[Plugin]', pluginName, 'active on', url);
    console.log('[Plugin] Document:', {
      title: document.title,
      readyState: document.readyState,
      elements: document.querySelectorAll('*').length
    });
    /* @/browser */
    
    return body;
  `
}
```

### CSS Injector

```javascript
{
  name: "com.style.injector",
  sites: ["example.com"],
  function: `
    if (body.includes('</head>')) {
      const css = \`
        <style>
          body { background: linear-gradient(#667eea, #764ba2); }
          * { transition: all 0.3s ease; }
        </style>
      \`;
      return body.replace('</head>', css + '</head>');
    }
    return body;
  `
}
```

### Banner Injector

```javascript
{
  name: "com.ui.banner",
  sites: ["*"],
  function: `
    /* @browser */
    const banner = document.createElement('div');
    banner.innerHTML = 'Enhanced by Reflux';
    banner.style.cssText = \`
      position: fixed; top: 0; left: 0; right: 0;
      background: #0066cc; color: white;
      text-align: center; padding: 8px;
      z-index: 999999; font-weight: bold;
    \`;
    document.body.appendChild(banner);
    document.body.style.marginTop = '32px';
    /* @/browser */
    
    return body;
  `
}
```

### Content Filter

```javascript
{
  name: "com.filter.content",
  sites: ["example.com"],
  function: `
    // Remove unwanted elements
    body = body.replace(/<div class="advertisement">.*?<\\/div>/gs, '');
    
    // Replace text
    body = body.replace(/old-word/gi, 'new-word');
    
    /* @browser */
    // Remove dynamically added ads
    const observer = new MutationObserver(() => {
      document.querySelectorAll('.advertisement').forEach(el => el.remove());
    });
    observer.observe(document.body, { childList: true, subtree: true });
    /* @/browser */
    
    return body;
  `
}
```

## Best Practices

### 1. Error Handling

```javascript
function: `
  try {
    // Server-side operations
    if (body.includes('</head>')) {
      body = body.replace('</head>', '<style>...</style></head>');
    }
  } catch (error) {
    console.error('[Plugin Error]', error);
  }
  
  /* @browser */
  try {
    // Browser-side operations
    document.querySelector('.target').style.color = 'red';
  } catch (error) {
    console.error('[Plugin Error]', error);
  }
  /* @/browser */
  
  return body;
`
```

### 2. Performance Optimization

```javascript
// ❌ Bad: Processes every response
sites: ["*"]
function: `/* heavy operation */`

// ✅ Good: Only targets specific sites
sites: ["target-site.com"]
function: `/* heavy operation */`
```

### 3. DOM Ready Check

```javascript
/* @browser */
function init() {
  // Your code here
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
/* @/browser */
```

### 4. Cleanup

```javascript
/* @browser */
// Store interval ID
const intervalId = setInterval(() => {
  // Periodic task
}, 1000);

// Cleanup on unload
window.addEventListener('unload', () => {
  clearInterval(intervalId);
});
/* @/browser */
```

## Plugin Distribution

### Exporting Plugins

```javascript
// Export plugin configuration
const myPlugin = {
  name: "com.example.myplugin",
  sites: ["example.com"],
  function: `/* code */`
};

console.log(JSON.stringify(myPlugin, null, 2));
```

### Importing Plugins

```javascript
// Import from JSON
const pluginConfig = JSON.parse(pluginJSON);
await api.addPlugin(pluginConfig);
await api.enablePlugin(pluginConfig.name);
```

### Sharing Plugins

Create a plugin package:

```javascript
// myplugin.json
{
  "name": "com.example.myplugin",
  "version": "1.0.0",
  "description": "My awesome plugin",
  "author": "Your Name",
  "sites": ["example.com"],
  "function": "/* plugin code */"
}
```

Install script:

```javascript
// install-plugin.js
async function installPlugin(pluginJson) {
  const plugin = JSON.parse(pluginJson);
  const api = new RefluxAPI();
  
  await api.addPlugin({
    name: plugin.name,
    sites: plugin.sites,
    function: plugin.function
  });
  
  await api.enablePlugin(plugin.name);
  console.log(`✅ Installed: ${plugin.name} v${plugin.version}`);
}
```

## Security Considerations

### Code Review

Always review plugin code before installation:

```javascript
const plugins = await api.listPlugins();
plugins.forEach(plugin => {
  console.log(`Plugin: ${plugin.name}`);
  console.log(`Code:\n${plugin.function}`);
});
```

### Sandboxing

Plugins run with full permissions:
- Server-side: Can modify any response
- Browser-side: Can access all page APIs

Only install trusted plugins.

### Validation

```javascript
function validatePlugin(plugin) {
  if (!plugin.name || typeof plugin.name !== 'string') {
    throw new Error('Invalid plugin name');
  }
  
  if (!Array.isArray(plugin.sites) || plugin.sites.length === 0) {
    throw new Error('Invalid sites array');
  }
  
  if (!plugin.function || typeof plugin.function !== 'string') {
    throw new Error('Invalid function code');
  }
  
  return true;
}

// Use before installation
if (validatePlugin(myPlugin)) {
  await api.addPlugin(myPlugin);
}
```

## Troubleshooting

### Plugin Not Running

1. Check if enabled:
   ```javascript
   const enabled = await api.getEnabledPlugins();
   console.log(enabled.includes("plugin-name"));
   ```

2. Verify site matching:
   ```javascript
   const plugin = (await api.listPlugins())
     .find(p => p.name === "plugin-name");
   console.log("Sites:", plugin.sites);
   console.log("Current URL:", window.location.href);
   ```

3. Check for errors:
   ```javascript
   // Open browser console and look for errors
   ```

### Plugin Not Modifying Content

1. Verify HTML structure:
   ```javascript
   // Check if target exists
   if (body.includes('</head>')) {
     console.log('Target found');
   }
   ```

2. Check content type:
   ```javascript
   // Only HTML responses are processed
   console.log(headers['content-type']);
   ```

## Next Steps

- [Examples](./examples.md) - Complete plugin examples
- [API Reference](./api-reference.md) - Full API documentation
- [HTML Modification](./html-modification.md) - Detailed HTML guide
