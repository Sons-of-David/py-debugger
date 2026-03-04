class VisualElem:
    _registry = []

    def __init__(self):
        self.position = (0, 0)
        self.visible = True
        self.alpha = 1.0
        self._parent = None
        VisualElem._registry.append(self)


class Panel(VisualElem):
    def __init__(self, name="Panel"):
        super().__init__()
        self.name = name
        self.width = 5
        self.height = 5
        self._children = []

    def add(self, elem):
        if elem not in self._children:
            self._children.append(elem)
            elem._parent = self

    def remove(self, elem):
        if elem in self._children:
            self._children.remove(elem)
            elem._parent = None


class Rect(VisualElem):
    def __init__(self, pos=(0, 0)):
        super().__init__()
        self.position = pos
        self.width = 1
        self.height = 1
        self.color = (34, 197, 94)
        self.visible = True


class Label(VisualElem):
    def __init__(self, label=""):
        super().__init__()
        self.label = label
        self.position = (0, 0)
        self.width = 1
        self.height = 1
        self.font_size = 14
        self.color = None
        self.visible = True


class Var(VisualElem):
    def __init__(self, var_name=""):
        super().__init__()
        self.var_name = var_name
        self.position = (0, 0)
        self.display = "name-value"
        self.visible = True


_SHAPE_CLASSES = None

def _get_shape_classes():
    global _SHAPE_CLASSES
    if _SHAPE_CLASSES is None:
        _SHAPE_CLASSES = (Rect, Circle, Arrow)
    return _SHAPE_CLASSES


class Array(VisualElem):
    def __init__(self, var_name=""):
        super().__init__()
        self.var_name = var_name
        self.position = (0, 0)
        self.direction = "right"
        self._length = 5
        self._length_manually_set = False
        self.visible = True
        self.show_index = True
        self.color = None
        self.font_size = None
        self._cells = [0] * self._length

    @property
    def length(self):
        return self._length

    @length.setter
    def length(self, value):
        self._length = value
        self._length_manually_set = True

    def __setitem__(self, index, value):
        n = len(self._cells)
        if index >= n:
            self._cells.extend([0] * (index - n + 1))
            self._length = len(self._cells)
        self._cells[index] = value

    def __getitem__(self, index):
        if 0 <= index < len(self._cells):
            return self._cells[index]
        return 0



class Array2D(VisualElem):
    """Display a 2D list variable as a matrix on the grid."""
    def __init__(self, var_name=""):
        super().__init__()
        self.var_name = var_name
        self.position = (0, 0)
        self._num_rows = 3
        self._num_cols = 3
        self._dims_manually_set = False
        self.visible = True
        self.show_index = True
        self.color = None
        self.font_size = None

    def set_dims(self, rows, cols):
        self._num_rows = rows
        self._num_cols = cols
        self._dims_manually_set = True



class Circle(VisualElem):
    def __init__(self, pos=(0, 0)):
        super().__init__()
        self.position = pos
        self.width = 1
        self.height = 1
        self.color = (59, 130, 246)
        self.visible = True


class Arrow(VisualElem):
    def __init__(self, pos=(0, 0)):
        super().__init__()
        self.position = pos
        self.width = 1
        self.height = 1
        self.color = (16, 185, 129)
        self.orientation = "up"
        self.rotation = 0
        self.visible = True


