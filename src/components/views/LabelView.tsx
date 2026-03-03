import type { ClassDoc } from '../../types/visualBuilder';

interface LabelViewProps {
  text: string;
  style?: React.CSSProperties;
}

export function LabelView({ text, style }: LabelViewProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        className="font-mono text-center whitespace-pre-wrap"
        style={style}
      >
        {text}
      </span>
    </div>
  );
}

export const LABEL_SCHEMA: ClassDoc = {
  className: 'Label',
  constructorParams: 'label: str = ""',
  docstring: 'Text label. Use {var_name} in the text to interpolate variable values.',
  properties: [
    { name: 'label', type: 'str', description: 'Display text. Use {var} for variable interpolation.' },
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col).' },
    { name: 'width', type: 'int', description: 'Width in grid cells.' },
    { name: 'height', type: 'int', description: 'Height in grid cells.' },
    { name: 'font_size', type: 'int', description: 'Font size in pixels.' },
    { name: 'color', type: 'tuple[int, int, int]', description: 'RGB text color.' },
    { name: 'visible', type: 'bool', description: 'Show or hide the label.' },
  ],
};
