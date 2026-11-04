import { clampSurvival } from '../rules/survival.mjs';
const listeners = new WeakMap();
export function bindSurvival(root, editable, notify) {
  listeners.get(root)?.abort();
  const value = root.querySelector('[name="system.survival.value"]');
  const limit = root.querySelector('[name="system.survival.limit"]');
  if (!value || !limit || !editable) return;
  const controller = new (root.ownerDocument?.defaultView?.AbortController ?? AbortController)();
  listeners.set(root, controller);
  let correcting = false;
  const sync = event => {
    if (correcting || (event && event.target !== value && event.target !== limit)) return;
    if (value.disabled || limit.disabled || value.readOnly || limit.readOnly) return;
    // Allow transient empty text while typing; commit an empty field as zero on change.
    if (event?.type === 'input' && event.target.value === '') return;
    const next = clampSurvival({value:value.value, limit:limit.value});
    value.max = String(next.limit);
    correcting = true;
    let changed = false;
    try {
      for (const [input, number] of [[value,next.value],[limit,next.limit]]) {
        if (Number(input.value) === number && input.value !== '') continue;
        input.value = String(number); changed = true;
        input.dispatchEvent(new root.ownerDocument.defaultView.Event('input', {bubbles:true}));
      }
    } finally { correcting = false; }
    if (changed) notify(`Survival corrected to ${next.value}; limit ${next.limit}.`);
  };
  for (const type of ['input','change']) root.addEventListener(type, sync, {signal:controller.signal});
  sync();
}
