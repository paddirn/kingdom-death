import { enhanceNumbers } from "../ui/numbers.mjs";
const { api, sheets } = foundry.applications;
export class KDMActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["kingdom-death", "kdm-sheet"], tag: "form", position: {width: 760, height: 780},
    form: {submitOnChange: false, closeOnSubmit: false},
    actions: {addItem: this.addItem, editItem: this.editItem, deleteItem: this.deleteItem}
  };
  async _onRender(context, options) {
    await super._onRender(context, options);
    enhanceNumbers(this.element, this.isEditable, this.actor.system);
  }
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    return {...context, actor: this.actor, system: this.actor.system, editable: this.isEditable,
      inventory: this.actor.items.contents.toSorted((a,b) => a.sort - b.sort).map(item => ({id: item.id, name: item.name,
        type: game.i18n.localize(`TYPES.Item.${item.type}`), quantity: item.type === "resource" ? item.system.quantity : null}))};
  }
  static async addItem(event, target) {
    if (!this.isEditable) return;
    const type = target.dataset.type;
    const [item] = await this.actor.createEmbeddedDocuments("Item", [{name: `New ${type}`, type}]);
    item.sheet.render({force: true});
  }
  static editItem(event, target) {
    this.actor.items.get(target.dataset.itemId)?.sheet.render({force: true});
  }
  static async deleteItem(event, target) {
    if (!this.isEditable) return;
    const item = this.actor.items.get(target.dataset.itemId);
    if (!item) return;
    const yes = await foundry.applications.api.DialogV2.confirm({window: {title: "Remove item"},
      content: "<p>Delete this embedded item permanently? A world-directory source item, if any, is unaffected.</p>"});
    if (yes) await item.delete();
  }
}
