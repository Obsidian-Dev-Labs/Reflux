# API Reference

Complete API documentation for Reflux.

## RefluxAPI Class

The main API for managing plugins.

### Constructor

```typescript
new RefluxAPI()
```

Creates a new instance of the RefluxAPI.

**Example:**
```javascript
const api = new RefluxAPI();
```

---

### Methods

#### addPlugin()

```typescript
async addPlugin(plugin: RefluxPlugin): Promise<void>
```

Adds a new plugin to the system.

**Parameters:**
- `plugin` (RefluxPlugin): The plugin configuration

**RefluxPlugin Interface:**
```typescript
interface RefluxPlugin {
  name: string;           // Unique plugin identifier
  sites: string[];        // Array of site patterns
  function: string;       // Plugin code as string
}
```

**Example:**
```javascript
await api.addPlugin({
  name: "com.example.my-plugin",
  sites: ["example.com", "*.example.com"],
  function: `
    /* @browser */
    console.log('Plugin active on:', url);
    /* @/browser */
  `
});
```

**Site Patterns:**
- `"*"` - Match all sites
- `"example.com"` - Exact domain match
- `"*.example.com"` - Wildcard subdomain match
- `"example.*"` - Wildcard TLD match

---

#### removePlugin()

```typescript
async removePlugin(name: string): Promise<void>
```

Removes a plugin from the system.

**Parameters:**
- `name` (string): Plugin name to remove

**Example:**
```javascript
await api.removePlugin("com.example.my-plugin");
```

---

#### enablePlugin()

```typescript
async enablePlugin(name: string): Promise<void>
```

Enables a disabled plugin.

**Parameters:**
- `name` (string): Plugin name to enable

**Example:**
```javascript
await api.enablePlugin("com.example.my-plugin");
```

---

#### disablePlugin()

```typescript
async disablePlugin(name: string): Promise<void>
```

Disables an enabled plugin.

**Parameters:**
- `name` (string): Plugin name to disable

**Example:**
```javascript
await api.disablePlugin("com.example.my-plugin");
```

---

#### listPlugins()

```typescript
async listPlugins(): Promise<PluginInfo[]>
```

Returns a list of all installed plugins.

**Returns:**
- `Promise<PluginInfo[]>` - Array of plugin information objects

**PluginInfo Interface:**
```typescript
interface PluginInfo {
  name: string;
  sites: string[];
  enabled: boolean;
  function: string;
}
```

**Example:**
```javascript
const plugins = await api.listPlugins();
console.log("Installed plugins:", plugins);

// Output:
// [
//   {
//     name: "com.example.plugin1",
//     sites: ["example.com"],
//     enabled: true,
//     function: "/* plugin code */"
//   },
//   ...
// ]
```

---

#### getEnabledPlugins()

```typescript
async getEnabledPlugins(): Promise<string[]>
```

Returns an array of enabled plugin names.

**Returns:**
- `Promise<string[]>` - Array of enabled plugin names

**Example:**
```javascript
const enabled = await api.getEnabledPlugins();
console.log("Enabled plugins:", enabled);

// Output: ["com.example.plugin1", "com.example.plugin2"]
```

---

#### updatePluginSites()

```typescript
async updatePluginSites(name: string, sites: string[]): Promise<void>
```

Updates the site patterns for a plugin.

**Parameters:**
- `name` (string): Plugin name
- `sites` (string[]): New array of site patterns

**Example:**
```javascript
await api.updatePluginSites(
  "com.example.my-plugin",
  ["example.com", "test.com", "*.example.org"]
);
```

---

## Plugin Function Format

Plugins are JavaScript code stored as strings with special markers.

### Browser-Side Code

Code between `/* @browser */` and `/* @/browser */` runs in the browser context.

```javascript
function: `
  /* @browser */
  // This code runs in the page context
  console.log('Running on:', url);
  console.log('Plugin name:', pluginName);
  
  // Available variables:
  // - url: Current page URL
  // - pluginName: Name of this plugin
  
  document.body.style.background = 'lightblue';
  /* @/browser */
