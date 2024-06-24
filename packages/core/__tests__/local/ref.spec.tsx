import {
  type Ref,
  watchEffect as effect,
  isReactive,
  isRef,
  reactive,
  ref,
  toRef,
  toRefs,
  computed,
  $reactive,
} from '../../src/index';
import { customRef, shallowRef, triggerRef, unref } from '../../src/ref';
import { isReadonly, isShallow, readonly, shallowReactive } from '../../src/reactive';
import { act, render } from '@testing-library/react';

describe('reactivity/ref', () => {
  it('should hold a value', () => {
    const a = ref(1);
    expect(a.value).toBe(1);
    a.value = 2;
    expect(a.value).toBe(2);
  });

  it('should be reactive', () => {
    let a;
    let dummy;
    let fn;
    const Comp = $reactive(() => {
      a = ref(1);
      fn = vi.fn(() => {
        dummy = a.value;
      });
      effect(fn);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(dummy).toBe(1);
    act(() => {
      a.value = 2;
    });
    a.value = 2;
    expect(fn).toHaveBeenCalledTimes(2);
    expect(dummy).toBe(2);
    act(() => {
      // same value should not trigger
      a.value = 2;
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should make nested properties reactive', () => {
    let a;
    let dummy;

    const Comp = $reactive(() => {
      a = ref({
        count: 1,
      });
      effect(() => {
        dummy = a.value.count;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);
    act(() => {
      a.value.count = 2;
    });
    expect(dummy).toBe(2);
  });

  it('should work without initial value', () => {
    let a = ref();
    let dummy;
    const Comp = $reactive(() => {
      a = ref();
      effect(() => {
        dummy = a.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(undefined);
    act(() => {
      a.value = 2;
    });
    expect(dummy).toBe(2);
  });

  it('should work like a normal property when nested in a reactive object', () => {
    let a;
    let obj;

    let dummy1: number;
    let dummy2: number;

    const Comp = $reactive(() => {
      a = ref(1);
      obj = reactive({
        a,
        b: {
          c: a,
        },
      });

      effect(() => {
        dummy1 = obj.a;
        dummy2 = obj.b.c;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    const assertDummiesEqualTo = (val: number) => [dummy1, dummy2].forEach((dummy) => expect(dummy).toBe(val));

    assertDummiesEqualTo(1);
    act(() => {
      a.value++;
    });
    assertDummiesEqualTo(2);
    act(() => {
      obj.a++;
    });
    assertDummiesEqualTo(3);
    act(() => {
      obj.b.c++;
    });
    assertDummiesEqualTo(4);
  });

  it('should unwrap nested ref in types', () => {
    const Comp = $reactive(() => {
      const a = ref(0);
      const b = ref(a);

      expect(typeof (b.value + 1)).toBe('number');
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  it('should unwrap nested values in types', () => {
    const Comp = $reactive(() => {
      const a = {
        b: ref(0),
      };

      const c = ref(a);

      expect(typeof (c.value.b + 1)).toBe('number');
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  it('should NOT unwrap ref types nested inside arrays', () => {
    const Comp = $reactive(() => {
      const arr = ref([1, ref(3)]).value;
      expect(isRef(arr[0])).toBe(false);
      expect(isRef(arr[1])).toBe(true);
      expect((arr[1] as Ref).value).toBe(3);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  it('should unwrap ref types as props of arrays', () => {
    const Comp = $reactive(() => {
      const arr = [ref(0)];
      const symbolKey = Symbol('');
      arr['' as any] = ref(1);
      arr[symbolKey as any] = ref(2);
      const arrRef = ref(arr).value;
      expect(isRef(arrRef[0])).toBe(true);
      expect(isRef(arrRef['' as any])).toBe(false);
      expect(isRef(arrRef[symbolKey as any])).toBe(false);
      expect(arrRef['' as any]).toBe(1);
      expect(arrRef[symbolKey as any]).toBe(2);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  it('should keep tuple types', () => {
    const Comp = $reactive(() => {
      const tuple: [number, string, { a: number }, () => number, Ref<number>] = [0, '1', { a: 1 }, () => 0, ref(0)];
      const tupleRef = ref(tuple);

      tupleRef.value[0]++;
      expect(tupleRef.value[0]).toBe(1);
      tupleRef.value[1] += '1';
      expect(tupleRef.value[1]).toBe('11');
      tupleRef.value[2].a++;
      expect(tupleRef.value[2].a).toBe(2);
      expect(tupleRef.value[3]()).toBe(0);
      tupleRef.value[4].value++;
      expect(tupleRef.value[4].value).toBe(1);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  it('should keep symbols', () => {
    const Comp = $reactive(() => {
      const customSymbol = Symbol();
      const obj = {
        [Symbol.asyncIterator]: ref(1),
        [Symbol.hasInstance]: { a: ref('a') },
        [Symbol.isConcatSpreadable]: { b: ref(true) },
        [Symbol.iterator]: [ref(1)],
        [Symbol.match]: new Set<Ref<number>>(),
        [Symbol.matchAll]: new Map<number, Ref<string>>(),
        [Symbol.replace]: { arr: [ref('a')] },
        [Symbol.search]: { set: new Set<Ref<number>>() },
        [Symbol.species]: { map: new Map<number, Ref<string>>() },
        [Symbol.split]: new WeakSet<Ref<boolean>>(),
        [Symbol.toPrimitive]: new WeakMap<Ref<boolean>, string>(),
        [Symbol.toStringTag]: { weakSet: new WeakSet<Ref<boolean>>() },
        [Symbol.unscopables]: { weakMap: new WeakMap<Ref<boolean>, string>() },
        [customSymbol]: { arr: [ref(1)] },
      };

      const objRef = ref(obj);

      const keys: (keyof typeof obj)[] = [
        Symbol.asyncIterator,
        Symbol.hasInstance,
        Symbol.isConcatSpreadable,
        Symbol.iterator,
        Symbol.match,
        Symbol.matchAll,
        Symbol.replace,
        Symbol.search,
        Symbol.species,
        Symbol.split,
        Symbol.toPrimitive,
        Symbol.toStringTag,
        Symbol.unscopables,
        customSymbol,
      ];

      keys.forEach((key) => {
        expect(objRef.value[key]).toStrictEqual(obj[key]);
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('unref', () => {
    const Comp = $reactive(() => {
      expect(unref(1)).toBe(1);
      expect(unref(ref(1))).toBe(1);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('shallowRef', () => {
    let sref;

    let dummy;
    const Comp = $reactive(() => {
      sref = shallowRef({ a: 1 });
      expect(isReactive(sref.value)).toBe(false);

      effect(() => {
        dummy = sref.value.a;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);

    act(() => {
      sref.value = { a: 2 };
    });
    expect(isReactive(sref.value)).toBe(false);
    expect(dummy).toBe(2);
  });

  test('shallowRef force trigger', () => {
    let sref;
    let dummy;

    const Comp = $reactive(() => {
      sref = shallowRef({ a: 1 });

      effect(() => {
        dummy = sref.value.a;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);

    act(() => {
      sref.value.a = 2;
    });
    expect(dummy).toBe(1); // should not trigger yet

    act(() => {
      // force trigger
      triggerRef(sref);
    });
    expect(dummy).toBe(2);
  });

  test('shallowRef isShallow', () => {
    expect(isShallow(shallowRef({ a: 1 }))).toBe(true);
  });

  test('isRef', () => {
    const Comp = $reactive(() => {
      expect(isRef(ref(1))).toBe(true);
      expect(isRef(computed(() => 1))).toBe(true);

      expect(isRef(0)).toBe(false);
      expect(isRef(1)).toBe(false);
      // an object that looks like a ref isn't necessarily a ref
      expect(isRef({ value: 0 })).toBe(false);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('toRef', () => {
    let a;
    let x;
    let r;
    let dummyX;

    const Comp = $reactive(() => {
      a = reactive({
        x: 1,
      });
      x = toRef(a, 'x');
      expect(isRef(x)).toBe(true);
      expect(x.value).toBe(1);

      // source -> proxy
      a.x = 2;
      expect(x.value).toBe(2);

      // proxy -> source
      x.value = 3;
      expect(a.x).toBe(3);

      // reactivity
      effect(() => {
        dummyX = x.value;
      });

      // should keep ref
      r = { x: ref(1) };
      expect(toRef(r, 'x')).toBe(r.x);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummyX).toBe(x.value);

    act(() => {
      // mutating source should trigger effect using the proxy refs
      a.x = 4;
    });
    expect(dummyX).toBe(4);
  });

  test('toRef on array', () => {
    const Comp = $reactive(() => {
      const a = reactive(['a', 'b']);
      const r = toRef(a, 1);
      expect(r.value).toBe('b');
      r.value = 'c';
      expect(r.value).toBe('c');
      expect(a[1]).toBe('c');
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('toRef default value', () => {
    const Comp = $reactive(() => {
      const a: { x: number | undefined } = { x: undefined };
      const x = toRef(a, 'x', 1);
      expect(x.value).toBe(1);

      a.x = 2;
      expect(x.value).toBe(2);

      a.x = undefined;
      expect(x.value).toBe(1);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('toRef getter', () => {
    const Comp = $reactive(() => {
      const x = toRef(() => 1);
      expect(x.value).toBe(1);
      expect(isRef(x)).toBe(true);
      expect(unref(x)).toBe(1);
      //@ts-expect-error
      expect(() => (x.value = 123)).toThrow();

      expect(isReadonly(x)).toBe(true);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('toRefs', () => {
    let dummyX, dummyY;
    let a, x, y;
    const Comp = $reactive(() => {
      a = reactive({
        x: 1,
        y: 2,
      });

      const refs = toRefs(a);
      x = refs.x;
      y = refs.y;

      expect(isRef(x)).toBe(true);
      expect(isRef(y)).toBe(true);
      expect(x.value).toBe(1);
      expect(y.value).toBe(2);

      // source -> proxy
      a.x = 2;
      a.y = 3;
      expect(x.value).toBe(2);
      expect(y.value).toBe(3);

      // proxy -> source
      x.value = 3;
      y.value = 4;
      expect(a.x).toBe(3);
      expect(a.y).toBe(4);

      // reactivity
      effect(() => {
        dummyX = x.value;
        dummyY = y.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummyX).toBe(x.value);
    expect(dummyY).toBe(y.value);

    act(() => {
      // mutating source should trigger effect using the proxy refs
      a.x = 4;
      a.y = 5;
    });
    expect(dummyX).toBe(4);
    expect(dummyY).toBe(5);
  });

  test('toRefs should warn on plain object', () => {
    const Comp = $reactive(() => {
      toRefs({});
      expect(`toRefs() expects a reactive object`).toHaveBeenWarned();
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('toRefs should warn on plain array', () => {
    const Comp = $reactive(() => {
      toRefs([]);
      expect(`toRefs() expects a reactive object`).toHaveBeenWarned();
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('toRefs reactive array', () => {
    const Comp = $reactive(() => {
      const arr = reactive(['a', 'b', 'c']);
      const refs = toRefs(arr);

      expect(Array.isArray(refs)).toBe(true);

      refs[0].value = '1';
      expect(arr[0]).toBe('1');

      arr[1] = '2';
      expect(refs[1].value).toBe('2');
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
  });

  test('customRef', () => {
    let value;
    let _trigger;

    let custom;

    let dummy;
    const Comp = $reactive(() => {
      value = 1;

      custom = customRef((track, trigger) => ({
        get() {
          track();
          return value;
        },
        set(newValue: number) {
          value = newValue;
          _trigger = trigger;
        },
      }));

      expect(isRef(custom)).toBe(true);

      effect(() => {
        dummy = custom.value;
      });
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    expect(dummy).toBe(1);

    act(() => {
      custom.value = 2;
    });
    // should not trigger yet
    expect(dummy).toBe(1);

    act(() => {
      _trigger!();
    });
    expect(dummy).toBe(2);
  });

  test('should not trigger when setting value to same proxy', () => {
    let obj;
    let a;
    let spy1;

    let b;
    let spy2;
    const Comp = $reactive(() => {
      obj = reactive({ count: 0 });
      a = ref(obj);
      spy1 = vi.fn(() => a.value);

      effect(spy1);
      b = shallowRef(obj);
      spy2 = vi.fn(() => b.value);

      effect(spy2);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });
    act(() => {
      a.value = obj;
    });
    expect(spy1).toBeCalledTimes(1);

    act(() => {
      b.value = obj;
    });

    expect(spy2).toBeCalledTimes(1);
  });

  test('ref should preserve value shallow/readonly-ness', () => {
    let original;
    let r;
    let s;
    let rr;
    let a;
    const Comp = $reactive(() => {
      original = {};
      r = reactive(original);
      s = shallowReactive(original);
      rr = readonly(original);
      a = ref(original);
      return () => <div />;
    });

    act(() => {
      render(<Comp />);
    });

    expect(a.value).toBe(r);

    act(() => {
      a.value = s;
    });

    expect(a.value).toBe(s);
    expect(a.value).not.toBe(r);

    act(() => {
      a.value = rr;
    });

    expect(a.value).toBe(rr);
    expect(a.value).not.toBe(r);
  });
});
