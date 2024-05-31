import { Destructor } from '../types';
import BaseEffect from './AbstractEffect';
import type { WatchCallback, WatchOptions, WatchSource } from '../types';
import type IContext from '../context/IContext';
import { toValue } from '../ref';
import { isObject } from '@vue/shared';
import { isProxy } from '../reactive';

class WatcherEffect<T> extends BaseEffect {
  #callback: WatchCallback<T>;
  #cleanup: (() => void) | undefined;
  #source: WatchSource<T>;
  #options: WatchOptions | undefined;
  #depsValue: any[];
  #previousState: any[];
  #executed: boolean;

  constructor(
    id: number,
    context: IContext,
    callback: WatchCallback<T>,
    source: WatchSource<T>,
    options?: WatchOptions,
  ) {
    super(id, context);
    this.#callback = callback;
    this.#cleanup = undefined;
    this.#source = source;
    this.#options = options;
    this.#depsValue = [];
    this.#previousState = [];
    this.#executed = false;
  }

  get id() {
    return this._id;
  }


  getPreviousState() {
    if (this.#previousState.length === 0) {
      return null;
    }

    if (this.#previousState.length === 1) {
      return this.#previousState[0];
    }

    return this.#previousState;
  }

  compareState(previousState: any[], currentState: any[]) {
    for (let i = 0; i < previousState.length; i++) {
      if (previousState[i] !== currentState[i]) {
        return false;
      }
    }
    return true;
  }

  get cleanup() {
    return this.#cleanup;
  }

  run() {
    let value: any;
    if (Array.isArray(this.#source)) {
      value = this.#source.map((source) => toValue(source));
    } else {
      value = toValue(this.#source);
    }

    let cleanup: any;
    const getCleanup = (callback: Destructor) => {
      cleanup = callback;
    };      
    if (!this.#executed) this.#cleanup?.();
    this.#callback(value, this.getPreviousState(), getCleanup);
    this.#cleanup = cleanup;
  }

  shouldRun(): void {
    let haveToRun = false;

    if (!this.#depsValue.length) {
      if (Array.isArray(this.#source)) {
        for (let i = 0; i < this.#source.length; i++) {
          if (isProxy(this.#depsValue[i])) this.#options.deep = true; 
          this.#depsValue[i] = toValue(this.#source[i]);
        }
      } else {
        if (isProxy(this.#depsValue[0])) this.#options.deep = true; 
        this.#depsValue[0] = toValue(this.#source);
      }
    }

    // check if the state has changed
    if (Array.isArray(this.#source)) {
      for (let i = 0; i < this.#source.length; i++) {
        const sourceValue = toValue(this.#source[i]);
        if (this.#options.deep &&  this.#depsValue[i] !== sourceValue) {
          haveToRun = true;
          this.#depsValue[i] = sourceValue;
        }
      }
    } else {
      const sourceValue = toValue(this.#source);
      if (this.#depsValue[0] !== sourceValue) {
        haveToRun = true;
        this.#depsValue[0] = sourceValue;
      }
    }

    const isFirstRun = this.#previousState.length === 0 || this.compareState(this.#previousState, this.#depsValue);
    const hasRunOnce = this.#executed;

    if (!haveToRun && !isFirstRun) return;

    const notImmediate = !this.#options?.immediate && isFirstRun;
    // if (!this.options?.immediate && isFirstRun) return;
    if (!notImmediate && (!this.#options?.once || isFirstRun || !hasRunOnce)) {
      this.run();
      this.#executed = true;
    }

    for (let i = 0; i < this.#depsValue.length; i++) {
      this.#previousState[i] = this.#depsValue[i];
    }
  }
}

export default WatcherEffect;
