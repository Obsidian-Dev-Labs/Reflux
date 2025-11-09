import type {
  BareHeaders,
  TransferrableResponse,
  BareTransport
} from "@mercuryworkshop/bare-mux";

import { MiddlewareTransport } from "./middleware";

export type RefluxOptions = {
  base: string;
  middleware?: any[];
  [key: string]: any;
};

export default class RefluxTransport implements BareTransport {
  ready = false;

  #inner!: BareTransport;
  #wrapped!: MiddlewareTransport;
  #opts: RefluxOptions;

  constructor(opts: RefluxOptions) {
    this.#opts = opts;
  }

  get middleware(): MiddlewareTransport {
    return this.#wrapped;
  }

  async init() {
    const {
      base: transportPath,
      middleware = [],
      controlPort,
      ...innerOptions
    } = this.#opts;

    console.debug('%cRF%c Initializing transport wrapper', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');

    try {
      const mod = await import(transportPath);
      const TransportClass = mod.default;

      this.#inner = new TransportClass(innerOptions);

      if (typeof this.#inner.init === 'function') {
        await this.#inner.init();
      }

      this.#wrapped = new MiddlewareTransport(this.#inner);
      await this.#wrapped.init();

      this.ready = true;
      console.debug('%cRF%c Transport ready', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '');
    } catch (err) {
      console.error('%cRF%c Failed to initialize transport:', 'background: #0066cc; color: white; padding: 2px 4px; border-radius: 2px; font-weight: bold', '', err);
      throw err;
    }
  }

  async meta() {
    return this.#wrapped.meta?.();
  }

  async request(
    remote: URL,
    method: string,
    body: BodyInit | null,
    headers: BareHeaders,
    signal?: AbortSignal
  ): Promise<TransferrableResponse> {
    return this.#wrapped.request(remote, method, body, headers, signal);
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
    return this.#wrapped.connect(
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