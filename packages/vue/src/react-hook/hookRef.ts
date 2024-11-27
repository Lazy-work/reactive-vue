import { ReactiveFlags, TrackOpTypes } from '@vue-internals/reactivity/constants';
import { Dep } from '@vue-internals/reactivity/dep';
import { HookManager } from '@bridge/core';

class HookRef<T = any> {
  /**
   * @internal
   */
  #manager: HookManager
  /**
   * @internal
   */
  #hookIndex: number;
  /**
   * @internal
   */
  #valueIndex: number;

  /**
   * @internal
   */
  dep: Dep = new Dep();


  /**
   * @internal
   */
  public readonly [ReactiveFlags.IS_REF] = true;
  /**
   * @internal
   */
  public readonly [ReactiveFlags.IS_SHALLOW]: boolean = false;
  /**
   * @internal
   */
  public readonly [ReactiveFlags.IS_READONLY]: boolean = true;

  constructor(manager: HookManager, hookIndex: number, valueIndex: number) {
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
