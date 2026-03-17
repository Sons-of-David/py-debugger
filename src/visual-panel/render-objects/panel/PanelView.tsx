import type { ObjDoc } from '../../../api/visualBuilder';
import { registerRenderer } from '../../views/rendererRegistry';
import { useTheme } from '../../../contexts/ThemeContext';
import type { CellStyle } from '../../types/grid';

export class PanelCell {
  type = 'panel' as const;
  id: string;
  title?: string;
  style?: CellStyle;
  showBorder?: boolean;

  constructor(opts: { id: string; title?: string; style?: CellStyle; showBorder?: boolean }) {
    this.id = opts.id;
    this.title = opts.title;
    this.style = opts.style;
    this.showBorder = opts.showBorder;
  }
}

interface PanelCellViewProps {
  panel: PanelCell;
}

// TODO: add a `color` property for the panel background fill; currently hardcoded as bg-slate-50/50
export function PanelCellView({ panel }: PanelCellViewProps) {
  const { darkMode } = useTheme();

  if (!panel.showBorder) return null;

  const titleColor = panel.style?.color || (darkMode ? '#cbd5e1' : '#64748b');

  return (
    <div className="absolute inset-0 border-2 border-dashed border-slate-400 dark:border-slate-500 bg-slate-50/50 dark:bg-slate-800/50">
      {panel.title && (
        <span
          className="absolute -top-3 left-1 text-[10px] font-mono bg-slate-50 dark:bg-slate-800 px-1"
          style={{ color: titleColor }}
        >
          {panel.title}
        </span>
      )}
    </div>
  );
}

registerRenderer<PanelCell>('panel', (element) => (
  <PanelCellView panel={element as PanelCell} />
));

export const PANEL_SCHEMA: ObjDoc = {
  objName: 'Panel',
  docstring: 'Container for grouping visual elements. Children use positions relative to the top-left corner. Use add(elem) and remove(elem) to manage children.',
  properties: [
    { name: 'name', type: 'str', description: 'Panel title (shown when show_border=True). Empty string hides the title.', default: '""' },
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col).', default: '(0, 0)' },
    { name: 'width', type: 'int', description: 'Minimum width in grid cells; grows to fit children.', default: '1' },
    { name: 'height', type: 'int', description: 'Minimum height in grid cells; grows to fit children.', default: '1' },
    { name: 'visible', type: 'bool', description: 'Whether the panel is shown.', default: 'True' },
    { name: 'show_border', type: 'bool', description: 'Whether to show the panel border and name label.', default: 'False' },
    { name: 'alpha', type: 'float', description: 'Opacity, 0.0 (transparent) to 1.0 (opaque).', default: '1.0' },
    { name: 'animate', type: 'bool', description: 'Animate transitions to this state. Set to False for instant updates.', default: 'True' },
  ],
  methods: [
    { name: 'add', signature: 'add(*elems: VisualElem)', docstring: 'Add one or more visual elements to this panel.' },
    { name: 'remove', signature: 'remove(elem: VisualElem)', docstring: 'Remove a visual element from this panel (does not delete it).' },
    { name: 'delete', signature: 'delete()', docstring: 'Remove this panel from the canvas.' },
  ],
};
