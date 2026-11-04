export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
const object = x => x && typeof x === 'object' && !Array.isArray(x);
function text(value, label, max = 200000) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} must be nonempty text (maximum ${max} characters).`);
  return value.trim();
}
function url(value, label) {
  const result = text(value, label, 2048);
  let parsed; try { parsed = new URL(result); } catch { throw new Error(`${label} must be an HTTPS URL.`); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) throw new Error(`${label} must be an HTTPS URL without credentials.`);
  return result;
}
function keys(record, allowed, label) {
  if (Object.keys(record).some(k => !allowed.includes(k))) throw new Error(`${label} contains an unknown field.`);
}
/** Retrieval-independent schema. Reject the whole file before any world mutation. */
export function normalizeGlossary(data) {
  if (!object(data) || data.schemaVersion !== 1 || !object(data.source) || !Array.isArray(data.entries) || data.entries.length > 10000) throw new Error('Expected schemaVersion 1, source and entries (at most 10000).');
  keys(data,['schemaVersion','source','entries'],'Import');
  keys(data.source,['id','url'],'Source');
  const source = {id:text(data.source.id,'Source ID',200),url:url(data.source.url,'Source URL')};
  const seen = new Set();
  const entries = data.entries.map((entry,index) => {
    if (!object(entry)) throw new Error(`Entry ${index+1} must be an object.`);
    keys(entry,['id','title','description','updatedAt','sourceUrl'],`Entry ${index+1}`);
    const id = text(entry.id,`Entry ${index+1} ID`,200);
    if (seen.has(id)) throw new Error(`Duplicate entry ID: ${id}`);
    seen.add(id);
    const updatedAt = entry.updatedAt === undefined || entry.updatedAt === '' ? '' : text(entry.updatedAt,'updatedAt',100);
    return {id,title:text(entry.title,'Title',500),description:text(entry.description,'Description'),updatedAt,
      sourceUrl:entry.sourceUrl === undefined ? source.url : url(entry.sourceUrl,'Entry source URL')};
  });
  return {schemaVersion:1,source,entries};
}
export async function readGlossaryFile(file) {
  if (!file || file.size > MAX_IMPORT_BYTES) throw new Error('Choose a JSON file no larger than 5 MiB.');
  let data; try { data = JSON.parse(await file.text()); } catch { throw new Error('Cannot read glossary JSON: the file is inaccessible or malformed.'); }
  return normalizeGlossary(data);
}
const escape = value => value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function pageContent(entry) {
  // Imported text is never executed, interpreted as HTML, or enriched as Foundry links.
  const description = escape(entry.description).replace(/@/g,'&#64;').replace(/\n/g,'<br>');
  return `<p>${description}</p><hr><p>Source: <a href="${escape(entry.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escape(entry.sourceUrl)}</a></p>${entry.updatedAt ? `<p>Source updated: ${escape(entry.updatedAt)}</p>` : ''}`;
}
