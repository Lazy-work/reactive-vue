import { act, render, screen } from "@testing-library/react";
// import '@testing-library/jest-dom';
import {
  computed,
  createReactivityDirective,
  deferredValue,
  defineProps,
  layoutEffect,
  onMounted,
  onUnmounted,
  onUpdated,
  reactive,
  reactivity,
  reactRef,
  isRef,
  shallowReactive,
  ref,
  tickListener,
  toReactiveHook,
  toReactiveHookShallow,
  watch,
  watchEffect,
  watchPostEffect,
  watchSyncEffect,
  toRef,
} from "../src";
import { createContext, getGlobalContext } from "../src/management";
import React, { useCallback, useEffect, useState } from "react";

const effects = [watchEffect, watchPostEffect, watchSyncEffect, layoutEffect];

function getRandomIntInclusive(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled + 1) + minCeiled); // The maximum is inclusive and the minimum is inclusive
}

function getRandomEffect() {
  return effects[getRandomIntInclusive(0, effects.length - 1)];
}
function generateRedZone(length: number) {
  const redZones = Array.from({ length }, () => {
    const initialValue = Math.random();
    return {
      initialValue,
      effect: getRandomEffect(),
      signal: ref(initialValue),
      firstRun: true,
    };
  });

  const callbacks = redZones.map((redZone) => {
    return () => {
      const value = redZone.signal.value;
      if (value !== redZone.initialValue)
        throw new Error(
          `A red flag signal has changed. initial: ${redZone.initialValue}, current: ${value}`
        );
      if (!redZone.firstRun) throw new Error("A red flag effect has ran");
      redZone.firstRun = false;
    };
  });

  for (let i = 0; i < redZones.length; i++) {
    redZones[i].effect(callbacks[i]);
  }
}

