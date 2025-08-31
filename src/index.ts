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

  private inner!: BareTransport;
  private wrapped!: MiddlewareTransport;

  constructor(private opts: RefluxOptions) {}

  get middleware(): MiddlewareTransport {
    return this.wrapped;
  }

  async init() {
    const {
      base: transportPath,
      middleware = [],
      controlPort,
      ...innerOptions
    } = this.opts;

    console.debug('🔧 [Reflux] Initializing transport wrapper');
    console.debug('🔧 [Reflux] transportPath:', transportPath);
    console.debug('🔧 [Reflux] inner options:', innerOptions);

    try {
      const mod = await import(transportPath);
      const TransportClass = mod.default;
      console.debug('🔧 [Reflux] Imported transport module:', {
        moduleDefaultName: TransportClass?.name || '<anonymous>',
        module: !!mod
      });

    this.inner = new TransportClass(innerOptions);
      console.debug('🔧 [Reflux] Inner transport instance created');

      if (typeof this.inner.init === 'function') {
        try {
          console.debug('🔧 [Reflux] Calling inner.init()');
          await this.inner.init();
          console.debug('✅ [Reflux] inner.init() completed');
        } catch (err) {
          console.error('❌ [Reflux] Error during inner.init():', err);
          throw err;
        }
      } else {
        console.debug('ℹ️  [Reflux] inner transport has no init() method');
      }

      console.debug('🔧 [Reflux] Wrapping inner transport with MiddlewareTransport');
  this.wrapped = new MiddlewareTransport(this.inner);
      console.debug('🔧 [Reflux] MiddlewareTransport instance created');

      try {
        await this.wrapped.init();
        console.debug('✅ [Reflux] MiddlewareTransport.init() completed');
      } catch (err) {
        console.error('❌ [Reflux] Error during MiddlewareTransport.init():', err);
        throw err;
      }

      this.ready = true;
      console.debug('✅ [Reflux] RefluxTransport ready = true');
    } catch (err) {
      console.error('❌ [Reflux] Failed to initialize transport:', err);
      throw err;
    }
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