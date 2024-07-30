import { isObject } from "@vue/shared";
import WritableRef from "./WritableRef";
import ReactRef from "../../ReactRef";
import { mustBeOutsideComponent } from "../../utils";
import ReadableRef from "./ReadableRef";
import { nanoid } from "nanoid";
import { unref } from "../index";
import { reactive } from "../../reactive";
import CustomRef from "./CustomRef";

export function ref(initialState) {
  mustBeOutsideComponent();
  const initialValue = unref(initialState);
  const value = isObject(initialValue)
    ? reactive(initialValue)
    : initialValue;
  const index = this.addToStore(value);

  const setter = (value) => this.setStoreValueAt(index, value);

  return new WritableRef(index, setter, false);
}

export function shallowRef(initialState) {
  mustBeOutsideComponent();
  const value = initialState;
  const index = this.addToStore(value);

  const setter = (value) => this.setStoreValueAt(index, value);

  return new WritableRef(index, setter, true);
}

export function customRef(factory) {
  mustBeOutsideComponent();
  return new CustomRef(factory);
}

export function computed(getter, options) {
  mustBeOutsideComponent();
  const memoEffect = this.createMemoEffect(getter, options);
  return memoEffect.ref;
}

export function createId() {
  mustBeOutsideComponent();
  const id = nanoid();

  const index = this.addToStore(id);

  return new ReadableRef(index);
}

export function reducer(reducer, initialValue) {
  mustBeOutsideComponent();
  const index = this.addToStore(initialValue);

  const dispatcher = (action) => reducer(this.getValueAt(index), action);

  return [new ReadableRef(index), dispatcher];
}

export function context(source) {
  mustBeOutsideComponent();
  throw new Error("Not implemented yet");
}

export function transition() {
  mustBeOutsideComponent();
  throw new Error("Not implemented yet");
}

export function deferredValue(source) {
  mustBeOutsideComponent();
  throw new Error("Not implemented yet");
}

export function reactRef(initialValue) {
  mustBeOutsideComponent();
  const ref = { current: initialValue };

  const index = this.addToStore(ref);

  return new ReactRef(this, index);
}
