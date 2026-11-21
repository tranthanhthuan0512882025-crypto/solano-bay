// Solano Bay — tuning numbers, palette and world layout in one place.
// The world is a fixed 3600 x 2600 top-down harbour city; the renderer scales a
// camera window onto it, so no rule below depends on the screen size.

export const STEP = 1 / 60;

export const WORLD = { width: 3600, height: 2600, waterY: 2280, beachY: 2180 };

/** Avenues (vertical roads) and streets (horizontal roads), centres and widths. */
export const ROADS = {
  avenues: [300, 800, 1300, 1800, 2300, 2800, 3300],
  streets: [300, 700, 1100, 1500, 1900],
  width: 96,
  lane: 24,
};

export const PLAYER = {
  radius: 14,
  walkSpeed: 170,
  sprintSpeed: 260,
  health: 100,
  punchDamage: 25,
  punchRange: 34,
  punchCooldown: 0.35,
  pistolDamage: 34,
  pistolRange: 420,
  pistolCooldown: 0.22,
  startAmmo: 36,
  carEnterRange: 70,
};

export const CAR = {
  length: 54,
  width: 26,
  maxSpeed: 520,
  accel: 340,
  brake: 520,
  reverseSpeed: 160,
  steer: 2.6,
  grip: 6.0,
};

export const TRAFFIC = { count: 22, speed: 150, minGap: 90 };
export const PEDESTRIANS = { count: 46, speed: 55, crowdRadius: 90, crowdMin: 3 };

/** Cold Trail heat: 0..100 points, one star per 20 points. */
export const HEAT = {
  max: 100,
  pointsPerStar: 20,
  carjack: 25,
  hitPedestrian: 30,
  shootWitnessed: 18,
  punchWitnessed: 12,
  /** Heat lost per second while nobody can see the player (slower at high heat). */
  coolPerSecond: [14, 12, 10, 8, 6],
  /** Seconds of being unseen before cooling starts. */
  coolDelay: 1.0,
  /** Police vision: range and half-angle of the cone, in radians. */
  visionRange: 300,
  visionHalfAngle: 0.62,
  /** Blending halves the range at which police can recognise the player. */
  blendRangeFactor: 0.45,
  /** A cop that can see the player holds the heat; seen heat climbs slowly. */
  seenRisePerSecond: 3,
};

export const POLICE = {
  carSpeed: 470,
  footSpeed: 200,
  catchRadius: 26,
  shootRange: 300,
  shootCooldown: 0.9,
  bulletDamage: 9,
  maxCars: 6,
  spawnDistance: 480,
};

export const SAVE_KEY = 'solano-bay.save.v1';

export const PALETTE = {
  ground: '#c9a86a',
  grass: '#7fae5a',
  park: '#6da34e',
  sand: '#e8d29a',
  water: '#2f7fa8',
  waterDeep: '#256b92',
  road: '#3d3a38',
  roadEdge: '#2c2a28',
  lane: '#e8d44f',
  sidewalk: '#b9b2a4',
  buildingRoof: ['#b5543f', '#c97b4a', '#8a6f5c', '#5d7a8c', '#a85f6b', '#7c8a5a'],
  buildingEdge: '#4a3a30',
  plaza: '#d8cbb2',
  player: '#ffd23f',
  playerJacket: '#e83e2e',
  police: '#1c2733',
  policeLight: '#3fa7ff',
  text: '#fff7e6',
  muted: '#d8c9a8',
  gold: '#ffc93c',
  hudPanel: 'rgba(16, 20, 28, 0.72)',
  hudBorder: 'rgba(255, 201, 60, 0.55)',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
