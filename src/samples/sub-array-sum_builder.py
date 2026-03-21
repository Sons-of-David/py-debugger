panel = Panel('main')
panel.position = (3, 3)
panel.width = 11
panel.height = 15

varr = Array(cells=V('arr', default=[]))
varr.position = (0, 1)
panel.add(varr)

rect = Rect(position=V("(0,start+1)",default=(0,0)))
rect.alpha = 0.3
rect.width = V("end-start", default=0)
panel.add(rect)

label = Label(label="")
panel.add(label)
label.position = V("(1,start+1)",default=(0,0))
label.font_size = 25

position2d = Circle(position=V("(start+3,end)",default=(0,0)))
panel.add(position2d)

diffs = []
for i in range(11):
    row = []
    diffs.append(row)
    for j in range(11):
        label_a = Label(label="a")
        label_a.font_size = 30
        label_a.position = (3 + i, j)
        panel.add(label_a)
        row.append(label_a)


def update(params, scope):
    if 'cur_sum' not in params:
        return
    start = params['start']
    end = params['end']
    arr = params['arr']
    rect.alpha = 0.3 * (end>start)
    label.label = sum(arr[start:end])

    for i in range(11):
        for j in range(i):
            diffs[i][j].label = ''
        for j in range(i, 11):
            val = sum(arr[i:j])
            diffs[i][j].label = val
            if val >= 10:
                diffs[i][j].font_size = 25
            if val > params['s']:
                diffs[i][j].color = (200, 0, 0)
            else:
                if val == params['s']:
                    diffs[i][j].color = (0, 200, 200)
                else:
                    diffs[i][j].color = (200, 200, 0)