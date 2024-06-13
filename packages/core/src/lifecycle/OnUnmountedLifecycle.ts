import IContext from '../context/IContext';
import ILifecycle from './Lifecycle';

class OnUnmountedLifecycle implements ILifecycle {
  #id: number;
  #context: IContext;
  #callback: any;
  #executed: boolean;

  constructor(id: number, context: IContext, callback: any) {
    this.#id = id;
    this.#context = context;
    this.#callback = callback;
    this.#executed = false;
  }

  get id() {
    return this.#id;
  }

  run() {
    if (!this.#executed) {
      this.#callback();
      this.#executed = true;
    }
  }
}

export default OnUnmountedLifecycle;
