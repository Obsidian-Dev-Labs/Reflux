# Reflux Documentation

Welcome to the Reflux documentation! Reflux is a powerful, universal request/response middleware engine designed for BareMux-compatible web proxies.

## Table of Contents

1. [Getting Started](./getting-started.md)
2. [HTML Modification](./html-modification.md)
3. [WebSocket Middleware](./websocket-middleware.md)
4. [Request/Response Middleware](./request-response-middleware.md)
5. [API Reference](./api-reference.md)
6. [Plugin System](./plugin-system.md)
7. [Examples](./examples.md)

## What is Reflux?

Reflux is a middleware transport layer that wraps around BareMux transports, providing powerful interception and modification capabilities for:

- **HTTP Requests**: Modify headers, body, URL, and method before sending
- **HTTP Responses**: Transform response data, inject scripts, modify headers
- **WebSocket Messages**: Intercept and modify WebSocket traffic in both directions
- **HTML Content**: Inject scripts, modify DOM, add custom functionality
- **Site-Specific Plugins**: Target specific domains with custom modifications

## Key Features

### Dynamic Plugin System
Load and execute custom JavaScript code on specific websites or globally. Plugins support both server-side (middleware) and browser-side (injected) code.

### Request/Response Interception
Full control over HTTP traffic with the ability to modify any aspect of requests and responses.

### WebSocket Support
Intercept and transform WebSocket messages for both incoming and outgoing traffic.

### Site Targeting
Use domain matching with wildcard support to run plugins only where needed.

### Real-time Management
Add, remove, enable, disable, and update plugins dynamically without reloading.

## Quick Start

```javascript
import { BareMuxConnection } from "@mercuryworkshop/bare-mux";
import { RefluxAPI } from "@nightnetwork/reflux";

// Initialize BareMux with Reflux transport
const connection = new BareMuxConnection("/baremux/worker.js");
await connection.setTransport("/reflux/index.mjs", [{
  base: "/epoxy/index.mjs",
  wisp: "wss://example.com/wisp/"
}]);

// Create Reflux API instance
const api = new RefluxAPI();

// Add a plugin
await api.addPlugin({
  name: "my-plugin",
  sites: ["example.com"],
  function: `
    /* @browser */
    console.log('Plugin running on:', url);
    /* @/browser */
  `
});

// Enable the plugin
await api.enablePlugin("my-plugin");
```

## Architecture

```
┌─────────────────┐
│   Application   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│    BareMux      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Reflux      │ ◄── Plugin System
│   Middleware    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Base Transport  │
│ (Epoxy/Libcurl) │
└─────────────────┘
```

## Use Cases

- **Ad Blocking**: Filter and block unwanted content
- **Custom UI Injection**: Add custom controls and overlays to websites
- **Data Analytics**: Monitor and analyze traffic patterns
- **Content Transformation**: Modify website content on-the-fly
- **Security Enhancements**: Add CSP headers, sanitize content
- **Performance Monitoring**: Track load times and resource usage
- **Custom Authentication**: Inject auth tokens, manage sessions
- **Debug Tools**: Add debugging information to any website

## Next Steps

- [Getting Started Guide](./getting-started.md) - Complete setup and first plugin
- [HTML Modification](./html-modification.md) - Learn to modify website content
- [API Reference](./api-reference.md) - Complete API documentation
