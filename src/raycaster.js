// =============================================================
// raycaster.js — Dibuja el mundo 3D a partir del mapa 2D.
//
// IDEA GENERAL
// La pantalla tiene W columnas. Por cada columna lanzamos UN rayo desde
// el jugador. El rayo avanza por la cuadrícula hasta chocar con una pared.
// Cuanto más lejos esté la pared, más baja dibujamos su columna.
//
// Orden de dibujo en cada frame:
//   1) Suelo y techo  (floor casting, fila por fila)
//   2) Paredes        (un rayo por columna, guardando la distancia en el z-buffer)
//   3) Sprites        (de lejos a cerca, recortados con el z-buffer)
//
// Escribimos los píxeles en un buffer propio (ImageData) y al final lo
// copiamos al canvas de una vez: mucho más rápido que miles de fillRect.
// =============================================================

import { getTile } from './map.js';
import { TEX } from './textures.js';

export function createRenderer(ctx, cfg, assets) {
  const W = cfg.render.width;
  const H = cfg.render.height;
  const image = ctx.createImageData(W, H);
  return {
    ctx, cfg, assets, W, H, image,
    // Vista de 32 bits sobre los mismos bytes: 1 escritura = 1 píxel completo.
    // En equipos little-endian (prácticamente todos) el orden es 0xAABBGGRR.
    buf: new Uint32Array(image.data.buffer),
    // z-buffer: distancia de la pared en cada columna (para tapar sprites)
    zBuffer: new Float32Array(W),
  };
}

// ---------------------------------------------------------
// NIEBLA Y LUZ
// brillo = e^(-distancia * densidad): 1 al lado del jugador, ~0 a lo lejos.
// El color final mezcla el color de la textura con el color de la niebla:
//   final = textura * brillo + niebla * (1 - brillo)
// ---------------------------------------------------------
function makeShader(cfg) {
  const [fr, fg, fb] = cfg.fog.color;
  const density = cfg.fog.density;
  return {
    brightness: (dist) => Math.exp(-dist * density),
    // Escribe en buf[i] el texel ti de la textura data, con brillo k.
    put(buf, i, data, ti, k) {
      const inv = 1 - k;
      buf[i] =
        0xff000000 |
        ((data[ti + 2] * k + fb * inv) << 16) |
        ((data[ti + 1] * k + fg * inv) << 8) |
        (data[ti] * k + fr * inv);
    },
  };
}

