import type Context from '../../context/local';
import LocalRef from './LocalRef';

class HookRef<T = any> extends LocalRef<T> {
  #hookIndex: number;
  #valueIndex: number;

  constructor(context: Context, hookIndex: number, valueIndex: number) {
    super(context);
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  get value(): T {
    const currentValue = this.context.getHookValueAt(this.#hookIndex, this.#valueIndex);

    this.track()

    return currentValue;
  }

  toReadonly(): HookRef<T> {
    return this;
  }
}

export default HookRef;
