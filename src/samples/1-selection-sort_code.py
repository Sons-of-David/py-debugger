arr = [64, 25, 12, 22, 11, 37, 5, 1, 16]
n = len(arr)
i = 0
j = 0
min_index = 0
set_debug(True) 

for i in range(n):
    # Assume the minimum is the first element
    min_index = i
    
    # Find the index of the minimum element
    for j in range(i + 1, n):
        if arr[j] < arr[min_index]:
            min_index = j
    
    # Swap the found minimum element with the first element
    arr[i], arr[min_index] = arr[min_index], arr[i]
