// =============================================================
// main.js — Arranque, bucle principal y flujo de la partida.
//
// El juego es una pequeña máquina de estados:
//   'menu'     -> pantalla inicial (Continuar / Nueva partida)
//   'playing'  -> jugando un círculo
//   'summary'  -> resumen del círculo (bonos)
//   'shop'     -> tienda del Mercader de Almas
//   'complete' -> superaste los 7 círculos
// =============================================================

import { CONFIG } from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { createLevel } from './map.js';
import { initInput, endFrame, wasPressed, setOverlayEnabled } from './input.js';
import { createPlayer, updatePlayer, resetPlayerForLevel } from './player.js';
import { buildAssets } from './textures.js';
import { createRenderer, renderScene, setFog } from './raycaster.js';
import {
  createArsenal, currentWeapon, updateArsenal, updatePickups, updateEffects,
  serializeArsenal, restoreArsenal,
} from './weapons.js';
import { updateEnemies, updateProjectiles, alertEnemies } from './enemies.js';
import {
  drawWeapon, drawCrosshair, drawHUD, drawDamage, drawEnemyCounter, drawMessage, drawLevelTitle,
} from './hud.js';
import { computeLevelSummary, showSummary, openShop, closePanel, showGameComplete } from './shop.js';
import { initAudio, playSound, setListener, startAmbient, stopAmbient, toggleMute } from './audio.js';
import { saveGame, loadGame, clearSave } from './save.js';

const canvas = document.getElementById('screen');
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const menu = document.getElementById('menu');
const ctx = canvas.getContext('2d');

// Resolución interna baja; el CSS la agranda con píxeles nítidos.
canvas.width = CONFIG.render.width;
canvas.height = CONFIG.render.height;

const assets = buildAssets(); // texturas, sprites y armas generados por código
const renderer = createRenderer(ctx, CONFIG, assets);
initInput(canvas, overlay);

// El audio solo puede arrancar tras un gesto del usuario (clic o tecla)
document.addEventListener('mousedown', () => initAudio(CONFIG));
document.addEventListener('keydown', () => initAudio(CONFIG));

// ---------------------------------------------------------
// ESTADO DE LA PARTIDA
// player y arsenal duran toda la partida (oro, armas, mejoras).
// level se crea de nuevo en cada círculo.
// snapshot = foto del inicio del círculo, para volver a ella si mueres.
// ---------------------------------------------------------
let state = 'menu';
let levelIndex = 0;        // 0 = Círculo I
let level, player, arsenal, snapshot;
let message = '';          // aviso en pantalla (p. ej. "+15 ORO")
let messageT = 0;
let titleT = 0;            // tiempo que se muestra el nombre del círculo
let portalOpen = false;

function takeSnapshot() {
  return {
    levelIndex,
    money: player.money,
    health: player.health,
    armor: player.armor,
    arsenal: serializeArsenal(arsenal),
  };
}

function applySnapshot(s) {
  levelIndex = s.levelIndex;
  player.money = s.money;
  player.health = s.health;
  player.armor = s.armor;
  arsenal = restoreArsenal(s.arsenal, CONFIG);
}

function startLevel() {
  const def = parseLevel(LEVELS[levelIndex]);
  level = createLevel(def, CONFIG, levelIndex);
  resetPlayerForLevel(player, CONFIG, level.start);
  setFog(renderer, { ...CONFIG.fog, ...level.fog });
  startAmbient(level.ambient);
  snapshot = takeSnapshot();
  saveGame(snapshot); // guardado automático al empezar cada círculo
  messageT = 0;
  titleT = 3.5;
  portalOpen = false;
  state = 'playing';
  // Expuesto solo para depurar desde la consola del navegador.
  window.__game = { player, level, arsenal, CONFIG, get state() { return state; }, get levelIndex() { return levelIndex; } };
}

// Al morir: volvemos al estado con el que empezaste el círculo
function retryLevel() {
  applySnapshot(snapshot);
  startLevel();
}

function newGame() {
  clearSave();
  player = createPlayer(CONFIG);
  arsenal = createArsenal(CONFIG);
  levelIndex = 0;
  startLevel();
}

function continueGame(saved) {
  player = createPlayer(CONFIG);
  applySnapshot(saved);
  startLevel();
}

