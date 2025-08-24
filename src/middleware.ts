import type {
  BareTransport,
  BareHeaders,
  TransferrableResponse as BareTransferrableResponse
} from "@mercuryworkshop/bare-mux";

import type { MiddlewareFunction, RequestContext, ResponseContext, MessagePortMessage, TransferrableResponse, RefluxPlugin } from "./api";

import localforage from "localforage";

export class MiddlewareTransport implements BareTransport {
  ready = false;
  private middleware: Map<string, MiddlewareFunction> = new Map();
  private plugins: Map<string, RefluxPlugin> = new Map();
  private pluginStorage = localforage.createInstance({
    name: 'Reflux',
    storeName: 'plugins'
  });
  private statusStorage = localforage.createInstance({
    name: 'Reflux',
    storeName: 'status'
  });

  constructor(private readonly inner: BareTransport) {
    this.loadPluginsFromStorage();
  }

  public async reloadPlugins(): Promise<void> {
    console.log('🔄 [Reflux Middleware] Reloading plugins...');
    
    this.plugins.clear();
    this.middleware.clear();
    
    await this.loadPluginsFromStorage();
    
    console.log('✅ [Reflux Middleware] Plugin reload complete');
  }

  private async loadPluginsFromStorage(): Promise<void> {
    try {
      const enabledPluginIds = await this.statusStorage.getItem<string[]>('enabled') || [];
      
      const pluginKeys = await this.pluginStorage.keys();
      
      console.log('🔍 [Reflux Middleware] Debug Info:');
      console.log('📋 All plugin keys in storage:', pluginKeys);
      console.log('✅ Enabled plugin IDs:', enabledPluginIds);
      
      const metadataStorage = localforage.createInstance({
        name: 'Reflux',
        storeName: 'pluginMetadata'
      });
      
      for (const pluginId of pluginKeys) {
        const pluginCode = await this.pluginStorage.getItem<string>(pluginId);
        const metadata = await metadataStorage.getItem<{sites: string[], name: string}>(pluginId);
        
        console.log(`\n🔍 [Plugin: ${pluginId}]`);
        console.log(`   Enabled: ${enabledPluginIds.includes(pluginId) ? '✅' : '❌'}`);
        console.log(`   Sites: ${metadata?.sites ? JSON.stringify(metadata.sites) : "['*'] (default)"}`);
        console.log(`   Code length: ${pluginCode ? pluginCode.length : 0} characters`);
        
        if (pluginCode && pluginCode.length > 0) {
          console.log(`   Code preview: ${pluginCode.substring(0, 100)}${pluginCode.length > 100 ? '...' : ''}`);
        }
        
        if (enabledPluginIds.includes(pluginId)) {
          if (pluginCode) {
            const plugin: RefluxPlugin = {
              function: pluginCode,
              name: pluginId,
              sites: metadata?.sites || ['*']
            };
            
            console.log(`   🚀 Loading plugin: ${pluginId}`);
            await this.addPlugin(plugin);
            console.log(`   ✅ Plugin loaded successfully: ${pluginId}`);
          } else {
            console.log(`   ❌ Plugin has no code: ${pluginId}`);
          }
        } else {
          console.log(`   ⏭️  Skipping disabled plugin: ${pluginId}`);
        }
      }
      
      console.log(`\n📊 [Reflux Middleware] Summary:`);
      console.log(`   Total plugins in storage: ${pluginKeys.length}`);
      console.log(`   Enabled plugins: ${enabledPluginIds.length}`);
      console.log(`   Loaded plugins: ${this.plugins.size}`);
      console.log(`   Active middleware: ${this.middleware.size}`);
    } catch (error) {
      console.error('Error loading plugins from storage:', error);
    }
  }

  private isMiddlewareEnabled(middleware: MiddlewareFunction): boolean {
    if (typeof middleware.enabled === 'function') {
      return middleware.enabled();
    }
    return middleware.enabled !== false;
  }

