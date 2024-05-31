import WritableRef from './WritableRef';
import type Context from '../../context/local';

class ReadableRef<T> extends WritableRef<T> {
  constructor(context: Context, index: number, shallow: boolean) {
    super(context, index, () => void 0, shallow);
  }

  get value(): T {
    return super.value;
  }

  set value(_: T) {
    throw new Error('You can\'t mutate this signal');
  }
}

export default ReadableRef;
