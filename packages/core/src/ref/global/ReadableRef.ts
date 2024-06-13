import WritableRef from './WritableRef';

class ReadableRef<T> extends WritableRef<T> {
  constructor(index: number, shallow: boolean) {
    super(index, () => void 0, shallow);
  }

  subscribe(listener: any): () => void {
    return super.subscribe(listener);
  }

  get value(): T {
    return super.value;
  }

  set value(_: T) {
    throw new Error('Read only state');
  }
}

export default ReadableRef;
