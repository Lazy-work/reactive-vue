import { ReactNode } from "react";
import IContext from "./context/IContext";

type AnyFunction = (...args: any[]) => any;
type ReactHook = (...args: any[]) => any;
interface ReactRef<T> extends AnyFunction {
    value: T;
  }

type IfAny<T, Y, N> = 0 extends 1 & T ? Y : N;
export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};
export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;
export type LooseRequired<T> = {
    [P in keyof (T & Required<T>)]: T[P];
};
export type Awaited<T> = T extends null | undefined ? T : T extends object & {
    then(onfulfilled: infer F, ...args: infer _): any;
} ? F extends (value: infer V, ...args: infer _) => any ? Awaited<V> : never : T;

type SetterFn<T> = (oldValue: T) => T
type Setter<T> = (value: T | SetterFn<T>) => void;
export declare function useRef<T>(initialValue: Ref<T>): [T, Setter<T>];

type ReactiveSetter<K, V> = (key: K, value: V | SetterFn<V>) => void;
export declare function useReactive<T extends object, K extends keyof T>(
    initialValue: T,
    keys: K[]
): [{ [P in Extract<keyof T, K>]: T[P] }, ReactiveSetter<K, T[K]>];

export interface App<HostElement = any> {
    version: string
    config: AppConfig
  
    use<Options extends unknown[]>(
      plugin: Plugin<Options>,
      ...options: Options
    ): this
    use<Options>(plugin: Plugin<Options>, options: Options): this
  
    mixin(mixin: ComponentOptions): this
    component(name: string): Component | undefined
    component(name: string, component: Component | DefineComponent): this
    directive<T = any, V = any>(name: string): Directive<T, V> | undefined
    directive<T = any, V = any>(name: string, directive: Directive<T, V>): this
    mount(
      rootContainer: HostElement | string,
      isHydrate?: boolean,
      namespace?: boolean | ElementNamespace,
    ): ComponentPublicInstance
    unmount(): void
    provide<T>(key: InjectionKey<T> | string, value: T): this
  
    /**
     * Runs a function with the app as active instance. This allows using of `inject()` within the function to get access
     * to variables provided via `app.provide()`.
     *
     * @param fn - function to run with the app as active instance
     */
    runWithContext<T>(fn: () => T): T
  }

export declare function AppProvider({ app, children }: { app: App, children: ReactNode }): ReactNode;
export declare function createApp(): App;
export declare function useContext<T>(context: React.Context<T>): T;
export declare function useDeferredValue<T>(initialValue: Ref<T>): Readonly<Ref<T>>;
export declare function createHook<T>(reactiveHook: T): T;
export declare function reactivity<T>(component: (props: T) => () => ReactNode): React.FC<T>;
export declare function getCurrentInstance(): IContext;
export declare function defineProps<T extends object>(keys: (keyof T)[]): void;
export declare function reactRef<T>(initialValue: T | null): ReactRef<T>;
export declare function watchLayoutEffect(effect: WatchEffect, options?: WatchOptionsBase): WatchStopHandle;
export declare function watchInsertionEffect(effect: WatchEffect, options?: WatchOptionsBase): WatchStopHandle;
export declare function useTransition(): void;
export declare function nextTick(): Promise<void>;

interface ToReactiveHookOptions {
    /**
     * If `true`, the returned reactive hook will be a shallow reactive.
     */
    shallow?: boolean;
    
    /**
     * The name of the reactive hook.
     */
    id?: string;
}
export declare function toReactiveHook<T extends ReactHook>(hook: T, options: ToReactiveHookOptions = {}): (...args: Parameters<T>) => ToRefs<ReturnType<T>>;
export declare function toReactiveHookShallow<T extends ReactHook>(
    hook: T,
): (...args: Parameters<T>) => ReturnType<T> extends (...args: any) => any ? T : Readonly<Ref<ReturnType<T>>>;


interface SchedulerJob extends Function {
    id?: number;
    pre?: boolean;
    active?: boolean;
    computed?: boolean;
    /**
     * Indicates whether the effect is allowed to recursively trigger itself
     * when managed by the scheduler.
     *
     * By default, a job cannot trigger itself because some built-in method calls,
     * e.g. Array.prototype.push actually performs reads as well (#1740) which
     * can lead to confusing infinite loops.
     * The allowed cases are component update functions and watch callbacks.
     * Component update functions may update child component props, which in turn
     * trigger flush: "pre" watch callbacks that mutates state that the parent
     * relies on (#1801). Watch callbacks doesn't track its dependencies so if it
     * triggers itself again, it's likely intentional and it is the user's
     * responsibility to perform recursive state mutation that eventually
     * stabilizes (#1727).
     */
    allowRecurse?: boolean;
    /**
     * Attached by renderer.ts when setting up a component's render effect
     * Used to obtain component information when reporting max recursive updates.
     * dev only.
     */
    ownerInstance?: ComponentInternalInstance;
}
type SchedulerJobs = SchedulerJob | SchedulerJob[];
export declare function queuePostFlushCb(cb: SchedulerJobs): void;

