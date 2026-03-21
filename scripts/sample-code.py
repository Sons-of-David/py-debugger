#!/usr/bin/env python3
"""
CLI utility for reading and writing code fields in sample JSON files.

Usage:
  # Print builderCode to stdout (default field: builderCode)
  python scripts/sample-code.py get feature-3-arrays
  python scripts/sample-code.py get feature-3-arrays debuggerCode

  # Set builderCode from stdin
  python scripts/sample-code.py set feature-3-arrays < new_code.py
  python scripts/sample-code.py set feature-3-arrays builderCode < new_code.py

  # Set builderCode from a file
  python scripts/sample-code.py set feature-3-arrays builderCode new_code.py

  # Extract all samples to .py files alongside the JSON files
  python scripts/sample-code.py extract
  # Each foo.json -> foo_code.py (debuggerCode) + foo_builder.py (builderCode)

Name resolution: if the argument does not end in '.json' it is resolved to
  src/samples/<name>.json relative to the repository root (the directory
  containing this script's parent).
"""
import json
import os
import sys

FIELDS = ('builderCode', 'debuggerCode')
SAMPLES_DIR = os.path.join(os.path.dirname(__file__), '..', 'src', 'samples')


def resolve(name: str) -> str:
    if name.endswith('.json'):
        return name
    path = os.path.join(SAMPLES_DIR, f'{name}.json')
    if not os.path.exists(path):
        # Try with just the name as-is inside samples dir
        alt = os.path.join(SAMPLES_DIR, name)
        if os.path.exists(alt):
            return alt
        sys.exit(f'error: cannot find sample "{name}" (tried {path})')
    return path


def cmd_get(args):
    if len(args) < 1:
        sys.exit('usage: sample-code.py get <name> [builderCode|debuggerCode]')
    path = resolve(args[0])
    field = args[1] if len(args) > 1 else 'builderCode'
    if field not in FIELDS:
        sys.exit(f'error: field must be one of {FIELDS}')
    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    print(data.get(field, ''), end='')


def cmd_set(args):
    if len(args) < 1:
        sys.exit('usage: sample-code.py set <name> [builderCode|debuggerCode] [file|-]')
    path = resolve(args[0])
    field = 'builderCode'
    src = '-'  # default: read from stdin
    rest = args[1:]
    if rest and rest[0] in FIELDS:
        field = rest[0]
        rest = rest[1:]
    if rest:
        src = rest[0]

    if src == '-':
        code = sys.stdin.read()
    else:
        with open(src, encoding='utf-8') as f:
            code = f.read()

    with open(path, encoding='utf-8') as f:
        data = json.load(f)
    data[field] = code
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'updated {field} in {os.path.basename(path)}')


def cmd_extract(args):
    import glob as _glob
    pattern = os.path.join(SAMPLES_DIR, '*.json')
    files = sorted(_glob.glob(pattern))
    if not files:
        sys.exit(f'error: no JSON files found in {SAMPLES_DIR}')
    for json_path in files:
        base = os.path.splitext(json_path)[0]
        with open(json_path, encoding='utf-8') as f:
            data = json.load(f)
        for field, suffix in (('debuggerCode', '_code.py'), ('builderCode', '_builder.py')):
            code = data.get(field, '')
            out_path = base + suffix
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(code)
            print(f'wrote {os.path.relpath(out_path)}')


COMMANDS = {'get': cmd_get, 'set': cmd_set, 'extract': cmd_extract}

if __name__ == '__main__':
    if len(sys.argv) < 2 or sys.argv[1] not in COMMANDS:
        print(__doc__)
        sys.exit(f'usage: sample-code.py <get|set> ...')
    COMMANDS[sys.argv[1]](sys.argv[2:])
