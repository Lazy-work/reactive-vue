import React, { useEffect, useMemo } from "react";
import Context from "../context/local";
import { isReactComponent } from "../utils";
import { getContext, setContext, undoContext, unsetContext } from "./setting";

const stores = [];
const reducers = [];

export function createContext() {
  return new Context();
}

export function createStore(length = 0, lengthReducer = 0) {
  const id = stores.push(new Array(length)) - 1;
  reducers.push(new Array(lengthReducer));
  return id;
}

export function getStore(id) {
  return stores[id];
}

export function getStoreDispatcher(id) {
  return reducers[id];
}

export function createHook(reactiveHook) {
  return (...args) => {
    if (isReactComponent() && getContext() === __v_globalContext) {
      const context = useMemo(() => createContext(), []);
      context.init();
      context.setupState();
      if (!context.isExecuted()) {
        setContext(context);
        context.children = reactiveHook(...args);
        unsetContext();
      }

      context.processHooks();
      context.runEffects();
      context.executed();

      return context.children;
    } else {
      return reactiveHook(...args);
    }
  };
}

export function createReactivityDirective(context) {
  return (fn) => (p) => {
    context.init();
    context.setupState();
    const props = context.trackProps(p);

    if (!context.isExecuted()) {
      setContext(context);
      context.children = fn(props);
      undoContext();
    }

    context.processHooks();
    context.runEffects();
    context.executed();

    return context.children();
  };
}

export function reactivity(fn) {
  return (props) => {
    const context = useMemo(() => createContext(), []);
    context.init();
    context.setupState();
    const trackedProps = context.trackProps(props);

    if (!context.isExecuted()) {
      setContext(context);
      context.children = fn(trackedProps);
      unsetContext();
    }

    context.processHooks();
    context.runEffects();

    return context.render();
  };
}