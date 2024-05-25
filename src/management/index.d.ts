import type GlobalContext from "../context/global";
import IContext from "../context/IContext";
import Context from "../context/local";

export declare function createContext(): Context;
export declare function getGlobalContext(): GlobalContext;
export declare function createStore(length: number): number;
export declare function createStoreDispatcher(length: number): number;
export declare function getStore(idStore: number): any[];
export declare function createHook<T>(reactiveHook: T): T;