# Reflux Middleware Usage Guide

This guide explains how to use the updated Reflux middleware system that now supports request and response modification.

## Overview

The Reflux middleware system allows you to intercept and modify HTTP requests and responses as they pass through the transport layer. The updated system provides full control over both requests and responses, enabling powerful customization capabilities.

## Basic Setup

### 1. Initialize the Transport

```javascript
import RefluxTransport from './src/index.js';

const transport = new RefluxTransport({
  transport: '/path/to/your/transport.js',
  middleware: [], // Your middleware array
  controlPort: control.port1 // Optional: for dynamic middleware registration
});

await transport.init();
```

### 2. Create Middleware

Middleware are JavaScript objects that implement one or more of the following methods:

- `onRequest`: Intercepts and modifies outgoing requests
- `onResponse`: Intercepts and modifies incoming responses
- `modifyWebSocketMessage`: Modifies WebSocket messages (unchanged from previous version)

## Middleware Structure

```typescript
type MiddlewareFunction = {
  id?: string;                                    // Unique identifier
  enabled?: boolean | (() => boolean);           // Enable/disable condition
  onRequest?: (req: RequestContext, next: (modifiedReq?: Partial<RequestContext>) => Promise<RequestContext>) => Promise<RequestContext | void>;
  onResponse?: (ctx: ResponseContext, next: (modifiedResp?: Partial<TransferrableResponse>) => Promise<TransferrableResponse>) => Promise<TransferrableResponse | void>;
  modifyWebSocketMessage?: (data: string | Blob | ArrayBuffer, direction: "send" | "receive") => Promise<string | Blob | ArrayBuffer> | string | Blob | ArrayBuffer;
};
```

## Request Modification

### Basic Request Modifier

```javascript
const requestModifier = {
  id: "request-modifier",
  onRequest: async (req, next) => {
    console.log("Original request:", req);
    
    // Modify the request
    const modifiedReq = {
      headers: { 
        ...req.headers, 
        "X-Custom-Header": "modified-by-middleware",
        "User-Agent": "Reflux-Middleware/1.0"
      },
      method: "GET" // Force GET method
    };
    
    // Pass modifications to next middleware
    const finalReq = await next(modifiedReq);
    console.log("Final request:", finalReq);
    return finalReq;
  }
};
```

### Conditional Request Modification

```javascript
const conditionalRequestModifier = {
  id: "conditional-request-modifier",
  onRequest: async (req, next) => {
    // Only modify requests to specific domains
    if (req.remote.hostname.includes("example.com")) {
      const modifiedReq = {
        headers: { ...req.headers, "X-Targeted-Modification": "true" }
      };
      return await next(modifiedReq);
    }
    
    // For other domains, just pass through
    return await next();
  }
};
```

## Response Modification

### Basic Response Modifier

```javascript
const responseModifier = {
  id: "response-modifier",
  onResponse: async (ctx, next) => {
    // Get the response from next middleware
    const response = await next();
    
    // Modify the response
    const modifiedResponse = {
      ...response,
      headers: { 
        ...response.headers, 
        "X-Response-Modified": "true",
        "X-Middleware-Version": "2.0"
      }
    };
    
    return modifiedResponse;
  }
};
```

### HTML Content Injection

```javascript
const contentInjector = {
  id: "content-injector",
  onResponse: async (ctx, next) => {
    const response = await next();
    
    // Only process HTML responses
    if (response.headers["content-type"]?.includes("text/html")) {
      let body = response.body;
      if (typeof body !== "string") {
        body = await response.body.text();
      }
      
      // Inject a script tag
      const scriptInjection = 
        '<script>' +
        'console.log("Injected by Reflux Middleware!");' +
        'document.body.style.border = "5px solid red";' +
        '</script>';
      
      const modifiedBody = body.replace("</head>", scriptInjection + "</head>");
      
      return {
        ...response,
        body: modifiedBody,
        headers: { 
          ...response.headers, 
          "content-length": String(modifiedBody.length),
          "X-Content-Injected": "true"
        }
      };
    }
    
    return response;
  }
};
```

