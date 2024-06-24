import AbstractEffect from '../../effect/AbstractEffect';
import OnUpdatedLifecycle from '../../lifecycle/OnUpdatedLifecycle';
import Effect from '../../effect/Effect';
import WatcherEffect from '../../effect/WatcherEffect';
import MemoEffect from '../../effect/MemoEffect';
import OnUnmountedLifecycle from '../../lifecycle/OnUnmountedLifecycle';
import { mustBeOutsideComponent } from '../../utils';
import ReactRef from '../../ReactRef';
import { EffectType, LifecycleType, WatcherType } from '../local';
import ComputedRef from '../../ref/global/ComputedRef';
import type IContext from '../IContext';
import EffectScope, { getCurrentScope, setCurrentScope } from '../../effect/EffectScope';
import { WatchEffectOptions, WatchOptions, WatchSource } from '../../types';
import { DebuggerOptions } from '../..';

class GlobalContext implements IContext {
  #provider: Map<any, any> = new Map();
  #store: any[] = [];
  #storeCursor = 0;
  #runningOnUpdated = false;
  #disabledEffects: number[] = [];
  #currentEffect?: AbstractEffect = undefined;
  #pendingEffects: number[] = [];

  #idEffect = 0;
  #effects: AbstractEffect[] = [];
  #memoEffects: MemoEffect<any>[] = [];
  #onUpdatedEffects: OnUpdatedLifecycle[] = [];
  #watcherEffects: WatcherEffect<any>[] = [];
  #unmountEffects: OnUnmountedLifecycle[] = [];

  #executed: boolean = false;

  init() {
    this.#idEffect = 0;
    this.#storeCursor = 0;
  }

  reset() {
    this.#store = [];
    this.#storeCursor = 0;
    this.#runningOnUpdated = false;
    this.#disabledEffects = [];
    this.#currentEffect = undefined;

    this.#idEffect = 1;

    this.#effects = [];
    this.#memoEffects = [];
    this.#onUpdatedEffects = [];
    this.#watcherEffects = [];
    this.#unmountEffects = [];

    this.#executed = false;
  }

  getValueAt(index: number) {
    return this.#store[index];
  }

  addToStore(value: any) {
    this.#store[this.#storeCursor] = value;
    const index = this.#storeCursor;

    this.#storeCursor++;

    return index;
  }

  get runningOnUpdated() {
    return this.#runningOnUpdated;
  }

  runOnUpdated() {
    this.#runningOnUpdated = true;
  }

  endOnUpdated() {
    this.#runningOnUpdated = false;
  }

  setStoreValueAt(index: number, value: any) {
    this.#store[index] = value;
    for (const effect of this.#onUpdatedEffects) {
      effect.run();
    }
  }

  notifyChange() {
    for (const effect of this.#onUpdatedEffects) {
      effect.run();
    }
  }

  get currentEffect() {
    return this.#currentEffect;
  }

  set currentEffect(effect: AbstractEffect | undefined) {
    this.#currentEffect = effect;
  }

  isExecuted() {
    return this.#executed;
  }

  executed(): void {
    this.#executed = true;
  }

  get store() {
    return this.#store;
  }

  getStoreNextIndex() {
    return this.#storeCursor++;
  }

  track(effect: AbstractEffect, callback: any, parentEffect?: AbstractEffect) {
    this.#currentEffect = effect;

    const result = callback();

    this.#currentEffect = parentEffect;

    return result;
  }

  scopeTrack(scope: EffectScope, fn: any, parentScope?: EffectScope) {
    setCurrentScope(scope);
    const result = fn();

    setCurrentScope(parentScope);

    return result;
  }

  createRef<T>(initialValue: T | null) {
    mustBeOutsideComponent();
    const ref = { current: initialValue };

    const index = this.addToStore(ref);

    return new ReactRef<T | null>(this, index);
  }

  queueEffects(effects: Iterable<AbstractEffect>, force = false) {
    for (const effect of effects) {
      const effectId = effect.id;
      const slot = Math.floor(effectId / 32);
      const digit = 1 << (effectId % 32);
      if (!(this.#disabledEffects[slot] & digit)) {
        if (force && effect instanceof WatcherEffect) {
          effect.force();
        }
        effect.run();
      }
    }
  }

  queueEffect(effect: AbstractEffect, force = false) {
    const effectId = effect.id;
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);
    const isDisabled = this.#disabledEffects[slot] & digit;
    if (isDisabled) return;
    if (force && effect instanceof WatcherEffect) {
      effect.force();
    }
    effect.run();
  }

