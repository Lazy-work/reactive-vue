import { CustomRefFactory } from "../..";
import { ReactiveFlags } from "../../constants";
import GlobalRef from "./GlobalRef";

class CustomRef<T> extends GlobalRef<T> {
    [ReactiveFlags.IS_READONLY] = true;

    private readonly _get: ReturnType<CustomRefFactory<T>>['get']
    private readonly _set: ReturnType<CustomRefFactory<T>>['set'] = () => { throw new Error("Can't mutate, it's readonly") }

    constructor(factory: CustomRefFactory<T>) {
        super()
        const { get, set } = factory(
            () => this.track(),
            () => this.trigger(),
        )
        this._get = get;
        if (typeof set !== 'undefined') {
            this._set = set;
            this[ReactiveFlags.IS_READONLY] = false;
        }
    }

    get value() {
        return this._get();
    }

    set value(newVal) {
        this._set(newVal);
    }
}

export default CustomRef;