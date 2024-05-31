import { RENDER_EFFECT, TrackOpTypes } from "../../constants";
import type Context from "../../context/local";
import Ref from "../Ref";

abstract class LocalRef<T> extends Ref<T> {
    protected effects: number[];
    protected context: Context

    constructor(context: Context) {
        super()
        this.context = context;
        this.effects = [1];
    }

    track(): void {
        const currentEffect = this.context.currentEffect;
        if (currentEffect && currentEffect.id !== RENDER_EFFECT) {
            this.addEffect(this.effects, currentEffect)
            if (__DEV__) {
                currentEffect.onTrack?.({
                    effect: currentEffect,
                    target: this,
                    type: TrackOpTypes.GET,
                    key: 'value',
                });
            }
        }
    }

    trigger(_?: T, force?: boolean) {
        this.queueEffects(this.context, this.effects, force);
    }
}

export default LocalRef;