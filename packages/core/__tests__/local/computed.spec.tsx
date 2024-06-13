import {
  type DebuggerEvent,
  ITERATE_KEY,
  TrackOpTypes,
  TriggerOpTypes,
  type WritableComputedRef,
  computed,
  watchEffect as effect,
  isReadonly,
  reactive,
  reactivity,
  ref,
  shallowRef,
  toRaw,
} from "../../src/index";
import React from "react";
import { DirtyLevels } from "../../src/constants";
import { COMPUTED_SIDE_EFFECT_WARN } from "../../src/ref";
import { act, render } from "@testing-library/react";

describe("reactivity/computed", () => {
  it("should return updated value", () => {
    let value;
    let cValue;

    const Comp = reactivity(() => {
      value = reactive<{ foo?: number }>({});
      cValue = computed(() => value.foo);
      return () => <div />;
    });

    render(<Comp />);
    expect(cValue.value).toBe(undefined);
    value.foo = 1;
    expect(cValue.value).toBe(1);
  });

  it("should compute lazily", () => {
    const value = reactive<{ foo?: number }>({});
    const getter = vi.fn(() => value.foo);
    const cValue = computed(getter);

    // lazy
    expect(getter).not.toHaveBeenCalled();

    expect(cValue.value).toBe(undefined);
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(1);

    // should not compute until needed
    value.foo = 1;
    expect(getter).toHaveBeenCalledTimes(1);

    // now it should compute
    expect(cValue.value).toBe(1);
    expect(getter).toHaveBeenCalledTimes(2);

    // should not compute again
    cValue.value;
    expect(getter).toHaveBeenCalledTimes(2);
  });

  it("should trigger effect", async () => {
    let value;
    let cValue;
    let dummy;

    const Comp = reactivity(() => {
      value = reactive<{ foo?: number }>({});
      cValue = computed(() => value.foo);
      effect(() => {
        dummy = cValue.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(undefined);

    act(() => {
      value.foo = 1;
    });
    expect(dummy).toBe(1);
  });

  it("should work when chained", () => {
    let value;
    let c1;
    let c2;

    const Comp = reactivity(() => {
      value = reactive({ foo: 0 });
      c1 = computed(() => value.foo);
      c2 = computed(() => c1.value + 1);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(c2.value).toBe(1);
    expect(c1.value).toBe(0);
    act(() => value.foo++);
    expect(c2.value).toBe(2);
    expect(c1.value).toBe(1);
  });

  it("should trigger effect when chained", () => {
    let value;
    let getter1;
    let getter2;
    let c1;
    let c2;
    let dummy;

    const Comp = reactivity(() => {
      value = reactive({ foo: 0 });
      getter1 = vi.fn(() => value.foo);
      getter2 = vi.fn(() => {
        return c1.value + 1;
      });
      c1 = computed(getter1);
      c2 = computed(getter2);

      effect(() => {
        dummy = c2.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(1);
    expect(getter1).toHaveBeenCalledTimes(1);
    expect(getter2).toHaveBeenCalledTimes(1);
    act(() => value.foo++);
    expect(dummy).toBe(2);
    // should not result in duplicate calls
    expect(getter1).toHaveBeenCalledTimes(2);
    expect(getter2).toHaveBeenCalledTimes(2);
  });

  it("should trigger effect when chained (mixed invocations)", () => {
    let value;
    let getter1;
    let getter2;
    let c1;
    let c2;

    let dummy;
    const Comp = reactivity(() => {
      value = reactive({ foo: 0 });
      getter1 = vi.fn(() => value.foo);
      getter2 = vi.fn(() => {
        return c1.value + 1;
      });
      c1 = computed(getter1);
      c2 = computed(getter2);

      effect(() => {
        dummy = c1.value + c2.value;
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);

    expect(getter1).toHaveBeenCalledTimes(1);
    expect(getter2).toHaveBeenCalledTimes(1);
    act(() => value.foo++);
    expect(dummy).toBe(3);
    // should not result in duplicate calls
    expect(getter1).toHaveBeenCalledTimes(2);
    expect(getter2).toHaveBeenCalledTimes(2);
  });

  it("should no longer update when stopped", () => {
    let value;
    let cValue;
    let dummy;

    const Comp = reactivity(() => {
      value = reactive<{ foo?: number }>({});
      cValue = computed(() => value.foo);

      effect(() => {
        dummy = cValue.value;
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(undefined);
    act(() => (value.foo = 1));
    expect(dummy).toBe(1);
    cValue.effect.stop();
    act(() => (value.foo = 2));
    expect(dummy).toBe(1);
  });

  it("should support setter", () => {
    let n;
    let plusOne;
    const Comp = reactivity(() => {
      n = ref(1);
      plusOne = computed({
        get: () => n.value + 1,
        set: (val) => {
          n.value = val - 1;
        },
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });

    expect(plusOne.value).toBe(2);
    act(() => n.value++);
    expect(plusOne.value).toBe(3);

    act(() => (plusOne.value = 0));
    expect(n.value).toBe(-1);
  });

  it("should trigger effect w/ setter", () => {
    let n;
    let plusOne;

    let dummy;
    const Comp = reactivity(() => {
      n = ref(1);
      plusOne = computed({
        get: () => n.value + 1,
        set: (val) => {
          n.value = val - 1;
        },
      });

      effect(() => {
        dummy = n.value;
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);

    act(() => (plusOne.value = 0));
    expect(dummy).toBe(-1);
  });

  // #5720
  it("should invalidate before non-computed effects", () => {
    let plusOneValues: number[];
    let n;
    let plusOne;
      
    const Comp = reactivity(() => {
      n = ref(0);
      plusOne = computed(() => n.value + 1);
      effect(() => {
        n.value;
        plusOneValues.push(plusOne.value);
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    // access plusOne, causing it to be non-dirty
    plusOne.value;
    // mutate n
    act(() => n.value++);
    // on the 2nd run, plusOne.value should have already updated.

    expect(plusOneValues).toMatchObject([1, 2]);
  });

  it("should warn if trying to set a readonly computed", () => {
    let n;
    let plusOne;
    
    const Comp = reactivity(() => {
      n = ref(1);
      plusOne = computed(() => n.value + 1);
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });

    act(
      () => (plusOne as WritableComputedRef<number>).value++ // Type cast to prevent TS from preventing the error
    );
    expect(
      "Write operation failed: computed value is readonly"
    ).toHaveBeenWarnedLast();
  });

  it("should be readonly", () => {
    let a;
    let x;
    const Comp = reactivity(() => {
      a = { a: 1 };
      x = computed(() => a);
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(isReadonly(x)).toBe(true);
    expect(isReadonly(x.value)).toBe(false);
    expect(isReadonly(x.value.a)).toBe(false);
    const z = computed<typeof a>({
      get() {
        return a;
      },
      set(v) {
        a = v;
      },
    });
    expect(isReadonly(z)).toBe(false);
    expect(isReadonly(z.value.a)).toBe(false);
  });

  it("should expose value when stopped", () => {
    let x = computed(() => 1);
    const Comp = reactivity(() => {
      x = computed(() => 1);
      x.effect.stop();
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(x.value).toBe(1);
  });

  it("debug: onTrack", () => {
    const events: DebuggerEvent[] = [];
    const onTrack = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    let obj;
    let c;
    const Comp = reactivity(() => {
      obj = reactive({ foo: 1, bar: 2 });
      c = computed(() => (obj.foo, "bar" in obj, Object.keys(obj)), {
        onTrack,
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(c.value).toEqual(["foo", "bar"]);
    expect(onTrack).toHaveBeenCalledTimes(3);
    expect(events).toEqual([
      {
        effect: c.effect,
        target: toRaw(obj),
        type: TrackOpTypes.GET,
        key: "foo",
      },
      {
        effect: c.effect,
        target: toRaw(obj),
        type: TrackOpTypes.HAS,
        key: "bar",
      },
      {
        effect: c.effect,
        target: toRaw(obj),
        type: TrackOpTypes.ITERATE,
        key: ITERATE_KEY,
      },
    ]);
  });

  it("debug: onTrigger", () => {
    const events: DebuggerEvent[] = [];
    const onTrigger = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    let obj;
    let c;

    const Comp = reactivity(() => {
      obj = reactive<{ foo?: number }>({ foo: 1 });
      c = computed(() => obj.foo, { onTrigger });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    // computed won't trigger compute until accessed
    act(() => c.value);

    act(() => obj.foo!++);
    expect(c.value).toBe(2);
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(events[0]).toEqual({
      effect: c.effect,
      target: toRaw(obj),
      type: TriggerOpTypes.SET,
      key: "foo",
      oldValue: 1,
      newValue: 2,
    });

    delete obj.foo;
    expect(c.value).toBeUndefined();
    expect(onTrigger).toHaveBeenCalledTimes(2);
    expect(events[1]).toEqual({
      effect: c.effect,
      target: toRaw(obj),
      type: TriggerOpTypes.DELETE,
      key: "foo",
      oldValue: 2,
    });
  });

  // https://github.com/vuejs/core/pull/5912#issuecomment-1497596875
  it("should query deps dirty sequentially", () => {
    const cSpy = vi.fn();

    let a;
    let b;
    let c;
    let d;

    const Comp = reactivity(() => {
      a = ref<null | { v: number }>({
        v: 1,
      });
      b = computed(() => {
        return a.value;
      });
      c = computed(() => {
        cSpy();
        return b.value?.v;
      });
      d = computed(() => {
        if (b.value) {
          return c.value;
        }
        return 0;
      });

      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    act(() => {
      d.value;
      a.value!.v = 2;
      a.value = null;
      d.value;
    });
    expect(cSpy).toHaveBeenCalledTimes(1);
  });

  // https://github.com/vuejs/core/pull/5912#issuecomment-1738257692
  it("chained computed dirty reallocation after querying dirty", () => {
    let _msg: string | undefined;

    let items;
    let isLoaded;
    let msg;

    const Comp = reactivity(() => {
      items = ref<number[]>();
      isLoaded = computed(() => {
        return !!items.value;
      });
      msg = computed(() => {
        if (isLoaded.value) {
          return "The items are loaded";
        } else {
          return "The items are not loaded";
        }
      });

      effect(() => {
        _msg = msg.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    act(() => {
      items.value = [1, 2, 3];
      items.value = [1, 2, 3];
      items.value = undefined;
    });

    expect(_msg).toBe("The items are not loaded");
  });

  it("chained computed dirty reallocation after trigger computed getter", () => {
    let _msg: string | undefined;

    let items;
    let isLoaded;
    let msg;

    const Comp = reactivity(() => {
      items = ref<number[]>();
      isLoaded = computed(() => {
        return !!items.value;
      });
      msg = computed(() => {
        if (isLoaded.value) {
          return "The items are loaded";
        } else {
          return "The items are not loaded";
        }
      });

      effect(() => {
        _msg = msg.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    act(() => {
      _msg = msg.value;
      items.value = [1, 2, 3];
      isLoaded.value; // <- trigger computed getter
      _msg = msg.value;
      items.value = undefined;
      _msg = msg.value;
    });

    expect(_msg).toBe("The items are not loaded");
  });

  // https://github.com/vuejs/core/pull/5912#issuecomment-1739159832
  it.skip("deps order should be consistent with the last time get value", () => {
    const cSpy = vi.fn();

    let a;
    let b;
    let c;
    let d;
    let e;

    const Comp = reactivity(() => {
       a = ref(0);
       b = computed(() => {
        return a.value % 3 !== 0;
      });
       c = computed(() => {
        cSpy();
        if (a.value % 3 === 2) {
          return "expensive";
        }
        return "cheap";
      });
       d = computed(() => {
        return a.value % 3 === 2;
      });
       e = computed(() => {
        if (b.value) {
          if (d.value) {
            return "Avoiding expensive calculation";
          }
        }
        return c.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    act(() => {
      e.value;
      a.value++;
      e.value;
    })

    expect(e.effect.deps.length).toBe(3);
    expect(e.effect.deps.indexOf((b as any).dep)).toBe(0);
    expect(e.effect.deps.indexOf((d as any).dep)).toBe(1);
    expect(e.effect.deps.indexOf((c as any).dep)).toBe(2);
    expect(cSpy).toHaveBeenCalledTimes(2);

    a.value++;
    e.value;

    expect(cSpy).toHaveBeenCalledTimes(2);
  });

  it("should trigger by the second computed that maybe dirty", () => {
    const cSpy = vi.fn();

    const src1 = ref(0);
    const src2 = ref(0);
    const c1 = computed(() => src1.value);
    const c2 = computed(() => (src1.value % 2) + src2.value);
    const c3 = computed(() => {
      cSpy();
      c1.value;
      c2.value;
    });

    c3.value;
    src1.value = 2;
    c3.value;
    expect(cSpy).toHaveBeenCalledTimes(2);
    src2.value = 1;
    c3.value;
    expect(cSpy).toHaveBeenCalledTimes(3);
  });

  it("should trigger the second effect", () => {
    const fnSpy = vi.fn();
    const v = ref(1);
    const c = computed(() => v.value);

    effect(() => {
      c.value;
    });
    effect(() => {
      c.value;
      fnSpy();
    });

    expect(fnSpy).toBeCalledTimes(1);
    v.value = 2;
    expect(fnSpy).toBeCalledTimes(2);
  });

  it.skip("should chained recurse effects clear dirty after trigger", () => {
    const v = ref(1);
    const c1 = computed(() => v.value);
    const c2 = computed(() => c1.value);

    c1.effect.allowRecurse = true;
    c2.effect.allowRecurse = true;
    c2.value;

    expect(c1.effect._dirtyLevel).toBe(DirtyLevels.NotDirty);
    expect(c2.effect._dirtyLevel).toBe(DirtyLevels.NotDirty);
  });

  it.skip("should chained computeds dirtyLevel update with first computed effect", () => {
    const v = ref(0);
    const c1 = computed(() => {
      if (v.value === 0) {
        v.value = 1;
      }
      return v.value;
    });
    const c2 = computed(() => c1.value);
    const c3 = computed(() => c2.value);

    c3.value;

    expect(c1.effect._dirtyLevel).toBe(DirtyLevels.Dirty);
    expect(c2.effect._dirtyLevel).toBe(
      DirtyLevels.MaybeDirty_ComputedSideEffect
    );
    expect(c3.effect._dirtyLevel).toBe(
      DirtyLevels.MaybeDirty_ComputedSideEffect
    );
    expect(COMPUTED_SIDE_EFFECT_WARN).toHaveBeenWarned();
  });

  it.skip("should work when chained(ref+computed)", () => {
    const v = ref(0);
    const c1 = computed(() => {
      if (v.value === 0) {
        v.value = 1;
      }
      return "foo";
    });
    const c2 = computed(() => v.value + c1.value);
    expect(c2.value).toBe("0foo");
    expect(c2.effect._dirtyLevel).toBe(DirtyLevels.Dirty);
    expect(c2.value).toBe("1foo");
    expect(COMPUTED_SIDE_EFFECT_WARN).toHaveBeenWarned();
  });

  it.skip("should trigger effect even computed already dirty", () => {
    const fnSpy = vi.fn();
    const v = ref(0);
    const c1 = computed(() => {
      if (v.value === 0) {
        v.value = 1;
      }
      return "foo";
    });
    const c2 = computed(() => v.value + c1.value);

    effect(() => {
      fnSpy();
      c2.value;
    });
    expect(fnSpy).toBeCalledTimes(1);
    expect(c1.effect._dirtyLevel).toBe(DirtyLevels.Dirty);
    expect(c2.effect._dirtyLevel).toBe(DirtyLevels.Dirty);
    v.value = 2;
    expect(fnSpy).toBeCalledTimes(2);
    expect(COMPUTED_SIDE_EFFECT_WARN).toHaveBeenWarned();
  });

  // #10185
  it.skip("should not override queried MaybeDirty result", () => {
    class Item {
      v = ref(0);
    }
    const v1 = shallowRef();
    const v2 = ref(false);
    const c1 = computed(() => {
      let c = v1.value;
      if (!v1.value) {
        c = new Item();
        v1.value = c;
      }
      return c.v.value;
    });
    const c2 = computed(() => {
      if (!v2.value) return "no";
      return c1.value ? "yes" : "no";
    });
    const c3 = computed(() => c2.value);

    c3.value;
    v2.value = true;
    expect(c2.effect._dirtyLevel).toBe(DirtyLevels.Dirty);
    expect(c3.effect._dirtyLevel).toBe(DirtyLevels.MaybeDirty);

    c3.value;
    expect(c1.effect._dirtyLevel).toBe(DirtyLevels.Dirty);
    expect(c2.effect._dirtyLevel).toBe(
      DirtyLevels.MaybeDirty_ComputedSideEffect
    );
    expect(c3.effect._dirtyLevel).toBe(
      DirtyLevels.MaybeDirty_ComputedSideEffect
    );

    v1.value.v.value = 999;
    expect(c1.effect._dirtyLevel).toBe(DirtyLevels.Dirty);
    expect(c2.effect._dirtyLevel).toBe(DirtyLevels.MaybeDirty);
    expect(c3.effect._dirtyLevel).toBe(DirtyLevels.MaybeDirty);

    expect(c3.value).toBe("yes");
    expect(COMPUTED_SIDE_EFFECT_WARN).toHaveBeenWarned();
  });

  it.skip("should be not dirty after deps mutate (mutate deps in computed)", async () => {
    const state = reactive<any>({});
    const consumer = computed(() => {
      if (!("a" in state)) state.a = 1;
      return state.a;
    });
    const Comp = {
      setup: () => {
        nextTick().then(() => {
          state.a = 2;
        });
        return () => consumer.value;
      },
    };
    const root = nodeOps.createElement("div");
    render(h(Comp), root);
    await nextTick();
    await nextTick();
    expect(serializeInner(root)).toBe(`2`);
    expect(COMPUTED_SIDE_EFFECT_WARN).toHaveBeenWarned();
  });

  it.skip("should not trigger effect scheduler by recurse computed effect", async () => {
    const v = ref("Hello");
    const c = computed(() => {
      v.value += " World";
      return v.value;
    });
    const Comp = {
      setup: () => {
        return () => c.value;
      },
    };
    const root = nodeOps.createElement("div");

    render(h(Comp), root);
    await nextTick();
    expect(serializeInner(root)).toBe("Hello World");

    v.value += " World";
    await nextTick();
    expect(serializeInner(root)).toBe("Hello World World World World");
    expect(COMPUTED_SIDE_EFFECT_WARN).toHaveBeenWarned();
  });
});
