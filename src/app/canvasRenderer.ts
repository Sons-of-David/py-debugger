import type { VisualBuilderElementBase } from '../api/visualBuilder';
import type { CaptureRegion } from '../visual-panel/components/CaptureRegionLayer';

const CELL = 40;

/**
 * Union of all element-specific properties read during canvas rendering.
 * Elements are hydrated from Python JSON; each type populates a subset.
 */
interface Elem extends VisualBuilderElementBase {
  _elemId?: number;
  _elem_id?: number;
  width?: number;
  height?: number;
  color?: number[];
  alpha?: number;
  angle?: number;
  name?: string;
  show_border?: boolean;
  showBorder?: boolean;
  label?: string;
  fontSize?: number;
  start?: [number, number];
  end?: [number, number];
  startOffset?: [number, number];
  endOffset?: [number, number];
  startCap?: string;
  endCap?: string;
  strokeWeight?: number;
  values?: unknown[];
  direction?: string;
  showIndex?: boolean;
  rectangular?: boolean;
  style?: { fontSize?: number };
  value?: string;
  placeholder?: string;
}

// ── Color helpers ───────────────────────────────────────────────────────────

function rgbHex(rgb?: number[], fallback = '#10b981'): string {
  if (!rgb || rgb.length < 3) return fallback;
  return '#' + rgb.slice(0, 3).map(x => Math.max(0, Math.min(255, Math.floor(x))).toString(16).padStart(2, '0')).join('');
}

function elemId(el: Elem): string | null {
  const id = el._elemId ?? el._elem_id;
  return id != null ? String(id) : null;
}

// ── Panel resolution ────────────────────────────────────────────────────────

interface PanelInfo {
  absRow: number;
  absCol: number;
  width: number;
  height: number;
  title?: string;
  showBorder: boolean;
  dashed: boolean;
  borderColor: string;
  bgColor: string;
  titleBgColor: string;
  titleTextColor: string;
}

function panelColors(darkMode: boolean, variant: 'default' | 'amber' | 'violet') {
  if (variant === 'amber') {
    return darkMode
      ? { border: '#d97706', bg: 'rgba(120,53,15,0.3)', titleBg: '#78350f', titleText: '#fcd34d' }
      : { border: '#fbbf24', bg: 'rgba(255,251,235,0.5)', titleBg: '#fffbeb', titleText: '#b45309' };
  }
  if (variant === 'violet') {
    return darkMode
      ? { border: '#7c3aed', bg: 'rgba(76,29,149,0.3)', titleBg: '#4c1d95', titleText: '#c4b5fd' }
      : { border: '#a78bfa', bg: 'rgba(245,243,255,0.5)', titleBg: '#f5f3ff', titleText: '#6d28d9' };
  }
  return darkMode
    ? { border: '#64748b', bg: 'rgba(30,41,59,0.5)', titleBg: '#334155', titleText: '#cbd5e1' }
    : { border: '#94a3b8', bg: 'rgba(248,250,252,0.5)', titleBg: '#f8fafc', titleText: '#64748b' };
}

function childWidth(el: Elem): number {
  if (el.type === 'array') {
    const v = el.values ?? [];
    const d = el.direction ?? 'right';
    return (d === 'right' || d === 'left') ? Math.max(1, v.length) : 1;
  }
  if (el.type === 'array2d') {
    const v = (el.values ?? []) as unknown[][];
    return v.length === 0 ? 0 : Math.max(1, Math.max(...v.map(r => Array.isArray(r) ? r.length : 0)));
  }
  return el.width ?? 1;
}

function childHeight(el: Elem): number {
  if (el.type === 'array') {
    const v = el.values ?? [];
    const d = el.direction ?? 'right';
    return (d === 'right' || d === 'left') ? 1 : Math.max(1, v.length);
  }
  if (el.type === 'array2d') {
    return Math.max(1, (el.values ?? []).length);
  }
  return el.height ?? 1;
}

