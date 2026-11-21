// Pedestrians, traffic cars and police — the living city around the player.
// Traffic follows the road grid; pedestrians wander sidewalks and gather in
// crowds at the market and the parks; police chase, ram and shoot.

import { CAR, HEAT, PEDESTRIANS, POLICE, ROADS, TRAFFIC, WORLD } from './config.js';
import { collideBuildings, pointInBuilding, seesTarget } from './city.js';

const PED_SHIRTS = ['#e8e4da', '#4a7fb5', '#c94f43', '#5aa37a', '#d8c25a', '#8a6fb5', '#e88a4a', '#3f8a7a'];
const CAR_COLORS = ['#c94f43', '#4a7fb5', '#d8c25a', '#7a7f85', '#5aa37a', '#e8e4da', '#8a5a7a'];

function randomRoadPoint(random, city) {
  if (random.chance(0.5)) {
    return { x: random.pick(ROADS.avenues), y: random.range(150, WORLD.waterY - 150) };
  }
  return { x: random.range(150, WORLD.width - 150), y: random.pick(ROADS.streets) };
}

function randomSidewalkPoint(random, city) {
  for (let tries = 0; tries < 20; tries += 1) {
    const x = random.range(120, WORLD.width - 120);
    const y = random.range(120, WORLD.waterY - 120);
    if (!pointInBuilding(city, x, y)) return { x, y };
  }
  return { x: 800, y: 800 };
}

export function createPedestrians(random, city) {
  const peds = [];
  for (let i = 0; i < PEDESTRIANS.count; i += 1) {
    // A third of the crowd starts in the market square and the parks.
    let p;
    if (i < 16) {
      p = { x: city.market.x + random.range(10, city.market.w - 10), y: city.market.y + random.range(10, city.market.h - 10) };
    } else if (i < 24) {
      const park = random.pick(city.parks);
      p = { x: park.x + random.range(10, park.w - 10), y: park.y + random.range(10, park.h - 10) };
    } else {
      p = randomSidewalkPoint(random, city);
    }
    const target = randomSidewalkPoint(random, city);
    peds.push({
      x: p.x, y: p.y,
      tx: target.x, ty: target.y,
      speed: random.range(35, PEDESTRIANS.speed + 25),
      angle: random.range(0, Math.PI * 2),
      shirt: random.pick(PED_SHIRTS),
      fleeing: 0,
      walkPhase: random.range(0, Math.PI * 2),
      id: i,
    });
  }
  return peds;
}

export function createTraffic(random, city) {
  const cars = [];
  for (let i = 0; i < TRAFFIC.count; i += 1) {
    const p = randomRoadPoint(random, city);
    const vertical = Math.abs(p.x - random.pick(ROADS.avenues)) < 60 || random.chance(0.5);
    const angle = vertical ? (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (random.chance(0.5) ? 0 : Math.PI);
    cars.push({
      x: p.x, y: p.y, angle,
      speed: random.range(TRAFFIC.speed * 0.8, TRAFFIC.speed * 1.2),
      color: random.pick(CAR_COLORS),
      police: false,
      driver: true,
      stopped: 0,
      id: i,
    });
  }
  return cars;
}

function stepPed(ped, dt, city, player, random) {
  if (ped.fleeing > 0) {
    ped.fleeing -= dt;
    const dx = ped.x - player.x;
    const dy = ped.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    ped.x += (dx / d) * 190 * dt;
    ped.y += (dy / d) * 190 * dt;
    ped.angle = Math.atan2(dy, dx);
  } else {
    const dx = ped.tx - ped.x;
    const dy = ped.ty - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 12) {
      const t = randomSidewalkPoint(random, city);
      ped.tx = t.x;
      ped.ty = t.y;
    } else {
      ped.x += (dx / d) * ped.speed * dt;
      ped.y += (dy / d) * ped.speed * dt;
      ped.angle = Math.atan2(dy, dx);
    }
  }
  ped.walkPhase += dt * 8;
  const fixed = collideBuildings(city, ped.x, ped.y, 10);
  ped.x = Math.max(40, Math.min(WORLD.width - 40, fixed.x));
  ped.y = Math.max(40, Math.min(WORLD.waterY - 20, fixed.y));
}

