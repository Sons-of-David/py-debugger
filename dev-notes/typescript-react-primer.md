# TypeScript + React Primer

> For programmers who know Python / C# well, but are new to TypeScript and React.

---

## Part 1 — TypeScript in 5 Minutes

TypeScript is JavaScript with a type system bolted on. It compiles away to plain JS at build time — the types exist only for you and the compiler.

```ts
// Basic types
let count: number = 0;
let name: string = "Alice";
let active: boolean = true;

// Arrays and objects
let items: string[] = ["a", "b"];
let point: { x: number; y: number } = { x: 1, y: 2 };

// Interfaces (like C# interfaces / Python dataclasses)
interface Cell {
  row: number;
  col: number;
  value: string;
}

// Type aliases — same idea, slightly different syntax
type Color = "red" | "green" | "blue";   // union / enum-like

// Generics
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// Optional fields (like Python's Optional[])
interface Config {
  label: string;
  color?: string;   // may be string or undefined
}
```

**Key differences from Python/C#**

| Python/C# | TypeScript |
|-----------|-----------|
| `None` | `null` or `undefined` (two different things) |
| `dict` | `Record<string, V>` or an `interface {}` |
| `list[T]` | `T[]` or `Array<T>` |
| `Optional[T]` | `T \| undefined` or `T \| null` |
| Abstract base class | `interface` + `type` |
| `print(type(x))` | `typeof x` (primitive) / `x instanceof Foo` (object) |

TypeScript uses **structural typing** (duck typing with static checks), not nominal typing. Two different interfaces with the same shape are interchangeable.

---

## Part 2 — The React Mental Model

### React is declarative, not imperative

In C# WinForms / WPF you might write:
```csharp
button.Text = "Submit";
label.Visible = false;
listBox.Items.Add(item);
```
You imperatively mutate UI objects.

In React you instead **describe** what the UI should look like given some data, and React figures out what changed:

```tsx
function MyComponent({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map(item => <li key={item}>{item}</li>)}
    </ul>
  );
}
```

When `items` changes, React re-runs this function and produces a new description (virtual DOM). It diffs the old vs new description, then patches only what changed in the real DOM.

**Core mental model:** A React component is a **pure function** from data → UI description. You change the data, React re-renders the UI automatically.

### JSX is just syntax sugar

```tsx
// This JSX:
<Button color="red" onClick={handleClick}>Submit</Button>

// Compiles to:
React.createElement(Button, { color: "red", onClick: handleClick }, "Submit")
```

JSX lives in `.tsx` files. It looks like HTML but it's TypeScript — you can embed any expression inside `{}`.

---

## Part 3 — The Component Lifecycle

A component's life is simple:

1. **Mount** — first render, DOM node created
2. **Update** — state or props changed, re-renders
3. **Unmount** — removed from DOM

Every time the component re-renders, the **entire function body runs again** from top to bottom. This is crucial. All local variables are recalculated. The hooks (`useState`, `useEffect`, etc.) are the only way to persist information across renders.

```tsx
function Counter() {
  // This runs on EVERY render
  const x = 5;                     // recalculated each render (that's fine)
  const [count, setCount] = useState(0);  // persisted across renders by React

  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

---

## Part 4 — `useState` — reactive variables

```tsx
const [value, setValue] = useState<number>(0);
//     ^read    ^write             ^initial value
```

Think of `useState` as:
- **`value`** — a snapshot of the current value *for this render*
- **`setValue`** — a signal to React: "re-render me with this new value"

**Calling `setValue` does not change `value` immediately.** It schedules a re-render. On the next render, `value` will be the new value.

```tsx
// Wrong mental model (imperative thinking):
setValue(count + 1);
console.log(count);  // still the OLD value!

// Right mental model: setValue triggers a new render, in which count is updated
```

**Functional update form** — use this when new state depends on old state:
```tsx
setCount(prev => prev + 1);  // safe, always uses the latest value
```

**Objects/arrays** — React compares by reference, so you must replace, not mutate:
```tsx
// Wrong — mutates in place, React won't see the change:
myArray.push(item);
setMyArray(myArray);

