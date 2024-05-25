import { getGlobalContext } from '../../management/setting';
import { getContext } from '../../management/setting';
import GlobalRef from './GlobalRef';

type Setter<T> = (value: T) => void;


class WritableRef<T = any> extends GlobalRef<T> {

  constructor(protected index: number, private _setter: Setter<T>,
    public readonly __v_isShallow: boolean) {
      super()
  }

  subscribe(listener: any) {
    this.listeners = [...this.listeners, listener];
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  get value(): T {
    const globalManager = getGlobalContext();
    const currentValue = globalManager.getValueAt(this.index);

    this.track()

    return currentValue;
  }

  set value(newValue: T) {
    const manager = getContext();
    const globalManager = getGlobalContext();
    if (manager.runningOnUpdated) {
      throw new Error('You cannot mutate a state in an onUpdated effect');
    }

    if (!Object.is(newValue, globalManager.getValueAt(this.index))) {
      this._setter(newValue);
      this.trigger(newValue);
    }
  }
}

export default WritableRef;
