import AbstractEffect from './AbstractEffect';
import ComponentComputedRef from '../ref/local/ComputedRef';
import GlobalComputedRef from '../ref/global/ComputedRef';
import IContext from '../context/IContext';
import { DebuggerEvent } from '../types';

type ComputedRef<T> = ComponentComputedRef<T> | GlobalComputedRef<T>;

class MemoEffect<T> extends AbstractEffect {
  #storeIndex: number;
  #getter: (oldValue: T | null) => T;
  #ref?: ComputedRef<T>;
  #previousState: T | null;
  #shouldCompute = true;
  #onTrack?: (event: DebuggerEvent) => void;
  #onTrigger?: (event: DebuggerEvent) => void;
  #hadChanged = true;

  constructor(
    id: number,
    context: IContext,
    getter: (oldValue: T | null) => T,
    storeIndex: number,
    ref?: ComputedRef<T>,
    onTrack?: (event: DebuggerEvent) => void,
    onTrigger?: (event: DebuggerEvent) => void,
  ) {
    super(id, context);
    this.#getter = getter;
    this.#ref = ref;
    this.#storeIndex = storeIndex;
    this.#previousState = null;
    this.#onTrack = onTrack;
    this.#onTrigger = onTrigger;
  }

  get ref() {
    return this.#ref;
  }

  set ref(ref) {
    this.#ref = ref;
  }

  get id() {
    return this._id;
  }

  run() {
    this.#shouldCompute = true;
    this.#ref.trigger();
  }

  get shouldCompute() {
    return this.#shouldCompute;
  }

  compute() {
    this.#shouldCompute = false;
    const value = this._context.track(this, () => this.#getter(this.#previousState), this._context.currentEffect);

    this.#previousState = value;

    this._context.setStoreValueAt(this.#storeIndex, value);
  }

  stop() {
    this._context.disableEffect(this);
  }
}

export default MemoEffect;
