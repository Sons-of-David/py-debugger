"""Shared pytest configuration for Python engine tests.

Adds the python-engine directory to sys.path so that _vb_engine, user_api,
and vb_serializer can be imported directly.  Provides two shared fixtures:

  reset_engine  (autouse) — clears the element registry and resets all engine
                             state before every test.
  run_code                — helper fixture that runs a userCode string through
                             the full engine pipeline and returns the parsed
                             result dict.
"""

import sys
import os
import json

import pytest

# ── Path setup ────────────────────────────────────────────────────────────────
HERE = os.path.dirname(os.path.abspath(__file__))
PYTHON_ENGINE_DIR = os.path.dirname(HERE)          # src/python-engine/
IMPORTS_DIR = os.path.join(PYTHON_ENGINE_DIR, 'imports')  # graphs, array_utils, etc.
sys.path.insert(0, PYTHON_ENGINE_DIR)
sys.path.insert(0, IMPORTS_DIR)

# Re-use helpers already defined in profiler.py rather than duplicating them.
import profiler as _profiler  # noqa: E402  (path must be set first)
import _vb_engine as _engine  # noqa: E402
import vb_serializer as _ser  # noqa: E402


# ── Shared fixtures ───────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def reset_engine():
    """Reset engine state before every test.

    _clear_registry() handles VisualElem registry, _vis_elem_id, V._count,
    V.params, and V.scope.  We additionally reset snapshot delta state and the
    execution namespace so each test starts completely clean.
    """
    _engine.VisualElem._clear_registry()
    _ser._reset_snap_state()
    if hasattr(_ser, '_namespace'):
        _ser._namespace.clear()
    yield
    # Teardown: same reset so a crashing test doesn't pollute the next one.
    _engine.VisualElem._clear_registry()
    _ser._reset_snap_state()
    if hasattr(_ser, '_namespace'):
        _ser._namespace.clear()


@pytest.fixture
def run_code():
    """Return a callable that runs userCode through the engine.

    Usage inside a test::

        def test_something(run_code):
            result = run_code("# @viz\\nRect(x=0,y=0)\\n# @end\\n")
            assert len(result['timeline']) == 1
    """
    def _run(user_code: str) -> dict:
        # bootstrap_engine calls _clear_registry, _init_namespace, and returns
        # (vb_serializer module, preprocessed code string).
        ser, preprocessed = _profiler.bootstrap_engine(user_code)
        result_json: str = ser._exec_code(preprocessed)
        return json.loads(result_json)

    return _run