`
```

**Available Variables:**
- `url` (string): Current page URL
- `pluginName` (string): Name of the plugin
- All standard browser APIs (document, window, etc.)

### Server-Side Code

Code outside browser markers runs in the middleware (server-side).

```javascript
function: `
  // This code runs in the middleware
  // Available variables:
  // - body: HTML content as string
  // - url: Target URL
  // - headers: Response headers object
  
  if (body.includes('</head>')) {
    return body.replace('</head>', '<style>...</style></head>');
  }
  
  return body;
`
```

**Available Variables:**
- `body` (string): HTML content
- `url` (string): Target URL
- `headers` (Record<string, string>): Response headers

**Must return:**
- Modified `body` string, or original `body` if no changes

### Combined Example

```javascript
function: `
  // Server-side: Inject CSS
  if (body.includes('</head>')) {
    const css = '<style>.enhanced { color: red; }</style>';
    body = body.replace('</head>', css + '</head>');
  }
  
  /* @browser */
  // Browser-side: Apply CSS class
  document.querySelectorAll('h1').forEach(h1 => {
    h1.classList.add('enhanced');
  });
  /* @/browser */
  
  return body;
`
```

---

## MiddlewareFunction Interface

For advanced middleware (not typically used directly by plugins).

```typescript
interface MiddlewareFunction {
  id: string;
  enabled?: boolean | (() => boolean);
  onRequest?: (ctx: RequestContext, next: NextFunction) => Promise<RequestContext | void>;
  onResponse?: (ctx: ResponseContext, next: NextResponseFunction) => Promise<TransferrableResponse | void>;
  modifyWebSocketMessage?: (data: string | Blob | ArrayBuffer, direction: "send" | "receive") => Promise<string | Blob | ArrayBuffer> | string | Blob | ArrayBuffer;
}
```

### onRequest

Intercepts requests before they're sent.

```typescript
onRequest?: (ctx: RequestContext, next: NextFunction) => Promise<RequestContext | void>
```

**RequestContext:**
```typescript
interface RequestContext {
  remote: URL;
  method: string;
  body: BodyInit | null;
  headers: Record<string, string>;
  signal?: AbortSignal;
}
```

**Example:**
```javascript
const middleware = {
  id: "my-middleware",
  onRequest: async (ctx, next) => {
    ctx.headers["X-Custom"] = "value";
    return await next(ctx);
  }
};
```

### onResponse

Intercepts responses before they reach the browser.

```typescript
onResponse?: (ctx: ResponseContext, next: NextResponseFunction) => Promise<TransferrableResponse | void>
```

**ResponseContext:**
```typescript
interface ResponseContext {
  request: RequestContext;
}
```

**TransferrableResponse:**
```typescript
interface TransferrableResponse {
  body: string | Blob | ArrayBuffer | ReadableStream | null;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}
```

**Example:**
```javascript
const middleware = {
  id: "my-middleware",
  onResponse: async (ctx, next) => {
    const response = await next();
    response.headers["X-Modified"] = "true";
    return response;
  }
};
```

### modifyWebSocketMessage

Intercepts WebSocket messages.

```typescript
modifyWebSocketMessage?: (
  data: string | Blob | ArrayBuffer,
  direction: "send" | "receive"
) => Promise<string | Blob | ArrayBuffer> | string | Blob | ArrayBuffer
```

**Example:**
```javascript
const middleware = {
  id: "my-middleware",
  modifyWebSocketMessage: async (data, direction) => {
    console.log(`WebSocket ${direction}:`, data);
    return data;
  }
};
```

---

## Error Handling

All API methods may throw errors. Always use try-catch:

```javascript
try {
  await api.addPlugin(plugin);
  console.log("✅ Plugin added successfully");
} catch (error) {
  console.error("❌ Failed to add plugin:", error);
}
```

**Common Errors:**
- Storage unavailable (IndexedDB/LocalForage issues)
- Plugin name already exists
- Invalid plugin format
- Permission errors

