"""Native, named button groups shared by the public HTML templates."""
from html import escape


def choice_group(label, options, *, attrs='', selected=None, classes=''):
    selected = options[0][0] if selected is None else selected
    buttons = ''.join(
        f'<button type="button" data-choice value="{escape(value, quote=True)}" '
        f'aria-pressed="{str(value == selected).lower()}">{escape(text)}</button>'
        for value, text in options
    )
    return (f'<fieldset class="choice-field {classes}" {attrs}>'
            f'<legend>{escape(label)}</legend><div class="choice-buttons">'
            f'{buttons}</div></fieldset>')
