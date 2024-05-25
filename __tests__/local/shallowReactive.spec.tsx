import React from "react";
import {
  isReactive,
  isShallow,
  reactive,
  shallowReactive,
  shallowReadonly,
} from "../../src/reactive";

import { watchEffect as effect } from "../../src/effect/directives";
import { type Ref, isRef, ref } from "../../src/ref";
import { act, render } from "@testing-library/react";
import { reactivity } from "../../src";

describe("shallowReactive", () => {
  test("should not make non-reactive properties reactive", () => {
    const props = shallowReactive({ n: { foo: 1 } });
    expect(isReactive(props.n)).toBe(false);
  });

  test("should keep reactive properties reactive", () => {
    const props: any = shallowReactive({ n: reactive({ foo: 1 }) });
    props.n = reactive({ foo: 2 });
    expect(isReactive(props.n)).toBe(true);
  });

  // #2843
  test("should allow shallow and normal reactive for same target", () => {
    const original = { foo: {} };
    const shallowProxy = shallowReactive(original);
    const reactiveProxy = reactive(original);
    expect(shallowProxy).not.toBe(reactiveProxy);
    expect(isReactive(shallowProxy.foo)).toBe(false);
    expect(isReactive(reactiveProxy.foo)).toBe(true);
  });

  test("isShallow", () => {
    expect(isShallow(shallowReactive({}))).toBe(true);
    expect(isShallow(shallowReadonly({}))).toBe(true);
  });

  // #5271
  test("should respect shallow reactive nested inside reactive on reset", () => {
    const r = reactive({ foo: shallowReactive({ bar: {} }) });
    expect(isShallow(r.foo)).toBe(true);
    expect(isReactive(r.foo.bar)).toBe(false);

    r.foo = shallowReactive({ bar: {} });
    expect(isShallow(r.foo)).toBe(true);
    expect(isReactive(r.foo.bar)).toBe(false);
  });

  // vuejs/vue#12597
  test("should not unwrap refs", () => {
    const foo = shallowReactive({
      bar: ref(123),
    });
    expect(isRef(foo.bar)).toBe(true);
    expect(foo.bar.value).toBe(123);
  });

  // vuejs/vue#12688
  test("should not mutate refs", () => {
    let original;
    let foo;
    const Comp = reactivity(() => {
      original = ref(123);
      foo = shallowReactive<{ bar: Ref<number> | number }>({
        bar: original,
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(foo.bar).toBe(original);
    act(() => {
      foo.bar = 234;
    });
    expect(foo.bar).toBe(234);
    expect(original.value).toBe(123);
  });

  test("should respect shallow/deep versions of same target on access", () => {
    const original = {};
    const shallow = shallowReactive(original);
    const deep = reactive(original);
    const r = reactive({ shallow, deep });
    expect(r.shallow).toBe(shallow);
    expect(r.deep).toBe(deep);
  });

  describe("collections", () => {
    test("should be reactive", () => {
      let shallowSet;
      let a;
      let size;

      const Comp = reactivity(() => {
        shallowSet = shallowReactive(new Set());
        a = {};

        effect(() => {
          size = shallowSet.size;
        });
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(size).toBe(0);

      act(() => {
        shallowSet.add(a);
      });
      expect(size).toBe(1);

      act(() => {
        shallowSet.delete(a);
      });
      expect(size).toBe(0);
    });

    test("should not observe when iterating", () => {
      const shallowSet = shallowReactive(new Set());
      const a = {};
      shallowSet.add(a);

      const spreadA = [...shallowSet][0];
      expect(isReactive(spreadA)).toBe(false);
    });

    test("should not get reactive entry", () => {
      const shallowMap = shallowReactive(new Map());
      const a = {};
      const key = "a";

      shallowMap.set(key, a);

      expect(isReactive(shallowMap.get(key))).toBe(false);
    });

    test("should not get reactive on foreach", () => {
      const shallowSet = shallowReactive(new Set());
      const a = {};
      shallowSet.add(a);

      shallowSet.forEach((x) => expect(isReactive(x)).toBe(false));
    });

    // #1210
    test("onTrack on called on objectSpread", () => {
      let onTrackFn = vi.fn();
      let shallowSet = shallowReactive(new Set());
      let a;

      const Comp = reactivity(() => {
        onTrackFn = vi.fn();
        shallowSet = shallowReactive(new Set());
        let a;
        effect(
          () => {
            a = Array.from(shallowSet);
          },
          {
            onTrack: onTrackFn,
          }
        );
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(a).toMatchObject([]);
      expect(onTrackFn).toHaveBeenCalled();
    });
  });

  describe("array", () => {
    test("should be reactive", () => {
      let shallowArray;
      let a;
      let size;

      const Comp = reactivity(() => {
        shallowArray = shallowReactive<unknown[]>([]);
        a = {};

        effect(() => {
          size = shallowArray.length;
        });
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(size).toBe(0);

      act(() => {
        shallowArray.push(a);
      });
      expect(size).toBe(1);

      act(() => {
        shallowArray.pop();
      });
      expect(size).toBe(0);
    });
    test("should not observe when iterating", () => {
      const shallowArray = shallowReactive<object[]>([]);
      const a = {};
      shallowArray.push(a);

      const spreadA = [...shallowArray][0];
      expect(isReactive(spreadA)).toBe(false);
    });

    test("onTrack on called on objectSpread", () => {
      let onTrackFn;
      let shallowArray;
      let a;

      const Comp = reactivity(() => {
        onTrackFn = vi.fn();
        shallowArray = shallowReactive([]);
        a = {};

        effect(
          () => {
            a = Array.from(shallowArray);
          },
          {
            onTrack: onTrackFn,
          }
        );
        return () => <div />;
      });

      act(() => {
        render(<Comp />);
      });
      expect(a).toMatchObject([]);
      expect(onTrackFn).toHaveBeenCalled();
    });
  });
});
