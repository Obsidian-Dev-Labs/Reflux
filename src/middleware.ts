import type {
  BareTransport,
  BareHeaders,
  TransferrableResponse as BareTransferrableResponse
} from "@mercuryworkshop/bare-mux";

import type { MiddlewareFunction, RequestContext, ResponseContext, MessagePortMessage, TransferrableResponse, RefluxPlugin } from "./api";

import localforage from "localforage";

export class MiddlewareTransport implements BareTransport {
  ready = false;
  #middleware: Map<string, MiddlewareFunction> = new Map();
  #plugins: Map<string, RefluxPlugin> = new Map();
  #pluginStorage = localforage.createInstance({
    name: 'Reflux',
    storeName: 'plugins'
  });
  #statusStorage = localforage.createInstance({
    name: 'Reflux',
    storeName: 'status'
  });
readonly #inner: BareTransport;
  constructor(inner: BareTransport) {
    try {
      const innerAny = (this.#inner = inner) as any;
      console.debug('%cRF%c Constructed with inner transport:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', {
        name: innerAny?.constructor?.name || '<unknown>',
        ready: innerAny?.ready
      });
    } catch (e) {
      /* ignore */
    }
  }

  public async reloadPlugins(): Promise<void> {
    console.log('%cRF%c Reloading plugins...', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    
    this.#plugins.clear();
    this.#middleware.clear();
    
    await this.#loadPluginsFromStorage();
    
    console.log('%cRF%c Plugin reload complete', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
  }

  async #loadPluginsFromStorage(): Promise<void> {
  console.debug('%cRF%c loadPluginsFromStorage() called', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    try {
      const enabledPluginIds = await this.#statusStorage.getItem<string[]>('enabled') || [];
      
      const pluginKeys = await this.#pluginStorage.keys();
      
      console.log('%cRF%c Debug Info:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      console.log('%cRF%c All plugin keys in storage:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', pluginKeys);
      console.log('%cRF%c Enabled plugin IDs:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', enabledPluginIds);
      
      const metadataStorage = localforage.createInstance({
        name: 'Reflux',
        storeName: 'pluginMetadata'
      });
      
      for (const pluginId of pluginKeys) {
        const pluginCode = await this.#pluginStorage.getItem<string>(pluginId);
        const metadata = await metadataStorage.getItem<{sites: string[], name: string}>(pluginId);
        
        console.log(`%cRF%c [Plugin: ${pluginId}]`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        console.log(`%cRF%c    Enabled: ${enabledPluginIds.includes(pluginId)}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        console.log(`%cRF%c    Sites: ${metadata?.sites ? JSON.stringify(metadata.sites) : "['*'] (default)"}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        console.log(`%cRF%c    Code length: ${pluginCode ? pluginCode.length : 0} characters`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        
        if (pluginCode && pluginCode.length > 0) {
          console.log(`%cRF%c    Code preview: ${pluginCode.substring(0, 100)}${pluginCode.length > 100 ? '...' : ''}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        }
        
        if (enabledPluginIds.includes(pluginId)) {
          if (pluginCode) {
            const plugin: RefluxPlugin = {
              function: pluginCode,
              name: pluginId,
              sites: metadata?.sites || ['*']
            };
            
            console.log(`%cRF%c    Loading plugin: ${pluginId}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
            await this.#addPlugin(plugin);
            console.log(`%cRF%c    Plugin loaded successfully: ${pluginId}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
          } else {
            console.log(`%cRF%c    Plugin has no code: ${pluginId}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
          }
        } else {
          console.log(`%cRF%c    Skipping disabled plugin: ${pluginId}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        }
      }
      
      console.log(`%cRF%c Summary:`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      console.log(`%cRF%c    Total plugins in storage: ${pluginKeys.length}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      console.log(`%cRF%c    Enabled plugins: ${enabledPluginIds.length}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      console.log(`%cRF%c    Loaded plugins: ${this.#plugins.size}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      console.log(`%cRF%c    Active middleware: ${this.#middleware.size}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    } catch (error) {
      console.error('%cRF%c Error loading plugins from storage:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', error);
    }
  }

  #isMiddlewareEnabled(middleware: MiddlewareFunction): boolean {
    if (typeof middleware.enabled === 'function') {
      return middleware.enabled();
    }
    return middleware.enabled !== false;
  }

  async #addPlugin(plugin: RefluxPlugin): Promise<void> {
    console.log(`%cRF%c Adding plugin: ${plugin.name}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    console.log(`%cRF%c    Sites: ${JSON.stringify(plugin.sites)}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    console.log(`%cRF%c    Function length: ${plugin.function.length} characters`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    
    this.#plugins.set(plugin.name, plugin);

    const pluginMiddleware: MiddlewareFunction = {
      id: plugin.name,
      onResponse: async (ctx, next) => {
        const response = await next();
        
  const shouldRun = this.#shouldPluginRunOnSite(plugin, ctx.request.remote);

  const contentType = this.#normalizeHeaderValue(response.headers, 'content-type');

  console.log(`%cRF%c [${plugin.name}] URL: ${ctx.request.remote.href}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
  console.log(`%cRF%c [${plugin.name}] Should run: ${shouldRun}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
  console.log(`%cRF%c [${plugin.name}] Content-Type: ${contentType || 'none'}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');

  if (shouldRun && contentType?.includes("text/html")) {
          console.log(`%cRF%c [${plugin.name}] Executing plugin on HTML content`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
          
          if (response.body instanceof ReadableStream) {
            try {
              const [stream1, stream2] = response.body.tee();
              
              const body = await this.#streamToString(stream1);
              
              if (body && body.includes("</head>")) {
                try {
                  console.log(`%cRF%c [${plugin.name}] Processing HTML body (${body.length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
                  const result = this.#executePlugin(plugin, body, ctx.request.remote.href, this.#normalizeHeaders(response.headers));
                  
                  if (typeof result === 'string' && result !== body) {
                    console.log(`%cRF%c [${plugin.name}] Plugin modified content (${result.length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
                    return {
                      ...response,
                      body: result,
                      headers: { 
                        ...response.headers, 
                        "content-length": String(result.length)
                      }
                    };
                  } else {
                    console.log(`%cRF%c [${plugin.name}] Plugin returned unchanged content`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
                  }
                } catch (error) {
                  console.error(`%cRF%c [${plugin.name}] Error executing plugin:`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', error);
                }
              } else {
                console.log(`%cRF%c [${plugin.name}] No </head> tag found in content`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
              }
              
              return {
                ...response,
                body: stream2
              };
              
            } catch (error) {
              console.error(`%cRF%c [${plugin.name}] Error processing stream:`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', error);
              return response;
            }
          } else {
            const body = await this.#bodyToString(response.body);
            
            if (body && body.includes("</head>")) {
              try {
                console.log(`%cRF%c [${plugin.name}] Processing HTML body (${body.length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
                  const result = this.#executePlugin(plugin, body, ctx.request.remote.href, this.#normalizeHeaders(response.headers));
                
                if (typeof result === 'string' && result !== body) {
                  console.log(`%cRF%c [${plugin.name}] Plugin modified content (${result.length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
                  return {
                    ...response,
                    body: result,
                    headers: { 
                      ...response.headers, 
                      "content-length": String(result.length)
                    }
                  };
                } else {
                  console.log(`%cRF%c [${plugin.name}] Plugin returned unchanged content`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
                }
              } catch (error) {
                console.error(`%cRF%c [${plugin.name}] Error executing plugin:`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', error);
              }
            } else {
              console.log(`%cRF%c [${plugin.name}] No </head> tag found in content`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
            }
          }
        } else if (!shouldRun) {
          console.log(`%cRF%c [${plugin.name}] Skipping - site not in target list`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        } else if (!response.headers["content-type"]?.includes("text/html")) {
          console.log(`%cRF%c [${plugin.name}] Skipping - not HTML content`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        }
        
        return response;
      }
    };

    this.#middleware.set(plugin.name, pluginMiddleware);
    console.log(`%cRF%c Plugin middleware registered: ${plugin.name}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
  }

  #executePlugin(plugin: RefluxPlugin, body: string, url: string, headers: Record<string, string>): string {
    console.log(`%cRF%c Running plugin: ${plugin.name}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    console.log(`%cRF%c    URL: ${url}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    console.log(`%cRF%c    Body length: ${body.length}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    
    const browserCodeMatch = plugin.function.match(/\/\*\s*@browser\s*\*\/([\s\S]*?)\/\*\s*@\/browser\s*\*\//);
    let modifiedBody = body;
    
    if (browserCodeMatch) {
      const browserCode = browserCodeMatch[1].trim();
      console.log(`%cRF%c [${plugin.name}] Found browser code (${browserCode.length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      const scriptTag = `<script>
        (function() {
          const url = "${url}";
          const pluginName = "${plugin.name}";
          ${browserCode}
        })();
      </script>`;
      
      modifiedBody = modifiedBody.replace('</head>', scriptTag + '</head>');
      console.log(`%cRF%c [${plugin.name}] Browser code injected`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    } else {
      console.log(`%cRF%c [${plugin.name}] No browser code found`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    }
    
    let serverSideCode = plugin.function;
    if (browserCodeMatch) {
      serverSideCode = serverSideCode.replace(browserCodeMatch[0], '');
    }
    
    if (serverSideCode.trim()) {
      console.log(`%cRF%c [${plugin.name}] Found server-side code (${serverSideCode.trim().length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      console.log(`%cRF%c [${plugin.name}] Server code preview: ${serverSideCode.trim().substring(0, 100)}${serverSideCode.trim().length > 100 ? '...' : ''}`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
      
      try {
        const pluginFunction = new Function('body', 'url', 'headers', serverSideCode);
        const result = pluginFunction(modifiedBody, url, headers);
        
        if (typeof result === 'string') {
          console.log(`%cRF%c [${plugin.name}] Server-side code executed successfully, returned modified body (${result.length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
          return result;
        } else {
          console.log(`%cRF%c [${plugin.name}] Server-side code executed but returned no string result`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
        }
      } catch (error) {
        console.error(`%cRF%c [${plugin.name}] Error in server-side code:`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', error);
      }
    } else {
      console.log(`%cRF%c [${plugin.name}] No server-side code found`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    }
    
    console.log(`%cRF%c [${plugin.name}] Returning body (${modifiedBody.length} chars)`, 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    return modifiedBody;
  }

  #removePlugin(name: string): void {
    this.#plugins.delete(name);
    this.#middleware.delete(name);
  }

  #shouldPluginRunOnSite(plugin: RefluxPlugin, url: URL): boolean {
    if (plugin.sites.includes('*')) {
      return true;
    }

    return plugin.sites.some(site => {
      if (site.includes('*')) {
        const pattern = site.replace(/\*/g, '.*');
        const regex = new RegExp(pattern, 'i');
        return regex.test(url.hostname) || regex.test(url.href);
      }
      return url.hostname.includes(site) || url.href.includes(site);
    });
  }

  #normalizeHeaders(headers: Record<string, any>): Record<string, string> {
    const out: Record<string, string> = {};
    for (const key of Object.keys(headers || {})) {
      const val = headers[key];
      if (Array.isArray(val)) {
        out[key.toLowerCase()] = val.join(', ');
      } else if (typeof val === 'string') {
        out[key.toLowerCase()] = val;
      } else if (val == null) {
        out[key.toLowerCase()] = '';
      } else {
        out[key.toLowerCase()] = String(val);
      }
    }
    return out;
  }

  #normalizeHeaderValue(headers: Record<string, any>, name: string): string | null {
    const n = name.toLowerCase();
    const normalized = this.#normalizeHeaders(headers || {});
    return normalized[n] || null;
  }

  async #bodyToString(body: any): Promise<string | null> {
    if (!body) return null;
    if (typeof body === 'string') return body;
    if (body instanceof Blob) return await body.text();
    if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
    if (body instanceof ReadableStream) {
      return await this.#streamToString(body);
    }
    return String(body);
  }

  async #streamToString(stream: ReadableStream): Promise<string> {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let totalLength = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        totalLength += value.length;
      }
      
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      return new TextDecoder().decode(combined);
    } finally {
      reader.releaseLock();
    }
  }

  async init() {
    console.debug('%cRF%c init() - initializing inner transport', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    try {
      await this.#inner.init?.();
    } catch (err) {
      console.error('%cRF%c Error initializing inner transport:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', err);
      throw err;
    }

    console.debug('%cRF%c inner transport initialized, loading plugins', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    await this.#loadPluginsFromStorage();
    this.ready = true;
    console.debug('%cRF%c init() complete, middleware ready', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
  }

  async meta() {
    return this.#inner.meta?.();
  }

  async request(
    remote: URL,
    method: string,
    body: BodyInit | null,
    headers: BareHeaders,
    signal?: AbortSignal
  ): Promise<BareTransferrableResponse> {
    const requestContext: RequestContext = {
      remote,
      method,
      body,
      headers: headers as Record<string, string>,
      signal
    };

    const processedRequest = await this.#processRequestMiddleware(requestContext);
    
    const response = await this.#inner.request(
      processedRequest.remote,
      processedRequest.method,
      processedRequest.body,
      processedRequest.headers,
      processedRequest.signal
    );

    const responseContext: ResponseContext = {
      request: processedRequest
    };

    const processedResponse = await this.#processResponseMiddleware(responseContext, response);
    
    return processedResponse;
  }

  async #processRequestMiddleware(initialContext: RequestContext): Promise<RequestContext> {
    let currentContext = { ...initialContext };
    
    const enabledMiddleware = Array.from(this.#middleware.values())
      .filter(middleware => this.#isMiddlewareEnabled(middleware) && middleware.onRequest);

    for (const middleware of enabledMiddleware) {
      if (middleware.onRequest) {
        try {
          const next = async (modifiedReq?: Partial<RequestContext>) => {
            if (modifiedReq) {
              currentContext = { ...currentContext, ...modifiedReq };
            }
            return currentContext;
          };

          const result = await middleware.onRequest(currentContext, next);
          if (result) {
            currentContext = result;
          }
        } catch (error) {
          console.error('%cRF%c Error in request middleware:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', `${middleware.id}:`, error);
        }
      }
    }

    return currentContext;
  }

  async #processResponseMiddleware(
    context: ResponseContext, 
    initialResponse: BareTransferrableResponse
  ): Promise<BareTransferrableResponse> {
    let currentResponse: BareTransferrableResponse = { ...initialResponse };
    
    const enabledMiddleware = Array.from(this.#middleware.values())
      .filter(middleware => this.#isMiddlewareEnabled(middleware) && middleware.onResponse);

    for (const middleware of enabledMiddleware) {
      if (middleware.onResponse) {
        try {
          const next = async (modifiedResp?: Partial<TransferrableResponse>) => {
            if (modifiedResp) {
              const bareResponse: BareTransferrableResponse = {
                body: modifiedResp.body || currentResponse.body,
                headers: modifiedResp.headers || currentResponse.headers,
                status: modifiedResp.status || currentResponse.status,
                statusText: modifiedResp.statusText || currentResponse.statusText
              };
              currentResponse = bareResponse;
            }
            return {
              body: currentResponse.body,
              headers: currentResponse.headers as Record<string, string>,
              status: currentResponse.status,
              statusText: currentResponse.statusText
            } as TransferrableResponse;
          };

          const result = await middleware.onResponse(context, next);
          if (result) {
            currentResponse = {
              body: result.body || currentResponse.body,
              headers: result.headers || currentResponse.headers,
              status: result.status || currentResponse.status,
              statusText: result.statusText || currentResponse.statusText
            };
          }
        } catch (error) {
          console.error('%cRF%c Error in response middleware:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', `${middleware.id}:`, error);
        }
      }
    }

    return currentResponse;
  }

  connect(
    url: URL,
    protocols: string[],
    requestHeaders: BareHeaders,
    onopen: (protocol: string) => void,
    onmessage: (data: Blob | ArrayBuffer | string) => void,
    onclose: (code: number, reason: string) => void,
    onerror: (error: string) => void
  ): [(data: Blob | ArrayBuffer | string) => void, (code: number, reason: string) => void] {
    const [send, close] = this.#inner.connect(
      url,
      protocols,
      requestHeaders,
      onopen,
      (data: Blob | ArrayBuffer | string) => {
        this.#processWebSocketMessage(data, "receive").then(processedData => {
          onmessage(processedData);
        });
      },
      onclose,
      onerror
    );

    const wrappedSend = async (data: Blob | ArrayBuffer | string) => {
      const processedData = await this.#processWebSocketMessage(data, "send");
      send(processedData);
    };

    return [wrappedSend, close];
  }

  async #processWebSocketMessage(
    data: Blob | ArrayBuffer | string, 
    direction: "send" | "receive"
  ): Promise<Blob | ArrayBuffer | string> {
    let processedData = data;
    
    const enabledMiddleware = Array.from(this.#middleware.values())
      .filter(middleware => this.#isMiddlewareEnabled(middleware) && middleware.modifyWebSocketMessage);

    for (const middleware of enabledMiddleware) {
      if (middleware.modifyWebSocketMessage) {
        try {
          const result = await middleware.modifyWebSocketMessage(processedData, direction);
          if (result !== undefined) {
            processedData = result;
          }
        } catch (error) {
          console.error('%cRF%c Error in WebSocket middleware:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', `${middleware.id}:`, error);
        }
      }
    }

    return processedData;
  }
}