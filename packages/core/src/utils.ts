import * as React from 'react';
import { getContext } from './management/setting';

export function isReactComponent() {
  const fiber = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner.current;
  return !!fiber;
}

export function mustBeReactiveComponent() {
  if (__DEV__ && isReactComponent() && getContext() === globalThis.__v_globalContext) {
    throw new Error('You cannot use a directive inside a none reactive component');
  }
}

export function mustBeOutsideComponent() {
  if (__DEV__ && isReactComponent()) {
    throw new Error('You cannot use a directive inside a none reactive component');
  }
}