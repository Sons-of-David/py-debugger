arr = [5, 7, 2, 6, 3, 1]
min_index = 0
j = 0

# @viz
class LabeledArrow(Panel):
    def __init__(self, label: str, color: tuple[int, int, int], **kwargs):
        super().__init__(**kwargs)
        self.add(
            Arrow(angle=Arrow.DOWN, color=color, position=(1, 0)),
            Label(label=label, color=color)
        )

panel = Panel(position=(2, 2))
panel.add(
    Array(cells=arr),
    Rect(width=V("i"), alpha=0.7), 
    LabeledArrow(label='min index', color=(220, 70, 120), position=V('(-2, min_index)')), LabeledArrow(label='j', color=(120, 70, 220), position=V('(-2, j)'))
)
# @end

n = len(arr)

for i in range(n):
    min_index = i

    for j in range(i + 1, n):
        if arr[j] < arr[min_index]:
            min_index = j

    arr[i], arr[min_index] = arr[min_index], arr[i]
