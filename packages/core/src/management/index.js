/** @import {BridgePluginClass, GetOptionsType} from '../plugins' */
import React, { useEffect, useMemo } from 'react';
import Context from '../context';
import { isReactComponent } from '../utils';
import { getCurrentInstance, setCurrentInstance } from '@vue-internals/runtime-core/component';

const pluginsList = new Set();

/**
 * @template {BridgePluginClass<any>} T
 * @template {object} O
 * 
 * @param {T} pluginClass
 * @param {O} [options]
 */
export function usePlugin(pluginClass, options) {
  pluginClass.options = options;
  pluginsList.add(pluginClass);
}

function initInstance() {
  const instance = new Context();
  for (const Plugin of pluginsList) {
    const plugin = new Plugin();
    instance.setPlugin(Plugin, plugin);
    plugin.onInstanceCreated(instance);
  }
  return instance;
}
const deps = [];

/** @typedef {(...args: any[]) => any} AnyFunction */

/**
 * @template {AnyFunction} T
 * @param {T} bridgeHook 
 * @returns {(...args: Parameters<T>) => ReturnType<T>}
 */
export function createReactHook(bridgeHook) {
  return (...args) => {
    if (isReactComponent() && !getCurrentInstance()) {
      const instance = useMemo(initInstance, deps);
      const unset = setCurrentInstance(instance);
      instance.init();
      instance.setupState();

      if (!instance.isExecuted()) {
        instance.children = bridgeHook(...args);
      }

      instance.runEffects();
      useEffect(unset);
      instance.executed();
      return instance.children;
    } else {
      return bridgeHook(...args);
    }
  };
}

/**
 * @template {object} T
 * @param {(props: T) => () => React.ReactNode} fn 
 * @returns {(props: T) => React.ReactNode}
 */
export function $bridge(fn) {
  return (props) => {
    const instance = useMemo(initInstance, deps);
    const unset = setCurrentInstance(instance);
    instance.init();
    instance.setupState();
    const trackedProps = instance.trackProps(props);

    if (!instance.isExecuted()) {
      instance.children = fn(trackedProps);
    }

    instance.runEffects();
    useEffect(unset);
    return instance.render();
  };
}
