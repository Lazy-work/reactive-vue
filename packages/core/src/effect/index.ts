import { EffectType, WatcherType } from "../context/local";
import { getContext } from "../management/setting";
import { WatchCallback, WatchOptions, WatchSource } from "../types";

export function watchEffect(callback: any, options?) {
    let stopHandle;
    if (!options || !options.flush || options.flush === 'pre') stopHandle = watchPreEffect(callback, options);
    if (options?.flush === 'post') stopHandle = watchPostEffect(callback, options);
    if (options?.flush === 'sync') stopHandle = watchSyncEffect(callback, options);

    return stopHandle;
}

export function watchPreEffect(callback, options?) {
    const context = getContext();
    const effect = context.createEffect(EffectType.PRE_EFFECT, callback, options);
    return () => effect.stop();
}

export function watchPostEffect(callback, options?) {
    const context = getContext();
    const effect = context.createEffect(EffectType.POST_EFFECT, callback, options);
    return () => effect.stop();
}

export function watchSyncEffect(callback, options?) {
    const context = getContext();
    const effect = context.createEffect(EffectType.SYNC_EFFECT, callback, options);
    return () => effect.stop();
}

export function watchLayoutEffect(callback, options?) {
    const context = getContext();
    const effect = context.createEffect(EffectType.LAYOUT_EFFECT, callback, options);
    return () => effect.stop();
}

export function watchInsertionEffect(callback, options?) {
    const context = getContext();
    const effect = context.createEffect(EffectType.INSERTION_EFFECT, callback, options);
    return () => effect.stop();
}

export function watch<T>(source: WatchSource<T>, callback: WatchCallback<T>, options?: WatchOptions) {
    let stopHandle;
    if (!options || !options.flush || options.flush === 'pre') stopHandle = createPreWatcher(source, callback, options);
    if (options?.flush === 'post') stopHandle = createPostWatcher(source, callback, options);
    if (options?.flush === 'sync') stopHandle = createSyncWatcher(source, callback, options);

    return stopHandle;
}

function createPreWatcher<T>(source: WatchSource<T>, callback: WatchCallback<T>, options?: WatchOptions) {
    const context = getContext();
    const watcher = context.createWatcher(WatcherType.PRE, callback, source, options);
    return () => watcher.stop();
}

function createPostWatcher<T>(source: WatchSource<T>, callback: WatchCallback<T>, options?: WatchOptions) {
    const context = getContext();
    const watcher = context.createWatcher(WatcherType.POST, callback, source, options);
    return () => watcher.stop();
}

function createSyncWatcher<T>(source: WatchSource<T>, callback: WatchCallback<T>, options?: WatchOptions) {
    const context = getContext();
    const watcher = context.createWatcher(WatcherType.SYNC, callback, source, options);
    return () => watcher.stop();
}

export function effectScope(detached = false) {
    const context = getContext();
    return context.createEffectScope(detached);
}

export { getCurrentScope, onScopeDispose } from "./EffectScope";