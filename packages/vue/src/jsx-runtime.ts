import { BridgePlugin, ComponentInternalInstance, usePlugin, getCurrentInstance } from '@bridge/core';
import { unref } from './index';
import { computed, type ComputedRefImpl } from '@vue-internals/reactivity/computed';

type Callback = () => React.ReactNode;
type Key = Callback;

class ElementCache implements BridgePlugin {
  #cache = new Map();
  getElement(key: Key) {
    return this.#cache.get(key);
  }
  setElement(key: Key, element: React.ReactNode | ComputedRefImpl<React.ReactNode>) {
    this.#cache.set(key, element);
    return element;
  }
  onInstanceCreated(instance: ComponentInternalInstance): void {}
  onInstanceDisposed(instance: ComponentInternalInstance): void {}
}

usePlugin(ElementCache);

export function rsx(callback: Callback) {
  const cache = getCurrentInstance()?.getPlugin(ElementCache);
  if (!cache) return callback();

  let element = cache.getElement(callback);
  let result;
  if (!element) {
    const ref = computed(callback) as unknown as ComputedRefImpl<React.ReactNode>;
    result = ref.value;
    if (ref.dep.subs) element = cache.setElement(callback, ref);
    else element = cache.setElement(callback, result);
  }

  return unref(element);
}
