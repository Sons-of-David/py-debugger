# Find Array Maximum — algorithm traced by this example.
# Press Analyze, then step through the timeline.

arr = [1,5,4,7,9,3,5,2]
max_value = -1
max_index = -1
# set_debug(True) marks where tracing begins — lines above are not recorded.
# If set_debug is not called at all, start debug from the start.
set_debug(True)

def print_result():
    print(f'max value is arr[{max_index}]={max_value}')

for i in range(len(arr)):
    if max_value < arr[i]:
        # breakpoints can be set in the gutter; use the timeline to jump to them
        max_value = arr[i]
        max_index = i

print_result()
