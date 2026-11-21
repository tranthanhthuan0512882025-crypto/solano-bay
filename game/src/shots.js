// The screenshot scenes behind ?shot=cover|street|harbor|chase. Each one sets
// up a real game state (a mission in progress, real heat, real police) and then
// plays the real simulation forward for a fixed number of steps, so the frame
// is what a short game really looks like and the same seed always gives the
// same frame.

import { STEP } from './config.js';
import { LANDMARKS } from './city.js';
import { stepWorld } from './simulate.js';
import { startMission } from './missions.js';
import { addHeat } from './heat.js';
import { SCREEN_PLAY } from './render.js';

function fakeInput(moveX, moveY) {
  return { moveX, moveY, sprint: false, mouse: { x: 0, y: 0, down: false } };
}

function drive(world, seconds, moveX, moveY) {
  const input = fakeInput(moveX, moveY);
  for (let i = 0; i < seconds / STEP; i += 1) stepWorld(world, STEP, input);
}

function putPlayerInCar(world, car, x, y, angle, speed) {
  const player = world.player;
  car.driver = false;
  player.driving = true;
  player.car = car;
  player.carSpeed = speed;
  player.x = x;
  player.y = y;
  player.angle = angle;
  car.x = x;
  car.y = y;
  car.angle = angle;
}

function placePoliceCar(world, x, y, angle) {
  world.police.cars.push({
    x, y, angle, speed: 380, color: '#1c2733', police: true, driver: true, sirenPhase: Math.random() * 6,
    lastSeenX: world.player.x, lastSeenY: world.player.y,
    wanderX: world.player.x, wanderY: world.player.y, wanderTimer: 0,
  });
}

function stageCover(world) {
  // Mission 5, the Sunset Run: three stars, three police cars on your tail,
  // downtown at speed. The cover shot.
  world.missions.index = 4;
  world.missions.completed = [1, 2, 3, 4];
  startMission(world.missions, world);
  world.missions.step = 1;
  world.player.cash = 1500;
  const car = world.traffic[0];
  putPlayerInCar(world, car, 1500, 1100, 0, 430);
  placePoliceCar(world, 1290, 1100, 0);
  placePoliceCar(world, 1240, 1062, 0.1);
  placePoliceCar(world, 1330, 1148, -0.1);
  addHeat(world.heat, 60);
  world.missions.message = 'Deliver the package to Marina Pier — lose them or outdrive them.';
  world.missions.messageTimer = 6;
  drive(world, 2.2, 0, -1);
}

function stageStreet(world) {
  // Mission 4, Crowd Cover: on foot in Mercado Square, blended into the crowd
  // while a cop's vision cone sweeps past. Cold Trail, cooling.
  world.missions.index = 3;
  world.missions.completed = [1, 2, 3];
  startMission(world.missions, world);
  world.player.cash = 1000;
  world.player.x = LANDMARKS.market.x;
  world.player.y = LANDMARKS.market.y;
  world.player.angle = -Math.PI / 2;
  world.police.foot.push({
    x: LANDMARKS.market.x + 150, y: LANDMARKS.market.y - 400, angle: Math.PI / 2, speed: 0, shootTimer: 1, hp: 50,
    lastSeenX: world.player.x, lastSeenY: world.player.y,
    wanderX: world.player.x, wanderY: world.player.y, wanderTimer: 0,
  });
  placePoliceCar(world, 600, 1500, 0);
  addHeat(world.heat, 55);
  world.missions.message = 'Tail Mr. Vane — stay in the crowd, do not sprint, do not get spotted.';
  world.missions.messageTimer = 6;
  drive(world, 1.2, 0, 0);
}

function stageHarbor(world) {
  // Mission 1, First Light: the marina at golden hour, boats in the water,
  // the whole harbour city ahead.
  world.missions.index = 0;
  world.missions.completed = [];
  startMission(world.missions, world);
  world.player.x = 760;
  world.player.y = 2060;
  world.player.angle = Math.PI / 2;
  world.missions.message = 'Meet Rosa at Marina Pier — the city is yours to explore.';
  world.missions.messageTimer = 6;
  drive(world, 1.0, 0, 0);
}

function stageChase(world) {
  // Mission 3, Harbor Heist: the courier van, two stars, running the van to
  // Warehouse 9 along the south streets.
  world.missions.index = 2;
  world.missions.completed = [1, 2];
  startMission(world.missions, world);
  world.missions.step = 2;
  world.player.cash = 800;
  const van = world.missions.van;
  putPlayerInCar(world, van, 2400, 1500, 0, 400);
  placePoliceCar(world, 2190, 1500, 0);
  placePoliceCar(world, 2140, 1462, 0.1);
  addHeat(world.heat, 45);
  world.missions.message = 'Deliver the van to Warehouse 9 — the docks are behind you, not the cops.';
  world.missions.messageTimer = 6;
  drive(world, 1.2, 0, -1);
}

/**
 * Set `world` to the named scene (cover, street, harbor or chase; any other
 * name is the cover) and return the screen to draw and the save info to show.
 */
export function stageShot(name, world) {
  if (name === 'street') stageStreet(world);
  else if (name === 'harbor') stageHarbor(world);
  else if (name === 'chase') stageChase(world);
  else stageCover(world);
  return { screen: SCREEN_PLAY, save: null };
}
