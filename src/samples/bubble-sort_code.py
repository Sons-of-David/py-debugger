# Bubble sort - step through this code in the debugger

arr = [5, 3, 8, 1, 9, 2, 7, 4]
n = len(arr)
i = 0
j = 0
set_debug(True)

for i in range(n):
    for j in range(n - i - 1):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

