// =============================================================
// weapons.js — Armas: disparo, munición, recarga y efectos de impacto.
//
// DISPARO "HITSCAN"
// La bala no viaja: en el mismo frame lanzamos un rayo desde el jugador
// (el centro de la pantalla) y lo primero que toca es lo que recibe el
// impacto. Así lo hacían los shooters de los 90 con pistolas y escopetas.
// La "dispersión" (spread) gira un poco el rayo al azar para que no sea
// puntería perfecta.
// =============================================================

import { isDown, wasPressed } from './input.js';
import { castRay } from './map.js';
import { hitscanEnemy, damageEnemy, spawnEffect } from './enemies.js';

export function createWeaponState(cfg, id = 'pistola') {
  const def = cfg.weapons[id];
  return {
    id,
    def,
    mag: def.magSize,          // balas en el cargador
    reserve: def.startReserve, // balas de reserva
    cooldown: 0,               // tiempo hasta poder volver a disparar
    reloadT: 0,                // > 0 mientras recarga (cuenta atrás)
    recoilT: 0,                // > 0 durante la animación de retroceso
    flashT: 0,                 // > 0 mientras se ve el fogonazo
    messageT: 0,               // > 0 mientras se muestra "SIN BALAS"
    queuedT: 0,                // > 0 si hay un clic esperando a que el arma esté lista
    lastShot: null,            // info del último disparo (la usarán los enemigos)
  };
}

// Devuelve la info del disparo si se disparó en este frame, o null.
export function updateWeapon(w, dt, player, level, cfg) {
  const def = w.def;
  const fx = cfg.fx;
  w.cooldown = Math.max(0, w.cooldown - dt);
  w.recoilT = Math.max(0, w.recoilT - dt);
  w.flashT = Math.max(0, w.flashT - dt);
  w.messageT = Math.max(0, w.messageT - dt);
  w.lastShot = null;

  // --- Recarga en curso ---
  if (w.reloadT > 0) {
    w.reloadT -= dt;
    if (w.reloadT <= 0) {
      // Pasamos de la reserva al cargador solo lo que falta (y lo que haya)
      const n = Math.min(def.magSize - w.mag, w.reserve);
      w.mag += n;
      w.reserve -= n;
      w.reloadT = 0;
    }
    return null; // no se dispara mientras recargas
  }

  // --- Empezar a recargar con R ---
  if (wasPressed('KeyR') && w.mag < def.magSize && w.reserve > 0) {
    w.reloadT = def.reloadTime;
    return null;
  }

  // --- Gatillo ---
  // Arma automática: dispara mientras mantienes el clic.
  // Semiautomática (pistola): un disparo por cada clic.
  // "Buffer" de clic: si haces clic justo antes de que el arma esté lista,
  // lo recordamos un momento (queuedT) en vez de ignorarlo. Si no, al hacer
  // clic rápido se "perderían" disparos y el arma se sentiría torpe.
  if (wasPressed('Mouse0')) w.queuedT = 0.2;
  else w.queuedT = Math.max(0, (w.queuedT ?? 0) - dt);
  const trigger = def.auto ? isDown('Mouse0') : w.queuedT > 0;
  if (!trigger || w.cooldown > 0) return null;
  w.queuedT = 0;

  if (w.mag === 0) {
    // Cargador vacío: recarga automática si quedan balas; si no, aviso
    if (w.reserve > 0) w.reloadT = def.reloadTime;
    else w.messageT = 1;
    return null;
  }

  return fire(w, player, level, cfg);
}

function fire(w, player, level, cfg) {
  const def = w.def;
  const fx = cfg.fx;
  w.mag--;
  w.cooldown = 1 / def.fireRate; // cadencia: disparos por segundo -> segundos entre disparos
  w.recoilT = fx.recoilTime;
  w.flashT = fx.flashTime;
  player.stats.shots++;

  // Dirección con dispersión aleatoria en [-spread, +spread]
  const angle = player.angle + (Math.random() * 2 - 1) * def.spread;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  // 1) ¿Dónde choca con la pared?
  const wall = castRay(level.map, player.x, player.y, dx, dy, def.range);
  // 2) ¿Hay algún enemigo en la línea ANTES de esa pared?
  const target = hitscanEnemy(level, player.x, player.y, dx, dy, wall.dist);

  if (target) {
    damageEnemy(target.enemy, def.damage, player, cfg);
    player.stats.hits++;
    // Sangre entre el enemigo y el jugador para que se dibuje delante de él
    const d = target.dist - target.enemy.radius;
    spawnEffect(level, 'sangre', player.x + dx * d, player.y + dy * d, cfg.fx.sparkLife);
  } else if (wall.hit) {
    // Chispa un poco ANTES de la pared, para que no quede escondida detrás
    // de ella en el z-buffer.
    spawnEffect(level, 'chispa', wall.x - dx * 0.05, wall.y - dy * 0.05, cfg.fx.sparkLife);
  }

  w.lastShot = { x: player.x, y: player.y, dx, dy, hit: target?.enemy ?? null };
  return w.lastShot;
}

// Efectos temporales (chispas): avanzan su animación y desaparecen.
export function updateEffects(level, dt, frameCount = 3) {
  for (const s of level.sprites) {
    if (s.life === undefined) continue;
    s.life -= dt;
    const progress = 1 - s.life / s.maxLife; // 0 -> 1
    s.frame = Math.min(frameCount - 1, Math.floor(progress * frameCount));
  }
  level.sprites = level.sprites.filter((s) => s.life === undefined || s.life > 0);
}
