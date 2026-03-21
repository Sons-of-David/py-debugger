from graphs import compute_rel_positions

def empty_click():
    pass

class Button(Rect):
    def __init__(self, on_click: callable  = None, **kwargs):
        super().__init__(**kwargs)
        self._on_click = on_click if (on_click is not None) else empty_click

    def set_on_click(self, on_click:callable):
        self._on_click = on_click

    def on_click(self, position):
        return self._on_click()


class Node:

    @staticmethod
    def ht(node: 'Node'):
        return -1 if node is None else node.height

    def __init__(self, key: int):
        self.key = key
        self.parent = None 
        self.left = None
        self.right = None
        self.height = 0

        self.edge = Line(end_offset=(0.5,0), z=1)
        self.rect = Button(color=[0,100,50])
        self.label = Label(label=f'{key}')

    def __str__(self):
        left_str = '' if self.left is None else str(self.left)
        right_str = '' if self.right is None else str(self.right)
        if len(left_str) + len(right_str) == 0:
            return str(self.key)
        else:
            return f'{self.key}({left_str},{right_str})'

    def update_height(self):
        self.height = 1 + max( 
            -1 if self.left is None else self.left.height,
            -1 if self.right is None else self.right.height)
        self.label.label = f'{self.key}\n[{self.height}]'

    def set_position(self,position: tuple[int, int]):
        self.rect.position = position
        self.label.position = position
        self.edge.end = position
        if self.left is not None:
            self.left.edge.start = position
        if self.right is not None:
            self.right.edge.start = position

    def set_child(self, node: 'Node', left_side: bool):
        if left_side:
            self.left = node
        else:
            self.right = node
        if node is not None:
            node.parent = self

            node.edge.start = self.rect.position

    def roll_up(self):
        if self.parent is None:
            return

        parent = self.parent
        grandparent = parent.parent
        if grandparent is not None:
            if grandparent.left is parent:
                grandparent.set_child(self, left_side = True)
            else:
                grandparent.set_child(self, left_side = False)
        else:
            self.parent = None

        if parent.left is self:
            child = self.right
            self.set_child(parent, left_side = False)
            parent.set_child(child, left_side = True)
        else:
            child = self.left
            self.set_child(parent, left_side = True)
            parent.set_child(child, left_side = False)
        
        parent.update_height()
        self.update_height()


class Tree:

    @staticmethod
    def parse_tree(rep: str) -> 'Tree':
        def _parse_tree(rep: str, index: int) -> tuple[Node, int]:
            route = []
            key_str = []
            left_child = True
            while index < len(rep) and rep[index] not in ('(',')',','):
                key_str.append(rep[index])
                index += 1
                    
            if index < len(rep) and rep[index] == '(':

                if len(key_str) == 0:
                    raise PopupException(f'empty key at index {rep}[{index}] ')   
                key = int(''.join(key_str))
                node = Node(key)
                
                left, index = _parse_tree(rep, index+1)
                node.set_child(left, left_side=True)
                
                if rep[index] != ',':
                    raise PopupException(f'key {key} doesn\'t have 2 children in {rep}')

                right, index = _parse_tree(rep, index+1)
                node.set_child(right, left_side=False)
                
                if rep[index] != ')':
                    raise PopupException(f'key {key} doesn\'t have closing bracket in {rep}')
                node.update_height()
                return node, index+1
            else:   # found just ',', ')' or end of string
                if len(key_str) == 0:
                    return None, index
                
                node = Node(int(''.join(key_str)))
                node.update_height()
                return node, index
        root, _ = _parse_tree(rep, 0)
        tree = Tree(root)
        tree.redraw()

        def _on_click(node: Node):
            if node is None:
                return
            node.rect.set_on_click(lambda: tree.roll_up(node))
            _on_click(node.left)
            _on_click(node.right)

        _on_click(root)

        return tree

    def __init__(self, root: Node):
        self.root = root

    def roll_up(self, node: Node):
        node.roll_up()
        if node.parent is None:
            self.root = node
        else:
            while node.parent is not None:
                node = node.parent
                node.update_height()

        self.redraw()

    def to_dict(self):
        def _to_dict(node: Node):
            if node is None:
                return
            tree_dict[node] = (node.left, node.right)
            _to_dict(node.left)
            _to_dict(node.right)
        tree_dict = {}
        _to_dict(self.root)
        return tree_dict

    def redraw(self, position: tuple[int,int] | None = None):
        def _redraw(node: Node, position: tuple[int,int]):
            if node is None:
                return
            node.set_position(position)
            # if abs(Node.ht(node.left) - Node.ht(node.right)) <= 1:
            #     node.rect.color = (0,100,50)
            # else:
            #     node.rect.color = (200,50,0)
            _redraw(node.left, (position[0]+2, position[1]-2**(node.height-1)))
            _redraw(node.right, (position[0]+2, position[1]+2**(node.height-1)))

        def _draw_dict(node: Node, position: tuple[int, int], rel_x: dict):
            if node is None:
                return
            node.set_position(position)
            if abs(Node.ht(node.left) - Node.ht(node.right)) <= 1:
                node.rect.color = (0,100,50)
            else:
                node.rect.color = (200,50,0)
            _draw_dict(node.left, (position[0]+2, position[1]+rel_x[node.left]), rel_x)
            _draw_dict(node.right, (position[0]+2, position[1]+rel_x[node.right]), rel_x)

        rel_x = compute_rel_positions(self.to_dict(), self.root)
        rel_x[None] = 0

        if position is None:
            position = (1, 10)
        self.root.edge.start = position
        _draw_dict(self.root, position, rel_x)




tree_rep = "8(3(1,4(,6)),11(9,15(13(,14),16)))"
# tree_rep = "5(1(,3(,4)),10(7,11))"

tree = Tree.parse_tree(tree_rep)





    

    