// Right — new array reference:
setMyArray([...myArray, item]);

// Wrong — mutating object:
myObj.name = "Alice";
setMyObj(myObj);

// Right:
setMyObj({ ...myObj, name: "Alice" });
```

---

## Part 5 — `useEffect` — side effects and lifecycle

`useEffect` lets you run code **after** React has rendered. It's where you do things that aren't pure rendering: fetching data, subscribing to events, timers, talking to external systems.

```tsx
useEffect(() => {
  // runs after every render (rarely what you want)
});

useEffect(() => {
  // runs only once, after the first render (like componentDidMount)
}, []);

useEffect(() => {
  // runs after first render, AND whenever `userId` changes
}, [userId]);
```

The array at the end is the **dependency array** — "re-run this effect when any of these values change."

### Cleanup

Return a function to clean up when the component unmounts or before the effect re-runs:

```tsx
useEffect(() => {
  const interval = setInterval(() => tick(), 1000);
  return () => clearInterval(interval);   // cleanup
}, []);
```

This is equivalent to C#'s `IDisposable` / `using`, or Python's `__exit__`. Without cleanup you get memory leaks and stale callbacks.

### Common pitfall: stale closures

The effect captures the values of variables **at the time it was created**. If you forget to add a dependency, you'll read a stale value:

```tsx
// Bug: effect was created when count=0, never re-runs, always sees count=0
useEffect(() => {
  console.log(count);  // always 0!
}, []);   // missing dependency

// Fix:
useEffect(() => {
  console.log(count);
}, [count]);   // re-runs when count changes
```

---

## Part 6 — `useCallback` — stable function references

Every render, the component function runs again. That means every function defined inside it is **a brand new object** on each render.

```tsx
function Parent() {
  const handleClick = () => doSomething();  // new function object every render
  return <Child onClick={handleClick} />;
}
```

If `Child` is wrapped in `React.memo` (see below), it skips re-rendering when its props haven't changed. But if `handleClick` is a new object every time, `Child` always sees "changed props" and re-renders anyway.

`useCallback` memoizes a function — it returns the **same function object** across renders unless its dependencies change:

```tsx
const handleClick = useCallback(() => {
  doSomethingWith(userId);
}, [userId]);   // only recreates if userId changes
```

**When to use it:** When passing callbacks to child components wrapped in `React.memo`, or when a function is in a `useEffect` dependency array.

**When NOT to bother:** For event handlers on simple HTML elements — the overhead isn't worth it there.

---

## Part 7 — `useMemo` — memoized computed values

Same idea as `useCallback` but for values, not functions. Equivalent to C#'s lazy computed properties, or Python's `@functools.lru_cache` (but dependency-based, not argument-based).

```tsx
// Without useMemo: expensive() runs on EVERY render
const result = expensive(data);

// With useMemo: only re-runs when `data` changes
const result = useMemo(() => expensive(data), [data]);
```

**When to use it:** When a computation is genuinely expensive (sorting large arrays, complex transforms). Don't reach for it prematurely — the memoization itself has overhead.

---

## Part 8 — `useRef` — mutable box that doesn't trigger re-renders

`useRef` is a plain mutable object `{ current: T }` that persists across renders. Unlike `useState`, **changing `.current` does NOT cause a re-render**.

Two main uses:

**1. DOM node references (like C#'s `Control` handle):**
```tsx
const inputRef = useRef<HTMLInputElement>(null);

useEffect(() => {
  inputRef.current?.focus();  // programmatically focus the input
}, []);

return <input ref={inputRef} />;
```

**2. Instance variables that shouldn't trigger renders:**
```tsx
const timerRef = useRef<number | null>(null);

function start() {
  timerRef.current = window.setInterval(tick, 100);
}
function stop() {
  if (timerRef.current) clearInterval(timerRef.current);
}
```

Think of `useRef` as "I need to remember something across renders but I don't want it to be part of the render cycle."

---

## Part 9 — Props — passing data down

Props are the component's input parameters. In TypeScript, you define an interface for them:

```tsx
interface GridCellProps {
  row: number;
  col: number;
  color: string;
  onClick: (row: number, col: number) => void;
}

