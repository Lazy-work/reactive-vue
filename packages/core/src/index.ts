import "./context/global";
import { getContext } from "./management/setting";
export {
  $reactive,
  createHook,
} from './management'

export const isVue2 = false;
export const isVue3 = true;
export const version = "3.0.0";

export const Fragment = {};
export const TransitionGroup = {};
export const Transition = {};
export const defineComponent = (options) => { throw new Error("Not implemented yet"); }
export const h = () => { throw new Error("Not implemented yet"); }
export function set(target, key, val) {
  if (Array.isArray(target)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  target[key] = val
  return val
}

export function del(target, key) {
  if (Array.isArray(target)) {
    target.splice(key, 1)
    return
  }
  delete target[key]
}

export function reactRef(initialValue) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.reactRef.call(context, initialValue);
}

export { TrackOpTypes, TriggerOpTypes, ITERATE_KEY } from '@vue/reactivity/index'
export type {
  Ref,
  MaybeRef,
  MaybeRefOrGetter,
  ToRef,
  ToRefs,
  UnwrapRef,
  ShallowRef,
  ShallowUnwrapRef,
  CustomRefFactory,
  ReactiveFlags,
  DeepReadonly,
  ShallowReactive,
  UnwrapNestedRefs,
  ComputedRef,
  WritableComputedRef,
  WritableComputedOptions,
  ComputedGetter,
  ComputedSetter,
  ReactiveEffectRunner,
  ReactiveEffectOptions,
  EffectScheduler,
  DebuggerOptions,
  DebuggerEvent,
  DebuggerEventExtraInfo,
  Raw,
  Reactive,
} from '@vue/reactivity/index'
export type {
  MultiWatchSources,
  WatchEffect,
  WatchOptions,
  WatchOptionsBase,
  WatchCallback,
  WatchSource,
  WatchHandle,
  WatchStopHandle,
  ComponentInternalInstance,

} from '@vue/runtime-core/index'
export { getContext as getCurrentInstance } from './management/setting'
export {
  // core
  reactive,
  ref,
  computed,
  readonly,
  // utilities
  unref,
  proxyRefs,
  isRef,
  toRef,
  toValue,
  toRefs,
  isProxy,
  isReactive,
  isReadonly,
  isShallow,
  // advanced
  customRef,
  triggerRef,
  shallowRef,
  shallowReactive,
  shallowReadonly,
  markRaw,
  toRaw,
  // effect
  effect,
  stop,
  getCurrentWatcher,
  onWatcherCleanup,
  ReactiveEffect,
  // effect scope
  effectScope,
  EffectScope,
  getCurrentScope,
  onScopeDispose,
} from '@vue/reactivity/index'
export {
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
  // provide, 
  // inject, 
  // hasInjectionContext,
  nextTick
} from '@vue/runtime-core/index';
export * from './lifecycle'
export * from './react-helpers'
export * from './conditional'
export * from './app'
