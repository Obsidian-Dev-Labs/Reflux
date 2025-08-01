import type {
  BareTransport,
  BareHeaders,
  TransferrableResponse as BareTransferrableResponse
} from "@mercuryworkshop/bare-mux";

import type { MiddlewareFunction, RequestContext, ResponseContext, MessagePortMessage, TransferrableResponse, RefluxPlugin } from "./api";

const REFLUX_HEADER = "reflux-middleware";
const REFLUX_VERSION = "1.0.0";

export class MiddlewareTransport implements BareTransport {
  ready = false;
  private middleware: Map<string, MiddlewareFunction> = new Map();
  private plugins: Map<string, RefluxPlugin> = new Map();
  private controlPort?: MessagePort;

  constructor(private readonly inner: BareTransport, controlPort?: MessagePort) {
    this.controlPort = controlPort;
    if (this.controlPort) {
      this.setupControlPort();
    }
  }

  private setupControlPort() {
    if (!this.controlPort) return;
    
    this.controlPort.onmessage = async (event) => {
      const message: MessagePortMessage = event.data;
      
      if (message.reflux !== REFLUX_HEADER) {
        return;
      }
      
      if (message.version && !this.isVersionCompatible(message.version)) {
        console.warn(`Reflux Transport version mismatch. Expected: ${REFLUX_VERSION}, Received: ${message.version}`);
      }
      
      try {
        switch (message.type) {
          case 'addMiddleware':
            if (message.middleware) {
              this.middleware.set(message.middleware.id, message.middleware);
            } else if (message.id && message.fn) {
              const middlewareFunction = eval(`(${message.fn})`);
              this.middleware.set(message.id, middlewareFunction);
            }
            this.sendResponse(message.messageId!, { success: true });
            break;
            
          case 'removeMiddleware':
            if (message.id) {
              this.middleware.delete(message.id);
              this.sendResponse(message.messageId!, { success: true });
            }
            break;
            
          case 'setMiddlewareEnabled':
            if (message.id && this.middleware.has(message.id)) {
              const middleware = this.middleware.get(message.id)!;
              middleware.enabled = message.enabled!;
              this.sendResponse(message.messageId!, { success: true });
            }
            break;
            
          case 'listMiddleware':
            const list = Array.from(this.middleware.entries()).map(([id, middleware]) => ({
              id,
              enabled: this.isMiddlewareEnabled(middleware)
            }));
            this.sendResponse(message.messageId!, list);
            break;

          case 'addPlugin':
            if (message.plugin) {
              await this.addPlugin(message.plugin);
              this.sendResponse(message.messageId!, { success: true });
            }
            break;

          case 'removePlugin':
            if (message.id) {
              this.removePlugin(message.id);
              this.sendResponse(message.messageId!, { success: true });
            }
            break;

          case 'listPlugins':
            const pluginList = Array.from(this.plugins.entries()).map(([name, plugin]) => ({
              name,
              sites: plugin.sites,
              enabled: this.middleware.has(name) ? this.isMiddlewareEnabled(this.middleware.get(name)!) : false
            }));
            this.sendResponse(message.messageId!, pluginList);
            break;
        }
      } catch (error) {
        this.sendResponse(message.messageId!, { error: error.message });
      }
    };
  }

  private isVersionCompatible(version: string): boolean {
    const [majorReceived] = version.split('.').map(Number);
    const [majorExpected] = REFLUX_VERSION.split('.').map(Number);
    return majorReceived === majorExpected;
  }

  private sendResponse(messageId: string, data: any) {
    if (this.controlPort) {
      this.controlPort.postMessage({
        reflux: REFLUX_HEADER,
        version: REFLUX_VERSION,
        type: 'response',
        messageId,
        data
      });
    }
  }

  private isMiddlewareEnabled(middleware: MiddlewareFunction): boolean {
    if (typeof middleware.enabled === 'function') {
      return middleware.enabled();
    }
    return middleware.enabled !== false;
  }

  private async addPlugin(plugin: RefluxPlugin): Promise<void> {
    this.plugins.set(plugin.name, plugin);

    const pluginMiddleware: MiddlewareFunction = {
      id: plugin.name,
      onResponse: async (ctx, next) => {
        const response = await next();
        
        const shouldRun = this.shouldPluginRunOnSite(plugin, ctx.request.remote);
        
        if (shouldRun && response.headers["content-type"]?.includes("text/html")) {
          if (response.body instanceof ReadableStream) {
            try {
              const [stream1, stream2] = response.body.tee();
              
              const body = await this.streamToString(stream1);
              
              if (body && body.includes("</head>")) {
                try {
                  const result = this.executePlugin(plugin, body, ctx.request.remote.href, response.headers);
                  
                  if (typeof result === 'string' && result !== body) {
                    return {
                      ...response,
                      body: result,
                      headers: { 
                        ...response.headers, 
                        "content-length": String(result.length)
                      }
                    };
                  }
                } catch (error) {
                  console.error(`Error executing plugin ${plugin.name}:`, error);
                }
              }
              
              return {
                ...response,
                body: stream2
              };
              
            } catch (error) {
              console.error(`Error processing stream for plugin ${plugin.name}:`, error);
              return response;
            }
          } else {
            const body = await this.bodyToString(response.body);
            
            if (body && body.includes("</head>")) {
              try {
                const result = this.executePlugin(plugin, body, ctx.request.remote.href, response.headers);
                
                if (typeof result === 'string' && result !== body) {
                  return {
                    ...response,
                    body: result,
                    headers: { 
                      ...response.headers, 
                      "content-length": String(result.length)
                    }
                  };
                }
              } catch (error) {
                console.error(`Error executing plugin ${plugin.name}:`, error);
              }
            }
          }
        }
        
        return response;
      }
    };

    this.middleware.set(plugin.name, pluginMiddleware);
  }

  private executePlugin(plugin: RefluxPlugin, body: string, url: string, headers: Record<string, string>): string {
    const browserCodeMatch = plugin.function.match(/\/\*\s*@browser\s*\*\/([\s\S]*?)\/\*\s*@\/browser\s*\*\//);
    let modifiedBody = body;
    
    if (browserCodeMatch) {
      const browserCode = browserCodeMatch[1].trim();
      const scriptTag = `<script>
        (function() {
          const url = "${url}";
          const pluginName = "${plugin.name}";
          ${browserCode}
        })();
      </script>`;
      
      modifiedBody = modifiedBody.replace('</head>', scriptTag + '</head>');
    }
    
    let serverSideCode = plugin.function;
    if (browserCodeMatch) {
      serverSideCode = serverSideCode.replace(browserCodeMatch[0], '');
    }
    
    if (serverSideCode.trim()) {
      try {
        const pluginFunction = new Function('body', 'url', 'headers', serverSideCode);
        const result = pluginFunction(modifiedBody, url, headers);
        
        if (typeof result === 'string') {
          return result;
        }
      } catch (error) {
        console.error(`Error in server-side code for plugin ${plugin.name}:`, error);
      }
    }
    
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