describe("testing effects", () => {
  // Reactivity: Core
  it("should track props dynamically", async () => {
    let dummy;
    const VueComponent = reactivity((props: { count: number }) => {
      watchEffect(() => {
        dummy = props.count;
      });

      return () => <p>Count : {props.count}</p>;
    });

    function CounterWrapper() {
      const [count, setCount] = useState(0);

      return (
        <div>
          <VueComponent count={count} />
          <button id="counter" onClick={() => setCount(count + 1)}>
            Increment counter
          </button>
        </div>
      );
    }
    const { container } = render(<CounterWrapper />);

    const counter = container.querySelector("#counter") as HTMLButtonElement;
    act(() => {
      counter.click();
    });

    expect(dummy).toBe(1);
  });

  it("should track props statically", async () => {
    interface Props {
      count: number;
    }

    let dummy;
    const VueComponent = reactivity((props: Props) => {
      defineProps<Props>(["count"]);

      watchEffect(() => {
        dummy = props.count;
      });

      return () => <p>Count : {props.count}</p>;
    });

    function CounterWrapper() {
      const [count, setCount] = useState(0);

      return (
        <div>
          <VueComponent count={count} />
          <button id="counter" onClick={() => setCount(count + 1)}>
            Increment counter
          </button>
        </div>
      );
    }

    const { container } = render(<CounterWrapper />);

    const counter = container.querySelector("#counter") as HTMLButtonElement;

    act(() => {
      counter.click();
    });

    expect(dummy).toBe(1);
  });
  it.skip("should consume a context a value and track the result");

  it("should run a layoutEffect", async () => {
    const manager = createContext();
    const rc = createReactivityDirective(manager);
    const VueComponent = rc(
      (props: {
        callback: (element: HTMLButtonElement, value: number) => void;
      }) => {
        generateRedZone(5);
        const count = ref(1);
        const buttonRef = reactRef<HTMLButtonElement>(null);

        layoutEffect(() => {
          props.callback(buttonRef.value, count.value);
        });
        generateRedZone(3);

        function incrementCount() {
          count.value++;
        }

        return () => (
          <button ref={buttonRef} id="counter" onClick={incrementCount}>
            Count : {count.value}
          </button>
        );
      }
    );

    const store = manager.store;
    let resolve;
    const endWatchEffect = new Promise<true>((res) => (resolve = res));

    function callback(element: HTMLButtonElement, value: number) {
      const text = element.textContent;
      expect(text).to.be.equals(`Count : ${value}`);
      if (value === 2) resolve(true);
    }

    const { container } = render(<VueComponent callback={callback} />);

    const newStore = [...store];
    newStore[5] = 2;

    const counter = container.querySelector("#counter") as HTMLButtonElement;
    counter.click();

    expect(manager.store).to.be.eqls(newStore);

    await endWatchEffect;
  });
  it.skip("should run a insertionEffect"); // Don't know what to test here.

  it("should throw an error when updating state in an onUpdated effect", async () => {
    const manager = createContext();
    const rc = createReactivityDirective(manager);
    const VueComponent = rc((props: { callback: () => void }) => {
      generateRedZone(5);
      const count = ref(1);

      onUpdated(() => {
        props.callback(() => count.value++);
      });
      generateRedZone(3);

      function incrementCount() {
        count.value++;
      }

      return () => (
        <button ref={reactRef} id="counter" onClick={incrementCount}>
          Count : {count.value}
        </button>
      );
    });

    let resolve;
    const endWatchEffect = new Promise<true>((res) => (resolve = res));
    const callback = (update) => {
      expect(update).to.throw();
      resolve(true);
    };
    const { container } = render(<VueComponent callback={callback} />);

    const counter = container.querySelector("#counter") as HTMLButtonElement;
    counter.click();

    await endWatchEffect;
  });

  it("should await the nextTick", async () => {
    const manager = createContext();
    const rc = createReactivityDirective(manager);
    const VueComponent = rc((props: { callback: () => void }) => {
      const count = ref(1);
      const nextTick = tickListener();
      const buttonRef = reactRef(null);

      function incrementCount() {
        count.value++;

        props.callback(nextTick, buttonRef.value);
      }

      return () => (
        <button ref={buttonRef} id="counter" onClick={incrementCount}>
          Count : {count.value}
        </button>
      );
    });

    let resolve;
    let reject;

    const endWatchEffect = new Promise<true>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const callback = async (nextTick, button) => {
      try {
        expect(button.textContent).toBe("Count : 1");

        await nextTick();

        expect(button.textContent).toBe("Count : 2");
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };
    const { container } = render(<VueComponent callback={callback} />);

    const counter = container.querySelector("#counter") as HTMLButtonElement;
    counter.click();

    await endWatchEffect;
  });

  it("should throw an error if a directive is used in none reactive component", async () => {
    function ReactComponent() {
      generateRedZone(5);
      const count = ref(1);

      watchEffect(() => {
        console.log(count.value);
      });
      function incrementCount() {
        count.value++;
      }

      return (
        <button id="counter" onClick={incrementCount}>
          Count : {count.value}
        </button>
      );
    }

    expect(() => render(<ReactComponent />)).toThrow();
  });
  it("should track react hook's result object", async () => {
    function useBooleanValue() {
      const [state, setState] = useState(false);

      const mutate = useCallback(() => {
        setState((value) => !value);
      }, []);

      return { value: state, mutate };
    }

    const booleanValue = toReactiveHook(useBooleanValue);

    let dummy;
    const VueComponent = reactivity(() => {
      const { value, mutate } = booleanValue();

      watchEffect(() => {
        dummy = value.value;
      });
      return () => (
        <button id="action" onClick={mutate}>
          Action : {value.value}
        </button>
      );
    });

    const { container } = render(<VueComponent />);

    const counter = container.querySelector("#action") as HTMLButtonElement;

    expect(dummy).toBe(false);

    act(() => {
      counter.click();
    });

    expect(dummy).toBe(true);
  });
  it.skip("should track react hook's dynamic result (on properties)", async () => {
    function useBooleanValue(params: { value: boolean } | (() => void)) {
      const [state, setState] = useState(false);

      function mutate() {
        setState(!state);
      }

      if (typeof params === "object") {
        return state;
      }

      return { value: state, mutate };
    }

    const booleanValue = toReactiveHook(useBooleanValue);


    let dummy;
    const VueComponent = reactivity(() => {
      const result = booleanValue({ value: true });

      watchEffect(() => {
        dummy = result.value;
      });

      return () => <button id="action">Action : {result.value.value}</button>;
    });

    act(() => {
      render(<VueComponent />);
    });
  });
  it("should track react hook's result (shallow)", async () => {
    function useValue() {
      const [state, setState] = useState({ value: 1 });

      useEffect(() => {
        const timeout = setTimeout(() => void setState({ value: 2 }), 200);

        return () => clearTimeout(timeout);
      }, []);

      return state;
    }

    const value = toReactiveHookShallow(useValue);

    let dummy;
    const VueComponent = reactivity(() => {
      const result = value();

      watchEffect(() => {
        dummy = result.value;
      });

      return () => <button id="action">Action : {result.value.value}</button>;
    });

    act(() => {
      render(<VueComponent />);
    });

    expect(dummy.value).toBe(1);

    await new Promise((res) => setTimeout(res, 300));

    expect(dummy.value).toBe(2);
  });
});