## Conditional Middleware

### Enable/Disable Based on Conditions

```javascript
const conditionalMiddleware = {
  id: "conditional-middleware",
  enabled: () => {
    // Only enable for specific domains
    return window.location.hostname === "localhost";
  },
  onRequest: async (req, next) => {
    // Your middleware logic here
    return await next();
  }
};
```

### Dynamic Enable/Disable

```javascript
const dynamicMiddleware = {
  id: "dynamic-middleware",
  enabled: false, // Start disabled
  onRequest: async (req, next) => {
    console.log("Dynamic middleware processing request");
    return await next();
  }
};

// Later, enable it dynamically
dynamicMiddleware.enabled = true;
```

## Dynamic Middleware Registration

### Using Control Port

```javascript
// Create a MessageChannel for control
const control = new MessageChannel();

// Initialize transport with control port
const transport = new RefluxTransport({
  transport: '/path/to/transport.js',
  controlPort: control.port1
});

// Register middleware dynamically
control.port2.postMessage({
  type: "addMiddleware",
  id: "dynamic-middleware",
  fn: `(${dynamicMiddleware.toString()})()`
});

// Enable/disable middleware
control.port2.postMessage({
  type: "setMiddlewareEnabled",
  id: "dynamic-middleware",
  enabled: true
});
```

### Dynamic Middleware Function

```javascript
function createDynamicMiddleware(config) {
  return {
    id: config.id || "dynamic-middleware",
    onRequest: async (req, next) => {
      console.log(`Dynamic middleware ${config.id} processing request to:`, req.remote.hostname);
      
      if (config.modifyHeaders) {
        const modifiedReq = {
          headers: { ...req.headers, ...config.modifyHeaders }
        };
        return await next(modifiedReq);
      }
      
      return await next();
    }
  };
}

// Register it
control.port2.postMessage({
  type: "addMiddleware",
  id: "custom-dynamic",
  fn: `(${createDynamicMiddleware.toString()})({ id: "custom", modifyHeaders: { "X-Dynamic": "true" } })`
});
```

## Advanced Examples

### Request/Response Chain

```javascript
const chainMiddleware = {
  id: "chain-middleware",
  onRequest: async (req, next) => {
    console.log("Chain middleware - request phase");
    
    // Modify request
    const modifiedReq = {
      headers: { ...req.headers, "X-Chain-Request": "modified" }
    };
    
    const finalReq = await next(modifiedReq);
    console.log("Chain middleware - request phase complete");
    return finalReq;
  },
  onResponse: async (ctx, next) => {
    console.log("Chain middleware - response phase");
    
    const response = await next();
    
    // Modify response
    const modifiedResponse = {
      ...response,
      headers: { ...response.headers, "X-Chain-Response": "modified" }
    };
    
    console.log("Chain middleware - response phase complete");
    return modifiedResponse;
  }
};
```

### Content Rewriting

```javascript
const contentRewriter = {
  id: "content-rewriter",
  onResponse: async (ctx, next) => {
    const response = await next();
    
    if (response.headers["content-type"]?.includes("text/html")) {
      let body = response.body;
      if (typeof body !== "string") {
        body = await response.body.text();
      }
      
      // Replace all instances of a word
      const modifiedBody = body.replace(/example\.com/g, "modified-example.com");
      
      return {
        ...response,
        body: modifiedBody,
        headers: { 
          ...response.headers, 
          "content-length": String(modifiedBody.length)
        }
      };
    }
    
    return response;
  }
};
```

## Best Practices

1. **Always handle errors**: Wrap your middleware logic in try-catch blocks
2. **Check content types**: Verify content types before modifying response bodies
3. **Preserve headers**: Use spread operator to maintain existing headers
4. **Update content-length**: When modifying response bodies, update the content-length header
5. **Use meaningful IDs**: Give your middleware descriptive IDs for easier debugging
6. **Test thoroughly**: Middleware can affect all requests, so test with various scenarios

## Error Handling

