import { LifecycleType } from "../context/local";
import { getContext } from '../management/setting';

const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>
let currentFlushPromise: Promise<void> | null = null

export function nextTick<T = void, R = void>(
    this: T,
    fn?: (this: T) => R,
): Promise<Awaited<R>> {
    const p = currentFlushPromise || resolvedPromise
    return fn ? p.then(this ? fn.bind(this) : fn) : p
}

export function queueFlush() {
    let resolve;
    currentFlushPromise = new Promise((res) => { resolve = res }).then(flushJobs);
    return resolve;
}

function flushJobs() {
    currentFlushPromise = null
}

export function hasInjectionContext() {
    return !!getContext();
}

export function onUpdated(callback: () => void) {
    const context = getContext();
    context.createLifecycleHook(LifecycleType.ON_UPDATED, callback);
}
export function onBeforeUpdate(callback: () => void) {
    const context = getContext();
    context.createLifecycleHook(LifecycleType.ON_BEFORE_UPDATE, callback);
}

export function onBeforeMount(callback: () => void) {
    const context = getContext();
    context.createLifecycleHook(LifecycleType.ON_BEFORE_MOUNT, callback);
}

export function onMounted(callback: () => void) {
    const context = getContext();
    context.createLifecycleHook(LifecycleType.ON_MOUNTED, callback);
}

export function onBeforeUnmount(callback: () => void) {
    throw new Error('Not implemented yet');
}

export function onUnmounted(callback: () => void) {
    const context = getContext();
    context.createLifecycleHook(LifecycleType.ON_UNMOUNTED, callback);
}