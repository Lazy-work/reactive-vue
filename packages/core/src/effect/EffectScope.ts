import IContext from "../context/IContext";
import { warn } from "../reactive/warning";
import type Effect from "./Effect";
import type MemoEffect from "./MemoEffect";
import type WatcherEffect from "./WatcherEffect";

type EffectType = MemoEffect<any> | WatcherEffect<any> | Effect;

let currentScope: EffectScope | undefined = undefined;

export function getCurrentScope() {
    return currentScope;
}

export function setCurrentScope(scope?: EffectScope) {
    currentScope = scope;
}

export function onScopeDispose(fn: () => void) {
    if (!currentScope) {
        if (__DEV__) {
            warn(
                `onScopeDispose() is called when there is no active effect scope to be associated with.`,
            )
        }
        return;
    }

    currentScope.addOnDispose(fn);
}

class EffectScope {
    #effects: EffectType[] = [];
    #scopes: EffectScope[] = [];
    #context: IContext;
    #parent: EffectScope | undefined = currentScope;
    #active: boolean = true;
    #detached: boolean = false;
    #onDispose: (() => void)[] = [];

    constructor(context: IContext, detached: boolean = false) {
        this.#context = context;
        this.#detached = detached;
        if (currentScope && !this.#detached) {
            currentScope.addScope(this);
        }
    }

    get effects() {
        return this.#effects;
    }

    get scopes() {
        return this.#scopes;
    }

    get active() {
        return this.#active;
    }

    addEffect(effect: EffectType) {
        this.#effects.push(effect);
    }
    addScope(scope: EffectScope) {
        this.#scopes.push(scope);
    }

    addOnDispose(fn: () => void) {
        this.#onDispose.push(fn);
    }

    run<T>(fn: () => T): T | undefined {
        if (!this.#active) {
            if (__DEV__) {
                warn(
                    `cannot run an inactive effect scope.`,
                )
            }
            return;
        }
        const result = this.#context.scopeTrack(this, fn, currentScope);

        return result;
    }

    removeScope(scope: EffectScope) {
        const index = this.#scopes.indexOf(scope);
        if (index > -1) {
            this.#scopes.splice(index, 1);
        }
    }

    on() {
        currentScope = this
    }

    off() {
        currentScope = this.#parent
    }

    restart() {
        this.#active = true;
        for (const effect of this.#effects) effect.run();
        for (const scope of this.#scopes) scope.restart();
    }
    stop() {
        this.#effects.forEach(effect => {
            effect.stop();
        });
        this.#scopes.forEach(scope => {
            scope.stop();
        });
        this.#onDispose.forEach(fn => fn());
        this.#active = false;
        if (this.#parent) {
            this.#parent.removeScope(this);
        }
    }
}

export default EffectScope;