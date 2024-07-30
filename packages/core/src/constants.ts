export const NONE_EFFECT = -1;
export const RENDER_EFFECT = 0;

export enum DirtyLevels {
  NotDirty = 0,
  QueryingDirty = 1,
  MaybeDirty_ComputedSideEffect = 2,
  MaybeDirty = 3,
  Dirty = 4,
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

export enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw',
}
export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')
export const IS_GLOBAL_KEY = Symbol('__v_isGlobal');
export const INITIAL_CONTEXT_KEY = Symbol('__v_initialContext');
export const CONTEXT_KEY = Symbol('__v_context');
export const SUBSCRIBE_KEY = Symbol('__v_subscribe');
export const LISTENER_LIST_KEY = Symbol('__v_listenerList');