# CellData Creation Sites

All `CellData` creation lives in **`src/hooks/useGridState.ts`**. The other files (`Grid.tsx`, `GridCell.tsx`, `ContextMenu.tsx`, `App.tsx`) only reference or pass `CellData` — they never construct new instances.

---

## 1. User-Initiated Creation (Interactive UI Actions)

| ~Line | Function | Key Fields |
|-------|----------|------------|
| 832 | `addShape` | `shape`, `objectId`, `style` |
| 952 | `addArray` | `objectId`, `arrayInfo` (id, index, value, varName, direction) |
| 981 | `addLabel` | `objectId`, `label` (text, width, height), `panelId` |
| 1002 | `addPanel` | `objectId`, `panel` (id, width, height, title), `shapeProps` |
| 1048 | `addIntVar` | `objectId`, `intVar` (name, value, display), `panelId` |
| 1076 | `add1DArray` | `objectId`, `arrayInfo` (id, index, value, varName, direction) |
| 1118 | `add2DArray` | `objectId`, `array2dInfo` (id, row, col, numRows, numCols, value, varName) |

---

## 2. Resolved/Computed CellData (During Render Resolution)

These spread existing `data` and enrich it with resolved values:

| ~Line | Description |
|-------|-------------|
| 411, 426 | Array cell resolution — spreads `arrayObj.data`, resolves varName/value, creates `resolvedCellData` with `invalidReason` |
| 477, 492 | 2D array cell resolution — same pattern for 2D arrays |
| 534, 554 | Int var resolution — resolves the integer variable value |
| 562 | Label resolution — resolves label text (template interpolation) and size expressions |
| 577 | Shape/panel resolution — resolves shape size expressions into concrete numbers |

---

## 3. Mutations That Create New CellData via Spread

These update existing objects by spreading `data` with changed properties:

| ~Line | Purpose |
|-------|---------|
| 1163 | Update `arrayInfo` direction |
| 1299 | Update array element style |
| 1306 | Update single object style |
| 1366 | Update panel dimensions |
| 1413 | Update `shapeProps` |
| 1427 | Update `intVar.display` |
| 1467 | Update `arrayInfo` element config |
| 1497 | Update `panelId` for array elements |
| 1504 | Update `panelId` for single objects |
| 1538 | Update panel size |
| 1577 | Detach from panel (clear `panelId`) |
| 1751 | Update `zOrder` |

---

## 4. Visual Builder Import (~lines 1797–1999)

The `importFromVisualBuilder` function creates `CellData` for every element type:

| ~Line | Element Type | Key Fields |
|-------|-------------|------------|
| 1800 | Panel | `panel` (id, width, height, title), `shapeProps` |
| 1847 | Rectangle | `shape: 'rectangle'`, `style` (color, opacity) |
| 1862 | Circle | `shape: 'circle'`, `style` (color, opacity) |
| 1877 | Arrow | `shape: 'arrow'`, `style` (color, opacity) |
| 1899 | Label | `label` (text, width, height), `style` |
| 1912 | Int variable | `intVar` (name, value, display), `style` |
| 1932 | 2D array element | `array2dInfo` (id, row, col, numRows, numCols, value, varName) |
| 1996 | 1D array element | `arrayInfo` |
