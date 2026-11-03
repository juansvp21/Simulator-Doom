// =============================================================
// map.js — El mundo es una cuadrícula. Cada número es una casilla:
//   0 = vacío (se puede caminar)
//   1 = roca volcánica · 2 = ladrillo infernal · 3 = muro de calaveras
//   4 = hierro rúnico   · 5 = lava (animada, brilla)
// mapa[y][x]: la fila es Y (hacia abajo), la columna es X (hacia la derecha).
// =============================================================

import { createEnemy } from './enemies.js';

export const TEST_LEVEL = {
  grid: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,0,2,2,0,0,0,0,0,0,3,3,0,0,1],
    [1,0,0,2,0,0,0,1,0,0,0,0,3,0,0,1],
    [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,5,1,1,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,4,0,4,0,4,0,0,4,0,4,0,4,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,5,0,0,0,0,0,0,1],
    [1,0,3,3,3,0,0,0,5,0,0,1,1,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  // Decoración: x, y en casillas (.5 = centro de la casilla)
  sprites: [
    { type: 'brasero', x: 5.5, y: 1.5 },
    { type: 'estaca', x: 5.5, y: 4.5 },
    { type: 'brasero', x: 14.5, y: 1.5 },
    { type: 'cristal', x: 10.5, y: 2.5 },
    { type: 'brasero', x: 1.5, y: 7.5 },
    { type: 'brasero', x: 14.5, y: 7.5 },
    { type: 'cristal', x: 7.5, y: 9.5 },
    { type: 'cristal', x: 8.5, y: 9.5 },
    { type: 'estaca', x: 3.5, y: 10.5 },
    { type: 'estaca', x: 14.5, y: 10.5 },
    { type: 'brasero', x: 1.5, y: 12.5 },
    { type: 'estaca', x: 6.5, y: 14.5 },
    { type: 'cristal', x: 14.5, y: 14.5 },
    // Armas y munición para recoger (en la Fase 6 se comprarán en la tienda)
    { type: 'arma_escopeta', x: 1.5, y: 4.5 },
    { type: 'arma_ametralladora', x: 8.5, y: 7.5 },
    { type: 'arma_lanzacohetes', x: 5.5, y: 13.5 },
    { type: 'arma_especial', x: 13.5, y: 2.5 },
    { type: 'caja_municion', x: 1.5, y: 10.5 },
    { type: 'caja_municion', x: 10.5, y: 12.5 },
    { type: 'caja_municion', x: 9.5, y: 3.5 },
  ],
  // Enemigos: zombie = Condenado, zombieRapido = Poseído, demonio = Demonio ígneo
  enemies: [
    { type: 'zombie', x: 9.5, y: 1.5 },
    { type: 'demonio', x: 12.5, y: 4.5 },
    { type: 'zombie', x: 5.5, y: 8.5 },
    { type: 'zombie', x: 11.5, y: 7.5 },
    { type: 'zombieRapido', x: 12.5, y: 8.5 },
    { type: 'zombieRapido', x: 3.5, y: 12.5 },
    { type: 'zombieRapido', x: 13.5, y: 13.5 },
    { type: 'demonio', x: 10.5, y: 14.5 },
  ],
};

export function createMap(grid) {
  return {
    grid,
    width: grid[0].length,
    height: grid.length,
  };
}

// Construye un nivel jugable: el mapa, los sprites con sus propiedades
// (solid, radius) copiadas desde config.js, los enemigos y los proyectiles.
export function createLevel(def, cfg) {
  return {
    map: createMap(def.grid),
    sprites: def.sprites.map((s) => ({ ...cfg.sprites[s.type], ...s })),
    enemies: (def.enemies ?? []).map((e) => createEnemy(e.type, e.x, e.y, cfg)),
    projectiles: [],
  };
}

// Devuelve el número de la casilla que contiene el punto (x, y).
// Fuera del mapa se considera pared, así nada se escapa del mundo.
export function getTile(map, x, y) {
  const cx = Math.floor(x);
  const cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= map.width || cy >= map.height) return 1;
  return map.grid[cy][cx];
}

export function isWall(map, x, y) {
  return getTile(map, x, y) !== 0;
}

// -------------------------------------------------------------
// castRay: lanza UN rayo desde (x, y) en la dirección (dx, dy) y devuelve
// dónde choca con una pared. Es el mismo DDA del raycaster, pero aquí la
// dirección SÍ está normalizada (longitud 1), así que las distancias que
// salen son distancias reales en casillas.
// Se usa para el disparo (hitscan) y en la Fase 4 para la línea de visión.
// -------------------------------------------------------------
export function castRay(map, x, y, dx, dy, maxDist = 64) {
  let mapX = Math.floor(x);
  let mapY = Math.floor(y);
  const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const deltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  const stepX = dx < 0 ? -1 : 1;
  const stepY = dy < 0 ? -1 : 1;
  let sideX = (dx < 0 ? x - mapX : mapX + 1 - x) * deltaX;
  let sideY = (dy < 0 ? y - mapY : mapY + 1 - y) * deltaY;

  while (true) {
    let dist;
    if (sideX < sideY) { dist = sideX; sideX += deltaX; mapX += stepX; }
    else               { dist = sideY; sideY += deltaY; mapY += stepY; }
    if (dist > maxDist) return { hit: false, dist: maxDist };
    const tile = getTile(map, mapX, mapY);
    if (tile !== 0) {
      return { hit: true, dist, x: x + dx * dist, y: y + dy * dist, tile };
    }
  }
}
