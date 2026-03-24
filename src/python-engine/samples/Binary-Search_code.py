arr = [2, 3, 7, 9, 11, 16, 19, 21, 24, 28, 31, 35, 38, 42, 45, 50]
value = 28

# Initializing variables before start debugging
start = 0
end = len(arr)
mid = (start + end)//2

set_debug(True)

while start + 1 < end:
    mid = (start + end)//2
    if value < arr[mid]:
        end = mid
    else:
        start = mid

if arr[start] == value:
    print(f'Found the number at arr[{start}]={value}')
else:
    print(f'Could not find the value')

