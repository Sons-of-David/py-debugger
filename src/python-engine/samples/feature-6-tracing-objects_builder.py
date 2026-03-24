# ── Tracing Objects Demo ──────────────────────────────────────────────────────
# Uses function_exit to intercept Node.__init__ — each time a new Node object
# is created in the algorithm, a matching VisNode is built automatically.
#
# The update hook repositions every node on each traced line, so the visual
# linked-list layout always reflects the current pointer chain.
# ─────────────────────────────────────────────────────────────────────────────

class LabeledArrow(Panel):
    "Arrow + label that floats above the node it points to (head / cur)"
    def __init__(self, label: str, color: tuple[int,int,int]):
        super().__init__()
        self.add(
            Label(
                label=label, color=color,
                position=(0,0), width=2, 
            ),
            Arrow(
                position=(1,0), width=2, 
                color=color, orientation='down'
            )
        )
        self.visible = False

head_panel = LabeledArrow('head', (255, 100, 100))
cur_panel  = LabeledArrow('cur',  (100, 200, 255))

# Maps each algorithm Node object → its visual counterpart
node_dict = {}

class VisNode(Panel):
    "Visual representation of a linked-list node: a rect + label + optional rightward arrow"
    def __init__(self, node, label: str):
        super().__init__()
        self.rect  = Rect(width=2, height=1, color = (80,140,220))
        self.label = Label(label=label, width=2, z=-1)
        self.arrow = Arrow(orientation='right', position=(0,2), width=0)
        self.add(self.rect, self.label, self.arrow)

        self.position = (4, 1)

        node_dict[node] = self


def function_exit(function_name, value):
    # Intercept Node.__init__: when a new node is constructed, build its visual
    if function_name == 'Node.__init__' and hasattr(value, 'val'):
        VisNode(value, str(value.val))


def update(params, scope):
    node = params.get('head')
    if node is None:
        return  # head not yet assigned

    x = 1
    head_panel.visible = True
    head_panel.position = (0,x)

    # Walk the list: position each node and show the arrow to its successor
    while node.next is not None:
        node_dict[node].position = (2, x)
        x += 3
        node_dict[node].arrow.width = 1
        node = node.next

    # Last node: no arrow
    node_dict[node].position = (2, x)
    cur_panel.visible = True
    cur_panel.position = (0,x)
