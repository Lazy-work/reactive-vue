
import AbstractEffect from "../effect/AbstractEffect"
import Effect from "../effect/Effect"
import EffectScope from "../effect/EffectScope";
import WatcherEffect from "../effect/WatcherEffect";
import { WatchEffectOptions, WatchOptions, WatchSource } from "../types";
import { EffectType, LifecycleType, WatcherType } from "./local"

interface IContext {
    getParent(): IContext | undefined;
    provide(key: any, value: any): void;
    inject(key: any): any;

    getValueAt(index: number): any

    addToStore(value: any): number
    get runningOnUpdated(): boolean

    runOnUpdated(): void
    endOnUpdated(): void
    setStoreValueAt(index: number, value: any): void

    get currentEffect(): AbstractEffect | undefined
    set currentEffect(effect: AbstractEffect | undefined)

    isExecuted(): boolean
    executed(): void

    getStoreNextIndex(): number

    track(effect: AbstractEffect, callback: any, parentEffect?: AbstractEffect): any
    scopeTrack(scope: EffectScope, fn: any, parentScope?: EffectScope): any
    
    queueEffects(effects: Set<AbstractEffect>, force: boolean): void

    queueEffect(effect: AbstractEffect, force: boolean): void

    queuePendingEffects(pendingEffects: number[], force?: boolean): void

    disableEffect(effect: AbstractEffect): void

    enableEffect(effect: AbstractEffect): void

    get disabledEffects(): number[]
    createMemoEffect(getterOrOptions: any): AbstractEffect
    createLifecycleHook(type: LifecycleType, callback: any): void
    createEffect(type: EffectType, callback: any, options: WatchEffectOptions): Effect
    createWatcher<T>(type: WatcherType, callback: any, source: WatchSource<T>, options: WatchOptions): WatcherEffect<T>
    createEffectScope(detached?: boolean): EffectScope;
}

export default IContext;