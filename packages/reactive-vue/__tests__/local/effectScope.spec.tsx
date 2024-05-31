import { act, render } from "@testing-library/react";
import { reactivity, watch, watchEffect } from "../../src/index";
import {
  type ComputedRef,
  computed,
  watchEffect as effect,
  effectScope,
  getCurrentScope,
  onScopeDispose,
  reactive,
  ref,
} from "../../src/index";
import EffectScope from "../../src/effect/EffectScope";

describe("reactivity/effect/scope", () => {
  it("should run", () => {
    let fnSpy;
    const Comp = reactivity(() => {
      fnSpy = vi.fn(() => {});
      effectScope().run(fnSpy);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(fnSpy).toHaveBeenCalledTimes(1);
  });

  it("should accept zero argument", () => {
    let scope;
    const Comp = reactivity(() => {
      scope = effectScope();
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(scope.effects.length).toBe(0);
  });

  it("should return run value", () => {
    let result;

    const Comp = reactivity(() => {
      result = effectScope().run(() => 1);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(result).toBe(1);
  });

  it("should work w/ active property", () => {
    let scope;

    const Comp = reactivity(() => {
      scope = effectScope();
      scope.run(() => 1);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(scope.active).toBe(true);
    scope.stop();
    expect(scope.active).toBe(false);
  });

  it("should collect the effects", () => {
    let scope;
    let dummy;
    let counter;
    const Comp = reactivity(() => {
      scope = effectScope();
      scope.run(() => {
        counter = reactive({ num: 0 });
        effect(() => (dummy = counter.num));
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(dummy).toBe(0);
    act(() => {
      counter.num = 7;
    });
    expect(dummy).toBe(7);
    expect(scope.effects.length).toBe(1);
  });

  it("stop", () => {
    let dummy, doubled;
    let counter;
    let scope;

    const Comp = reactivity(() => {
      counter = reactive({ num: 0 });
      scope = effectScope();
      scope.run(() => {
        effect(() => (dummy = counter.num));
        effect(() => (doubled = counter.num * 2));
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(scope.effects.length).toBe(2);

    expect(dummy).toBe(0);
    act(() => (counter.num = 7));
    expect(dummy).toBe(7);
    expect(doubled).toBe(14);

    act(() => {
      scope.stop();

      counter.num = 6;
    });
    expect(dummy).toBe(7);
    expect(doubled).toBe(14);
  });

  it("should collect nested scope", () => {
    let dummy, doubled;
    let counter;
    let scope;

    const Comp = reactivity(() => {
      counter = reactive({ num: 0 });
      scope = effectScope();
      scope.run(() => {
        effect(() => (dummy = counter.num));
        // nested scope
        effectScope().run(() => {
          effect(() => (doubled = counter.num * 2));
        });
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(scope.effects.length).toBe(1);
    expect(scope.scopes!.length).toBe(1);
    expect(scope.scopes![0]).toBeInstanceOf(EffectScope);

    expect(dummy).toBe(0);
    act(() => (counter.num = 7));
    expect(dummy).toBe(7);
    expect(doubled).toBe(14);

    act(() => {
      // stop the nested scope as well
      scope.stop();

      counter.num = 6;
    });
    expect(dummy).toBe(7);
    expect(doubled).toBe(14);
  });

  it("nested scope can be escaped", () => {
    let dummy, doubled;
    let counter;
    let scope;

    const Comp = reactivity(() => {
      counter = reactive({ num: 0 });
      scope = effectScope();

      scope.run(() => {
        effect(() => (dummy = counter.num));
        // nested scope
        effectScope(true).run(() => {
          effect(() => (doubled = counter.num * 2));
        });
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(scope.effects.length).toBe(1);

    expect(dummy).toBe(0);
    act(() => (counter.num = 7));
    expect(dummy).toBe(7);
    expect(doubled).toBe(14);

    act(() => {
      scope.stop();

      counter.num = 6;
    });
    expect(dummy).toBe(7);

    // nested scope should not be stopped
    expect(doubled).toBe(12);
  });

  it("able to run the scope", () => {
    let dummy, doubled, counter, scope;

    const Comp = reactivity(() => {
      counter = reactive({ num: 0 });
      scope = effectScope();

      scope.run(() => {
        effect(() => (dummy = counter.num));
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(scope.effects.length).toBe(1);

    scope.run(() => {
      effect(() => (doubled = counter.num * 2));
    });

    expect(scope.effects.length).toBe(2);

    act(() => (counter.num = 7));
    expect(dummy).toBe(7);
    expect(doubled).toBe(14);

    act(() => scope.stop());
  });

  it("can not run an inactive scope", () => {
    let dummy, doubled;
    let counter;
    let scope;

    const Comp = reactivity(() => {
      counter = reactive({ num: 0 });
      scope = effectScope();
      scope.run(() => {
        effect(() => (dummy = counter.num));
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(scope.effects.length).toBe(1);

    act(() => {
      scope.stop();

      scope.run(() => {
        effect(() => (doubled = counter.num * 2));
      });
    });
    expect(
      "[Vue warn] cannot run an inactive effect scope."
    ).toHaveBeenWarned();

    expect(scope.effects.length).toBe(1);

    act(() => (counter.num = 7));
    expect(dummy).toBe(0);
    expect(doubled).toBe(undefined);
  });

  it("should fire onScopeDispose hook", () => {
    let dummy = 0;

    let scope;
    const Comp = reactivity(() => {
      scope = effectScope();
      scope.run(() => {
        onScopeDispose(() => (dummy += 1));
        onScopeDispose(() => (dummy += 2));
      });

      scope.run(() => {
        onScopeDispose(() => (dummy += 4));
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(0);

    act(() => {
      scope.stop();
    });
    expect(dummy).toBe(7);
  });

  it("should warn onScopeDispose() is called when there is no active effect scope", () => {
    let spy;
    let scope;
    let dispose;
    const Comp = reactivity(() => {
      spy = vi.fn();
      scope = effectScope();
      scope.run(() => {
        onScopeDispose(spy);
      });

      onScopeDispose(spy);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(spy).toHaveBeenCalledTimes(0);

    expect(
      "[Vue warn] onScopeDispose() is called when there is no active effect scope to be associated with."
    ).toHaveBeenWarned();

    act(() => scope.stop());
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("should dereference child scope from parent scope after stopping child scope (no memleaks)", () => {
    let parent;
    let child;

    const Comp = reactivity(() => {
      parent = effectScope();
      child = parent.run(() => effectScope())!;
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(parent.scopes!.includes(child)).toBe(true);
    act(() => child.stop());
    expect(parent.scopes!.includes(child)).toBe(false);
  });

  it("test with higher level APIs", async () => {
    let r;

    let computedSpy;
    let watchSpy;
    let watchEffectSpy;

    let c: ComputedRef;
    let scope;
    const Comp = reactivity(() => {
      r = ref(1);

      computedSpy = vi.fn();
      watchSpy = vi.fn();
      watchEffectSpy = vi.fn();

      scope = effectScope();
      scope.run(() => {
        c = computed(() => {
          computedSpy();
          return r.value + 1;
        });

        watch(r, watchSpy);
        watchEffect(() => {
          watchEffectSpy();
          r.value;
        });
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    act(() => c!.value); // computed is lazy so trigger collection
    expect(computedSpy).toHaveBeenCalledTimes(1);
    expect(watchSpy).toHaveBeenCalledTimes(0);
    expect(watchEffectSpy).toHaveBeenCalledTimes(1);
    act(() => {
      r.value++;
      c!.value;
    });
    expect(computedSpy).toHaveBeenCalledTimes(2);
    expect(watchSpy).toHaveBeenCalledTimes(1);
    expect(watchEffectSpy).toHaveBeenCalledTimes(2);

    act(() => {
      scope.stop();

      r.value++;
      c!.value;
    });
    // should not trigger anymore
    expect(computedSpy).toHaveBeenCalledTimes(2);
    expect(watchSpy).toHaveBeenCalledTimes(1);
    expect(watchEffectSpy).toHaveBeenCalledTimes(2);
  });

  it("getCurrentScope() stays valid when running a detached nested EffectScope", () => {
    let parentScope = effectScope();

    const Comp = reactivity(() => {
      parentScope = effectScope();

      parentScope.run(() => {
        const currentScope = getCurrentScope();
        expect(currentScope).toBeDefined();
        const detachedScope = effectScope(true);
        detachedScope.run(() => {});

        expect(getCurrentScope()).toBe(currentScope);
      });

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  it("calling .off() of a detached scope inside an active scope should not break currentScope", () => {
    let parentScope = effectScope();

    const Comp = reactivity(() => {
      parentScope = effectScope();

      parentScope.run(() => {
        const childScope = effectScope(true);
        childScope.on();
        childScope.off();
        expect(getCurrentScope()).toBe(parentScope);
      });

      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });
});
