import type { ClassDoc } from '../../api/visualBuilder';

interface PanelViewProps {
  title?: string;
  titleColor: string;
}

export function PanelView({ title, titleColor }: PanelViewProps) {
  return (
    <div className="absolute inset-0 border-2 border-dashed border-slate-400 dark:border-slate-500 bg-slate-50/50 dark:bg-slate-800/50">
      {title && (
        <span
          className="absolute -top-3 left-1 text-[10px] font-mono bg-slate-50 dark:bg-slate-800 px-1"
          style={{ color: titleColor }}
        >
          {title}
        </span>
      )}
    </div>
  );
}

export const PANEL_SCHEMA: ClassDoc = {
  className: 'Panel',
  constructorParams: 'name: str = "Panel"',
  docstring: 'Container for grouping visual elements. Use add(elem) and remove(elem) to manage children.',
  properties: [
    { name: 'name', type: 'str', description: 'Panel title.' },
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col).' },
    { name: 'width', type: 'int', description: 'Width in grid cells.' },
    { name: 'height', type: 'int', description: 'Height in grid cells.' },
    { name: 'visible', type: 'bool', description: 'Whether the panel is shown.' },
  ],
  methods: [
    { name: 'add', signature: 'add(elem: VisualElem)', docstring: 'Add a visual element to this panel.' },
    { name: 'remove', signature: 'remove(elem: VisualElem)', docstring: 'Remove a visual element from this panel.' },
  ],
};
