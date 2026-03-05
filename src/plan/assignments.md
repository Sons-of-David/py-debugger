# Assignments

# Main goal: use OOP approach to handle the visual objects. 

Each object should contain its own logic, and when we need to use it we call the object itself using one of its methods or property instead of having all the properties from all the objects in every place, and having big if\else\switch everywhere.

- In the CellData type, the field width and height appear 4 times. In the bounds, in panel, in shapeProps and in shapSizeBinding. Are these different - if not combine them.

- arrayType should not be a field inside PanelInfo. If the only reason it is there is for style, then instead add the corresponding style field, and when the arrays generate them, they will add the style that they want. If it is a complicated style, than there should be a function like 'panelStyle' that gets the colors, font, etc, and generate what it needs for the panel info.

- Is resolvePositionComponent still in used?

- Are PositionVarBinding\PositionExpression still in use?

- What is even CellData? Is it data for a single cell, or for a renderable object? If more like the second, please change the name.

- Things like 'Array1DCell, Array2DCell, Label' should not appear in useGridState. If the logic is part of label \ array \ etc, it should be done in their own files. Right now the only "shape" that is actually part of the grid is "panel" because it is how we arrange objects in the grid.

- inside the visual-panel folder, please create render-objects folder. It should contain the logic and components of rect, circle, arrow, label, and arrays.

- If anything outside of this folder uses elements from inside it, then it is a problem with the OOP approach. The connection should be via the registry object. These object should register the rendering function and their logic in the corresponding registries, and the outside world should use these registers.

- Why do array cells have direction and varName? The array itself should have a direction indicating how to draw it but not the cells.

- make the API window have adjustable width. Also VisualElem should not appear there.

- add a button, near the zoom in\out buttons, that when press, it alligns the grid so that the top left square current shown will have its top left corner align to the top left corner of the visual panel.

- add another button that takes a screenshot of the visual panel and download it