function resolvePanels(
  elements: VisualBuilderElementBase[],
  darkMode: boolean,
): { panelMap: Map<string, PanelInfo>; hiddenIds: Set<string> } {
  const elems = elements as Elem[];
  const panelMap = new Map<string, PanelInfo>();

  const hiddenIds = new Set<string>();
  for (const el of elems) {
    if (el.type === 'panel' && el.visible === false) {
      const id = elemId(el);
      if (id) hiddenIds.add(id);
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const el of elems) {
      if (el.type !== 'panel') continue;
      const id = elemId(el);
      if (!id || hiddenIds.has(id)) continue;
      if (el.panelId && hiddenIds.has(el.panelId)) {
        hiddenIds.add(id);
        changed = true;
      }
    }
  }

  // Topological sort (parent before child)
  const panelElems = elems.filter(e => e.type === 'panel');
  const byId = new Map(panelElems.map(e => [elemId(e)!, e]));
  const sorted: Elem[] = [];
  const visited = new Set<string>();
  function visit(el: Elem) {
    const id = elemId(el)!;
    if (visited.has(id)) return;
    if (el.panelId && byId.has(el.panelId)) visit(byId.get(el.panelId)!);
    visited.add(id);
    sorted.push(el);
  }
  for (const el of panelElems) visit(el);

  const colors = panelColors(darkMode, 'default');
  for (const el of sorted) {
    const id = elemId(el);
    if (!id || hiddenIds.has(id)) continue;
    let row = el.y, col = el.x;
    if (el.panelId) {
      const p = panelMap.get(el.panelId);
      if (p) { row += p.absRow; col += p.absCol; }
    }
    const declW = el.width ?? 5;
    const declH = el.height ?? 5;
    let maxR = 0, maxC = 0;
    for (const child of elems) {
      if (child === el || child.panelId !== id) continue;
      maxR = Math.max(maxR, child.y + childHeight(child));
      maxC = Math.max(maxC, child.x + childWidth(child));
    }
    panelMap.set(id, {
      absRow: row, absCol: col,
      width: Math.max(declW, maxC), height: Math.max(declH, maxR),
      title: el.name || undefined,
      showBorder: el.show_border ?? el.showBorder ?? false,
      dashed: true,
      borderColor: colors.border, bgColor: colors.bg,
      titleBgColor: colors.titleBg, titleTextColor: colors.titleText,
    });
  }

  return { panelMap, hiddenIds };
}

// ── Shape drawing ───────────────────────────────────────────────────────────

function drawPanelBox(ctx: CanvasRenderingContext2D, p: PanelInfo) {
  const x = p.absCol * CELL;
  const y = p.absRow * CELL;
  const w = p.width * CELL;
  const h = p.height * CELL;

  ctx.fillStyle = p.bgColor;
  ctx.fillRect(x, y, w, h);

  ctx.strokeStyle = p.borderColor;
  ctx.lineWidth = 2;
  if (p.dashed) ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
}

function drawPanelTitle(ctx: CanvasRenderingContext2D, p: PanelInfo) {
  if (!p.title) return;
  const x = p.absCol * CELL + 4;
  const y = p.absRow * CELL;
  ctx.font = '10px monospace';
  const metrics = ctx.measureText(p.title);
  const tw = metrics.width + 6;
  const th = 14;

  ctx.fillStyle = p.titleBgColor;
  ctx.fillRect(x, y - th, tw, th);
  ctx.fillStyle = p.titleTextColor;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  ctx.fillText(p.title, x + 3, y - 2);
}

function drawRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 1, h / 2 - 1, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawArrowShape(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, alpha: number, angle: number) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(((angle + 180) * Math.PI) / 180);
  ctx.scale(w / 100, h / 100);
  ctx.beginPath();
  ctx.moveTo(0, 30);
  ctx.lineTo(-30, -20);
  ctx.lineTo(-10, -20);
  ctx.lineTo(-10, -40);
  ctx.lineTo(10, -40);
  ctx.lineTo(10, -20);
  ctx.lineTo(30, -20);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawLabel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, text: string, color: string | undefined, alpha: number, fontSize: number | undefined, darkMode: boolean) {
  if (!text) return;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color || (darkMode ? '#f9fafb' : '#1f2937');
  ctx.font = `${fontSize ?? 14}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const lines = text.split('\n');
  const lineH = (fontSize ?? 14) * 1.2;
  const totalH = lines.length * lineH;
  const startY = y + h / 2 - totalH / 2 + lineH / 2;
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + w / 2, startY + i * lineH, w - 4);
  }
}

function drawLineElement(ctx: CanvasRenderingContext2D, el: Elem, absRow: number, absCol: number) {
  const alpha = el.alpha ?? 1;
  ctx.globalAlpha = alpha;

  const color = rgbHex(el.color, '#ef4444');
  const sw = el.strokeWeight ?? 2;
  const startOff = el.startOffset ?? [0.5, 0.5];
  const endOff = el.endOffset ?? [0.5, 0.5];
  const start: [number, number] = el.start ?? [0, 0];
  const end: [number, number] = el.end ?? [1, 1];

  const ox = absCol * CELL;
  const oy = absRow * CELL;
  const sx = ox + startOff[0] * CELL;
  const sy = oy + startOff[1] * CELL;
  const ex = ox + (end[1] - start[1] + endOff[0]) * CELL;
  const ey = oy + (end[0] - start[0] + endOff[1]) * CELL;

  const dx = ex - sx, dy = ey - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const ux = dist > 0 ? dx / dist : 0;
  const uy = dist > 0 ? dy / dist : 0;
  const arrowLen = Math.max(8, sw * 5);
  const arrowHalf = arrowLen / 2;

  const endCap = el.endCap ?? 'arrow';
  const startCap = el.startCap ?? 'none';

  const lx1 = startCap === 'arrow' && dist > arrowLen ? sx + ux * arrowLen : sx;
  const ly1 = startCap === 'arrow' && dist > arrowLen ? sy + uy * arrowLen : sy;
  const lx2 = endCap === 'arrow' && dist > arrowLen ? ex - ux * arrowLen : ex;
  const ly2 = endCap === 'arrow' && dist > arrowLen ? ey - uy * arrowLen : ey;

  ctx.strokeStyle = color;
  ctx.lineWidth = sw;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lx1, ly1);
  ctx.lineTo(lx2, ly2);
  ctx.stroke();

  const drawHead = (tx: number, ty: number, dux: number, duy: number) => {
    const bx = tx - dux * arrowLen;
    const by = ty - duy * arrowLen;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(bx - duy * arrowHalf, by + dux * arrowHalf);
    ctx.lineTo(bx + duy * arrowHalf, by - dux * arrowHalf);
    ctx.closePath();
    ctx.fill();
  };

  if (endCap === 'arrow') drawHead(ex, ey, ux, uy);
  if (startCap === 'arrow') drawHead(sx, sy, -ux, -uy);
}

function drawArrayCell(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  value: string | number | null | undefined,
  index: string,
  showIndex: boolean,
  color: string,
  alpha: number,
  fontSize: number,
  darkMode: boolean,
) {
  ctx.globalAlpha = alpha * 0.15;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, CELL, CELL);

  ctx.globalAlpha = alpha;
  if (value !== null && value !== undefined) {
    ctx.fillStyle = darkMode ? '#f9fafb' : '#1f2937';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), x + CELL / 2, y + CELL / 2 - (showIndex ? 4 : 0), CELL - 4);
  }

  if (showIndex) {
    ctx.fillStyle = color;
    ctx.font = `${Math.max(8, Math.round(fontSize * 0.7))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(index, x + CELL / 2, y + CELL - 2, CELL - 4);
  }
}

function arrayOffset(dir: string, i: number): [number, number] {
  switch (dir) {
    case 'left':  return [0, -i];
    case 'down':  return [i, 0];
    case 'up':    return [-i, 0];
    default:      return [0, i];
  }
}

