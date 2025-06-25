import type {
  BareTransport,
  BareHeaders,
  TransferrableResponse
} from "@mercuryworkshop/bare-mux";

export type RequestContext = {
  remote: URL;
  method: string;
  body: BodyInit | null;
  headers: BareHeaders;
  signal?: AbortSignal;
};

export type ResponseContext = {
  request: RequestContext;
  response: TransferrableResponse;
};

export type MiddlewareFunction = {
  id?: string;
  enabled?: boolean | (() => boolean);
  onRequest?: (req: RequestContext, next: () => Promise<void>) => Promise<void> | void;
  onResponse?: (ctx: ResponseContext, next: () => Promise<void>) => Promise<void> | void;
  modifyWebSocketMessage?: (
    data: string | Blob | ArrayBuffer,
    direction: "send" | "receive"
  ) => Promise<string | Blob | ArrayBuffer> | string | Blob | ArrayBuffer;
};

export class MiddlewareTransport implements BareTransport {
  ready = false;
  private middlewares: MiddlewareFunction[] = [];
  private controlPort?: MessagePort;

  constructor(
    private readonly inner: BareTransport,
    options?: {
      middleware?: MiddlewareFunction[];
      controlPort?: MessagePort;
    }
  ) {
    if (options?.middleware) {
      this.middlewares = [...options.middleware];
    }
    if (options?.controlPort) {
      this.controlPort = options.controlPort;
      this.setupControlPort(this.controlPort);
    }
  }

  private setupControlPort(port: MessagePort) {
    port.onmessage = (event) => {
      const { type, id, fn, enabled } = event.data;

      if (type === "addMiddleware" && typeof fn === "string") {
        try {
          const newMw = eval("(" + fn + ")");
          if (id) newMw.id = id;
          this.use(newMw);
          console.log(`[MiddlewareTransport] Added middleware${id ? ` '${id}'` : ""}`);
        } catch (err) {
          console.error("Failed to inject middleware:", err);
        }
      } else if (type === "setMiddlewareEnabled" && id) {
        const mw = this.middlewares.find(mw => mw.id === id);
        if (mw) {
          mw.enabled = enabled;
          console.log(`[MiddlewareTransport] Middleware '${id}' enabled set to`, enabled);
        }
      }
    };
  }

  use(mw: MiddlewareFunction): MiddlewareFunction {
    this.middlewares.push(mw);
    return mw;
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
  ): Promise<TransferrableResponse> {
    const requestContext: RequestContext = { remote, method, body, headers, signal };

    await this.runMiddlewareChain("onRequest", requestContext);

    const response = await this.inner.request(remote, method, body, headers, signal);
    const responseContext: ResponseContext = { request: requestContext, response };

    await this.runMiddlewareChain("onResponse", responseContext);

    return response;
  }

  private async runMiddlewareChain(stage: "onRequest" | "onResponse", ctx: any) {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) throw new Error("next() called multiple times");
      index = i;

      while (i < this.middlewares.length) {
        const mw = this.middlewares[i];
        i++;

        let enabled = true;
        if (typeof mw.enabled === "boolean") enabled = mw.enabled;
        else if (typeof mw.enabled === "function") enabled = mw.enabled();

        if (!enabled) continue;

        const fn = mw[stage];
        if (fn) {
          await fn(ctx, () => dispatch(i));
          return;
        }
      }
    };

    await dispatch(0);
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
    const [sendRaw, close] = this.inner.connect(
      url,
      protocols,
      requestHeaders,
      onopen,
      async (data) => {
        for (const mw of this.middlewares) {
          if (mw.modifyWebSocketMessage) {
            data = await mw.modifyWebSocketMessage(data, "receive");
          }
        }
        onmessage(data);
      },
      onclose,
      onerror
    );

    const send: typeof sendRaw = async (data) => {
      for (const mw of this.middlewares) {
        if (mw.modifyWebSocketMessage) {
          data = await mw.modifyWebSocketMessage(data, "send");
        }
      }
      sendRaw(data);
    };

    return [send, close];
  }
}