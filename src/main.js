// =============================================================
// main.js — Arranque y bucle principal del juego.
// =============================================================

import { CONFIG } from './config.js';
import { TEST_LEVEL, createLevel } from './map.js';
import { initInput, endFrame, wasPressed } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { buildAssets } from './textures.js';
import { createRenderer, renderScene } from './raycaster.js';
import { createWeaponState, updateWeapon, updateEffects } from './weapons.js';
import { updateEnemies, updateProjectiles, alertEnemies } from './enemies.js';
import { drawWeapon, drawCrosshair, drawHUD, drawDamage, drawEnemyCounter } from './hud.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const ctx = canvas.getContext('2d');

// Resolución interna baja; el CSS la agranda con píxeles nítidos.
canvas.width = CONFIG.render.width;
canvas.height = CONFIG.render.height;

const assets = buildAssets(); // texturas, sprites y armas generados por código
const renderer = createRenderer(ctx, CONFIG, assets);
initInput(canvas, overlay);

// Estado de la partida. Se agrupa para poder reiniciarla de golpe.
let level, player, weapon;
function newGame() {
  level = createLevel(TEST_LEVEL, CONFIG);
  player = createPlayer(CONFIG);
  weapon = createWeaponState(CONFIG, 'pistola');
  // Expuesto solo para depurar desde la consola del navegador.
  window.__game = { player, level, weapon, CONFIG };
}
newGame();

// Contador de FPS suavizado (media móvil) para que no parpadee.
let fps = 60;
let lastTime = performance.now();

function frame(now) {
  // DELTA TIME: segundos desde el frame anterior. Multiplicar velocidades
  // por dt hace que el juego vaya igual a 30, 60 o 144 FPS.
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, CONFIG.maxDeltaTime);
  if (dt > 0) fps = fps * 0.95 + (1 / dt) * 0.05;
  const time = now / 1000;

  // --- Lógica ---
  if (!player.dead) {
    updatePlayer(player, level, dt, CONFIG);
    const shot = updateWeapon(weapon, dt, player, level, CONFIG);
    if (shot) alertEnemies(level, player, CONFIG); // el ruido del disparo
  } else if (wasPressed('KeyR')) {
    newGame();
  }
  updateEnemies(level, player, dt, CONFIG);
  updateProjectiles(level, player, dt, CONFIG);
  updateEffects(level, dt);
  player.hurtT = Math.max(0, player.hurtT - dt);

  // --- Dibujo ---
  renderer.flash = weapon.flashT > 0 ? CONFIG.fx.flashLight : 0;
  renderScene(renderer, player, level, time);
  if (!player.dead) {
    drawWeapon(ctx, weapon, player, assets, CONFIG);
    drawCrosshair(ctx, weapon, CONFIG);
  }
  drawDamage(ctx, player, CONFIG);
  drawHUD(ctx, player, weapon, CONFIG, time);
  drawEnemyCounter(ctx, level, CONFIG);

  ctx.fillStyle = '#ff0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FPS ${Math.round(fps)}`, 6, 14);

  endFrame(); // lo "recién pulsado" deja de serlo
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
