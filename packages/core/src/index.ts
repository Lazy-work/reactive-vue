export { $bridge, createReactHook, usePlugin, type SetupComponent } from './management';

/**
 * @internal
 */
export * from './plugins/hook-manager'
/**
 * @internal
 */
export type * from './plugins/index.d.ts'

/**
 * @internal
 */
export type {
  DebuggerEvent,
  DebuggerEventExtraInfo,
  DebuggerOptions,
  EffectScheduler,
  ReactiveEffectOptions,
  ReactiveEffectRunner,
  Subscriber
} from '@vue-internals/reactivity/effect';

/**
 * @internal
 */
export type {
  SchedulerJob,
  SchedulerJobs,
} from '@vue-internals/runtime-core/scheduler';

/**
 * @internal
 */
export {
  ReactiveEffect,
  activeSub,
  resetTracking,
  pauseTracking,
  enableTracking,
  shouldTrack,
  startBatch,
  endBatch,
  stop,
  onEffectCleanup,
  refreshComputed,
  EffectFlags
} from '@vue-internals/reactivity/effect';

/**
 * @internal
 */
export {
  Dep,
  Link,
  track,
  trigger,
  getDepFromReactive,
  globalVersion,
  ARRAY_ITERATE_KEY,
  ITERATE_KEY,
  MAP_KEY_ITERATE_KEY
} from '@vue-internals/reactivity/dep';

/**
 * @internal
 */
export {
  queueJob,
  queuePostFlushCb,
  flushJobsUntil,
  flushPostJobsUntil,
  flushPreFlushCbs,
  flushPostFlushCbs,
  switchToAuto,
  switchToManual,
  toggleMode,
  getJobAt,
  nextTick,
  endFlush,
  SchedulerJobFlags,
} from '@vue-internals/runtime-core/scheduler';

/**
 * @internal
 */
export {
  withAsyncContext
} from '@vue-internals/runtime-core/apiSetupHelpers';

/**
 * @internal
 */
import {
  getCurrentInstance as getCurrentInstanceImpl,
  setCurrentInstance as setCurrentInstanceImpl
} from '@vue-internals/runtime-core/component';

import Context from './context';
export type ComponentInternalInstance = Context;
const getCurrentInstance: () => ComponentInternalInstance | null = getCurrentInstanceImpl as any;
const setCurrentInstance: (instance: ComponentInternalInstance) => () => void = setCurrentInstanceImpl as any;

/**
 * @internal
 */
export { getCurrentInstance, setCurrentInstance };

export * from './lifecycle';
export * from './conditional';
