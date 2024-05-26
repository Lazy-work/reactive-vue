import { Destructor } from '../types';
import AbstractEffect from './AbstractEffect';
import type { WatchCallback, WatchOptions, WatchSource } from '../types';
import type IContext from '../context/IContext';
import { isRef, toValue } from '../ref';
import { isArray, isMap, isObject, isPlainObject, isSet } from '@vue/shared';
import { isReactive } from '../reactive';
import { ReactiveFlags } from '../constants';

export function traverse(
  value: unknown,
  depth?: number,
  currentDepth = 0,
  seen?: Set<unknown>,
) {
  if (!isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value
  }

  if (depth && depth > 0) {
    if (currentDepth >= depth) {
      return value
    }
    currentDepth++
  }

  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  if (isRef(value)) {
    traverse(value.value, depth, currentDepth, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], depth, currentDepth, seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, depth, currentDepth, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], depth, currentDepth, seen)
    }
  }
  return value
}


class WatcherEffect<T> extends AbstractEffect {
  #callback: WatchCallback<T>;
  #cleanup: (() => void) | undefined = undefined;
  #source: WatchSource<T>;
  #options: WatchOptions;
  #depsValue: any[] = [];
  #previousState: any[] = [];
  #executed = false;
  #force = false;

  constructor(
    id: number,
    context: IContext,
    callback: WatchCallback<T>,
    source: WatchSource<T>,
    options: WatchOptions = {},
  ) {
    super(id, context, options.onTrack, options.onTrigger);
    this.#callback = callback;
    this.#source = source;
    this.#options = options;
  }

  get id() {
    return this._id;
  }

  get onTrack() {
    return this._onTrack;
  }

  get onTrigger() {
    return this._onTrigger;
  }

  getPreviousState() {
    if (this.#previousState.length === 0) {
      if (Array.isArray(this.#source) && !isReactive(this.#source)) {
        return Array.from({ length: this.#source.length }, () => undefined);
      }
      return undefined;
    }

    if (this.#previousState.length === 1 && (!Array.isArray(this.#source) || isReactive(this.#source))) {
      return this.#previousState[0];
    }

    return this.#previousState;
  }

  force() {
    this.#force = true;
  }


  get cleanup() {
    return this.#cleanup;
  }

  run() {
    const hasChanged = this.checkDeps();
    const immediate = this.#options?.immediate && !this.#executed;
    if (hasChanged || immediate || this.#force) {
      this.execute();
    }
    this.#force = false;
  }

  execute() {
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

    if (this.#executed) this.#cleanup?.();
    this.#callback(value, this.getPreviousState(), getCleanup);
    this.#cleanup = cleanup;

    if (this.#options?.once) {
      this._context.disableEffect(this);
    }

    this.#executed = true;
  }

  subscribeToDeps() {
    this._context.track(this, () => {
      const sources = Array.isArray(this.#source) && !isReactive(this.#source) ? this.#source : [this.#source];

      for (let i = 0; i < sources.length; i++) {
        const value = toValue(sources[i]);
        if (isReactive(value)) {
          if (typeof this.#options.deep === 'undefined') this.#options.deep = true;
          if (this.#options.deep) traverse(value);
          else traverse(value, 1);
        }
        this.#depsValue[i] = value;
      }
    });
  }

  checkDeps() {
    let hadChanged = false;
    const sources = Array.isArray(this.#source) && !isReactive(this.#source) ? this.#source : [this.#source];

    for (let i = 0; i < sources.length; i++) {
      const sourceValue = toValue(sources[i]);

      if (sourceValue !== this.#depsValue[i] || isReactive(sourceValue)) {
        this.#previousState[i] = this.#depsValue[i];
        this.#depsValue[i] = sourceValue;
        hadChanged = true;
      }

    }

    return hadChanged;
  }

  stop() {
    this.#cleanup?.();
    this._context.disableEffect(this);
  }
}

export default WatcherEffect;
