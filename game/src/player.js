// The player: on foot (walk / sprint / punch / shoot) and behind the wheel
// (arcade driving, carjacking, ramming). One object, two modes, one position.

import { CAR, PLAYER, WORLD } from './config.js';
import { collideBuildings } from './city.js';
import { addHeat } from './heat.js';
import { nearestCar } from './entities.js';

export function createPlayer(city) {
  return {
    x: city.spawn.x,
    y: city.spawn.y,
    angle: -Math.PI / 2,
    health: PLAYER.health,
    cash: 0,
    ammo: PLAYER.startAmmo,
    driving: false,
    car: null,
    carSpeed: 0,
    sprinting: false,
    punchTimer: 0,
    shootTimer: 0,
    hurtTimer: 0,
    skid: [],
  };
}

export function hurtPlayer(player, damage) {
  if (player.hurtTimer > 0) return false;
  player.health = Math.max(0, player.health - damage);
  player.hurtTimer = 0.6;
  return true;
}

function stepOnFoot(player, dt, input, city, world) {
  const sprint = input.sprint;
  player.sprinting = sprint;
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  let mx = input.moveX;
  let my = input.moveY;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    player.x += mx * speed * dt;
    player.y += my * speed * dt;
    player.angle = Math.atan2(my, mx);
  }
  const fixed = collideBuildings(city, player.x, player.y, PLAYER.radius);
  player.x = Math.max(20, Math.min(WORLD.width - 20, fixed.x));
  player.y = Math.max(20, Math.min(WORLD.waterY - 10, fixed.y));
  player.punchTimer = Math.max(0, player.punchTimer - dt);
  player.shootTimer = Math.max(0, player.shootTimer - dt);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);
  // Slow health recovery while the trail is cold.
  if (world.heat.points === 0 && player.health < PLAYER.health) {
    player.health = Math.min(PLAYER.health, player.health + 4 * dt);
  }
}

function stepDriving(player, dt, input, city, world) {
  const forward = input.moveY < 0 ? 1 : input.moveY > 0 ? -1 : 0;
  const steer = input.moveX;
  if (forward > 0) player.carSpeed += CAR.accel * dt;
  else if (forward < 0) {
    if (player.carSpeed > 10) player.carSpeed -= CAR.brake * dt;
    else player.carSpeed = Math.max(-CAR.reverseSpeed, player.carSpeed - CAR.accel * 0.6 * dt);
  } else {
    player.carSpeed -= Math.sign(player.carSpeed) * 140 * dt;
    if (Math.abs(player.carSpeed) < 8) player.carSpeed = 0;
  }
  player.carSpeed = Math.max(-CAR.reverseSpeed, Math.min(CAR.maxSpeed, player.carSpeed));
  const turn = steer * CAR.steer * (player.carSpeed / CAR.maxSpeed) * (player.carSpeed < 0 ? -1 : 1);
  player.angle += turn * dt * 1.6;
  const nx = player.x + Math.cos(player.angle) * player.carSpeed * dt;
  const ny = player.y + Math.sin(player.angle) * player.carSpeed * dt;
  const before = { x: player.x, y: player.y };
  const fixed = collideBuildings(city, nx, ny, 22);
  player.x = Math.max(20, Math.min(WORLD.width - 20, fixed.x));
  player.y = Math.max(20, Math.min(WORLD.waterY - 10, fixed.y));
  const hitWall = Math.hypot(player.x - before.x, player.y - before.y) < Math.abs(player.carSpeed) * dt * 0.4;
  if (hitWall && Math.abs(player.carSpeed) > 120) {
    player.carSpeed *= -0.25;
    world.addParticles(player.x, player.y, 8, '#d8c9a8');
  }
  if (player.car) {
    player.car.x = player.x;
    player.car.y = player.y;
    player.car.angle = player.angle;
  }
  // Skid marks at speed while turning hard.
  if (Math.abs(player.carSpeed) > 260 && Math.abs(steer) > 0.5) {
    player.skid.push({ x: player.x, y: player.y, angle: player.angle, life: 3 });
    if (player.skid.length > 60) player.skid.shift();
  }
  for (const s of player.skid) s.life -= dt;
  player.skid = player.skid.filter((s) => s.life > 0);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);
  player.punchTimer = Math.max(0, player.punchTimer - dt);
  player.shootTimer = Math.max(0, player.shootTimer - dt);
}