export type ObjectEmitsOptions = Record<string, ((...args: any[]) => any) | null>;
export type EmitsOptions = ObjectEmitsOptions | string[];
type EmitsToProps<T extends EmitsOptions> = T extends string[] ? {
    [K in `on${Capitalize<T[number]>}`]?: (...args: any[]) => any;
} : T extends ObjectEmitsOptions ? {
    [K in `on${Capitalize<string & keyof T>}`]?: K extends `on${infer C}` ? (...args: T[Uncapitalize<C>] extends (...args: infer P) => any ? P : T[Uncapitalize<C>] extends null ? any[] : never) => any : never;
} : {};
type ShortEmitsToObject<E> = E extends Record<string, any[]> ? {
    [K in keyof E]: (...args: E[K]) => any;
} : E;
type EmitFn<Options = ObjectEmitsOptions, Event extends keyof Options = keyof Options> = Options extends Array<infer V> ? (event: V, ...args: any[]) => void : {} extends Options ? (event: string, ...args: any[]) => void : UnionToIntersection<{
    [key in Event]: Options[key] extends (...args: infer Args) => any ? (event: key, ...args: Args) => void : Options[key] extends any[] ? (event: key, ...args: Options[key]) => void : (event: key, ...args: any[]) => void;
}[Event]>;


export type ElementNamespace = 'svg' | 'mathml' | undefined;

type MatchPattern = string | RegExp | (string | RegExp)[];

export declare const onBeforeMount: (hook: () => any) => false | Function | undefined;
export declare const onMounted: (hook: () => any) => false | Function | undefined;
export declare const onBeforeUpdate: (hook: () => any) => false | Function | undefined;
export declare const onUpdated: (hook: () => any) => false | Function | undefined;
export declare const onBeforeUnmount: (hook: () => any) => false | Function | undefined;
export declare const onUnmounted: (hook: () => any) => false | Function | undefined;
export declare const onServerPrefetch: (hook: () => any) => false | Function | undefined;
type DebuggerHook = (e: DebuggerEvent) => void;
export declare const onRenderTriggered: (hook: DebuggerHook) => false | Function | undefined;
export declare const onRenderTracked: (hook: DebuggerHook) => false | Function | undefined;
type ErrorCapturedHook<TError = unknown> = (err: TError, instance: any | null, info: string) => boolean | void;
export declare function onErrorCaptured<TError = Error>(hook: ErrorCapturedHook<TError>): void;

export type ComponentPropsOptions<P = Data> = ComponentObjectPropsOptions<P> | string[];
export type ComponentObjectPropsOptions<P = Data> = {
    [K in keyof P]: Prop<P[K]> | null;
};
export type Prop<T, D = T> = PropOptions<T, D> | PropType<T>;
type DefaultFactory<T> = (props: Data) => T | null | undefined;
interface PropOptions<T = any, D = T> {
    type?: PropType<T> | true | null;
    required?: boolean;
    default?: D | DefaultFactory<D> | null | undefined | object;
    validator?(value: unknown, props: Data): boolean;
}
export type PropType<T> = PropConstructor<T> | PropConstructor<T>[];
type PropConstructor<T = any> = {
    new(...args: any[]): T & {};
} | {
    (): T;
} | PropMethod<T>;
type PropMethod<T, TConstructor = any> = [T] extends [
    ((...args: any) => any) | undefined
] ? {
    new(): TConstructor;
    (): T;
    readonly prototype: TConstructor;
} : never;
type RequiredKeys<T> = {
    [K in keyof T]: T[K] extends {
        required: true;
    } | {
        default: any;
    } | BooleanConstructor | {
        type: BooleanConstructor;
    } ? T[K] extends {
        default: undefined | (() => undefined);
    } ? never : K : never;
}[keyof T];
type OptionalKeys<T> = Exclude<keyof T, RequiredKeys<T>>;
type DefaultKeys<T> = {
    [K in keyof T]: T[K] extends {
        default: any;
    } | BooleanConstructor | {
        type: BooleanConstructor;
    } ? T[K] extends {
        type: BooleanConstructor;
        required: true;
    } ? never : K : never;
}[keyof T];
type InferPropType<T> = [T] extends [null] ? any : [T] extends [{
    type: null | true;
}] ? any : [T] extends [ObjectConstructor | {
    type: ObjectConstructor;
}] ? Record<string, any> : [T] extends [BooleanConstructor | {
    type: BooleanConstructor;
}] ? boolean : [T] extends [DateConstructor | {
    type: DateConstructor;
}] ? Date : [T] extends [(infer U)[] | {
    type: (infer U)[];
}] ? U extends DateConstructor ? Date | InferPropType<U> : InferPropType<U> : [T] extends [Prop<infer V, infer D>] ? unknown extends V ? IfAny<V, V, D> : V : T;
/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **internal** - i.e. the resolved props received by
 * the component.
 * - Boolean props are always present
 * - Props with default values are always present
 *
 * To extract accepted props from the parent, use {@link ExtractPublicPropTypes}.
 */
