"""Utility helpers for list/array algorithm debugging."""


def swap(lst, i, j):
    """Swap two elements in a list in place."""
    lst[i], lst[j] = lst[j], lst[i]
