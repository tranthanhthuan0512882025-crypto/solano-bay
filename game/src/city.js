// Solano Bay's city: a seeded grid of avenues and streets around a harbour.
// Builds the building rectangles (collision + line of sight), parks, the market,
// the marina, the lighthouse and the named mission landmarks.

import { ROADS, WORLD } from './config.js';

export const LANDMARKS = {
  marina: { x: 800, y: 2160, name: 'Marina Pier' },
  cafe: { x: 1350, y: 740, name: 'Café Solano' },
  docks: { x: 2900, y: 2120, name: 'South Docks' },
  warehouse: { x: 3250, y: 1560, name: 'Warehouse 9' },
  market: { x: 1300, y: 1500, name: 'Mercado Square' },
  lighthouse: { x: 350, y: 2240, name: 'Old Lighthouse' },
  downtown: { x: 1800, y: 1100, name: 'Downtown' },
  plaza: { x: 1800, y: 700, name: 'Solano Plaza' },
  gunshop: { x: 2350, y: 1140, name: 'Ammo & Tackle' },
};

function roadRects() {
  const rects = [];
  for (const x of ROADS.avenues) rects.push({ x: x - ROADS.width / 2, y: 0, w: ROADS.width, h: WORLD.waterY, vertical: true });
  for (const y of ROADS.streets) rects.push({ x: 0, y: y - ROADS.width / 2, w: WORLD.width, h: ROADS.width, vertical: false });
  return rects;
}

function onRoad(x, y, margin) {
  for (const ax of ROADS.avenues) if (Math.abs(x - ax) < ROADS.width / 2 + margin) return true;
  for (const sy of ROADS.streets) if (Math.abs(y - sy) < ROADS.width / 2 + margin) return true;
  return false;
}

/** True when the point is inside any building rectangle. */
export function pointInBuilding(city, x, y) {
  for (const b of city.buildings) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return true;
  }
  return false;
}

/** True when the segment is blocked by a building (line of sight). */
export function losBlocked(city, x1, y1, x2, y2) {
  for (const b of city.buildings) {
    if (segmentHitsRect(x1, y1, x2, y2, b)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  for (const [p, q] of [[-dx, x1 - r.x], [dx, r.x + r.w - x1], [-dy, y1 - r.y], [dy, r.y + r.h - y1]]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) tmin = Math.max(tmin, t);
      else tmax = Math.min(tmax, t);
      if (tmin > tmax) return false;
    }
  }
  return true;
}

/** True when an observer at (ox, oy) facing `angle` can see (tx, ty): inside the
 * vision cone (or very close) with a clear line of sight through buildings. */
export function seesTarget(ox, oy, angle, tx, ty, city, range, halfAngle) {
  const dx = tx - ox;
  const dy = ty - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist > 70) {
    let diff = Math.atan2(dy, dx) - angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) > halfAngle) return false;
  }
  return !losBlocked(city, ox, oy, tx, ty);
}

/** Resolve a circle (x, y, r) out of buildings; returns the corrected position. */
export function collideBuildings(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      } else {
        // Centre inside the rectangle: push out along the smallest penetration.
        const left = x - b.x;
        const right = b.x + b.w - x;
        const top = y - b.y;
        const bottom = b.y + b.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = b.x - r;
        else if (m === right) x = b.x + b.w + r;
        else if (m === top) y = b.y - r;
        else y = b.y + b.h + r;
      }
    }
  }
  return { x, y };
}

