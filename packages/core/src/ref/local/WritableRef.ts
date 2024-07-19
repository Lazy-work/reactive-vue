import type Context from '../../context/local';
import LocalRef from './LocalRef';

type Setter<T> = (value: T) => void;

class WritableRef<T = any> extends LocalRef<T> {
  protected index: number;
  #setter: Setter<T>;

  constructor(context: Context, index: number, setter: Setter<T>,
    public readonly __v_isShallow: boolean) {
    super(context);
    this.index = index;
    this.#setter = setter;
  }

  get value(): T {
    const currentValue = this.context.getValueAt(this.index);

    this.track();

    return currentValue;
  }

  set value(newValue: T) {
    if (!Object.is(newValue, this.context.getValueAt(this.index))) {
      this.#setter(newValue);
      this.trigger();
    }
  }
}

export default WritableRef;
