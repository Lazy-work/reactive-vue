import { isArray, isIntegerKey, isMap, isSymbol } from '@vue/shared';
import { type TrackOpTypes, TriggerOpTypes } from '../constants'
import AbstractEffect from '../effect/AbstractEffect';
import { contextListMap, triggerListeners } from '.';
import IContext from '../context/IContext';
import { getContext } from '../management/setting';

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

let shouldTrack = true

type KeyToDepMap = Map<any, WeakMap<IContext, number[]>>;
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

function addEffect(effects: number[], newEffect: AbstractEffect) {
    const effectId = newEffect.id;
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);

    effects[slot] |= digit;
    return effects;
}

function removeEffect(effects: number[], toRemove: AbstractEffect) {
    const effectId = toRemove.id;
    const slot = Math.floor(effectId / 32);
    const digit = 1 << (effectId % 32);
    effects[slot] &= ~digit;
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
    const context = getContext();
    if (shouldTrack && context.currentEffect) {
        let map = contextListMap.get(target);
        let contextList = map?.get(key);
        const contextAlreadyTracked = !!contextList?.includes(context);

        if (!map) contextListMap.set(target, map = new Map());
        if (!contextList) map.set(key, contextList = []);
        if (!contextAlreadyTracked) contextList.push(context);

        let keyToDepMap = targetMap.get(target);
        let depsMap = keyToDepMap?.get(key);
        let effects = depsMap?.get(context);

        if (!keyToDepMap) targetMap.set(target, keyToDepMap = new Map());
        if (!depsMap) keyToDepMap.set(key, depsMap = new WeakMap());
        if (!effects) {
            if (context !== globalThis.__v_globalContext) depsMap.set(context, effects = [1])
            else depsMap.set(context, effects = [])
        };


        addEffect(effects, context.currentEffect);
        if (__DEV__) {
            context.currentEffect.onTrack?.({
                effect: context.currentEffect,
                target,
                type,
                key,
            });
        }
    }
}

function append(set1: number[], set2: number[]) {
    for (let i = 0; i < set2.length; i++) {
        set1[i] |= set2[i];
    }
}

function appendKey(target: object, key: unknown, keyDeps: WeakMap<IContext, number[]>, deps: Map<IContext, number[]>) {
    const contexts = contextListMap.get(target)?.get(key);
    if (!contexts) return;
    for (const context of contexts) {
        const list = keyDeps.get(context) ?? [];
        let result = deps.get(context);
        if (!result) {
            result = [];
            deps.set(context, result);
        }
        append(result, list);
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
    global: boolean = false
) {
    if (global) {
        globalThis.__v_globalContext.notifyChange();
    }
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        // never been tracked
        return
    }

    let deps: Map<IContext, number[]> = new Map();
    if (type === TriggerOpTypes.CLEAR) {
        // collection being cleared
        // trigger all effects for target
        for (const [key, keyDeps] of depsMap) {
            appendKey(target, key, keyDeps, deps);
        }
    } else if (key === 'length' && isArray(target)) {
        const newLength = Number(newValue)
        depsMap.forEach((dep, key) => {
            if (key === 'length' || (!isSymbol(key) && key >= newLength)) {
                appendKey(target, key, dep, deps);
            }
        })
    } else {
        let dep;
        // schedule runs for SET | ADD | DELETE
        if (key !== void 0) {
            dep = depsMap.get(key)
            if (dep) appendKey(target, key, dep, deps);
        }

        // also run for iteration key on ADD | DELETE | Map.SET
        switch (type) {
            case TriggerOpTypes.ADD:
                if (!isArray(target)) {

                    dep = depsMap.get(ITERATE_KEY);
                    if (dep) appendKey(target, ITERATE_KEY, dep, deps);
                    if (isMap(target)) {
                        dep = depsMap.get(MAP_KEY_ITERATE_KEY);
                        if (dep) appendKey(target, MAP_KEY_ITERATE_KEY, dep, deps);
                    }
                } else if (isIntegerKey(key)) {
                    // new index added to array -> length changes
                    dep = depsMap.get('length');
                    if (dep) appendKey(target, 'length', dep, deps);
                }
                break
            case TriggerOpTypes.DELETE:
                if (!isArray(target)) {
                    dep = depsMap.get(ITERATE_KEY)
                    // if (dep) append(deps, dep);
                    if (dep) appendKey(target, ITERATE_KEY, dep, deps);
                    if (isMap(target)) {
                        dep = depsMap.get(MAP_KEY_ITERATE_KEY)
                        if (dep) appendKey(target, MAP_KEY_ITERATE_KEY, dep, deps);
                    }
                }
                break
            case TriggerOpTypes.SET:
                if (isMap(target)) {
                    dep = depsMap.get(ITERATE_KEY);
                    if (dep) appendKey(target, ITERATE_KEY, dep, deps);
                }
                break
        }
    }

    for (const [context, contextDeps] of deps) {
        const pendingEffects = [...contextDeps];
        if (context.currentEffect) {
            removeEffect(pendingEffects, context.currentEffect);
        }
        context.queuePendingEffects(pendingEffects);
        triggerListeners(target, key, newValue, oldValue);
    }
}