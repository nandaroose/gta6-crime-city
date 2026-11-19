export const STORY = [
  {
    id: 1,
    title: 'Fresh Blood',
    brief: 'Rico wants to see you on the street. Learn the blocks, then check back in.',
    start: { x: 840, y: 840 },
    reward: 200,
    steps: [
      { type: 'goto', x: 1640, y: 1240, text: 'Meet the runner on the east block' },
      { type: 'goto', x: 2440, y: 840, text: 'Walk the north strip and look for the blue door' },
      { type: 'goto', x: 840, y: 2040, text: 'Head back to the corner and wait for Rico' }
    ]
  },
  {
    id: 2,
    title: 'Bad Blood',
    brief: 'The Vipers are pushing product on our corners. Three of them are working the plaza. Make an example.',
    start: { x: 1240, y: 840 },
    reward: 350,
    steps: [
      { type: 'kill', x: 2440, y: 1640, count: 3, text: 'Take out the three Vipers in the plaza' },
      { type: 'goto', x: 3240, y: 840, text: 'Leave the area before the cops lock it down' }
    ]
  },
  {
    id: 3,
    title: 'Special Delivery',
    brief: 'A courier dropped a package on the east side. Pick it up and run it to the docks. Do not open it.',
    start: { x: 2040, y: 2440 },
    reward: 450,
    steps: [
      { type: 'collect', x: 3240, y: 1240, text: 'Pick up the package on the east block' },
      { type: 'goto', x: 840, y: 3240, text: 'Deliver the package to the docks' }
    ]
  },
  {
    id: 4,
    title: 'Heat',
    brief: 'You kicked the wrong hornets nest. Sit in the fire for a while and let the search burn out.',
    start: { x: 2840, y: 2040 },
    reward: 550,
    steps: [
      { type: 'survive', time: 18, stars: 2, text: 'Stay alive while the heat sweeps the block' },
      { type: 'escape', text: 'Lose the cops' }
    ]
  },
  {
    id: 5,
    title: 'Repo Man',
    brief: 'A red Comet is sitting at the east corner. Boost it and bring it to the lockup. No scratches.',
    start: { x: 840, y: 1640 },
    reward: 650,
    steps: [
      { type: 'goto', x: 1640, y: 2440, car: 'sports', text: 'Reach the Comet at the marked corner' },
      { type: 'drive', x: 3640, y: 3640, text: 'Drive the Comet to the lockup' }
    ]
  },
  {
    id: 6,
    title: 'The Vega Crew',
    brief: 'The Vegas took a cut of our shipment. Four of them are holed up at the old hotel. Clean house.',
    start: { x: 2440, y: 840 },
    reward: 850,
    steps: [
      { type: 'kill', x: 3640, y: 2040, count: 4, text: 'Wipe out the Vega crew at the hotel' },
      { type: 'escape', text: 'Get off the radar' }
    ]
  },
  {
    id: 7,
    title: 'Ambush',
    brief: 'The meet is a setup. They brought shooters. Get to the plaza, survive the crossfire, then disappear.',
    start: { x: 1640, y: 3240 },
    reward: 1100,
    steps: [
      { type: 'goto', x: 3640, y: 840, text: 'Get to the north plaza for the meet' },
      { type: 'survive', time: 22, stars: 3, text: 'Survive the ambush' },
      { type: 'escape', text: 'Disappear before the net closes' }
    ]
  },
  {
    id: 8,
    title: 'Kingpin',
    brief: 'The Solano compound is on the south-west corner. Take the guards, take the kingpin, and take the city.',
    start: { x: 3240, y: 3240 },
    reward: 2500,
    steps: [
      { type: 'kill', x: 840, y: 840, count: 5, text: 'Storm the compound and drop the guards' },
      { type: 'kill', x: 840, y: 840, count: 1, boss: true, text: 'Kill the kingpin' },
      { type: 'escape', text: 'Leave the city in chaos' }
    ]
  }
];

export const ENDING = {
  title: 'KINGPIN OF SOLANO',
  text: 'The city is yours. Rico is gone, the Vegas are finished, and every corner answers to you.'
};

export const CONTROLS = [
  ['W A S D', 'Move on foot'],
  ['SHIFT', 'Sprint'],
  ['MOUSE', 'Aim'],
  ['LEFT CLICK', 'Shoot / attack'],
  ['F / RIGHT CLICK', 'Melee'],
  ['E', 'Enter / exit vehicle'],
  ['1 - 4', 'Switch weapon'],
  ['W / S', 'Throttle / brake in a vehicle'],
  ['A / D', 'Steer'],
  ['SPACE', 'Handbrake'],
  ['ESC', 'Pause']
];
