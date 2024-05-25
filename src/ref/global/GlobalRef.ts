import Ref from "../Ref";
import { getContext } from '../../management/setting';
import AbstractEffect from "../../effect/AbstractEffect";
import type IContext from "../../context/IContext";
import { isReactComponent } from "../../utils";
import { useSyncExternalStore } from "react";
import { TrackOpTypes } from "../../constants";

abstract class GlobalRef<T> extends Ref<T> {
    protected effects: Map<IContext, number[]>;
    protected listeners: any[];

    constructor() {
        super()
        this.effects = new Map();
        this.listeners = []
    }

    subscribe(listener: any) {
        this.listeners = [...this.listeners, listener];
        return () => {
            this.listeners = this.listeners.filter((l) => l !== listener);
        };
    }

    track(): void {
        const context = getContext();
        if (context.currentEffect) {
            if (!this.effects.has(context)) {
                this.effects.set(context, []);
            }
            const effects = this.effects.get(context);
            this.addEffect(effects, context.currentEffect);
            if (__DEV__) {
                context.currentEffect.onTrack?.({
                    effect: context.currentEffect,
                    target: this,
                    type: TrackOpTypes.GET,
                    key: 'value',
                });
            }
        }
    }

    removeEffect(effects: number[], toRemove: AbstractEffect) {
        const effectId = toRemove.id;
        const slot = Math.floor(effectId / 32);
        const digit = 1 << (effectId % 32);
        effects[slot] &= ~digit;
    }

    trigger(newValue?: T, force?: boolean) {
        globalThis.__v_globalContext.notifyChange();
        for (const [context, effects] of this.effects) {
            const pendingEffects = [...effects];
            if (context.currentEffect) {
                this.removeEffect(pendingEffects, context.currentEffect)
            }
            context.queuePendingEffects(pendingEffects, force);
        }
        for (const listener of this.listeners) {
            listener(newValue);
        }
    }
}

export default GlobalRef;