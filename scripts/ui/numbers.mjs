/** Decimal-safe stepping aligned to min (or zero), bounded by field constraints. */
export function nextNumber(value, direction, {min = -Infinity, max = Infinity, step = 1} = {}) {
  if (!(step > 0) || !Number.isFinite(step)) step = 1;
  const base = Number.isFinite(min) ? min : 0;
  const current = Number.isFinite(Number(value)) && value !== "" ? Number(value) : Math.max(0, min);
  const position = (current - base) / step;
  const index = direction > 0 ? Math.floor(position + 1e-9) + 1 : Math.ceil(position - 1e-9) - 1;
  return Number(Math.min(max, Math.max(min, base + index * step)).toFixed(10));
}
const listeners = new WeakMap();
export function enhanceNumbers(root, editable, model) {
  listeners.get(root)?.abort();
  const controller = new (root.ownerDocument?.defaultView?.AbortController ?? AbortController)(); listeners.set(root, controller);
  for (const input of root.querySelectorAll('input[type="number"]')) {
    let field = model?.constructor?.schema;
    for (const key of input.name.replace(/^system\./, "").split('.')) field = field?.fields?.[key];
    const options = field?.options ?? {};
    if (options.min !== undefined) input.min = String(Math.max(Number(input.min || -Infinity), options.min));
    if (options.max !== undefined) input.max = String(Math.min(Number(input.max || Infinity), options.max));
    if (options.integer) input.step = '1';
    input.classList.add('kdm-number');
    input.style?.setProperty('--kdm-digits', Math.max(2, String(input.value).length));
    const allowed = editable && !input.matches(':disabled') && !input.readOnly;
    let wrapper = input.closest('.kdm-stepper');
    if (!allowed) {
      if (wrapper) { wrapper.replaceWith(input); }
      input.classList.add('kdm-number-display');
      continue;
    }
    input.classList.remove('kdm-number-display');
    if (wrapper) continue;
    wrapper = root.ownerDocument.createElement('span'); wrapper.className = 'kdm-stepper';
    input.before(wrapper); wrapper.append(input);
    for (const [symbol, direction] of [['−', -1], ['+', 1]]) {
      const button = root.ownerDocument.createElement('button'); button.type = 'button';
      button.textContent = symbol; button.dataset.numberStep = direction;
      button.setAttribute('aria-label', `${direction > 0 ? 'Increase' : 'Decrease'} ${input.getAttribute('aria-label') || input.name}`);
      if (direction < 0) wrapper.prepend(button); else wrapper.append(button);
    }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-number-step]');
    if (!button || !root.contains(button)) return;
    event.preventDefault();
    const input = button.closest('.kdm-stepper')?.querySelector('input');
    if (!editable || !input || input.matches(':disabled') || input.readOnly) return;
    input.value = nextNumber(input.value, Number(button.dataset.numberStep), {
      min: input.min === '' ? -Infinity : Number(input.min), max: input.max === '' ? Infinity : Number(input.max), step: Number(input.step) || 1
    });
    const EventClass = root.ownerDocument.defaultView.Event;
    for (const type of ['input', 'change']) input.dispatchEvent(new EventClass(type, {bubbles: true}));
  }, {signal: controller.signal});
}
