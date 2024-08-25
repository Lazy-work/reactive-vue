import ExtensibleFunction from './ref/local/ExtensibleFunction';
class ReactRef<T> extends ExtensibleFunction<[T], void> {
  #value: { current: T };

  constructor() {
    super();
  }

  get value(): T {
    const ref = this.#value;
    return ref.current;
  }

  set value(newValue: T) {
    const ref = this.#value;
    ref.current = newValue;
  }

  __call__(value: T): void {
    const ref = this.#value;
    ref.current = value;
  }
}

export default ReactRef;
