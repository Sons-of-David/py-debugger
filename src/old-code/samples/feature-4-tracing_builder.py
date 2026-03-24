# ── Tracing Variables Demo ────────────────────────────────────────────────────
# Two ways to bind visual elements to algorithm variables at each traced step:
#
#   V('expr')              — evaluates expr at the current step.
#                            Must be assigned directly to a property:
#                              rect.width = V('i')       ✓
#                              rect.width = 1 + V('i')   ✗  — use V('1+i') instead
#                            Optional: default=<value> for steps where expr is undefined.
#
#   update(params, scope)  — called before every traced line.
#                              params — dict of all variables at that line
#                              scope  — {'file', 'line', 'function'}; use scope['line']
#                                       to get the current line number.
# ─────────────────────────────────────────────────────────────────────────────

panel = Panel()
panel.position = (1,1)

visual_array = Array(cells=V('arr'), position=(1,0))
panel.add(visual_array)

# i is undefined when the trace starts, so a default position is provided.
# Alternative: add 'i = 0' before set_debug(True) in the debugger code
# to pre-initialize the variable instead of relying on a default here.
arrow = Arrow(
    position=V("(0,i)", default=(0,0)),
    color=(230,70,80),
    angle=Arrow.DOWN)
panel.add(arrow)

rect = Rect(position=V("(1,max_index)"))
rect.alpha = 0.3
panel.add(rect)

max_label = Label(label='current max', position=(2,2), width=4)
panel.add(max_label)

def update(params, scope):
    max_value = params['max_value']
    max_label.label = f'current max = {max_value}'
    print(scope)
