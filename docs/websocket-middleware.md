# WebSocket Middleware Guide

Learn how to intercept and modify WebSocket messages using Reflux middleware.

## Overview

Reflux can intercept WebSocket messages in both directions:
- **Send**: Outgoing messages from the browser to the server
- **Receive**: Incoming messages from the server to the browser

This allows you to:
- Log WebSocket traffic for debugging
- Transform message formats
- Filter or block specific messages
- Add encryption/decryption
- Implement custom protocols

## Basic WebSocket Middleware

### Creating WebSocket Middleware

Unlike plugins which use the `RefluxAPI`, WebSocket middleware is created directly:

```javascript
// This is a conceptual example - WebSocket middleware
// is typically set up at the transport initialization level

const websocketMiddleware = {
  id: "com.example.ws-logger",
  modifyWebSocketMessage: async (data, direction) => {
    console.log(`WebSocket ${direction}:`, data);
    return data; // Return unmodified data
  }
};
```

## Message Direction

The `direction` parameter tells you which way the message is flowing:

- `"send"` - Message going from browser to server
- `"receive"` - Message coming from server to browser

```javascript
modifyWebSocketMessage: async (data, direction) => {
  if (direction === "send") {
    console.log("Outgoing:", data);
  } else if (direction === "receive") {
    console.log("Incoming:", data);
  }
  return data;
}
```

## Data Types

WebSocket messages can be different types. Handle them accordingly:

```javascript
modifyWebSocketMessage: async (data, direction) => {
  if (typeof data === "string") {
    // Text message
    console.log("Text:", data);
    return data.toUpperCase();
  } 
  else if (data instanceof Blob) {
    // Binary data as Blob
    const text = await data.text();
    console.log("Blob as text:", text);
    return data;
  } 
  else if (data instanceof ArrayBuffer) {
    // Binary data as ArrayBuffer
    const view = new Uint8Array(data);
    console.log("ArrayBuffer bytes:", view);
    return data;
  }
  
  return data;
}
```

## Common Use Cases

### 1. Logging WebSocket Traffic

```javascript
const wsLogger = {
  id: "com.example.ws-logger",
  modifyWebSocketMessage: async (data, direction) => {
    const arrow = direction === "send" ? "→" : "←";
    const timestamp = new Date().toISOString();
    
    if (typeof data === "string") {
      console.log(`[${timestamp}] ${arrow} ${data}`);
    } else {
      console.log(`[${timestamp}] ${arrow} [Binary: ${data.byteLength || data.size} bytes]`);
    }
    
    return data;
  }
};
```

### 2. JSON Message Transformation

```javascript
const jsonTransformer = {
  id: "com.example.json-transformer",
  modifyWebSocketMessage: async (data, direction) => {
    if (typeof data === "string") {
      try {
        const json = JSON.parse(data);
        
        if (direction === "send") {
          // Add metadata to outgoing messages
          json.metadata = {
            timestamp: Date.now(),
            client: "reflux"
          };
        } else {
          // Transform incoming messages
          if (json.type === "notification") {
            console.log("📢 Notification:", json.message);
          }
        }
        
        return JSON.stringify(json);
      } catch (e) {
        // Not JSON, return as-is
        return data;
      }
    }
    return data;
  }
};
```

### 3. Message Filtering

```javascript
const messageFilter = {
  id: "com.example.message-filter",
  modifyWebSocketMessage: async (data, direction) => {
    if (typeof data === "string" && direction === "receive") {
      try {
        const json = JSON.parse(data);
        
        // Block spam messages
        if (json.type === "spam") {
          console.log("🚫 Blocked spam message");
          return ""; // Return empty to effectively block
        }
        
        // Filter sensitive data
        if (json.password) {
          delete json.password;
          return JSON.stringify(json);
        }
      } catch (e) {
        // Not JSON
      }
    }
    return data;
  }
};
```

### 4. Message Encryption/Decryption