def _serialize_elem(elem, vb_id):
    """Serialize one visual element to a dict for JSON."""
    pos = getattr(elem, 'position', (0, 0))
    if not isinstance(pos, (list, tuple)) or len(pos) < 2:
        pos = (0, 0)
    try:
        row, col = int(pos[0]), int(pos[1])
    except (ValueError, TypeError):
        row, col = 0, 0

    alpha = getattr(elem, 'alpha', 1.0)
    try:
        alpha = float(alpha)
    except (ValueError, TypeError):
        alpha = 1.0

    out = {
        "type": None,
        "position": [row, col],
        "visible": getattr(elem, 'visible', True),
        "alpha": alpha,
    }

    if isinstance(elem, Panel):
        out["type"] = "panel"
        out["name"] = getattr(elem, 'name', 'Panel')
        out["width"] = int(getattr(elem, 'width', 5))
        out["height"] = int(getattr(elem, 'height', 5))
    elif isinstance(elem, Rect):
        out["type"] = "rect"
        out["width"] = int(getattr(elem, 'width', 1))
        out["height"] = int(getattr(elem, 'height', 1))
        c = getattr(elem, 'color', (34, 197, 94))
        if isinstance(c, (list, tuple)) and len(c) >= 3:
            out["color"] = [int(c[0]), int(c[1]), int(c[2])]
        else:
            out["color"] = [34, 197, 94]
    elif isinstance(elem, Label):
        out["type"] = "label"
        out["label"] = str(getattr(elem, 'label', ''))
        out["width"] = int(getattr(elem, 'width', 1))
        out["height"] = int(getattr(elem, 'height', 1))
        out["fontSize"] = int(getattr(elem, 'font_size', 14))
        c = getattr(elem, 'color', None)
        if isinstance(c, (list, tuple)) and len(c) >= 3:
            out["color"] = [int(c[0]), int(c[1]), int(c[2])]
    elif isinstance(elem, Var):
        out["type"] = "var"
        out["varName"] = str(getattr(elem, 'var_name', ''))
        out["display"] = str(getattr(elem, 'display', 'name-value'))
    elif isinstance(elem, Array):
        out["type"] = "array"
        out["varName"] = str(getattr(elem, 'var_name', ''))
        out["direction"] = str(getattr(elem, 'direction', 'right'))
        out["length"] = int(getattr(elem, 'length', 5))
        out["showIndex"] = bool(getattr(elem, 'show_index', True))
        c = getattr(elem, 'color', None)
        if isinstance(c, (list, tuple)) and len(c) >= 3:
            out["color"] = [int(c[0]), int(c[1]), int(c[2])]
        cells = getattr(elem, '_cells', [])
        serialized_values = []
        for cell in (cells if isinstance(cells, (list, tuple)) else []):
            serialized_values.append(cell)
        out["values"] = serialized_values
    elif isinstance(elem, Array2D):
        out["type"] = "array2d"
        out["varName"] = str(getattr(elem, 'var_name', ''))
        out["numRows"] = int(getattr(elem, '_num_rows', 3))
        out["numCols"] = int(getattr(elem, '_num_cols', 3))
        out["showIndex"] = bool(getattr(elem, 'show_index', True))
        c = getattr(elem, 'color', None)
        if isinstance(c, (list, tuple)) and len(c) >= 3:
            out["color"] = [int(c[0]), int(c[1]), int(c[2])]
    elif isinstance(elem, Circle):
        out["type"] = "circle"
        out["width"] = int(getattr(elem, 'width', 1))
        out["height"] = int(getattr(elem, 'height', 1))
        c = getattr(elem, 'color', (59, 130, 246))
        if isinstance(c, (list, tuple)) and len(c) >= 3:
            out["color"] = [int(c[0]), int(c[1]), int(c[2])]
        else:
            out["color"] = [59, 130, 246]
    elif isinstance(elem, Arrow):
        out["type"] = "arrow"
        out["width"] = int(getattr(elem, 'width', 1))
        out["height"] = int(getattr(elem, 'height', 1))
        c = getattr(elem, 'color', (16, 185, 129))
        if isinstance(c, (list, tuple)) and len(c) >= 3:
            out["color"] = [int(c[0]), int(c[1]), int(c[2])]
        else:
            out["color"] = [16, 185, 129]
        out["orientation"] = str(getattr(elem, 'orientation', 'up'))
        out["rotation"] = int(getattr(elem, 'rotation', 0))
    else:
        out["type"] = "rect"
        out["width"] = 1
        out["height"] = 1
        out["color"] = [34, 197, 94]

    if getattr(elem, '_parent', None) is not None and hasattr(elem._parent, '_vb_id'):
        out["panelId"] = elem._parent._vb_id

    return out


def _serialize_visual_builder():
    """Walk VisualElem._registry and return list of serialized elements."""
    import json
    id_counter = [0]

    def next_id(prefix):
        id_counter[0] += 1
        return prefix + "-" + str(id_counter[0])

    for i, elem in enumerate(VisualElem._registry):
        if isinstance(elem, Panel):
            elem._vb_id = next_id("panel")
        else:
            elem._vb_id = next_id("elem")

    panels_first = sorted(VisualElem._registry, key=lambda e: (0 if isinstance(e, Panel) else 1, type(e).__name__))
    result = []
    for elem in panels_first:
        result.append(_serialize_elem(elem, elem._vb_id))

    return json.dumps(result)
