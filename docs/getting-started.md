# Getting Started with Reflux

This guide will walk you through setting up Reflux and creating your first plugin.

## Installation

```bash
npm install @nightnetwork/reflux
```

## Dependencies

Reflux requires the following peer dependencies:

- `@mercuryworkshop/bare-mux` - BareMux transport multiplexer
- A base transport (e.g., `@mercuryworkshop/epoxy-transport` or `@mercuryworkshop/libcurl-transport`)

```bash
npm install @mercuryworkshop/bare-mux @mercuryworkshop/epoxy-transport
```

## Basic Setup

### 1. HTML Setup

Include the required scripts in your HTML:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Reflux App</title>
  <script src="/baremux/index.js"></script>
  <script src="/reflux/api.js"></script>
</head>
<body>
  <script src="app.js"></script>
</body>
</html>
```

### 2. Initialize BareMux with Reflux

```javascript
// Initialize BareMux connection
const connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");

// Set Reflux as the transport wrapper
await connection.setTransport(
  "/reflux/index.mjs",
  [
    {
      base: "/epoxy/index.mjs",
      wisp: "wss://your-wisp-server.com/wisp/"
    }
  ]
);

console.log("Reflux transport initialized!");
```

### 3. Create the Reflux API Instance

```javascript
// Get RefluxAPI class
const RefluxAPIClass = window.RefluxAPIModule.RefluxAPI;

// Create instance
const api = new RefluxAPIClass();

console.log("Reflux API ready!");
```

## Your First Plugin

Let's create a simple plugin that logs information about every page visit:

```javascript
// Define the plugin
const myFirstPlugin = {
  name: "com.myapp.logger",
  sites: ["*"], // Run on all sites
  function: `
    /* @browser */
    console.log('Page loaded:', url);
    console.log('Plugin:', pluginName);
    console.log('Title:', document.title);
    /* @/browser */
  `
};

// Add the plugin
await api.addPlugin(myFirstPlugin);

// Enable the plugin
await api.enablePlugin("com.myapp.logger");

console.log("Plugin installed and enabled!");
```

### Plugin Naming Convention

Use reverse domain notation for plugin names:
- `com.mycompany.pluginname`
- `org.project.feature`
- `io.github.username.plugin`

This prevents naming conflicts.

## Testing Your Plugin

1. Navigate to any website through your proxy
2. Open the browser console (F12)
3. You should see the log messages from your plugin!

## Managing Plugins

### List All Plugins

```javascript
const plugins = await api.listPlugins();
console.log("Installed plugins:", plugins);
```

### Disable a Plugin

```javascript
await api.disablePlugin("com.myapp.logger");
console.log("Plugin disabled");
```

### Enable a Plugin

```javascript
await api.enablePlugin("com.myapp.logger");
console.log("Plugin enabled");
```

### Remove a Plugin

```javascript
await api.removePlugin("com.myapp.logger");
console.log("Plugin removed");
```

### Get Enabled Plugins

```javascript
const enabled = await api.getEnabledPlugins();
console.log("Enabled plugins:", enabled);
```

## Complete Example

Here's a complete working example:

```javascript
(async () => {
  // 1. Initialize BareMux with Reflux
  const connection = new window.BareMux.BareMuxConnection("/baremux/worker.js");
  
  await connection.setTransport("/reflux/index.mjs", [{
    base: "/epoxy/index.mjs",
    wisp: "wss://wisp-server.com/wisp/"
  }]);

  // 2. Create Reflux API
  const api = new window.RefluxAPIModule.RefluxAPI();

  // 3. Add a visual indicator plugin
  await api.addPlugin({
    name: "com.example.indicator",
    sites: ["*"],
    function: `
      /* @browser */
      const banner = document.createElement('div');
      banner.textContent = '🚀 Reflux Active';
      banner.style.cssText = 
        'position: fixed; top: 0; right: 0; ' +
        'background: #0066cc; color: white; ' +
        'padding: 8px 16px; z-index: 999999; ' +
        'font-family: monospace; font-size: 12px;';
      document.body.appendChild(banner);
      /* @/browser */
    `
  });

  // 4. Enable the plugin
  await api.enablePlugin("com.example.indicator");

  console.log("✅ Reflux is ready!");
})();
```

## Troubleshooting

### Plugin Not Running

1. **Check if plugin is enabled:**
   ```javascript
   const enabled = await api.getEnabledPlugins();
   console.log("Enabled plugins:", enabled);
   ```

2. **Verify plugin was added:**
   ```javascript
   const plugins = await api.listPlugins();
   console.log("All plugins:", plugins);
   ```

3. **Check site matching:**
   ```javascript
   // If your plugin targets specific sites, make sure the URL matches
   await api.updatePluginSites("plugin-name", ["example.com", "*.example.com"]);
   ```

### Console Errors

- **"RefluxAPIModule not found"**: Make sure `/reflux/api.js` is loaded before your script
- **"Plugin has no code"**: Ensure the `function` property is not empty
- **Storage errors**: Check browser console for IndexedDB/LocalForage errors

### Performance Issues

- Avoid heavy computations in browser-side plugin code
- Use site-specific targeting instead of `["*"]` when possible
- Test plugins individually to identify problematic code

## Next Steps

- [HTML Modification Guide](./html-modification.md) - Learn to modify website content
- [WebSocket Middleware](./websocket-middleware.md) - Intercept WebSocket traffic
- [API Reference](./api-reference.md) - Complete API documentation