```javascript
const safeMiddleware = {
  id: "safe-middleware",
  onRequest: async (req, next) => {
    try {
      // Your middleware logic
      return await next();
    } catch (error) {
      console.error("Middleware error:", error);
      // Fall back to original request
      return await next();
    }
  },
  onResponse: async (ctx, next) => {
    try {
      const response = await next();
      // Your response modification logic
      return response;
    } catch (error) {
      console.error("Response middleware error:", error);
      // Return original response
      return await next();
    }
  }
};
```

## Integration with Existing Code

The updated middleware system is backward compatible with existing middleware that don't use the new modification features. Existing middleware will continue to work as before, but now you have the option to use the new modification capabilities.

For examples and a working demo, see `demo/public/middleware-examples.html`.

# Reflux Plugin System

The Reflux Plugin System provides a dynamic way to modify web content and behavior through a simple plugin interface. Plugins are executed in a safe context and can modify HTML content, inject scripts, and perform other web modifications.

## Plugin Structure

A Reflux plugin follows this simple structure:

```javascript
{
  function: `console.log('Example code.')`,
  name: 'com.example', // Unique plugin identifier
  sites: ['*'] // Array of sites where plugin should run
}
```

### Plugin Properties

- **`function`** (string): JavaScript code that will be executed. The function can contain:
  - **Server-side code**: Runs during response processing, receives `body`, `url`, `headers` parameters
  - **Browser-side code**: Runs in the browser, wrapped in special comment blocks
  
- **`name`** (string): A unique identifier for the plugin. Recommended format: `com.yourname.pluginname`

- **`sites`** (array): Specifies which sites the plugin should run on:
  - `['*']`: Run on all sites
  - `['example.com']`: Run only on example.com
  - `['*.google.com']`: Run on all Google subdomains
  - `['github.com', 'gitlab.com']`: Run on multiple specific sites

## Browser-Side vs Server-Side Execution

### Browser-Side Code
Use special comment markers to inject JavaScript that runs in the browser:

```javascript
{
  function: `
    /* @browser */
    console.log('This runs in the browser!');
    alert('Hello from the browser!');
    document.body.style.background = 'red';
    /* @/browser */
  `,
  name: 'com.example.browser-plugin',
  sites: ['*']
}
```

### Server-Side Code
Code outside the browser markers runs during response processing:

```javascript
{
  function: `
    // This runs on the server during response processing
    if (body.includes('<title>')) {
      return body.replace('<title>', '<title>[Modified] ');
    }
    return body;
  `,
  name: 'com.example.server-plugin',
  sites: ['*']
}
```

### Mixed Mode
You can combine both browser-side and server-side code:

```javascript
{
  function: `
    // Server-side: Modify the HTML structure
    let modifiedBody = body.replace('</head>', '<meta name="plugin" content="active"></head>');
    
    /* @browser */
    // Browser-side: Add interactive features
    console.log('Plugin active on:', url);
    const banner = document.createElement('div');
    banner.textContent = 'Enhanced by ' + pluginName;
    document.body.appendChild(banner);
    /* @/browser */
    
    return modifiedBody;
  `,
  name: 'com.example.mixed-plugin',
  sites: ['*']
}
```

## Plugin API Methods

### Adding Plugins

```javascript
// Add a plugin
await api.addPlugin({
  function: `
    if (body.includes('<title>')) {
      return body.replace('<title>', '<title>[MODIFIED] ');
    }
    return body;
  `,
  name: 'com.example.title-modifier',
  sites: ['example.com']
});
```

### Removing Plugins

```javascript
// Remove a plugin by name
await api.removePlugin('com.example.title-modifier');
```

### Listing Plugins

```javascript
// Get all loaded plugins
const plugins = await api.listPlugins();
console.log(plugins);
// Output: [{ name: 'com.example.title-modifier', sites: ['example.com'], enabled: true }]
```

## Plugin Examples

### 1. Browser-Side Logger Plugin

