"""Shared helper: load the combined Python code from a sample JSON file.

Handles both the current format (editorState.tabs) and the legacy format
(top-level userCode / combinedCode).  Import this from generate_fixtures.py
and test_full_program.py so the extraction logic lives in exactly one place.
"""

import json


def load_sample_code(path: str) -> str:
    """Return the combined user code from a sample JSON file.

    Current format:  editorState.tabs[].code — tabs are reversed then joined.
    Legacy formats:  top-level 'userCode' or 'combinedCode' string.
    """
    with open(path) as f:
        data = json.load(f)

    if 'editorState' in data:
        tabs = data['editorState']['tabs']
        return '\n'.join(t['code'] for t in reversed(tabs))

    # Legacy fall-through
    return data.get('userCode') or data.get('combinedCode', '')
