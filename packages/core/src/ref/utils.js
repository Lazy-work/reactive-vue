export function isRef(s) {
  return !!(s && s.__v_isRef === true);
}

export function unref(ref) {
  return isRef(ref) ? ref.value : ref;
}

export function toValue(source) {
  return typeof source === 'function' ? source() : unref(source);
}

export function triggerRef(ref) {
  if (isRef(ref)) {
    ref.trigger(undefined, true);
  }
}
