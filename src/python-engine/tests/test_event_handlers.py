"""Event handler trace tests: on_click, on_drag, on_input dispatching.

Each test runs a short program through the engine to establish the
namespace and element registry, then dispatches an event and asserts
on the resulting timeline.
"""

import json

import pytest
import _vb_engine as _engine
import vb_serializer as _ser
import user_api as api
import profiler as _profiler


# ── Helpers ───────────────────────────────────────────────────────────────────

def run_setup(user_code: str) -> dict:
    """Run user_code through the engine; return the parsed initial result.

    Does NOT reload modules (unlike profiler.bootstrap_engine) so that the
    module-level _engine / _ser imports in this file stay valid across the call.
    The autouse reset_engine fixture already cleared registry and namespace.
    """
    import json as _json
    viz_ranges_json = _json.dumps(_profiler.get_viz_ranges(user_code))
    _ser._init_namespace(viz_ranges_json)
    preprocessed = _profiler.preprocess(user_code)
    return _json.loads(_ser._exec_code(preprocessed))


def dispatch_click(elem_id: int, row: int = 0, col: int = 0) -> dict:
    return json.loads(_ser._exec_click_traced(elem_id, row, col))


def dispatch_drag(elem_id: int, row: int = 0, col: int = 0,
                  drag_type: str = 'start') -> dict:
    return json.loads(_ser._exec_drag_traced(elem_id, row, col, drag_type))


def dispatch_input(elem_id: int, text: str) -> dict:
    return json.loads(_ser._exec_input_changed(elem_id, text))


# ── on_click ──────────────────────────────────────────────────────────────────

CLICK_CODE = """\
# @viz
r = Rect(x=0, y=0)

def on_click(x: int, y: int):
    r.x = x
    r.y = y

r.on_click = on_click
# @end
"""


class TestOnClick:
    def test_click_produces_timeline(self):
        run_setup(CLICK_CODE)
        r = _engine.VisualElem._registry[0]
        result = dispatch_click(r._elem_id, row=3, col=5)
        assert len(result['timeline']) >= 1

    def test_click_mutates_state(self):
        run_setup(CLICK_CODE)
        r = _engine.VisualElem._registry[0]
        dispatch_click(r._elem_id, row=3, col=5)
        # on_click(self, x, y) — executor calls handler(col, row) so x=col, y=row
        assert r.x == 5
        assert r.y == 3

    def test_click_missing_handler_raises(self):
        run_setup("# @viz\nr = Rect()\n# @end\n")
        r = _engine.VisualElem._registry[0]
        with pytest.raises((ValueError, AttributeError)):
            _ser._exec_click_traced(r._elem_id, 0, 0)

    def test_click_nonexistent_elem_raises(self):
        run_setup("# @viz\nRect()\n# @end\n")
        with pytest.raises((ValueError, KeyError)):
            _ser._exec_click_traced(9999, 0, 0)

    def test_click_result_contains_handlers(self):
        run_setup(CLICK_CODE)
        r = _engine.VisualElem._registry[0]
        result = dispatch_click(r._elem_id)
        assert 'handlers' in result


# ── on_drag ───────────────────────────────────────────────────────────────────

DRAG_CODE = """\
# @viz
r = Rect(x=0, y=0)

def on_drag(x: int, y: int, drag_type: str):
    r.x = x

r.on_drag = on_drag
# @end
"""


class TestOnDrag:
    def test_drag_produces_timeline(self):
        run_setup(DRAG_CODE)
        r = _engine.VisualElem._registry[0]
        result = dispatch_drag(r._elem_id, row=1, col=4)
        assert len(result['timeline']) >= 1

    def test_drag_mutates_state(self):
        run_setup(DRAG_CODE)
        r = _engine.VisualElem._registry[0]
        dispatch_drag(r._elem_id, row=1, col=4)
        assert r.x == 4

    def test_drag_missing_handler_raises(self):
        run_setup("# @viz\nr = Rect()\n# @end\n")
        r = _engine.VisualElem._registry[0]
        with pytest.raises((ValueError, AttributeError)):
            _ser._exec_drag_traced(r._elem_id, 0, 0, 'start')


# ── on_input ──────────────────────────────────────────────────────────────────

INPUT_CODE = """\
# @viz
inp = Input(value='')
# @end
"""


class TestOnInput:
    def test_input_changed_updates_value(self):
        run_setup(INPUT_CODE)
        inp = _engine.VisualElem._registry[0]
        dispatch_input(inp._elem_id, 'hello')
        assert inp.value == 'hello'

    def test_input_changed_produces_timeline(self):
        run_setup(INPUT_CODE)
        inp = _engine.VisualElem._registry[0]
        result = dispatch_input(inp._elem_id, 'world')
        assert len(result['timeline']) >= 1

    def test_input_on_non_input_elem_raises(self):
        run_setup("# @viz\nr = Rect()\n# @end\n")
        r = _engine.VisualElem._registry[0]
        with pytest.raises((ValueError, TypeError)):
            _ser._exec_input_changed(r._elem_id, 'text')


# ── Handler with viz blocks ───────────────────────────────────────────────────

VIZ_HANDLER_CODE = """\
# @viz
r = Rect(x=0, y=0)

def on_click(x: int, y: int):
    # @viz
    r.x = x
    # @end

r.on_click = on_click
# @end
"""

CLASS_CLICK_CODE = """\
# @viz
class ClickRect(Rect):
    def on_click(self, x: int, y: int):
        self.x = x
        self.y = y

r = ClickRect(x=0, y=0)
# @end
"""


class TestHandlerWithVizBlocks:
    def test_viz_block_in_handler_produces_is_viz_step(self):
        run_setup(VIZ_HANDLER_CODE)
        r = _engine.VisualElem._registry[0]
        result = dispatch_click(r._elem_id, row=0, col=2)
        viz_steps = [s for s in result['timeline'] if s.get('is_viz')]
        assert len(viz_steps) >= 1


class TestClassMethodHandler:
    def test_class_method_on_click_mutates_state(self):
        run_setup(CLASS_CLICK_CODE)
        r = _engine.VisualElem._registry[0]
        dispatch_click(r._elem_id, row=3, col=5)
        assert r.x == 5
        assert r.y == 3

    def test_class_method_on_click_produces_timeline(self):
        run_setup(CLASS_CLICK_CODE)
        r = _engine.VisualElem._registry[0]
        result = dispatch_click(r._elem_id, row=1, col=2)
        assert len(result['timeline']) >= 1
