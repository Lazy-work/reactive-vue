import React from "react";
import { isRef, ref } from "../../src/ref";
import {
  isProxy,
  isReactive,
  markRaw,
  reactive,
  readonly,
  shallowReactive,
  shallowReadonly,
  toRaw,
} from "../../src/reactive";
import { computed } from "../../src/ref";
import { watchEffect as effect } from "../../src/effect";
import { act, render } from "@testing-library/react";
import { reactivity } from "../../src/index";

describe("reactivity/reactive", () => {
  test("Object", () => {
    let original = { foo: 1 };
    let observed = reactive(original);

    const Comp = reactivity(() => {
      original = { foo: 1 };
      observed = reactive(original);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(observed).not.toBe(original);
    expect(isReactive(observed)).toBe(true);
    expect(isReactive(original)).toBe(false);
    // get
    expect(observed.foo).toBe(1);
    // has
    expect("foo" in observed).toBe(true);
    // ownKeys
    expect(Object.keys(observed)).toEqual(["foo"]);
  });

  test("proto", () => {
    let obj = {};
    let reactiveObj = reactive(obj);

    const Comp = reactivity(() => {
      obj = {};
      reactiveObj = reactive(obj);

      const prototype = reactiveObj["__proto__"];
      const otherObj = { data: ["a"] };
      expect(isReactive(otherObj)).toBe(false);
      const reactiveOther = reactive(otherObj);
      expect(isReactive(reactiveOther)).toBe(true);
      expect(reactiveOther.data[0]).toBe("a");
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(isReactive(reactiveObj)).toBe(true);
  });

  test("nested reactives", () => {
    let original;
    let observed;

    const Comp = reactivity(() => {
      original = {
        nested: {
          foo: 1,
        },
        array: [{ bar: 2 }],
      };
      observed = reactive(original);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(isReactive(observed.nested)).toBe(true);
    expect(isReactive(observed.array)).toBe(true);
    expect(isReactive(observed.array[0])).toBe(true);
  });

  test("observing subtypes of IterableCollections(Map, Set)", () => {
    // subtypes of Map
    class CustomMap extends Map {}

    // subtypes of Set
    class CustomSet extends Set {}

    let cmap, cset, dummy;
    const Comp = reactivity(() => {
      cmap = reactive(new CustomMap());

      cset = reactive(new CustomSet());
      effect(() => (dummy = cset.has("value")));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(cmap).toBeInstanceOf(Map);
    expect(isReactive(cmap)).toBe(true);
    act(() => cmap.set("key", {}));
    expect(isReactive(cmap.get("key"))).toBe(true);

    expect(cset).toBeInstanceOf(Set);
    expect(isReactive(cset)).toBe(true);

    expect(dummy).toBe(false);
    act(() => cset.add("value"));
    expect(dummy).toBe(true);
    act(() => cset.delete("value"));
    expect(dummy).toBe(false);
  });

  test("observing subtypes of WeakCollections(WeakMap, WeakSet)", () => {
    // subtypes of WeakMap
    class CustomMap extends WeakMap {}

    // subtypes of WeakSet
    class CustomSet extends WeakSet {}
    let cmap, cset, dummy;
    const key = {};
    const Comp = reactivity(() => {
      cmap = reactive(new CustomMap());

      cset = reactive(new CustomSet());
      effect(() => (dummy = cset.has(key)));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(cmap).toBeInstanceOf(WeakMap);
    expect(isReactive(cmap)).toBe(true);

    act(() => cmap.set(key, {}));
    expect(isReactive(cmap.get(key))).toBe(true);

    expect(cset).toBeInstanceOf(WeakSet);
    expect(isReactive(cset)).toBe(true);

    expect(dummy).toBe(false);
    act(() => cset.add(key));
    expect(dummy).toBe(true);
    act(() => cset.delete(key));
    expect(dummy).toBe(false);
  });

  test("observed value should proxy mutations to original (Object)", () => {
    let original: any;
    let observed;

    const Comp = reactivity(() => {
      original = { foo: 1 };
      observed = reactive(original);

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    // set
    act(() => (observed.bar = 1));
    expect(observed.bar).toBe(1);
    expect(original.bar).toBe(1);
    // delete
    act(() => delete observed.foo);
    expect("foo" in observed).toBe(false);
    expect("foo" in original).toBe(false);
  });

  test("original value change should reflect in observed value (Object)", () => {
    let original: any;
    let observed;

    const Comp = reactivity(() => {
      original = { foo: 1 };
      observed = reactive(original);

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    // set
    act(() => (original.bar = 1));
    expect(original.bar).toBe(1);
    expect(observed.bar).toBe(1);
    // delete
    act(() => delete original.foo);
    expect("foo" in original).toBe(false);
    expect("foo" in observed).toBe(false);
  });

  test("setting a property with an unobserved value should wrap with reactive", () => {
    let observed;
    let raw;

    const Comp = reactivity(() => {
      observed = reactive<{ foo?: object }>({});
      raw = {};
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    act(() => (observed.foo = raw));
    expect(observed.foo).not.toBe(raw);
    expect(isReactive(observed.foo)).toBe(true);
  });

  test("observing already observed value should return same Proxy", () => {
    let original;
    let observed;
    let observed2;

    const Comp = reactivity(() => {
      original = { foo: 1 };
      observed = reactive(original);
      observed2 = reactive(observed);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(observed2).toBe(observed);
  });

  test("observing the same value multiple times should return same Proxy", () => {
    let original;
    let observed;
    let observed2;

    const Comp = reactivity(() => {
      original = { foo: 1 };
      observed = reactive(original);
      observed2 = reactive(original);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(observed2).toBe(observed);
  });

  test("should not pollute original object with Proxies", () => {
    let original: any;
    let original2;
    let observed;
    let observed2;

    const Comp = reactivity(() => {
      original = { foo: 1 };
      original2 = { bar: 2 };
      observed = reactive(original);
      observed2 = reactive(original2);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    act(() => (observed.bar = observed2));
    expect(observed.bar).toBe(observed2);
    expect(original.bar).toBe(original2);
  });

  // #1246
  test("mutation on objects using reactive as prototype should not trigger", () => {
    let observed;
    let original;
    let dummy;

    const Comp = reactivity(() => {
      observed = reactive({ foo: 1 });
      original = Object.create(observed);
      effect(() => (dummy = original.foo));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);
    act(() => (observed.foo = 2));
    expect(dummy).toBe(2);
    act(() => (original.foo = 3));
    expect(dummy).toBe(2);
    act(() => (original.foo = 4));
    expect(dummy).toBe(2);
  });

  test("toRaw", () => {
    let original;
    let observed;

    const Comp = reactivity(() => {
      original = { foo: 1 };
      observed = reactive(original);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(toRaw(observed)).toBe(original);
    expect(toRaw(original)).toBe(original);
  });

  test("toRaw on object using reactive as prototype", () => {
    let original;
    let observed;
    let inherted;

    const Comp = reactivity(() => {
      original = { foo: 1 };
      observed = reactive(original);
      inherted = Object.create(observed);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(toRaw(inherted)).toBe(inherted);
  });

  test("toRaw on user Proxy wrapping reactive", () => {
    let original;
    let re;
    let obj;
    let raw;

    const Comp = reactivity(() => {
      original = {};
      re = reactive(original);
      obj = new Proxy(re, {});
      raw = toRaw(obj);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(raw).toBe(original);
  });

  test("should not unwrap Ref<T>", () => {
    let observedNumberRef;
    let observedObjectRef;
    const Comp = reactivity(() => {
      observedNumberRef = reactive(ref(1));
      observedObjectRef = reactive(ref({ foo: 1 }));
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(isRef(observedNumberRef)).toBe(true);
    expect(isRef(observedObjectRef)).toBe(true);
  });

  test("should unwrap computed refs", () => {
    // readonly
    let a;
    // writable
    let b;
    let obj;
    const Comp = reactivity(() => {
      // readonly
      a = computed(() => 1);
      // writable
      b = computed({
        get: () => 1,
        set: () => {},
      });
      obj = reactive({ a, b });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    act(() => {
      // check type
      obj.a + 1;
      obj.b + 1;
    });

    expect(typeof obj.a).toBe(`number`);
    expect(typeof obj.b).toBe(`number`);
  });

  test("should allow setting property from a ref to another ref", () => {
    let foo;
    let bar;
    let observed;
    let dummy;
    const Comp = reactivity(() => {
      foo = ref(0);
      bar = ref(1);
      observed = reactive({ a: foo });
      dummy = computed(() => observed.a);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy.value).toBe(0);
    act(() => {
      // @ts-expect-error
      observed.a = bar;
    });
    expect(dummy.value).toBe(1);

    act(() => {
      bar.value++;
    });
    expect(dummy.value).toBe(2);
  });

  test("non-observable values", () => {
    const assertValue = (value: any) => {
      reactive(value);
      expect(
        `value cannot be made reactive: ${String(value)}`
      ).toHaveBeenWarnedLast();
    };

    // number
    assertValue(1);
    // string
    assertValue("foo");
    // boolean
    assertValue(false);
    // null
    assertValue(null);
    // undefined
    assertValue(undefined);
    // symbol
    const s = Symbol();
    assertValue(s);
    // bigint
    const bn = BigInt("9007199254740991");
    assertValue(bn);

    // built-ins should work and return same value
    const p = Promise.resolve();
    expect(reactive(p)).toBe(p);
    const r = new RegExp("");
    expect(reactive(r)).toBe(r);
    const d = new Date();
    expect(reactive(d)).toBe(d);
  });

  test("markRaw", () => {
    let obj;

    const Comp = reactivity(() => {
      obj = reactive({
        foo: { a: 1 },
        bar: markRaw({ b: 2 }),
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(isReactive(obj.foo)).toBe(true);
    expect(isReactive(obj.bar)).toBe(false);
  });

  test("markRaw should skip non-extensible objects", () => {
    const obj = Object.seal({ foo: 1 });
    expect(() => markRaw(obj)).not.toThrowError();
  });

  test("should not observe non-extensible objects", () => {
    const obj = reactive({
      foo: Object.preventExtensions({ a: 1 }),
      // sealed or frozen objects are considered non-extensible as well
      bar: Object.freeze({ a: 1 }),
      baz: Object.seal({ a: 1 }),
    });
    expect(isReactive(obj.foo)).toBe(false);
    expect(isReactive(obj.bar)).toBe(false);
    expect(isReactive(obj.baz)).toBe(false);
  });

  test("should not observe objects with __v_skip", () => {
    const original = {
      foo: 1,
      __v_skip: true,
    };
    const observed = reactive(original);
    expect(isReactive(observed)).toBe(false);
  });

  test("hasOwnProperty edge case: Symbol values", () => {
    let key;
    let obj;
    let dummy;

    const Comp = reactivity(() => {
      key = Symbol();
      obj = reactive({ [key]: 1 }) as { [key]?: 1 };
      dummy;
      effect(() => {
        dummy = obj.hasOwnProperty(key);
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(true);

    act(() => {
      delete obj[key];
    });
    expect(dummy).toBe(false);
  });

  test("hasOwnProperty edge case: non-string values", () => {
    let key;
    let obj;
    let dummy;

    effect(() => {
      // @ts-expect-error
      dummy = obj.hasOwnProperty(key);
    });    
    const Comp = reactivity(() => {
      key = {};
      obj = reactive({ "[object Object]": 1 }) as { "[object Object]"?: 1 };
      dummy;
      effect(() => {
        dummy = obj.hasOwnProperty(key);
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(true);

    act(() => {
      // @ts-expect-error
      delete obj[key];
    });
    expect(dummy).toBe(false);
  });

  test("isProxy", () => {
    const foo = {};
    expect(isProxy(foo)).toBe(false);

    const fooRe = reactive(foo);
    expect(isProxy(fooRe)).toBe(true);

    const fooSRe = shallowReactive(foo);
    expect(isProxy(fooSRe)).toBe(true);

    const barRl = readonly(foo);
    expect(isProxy(barRl)).toBe(true);

    const barSRl = shallowReadonly(foo);
    expect(isProxy(barSRl)).toBe(true);

    const c = computed(() => {});
    expect(isProxy(c)).toBe(false);
  });
});
