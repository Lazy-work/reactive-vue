import React, {
  useEffect,
  useInsertionEffect,
  useLayoutEffect,
  useState,
} from 'react';
import { getParentContext, setContext, setParentContext, undoContext, unsetContext } from '../../management/setting';
import AbstractEffect from '../../effect/AbstractEffect';
import Effect from '../../effect/Effect';
import OnUpdatedLifecycle from '../../lifecycle/OnUpdatedLifecycle';
import OnMountedLifecycle from '../../lifecycle/OnMountedLifecycle';
import OnUnmountedLifecycle from '../../lifecycle/OnUnmountedLifecycle';
import WatcherEffect from '../../effect/WatcherEffect';
import MemoEffect from '../../effect/MemoEffect';
import type {
  ReactHook,
  WatchEffectOptions,
  WatchOptions,
  WatchSource,
} from '../../types';
import HookRef from '../../ref/local/HookRef';
import HookCallableRef from '../../ref/local/HookCallableRef';
import { mustBeReactiveComponent } from '../../utils';
import ComputedRef from '../../ref/local/ComputedRef';
import type IContext from '../IContext';
import { RENDER_EFFECT } from '../../constants';
import { queueFlush } from '../../lifecycle';
import EffectScope, { getCurrentScope, setCurrentScope } from '../../effect/EffectScope';
import { isArray, isFunction, isObject, isSymbol, NOOP } from '@vue/shared';
import { DebuggerOptions } from '../..';
import { warn } from '../../reactive/warning';

const nativeHooks = [
  React.useReducer,
  React.useEffect,
  React.useId,
  React.useLayoutEffect,
  React.useMemo,
  React.useCallback,
  React.useRef,
  React.useContext,
  React.useImperativeHandle,
  React.useDebugValue,
  React.useTransition,
  React.useDeferredValue
];

export enum EffectType {
  PRE_EFFECT,
  POST_EFFECT,
  SYNC_EFFECT,
  LAYOUT_EFFECT,
  INSERTION_EFFECT,
}

export enum WatcherType {
  PRE,
  POST,
  SYNC
}

