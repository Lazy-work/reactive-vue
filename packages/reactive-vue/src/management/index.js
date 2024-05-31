import React, { useEffect, useMemo } from "react";
import Context from "../context/local";
import { isReactComponent } from "../utils";
import { getContext, setContext, undoContext, unsetContext } from "./setting";

function createContext() {
  return new Context();
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