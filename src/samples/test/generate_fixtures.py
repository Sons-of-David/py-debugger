"""Generate (or regenerate) fixture files for the full-program regression tests.

Each fixture is the JSON output of running a sample's userCode through the Python
engine.  Fixtures are stored in src/samples/test/fixtures/, one file per sample in
this folder.

Usage (run from repo root or from any directory):

    python src/samples/test/generate_fixtures.py              # all test samples
    python src/samples/test/generate_fixtures.py my-sample    # one sample by prefix

Run this whenever you:
  - Add a new sample to src/samples/test/
  - Change an existing test sample's userCode
  - Intentionally change engine serialization output

After running, commit the updated fixture files and re-run the tests to confirm
they pass.
"""

import sys
import os
import json
import glob
import argparse

HERE        = os.path.dirname(os.path.abspath(__file__))
ROOT        = os.path.join(HERE, '..', '..', '..')
PY_DIR      = os.path.join(ROOT, 'src', 'python-engine')
IMPORTS_DIR = os.path.join(PY_DIR, 'imports')
sys.path.insert(0, PY_DIR)
sys.path.insert(0, IMPORTS_DIR)
sys.path.insert(0, HERE)

import profiler as _profiler
import vb_serializer as _ser
import _vb_engine as _engine
from sample_loader import load_sample_code

TEST_SAMPLES_DIR = HERE
FIXTURES_DIR     = os.path.join(HERE, 'fixtures')


def _all_sample_paths():
    # Top-level JSON files in this folder only (not fixtures/)
    return sorted(glob.glob(os.path.join(TEST_SAMPLES_DIR, '*.json')))


def _run_sample(user_code: str) -> dict:
    _engine.VisualElem._clear_registry()
    viz_ranges_json = json.dumps(_profiler.get_viz_ranges(user_code))
    _ser._init_namespace(viz_ranges_json)
    preprocessed = _profiler.preprocess(user_code)
    result = json.loads(_ser._exec_code(preprocessed))
    result.pop('console', None)
    return result


def generate(sample_paths: list[str]):
    os.makedirs(FIXTURES_DIR, exist_ok=True)
    ok = errors = 0
    for sample_path in sample_paths:
        name = os.path.basename(sample_path)
        try:
            user_code = load_sample_code(sample_path)
            result = _run_sample(user_code)
            fixture_path = os.path.join(FIXTURES_DIR, name)
            with open(fixture_path, 'w') as f:
                json.dump(result, f, indent=2)
            print(f"  wrote  {os.path.relpath(fixture_path, ROOT)}")
            ok += 1
        except Exception as e:
            print(f"  ERROR  {name}: {e}")
            errors += 1
    print(f"\n{ok} written, {errors} errors")


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('filter', nargs='?',
                        help='Optional prefix or filename fragment to filter samples')
    args = parser.parse_args()

    all_paths = _all_sample_paths()
    if not all_paths:
        print("No sample JSON files found in src/samples/test/")
        print("Add some small test samples there first, then re-run.")
        sys.exit(0)

    if args.filter:
        needle = args.filter.lower()
        paths = [p for p in all_paths if needle in p.lower()]
        if not paths:
            print(f"No samples matched filter {args.filter!r}")
            sys.exit(1)
    else:
        paths = all_paths

    print(f"Generating {len(paths)} fixture(s)…\n")
    generate(paths)


if __name__ == '__main__':
    main()
