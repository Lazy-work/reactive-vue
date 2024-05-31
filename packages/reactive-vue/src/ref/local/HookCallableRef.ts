import type Context from '../../context/local';
import LocalRef from './LocalRef';

class HookCallableRef<Parameters extends any[], ReturnType> extends LocalRef<any> {
  #hookIndex: number;
  #valueIndex: number;

  constructor(context: Context, hookIndex: number, valueIndex: number) {
    super(context);
    this.#hookIndex = hookIndex;
    this.#valueIndex = valueIndex;
  }

  call(...args: Parameters): ReturnType {
    const currentValue = this.context.getHookValueAt(this.#hookIndex, this.#valueIndex);
    
    this.track();
    
    return currentValue(...args);
  }

  get value(): any {
    throw new Error('Method not implemented.');
  }
  set value(newValue: any) {
    throw new Error('Method not implemented.');
  }
}

export default HookCallableRef;
