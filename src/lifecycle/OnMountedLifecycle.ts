import type IContext from '../context/IContext';
import { setContext, undoContext } from '../management/setting';
import ILifecycle from './Lifecycle';

class OnMountedLifecycle implements ILifecycle {
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
      setContext(this.#context);
      this.#callback();
      this.#executed = true;
      undoContext();
    }
  }
}

export default OnMountedLifecycle;
