"""Serialization tests: shape field presence, V() binding, and delta logic.

These tests exercise _serialize() on individual elements and the
_serialize_visual_builder() delta/full-snapshot logic — without running
the full trace pipeline.
"""

import pytest
import _vb_engine as _engine
import vb_serializer as _ser
import user_api as api


# ── Helpers ───────────────────────────────────────────────────────────────────

def full_snapshot():
    """Return a fresh full snapshot (resets delta state first)."""
    _ser._reset_snap_state()
    return _ser._serialize_visual_builder()


def next_snapshot():
    """Return the next snapshot without resetting (may be delta)."""
    return _ser._serialize_visual_builder()


# ── Per-type serialization ────────────────────────────────────────────────────

class TestShapeFields:
    @pytest.mark.parametrize("cls,kwargs,expected", [
        (api.Rect,
         {'x': 1, 'y': 2, 'width': 3, 'height': 4, 'color': (10, 20, 30)},
         {'type': 'rect', 'x': 1, 'y': 2, 'width': 3, 'height': 4, 'color': [10, 20, 30], 'visible': True}),

        (api.Circle,
         {'x': 0, 'y': 0, 'width': 2, 'height': 2, 'color': (59, 130, 246)},
         {'type': 'circle', 'color': [59, 130, 246]}),

        (api.Arrow,
         {'angle': 90},
         {'type': 'arrow', 'angle': 90.0}),

        (api.Label,
         {'label': 'hello', 'font_size': 18},
         {'type': 'label', 'label': 'hello', 'fontSize': 18}),

        (api.Input,
         {'value': 'hi', 'placeholder': 'type here'},
         {'type': 'input', 'value': 'hi', 'placeholder': 'type here'}),

        (api.Array,
         {'cells': [7, 8, 9], 'direction': 'down', 'show_index': False},
         {'type': 'array', 'values': [7, 8, 9], 'direction': 'down', 'showIndex': False}),

        (api.Array2D,
         {'cells': [[1, 2], [3, 4]]},
         {'type': 'array2d', 'values': [[1, 2], [3, 4]]}),

        (api.Panel,
         {'name': 'p1', 'width': 5, 'height': 3, 'show_border': True},
         {'type': 'panel', 'name': 'p1', 'width': 5, 'height': 3, 'show_border': True}),
    ])
    def test_shape_fields(self, cls, kwargs, expected):
        elem = cls(**kwargs)
        s = elem._serialize()
        for key, val in expected.items():
            assert s[key] == val, f"{cls.__name__}: {key} = {s[key]!r}, expected {val!r}"
        assert '_elem_id' in s

    def test_line_fields(self):
        ln = api.Line(start=(1, 2), end=(3, 4), color=(255, 0, 0),
                      stroke_weight=3, start_cap='none', end_cap='arrow')
        s = ln._serialize()
        assert s['type'] == 'line'
        assert s['start'] == [1, 2]
        assert s['end'] == [3, 4]
        assert s['color'] == [255, 0, 0]
        assert s['strokeWeight'] == pytest.approx(3.0)
        assert s['startCap'] == 'none'
        assert s['endCap'] == 'arrow'
        assert s['animate'] is True

    def test_line_animate_false(self):
        ln = api.Line(animate=False)
        s = ln._serialize()
        assert s['animate'] is False

    def test_label_none_color_omitted(self):
        lb = api.Label()  # color defaults to None
        s = lb._serialize()
        assert 'color' not in s

    def test_panel_child_has_panel_id(self):
        p = api.Panel()
        r = api.Rect()
        p.add(r)
        s = r._serialize()
        assert s['panelId'] == str(p._elem_id)

    def test_standalone_elem_has_no_panel_id(self):
        r = api.Rect()
        s = r._serialize()
        assert 'panelId' not in s


# ── V() expression binding ────────────────────────────────────────────────────

class TestVBinding:
    def test_v_eval_with_params(self):
        r = api.Rect()
        r.x = api.V('i * 2')
        _engine.V.params = {'i': 5}
        s = r._serialize()
        assert s['x'] == 10

    def test_v_default_when_name_missing(self):
        r = api.Rect()
        r.x = api.V('undefined_var', default=99)
        _engine.V.params = {}
        s = r._serialize()
        assert s['x'] == 99

    def test_v_safe_globals_len(self):
        r = api.Rect()
        r.width = api.V('len(items)', default=0)
        _engine.V.params = {'items': [1, 2, 3]}
        s = r._serialize()
        assert s['width'] == 3

    def test_v_blocks_unsafe_builtins(self):
        r = api.Rect()
        # __import__ is not in SAFE_GLOBALS, so this should fall back to default
        r.x = api.V('__import__("os").getpid()', default=-1)
        _engine.V.params = {}
        s = r._serialize()
        assert s['x'] == -1

    def test_v_count_increments(self):
        before = _engine.V._count
        api.V('x')
        api.V('y')
        assert _engine.V._count == before + 2


# ── Delta serialization ───────────────────────────────────────────────────────

class TestDeltaSerialization:
    def test_first_call_returns_full_list(self):
        api.Rect()
        snap = full_snapshot()
        assert isinstance(snap, list)
        assert len(snap) == 1

    def test_second_call_returns_delta_when_no_v(self):
        api.Rect()
        full_snapshot()
        snap = next_snapshot()
        assert isinstance(snap, dict)
        assert snap['is_delta'] is True

    def test_delta_no_change_empty(self):
        api.Rect()
        full_snapshot()
        snap = next_snapshot()
        assert snap['changed'] == []
        assert snap['deleted'] == []

    def test_delta_mutation_appears_in_changed(self):
        r = api.Rect(x=0)
        full_snapshot()
        r.x = 5
        snap = next_snapshot()
        assert snap['is_delta'] is True
        assert any(e['_elem_id'] == r._elem_id and e['x'] == 5 for e in snap['changed'])

    def test_delta_deletion_appears_in_deleted(self):
        r = api.Rect()
        full_snapshot()
        elem_id = r._elem_id
        r.delete()
        snap = next_snapshot()
        assert elem_id in snap['deleted']

    def test_delta_disabled_when_v_exists(self):
        r = api.Rect()
        r.x = api.V('i', default=0)
        full_snapshot()
        # V._count > 0 forces a full snapshot on every call
        snap = next_snapshot()
        assert isinstance(snap, list)

    def test_full_snapshot_contains_all_elements(self):
        api.Rect()
        api.Circle()
        api.Arrow()
        snap = full_snapshot()
        assert len(snap) == 3
        types = {e['type'] for e in snap}
        assert types == {'rect', 'circle', 'arrow'}
