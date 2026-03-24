# ── Function Call Hooks Demo ──────────────────────────────────────────────────
# Two hooks fire automatically while tracing:
#
#   function_call(function_name, **kwargs)
#       Called each time a traced function is entered.
#       kwargs    — the arguments passed to that call.
#
#   function_exit(function_name, ret_value)
#       Called each time a traced function returns.
#       ret_value — the returned value (or the new object for __init__).
# ─────────────────────────────────────────────────────────────────────────────

current_n = -1
x = 0

blocks = []

main_panel = Panel()
main_panel.position = (1,1)

background = Rect(width=V('size'), height=2, color=(150,20,40))
main_panel.add(background)

def function_call(function_name, **kwargs):
    if function_name != 'fib':
        return

    global x
    # diff: how much smaller is the new n compared to the caller's n.
    # diff=1 means fib(n-1) was called, diff=2 means fib(n-2) was called.
    diff = current_n - kwargs['n']
    print(f'The function {function_name} was called with {kwargs}, and {diff=}')

    if diff == 1:
        # Vertical domino (1×2): a single tall circle
        block = Circle(width=1, height=2, position=(0, x),
                    color=(100,80,230)) 
        x += 1
        blocks.append(block)
        main_panel.add(block)

    if diff == 2:
        # Horizontal domino (2×1): two side-by-side circles stacked in a panel
        block = Panel()
        block.show_border = True
        block.add(
            Circle(width=2, height=1, position=(0,x)),
            Circle(width=2, height=1, position=(1,x)),
        )
        x += 2
        blocks.append(block)
        main_panel.add(block)

def function_exit(function_name, ret_value):
    if function_name != 'fib':
        return

    print(f'Existing {function_name}({current_n})={ret_value}')
    if len(blocks) > 0:
        global x
        block = blocks.pop()
        x -= 2 if isinstance(block, Panel) else 1
        block.delete()

# update keeps current_n in sync with the n variable of the active call frame
def update(params, scope):
    global current_n
    current_n = params['n']
