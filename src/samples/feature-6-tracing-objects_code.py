# Linked list construction — watch nodes appear as each __init__ returns

class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

head = Node(1)
cur = head
for v in [2, 3, 4, 5]:
    node = Node(v)
    cur.next = node
    cur = node