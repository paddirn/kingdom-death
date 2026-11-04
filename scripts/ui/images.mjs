export function imageSource(document, path) {
  return path === "prototypeToken.texture.src" ? document.prototypeToken?.texture?.src : document.img;
}
export async function saveImage(document, path, src) {
  if (!["img", "prototypeToken.texture.src"].includes(path) || !document.isOwner) throw new Error("Ownership is required to change this image.");
  if (path !== "img" && document.documentName !== "Actor") throw new Error("Only Actors have prototype token images.");
  return document.update({[path]: src});
}
export function pickImage(document, path = "img") {
  if (!document.isOwner) return;
  const Picker = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
  return new Picker({type: "image", current: imageSource(document, path), callback: async src => {
    try { await saveImage(document, path, src); } catch (error) { ui.notifications.error(error.message); }
  }}).render({force: true});
}
export function previewImage(document) {
  if (!document.testUserPermission(game.user, "OBSERVER")) return;
  return new foundry.applications.apps.ImagePopout({src: document.img, uuid: document.uuid, window: {title: document.name}}).render({force: true});
}
