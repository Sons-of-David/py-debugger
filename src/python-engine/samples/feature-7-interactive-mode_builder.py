# ── Interactive Mode Demo ─────────────────────────────────────────────────────
# Interactive mode starts after you click "Finish & Interact" at the end of the
# initial trace. Shapes can respond to mouse events (on_click, and others).
#
#   on_click(self, position)
#       position — (row, col) relative to the shape's panel (or the grid if top-level).
#       Return nothing           → stay in interactive mode.
#       Return RunCall('expr')   → run expr without tracing it.
#       Return DebugCall('expr') → run expr and open a new trace session.
#
# See the state-machine diagram in the debugger code for the full mode flow.
# ─────────────────────────────────────────────────────────────────────────────

index_trace = Panel()
index_trace.add(
    Rect(width=2, color=(150, 70, 150)),
    Label(width=2, label=V('index'))
)
index_trace.position = (3,3)

no_button = Panel()
no_button.add(
    Rect(width=2, color=(50, 150, 50)),
    Label(width=2, label='Do nothing')
)
no_button.position = (1,1)

# A shape with on_click becomes clickable in interactive mode.
# This stub does nothing — useful to show the minimum required signature.
def on_click(self, position: tuple[int, int]):
    pass


class Button(Rect):
    def __init__(self, on_click: callable, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._on_click = on_click

    def on_click(self, position: tuple[int, int]):
        return self._on_click(position)

class LabeledButton(Panel):
    def __init__(self, label: str, color: tuple[int,int,int], on_click: callable):
        super().__init__()
        self.btn   = Button(width=2, color=color, on_click=on_click)
        self.label = Label(width=2, label=label)
        self.add(self.btn, self.label)
        self.on_click = on_click

# -----------------------------------------------------------------

def only_click(position: tuple[int, int]):
    # position is relative to the shape's panel
    click_btn.label.label = f'Click\n {position}'

click_btn = LabeledButton('Click', (220,70,130), only_click)
click_btn.position = (1,5)

# -----------------------------------------------------------------

def run_call_click(position: tuple[int, int]):
    # RunCall runs the expression without tracing — no new timeline is created
    return RunCall('loop_index(0,7)')

run_call_btn = LabeledButton('Run\nCall', (70,100,200), run_call_click)
run_call_btn.position = (5,1)

# -----------------------------------------------------------------

def debug_call_click(position: tuple[int, int]):
    # DebugCall runs the expression and opens a new trace session (debug_in_event)
    return DebugCall('loop_index(0,4)')

debug_call_btn = LabeledButton('Debug\nCall', (220,130,70), debug_call_click)
debug_call_btn.position = (5,5)

