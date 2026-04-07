"""Basic element operation tests: creation, deletion, panel membership.

These tests exercise the Python-level registry and parent/child relationships
without running the full trace pipeline.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
import _vb_engine as _engine
import user_api as api


# ── Element creation ──────────────────────────────────────────────────────────

class TestElementCreation:
    def test_rect_assigned_elem_id(self):
        r = api.Rect()
        assert r._elem_id == 0

    def test_ids_increment(self):
        a = api.Rect()
        b = api.Circle()
        assert b._elem_id == a._elem_id + 1

    @pytest.mark.parametrize("cls,kwargs", [
        (api.Rect,    {}),
        (api.Circle,  {}),
        (api.Arrow,   {}),
        (api.Label,   {}),
        (api.Line,    {}),
        (api.Array,   {"cells": [1, 2, 3]}),
        (api.Array2D, {"cells": [[1, 2], [3, 4]]}),
        (api.Input,   {}),
        (api.Panel,   {}),
    ])
    def test_element_in_registry(self, cls, kwargs):
        elem = cls(**kwargs)
        assert elem in _engine.VisualElem._registry

    def test_registry_reset_between_tests(self):
        # conftest autouse fixture clears registry; this confirms it's clean.
        assert _engine.VisualElem._registry == []
        api.Rect()
        assert len(_engine.VisualElem._registry) == 1


# ── Element deletion ──────────────────────────────────────────────────────────

class TestElementDeletion:
    def test_delete_removes_from_registry(self):
        r = api.Rect()
        assert r in _engine.VisualElem._registry
        r.delete()
        assert r not in _engine.VisualElem._registry

    def test_delete_idempotent(self):
        r = api.Rect()
        r.delete()
        r.delete()  # should not raise

    def test_delete_leaves_others_intact(self):
        a = api.Rect()
        b = api.Circle()
        a.delete()
        assert b in _engine.VisualElem._registry
        assert a not in _engine.VisualElem._registry


# ── Panel add / remove ────────────────────────────────────────────────────────

class TestPanelAddRemove:
    def test_add_sets_parent(self):
        p = api.Panel()
        r = api.Rect()
        p.add(r)
        assert r._parent is p

    def test_add_child_in_serialization_has_panel_id(self):
        p = api.Panel()
        r = api.Rect()
        p.add(r)
        s = r._serialize()
        assert s.get('panelId') == str(p._elem_id)

    def test_remove_clears_parent(self):
        p = api.Panel()
        r = api.Rect()
        p.add(r)
        p.remove(r)
        assert r._parent is None

    def test_remove_child_not_in_serialization(self):
        p = api.Panel()
        r = api.Rect()
        p.add(r)
        p.remove(r)
        s = r._serialize()
        assert 'panelId' not in s

    def test_add_to_two_panels_moves_child(self):
        p1 = api.Panel()
        p2 = api.Panel()
        r = api.Rect()
        p1.add(r)
        p2.add(r)
        assert r._parent is p2
        assert r not in p1._children
        assert r in p2._children

    def test_panel_len(self):
        p = api.Panel()
        p.add(api.Rect(), api.Circle())
        assert len(p) == 2


# ── Panel deletion cascade ────────────────────────────────────────────────────

class TestPanelDeletion:
    def test_delete_panel_removes_all_children(self):
        p = api.Panel()
        r = api.Rect()
        c = api.Circle()
        p.add(r, c)
        p.delete()
        assert r not in _engine.VisualElem._registry
        assert c not in _engine.VisualElem._registry
        assert p not in _engine.VisualElem._registry

    def test_delete_child_removes_from_panel(self):
        p = api.Panel()
        r = api.Rect()
        p.add(r)
        r.delete()
        # elem gone from registry
        assert r not in _engine.VisualElem._registry
        # elem gone from panel children
        assert r not in p._children
        # panel still exists
        assert p in _engine.VisualElem._registry


# ── z-order and visibility ────────────────────────────────────────────────────

class TestZAndVisibility:
    def test_z_serialized(self):
        r = api.Rect(z=5)
        s = r._serialize()
        assert s['z'] == 5

    def test_visibility_false_serialized(self):
        r = api.Rect(visible=False)
        s = r._serialize()
        assert s['visible'] is False

    def test_default_visibility_true(self):
        r = api.Rect()
        s = r._serialize()
        assert s['visible'] is True
