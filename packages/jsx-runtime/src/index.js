import { getCurrentInstance, unref, computed } from "@lazywork/reactive-vue";

export function rsx(callback) {
    const context = getCurrentInstance();
    if (context === __v_globalContext) return callback();
    
    let element = context.getElement(callback);
    let result;
    if (!element) {
        const ref = computed(callback);
        result = ref.value;
        if (ref.hasDependencies()) element = context.setElement(callback, ref);
        else element = context.setElement(callback, result);
    }

    return unref(element);
}