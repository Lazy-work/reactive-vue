import { isReactive, reactive, toRaw } from '../../../src/reactive';
import { watchEffect as effect } from '../../../src/effect';
import { $reactive } from '../../../src/management';
import { act, render } from '@testing-library/react';

describe('reactivity/collections', () => {
  function coverCollectionFn(collection: Set<any>, fnName: string) {
    const spy = vi.fn();
    const proxy = reactive(collection);
    (collection as any)[fnName] = spy;
    return [proxy as any, spy];
  }

  describe('Set', () => {
    it('instanceof', () => {
      const original = new Set();
      const observed = reactive(original);
      expect(isReactive(observed)).toBe(true);
      expect(original).toBeInstanceOf(Set);
      expect(observed).toBeInstanceOf(Set);
    });

    it('should observe mutations', () => {
      let dummy;
      let set;
      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.has('value')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      act(() => {
        set.add('value');
      });
      expect(dummy).toBe(true);
      act(() => {
        set.delete('value');
      });
      expect(dummy).toBe(false);
    });

    it('should observe mutations with observed value', async () => {
      let dummy;
      let value;
      let set;
      const Comp = $reactive(() => {
        value = reactive({});
        set = reactive(new Set());
        effect(() => (dummy = set.has(value)));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(false);

      act(() => {
        set.add(value);
      });
      expect(dummy).toBe(true);
      act(() => {
        set.delete(value);
      });
      expect(dummy).toBe(false);
    });

    it('should observe for of iteration', async () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set() as Set<number>);
        effect(() => {
          dummy = 0;
          for (const num of set) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        set.add(2);
        set.add(1);
      });
      expect(dummy).toBe(3);
      act(() => {
        set.delete(2);
      });
      expect(dummy).toBe(1);
      act(() => {
        set.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe forEach iteration', async () => {
      let dummy: any;
      let set;
      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => {
          dummy = 0;
          set.forEach((num) => (dummy += num));
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(0);
      act(() => {
        set.add(2);
        set.add(1);
      });
      expect(dummy).toBe(3);
      act(() => {
        set.delete(2);
      });
      expect(dummy).toBe(1);
      act(() => {
        set.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe values iteration', async () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set() as Set<number>);
        effect(() => {
          dummy = 0;
          for (const num of set.values()) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);

      act(() => {
        set.add(2);
        set.add(1);
      });
      expect(dummy).toBe(3);

      act(() => {
        set.delete(2);
      });
      expect(dummy).toBe(1);
      act(() => {
        set.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe keys iteration', async () => {
      let dummy;
      let set;
      const Comp = $reactive(() => {
        set = reactive(new Set() as Set<number>);
        effect(() => {
          dummy = 0;
          for (const num of set.keys()) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        set.add(2);
        set.add(1);
      });
      expect(dummy).toBe(3);
      act(() => {
        set.delete(2);
      });
      expect(dummy).toBe(1);
      act(() => {
        set.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe entries iteration', async () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set<number>());
        effect(() => {
          dummy = 0;
          for (const [key, num] of set.entries()) {
            key;
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        set.add(2);
        set.add(1);
      });
      expect(dummy).toBe(3);
      act(() => {
        set.delete(2);
      });
      expect(dummy).toBe(1);
      act(() => {
        set.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should be triggered by clearing', async () => {
      let dummy;
      let set;
      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.has('key')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      act(() => {
        set.add('key');
      });
      expect(dummy).toBe(true);
      act(() => {
        set.clear();
      });
      expect(dummy).toBe(false);
    });

    it('should not observe custom property mutations', async () => {
      let dummy;
      let set: any;

      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.customProp));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);
      act(() => {
        set.customProp = 'Hello World';
      });
      expect(dummy).toBe(undefined);
    });

    it('should observe size mutations', async () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.size));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        set.add('value');
        set.add('value2');
      });
      expect(dummy).toBe(2);
      act(() => {
        set.delete('value');
      });
      expect(dummy).toBe(1);
      act(() => {
        set.clear();
      });

      expect(dummy).toBe(0);
    });

    it('should not observe non value changing mutations', async () => {
      let dummy;
      let set;
      let setSpy;

      const Comp = $reactive(() => {
        set = reactive(new Set());
        setSpy = vi.fn(() => (dummy = set.has('value')));
        effect(setSpy);
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(1);
      act(() => {
        set.add('value');
      });
      expect(dummy).toBe(true);
      expect(setSpy).toHaveBeenCalledTimes(2);
      act(() => {
        set.add('value');
      });
      expect(dummy).toBe(true);
      expect(setSpy).toHaveBeenCalledTimes(2);
      act(() => {
        set.delete('value');
      });

      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(3);
      act(() => {
        set.delete('value');
      });
      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(3);
      act(() => {
        set.clear();
      });
      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(3);
    });

    it('should not observe raw data', () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = toRaw(set).has('value')));

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      act(() => {
        set.add('value');
      });
      expect(dummy).toBe(false);
    });

    it('should not observe raw iterations', async () => {
      let dummy = 0;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set<number>());
        effect(() => {
          dummy = 0;
          for (const [num] of toRaw(set).entries()) {
            dummy += num;
          }
          for (const num of toRaw(set).keys()) {
            dummy += num;
          }
          for (const num of toRaw(set).values()) {
            dummy += num;
          }
          toRaw(set).forEach((num) => {
            dummy += num;
          });
          for (const num of toRaw(set)) {
            dummy += num;
          }
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        set.add(2);
        set.add(3);
      });
      expect(dummy).toBe(0);
      act(() => {
        set.delete(2);
      });
      expect(dummy).toBe(0);
    });

    it('should not be triggered by raw mutations', () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.has('value')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      act(() => {
        toRaw(set).add('value');
      });
      expect(dummy).toBe(false);
      act(() => {
        dummy = true;
        toRaw(set).delete('value');
      });
      expect(dummy).toBe(true);
      act(() => {
        toRaw(set).clear();
      });
      expect(dummy).toBe(true);
    });

    it('should not observe raw size mutations', async () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = toRaw(set).size));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(0);
      act(() => {
        set.add('value');
      });
      expect(dummy).toBe(0);
    });

    it('should not be triggered by raw size mutations', () => {
      let dummy;
      let set;

      const Comp = $reactive(() => {
        set = reactive(new Set());
        effect(() => (dummy = set.size));

        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        toRaw(set).add('value');
      });
      expect(dummy).toBe(0);
    });

    it('should support objects as key', () => {
      let dummy;
      let key;
      let set;
      let setSpy;

      const Comp = $reactive(() => {
        key = {};
        set = reactive(new Set());
        setSpy = vi.fn(() => (dummy = set.has(key)));
        effect(setSpy);

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(1);

      act(() => {
        set.add({});
      });
      expect(dummy).toBe(false);
      expect(setSpy).toHaveBeenCalledTimes(1);

      act(() => {
        set.add(key);
      });
      expect(dummy).toBe(true);
      expect(setSpy).toHaveBeenCalledTimes(2);
    });

    it('should not pollute original Set with Proxies', () => {
      const set = new Set();
      const observed = reactive(set);
      const value = reactive({});
      observed.add(value);
      expect(observed.has(value)).toBe(true);
      expect(set.has(value)).toBe(false);
    });

    it('should observe nested values in iterations (forEach)', () => {
      let set;
      let dummy: any;

      const Comp = $reactive(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          set.forEach((value) => {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          });
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      act(() => {
        set.forEach((value) => {
          value.foo++;
        });
      });
      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (values)', () => {
      let set;
      let dummy: any;

      const Comp = $reactive(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          for (const value of set.values()) {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      act(() => {
        set.forEach((value) => {
          value.foo++;
        });
      });
      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (entries)', () => {
      let set;
      let dummy: any;

      const Comp = $reactive(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          for (const [key, value] of set.entries()) {
            expect(isReactive(key)).toBe(true);
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      act(() => {
        set.forEach((value) => {
          value.foo++;
        });
      });
      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (for...of)', () => {
      let set;
      let dummy: any;
      
      const Comp = $reactive(() => {
        set = reactive(new Set([{ foo: 1 }]));
        effect(() => {
          dummy = 0;
          for (const value of set) {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      act(() => {
        set.forEach((value) => {
          value.foo++;
        });
      });
      expect(dummy).toBe(2);
    });

    it('should work with reactive entries in raw set', () => {
      const raw = new Set();
      const entry = reactive({});
      raw.add(entry);
      const set = reactive(raw);

      expect(set.has(entry)).toBe(true);

      expect(set.delete(entry)).toBe(true);
      expect(set.has(entry)).toBe(false);
    });

    it('should track deletion of reactive entries in raw set', () => {
      let raw;
      let entry;
      let set;

      let dummy;

      const Comp = $reactive(() => {
        raw = new Set();
        entry = reactive({});
        raw.add(entry);
        set = reactive(raw);
        effect(() => {
          dummy = set.has(entry);
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(true);

      act(() => {
        set.delete(entry);
      });
      expect(dummy).toBe(false);
    });

    it('should warn when set contains both raw and reactive versions of the same object', () => {
      const raw = new Set();
      const rawKey = {};
      const key = reactive(rawKey);
      raw.add(rawKey);
      raw.add(key);
      const set = reactive(raw);
      set.delete(key);
      expect(`Reactive Set contains both the raw and reactive`).toHaveBeenWarned();
    });

    it('thisArg', () => {
      const raw = new Set(['value']);
      const proxy = reactive(raw);
      const thisArg = {};
      let count = 0;
      proxy.forEach(function (this: {}, value, _, set) {
        ++count;
        expect(this).toBe(thisArg);
        expect(value).toBe('value');
        expect(set).toBe(proxy);
      }, thisArg);
      expect(count).toBe(1);
    });

    it('should trigger Set.has only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Set(), 'has');
      proxy.has('foo');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Set.add only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Set(), 'add');
      proxy.add('foo');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Set.delete only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Set(), 'delete');
      proxy.delete('foo');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Set.clear only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Set(), 'clear');
      proxy.clear();
      expect(spy).toBeCalledTimes(1);
    });

    it('should return proxy from Set.add call', () => {
      const set = reactive(new Set());
      const result = set.add('a');
      expect(result).toBe(set);
    });
  });
});