export type ExtractPropTypes<O> = {
    [K in keyof Pick<O, RequiredKeys<O>>]: InferPropType<O[K]>;
} & {
        [K in keyof Pick<O, OptionalKeys<O>>]?: InferPropType<O[K]>;
    };
type PublicRequiredKeys<T> = {
    [K in keyof T]: T[K] extends {
        required: true;
    } ? K : never;
}[keyof T];
type PublicOptionalKeys<T> = Exclude<keyof T, PublicRequiredKeys<T>>;
/**
 * Extract prop types from a runtime props options object.
 * The extracted types are **public** - i.e. the expected props that can be
 * passed to component.
 */
export type ExtractPublicPropTypes<O> = {
    [K in keyof Pick<O, PublicRequiredKeys<O>>]: InferPropType<O[K]>;
} & {
        [K in keyof Pick<O, PublicOptionalKeys<O>>]?: InferPropType<O[K]>;
    };
export type ExtractDefaultPropTypes<O> = O extends object ? {
    [K in keyof Pick<O, DefaultKeys<O>>]: InferPropType<O[K]>;
} : {};

/**
Runtime helper for applying directives to a vnode. Example usage:

const comp = resolveComponent('comp')
const foo = resolveDirective('foo')
const bar = resolveDirective('bar')

return withDirectives(h(comp), [
  [foo, this.x],
  [bar, this.y]
])
*/


export interface InjectionKey<T> extends symbol {
}
export declare function provide<T, K = InjectionKey<T> | string | number>(key: K, value: K extends InjectionKey<infer V> ? V : T): void;
export declare function inject<T>(key: InjectionKey<T> | string): T | undefined;
export declare function inject<T>(key: InjectionKey<T> | string, defaultValue: T, treatDefaultAsFactory?: false): T;
export declare function inject<T>(key: InjectionKey<T> | string, defaultValue: T | (() => T), treatDefaultAsFactory: true): T;
/**
 * Returns true if `inject()` can be used without warning about being called in the wrong place (e.g. outside of
 * setup()). This is used by libraries that want to use `inject()` internally without triggering a warning to the end
 * user. One example is `useRoute()` in `vue-router`.
 */
export declare function hasInjectionContext(): boolean;

export type OptionMergeFunction = (to: unknown, from: unknown) => any;

type Data = Record<string, unknown>;

/**
 * For extending allowed non-declared props on components in TSX
 */
export interface ComponentCustomProps {
}
/**
 * Default allowed non-declared props on component in TSX
 */
export interface AllowedComponentProps {
    class?: unknown;
    style?: unknown;
}
interface ComponentInternalOptions {
    /**
     * Compat build only, for bailing out of certain compatibility behavior
     */
    __isBuiltIn?: boolean;
    /**
     * This one should be exposed so that devtools can make use of it
     */
    __file?: string;
    /**
     * name inferred from filename
     */
    __name?: string;
}


/**
 * We expose a subset of properties on the internal instance as they are
 * useful for advanced external libraries and tools.
 */
export interface ComponentInternalInstance {
    uid: number;
    type: any;
    parent: ComponentInternalInstance | null;
    root: ComponentInternalInstance;
    /**
     * Vnode representing this component in its parent's vdom tree
     */
    vnode: any;
    /**
     * Root vnode of this component's own vdom tree
     */
    subTree: any;
    /**
     * Render effect instance
     */
    effect: ReactiveEffect;
    /**
     * Bound effect runner to be passed to schedulers
     */
    update: SchedulerJob;
    proxy: any | null;
    exposed: Record<string, any> | null;
    exposeProxy: Record<string, any> | null;
    data: Data;
    props: Data;
    attrs: Data;
    slots: any;
    refs: Data;
    emit: EmitFn;
    attrsProxy: Data | null;
    slotsProxy: any | null;
    isMounted: boolean;
    isUnmounted: boolean;
    isDeactivated: boolean;
}
export type WatchEffect = (onCleanup: OnCleanup) => void;
export type WatchSource<T = any> = Ref<T> | ComputedRef<T> | (() => T);
export type WatchCallback<V = any, OV = any> = (value: V, oldValue: OV, onCleanup: OnCleanup) => any;
type MapSources<T, Immediate> = {
    [K in keyof T]: T[K] extends WatchSource<infer V> ? Immediate extends true ? V | undefined : V : T[K] extends object ? Immediate extends true ? T[K] | undefined : T[K] : never;
};
type OnCleanup = (cleanupFn: () => void) => void;
export interface WatchOptionsBase extends DebuggerOptions {
    flush?: 'pre' | 'post' | 'sync';
}
export interface WatchOptions<Immediate = boolean> extends WatchOptionsBase {
    immediate?: Immediate;
    deep?: boolean;
    once?: boolean;
}
export type WatchStopHandle = () => void;
export declare function watchEffect(effect: WatchEffect, options?: WatchOptionsBase): WatchStopHandle;
export declare function watchPostEffect(effect: WatchEffect, options?: DebuggerOptions): WatchStopHandle;
export declare function watchSyncEffect(effect: WatchEffect, options?: DebuggerOptions): WatchStopHandle;
type MultiWatchSources = (WatchSource<unknown> | object)[];
export declare function watch<T, Immediate extends Readonly<boolean> = false>(source: WatchSource<T>, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchOptions<Immediate>): WatchStopHandle;
export declare function watch<T extends MultiWatchSources, Immediate extends Readonly<boolean> = false>(sources: [...T], cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>, options?: WatchOptions<Immediate>): WatchStopHandle;
export declare function watch<T extends Readonly<MultiWatchSources>, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<MapSources<T, false>, MapSources<T, Immediate>>, options?: WatchOptions<Immediate>): WatchStopHandle;
export declare function watch<T extends object, Immediate extends Readonly<boolean> = false>(source: T, cb: WatchCallback<T, Immediate extends true ? T | undefined : T>, options?: WatchOptions<Immediate>): WatchStopHandle;

