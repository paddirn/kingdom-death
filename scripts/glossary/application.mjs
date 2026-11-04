import { readGlossaryFile } from './records.mjs';
const {ApplicationV2,HandlebarsApplicationMixin} = foundry.applications.api;
export class LivingGlossaryApplication extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {id:'kdm-living-glossary',classes:['kingdom-death'],tag:'form',
    window:{title:'Living Glossary'},position:{width:560},form:{handler:this.syncNow,closeOnSubmit:false},
    actions:{openJournal:this.openJournal}};
  static PARTS = {body:{template:'systems/kingdom-death/templates/living-glossary.hbs'}};
  async _prepareContext() {
    const manager = game.kingdomDeath.glossary;
    let permissionError = '';try {manager.authorize();} catch(error) {permissionError=error.message;}
    return {canSync:!permissionError && !manager.busy,busy:manager.busy,permissionError,report:manager.report};
  }
  static async syncNow(event,form) {
    const manager = game.kingdomDeath.glossary;
    try {
      manager.authorize();
      const data = await readGlossaryFile(form.querySelector('input[type=file]').files[0]);
      const pending = manager.sync(data);
      this.render({force:false});
      const report = await pending;
      if (report.errors.length) ui.notifications.warn(`Glossary sync finished with ${report.errors.length} error(s). See the report.`);
      else ui.notifications.info('Living Glossary sync complete.');
    } catch(error) {ui.notifications.error(error.message);}
    finally {this.render({force:false});}
  }
  static openJournal() {
    if (!game.user.isGM) return;
    game.journal.get(game.kingdomDeath.glossary.report?.journalId)?.sheet.render({force:true});
  }
}