  private async addPlugin(plugin: RefluxPlugin): Promise<void> {
    console.log(`🔧 [addPlugin] Adding plugin: ${plugin.name}`);
    console.log(`   Sites: ${JSON.stringify(plugin.sites)}`);
    console.log(`   Function length: ${plugin.function.length} characters`);
    
    this.plugins.set(plugin.name, plugin);

    const pluginMiddleware: MiddlewareFunction = {
      id: plugin.name,
      onResponse: async (ctx, next) => {
        const response = await next();
        
        const shouldRun = this.shouldPluginRunOnSite(plugin, ctx.request.remote);
        
        console.log(`🌐 [${plugin.name}] URL: ${ctx.request.remote.href}`);
        console.log(`🌐 [${plugin.name}] Should run: ${shouldRun ? '✅' : '❌'}`);
        console.log(`🌐 [${plugin.name}] Content-Type: ${response.headers["content-type"] || 'none'}`);
        
        if (shouldRun && response.headers["content-type"]?.includes("text/html")) {
          console.log(`🚀 [${plugin.name}] Executing plugin on HTML content`);
          
          if (response.body instanceof ReadableStream) {
            try {
              const [stream1, stream2] = response.body.tee();
              
              const body = await this.streamToString(stream1);
              
              if (body && body.includes("</head>")) {
                try {
                  console.log(`📝 [${plugin.name}] Processing HTML body (${body.length} chars)`);
                  const result = this.executePlugin(plugin, body, ctx.request.remote.href, response.headers);
                  
                  if (typeof result === 'string' && result !== body) {
                    console.log(`✅ [${plugin.name}] Plugin modified content (${result.length} chars)`);
                    return {
                      ...response,
                      body: result,
                      headers: { 
                        ...response.headers, 
                        "content-length": String(result.length)
                      }
                    };
                  } else {
                    console.log(`ℹ️  [${plugin.name}] Plugin returned unchanged content`);
                  }
                } catch (error) {
                  console.error(`❌ [${plugin.name}] Error executing plugin:`, error);
                }
              } else {
                console.log(`ℹ️  [${plugin.name}] No </head> tag found in content`);
              }
              
              return {
                ...response,
                body: stream2
              };
              
            } catch (error) {
              console.error(`❌ [${plugin.name}] Error processing stream:`, error);
              return response;
            }
          } else {
            const body = await this.bodyToString(response.body);
            
            if (body && body.includes("</head>")) {
              try {
                console.log(`📝 [${plugin.name}] Processing HTML body (${body.length} chars)`);
                const result = this.executePlugin(plugin, body, ctx.request.remote.href, response.headers);
                
                if (typeof result === 'string' && result !== body) {
                  console.log(`✅ [${plugin.name}] Plugin modified content (${result.length} chars)`);
                  return {
                    ...response,
                    body: result,
                    headers: { 
                      ...response.headers, 
                      "content-length": String(result.length)
                    }
                  };
                } else {
                  console.log(`ℹ️  [${plugin.name}] Plugin returned unchanged content`);
                }
              } catch (error) {
                console.error(`❌ [${plugin.name}] Error executing plugin:`, error);
              }
            } else {
              console.log(`ℹ️  [${plugin.name}] No </head> tag found in content`);
            }
          }
        } else if (!shouldRun) {
          console.log(`⏭️  [${plugin.name}] Skipping - site not in target list`);
        } else if (!response.headers["content-type"]?.includes("text/html")) {
          console.log(`⏭️  [${plugin.name}] Skipping - not HTML content`);
        }
        
        return response;
      }
    };

    this.middleware.set(plugin.name, pluginMiddleware);
    console.log(`✅ [addPlugin] Plugin middleware registered: ${plugin.name}`);
  }

