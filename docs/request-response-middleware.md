# Request/Response Middleware Guide

Learn how to intercept and modify HTTP requests and responses using Reflux middleware.

## Overview

Reflux middleware operates at two key points in the HTTP lifecycle:

1. **Request Phase** (`onRequest`): Before the request is sent to the server
2. **Response Phase** (`onResponse`): After receiving the response, before passing to the browser

This enables powerful capabilities like:
- Modifying headers, URLs, and request bodies
- Adding authentication tokens
- Transforming response data
- Implementing caching strategies
- Logging and analytics
- Security enhancements

## Request Middleware

### Basic Request Interception

Request middleware receives a `RequestContext` object and can modify it before the request is sent:

```javascript
const requestLogger = {
  id: "com.example.request-logger",
  onRequest: async (ctx, next) => {
    console.log("📤 Request:", {
      url: ctx.remote.href,
      method: ctx.method,
      headers: ctx.headers
    });
    
    // Pass to next middleware
    return await next();
  }
};
```

### RequestContext Properties

```typescript
interface RequestContext {
  remote: URL;           // Target URL
  method: string;        // HTTP method (GET, POST, etc.)
  body: BodyInit | null; // Request body
  headers: Record<string, string>;  // Request headers
  signal?: AbortSignal;  // Abort signal
}
```

### Modifying Request Headers

```javascript
const headerModifier = {
  id: "com.example.header-modifier",
  onRequest: async (ctx, next) => {
    // Add custom headers
    ctx.headers["X-Custom-Header"] = "Reflux";
    ctx.headers["X-Request-Time"] = Date.now().toString();
    
    // Modify existing headers
    if (ctx.headers["user-agent"]) {
      ctx.headers["user-agent"] += " Reflux/1.0";
    }
    
    // Remove headers
    delete ctx.headers["X-Unwanted"];
    
    return await next(ctx);
  }
};
```

### Modifying Request URL

```javascript
const urlModifier = {
  id: "com.example.url-modifier",
  onRequest: async (ctx, next) => {
    const url = new URL(ctx.remote);
    
    // Add query parameters
    url.searchParams.set("source", "reflux");
    url.searchParams.set("timestamp", Date.now().toString());
    
    // Modify path
    if (url.pathname === "/old-api") {
      url.pathname = "/new-api";
    }
    
    // Update context
    ctx.remote = url;
    
    return await next(ctx);
  }
};
```

### Modifying Request Body

```javascript
const bodyModifier = {
  id: "com.example.body-modifier",
  onRequest: async (ctx, next) => {
    if (ctx.method === "POST" && ctx.body) {
      try {
        // Convert body to text
        const bodyText = await new Response(ctx.body).text();
        const data = JSON.parse(bodyText);
        
        // Add metadata
        data.metadata = {
          client: "reflux",
          timestamp: Date.now()
        };
        
        // Update body
        ctx.body = JSON.stringify(data);
        ctx.headers["content-length"] = ctx.body.length.toString();
      } catch (e) {
        console.error("Failed to modify body:", e);
      }
    }
    
    return await next(ctx);
  }
};
```

### Authentication Injection

```javascript
const authInjector = {
  id: "com.example.auth",
  onRequest: async (ctx, next) => {
    // Get token from storage
    const token = localStorage.getItem("auth_token");
    
    if (token) {
      // Add Authorization header
      ctx.headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Add API key for specific domains
    if (ctx.remote.hostname === "api.example.com") {
      ctx.headers["X-API-Key"] = "your-api-key";
    }
    
    return await next(ctx);
  }
};
```

### Request Redirects

```javascript
const redirector = {
  id: "com.example.redirector",
  onRequest: async (ctx, next) => {
    // Redirect specific URLs
    if (ctx.remote.hostname === "old-site.com") {
      ctx.remote = new URL(
        ctx.remote.href.replace("old-site.com", "new-site.com")
      );
    }
    
    // Force HTTPS
    if (ctx.remote.protocol === "http:") {
      ctx.remote = new URL(ctx.remote.href.replace("http:", "https:"));
    }
    
    return await next(ctx);
  }
};
```

## Response Middleware

### Basic Response Interception

Response middleware receives a `ResponseContext` and can modify the response:

```javascript
const responseLogger = {
  id: "com.example.response-logger",
  onResponse: async (ctx, next) => {
    const response = await next();
    
    console.log("📥 Response:", {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
    
    return response;
  }
};
```

### ResponseContext and TransferrableResponse

```typescript
interface ResponseContext {
  request: RequestContext;  // Original request context
}

interface TransferrableResponse {
  body: string | Blob | ArrayBuffer | ReadableStream | null;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}
```

### Modifying Response Headers

```javascript
const responseHeaderModifier = {
  id: "com.example.response-headers",
  onResponse: async (ctx, next) => {
    const response = await next();
    
    // Add CORS headers
    response.headers["Access-Control-Allow-Origin"] = "*";
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE";
    
    // Add security headers
    response.headers["X-Frame-Options"] = "DENY";
    response.headers["X-Content-Type-Options"] = "nosniff";
    
    // Remove unwanted headers
    delete response.headers["X-Powered-By"];
    
    return response;
  }
};
```

