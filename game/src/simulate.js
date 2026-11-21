// The simulation step, shared by the live loop and the screenshot stager:
// one fixed step of driving, traffic, crowds, police, Cold Trail heat,
// missions, bullets and particles. Returns 'busted' or 'wasted' when the run ends.

import { WORLD, ROADS, POLICE, PLAYER } from './config.js';
import { stepPlayer, hurtPlayer } from './player.js';
import { stepTraffic, stepCrowd, stepPolice, spawnPoliceCar, spawnPoliceFoot } from './entities.js';
import { stepHeat, addHeat, wantedPoliceCount } from './heat.js';
import { stepMissions, missionTarget } from './missions.js';

/** Keep the street force at the size the wanted level calls for. New units are
 * sent to the last place the player was SEEN, never to their live position. */
export function maintainPolice(world) {
  const want = wantedPoliceCount(world.heat.stars);
  const police = world.police;
  const player = world.player;
  const rx = world.heat.reportedX || player.x;
  const ry = world.heat.reportedY || player.y;
  if (police.cars.length < want) {
    for (let tries = 0; tries < 12 && police.cars.length < want; tries += 1) {
      const vertical = Math.random() < 0.5;
      const x = vertical ? ROADS.avenues[Math.floor(Math.random() * ROADS.avenues.length)] : Math.random() * WORLD.width;
      const y = vertical ? Math.random() * 2100 : ROADS.streets[Math.floor(Math.random() * ROADS.streets.length)];
      if (Math.hypot(x - player.x, y - player.y) > POLICE.spawnDistance) {
        spawnPoliceCar(police, x, y, Math.atan2(ry - y, rx - x), rx, ry);
      }
    }
  }
  if (world.heat.stars >= 2 && police.foot.length < 2 && Math.random() < 0.01) {
    const a = Math.random() * Math.PI * 2;
    spawnPoliceFoot(police, rx + Math.cos(a) * 420, ry + Math.sin(a) * 420, rx, ry);
  }
  if (world.heat.stars === 0) {
    police.cars.length = 0;
    police.foot.length = 0;
    police.bullets.length = 0;
  }
  // After a long cold spell the search is called off: distant units leave.
  if (world.heat.unseenTime > 8 && world.heat.points > 0) {
    police.cars = police.cars.filter((car) => Math.hypot(car.x - player.x, car.y - player.y) < 800);
    police.foot = police.foot.filter((cop) => Math.hypot(cop.x - player.x, cop.y - player.y) < 800);
  }
}

export function stepWorld(world, dt, input) {
  world.time += dt;
  const player = world.player;
  stepPlayer(player, dt, input, world.city, world);
  stepTraffic(world.traffic, dt, world.city, world.random);
  stepCrowd(world.peds, dt, world.city, player, world.random);
  maintainPolice(world);
  stepPolice(world.police, dt, player, world.city, world.heat, (kind, damage) => {
    if (kind === 'ram' && hurtPlayer(player, damage)) {
      world.addParticles(player.x, player.y, 10, '#ff6b5e');
      world.audio.punch();
    }
  });
  stepHeat(world.heat, dt, world.police, player, world.city, world.peds);
  stepMissions(world.missions, dt, world);
  world.missionTarget = world.missions.active ? missionTarget(world.missions) : null;

  // Player bullets: fly, hit buildings, cops and pedestrians.
  for (let i = world.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead) {
      for (const cop of world.police.foot) {
        if (Math.hypot(cop.x - b.x, cop.y - b.y) < 14) {
          cop.hp -= PLAYER.pistolDamage;
          if (cop.hp <= 0) world.police.foot.splice(world.police.foot.indexOf(cop), 1);
          addHeat(world.heat, 10);
          dead = true;
          break;
        }
      }
    }
    if (!dead) {
      for (const ped of world.peds) {
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 14) {
          ped.fleeing = 3;
          addHeat(world.heat, 10);
          dead = true;
          break;
        }
      }
    }
    if (dead) {
      world.addParticles(b.x, b.y, 6, '#ffd23f');
      world.bullets.splice(i, 1);
    }
  }

  // Driving into a pedestrian is a crime the whole street sees.
  if (player.driving) {
    for (const ped of world.peds) {
      if (Math.hypot(ped.x - player.x, ped.y - player.y) < 30 && (ped.lastHit || 0) < world.time - 2) {
        ped.lastHit = world.time;
        ped.fleeing = 3;
        ped.x += Math.cos(player.angle) * 50;
        ped.y += Math.sin(player.angle) * 50;
        addHeat(world.heat, 30);
        world.addParticles(ped.x, ped.y, 8, '#ff6b5e');
      }
    }
    // Bumping traffic shoves it aside instead of wedging the player in place:
    // a stopped car in front of the player used to freeze both cars forever.
    for (const car of world.traffic) {
      if (car.driver && Math.hypot(car.x - player.x, car.y - player.y) < 46) {
        const dx = car.x - player.x;
        const dy = car.y - player.y;
        const d = Math.hypot(dx, dy) || 1;
        car.x += (dx / d) * 26;
        car.y += (dy / d) * 26;
        car.stopped = 0.4;
        if (world.time - (player.lastBumpAt || -10) > 0.5) {
          player.lastBumpAt = world.time;
          player.carSpeed *= 0.75;
          world.audio.horn();
          world.addParticles(car.x, car.y, 4, '#ffd23f');
        }
      }
    }
  }

  // Particles.
  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const part = world.particles[i];
    part.x += part.vx * dt;
    part.y += part.vy * dt;
    part.life -= dt;
    if (part.life <= 0) world.particles.splice(i, 1);
  }

  // Busted: a cop reaches the player on foot while wanted.
  if (world.heat.stars > 0 && !player.driving) {
    for (const cop of world.police.foot) {
      if (Math.hypot(cop.x - player.x, cop.y - player.y) < POLICE.catchRadius) return 'busted';
    }
    for (const car of world.police.cars) {
      if (Math.hypot(car.x - player.x, car.y - player.y) < POLICE.catchRadius) return 'busted';
    }
  }
  if (player.health <= 0) return 'wasted';
  for (let i = world.police.bullets.length - 1; i >= 0; i -= 1) {
    const b = world.police.bullets[i];
    if (Math.hypot(b.x - player.x, b.y - player.y) < 16) {
      hurtPlayer(player, POLICE.bulletDamage);
      world.police.bullets.splice(i, 1);
      if (player.health <= 0) return 'wasted';
    }
  }
  return null;
}