export declare const ssrContextKey: unique symbol;
export declare const useSSRContext: <T = Record<string, any>>() => T | undefined;

interface AppRecord {
    id: number;
    version: string;
    types: Record<string, string | symbol>;
}

export declare const version: string;

export declare enum TrackOpTypes {
    GET = "get",
    HAS = "has",
    ITERATE = "iterate"
}
export declare enum TriggerOpTypes {
    SET = "set",
    ADD = "add",
    DELETE = "delete",
    CLEAR = "clear"
}
export declare enum ReactiveFlags {
    SKIP = "__v_skip",
    IS_REACTIVE = "__v_isReactive",
    IS_READONLY = "__v_isReadonly",
    IS_SHALLOW = "__v_isShallow",
    RAW = "__v_raw"
}

type Dep = Map<ReactiveEffect, number> & {
    cleanup: () => void;
    computed?: ComputedRefImpl<any>;
};

export declare class EffectScope {
    detached: boolean;
    constructor(detached?: boolean);
    get active(): boolean;
    run<T>(fn: () => T): T | undefined;
    stop(fromParent?: boolean): void;
}
/**
 * Creates an effect scope object which can capture the reactive effects (i.e.
 * computed and watchers) created within it so that these effects can be
 * disposed together. For detailed use cases of this API, please consult its
 * corresponding {@link https://github.com/vuejs/rfcs/blob/master/active-rfcs/0041-reactivity-effect-scope.md | RFC}.
 *
 * @param detached - Can be used to create a "detached" effect scope.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#effectscope}
 */
export declare function effectScope(detached?: boolean): EffectScope;
/**
 * Returns the current active effect scope if there is one.
 *
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#getcurrentscope}
 */
export declare function getCurrentScope(): EffectScope | undefined;
/**
 * Registers a dispose callback on the current active effect scope. The
 * callback will be invoked when the associated effect scope is stopped.
 *
 * @param fn - The callback function to attach to the scope's cleanup.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#onscopedispose}
 */
export declare function onScopeDispose(fn: () => void): void;

export type EffectScheduler = (...args: any[]) => any;
export type DebuggerEvent = {
    effect: ReactiveEffect;
} & DebuggerEventExtraInfo;
export type DebuggerEventExtraInfo = {
    target: object;
    type: TrackOpTypes | TriggerOpTypes;
    key: any;
    newValue?: any;
    oldValue?: any;
    oldTarget?: Map<any, any> | Set<any>;
};
export declare class ReactiveEffect<T = any> {
    fn: () => T;
    trigger: () => void;
    scheduler?: EffectScheduler | undefined;
    active: boolean;
    deps: Dep[];
    onStop?: () => void;
    onTrack?: (event: DebuggerEvent) => void;
    onTrigger?: (event: DebuggerEvent) => void;
    constructor(fn: () => T, trigger: () => void, scheduler?: EffectScheduler | undefined, scope?: EffectScope);
    get dirty(): boolean;
    set dirty(v: boolean);
    run(): T;
    stop(): void;
}
export interface DebuggerOptions {
    onTrack?: (event: DebuggerEvent) => void;
    onTrigger?: (event: DebuggerEvent) => void;
}
export interface ReactiveEffectOptions extends DebuggerOptions {
    lazy?: boolean;
    scheduler?: EffectScheduler;
    scope?: EffectScope;
    allowRecurse?: boolean;
    onStop?: () => void;
}
export interface ReactiveEffectRunner<T = any> {
    (): T;
    effect: ReactiveEffect;
}
/**
 * Registers the given function to track reactive updates.
 *
 * The given function will be run once immediately. Every time any reactive
 * property that's accessed within it gets updated, the function will run again.
 *
 * @param fn - The function that will track reactive updates.
 * @param options - Allows to control the effect's behaviour.
 * @returns A runner that can be used to control the effect after creation.
 */
