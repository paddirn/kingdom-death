export const SYSTEM_ID = "kingdom-death";
export const PHASES = Object.freeze(["settlement", "hunt", "showdown"]);
export const ATTRIBUTES = Object.freeze({movement: "Movement", accuracy: "Accuracy modifier", strength: "Strength", evasion: "Evasion", luck: "Luck", speed: "Speed modifier"});
export const LOCATIONS = Object.freeze({head: "Head", arms: "Arms", body: "Body", waist: "Waist", legs: "Legs"});
export const SLOTS = Object.freeze(Array.from({length: 9}, (_, i) => `slot${i}`));
export const PARTY_SLOTS = Object.freeze(["slot0", "slot1", "slot2", "slot3"]);
