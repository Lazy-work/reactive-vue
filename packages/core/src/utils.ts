import * as React from 'react';
import { getCurrentInstance } from './index';

export function isReactComponent() {
  const fiber = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner.current;
  return !!fiber;
}

export function mustBeBridgeComponent() {
  if (__DEV__ && isReactComponent() && !getCurrentInstance()) {
    throw new Error('Cannot use inside a none reactive component');
  }
}