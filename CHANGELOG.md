# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-01

### Added
- Initial release of Reflux Transport
- Dynamic plugin system with browser-side and server-side execution
- RefluxPlugin interface with function/name/sites specification
- Middleware system for request/response processing
- MessagePort-based API for plugin management
- Site pattern matching with wildcard support
- ReadableStream handling with safe cloning
- TypeScript definitions for all exported interfaces
- Comprehensive demo with example plugins
- Full BareMux transport compatibility

### Features
- **Plugin System**: Add, remove, and list plugins dynamically
- **Dual Execution**: Server-side HTML modification and browser-side JavaScript execution
- **Site Targeting**: Precise control over which sites plugins run on
- **Stream Handling**: Safe ReadableStream processing without locking
- **Type Safety**: Complete TypeScript support with proper type definitions
