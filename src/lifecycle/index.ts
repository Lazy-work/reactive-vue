import { LifecycleType } from "../context/local";
import { getContext } from '../management/setting';

const NOOP = () => {};
let tickTrigger: (value?: unknown) => void = NOOP;
let currentTick = new Promise((resolve) => (tickTrigger = resolve));

function createNextTick() {
    let resolve: (value?: unknown) => void = NOOP;
    currentTick = new Promise((r) => (resolve = r));
    return resolve;
}
export function nextTick() {
    return currentTick;
}

export function tick() {
    tickTrigger();
    tickTrigger = createNextTick();
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