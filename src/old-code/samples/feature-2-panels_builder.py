# ── Panels Demo ───────────────────────────────────────────────────────────────
# A Panel groups child elements and positions them relative to its top-left.
# Moving the panel shifts all its children together.
#
# Properties:
#   position    — (row, col) top-left corner of the panel on the grid
#   width, height — minimum size in cells; panel grows to fit children
#   show_border — True: dashed border, name label, and subtle background fill
#
# Children use positions relative to the panel's top-left (0, 0).
# ─────────────────────────────────────────────────────────────────────────────

# ── 1. No panel ───────────────────────────────────────────────────────────────
# Three shapes placed directly on the grid at absolute positions.
Label(label='Direct placement', position=(1, 1), width=2)
Rect  (position=(2, 1), color=(239, 68, 68))
Circle(position=(2, 2), color=(59, 130, 246))
Arrow (position=(3, 1), orientation='right', color=(16, 185, 129))

# ── 2. Inside a panel — no border ─────────────────────────────────────────────
# The same three shapes inside a panel.
# Their positions are relative to the panel's top-left corner (row 1, col 7).
# Try changing panel.position — all three shapes move together.
panel = Panel()
panel.position = (1,7)
panel.add(
    Label(label='Inside a panel', width=2),
    Rect  (position=(1, 0), color=(239, 68, 68)),
    Circle(position=(1, 1), color=(59, 130, 246)),
    Arrow (position=(2, 0), orientation='right', color=(16, 185, 129))
)

# ── 3. Border + background + minimum size ─────────────────────────────────────
# show_border=True draws a dashed border and a subtle background fill.
# width=5, height=4 sets a minimum: even with only 2×2 of shapes the panel
# occupies a 5×4 area — the background reveals the extra empty space.
# Can also put panels inside panels
outer = Panel(name='outer')
outer.width = 5
outer.height = 4
outer.position = (5,1)
outer.show_border = True
outer.color = (100,100,170)
# outer.visible = False

inner = Panel(name='inner')

inner.add(
    Rect  (position=(0, 0), color=(239, 68, 68)),
    Circle(position=(0, 1), color=(59, 130, 246)),
    Arrow (position=(1, 0), orientation='right', color=(16, 185, 129))
)
inner.position = (1,1) # relative to outer panel
inner.show_border = True

outer.add(
    inner,
    Circle(position=(0,4), color=(180, 150, 20))
)

# ── 4. Invisible ─────────────────────────────────────────────
# visible property of panel affect all of its components
inner = Panel(name='inner2')
inner.add(Arrow(orientation='up'))
inner.position = (3,3)
inner.show_border = True

panel = Panel()
panel.position = (5,7)
panel.add(
    inner,
    Label(label='Inside a panel', width=2),
    Rect  (position=(1, 0), color=(239, 68, 68)),
    Circle(position=(1, 1), color=(59, 130, 246)),
    Arrow (position=(2, 0), orientation='right', color=(16, 185, 129)),
)
panel.visible = False
label = Label(label='you cannot see me!', position=(9,7), width=3)