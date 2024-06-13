import Effect from "./effect/Effect";
import MemoEffect from "./effect/MemoEffect";
import WatcherEffect from "./effect/WatcherEffect";

export type Ref<T> = {
  value: T
}

export type ReadOnlyRef<T> = {
  readonly value: T
}

export type WatchSource<T> =
  | Ref<T> // ref
  | (() => T) // getter
  | T extends object
  ? T
  : never; // reactive object

export type WatchCallback<T> = (value: T, oldValue: T, onCleanup: (cleanupFn: () => void) => void) => void;

export interface WatchEffectOptions {
  flush?: 'pre' | 'post' | 'sync';
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface WatchOptions extends WatchEffectOptions {
  immediate?: boolean; // default: false
  deep?: boolean // default: false
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  once?: boolean; // default: false (3.4+)
}

export enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate',
}

export enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear',
}

type ReactiveEffect = Effect | MemoEffect | WatcherEffect;

export type DebuggerEvent = {
    effect: ReactiveEffect
  } & DebuggerEventExtraInfo;

export type DebuggerEventExtraInfo = {
  target: object;
  type: TrackOpTypes | TriggerOpTypes;
  key: any;
  newValue?: any;
  oldValue?: any;
  oldTarget?: Map<any, any> | Set<any>;
};

export type ReactHook = (...args: any[]) => any;

export type Destructor = () => void;
export interface toDirectiveOptions {
  shallow?: boolean;
}


export type ToSignals<T extends object> = { [P in keyof T]: T[P] extends Function ? T[P] : ReadOnlyRef<T[P]> };
export type ToSignal<T> = T extends Function ? T : ReadOnlyRef<T>;
