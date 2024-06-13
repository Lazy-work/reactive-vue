import "./context/global";
export {
  reactivity,
  createHook,
} from './management'

export const isVue2 = false;
export const isVue3 = true;
export const version = "3.0.0";

export const Fragment = {};
export const TransitionGroup = {};
export const Transition = {};
export const defineComponent = (options) => {throw new Error("Not implemented yet");}
export const h = () => {throw new Error("Not implemented yet");}
export function set(target, key, val) {
  if (Array.isArray(target)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  target[key] = val
  return val
}

export function del(target, key) {
  if (Array.isArray(target)) {
    target.splice(key, 1)
    return
  }
  delete target[key]
}
export { getContext as getCurrentInstance } from './management/setting'
export * from './effect'
export * from './ref'
export * from './reactive'
export * from './lifecycle'
export * from './react-helpers'
export * from './app'
