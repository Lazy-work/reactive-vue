import { ReactiveFlags, TrackOpTypes } from '@vue-internals/reactivity/constants';
import { Dep } from '@vue-internals/reactivity/dep';
import { HookManager } from '@bridge/core';

class HookRef<T = any> {
  #manager: HookManager<any>
  #hookIndex: number;
  #valueIndex: number;

  dep: Dep = new Dep();

  public readonly [ReactiveFlags.IS_REF] = true;
  public readonly [ReactiveFlags.IS_SHALLOW]: boolean = false;
  public readonly [ReactiveFlags.IS_READONLY]: boolean = true;

  constructor(manager: HookManager<any>, hookIndex: number, valueIndex: number) {
    this.#manager = manager;
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  get value() {
    if (__DEV__) {
      this.dep.track({
        target: this,
        type: TrackOpTypes.GET,
        key: 'value',
      });
    } else {
      this.dep.track();
    }
    const currentValue = this.#manager.getHookValueAt(this.#hookIndex, this.#valueIndex);

    return currentValue as T;
  }
}

export default HookRef;