export function createCity(random) {
  const buildings = [];
  const trees = [];
  const parks = [
    { x: 950, y: 850, w: 300, h: 200 },
    { x: 1950, y: 1250, w: 300, h: 200 },
  ];
  const market = { x: 1150, y: 1350, w: 300, h: 300 };

  // Buildings fill every block between roads, skipping parks, the market and
  // the plaza; downtown blocks get taller (drawn taller) footprints.
  const xs = [0, ...ROADS.avenues.map((a) => a + ROADS.width / 2), WORLD.width];
  const ys = [0, ...ROADS.streets.map((s) => s + ROADS.width / 2), WORLD.waterY];
  const xStarts = [0, ...ROADS.avenues.map((a) => a - ROADS.width / 2)];
  const yStarts = [0, ...ROADS.streets.map((s) => s - ROADS.width / 2)];
  for (let i = 0; i < xStarts.length; i += 1) {
    for (let j = 0; j < yStarts.length; j += 1) {
      const bx = xStarts[i];
      const by = yStarts[j];
      const bw = xs[i + 1] - bx;
      const bh = ys[j + 1] - by;
      if (bw < 120 || bh < 120) continue;
      const cx = bx + bw / 2;
      const cy = by + bh / 2;
      if (parks.some((p) => cx > p.x && cx < p.x + p.w && cy > p.y && cy < p.y + p.h)) continue;
      if (cx > market.x && cx < market.x + market.w && cy > market.y && cy < market.y + market.h) continue;
      if (Math.abs(cx - LANDMARKS.plaza.x) < 260 && Math.abs(cy - LANDMARKS.plaza.y) < 260) continue;
      if (Math.abs(cx - LANDMARKS.warehouse.x) < 320 && Math.abs(cy - LANDMARKS.warehouse.y) < 320) continue;
      // Split a block into 1-3 buildings with gaps.
      const n = random.int(1, 3);
      for (let k = 0; k < n; k += 1) {
        const w = random.range(bw * 0.24, bw * 0.42);
        const h = random.range(bh * 0.3, bh * 0.55);
        const x = bx + 24 + random.range(0, Math.max(1, bw - w - 48));
        const y = by + 24 + random.range(0, Math.max(1, bh - h - 48));
        const downtown = Math.abs(x - 1800) < 700 && Math.abs(y - 1100) < 500;
        buildings.push({
          x, y, w, h,
          color: random.pick(['#b5543f', '#c97b4a', '#8a6f5c', '#5d7a8c', '#a85f6b', '#7c8a5a']),
          tall: downtown && random.chance(0.6),
          roof: random.pick(['#d8c9a8', '#e8e0cc', '#c9b896']),
        });
      }
    }
  }

  // Trees line the parks and the beach promenade.
  for (const p of parks) {
    for (let i = 0; i < 14; i += 1) {
      trees.push({ x: p.x + random.range(20, p.w - 20), y: p.y + random.range(20, p.h - 20), r: random.range(10, 16) });
    }
  }
  for (let x = 120; x < WORLD.width; x += 130) {
    trees.push({ x: x + random.range(-20, 20), y: WORLD.beachY - 60 + random.range(-14, 14), r: random.range(9, 14) });
  }

  // Parked cars along the avenues.
  const parked = [];
  for (let i = 0; i < 16; i += 1) {
    const avenue = random.pick(ROADS.avenues);
    const street = random.pick(ROADS.streets);
    const along = random.chance(0.5);
    parked.push({
      x: along ? avenue + (random.chance(0.5) ? -34 : 34) : random.range(200, WORLD.width - 200),
      y: along ? random.range(200, WORLD.waterY - 200) : street + (random.chance(0.5) ? -34 : 34),
      angle: along ? Math.PI / 2 : 0,
      color: random.pick(['#c94f43', '#4a7fb5', '#d8c25a', '#7a7f85', '#5aa37a', '#e8e4da']),
      taken: false,
    });
  }

  // Boats moored at the marina piers.
  const boats = [];
  for (let i = 0; i < 7; i += 1) {
    boats.push({ x: 620 + i * 90, y: 2330 + (i % 2) * 60, angle: Math.PI / 2 + random.range(-0.2, 0.2), color: random.pick(['#e8e4da', '#4a7fb5', '#c94f43']) });
  }

  return {
    buildings, trees, parks, market, parked, boats,
    roads: roadRects(),
    onRoad,
    spawn: { x: 800, y: 2050 },
  };
}
