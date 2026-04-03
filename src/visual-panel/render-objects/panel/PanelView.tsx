import type { ObjDoc } from '../../../api/visualBuilder';
import { registerVisualElement } from '../../types/elementRegistry';
import { BasicShape } from '../BasicShape';
import type { PanelStyle } from '../../types/grid';

export class Panel extends BasicShape {
  type = 'panel' as const;
  name: string;
  show_border: boolean;
  panelStyle?: PanelStyle;

  constructor(el: any) {
    super('panel', el);
    this.name = el.name ?? '';
    this.show_border = el.show_border ?? false;
    this.panelStyle = el.panelStyle;
  }
}

export const PANEL_SCHEMA: ObjDoc = {
  objName: 'Panel',
  docstring: 'Container for grouping visual elements. Children use positions relative to the top-left corner. Use add(elem) and remove(elem) to manage children.',
  properties: [
    { name: 'name', type: 'str', description: 'Panel title (shown when show_border=True). Empty string hides the title.', default: '""' },
    { name: 'x', type: 'int', description: 'Column (left edge).', default: '0' },
    { name: 'y', type: 'int', description: 'Row (top edge).', default: '0' },
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

registerVisualElement('panel', Panel, PANEL_SCHEMA);
