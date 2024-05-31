import AbstractEffect from '../../effect/AbstractEffect';
import OnUpdatedLifecycle from '../../lifecycle/OnUpdatedLifecycle';
import Effect from '../../effect/Effect';
import WatcherEffect from '../../effect/WatcherEffect';
import MemoEffect from '../../effect/MemoEffect';
import OnUnmountedEffect from '../../effect/OnUnmountedEffect';
import { mustBeOutsideComponent } from '../../utils';
import ReactRef from '../../ReactRef';
import { EffectType, LifecycleType, WatcherType } from '../local';
import ComputedRef from '../../ref/global/ComputedRef';


class GlobalContext {
  #store: any[];
  #storeCursor: number;
  #isWriting: boolean;
  #runningOnUpdated: boolean;
  #pendingEffects: Set<AbstractEffect>;
  #disabledEffects: Set<AbstractEffect> = new Set();
  #currentEffect?: AbstractEffect;

  #idEffect: number;
  #effects: AbstractEffect[];
  #onUpdatedEffects: OnUpdatedLifecycle[];
  #watcherEffects: WatcherEffect<any>[];
  #memoizedEffects: MemoEffect<any>[];
  #unmountEffects: OnUnmountedEffect[];

  #executed: boolean;
  constructor() {
    this.#store = [];
    this.#storeCursor = 0;
    this.#isWriting = false;
    this.#runningOnUpdated = false;
    this.#pendingEffects = new Set();
    this.#currentEffect = undefined;

    this.#idEffect = 0;

    this.#effects = [];
    this.#onUpdatedEffects = [];
    this.#watcherEffects = [];
    this.#memoizedEffects = [];
    this.#unmountEffects = [];

    this.#executed = false;
  }

  init() {
    this.#idEffect = 0;
    this.#storeCursor = 0;
    this.#isWriting = false;
  }

  reset() {
    this.#store = [];
    this.#storeCursor = 0;
    this.#isWriting = false;
    this.#runningOnUpdated = false;
    this.#pendingEffects = new Set();
    this.#disabledEffects = new Set();
    this.#currentEffect = null;

    this.#idEffect = 0;

    this.#effects = [];
    this.#onUpdatedEffects = [];
    this.#watcherEffects = [];
    this.#memoizedEffects = [];
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
    for (const effect of this.#watcherEffects) effect.run();
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

  get executed() {
    return this.#executed;
  }

  set executed(value: boolean) {
    this.#executed = value;
  }

  get store() {
    return this.#store;
  }

  getStoreNextIndex() {
    return this.#storeCursor;
  }

  onWrite() {
    this.#isWriting = true;
  }

  onEndWrite() {
    this.#isWriting = false;
  }

  get isWriting() {
    return this.#isWriting;
  }

  track(effect: AbstractEffect, callback: any) {
    this.#currentEffect = effect;

    const result = callback();

    this.#currentEffect = undefined;

    return result;
  }

  createRef<T>(initialValue: T | null) {
    mustBeOutsideComponent();
    const ref = { current: initialValue };

    const index = this.addToStore(ref);

    return new ReactRef<T | null>(this, index);
  }

  diffDisabledEffects(effects: Set<AbstractEffect>) {
    const result = [];
    for (const effect of effects) {
      if (!this.#disabledEffects.has(effect)) {
        result.push(effect);
      }
    }

    return result;
  }
  queueEffects(effects: Set<AbstractEffect>) {
    const pendingEffects = this.diffDisabledEffects(effects);
    for (const effect of pendingEffects) {
      effect.run();
    }
  }

  queueEffect(effect: AbstractEffect) {
    if (this.#disabledEffects.has(effect)) return;
    effect.run();
  }

  get disabledEffects() {
    return this.#disabledEffects;
  }

  disableEffect(effect: AbstractEffect) {
    this.#disabledEffects.add(effect);
  }

  enableEffect(effect: AbstractEffect) {
    this.#disabledEffects.delete(effect);
  }

  createMemoEffect(getterOrOptions: any) {
    mustBeOutsideComponent();
    let getter;
    let setter;
    if (typeof getterOrOptions === 'function') {
      getter = getterOrOptions;
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }
    const memoEffect = new MemoEffect(this.#idEffect, this, getter);
    const ref = new ComputedRef(this.getStoreNextIndex(), memoEffect, setter);
    memoEffect.ref = ref;
    this.#memoizedEffects.push(memoEffect);

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
        hook = new OnUnmountedEffect(this.#idEffect, this, callback);
        this.#unmountEffects.push(hook);
        break;
    }
  }


  createEffect(type: EffectType, callback: any) {
    mustBeOutsideComponent();
    const effect = new Effect(this.#idEffect, this, callback);
    switch (type) {
      case EffectType.PRE_EFFECT:
        this.#effects.push(effect);
        break;
      case EffectType.POST_EFFECT:
        this.#effects.push(effect);
        break;
      case EffectType.SYNC_EFFECT:
        this.#effects.push(effect);
        break;
      case EffectType.INSERTION_EFFECT:
        this.#effects.push(effect);
        break;
      case EffectType.LAYOUT_EFFECT:
        this.#effects.push(effect);
        break;
    }

    this.queueEffect(effect);

    this.#idEffect++;
    return effect;
  }

  createWatcher(type: WatcherType, callback: any, source, options) {
    mustBeOutsideComponent();
    const watcher = new WatcherEffect(this.#idEffect, this, callback, source, options);
    switch (type) {
      case WatcherType.PRE:
      case WatcherType.POST:
      case WatcherType.SYNC:
        this.#watcherEffects.push(watcher);
    }

    this.#idEffect++;
    return watcher;
  }
}

export default GlobalContext;
