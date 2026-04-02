import type { SaveFile } from './App';

const SAMPLE_MODULES = import.meta.glob('../samples/*.json', { eager: true }) as Record<
  string,
  SaveFile
>;

export const SAMPLES = Object.entries(SAMPLE_MODULES)
  .map(([path, data]) => {
    const filename = path.split('/').pop() ?? path;
    const rawName = filename.replace(/\.json$/, '');
    const isFeature = rawName.startsWith('feature-');
    const isLocal = rawName.startsWith('local-');
    return {
      displayName: isFeature ? rawName.slice('feature-'.length)
        : isLocal ? rawName.slice('local-'.length)
        : rawName,
      rawName,
      data,
      category: isFeature ? ('feature' as const) : ('algorithm' as const),
      localOnly: isLocal,
    };
  })
  .filter(s => !s.localOnly || import.meta.env.DEV);