export declare function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions): ReactiveEffectRunner;
/**
 * Stops the effect associated with the given runner.
 *
 * @param runner - Association with the effect to stop tracking.
 */
export declare function stop(runner: ReactiveEffectRunner): void;
/**
 * Temporarily pauses tracking.
 */
export declare function pauseTracking(): void;
/**
 * Re-enables effect tracking (if it was paused).
 */
export declare function enableTracking(): void;
/**
 * Resets the previous global effect tracking state.
 */
export declare function resetTracking(): void;
export declare function pauseScheduling(): void;
export declare function resetScheduling(): void;

declare const ComputedRefSymbol: unique symbol;
export interface ComputedRef<T = any> extends WritableComputedRef<T> {
    readonly value: T;
    [ComputedRefSymbol]: true;
}
export interface WritableComputedRef<T> extends Ref<T> {
    readonly effect: ReactiveEffect<T>;
}
export type ComputedGetter<T> = (oldValue?: T) => T;
export type ComputedSetter<T> = (newValue: T) => void;
export interface WritableComputedOptions<T> {
    get: ComputedGetter<T>;
    set: ComputedSetter<T>;
}
export declare class ComputedRefImpl<T> {
    private getter;
    private readonly _setter;
    dep?: Dep;
    private _value;
    readonly effect: ReactiveEffect<T>;
    readonly __v_isRef = true;
    readonly [ReactiveFlags.IS_READONLY]: boolean;
    _cacheable: boolean;
    /**
     * Dev only
     */
    _warnRecursive?: boolean;
    constructor(getter: ComputedGetter<T>, _setter: ComputedSetter<T>, isReadonly: boolean, isSSR: boolean);
    get value(): T;
    set value(newValue: T);
    get _dirty(): boolean;
    set _dirty(v: boolean);
}
/**
 * Takes a getter function and returns a readonly reactive ref object for the
 * returned value from the getter. It can also take an object with get and set
 * functions to create a writable ref object.
 *
 * @example
 * ```js
 * // Creating a readonly computed ref:
 * const count = ref(1)
 * const plusOne = computed(() => count.value + 1)
 *
 * console.log(plusOne.value) // 2
 * plusOne.value++ // error
 * ```
 *
 * ```js
 * // Creating a writable computed ref:
 * const count = ref(1)
 * const plusOne = computed({
 *   get: () => count.value + 1,
 *   set: (val) => {
 *     count.value = val - 1
 *   }
 * })
 *
 * plusOne.value = 1
 * console.log(count.value) // 0
 * ```
 *
 * @param getter - Function that produces the next value.
 * @param debugOptions - For debugging. See {@link https://vuejs.org/guide/extras/reactivity-in-depth.html#computed-debugging}.
 * @see {@link https://vuejs.org/api/reactivity-core.html#computed}
 */
export declare function computed<T>(getter: ComputedGetter<T>, debugOptions?: DebuggerOptions): ComputedRef<T>;
export declare function computed<T>(options: WritableComputedOptions<T>, debugOptions?: DebuggerOptions): WritableComputedRef<T>;

export type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>;
/**
 * Returns a reactive proxy of the object.
 *
 * The reactive conversion is "deep": it affects all nested properties. A
 * reactive object also deeply unwraps any properties that are refs while
 * maintaining reactivity.
 *
 * @example
 * ```js
 * const obj = reactive({ count: 0 })
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-core.html#reactive}
 */
export declare function reactive<T extends object>(target: T): UnwrapNestedRefs<T>;
declare const ShallowReactiveMarker: unique symbol;
export type ShallowReactive<T> = T & {
    [ShallowReactiveMarker]?: true;
};
/**
 * Shallow version of {@link reactive()}.
 *
 * Unlike {@link reactive()}, there is no deep conversion: only root-level
 * properties are reactive for a shallow reactive object. Property values are
 * stored and exposed as-is - this also means properties with ref values will
 * not be automatically unwrapped.
 *
 * @example
 * ```js
 * const state = shallowReactive({
 *   foo: 1,
 *   nested: {
 *     bar: 2
 *   }
 * })
 *
 * // mutating state's own properties is reactive
 * state.foo++
 *
 * // ...but does not convert nested objects
 * isReactive(state.nested) // false
 *
 * // NOT reactive
 * state.nested.bar++
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowreactive}
 */