### Modifying Response Status

```javascript
const statusModifier = {
  id: "com.example.status-modifier",
  onResponse: async (ctx, next) => {
    const response = await next();
    
    // Convert 404 to 200 with custom message
    if (response.status === 404) {
      response.status = 200;
      response.statusText = "OK";
      response.body = JSON.stringify({
        error: "Not found",
        fallback: true
      });
    }
    
    return response;
  }
};
```

### Response Body Transformation

```javascript
const bodyTransformer = {
  id: "com.example.body-transformer",
  onResponse: async (ctx, next) => {
    const response = await next();
    
    // Only process JSON responses
    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      return response;
    }
    
    try {
      // Get response body as text
      let body = response.body;
      if (body instanceof ReadableStream) {
        body = await new Response(body).text();
      } else if (typeof body !== "string") {
        return response;
      }
      
      // Parse and modify
      const data = JSON.parse(body);
      data.enhanced = true;
      data.timestamp = Date.now();
      
      // Update response
      const newBody = JSON.stringify(data);
      response.body = newBody;
      response.headers["content-length"] = newBody.length.toString();
    } catch (e) {
      console.error("Failed to transform body:", e);
    }
    
    return response;
  }
};
```

### HTML Content Modification

```javascript
const htmlModifier = {
  id: "com.example.html-modifier",
  onResponse: async (ctx, next) => {
    const response = await next();
    
    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("text/html")) {
      return response;
    }
    
    try {
      let body = response.body;
      if (body instanceof ReadableStream) {
        body = await new Response(body).text();
      }
      
      if (typeof body === "string" && body.includes("</head>")) {
        // Inject custom script
        const script = `
          <script>
            console.log('Enhanced by Reflux');
            window.REFLUX_ENABLED = true;
          </script>
        `;
        body = body.replace("</head>", script + "</head>");
        
        response.body = body;
        response.headers["content-length"] = body.length.toString();
      }
    } catch (e) {
      console.error("Failed to modify HTML:", e);
    }
    
    return response;
  }
};
```

## Advanced Patterns

### Caching Layer

```javascript
const cachingMiddleware = {
  id: "com.example.cache",
  _cache: new Map(),
  
  onRequest: async function(ctx, next) {
    // Only cache GET requests
    if (ctx.method !== "GET") {
      return await next();
    }
    
    const cacheKey = ctx.remote.href;
    const cached = this._cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 60000) {
      console.log("💾 Cache hit:", cacheKey);
      // Return cached response (skip next)
      return cached.response;
    }
    
    // Not cached, proceed with request
    const response = await next();
    
    // Cache the response
    this._cache.set(cacheKey, {
      response: { ...response },
      timestamp: Date.now()
    });
    
    console.log("💾 Cached:", cacheKey);
    return response;
  }
};
```

### Rate Limiting

```javascript
const rateLimiter = {
  id: "com.example.rate-limiter",
  _requests: new Map(),
  
  onRequest: async function(ctx, next) {
    const domain = ctx.remote.hostname;
    const now = Date.now();
    
    if (!this._requests.has(domain)) {
      this._requests.set(domain, []);
    }
    
    const requests = this._requests.get(domain);
    const recentRequests = requests.filter(time => now - time < 1000);
    
    if (recentRequests.length >= 10) {
      console.warn("⚠️ Rate limit exceeded for", domain);
      // Return error response
      return {
        status: 429,
        statusText: "Too Many Requests",
        headers: { "retry-after": "1" },
        body: "Rate limit exceeded"
      };
    }
    
    recentRequests.push(now);
    this._requests.set(domain, recentRequests);
    
    return await next();
  }
};
```

### Request/Response Logging

```javascript
const trafficLogger = {
  id: "com.example.traffic-logger",
  
  onRequest: async (ctx, next) => {
    const requestId = Math.random().toString(36).substr(2, 9);
    const startTime = Date.now();
    
    console.group(`📤 Request ${requestId}`);
    console.log("URL:", ctx.remote.href);
    console.log("Method:", ctx.method);
    console.log("Headers:", ctx.headers);
    console.groupEnd();
    
    // Store request ID in context for response logging
    ctx._requestId = requestId;
    ctx._startTime = startTime;
    
    return await next(ctx);
  },
  
  onResponse: async (ctx, next) => {
    const response = await next();
    const duration = Date.now() - (ctx.request._startTime || 0);
    
    console.group(`📥 Response ${ctx.request._requestId}`);
    console.log("Status:", response.status, response.statusText);
    console.log("Duration:", duration + "ms");
    console.log("Headers:", response.headers);
    console.groupEnd();
    
    return response;
  }
};
```

### Error Handling & Retry