  private executePlugin(plugin: RefluxPlugin, body: string, url: string, headers: Record<string, string>): string {
    console.log(`🔧 [executePlugin] Running plugin: ${plugin.name}`);
    console.log(`   URL: ${url}`);
    console.log(`   Body length: ${body.length}`);
    
    const browserCodeMatch = plugin.function.match(/\/\*\s*@browser\s*\*\/([\s\S]*?)\/\*\s*@\/browser\s*\*\//);
    let modifiedBody = body;
    
    if (browserCodeMatch) {
      const browserCode = browserCodeMatch[1].trim();
      console.log(`🌐 [${plugin.name}] Found browser code (${browserCode.length} chars)`);
      const scriptTag = `<script>
        (function() {
          const url = "${url}";
          const pluginName = "${plugin.name}";
          ${browserCode}
        })();
      </script>`;
      
      modifiedBody = modifiedBody.replace('</head>', scriptTag + '</head>');
      console.log(`✅ [${plugin.name}] Browser code injected`);
    } else {
      console.log(`ℹ️  [${plugin.name}] No browser code found`);
    }
    
    let serverSideCode = plugin.function;
    if (browserCodeMatch) {
      serverSideCode = serverSideCode.replace(browserCodeMatch[0], '');
    }
    
    if (serverSideCode.trim()) {
      console.log(`🖥️  [${plugin.name}] Found server-side code (${serverSideCode.trim().length} chars)`);
      console.log(`🖥️  [${plugin.name}] Server code preview: ${serverSideCode.trim().substring(0, 100)}${serverSideCode.trim().length > 100 ? '...' : ''}`);
      
      try {
        const pluginFunction = new Function('body', 'url', 'headers', serverSideCode);
        const result = pluginFunction(modifiedBody, url, headers);
        
        if (typeof result === 'string') {
          console.log(`✅ [${plugin.name}] Server-side code executed successfully, returned modified body (${result.length} chars)`);
          return result;
        } else {
          console.log(`ℹ️  [${plugin.name}] Server-side code executed but returned no string result`);
        }
      } catch (error) {
        console.error(`❌ [${plugin.name}] Error in server-side code:`, error);
      }
    } else {
      console.log(`ℹ️  [${plugin.name}] No server-side code found`);
    }
    
    console.log(`📤 [${plugin.name}] Returning body (${modifiedBody.length} chars)`);
    return modifiedBody;
  }

  private removePlugin(name: string): void {
    this.plugins.delete(name);
    this.middleware.delete(name);
  }

  private shouldPluginRunOnSite(plugin: RefluxPlugin, url: URL): boolean {
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

  private async bodyToString(body: any): Promise<string | null> {
    if (!body) return null;
    if (typeof body === 'string') return body;
    if (body instanceof Blob) return await body.text();
    if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
    if (body instanceof ReadableStream) {
      return await this.streamToString(body);
    }
    return String(body);
  }

  private async streamToString(stream: ReadableStream): Promise<string> {
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
    await this.inner.init?.();
    this.ready = true;
  }

  async meta() {
    return this.inner.meta?.();
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

    const processedRequest = await this.processRequestMiddleware(requestContext);
    
    const response = await this.inner.request(
      processedRequest.remote,
      processedRequest.method,
      processedRequest.body,
      processedRequest.headers,
      processedRequest.signal
    );

    const responseContext: ResponseContext = {
      request: processedRequest
    };

    const processedResponse = await this.processResponseMiddleware(responseContext, response);
    
    return processedResponse;
  }

  private async processRequestMiddleware(initialContext: RequestContext): Promise<RequestContext> {
    let currentContext = { ...initialContext };
    
    const enabledMiddleware = Array.from(this.middleware.values())
      .filter(middleware => this.isMiddlewareEnabled(middleware) && middleware.onRequest);

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
          console.error(`Error in request middleware ${middleware.id}:`, error);
        }
      }
    }

    return currentContext;
  }

  private async processResponseMiddleware(
    context: ResponseContext, 
    initialResponse: BareTransferrableResponse
  ): Promise<BareTransferrableResponse> {
    let currentResponse: BareTransferrableResponse = { ...initialResponse };
    
    const enabledMiddleware = Array.from(this.middleware.values())
      .filter(middleware => this.isMiddlewareEnabled(middleware) && middleware.onResponse);

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
          console.error(`Error in response middleware ${middleware.id}:`, error);
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
    const [send, close] = this.inner.connect(
      url,
      protocols,
      requestHeaders,
      onopen,
      (data: Blob | ArrayBuffer | string) => {
        this.processWebSocketMessage(data, "receive").then(processedData => {
          onmessage(processedData);
        });
      },
      onclose,
      onerror
    );

    const wrappedSend = async (data: Blob | ArrayBuffer | string) => {
      const processedData = await this.processWebSocketMessage(data, "send");
      send(processedData);
    };

    return [wrappedSend, close];
  }

  private async processWebSocketMessage(
    data: Blob | ArrayBuffer | string, 
    direction: "send" | "receive"
  ): Promise<Blob | ArrayBuffer | string> {
    let processedData = data;
    
    const enabledMiddleware = Array.from(this.middleware.values())
      .filter(middleware => this.isMiddlewareEnabled(middleware) && middleware.modifyWebSocketMessage);

    for (const middleware of enabledMiddleware) {
      if (middleware.modifyWebSocketMessage) {
        try {
          const result = await middleware.modifyWebSocketMessage(processedData, direction);
          if (result !== undefined) {
            processedData = result;
          }
        } catch (error) {
          console.error(`Error in WebSocket middleware ${middleware.id}:`, error);
        }
      }
    }

    return processedData;
  }
}