```javascript
const encryptionMiddleware = {
  id: "com.example.encryption",
  modifyWebSocketMessage: async (data, direction) => {
    if (typeof data !== "string") return data;
    
    // Simple XOR cipher (use proper crypto in production!)
    const key = "my-secret-key";
    
    const xorCipher = (text, key) => {
      return text.split("").map((char, i) => {
        return String.fromCharCode(
          char.charCodeAt(0) ^ key.charCodeAt(i % key.length)
        );
      }).join("");
    };
    
    if (direction === "send") {
      // Encrypt outgoing
      const encrypted = btoa(xorCipher(data, key));
      console.log("🔒 Encrypted message");
      return encrypted;
    } else {
      // Decrypt incoming
      try {
        const decrypted = xorCipher(atob(data), key);
        console.log("🔓 Decrypted message");
        return decrypted;
      } catch (e) {
        // Not encrypted, return as-is
        return data;
      }
    }
  }
};
```

### 5. Protocol Wrapper

```javascript
const protocolWrapper = {
  id: "com.example.protocol",
  modifyWebSocketMessage: async (data, direction) => {
    if (typeof data !== "string") return data;
    
    if (direction === "send") {
      // Wrap outgoing messages in custom protocol
      const wrapped = JSON.stringify({
        version: "1.0",
        timestamp: Date.now(),
        payload: data
      });
      return wrapped;
    } else {
      // Unwrap incoming messages
      try {
        const parsed = JSON.parse(data);
        if (parsed.version && parsed.payload) {
          console.log("📦 Unwrapped protocol message");
          return parsed.payload;
        }
      } catch (e) {
        // Not wrapped
      }
      return data;
    }
  }
};
```

### 6. Binary Data Processing

```javascript
const binaryProcessor = {
  id: "com.example.binary",
  modifyWebSocketMessage: async (data, direction) => {
    if (data instanceof ArrayBuffer) {
      const view = new Uint8Array(data);
      
      if (direction === "send") {
        // Add header byte to outgoing binary
        const newData = new Uint8Array(view.length + 1);
        newData[0] = 0xFF; // Header marker
        newData.set(view, 1);
        return newData.buffer;
      } else {
        // Remove header byte from incoming binary
        if (view[0] === 0xFF) {
          return view.slice(1).buffer;
        }
      }
    }
    return data;
  }
};
```

## Advanced Patterns

### State Management

```javascript
const statefulMiddleware = {
  id: "com.example.stateful",
  _messageCount: 0,
  _sessionId: null,
  
  modifyWebSocketMessage: async function(data, direction) {
    this._messageCount++;
    
    if (typeof data === "string") {
      try {
        const json = JSON.parse(data);
        
        // Track session
        if (json.type === "session_start" && direction === "receive") {
          this._sessionId = json.sessionId;
          console.log("📱 Session started:", this._sessionId);
        }
        
        // Add message number
        if (direction === "send") {
          json.messageNumber = this._messageCount;
          json.sessionId = this._sessionId;
          return JSON.stringify(json);
        }
      } catch (e) {
        // Not JSON
      }
    }
    
    return data;
  }
};
```

### Conditional Processing

```javascript
const conditionalMiddleware = {
  id: "com.example.conditional",
  modifyWebSocketMessage: async (data, direction) => {
    // Only process for specific domains
    const currentDomain = window.location.hostname;
    
    if (!currentDomain.includes("example.com")) {
      return data; // Pass through
    }
    
    // Only process certain message types
    if (typeof data === "string") {
      try {
        const json = JSON.parse(data);
        
        if (json.type === "chat_message") {
          // Process chat messages
          json.enhanced = true;
          return JSON.stringify(json);
        }
      } catch (e) {
        // Not JSON
      }
    }
    
    return data;
  }
};
```

### Performance Monitoring

```javascript
const performanceMonitor = {
  id: "com.example.perf-monitor",
  _metrics: {
    messagesSent: 0,
    messagesReceived: 0,
    bytesSent: 0,
    bytesReceived: 0,
    startTime: Date.now()
  },
  
  modifyWebSocketMessage: async function(data, direction) {
    const size = data.byteLength || data.size || data.length || 0;
    
    if (direction === "send") {
      this._metrics.messagesSent++;
      this._metrics.bytesSent += size;
    } else {
      this._metrics.messagesReceived++;
      this._metrics.bytesReceived += size;
    }
    
    // Log stats every 100 messages
    const totalMessages = this._metrics.messagesSent + this._metrics.messagesReceived;
    if (totalMessages % 100 === 0) {
      const elapsed = (Date.now() - this._metrics.startTime) / 1000;
      console.log("📊 WebSocket Stats:", {
        uptime: `${elapsed.toFixed(1)}s`,
        sent: this._metrics.messagesSent,
        received: this._metrics.messagesReceived,
        totalBytes: this._metrics.bytesSent + this._metrics.bytesReceived
      });
    }
    
    return data;
  }
};
```

