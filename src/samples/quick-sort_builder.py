class LabeledArrow(Panel):
    "label with arrow pointing down"
    def __init__(self, label: str, color: tuple[int,int,int], **kwargs):
        super().__init__(**kwargs)
        self.add(
            Label(
                position=(0,0), label=label, color=color, width=2  
            ),
            Arrow(
                position=(1,0), angle=Arrow.DOWN, color=color, width=2
            )
        )

class StackWindow(Panel):
    def __init__(self, partition_index:int, **kwargs):
        super().__init__(**kwargs)
        self.add(Rect(position=(0,partition_index), color=(50,220,100)))
        self._windows = []

    def add_window(self, window):
        self.add(window)
        if len(self._windows) > 0:
            self._windows[-1].color = (50, 100, 230)
        self._windows.append(window)


panel = Panel(position=(2,2))
panel.add(
    Array(cells=V('arr')), 
    LabeledArrow(label='low', color=(230,70,100), position=V('(-2,low-1)')), 
    LabeledArrow(label='high', color=(100,70,230), position=V('(-2,high)'))
)

window_stack = []
def reposition_windows():
    for i, window in enumerate(window_stack[::-1]):
        window.position = (1+i, 0)

def in_place(index: int):
    panel.add(
        Rect(position = (0, index), color=(50,60,200), alpha=0.5)
    )

stack_dir = [0]

def function_call(function_name, **kwargs):
    if function_name == 'quick_sort.<locals>.quick_sort_rec':
        low, high = kwargs['low'], kwargs['high']
        if stack_dir[0] != 0:
            red_window = Rect(color=(230,50,100), position=(0,low), width=high-low+1)
            window_stack[-1].add_window(red_window)

        if low == high:
            in_place(low)
        stack_dir[0] = 1

def function_exit(function_name, ret_value):
    if function_name == 'quick_sort.<locals>.partition':
        in_place(ret_value)
        window = StackWindow(partition_index = ret_value)
        panel.add(window)
        window_stack.append(window)
        reposition_windows()
    if function_name == 'quick_sort.<locals>.quick_sort_rec':
        if stack_dir[0] == -1:
            window_stack.pop().delete()
            reposition_windows()
        stack_dir[0] = -1


