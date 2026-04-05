import { motion } from 'framer-motion';
import { registerRenderer } from '../../views/rendererRegistry';
import type { Line } from './Line';
import { useAnimationEnabled, useAnimationDuration } from '../../../animation/animationContext';
import { rgbToHex } from '../../../api/visualBuilder';

const CELL = 40; // must match CELL_SIZE in Grid.tsx

function arrowPoints(
  tx: number, ty: number, // tip
  ux: number, uy: number, // unit direction toward tip
  arrowLen: number, arrowHalf: number,
): string {
  const bx = tx - ux * arrowLen;
  const by = ty - uy * arrowLen;
  return `${tx},${ty} ${bx - uy * arrowHalf},${by + ux * arrowHalf} ${bx + uy * arrowHalf},${by - ux * arrowHalf}`;
}

function LineView({ line }: { line: Line }) {
  const animate = useAnimationEnabled();
  const animationDuration = useAnimationDuration();
  const sx = line.startOffset[0] * CELL;
  const sy = line.startOffset[1] * CELL;
  const ex = (line.end[1] - line.start[1] + line.endOffset[0]) * CELL;
  const ey = (line.end[0] - line.start[0] + line.endOffset[1]) * CELL;

  const arrowLen = Math.max(8, line.strokeWeight * 5);
  const arrowHalf = arrowLen / 2;
  const transition = animate ? { duration: animationDuration / 1000, ease: 'easeOut' as const } : { duration: 0 };

  const dx = ex - sx;
  const dy = ey - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dist > 0 ? dx / dist : 0;
  const uy = dist > 0 ? dy / dist : 0;

  // Stop the shaft at the arrowhead base so the rounded line cap is hidden
  // under the triangle and only the sharp tip is visible.
  const x1 = line.startCap === 'arrow' && dist > arrowLen ? sx + ux * arrowLen : sx;
  const y1 = line.startCap === 'arrow' && dist > arrowLen ? sy + uy * arrowLen : sy;
  const x2 = line.endCap === 'arrow' && dist > arrowLen ? ex - ux * arrowLen : ex;
  const y2 = line.endCap === 'arrow' && dist > arrowLen ? ey - uy * arrowLen : ey;

  const endArrow = line.endCap === 'arrow' ? (
    <motion.polygon
      animate={{ points: arrowPoints(ex, ey, ux, uy, arrowLen, arrowHalf), fill: rgbToHex(line.color, '#ef4444'), opacity: line.alpha }}
      transition={transition}
    />
  ) : null;

  const startArrow = line.startCap === 'arrow' ? (
    <motion.polygon
      animate={{ points: arrowPoints(sx, sy, -ux, -uy, arrowLen, arrowHalf), fill: rgbToHex(line.color, '#ef4444'), opacity: line.alpha }}
      transition={transition}
    />
  ) : null;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${CELL} ${CELL}`}
      overflow="visible"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      <motion.line
        animate={{ x1, y1, x2, y2, stroke: rgbToHex(line.color, '#ef4444'), opacity: line.alpha }}
        transition={transition}
        strokeWidth={line.strokeWeight}
        strokeLinecap="round"
      />
      {endArrow}
      {startArrow}
    </svg>
  );
}

registerRenderer<Line>('line', (el) => <LineView line={el as Line} />);
