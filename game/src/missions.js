// The story: five missions across Solano Bay, each a short arc with steps,
// a gold marker, dialogue and a cash reward. The Cold Trail mechanic is the
// spine — mission 2 teaches it, missions 3 and 5 test it under pressure.

import { LANDMARKS } from './city.js';
import { addHeat } from './heat.js';

export const MISSIONS = [
  {
    id: 1,
    title: 'First Light',
    brief: 'Rosa is waiting at Marina Pier. Pick her up and drive her to Café Solano. Keep it clean — no heat.',
    reward: 200,
    steps: [
      { kind: 'goto', target: LANDMARKS.marina, text: 'Meet Rosa at Marina Pier' },
      { kind: 'goto', target: LANDMARKS.cafe, text: 'Drive Rosa to Café Solano', needCar: true },
    ],
    done: 'Rosa: "You drive like my grandma — but you showed up. That counts."',
  },
  {
    id: 2,
    title: 'Cold Trail',
    brief: 'The crew needs a car, fast. Jack one — then lose the heat. Remember: heat cools ONLY when no cop can see you. Break line of sight, duck behind buildings, or blend into a crowd.',
    reward: 300,
    steps: [
      { kind: 'carjack', text: 'Jack any car (press E near one)' },
      { kind: 'loseheat', text: 'Lose the heat — stay unseen until it cools to zero' },
    ],
    done: 'Rosa: "Cold trail. That is how you survive Solano Bay."',
  },
  {
    id: 3,
    title: 'Harbor Heist',
    brief: 'A courier van is parked at the South Docks with the crew\'s cut inside. Take it and deliver it to Warehouse 9. The docks are watched — expect company.',
    reward: 500,
    steps: [
      { kind: 'goto', target: LANDMARKS.docks, text: 'Reach the courier van at the South Docks' },
      { kind: 'stealvan', text: 'Take the courier van' },
      { kind: 'goto', target: LANDMARKS.warehouse, text: 'Deliver the van to Warehouse 9', needCar: true },
    ],
    done: 'Vane: "Clean work. The crew eats tonight."',
  },
  {
    id: 4,
    title: 'Crowd Cover',
    brief: 'Tail Mr. Vane through Mercado Square. Stay close enough to watch him, far enough not to spook him — and blend into the crowd. If he spots you, it is over.',
    reward: 600,
    steps: [
      { kind: 'tail', target: LANDMARKS.market, text: 'Tail Mr. Vane through the market — stay in the crowd, do not sprint' },
    ],
    done: 'Rosa: "He never saw you. You are a ghost in a crowd."',
  },
  {
    id: 5,
    title: 'Sunset Run',
    brief: 'One last job. Grab the package at the Old Lighthouse and run it to Marina Pier — the whole harbour force will be on you. Lose them the cold way, or outdrive them.',
    reward: 1000,
    steps: [
      { kind: 'goto', target: LANDMARKS.lighthouse, text: 'Pick up the package at the Old Lighthouse' },
      { kind: 'goto', target: LANDMARKS.marina, text: 'Deliver the package to Marina Pier — the whole harbour force is on you', heatOnPickup: 60 },
    ],
    done: 'Rosa: "Sunset over Solano Bay, and the package is ours. You are legend now."',
  },
];

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    active: false,
    completed: [],
    tail: null,
    van: null,
    message: '',
    messageTimer: 0,
    banner: '',
    bannerTimer: 0,
  };
}

export function currentMission(state) {
  return MISSIONS[state.index] || null;
}

export function currentStep(state) {
  const m = currentMission(state);
  return m ? m.steps[state.step] : null;
}

export function missionTarget(state) {
  const step = currentStep(state);
  if (!step) return null;
  if (step.kind === 'tail' && state.tail) return { x: state.tail.x, y: state.tail.y, name: 'Mr. Vane' };
  if (step.target) return step.target;
  return null;
}

