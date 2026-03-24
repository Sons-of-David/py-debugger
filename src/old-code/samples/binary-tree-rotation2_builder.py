# def empty_click():
#     pass

# class Button(Rect):
#     def __init__(self, on_click: callable  = None, **kwargs):
#         super().__init__(**kwargs)
#         self._on_click = on_click if (on_click is not None) else empty_click

#     def set_on_click(self, on_click:callable):
#         self._on_click = on_click

#     def on_click(self, position):
#         return self._on_click()

# def update(params, scope):
#     if 'tree' in params:
#         print(params['tree'])
#     print(scope)


def function_exit(function_name, value):
    if function_name == 'Tree.__init__':
        print(function_name)
        print(value)


def function_call(function_name, **kargs):
    if function_name == 'Tree.__init__':
        print(function_name)
        print(kargs)


    

    
