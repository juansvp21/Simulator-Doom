// =============================================================
// main.js — Arranque y bucle principal del juego.
// =============================================================

import { CONFIG } from './config.js';
import { TEST_MAP, createMap } from './map.js';
import { initInput } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { renderScene } from './raycaster.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

// Resolución interna baja; el CSS la agranda con píxeles nítidos.
canvas.width = CONFIG.render.width;
canvas.height = CONFIG.render.height;

const map = createMap(TEST_MAP);
const player = createPlayer(CONFIG);
initInput(canvas, overlay);

// Contador de FPS suavizado (media móvil) para que no parpadee.
let fps = 60;
let lastTime = performance.now();

// Expuesto solo para depurar desde la consola del navegador.
window.__game = { player, map, CONFIG };

function frame(now) {
  // DELTA TIME: segundos desde el frame anterior. Multiplicar velocidades
  // por dt hace que el juego vaya igual a 30, 60 o 144 FPS.
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, CONFIG.maxDeltaTime);
  if (dt > 0) fps = fps * 0.95 + (1 / dt) * 0.05;

  updatePlayer(player, map, dt, CONFIG);
  renderScene(ctx, player, map, CONFIG);

  ctx.fillStyle = '#ff0';
  ctx.font = '12px monospace';
  ctx.fillText(`FPS ${Math.round(fps)}`, 6, 14);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
