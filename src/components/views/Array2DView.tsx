import type { Array2dInfo } from '../../types/grid';

interface Array2DViewProps {
  array2dInfo: Array2dInfo;
  cellStyle?: React.CSSProperties;
  valueStyle?: React.CSSProperties;
  indexStyle?: React.CSSProperties;
}

export function Array2DView({ array2dInfo, cellStyle, valueStyle, indexStyle }: Array2DViewProps) {
  const info = array2dInfo!;
  const isAnchor = info.row === 0 && info.col === 0;
  const showIndices = info.showIndices ?? true;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-between py-1">
      {isAnchor && info.varName && (
        <span
          className="text-[8px] font-mono leading-none absolute -top-3 left-0"
          style={cellStyle}
        >
          {info.varName}
        </span>
      )}
      <div className="flex-1 flex items-center justify-center">
        <span
          className="font-mono font-bold"
          style={valueStyle}
        >
          {info.value}
        </span>
      </div>
      {showIndices && (
        <span
          className="font-mono leading-none"
          style={indexStyle}
        >
          [{info.row}][{info.col}]
        </span>
      )}
    </div>
  );
}
