import ExtensibleFunction from './ref/local/ExtensibleFunction';
import type IContext from './context/IContext';

class ReactRef<T> extends ExtensibleFunction<[T], void> {
  #context: IContext;
  #index: number;

  constructor(context: IContext, index: number) {
    super();
    this.#context = context;
    this.#index = index;
  }

  get value(): T {
    const ref = this.#context.getValueAt(this.#index);
    return ref.current;
  }

  set value(newValue: T) {
    const ref = this.#context.getValueAt(this.#index);
    ref.current = newValue;
  }

  __call__(value: T): void {
    const ref = this.#context.getValueAt(this.#index);
    ref.current = value;
  }
}

export default ReactRef;
