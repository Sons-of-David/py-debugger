# Testing Primer: TypeScript + Vitest

This project uses **Vitest** as its test runner. Tests live next to the files they test (e.g. `viz-block-parser.test.ts` next to `viz-block-parser.ts`).

Run tests with:
```bash
npm test          # watch mode — reruns on every save
npm test -- --run # one-shot, exits with pass/fail
```

---

## The building blocks

### `describe` — a group of related tests

```ts
describe('computeFoldingRanges', () => {
  // tests go here
});
```

`describe` is just a label. It groups tests together so the output is readable and you can nest sub-groups. Nothing runs yet — it's a container.

You can nest them:

```ts
describe('computeFoldingRanges', () => {
  describe('viz blocks', () => {
    // tests specifically about viz blocks
  });
  describe('indentation', () => {
    // tests specifically about indentation logic
  });
});
```

---

### `it` — a single test case

```ts
it('folds a simple def block', () => {
  // ...
});
```

`it` (also aliased as `test`) is one test. The string is the name shown in output. The function is the test body. If the function throws, the test fails. If it returns without throwing, the test passes.

---

### `expect` — making an assertion

```ts
expect(result).toContainEqual({ start: 1, end: 3 });
```

`expect(value)` wraps a value so you can make claims about it. If the claim is wrong, it throws with a helpful message.

Common matchers:

| Matcher | What it checks |
|---|---|
| `.toBe(x)` | Strict equality (`===`) — use for primitives |
| `.toEqual(x)` | Deep equality — use for objects and arrays |
| `.toContainEqual(x)` | Array contains an element deeply equal to `x` |
| `.toHaveLength(n)` | Array or string has length `n` |
| `.toBeNull()` | Value is `null` |
| `.toBeTruthy()` / `.toBeFalsy()` | Value is truthy / falsy |
| `.toThrow()` | Function throws when called |

`.toBe` vs `.toEqual`:
```ts
expect({ a: 1 }).toBe({ a: 1 });     // FAILS — different object references
expect({ a: 1 }).toEqual({ a: 1 });  // passes — same shape
```

Negation — prefix any matcher with `.not`:
```ts
expect(result).not.toHaveLength(0);
```

---

## Putting it all together

```ts
import { describe, it, expect } from 'vitest';
import { computeFoldingRanges } from './viz-block-parser';

describe('computeFoldingRanges', () => {
  it('folds a simple def block', () => {
    const code = `def foo():\n    x = 1\n`;

    const result = computeFoldingRanges(code, []);

    expect(result).toContainEqual({ start: 1, end: 2 });
  });
});
```

The pattern is always:
1. **Arrange** — set up inputs
2. **Act** — call the function
3. **Assert** — `expect(result).to...`

---

## What makes a good unit test

- Test **one thing** per `it`. If the test name needs "and", split it.
- Test the **output for a given input** — not the internal steps.
- Use realistic inputs that match how the function is actually called.
- Test edge cases: empty input, single item, boundaries.

---

## What Vitest does NOT need

- No browser. These tests run in Node — `document`, `window`, etc. are not available unless you set `environment: 'jsdom'` in `vite.config.ts`.
- No React rendering. Tests for pure functions (like `computeFoldingRanges`) don't need `@testing-library/react`. That's only for component tests.
