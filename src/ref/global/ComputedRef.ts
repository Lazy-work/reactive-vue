import MemoEffect from '../../effect/MemoEffect';
import { getGlobalContext } from '../../management/setting';
import { ReactiveFlags } from '../../constants';
import { NOOP } from '@vue/shared';
import { warn } from '../../reactive/warning';
import GlobalRef from './GlobalRef';

class ComputedRef<T = any> extends GlobalRef<T> {
  private _setter? = __DEV__
    ? () => {
      warn('Write operation failed: computed value is readonly')
    }
    : NOOP;
  [ReactiveFlags.IS_READONLY] = true;

  constructor(private _index: number, private _effect: MemoEffect<T>, setter?) {
    super()
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
    const globalContext = getGlobalContext();
    const currentValue = globalContext.getValueAt(this._index);

    this.track()

    return currentValue;
  }


  set value(newValue: T) {
    this._setter(newValue);
  }
  4
  toReadonly(): ComputedRef<T> {
    const self = this;
    return {
      __v_isRef: true,
      get value() {
        return self.value;
      },
      set value(newVal) {
        warn('Write operation failed: computed value is readonly')
      }
    };
  }
}

export default ComputedRef;