```javascript
const loggerPlugin = {
  function: `
    /* @browser */
    console.log('📝 Page loaded:', url);
    console.log('📝 Plugin:', pluginName);
    console.log('📝 User Agent:', navigator.userAgent);
    /* @/browser */
  `,
  name: 'com.example.logger',
  sites: ['*']
};

await api.addPlugin(loggerPlugin);
```

### 2. Visual Enhancement Plugin

```javascript
const visualPlugin = {
  function: `
    /* @browser */
    // Add a floating indicator
    const indicator = document.createElement('div');
    indicator.textContent = '🚀 Enhanced by Reflux';
    indicator.style.cssText = 'position: fixed; top: 10px; right: 10px; background: #6366f1; color: white; padding: 8px; border-radius: 4px; z-index: 999999;';
    
    function addIndicator() {
      document.body.appendChild(indicator);
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addIndicator);
    } else {
      addIndicator();
    }
    /* @/browser */
  `,
  name: 'com.example.visual-enhancer',
  sites: ['example.com']
};

await api.addPlugin(visualPlugin);
```

### 3. Content Modifier Plugin

```javascript
const contentModifier = {
  function: `
    // Server-side: Replace all instances of "Hello" with "Hi"
    if (body.includes('Hello')) {
      return body.replace(/Hello/g, 'Hi');
    }
    return body;
  `,
  name: 'com.example.hello-replacer',
  sites: ['example.com']
};

await api.addPlugin(contentModifier);
```

### 4. Advanced Mixed Plugin

```javascript
const advancedPlugin = {
  function: `
    // Server-side: Add custom CSS to head
    let modifiedBody = body;
    if (body.includes('</head>')) {
      modifiedBody = body.replace('</head>', '<style>.reflux-enhanced { border: 2px solid #6366f1; }</style></head>');
    }
    
    /* @browser */
    // Browser-side: Add interactive features
    console.log('🔧 Advanced plugin loaded on:', url);
    
    function enhancePage() {
      // Add class to all paragraphs
      const paragraphs = document.querySelectorAll('p');
      paragraphs.forEach(p => p.classList.add('reflux-enhanced'));
      
      // Add click handler to enhanced elements
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('reflux-enhanced')) {
          console.log('🔧 Clicked enhanced element:', e.target.textContent.substring(0, 50));
        }
      });
      
      console.log('🔧 Enhanced', paragraphs.length, 'paragraphs');
    }
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', enhancePage);
    } else {
      enhancePage();
    }
    /* @/browser */
    
    return modifiedBody;
  `,
  name: 'com.example.advanced-enhancer',
  sites: ['*.example.com']
};

await api.addPlugin(advancedPlugin);
```

### 5. CSS Injection Plugin

```javascript
const cssInjector = {
  function: `
    if (body.includes('</head>')) {
      const customCSS = \`
        <style>
          body { background-color: #f0f0f0 !important; }
          .highlight { background-color: yellow; }
        </style>
      \`;
      return body.replace('</head>', customCSS + '</head>');
    }
    return body;
  `,
  name: 'com.example.css-injector',
  sites: ['github.com']
};

await api.addPlugin(cssInjector);
```

### 6. Social Media Enhancer

```javascript
const socialEnhancer = {
  function: `
    // Add custom enhancements to social media sites
    if (body.includes('</head>')) {
      const enhancement = \`
        <style>
          .social-enhancement {
            position: fixed;
            top: 10px;
            right: 10px;
            background: #4CAF50;
            color: white;
            padding: 10px;
            border-radius: 5px;
            z-index: 9999;
          }
        </style>
        <div class="social-enhancement">Enhanced by Reflux!</div>
      \`;
      return body.replace('</head>', '</head>' + enhancement);
    }
    return body;
  `,
  name: 'com.example.social-enhancer',
  sites: ['*twitter.com', '*facebook.com', '*instagram.com']
};

