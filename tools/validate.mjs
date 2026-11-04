import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import Handlebars from "handlebars";
const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root,"system.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root,"package.json"), "utf8"));
assert.equal(manifest.id, "kingdom-death");
assert.equal(manifest.version, pkg.version);
const lock = JSON.parse(fs.readFileSync(path.join(root,"package-lock.json"), "utf8"));
assert.equal(lock.version, manifest.version);
assert.equal(lock.packages[""].version, manifest.version);
assert.deepEqual(manifest.compatibility, {minimum: "14.365", verified: "14.365", maximum: "14.365"});
assert.equal(manifest.documentTypes.Actor.survivor instanceof Object, true);
for (const p of [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)]) assert.ok(fs.existsSync(path.join(root,p)), p);
for (const field of ["url", "bugs", "manifest", "download"]) if (manifest[field]) assert.equal(new URL(manifest[field]).protocol, "https:");
function walk(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]); }
let modules = 0, templates = 0;
for (const file of ["scripts", "tools", "tests", "templates", "lang"].flatMap(d => walk(path.join(root,d)))) {
  const source = fs.readFileSync(file,"utf8");
  if (file.endsWith(".json")) JSON.parse(source);
  if (file.endsWith(".mjs")) {
    execFileSync(process.execPath,["--check",file]); modules++;
    for (const match of source.matchAll(/(?:from\s+|import\s*)["'](\.[^"']+)["']/g)) assert.ok(fs.existsSync(path.resolve(path.dirname(file),match[1])), `${file}: ${match[1]}`);
    for (const match of source.matchAll(/systems\/kingdom-death\/([^"']+\.hbs)/g)) assert.ok(fs.existsSync(path.join(root,match[1])), match[1]);
  }
  if (file.endsWith(".hbs")) { Handlebars.precompile(source); templates++; }
}
assert.equal(templates, 6);
console.log(`Validated manifest structure, paths, ${modules} JS modules, ${templates} Handlebars templates and language JSON. Not a Foundry runtime test.`);
