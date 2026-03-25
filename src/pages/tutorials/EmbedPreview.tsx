import { useTheme } from '../../contexts/ThemeContext';
import { EMBED_CHROME_HEIGHT } from '../../app/EmbedPage';
import { CELL_SIZE } from '../../visual-panel/components/Grid';

interface EmbedPreviewProps {
  sample: string;
  vx?: number;
  vy?: number;
  vw?: number;
  vh?: number;
}

export function EmbedPreview({ sample, vx, vy, vw, vh }: EmbedPreviewProps) {
  const { darkMode } = useTheme();
  let src = `/embed?sample=${encodeURIComponent(sample)}&dark=${darkMode ? '1' : '0'}`;
  if (vx !== undefined) src += `&vx=${vx}`;
  if (vy !== undefined) src += `&vy=${vy}`;
  if (vw !== undefined) src += `&vw=${vw}`;
  if (vh !== undefined) src += `&vh=${vh}`;

  const hasViewport = vw !== undefined && vh !== undefined;
  const iframeWidth = hasViewport ? vw! * CELL_SIZE : undefined;
  const iframeHeight = hasViewport ? vh! * CELL_SIZE + EMBED_CHROME_HEIGHT : 440;

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm mx-auto"
      style={{ width: iframeWidth, height: iframeHeight }}
    >
      <iframe
        src={src}
        title={`${sample} visualization`}
        className="w-full h-full"
        loading="lazy"
      />
    </div>
  );
}
