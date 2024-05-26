import GlobalContext from "./src/context/global"



// for tests
declare namespace jest {
  interface Matchers<R, T> {
    toHaveBeenWarned(): R
    toHaveBeenWarnedLast(): R
    toHaveBeenWarnedTimes(n: number): R
  }
}

declare global {
  declare var __v_globalContext: GlobalContext
  // Global compile-time constants
  declare var __DEV__: boolean
  declare var __TEST__: boolean
  declare var __BROWSER__: boolean
  declare var __GLOBAL__: boolean
  declare var __ESM_BUNDLER__: boolean
  declare var __ESM_BROWSER__: boolean
  declare var __CJS__: boolean
  declare var __SSR__: boolean
  declare var __COMMIT__: string
  declare var __VERSION__: string
  declare var __COMPAT__: boolean
  
  // Feature flags
  declare var __FEATURE_OPTIONS_API__: boolean
  declare var __FEATURE_PROD_DEVTOOLS__: boolean
  declare var __FEATURE_SUSPENSE__: boolean
  declare var __FEATURE_PROD_HYDRATION_MISMATCH_DETAILS__: boolean
}

declare namespace React {

  export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    ReactCurrentOwner: {
      current: any
    }
  }
}