  computeEffects(effects: AbstractEffect[]) {
    for (let i = 0; i < effects.length; i++) {
      const digit = 1 << (effects[i].id % 32);
      const slot = Math.floor(effects[i].id / 32);
      const isPending = digit & this.#pendingEffects[slot];
      const isDisabled = this.#disabledEffects[slot] & digit;
      if (isPending && !isDisabled) {
        this.#pendingEffects[slot] &= ~digit;
        effects[i].run();
        this.#pendingEffects[slot] &= ~digit;
      }
    }
  }

  queuePendingEffects(pendingEffects: number[], force = false) {
    for (let i = 0; i < pendingEffects.length; i++) {
      this.#pendingEffects[i] |= pendingEffects[i];
    }
    if (force) {
      for (const effect of this.#watcherEffects) {
        const digit = 1 << (effect.id % 32);
        const slot = Math.floor(effect.id / 32);
        const isPending = digit & this.#pendingEffects[slot];
        const isDisabled = this.#disabledEffects[slot] & digit;
        if (isPending && !isDisabled) {
          effect.force();
        }
      }
    }
    this.computeEffects(this.#memoEffects);
    this.computeEffects(this.#effects);
    this.computeEffects(this.#watcherEffects);
  }

  disableEffect(effect: AbstractEffect) {
    const effectId = effect.id;
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);

    this.#disabledEffects[slot] |= digit;
  }

  enableEffect(effect: AbstractEffect) {
    const effectId = effect.id;
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);
    this.#disabledEffects[slot] &= ~digit;
  }

  get disabledEffects() {
    return this.#disabledEffects;
  }

  createMemoEffect<T>(getterOrOptions: any, debuggerOptions: DebuggerOptions = {}): MemoEffect<T> {
    mustBeOutsideComponent();
    let getter;
    let setter;
    if (typeof getterOrOptions === 'function') {
      getter = getterOrOptions;
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }
    const storeIndex = this.getStoreNextIndex();
    const memoEffect = new MemoEffect<T>(this.#idEffect, this, getter, storeIndex, undefined, debuggerOptions.onTrack, debuggerOptions.onTrigger);
    const ref = new ComputedRef(storeIndex, memoEffect, setter);
    memoEffect.ref = ref;
    this.#memoEffects.push(memoEffect);

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.addEffect(memoEffect);
    }

    this.#idEffect++;

    memoEffect.run();
    return memoEffect;
  }

  createLifecycleHook(type: LifecycleType, callback: any) {
    mustBeOutsideComponent();
    let hook;
    switch (type) {
      case LifecycleType.ON_BEFORE_MOUNT:
      case LifecycleType.ON_MOUNTED:
      case LifecycleType.ON_BEFORE_UPDATE:
      case LifecycleType.ON_UPDATED:
        hook = new OnUpdatedLifecycle(this.#idEffect, this, callback);
        this.#onUpdatedEffects.push(hook);
        break;
      case LifecycleType.ON_BEFORE_UNMOUNTED:
      case LifecycleType.ON_UNMOUNTED:
        hook = new OnUnmountedLifecycle(this.#idEffect, this, callback);
        this.#unmountEffects.push(hook);
        break;
    }
  }


  createEffect(type: EffectType, callback: any, options?: WatchEffectOptions) {
    mustBeOutsideComponent();
    const effect = new Effect(this.#idEffect, this, callback, options?.onTrack, options?.onTrigger);
    switch (type) {
      case EffectType.PRE_EFFECT:
      case EffectType.POST_EFFECT:
      case EffectType.SYNC_EFFECT:
      case EffectType.INSERTION_EFFECT:
      case EffectType.LAYOUT_EFFECT:
        this.#effects.push(effect);
        break;
    }

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.addEffect(effect);
    }

    this.queueEffect(effect);

    this.#idEffect++;
    return effect;
  }

  createWatcher<T>(type: WatcherType, callback: any, source: WatchSource<T>, options: WatchOptions): WatcherEffect<T> {
    mustBeOutsideComponent();
    const watcher = new WatcherEffect<T>(this.#idEffect, this, callback, source, options);
    switch (type) {
      case WatcherType.PRE:
      case WatcherType.POST:
      case WatcherType.SYNC:
        this.#watcherEffects.push(watcher);
    }

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.addEffect(watcher);
    }

    watcher.subscribeToDeps();
    if (options?.immediate) this.queueEffect(watcher);

    this.#idEffect++;
    return watcher;
  }
  createEffectScope(detached?: boolean): EffectScope {
    return new EffectScope(this, detached);
  }
  getParent() {
    return undefined;
  }

  provide(key: any, value: any): void {
    this.#provider.set(key, value);
  }
  inject(key: any) {
    return this.#provider.get(key);
  }
}

globalThis.__v_globalContext = new GlobalContext();

export default GlobalContext;