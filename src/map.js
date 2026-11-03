// =============================================================
// map.js — El mundo es una cuadrícula. Cada número es una casilla:
//   0 = vacío (se puede caminar)
//   1..4 = pared (el número elige el color en config.js)
// mapa[y][x]: la fila es Y (hacia abajo), la columna es X (hacia la derecha).
// =============================================================

export const TEST_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,0,3,3,0,0,1],
  [1,0,0,2,0,0,0,1,0,0,0,0,3,0,0,1],
  [1,0,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,4,0,4,0,4,0,0,4,0,4,0,4,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,0,0,2,0,0,0,0,0,0,1],
  [1,0,3,3,3,0,0,0,2,0,0,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

export function createMap(grid) {
  return {
    grid,
    width: grid[0].length,
    height: grid.length,
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
