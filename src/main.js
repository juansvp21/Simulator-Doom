// =============================================================
// main.js — Arranque, bucle principal y flujo de la partida.
//
// El juego es una pequeña máquina de estados:
//   'playing'  -> jugando un nivel
//   'summary'  -> resumen del nivel (bonos)
//   'shop'     -> tienda del Mercader de Almas
// Al salir de la tienda empieza el siguiente nivel ('playing').
// =============================================================

import { CONFIG } from './config.js';
import { TEST_LEVEL, createLevel } from './map.js';
import { initInput, endFrame, wasPressed, setOverlayEnabled } from './input.js';
import { createPlayer, updatePlayer, resetPlayerForLevel } from './player.js';
import { buildAssets } from './textures.js';
import { createRenderer, renderScene } from './raycaster.js';
import {
  createArsenal, currentWeapon, updateArsenal, updatePickups, updateEffects,
  serializeArsenal, restoreArsenal,
} from './weapons.js';
import { updateEnemies, updateProjectiles, alertEnemies } from './enemies.js';
import { drawWeapon, drawCrosshair, drawHUD, drawDamage, drawEnemyCounter, drawMessage } from './hud.js';
import { computeLevelSummary, showSummary, openShop, closePanel } from './shop.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const ctx = canvas.getContext('2d');

// Resolución interna baja; el CSS la agranda con píxeles nítidos.
canvas.width = CONFIG.render.width;
canvas.height = CONFIG.render.height;

const assets = buildAssets(); // texturas, sprites y armas generados por código
const renderer = createRenderer(ctx, CONFIG, assets);
initInput(canvas, overlay);

// ---------------------------------------------------------
// ESTADO DE LA PARTIDA
// player y arsenal duran toda la partida (oro, armas, mejoras).
// level se crea de nuevo en cada nivel.
// snapshot = foto del inicio del nivel, para volver a ella si mueres.
// ---------------------------------------------------------
let state = 'playing';
let levelNumber = 1;
let level, player, arsenal, snapshot;
let message = '';   // aviso en pantalla (p. ej. "+15 ORO")
let messageT = 0;

function takeSnapshot() {
  return {
    money: player.money,
    health: player.health,
    armor: player.armor,
    arsenal: serializeArsenal(arsenal),
  };
}

function startLevel() {
  level = createLevel(TEST_LEVEL, CONFIG);
  resetPlayerForLevel(player, CONFIG);
  snapshot = takeSnapshot();
  messageT = 0;
  state = 'playing';
  // Expuesto solo para depurar desde la consola del navegador.
  window.__game = { player, level, arsenal, CONFIG, get state() { return state; } };
}

// Al morir: volvemos al estado con el que empezaste el nivel
function retryLevel() {
  player.money = snapshot.money;
  player.health = snapshot.health;
  player.armor = snapshot.armor;
  arsenal = restoreArsenal(snapshot.arsenal, CONFIG);
  startLevel();
}

function newGame() {
  player = createPlayer(CONFIG);
  arsenal = createArsenal(CONFIG);
  levelNumber = 1;
  startLevel();
}
newGame();

// ---------------------------------------------------------
// FIN DE NIVEL -> RESUMEN -> TIENDA -> SIGUIENTE NIVEL
// ---------------------------------------------------------
function finishLevel() {
  const summary = computeLevelSummary(player, level, CONFIG);
  player.money += summary.timeBonus + summary.accuracyBonus;
  state = 'summary';
  setOverlayEnabled(false);
  document.exitPointerLock?.();
  showSummary(panel, summary, levelNumber, () => {
    state = 'shop';
    openShop(panel, player, arsenal, CONFIG, levelNumber + 1, () => {
      closePanel(panel);
      levelNumber++;
      startLevel();
      setOverlayEnabled(true);
      // El clic en "Descender" cuenta como gesto del usuario: podemos
      // capturar el ratón directamente sin pedir otro clic.
      canvas.requestPointerLock?.();
    });
  });
}

// El portal se abre cuando no quedan enemigos vivos. Se usa con E.
function updatePortal(time) {
  const alive = level.enemies.filter((e) => e.state !== 'dead').length;
  const portal = level.sprites.find((s) => s.exit);
  if (!portal) return;
  // Fotograma 4 = apagado; 0-3 = remolino animado
  portal.frame = alive > 0 ? 4 : Math.floor(time * 8) % 4;

  const near = Math.hypot(portal.x - player.x, portal.y - player.y) < CONFIG.fx.interactRadius;
  if (!near) return;
  if (alive > 0) {
    showMessage(`Portal sellado: quedan ${alive} enemigos`, 0.2);
  } else if (wasPressed('KeyE')) {
    finishLevel();
  } else {
    showMessage('Pulsa E para cruzar el portal', 0.2);
  }
}

function showMessage(text, seconds) {
  message = text;
  messageT = Math.max(messageT, seconds);
}

// ---------------------------------------------------------
// BUCLE PRINCIPAL
// ---------------------------------------------------------
let fps = 60;                     // contador de FPS suavizado (media móvil)
let lastTime = performance.now();

function frame(now) {
  // DELTA TIME: segundos desde el frame anterior. Multiplicar velocidades
  // por dt hace que el juego vaya igual a 30, 60 o 144 FPS.
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  dt = Math.min(dt, CONFIG.maxDeltaTime);
  if (dt > 0) fps = fps * 0.95 + (1 / dt) * 0.05;
  const time = now / 1000;

  // --- Lógica (solo mientras se juega; en la tienda el mundo se congela) ---
  if (state === 'playing') {
    if (!player.dead) {
      player.stats.time += dt;
      updatePlayer(player, level, dt, CONFIG);
      const shot = updateArsenal(arsenal, dt, player, level, CONFIG);
      if (shot) alertEnemies(level, player, CONFIG); // el ruido del disparo
      const picked = updatePickups(level, player, arsenal, CONFIG);
      if (picked) showMessage(picked, CONFIG.fx.messageTime);
    } else if (wasPressed('KeyR')) {
      retryLevel();
    }
    updateEnemies(level, player, dt, CONFIG);
    updateProjectiles(level, player, dt, CONFIG);
    updateEffects(level, dt);
    if (!player.dead) updatePortal(time);
    player.hurtT = Math.max(0, player.hurtT - dt);
    level.lightT = Math.max(0, (level.lightT ?? 0) - dt);
    messageT = Math.max(0, messageT - dt);
  }
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
  drawEnemyCounter(ctx, level, levelNumber, CONFIG);
  drawMessage(ctx, message, Math.min(1, messageT), CONFIG);

  ctx.fillStyle = '#ff0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FPS ${Math.round(fps)}`, 6, 14);

  endFrame(); // lo "recién pulsado" deja de serlo
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
