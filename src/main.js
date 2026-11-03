// =============================================================
// main.js — Arranque y bucle principal del juego.
// =============================================================

import { CONFIG } from './config.js';
import { TEST_LEVEL, createLevel } from './map.js';
import { initInput, endFrame, wasPressed } from './input.js';
import { createPlayer, updatePlayer } from './player.js';
import { buildAssets } from './textures.js';
import { createRenderer, renderScene } from './raycaster.js';
import { createArsenal, currentWeapon, updateArsenal, updatePickups, updateEffects } from './weapons.js';
import { updateEnemies, updateProjectiles, alertEnemies } from './enemies.js';
import { drawWeapon, drawCrosshair, drawHUD, drawDamage, drawEnemyCounter, drawMessage } from './hud.js';

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
let level, player, arsenal;
let message = '';   // aviso en pantalla (p. ej. "¡ESCOPETA!")
let messageT = 0;
function newGame() {
  level = createLevel(TEST_LEVEL, CONFIG);
  player = createPlayer(CONFIG);
  arsenal = createArsenal(CONFIG);
  messageT = 0;
  // Expuesto solo para depurar desde la consola del navegador.
  window.__game = { player, level, arsenal, CONFIG };
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
    const shot = updateArsenal(arsenal, dt, player, level, CONFIG);
    if (shot) alertEnemies(level, player, CONFIG); // el ruido del disparo
    const picked = updatePickups(level, player, arsenal, CONFIG);
    if (picked) { message = picked; messageT = CONFIG.fx.messageTime; }
  } else if (wasPressed('KeyR')) {
    newGame();
  }
  updateEnemies(level, player, dt, CONFIG);
  updateProjectiles(level, player, dt, CONFIG);
  updateEffects(level, dt);
  player.hurtT = Math.max(0, player.hurtT - dt);
  level.lightT = Math.max(0, (level.lightT ?? 0) - dt);
  messageT = Math.max(0, messageT - dt);
  const weapon = currentWeapon(arsenal);

  // --- Dibujo ---
  // Luz extra: fogonazo del arma y explosiones (la más fuerte de las dos)
  const explosionLight = (level.lightT / CONFIG.fx.explosionLife) * CONFIG.fx.explosionLight;
  renderer.flash = Math.max(weapon.flashT > 0 ? CONFIG.fx.flashLight : 0, explosionLight);
  renderScene(renderer, player, level, time);
  if (!player.dead) {
    drawWeapon(ctx, arsenal, player, assets, CONFIG);
    drawCrosshair(ctx, weapon, CONFIG);
  }
  drawDamage(ctx, player, CONFIG);
  drawHUD(ctx, player, arsenal, CONFIG, time);
  drawEnemyCounter(ctx, level, CONFIG);
  drawMessage(ctx, message, Math.min(1, messageT), CONFIG);

  ctx.fillStyle = '#ff0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FPS ${Math.round(fps)}`, 6, 14);

  endFrame(); // lo "recién pulsado" deja de serlo
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
