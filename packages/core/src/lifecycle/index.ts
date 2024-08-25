import { LifecycleType } from "../context/local";
import { getContext } from '../management/setting';

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