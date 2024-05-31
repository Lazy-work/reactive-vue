import { NOOP } from '@vue/shared';
import type Context from '../../context/local';
import { ReactiveFlags } from '../../constants';
import MemoEffect from '../../effect/MemoEffect';
import { warn } from '../../reactive/warning';
import LocalRef from './LocalRef';

type Setter<T> = (value?: T) => void;

class ComputedRef<T = any> extends LocalRef<T> {
  #index: number;
  #effect: MemoEffect<T>;
  #setter: Setter<T> = __DEV__
    ? () => {
      warn('Write operation failed: computed value is readonly')
    }
    : NOOP;
  [ReactiveFlags.IS_READONLY] = true;

  constructor(context: Context, index: number, effect: MemoEffect<T>, setter?: Setter<T>) {
    super(context)
    this.#index = index;
    this.#effect = effect;
    if (setter) {
      this[ReactiveFlags.IS_READONLY] = false;
      this.#setter = setter;
    }
  }

  hasDependencies() {
    return true;
  }

  get effect() {
    return this.#effect;
  }

  get value(): T {
    if (this.#effect.shouldCompute) {
      this.#effect.compute();
    }
    const currentValue = this.context.getValueAt(this.#index);

    this.track();

    return currentValue;
  }

  set value(newValue: T) {
    this.#setter(newValue);
  }
}

export default ComputedRef;
