import type IContext from "../context/IContext";

let currentContext: IContext | undefined = undefined;
let previousContext: IContext | undefined = undefined;
let parentContext: IContext | undefined = undefined;

export function unsetContext() {
  currentContext = undefined;
}

export function undoContext() {
  currentContext = previousContext;
  previousContext = undefined;
}

export function setContext(context: IContext) {
  previousContext = currentContext;
  currentContext = context;
}

export function getContext(): IContext {
  return currentContext || globalThis.__v_globalContext;
}

export function setParentContext(context: IContext) {
  parentContext = context;
}

export function getParentContext() {
  return parentContext || globalThis.__v_globalContext;
}

export function getGlobalContext() {
  return globalThis.__v_globalContext;
}