// ---------------------------------------------------------
// MENÚ INICIAL: si hay partida guardada, ofrecemos continuarla.
// ---------------------------------------------------------
const saved = loadGame();
// Mientras el jugador elige, mostramos el primer círculo de fondo
player = createPlayer(CONFIG);
arsenal = createArsenal(CONFIG);
levelIndex = saved ? saved.levelIndex : 0;
level = createLevel(parseLevel(LEVELS[levelIndex]), CONFIG, levelIndex);
resetPlayerForLevel(player, CONFIG, level.start);
setFog(renderer, { ...CONFIG.fog, ...level.fog });

function hideMenu() {
  menu.classList.add('hidden');
  overlay.classList.remove('choosing');
}

if (saved) {
  menu.innerHTML = `
    <button data-menu="continue">CONTINUAR · ${LEVELS[saved.levelIndex].name}</button>
    <button data-menu="new">NUEVA PARTIDA</button>`;
  menu.classList.remove('hidden');
  overlay.classList.add('choosing');
  menu.onclick = (e) => {
    const choice = e.target.closest('button')?.dataset.menu;
    if (!choice) return;
    hideMenu();
    if (choice === 'continue') continueGame(saved);
    else newGame();
    canvas.requestPointerLock?.(); // el clic en el botón es el gesto del usuario
  };
} else {
  hideMenu();
  newGame();
}

// ---------------------------------------------------------
// FIN DE CÍRCULO -> RESUMEN -> TIENDA -> SIGUIENTE CÍRCULO
// ---------------------------------------------------------
function finishLevel() {
  const summary = computeLevelSummary(player, level, CONFIG);
  player.money += summary.timeBonus + summary.accuracyBonus;
  state = 'summary';
  setOverlayEnabled(false);
  document.exitPointerLock?.();
  stopAmbient();
  const isLast = levelIndex === LEVELS.length - 1;

  showSummary(panel, summary, LEVELS[levelIndex].name, () => {
    if (isLast) {
      state = 'complete';
      clearSave();
      showGameComplete(panel, player, () => {
        closePanel(panel);
        setOverlayEnabled(true);
        newGame();
        canvas.requestPointerLock?.();
      });
      return;
    }
    state = 'shop';
    openShop(panel, player, arsenal, CONFIG, LEVELS[levelIndex + 1].name, () => {
      closePanel(panel);
      levelIndex++;
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
  if (alive === 0 && !portalOpen) {
    portalOpen = true;
    playSound('portal');
    showMessage('¡El portal se ha abierto!', 2.5);
  }
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

  if (wasPressed('KeyM')) showMessage(toggleMute() ? 'SONIDO DESACTIVADO (M)' : 'SONIDO ACTIVADO (M)', 1.5);

  // --- Lógica (solo mientras se juega; fuera de 'playing' el mundo se congela) ---
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
    setListener(player);
    updateEnemies(level, player, dt, CONFIG);
    updateProjectiles(level, player, dt, CONFIG);
    updateEffects(level, dt);
    if (!player.dead) updatePortal(time);
    player.hurtT = Math.max(0, player.hurtT - dt);
    level.lightT = Math.max(0, (level.lightT ?? 0) - dt);
    messageT = Math.max(0, messageT - dt);
    titleT = Math.max(0, titleT - dt);
  }
  const weapon = currentWeapon(arsenal);

  // --- Dibujo ---
  // Luz extra: fogonazo del arma y explosiones (la más fuerte de las dos)
  const explosionLight = ((level.lightT ?? 0) / CONFIG.fx.explosionLife) * CONFIG.fx.explosionLight;
  renderer.flash = Math.max(weapon.flashT > 0 ? CONFIG.fx.flashLight : 0, explosionLight);
  renderScene(renderer, player, level, time);
  if (!player.dead) {
    drawWeapon(ctx, arsenal, player, assets, CONFIG);
    drawCrosshair(ctx, weapon, CONFIG);
  }
  drawDamage(ctx, player, CONFIG);
  drawHUD(ctx, player, arsenal, CONFIG, time);
  drawEnemyCounter(ctx, level, levelIndex + 1, CONFIG);
  drawLevelTitle(ctx, LEVELS[levelIndex], Math.min(1, titleT), CONFIG);
  drawMessage(ctx, message, Math.min(1, messageT), CONFIG);

  ctx.fillStyle = '#ff0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`FPS ${Math.round(fps)}`, 6, 14);

  endFrame(); // lo "recién pulsado" deja de serlo
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
