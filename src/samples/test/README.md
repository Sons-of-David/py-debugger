# Test Samples

This folder works like `src/samples/local/` — committed to git, visible in the app
when running locally, hidden in production.  Use it to keep small, focused samples
that test specific engine scenarios.

## Layout

```
src/samples/test/
  *.json                  test sample files (visible in app, same format as other samples)
  fixtures/               generated expected engine output (one JSON per sample, gitignored)
  generate_fixtures.py    script to (re)generate fixture files
  README.md               this file

src/python-engine/tests/  ← the actual test code (committed)
  conftest.py
  test_basic.py
  test_snapshots.py
  test_event_handlers.py
  test_full_program.py    ← reads samples + fixtures from this folder
```

## Running the tests

From the repo root:

```bash
python3 -m pytest src/python-engine/tests/ -v
```

`test_full_program.py` skips automatically when no fixtures exist yet.

## Adding a test sample

1. Create a sample JSON file in this folder (same format as `algorithms/` or `features/`).
   Open the app locally to verify it looks and runs correctly.
2. Generate its fixture:
   ```bash
   python3 src/samples/test/generate_fixtures.py my-new-sample.json
   ```
3. Run the tests to confirm they pass:
   ```bash
   python3 -m pytest src/python-engine/tests/test_full_program.py -v
   ```
4. Commit the sample JSON and its fixture.

## Regenerating fixtures

After changing a test sample's `userCode` or after an intentional engine change:

```bash
# All test samples
python3 src/samples/test/generate_fixtures.py

# One sample by prefix
python3 src/samples/test/generate_fixtures.py my-sample
```

---

## Suggested future test areas

These are not yet covered but would further harden the engine:

1. **Import helpers** — samples that do `from graphs import ...`; verify `_init_namespace`
   exposes `imports/` so user code can import them.

2. **Step-limit guard** — code with an infinite loop should raise `PopupException` after
   100 000 steps, not hang.

3. **Error reporting** — `SerializationException` should carry the correct line number;
   the engine result JSON should contain an `error` key (not `timeline`) on failure.

4. **R() reference tracking** — `R()` is currently unused in user-facing code and samples
   (only in `user_api.py` isinstance guards). Verify whether it is still needed; if not,
   consider deprecating it.

5. **stdout capture** — `print()` in user code should appear in step `output` fields as
   incremental deltas across steps.

6. **Multiple viz blocks** — N `# @viz` / `# @end` pairs produce exactly N steps with
   `is_viz: true`.

7. **Nested panels** — an element inside a panel inside another panel serializes with the
   correct `panelId` at each level.

8. **Large-program step count** — all `algorithms/` samples complete without hitting the
   100 000-step guard.
