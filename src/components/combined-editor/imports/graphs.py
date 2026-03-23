# from graphviz import Digraph

tree = {
    'root': ('_0','_1'),
    '_0': ('F',None),
    'F': ('A','B'),
    '_1': ('C','_11'),
    '_11': (None, '_111'),
    '_111': ('D', 'E')
}

def compute_rel_positions(tree: dict, root) -> dict:

    x_delta = {root: 0.0}

    def compute_distances(node):
        """
        Returns list of (leftmost, rightmost) needed for each depth level,
        and fills x_delta with horizontal shifts for each node.
        """
        if node is None:
            return []

        if node not in tree:
            return [(0, 0)]
        left, right = tree[node]
        left_distances = compute_distances(left)
        right_distances = compute_distances(right)

        d = 2 # distance between left and right children
        for (_, r), (l, _) in zip(left_distances, right_distances):
            d = max(d, r - l + 1) # -d/2 + r < l + d/2  =>  d >= r - l + 1
        d += (d%2)
        x_delta[left] = -d / 2
        x_delta[right] = d / 2

        depth2 = min(len(left_distances), len(right_distances))
        return [(0, 0)] + \
            [(l - d / 2, r + d / 2) for (l, _), (_, r) in zip(left_distances, right_distances)] + \
            [(l - d / 2, r - d / 2) for (l, r) in left_distances[depth2:]] + \
            [(l + d / 2, r + d / 2) for (l, r) in right_distances[depth2:]]

    compute_distances(root)
    return x_delta