await api.addPlugin(socialEnhancer);
```

## Site Matching Patterns

The `sites` array supports various matching patterns:

- **Exact match**: `'example.com'` - matches only example.com
- **Wildcard match**: `'*.example.com'` - matches all subdomains of example.com
- **Global match**: `'*'` - matches all sites
- **Multiple sites**: `['site1.com', 'site2.com']` - matches multiple specific sites
- **Mixed patterns**: `['github.com', '*.google.com', '*stackoverflow.com']`

## Plugin Security Considerations

- Plugins run in a controlled context but can execute arbitrary JavaScript
- Always validate plugin sources before adding them
- Be cautious with plugins that manipulate sensitive sites
- Plugins can access the full page content and headers

## Plugin Best Practices

1. **Use descriptive names**: Follow the reverse domain naming convention (e.g., `com.yourname.pluginname`)
2. **Return modified content**: Always return the modified `body` or the original if no changes are made
3. **Handle errors gracefully**: Wrap potentially failing operations in try-catch blocks
4. **Be specific with sites**: Only target the sites your plugin is designed for
5. **Test thoroughly**: Test your plugins on the target sites before deployment

## Plugin Error Handling

If a plugin encounters an error during execution, it will be logged to the console but won't break the page loading:

```javascript
const errorPronePlugin = {
  function: `
    try {
      // Your plugin code here
      return body.replace('old', 'new');
    } catch (error) {
      console.error('Plugin error:', error);
      return body; // Return original content on error
    }
  `,
  name: 'com.example.safe-plugin',
  sites: ['example.com']
};
```

## Complete Plugin Usage Example

```javascript
// Initialize RefluxAPI
const api = new RefluxAPI(controlPort);

// Add multiple plugins
const plugins = [
  {
    function: `
      /* @browser */
      console.log('Loaded:', url);
      /* @/browser */
    `,
    name: 'com.example.logger',
    sites: ['*']
  },
  {
    function: `
      if (body.includes('<h1>')) {
        return body.replace('<h1>', '<h1 style="color: red;">');
      }
      return body;
    `,
    name: 'com.example.red-headers',
    sites: ['example.com']
  }
];

// Add all plugins
for (const plugin of plugins) {
  try {
    await api.addPlugin(plugin);
    console.log(`Added plugin: ${plugin.name}`);
  } catch (error) {
    console.error(`Failed to add plugin ${plugin.name}:`, error);
  }
}

// List loaded plugins
const loadedPlugins = await api.listPlugins();
console.log('Loaded plugins:', loadedPlugins);

// Remove a plugin later
// await api.removePlugin('com.example.logger');
```

The plugin system provides a powerful and flexible way to customize web browsing experiences while maintaining security and performance.

# Reflux Transport Usage Guide

This guide shows how to use the Reflux transport with its middleware system and API.

## Basic Setup

### 1. HTML Setup
```html
<!DOCTYPE html>
<html>
<head>
    <script src="/baremux/index.js"></script>
    <script src="/reflux/api.js"></script> <!-- Include the API -->
</head>
<body>
    <script>
        (async () => {
            // Create control channel for middleware communication
            const control = new MessageChannel();
            
            // Set up the transport with control port
            const connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");
            await connection.setTransport(
                "/reflux/index.mjs",
                [{
                    transport: "/epoxy/index.mjs",
                    wisp: "wss://gointospace.app/wisp/",
                    controlPort: control.port1,
                }],
                [control.port1]
            );
            
            // Create API instance
            const api = new window.RefluxAPI(control.port2);
            
            // Now you can use the API!
            await api.injectCSS('body { border: 5px solid red !important; }');
        })();
    </script>
</body>
</html>
```

### 2. ES Module Setup
```javascript
import { RefluxAPI } from '/reflux/api.mjs';

const control = new MessageChannel();
const connection = new BareMux.BareMuxConnection("/baremux/worker.js");

await connection.setTransport(
    "/reflux/index.mjs",
    [{
        transport: "/epoxy/index.mjs",
        wisp: "wss://gointospace.app/wisp/",
        controlPort: control.port1,
    }],
    [control.port1]
);