function drawArray1D(ctx: CanvasRenderingContext2D, el: Elem, absRow: number, absCol: number, darkMode: boolean, allPanels: PanelInfo[]) {
  const values = (el.values ?? []) as (number | string)[];
  const dir = el.direction ?? 'right';
  const showIdx = el.showIndex ?? true;
  const color = rgbHex(el.color, '#f59e0b');
  const alpha = el.alpha ?? 1;
  const fontSize = el.style?.fontSize ?? 12;
  const isHoriz = dir === 'right' || dir === 'left';
  const len = Math.max(1, Math.min(50, values.length));

  let panelRowOff = 0, panelColOff = 0;
  if (dir === 'left') panelColOff = -(len - 1);
  if (dir === 'up') panelRowOff = -(len - 1);

  const panelRow = absRow + panelRowOff;
  const panelCol = absCol + panelColOff;
  const panelW = isHoriz ? len : 1;
  const panelH = isHoriz ? 1 : len;

  const colors = panelColors(darkMode, 'amber');
  const panelInfo: PanelInfo = {
    absRow: panelRow, absCol: panelCol, width: panelW, height: panelH,
    title: el.name || undefined, showBorder: true, dashed: false,
    borderColor: colors.border, bgColor: colors.bg,
    titleBgColor: colors.titleBg, titleTextColor: colors.titleText,
  };
  allPanels.push(panelInfo);
  drawPanelBox(ctx, panelInfo);

  for (let i = 0; i < len; i++) {
    const [dr, dc] = arrayOffset(dir, i);
    const cellRow = panelRow + dr - panelRowOff;
    const cellCol = panelCol + dc - panelColOff;
    drawArrayCell(ctx, cellCol * CELL, cellRow * CELL, values[i], `[${i}]`, showIdx, color, alpha, fontSize, darkMode);
  }

  if (panelInfo.title) drawPanelTitle(ctx, panelInfo);
}

function drawArray2D(ctx: CanvasRenderingContext2D, el: Elem, absRow: number, absCol: number, darkMode: boolean, allPanels: PanelInfo[]) {
  const values = (el.values ?? []) as unknown[][];
  const numRows = Math.max(1, Math.min(50, values.length));
  const numCols = values.length === 0 ? 0
    : Math.max(1, Math.min(50, Math.max(...values.map(r => Array.isArray(r) ? r.length : 0))));
  const showIdx = el.showIndex ?? true;
  const rectangular = el.rectangular ?? true;
  const color = rgbHex(el.color, '#8b5cf6');
  const alpha = el.alpha ?? 1;
  const fontSize = el.style?.fontSize ?? 12;

  const colors = panelColors(darkMode, 'violet');
  const panelInfo: PanelInfo = {
    absRow, absCol, width: numCols, height: numRows,
    title: el.name || undefined, showBorder: rectangular, dashed: false,
    borderColor: colors.border, bgColor: colors.bg,
    titleBgColor: colors.titleBg, titleTextColor: colors.titleText,
  };
  allPanels.push(panelInfo);
  if (rectangular) drawPanelBox(ctx, panelInfo);

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (!rectangular && c >= (Array.isArray(values[r]) ? values[r].length : 0)) continue;
      const val = Array.isArray(values[r]) ? (values[r][c] as string | number | null) : null;
      const idx = `[${r}][${c}]`;
      drawArrayCell(ctx, (absCol + c) * CELL, (absRow + r) * CELL, val, idx, showIdx, color, alpha, fontSize, darkMode);
    }
  }

  if (panelInfo.title) drawPanelTitle(ctx, panelInfo);
}

function drawInput(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, el: Elem) {
  const color = rgbHex(el.color, '#6366f1');
  const alpha = el.alpha ?? 1;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);

  const text = el.value || el.placeholder;
  if (text) {
    ctx.fillStyle = el.value ? '#ffffff' : 'rgba(255,255,255,0.5)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x + 8, y + h / 2, w - 16);
  }
}

