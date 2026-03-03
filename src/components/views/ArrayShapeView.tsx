import { Arrow } from '../shapes';
import { CircleView } from './CircleView';
import { RectView } from './RectView';
import type { ShapeType, ArrowOrientation } from '../../types/grid';
import type { ClassDoc } from '../../types/visualBuilder';

interface ArrayShapeViewProps {
  elementType: ShapeType;
  color?: string;
  alpha?: number;
  orientation?: ArrowOrientation;
  rotation?: number;
  index: number;
  showIndex: boolean;
  indexColor: string;
  indexFontSize: number;
}

export function ArrayShapeView({
  elementType,
  color,
  alpha,
  orientation,
  rotation = 0,
  index,
  showIndex,
  indexColor,
  indexFontSize,
}: ArrayShapeViewProps) {
  const renderShape = () => {
    if (elementType === 'arrow') {
      return (
        <Arrow
          color={color}
          opacity={alpha}
          orientation={orientation}
          rotation={rotation}
        />
      );
    }
    if (elementType === 'circle') {
      return <CircleView color={color} opacity={alpha} rotation={rotation} />;
    }
    return <RectView color={color} opacity={alpha} rotation={rotation} />;
  };

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <div className="flex-1 flex items-center justify-center w-full">
        {renderShape()}
      </div>
      {showIndex && (
        <span
          className="font-mono leading-none absolute bottom-0"
          style={{ color: indexColor, fontSize: indexFontSize }}
        >
          [{index}]
        </span>
      )}
    </div>
  );
}

export const ARRAY_SCHEMA: ClassDoc = {
  className: 'Array',
  constructorParams: 'var_name: str = "", element_type: str | None = None',
  docstring: 'Displays an array of values or visual shapes. Two approaches: (1) Dict config: set element_type="circle"/"rect"/"arrow", then arr[i] = {\'color\': (r,g,b), ...}. (2) Instance mode: arr[i] = Circle()/Rect()/Arrow() — shape position is controlled by the array, all other properties (color, size, alpha, V() bindings) come from the element. Elements with width/height > 1 shift subsequent cells accordingly.',
  properties: [
    { name: 'var_name', type: 'str', description: 'Name of the array variable (e.g. "arr", "nums"). Ignored when element_type is set.' },
    { name: 'element_type', type: 'str | None', description: 'Shape type for each cell: "circle", "rect", or "arrow". None for value arrays or instance mode (default).' },
    { name: 'position', type: 'tuple[int, int]', description: 'Top-left corner (row, col) of the first cell.' },
    { name: 'direction', type: 'str', description: '"right", "left", "down", or "up" — layout of cells.' },
    { name: 'length', type: 'int', description: 'Number of cells to reserve (default 5). Use >= max array length.' },
    { name: 'show_index', type: 'bool', description: 'Whether to show [i] index labels. Default True for value arrays, False for shape arrays.' },
    { name: 'visible', type: 'bool', description: 'Show or hide the array.' },
  ],
};
