/** In-memory edits only. Never stored in rule data; reset only after successful submit. */
export function restoreDraft(root, draft) {
  for (const input of root.querySelectorAll("[name]")) if (draft.has(input.name)) {
    if (input.type === "radio") input.checked = input.value === draft.get(input.name);
    else if (input.type === "checkbox") input.checked = draft.get(input.name);
    else input.value = draft.get(input.name);
  }
}
export function rememberDraft(draft, input) {
  if (input.name && (input.type !== "radio" || input.checked)) draft.set(input.name, input.type === "checkbox" ? input.checked : input.value);
}
