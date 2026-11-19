// story.js — Solano City's story: character bios, the 8-mission chain with
// phone-call intro dialogue and outro text. All original characters.

export const CHARACTERS = {
  rosa:    { name: 'Rosa Delmar',  role: 'Fixer, runs a garage in Palm Groves' },
  cacique: { name: 'El Cacique',   role: 'The boss of the Casco Viejo docks' },
  marisol: { name: 'Marisol Vega', role: 'Cab dispatcher, knows every street' },
  tico:    { name: 'Tico Braganza', role: 'Chop-shop mechanic with expensive taste' },
  ltOrtega:{ name: 'Lt. Dania Ortega', role: 'A cop who owes Rosa a favor' },
};

// Each mission: id, title, caller, intro (phone call lines), outro, reward.
export const MISSION_DEFS = [
  {
    id: 1, title: 'Sunrise Test Drive',
    caller: 'rosa',
    intro: [
      'ROSA DELMAR: "Vic? Rosa. I heard you can drive."',
      '"Prove it. Grab a car and meet me at the garage in Palm Groves."',
      '"Don\'t total it — I need a driver, not a wrecking ball."',
    ],
    outro: [
      'ROSA: "Not bad, Vic. Not bad at all."',
      '"There\'s real money in this city for people who don\'t ask questions."',
    ],
    objective: 'Get in any car and drive to the garage marker.',
    reward: 300,
  },
  {
    id: 2, title: 'Hot Cargo',
    caller: 'rosa',
    intro: [
      'ROSA: "Package on the seat of my sedan downtown."',
      '"It has to reach Marisol\'s cab depot before the buyer walks. The clock is HOT."',
    ],
    outro: ['ROSA: "Delivered clean. You\'re earning trust, and trust pays."'],
    objective: 'Pick up the package, then deliver it to the depot before time runs out.',
    reward: 500,
  },
  {
    id: 3, title: 'Chrome Appetite',
    caller: 'tico',
    intro: [
      'TICO: "Amigo! Tico needs a Barracuda GT. Sun-yellow, no scratches."',
      '"They park them along Sunrise Mile. Bring me one and I forget your face."',
    ],
    outro: ['TICO: "Ah, beautiful! You eat today, my friend."'],
    objective: 'Steal a Barracuda GT and deliver it to the chop shop marker.',
    reward: 700,
  },
  {
    id: 4, title: 'Quiet Tail',
    caller: 'marisol',
    intro: [
      'MARISOL: "A silver sedan left the marina with something of ours."',
      '"Follow it. Don\'t get too close, don\'t lose it. Just tell me where it sleeps."',
    ],
    outro: ['MARISOL: "Marea Harbor warehouse. Now we know where to knock."'],
    objective: 'Follow the silver sedan — stay close but don\'t spook it.',
    reward: 800,
  },
  {
    id: 5, title: 'Warehouse Welcome',
    caller: 'rosa',
    intro: [
      'ROSA: "That cargo belongs to El Cacique\'s rivals. Time to return it — with lead."',
      '"It\'s an ambush. Go armed."',
    ],
    outro: ['ROSA: "Clean house. El Cacique himself will hear about this."'],
    objective: 'Ambush the smugglers at the harbor warehouse. Survive and win.',
    reward: 1000,
  },
  {
    id: 6, title: 'A Debt In Blue',
    caller: 'ltortega',
    intro: [
      'LT. ORTEGA: "Rosa\'s boy, huh? I owe her. My partner is being held at Precinct One."',
      '"Get him out before the federal transfer. Make it loud if you must."',
    ],
    outro: ['LT. ORTEGA: "We\'re square, Rosa. And you — stay off my beat."'],
    objective: 'Bust the prisoner out of Precinct One and get him to Rosa\'s garage.',
    reward: 1200,
  },
  {
    id: 7, title: 'Tide Money',
    caller: 'cacique',
    intro: [
      'EL CACIQUE: "So you are the one Rosa trusts. Good."',
      '"A courier boat left ledger papers at the marina dock house. Collect them before the tide turns."',
    ],
    outro: ['EL CACIQUE: "These papers move fortunes. You will be well paid."'],
    objective: 'Collect the ledgers at the Marea Harbor dock, then escape to the garage.',
    reward: 1500,
  },
  {
    id: 8, title: 'Cacique\'s Fall',
    caller: 'rosa',
    intro: [
      'ROSA: "El Cacique planned to bury us all along, Vic. It ends tonight."',
      '"His convoy leaves the docks. Catch it. End him."',
    ],
    outro: [
      'ROSA: "Solano City has a new skyline, Vic — ours."',
      'You are the king of the Sunrise Mile now.',
    ],
    objective: 'Chase down El Cacique\'s armored convoy and take him out.',
    reward: 5000,
  },
];

export function missionById(id) { return MISSION_DEFS.find(m => m.id === id); }