function stepTrafficCar(car, dt, city, random, others) {
  if (car.stopped > 0) {
    car.stopped -= dt;
    return;
  }
  const ahead = 46;
  const ax = car.x + Math.cos(car.angle) * ahead;
  const ay = car.y + Math.sin(car.angle) * ahead;
  let blocked = false;
  for (const other of others) {
    if (other === car) continue;
    if (Math.hypot(other.x - ax, other.y - ay) < 40) { blocked = true; break; }
  }
  if (blocked) return;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // At an intersection, sometimes turn onto the crossing road.
  const nearAvenue = ROADS.avenues.find((a) => Math.abs(car.x - a) < 8);
  const nearStreet = ROADS.streets.find((s) => Math.abs(car.y - s) < 8);
  if (nearAvenue !== undefined && nearStreet !== undefined && random.chance(0.012)) {
    const vertical = Math.abs(Math.sin(car.angle)) > 0.5;
    car.angle = vertical
      ? (random.chance(0.5) ? 0 : Math.PI)
      : (random.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    car.x = nearAvenue;
    car.y = nearStreet;
  }
  // Wrap around the city edges so traffic never runs out.
  if (car.x < 60) car.x = WORLD.width - 60;
  if (car.x > WORLD.width - 60) car.x = 60;
  if (car.y < 60) car.y = WORLD.waterY - 60;
  if (car.y > WORLD.waterY - 20) car.y = 60;
}

export function createPolice() {
  return { cars: [], foot: [], bullets: [] };
}

export function spawnPoliceCar(police, x, y, angle, tx, ty) {
  if (police.cars.length >= POLICE.maxCars) return;
  police.cars.push({
    x, y, angle: angle || 0, speed: 0, color: '#1c2733', police: true, driver: true,
    sirenPhase: Math.random() * 6,
    // The call that sent them: they know where the crime happened, not where
    // the player is now. They chase what they can see; otherwise they search
    // the last place they saw the player.
    lastSeenX: tx ?? x, lastSeenY: ty ?? y,
    wanderX: tx ?? x, wanderY: ty ?? y, wanderTimer: 0,
  });
}

export function spawnPoliceFoot(police, x, y, tx, ty) {
  police.foot.push({
    x, y, angle: 0, speed: 0, shootTimer: 1, hp: 50,
    lastSeenX: tx ?? x, lastSeenY: ty ?? y,
    wanderX: tx ?? x, wanderY: ty ?? y, wanderTimer: 0,
  });
}

/** Steer an officer toward a target point; returns the distance to it. */
function steerToward(officer, tx, ty, speed, dt, turnRate) {
  const dx = tx - officer.x;
  const dy = ty - officer.y;
  const dist = Math.hypot(dx, dy) || 1;
  const want = Math.atan2(dy, dx);
  let diff = want - officer.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  officer.angle += Math.max(-turnRate * dt, Math.min(turnRate * dt, diff));
  return dist;
}

/** Pick a fresh nearby wander point for a searching officer. */
function wander(officer, dt) {
  officer.wanderTimer -= dt;
  if (officer.wanderTimer <= 0) {
    officer.wanderTimer = 2 + Math.random() * 2;
    officer.wanderX = officer.lastSeenX + (Math.random() - 0.5) * 320;
    officer.wanderY = officer.lastSeenY + (Math.random() - 0.5) * 320;
  }
  return { x: officer.wanderX, y: officer.wanderY };
}

/** Police chase what they can see and search the last seen spot when they
 * cannot — they never know the player's live position while unseen. */
export function stepPolice(police, dt, player, city, heat, onShot) {
  const px = player.x;
  const py = player.y;
  for (const car of police.cars) {
    const seen = seesTarget(car.x, car.y, car.angle, px, py, city, HEAT.visionRange, HEAT.visionHalfAngle);
    if (seen) {
      car.lastSeenX = px;
      car.lastSeenY = py;
    }
    const target = seen ? { x: px, y: py } : wander(car, dt);
    steerToward(car, target.x, target.y, 0, dt, 2.4);
    car.speed = Math.min(POLICE.carSpeed, car.speed + 300 * dt);
    const cruise = seen ? car.speed : car.speed * 0.55;
    car.x += Math.cos(car.angle) * cruise * dt;
    car.y += Math.sin(car.angle) * cruise * dt;
    car.sirenPhase += dt * 6;
    const fixed = collideBuildings(city, car.x, car.y, 20);
    car.x = fixed.x;
    car.y = fixed.y;
    // Ramming uses the distance to the PLAYER, not to the search target: a
    // car reaching its wander point must not hurt a player far away from it.
    const distToPlayer = Math.hypot(px - car.x, py - car.y);
    if (distToPlayer < 48 && player.driving) onShot('ram', 12);
    else if (distToPlayer < 30 && !player.driving) onShot('ram', 18);
  }
  for (const cop of police.foot) {
    const seen = seesTarget(cop.x, cop.y, cop.angle, px, py, city, HEAT.visionRange, HEAT.visionHalfAngle);
    if (seen) {
      cop.lastSeenX = px;
      cop.lastSeenY = py;
    }
    const target = seen ? { x: px, y: py } : wander(cop, dt);
    const dx = target.x - cop.x;
    const dy = target.y - cop.y;
    const dist = Math.hypot(dx, dy) || 1;
    cop.angle = Math.atan2(dy, dx);
    if (dist > 24) {
      const speed = seen ? POLICE.footSpeed : POLICE.footSpeed * 0.5;
      cop.x += (dx / dist) * speed * dt;
      cop.y += (dy / dist) * speed * dt;
    }
    const fixed = collideBuildings(city, cop.x, cop.y, 10);
    cop.x = fixed.x;
    cop.y = fixed.y;
    cop.shootTimer -= dt;
    if (dist < POLICE.shootRange && heat.stars >= 2 && cop.shootTimer <= 0 && seen) {
      cop.shootTimer = POLICE.shootCooldown;
      police.bullets.push({ x: cop.x, y: cop.y, vx: (dx / dist) * 520, vy: (dy / dist) * 520, life: 1.2, fromPolice: true });
    }
  }
  for (let i = police.bullets.length - 1; i >= 0; i -= 1) {
    const b = police.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0 || pointInBuilding(city, b.x, b.y)) police.bullets.splice(i, 1);
  }
}

export function stepCrowd(peds, dt, city, player, random) {
  for (const ped of peds) stepPed(ped, dt, city, player, random);
}

export function stepTraffic(cars, dt, city, random) {
  for (const car of cars) stepTrafficCar(car, dt, city, random, cars);
}

/** Pedestrians within crowdRadius of the player (on foot, not sprinting). */
export function crowdNear(peds, x, y, radius) {
  let n = 0;
  for (const ped of peds) {
    if (Math.hypot(ped.x - x, ped.y - y) < radius) n += 1;
  }
  return n;
}

/** Nearest drivable car (traffic with a driver, or a parked car) to a point. */
export function nearestCar(cars, parked, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    if (!car.driver) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = { kind: 'traffic', car }; }
  }
  for (const car of parked) {
    if (car.taken) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = { kind: 'parked', car }; }
  }
  return best;
}
