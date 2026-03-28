"""Standalone profiler for the visual builder engine.

Usage:
    python profiler.py <sample-name>          # e.g. python profiler.py 9-astar-maze
    python profiler.py <sample-name> --stats  # also print cProfile top-20 calls

The script loads a sample JSON file from src/samples/, preprocesses the code
(replicating the TypeScript # @viz / # @end substitution), initialises the
engine, and runs _exec_code under cProfile.

Run from the repo root or from this directory:
    python src/python-engine/profiler.py 9-astar-maze
"""

import sys
import os
import json
import re
import cProfile
import pstats
import io

# ── Path setup ────────────────────────────────────────────────────────────────
# Allow importing _vb_engine, user_api, vb_serializer from this directory.
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, HERE)

# ── Helpers ───────────────────────────────────────────────────────────────────

def load_sample(name: str) -> str:
    """Return the userCode string from a sample JSON file."""
    samples_dir = os.path.join(ROOT, 'src', 'samples')
    # Accept with or without .json extension
    candidates = [
        os.path.join(samples_dir, name),
        os.path.join(samples_dir, name + '.json'),
    ]
    # Also search by prefix (e.g. "9" matches "9-astar-maze.json")
    for fname in os.listdir(samples_dir):
        if fname.startswith(name) and fname.endswith('.json'):
            candidates.insert(0, os.path.join(samples_dir, fname))

    for path in candidates:
        if os.path.isfile(path):
            with open(path) as f:
                data = json.load(f)
            print(f"Loaded: {path}")
            return data['userCode']

    raise FileNotFoundError(f"Sample '{name}' not found in {samples_dir}")


def get_viz_ranges(code: str) -> list[dict]:
    """Replicate TypeScript getVizRanges: find matched # @viz / # @end pairs."""
    ranges = []
    stack = []
    for i, line in enumerate(code.splitlines(), start=1):
        stripped = line.strip()
        if stripped == '# @viz':
            stack.append(i)
        elif stripped == '# @end':
            if stack:
                start = stack.pop()
                ranges.append({'startLine': start, 'endLine': i})
    return ranges


def preprocess(code: str) -> str:
    """Replicate TypeScript preprocess: replace # @viz / # @end markers."""
    lines = []
    for line in code.splitlines():
        indent = re.match(r'^(\s*)', line).group(1)
        stripped = line.strip()
        if stripped == '# @viz':
            lines.append(f'{indent}__viz_begin__()')
        elif stripped == '# @end':
            lines.append(f'{indent}__viz_end__(dict(locals()))')
        else:
            lines.append(line)
    return '\n'.join(lines)


# ── Engine bootstrap ──────────────────────────────────────────────────────────

def bootstrap_engine(code: str):
    """Import and initialise vb_serializer for a fresh run."""
    import importlib

    # Force fresh module loads so repeated runs in the same process are clean.
    for mod in ('_vb_engine', 'user_api', 'vb_serializer'):
        sys.modules.pop(mod, None)

    import _vb_engine as _engine  # noqa
    import vb_serializer as _ser  # noqa

    _engine.VisualElem._clear_registry()

    viz_ranges_json = json.dumps(get_viz_ranges(code))
    _ser._init_namespace(viz_ranges_json)

    return _ser, preprocess(code)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    show_stats = '--stats' in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith('--')]

    if not args:
        print(__doc__)
        sys.exit(1)

    sample_name = args[0]
    user_code = load_sample(sample_name)
    ser, preprocessed = bootstrap_engine(user_code)

    print(f"Running _exec_code under cProfile …\n")

    pr = cProfile.Profile()
    pr.enable()
    result_json = ser._exec_code(preprocessed)
    pr.disable()

    result = json.loads(result_json)
    print(f"steps      : {len(result['timeline'])}")
    if result.get('console'):
        print(result['console'])

    if show_stats:
        print()
        s = io.StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
        ps.print_stats(25)
        print(s.getvalue())
    else:
        print("\nRun with --stats to see cProfile output.")


if __name__ == '__main__':
    main()
