// =============================================================
// raycaster.js — Dibuja el mundo 3D a partir del mapa 2D.
//
// IDEA GENERAL
// La pantalla tiene W columnas. Por cada columna lanzamos UN rayo desde
// el jugador. El rayo avanza por la cuadrícula hasta chocar con una pared.
// Cuanto más lejos esté la pared, más baja dibujamos su columna.
// Eso es todo: W rayos -> W líneas verticales -> ilusión de 3D.
// =============================================================

import { getTile } from './map.js';

// Pre-calculamos los colores CSS de cada pared (normal y sombreada)
// para no crear strings nuevos 640 veces por frame.
function buildPalette(cfg) {
  const rgb = ([r, g, b], k = 1) =>
    `rgb(${Math.round(r * k)}, ${Math.round(g * k)}, ${Math.round(b * k)})`;
  const walls = {};
  for (const [id, color] of Object.entries(cfg.colors.walls)) {
    walls[id] = { light: rgb(color), dark: rgb(color, cfg.colors.sideShade) };
  }
  return { walls, ceiling: rgb(cfg.colors.ceiling), floor: rgb(cfg.colors.floor) };
}

let palette = null;

export function renderScene(ctx, player, map, cfg) {
  if (!palette) palette = buildPalette(cfg);
  const W = cfg.render.width;
  const H = cfg.render.height;

  // Techo (mitad superior) y suelo (mitad inferior) de color liso.
  ctx.fillStyle = palette.ceiling;
  ctx.fillRect(0, 0, W, H / 2);
  ctx.fillStyle = palette.floor;
  ctx.fillRect(0, H / 2, W, H / 2);

  for (let x = 0; x < W; x++) {
    // ---------------------------------------------------------
    // 1) DIRECCIÓN DEL RAYO
    // cameraX va de -1 (borde izquierdo) a +1 (borde derecho).
    // rayDir = dir + plane * cameraX  -> un punto sobre el "plano de cámara".
    // Ojo: rayDir NO está normalizado, y eso es a propósito (ver paso 4).
    // ---------------------------------------------------------
    const cameraX = (2 * x) / W - 1;
    const rayDirX = player.dirX + player.planeX * cameraX;
    const rayDirY = player.dirY + player.planeY * cameraX;

    // Casilla en la que está el jugador
    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    // ---------------------------------------------------------
    // 2) DDA (Digital Differential Analyzer)
    // En vez de avanzar el rayo a pasitos fijos (lento e impreciso),
    // saltamos directamente de una línea de la cuadrícula a la siguiente.
    //
    // deltaDistX = cuánto "rayo" hay que recorrer para cruzar UNA casilla
    // completa en X. Por triángulos semejantes: |rayDir| / |rayDirX|.
    // Como usamos rayDir sin normalizar, medimos en unidades de |rayDir|,
    // así que queda simplemente |1 / rayDirX|.
    // Si rayDirX = 0 el rayo nunca cruza líneas verticales -> Infinity.
    // ---------------------------------------------------------
    const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY);

    // step = hacia dónde avanzamos en la cuadrícula (+1 o -1).
    // sideDist = distancia (en el rayo) desde el jugador hasta la PRIMERA
    // línea vertical (X) u horizontal (Y). El jugador no está en el borde de
    // su casilla, así que es una fracción de deltaDist.
    let stepX, stepY, sideDistX, sideDistY;
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - player.x) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - player.y) * deltaDistY;
    }

    // ---------------------------------------------------------
    // 3) AVANZAR HASTA CHOCAR
    // En cada paso elegimos la línea más cercana (X o Y), saltamos a esa
    // casilla y miramos si es pared.
    // side = 0 -> chocamos con una cara vertical (este/oeste)
    // side = 1 -> chocamos con una cara horizontal (norte/sur)
    // ---------------------------------------------------------
    let side = 0;
    let tile = 0;
    for (let i = 0; i < cfg.render.maxRaySteps; i++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      tile = getTile(map, mapX, mapY);
      if (tile !== 0) break;
    }
    if (tile === 0) continue; // no chocó con nada (no debería pasar en un mapa cerrado)

    // ---------------------------------------------------------
    // 4) DISTANCIA PERPENDICULAR (evita el efecto "ojo de pez")
    // Si usáramos la distancia real (euclidiana) del rayo, los rayos de
    // los bordes son más largos y una pared recta se vería curvada.
    // Lo que queremos es la distancia medida en la dirección de la cámara
    // (perpendicular al plano de cámara).
    //
    // Truco: como rayDir = dir + plane*cameraX y |dir| = 1, la componente
    // de rayDir en la dirección de la cámara vale SIEMPRE 1. Por eso, medir
    // en unidades de rayDir YA ES la distancia perpendicular.
    // Al salir del bucle, sideDist se pasó un deltaDist de más -> lo restamos.
    // ---------------------------------------------------------
    const perpDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;

    // ---------------------------------------------------------
    // 5) ALTURA DE LA COLUMNA
    // Proyección en perspectiva: altura en pantalla = H / distancia.
    // Una pared a distancia 1 ocupa toda la pantalla; a distancia 2, la mitad.
    // ---------------------------------------------------------
    const lineHeight = H / perpDist;
    const top = Math.max(0, (H - lineHeight) / 2);
    const height = Math.min(H, lineHeight);

    // Caras norte/sur más oscuras: imita una luz lateral y da volumen.
    const colors = palette.walls[tile] ?? palette.walls[1];
    ctx.fillStyle = side === 1 ? colors.dark : colors.light;
    ctx.fillRect(x, top, 1, height);
  }
}
