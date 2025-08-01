import type {
  BareHeaders,
  TransferrableResponse,
  BareTransport
} from "@mercuryworkshop/bare-mux";

import { MiddlewareTransport } from "./middleware";

export type RefluxOptions = {
  transport: string;
  controlPort?: MessagePort;
  middleware?: any[];
  [key: string]: any;
};

export default class RefluxTransport implements BareTransport {
  ready = false;

  private inner!: BareTransport;
  private wrapped!: MiddlewareTransport;

  constructor(private opts: RefluxOptions) {}

  async init() {
    const {
      transport: transportPath,
      middleware = [],
      controlPort,
      ...innerOptions
    } = this.opts;

    const mod = await import(transportPath);
    const TransportClass = mod.default;
    this.inner = new TransportClass(innerOptions);

    this.wrapped = new MiddlewareTransport(this.inner, controlPort);

    await this.wrapped.init();
    this.ready = true;
  }

  async meta() {
    return this.wrapped.meta?.();
  }

  async request(
    remote: URL,
    method: string,
    body: BodyInit | null,
    headers: BareHeaders,
    signal?: AbortSignal
  ): Promise<TransferrableResponse> {
    return this.wrapped.request(remote, method, body, headers, signal);
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
    return this.wrapped.connect(
      url,
      protocols,
      requestHeaders,
      onopen,
      onmessage,
      onclose,
      onerror
    );
  }
}

export { RefluxAPI } from "./api";
export type { MiddlewareFunction, RequestContext, ResponseContext, RefluxPlugin } from "./api";