import { act, render } from "@testing-library/react";

import {
  defineProps,
  ref,
  toReactiveHook,
  toReactiveHookShallow,
  watchEffect,
  nextTick,
} from "../src";
import React, { useCallback, useEffect, useState } from "react";
import { $reactive } from "../src/management";

describe("testing effects", () => {
  // Reactivity: Core
  it("should track props dynamically", async () => {
    let dummy;
    const VueComponent = $reactive((props: { count: number }) => {
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
    const VueComponent = $reactive((props: Props) => {
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
  
  it("should throw an error if a reactive hook is used in none reactive component", async () => {
    function ReactComponent() {
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
    const events = [];
    const VueComponent = $reactive(() => {
      const { value, mutate } = booleanValue();

      watchEffect(() => {
        dummy = value.value;
      });
      return () => {
        events.push('render');
        return (
          <button id="action" onClick={mutate}>
            Action : {value.value}
          </button>
        );
      };
    });

    const { container } = render(<VueComponent />);

    const counter = container.querySelector("#action") as HTMLButtonElement;

    expect(dummy).toBe(false);

    counter.click();
    await nextTick();
    expect(dummy).toBe(true);
    expect(events).toEqual(['render', 'render']);
  });

  it("should update once", async () => {
    function useBooleanValue() {
      const [state, setState] = useState(false);

      const mutate = useCallback(() => {
        setState((value) => !value);
      }, []);

      return {};
    }

    const booleanValue = toReactiveHookShallow(useBooleanValue);

    const events = [];
    const VueComponent = $reactive(() => {
      booleanValue();
      const counter = ref(0);

      return () => {
        events.push('render');
        return (
          <button id="action" onClick={() => counter.value++}>
            counter is {counter.value}
          </button>
        );
      };
    });

    const { container } = render(<VueComponent />);

    const counter = container.querySelector("#action") as HTMLButtonElement;

    counter.click();
    await nextTick();
    expect(events).toEqual(['render', 'render']);
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
    const VueComponent = $reactive(() => {
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
    const events = [];
    const VueComponent = $reactive(() => {
      const result = value();

      watchEffect(() => {
        dummy = result.value;
      });

      return () => {
        events.push('render');
        return <button id="action">Action : {result.value.value}</button>;
      };
    });

    act(() => {
      render(<VueComponent />);
    });

    expect(dummy.value).toBe(1);

    await new Promise((res) => setTimeout(res, 300));

    expect(dummy.value).toBe(2);
    expect(events).toEqual(['render', 'render']);
  });
});
