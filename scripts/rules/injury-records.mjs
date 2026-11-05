// Persistent keys are independent of labels. The count fixes the number of visible instances.
export const severeInjuries = {
  head: [['hemorrhage','Intracranial hemorrhage',1],['deaf','Deaf',1],['blind','Blind',2],['jaw','Shattered Jaw',1]],
  arms: [['dismembered','Dismembered arm',2],['ruptured','Ruptured muscle',1],['contracture','Contracture',5],['broken','Broken arm',2]],
  body: [['chest','G. chest wound',5],['back','Destroyed back',1],['rib','Broken rib',5]],
  waist: [['prolapse','Intestinal prolapse',1],['pelvis','Warped pelvis',5],['genitals','Destroyed genitals',1],['hip','Broken hip',1]],
  legs: [['dismembered','Dismembered leg',2],['hamstrung','Hamstrung',1],['broken','Broken leg',2]]
};

// **...** marks the emphasized phrase in a label, never user-entered HTML.
export const impairments = {
  depart:"Can't **depart** during lantern year", consume:"Can't **consume**", intimate:"Can't be **intimate**",
  waistGear:"Can't equip **waist gear**", brain:"Permanent **brain injury**", weapons:"Can't activate **weapons**",
  twoHanded:"Can't activate **two-handed**", paired:"Can't activate **paired**", strengthGear:"Can't activate **2+ Str gear**",
  dodge:"Can't **dodge**", dash:"Can't **dash**", surge:"Can't **surge**", encourage:"Can't **encourage**", endure:"Can't **endure**",
  block:"Can't **block**", knockedDown:"Knocked down on **L/H/S injuries**", fightingArts:"Can't use **fighting arts/knowledge**",
  specialization:"Can't use **weapon specialization**", slow:"Ignore **slow** on **melee weapons**", retire:"Must **retire** on return"
};
export const captions = {accuracy:'To **hit**',strength:'To **wound**',evasion:'To **miss**',luck:'To **crit**',speed:'**Attack** rolls'};
export const labelParts = label => (label ?? '').split('**').map((text,i)=>({text,bold:i%2===1}));
