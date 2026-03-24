
arr = [0, 2, 3, 4, 2, 1, 3, 2, 5, 6]


n = len(arr)

s = 6
start = 0
end = 0
cur_sum = 0
set_debug(True)
while end <= n:
    if start == end:
        if end == n:
            break
        cur_sum += arr[end]
        end += 1
        continue

    if cur_sum < s:
        if end == n:
            break
        cur_sum += arr[end]
        end += 1
        continue

    if cur_sum > s:
        cur_sum -= arr[start]
        start += 1
        continue

    print(f'found arr[{start}:{end}]')
    cur_sum -= arr[start]
    start += 1
    continue