## Best Practices

### 1. Always Return Data

```javascript
// ❌ Bad: Forgetting to return
modifyWebSocketMessage: async (data, direction) => {
  console.log(data);
  // No return - data will be lost!
}

// ✅ Good: Always return
modifyWebSocketMessage: async (data, direction) => {
  console.log(data);
  return data;
}
```

### 2. Handle All Data Types

```javascript
// ✅ Good: Handle all possible types
modifyWebSocketMessage: async (data, direction) => {
  if (typeof data === "string") {
    // Handle string
    return data;
  } else if (data instanceof Blob) {
    // Handle Blob
    return data;
  } else if (data instanceof ArrayBuffer) {
    // Handle ArrayBuffer
    return data;
  }
  return data; // Fallback
}
```

### 3. Error Handling

```javascript
modifyWebSocketMessage: async (data, direction) => {
  try {
    // Your processing logic
    if (typeof data === "string") {
      const json = JSON.parse(data);
      json.modified = true;
      return JSON.stringify(json);
    }
  } catch (error) {
    console.error("WebSocket middleware error:", error);
    return data; // Return original on error
  }
  return data;
}
```

### 4. Performance Considerations

```javascript
// ❌ Bad: Heavy processing on every message
modifyWebSocketMessage: async (data, direction) => {
  // Expensive operation
  await heavyComputation(data);
  return data;
}

// ✅ Good: Only process when necessary
modifyWebSocketMessage: async (data, direction) => {
  // Quick check first
  if (shouldProcess(data)) {
    await lightweightProcessing(data);
  }
  return data;
}
```

## Debugging WebSocket Traffic

### Traffic Inspector

```javascript
const inspector = {
  id: "com.example.inspector",
  modifyWebSocketMessage: async (data, direction) => {
    const details = {
      direction,
      timestamp: new Date().toISOString(),
      type: typeof data,
      size: data.byteLength || data.size || data.length || 0
    };
    
    if (typeof data === "string") {
      details.preview = data.substring(0, 100);
      try {
        details.json = JSON.parse(data);
      } catch (e) {
        details.json = null;
      }
    }
    
    console.table(details);
    return data;
  }
};
```

## Real-World Example: Chat Application Enhancement

```javascript
const chatEnhancer = {
  id: "com.example.chat-enhancer",
  _userCache: new Map(),
  
  modifyWebSocketMessage: async function(data, direction) {
    if (typeof data !== "string") return data;
    
    try {
      const msg = JSON.parse(data);
      
      if (direction === "receive" && msg.type === "chat_message") {
        // Cache user info
        if (msg.user) {
          this._userCache.set(msg.user.id, msg.user);
        }
        
        // Add timestamp if missing
        if (!msg.timestamp) {
          msg.timestamp = Date.now();
        }
        
        // Format mentions
        if (msg.text && msg.text.includes("@")) {
          msg.text = msg.text.replace(
            /@(\w+)/g,
            '<span class="mention">@$1</span>'
          );
        }
        
        return JSON.stringify(msg);
      }
      
      if (direction === "send" && msg.type === "chat_message") {
        // Add client metadata
        msg.client = {
          version: "1.0",
          platform: navigator.platform,
          enhanced: true
        };
        
        return JSON.stringify(msg);
      }
    } catch (e) {
      console.error("Chat enhancer error:", e);
    }
    
    return data;
  }
};
```

## Next Steps

- [Request/Response Middleware](./request-response-middleware.md) - Intercept HTTP traffic
- [API Reference](./api-reference.md) - Complete API documentation
- [Examples](./examples.md) - More complete examples
