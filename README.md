# Reflux
Reflux is a powerful, universal request/response middleware engine designed for any BareMux compatible web proxy. It features a dynamic plugin system that allows you to load and execute custom JavaScript code on specific websites.

## Features

- **Dynamic Plugin System**: Load and execute custom plugins on specific sites or globally
- **Request/Response Middleware**: Intercept and modify HTTP requests and responses
- **WebSocket Support**: Middleware support for WebSocket connections
- **Site-Specific Targeting**: Run plugins only on specified domains with pattern matching
- **Real-time Control**: Add, remove, and manage plugins dynamically

## Quick Start

### Basic Usage

```javascript
import RefluxTransport, { RefluxAPI } from './src/index.js';

// Initialize the transport
const transport = new RefluxTransport({
  transport: '/path/to/your/transport.js',
  controlPort: controlPort
});

// Initialize the API
const api = new RefluxAPI(controlPort);

// Add a plugin
await api.addPlugin({
  function: `console.log('Hello from:', url);`,
  name: 'com.example.logger',
  sites: ['*'] // Run on all sites
});
```

### Plugin System

The plugin system allows you to dynamically load JavaScript code that runs on specific sites:

```javascript
// Simple plugin that runs on all sites
const plugin = {
  function: `console.log('Plugin executed on:', url);`,
  name: 'com.example.logger',
  sites: ['*']
};

await api.addPlugin(plugin);

// Site-specific plugin
const githubPlugin = {
  function: `
    if (body.includes('<title>')) {
      return body.replace('<title>', '<title>[Enhanced] ');
    }
    return body;
  `,
  name: 'com.example.github-enhancer',
  sites: ['github.com']
};

await api.addPlugin(githubPlugin);
```

## Documentation

- [Plugin System Guide](./PLUGIN_SYSTEM.md) - Comprehensive guide to creating and using plugins

## Plugin Examples

### Content Modifier
```javascript
{
  function: `
    if (body.includes('Example')) {
      return body.replace(/Example/g, 'Modified Example');
    }
    return body;
  `,
  name: 'com.example.content-modifier',
  sites: ['example.com']
}
```

### CSS Injector
```javascript
{
  function: `
    if (body.includes('</head>')) {
      const css = '<style>body { font-family: Arial; }</style>';
      return body.replace('</head>', css + '</head>');
    }
    return body;
  `,
  name: 'com.example.css-injector',
  sites: ['*.google.com']
}
```

## API Reference

### Plugin Management
- `addPlugin(plugin)` - Add a new plugin
- `removePlugin(name)` - Remove a plugin by name
- `listPlugins()` - Get all loaded plugins

### Middleware Management
- `addMiddleware(middleware)` - Add custom middleware
- `removeMiddleware(id)` - Remove middleware
- `listMiddleware()` - List all middleware

## License

See [LICENSE](./LICENSE) file for details.
