class LabeledArrow(Panel):
    "label with arrow pointing down"
    def __init__(self, label: str, color: tuple[int,int,int], **kwargs):
        super().__init__(**kwargs)
        self.add(
            Label(position=(0,0), label=label, color=color),
            Arrow(position=(1,0), angle=Arrow.DOWN, color=color)
        )

panel = Panel()
panel.add(
    Array(cells=V('arr')),
    LabeledArrow(label='min_idx', color=(200,25,120), position=V('(-2,min_index)')),
    LabeledArrow(label='j',       color=(40,120,140), position=V('(-2,j)')),
    Rect(width=V('i'), alpha=0.3)
)

panel.position = (2,2)
