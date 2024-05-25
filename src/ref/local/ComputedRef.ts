import { NOOP } from '@vue/shared';
import type Context from '../../context/local';
import { ReactiveFlags } from '../../constants';
import MemoEffect from '../../effect/MemoEffect';
import { warn } from '../../reactive/warning';
import LocalRef from './LocalRef';

type Setter<T> = (value?: T) => void;

class ComputedRef<T = any> extends LocalRef<T> {
  private _index: number;
  private _effect: MemoEffect<T>;
  private _setter: Setter<T> = __DEV__
    ? () => {
      warn('Write operation failed: computed value is readonly')
    }
    : NOOP;
  [ReactiveFlags.IS_READONLY] = true;

  constructor(context: Context, index: number, effect: MemoEffect<T>, setter?) {
    super(context)
    this._index = index;
    this._effect = effect;
    if (setter) {
      this[ReactiveFlags.IS_READONLY] = false;
      this._setter = setter;
    }
  }

  get effect() {
    return this._effect;
  }

  get value(): T {
    if (this._effect.shouldCompute) {
      this._effect.compute();
    }
    const currentValue = this.context.getValueAt(this._index);

    this.track();

    return currentValue;
  }

  set value(newValue: T) {
    this._setter(newValue);
  }
}

export default ComputedRef;
