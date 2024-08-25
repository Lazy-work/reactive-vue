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
import type {
  ReactHook,
} from '../../types';
import HookRef from '../../ref/local/HookRef';
import HookCallableRef from '../../ref/local/HookCallableRef';
import { mustBeReactiveComponent } from '../../utils';
import type IContext from '../IContext';
import { invokeArrayFns, isArray, isFunction, isObject, isSymbol, NOOP } from '@vue/shared';
import { SchedulerJob, SchedulerJobFlags, endFlush, pushRender, queueJob, unsetCurrentInstance } from '@vue/runtime-core/scheduler';
import { EffectFlags, EffectScope, reactive, ReactiveEffect, unref } from '@vue/reactivity/index';
import { warn } from '@vue/runtime-core/warning';
import { ComponentInternalInstance } from '@vue/runtime-core/index';
import { WatchEffectOptions } from '@vue/runtime-core/apiWatch';
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

function toggleRecurse(
  { effect, job }: ComponentInternalInstance,
  allowed: boolean,
) {
  if (allowed) {
    effect.flags |= EffectFlags.ALLOW_RECURSE
    job.flags! |= SchedulerJobFlags.ALLOW_RECURSE
  } else {
    effect.flags &= ~EffectFlags.ALLOW_RECURSE
    job.flags! &= ~SchedulerJobFlags.ALLOW_RECURSE
  }
}
class Context implements IContext {
  #id = id++;
  #parent?: IContext = getParentContext();
  #elements: WeakMap<any, any> = new WeakMap();
  #provider: Map<any, any> = new Map();
  #renderTrigger: () => void = __DEV__ ? () => {
    warn('Can\'t trigger a new rendering, the state is not setup properly');
  } : NOOP;
  #isRunning = false;
  #hooks: any[] = [];
  #propsKeys: string[] = [];
  #idEffect = 0;
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
  #effect: ReactiveEffect;
  #scope: EffectScope = new EffectScope(true);
  #props = reactive({});
  #onUpdatedEffects: OnUpdatedLifecycle[] = [];
  #onBeforeUpdateEffects: any[] = [];
  #layoutEffects: Effect[] = [];
  #insertionEffects: Effect[] = [];
  #onBeforeMountEffects: OnMountedLifecycle[] = [];
  #onMountedEffects: OnMountedLifecycle[] = [];
  #unmountedEffects: OnUnmountedLifecycle[] = [];

  #renderingScheduled = false;
  #executed = false;
  #nbExecution = 0;
  #mounted = false;
  #template = null;
  #endWork?: () => void ;
  #update: any;
  #job: any;
  #children: () => React.ReactNode = () => null;

  constructor() {
    // create reactive effect for rendering
    this.#scope.on()
    const effect = (this.#effect = new ReactiveEffect(() => {
      this.generate()
      this.triggerRendering()
    }));
    this.#scope.off()

    this.#update = effect.run.bind(effect);
    const job: SchedulerJob = (this.#job = effect.runIfDirty.bind(effect))
    job.i = this
    job.id = this.#id
    effect.scheduler = () => queueJob(job)

    // allowRecurse
    // #1801, #2043 component render effects should allow recursive updates
    toggleRecurse(this, true)

    /* if (__DEV__) {
      effect.onTrack = this.rtc
        ? e => invokeArrayFns(this.rtc!, e)
        : void 0
      effect.onTrigger = this.rtg
        ? e => invokeArrayFns(this.rtg!, e)
        : void 0
    } */
  }

  get effect() {
    return this.#effect;
  }
  get job() {
    return this.#job;
  }

  get isRunning() {
    return this.#isRunning;
  }

  provide(key: any, value: any): void {
    this.#provider.set(key, value);
  }

  set children(children: () => React.ReactNode) {
    this.#children = children;
  }

  generate() {
    setParentContext(this);
    setContext(this);
    this.#template = this.#children();
    unsetContext();
  }

  render() {
    if (!this.#executed) this.#effect.run();
    this.#executed = true;
    this.#isRunning = false;
    this.#renderingScheduled = false;
    return this.#template;
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
  }

  processHooks() {
    if (this.#executed) {
      for (const hook of this.#hooks) {
        const args =
          isFunction(hook.params) ? hook.params() : hook.params !== undefined ? hook.params : [];
        const result = hook.hook(...args.map(unref));

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
    if (this.#executed) {
      for (const effect of this.#onBeforeUpdateEffects) effect()
    };

    useEffect(() => {
      this.#endWork?.();
    });

    if (this.#onUpdatedEffects.length) {
      useEffect(() => {
        if (this.#nbExecution > 1) {
          for (const effect of this.#onUpdatedEffects) effect.run();
        }
      });
    }

    for (const effect of this.#onBeforeMountEffects) effect.run();
    // TODO: handle React strict mode, two time running
    
    


    // on unmount effects
    useEffect(
      () => () => {
        for (let i = 0; i < this.#disabledEffects.length; i++) {
          this.#savedDisabledEffects[i] = this.#disabledEffects[i];
        }
        this.#savedDisabledEffects.length = this.#disabledEffects.length;
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

  computeCleanups(effects: Effect[]) {
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
      case EffectType.INSERTION_EFFECT:
        this.#insertionEffects.push(effect);
        break;
      case EffectType.LAYOUT_EFFECT:
        this.#layoutEffects.push(effect);
        break;
    }

    //TODO add to scope

    // this.queueEffect(effect);

    this.#idEffect++;
    return effect;
  }


  setupState() {
    const [s, setState] = useState(true);

    this.#renderTrigger = () => {
      setState(!s);
      this.#renderingScheduled = true;
    };
  }

  triggerRendering() {
    if (!this.#isRunning && !this.#renderingScheduled) {
      this.#renderTrigger();
      pushRender(new Promise((resolve) => {
        this.#endWork = resolve
      }))
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
    for (const key of Object.keys(props)) {
      this.#props[key] = props[key];
    }
    
    return this.#props;
  }

  trackPropsStatically<T extends Record<string, any>>(props: T) {
    const keys = this.#propsKeys;

    for (const key of keys) {
      this.#props[key] = props[key];
    }

    return this.#props;
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
