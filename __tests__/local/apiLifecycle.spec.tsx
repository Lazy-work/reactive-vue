// import { JSDOM } from "jsdom";
import {
  DebuggerEvent,
  TrackOpTypes,
  onBeforeUnmount,
  onRenderTracked,
  onRenderTriggered,
  reactivity,
} from "../../src";
import { onBeforeMount } from "../../src";
import { act, render } from "@testing-library/react";
import {
  onMounted,
  onBeforeUpdate,
  onUpdated,
  onUnmounted,
  reactive,
  ref,
} from "../../src";
import { nextTick } from "../../src";
import { TriggerOpTypes } from "../../src/constants";
import { ITERATE_KEY } from "../../src/reactive/reactiveEffect";
// reference: https://vue-composition-api-rfc.netlify.com/api.html#lifecycle-hooks

describe("api: lifecycle hooks", () => {
  it("onBeforeMount", () => {
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called before inner div is rendered
      expect(root.innerHTML).toBe(``);
    });

    const Comp = reactivity(() => {
      onBeforeMount(fn);
      return () => <div />;
    });

    render(<Comp />, {
      container: root,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("onMounted", () => {
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called after inner div is rendered
      expect(root.innerHTML).toBe(`<div></div>`);
    });

    const Comp = reactivity(() => {
      onMounted(fn);
      return () => <div />;
    });

    render(<Comp />, {
      container: root,
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("onBeforeUpdate", async () => {
    const count = ref(0);
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called before inner div is updated
      expect(root.innerHTML).toBe(`<div>0</div>`);
    });

    const Comp = reactivity(() => {
      onBeforeUpdate(fn);
      return () => <div>{count.value}</div>;
    });

    render(<Comp />, {
      container: root,
    });

    count.value++;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(root.innerHTML).toBe(`<div>1</div>`);
  });

  it("state mutation in onBeforeUpdate", async () => {
    const count = ref(0);
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called before inner div is updated
      expect(root.innerHTML).toBe(`<div>0</div>`);
      count.value++;
    });
    const renderSpy = vi.fn();

    const Comp = reactivity(() => {
      onBeforeUpdate(fn);
      return () => {
        renderSpy();
        return <div>{count.value}</div>;
      };
    });

    render(<Comp />, {
      container: root,
    });
    expect(renderSpy).toHaveBeenCalledTimes(1);

    act(() => {
      count.value++;
    });
    // await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(root.innerHTML).toBe(`<div>2</div>`);
  });

  it("onUpdated", async () => {
    const count = ref(0);
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called after inner div is updated
      expect(root.innerHTML).toBe(`<div>1</div>`);
    });

    const Comp = reactivity(() => {
      onUpdated(fn);
      return () => <div>{count.value}</div>;
    });

    render(<Comp />, {
      container: root,
    });

    count.value++;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it.skip("onBeforeUnmount", async () => {
    const toggle = ref(true);
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called before inner div is removed
      expect(root.innerHTML).toBe(`<div></div>`);
    });

    const Comp = reactivity(() => {
      return () => (toggle.value ? <Child /> : null);
    });

    const Child = reactivity(() => {
      onBeforeUnmount(fn);
      return () => <div />;
    });

    render(<Comp />, {
      container: root,
    });

    toggle.value = false;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("onUnmounted", async () => {
    const toggle = ref(true);
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called after inner div is removed
      expect(root.innerHTML).toBe(`<!---->`);
    });

    const Comp = reactivity(() => {
      return () => (toggle.value ? <Child /> : null);
    });

    const Child = reactivity(() => {
      onUnmounted(fn);
      return () => <div />;
    });

    render(<Comp />, {
      container: root,
    });

    toggle.value = false;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it.skip("onBeforeUnmount in onMounted", async () => {
    const toggle = ref(true);
    const root = document.createElement("div");
    const fn = vi.fn(() => {
      // should be called before inner div is removed
      expect(root.innerHTML).toBe(`<div></div>`);
    });

    const Comp = reactivity(() => {
      return () => (toggle.value ? <Child /> : null);
    });

    const Child = reactivity(() => {
      onMounted(() => {
        onBeforeUnmount(fn);
      });
      return () => <div />;
    });

    render(<Comp />, {
      container: root,
    });

    await nextTick();
    expect(root.innerHTML).toBe(`<div></div>`);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("lifecycle call order", async () => {
    const count = ref(0);
    const root = document.createElement("div");
    const calls: string[] = [];

    const Root = reactivity(() => {
      onBeforeMount(() => calls.push("root onBeforeMount"));
      onMounted(() => calls.push("root onMounted"));
      onBeforeUpdate(() => calls.push("root onBeforeUpdate"));
      onUpdated(() => calls.push("root onUpdated"));
      // onBeforeUnmount(() => calls.push("root onBeforeUnmount"));
      onUnmounted(() => calls.push("root onUnmounted"));
      return () => <Mid count={count.value} />;
    });

    const Mid = reactivity((props: any) => {
      onBeforeMount(() => calls.push("mid onBeforeMount"));
      onMounted(() => calls.push("mid onMounted"));
      onBeforeUpdate(() => calls.push("mid onBeforeUpdate"));
      onUpdated(() => calls.push("mid onUpdated"));
      // onBeforeUnmount(() => calls.push("mid onBeforeUnmount"));
      onUnmounted(() => calls.push("mid onUnmounted"));
      return () => <Child count={props.count} />;
    });

    const Child = reactivity((props: any) => {
      onBeforeMount(() => calls.push("child onBeforeMount"));
      onMounted(() => calls.push("child onMounted"));
      onBeforeUpdate(() => calls.push("child onBeforeUpdate"));
      onUpdated(() => calls.push("child onUpdated"));
      // onBeforeUnmount(() => calls.push("child onBeforeUnmount"));
      onUnmounted(() => calls.push("child onUnmounted"));
      return () => <div>{props.count}</div>;
    });

    // mount
    render(<Root />, {
      container: root,
    });
    expect(calls).toEqual([
      "root onBeforeMount",
      "mid onBeforeMount",
      "child onBeforeMount",
      "child onMounted",
      "mid onMounted",
      "root onMounted",
    ]);

    calls.length = 0;

    // update
    count.value++;
    await nextTick();
    expect(calls).toEqual([
      "root onBeforeUpdate",
      "mid onBeforeUpdate",
      "child onBeforeUpdate",
      "child onUpdated",
      "mid onUpdated",
      "root onUpdated",
    ]);

    calls.length = 0;

    // unmount
    render(null, {
      container: root,
    });
    expect(calls).toEqual([
      "root onBeforeUnmount",
      // "mid onBeforeUnmount",
      // "child onBeforeUnmount",
      "child onUnmounted",
      "mid onUnmounted",
      "root onUnmounted",
    ]);
  });

  it("onRenderTracked", () => {
    const events: DebuggerEvent[] = [];
    const onTrack = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive({ foo: 1, bar: 2 });

    const Comp = reactivity(() => {
      onRenderTracked(onTrack);
      return () => (
        <div>
          {obj.foo}
          {"bar" in obj}
          {Object.keys(obj).join("")}
        </div>
      );
    });

    render(<Comp />, { container: document.createElement("div") });
    expect(onTrack).toHaveBeenCalledTimes(3);
    expect(events).toMatchObject([
      {
        target: obj,
        type: TrackOpTypes.GET,
        key: "foo",
      },
      {
        target: obj,
        type: TrackOpTypes.HAS,
        key: "bar",
      },
      {
        target: obj,
        type: TrackOpTypes.ITERATE,
        key: ITERATE_KEY,
      },
    ]);
  });

  it("onRenderTriggered", async () => {
    const events: DebuggerEvent[] = [];
    const onTrigger = vi.fn((e: DebuggerEvent) => {
      events.push(e);
    });
    const obj = reactive<{
      foo: number;
      bar?: number;
    }>({ foo: 1, bar: 2 });

    const Comp = reactivity(() => {
      onRenderTriggered(onTrigger);
      return () => (
        <div>
          {obj.foo}
          {"bar" in obj}
          {Object.keys(obj).join("")}
        </div>
      );
    });

    render(<Comp />);

    obj.foo++;
    await nextTick();
    expect(onTrigger).toHaveBeenCalledTimes(1);
    expect(events[0]).toMatchObject({
      type: TriggerOpTypes.SET,
      key: "foo",
      oldValue: 1,
      newValue: 2,
    });

    delete obj.bar;
    await nextTick();
    expect(onTrigger).toHaveBeenCalledTimes(2);
    expect(events[1]).toMatchObject({
      type: TriggerOpTypes.DELETE,
      key: "bar",
      oldValue: 2,
    });
    (obj as any).baz = 3;
    await nextTick();
    expect(onTrigger).toHaveBeenCalledTimes(3);
    expect(events[2]).toMatchObject({
      type: TriggerOpTypes.ADD,
      key: "baz",
      newValue: 3,
    });
  });

  it("runs shared hook fn for each instance", async () => {
    const fn = vi.fn();
    const toggle = ref(true);
    const Comp = reactivity(() => {
      return () =>
        toggle.value ? (
          <>
            <Child />
            <Child />
          </>
        ) : null;
    });

    const Child = reactivity(() => {
      onMounted(fn);
      onBeforeUnmount(fn);
      return () => <div />;
    });

    render(<Comp />);
    expect(fn).toHaveBeenCalledTimes(2);
    toggle.value = false;
    await nextTick();
    expect(fn).toHaveBeenCalledTimes(4);
  });
});
