import Context from "../context/local";
import AbstractEffect from "../effect/AbstractEffect";
import { warn } from "../reactive/warning";

abstract class Ref<T> {
    public readonly __v_isRef = true;

    addEffect(effects: number[], newEffect: AbstractEffect) {
        const effectId = newEffect.id;
        const slot = Math.floor(effectId / 32);
        const digit = 1 << (effectId % 32);

        effects[slot] |= digit;
        return effects;
    }

    queueEffects(context: Context, effects: number[], force = false) {
        context.queuePendingEffects(effects, force);
    }

    toReadonly() {
        const self = this;
        return {
            __v_isRef: true,
            get value() {
                return self.value
            },
            set value(newValue: T) {
                if (__DEV__) {
                warn(
                  `Set operation on key "value" failed: target is readonly.`,
                  self,
                )
              }
            }
        }
    }
    abstract get value(): T;
    abstract set value(newValue: T);
    abstract track(): void;
    abstract trigger(newValue?: T, force?: boolean): void;
}

export default Ref;