import WritableRef from './WritableRef';
import ReadableRef from './ReadableRef';
import AbstractEffect from '../../effect/AbstractEffect';
import Effect from '../../effect/Effect';
import OnUpdatedLifecycle from '../../lifecycle/OnUpdatedLifecycle';
import OnMountedEffect from '../../effect/OnMountedEffect';
import WatcherEffect from '../../effect/WatcherEffect';
import MemoEffect from '../../effect/MemoEffect';
import OnUnmountedEffect from '../../effect/OnUnmountedEffect';
import type { WatchCallback, WatchOptions, WatchSource } from '../../types';
import { nanoid } from 'nanoid';
import React from 'react';
import { mustBeOutsideComponent } from '../../utils';
import ReactRef from '../../ReactRef';

let debugMode = false;

function enableDebugMode() {
  debugMode = true;
}

function log(...args) {
  if (debugMode) {
    console.log(...args);
  }
}

class GlobalStateManager {
  #store: any[];
  #storeCursor: number;
  #isWriting: boolean;
  #runningOnUpdated: boolean;
  #dependencies: number[];
  #pendingEffects: number;
  #currentEffect: number;

  #idEffect: number;
  #effects: AbstractEffect[];
  #onUpdatedEffects: OnUpdatedLifecycle[];
  #watcherEffects: WatcherEffect<any>[];
  #memoizedEffects: MemoEffect<any>[];
  #unmountEffects: OnUnmountedEffect[];

  #ignore: boolean;
  #executed: boolean;
  public debugId: string;
  public componentId: string;

  constructor(id: string, componentId: string) {
    this.#store = [];
    this.#storeCursor = 0;
    this.#isWriting = false;
    this.#runningOnUpdated = false;
    this.#dependencies = [];
    this.#pendingEffects = 0;
    this.#currentEffect = -1;

    this.#idEffect = 0;

    this.#effects = [];
    this.#onUpdatedEffects = [];
    this.#watcherEffects = [];
    this.#memoizedEffects = [];
    this.#unmountEffects = [];

    this.#ignore = true;
    this.#executed = false;
    this.debugId = id;
    this.componentId = componentId;
  }

  init() {
    this.#idEffect = 0;
    this.#storeCursor = 0;
    this.#isWriting = false;
  }

  runEffects() {
    // cleanup effects when the component is unmounted
    // this.#effects
    //   .filter((effect) => effect instanceof Effect || effect instanceof WatcherEffect)
    //   .forEach((effect) => (effect as EffectWithCleanup).cleanup?.());
    // on unmount effects
    // for (const effect of this.#unmountEffects) {
    //   effect.run();
    // }
  }