export declare function shallowReactive<T extends object>(target: T): ShallowReactive<T>;
type Primitive = string | number | boolean | bigint | symbol | undefined | null;
type Builtin = Primitive | Function | Date | Error | RegExp;
export type DeepReadonly<T> = T extends Builtin ? T : T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> : T extends WeakMap<infer K, infer V> ? WeakMap<DeepReadonly<K>, DeepReadonly<V>> : T extends Set<infer U> ? ReadonlySet<DeepReadonly<U>> : T extends ReadonlySet<infer U> ? ReadonlySet<DeepReadonly<U>> : T extends WeakSet<infer U> ? WeakSet<DeepReadonly<U>> : T extends Promise<infer U> ? Promise<DeepReadonly<U>> : T extends Ref<infer U> ? Readonly<Ref<DeepReadonly<U>>> : T extends {} ? {
    readonly [K in keyof T]: DeepReadonly<T[K]>;
} : Readonly<T>;
/**
 * Takes an object (reactive or plain) or a ref and returns a readonly proxy to
 * the original.
 *
 * A readonly proxy is deep: any nested property accessed will be readonly as
 * well. It also has the same ref-unwrapping behavior as {@link reactive()},
 * except the unwrapped values will also be made readonly.
 *
 * @example
 * ```js
 * const original = reactive({ count: 0 })
 *
 * const copy = readonly(original)
 *
 * watchEffect(() => {
 *   // works for reactivity tracking
 *   console.log(copy.count)
 * })
 *
 * // mutating original will trigger watchers relying on the copy
 * original.count++
 *
 * // mutating the copy will fail and result in a warning
 * copy.count++ // warning!
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-core.html#readonly}
 */
export declare function readonly<T extends object>(target: T): DeepReadonly<UnwrapNestedRefs<T>>;
/**
 * Shallow version of {@link readonly()}.
 *
 * Unlike {@link readonly()}, there is no deep conversion: only root-level
 * properties are made readonly. Property values are stored and exposed as-is -
 * this also means properties with ref values will not be automatically
 * unwrapped.
 *
 * @example
 * ```js
 * const state = shallowReadonly({
 *   foo: 1,
 *   nested: {
 *     bar: 2
 *   }
 * })
 *
 * // mutating state's own properties will fail
 * state.foo++
 *
 * // ...but works on nested objects
 * isReadonly(state.nested) // false
 *
 * // works
 * state.nested.bar++
 * ```
 *
 * @param target - The source object.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowreadonly}
 */
export declare function shallowReadonly<T extends object>(target: T): Readonly<T>;
/**
 * Checks if an object is a proxy created by {@link reactive()} or
 * {@link shallowReactive()} (or {@link ref()} in some cases).
 *
 * @example
 * ```js
 * isReactive(reactive({}))            // => true
 * isReactive(readonly(reactive({})))  // => true
 * isReactive(ref({}).value)           // => true
 * isReactive(readonly(ref({})).value) // => true
 * isReactive(ref(true))               // => false
 * isReactive(shallowRef({}).value)    // => false
 * isReactive(shallowReactive({}))     // => true
 * ```
 *
 * @param value - The value to check.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isreactive}
 */
export declare function isReactive(value: unknown): boolean;
/**
 * Checks whether the passed value is a readonly object. The properties of a
 * readonly object can change, but they can't be assigned directly via the
 * passed object.
 *
 * The proxies created by {@link readonly()} and {@link shallowReadonly()} are
 * both considered readonly, as is a computed ref without a set function.
 *
 * @param value - The value to check.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isreadonly}
 */
export declare function isReadonly(value: unknown): boolean;
export declare function isShallow(value: unknown): boolean;
/**
 * Checks if an object is a proxy created by {@link reactive},
 * {@link readonly}, {@link shallowReactive} or {@link shallowReadonly()}.
 *
 * @param value - The value to check.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isproxy}
 */
export declare function isProxy(value: unknown): boolean;
/**
 * Returns the raw, original object of a Vue-created proxy.
 *
 * `toRaw()` can return the original object from proxies created by
 * {@link reactive()}, {@link readonly()}, {@link shallowReactive()} or
 * {@link shallowReadonly()}.
 *
 * This is an escape hatch that can be used to temporarily read without
 * incurring proxy access / tracking overhead or write without triggering
 * changes. It is **not** recommended to hold a persistent reference to the
 * original object. Use with caution.
 *
 * @example
 * ```js
 * const foo = {}
 * const reactiveFoo = reactive(foo)
 *
 * console.log(toRaw(reactiveFoo) === foo) // true
 * ```
 *
 * @param observed - The object for which the "raw" value is requested.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#toraw}
 */
export declare function toRaw<T>(observed: T): T;
export type Raw<T> = T & {
    [RawSymbol]?: true;
};
/**
 * Marks an object so that it will never be converted to a proxy. Returns the
 * object itself.
 *
 * @example
 * ```js
 * const foo = markRaw({})
 * console.log(isReactive(reactive(foo))) // false
 *
 * // also works when nested inside other reactive objects
 * const bar = reactive({ foo })
 * console.log(isReactive(bar.foo)) // false
 * ```
 *
 * **Warning:** `markRaw()` together with the shallow APIs such as
 * {@link shallowReactive()} allow you to selectively opt-out of the default
 * deep reactive/readonly conversion and embed raw, non-proxied objects in your
 * state graph.
 *
 * @param value - The object to be marked as "raw".
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#markraw}
 */
