interface SquareProps {
  color?: string;
  opacity?: number;
  strokeWidth?: number;
  animate?: boolean;
}

export function Square({ color = '#10b981', opacity = 1, strokeWidth = 2, animate = false }: SquareProps) {
  const fill = color;
  const fillOpacity = opacity;
  // Use stroke color at full opacity for the perimeter
  const stroke = strokeWidth > 0 ? color : 'none';
  const transition = animate ? 'fill 250ms ease, fill-opacity 250ms ease, stroke 250ms ease' : undefined;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={100 - strokeWidth}
        height={100 - strokeWidth}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        style={{ transition }}
      />
    </svg>
  );
}
