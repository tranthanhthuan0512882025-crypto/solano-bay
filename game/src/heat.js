// Cold Trail — the wanted system. Heat (0..100, one star per 20) rises when the
// player commits crimes in front of witnesses, and it cools ONLY while no police
// officer can see the player: police vision cones, line of sight through the
// buildings, and blending into a pedestrian crowd decide what "seen" means.

import { HEAT, PEDESTRIANS } from './config.js';
import { seesTarget } from './city.js';
import { crowdNear } from './entities.js';

export function createHeat() {
  return {
    points: 0,
    stars: 0,
    seen: false,
    seenBy: 0,
    unseenTime: 0,
    cooling: false,
    blended: false,
    crowdCount: 0,
    areaHot: false,
    // The last place anyone actually saw the player: new police are sent
    // here, never to the player's live position while unseen.
    reportedX: 0,
    reportedY: 0,
  };
}

/** Can this officer see the player? Cone + range + line of sight (+blend). */
export function officerSees(officer, player, city, blended) {
  const range = HEAT.visionRange * (blended ? HEAT.blendRangeFactor : 1);
  return seesTarget(officer.x, officer.y, officer.angle, player.x, player.y, city, range, HEAT.visionHalfAngle);
}

/** How many police (cars + foot) currently have eyes on the player. */
export function countWatchers(police, player, city, blended) {
  let n = 0;
  for (const car of police.cars) if (officerSees(car, player, city, blended)) n += 1;
  for (const cop of police.foot) if (officerSees(cop, player, city, blended)) n += 1;
  return n;
}

export function addHeat(heat, points) {
  heat.points = Math.max(0, Math.min(HEAT.max, heat.points + points));
  heat.stars = Math.min(5, Math.ceil(heat.points / HEAT.pointsPerStar));
  // A fresh crime alerts the street: the trail only starts going cold once
  // the player has been unseen for a while after it.
  heat.unseenTime = 0;
}

export function stepHeat(heat, dt, police, player, city, peds) {
  // Blending: on foot, walking (not sprinting), inside a crowd.
  const crowd = crowdNear(peds, player.x, player.y, PEDESTRIANS.crowdRadius);
  heat.crowdCount = crowd;
  heat.blended = !player.driving && !player.sprinting && crowd >= PEDESTRIANS.crowdMin;
  const watchers = countWatchers(police, player, city, heat.blended);
  heat.seenBy = watchers;
  heat.seen = watchers > 0;
  if (heat.seen || heat.points > (heat.lastPoints || 0)) {
    // Seen, or the heat just rose: someone reported the crime's location.
    heat.reportedX = player.x;
    heat.reportedY = player.y;
  }
  heat.lastPoints = heat.points;
  // A cop searching nearby keeps the trail warm even without eyes on the
  // player: the heat only cools once the police are far away and blind.
  let nearest = Infinity;
  for (const car of police.cars) nearest = Math.min(nearest, Math.hypot(car.x - player.x, car.y - player.y));
  for (const cop of police.foot) nearest = Math.min(nearest, Math.hypot(cop.x - player.x, cop.y - player.y));
  heat.areaHot = nearest < 450;
  if (heat.seen) {
    heat.unseenTime = 0;
    heat.cooling = false;
    if (heat.points > 0) heat.points = Math.min(HEAT.max, heat.points + HEAT.seenRisePerSecond * dt);
  } else if (heat.areaHot && heat.points > 0) {
    heat.unseenTime = 0;
    heat.cooling = false;
  } else {
    heat.unseenTime += dt;
    if (heat.unseenTime >= HEAT.coolDelay && heat.points > 0) {
      heat.cooling = true;
      const rate = HEAT.coolPerSecond[Math.min(4, heat.stars)];
      heat.points = Math.max(0, heat.points - rate * dt);
    } else {
      heat.cooling = false;
    }
  }
  heat.stars = Math.min(5, Math.ceil(heat.points / HEAT.pointsPerStar));
  if (heat.points <= 0) heat.stars = 0;
  return heat;
}

/** Wanted level drives how many police are on the street. */
export function wantedPoliceCount(stars) {
  return stars <= 0 ? 0 : stars === 1 ? 1 : stars === 2 ? 2 : stars === 3 ? 3 : stars === 4 ? 5 : 6;
}
