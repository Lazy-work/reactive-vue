import { useId, useReducer } from "react";
import MemoEffect from "../effect/MemoEffect";
import { getContext } from "../management/setting";
import ReadableRef from "./local/ReadableRef";
import * as local from "./local";
import * as global from "./global";
import WritableDerivedRef from "./local/WritableDerivedRef";
import Ref from "./local/WritableRef";
import { isProxy, isReactive } from "../reactive";
import { mustBeReactiveComponent } from "../utils";
import { isArray, isObject } from "@vue/shared";
import { warn } from "../reactive/warning";

export const COMPUTED_SIDE_EFFECT_WARN =
  `Computed is still dirty after getter evaluation,` +
  ` likely because a computed is mutating its own dependency in its getter.` +
  ` State mutations in computed getters should be avoided. ` +
  ` Check the docs for more details: https://vuejs.org/guide/essentials/computed.html#getters-should-be-side-effect-free`;

export function defineProps(propsNames) {
  const context = getContext();
  if (context === globalThis.__v_globalContext)
    throw new Error("defineProps must be used in a reactive component");
  context.defineProps(propsNames);
}

export function ref(initialValue) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.ref.call(context, initialValue);
}

export function shallowRef(initialValue) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.shallowRef.call(context, initialValue);
}

export function computed(getter) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.computed.call(context, getter);
}

export function createId() {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.createId.call(context);
}

export function reducer(reducer, initialValue) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.createId.call(context, reducer, initialValue);
}

export function useContext(source) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.context.call(context, source);
}

export function useTransition() {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.transition.call(context);
}

export function useDeferredValue(source) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.deferredValue.call(context, source);
}

export function isRef(s) {
  return !!(s && s.__v_isRef === true);
}

export function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function toRef(target, key, initialValue) {
  if (isRef(target)) return target;
  if (typeof target === "function")
    return customRef(() => ({
      get: target,
    }));
  if (isObject(target)) {
    if (isRef(target[key])) return target[key];
    return new WritableDerivedRef(target, key, initialValue);
  }
}

export function toValue(source) {
  return typeof source === "function" ? source() : unref(source);
}

export function toRefs(value) {
  if (__DEV__ && !isProxy(value)) {
    warn(`toRefs() expects a reactive object but received a plain one.`);
  }
  if (isArray(value)) return value.map((_, index) => toRef(value, index));
  const keys = Object.keys(value);
  const entries = keys.map((key) => [key, toRef(value, key)]);

  return Object.fromEntries(entries);
}

export function triggerRef(ref) {
  if (isRef(ref)) {
    ref.trigger(undefined, true);
  }
}

export function customRef(factory) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.customRef.call(context, factory);
}

export function provide(key, value) {
  const context = getContext();
  context.provide(key, value);
}

export function inject(key, defaultValue) {
  const context = getContext();
  return context.inject(key) ?? defaultValue;
}
export function reactRef(initialValue) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.reactRef.call(context, initialValue);
}

export function tickListener() {
  mustBeReactiveComponent();
  const context = getContext();
  return () => context.createTickWaiter();
}


export function toReactiveHook(hook, options = {}) {
  return (...args) => {
    mustBeReactiveComponent();
    const value = hook(...args);
    const currentManager = getContext();

    const index = currentManager.addHookStore();

    if (typeof value === "object" && value !== null) {
      const states = currentManager.trackStates(index, value);
      const shallow = typeof options.shallow === "function" ? options.shallow(args) : options.shallow;
      currentManager.registerHook({ id: options.id, hook, index, params: args, shallow });

      return states;
    }
    const state = currentManager.trackState(index, value);
    

    currentManager.registerHook({ hook, index, params: args });
    return state;
  };
}

export function toReactiveHookShallow(hook) {
  return (...args) => {
    mustBeReactiveComponent();
    const value = hook(...args);

    const context = getContext();

    const index = context.addHookStore();
    const state = context.trackState(index, value);

    context.registerHook({ hook, index, params: args, shallow: true });
    return state;
  };
}