export declare function markRaw<T extends object>(value: T): Raw<T>;

declare const RefSymbol: unique symbol;
declare const RawSymbol: unique symbol;
export interface Ref<T = any> {
    value: T;
    /**
     * Type differentiator only.
     * We need this to be in public d.ts but don't want it to show up in IDE
     * autocomplete, so we use a private Symbol instead.
     */
    [RefSymbol]: true;
}
/**
 * Checks if a value is a ref object.
 *
 * @param r - The value to inspect.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#isref}
 */
export declare function isRef<T>(r: Ref<T> | unknown): r is Ref<T>;
/**
 * Takes an inner value and returns a reactive and mutable ref object, which
 * has a single property `.value` that points to the inner value.
 *
 * @param value - The object to wrap in the ref.
 * @see {@link https://vuejs.org/api/reactivity-core.html#ref}
 */
export declare function ref<T>(value: T): Ref<UnwrapRef<T>>;
export declare function ref<T = any>(): Ref<T | undefined>;
declare const ShallowRefMarker: unique symbol;
export type ShallowRef<T = any> = Ref<T> & {
    [ShallowRefMarker]?: true;
};
/**
 * Shallow version of {@link ref()}.
 *
 * @example
 * ```js
 * const state = shallowRef({ count: 1 })
 *
 * // does NOT trigger change
 * state.value.count = 2
 *
 * // does trigger change
 * state.value = { count: 2 }
 * ```
 *
 * @param value - The "inner value" for the shallow ref.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#shallowref}
 */
export declare function shallowRef<T>(value: T): Ref extends T ? T extends Ref ? IfAny<T, ShallowRef<T>, T> : ShallowRef<T> : ShallowRef<T>;
export declare function shallowRef<T = any>(): ShallowRef<T | undefined>;
/**
 * Force trigger effects that depends on a shallow ref. This is typically used
 * after making deep mutations to the inner value of a shallow ref.
 *
 * @example
 * ```js
 * const shallow = shallowRef({
 *   greet: 'Hello, world'
 * })
 *
 * // Logs "Hello, world" once for the first run-through
 * watchEffect(() => {
 *   console.log(shallow.value.greet)
 * })
 *
 * // This won't trigger the effect because the ref is shallow
 * shallow.value.greet = 'Hello, universe'
 *
 * // Logs "Hello, universe"
 * triggerRef(shallow)
 * ```
 *
 * @param ref - The ref whose tied effects shall be executed.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#triggerref}
 */
export declare function triggerRef(ref: Ref): void;
export type MaybeRef<T = any> = T | Ref<T>;
export type MaybeRefOrGetter<T = any> = MaybeRef<T> | (() => T);
/**
 * Returns the inner value if the argument is a ref, otherwise return the
 * argument itself. This is a sugar function for
 * `val = isRef(val) ? val.value : val`.
 *
 * @example
 * ```js
 * function useFoo(x: number | Ref<number>) {
 *   const unwrapped = unref(x)
 *   // unwrapped is guaranteed to be number now
 * }
 * ```
 *
 * @param ref - Ref or plain value to be converted into the plain value.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#unref}
 */
export declare function unref<T>(ref: MaybeRef<T> | ComputedRef<T>): T;
/**
 * Normalizes values / refs / getters to values.
 * This is similar to {@link unref()}, except that it also normalizes getters.
 * If the argument is a getter, it will be invoked and its return value will
 * be returned.
 *
 * @example
 * ```js
 * toValue(1) // 1
 * toValue(ref(1)) // 1
 * toValue(() => 1) // 1
 * ```
 *
 * @param source - A getter, an existing ref, or a non-function value.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#tovalue}
 */
export declare function toValue<T>(source: MaybeRefOrGetter<T> | ComputedRef<T>): T;
/**
 * Returns a reactive proxy for the given object.
 *
 * If the object already is reactive, it's returned as-is. If not, a new
 * reactive proxy is created. Direct child properties that are refs are properly
 * handled, as well.
 *
 * @param objectWithRefs - Either an already-reactive object or a simple object
 * that contains refs.
 */
export declare function proxyRefs<T extends object>(objectWithRefs: T): ShallowUnwrapRef<T>;
export type CustomRefFactory<T> = (track: () => void, trigger: () => void) => {
    get: () => T;
    set: (value: T) => void;
};
/**
 * Creates a customized ref with explicit control over its dependency tracking
 * and updates triggering.
 *
 * @param factory - The function that receives the `track` and `trigger` callbacks.
 * @see {@link https://vuejs.org/api/reactivity-advanced.html#customref}
 */
