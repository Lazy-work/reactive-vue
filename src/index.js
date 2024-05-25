import "./context/global";
export {
  reactivity,
  createReactivityDirective,
  createDirective
} from './management'

export const isVue2 = false;
export const isVue3 = true;
export const version = "3.0.0";

export const Fragment = {};
export const TransitionGroup = {};
export const Transition = {};
export const defineComponent = (options) => {throw new Error("Not implemented yet");}
export const set = () => {throw new Error("Not implemented yet");}
export const h = () => {throw new Error("Not implemented yet");}
export const del = () => {throw new Error("Not implemented yet");}
export { getContext as getCurrentInstance } from './management/setting'
export * from './effect/directives'
export * from './ref'
export * from './reactive'
export * from './lifecycle'
export * from './react-helpers'