export function stepPlayer(player, dt, input, city, world) {
  if (player.driving) stepDriving(player, dt, input, city, world);
  else stepOnFoot(player, dt, input, city, world);
}

/** Try to jack the nearest car (E). Returns a message for the HUD, or null. */
export function tryEnterCar(player, traffic, parked, heat, peds, onEvent) {
  const found = nearestCar(traffic, parked, player.x, player.y, PLAYER.carEnterRange);
  if (!found) return null;
  const car = found.car;
  if (found.kind === 'traffic') {
    car.driver = false;
    // The driver bails out and flees on foot.
    peds.push({
      x: car.x + 30, y: car.y + 30, tx: car.x + 300, ty: car.y - 200,
      speed: 190, angle: 0, shirt: '#e88a4a', fleeing: 3, walkPhase: 0, id: 900 + Math.floor(Math.random() * 100),
    });
    addHeat(heat, 25);
    onEvent('carjack');
  } else {
    car.taken = true;
  }
  player.driving = true;
  player.car = car;
  player.carSpeed = 0;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  return found.kind === 'traffic' ? 'Carjacked! The heat is on — break line of sight to cool off.' : 'You took a parked car.';
}

/** Step out of the car (E / F). */
export function exitCar(player) {
  if (!player.driving) return;
  player.driving = false;
  const side = { x: player.x + Math.cos(player.angle + Math.PI / 2) * 30, y: player.y + Math.sin(player.angle + Math.PI / 2) * 30 };
  player.x = side.x;
  player.y = side.y;
  player.carSpeed = 0;
  player.car = null;
}

/** Punch: hits the nearest pedestrian or cop in range. Returns what was hit. */
export function punch(player, peds, police, heat) {
  if (player.punchTimer > 0 || player.driving) return null;
  player.punchTimer = PLAYER.punchCooldown;
  const range = PLAYER.punchRange + 14;
  for (const ped of peds) {
    if (Math.hypot(ped.x - player.x, ped.y - player.y) < range) {
      ped.fleeing = 2.5;
      addHeat(heat, 12);
      return 'ped';
    }
  }
  for (const cop of police.foot) {
    if (Math.hypot(cop.x - player.x, cop.y - player.y) < range) {
      cop.x += Math.cos(player.angle) * 40;
      cop.y += Math.sin(player.angle) * 40;
      addHeat(heat, 12);
      return 'cop';
    }
  }
  return 'air';
}

/** Shoot toward a world point. Returns 'shot' or null (no ammo / cooldown). */
export function shoot(player, targetX, targetY, police, peds, heat) {
  if (player.shootTimer > 0 || player.driving || player.ammo <= 0) return null;
  player.shootTimer = PLAYER.pistolCooldown;
  player.ammo -= 1;
  player.angle = Math.atan2(targetY - player.y, targetX - player.x);
  // Hit the first cop or ped roughly along the shot line.
  const dx = targetX - player.x;
  const dy = targetY - player.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  let best = null;
  let bestD = PLAYER.pistolRange;
  const scan = (list, kind) => {
    for (const e of list) {
      const ex = e.x - player.x;
      const ey = e.y - player.y;
      const along = ex * ux + ey * uy;
      if (along < 0 || along > bestD) continue;
      const perp = Math.abs(ex * uy - ey * ux);
      if (perp < 22) { best = { kind, e, along }; bestD = along; }
    }
  };
  scan(police.foot, 'cop');
  scan(peds, 'ped');
  if (best) {
    if (best.kind === 'cop') {
      best.e.hp -= PLAYER.pistolDamage;
      if (best.e.hp <= 0) {
        const i = police.foot.indexOf(best.e);
        if (i >= 0) police.foot.splice(i, 1);
      }
    } else {
      best.e.fleeing = 3;
    }
    addHeat(heat, 18);
  }
  return 'shot';
}
