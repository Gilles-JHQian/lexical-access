// Exercise visible buttons through the same pointer/keyboard surface as readers.
exports.choose = (group, value) => group.locator(`button[data-choice][value="${value}"]`).click();
exports.choiceValue = group => group.locator('button[data-choice][aria-pressed="true"]').getAttribute('value');
