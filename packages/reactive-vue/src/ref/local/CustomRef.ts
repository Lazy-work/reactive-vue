import type { CustomRefFactory } from "../..";
import { ReactiveFlags } from "../../constants";
import Context from "../../context/local";
import LocalRef from "./LocalRef";

class CustomRef<T> extends LocalRef<T> {
    [ReactiveFlags.IS_READONLY] = true;
    
    readonly #get: ReturnType<CustomRefFactory<T>>['get']
    readonly #set: ReturnType<CustomRefFactory<T>>['set'] = () => { throw new Error("Can't mutate, it's readonly") }

    constructor(context: Context, factory: CustomRefFactory<T>) {
        super(context)
        const { get, set } = factory(
            () => this.track(),
            () => this.trigger(),
        )
        this.#get = get;
        if (typeof set !== 'undefined') {
            this.#set = set;
            this[ReactiveFlags.IS_READONLY] = false;
        }
    }

    get value() {
        return this.#get();
    }

    set value(newVal) {
        this.#set(newVal);
    }

    trigger() {
        super.trigger();
    }
}

export default CustomRef;