```javascript
const errorHandler = {
  id: "com.example.error-handler",
  
  onRequest: async (ctx, next) => {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        const response = await next();
        
        // Retry on server errors
        if (response.status >= 500 && attempts < maxAttempts - 1) {
          attempts++;
          console.warn(`⚠️ Server error, retrying (${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
          continue;
        }
        
        return response;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          console.error("❌ Request failed after", maxAttempts, "attempts");
          throw error;
        }
        console.warn(`⚠️ Request failed, retrying (${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }
};
```

### Content Type Converter

```javascript
const contentConverter = {
  id: "com.example.content-converter",
  
  onResponse: async (ctx, next) => {
    const response = await next();
    const contentType = response.headers["content-type"] || "";
    
    // Convert XML to JSON
    if (contentType.includes("application/xml")) {
      try {
        let body = response.body;
        if (body instanceof ReadableStream) {
          body = await new Response(body).text();
        }
        
        if (typeof body === "string") {
          // Simple XML to JSON conversion (use proper parser in production)
          const parser = new DOMParser();
          const xml = parser.parseFromString(body, "text/xml");
          const json = xmlToJson(xml);
          
          response.body = JSON.stringify(json);
          response.headers["content-type"] = "application/json";
          response.headers["content-length"] = response.body.length.toString();
        }
      } catch (e) {
        console.error("Failed to convert XML to JSON:", e);
      }
    }
    
    return response;
  }
};

function xmlToJson(xml) {
  // Simple XML to JSON converter
  const obj = {};
  if (xml.nodeType === 1) {
    if (xml.attributes.length > 0) {
      obj["@attributes"] = {};
      for (let j = 0; j < xml.attributes.length; j++) {
        const attribute = xml.attributes.item(j);
        obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
      }
    }
  }
  if (xml.hasChildNodes()) {
    for (let i = 0; i < xml.childNodes.length; i++) {
      const item = xml.childNodes.item(i);
      const nodeName = item.nodeName;
      if (typeof obj[nodeName] === "undefined") {
        obj[nodeName] = xmlToJson(item);
      }
    }
  }
  return obj;
}
```

### API Response Enhancer

```javascript
const apiEnhancer = {
  id: "com.example.api-enhancer",
  
  onResponse: async (ctx, next) => {
    const response = await next();
    
    // Only enhance API responses
    if (!ctx.request.remote.pathname.startsWith("/api/")) {
      return response;
    }
    
    const contentType = response.headers["content-type"] || "";
    if (!contentType.includes("application/json")) {
      return response;
    }
    
    try {
      let body = response.body;
      if (body instanceof ReadableStream) {
        body = await new Response(body).text();
      }
      
      if (typeof body === "string") {
        const data = JSON.parse(body);
        
        // Wrap response in standard envelope
        const enhanced = {
          success: response.status >= 200 && response.status < 300,
          status: response.status,
          data: data,
          meta: {
            timestamp: Date.now(),
            version: "1.0",
            enhanced: true
          }
        };
        
        response.body = JSON.stringify(enhanced);
        response.headers["content-length"] = response.body.length.toString();
      }
    } catch (e) {
      console.error("Failed to enhance API response:", e);
    }
    
    return response;
  }
};
```

## Combining Request and Response Middleware

```javascript
const fullCycleMiddleware = {
  id: "com.example.full-cycle",
  
  onRequest: async (ctx, next) => {
    // Mark request start
    ctx._startTime = Date.now();
    ctx._requestId = Math.random().toString(36).substr(2, 9);
    
    console.log(`🔵 Request ${ctx._requestId} started`);
    
    // Modify request
    ctx.headers["X-Request-ID"] = ctx._requestId;
    
    return await next(ctx);
  },
  
  onResponse: async (ctx, next) => {
    const response = await next();
    
    // Calculate duration
    const duration = Date.now() - (ctx.request._startTime || 0);
    
    // Add performance header
    response.headers["X-Response-Time"] = duration + "ms";
    response.headers["X-Request-ID"] = ctx.request._requestId;
    
    console.log(`🟢 Request ${ctx.request._requestId} completed in ${duration}ms`);
    
    return response;
  }
};
```

## Best Practices

### 1. Always Call next()

```javascript
// ✅ Good: Always call next
onRequest: async (ctx, next) => {
  // Do something
  return await next(ctx);
}

// ❌ Bad: Forgetting next breaks the chain
onRequest: async (ctx, next) => {
  // Do something
  // Missing return next()!
}
```

### 2. Handle Errors Gracefully

```javascript
onResponse: async (ctx, next) => {
  try {
    const response = await next();
    // Process response
    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    // Return fallback response
    return {
      status: 500,
      statusText: "Internal Error",
      headers: {},
      body: "An error occurred"
    };
  }
}
```

### 3. Check Content Types

```javascript
onResponse: async (ctx, next) => {
  const response = await next();
  const contentType = response.headers["content-type"] || "";
  
  if (contentType.includes("application/json")) {
    // Process JSON
  } else if (contentType.includes("text/html")) {
    // Process HTML
  }
  
  return response;
}
```

### 4. Update Content-Length

```javascript
onResponse: async (ctx, next) => {
  const response = await next();
  
  if (typeof response.body === "string") {
    // Always update content-length when modifying body
    response.headers["content-length"] = response.body.length.toString();
  }
  
  return response;
}
```

## Next Steps

- [WebSocket Middleware](./websocket-middleware.md) - Intercept WebSocket traffic
- [API Reference](./api-reference.md) - Complete API documentation
- [Examples](./examples.md) - More complete examples
