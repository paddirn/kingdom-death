import { common, schema, count, number, text, fields } from "./fields.mjs";
import { CELL_COUNT, COLOR_NAMES, normalizeCells, validCells } from "../rules/monster-setup.mjs";
export class MonsterData extends foundry.abstract.TypeDataModel {
  static migrateData(source) {
    source = super.migrateData(source);
    if (source.showdownSetup && Object.hasOwn(source.showdownSetup, "cells")) {
      source.showdownSetup.cells = normalizeCells(source.showdownSetup.cells);
    }
    source.legacyAttributes ??= {};
    // Preserve old out-of-range values for inspection before applying the new bounds.
    // Legacy out-of-range attributes must remain loadable under the new constraints.
    for (const [key,min,max] of [["level",1,4],["movement",0,99],["toughness",0,99],["speed",-99,99],["damage",-99,99]]) {
      if (typeof source[key] === "number" && Number.isFinite(source[key])) {
        const bounded = Math.max(min, Math.min(max, Math.trunc(source[key])));
        if (bounded !== source[key]) source.legacyAttributes[key] ??= String(source[key]);
        source[key] = bounded;
      }
    }
    return source;
  }
  static defineSchema() {
    return {...common(),
      legacyAttributes:schema(Object.fromEntries(["level","movement","toughness","speed","damage"].map(key=>[key,text({blank:true})]))),
      level:number(1,{min:1,max:4}), movement:number(0,{min:0,max:99}),
      toughness:number(0,{min:0,max:99}), wounds:count(),
      accuracy:number(), damage:number(0,{min:-99,max:99}), speed:number(0,{min:-99,max:99}),
      luck:number(), evasion:number(), decks:schema({ai:text(),hitLocation:text()}),
      instinct:schema({image:text({blank:true}),description:text({blank:true})}),
      showdownSetup:schema({
        cells:new fields.ArrayField(number(0,{min:0,max:4}), {
          initial:()=>Array(CELL_COUNT).fill(0), validate:validCells
        }),
        legend:schema(Object.fromEntries(COLOR_NAMES.slice(1).map((name,index) =>
          [`color${index+1}`,text({blank:true,initial:name})])))
      }),
      terrainDeployment:text({blank:true}),
      aftermath:schema({victory:text({blank:true}),defeat:text({blank:true})})
    };
  }
}