const api = new RefluxAPI(control.port2);
```

## API Usage Examples

### Content Injection

#### Inject CSS Globally
```javascript
// Inject CSS into all HTML pages
await api.injectCSS(`
    body { 
        filter: invert(1) hue-rotate(180deg) !important; 
    }
    img, video { 
        filter: invert(1) hue-rotate(180deg) !important; 
    }
`);
```

#### Inject CSS for Specific Sites
```javascript
// Only inject into GitHub
await api.injectCSS(`
    .Header { background: linear-gradient(45deg, #ff6b6b, #4ecdc4) !important; }
`, ['github.com']);
```

#### Inject JavaScript Globally
```javascript
// Add a global console logger
await api.injectJS(`
    console.log('Reflux middleware active on:', window.location.hostname);
    window.addEventListener('load', () => {
        console.log('Page loaded through Reflux transport');
    });
`);
```

#### Inject JavaScript for Specific Sites
```javascript
// Add custom functionality to Discord
await api.injectJS(`
    window.addEventListener('load', () => {
        console.log('Discord page enhanced by Reflux');
        // Add custom Discord modifications here
    });
`, ['discord.com']);
```

#### Inject Vencord into Discord
```javascript
// Automatically inject Vencord into Discord
await api.injectVencord();

// Or inject into specific Discord URLs
await api.injectVencord(['discord.com', 'canary.discord.com']);
```

#### Inject External Scripts/Stylesheets
```javascript
// Inject jQuery globally
await api.injectScriptURL('https://code.jquery.com/jquery-3.6.0.min.js');

// Inject custom CSS framework
await api.injectCSSURL('https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css');

// Inject only on specific sites
await api.injectScriptURL('https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js', ['example.com']);
```

#### Advanced HTML Injection
```javascript
// Inject at different positions
await api.injectHTML('<meta name="custom" content="reflux">', 'head');
await api.injectHTML('<div id="reflux-banner">Enhanced by Reflux</div>', 'body-start');
await api.injectHTML('<script>console.log("Page end");</script>', 'body-end');
```

### Request/Response Modification

#### Block Requests
```javascript
// Block analytics and tracking
await api.blockRequests([
    'google-analytics.com',
    'facebook.com/tr',
    'doubleclick.net',
    'googletagmanager.com'
]);

// Block specific ad networks
await api.blockRequests(['googlesyndication.com', 'adsystem.amazon.com']);
```

#### Modify Request Headers
```javascript
// Spoof user agent for all requests to a domain
await api.modifyRequestHeaders(['example.com'], {
    'User-Agent': 'CustomBot/1.0'
});

// Add custom headers
await api.modifyRequestHeaders(['api.example.com'], {
    'X-Custom-Header': 'RefluxTransport',
    'Authorization': 'Bearer custom-token'
});
```

#### Replace Content
```javascript
// Replace text content
await api.replaceContent(['example.com'], 'Hello World', 'Hello Reflux');

// Replace using regex
await api.replaceContent(['news.ycombinator.com'], /Hacker News/g, 'Developer News');

// Replace HTML elements
await api.replaceContent(['reddit.com'], 
    /<div class="advertisement"[^>]*>.*?<\/div>/gs, 
    '<div class="blocked-ad">Ad Blocked by Reflux</div>'
);
```

### Middleware Management

#### List Active Middleware
```javascript
const middlewareList = await api.listMiddleware();
console.log('Active middleware:', middlewareList);
```

#### Remove Middleware
```javascript
// Remove by ID (returned from injection functions)
const cssId = await api.injectCSS('body { color: red; }');
await api.removeMiddleware(cssId);
```

#### Enable/Disable Middleware
```javascript
const jsId = await api.injectJS('console.log("test")');

// Disable temporarily
await api.setMiddlewareEnabled(jsId, false);

