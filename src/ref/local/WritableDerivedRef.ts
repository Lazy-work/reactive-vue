import { toRaw } from "../..";
import { TriggerOpTypes } from "../../constants";
import { trigger } from "../../reactive/reactiveEffect";

class WritableDerivedRef<T = any> {
  #target: any;
  #key: any;
  #initialValue: any;
  public __v_isRef = true;

  constructor(target: any, key: any, initialValue?: any) {
    this.#target = target;
    this.#key = key;
    this.#initialValue = initialValue;
  }

  get value(): T {
    return this.#target[this.#key] ?? this.#initialValue;
  }

  set value(newValue: T) {
    this.#target[this.#key] = newValue;
  }

  trigger() {
    const target = toRaw(this.#target);
    trigger(target, TriggerOpTypes.SET, this.#key);
  }
}

export default WritableDerivedRef;
