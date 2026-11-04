export const fields = foundry.data.fields;
export const number = (initial = 0, extra = {}) => new fields.NumberField({required: true, nullable: false, integer: true, initial, ...extra});
export const count = (initial = 0) => number(initial, {min: 0});
export const text = (extra = {}) => new fields.StringField({required: true, nullable: false, initial: "", ...extra});
export const bool = () => new fields.BooleanField({initial: false});
export const schema = entries => new fields.SchemaField(entries);
export const slots = keys => schema(Object.fromEntries(keys.map(key => [key, text()])));
export const common = () => ({schemaVersion: number(1, {min: 1}), notes: text()});