// Re-enable
await api.setMiddlewareEnabled(jsId, true);
```

#### Custom Middleware
```javascript
// Add custom middleware with full control
await api.addMiddleware({
    id: 'custom-logger',
    onRequest: async (ctx, next) => {
        console.log('Request to:', ctx.remote.href);
        return await next();
    },
    onResponse: async (ctx, next) => {
        const response = await next();
        console.log('Response from:', ctx.request.remote.href, 'Status:', response.status);
        return response;
    }
});
```

## Advanced Examples

### Dark Mode for All Websites
```javascript
const darkModeId = await api.injectCSS(`
    :root {
        filter: invert(1) hue-rotate(180deg) !important;
    }
    
    img, video, iframe, svg, embed, object {
        filter: invert(1) hue-rotate(180deg) !important;
    }
    
    [style*="background-image"] {
        filter: invert(1) hue-rotate(180deg) !important;
    }
`);

// Add toggle function to global scope
await api.injectJS(`
    window.toggleDarkMode = () => {
        document.documentElement.style.filter = 
            document.documentElement.style.filter ? '' : 'invert(1) hue-rotate(180deg)';
    };
    
    // Add keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            window.toggleDarkMode();
        }
    });
`);
```

### Custom Analytics Blocker
```javascript
// Block common analytics
await api.blockRequests([
    'google-analytics.com',
    'googletagmanager.com',
    'facebook.com/tr',
    'doubleclick.net',
    'amazon-adsystem.com',
    'googlesyndication.com'
]);

// Replace analytics scripts with dummy functions
await api.injectJS(`
    // Mock Google Analytics
    window.gtag = () => console.log('Analytics blocked by Reflux');
    window.ga = () => console.log('Analytics blocked by Reflux');
    
    // Mock Facebook Pixel
    window.fbq = () => console.log('Facebook tracking blocked by Reflux');
    
    console.log('Analytics blocking active');
`);
```

### Site-Specific Enhancements
```javascript
// YouTube enhancements
await api.injectJS(`
    // Auto-skip ads
    setInterval(() => {
        const skipButton = document.querySelector('.ytp-ad-skip-button');
        if (skipButton) skipButton.click();
    }, 1000);
    
    // Remove recommended videos
    const style = document.createElement('style');
    style.textContent = '#secondary { display: none !important; }';
    document.head.appendChild(style);
`, ['youtube.com']);

// Reddit enhancements  
await api.injectCSS(`
    /* Hide promoted posts */
    [data-promoted="true"] { display: none !important; }
    
    /* Compact view */
    .Post { margin-bottom: 5px !important; }
`, ['reddit.com']);

// GitHub enhancements
await api.injectJS(`
    // Add "Copy file path" button to file headers
    document.querySelectorAll('.file-header').forEach(header => {
        const path = header.querySelector('.file-info').textContent.trim();
        const button = document.createElement('button');
        button.textContent = 'Copy path';
        button.onclick = () => navigator.clipboard.writeText(path);
        header.appendChild(button);
    });
`, ['github.com']);
```

## Error Handling

```javascript
try {
    await api.injectCSS('invalid css {{{');
} catch (error) {
    console.error('Failed to inject CSS:', error.message);
}

// Check if middleware was added successfully
try {
    const middlewareList = await api.listMiddleware();
    console.log('Current middleware count:', middlewareList.length);
} catch (error) {
    console.error('Failed to list middleware:', error.message);
}
```

## Best Practices

1. **Performance**: Be mindful of injecting large amounts of CSS/JS
2. **Specificity**: Use URL targeting to avoid affecting unrelated sites
3. **Cleanup**: Remove unused middleware to prevent memory leaks
4. **Error Handling**: Always wrap API calls in try-catch blocks
5. **Testing**: Test middleware on multiple sites to ensure compatibility

## Troubleshooting

### Common Issues

1. **Middleware not working**: Ensure the control port is properly passed to the transport
2. **Content not injecting**: Check that the target site serves HTML content
3. **Blocked requests still going through**: Verify the URL patterns match correctly
4. **Performance issues**: Too many active middleware can slow down browsing

### Debug Mode
```javascript
// Enable debug logging for all middleware
await api.injectJS(`
    console.log('Reflux Debug: Page loaded on', window.location.href);
    window.RefluxDebug = true;
`);
```