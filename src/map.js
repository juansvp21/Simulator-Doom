// =============================================================
// map.js — El mundo es una cuadrícula. Cada número es una casilla
// (los niveles se escriben como texto en levels.js y se convierten aquí):
//   0 = vacío (se puede caminar)
//   1 = roca volcánica · 2 = ladrillo infernal · 3 = muro de calaveras
//   4 = hierro rúnico   · 5 = lava (animada, brilla)
// mapa[y][x]: la fila es Y (hacia abajo), la columna es X (hacia la derecha).
// =============================================================

import { createEnemy } from './enemies.js';

export function createMap(grid) {
  return {
    grid,
    width: grid[0].length,
    height: grid.length,
  };
}

// Construye un nivel jugable a partir de un nivel ya parseado (levels.js):
// el mapa, los sprites con sus propiedades (solid, radius, pickup...)
// copiadas desde config.js, los enemigos y los proyectiles.
// levelIndex (0, 1, 2...) sube la dificultad de los enemigos en cada círculo.
export function createLevel(def, cfg, levelIndex = 0) {
  return {
    name: def.name,
    fog: def.fog,
    ambient: def.ambient,
    start: def.start,
    bossSpawn: def.bossSpawn,
    map: createMap(def.grid),
    sprites: def.sprites.map((s) => ({ ...cfg.sprites[s.type], ...s })),
    enemies: def.enemies.map((e) => createEnemy(e.type, e.x, e.y, cfg, levelIndex)),
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
