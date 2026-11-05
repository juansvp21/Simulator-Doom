// =============================================================
// player.js — Posición, orientación, movimiento y colisiones.
//
// Coordenadas: x crece hacia la derecha (este), y crece hacia abajo (sur),
// igual que las filas del mapa. Por eso un ángulo POSITIVO gira a la DERECHA.
// =============================================================

import { isDown, consumeMouseDX } from './input.js';
import { isWall } from './map.js';

export function createPlayer(cfg) {
  const p = {
    x: cfg.player.startX,
    y: cfg.player.startY,
    angle: cfg.player.startAngle,
    radius: cfg.player.radius, // tamaño para colisiones (paredes, enemigos, proyectiles)
    // Vectores derivados del ángulo (se recalculan en updateVectors)
    dirX: 0, dirY: 0,       // hacia dónde mira (longitud 1)
    planeX: 0, planeY: 0,   // plano de cámara (perpendicular a dir)
    health: cfg.player.startHealth,
    armor: cfg.player.startArmor,
    money: cfg.player.startMoney,
    stats: { shots: 0, hits: 0, kills: 0, coins: 0, time: 0 }, // estadísticas del nivel actual
    hurtT: 0,               // > 0 mientras se ve el destello rojo de daño
    dead: false,
    walkPhase: 0,           // avanza al caminar -> balanceo del arma
    moving: false,
  };
  updateVectors(p, cfg);
  return p;
}

// El raycaster necesita dos vectores:
//  - dir:   el centro de la vista.
//  - plane: la "pantalla" imaginaria, perpendicular a dir. Va del borde
//           izquierdo (-plane) al derecho (+plane).
// Su longitud define el FOV: tan(FOV/2) = |plane| / |dir|.
// Con |dir| = 1  ->  |plane| = tan(FOV/2). Para 66° eso es ≈ 0.66.
function updateVectors(p, cfg) {
  p.dirX = Math.cos(p.angle);
  p.dirY = Math.sin(p.angle);
  const planeLen = Math.tan((cfg.render.fov * Math.PI / 180) / 2);
  // Vector a la derecha de dir (con y hacia abajo): (-dirY, dirX)
  p.planeX = -p.dirY * planeLen;
  p.planeY = p.dirX * planeLen;
}

// ¿Cabe el jugador en (x, y)?
// - Paredes: tratamos al jugador como un cuadrado de lado 2*radio y miramos
//   sus 4 esquinas. Funciona porque radio < 0.5 y cada paso es pequeño
//   (el delta time está limitado en config.js).
// - Sprites sólidos: círculo contra círculo. Chocan si la distancia entre
//   centros es menor que la suma de los radios.
function canStand(level, x, y, r) {
  const map = level.map;
  if (isWall(map, x - r, y - r) || isWall(map, x + r, y - r) ||
      isWall(map, x - r, y + r) || isWall(map, x + r, y + r)) return false;
  for (const s of level.sprites) {
    if (s.solid && Math.hypot(x - s.x, y - s.y) < r + s.radius) return false;
  }
  // Los enemigos vivos también bloquean (los muertos no: e.solid = false)
  for (const e of level.enemies) {
    if (e.solid && Math.hypot(x - e.x, y - e.y) < r + e.radius) return false;
  }
  return true;
}

export function updatePlayer(p, level, dt, cfg) {
  const c = cfg.player;

  // --- Rotación: ratón + flechas izquierda/derecha ---
  let turn = consumeMouseDX() * c.mouseSensitivity;
  if (isDown('ArrowLeft')) turn -= c.turnSpeed * dt;
  if (isDown('ArrowRight')) turn += c.turnSpeed * dt;
  if (turn !== 0) {
    p.angle = (p.angle + turn) % (Math.PI * 2);
    updateVectors(p, cfg);
  }

  // --- Dirección deseada: adelante/atrás y lateral (strafe) ---
  let forward = 0, strafe = 0;
  if (isDown('KeyW') || isDown('ArrowUp')) forward += 1;
  if (isDown('KeyS') || isDown('ArrowDown')) forward -= 1;
  if (isDown('KeyD')) strafe += 1;
  if (isDown('KeyA')) strafe -= 1;
  p.moving = forward !== 0 || strafe !== 0;
  if (!p.moving) return;
  p.walkPhase += dt * cfg.fx.bobSpeed;

  // Combinamos: dir * forward + derecha * strafe. Derecha = (-dirY, dirX).
  let mx = p.dirX * forward - p.dirY * strafe;
  let my = p.dirY * forward + p.dirX * strafe;
  // Normalizamos para que en diagonal (W+D) no se vaya más rápido (√2 veces)
  const len = Math.hypot(mx, my);
  mx /= len; my /= len;

  const dx = mx * c.moveSpeed * dt;
  const dy = my * c.moveSpeed * dt;

  // --- Colisión eje por eje ---
  // Probamos X y Y por separado. Si chocas de frente contra una pared en
  // diagonal, el eje bloqueado se anula pero el otro sigue: te "deslizas".
  if (canStand(level, p.x + dx, p.y, p.radius)) p.x += dx;
  if (canStand(level, p.x, p.y + dy, p.radius)) p.y += dy;
}

// Coloca al jugador en el punto de inicio del nivel (start) SIN tocar lo que conserva
// entre niveles (oro, vida, armadura). Las estadísticas sí empiezan de cero.
export function resetPlayerForLevel(p, cfg, start) {
  p.x = start?.x ?? cfg.player.startX;
  p.y = start?.y ?? cfg.player.startY;
  p.angle = start?.angle ?? cfg.player.startAngle;
  updateVectors(p, cfg);
  p.stats = { shots: 0, hits: 0, kills: 0, coins: 0, time: 0 };
  p.hurtT = 0;
  p.dead = false;
  p.moving = false;
}
