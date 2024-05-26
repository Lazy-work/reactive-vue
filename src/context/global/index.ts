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

class GlobalContext implements IContext {
  private _provider: Map<any, any> = new Map();
  private _store: any[] = [];
  private _storeCursor = 0;
  private _runningOnUpdated = false;
  private _disabledEffects: number[] = [];
  private _currentEffect?: AbstractEffect = undefined;
  private _pendingEffects: number[] = [];

  private _idEffect = 0;
  private _effects: AbstractEffect[] = [];
  private _memoEffects: MemoEffect<any>[] = [];
  private _onUpdatedEffects: OnUpdatedLifecycle[] = [];
  private _watcherEffects: WatcherEffect<any>[] = [];
  private _unmountEffects: OnUnmountedLifecycle[] = [];

  private _executed: boolean = false;

  init() {
    this._idEffect = 0;
    this._storeCursor = 0;
  }

  reset() {
    this._store = [];
    this._storeCursor = 0;
    this._runningOnUpdated = false;
    this._disabledEffects = [];
    this._currentEffect = undefined;

    this._idEffect = 1;

    this._effects = [];
    this._memoEffects = [];
    this._onUpdatedEffects = [];
    this._watcherEffects = [];
    this._unmountEffects = [];

    this._executed = false;
  }

  getValueAt(index: number) {
    return this._store[index];
  }

  addToStore(value: any) {
    this._store[this._storeCursor] = value;
    const index = this._storeCursor;

    this._storeCursor++;

    return index;
  }

  get runningOnUpdated() {
    return this._runningOnUpdated;
  }

  runOnUpdated() {
    this._runningOnUpdated = true;
  }

  endOnUpdated() {
    this._runningOnUpdated = false;
  }

  setStoreValueAt(index: number, value: any) {
    this._store[index] = value;
    for (const effect of this._onUpdatedEffects) {
      effect.run();
    }
  }

  notifyChange() {
    for (const effect of this._onUpdatedEffects) {
      effect.run();
    }
  }

  get currentEffect() {
    return this._currentEffect;
  }

  set currentEffect(effect: AbstractEffect | undefined) {
    this._currentEffect = effect;
  }

  isExecuted() {
    return this._executed;
  }

  executed(): void {
    this._executed = true;
  }

  get store() {
    return this._store;
  }

  getStoreNextIndex() {
    return this._storeCursor++;
  }

  track(effect: AbstractEffect, callback: any, parentEffect?: AbstractEffect) {
    this._currentEffect = effect;

    const result = callback();

    this._currentEffect = parentEffect;

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
      if (!(this._disabledEffects[slot] & digit)) {
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
    if (this._disabledEffects[slot] & digit) return;
    if (force && effect instanceof WatcherEffect) {
      effect.force();
    }
    effect.run();
  }

  computeEffects(effects: AbstractEffect[]) {
    for (let i = 0; i < effects.length; i++) {
      const digit = 1 << (effects[i].id % 32);
      const slot = Math.floor(effects[i].id / 32);
      if (digit & this._pendingEffects[slot] && !(this._disabledEffects[slot] & digit)) {
        this._pendingEffects[slot] &= ~digit;
        effects[i].run();
        this._pendingEffects[slot] &= ~digit;
      }
    }
  }

  queuePendingEffects(pendingEffects: number[], force = false) {
    for (let i = 0; i < pendingEffects.length; i++) {
      this._pendingEffects[i] |= pendingEffects[i];
    }
    if (force) {
      for (const effect of this._watcherEffects) {
        const digit = 1 << (effect.id % 32);
        const slot = Math.floor(effect.id / 32);
        if (this._pendingEffects[slot] & digit && !(this._disabledEffects[slot] & digit)) {
          effect.force();
        }
      }
    }
    this.computeEffects(this._memoEffects);
    this.computeEffects(this._effects);
    this.computeEffects(this._watcherEffects);
  }

  disableEffect(effect: AbstractEffect) {
    const effectId = effect.id;
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);

    this._disabledEffects[slot] |= digit;
  }

  enableEffect(effect: AbstractEffect) {
    const effectId = effect.id;
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);
    this._disabledEffects[slot] &= ~digit;
  }

  get disabledEffects() {
    return this._disabledEffects;
  }
  
  createMemoEffect<T>(getterOrOptions: any): MemoEffect<T> {
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
    const memoEffect = new MemoEffect<T>(this._idEffect, this, getter, storeIndex);
    const ref = new ComputedRef(storeIndex, memoEffect, setter);
    memoEffect.ref = ref;
    this._memoEffects.push(memoEffect);

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.addEffect(memoEffect);
    }

    this._idEffect++;

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
        hook = new OnUpdatedLifecycle(this._idEffect, this, callback);
        this._onUpdatedEffects.push(hook);
        break;
      case LifecycleType.ON_BEFORE_UNMOUNTED:
      case LifecycleType.ON_UNMOUNTED:
        hook = new OnUnmountedLifecycle(this._idEffect, this, callback);
        this._unmountEffects.push(hook);
        break;
    }
  }


  createEffect(type: EffectType, callback: any, options?: WatchEffectOptions) {
    mustBeOutsideComponent();
    const effect = new Effect(this._idEffect, this, callback, options?.onTrack, options?.onTrigger);
    switch (type) {
      case EffectType.PRE_EFFECT:
      case EffectType.POST_EFFECT:
      case EffectType.SYNC_EFFECT:
      case EffectType.INSERTION_EFFECT:
      case EffectType.LAYOUT_EFFECT:
        this._effects.push(effect);
        break;
    }

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.addEffect(effect);
    }

    this.queueEffect(effect);

    this._idEffect++;
    return effect;
  }

  createWatcher<T>(type: WatcherType, callback: any, source: WatchSource<T>, options: WatchOptions): WatcherEffect<T> {
    mustBeOutsideComponent();
    const watcher = new WatcherEffect<T>(this._idEffect, this, callback, source, options);
    switch (type) {
      case WatcherType.PRE:
      case WatcherType.POST:
      case WatcherType.SYNC:
        this._watcherEffects.push(watcher);
    }

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.addEffect(watcher);
    }

    watcher.subscribeToDeps();
    if (options?.immediate) this.queueEffect(watcher);

    this._idEffect++;
    return watcher;
  }
  createEffectScope(detached?: boolean): EffectScope {
    return new EffectScope(this, detached);
  }
  getParent() {
    return undefined;
  }

  provide(key: any, value: any): void {
    this._provider.set(key, value);
  }
  inject(key: any) {
    return this._provider.get(key);
  }
}

globalThis.__v_globalContext = new GlobalContext();

export default GlobalContext;