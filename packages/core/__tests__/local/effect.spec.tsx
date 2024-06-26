import { act, render } from "@testing-library/react";
import React from "react";
import {
  type DebuggerEvent,
  type ReactiveEffectRunner,
  TrackOpTypes,
  TriggerOpTypes,
  watchEffect as effect,
  markRaw,
  reactive,
  readonly,
  shallowReactive,
  stop,
  toRaw,
  computed,
  $reactive,
} from "../../src/index";
import { getContext } from '../../src/management/setting';
import { ITERATE_KEY } from "../../src/reactive/reactiveEffect";

describe("reactivity/effect", () => {
  it("should run the passed function once (wrapped by a effect)", () => {
    const fnSpy = vi.fn(() => {});
    const Comp = $reactive(() => {
      effect(fnSpy);
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it("should observe basic properties", () => {
    let dummy;
    let counter;

    const Comp = $reactive(() => {
      counter = reactive({ num: 0 });
      effect(() => (dummy = counter.num));
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(0);
    act(() => (counter.num = 7));
    expect(dummy).toBe(7);
  });

  it("should observe multiple properties", () => {
    let dummy;
    let counter;

    const Comp = $reactive(() => {
      counter = reactive({ num1: 0, num2: 0 });
      effect(() => (dummy = counter.num1 + counter.num1 + counter.num2));
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(0);
    act(() => (counter.num1 = counter.num2 = 7));
    expect(dummy).toBe(21);
  });

  it("should handle multiple effects", () => {
    let dummy1, dummy2;
    let counter;

    const Comp = $reactive(() => {
      counter = reactive({ num: 0 });
      effect(() => (dummy1 = counter.num));
      effect(() => (dummy2 = counter.num));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy1).toBe(0);
    expect(dummy2).toBe(0);
    act(() => counter.num++);
    expect(dummy1).toBe(1);
    expect(dummy2).toBe(1);
  });

  it("should observe nested properties", () => {
    let dummy;
    let counter;

    const Comp = $reactive(() => {
      counter = counter = reactive({ nested: { num: 0 } });
      effect(() => (dummy = counter.nested.num));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(0);
    act(() => (counter.nested.num = 8));
    expect(dummy).toBe(8);
  });

  it("should observe delete operations", () => {
    let dummy;
    let obj;

    const Comp = $reactive(() => {
      obj = reactive<{
        prop?: string;
      }>({ prop: "value" });
      effect(() => (dummy = obj.prop));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe("value");
    act(() => delete obj.prop);
    expect(dummy).toBe(undefined);
  });

  it("should observe has operations", () => {
    let dummy;
    let obj;

    const Comp = $reactive(() => {
      obj = reactive<{ prop?: string | number }>({ prop: "value" });
      effect(() => (dummy = "prop" in obj));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(true);
    act(() => delete obj.prop);
    expect(dummy).toBe(false);
    act(() => (obj.prop = 12));
    expect(dummy).toBe(true);
  });

  it("should observe properties on the prototype chain", () => {
    let dummy;
    let counter;
    let parentCounter;

    const Comp = $reactive(() => {
      counter = reactive<{ num?: number }>({ num: 0 });
      parentCounter = reactive({ num: 2 });
      Object.setPrototypeOf(counter, parentCounter);
      effect(() => (dummy = counter.num));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(0);
    act(() => delete counter.num);
    expect(dummy).toBe(2);
    act(() => (parentCounter.num = 4));
    expect(dummy).toBe(4);
    act(() => (counter.num = 3));
    expect(dummy).toBe(3);
  });

  it("should observe has operations on the prototype chain", () => {
    let dummy;
    let counter;
    let parentCounter;

    const Comp = $reactive(() => {
      counter = reactive<{ num?: number }>({ num: 0 });
      parentCounter = reactive({ num: 2 });
      Object.setPrototypeOf(counter, parentCounter);
      effect(() => (dummy = "num" in counter));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(true);
    act(() => delete counter.num);
    expect(dummy).toBe(true);
    act(() => delete parentCounter.num);
    expect(dummy).toBe(false);
    act(() => (counter.num = 3));
    expect(dummy).toBe(true);
  });

  it("should observe inherited property accessors", () => {
    let dummy, parentDummy, hiddenValue: any;
    let obj;
    let parent;

    const Comp = $reactive(() => {
      obj = reactive<{ prop?: number }>({});
      parent = reactive({
        set prop(value) {
          hiddenValue = value;
        },
        get prop() {
          return hiddenValue;
        },
      });
      Object.setPrototypeOf(obj, parent);

      effect(() => (dummy = obj.prop));
      effect(() => (parentDummy = parent.prop));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    act(() => (obj.prop = 4));
    expect(dummy).toBe(4);
    // this doesn't work, should it?
    // expect(parentDummy).toBe(4)
    act(() => (parent.prop = 2));
    expect(dummy).toBe(2);
    expect(parentDummy).toBe(2);
  });

  it("should observe function call chains", () => {
    let dummy;
    let counter;

    const Comp = $reactive(() => {
      counter = reactive({ num: 0 });
      effect(() => (dummy = getNum()));

      function getNum() {
        return counter.num;
      }
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(0);
    act(() => (counter.num = 2));
    expect(dummy).toBe(2);
  });

  it("should observe iteration", () => {
    let dummy;
    let list;

    const Comp = $reactive(() => {
      list = reactive(["Hello"]);
      effect(() => (dummy = list.join(" ")));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe("Hello");
    act(() => list.push("World!"));
    expect(dummy).toBe("Hello World!");
    act(() => list.shift());
    expect(dummy).toBe("World!");
  });

  it("should observe implicit array length changes", () => {
    let dummy;
    let list;

    const Comp = $reactive(() => {
      list = reactive(["Hello"]);
      effect(() => (dummy = list.join(" ")));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe("Hello");
    act(() => (list[1] = "World!"));
    expect(dummy).toBe("Hello World!");
    act(() => (list[3] = "Hello!"));
    expect(dummy).toBe("Hello World!  Hello!");
  });

  it("should observe sparse array mutations", () => {
    let dummy;
    let list;

    const Comp = $reactive(() => {
      list = reactive<string[]>([]);
      list[1] = "World!";
      effect(() => (dummy = list.join(" ")));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(" World!");
    act(() => (list[0] = "Hello"));
    expect(dummy).toBe("Hello World!");
    act(() => list.pop());
    expect(dummy).toBe("Hello");
  });

  it("should observe enumeration", () => {
    let dummy = 0;
    let numbers;

    const Comp = $reactive(() => {
      numbers = reactive<Record<string, number>>({ num1: 3 });
      effect(() => {
        dummy = 0;
        for (const key in numbers) {
          dummy += numbers[key];
        }
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(3);
    act(() => (numbers.num2 = 4));
    expect(dummy).toBe(7);
    act(() => delete numbers.num1);
    expect(dummy).toBe(4);
  });

  it("should observe symbol keyed properties", () => {
    const key = Symbol("symbol keyed prop");
    let dummy, hasDummy;
    let obj;

    const Comp = $reactive(() => {
      obj = reactive<{ [key]?: string }>({ [key]: "value" });
      effect(() => (dummy = obj[key]));
      effect(() => (hasDummy = key in obj));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe("value");
    expect(hasDummy).toBe(true);
    act(() => (obj[key] = "newValue"));
    expect(dummy).toBe("newValue");
    act(() => delete obj[key]);
    expect(dummy).toBe(undefined);
    expect(hasDummy).toBe(false);
  });

  it("should not observe well-known symbol keyed properties", () => {
    const key = Symbol.isConcatSpreadable;
    let dummy;
    let array: any;

    const Comp = $reactive(() => {
      array = reactive([]);
      effect(() => (dummy = array[key]));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(array[key]).toBe(undefined);
    expect(dummy).toBe(undefined);
    act(() => (array[key] = true));
    expect(array[key]).toBe(true);
    expect(dummy).toBe(undefined);
  });

  it("should support manipulating an array while observing symbol keyed properties", () => {
    const key = Symbol();
    let dummy;
    let array;

    const Comp = $reactive(() => {
      array = reactive([1, 2, 3]);
      effect(() => (dummy = array[key]));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(undefined);
    act(() => {
      array.pop();
      array.shift();
      array.splice(0, 1);
    });
    expect(dummy).toBe(undefined);
    act(() => {
      array[key] = "value";
      array.length = 0;
    });
    expect(dummy).toBe("value");
  });

  it("should observe function valued properties", () => {
    const oldFunc = () => {};
    const newFunc = () => {};

    let dummy;
    let obj;

    const Comp = $reactive(() => {
      obj = reactive({ func: oldFunc });
      effect(() => (dummy = obj.func));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(oldFunc);
    act(() => (obj.func = newFunc));
    expect(dummy).toBe(newFunc);
  });

  it("should observe chained getters relying on this", () => {
    let obj;

    let dummy;

    const Comp = $reactive(() => {
      obj = reactive({
        a: 1,
        get b() {
          return this.a;
        },
      });

      effect(() => (dummy = obj.b));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(1);
    act(() => obj.a++);
    expect(dummy).toBe(2);
  });

  it("should observe methods relying on this", () => {
    let obj;

    let dummy;
    const Comp = $reactive(() => {
      obj = reactive({
        a: 1,
        b() {
          return this.a;
        },
      });

      effect(() => (dummy = obj.b()));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);
    act(() => obj.a++);
    expect(dummy).toBe(2);
  });

  it("should not observe set operations without a value change", () => {
    let hasDummy, getDummy;
    let obj;
    let getSpy;
    let hasSpy;

    const Comp = $reactive(() => {
      obj = reactive({ prop: "value" });

      getSpy = vi.fn(() => (getDummy = obj.prop));
      hasSpy = vi.fn(() => (hasDummy = "prop" in obj));
      effect(getSpy);
      effect(hasSpy);

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(getDummy).toBe("value");
    expect(hasDummy).toBe(true);
    act(() => (obj.prop = "value"));
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(hasSpy).toHaveBeenCalledTimes(1);
    expect(getDummy).toBe("value");
    expect(hasDummy).toBe(true);
  });

  it("should not observe raw mutations", () => {
    let dummy;
    let obj;
    const Comp = $reactive(() => {
      obj = reactive<{ prop?: string }>({});
      effect(() => (dummy = toRaw(obj).prop));

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(undefined);
    act(() => (obj.prop = "value"));
    expect(dummy).toBe(undefined);
  });

  it("should not be triggered by raw mutations", () => {
    let dummy;
    let obj;

    const Comp = $reactive(() => {
      obj = reactive<{ prop?: string }>({});
      effect(() => (dummy = obj.prop));

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(undefined);
    act(() => (toRaw(obj).prop = "value"));
    expect(dummy).toBe(undefined);
  });

  it("should not be triggered by inherited raw setters", () => {
    let dummy, parentDummy, hiddenValue: any;
    let obj;
    let parent;
    const Comp = $reactive(() => {
      obj = reactive<{ prop?: number }>({});
      parent = reactive({
        set prop(value) {
          hiddenValue = value;
        },
        get prop() {
          return hiddenValue;
        },
      });
      Object.setPrototypeOf(obj, parent);
      effect(() => (dummy = obj.prop));
      effect(() => (parentDummy = parent.prop));

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
    act(() => (toRaw(obj).prop = 4));
    expect(dummy).toBe(undefined);
    expect(parentDummy).toBe(undefined);
  });

  it("should avoid implicit infinite recursive loops with itself", () => {
    let counter;

    let counterSpy;

    const Comp = $reactive(() => {
      counter = reactive({ num: 0 });

      counterSpy = vi.fn(() => counter.num++);
      effect(counterSpy);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(counter.num).toBe(1);
    expect(counterSpy).toHaveBeenCalledTimes(1);
    act(() => (counter.num = 4));
    expect(counter.num).toBe(5);
    expect(counterSpy).toHaveBeenCalledTimes(2);
  });

  it("should avoid infinite recursive loops when use Array.prototype.push/unshift/pop/shift", () => {
    (["push", "unshift"] as const).forEach((key) => {
      let arr;
      let counterSpy1;
      let counterSpy2;
      const Comp = $reactive(() => {
        arr = reactive<number[]>([]);
        counterSpy1 = vi.fn(() => (arr[key] as any)(1));
        counterSpy2 = vi.fn(() => (arr[key] as any)(2));
        effect(counterSpy1);
        effect(counterSpy2);
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(arr.length).toBe(2);
      expect(counterSpy1).toHaveBeenCalledTimes(1);
      expect(counterSpy2).toHaveBeenCalledTimes(1);
    });
    (["pop", "shift"] as const).forEach((key) => {
      let arr;
      let counterSpy1 = vi.fn(() => (arr[key] as any)());
      let counterSpy2 = vi.fn(() => (arr[key] as any)());

      const Comp = $reactive(() => {
        arr = reactive<number[]>([1, 2, 3, 4]);
        counterSpy1 = vi.fn(() => (arr[key] as any)(1));
        counterSpy2 = vi.fn(() => (arr[key] as any)(2));
        effect(counterSpy1);
        effect(counterSpy2);
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(arr.length).toBe(2);
      expect(counterSpy1).toHaveBeenCalledTimes(1);
      expect(counterSpy2).toHaveBeenCalledTimes(1);
    });
  });

  it("should allow explicitly recursive raw function loops", () => {
    let counter;
    let numSpy;

    const Comp = $reactive(() => {
      counter = reactive({ num: 0 });
      numSpy = vi.fn(() => {
        counter.num++;
        if (counter.num < 10) {
          numSpy();
        }
      });
      effect(numSpy);

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(counter.num).toEqual(10);
    expect(numSpy).toHaveBeenCalledTimes(10);
  });

  it("should avoid infinite loops with other effects", () => {
    let nums;

    let spy1;
    let spy2;

    const Comp = $reactive(() => {
      nums = reactive({ num1: 0, num2: 1 });

      spy1 = vi.fn(() => (nums.num1 = nums.num2));
      spy2 = vi.fn(() => (nums.num2 = nums.num1));
      effect(spy1);
      effect(spy2);

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(nums.num1).toBe(1);
    expect(nums.num2).toBe(1);
    expect(spy1).toHaveBeenCalledTimes(1);
    expect(spy2).toHaveBeenCalledTimes(1);
    act(() => (nums.num2 = 4));
    expect(nums.num1).toBe(4);
    expect(nums.num2).toBe(4);
    expect(spy1).toHaveBeenCalledTimes(2);
    expect(spy2).toHaveBeenCalledTimes(2);
    act(() => (nums.num1 = 10));
    expect(nums.num1).toBe(10);
    expect(nums.num2).toBe(10);
    expect(spy1).toHaveBeenCalledTimes(3);
    expect(spy2).toHaveBeenCalledTimes(3);
  });

  it("should return a new reactive version of the function", () => {
    function greet() {
      return "Hello World";
    }
    let effect1;
    let effect2;
    const Comp = $reactive(() => {
      effect1 = effect(greet);
      effect2 = effect(greet);

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(typeof effect1).toBe("function");
    expect(typeof effect2).toBe("function");
    expect(effect1).not.toBe(greet);
    expect(effect1).not.toBe(effect2);
  });

  it.skip("should discover new branches while running automatically", () => {
    let dummy;
    let obj;

    let conditionalSpy;
    const Comp = $reactive(() => {
      obj = reactive({ prop: "value", run: false });

      conditionalSpy = vi.fn(() => {
        dummy = obj.run ? obj.prop : "other";
      });
      effect(conditionalSpy);

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe("other");
    expect(conditionalSpy).toHaveBeenCalledTimes(1);
    act(() => (obj.prop = "Hi"));
    expect(dummy).toBe("other");
    expect(conditionalSpy).toHaveBeenCalledTimes(1);
    act(() => (obj.run = true));
    expect(dummy).toBe("Hi");
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
    act(() => (obj.prop = "World"));
    expect(dummy).toBe("World");
    expect(conditionalSpy).toHaveBeenCalledTimes(3);
  });

  it.skip("should discover new branches when running manually", () => {
    let dummy;
    let run = false;
    const obj = reactive({ prop: "value" });
    const runner = effect(() => {
      dummy = run ? obj.prop : "other";
    });

    expect(dummy).toBe("other");
    runner();
    expect(dummy).toBe("other");
    run = true;
    runner();
    expect(dummy).toBe("value");
    obj.prop = "World";
    expect(dummy).toBe("World");
  });

  it.skip("should not be triggered by mutating a property, which is used in an inactive branch", () => {
    let dummy;
    const obj = reactive({ prop: "value", run: true });

    const conditionalSpy = vi.fn(() => {
      dummy = obj.run ? obj.prop : "other";
    });
    effect(conditionalSpy);

    expect(dummy).toBe("value");
    expect(conditionalSpy).toHaveBeenCalledTimes(1);
    obj.run = false;
    expect(dummy).toBe("other");
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
    obj.prop = "value2";
    expect(dummy).toBe("other");
    expect(conditionalSpy).toHaveBeenCalledTimes(2);
  });

  it("should handle deep effect recursion using cleanup fallback", () => {
    let results;
    let effects: { fx: ReactiveEffectRunner; index: number }[];

    const Comp = $reactive(() => {
      results = reactive([0]);
      effects = [];
      for (let i = 1; i < 40; i++) {
        ((index) => {
          const fx = effect(() => {
            results[index] = results[index - 1] * 2;
          });
          effects.push({ fx, index });
        })(i);
      }
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(results[39]).toBe(0);
    act(() => (results[0] = 1));
    expect(results[39]).toBe(Math.pow(2, 39));
  });

  it("should register deps independently during effect recursion", () => {
    let input;
    let output;

    let fx1Spy;
    let fx1;
    let fx2Spy;

    let fx2;
    const Comp = $reactive(() => {
      input = reactive({ a: 1, b: 2, c: 0 });
      output = reactive({ fx1: 0, fx2: 0 });

      fx1Spy = vi.fn(() => {
        let result = 0;
        if (input.c < 2) result += input.a;
        if (input.c > 1) result += input.b;
        output.fx1 = result;
      });

      fx1 = effect(fx1Spy);

      fx2Spy = vi.fn(() => {
        let result = 0;
        if (input.c > 1) result += input.a;
        if (input.c < 3) result += input.b;
        output.fx2 = result + output.fx1;
      });

      fx2 = effect(fx2Spy);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(fx1).not.toBeNull();
    expect(fx2).not.toBeNull();

    expect(output.fx1).toBe(1);
    expect(output.fx2).toBe(2 + 1);
    expect(fx1Spy).toHaveBeenCalledTimes(1);
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    act(() => {
      fx1Spy.mockClear();
      fx2Spy.mockClear();
      input.b = 3;
    });
    expect(output.fx1).toBe(1);
    expect(output.fx2).toBe(3 + 1);
    expect(fx1Spy).toHaveBeenCalledTimes(0);
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    act(() => {
      fx1Spy.mockClear();
      fx2Spy.mockClear();
      input.c = 1;
    });
    expect(output.fx1).toBe(1);
    expect(output.fx2).toBe(3 + 1);
    expect(fx1Spy).toHaveBeenCalledTimes(1);
    expect(fx2Spy).toHaveBeenCalledTimes(1);
    act(() => {
      fx1Spy.mockClear();
      fx2Spy.mockClear();
      input.c = 2;
    });
    expect(output.fx1).toBe(3);
    expect(output.fx2).toBe(1 + 3 + 3);
    expect(fx1Spy).toHaveBeenCalledTimes(1);

    // Invoked due to change of fx1.
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    act(() => {
      fx1Spy.mockClear();
      fx2Spy.mockClear();
      input.c = 3;
    });
    expect(output.fx1).toBe(3);
    expect(output.fx2).toBe(1 + 3);
    expect(fx1Spy).toHaveBeenCalledTimes(1);
    expect(fx2Spy).toHaveBeenCalledTimes(1);

    act(() => {
      fx1Spy.mockClear();
      fx2Spy.mockClear();
      input.a = 1;
    });

    expect(output.fx1).toBe(3);
    expect(output.fx2).toBe(10 + 3);
    expect(fx1Spy).toHaveBeenCalledTimes(0);
    expect(fx2Spy).toHaveBeenCalledTimes(1);
  });

  it.skip("should not double wrap if the passed function is a effect", () => {
    const runner = effect(() => {});
    const otherRunner = effect(runner);
    expect(runner).not.toBe(otherRunner);
    expect(runner.effect.fn).toBe(otherRunner.effect.fn);
  });

  it.skip("should wrap if the passed function is a fake effect", () => {
    const fakeRunner = () => {};
    fakeRunner.effect = {};
    const runner = effect(fakeRunner);
    expect(fakeRunner).not.toBe(runner);
    expect(runner.effect.fn).toBe(fakeRunner);
  });

  it("should not run multiple times for a single mutation", () => {
    let dummy;
    let obj;
    let fnSpy;

    const Comp = $reactive(() => {
      obj = reactive<Record<string, number>>({});
      fnSpy = vi.fn(() => {
        for (const key in obj) {
          dummy = obj[key];
        }
        dummy = obj.prop;
      });
      effect(fnSpy);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(fnSpy).toHaveBeenCalledTimes(1);
    act(() => (obj.prop = 16));
    expect(dummy).toBe(16);
    expect(fnSpy).toHaveBeenCalledTimes(2);
  });

  it.skip("should allow nested effects", () => {
    const nums = reactive({ num1: 0, num2: 1, num3: 2 });
    const dummy: any = {};

    const childSpy = vi.fn(() => (dummy.num1 = nums.num1));
    const childeffect = effect(childSpy);
    const parentSpy = vi.fn(() => {
      dummy.num2 = nums.num2;
      childeffect();
      dummy.num3 = nums.num3;
    });
    effect(parentSpy);

    expect(dummy).toEqual({ num1: 0, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(2);
    // this should only call the childeffect
    nums.num1 = 4;
    expect(dummy).toEqual({ num1: 4, num2: 1, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(1);
    expect(childSpy).toHaveBeenCalledTimes(3);
    // this calls the parenteffect, which calls the childeffect once
    nums.num2 = 10;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 2 });
    expect(parentSpy).toHaveBeenCalledTimes(2);
    expect(childSpy).toHaveBeenCalledTimes(4);
    // this calls the parenteffect, which calls the childeffect once
    nums.num3 = 7;
    expect(dummy).toEqual({ num1: 4, num2: 10, num3: 7 });
    expect(parentSpy).toHaveBeenCalledTimes(3);
    expect(childSpy).toHaveBeenCalledTimes(5);
  });

  it("should observe json methods", () => {
    let dummy = {} as Record<string, number>;
    let obj;

    const Comp = $reactive(() => {
      obj = reactive<Record<string, number>>({});
      effect(() => {
        dummy = JSON.parse(JSON.stringify(obj));
      });
      obj.a = 1;
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy.a).toBe(1);
  });

  it("should observe class method invocations", () => {
    class Model {
      count: number;
      constructor() {
        this.count = 0;
      }
      inc() {
        this.count++;
      }
    }
    let model;
    let dummy;

    const Comp = $reactive(() => {
      model = reactive(new Model());
      dummy;
      effect(() => {
        dummy = model.count;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(0);
    act(() => model.inc());
    expect(dummy).toBe(1);
  });

  it.skip("lazy", () => {
    const obj = reactive({ foo: 1 });
    let dummy;
    const runner = effect(() => (dummy = obj.foo), { lazy: true });
    expect(dummy).toBe(undefined);

    expect(runner()).toBe(1);
    expect(dummy).toBe(1);
    obj.foo = 2;
    expect(dummy).toBe(2);
  });

  it.skip("scheduler", () => {
    let dummy;
    let run: any;
    const scheduler = vi.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // should not run yet
    expect(dummy).toBe(1);
    // manually run
    run();
    // should have run
    expect(dummy).toBe(2);
  });

  it("events: onTrack", () => {
    const events: DebuggerEvent[] = [];
    let dummy;
    const onTrack = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive({ foo: 1, bar: 2 });
    const runner = effect(
      () => {
        dummy = obj.foo;
        dummy = "bar" in obj;
        dummy = Object.keys(obj);
      },
      { onTrack }
    );
    expect(dummy).toEqual(["foo", "bar"]);
    expect(onTrack).toHaveBeenCalledTimes(3);
    expect(events).toEqual([
      {
        effect: runner.effect,
        target: toRaw(obj),
        type: TrackOpTypes.GET,
        key: "foo",
      },
      {
        effect: runner.effect,
        target: toRaw(obj),
        type: TrackOpTypes.HAS,
        key: "bar",
      },
      {
        effect: runner.effect,
        target: toRaw(obj),
        type: TrackOpTypes.ITERATE,
        key: ITERATE_KEY,
      },
    ]);
  });

  it("events: onTrigger", () => {
    const events: DebuggerEvent[] = [];
    let dummy;
    const onTrigger = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive<{ foo?: number }>({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { onTrigger }
    );

    obj.foo!++;
    expect(dummy).toBe(2);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(events[0]).toEqual({
      effect: runner.effect,
      target: toRaw(obj),
      type: TriggerOpTypes.SET,
      key: "foo",
      oldValue: 1,
      newValue: 2,
    });

    delete obj.foo;
    expect(dummy).toBeUndefined();
    expect(onTrigger).toHaveBeenCalledTimes(2);
    expect(events[1]).toEqual({
      effect: runner.effect,
      target: toRaw(obj),
      type: TriggerOpTypes.DELETE,
      key: "foo",
      oldValue: 2,
    });
  });

  it("stop", () => {
    let dummy;
    let obj;
    let stop;

    const Comp = $reactive(() => {
      obj = reactive({ prop: 1 });
      stop = effect(() => {
        dummy = obj.prop;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    act(() => (obj.prop = 2));
    expect(dummy).toBe(2);
    act(() => {
      stop();
      obj.prop = 3;
    });
    expect(dummy).toBe(2);
  });

  it.skip("events: onStop", () => {
    const onStop = vi.fn();
    const runner = effect(() => {}, {
      onStop,
    });

    stop(runner);
    expect(onStop).toHaveBeenCalled();
  });

  it.skip("stop: a stopped effect is nested in a normal effect", () => {
    let dummy;
    const obj = reactive({ prop: 1 });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    stop(runner);
    obj.prop = 2;
    expect(dummy).toBe(1);

    // observed value in inner stopped effect
    // will track outer effect as an dependency
    effect(() => {
      runner();
    });
    expect(dummy).toBe(2);

    // notify outer effect to run
    obj.prop = 3;
    expect(dummy).toBe(3);
  });

  it("markRaw", () => {
    let obj;
    let dummy;

    const Comp = $reactive(() => {
      obj = reactive({
        foo: markRaw({
          prop: 0,
        }),
      });
      effect(() => {
        dummy = obj.foo.prop;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(0);
    act(() => obj.foo.prop++);
    expect(dummy).toBe(0);
    act(() => (obj.foo = { prop: 1 }));
    expect(dummy).toBe(1);
  });

  it("should not be triggered when the value and the old value both are NaN", () => {
    let obj;
    let fnSpy;

    const Comp = $reactive(() => {
      obj = reactive({
        foo: NaN,
      });
      fnSpy = vi.fn(() => obj.foo);
      effect(fnSpy);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    act(() => (obj.foo = NaN));
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it("should trigger all effects when array length is set to 0", () => {
    let observed: any;
    let dummy, record;

    const Comp = $reactive(() => {
      observed = reactive([1]);
      effect(() => {
        dummy = observed.length;
      });
      effect(() => {
        record = observed[0];
      });

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);
    expect(record).toBe(1);

    act(() => (observed[1] = 2));
    expect(observed[1]).toBe(2);

    act(() => observed.unshift(3));
    expect(dummy).toBe(3);
    expect(record).toBe(3);

    act(() => (observed.length = 0));
    expect(dummy).toBe(0);
    expect(record).toBeUndefined();
  });

  it("should not be triggered when set with the same proxy", () => {
    let obj;
    let obj2;
    let observed: any;
    let observed2: any;
    let fnSpy;
    let fnSpy2;

    const Comp = $reactive(() => {
      obj = reactive({ foo: 1 });
      observed = reactive({ obj });
      fnSpy = vi.fn(() => observed.obj);
      effect(fnSpy);

      obj2 = reactive({ foo: 1 });
      observed2 = shallowReactive({ obj2 });
      fnSpy2 = vi.fn(() => observed2.obj2);

      effect(fnSpy2);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(fnSpy).toHaveBeenCalledTimes(1);
    act(() => (observed.obj = obj));
    expect(fnSpy).toHaveBeenCalledTimes(1);

    expect(fnSpy2).toHaveBeenCalledTimes(1);
    act(() => (observed2.obj2 = obj2));
    expect(fnSpy2).toHaveBeenCalledTimes(1);
  });

  it("should be triggered when set length with string", () => {
    let ret1 = "idle";
    let ret2 = "idle";
    let arr1;
    let arr2;

    const Comp = $reactive(() => {
      arr1 = reactive(new Array(11).fill(0));
      arr2 = reactive(new Array(11).fill(0));
      effect(() => {
        ret1 = arr1[10] === undefined ? "arr[10] is set to empty" : "idle";
      });
      effect(() => {
        ret2 = arr2[10] === undefined ? "arr[10] is set to empty" : "idle";
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    act(() => {
      arr1.length = 2;
      arr2.length = "2" as any;
    });
    expect(ret1).toBe(ret2);
  });

  describe("readonly + reactive for Map", () => {
    test("should work with readonly(reactive(Map))", () => {
      let m;
      let roM;
      let fnSpy;

      const Comp = $reactive(() => {
        m = reactive(new Map());
        roM = readonly(m);
        fnSpy = vi.fn(() => roM.get(1));

        effect(fnSpy);
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(fnSpy).toHaveBeenCalledTimes(1);
      act(() => m.set(1, 1));
      expect(fnSpy).toHaveBeenCalledTimes(2);
    });

    test("should work with observed value as key", () => {
      let key = reactive({});
      let m;
      let roM;
      let fnSpy;

      const Comp = $reactive(() => {
        key = reactive({});
        m = reactive(new Map());
        m.set(key, 1);
        roM = readonly(m);
        fnSpy = vi.fn(() => roM.get(key));

        effect(fnSpy);
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(fnSpy).toHaveBeenCalledTimes(1);
      act(() => m.set(key, 1));
      expect(fnSpy).toHaveBeenCalledTimes(1);
      act(() => m.set(key, 2));
      expect(fnSpy).toHaveBeenCalledTimes(2);
    });

    test("should track hasOwnProperty", () => {
      let obj: any;
      let has;
      let fnSpy;

      const Comp = $reactive(() => {
         obj = reactive({});
         has = false;
         fnSpy = vi.fn();
  
        effect(() => {
          fnSpy();
          has = obj.hasOwnProperty("foo");
        });
  
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(fnSpy).toHaveBeenCalledTimes(1);
      expect(has).toBe(false);

      act(() => obj.foo = 1);
      expect(fnSpy).toHaveBeenCalledTimes(2);
      expect(has).toBe(true);

      act(() => delete obj.foo);
      expect(fnSpy).toHaveBeenCalledTimes(3);
      expect(has).toBe(false);

      // should not trigger on unrelated key
      act(() => obj.bar = 2);
      expect(fnSpy).toHaveBeenCalledTimes(3);
      expect(has).toBe(false);
    });
  });

  it.skip("should be triggered once with pauseScheduling", () => {
    const counter = reactive({ num: 0 });

    const counterSpy = vi.fn(() => counter.num);
    effect(counterSpy);

    counterSpy.mockClear();

    pauseScheduling();
    counter.num++;
    counter.num++;
    resetScheduling();
    expect(counterSpy).toHaveBeenCalledTimes(1);
  });

  // #10082
  it.skip("should set dirtyLevel when effect is allowRecurse and is running", async () => {
    const s = ref(0);
    const n = computed(() => s.value + 1);

    const Child = {
      setup() {
        s.value++;
        return () => n.value;
      },
    };

    const renderSpy = vi.fn();
    const Parent = {
      setup() {
        return () => {
          renderSpy();
          return [n.value, h(Child)];
        };
      },
    };

    const root = nodeOps.createElement("div");
    render(h(Parent), root);
    await nextTick();
    expect(serializeInner(root)).toBe("22");
    expect(renderSpy).toHaveBeenCalledTimes(2);
  });

  describe.skip("empty dep cleanup", () => {
    it("should remove the dep when the effect is stopped", () => {
      const obj = reactive({ prop: 1 });
      expect(getDepFromReactive(toRaw(obj), "prop")).toBeUndefined();
      const runner = effect(() => obj.prop);
      const dep = getDepFromReactive(toRaw(obj), "prop");
      expect(dep).toHaveLength(1);
      obj.prop = 2;
      expect(getDepFromReactive(toRaw(obj), "prop")).toBe(dep);
      expect(dep).toHaveLength(1);
      stop(runner);
      expect(getDepFromReactive(toRaw(obj), "prop")).toBeUndefined();
      obj.prop = 3;
      runner();
      expect(getDepFromReactive(toRaw(obj), "prop")).toBeUndefined();
    });

    it("should only remove the dep when the last effect is stopped", () => {
      const obj = reactive({ prop: 1 });
      expect(getDepFromReactive(toRaw(obj), "prop")).toBeUndefined();
      const runner1 = effect(() => obj.prop);
      const dep = getDepFromReactive(toRaw(obj), "prop");
      expect(dep).toHaveLength(1);
      const runner2 = effect(() => obj.prop);
      expect(getDepFromReactive(toRaw(obj), "prop")).toBe(dep);
      expect(dep).toHaveLength(2);
      obj.prop = 2;
      expect(getDepFromReactive(toRaw(obj), "prop")).toBe(dep);
      expect(dep).toHaveLength(2);
      stop(runner1);
      expect(getDepFromReactive(toRaw(obj), "prop")).toBe(dep);
      expect(dep).toHaveLength(1);
      obj.prop = 3;
      expect(getDepFromReactive(toRaw(obj), "prop")).toBe(dep);
      expect(dep).toHaveLength(1);
      stop(runner2);
      expect(getDepFromReactive(toRaw(obj), "prop")).toBeUndefined();
      obj.prop = 4;
      runner1();
      runner2();
      expect(getDepFromReactive(toRaw(obj), "prop")).toBeUndefined();
    });

    it("should remove the dep when it is no longer used by the effect", () => {
      const obj = reactive<{ a: number; b: number; c: "a" | "b" }>({
        a: 1,
        b: 2,
        c: "a",
      });
      expect(getDepFromReactive(toRaw(obj), "prop")).toBeUndefined();
      effect(() => obj[obj.c]);
      const depC = getDepFromReactive(toRaw(obj), "c");
      expect(getDepFromReactive(toRaw(obj), "a")).toHaveLength(1);
      expect(getDepFromReactive(toRaw(obj), "b")).toBeUndefined();
      expect(depC).toHaveLength(1);
      obj.c = "b";
      obj.a = 4;
      expect(getDepFromReactive(toRaw(obj), "a")).toBeUndefined();
      expect(getDepFromReactive(toRaw(obj), "b")).toHaveLength(1);
      expect(getDepFromReactive(toRaw(obj), "c")).toBe(depC);
      expect(depC).toHaveLength(1);
    });
  });
});
