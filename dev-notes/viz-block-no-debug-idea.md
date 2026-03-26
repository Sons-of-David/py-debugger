# Idea: `# @end no_debug` — explicit no-snapshot closing tag

## Status: deferred (superseded by auto-skip for empty registry)

The current behavior (as of the "skip empty viz block" fix) is: if no visual elements exist when a viz block closes, the snapshot is silently skipped. This covers the common case (class-definition-only blocks).

If a finer-grained opt-out is ever needed (e.g. elements ARE registered, but the user still wants to suppress the snapshot for a specific block), this syntax was designed for it:

## Proposed syntax

```python
# @viz
# ... block body ...
# @end no_debug
```

## Implementation sketch

### `viz-block-parser.ts`

Introduce a helper in all three parser functions (`getVizRanges`, `getVizBadRanges`, `validateVizBlocks`):
```ts
const isEndTag = (t: string) => t === '# @end' || t === '# @end no_debug';
```
Replace every `t === '# @end'` check with `isEndTag(t)`.

### `executor.ts` — `preprocess`

```ts
if (line.trim() === '# @end no_debug')
  return `${indent}__viz_end__(dict(locals()), no_debug=True)`;
```
Leave `# @end` → `__viz_end__(dict(locals()))` unchanged (defaults `no_debug=False`).

### `vb_serializer.py`

**`__viz_end__` signature:**
```python
def __viz_end__(_, no_debug=False):
    pass
```

**Tracer (`_make_tracer`) — `__viz_end__` call intercept:**
```python
if event == 'call' and frame.f_code is _VIZ_END_CODE:
    caller = frame.f_back
    no_debug = frame.f_locals.get('no_debug', False)
    if caller:
        _engine.V.params = _build_scope(caller)
        current = _collect_v_values()
        last_v.clear()
        last_v.update(current)
        if not no_debug:
            on_snap(caller, caller.f_lineno, is_viz=True)
    return None
```

`frame.f_locals` is populated with arguments at the `call` event, so `no_debug` is readable there.
