/** @typedef {import('../context/local/index.ts').default} Context */
import { getContext } from "../management/setting";
import * as local from "./local";
import * as global from "./global";
import { mustBeReactiveComponent } from "../utils";
import { isArray, isFunction, isObject } from "@vue/shared";
import { isRef } from "./utils";
import WritableDerivedRef from "./local/WritableDerivedRef";
import { isProxy } from "../reactive";
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

export function computed(getter, debugOptions) {
  const context = getContext();
  let scope = local;
  if (context === globalThis.__v_globalContext) scope = global;
  return scope.computed.call(context, getter, debugOptions);
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

export function toRef(target, key, initialValue) {
  if (isRef(target)) return target;
  if (typeof target === 'function')
    return customRef(() => ({
      get: target,
    }));
  if (isObject(target)) {
    if (isRef(target[key])) return target[key];
    return new WritableDerivedRef(target, key, initialValue);
  }
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

export function toReactiveHook(hook, options = {}) {
  return (...args) => {
    mustBeReactiveComponent();
    const value = hook(...args);

    /** @type {Context} */
    const currentContext = getContext();

    const index = currentContext.addHookStore();

    if (isObject(value)) {
      const states = currentContext.trackStates(index, value);
      const paths = isFunction(options.paths) ? options.paths(args) : options.paths;
      const targets = currentContext.createTargets(paths);
      currentContext.registerHook({ options: { paths, targets }, hook, index, params: args, shallow: false });

      return states;
    }
    const state = currentContext.trackState(index, value);

    currentContext.registerHook({ hook, index, params: args });
    return state;
  };
}

export function toReactiveHookShallow(hook) {
  return (...args) => {
    mustBeReactiveComponent();
    const value = hook(...args);

    /** @type {Context} */
    const context = getContext();

    const index = context.addHookStore();
    const state = context.trackState(index, value);

    context.registerHook({ hook, index, params: args, shallow: true });
    return state;
  };
}

export * from './utils';