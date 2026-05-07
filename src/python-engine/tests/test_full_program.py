"""Full-program regression tests.

For each fixture file under src/samples/test/fixtures/, loads the
corresponding sample from src/samples/test/, runs it through the Python
engine, and asserts the output matches the stored fixture.

Test samples are small, curated JSON files in src/samples/test/ (visible
in the app locally, like the local/ folder).

Fixtures are generated (or regenerated) by running:
    python src/samples/test/generate_fixtures.py

Tests are skipped when no fixture files are present yet.
"""

import json
import sys
from pathlib import Path

import pytest

import profiler as _profiler
import vb_serializer as _ser

ROOT             = Path(__file__).parent.parent.parent.parent
TEST_SAMPLES_DIR = ROOT / 'src' / 'samples' / 'test'
FIXTURES_DIR     = TEST_SAMPLES_DIR / 'fixtures'

sys.path.insert(0, str(TEST_SAMPLES_DIR))
from sample_loader import load_sample_code


def _fixture_paths():
    """Return all .json fixture paths, or an empty list if the directory doesn't exist."""
    if not FIXTURES_DIR.is_dir():
        return []
    return sorted(FIXTURES_DIR.glob('*.json'))


def _run_sample(user_code: str) -> dict:
    """Run user_code through the engine and return parsed result dict."""
    viz_ranges_json = json.dumps(_profiler.get_viz_ranges(user_code))
    _ser._init_namespace(viz_ranges_json)
    preprocessed = _profiler.preprocess(user_code)
    return json.loads(_ser._exec_code(preprocessed))


# ── Parametrized regression test ──────────────────────────────────────────────

fixture_paths = _fixture_paths()

@pytest.mark.skipif(
    len(fixture_paths) == 0,
    reason=(
        "No fixture files found under src/samples/test/fixtures/. "
        "Add test samples to src/samples/test/ then run "
        "`python src/samples/test/generate_fixtures.py`."
    ),
)
@pytest.mark.parametrize("fixture_path", fixture_paths,
                         ids=[p.name for p in fixture_paths])
def test_full_program(fixture_path):
    # The sample JSON lives alongside the fixture, in src/samples/test/
    sample_path = TEST_SAMPLES_DIR / fixture_path.name
    assert sample_path.is_file(), (
        f"Sample file not found: {sample_path}\n"
        f"(fixture: {fixture_path})"
    )

    user_code = load_sample_code(str(sample_path))

    with open(fixture_path) as f:
        expected = json.load(f)

    actual = _run_sample(user_code)

    # Drop profiling console output — varies by run time, not a regression signal.
    actual.pop('console', None)
    expected.pop('console', None)

    assert actual == expected, _diff_message(actual, expected, fixture_path)


def _diff_message(actual: dict, expected: dict, fixture_path: str) -> str:
    """Return a human-readable diff summary for assertion failures."""
    lines = [f"Mismatch for fixture: {fixture_path.relative_to(ROOT)}"]

    act_steps = actual.get('timeline', [])
    exp_steps = expected.get('timeline', [])
    lines.append(f"  timeline steps: actual={len(act_steps)}, expected={len(exp_steps)}")

    for i, (a, e) in enumerate(zip(act_steps, exp_steps)):
        if a != e:
            lines.append(f"  first diff at step {i}:")
            lines.append(f"    actual  : {json.dumps(a)[:200]}")
            lines.append(f"    expected: {json.dumps(e)[:200]}")
            break

    if actual.get('handlers') != expected.get('handlers'):
        lines.append(f"  handlers differ:")
        lines.append(f"    actual  : {actual.get('handlers')}")
        lines.append(f"    expected: {expected.get('handlers')}")

    return '\n'.join(lines)