export function renderScene(r, player, level, time) {
  const { W, H, buf, zBuffer, assets, cfg } = r;
  const shader = r.shader ?? (r.shader = makeShader(cfg));
  const half = H / 2;
  const { x: px, y: py, dirX, dirY, planeX, planeY } = player;
  const MASK = TEX - 1;

  // =========================================================
  // 1) SUELO Y TECHO (floor casting)
  // Para una fila de pantalla debajo del horizonte, todos sus píxeles
  // están a la MISMA distancia del jugador. Por semejanza de triángulos:
  //   distanciaFila = (altura de la cámara) / (píxeles bajo el horizonte)
  // La cámara está a media altura (H/2), así que: rowDist = (H/2) / p.
  // Luego recorremos la fila de izquierda a derecha sumando un paso fijo
  // en el mundo (interpolamos entre el rayo del borde izquierdo y el derecho).
  // El techo es el mismo cálculo reflejado (fila H-1-y).
  // =========================================================
  const floorTex = assets.floor.data;
  const ceilTex = assets.ceiling.data;
  const ray0X = dirX - planeX, ray0Y = dirY - planeY; // rayo del borde izquierdo
  const ray1X = dirX + planeX, ray1Y = dirY + planeY; // rayo del borde derecho

  for (let y = half; y < H; y++) {
    const p = y - half + 0.5;          // +0.5: centro del píxel (evita dividir entre 0)
    const rowDist = half / p;
    const k = shader.brightness(rowDist);
    const stepX = (rowDist * (ray1X - ray0X)) / W;
    const stepY = (rowDist * (ray1Y - ray0Y)) / W;
    let fx = px + rowDist * ray0X;     // punto del suelo bajo la columna 0
    let fy = py + rowDist * ray0Y;
    const floorRow = y * W;
    const ceilRow = (H - 1 - y) * W;

    for (let x = 0; x < W; x++) {
      // Parte fraccionaria de la posición -> coordenada dentro de la textura
      const tx = ((fx - Math.floor(fx)) * TEX) & MASK;
      const ty = ((fy - Math.floor(fy)) * TEX) & MASK;
      const ti = (ty * TEX + tx) * 4;
      shader.put(buf, floorRow + x, floorTex, ti, k);
      shader.put(buf, ceilRow + x, ceilTex, ti, k);
      fx += stepX;
      fy += stepY;
    }
  }

  // =========================================================
  // 2) PAREDES
  // =========================================================
  const sideShade = cfg.colors.sideShade;
  const emissiveMin = cfg.fog.emissiveMin;
  const lavaOffset = Math.floor(time * cfg.render.lavaSpeed); // anima la lava

  for (let x = 0; x < W; x++) {
    // ---------------------------------------------------------
    // 2.1) DIRECCIÓN DEL RAYO
    // cameraX va de -1 (borde izquierdo) a +1 (borde derecho).
    // rayDir = dir + plane * cameraX  -> un punto sobre el "plano de cámara".
    // Ojo: rayDir NO está normalizado, y eso es a propósito (ver 2.4).
    // ---------------------------------------------------------
    const cameraX = (2 * x) / W - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    let mapX = Math.floor(px);
    let mapY = Math.floor(py);

    // ---------------------------------------------------------
    // 2.2) DDA (Digital Differential Analyzer)
    // Saltamos de una línea de la cuadrícula a la siguiente en vez de
    // avanzar a pasitos fijos.
    // deltaDistX = cuánto "rayo" se recorre para cruzar UNA casilla en X.
    // Por triángulos semejantes: |rayDir| / |rayDirX|. Midiendo en unidades
    // de |rayDir| queda |1 / rayDirX|.
    // ---------------------------------------------------------
    const deltaDistX = rayDirX === 0 ? Infinity : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? Infinity : Math.abs(1 / rayDirY);

    // sideDist = distancia desde el jugador hasta la PRIMERA línea X / Y.
    let stepX, stepY, sideDistX, sideDistY;
    if (rayDirX < 0) { stepX = -1; sideDistX = (px - mapX) * deltaDistX; }
    else             { stepX = 1;  sideDistX = (mapX + 1 - px) * deltaDistX; }
    if (rayDirY < 0) { stepY = -1; sideDistY = (py - mapY) * deltaDistY; }
    else             { stepY = 1;  sideDistY = (mapY + 1 - py) * deltaDistY; }

    // ---------------------------------------------------------
    // 2.3) AVANZAR HASTA CHOCAR
    // side = 0 -> cara vertical (este/oeste); side = 1 -> cara horizontal (norte/sur)
    // ---------------------------------------------------------
    let side = 0;
    let tile = 0;
    for (let i = 0; i < cfg.render.maxRaySteps; i++) {
      if (sideDistX < sideDistY) { sideDistX += deltaDistX; mapX += stepX; side = 0; }
      else                       { sideDistY += deltaDistY; mapY += stepY; side = 1; }
      tile = getTile(level.map, mapX, mapY);
      if (tile !== 0) break;
    }
    if (tile === 0) { zBuffer[x] = Infinity; continue; }

    // ---------------------------------------------------------
    // 2.4) DISTANCIA PERPENDICULAR (evita el efecto "ojo de pez")
    // La distancia real del rayo haría que una pared recta se viera curva
    // (los rayos de los bordes son más largos). Queremos la distancia medida
    // en la dirección de la cámara. Como rayDir = dir + plane*cameraX y
    // |dir| = 1, la componente de rayDir hacia delante vale siempre 1, así
    // que medir en unidades de rayDir YA ES la distancia perpendicular.
    // Al salir del bucle nos pasamos un deltaDist -> lo restamos.
    // ---------------------------------------------------------
    const perpDist = side === 0 ? sideDistX - deltaDistX : sideDistY - deltaDistY;
    zBuffer[x] = perpDist;

    // ---------------------------------------------------------
    // 2.5) ALTURA DE LA COLUMNA: proyección en perspectiva, altura = H / distancia
    // ---------------------------------------------------------
    const lineHeight = H / perpDist;
    const drawStart = Math.max(0, Math.floor(half - lineHeight / 2));
    const drawEnd = Math.min(H, Math.floor(half + lineHeight / 2));

    // ---------------------------------------------------------
    // 2.6) ¿QUÉ COLUMNA DE LA TEXTURA?
    // wallX = punto exacto (0..1) donde el rayo tocó la pared, a lo largo de ella.
    // Si chocó en una cara vertical (side 0), la posición a lo largo es la Y;
    // en una horizontal (side 1), la X.
    // ---------------------------------------------------------
    let wallX = side === 0 ? py + perpDist * rayDirY : px + perpDist * rayDirX;
    wallX -= Math.floor(wallX);
    let texX = Math.floor(wallX * TEX);
    // Invertimos en dos de las cuatro caras para que la textura no se vea en espejo
    if ((side === 0 && rayDirX > 0) || (side === 1 && rayDirY < 0)) texX = TEX - 1 - texX;

    // ---------------------------------------------------------
    // 2.7) RECORRER LA COLUMNA
    // step = cuántos texels avanzamos por cada píxel de pantalla.
    // texPos empieza donde corresponde aunque la columna se salga por
    // arriba (pared muy cercana).
    // ---------------------------------------------------------
    const tex = assets.walls[tile] ?? assets.walls[1];
    const step = TEX / lineHeight;
    let texPos = (drawStart - half + lineHeight / 2) * step;
    const vOffset = tile === 5 ? lavaOffset : 0;

    let k = shader.brightness(perpDist) * (side === 1 ? sideShade : 1);
    if (tex.emissive) k = Math.max(k, emissiveMin); // la lava brilla en la oscuridad

    for (let y = drawStart; y < drawEnd; y++) {
      const texY = ((texPos | 0) + vOffset) & MASK;
      texPos += step;
      shader.put(buf, y * W + x, tex.data, (texY * TEX + texX) * 4, k);
    }
  }

  // =========================================================
  // 3) SPRITES
  // =========================================================
  drawSprites(r, player, level, time, shader);

  r.ctx.putImageData(r.image, 0, 0);
}

