export interface MiddlewareFunction {
  id: string;
  enabled?: boolean | (() => boolean);
  onRequest?: (ctx: RequestContext, next: NextFunction) => Promise<RequestContext | void>;
  onResponse?: (ctx: ResponseContext, next: NextResponseFunction) => Promise<TransferrableResponse | void>;
  modifyWebSocketMessage?: (data: string | Blob | ArrayBuffer, direction: "send" | "receive") => Promise<string | Blob | ArrayBuffer> | string | Blob | ArrayBuffer;
}

export interface RefluxPlugin {
  function: string;
  name: string;
  sites: string[] | ['*'];
}

export interface RequestContext {
  remote: URL;
  method: string;
  body: BodyInit | null;
  headers: Record<string, string>;
  signal?: AbortSignal;
}

export interface ResponseContext {
  request: RequestContext;
}

export interface TransferrableResponse {
  body: string | Blob | ArrayBuffer | ReadableStream<any> | null;
  headers: Record<string, string>;
  status: number;
  statusText: string;
}

type NextFunction = (modifiedReq?: Partial<RequestContext>) => Promise<RequestContext>;
type NextResponseFunction = (modifiedResp?: Partial<TransferrableResponse>) => Promise<TransferrableResponse>;

export interface MessagePortMessage {
  reflux: string;
  version: string;
  type: 'addMiddleware' | 'removeMiddleware' | 'setMiddlewareEnabled' | 'listMiddleware' | 'addPlugin' | 'removePlugin' | 'listPlugins' | 'response';
  id?: string;
  middleware?: MiddlewareFunction;
  plugin?: RefluxPlugin;
  fn?: string;
  enabled?: boolean;
  data?: any;
  messageId?: string;
}

const REFLUX_HEADER = "reflux-middleware";
const REFLUX_VERSION = "1.0.0";

export class RefluxAPI {
  private port: MessagePort;
  private messageId = 0;
  private pendingMessages = new Map<string, { resolve: Function; reject: Function }>();

  constructor(port: MessagePort) {
    this.port = port;
    this.setupMessageHandler();
  }

  private setupMessageHandler() {
    this.port.onmessage = (event) => {
      const message: MessagePortMessage = event.data;
      if (message.reflux !== REFLUX_HEADER) {
        return;
      }
      
      if (message.version && !this.isVersionCompatible(message.version)) {
        console.warn(`Reflux API version mismatch. Expected: ${REFLUX_VERSION}, Received: ${message.version}`);
      }
      
      if (message.type === 'response' && message.messageId) {
        const pending = this.pendingMessages.get(message.messageId);
        if (pending) {
          this.pendingMessages.delete(message.messageId);
          if (message.data?.error) {
            pending.reject(new Error(message.data.error));
          } else {
            pending.resolve(message.data);
          }
        }
      }
    };
  }

  private isVersionCompatible(version: string): boolean {
    const [majorReceived] = version.split('.').map(Number);
    const [majorExpected] = REFLUX_VERSION.split('.').map(Number);
    return majorReceived === majorExpected;
  }

  private sendMessage(message: Omit<MessagePortMessage, 'messageId' | 'reflux' | 'version'>): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = (++this.messageId).toString();
      this.pendingMessages.set(messageId, { resolve, reject });
      
      this.port.postMessage({
        reflux: REFLUX_HEADER,
        version: REFLUX_VERSION,
        ...message,
        messageId
      });

      setTimeout(() => {
        if (this.pendingMessages.has(messageId)) {
          this.pendingMessages.delete(messageId);
          reject(new Error('Message timeout'));
        }
      }, 15000);
    });
  }

  async addMiddleware(middleware: MiddlewareFunction): Promise<void> {
    await this.sendMessage({
      type: 'addMiddleware',
      middleware
    });
  }

  async addMiddlewareFromString(id: string, fnString: string): Promise<void> {
    await this.sendMessage({
      type: 'addMiddleware',
      id,
      fn: fnString
    });
  }

  async removeMiddleware(id: string): Promise<void> {
    await this.sendMessage({
      type: 'removeMiddleware',
      id
    });
  }

  async setMiddlewareEnabled(id: string, enabled: boolean): Promise<void> {
    await this.sendMessage({
      type: 'setMiddlewareEnabled',
      id,
      enabled
    });
  }

  async listMiddleware(): Promise<Array<{ id: string; enabled: boolean }>> {
    return await this.sendMessage({
      type: 'listMiddleware'
    });
  }

  async addPlugin(plugin: RefluxPlugin): Promise<void> {
    await this.sendMessage({
      type: 'addPlugin',
      plugin
    });
  }

  async removePlugin(name: string): Promise<void> {
    await this.sendMessage({
      type: 'removePlugin',
      id: name
    });
  }

  async listPlugins(): Promise<Array<{ name: string; sites: string[] | ['*']; enabled: boolean }>> {
    return await this.sendMessage({
      type: 'listPlugins'
    });
  }
}