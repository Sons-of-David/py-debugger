class LabeledArrow(Panel):
    "label with arrow pointing down"
    def __init__(self, label: str, color: tuple[int,int,int], **kwargs):
        super().__init__(**kwargs)
        self.add(
            Label(position=(0,0), label=label, color=color),
            Arrow(position=(1,0), angle=Arrow.DOWN, color=color)
        )

panel = Panel(position = (2,2))

panel.add(
    Array(cells=V('arr')),
    LabeledArrow(label='start', color=(230,40,100), position=V('(-2,start)')),
    LabeledArrow(label='end',   color=(40,100,230), position=V('(-2,end)')),
    LabeledArrow(label=V('f"~{value}"'),   color=(150,100,200), position=V('(-2,mid)')),
    Rect(position=V('(0, start)'), width=V('end-start'), color=(40,230,100), alpha=0.5)
)