function drawSprites(r, player, level, time, shader) {
  const { W, H, buf, zBuffer, assets, cfg } = r;
  const half = H / 2;
  const { x: px, y: py, dirX, dirY, planeX, planeY } = player;

  // Dibujamos de lejos a cerca: así lo cercano tapa a lo lejano ("algoritmo del pintor")
  const sorted = level.sprites
    .map((s) => ({ s, d: (s.x - px) ** 2 + (s.y - py) ** 2 }))
    .sort((a, b) => b.d - a.d);

  // ---------------------------------------------------------
  // TRANSFORMAR AL ESPACIO DE CÁMARA
  // Queremos expresar la posición relativa del sprite como combinación de
  // los ejes de la cámara:  rel = tX * plane + tY * dir
  //   tY = profundidad (qué tan adelante está)
  //   tX = desplazamiento lateral (en unidades de plane)
  // Eso es resolver un sistema 2x2: multiplicar por la matriz inversa
  // [planeX dirX; planeY dirY]^-1, cuyo determinante es invDet.
  // ---------------------------------------------------------
  const invDet = 1 / (planeX * dirY - dirX * planeY);

  for (const { s } of sorted) {
    const relX = s.x - px;
    const relY = s.y - py;
    const tX = invDet * (dirY * relX - dirX * relY);
    const tY = invDet * (-planeY * relX + planeX * relY);
    if (tY <= 0.1) continue; // está detrás del jugador (o pegado a él)

    // Columna central en pantalla: tX/tY va de -1 (borde izq.) a +1 (der.)
    const screenX = Math.floor((W / 2) * (1 + tX / tY));
    // Tamaño: igual que las paredes, H / profundidad. Los sprites son cuadrados.
    const size = Math.floor(H / tY);
    const startX = screenX - (size >> 1);
    const startY = Math.floor(half - size / 2);

    const frames = assets.sprites[s.type];
    // Fase distinta por sprite para que los braseros no se animen sincronizados
    const frame = frames[Math.floor(time * cfg.render.spriteFps + s.x * 7 + s.y * 13) % frames.length];
    let k = shader.brightness(tY);
    if (frame.emissive) k = Math.max(k, cfg.fog.emissiveMin);

    const x0 = Math.max(0, startX);
    const x1 = Math.min(W, startX + size);
    const y0 = Math.max(0, startY);
    const y1 = Math.min(H, startY + size);

    for (let x = x0; x < x1; x++) {
      // Si la pared de esta columna está más cerca, el sprite queda oculto
      if (tY >= zBuffer[x]) continue;
      const texX = Math.floor(((x - startX) * TEX) / size);
      for (let y = y0; y < y1; y++) {
        const texY = Math.floor(((y - startY) * TEX) / size);
        const ti = (texY * TEX + texX) * 4;
        if (frame.data[ti + 3] === 0) continue; // píxel transparente
        shader.put(buf, y * W + x, frame.data, ti, k);
      }
    }
  }
}
