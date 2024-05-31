import { isArray, isIntegerKey, isMap, isSymbol } from '@vue/shared';
import { CONTEXT_KEY, NONE_EFFECT, type TrackOpTypes, TriggerOpTypes } from '../constants'
import AbstractEffect from '../effect/AbstractEffect';

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

let shouldTrack = true

type KeyToDepMap = Map<any, Set<AbstractEffect>>;
const targetMap = new WeakMap<object, KeyToDepMap>();

/**
 * Temporarily pauses tracking.
 */
export function pauseTracking() {
    shouldTrack = false
}

/**
 * Re-enables effect tracking (if it was paused).
 */
export function enableTracking() {
    shouldTrack = true
}


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
export function track(target: object, type: TrackOpTypes, key: unknown) {
    const context = target[CONTEXT_KEY];
    const currentEffect = context.currentEffect;
    if (shouldTrack && currentEffect) {
        let depsMap = targetMap.get(target)
        if (!depsMap) {
            targetMap.set(target, (depsMap = new Map()))
        }
        const dep = depsMap.get(key) ?? new Set();
        dep.add(currentEffect);
        depsMap.set(key, dep);
    }
}

function append(set1: Set<any>, set2: Iterable<any>) {
    for (const item of set2) {
        set1.add(item);
    }
}

/**
 * Finds all deps associated with the target (or a specific property) and
 * triggers the effects stored within.
 *
 * @param target - The reactive object.
 * @param type - Defines the type of the operation that needs to trigger effects.
 * @param key - Can be used to target a specific reactive property in the target object.
 */
export function trigger(
    target: object,
    type: TriggerOpTypes,
    key?: unknown,
    newValue?: unknown,
    oldValue?: unknown,
    oldTarget?: Map<unknown, unknown> | Set<unknown>,
) {
    const depsMap = targetMap.get(target)
    if (!depsMap) {
        // never been tracked
        return
    }

    const deps: Set<AbstractEffect> = new Set();
    if (type === TriggerOpTypes.CLEAR) {
        // collection being cleared
        // trigger all effects for target
        for (const set of depsMap.values()) {
            append(deps, set);
        }
    } else if (key === 'length' && isArray(target)) {
        const newLength = Number(newValue)
        depsMap.forEach((dep, key) => {
            if (key === 'length' || (!isSymbol(key) && key >= newLength)) {
                append(deps, dep);
            }
        })
    } else {
        let dep;
        // schedule runs for SET | ADD | DELETE
        if (key !== void 0) {
            dep = depsMap.get(key)
            if (dep) append(deps, dep);
        }

        // also run for iteration key on ADD | DELETE | Map.SET
        switch (type) {
            case TriggerOpTypes.ADD:
                if (!isArray(target)) {

                    dep = depsMap.get(ITERATE_KEY);
                    if (dep) append(deps, dep);
                    if (isMap(target)) {
                        dep = depsMap.get(MAP_KEY_ITERATE_KEY);
                        if (dep) append(deps, dep);
                    }
                } else if (isIntegerKey(key)) {
                    // new index added to array -> length changes
                    dep = depsMap.get('length');
                    if (dep) append(deps, dep);
                }
                break
            case TriggerOpTypes.DELETE:
                if (!isArray(target)) {
                    dep = depsMap.get(ITERATE_KEY)
                    if (dep) append(deps, dep);
                    if (isMap(target)) {
                        dep = depsMap.get(MAP_KEY_ITERATE_KEY)
                        if (dep) append(deps, dep);
                    }
                }
                break
            case TriggerOpTypes.SET:
                if (isMap(target)) {
                    dep = depsMap.get(ITERATE_KEY);
                    if (dep) append(deps, dep);
                }
                break
        }
    }
    const context = target[CONTEXT_KEY];

    const pendingEffects = new Set(deps);
    if (context.currentEffect) {
        pendingEffects.delete(context.currentEffect);
    }
    context.queueEffects(pendingEffects);
    context.triggerRendering?.();
}