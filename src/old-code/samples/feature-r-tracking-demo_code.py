# Find the middle of a linked list using slow/fast pointers,
# then traverse the second half.

class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

# Build: 1 -> 2 -> 3 -> 4 -> 5
head = Node(1)
cur = head
for v in [2, 3, 4, 5]:
    cur.next = Node(v)
    cur = cur.next

# Find middle with slow/fast pointers
slow = head
fast = head
while fast is not None and fast.next is not None:
    slow = slow.next
    fast = fast.next.next

# slow is now the middle node (val == 3)
# Traverse the second half from slow
cur = slow
while cur is not None:
    cur = cur.next
