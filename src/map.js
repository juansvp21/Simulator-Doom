// =============================================================
// map.js — El mundo es una cuadrícula. Cada número es una casilla:
//   0 = vacío (se puede caminar)
//   1 = roca volcánica · 2 = ladrillo infernal · 3 = muro de calaveras
//   4 = hierro rúnico   · 5 = lava (animada, brilla)
// mapa[y][x]: la fila es Y (hacia abajo), la columna es X (hacia la derecha).
// =============================================================

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
  ],
};

export function createMap(grid) {
  return {
    grid,
    width: grid[0].length,
    height: grid.length,
  };
}

// Construye un nivel jugable: el mapa + los sprites con sus propiedades
// (solid, radius) copiadas desde config.js.
export function createLevel(def, cfg) {
  return {
    map: createMap(def.grid),
    sprites: def.sprites.map((s) => ({ ...cfg.sprites[s.type], ...s })),
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
