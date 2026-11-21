// Drawing only: the world state and the current screen in, pixels out.
// A camera follows the player over the harbour city; the HUD, the minimap and
// the menus are painted on top in screen space. Warm sunset palette throughout.

import { FONT, PALETTE, ROADS, WORLD } from './config.js';
import { LANDMARKS } from './city.js';
import { currentMission, currentStep } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_COMPLETE = 'complete';

const MINIMAP = { w: 210, h: 152, margin: 14 };

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const camera = { x: 0, y: 0, zoom: 1 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || ''}${size}px ${FONT}`);
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function roundRect(x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  function panel(x, y, w, h) {
    context.fillStyle = PALETTE.hudPanel;
    roundRect(x, y, w, h, 10);
    context.fill();
    context.strokeStyle = PALETTE.hudBorder;
    context.lineWidth = 1.5;
    context.stroke();
  }

  function drawGround(world) {
    const city = world.city;
    const t = world.time;
    // Land.
    context.fillStyle = PALETTE.ground;
    context.fillRect(0, 0, WORLD.width, WORLD.waterY);
    // Parks.
    for (const p of city.parks) {
      context.fillStyle = PALETTE.park;
      context.fillRect(p.x, p.y, p.w, p.h);
    }
    // Plaza.
    context.fillStyle = PALETTE.plaza;
    context.fillRect(LANDMARKS.plaza.x - 220, LANDMARKS.plaza.y - 160, 440, 320);
    // Market square.
    context.fillStyle = '#cbb98e';
    context.fillRect(city.market.x, city.market.y, city.market.w, city.market.h);
    // Beach + water.
    context.fillStyle = PALETTE.sand;
    context.fillRect(0, WORLD.beachY, WORLD.width, WORLD.waterY - WORLD.beachY);
    const wave = Math.sin(t * 1.4) * 6;
    context.fillStyle = PALETTE.water;
    context.fillRect(0, WORLD.waterY + wave * 0.3, WORLD.width, WORLD.height - WORLD.waterY);
    context.fillStyle = PALETTE.waterDeep;
    for (let x = 0; x < WORLD.width; x += 180) {
      context.fillRect(x + ((t * 24 + x) % 180), WORLD.waterY + 30 + (x % 90), 60, 4);
    }
    // Roads.
    context.fillStyle = PALETTE.road;
    for (const r of city.roads) context.fillRect(r.x, r.y, r.w, r.h);
    // Lane dashes.
    context.strokeStyle = PALETTE.lane;
    context.lineWidth = 3;
    context.setLineDash([26, 30]);
    context.beginPath();
    for (const a of ROADS.avenues) {
      context.moveTo(a, 0);
      context.lineTo(a, WORLD.waterY);
    }
    for (const s of ROADS.streets) {
      context.moveTo(0, s);
      context.lineTo(WORLD.width, s);
    }
    context.stroke();
    context.setLineDash([]);
    // Sidewalk edging around the roads.
    context.strokeStyle = PALETTE.sidewalk;
    context.lineWidth = 4;
    context.beginPath();
    for (const a of ROADS.avenues) {
      context.moveTo(a - ROADS.width / 2 - 2, 0);
      context.lineTo(a - ROADS.width / 2 - 2, WORLD.waterY);
      context.moveTo(a + ROADS.width / 2 + 2, 0);
      context.lineTo(a + ROADS.width / 2 + 2, WORLD.waterY);
    }
    context.stroke();
  }

  function drawBuildings(world) {
    const city = world.city;
    for (const b of city.buildings) {
      // Long sunset shadow to the east.
      context.fillStyle = 'rgba(60, 30, 10, 0.25)';
      context.fillRect(b.x + 10, b.y + 12, b.w, b.h);
      context.fillStyle = b.color;
      context.fillRect(b.x, b.y, b.w, b.h);
      context.fillStyle = b.roof;
      context.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      context.strokeStyle = PALETTE.buildingEdge;
      context.lineWidth = 2;
      context.strokeRect(b.x, b.y, b.w, b.h);
      if (b.tall) {
        context.fillStyle = 'rgba(255, 240, 200, 0.35)';
        context.fillRect(b.x + b.w * 0.3, b.y + b.h * 0.25, b.w * 0.4, b.h * 0.2);
      }
    }
    // Market stalls.
    context.fillStyle = '#e8e4da';
    for (let i = 0; i < 4; i += 1) {
      const sx = city.market.x + 30 + i * 68;
      context.fillRect(sx, city.market.y + 40, 52, 34);
      context.fillStyle = ['#c94f43', '#4a7fb5', '#d8c25a', '#5aa37a'][i];
      context.beginPath();
      context.moveTo(sx - 4, city.market.y + 40);
      context.lineTo(sx + 26, city.market.y + 18);
      context.lineTo(sx + 56, city.market.y + 40);
      context.closePath();
      context.fill();
      context.fillStyle = '#e8e4da';
    }
    // Trees.
    for (const tree of city.trees) {
      context.fillStyle = '#3f7a34';
      context.beginPath();
      context.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#5da24a';
      context.beginPath();
      context.arc(tree.x - 3, tree.y - 3, tree.r * 0.6, 0, Math.PI * 2);
      context.fill();
    }
    // Marina piers + boats.
    context.fillStyle = '#8a6f4d';
    for (let i = 0; i < 4; i += 1) context.fillRect(560 + i * 180, WORLD.waterY - 10, 26, 120);
    for (const boat of city.boats) {
      context.save();
      context.translate(boat.x, boat.y);
      context.rotate(boat.angle);
      context.fillStyle = boat.color;
      roundRect(-12, -30, 24, 60, 10);
      context.fill();
      context.fillStyle = '#2b2b2b';
      context.fillRect(-6, -8, 12, 16);
      context.restore();
    }
    // Lighthouse.
    const lh = LANDMARKS.lighthouse;
    context.fillStyle = '#e8e4da';
    context.beginPath();
    context.arc(lh.x, lh.y, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#c94f43';
    context.beginPath();
    context.arc(lh.x, lh.y, 26, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#e8e4da';
    context.beginPath();
    context.arc(lh.x, lh.y, 16, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#ffd23f';
    context.beginPath();
    context.arc(lh.x, lh.y, 7, 0, Math.PI * 2);
    context.fill();
  }

  function drawCarShape(x, y, angle, color, isPolice, sirenPhase) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.fillStyle = 'rgba(0,0,0,0.3)';
    roundRect(-28, -11, 56, 26, 8);
    context.fill();
    context.fillStyle = color;
    roundRect(-30, -14, 60, 28, 9);
    context.fill();
    context.fillStyle = '#20262e';
    roundRect(-8, -11, 18, 22, 4);
    context.fill();
    context.fillStyle = '#bcd6e8';
    context.fillRect(8, -10, 8, 20);
    if (isPolice) {
      context.fillStyle = '#e8e4da';
      context.fillRect(-30, -14, 60, 8);
      const flash = Math.sin(sirenPhase || 0) > 0;
      context.fillStyle = flash ? '#ff3b30' : '#3fa7ff';
      context.beginPath();
      context.arc(-14, 0, 5, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = flash ? '#3fa7ff' : '#ff3b30';
      context.beginPath();
      context.arc(14, 0, 5, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function drawVisionCone(officer, seen, blended) {
    const range = 300 * (blended ? 0.45 : 1);
    context.save();
    context.translate(officer.x, officer.y);
    context.rotate(officer.angle);
    context.fillStyle = seen ? 'rgba(255, 59, 48, 0.20)' : 'rgba(255, 201, 60, 0.11)';
    context.beginPath();
    context.moveTo(0, 0);
    context.arc(0, 0, range, -0.62, 0.62);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawEntities(world) {
    // Skid marks.
    context.strokeStyle = 'rgba(30, 25, 20, 0.5)';
    context.lineWidth = 4;
    for (const s of world.player.skid) {
      context.globalAlpha = Math.min(1, s.life / 3);
      context.beginPath();
      context.moveTo(s.x - Math.cos(s.angle) * 20, s.y - Math.sin(s.angle) * 20);
      context.lineTo(s.x, s.y);
      context.stroke();
    }
    context.globalAlpha = 1;
    // Parked cars.
    for (const car of world.city.parked) {
      if (car.taken) continue;
      drawCarShape(car.x, car.y, car.angle, car.color, false, 0);
    }
    // Courier van (mission 3).
    if (world.missions.van) {
      const v = world.missions.van;
      drawCarShape(v.x, v.y, v.angle, v.color, false, 0);
      context.fillStyle = '#c94f43';
      text('VAN', v.x, v.y - 34, 13, '#c94f43', 'center', 'bold ');
    }
    // Traffic.
    for (const car of world.traffic) drawCarShape(car.x, car.y, car.angle, car.color, false, 0);
    // Vision cones under the police.
    for (const car of world.police.cars) drawVisionCone(car, world.heat.seen, world.heat.blended);
    for (const cop of world.police.foot) drawVisionCone(cop, world.heat.seen, world.heat.blended);
    // Police.
    for (const car of world.police.cars) drawCarShape(car.x, car.y, car.angle, car.color, true, car.sirenPhase);
    for (const cop of world.police.foot) {
      context.fillStyle = '#1c2733';
      context.beginPath();
      context.arc(cop.x, cop.y, 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#3fa7ff';
      context.beginPath();
      context.arc(cop.x, cop.y - 4, 4, 0, Math.PI * 2);
      context.fill();
    }
    // Pedestrians.
    for (const ped of world.peds) {
      const bob = Math.sin(ped.walkPhase) * 2;
      context.fillStyle = ped.shirt;
      context.beginPath();
      context.arc(ped.x, ped.y + bob * 0.4, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#2b2118';
      context.beginPath();
      context.arc(ped.x, ped.y + bob * 0.4 - 2, 5, 0, Math.PI * 2);
      context.fill();
    }
    // Mr. Vane (mission 4 tail target).
    if (world.missions.tail) {
      const v = world.missions.tail;
      context.fillStyle = '#2b2b2b';
      context.beginPath();
      context.arc(v.x, v.y, 12, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ffd23f';
      context.beginPath();
      context.arc(v.x, v.y - 2, 5, 0, Math.PI * 2);
      context.fill();
      if (v.spotted > 0.2) {
        text('!', v.x, v.y - 24, 22, '#ff3b30', 'center', 'bold ');
      }
    }
    // Player.
    const p = world.player;
    if (p.driving && p.car) {
      drawCarShape(p.x, p.y, p.angle, p.car.color, false, 0);
      // Player marker above the car.
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.moveTo(p.x, p.y - 34);
      context.lineTo(p.x - 7, p.y - 46);
      context.lineTo(p.x + 7, p.y - 46);
      context.closePath();
      context.fill();
    } else {
      const blink = p.hurtTimer > 0 && Math.floor(p.hurtTimer * 12) % 2 === 0;
      if (!blink) {
        context.fillStyle = PALETTE.playerJacket;
        context.beginPath();
        context.arc(p.x, p.y, 14, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.player;
        context.beginPath();
        context.arc(p.x + Math.cos(p.angle) * 6, p.y + Math.sin(p.angle) * 6, 6, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = '#fff';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(p.x, p.y, 18, 0, Math.PI * 2);
        context.stroke();
      }
    }
    // Particles.
    for (const part of world.particles) {
      context.globalAlpha = Math.max(0, part.life / part.maxLife);
      context.fillStyle = part.color;
      context.beginPath();
      context.arc(part.x, part.y, part.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    // Player bullets.
    context.fillStyle = '#ffd23f';
    for (const b of world.bullets) {
      context.beginPath();
      context.arc(b.x, b.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    // Police bullets.
    context.fillStyle = '#ff6b5e';
    for (const b of world.police.bullets) {
      context.beginPath();
      context.arc(b.x, b.y, 4, 0, Math.PI * 2);
      context.fill();
    }
    // Mission marker: gold diamond + beacon.
    const target = world.missionTarget;
    if (target) {
      const pulse = 1 + Math.sin(world.time * 4) * 0.12;
      context.save();
      context.translate(target.x, target.y);
      context.scale(pulse, pulse);
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.moveTo(0, -26);
      context.lineTo(16, 0);
      context.lineTo(0, 26);
      context.lineTo(-16, 0);
      context.closePath();
      context.fill();
      context.fillStyle = '#1c2733';
      text('◆', 0, 7, 16, '#1c2733', 'center');
      context.restore();
      context.strokeStyle = 'rgba(255, 201, 60, 0.7)';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(target.x, target.y, 34 + Math.sin(world.time * 4) * 6, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawHud(world) {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    const p = world.player;
    const heat = world.heat;
    // Top-left: cash, health, ammo.
    panel(14, 14, 230, 92);
    text(`$${p.cash}`, 28, 46, 26, PALETTE.gold, 'left', 'bold ');
    text(`HEALTH`, 28, 74, 13, PALETTE.muted, 'left');
    context.fillStyle = '#3a2a2a';
    roundRect(28, 80, 150, 12, 6);
    context.fill();
    context.fillStyle = p.health > 40 ? '#5aa37a' : '#c94f43';
    roundRect(28, 80, Math.max(4, 150 * (p.health / 100)), 12, 6);
    context.fill();
    text(p.driving ? `SPEED ${Math.round(Math.abs(p.carSpeed) * 0.36)} km/h` : `AMMO ${p.ammo}`, 190, 74, 13, PALETTE.text, 'left');
    // Top-centre: wanted stars + heat meter.
    const cx = w / 2;
    panel(cx - 170, 14, 340, 92);
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < heat.stars ? '★' : '☆';
    text(stars, cx, 46, 26, heat.stars > 0 ? '#ff6b5e' : PALETTE.muted, 'center', 'bold ');
    context.fillStyle = '#3a2a2a';
    roundRect(cx - 140, 58, 280, 12, 6);
    context.fill();
    context.fillStyle = heat.cooling ? '#5aa37a' : heat.seen ? '#ff3b30' : '#e8a33d';
    roundRect(cx - 140, 58, Math.max(4, 280 * (heat.points / 100)), 12, 6);
    context.fill();
    const status = heat.points <= 0 ? 'CLEAN' : heat.cooling ? '❄ COLD TRAIL — COOLING' : heat.seen ? '👁 SPOTTED — HEAT HOLDING' : heat.areaHot ? '🚔 POLICE SEARCHING NEARBY' : 'HIDING — COOLING SOON';
    text(status, cx, 92, 13, heat.cooling ? '#8fd6a0' : heat.seen ? '#ff8a80' : PALETTE.muted, 'center', 'bold ');
    if (heat.blended) {
      panel(cx - 135, 106, 270, 26);
      text('BLENDING INTO THE CROWD', cx, 124, 13, '#8fd6a0', 'center', 'bold ');
    }
    // Minimap.
    drawMinimap(world, w - MINIMAP.w - MINIMAP.margin, MINIMAP.margin);
    // Bottom-left: mission objective + dialogue.
    const m = world.missions;
    const mission = currentMission(m);
    if (m.active && mission) {
      const step = currentStep(m);
      panel(14, h - 118, 470, 104);
      text(`MISSION ${m.index + 1}: ${mission.title}`, 28, h - 88, 15, PALETTE.gold, 'left', 'bold ');
      if (step) text(`► ${step.text}`, 28, h - 62, 15, PALETTE.text, 'left');
      if (m.message && m.messageTimer > 0) {
        text(m.message, 28, h - 36, 13, PALETTE.muted, 'left');
      }
    } else if (m.message && m.messageTimer > 0) {
      panel(14, h - 78, 470, 64);
      text(m.message, 28, h - 44, 14, PALETTE.text, 'left');
    }
    // Bottom-right: controls.
    text('WASD move/drive · E jack car · Click shoot · Space punch · Shift sprint · P pause · M mute', w - 16, h - 18, 12, 'rgba(255,247,230,0.75)', 'right');
    // Centre banner.
    if (m.banner && m.bannerTimer > 0) {
      context.globalAlpha = Math.min(1, m.bannerTimer);
      panel(cx - 260, 152, 520, 56);
      text(m.banner, cx, 188, 20, PALETTE.gold, 'center', 'bold ');
      context.globalAlpha = 1;
    }
    // Off-screen mission arrow at the screen edge.
    const target = world.missionTarget;
    if (target && m.active) {
      const sx = (target.x - camera.x) * camera.zoom + w / 2;
      const sy = (target.y - camera.y) * camera.zoom + h / 2;
      if (sx < 0 || sx > w || sy < 0 || sy > h) {
        const dx = target.x - world.player.x;
        const dy = target.y - world.player.y;
        const ang = Math.atan2(dy, dx);
        const ex = cx + Math.cos(ang) * 180;
        const ey = h / 2 + Math.sin(ang) * 160;
        context.save();
        context.translate(ex, ey);
        context.rotate(ang);
        context.fillStyle = PALETTE.gold;
        context.beginPath();
        context.moveTo(16, 0);
        context.lineTo(-10, -10);
        context.lineTo(-10, 10);
        context.closePath();
        context.fill();
        context.restore();
        text(`${Math.round(Math.hypot(dx, dy))}m`, ex, ey + 30, 13, PALETTE.gold, 'center', 'bold ');
      }
    }
  }

  function drawMinimap(world, x, y) {
    const scaleX = MINIMAP.w / WORLD.width;
    const scaleY = MINIMAP.h / WORLD.height;
    panel(x - 6, y - 6, MINIMAP.w + 12, MINIMAP.h + 12);
    context.save();
    context.beginPath();
    context.rect(x, y, MINIMAP.w, MINIMAP.h);
    context.clip();
    context.fillStyle = '#2f3a2e';
    context.fillRect(x, y, MINIMAP.w, MINIMAP.h);
    context.fillStyle = '#2f7fa8';
    context.fillRect(x, y + WORLD.waterY * scaleY, MINIMAP.w, MINIMAP.h - WORLD.waterY * scaleY);
    context.strokeStyle = '#8a8378';
    context.lineWidth = 2;
    for (const a of ROADS.avenues) {
      context.beginPath();
      context.moveTo(x + a * scaleX, y);
      context.lineTo(x + a * scaleX, y + WORLD.waterY * scaleY);
      context.stroke();
    }
    for (const s of ROADS.streets) {
      context.beginPath();
      context.moveTo(x, y + s * scaleY);
      context.lineTo(x + WORLD.width * scaleX, y + s * scaleY);
      context.stroke();
    }
    const target = world.missionTarget;
    if (target && world.missions.active) {
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(x + target.x * scaleX, y + target.y * scaleY, 5, 0, Math.PI * 2);
      context.fill();
    }
    if (world.missions.tail) {
      context.fillStyle = '#b57edc';
      context.beginPath();
      context.arc(x + world.missions.tail.x * scaleX, y + world.missions.tail.y * scaleY, 4, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = '#ff3b30';
    for (const car of world.police.cars) {
      context.beginPath();
      context.arc(x + car.x * scaleX, y + car.y * scaleY, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    for (const cop of world.police.foot) {
      context.beginPath();
      context.arc(x + cop.x * scaleX, y + cop.y * scaleY, 3, 0, Math.PI * 2);
      context.fill();
    }
    const p = world.player;
    context.save();
    context.translate(x + p.x * scaleX, y + p.y * scaleY);
    context.rotate(p.angle);
    context.fillStyle = '#fff';
    context.beginPath();
    context.moveTo(7, 0);
    context.lineTo(-5, -5);
    context.lineTo(-5, 5);
    context.closePath();
    context.fill();
    context.restore();
    context.restore();
    text('SOLANO BAY', x + MINIMAP.w / 2, y + MINIMAP.h + 26, 11, PALETTE.muted, 'center', 'bold ');
  }

  function drawTitlePanel(world, best) {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    context.fillStyle = 'rgba(20, 12, 8, 0.45)';
    context.fillRect(0, 0, w, h);
    panel(w / 2 - 330, h / 2 - 210, 660, 420);
    text('SOLANO BAY', w / 2, h / 2 - 130, 54, PALETTE.gold, 'center', 'bold ');
    text('A sun-soaked harbour city. One rule: stay cold.', w / 2, h / 2 - 92, 17, PALETTE.text, 'center');
    text('Heat cools ONLY when no cop can see you.', w / 2, h / 2 - 62, 17, '#8fd6a0', 'center', 'bold ');
    text('Break line of sight. Duck behind buildings.', w / 2, h / 2 - 36, 15, PALETTE.muted, 'center');
    text('Or blend into a crowd and vanish.', w / 2, h / 2 - 12, 15, PALETTE.muted, 'center');
    text('WASD move / drive · E jack a car · Click shoot · Space punch', w / 2, h / 2 + 30, 15, PALETTE.text, 'center');
    text('Shift sprint · P pause · M mute · progress saves automatically', w / 2, h / 2 + 56, 15, PALETTE.text, 'center');
    if (best && best.completed > 0) {
      text(`Saved: $${best.cash} · ${best.completed} mission${best.completed === 1 ? '' : 's'} done — press Enter to continue`, w / 2, h / 2 + 92, 15, PALETTE.gold, 'center');
    }
    text('Press Enter or click to start', w / 2, h / 2 + 132, 19, PALETTE.gold, 'center', 'bold ');
    text('5 story missions · traffic & crowds · police vision cones · Cold Trail heat', w / 2, h / 2 + 168, 13, PALETTE.muted, 'center');
  }

  function drawOverlayPanel(title, lines, prompt) {
    const w = canvas.width / (window.devicePixelRatio || 1);
    const h = canvas.height / (window.devicePixelRatio || 1);
    context.fillStyle = 'rgba(20, 12, 8, 0.55)';
    context.fillRect(0, 0, w, h);
    panel(w / 2 - 300, h / 2 - 130, 600, 260);
    text(title, w / 2, h / 2 - 60, 40, PALETTE.gold, 'center', 'bold ');
    lines.forEach((line, i) => text(line, w / 2, h / 2 - 10 + i * 28, 16, PALETTE.text, 'center'));
    text(prompt, w / 2, h / 2 + 92, 17, PALETTE.gold, 'center', 'bold ');
  }

  /** Paint one frame. `screen` is one of the SCREEN_* constants. */
  function draw(world, screen, saveInfo) {
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.width / ratio;
    const h = canvas.height / ratio;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.fillStyle = '#1a1210';
    context.fillRect(0, 0, w, h);
    // Camera follows the player.
    camera.zoom = Math.max(0.62, Math.min(1.15, Math.min(w / 1150, h / 780)));
    camera.x = world.player.x;
    camera.y = world.player.y;
    const viewW = w / camera.zoom;
    const viewH = h / camera.zoom;
    camera.x = Math.max(viewW / 2 - 100, Math.min(WORLD.width - viewW / 2 + 100, camera.x));
    camera.y = Math.max(viewH / 2 - 100, Math.min(WORLD.height - viewH / 2 + 100, camera.y));
    context.save();
    context.translate(w / 2, h / 2);
    context.scale(camera.zoom, camera.zoom);
    context.translate(-camera.x, -camera.y);
    drawGround(world);
    drawBuildings(world);
    drawEntities(world);
    context.restore();
    if (screen === SCREEN_TITLE) {
      drawTitlePanel(world, saveInfo);
      return;
    }
    drawHud(world);
    if (screen === SCREEN_PAUSED) {
      drawOverlayPanel('PAUSED', ['The city waits. The heat does not cool while paused —', 'it waits with you.'], 'Press P or Enter to resume');
    } else if (screen === SCREEN_BUSTED) {
      drawOverlayPanel('BUSTED', [`The harbour police caught you with $${world.player.cash} in your pocket.`, 'Your cash stays. The mission restarts.'], 'Press Enter to try again');
    } else if (screen === SCREEN_WASTED) {
      drawOverlayPanel('WASTED', ['Solano Bay is not done with you yet.', 'Your cash stays. The mission restarts.'], 'Press Enter to try again');
    } else if (screen === SCREEN_COMPLETE) {
      drawOverlayPanel('SOLANO BAY IS YOURS', ['All five missions complete. The sunset is yours.', `Final take: $${world.player.cash}. Free roam continues.`], 'Press Enter to keep playing');
    }
  }

  function screenToWorld(sx, sy) {
    const ratio = window.devicePixelRatio || 1;
    const w = canvas.width / ratio;
    const h = canvas.height / ratio;
    return {
      x: (sx - w / 2) / camera.zoom + camera.x,
      y: (sy - h / 2) / camera.zoom + camera.y,
    };
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, screenToWorld, camera };
}
