# Reflux

Reflux is a powerful, universal request/response middleware engine designed for any BareMux compatible web proxy. It features a dynamic plugin system that allows you to load and execute custom JavaScript code on specific websites.

## Features

- **Dynamic Plugin System**: Load and execute custom plugins on specific sites or globally
- **Request/Response Middleware**: Intercept and modify HTTP requests and responses
- **WebSocket Support**: Middleware support for WebSocket connections
- **Site-Specific Targeting**: Run plugins only on specified domains with pattern matching
- **Real-time Control**: Add, remove, and manage plugins dynamically

## Documentation

📚 **[Complete Documentation](./docs/README.md)**

- [Getting Started](./docs/getting-started.md) - Setup and first plugin
- [HTML Modification](./docs/html-modification.md) - Modify website content
- [WebSocket Middleware](./docs/websocket-middleware.md) - Intercept WebSocket traffic
- [Request/Response Middleware](./docs/request-response-middleware.md) - HTTP interception
- [Plugin System](./docs/plugin-system.md) - Plugin architecture deep dive
- [API Reference](./docs/api-reference.md) - Complete API docs
- [Examples](./docs/examples.md) - Working code examples

## Quick Start

```bash
npm install @nightnetwork/reflux
```

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

## Use Cases

- **HTML Modification**: Inject scripts, modify content, add custom UI
- **Request Interception**: Modify headers, URLs, request bodies
- **Response Transformation**: Transform API responses, filter content
- **WebSocket Monitoring**: Log and modify WebSocket messages
- **Ad Blocking**: Remove unwanted elements and content
- **Custom Analytics**: Track user behavior and page performance
- **Security Enhancements**: Add CSP headers, sanitize content
- **Dark Mode**: Apply custom themes to any website

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

## Development

```bash
# Clone the repository
git clone https://github.com/Obsidian-Dev-Labs/Reflux.git
cd Reflux

# Install dependencies
npm install

# Run the demo
npm run demo
```

## License

See [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please read the documentation before submitting pull requests.

## Links

- [Documentation](./docs/README.md)
- [GitHub Repository](https://github.com/Obsidian-Dev-Labs/Reflux)
- [NPM Package](https://www.npmjs.com/package/@nightnetwork/reflux)

