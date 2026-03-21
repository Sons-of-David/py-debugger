# Demo: R — stable object references across trace steps
#
# params passed to update() is a TrackedDict: accessing a key returns an R object.
# An R re-resolves to the current step's copy of the object at every step,
# so you can store it once and read fresh values from it later.
#
# Key contrast with V():
#   V('expr')  — evaluates an expression string against current variables
#   R          — holds a reference to a specific object by identity
#
# Here we track the 'slow' pointer (middle of the list) using R.
# After the slow/fast traversal ends, slow_ref still resolves correctly
# and we traverse from it to show the second half of the list.

panels = {}  # val -> Panel, built as nodes are initialised

def function_exit(function_name, value):
    if function_name == 'Node.__init__':
        idx = len(panels)
        p = Panel(str(value.val))
        p.width = 2
        p.height = 1
        p.position = (2, idx * 3)
        bg = Rect()
        bg.width = 2
        bg.color = (60, 120, 200)
        p.add(bg)
        lbl = Label(str(value.val), width=2, z=-1)
        p.add(lbl)
        if idx > 0:
            arr = Arrow(orientation='right')
            arr.position = (0, -1)
            p.add(arr)
        panels[value.val] = p

# Pointer arrows
fast_arrow = Arrow(color=(100, 200, 255), orientation='down')
fast_arrow.visible = False
slow_arrow = Arrow(color=(255, 180, 50), orientation='down')
slow_arrow.visible = False

# Gold highlight that follows slow_ref even after the traversal ends
slow_highlight = Rect()
slow_highlight.color = (255, 200, 50)
slow_highlight.alpha = 0.45
slow_highlight.width = 2
slow_highlight.z = 1
slow_highlight.visible = False

slow_ref = None  # R stored once; auto-resolves every step

def update(params, scope):
    global slow_ref

    # params['slow'] returns an R — store it when slow first appears.
    # We only need to assign it once; subsequent steps re-resolve via the registry.
    slow_r = params.get('slow')
    if slow_r is not None:
        slow_ref = slow_r

    # Update slow arrow (only visible while traversal is active)
    if slow_r is not None:
        node = slow_r.resolve()
        if node is not None and node.val in panels:
            slow_arrow.position = (0, panels[node.val].position[1])
            slow_arrow.visible = True
    else:
        slow_arrow.visible = False

    # Update fast arrow
    fast_r = params.get('fast')
    if fast_r is not None:
        node = fast_r.resolve()
        if node is not None and node.val in panels:
            fast_arrow.position = (0, panels[node.val].position[1])
            fast_arrow.visible = True
    else:
        fast_arrow.visible = False

    # slow_ref persists as an R even after the traversal variables are gone.
    # Traverse from it: tint the second half of the list.
    if slow_ref is not None:
        node = slow_ref.resolve()
        if node is not None and node.val in panels:
            slow_highlight.position = panels[node.val].position
            slow_highlight.visible = True
