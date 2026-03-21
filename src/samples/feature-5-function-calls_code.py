# Fibonacci / domino tiling — f(n) = f(n-1) + f(n-2).
# Press Analyze, then step through the timeline to watch the recursion unfold.
# Look at the visual builder editor for more details.

size = 5
n = size
set_debug(True)

def fib(n: int) -> int:
    if n <= 0:
        print('Empty Board!')
        return 1 # One (empty) way to fill an empty board

    # Either remove 1 and compute the rest:
    a = fib(n-1)
    # Or remove 2 (if possible) and compute the rest:
    b = fib(n-2) if n >= 2 else 0
    # The computation was split into two lines instead of just 
    #       return fib(n-1) + fib(n-2)
    # so that n is restored to this call's scope before fib(n-2) runs,
    # giving function_call a chance to see the correct diff=2 step.
    return a + b

result = fib(n)
print(result)