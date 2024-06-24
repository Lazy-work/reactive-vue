import {
  useContext,
  useDeferredValue,
  useId,
  useReducer,
  useTransition,
} from "react";
import MemoEffect from "../../effect/MemoEffect";
import { getContext } from "../../management/setting";
import ReadableRef from "./ReadableRef";
import WritableRef from "./WritableRef";
import { mustBeReactiveComponent } from "../../utils";
import { isRef, unref } from "..";
import ReactRef from "../../ReactRef";
import { isObject } from "@vue/shared";
import { reactive } from "../../reactive";
import CustomRef from "./CustomRef";

export function ref(initialState) {
  mustBeReactiveComponent();
  let value;
  if (isObject(initialState)) {
    if (isRef(initialState)) value = unref(initialState);
    else value = reactive(initialState);
  } else {
    value = initialState;
  }
  const index = this.addToStore(value);

  const setter = (value) => this.setStoreValueAt(index, value);

  return new WritableRef(this, index, setter, false);
}

export function shallowRef(initialState) {
  mustBeReactiveComponent();
  const value = initialState;
  const index = this.addToStore(value);

  const setter = (value) => this.setStoreValueAt(index, value);

  return new WritableRef(this, index, setter, true);
}

export function customRef(factory) {
  mustBeReactiveComponent();
  return new CustomRef(this, factory);
}

export function computed(getterOrOptions, debugOptions) {
  mustBeReactiveComponent();
  const memoEffect = this.createMemoEffect(getterOrOptions, debugOptions);
  return memoEffect.ref;
}

export function createId() {
  mustBeReactiveComponent();
  const id = useId();

  const index = this.addToStore(id);

  this.registerHook({ hook: useId, index });

  return new ReadableRef(this, index);
}

export function reducer(reducer, initialValue) {
  mustBeReactiveComponent();
  const [state, dispatch] = useReducer(reducer, initialValue);

  const index = this.addToStore(state);

  this.registerHook({
    hook: useReducer,
    index,
    params: [reducer, initialValue],
  });

  const dispatcher = (action) => dispatch(action);

  return [new ReadableRef(this, index), dispatcher];
}

export function context(source) {
  mustBeReactiveComponent();
  const value = useContext(source);

  const index = this.addToStore(value);

  this.registerHook({ hook: useContext, index, params: [source] });

  return new ReadableRef(this, index);
}

export function transition() {
  mustBeReactiveComponent();
  const [isPending, startTransition] = useTransition();

  const index = this.addToStore(isPending);

  this.registerHook({ hook: useTransition, index });

  return [new ReadableRef(this, index), startTransition];
}

export function deferredValue(source) {
  mustBeReactiveComponent();
  const value = useDeferredValue(unref(source));

  const index = this.addToStore(value);

  this.registerHook({
    hook: useDeferredValue,
    index,
    params: () => [source.value],
  });

  return new ReadableRef(this, index);
}

export function reactRef(initialValue) {
  mustBeReactiveComponent();
  const ref = { current: initialValue };

  const index = this.addToStore(ref);

  return new ReactRef(this, index);
}
