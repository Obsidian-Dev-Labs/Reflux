import type { BareHeaders, TransferrableResponse as BareTransferrableResponse, BareTransport } from "@mercuryworkshop/bare-mux";

// Path to the built Reflux transport in the dist folder
export declare const refluxPath: string;


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
  body: string | Blob | ArrayBuffer | ReadableStream<any>;
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

export declare class RefluxAPI {
  constructor(port: MessagePort);
  
  addMiddleware(middleware: MiddlewareFunction): Promise<void>;
  addMiddlewareFromString(id: string, fnString: string): Promise<void>;
  removeMiddleware(id: string): Promise<void>;
  setMiddlewareEnabled(id: string, enabled: boolean): Promise<void>;
  listMiddleware(): Promise<Array<{ id: string; enabled: boolean }>>;
  
  addPlugin(plugin: RefluxPlugin): Promise<void>;
  removePlugin(name: string): Promise<void>;
  listPlugins(): Promise<Array<{ name: string; sites: string[] | ['*']; enabled: boolean }>>;
}

export type RefluxOptions = {
  transport: string;
  controlPort?: MessagePort;
  middleware?: any[];
  [key: string]: any;
};

export default class RefluxTransport implements BareTransport {
  ready: boolean;
  
  constructor(opts: RefluxOptions);
  
  init(): Promise<void>;
  meta(): Promise<any>;
  request(
    remote: URL,
    method: string,
    body: BodyInit | null,
    headers: BareHeaders,
    signal?: AbortSignal
  ): Promise<BareTransferrableResponse>;
  connect(
    url: URL,
    protocols: string[],
    requestHeaders: BareHeaders,
    onopen: (protocol: string) => void,
    onmessage: (data: Blob | ArrayBuffer | string) => void,
    onclose: (code: number, reason: string) => void,
    onerror: (error: string) => void
  ): [(data: Blob | ArrayBuffer | string) => void, (code: number, reason: string) => void];
}

export { RefluxTransport };
