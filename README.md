# [Reactive (Vue)](https://reactive-lib.netlify.app/)

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)] (https://github.com/Lazy-work/reactive-vue/blob/main/LICENSE)

Reactive (Vue) is a library designed to switch React reactivity from opt-out to opt-in.

[Full documentation](https://reactive-lib.netlify.app/).

## Why this library ?

Please read the explanation at : [Why ?](https://reactive-lib.netlify.app/guide/)

## Example

```jsx
import { $reactive, ref } from "@lazywork/reactive-vue";

const Counter = $reactive(() => {
  const count = ref(0);

  setInterval(() => count.value++, 1000);

  return () => (
    <div>
      <p>Count: {count.value}</p>
    </div>
  );
});
```

This is an example of a counter that increments every second.

## Contributing

Currently, contributions are not being accepted.

## License

[MIT](https://opensource.org/licenses/MIT)

Copyright (c) 2024, William (Abdullah) NGBAMA

## Credits

The Reactive Vue project is inspired by:
[Vue](https://vuejs.org/), created by [Evan You](https://github.com/yyx990803)