  getDependenciesAt(index: number) {
    return this.#dependencies[index];
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

  get pendingEffects() {
    return this.#pendingEffects;
  }

  set pendingEffects(value: number) {
    this.#pendingEffects = value;

    for (const effect of this.#effects) {
      if (!this.#pendingEffects) break;
      if ((1 << effect.id) & this.#pendingEffects) {
        this.#pendingEffects &= ~(1 << effect.id);
        effect.run();
        this.#pendingEffects &= ~(1 << effect.id);
      }
    }

    for (const memoEffect of this.#memoizedEffects) {
      if (!this.#pendingEffects) break;
      if ((1 << memoEffect.id) & this.#pendingEffects) {
        this.#pendingEffects ^= 1 << memoEffect.id;
        memoEffect.run();
      }
    }

    for (const effect of this.#watcherEffects) effect.run();
  }

  get currentEffect() {
    return this.#currentEffect;
  }

  set currentEffect(value: number) {
    this.#currentEffect = value;
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

  isIgnoreMode() {
    return this.#ignore;
  }

  isState<T>(r: WritableRef<T> | unknown): r is WritableRef<T>;
  isState(s: any): s is WritableRef {
    return !!(s && s instanceof WritableRef);
  }

  track(id: number, effect: any) {
    this.#currentEffect = id;

    const result = effect();

    this.#currentEffect = -1;

    return result;
  }

  createEffect(callback) {
    mustBeOutsideComponent();
    this.#effects.push(new Effect(this.#idEffect, this, callback));
    this.pendingEffects |= 1 << this.#idEffect;

    this.#idEffect++;
  }

  createLayoutEffect(callback) {
    mustBeOutsideComponent();
  }

  createInsertionEffect(callback) {
    mustBeOutsideComponent();
  }

  onUpdated(callback: () => void) {
    mustBeOutsideComponent();
    this.#onUpdatedEffects.push(new OnUpdatedLifecycle(this.#idEffect, this, callback));

    this.#idEffect++;
  }

  onMounted(callback: any) {
    throw new Error('Not implemented');
    this.#effects.push(new OnMountedEffect(this.#idEffect, this, callback));
    this.pendingEffects |= 1 << this.#idEffect;

    this.#idEffect++;
  }

  onUnmounted(callback: any) {
    this.#unmountEffects.push(new OnUnmountedEffect(this.#idEffect, this, callback));

    this.#idEffect++;
  }

  createWatcher<T>(source: WatchSource<T>, callback: WatchCallback<T>, options?: WatchOptions) {
    mustBeOutsideComponent();

    this.#watcherEffects.push(new WatcherEffect(this.#idEffect, this, callback, source, options));

    this.#idEffect++;
  }

  createRef<T>(initialValue: T | null) {
    mustBeOutsideComponent();
    const ref = { current: initialValue };

    const index = this.addToStore(ref);

    return new ReactRef<T | null>(this, index);
  }

  computed<T>(getter: (oldValue: T | null) => T) {
    mustBeOutsideComponent();
    const memoEffect = new MemoEffect(this.#idEffect, this, getter);
    this.#memoizedEffects.push(memoEffect);

    this.#idEffect++;

    memoEffect.run();
    return memoEffect.signal;
  }

  createId() {
    mustBeOutsideComponent();
    const id = nanoid();

    const index = this.addToStore(id);

    return new ReadableRef<string>(index);
  }

  createSignal<T>(initialState: T) {
    mustBeOutsideComponent();
    const index = this.addToStore(initialState);

    const setter = (value: T) => this.setStoreValueAt(index, value);

    return new WritableRef<T>(index, setter);
  }

  createReducer<T>(reducer: (state: T, action: any) => T, initialState: T) {
    mustBeOutsideComponent();
    const index = this.addToStore(initialState);

    const dispatcher = (action: any) => reducer(this.getValueAt(index), action);

    return [new ReadableRef<T>(index), dispatcher];
  }

  createContextConsumer<T>(context: React.Context<T>) {
    mustBeOutsideComponent();
  }

  createTransition() {
    mustBeOutsideComponent();
  }

  createDeferredValue<T>(state: WritableRef<T>) {
    throw new Error('Not implemented yet');
  }

  createReactiveState<T extends Record<string, any>>(value: T, keys: string[]) {
    const getters = [];
    const setters = [];
    for (const key of keys) {
      const index = this.addToStore(value[key]);

      const result = [index];
      if (typeof value[key] === 'object' && value[key] !== null) {
        const proxy = this.createReactiveState(value[key], Object.keys(value[key]));
        result.push(proxy);
      }
      const setter = (value: T) => this.setStoreValueAt(index, value);
      getters.push(() => result);
      setters.push(setter);
    }

    const context = this;

    const proxy = new Proxy(
      { _efs: 0 },
      {
        get(target, key) {
          const indexKey = keys.indexOf(key as string);
          const getter = getters[indexKey];
          const [index, proxy] = getter();
          if (context.currentEffect !== -1) {
            target._efs |= 1 << context.currentEffect;
          }
          if (proxy) return proxy;
          return context.#store[index];
        },
        set(target, key, value) {
          if (context.runningOnUpdated) {
            throw new Error('You cannot mutate a state in an onUpdated effect');
          }
          const index = keys.indexOf(key as string);
          const setter = setters[index];

          const [indexStore] = getters[index]();
          if (value !== context.#store[indexStore]) {
            setter(value);
            context.pendingEffects |= target._efs;
          }
          return true;
        },
      },
    );

    return proxy;
  }

  createShallowReactive<T extends Record<string, any>>(initialState: T) {
    mustBeOutsideComponent();
    const keys = Object.keys(initialState) as (keyof T)[];

    const getters = [];
    const setters = [];

    for (const key of keys) {
      const index = this.addToStore(initialState[key]);

      const setter = (value: T) => this.setStoreValueAt(index, value);

      getters.push(() => index);
      setters.push(setter);
    }

    const context = this;

    return new Proxy(
      { _efs: 0 },
      {
        get(target, key) {
          const indexKey = keys.indexOf(key as string);
          const getter = getters[indexKey];
          const index = getter();
          if (context.currentEffect !== -1) {
            target._efs |= 1 << context.currentEffect;
          }

          return context.#store[index];
        },
        set(target, key, value) {
          if (context.runningOnUpdated) {
            throw new Error('You cannot mutate a state in an onUpdated effect');
          }
          const index = keys.indexOf(key as string);
          const setter = setters[index];
          const indexStore = getters[index]();
          if (value !== context.getValueAt(indexStore)) {
            setter(value);
            context.pendingEffects |= target._efs;
          }
          return true;
        },
      },
    );
  }

  createReactive<T extends Record<string, any>>(initialState: T) {
    mustBeOutsideComponent();
    const keys = Object.keys(initialState) as (keyof T)[];

    return this.createReactiveState(initialState, keys);
  }
}

export default GlobalStateManager;
