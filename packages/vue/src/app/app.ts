import { isFunction } from '@vue/shared';
import { warn } from '@vue-internals/reactivity/warning';

type PluginInstallFunction<Options = any[]> = Options extends unknown[]
  ? (app: App, ...options: Options) => any
  : (app: App, options: Options) => any;

export type ObjectPlugin<Options = any[]> = {
  install: PluginInstallFunction<Options>;
};
export type FunctionPlugin<Options = any[]> = PluginInstallFunction<Options> & Partial<ObjectPlugin<Options>>;

export type Plugin<Options = any[]> = FunctionPlugin<Options> | ObjectPlugin<Options>;

interface PluginEntry {
  plugin: Plugin;
  options: any;
}
class App {
  version = '3.0.0';
  config = {
    errorHandler: undefined,
    warnHandler: undefined,
    performance: false,
    compilerOptions: {},
    globalProperties: {},
    openMergeStategies: {},
  };
  optionsCache = new WeakMap();
  propsCache = new WeakMap();
  emitsCache = new WeakMap();
  #pluginsEntries: PluginEntry[] = [];
  install() {
    for (const entry of this.#pluginsEntries) {
      entry.plugin.install?.(this, entry.options);
    }
  }
  mount() {}
  unmount() {}
  component() {}
  directive() {}
  hasPlugin(p: Plugin) {
    for (const { plugin } of this.#pluginsEntries) {
      if (plugin === p) return true;
    }
    return false;
  }
  use<Options extends unknown[]>(plugin: Plugin<Options>, ...options: Options): this;
  use<Options>(plugin: Plugin<Options>, options: Options): this {
    if (this.hasPlugin(plugin)) {
      __DEV__ && warn(`Plugin has already been applied to target app.`);
    } else if (plugin && isFunction(plugin.install)) {
      this.#pluginsEntries.push({ plugin, options });
    } else if (isFunction(plugin)) {
      this.#pluginsEntries.push({
        plugin: {
          install: plugin,
        },
        options,
      });
    } else if (__DEV__) {
      warn(`A plugin must either be a function or an object with an "install" ` + `function.`);
    }
    return this;
  }
  mixin() {}
  provide(key: any, value: any) {}
  runWithContext(callback: Function) {
    return callback();
  }
}

export default App;
