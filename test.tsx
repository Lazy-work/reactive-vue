
import { ref, reactive } from './src/index';
import { useReactive, useRef } from './src/react-helpers';

const counter = ref(0)
const store = reactive({ count: 0, name: 'John' });

function useCounter() {
  const [value, setValue] = useRef(counter);
  return {
    value,
    increment: () => setValue((v) => value + 1),
    decrement: () => setValue((v) => value - 1),
  };
}

function useStore() {
  const [value, setValue] = useReactive(store, ['count']);
  return {
    value: value.count,
    increment: () => setValue('count', (v) => v + 1),
    decrement: () => setValue('count', (v) => v - 1),
  };
}

function App() {
  const { value, increment, decrement } = useCounter()

  return (
    <div>
      <button onClick={increment}>+</button>
      <span>{value}</span>
      <button onClick={decrement}>-</button>
    </div>
  )
}