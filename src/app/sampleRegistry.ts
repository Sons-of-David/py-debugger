import type { TextBox } from '../text-boxes/types';

const SAMPLE_MODULES = import.meta.glob('../samples/*.json', { eager: true }) as Record<
  string,
  { userCode?: string; textBoxes?: TextBox[] }
>;

export const SAMPLES = Object.entries(SAMPLE_MODULES).map(([path, data]) => {
  const filename = path.split('/').pop() ?? path;
  const rawName = filename.replace(/\.json$/, '');
  const isFeature = rawName.startsWith('feature-');
  return {
    displayName: isFeature ? rawName.slice('feature-'.length) : rawName,
    rawName,
    data,
    category: isFeature ? ('feature' as const) : ('algorithm' as const),
  };
});
