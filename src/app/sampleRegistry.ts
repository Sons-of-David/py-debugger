import type { SaveFile } from './App';

// TODO: currently handles one folder level deep (root files + one subfolder).
// Extend insertIntoTree for deeper nesting if needed in future.
const SAMPLE_MODULES = import.meta.glob('../samples/**/*.json', { eager: true }) as Record<
  string,
  SaveFile
>;

export type SampleEntry = {
  type: 'sample';
  displayName: string;
  rawName: string;
  data: SaveFile;
  localOnly: boolean;
};

export type FolderNode = {
  type: 'folder';
  name: string;
  displayName: string;
  localOnly: boolean;
  children: TreeNode[];
};

export type TreeNode = SampleEntry | FolderNode;

function isLocalPath(parts: string[]): boolean {
  return parts.some(p => p === 'local');
}

function formatFolderName(name: string): string {
  const clean = name.replace(/^\d+-/, '').replace(/-/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function makeDisplayName(filename: string): string {
  return filename;
}

function insertIntoTree(
  roots: TreeNode[],
  parts: string[],
  rawName: string,
  data: SaveFile,
  localOnly: boolean,
): void {
  let current = roots;
  for (let i = 0; i < parts.length - 1; i++) {
    const name = parts[i];
    let folder = current.find((n): n is FolderNode => n.type === 'folder' && n.name === name);
    if (!folder) {
      folder = {
        type: 'folder',
        name,
        displayName: formatFolderName(name),
        localOnly,
        children: [],
      };
      current.push(folder);
    }
    current = folder.children;
  }
  const filename = parts[parts.length - 1];
  current.push({
    type: 'sample',
    displayName: makeDisplayName(filename),
    rawName,
    data,
    localOnly,
  });
}

const allEntries = Object.entries(SAMPLE_MODULES)
  .map(([path, data]) => {
    const relative = path.replace(/^\.\.\/samples\//, '').replace(/\.json$/, '');
    const parts = relative.split('/');
    const localOnly = isLocalPath(parts);
    return { parts, rawName: relative, data, localOnly };
  })
  .filter(e => !e.localOnly || import.meta.env.DEV)
  .sort((a, b) => a.rawName.localeCompare(b.rawName));

export const SAMPLES_TREE: TreeNode[] = [];
for (const e of allEntries) {
  insertIntoTree(SAMPLES_TREE, e.parts, e.rawName, e.data, e.localOnly);
}

// Flat list preserved for backward-compat (App.tsx, EmbedPage.tsx lookups)
export const SAMPLES: SampleEntry[] = [];
function flatten(nodes: TreeNode[]): void {
  for (const node of nodes) {
    if (node.type === 'sample') SAMPLES.push(node);
    else flatten(node.children);
  }
}
flatten(SAMPLES_TREE);
