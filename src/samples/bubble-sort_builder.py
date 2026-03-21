panel = Panel('main')
panel.position = (1,1)

arr = Array(cells=V('arr'), position=(1,0))
panel.add(arr)


rect = Rect(
    position = V('(0,n-i)'),
    color = (255,100,100),
    height = 2,
    width = V('i')
)
rect.alpha = 0.8
panel.add(rect)

ar1 = Arrow(
    position = V('(0, j)'),
    orientation = 'down',
    color = (0,0,255)
)
panel.add(ar1)

ar2 = Arrow(
    position = V('(0, j+1)'),
    orientation = 'down',
    color = (0,150,255)
)
panel.add(ar2)