export declare function customRef<T>(factory: CustomRefFactory<T>): Ref<T>;
export type ToRefs<T = any> = {
    [K in keyof T]: ToRef<T[K]>;
};
/**
 * Converts a reactive object to a plain object where each property of the
 * resulting object is a ref pointing to the corresponding property of the
 * original object. Each individual ref is created using {@link toRef()}.
 *
 * @param object - Reactive object to be made into an object of linked refs.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#torefs}
 */
export declare function toRefs<T extends object>(object: T): ToRefs<T>;
export type ToRef<T> = IfAny<T, Ref<T>, [T] extends [Ref] ? T : Ref<T>>;
/**
 * Used to normalize values / refs / getters into refs.
 *
 * @example
 * ```js
 * // returns existing refs as-is
 * toRef(existingRef)
 *
 * // creates a ref that calls the getter on .value access
 * toRef(() => props.foo)
 *
 * // creates normal refs from non-function values
 * // equivalent to ref(1)
 * toRef(1)
 * ```
 *
 * Can also be used to create a ref for a property on a source reactive object.
 * The created ref is synced with its source property: mutating the source
 * property will update the ref, and vice-versa.
 *
 * @example
 * ```js
 * const state = reactive({
 *   foo: 1,
 *   bar: 2
 * })
 *
 * const fooRef = toRef(state, 'foo')
 *
 * // mutating the ref updates the original
 * fooRef.value++
 * console.log(state.foo) // 2
 *
 * // mutating the original also updates the ref
 * state.foo++
 * console.log(fooRef.value) // 3
 * ```
 *
 * @param source - A getter, an existing ref, a non-function value, or a
 *                 reactive object to create a property ref from.
 * @param [key] - (optional) Name of the property in the reactive object.
 * @see {@link https://vuejs.org/api/reactivity-utilities.html#toref}
 */
export declare function toRef<T>(value: T): T extends () => infer R ? Readonly<Ref<R>> : T extends Ref ? T : Ref<UnwrapRef<T>>;
export declare function toRef<T extends object, K extends keyof T>(object: T, key: K): ToRef<T[K]>;
export declare function toRef<T extends object, K extends keyof T>(object: T, key: K, defaultValue: T[K]): ToRef<Exclude<T[K], undefined>>;
type BaseTypes = string | number | boolean;
/**
 * This is a special exported interface for other packages to declare
 * additional types that should bail out for ref unwrapping. For example
 * \@vue/runtime-dom can declare it like so in its d.ts:
 *
 * ``` ts
 * declare module '@vue/reactivity' {
 *   export interface RefUnwrapBailTypes {
 *     runtimeDOMBailTypes: Node | Window
 *   }
 * }
 * ```
 */
export interface RefUnwrapBailTypes {
}
export type ShallowUnwrapRef<T> = {
    [K in keyof T]: DistrubuteRef<T[K]>;
};
type DistrubuteRef<T> = T extends Ref<infer V> ? V : T;
export type UnwrapRef<T> = T extends ShallowRef<infer V> ? V : T extends Ref<infer V> ? UnwrapRefSimple<V> : UnwrapRefSimple<T>;
type UnwrapRefSimple<T> = T extends Function | BaseTypes | Ref | RefUnwrapBailTypes[keyof RefUnwrapBailTypes] | {
    [RawSymbol]?: true;
} ? T : T extends Map<infer K, infer V> ? Map<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Map<any, any>>> : T extends WeakMap<infer K, infer V> ? WeakMap<K, UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakMap<any, any>>> : T extends Set<infer V> ? Set<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof Set<any>>> : T extends WeakSet<infer V> ? WeakSet<UnwrapRefSimple<V>> & UnwrapRef<Omit<T, keyof WeakSet<any>>> : T extends ReadonlyArray<any> ? {
    [K in keyof T]: UnwrapRefSimple<T[K]>;
} : T extends object & {
    [ShallowReactiveMarker]?: never;
} ? {
    [P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
} : T;

export declare const ITERATE_KEY: unique symbol;
/**
 * Tracks access to a reactive property.
 *
 * This will check which effect is running at the moment and record it as dep
 * which records all effects that depend on the reactive property.
 *
 * @param target - Object holding the reactive property.
 * @param type - Defines the type of access to the reactive property.
 * @param key - Identifier of the reactive property to track.
 */
export declare function track(target: object, type: TrackOpTypes, key: unknown): void;
/**
 * Finds all deps associated with the target (or a specific property) and
 * triggers the effects stored within.
 *
 * @param target - The reactive object.
 * @param type - Defines the type of the operation that needs to trigger effects.
 * @param key - Can be used to target a specific reactive property in the target object.
 */
export declare function trigger(target: object, type: TriggerOpTypes, key?: unknown, newValue?: unknown, oldValue?: unknown, oldTarget?: Map<unknown, unknown> | Set<unknown>): void;