// ── Main entry point ────────────────────────────────────────────────────────

export function renderFrameToCanvas(
  elements: VisualBuilderElementBase[],
  ctx: CanvasRenderingContext2D,
  region: CaptureRegion,
  darkMode: boolean,
): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  ctx.fillStyle = darkMode ? '#1f2937' : '#ffffff';
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.translate(-region.col * CELL, -region.row * CELL);

  // Grid lines
  const lineColor = darkMode ? '#4b5563' : '#d1d5db';
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;
  const c0 = region.col, c1 = region.col + region.widthCells;
  const r0 = region.row, r1 = region.row + region.heightCells;
  for (let c = c0; c <= c1; c++) {
    const x = c * CELL - 0.5;
    ctx.beginPath(); ctx.moveTo(x, r0 * CELL); ctx.lineTo(x, r1 * CELL); ctx.stroke();
  }
  for (let r = r0; r <= r1; r++) {
    const y = r * CELL - 0.5;
    ctx.beginPath(); ctx.moveTo(c0 * CELL, y); ctx.lineTo(c1 * CELL, y); ctx.stroke();
  }

  // Resolve panels
  const { panelMap, hiddenIds } = resolvePanels(elements, darkMode);

  // Draw explicit panel backgrounds
  for (const [, p] of panelMap) {
    if (!p.showBorder) continue;
    ctx.globalAlpha = 1;
    drawPanelBox(ctx, p);
  }

  // Collect non-panel elements with absolute positions
  const elems = elements as Elem[];
  type Item = { el: Elem; absRow: number; absCol: number };
  const items: Item[] = [];

  for (const el of elems) {
    if (el.type === 'panel') continue;
    if (el.visible === false) continue;
    if (el.panelId && hiddenIds.has(el.panelId)) continue;

    let absRow = el.y, absCol = el.x;
    if (el.panelId) {
      const p = panelMap.get(el.panelId);
      if (p) { absRow += p.absRow; absCol += p.absCol; }
    }
    items.push({ el, absRow, absCol });
  }

  // Higher z (further away) drawn first; lower z is on top
  items.sort((a, b) => (b.el.z ?? 0) - (a.el.z ?? 0));

  const arrayPanels: PanelInfo[] = [];

  for (const { el, absRow, absCol } of items) {
    ctx.globalAlpha = 1;
    const alpha = el.alpha ?? 1;
    const x = absCol * CELL;
    const y = absRow * CELL;
    const w = (el.width ?? 1) * CELL;
    const h = (el.height ?? 1) * CELL;

    switch (el.type) {
      case 'rect':
        drawRect(ctx, x, y, w, h, rgbHex(el.color, '#ef0bef'), alpha);
        break;
      case 'circle':
        drawCircle(ctx, x, y, w, h, rgbHex(el.color, '#3b82f6'), alpha);
        break;
      case 'arrow':
        drawArrowShape(ctx, x, y, w, h, rgbHex(el.color, '#10b981'), alpha, el.angle ?? 0);
        break;
      case 'label':
        drawLabel(ctx, x, y, w, h, el.label ?? '', el.color ? rgbHex(el.color) : undefined, alpha, el.fontSize, darkMode);
        break;
      case 'line':
        drawLineElement(ctx, el, absRow, absCol);
        break;
      case 'array':
        drawArray1D(ctx, el, absRow, absCol, darkMode, arrayPanels);
        break;
      case 'array2d':
        drawArray2D(ctx, el, absRow, absCol, darkMode, arrayPanels);
        break;
      case 'input':
        drawInput(ctx, x, y, w, h, el);
        break;
    }
  }

  // Panel titles on top of everything
  ctx.globalAlpha = 1;
  for (const [, p] of panelMap) {
    if (p.showBorder) drawPanelTitle(ctx, p);
  }

  ctx.restore();
}
