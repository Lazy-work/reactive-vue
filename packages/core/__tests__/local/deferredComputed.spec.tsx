import { act, render } from "@testing-library/react";
import {
  computed,
  watchEffect as effect,
  reactivity,
  ref,
} from "../../src/index";

describe("deferred computed", () => {
  test("should not trigger if value did not change", () => {
    let src;
    let c;
    let spy;

    const Comp = reactivity(() => {
      src = ref(0);
      c = computed(() => src.value % 2);
      spy = vi.fn();
      effect(() => {
        spy(c.value);
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(spy).toHaveBeenCalledTimes(1);
    act(() => (src.value = 2));

    // should not trigger
    expect(spy).toHaveBeenCalledTimes(1);

    act(() => (src.value = 3));
    act(() => (src.value = 5));
    // should trigger because latest value changes
    expect(spy).toHaveBeenCalledTimes(2);
  });

  test("chained computed trigger", () => {
    const effectSpy = vi.fn();
    const c1Spy = vi.fn();
    const c2Spy = vi.fn();

    let src;
    let c1;
    let c2;

    const Comp = reactivity(() => {
      src = ref(0);
      c1 = computed(() => {
        c1Spy();
        return src.value % 2;
      });
      c2 = computed(() => {
        c2Spy();
        return c1.value + 1;
      });

      effect(() => {
        effectSpy(c2.value);
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });

    expect(c1Spy).toHaveBeenCalledTimes(1);
    expect(c2Spy).toHaveBeenCalledTimes(1);
    expect(effectSpy).toHaveBeenCalledTimes(1);

    act(() => (src.value = 1));
    expect(c1Spy).toHaveBeenCalledTimes(2);
    expect(c2Spy).toHaveBeenCalledTimes(2);
    expect(effectSpy).toHaveBeenCalledTimes(2);
  });

  test("chained computed avoid re-compute", () => {
    const effectSpy = vi.fn();
    const c1Spy = vi.fn();
    const c2Spy = vi.fn();

    let src;
    let c1;
    let c2;

    const Comp = reactivity(() => {
      src = ref(0);
      c1 = computed(() => {
        c1Spy();
        return src.value % 2;
      });
      c2 = computed(() => {
        c2Spy();
        return c1.value + 1;
      });

      effect(() => {
        effectSpy(c2.value);
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });

    expect(effectSpy).toHaveBeenCalledTimes(1);
    act(() => (src.value = 2));
    act(() => (src.value = 4));
    act(() => (src.value = 6));
    expect(c1Spy).toHaveBeenCalledTimes(4);
    // c2 should not have to re-compute because c1 did not change.
    expect(c2Spy).toHaveBeenCalledTimes(1);
    // effect should not trigger because c2 did not change.
    expect(effectSpy).toHaveBeenCalledTimes(1);
  });

  test("chained computed value invalidation", () => {
    const effectSpy = vi.fn();
    const c1Spy = vi.fn();
    const c2Spy = vi.fn();

    let src;
    let c1;
    let c2;

    const Comp = reactivity(() => {
      src = ref(0);
      c1 = computed(() => {
        c1Spy();
        return src.value % 2;
      });
      c2 = computed(() => {
        c2Spy();
        return c1.value + 1;
      });

      effect(() => {
        effectSpy(c2.value);
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });

    expect(effectSpy).toHaveBeenCalledTimes(1);
    expect(effectSpy).toHaveBeenCalledWith(1);
    expect(c2.value).toBe(1);

    expect(c1Spy).toHaveBeenCalledTimes(1);
    expect(c2Spy).toHaveBeenCalledTimes(1);

    act(() => (src.value = 1));
    // value should be available sync
    expect(c2.value).toBe(2);
    expect(c2Spy).toHaveBeenCalledTimes(2);
  });

  test("sync access of invalidated chained computed should not prevent final effect from running", () => {
    const effectSpy = vi.fn();
    const c1Spy = vi.fn();
    const c2Spy = vi.fn();

    let src;
    let c1;
    let c2;

    const Comp = reactivity(() => {
      src = ref(0);
      c1 = computed(() => {
        c1Spy();
        return src.value % 2;
      });
      c2 = computed(() => {
        c2Spy();
        return c1.value + 1;
      });

      effect(() => {
        effectSpy(c2.value);
      });
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(effectSpy).toHaveBeenCalledTimes(1);

    act(() => (src.value = 1));
    // sync access c2
    act(() => c2.value);
    expect(effectSpy).toHaveBeenCalledTimes(2);
  });

  test("should not compute if deactivated before scheduler is called", () => {
    const c1Spy = vi.fn();
    let src;
    let c1;

    const Comp = reactivity(() => {
      src = ref(0);
      c1 = computed(() => {
        c1Spy();
        return src.value % 2;
      });

      effect(() => c1.value);
      return () => <div />;
    });
    act(() => {
      render(<Comp />);
    });
    expect(c1Spy).toHaveBeenCalledTimes(1);

    c1.effect.stop();
    // trigger
    act(() => src.value++);
    expect(c1Spy).toHaveBeenCalledTimes(1);
  });
});
