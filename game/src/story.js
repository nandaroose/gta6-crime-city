// The eight-job story chain, its callers and their phone-call intros.

export const MISSIONS = [
  {
    id: 1,
    title: 'Sunrise Run',
    caller: 'Mama Cielo',
    reward: 250,
    start: 'home',
    intro: [
      'Rico. You still sleeping in that motel?',
      'Tito opened the garage on Calle Mar. Go see your cousin before he sells the good tools.',
      'And mijo, drive the speed limit. The Solano PD has no sense of humor.',
    ],
    outro: 'Good. Tito owes me a new roof and now he owes you one favor.',
    steps: [{ type: 'goto', to: 'garage', radius: 72, text: 'Meet Tito at the garage on Calle Mar' }],
  },
  {
    id: 2,
    title: 'Repo Man',
    caller: 'Tito Vaz',
    reward: 400,
    start: 'garage',
    intro: [
      'Rico! Perfect timing. Some tourist left a red Vulpa at the pier.',
      'The keys are in it and the paperwork is... let us say flexible.',
      'Bring it to the garage in one piece. The paint is the whole value.',
    ],
    outro: 'That is a beautiful car. Do not tell Mama Cielo where we got it.',
    steps: [
      { type: 'goto', to: 'pier', radius: 76, text: 'Find the red Vulpa at the pier', spawnMissionCar: true },
      { type: 'deliver', to: 'garage', radius: 92, timer: 110, requireMissionCar: true, text: 'Deliver the Vulpa to the garage' },
    ],
  },
  {
    id: 3,
    title: 'Sand & Sirens',
    caller: 'Nadia',
    reward: 600,
    start: 'beach',
    intro: [
      'Rico Vale. You came recommended by people who should know better.',
      'Three duffels washed up near the beach cabanas. My buyers are impatient.',
      'Collect all three before the tide turns. Do not open them.',
    ],
    outro: 'Clean work. There is more where that came from, and better pay.',
    steps: [{ type: 'collect', count: 3, area: 'beach', spread: 260, timer: 85, text: 'Collect the three duffels on the beach' }],
  },
  {
    id: 4,
    title: 'Heat Check',
    caller: 'Detective Rusk',
    reward: 800,
    start: 'downtown',
    intro: [
      'Vale. This is Rusk. I hear you have been busy on my beach.',
      'I need a distraction downtown. Two stars worth of it.',
      'Stay alive for forty-five seconds and I will forget your name for a week.',
    ],
    outro: 'Not bad. You are louder than a parade. I can use that.',
    steps: [{ type: 'survive', seconds: 45, stars: 2, text: 'Survive the two-star heat downtown' }],
  },
  {
    id: 5,
    title: 'Short Fuse',
    caller: 'Tito Vaz',
    reward: 1000,
    start: 'docks',
    intro: [
      'Bad news, primo. Bishop sent his dock crew to lean on our buyers.',
      'Three of them, red shirts, near the containers. They are not there to talk.',
      'Make them leave. Permanently is fine.',
    ],
    outro: 'Bishop will hear about this. Keep your phone on.',
    steps: [{ type: 'kill', count: 3, area: 'docks', spread: 260, timer: 130, text: 'Take out the three red-shirted dock crew' }],
  },
  {
    id: 6,
    title: 'Air Mail',
    caller: 'Nadia',
    reward: 1200,
    start: 'airport',
    intro: [
      'New job. Small package, large consequences.',
      'Pick it up at the mall, then run it to the airport hangar.',
      'Seventy seconds, Rico. The plane does not wait for charming men.',
    ],
    outro: 'The package is on the plane. You just paid for a very nice apartment.',
    steps: [
      { type: 'goto', to: 'mall', radius: 74, text: 'Pick up the package at the mall' },
      { type: 'deliver', to: 'airport', radius: 84, timer: 70, text: 'Run the package to the airport hangar' },
    ],
  },
  {
    id: 7,
    title: 'Badge Heavy',
    caller: 'Detective Rusk',
    reward: 1500,
    start: 'downtown',
    intro: [
      'Vale, the captain is asking about the beach. I need you gone for an hour.',
      'Make some noise, get three stars, then disappear.',
      'Lose them clean. If they catch you, I was never on this call.',
    ],
    outro: 'You are a ghost. Stay that way until I call.',
    steps: [
      { type: 'survive', seconds: 22, stars: 3, text: 'Pull three stars of heat' },
      { type: 'escape', timer: 100, text: 'Lose the cops' },
    ],
  },
  {
    id: 8,
    title: 'Last Call',
    caller: 'Bishop',
    reward: 5000,
    start: 'stadium',
    intro: [
      'Rico Vale. You have been stepping on my docks.',
      'I am at the stadium with a few friends from the department.',
      'Come say it to my face. Bring a car you do not mind losing.',
    ],
    outro: 'Solano is yours, Vale. For now. I will be watching from the water.',
    steps: [
      { type: 'survive', seconds: 55, stars: 4, text: 'Survive Bishop and the four-star ambush' },
      { type: 'escape', timer: 130, text: 'Escape the stadium heat' },
    ],
  },
];

export const STORY_DONE = {
  caller: 'Mama Cielo',
  lines: [
    'Rico. The whole city is talking about the stadium.',
    'Come home. I made croquettes and I am not asking twice.',
    'You did good, mijo. Now put the gun away.',
  ],
};
