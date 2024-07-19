import { setContext, undoContext } from '../management/setting';
import IContext from '../context/IContext';
import ILifecycle from './Lifecycle';

class OnUpdatedLifecycle implements ILifecycle {
  #id: number;
  #context: IContext;
  #callback: any;

  constructor(id: number, context: IContext, callback: any) {
    this.#id = id;
    this.#context = context;
    this.#callback = callback;
  }

  get id() {
    return this.#id;
  }

  run() {
    setContext(this.#context);
    this.#callback();
    if (this.#context.isExecuted()) undoContext();
  }
}

export default OnUpdatedLifecycle;
