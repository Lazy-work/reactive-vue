import { mustBeOutsideComponent } from '../../utils';
import ReactRef from '../../ReactRef';

class GlobalContext {
  #provider: Map<any, any> = new Map();

  #executed: boolean = false;

  isExecuted() {
    return this.#executed;
  }

  executed(): void {
    this.#executed = true;
  }

  createRef<T>(initialValue: T | null) {
    mustBeOutsideComponent();
    const ref = { current: initialValue };

    const index = this.addToStore(ref);

    return new ReactRef<T | null>(this, index);
  }
  getParent() {
    return undefined;
  }

  provide(key: any, value: any): void {
    this.#provider.set(key, value);
  }
  inject(key: any) {
    return this.#provider.get(key);
  }
}

globalThis.__v_globalContext = new GlobalContext();

export default GlobalContext;