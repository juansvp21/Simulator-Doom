// =============================================================
// main.js — Arranque y bucle principal del juego.
// =============================================================

import { CONFIG } from './config.js';
import { TEST_LEVEL, createLevel } from './map.js';
import { initInput, endFrame } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { buildAssets } from './textures.js';
import { createRenderer, renderScene } from './raycaster.js';
import { createWeaponState, updateWeapon, updateEffects } from './weapons.js';
import { drawWeapon, drawCrosshair, drawHUD } from './hud.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

// Resolución interna baja; el CSS la agranda con píxeles nítidos.
canvas.width = CONFIG.render.width;
canvas.height = CONFIG.render.height;

const level = createLevel(TEST_LEVEL, CONFIG);
const player = createPlayer(CONFIG);
const weapon = createWeaponState(CONFIG, 'pistola');
const assets = buildAssets(); // texturas, sprites y armas generados por código
const renderer = createRenderer(ctx, CONFIG, assets);
initInput(canvas, overlay);

// Contador de FPS suavizado (media móvil) para que no parpadee.
let fps = 60;
let lastTime = performance.now();

// Expuesto solo para depurar desde la consola del navegador.
window.__game = { player, level, weapon, CONFIG };

function frame(now) {
  // DELTA TIME: segundos desde el frame anterior. Multiplicar velocidades
  // por dt hace que el juego vaya igual a 30, 60 o 144 FPS.
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, CONFIG.maxDeltaTime);
  if (dt > 0) fps = fps * 0.95 + (1 / dt) * 0.05;
  const time = now / 1000;

  // --- Lógica ---
  updatePlayer(player, level, dt, CONFIG);
  updateWeapon(weapon, dt, player, level, CONFIG);
  updateEffects(level, dt);

  // --- Dibujo ---
  renderer.flash = weapon.flashT > 0 ? CONFIG.fx.flashLight : 0;
  renderScene(renderer, player, level, time);
  drawWeapon(ctx, weapon, player, assets, CONFIG);
  drawCrosshair(ctx, weapon, CONFIG);
  drawHUD(ctx, player, weapon, CONFIG, time);

  ctx.fillStyle = '#ff0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FPS ${Math.round(fps)}`, 6, 14);

  endFrame(); // lo "recién pulsado" deja de serlo
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
