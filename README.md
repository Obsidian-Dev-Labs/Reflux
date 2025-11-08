# Reflux

Reflux is a powerful, universal request/response middleware engine designed for any BareMux compatible web proxy. It features a dynamic plugin system that allows you to load and execute custom JavaScript code on specific websites.

Reflux is a plug-and-play middleware system for Bare-Mux. It allows developers to define custom handlers that intercept and modify requests and responses at a transport level, so you can run middleware before it even hits a proxy, and after it gets fetched by the upstream transport.

## Features

- **Hot-swappable plugins**: Load and execute custom plugins on specific sites or globally
- **Powerful middleware**: Intercept and modify HTTP requests destined for transports and responses coming back from them
- **WebSocket Connections**: Support for modifying WebSocket connections
- **Scoped plugins**: Run plugins only on specified domains, including pattern-matched domains

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

Proxy developers can get started right away by installing the package:

```bash
npm install @nightnetwork/reflux
```

...and swapping out a few lines in your Bare Mux connection. Reflux works by being the transport that Bare Mux sees, but then uses the transport of your choice underneath.

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
const reflux = new RefluxAPI();

// Add a plugin
await reflux.addPlugin({
  name: "my-plugin",
  sites: ["example.com"],
  function: `
    /* @browser */
    console.log('Plugin running on:', url);
    /* @/browser */
  `
});

// Enable the plugin
await reflux.enablePlugin("my-plugin");
```

## Use cases

- **HTML Modification**: Inject scripts, modify content, add custom UI
- **Request Interception**: Modify headers, URLs, request bodies
- **Response Transformation**: Transform API responses, filter content
- **WebSocket Monitoring**: Log and modify WebSocket messages
- **Ad Blocking**: Remove unwanted elements and content
- **Custom Analytics**: Track user behavior and page performance
- **Security Enhancements**: Add CSP headers, sanitize content
- **Dark Mode**: Apply custom themes to any website

## Architecture
Reflux is a transport itself that you provide to Bare Mux. When a request hits Reflux, it runs the middleware for each enabled plugin, then passes the potentially modified requests to the configured upstream transport, like Epoxy or Libcurl. After the response comes back, Reflux runs any response-modifying middleware, then finally returns it to the proxy for rewriting.

## Development and building locally

This repository uses Bun for package management, but any package manager will work.

```bash
# Install Bun 
curl -fsSl https://bun.sh/install | bash # Linux/macOS
powershell -c "irm bun.sh/install.ps1 | iex" # Windows

# Clone the repository
git clone https://github.com/Obsidian-Dev-Labs/Reflux.git
cd Reflux

# Install dependencies
bun install

# Run the demo
bun demo
```

## License

Reflux is licensed under the Apache 2.0 license. See the [LICENSE](./LICENSE) file for details.

## Contributing
Contributions are welcome! Please read the documentation before submitting pull requests.