export enum LifecycleType {
  ON_BEFORE_MOUNT,
  ON_MOUNTED,
  ON_BEFORE_UPDATE,
  ON_UPDATED,
  ON_BEFORE_UNMOUNTED,
  ON_UNMOUNTED,
}
let id = 0;
class Context implements IContext {
  #id = id++;
  #parent?: IContext = getParentContext();
  #elements: WeakMap<any, any> = new WeakMap();
  #provider: Map<any, any> = new Map();
  #tick: () => void = NOOP;
  #renderTrigger: () => void = __DEV__ ? () => {
    warn('Can\'t trigger a new rendering, the state is not setup properly');
  } : NOOP;
  #isRunning = false;
  #hooks: any[] = [];
  #propsKeys: string[] = [];
  #propsValues: any[] = [];
  #propsEffects: number[][] = [];
  #staticProps: boolean = false;
  #store: any[] = [];
  #storeCursor = 0;
  #hookKeys: string[][] = [];
  #hookValues: any[][] = [];
  #hookRefs: HookRef[][] = [];
  #pendingEffects: number[] = [];
  #pendingSum: number = 0;
  #disabledEffects: number[] = [];
  #savedDisabledEffects: number[] = [];
  #currentEffect?: AbstractEffect = undefined;
  #scope: EffectScope = new EffectScope(this);

  #idEffect = 1;
  #preEffects: Effect[] = [];
  #postEffects: Effect[] = [];
  #syncEffects: Effect[] = [];
  #onUpdatedEffects: OnUpdatedLifecycle[] = [];
  #onBeforeUpdateEffects: any[] = [];
  #layoutEffects: Effect[] = [];
  #insertionEffects: Effect[] = [];
  #preWatcherEffects: WatcherEffect<any>[] = [];
  #postWatcherEffects: WatcherEffect<any>[] = [];
  #syncWatcherEffects: WatcherEffect<any>[] = [];
  #memoizedEffects: MemoEffect<any>[] = [];
  #onBeforeMountEffects: OnMountedLifecycle[] = [];
  #onMountedEffects: OnMountedLifecycle[] = [];
  #unmountedEffects: OnUnmountedLifecycle[] = [];

  #renderingScheduled = false;
  #executed = false;
  #nbExecution = 0;
  #mounted = false;
  #children: () => React.ReactNode = () => null;

  constructor() {
    this.#scope.on();
  }

  provide(key: any, value: any): void {
    this.#provider.set(key, value);
  }

  set children(children: () => React.ReactNode) {
    this.#children = children;
  }

  render() {
    setParentContext(this);
    setContext(this);
    const previousEffect = this.#currentEffect;
    this.#currentEffect = { id: RENDER_EFFECT } as any;
    const result = this.#children();
    unsetContext();
    this.#scope.off();
    this.#currentEffect = previousEffect;
    this.#executed = true;
    this.#isRunning = false;
    this.#renderingScheduled = false;
    return result;
  }

  getParent() {
    return this.#parent;
  }

  inject(key: any): any {
    const value = this.#provider.get(key);

    if (value !== undefined) return value;
    return this.#parent?.inject(key);
  }

  init() {
    this.#nbExecution++;
    this.#isRunning = true;
    if (!this.#executed) this.#tick = queueFlush();
  }

  processHooks() {
    if (this.#executed) {
      for (const hook of this.#hooks) {
        const args =
          isFunction(hook.params) ? hook.params() : hook.params !== undefined ? hook.params : [];
        const result = hook.hook(...args);

        if (hook.hook === useState) {
          // ignore
        } else if (nativeHooks.includes(hook.hook)) {
          this.#store[hook.index] = result;
        } else {
          if (isObject(result) && !hook.shallow) {
            if (Array.isArray(result)) {
              for (let i = 0; i < result.length; i++) {
                this.#hookValues[hook.index][i] = result[i];
              }
            } else {
              const currentHookKeys = Object.keys(result);

              for (const key of currentHookKeys) {
                if (this.#hookKeys[hook.index].indexOf(key) === -1) this.#hookKeys[hook.index].push(key);
              }

              const keys = this.#hookKeys[hook.index];

              for (let i = 0; i < keys.length; i++) {
                if (this.#hookValues[hook.index][i] !== result[keys[i]]) {
                  this.#hookValues[hook.index][i] = result[keys[i]];
                  this.#hookRefs[hook.index][i].trigger();
                }
              }
            }
          } else {
            if (this.#hookValues[hook.index][0] !== result) {
              this.#hookValues[hook.index][0] = result;
              this.#hookRefs[hook.index][0].trigger();
            }
          }
        }
      }
    }

  }

  computeEffects(effects: AbstractEffect[]) {
    for (let i = 0; i < effects.length && this.#pendingSum > 0; i++) {
      const digit = 1 << (effects[i].id % 32);
      const slot = Math.floor(effects[i].id / 32);
      const isPending = digit & this.#pendingEffects[slot];
      if (isPending) {
        this.#pendingEffects[slot] &= ~digit;
        effects[i].run();
        this.#pendingEffects[slot] &= ~digit;

        if (!this.#pendingEffects[slot]) this.#pendingSum &= ~slot;
      }
    }
  }

  isMounted() {
    return this.#mounted;
  }

  getElement(callback: any) {
    return this.#elements.get(callback);
  }

  setElement(callback: any, element: any) {
    this.#elements.set(callback, element);
    return element;
  }

  runEffects() {
    this.computeEffects(this.#preEffects);
    this.computeEffects(this.#preWatcherEffects);

    if (this.#executed) {
      for (const effect of this.#onBeforeUpdateEffects) effect()
    };

    if (this.#postWatcherEffects.length || this.#postEffects.length || this.#onUpdatedEffects.length) {
      useEffect(() => {
        if (this.#nbExecution > 1) {
          for (const effect of this.#onUpdatedEffects) effect.run();
        }
        this.computeEffects(this.#postWatcherEffects);
        this.computeEffects(this.#postEffects);
      });
    }

    for (const effect of this.#onBeforeMountEffects) effect.run();
    useEffect(() => {
      // handle React strict mode, two time running
      if (!this.#scope.active) {
        for (let i = 0; i < this.#savedDisabledEffects.length; i++) {
          this.#disabledEffects[i] = this.#savedDisabledEffects[i];
        }
        this.#disabledEffects.length = this.#savedDisabledEffects.length;
        this.#scope.restart();
      }
      this.#mounted = true;
      for (const effect of this.#onMountedEffects) effect.run();
    }, []);

    useEffect(() => {
      this.#tick();
    });

    // on unmount effects
    useEffect(
      () => () => {
        for (let i = 0; i < this.#disabledEffects.length; i++) {
          this.#savedDisabledEffects[i] = this.#disabledEffects[i];
        }
        this.#savedDisabledEffects.length = this.#disabledEffects.length;
        this.computeCleanups(this.#preEffects);
        this.computeCleanups(this.#postEffects);
        this.computeCleanups(this.#syncEffects);
        this.computeCleanups(this.#preWatcherEffects);
        this.computeCleanups(this.#postWatcherEffects);
        this.computeCleanups(this.#syncWatcherEffects);
        for (const effect of this.#unmountedEffects) {
          effect.run();
        }
        this.#scope.stop();
      },
      [],
    );

    if (this.#layoutEffects.length) {
      useLayoutEffect(() => {
        this.computeEffects(this.#layoutEffects);
      });

      useLayoutEffect(() => () => this.computeCleanups(this.#layoutEffects), []);
    }

    if (this.#insertionEffects.length) {
      useInsertionEffect(() => {
        this.computeEffects(this.#insertionEffects);
      });

      useInsertionEffect(() => () => this.computeCleanups(this.#insertionEffects), []);
    }
  }

  computeCleanups(effects: Effect[] | WatcherEffect<any>[]) {
    for (const effect of effects) {
      effect.cleanup?.();
    }
  }

  get id() {
    return this.#id;
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

  setStoreValueAt(index: number, value: any) {
    this.#store[index] = value;
  }

  get store() {
    return this.#store;
  }

  get scope() {
    return this.#scope;
  }

  get pendingEffects() {
    return this.#pendingEffects;
  }

  set pendingEffects(value: number[]) {
    this.#pendingEffects = value;
  }

  runSyncEffects() {
    this.computeEffects(this.#memoizedEffects);
    this.computeEffects(this.#syncEffects);
    this.computeEffects(this.#syncWatcherEffects);
  }


  queueEffects(effects: Iterable<AbstractEffect>, force = false) {
    for (const effect of effects) {
      if (effect.id === RENDER_EFFECT) {
        this.triggerRendering();
        continue;
      }
      if (force && effect instanceof WatcherEffect) {
        effect.force();
      }
      this.queueEffectId(effect.id);
    }
    this.runSyncEffects();
  }

  queueEffect(effect: AbstractEffect, force = false) {
    if (effect.id === RENDER_EFFECT) {
      this.triggerRendering();
      return;
    }
    if (force && effect instanceof WatcherEffect) {
      effect.force();
    }
    this.queueEffectId(effect.id);
  }


  queuePendingEffects(effectIds: number[], force = false) {
    for (let i = 0; i < effectIds.length; i++) {
      this.#pendingEffects[i] |= effectIds[i] & ~this.#disabledEffects[i];
      if (this.#pendingEffects[i]) this.#pendingSum |= 1 << i;
    }
    if (effectIds[0] & 1) {
      this.triggerRendering();
      this.#pendingEffects[0] &= ~1;
    }
    if (force) {
      for (const effect of this.#preWatcherEffects) {
        const digit = 1 << (effect.id % 32);
        const slot = Math.floor(effect.id / 32);
        const isPending = digit & this.#pendingEffects[slot];
        const isDisabled = this.#disabledEffects[slot] & digit;

        if (isPending && !isDisabled) {
          effect.force();
        }
      }

      for (const effect of this.#postWatcherEffects) {
        const digit = 1 << (effect.id % 32);
        const slot = Math.floor(effect.id / 32);
        const isPending = digit & this.#pendingEffects[slot];
        const isDisabled = this.#disabledEffects[slot] & digit;

        if (isPending && !isDisabled) {
          effect.force();
        }
      }

      for (const effect of this.#syncWatcherEffects) {
        const digit = 1 << (effect.id % 32);
        const slot = Math.floor(effect.id / 32);
        const isPending = digit & this.#pendingEffects[slot];
        const isDisabled = this.#disabledEffects[slot] & digit;

        if (isPending && !isDisabled) {
          effect.force();
        }
      }
    }
    this.runSyncEffects();
  }

  queueEffectId(effectId: number) {
    if (effectId === RENDER_EFFECT) {
      this.triggerRendering();
      return;
    }
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);

    const isDisabled = this.#disabledEffects[slot] & digit;

    if (isDisabled) return;
    this.#pendingEffects[slot] |= digit;

    if (this.#pendingEffects[slot]) this.#pendingSum |= 1 << slot;

    this.runSyncEffects();
  }

  disableEffect(effect: AbstractEffect) {
    if (effect.id === RENDER_EFFECT) return;
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
  get currentEffect() {
    return this.#currentEffect;
  }

  set currentEffect(value: AbstractEffect | undefined) {
    this.#currentEffect = value;
  }

  isExecuted() {
    return this.#executed;
  }

  executed() {
    this.#executed = true;
  }

  get nbExecution() {
    return this.#nbExecution;
  }

  getStoreNextIndex() {
    return this.#storeCursor++;
  }

  track(effect: AbstractEffect, callback: any, parentEffect?: AbstractEffect) {
    this.#currentEffect = effect;
    setContext(this);

    const result = callback();

    if (this.#executed && !parentEffect) undoContext();

    this.#currentEffect = parentEffect;

    return result;
  }

  scopeTrack(scope: EffectScope, fn: any, parentScope?: EffectScope) {
    setCurrentScope(scope);
    setContext(this);

    const result = fn();

    if (this.#executed && !parentScope) undoContext();

    setCurrentScope(parentScope);

    return result;
  }

  createMemoEffect<T>(getterOrOptions: any, debuggerOptions: DebuggerOptions = {}): MemoEffect<T> {
    mustBeReactiveComponent();
    let getter;
    let setter;
    if (isFunction(getterOrOptions)) {
      getter = getterOrOptions;
    } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
    }
    const storeIndex = this.getStoreNextIndex();
    const memoEffect = new MemoEffect<T>(this.#idEffect, this, getter, storeIndex, undefined, debuggerOptions.onTrack, debuggerOptions.onTrigger);
    const ref = new ComputedRef(this, storeIndex, memoEffect, setter);
    memoEffect.ref = ref;
    this.#memoizedEffects.push(memoEffect);

    const currentScope = getCurrentScope();
    if (currentScope) {
      currentScope.addEffect(memoEffect);
    }

    this.#idEffect++;

    memoEffect.run();
    return memoEffect;
  }

  createLifecycleHook(type: LifecycleType, callback: any) {
    mustBeReactiveComponent();
    let hook;
    switch (type) {
      case LifecycleType.ON_BEFORE_MOUNT:
        hook = new OnMountedLifecycle(this.#idEffect, this, callback);
        this.#onBeforeMountEffects.push(hook);
        break;
      case LifecycleType.ON_MOUNTED:
        hook = new OnMountedLifecycle(this.#idEffect, this, callback);
        this.#onMountedEffects.push(hook);
        break;
      case LifecycleType.ON_BEFORE_UPDATE:
        this.#onBeforeUpdateEffects.push(callback);
        break;
      case LifecycleType.ON_UPDATED:
        hook = new OnUpdatedLifecycle(this.#idEffect, this, callback);
        this.#onUpdatedEffects.push(hook);
        break;
      case LifecycleType.ON_BEFORE_UNMOUNTED:
      case LifecycleType.ON_UNMOUNTED:
        hook = new OnUnmountedLifecycle(this.#idEffect, this, callback);
        this.#unmountedEffects.push(hook);
        break;
    }
  }

  createEffect(type: EffectType, callback: any, options?: WatchEffectOptions): Effect {
    mustBeReactiveComponent();
    const effect = new Effect(this.#idEffect, this, callback, options?.onTrack, options?.onTrigger);
    switch (type) {
      case EffectType.PRE_EFFECT:
        this.#preEffects.push(effect);
        break;
      case EffectType.POST_EFFECT:
        this.#postEffects.push(effect);
        break;
      case EffectType.SYNC_EFFECT:
        this.#syncEffects.push(effect);
        break;
      case EffectType.INSERTION_EFFECT:
        this.#insertionEffects.push(effect);
        break;
      case EffectType.LAYOUT_EFFECT:
        this.#layoutEffects.push(effect);
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
    mustBeReactiveComponent();
    const watcher = new WatcherEffect(this.#idEffect, this, callback, source, options);
    switch (type) {
      case WatcherType.PRE:
        this.#preWatcherEffects.push(watcher);
        break;
      case WatcherType.POST:
        this.#postWatcherEffects.push(watcher);
        break;
      case WatcherType.SYNC:
        this.#syncWatcherEffects.push(watcher);
        break;
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

  setupState() {
    const [s, setState] = useState(true);

    this.#renderTrigger = () => {
      setState(!s);
      this.#renderingScheduled = true;
      this.#tick = queueFlush();
    };
  }

  triggerRendering() {
    if (!this.#isRunning && !this.#renderingScheduled) {
      this.#renderTrigger();
    }
  }

  defineProps(keys: string[]) {
    if (!isArray(keys)) {
      warn('Wrong type passed, the keys value must be an array of string');
      return;
    }
    this.#staticProps = true;
    this.#propsKeys = keys;
  }

  trackPropsDynamically<T extends Record<string, any>>(props: T) {
    const currentPropsKeys = Object.keys(props);

    for (const key of currentPropsKeys) {
      if (this.#propsKeys.indexOf(key) === -1) this.#propsKeys.push(key);
    }

    const keys = this.#propsKeys;

    for (let i = 0; i < keys.length; i++) {
      if (this.#propsValues[i] !== props[keys[i]]) {
        this.#propsValues[i] = props[keys[i]];
        this.queuePendingEffects(this.#propsEffects[i] || []);
      }
    }

    const context = this;

    const proxy = new Proxy(
      {},
      {
        get(_, key) {
          if (isSymbol(key)) {
            if (__DEV__) warn('Symbol as key are not allowed');
            return;
          }

          const index = keys.indexOf(key as string);
          if (index === -1) return undefined;
          
          if (context.currentEffect) {
            if (context.#propsEffects[index] === undefined) context.#propsEffects[index] = [];
            const effectId = context.currentEffect.id;
            const slot = Math.floor(effectId / 32);
            const digit = 1 << (effectId % 32);

            context.#propsEffects[index][slot] |= digit;
          }

          return context.#propsValues[index];
        },
        set() {
          if (__DEV__) warn("You can't mutate props");
          return true;
        },
      },
    );

    return proxy;
  }

  trackPropsStatically<T extends Record<string, any>>(props: T) {
    const keys = this.#propsKeys;

    for (let i = 0; i < keys.length; i++) {
      if (this.#propsValues[i] !== props[keys[i]]) {
        this.#propsValues[i] = props[keys[i]];
        this.queuePendingEffects(this.#propsEffects[i] || []);
      }
    }

    const context = this;

    const proxy = new Proxy(
      {},
      {
        get(_, key) {
          if (isSymbol(key)) {
            if (__DEV__) warn('Symbol as key are not allowed');
            return undefined;
          }

          const index = keys.indexOf(key as string);
          if (index === -1) return undefined;
          if (context.currentEffect) {
            if (context.#propsEffects[index] === undefined) context.#propsEffects[index] = [];
            const effectId = context.currentEffect.id;
            const slot = Math.floor(effectId / 32);
            const digit = 1 << (effectId % 32);

            context.#propsEffects[index][slot] |= digit;
          }

          return context.#propsValues[index];
        },
        set() {
          if (__DEV__) warn("You can't mutate props");
          return true;
        },
      },
    );

    return proxy;
  }

  trackProps<T extends Record<string, any>>(props: T) {
    let result;

    if (this.#staticProps) result = this.trackPropsStatically(props);
    else result = this.trackPropsDynamically(props);

    return result
  }

  trackState<T>(hookIndex: number, value: T) {
    if (isFunction(value)) {
      const valueIndex = this.addToHookStore(hookIndex, value);
      type ValueType = typeof value;
      const ref = new HookCallableRef<Parameters<ValueType>, ReturnType<ValueType>>(this, hookIndex, valueIndex);
      this.#hookRefs[hookIndex].push(ref);
      return (...args) => ref.call(...args);
    }
    const valueIndex = this.addToHookStore(hookIndex, value);
    const ref = new HookRef<T>(this, hookIndex, valueIndex);

    this.#hookRefs[hookIndex].push(ref);

    return ref;
  }

  trackStates<T extends object>(hookIndex: number, values: T) {
    if (Array.isArray(values)) {
      const result = [];
      for (const value of values) {
        result.push(this.trackState(hookIndex, value));
      }
      return result;
    }

    const result = {};

    for (const [key, value] of Object.entries(values)) {
      result[key] = this.trackState(hookIndex, value);
    }

    return result;
  }

  createTargets(paths: any) {
    return [];
  }

  addToHookStore(hookIndex: number, value: any) {
    this.#hookValues[hookIndex].push(value);
    const index = this.#hookValues[hookIndex].length - 1;

    return index;
  }

  addHookStore() {
    this.#hookKeys.push([]);
    this.#hookValues.push([]);
    this.#hookRefs.push([]);

    return this.#hookValues.length - 1;
  }

  registerHook(params: { hook: ReactHook; index: number; params: any }) {
    this.#hooks.push(params);
  }

  getHookValueAt(hookIndex: number, valueIndex: number) {
    return this.#hookValues[hookIndex][valueIndex];
  }
}

export default Context;