function GridCell({ row, col, color, onClick }: GridCellProps) {
  return (
    <div
      style={{ backgroundColor: color }}
      onClick={() => onClick(row, col)}
    />
  );
}

// Usage:
<GridCell row={0} col={1} color="red" onClick={handleCellClick} />
```

Props flow **down** (parent → child). To communicate back up, the parent passes a callback as a prop, and the child calls it.

**`children` prop** — content between component tags:
```tsx
function Card({ children }: { children: React.ReactNode }) {
  return <div className="card">{children}</div>;
}

<Card><p>Hello</p></Card>
```

---

## Part 10 — `React.memo` — skipping re-renders

By default, when a parent re-renders, **all its children re-render too**, even if their props didn't change.

`React.memo` wraps a component and makes it only re-render when its props actually change (shallow equality check):

```tsx
const GridCell = React.memo(function GridCell({ row, col, color }: GridCellProps) {
  return <div style={{ backgroundColor: color }} />;
});
```

This is why `useCallback` and `useMemo` matter — they ensure the prop values passed to memoized children are stable references.

---

## Part 11 — Context — global-ish state

For state that many components need (like a theme, or the current user), drilling props through every level is painful. `useContext` lets you broadcast state down the tree without explicit prop-passing.

```tsx
// 1. Create a context
const AppModeContext = createContext<AppMode>("idle");

// 2. Provide it high in the tree
function App() {
  const [mode, setMode] = useState<AppMode>("idle");
  return (
    <AppModeContext.Provider value={mode}>
      <DeepChild />
    </AppModeContext.Provider>
  );
}

// 3. Consume anywhere in the subtree
function DeepChild() {
  const mode = useContext(AppModeContext);
  return <div>Mode is: {mode}</div>;
}
```

When the context value changes, **every component that calls `useContext` for that context re-renders**. For high-frequency state, this can cause performance problems — consider splitting contexts or using `useMemo`.

---

## Part 12 — The Complete Re-render Mental Model

When state changes, here's what happens:

```
1. You call setState(newValue)
2. React schedules a re-render of that component
3. React runs the component function again, top to bottom
4. Hooks return updated values (useState returns newValue)
5. Component returns a new JSX description
6. React diffs old vs new virtual DOM
7. React patches only the changed real DOM nodes
8. useEffect cleanup runs for effects whose deps changed
9. useEffect callbacks run for effects whose deps changed
```

**It's not event-based in the traditional sense** — there's no explicit subscription. You just return a description of what the UI should look like given current state, and React handles the rest. The "event" is implicit: any state change causes the function to re-run.

---

## Quick Reference

| Hook | Purpose | Analogy |
|------|---------|---------|
| `useState` | Reactive variable — changes trigger re-render | C# property with `INotifyPropertyChanged` |
| `useEffect` | Side effects after render | Constructor + Dispose + event handlers |
| `useCallback` | Stable function reference across renders | Cached delegate |
| `useMemo` | Cached computed value | Lazy property / `lru_cache` |
| `useRef` | Mutable box, no re-render | Instance field |
| `useContext` | Read broadcast state | Dependency injection / singleton |

---

## Common Gotchas

**1. State updates are asynchronous — don't read state right after setting it.**

**2. Don't put everything in state.** If a value can be derived from existing state, compute it during render or use `useMemo`. Only store what you can't derive.

**3. The dependency array is not optional.** ESLint's `exhaustive-deps` rule exists for a reason. If you leave out a dep to "avoid infinite loops", you have a logic bug — fix the logic, not the array.

**4. Effects that set state can loop.** If an effect sets state, and that state is in its dependency array, it will loop. Design your dependencies carefully.

**5. Strict Mode runs effects twice** (in development only) to catch cleanup bugs. If something breaks because of this, you have a missing cleanup.