---

## Storage

Reflux uses LocalForage (IndexedDB) for persistence:

**Stores:**
- `plugins` - Plugin code
- `pluginMetadata` - Plugin configuration (sites, name)
- `status` - Enabled/disabled state

**Database Name:** `Reflux`

---

## Events and Lifecycle

### Plugin Loading

1. Plugin added via `addPlugin()`
2. Stored in IndexedDB
3. Enabled via `enablePlugin()` or disabled by default
4. Loaded into middleware on next request or via `reloadPlugins()`
5. Executed when request matches site pattern

### Execution Order

1. Request middleware (all enabled)
2. Inner transport request
3. Server receives request
4. Server sends response
5. Response middleware (all enabled)
   - HTML plugins execute here
6. Browser receives response
7. Browser-side plugin code executes

---

## TypeScript Types

```typescript
// Import types
import type {
  RefluxPlugin,
  MiddlewareFunction,
  RequestContext,
  ResponseContext,
  TransferrableResponse
} from "@nightnetwork/reflux";

// Use in your code
const plugin: RefluxPlugin = {
  name: "com.example.plugin",
  sites: ["*"],
  function: "/* code */"
};
```

---

## Browser Compatibility

**Required:**
- ES6+ JavaScript support
- IndexedDB/LocalForage
- Service Worker support (for BareMux)

**Tested:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

---

## Performance Considerations

### Plugin Optimization

**Do:**
- ✅ Use specific site patterns instead of `["*"]`
- ✅ Keep plugin code minimal
- ✅ Use async operations wisely
- ✅ Check content types before processing
- ✅ Cache expensive computations

**Don't:**
- ❌ Use heavy synchronous operations
- ❌ Modify every response unnecessarily
- ❌ Create memory leaks in browser-side code
- ❌ Block the request/response chain

### Memory Management

```javascript
// ❌ Bad: Memory leak
/* @browser */
setInterval(() => {
  // Runs forever
}, 1000);
/* @/browser */

// ✅ Good: Cleanup
/* @browser */
const interval = setInterval(() => {
  // Do work
}, 1000);

window.addEventListener('unload', () => {
  clearInterval(interval);
});
/* @/browser */
```

---

## Security Considerations

### Plugin Code Execution

- Plugins execute with full permissions
- Be careful with untrusted plugin code
- Server-side code runs in middleware context
- Browser-side code runs in page context

### Content Security Policy

Plugins can modify CSP headers:

```javascript
onResponse: async (ctx, next) => {
  const response = await next();
  response.headers["content-security-policy"] = "default-src 'self'";
  return response;
}
```

---

## Debugging

### Enable Logging

Reflux logs are prefixed with `RF`:

```javascript
// Console output example:
// %cRF%c Plugin loaded: com.example.plugin
```

### Debug Plugin

```javascript
await api.addPlugin({
  name: "com.debug.inspector",
  sites: ["*"],
  function: `
    console.log("=== Debug Info ===");
    console.log("URL:", url);
    console.log("Plugin:", pluginName);
    
    /* @browser */
    console.log("Document:", {
      title: document.title,
      readyState: document.readyState,
      url: window.location.href
    });
    /* @/browser */
    
    return body;
  `
});
```

---

## Migration Guide

### From Manual Middleware to Plugins

**Before:**
```javascript
// Manual middleware registration (complex)
const middleware = { /* ... */ };
transport.middleware.set("my-plugin", middleware);
```

**After:**
```javascript
// Simple plugin API
await api.addPlugin({
  name: "com.example.my-plugin",
  sites: ["*"],
  function: "/* code */"
});
await api.enablePlugin("com.example.my-plugin");
```

---

## Next Steps

- [Getting Started](./getting-started.md) - Setup guide
- [HTML Modification](./html-modification.md) - Modify website content
- [WebSocket Middleware](./websocket-middleware.md) - WebSocket interception
- [Request/Response Middleware](./request-response-middleware.md) - HTTP interception
- [Examples](./examples.md) - Complete examples
