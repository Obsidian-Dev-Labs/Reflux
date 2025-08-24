import localforage from "localforage";

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
  private pluginStorage = localforage.createInstance({
    name: 'Reflux',
    storeName: 'plugins'
  });
  private statusStorage = localforage.createInstance({
    name: 'Reflux',
    storeName: 'status'
  });

  constructor() {
  }

  async addPlugin(plugin: RefluxPlugin): Promise<void> {
    try {
      await this.pluginStorage.setItem(plugin.name, plugin.function);
      
      const metadataStorage = localforage.createInstance({
        name: 'Reflux',
        storeName: 'pluginMetadata'
      });
      
      await metadataStorage.setItem(plugin.name, {
        sites: plugin.sites,
        name: plugin.name
      });
      
      console.log(`Plugin ${plugin.name} added successfully`);
    } catch (error) {
      console.error('Error adding plugin:', error);
      throw error;
    }
  }

  async removePlugin(name: string): Promise<void> {
    try {
      await this.pluginStorage.removeItem(name);
      
      const metadataStorage = localforage.createInstance({
        name: 'Reflux',
        storeName: 'pluginMetadata'
      });
      await metadataStorage.removeItem(name);
      
      const enabledPlugins = await this.statusStorage.getItem<string[]>('enabled') || [];
      const updatedEnabled = enabledPlugins.filter(id => id !== name);
      await this.statusStorage.setItem('enabled', updatedEnabled);
      
      console.log(`Plugin ${name} removed successfully`);
    } catch (error) {
      console.error('Error removing plugin:', error);
      throw error;
    }
  }

  async enablePlugin(name: string): Promise<void> {
    try {
      const enabledPlugins = await this.statusStorage.getItem<string[]>('enabled') || [];
      
      if (!enabledPlugins.includes(name)) {
        enabledPlugins.push(name);
        await this.statusStorage.setItem('enabled', enabledPlugins);
      }
      
      console.log(`Plugin ${name} enabled successfully`);
    } catch (error) {
      console.error('Error enabling plugin:', error);
      throw error;
    }
  }

  async disablePlugin(name: string): Promise<void> {
    try {
      const enabledPlugins = await this.statusStorage.getItem<string[]>('enabled') || [];
      const updatedEnabled = enabledPlugins.filter(id => id !== name);
      await this.statusStorage.setItem('enabled', updatedEnabled);
      
      console.log(`Plugin ${name} disabled successfully`);
    } catch (error) {
      console.error('Error disabling plugin:', error);
      throw error;
    }
  }

  async listPlugins(): Promise<Array<{ name: string; sites: string[]; enabled: boolean; function: string }>> {
    try {
      const pluginKeys = await this.pluginStorage.keys();
      const enabledPlugins = await this.statusStorage.getItem<string[]>('enabled') || [];
      const metadataStorage = localforage.createInstance({
        name: 'Reflux',
        storeName: 'pluginMetadata'
      });
      
      const plugins: Array<{ name: string; sites: string[]; enabled: boolean; function: string }> = [];
      
      for (const key of pluginKeys) {
        const pluginCode = await this.pluginStorage.getItem<string>(key);
        const metadata = await metadataStorage.getItem<{sites: string[], name: string}>(key);
        
        if (pluginCode) {
          plugins.push({
            name: key,
            sites: metadata?.sites || ['*'],
            enabled: enabledPlugins.includes(key),
            function: pluginCode
          });
        }
      }
      
      return plugins;
    } catch (error) {
      console.error('Error listing plugins:', error);
      throw error;
    }
  }

  async getEnabledPlugins(): Promise<string[]> {
    try {
      return await this.statusStorage.getItem<string[]>('enabled') || [];
    } catch (error) {
      console.error('Error getting enabled plugins:', error);
      return [];
    }
  }

  async updatePluginSites(name: string, sites: string[]): Promise<void> {
    try {
      const metadataStorage = localforage.createInstance({
        name: 'Reflux',
        storeName: 'pluginMetadata'
      });
      
      const metadata = await metadataStorage.getItem<{sites: string[], name: string}>(name);
      if (metadata) {
        await metadataStorage.setItem(name, {
          ...metadata,
          sites: sites
        });
        console.log(`Plugin ${name} sites updated successfully`);
      } else {
        throw new Error(`Plugin ${name} not found`);
      }
    } catch (error) {
      console.error('Error updating plugin sites:', error);
      throw error;
    }
  }
}