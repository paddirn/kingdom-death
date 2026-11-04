import { SYSTEM_ID } from '../rules/constants.mjs';
import { normalizeGlossary, pageContent } from './records.mjs';
const flags = document => document.getFlag(SYSTEM_ID,'glossary');
const entryKey = (sourceId,entryId) => JSON.stringify([sourceId,entryId]);
export function assertSyncGM() {
  if (!game.user.isGM) throw new Error('Only a GM can sync the Living Glossary.');
  // One elected writer across connected GM accounts. Web Locks also serialize tabs for that account/origin.
  const active = game.users.contents.filter(u=>u.active && u.isGM).sort((a,b)=>a.id.localeCompare(b.id));
  if (active[0]?.id !== game.user.id) throw new Error(`Only active sync GM ${active[0]?.name ?? '(none)'} can sync. Other GMs can disconnect to transfer this role.`);
}
async function browserLock(task) {
  if (!globalThis.navigator?.locks) throw new Error('Glossary sync requires Web Locks in a secure browser context. Use a current Chrome browser on Forge HTTPS.');
  return navigator.locks.request(`${SYSTEM_ID}:glossary:${game.world.id}`,{ifAvailable:true},lock=>{
    if (!lock) throw new Error('A Living Glossary sync is already running in another tab.');
    return task();
  });
}
export class LivingGlossaryManager {
  busy = false;
  report = null;
  constructor({authorize = assertSyncGM, lock = browserLock, journals = ()=>game.journal.contents,
    create = data=>foundry.documents.JournalEntry.implementation.create(data), now = ()=>new Date().toISOString()} = {}) {
    Object.assign(this,{authorize,lock,journals,create,now});
  }
  async sync(input) {
    this.authorize();
    if (this.busy) throw new Error('A Living Glossary sync is already running.');
    const data = normalizeGlossary(input);
    this.busy = true;
    try { return await this.lock(()=>this._sync(data)); }
    finally { this.busy = false; }
  }
  async _sync({source,entries}) {
    this.authorize();
    const report = this.report = {created:0,updated:0,unchanged:0,skipped:0,errors:[],syncedAt:this.now(),journalId:null};
    try {
      const managed = this.journals().filter(j=>flags(j)?.managed === true);
      const matches = managed.length ? managed : this.journals().filter(j=>j.name === 'Living Glossary');
      if (matches.length > 1) throw new Error('Multiple Living Glossary journals found. Resolve the ambiguity before syncing.');
      let journal = matches[0];
      if (!journal) journal = await this.create({name:'Living Glossary',ownership:{default:0},flags:{[SYSTEM_ID]:{glossary:{managed:true}}}});
      if (!journal) throw new Error('Journal creation was cancelled.');
      report.journalId = journal.id;
      const existing = new Map();
      for (const page of journal.pages.contents) {
        const meta = flags(page);
        if (!meta?.sourceId || !meta?.entryId) continue;
        const key = entryKey(meta.sourceId,meta.entryId);
        if (existing.has(key)) throw new Error('Duplicate managed page IDs found. Resolve them before syncing.');
        existing.set(key,page);
      }
      for (const entry of entries) {
        try {
          this.authorize();
          const page = existing.get(entryKey(source.id,entry.id));
          if (page && page.type !== 'text') {report.skipped++;report.errors.push(`${entry.id}: managed page is not a text page; left unchanged.`);continue;}
          const meta = {sourceId:source.id,entryId:entry.id,sourceUrl:entry.sourceUrl,updatedAt:entry.updatedAt,lastSynced:report.syncedAt};
          const content = pageContent(entry);
          if (page && page.name === entry.title && page.text.content === content && flags(page)?.updatedAt === entry.updatedAt && flags(page)?.sourceUrl === entry.sourceUrl) {report.unchanged++;continue;}
          const changes = {name:entry.title,type:'text',text:{content,format:1},flags:{[SYSTEM_ID]:{glossary:meta}}};
          if (page) {
            if (!await page.update(changes)) throw new Error('Page update was cancelled.');
            report.updated++;
          } else {
            const [created] = await journal.createEmbeddedDocuments('JournalEntryPage',[changes]);
            if (!created) throw new Error('Page creation was cancelled.');
            existing.set(entryKey(source.id,entry.id),created); report.created++;
          }
        } catch (error) {report.skipped++;report.errors.push(`${entry.id}: ${error.message}`);}
      }
      this.authorize();
      const summary = {...report}; delete summary.journalId;
      if (!await journal.update({[`flags.${SYSTEM_ID}.glossary`]:{managed:true,lastSync:summary,sourceId:source.id,sourceUrl:source.url}})) throw new Error('Journal sync metadata update was cancelled.');
    } catch (error) {report.skipped = entries.length - report.created - report.updated - report.unchanged; report.errors.push(error.message);}
    return report;
  }
}
