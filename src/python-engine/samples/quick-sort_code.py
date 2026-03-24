def quick_sort(arr):
    def partition(low, high):
        pivot = arr[high]  # choose last element as pivot
        i = low - 1        # place for swapping
        
        for j in range(low, high):
            if arr[j] <= pivot:
                i += 1
                arr[i], arr[j] = arr[j], arr[i]
        
        # place pivot in correct position
        arr[i + 1], arr[high] = arr[high], arr[i + 1]
        return i + 1

    def quick_sort_rec(low: int, high: int):
        if low < high:
            pi = partition(low, high)
            quick_sort_rec(low, pi - 1)
            quick_sort_rec(pi + 1, high)

    quick_sort_rec(0, len(arr) - 1)
    return arr

arr = [10, 7, 15, 8, 9, 1, 5, 13, 6, 2, 11, 4, 3, 12, 14]
low = 0
high = 0
set_debug(True)
quick_sort(arr)