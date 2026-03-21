# Simple loop used as the traced algorithm for this demo.
# Press Analyze, step to the end, then click "Finish & Interact".

index = 0
set_debug(True)

def loop_index(start: int, end: int):
    global index
    for index in range(start, end):
        print(index)

loop_index(0,10)

"""
                ┌────────────────┐
                │      idle      │
                └───────┬────────┘
                        │ Analyze succeeds
                        ▼
                ┌────────────────┐
                │     trace      │
                └───────┬────────┘
                        │ Finish & Interact
                        ▼
     ┌───────────────────────────────────────┐
┌───►│           interactive                 │
│    └───────────────┬───────────────────────┘
│                    │ click returns DebugCall
│                    ▼
│    ┌────────────────────────────┐
│    │       debug_in_event       │
│    └────────────────────────────┘
│                    │ Back to Interactive
└────────────────────┘

(Edit returns to idle from trace or interactive)
"""