export function startMission(state, world) {
  const m = currentMission(state);
  if (!m) return;
  state.active = true;
  state.step = 0;
  state.message = m.brief;
  state.messageTimer = 7;
  state.banner = `MISSION ${m.id}: ${m.title}`;
  state.bannerTimer = 3;
  if (m.id === 4) {
    // Mr. Vane strolls the market square.
    state.tail = {
      x: LANDMARKS.market.x + 40, y: LANDMARKS.market.y + 40,
      angle: 0, speed: 46, shirt: '#2b2b2b', fleeing: 0, walkPhase: 0, id: 777,
      waypoints: [
        { x: LANDMARKS.market.x + 260, y: LANDMARKS.market.y + 60 },
        { x: LANDMARKS.market.x + 260, y: LANDMARKS.market.y + 240 },
        { x: LANDMARKS.market.x + 40, y: LANDMARKS.market.y + 240 },
        { x: LANDMARKS.market.x + 40, y: LANDMARKS.market.y + 60 },
      ],
      wp: 0,
      spotted: 0,
    };
  }
  if (m.id === 3) {
    state.van = {
      x: LANDMARKS.docks.x + 60, y: LANDMARKS.docks.y,
      angle: 0, color: '#e8e4da', police: false, driver: false, stopped: 0, id: 555, courier: true,
    };
  }
  world.audio.missionDone();
}

function advanceStep(state, world) {
  const m = currentMission(state);
  state.step += 1;
  world.saveGame();
  if (state.step >= m.steps.length) {
    completeMission(state, world);
  } else {
    const step = currentStep(state);
    state.message = step.text;
    state.messageTimer = 5;
  }
}

export function completeMission(state, world) {
  const m = currentMission(state);
  state.active = false;
  state.completed.push(m.id);
  world.player.cash += m.reward;
  world.player.ammo = Math.max(world.player.ammo, 24);
  state.banner = `MISSION COMPLETE — ${m.title}  +$${m.reward}`;
  state.bannerTimer = 4;
  state.message = m.done;
  state.messageTimer = 7;
  state.tail = null;
  state.van = null;
  world.audio.missionDone();
  world.saveGame();
}

export function failMission(state, world, reason) {
  state.active = false;
  state.step = 0;
  state.tail = null;
  state.van = null;
  state.banner = `MISSION FAILED — ${reason}`;
  state.bannerTimer = 3;
  state.message = 'Press Enter to retry the mission.';
  state.messageTimer = 6;
}

function near(player, target, radius) {
  return Math.hypot(player.x - target.x, player.y - target.y) < radius;
}

/** Advance mission steps from the live world; returns events for the main loop. */
export function stepMissions(state, dt, world) {
  if (state.messageTimer > 0) state.messageTimer -= dt;
  if (state.bannerTimer > 0) state.bannerTimer -= dt;
  if (!state.active) return;
  const m = currentMission(state);
  if (!m) return;
  const step = currentStep(state);
  const player = world.player;
  if (step.kind === 'goto') {
    if (near(player, step.target, 70) && (!step.needCar || player.driving)) {
      if (step.heatOnPickup) addHeat(world.heat, step.heatOnPickup);
      advanceStep(state, world);
    }
  } else if (step.kind === 'carjack') {
    if (player.driving) advanceStep(state, world);
  } else if (step.kind === 'loseheat') {
    if (world.heat.points <= 0) advanceStep(state, world);
  } else if (step.kind === 'stealvan') {
    if (state.van && player.driving && player.car === state.van) advanceStep(state, world);
  } else if (step.kind === 'tail') {
    const vane = state.tail;
    if (!vane) return;
    // Vane strolls his waypoints.
    const wp = vane.waypoints[vane.wp];
    const dx = wp.x - vane.x;
    const dy = wp.y - vane.y;
    const d = Math.hypot(dx, dy);
    if (d < 10) vane.wp = (vane.wp + 1) % vane.waypoints.length;
    else {
      vane.x += (dx / d) * vane.speed * dt;
      vane.y += (dy / d) * vane.speed * dt;
      vane.angle = Math.atan2(dy, dx);
    }
    const dist = Math.hypot(player.x - vane.x, player.y - vane.y);
    // Spotted: too close, or sprinting in the open.
    if (dist < 55 || (dist < 170 && player.sprinting && !world.heat.blended)) {
      vane.spotted += dt;
      if (vane.spotted > 1.2) {
        failMission(state, world, 'Mr. Vane spotted you');
        return;
      }
    } else {
      vane.spotted = Math.max(0, vane.spotted - dt);
    }
    if (dist > 420) {
      failMission(state, world, 'You lost Mr. Vane');
      return;
    }
    // Tail him for a full loop: 26 seconds of shadowing completes the tail.
    state.tailProgress = (state.tailProgress || 0) + dt;
    if (state.tailProgress > 26) advanceStep(state, world);
  }
}
