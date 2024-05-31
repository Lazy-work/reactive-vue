import { act, render } from '@testing-library/react';
import { isReactive, reactive, toRaw, watchEffect as effect } from '../../../src/index';
import { reactivity } from '../../../src/management';

describe('reactivity/collections', () => {
  function coverCollectionFn(collection: Map<any, any>, fnName: string) {
    const spy = vi.fn();
    const proxy = reactive(collection);
    (collection as any)[fnName] = spy;
    return [proxy as any, spy];
  }

  describe('Map', () => {
    test('instanceof', () => {
      const original = new Map();
      const observed = reactive(original);
      expect(isReactive(observed)).toBe(true);
      expect(original).toBeInstanceOf(Map);
      expect(observed).toBeInstanceOf(Map);
    });

    it('should observe mutations', () => {
      let dummy;
      let map;
      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = map.get('key');
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);
      act(() => map.set('key', 'value'));
      expect(dummy).toBe('value');
      act(() => map.set('key', 'value2'));
      expect(dummy).toBe('value2');
      act(() => map.delete('key'));
      expect(dummy).toBe(undefined);
    });

    it('should observe mutations with observed value as key', () => {
      let dummy;
      let key;
      let value;
      let map;

      const Comp = reactivity(() => {
        key = reactive({});
        value = reactive({});
        map = reactive(new Map());
        effect(() => {
          dummy = map.get(key);
        });
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);
      act(() => map.set(key, value));
      expect(dummy).toBe(value);
      act(() => map.delete(key));
      expect(dummy).toBe(undefined);
    });

    it('should observe size mutations', () => {
      let dummy;
      let map;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => (dummy = map.size));

        return () => <div />;
      });
      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        map.set('key1', 'value');
        map.set('key2', 'value2');
      });

      expect(dummy).toBe(2);
      act(() => {
        map.delete('key1');
      });
      expect(dummy).toBe(1);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe for of iteration', () => {
      let dummy;
      let map;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          for (const [key, num] of map) {
            key;
            dummy += num;
          }
        });
        return () => <div />;
      });
      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        map.set('key1', 3);
      });
      expect(dummy).toBe(3);
      act(() => {
        map.set('key2', 2);
      });
      expect(dummy).toBe(5);
      // iteration should track mutation of existing entries (#709)

      act(() => {
        map.set('key1', 4);
      });
      expect(dummy).toBe(6);
      act(() => {
        map.delete('key1');
      });
      expect(dummy).toBe(2);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe forEach iteration', () => {
      let dummy: any;
      let map;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          map.forEach((num: any) => (dummy += num));
        });
        return () => <div />;
      });
      render(<Comp />);
      expect(dummy).toBe(0);
      act(() => {
        map.set('key1', 3);
      });
      expect(dummy).toBe(3);
      act(() => {
        map.set('key2', 2);
      });
      expect(dummy).toBe(5);
      // iteration should track mutation of existing entries (#709)
      act(() => {
        map.set('key1', 4);
      });
      expect(dummy).toBe(6);
      act(() => {
        map.delete('key1');
      });
      expect(dummy).toBe(2);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe keys iteration', () => {
      let dummy;
      let map;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          for (const key of map.keys()) {
            dummy += key;
          }
        });
        return () => <div />;
      });
      render(<Comp />);
      expect(dummy).toBe(0);
      act(() => {
        map.set(3, 3);
      });
      expect(dummy).toBe(3);
      act(() => {
        map.set(2, 2);
      });
      expect(dummy).toBe(5);
      act(() => {
        map.delete(3);
      });
      expect(dummy).toBe(2);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe values iteration', () => {
      let dummy;
      let map;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = 0;
          for (const num of map.values()) {
            dummy += num;
          }
        });
        return () => <div />;
      });
      render(<Comp />);

      expect(dummy).toBe(0);
      act(() => {
        map.set('key1', 3);
      });
      expect(dummy).toBe(3);
      act(() => {
        map.set('key2', 2);
      });
      expect(dummy).toBe(5);
      // iteration should track mutation of existing entries (#709)
      act(() => {
        map.set('key1', 4);
      });
      expect(dummy).toBe(6);
      act(() => {
        map.delete('key1');
      });
      expect(dummy).toBe(2);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe(0);
    });

    it('should observe entries iteration', () => {
      let dummy;
      let dummy2;
      let map;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => {
          dummy = '';
          dummy2 = 0;
          for (const [key, num] of map.entries()) {
            dummy += key;
            dummy2 += num;
          }
        });
        return () => <div />;
      });
      render(<Comp />);
      expect(dummy).toBe('');
      expect(dummy2).toBe(0);
      act(() => {
        map.set('key1', 3);
      });
      expect(dummy).toBe('key1');
      expect(dummy2).toBe(3);
      act(() => {
        map.set('key2', 2);
      });
      expect(dummy).toBe('key1key2');
      expect(dummy2).toBe(5);
      // iteration should track mutation of existing entries (#709)
      act(() => {
        map.set('key1', 4);
      });
      expect(dummy).toBe('key1key2');
      expect(dummy2).toBe(6);
      act(() => {
        map.delete('key1');
      });
      expect(dummy).toBe('key2');
      expect(dummy2).toBe(2);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe('');
      expect(dummy2).toBe(0);
    });

    it('should be triggered by clearing', () => {
      let dummy;
      let map;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => (dummy = map.get('key')));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);
      act(() => {
        map.set('key', 3);
      });
      expect(dummy).toBe(3);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe(undefined);
    });

    it('should not observe custom property mutations', () => {
      let dummy;
      let map: any;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => (dummy = map.customProp));
        return () => <div />;
      });

      render(<Comp />);

      expect(dummy).toBe(undefined);
      act(() => {
        map.customProp = 'Hello World';
      });
      expect(dummy).toBe(undefined);
    });

    it('should not observe non value changing mutations', () => {
      let dummy;
      let map;
      let mapSpy;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        mapSpy = vi.fn(() => (dummy = map.get('key')));
        effect(mapSpy);
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(1);

      act(() => {
        map.set('key', undefined);
      });
      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(2);
      act(() => {
        map.set('key', 'value');
      });
      expect(dummy).toBe('value');
      expect(mapSpy).toHaveBeenCalledTimes(3);

      act(() => {
        map.set('key', 'value');
      });
      expect(dummy).toBe('value');
      expect(mapSpy).toHaveBeenCalledTimes(3);
      act(() => {
        map.delete('key');
      });
      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(4);
      act(() => {
        map.delete('key');
      });
      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(4);
      act(() => {
        map.clear();
      });
      expect(dummy).toBe(undefined);
      expect(mapSpy).toHaveBeenCalledTimes(4);
    });

    it('should not observe raw data', () => {
      let dummy;
      let map;
      const Comp = reactivity(() => {
        map = reactive(new Map());
        effect(() => (dummy = toRaw(map).get('key')));
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(undefined);
      act(() => {
        map.set('key', 'Hello');
      });
      expect(dummy).toBe(undefined);
      act(() => {
        map.delete('key');
      });
      expect(dummy).toBe(undefined);
    });

    it('should not pollute original Map with Proxies', () => {
      let map;
      let observed;
      let value;

      const Comp = reactivity(() => {
        map = new Map();
        observed = reactive(map);
        value = reactive({});

        return () => <div />;
      });

      render(<Comp />);
      act(() => {
        observed.set('key', value);
      });
      expect(map.get('key')).not.toBe(value);
      expect(map.get('key')).toBe(toRaw(value));
    });

    it('should return observable versions of contained values', () => {
      let observed;
      let value;
      let wrapped;
      const Comp = reactivity(() => {
        observed = reactive(new Map());
        value = {};
        return () => <div />;
      });

      render(<Comp />);
      act(() => {
        observed.set('key', value);
        wrapped = observed.get('key');
      });
      expect(isReactive(wrapped)).toBe(true);
      expect(toRaw(wrapped)).toBe(value);
    });

    it('should observed nested data', () => {
      let observed;
      let dummy;
      const Comp = reactivity(() => {
        observed = reactive(new Map());
        observed.set('key', { a: 1 });
        effect(() => {
          dummy = observed.get('key').a;
        });
        return () => <div />;
      });

      render(<Comp />);
      act(() => {
        observed.get('key').a = 2;
      });
      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (forEach)', () => {
      let map;
      let dummy: any;

      const Comp = reactivity(() => {
        map = reactive(new Map([[1, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          map.forEach((value) => {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          });
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      act(() => {
        map.get(1)!.foo++;
      });
      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (values)', () => {
      let map;
      let dummy: any;

      const Comp = reactivity(() => {
        map = reactive(new Map([[1, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          for (const value of map.values()) {
            expect(isReactive(value)).toBe(true);
            dummy += value.foo;
          }
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);

      act(() => {
        map.get(1)!.foo++;
      });
      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (entries)', () => {
      let key;
      let map;
      let dummy: any;

      const Comp = reactivity(() => {
        key = {};
        map = reactive(new Map([[key, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          for (const [key, value] of map.entries()) {
            key;
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
        map.get(1)!.foo++;
      });
      expect(dummy).toBe(2);
    });

    it('should observe nested values in iterations (for...of)', () => {
      let key;
      let map;
      let dummy: any;

      const Comp = reactivity(() => {
        key = {};
        map = reactive(new Map([[key, { foo: 1 }]]));
        effect(() => {
          dummy = 0;
          for (const [key, value] of map) {
            key;
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
        map.get(key)!.foo++;
      });
      expect(dummy).toBe(2);
    });

    it('should not be trigger when the value and the old value both are NaN', () => {
      let map;
      let mapSpy;

      const Comp = reactivity(() => {
        map = reactive(new Map([['foo', NaN]]));
        mapSpy = vi.fn(() => map.get('foo'));
        effect(mapSpy);
        return () => <div />;
      });

      render(<Comp />);
      act(() => {
        map.set('foo', NaN);
      });
      expect(mapSpy).toHaveBeenCalledTimes(1);
    });

    it('should work with reactive keys in raw map', () => {
      const raw = new Map();
      const key = reactive({});
      raw.set(key, 1);
      const map = reactive(raw);

      expect(map.has(key)).toBe(true);
      expect(map.get(key)).toBe(1);

      expect(map.delete(key)).toBe(true);
      expect(map.has(key)).toBe(false);
      expect(map.get(key)).toBeUndefined();
    });

    it('should track set of reactive keys in raw map', () => {
      let raw;
      let key;
      let map;

      let dummy;

      const Comp = reactivity(() => {
        raw = new Map();
        key = reactive({});
        raw.set(key, 1);
        map = reactive(raw);

        effect(() => {
          dummy = map.get(key);
        });

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(1);
      act(() => {
        map.set(key, 2);
      });
      expect(dummy).toBe(2);
    });

    it('should track deletion of reactive keys in raw map', () => {
      let raw;
      let key;
      let map;

      let dummy;
      const Comp = reactivity(() => {
        raw = new Map();
        key = reactive({});
        raw.set(key, 1);
        map = reactive(raw);

        effect(() => {
          dummy = map.has(key);
        });

        return () => <div />;
      });

      render(<Comp />);
      expect(dummy).toBe(true);
      act(() => {
        map.delete(key);
      });
      expect(dummy).toBe(false);
    });

    it('should warn when both raw and reactive versions of the same object is used as key', () => {
      const raw = new Map();
      const rawKey = {};
      const key = reactive(rawKey);
      raw.set(rawKey, 1);
      raw.set(key, 1);
      const map = reactive(raw);
      map.set(key, 2);
      expect(`Reactive Map contains both the raw and reactive`).toHaveBeenWarned();
    });

    // #877
    it('should not trigger key iteration when setting existing keys', () => {
      let map;
      let spy;

      const Comp = reactivity(() => {
        map = reactive(new Map());
        spy = vi.fn();

        effect(() => {
          const keys = [];
          for (const key of map.keys()) {
            keys.push(key);
          }
          spy(keys);
        });
        return () => <div />;
      });

      render(<Comp />);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toMatchObject([]);

      act(() => {
        map.set('a', 0);
      });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls[1][0]).toMatchObject(['a']);

      act(() => {
        map.set('b', 0);
      });
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy.mock.calls[2][0]).toMatchObject(['a', 'b']);

      // keys didn't change, should not trigger
      act(() => {
        map.set('b', 1);
      });
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('should trigger Map.has only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'has');
      proxy.has('k');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Map.set only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'set');
      proxy.set('k', 'v');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Map.delete only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'delete');
      proxy.delete('foo');
      expect(spy).toBeCalledTimes(1);
    });

    it('should trigger Map.clear only once for non-reactive keys', () => {
      const [proxy, spy] = coverCollectionFn(new Map(), 'clear');
      proxy.clear();
      expect(spy).toBeCalledTimes(1);
    });

    it('should return proxy from Map.set call', () => {
      const map = reactive(new Map());
      const result = map.set('a', 'a');
      expect(result).toBe(map);
    });
  });
});
