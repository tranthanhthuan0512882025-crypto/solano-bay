// Boot and the one loop for Solano Bay: input is read every frame, the world
// advances in fixed 1/60 s steps (simulate.js), and the renderer paints what
// is there. Screens: title, play, paused, busted, wasted, story complete.
//
// ?seed=N fixes the city. ?shot=cover|street|harbor|chase (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { STEP, PLAYER } from './config.js';
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createAudio } from './audio.js';
import { createPedestrians, createTraffic, createPolice } from './entities.js';
import { createHeat } from './heat.js';
import { createPlayer, tryEnterCar, exitCar, punch, shoot } from './player.js';
import { createMissionState, currentMission, startMission, failMission } from './missions.js';
import { saveGameData, loadGameData } from './save.js';
import { stepWorld } from './simulate.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER_CAR, ACTION_PUNCH, ACTION_MUTE, createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED, SCREEN_COMPLETE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261120;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

function buildWorld(seedValue) {
  const random = createRandom(seedValue);
  const city = createCity(random);
  const player = createPlayer(city);
  const world = {
    city,
    player,
    peds: createPedestrians(random, city),
    traffic: createTraffic(random, city),
    police: createPolice(),
    heat: createHeat(),
    missions: createMissionState(),
    particles: [],
    bullets: [],
    time: 0,
    random,
    audio,
    missionTarget: null,
    saveGame() {},
    addParticles(x, y, n, color) {
      for (let i = 0; i < n; i += 1) {
        world.particles.push({
          x: x + (Math.random() - 0.5) * 20,
          y: y + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          life: 0.6,
          maxLife: 0.6,
          size: 3 + Math.random() * 4,
          color: color || '#ffd23f',
        });
      }
    },
  };
  world.saveGame = () => {
    saveGameData({
      cash: player.cash,
      completed: world.missions.completed,
      index: world.missions.index,
      x: Math.round(player.x),
      y: Math.round(player.y),
      ammo: player.ammo,
    });
  };
  return world;
}

const world = buildWorld(seed);

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Debug handle for the playtest: the staged world, nothing the player sees.
  window.__shotWorld = world;
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.save);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let saved = loadGameData();
  let nextMissionTimer = 0;
  let accumulator = 0;
  let last = performance.now();

  function startFresh() {
    const fresh = buildWorld(seed);
    Object.assign(world, fresh);
    world.saveGame = fresh.saveGame;
    world.missions.index = 0;
    world.missions.completed = [];
    startMission(world.missions, world);
    screen = SCREEN_PLAY;
    announce(`Playing. Mission 1: ${currentMission(world.missions).title}.`);
  }

  function startContinued() {
    if (!saved) return startFresh();
    world.player.cash = saved.cash || 0;
    world.player.ammo = saved.ammo || PLAYER.startAmmo;
    world.player.x = saved.x || world.city.spawn.x;
    world.player.y = saved.y || world.city.spawn.y;
    world.missions.completed = saved.completed || [];
    world.missions.index = Math.min(saved.index || 0, 4);
    if (world.missions.completed.length >= 5) {
      screen = SCREEN_PLAY;
      announce('Free roam. All missions complete.');
      return;
    }
    startMission(world.missions, world);
    screen = SCREEN_PLAY;
    announce(`Continuing. Mission ${world.missions.index + 1}.`);
  }

  function endRun(kind) {
    if (world.missions.active) failMission(world.missions, world, kind === 'busted' ? 'Busted by the police' : 'Wasted');
    world.heat.points = 0;
    world.heat.stars = 0;
    world.police.cars.length = 0;
    world.police.foot.length = 0;
    world.police.bullets.length = 0;
    world.player.health = PLAYER.health;
    world.player.driving = false;
    world.player.car = null;
    world.player.carSpeed = 0;
    world.player.x = world.city.spawn.x;
    world.player.y = world.city.spawn.y;
    world.saveGame();
    screen = kind === 'busted' ? SCREEN_BUSTED : SCREEN_WASTED;
    audio.busted();
    announce(kind === 'busted' ? 'Busted. Press Enter to try again.' : 'Wasted. Press Enter to try again.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM || input.takeMouseClick()) {
        audio.unlock();
        audio.startMusic();
        if (saved && saved.completed && saved.completed.length > 0) startContinued();
        else startFresh();
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED || screen === SCREEN_COMPLETE) {
      if (actions & ACTION_CONFIRM || input.takeMouseClick()) {
        if (screen === SCREEN_COMPLETE) screen = SCREEN_PLAY;
        else startContinued();
      }
      return;
    }
    // SCREEN_PLAY
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & ACTION_ENTER_CAR) {
      if (world.player.driving) exitCar(world.player);
      else {
        const msg = tryEnterCar(world.player, world.traffic, world.city.parked, world.heat, world.peds, (event) => {
          if (event === 'carjack') audio.horn();
        });
        if (msg) {
          world.missions.message = msg;
          world.missions.messageTimer = 4;
        }
      }
    }
    if (actions & ACTION_PUNCH) {
      const hit = punch(world.player, world.peds, world.police, world.heat);
      if (hit && hit !== 'air') {
        audio.punch();
        world.addParticles(world.player.x + Math.cos(world.player.angle) * 24, world.player.y + Math.sin(world.player.angle) * 24, 5, '#ffd23f');
      }
    }
    if (input.mouse.down || input.takeMouseClick()) {
      if (!world.player.driving) {
        const target = renderer.screenToWorld(input.mouse.x, input.mouse.y);
        const result = shoot(world.player, target.x, target.y, world.police, world.peds, world.heat);
        if (result === 'shot') {
          audio.gunshot();
          const dx = target.x - world.player.x;
          const dy = target.y - world.player.y;
          const len = Math.hypot(dx, dy) || 1;
          world.bullets.push({
            x: world.player.x + (dx / len) * 24,
            y: world.player.y + (dy / len) * 24,
            vx: (dx / len) * 700,
            vy: (dy / len) * 700,
            life: 0.7,
          });
        }
      }
    }
    // The next mission starts by itself a few seconds after the last one ends.
    if (!world.missions.active && world.missions.completed.length > 0 && world.missions.completed.length < 5) {
      nextMissionTimer += 1 / 60;
      if (nextMissionTimer > 3) {
        nextMissionTimer = 0;
        world.missions.index = world.missions.completed.length;
        startMission(world.missions, world);
      }
    } else {
      nextMissionTimer = 0;
    }
    if (world.missions.completed.length >= 5 && screen === SCREEN_PLAY) {
      screen = SCREEN_COMPLETE;
      world.saveGame();
    }
  }

  let lastSave = 0;
  function step() {
    if (screen !== SCREEN_PLAY) return;
    const outcome = stepWorld(world, STEP, input);
    if (outcome === 'busted') endRun('busted');
    else if (outcome === 'wasted') endRun('wasted');
    // Autosave every 10 seconds of play.
    if (world.time - lastSave >= 10) {
      lastSave = world.time;
      world.saveGame();
    }
    audio.setEngine(world.player.driving, Math.abs(world.player.carSpeed) / 520);
    audio.setSiren(world.heat.stars > 0 && world.police.cars.length > 0);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, saved);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // Test and debug handle: the state the playtest reads, nothing the player sees.
  window.__solano = {
    world,
    get screen() { return screen; },
    get save() { return loadGameData(); },
    startFresh,
    startContinued,
  };
  announce('Solano Bay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
