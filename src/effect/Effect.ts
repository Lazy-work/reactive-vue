import AbstractEffect from './AbstractEffect';
import type { DebuggerEvent, Destructor } from '../types';
import type IContext from '../context/IContext';

class Effect extends AbstractEffect {
  #executed: boolean;
  #callback: any;
  #cleanup: (() => void) | undefined;
  #onTrack?:(event: DebuggerEvent) => void;
  #onTrigger?:(event: DebuggerEvent) => void;

  constructor(id: number, context: IContext, callback: any, onTrack?: (event: DebuggerEvent) => void, onTrigger?: (event: DebuggerEvent) => void) {
    super(id, context);
    this.#callback = callback;
    this.#cleanup = undefined;
    this.#executed = false;
    this.#onTrack = onTrack;
    this.#onTrigger = onTrigger;
  }

  get cleanup() {
    return this.#cleanup;
  }

  get onTrack() {
    return this.#onTrack;
  }

  get onTrigger() {
    return this.#onTrigger;
  }

  get id() {
    return this._id;
  }

  run() {
    const effect = () => {
      let cleanup: any;

      const getCleanup = (cleanupCallback: Destructor) => {
        cleanup = cleanupCallback;
      };

      this.#callback(getCleanup);

      return cleanup;
    };

    if (this.#executed) this.#cleanup?.();
    this.#cleanup = this._context.track(this, effect, this._context.currentEffect);

    this.#executed = true;
  }

  stop() {
    this.#cleanup?.();
    this._context.disableEffect(this);
  }
}

export default Effect;
