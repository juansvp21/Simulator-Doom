// =============================================================
// weapons.js — Armas: disparo, munición, recarga, cambio de arma,
// objetos recogibles y efectos de impacto.
//
// TRES FORMAS DE DISPARAR (def.kind en config.js)
//  - 'hitscan':    la bala no viaja; en el mismo frame lanzamos un rayo y lo
//                  primero que toca recibe el impacto. La escopeta lanza
//                  varios rayos (perdigones) con dispersión.
//  - 'projectile': el cohete SÍ viaja por el mundo y explota al chocar.
//  - 'beam':       un rayo que atraviesa a TODOS los enemigos hasta la pared.
// =============================================================

import { isDown, wasPressed, consumeWheel } from './input.js';
import { castRay } from './map.js';
import { hitscanEnemy, hitscanAllEnemies, damageEnemy, spawnEffect } from './enemies.js';
import { playSound } from './audio.js';

// ---------- Estado de UNA arma ----------
function createWeaponState(cfg, id) {
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
    beamT: 0,                  // > 0 mientras se ve el rayo del cetro
    messageT: 0,               // > 0 mientras se muestra "SIN BALAS"
    queuedT: 0,                // > 0 si hay un clic esperando a que el arma esté lista
    // Nivel comprado de cada mejora (0 a 3)
    upgrades: { damage: 0, fireRate: 0, magSize: 0, reloadTime: 0 },
  };
}

// -------------------------------------------------------------
// ESTADÍSTICAS CON MEJORAS
// El valor base está en config.js y cada nivel lo cambia un porcentaje:
//   valor = base * (1 + perLevel * nivel)
// Con perLevel negativo (recarga) el valor baja: -15 % por nivel.
// Así la lógica de disparo no sabe nada de la tienda: solo pide estas stats.
// -------------------------------------------------------------
export function weaponStats(w, cfg) {
  const up = cfg.upgrades;
  const mult = (key) => 1 + up[key].perLevel * w.upgrades[key];
  return {
    damage: w.def.damage * mult('damage'),
    fireRate: w.def.fireRate * mult('fireRate'),
    magSize: Math.round(w.def.magSize * mult('magSize')),
    reloadTime: w.def.reloadTime * mult('reloadTime'),
  };
}

// ---------- Arsenal: todas las armas que lleva el jugador ----------
export function createArsenal(cfg) {
  const arsenal = {
    weapons: {},       // id -> estado del arma (solo las que tiene)
    current: 'pistola',
    pending: null,     // arma a la que estamos cambiando
    switchT: 0,        // > 0 durante la animación de cambio
  };
  giveWeapon(arsenal, 'pistola', cfg);
  return arsenal;
}

export function currentWeapon(arsenal) {
  return arsenal.weapons[arsenal.current];
}

// Da un arma. Si ya la tenía, da munición. Devuelve true si es nueva.
export function giveWeapon(arsenal, id, cfg) {
  const owned = arsenal.weapons[id];
  if (owned) {
    owned.reserve += Math.ceil(owned.def.startReserve / 2);
    return false;
  }
  arsenal.weapons[id] = createWeaponState(cfg, id);
  return true;
}

// Copia "plana" del arsenal (solo datos, sin funciones ni referencias a config).
// Sirve para volver al estado del inicio del nivel si mueres, y en la
// Fase 7 para guardar la partida en localStorage.
export function serializeArsenal(arsenal) {
  const weapons = {};
  for (const [id, w] of Object.entries(arsenal.weapons)) {
    weapons[id] = { mag: w.mag, reserve: w.reserve, upgrades: { ...w.upgrades } };
  }
  return { current: arsenal.current, weapons };
}

export function restoreArsenal(data, cfg) {
  const arsenal = createArsenal(cfg);
  arsenal.weapons = {};
  for (const [id, saved] of Object.entries(data.weapons)) {
    const w = createWeaponState(cfg, id);
    w.mag = saved.mag;
    w.reserve = saved.reserve;
    w.upgrades = { ...saved.upgrades };
    arsenal.weapons[id] = w;
  }
  arsenal.current = arsenal.weapons[data.current] ? data.current : 'pistola';
  return arsenal;
}

// Las armas ordenadas por su tecla (1-5)
function ownedBySlot(arsenal) {
  return Object.values(arsenal.weapons).sort((a, b) => a.def.slot - b.def.slot);
}

export function switchTo(arsenal, id, cfg) {
  if (!arsenal.weapons[id] || id === arsenal.current || arsenal.switchT > 0) return;
  arsenal.weapons[arsenal.current].reloadT = 0; // cambiar de arma cancela la recarga
  arsenal.pending = id;
  arsenal.switchT = cfg.fx.switchTime;
  playSound('cambio_arma');
}

// -------------------------------------------------------------
// ACTUALIZACIÓN POR FRAME
// Devuelve la info del disparo si se disparó en este frame, o null.
// -------------------------------------------------------------
export function updateArsenal(arsenal, dt, player, level, cfg) {
  // --- Elegir arma con 1-5 ---
  for (const w of Object.values(arsenal.weapons)) {
    if (wasPressed(`Digit${w.def.slot}`)) switchTo(arsenal, w.id, cfg);
  }
  // --- Rueda del ratón: siguiente / anterior arma que tengas ---
  const wheel = consumeWheel();
  if (wheel !== 0) {
    const list = ownedBySlot(arsenal);
    const i = list.findIndex((w) => w.id === arsenal.current);
    const next = list[(i + Math.sign(wheel) + list.length) % list.length];
    switchTo(arsenal, next.id, cfg);
  }

  // --- Animación de cambio: la primera mitad baja el arma vieja,
  //     a mitad de camino cambiamos, y la segunda mitad sube la nueva ---
  if (arsenal.switchT > 0) {
    arsenal.switchT -= dt;
    if (arsenal.pending && arsenal.switchT <= cfg.fx.switchTime / 2) {
      arsenal.current = arsenal.pending;
      arsenal.pending = null;
    }
    if (arsenal.switchT < 0) arsenal.switchT = 0;
    tickTimers(currentWeapon(arsenal), dt);
    return null; // no se dispara mientras cambias
  }

  return updateWeapon(currentWeapon(arsenal), dt, player, level, cfg);
}

function tickTimers(w, dt) {
  w.cooldown = Math.max(0, w.cooldown - dt);
  w.recoilT = Math.max(0, w.recoilT - dt);
  w.flashT = Math.max(0, w.flashT - dt);
  w.beamT = Math.max(0, w.beamT - dt);
  w.messageT = Math.max(0, w.messageT - dt);
}

function updateWeapon(w, dt, player, level, cfg) {
  const def = w.def;
  const st = weaponStats(w, cfg);
  tickTimers(w, dt);

  // --- Recarga en curso ---
  if (w.reloadT > 0) {
    w.reloadT -= dt;
    if (w.reloadT <= 0) {
      // Pasamos de la reserva al cargador solo lo que falta (y lo que haya)
      const n = Math.min(st.magSize - w.mag, w.reserve);
      w.mag += n;
      w.reserve -= n;
      w.reloadT = 0;
    }
    return null; // no se dispara mientras recargas
  }

  // --- Empezar a recargar con R ---
  if (wasPressed('KeyR') && w.mag < st.magSize && w.reserve > 0) {
    w.reloadT = st.reloadTime;
    playSound('recarga');
    return null;
  }

  // --- Gatillo ---
  // Arma automática: dispara mientras mantienes el clic.
  // Semiautomática: un disparo por cada clic.
  // "Buffer" de clic: si haces clic justo antes de que el arma esté lista,
  // lo recordamos un momento (queuedT) en vez de ignorarlo. Si no, al hacer
  // clic rápido se "perderían" disparos y el arma se sentiría torpe.
  if (wasPressed('Mouse0')) w.queuedT = 0.2;
  else w.queuedT = Math.max(0, w.queuedT - dt);
  const trigger = def.auto ? isDown('Mouse0') : w.queuedT > 0;
  if (!trigger || w.cooldown > 0) return null;
  w.queuedT = 0;

  if (w.mag === 0) {
    // Cargador vacío: recarga automática si quedan balas; si no, aviso
    if (w.reserve > 0) { w.reloadT = st.reloadTime; playSound('recarga'); }
    else { w.messageT = 1; playSound('vacio'); }
    return null;
  }

  return fire(w, st, player, level, cfg);
}

// -------------------------------------------------------------
// DISPARAR
// -------------------------------------------------------------
function fire(w, st, player, level, cfg) {
  const def = w.def;
  const fx = cfg.fx;
  w.mag--;
  w.cooldown = 1 / st.fireRate; // cadencia: disparos por segundo -> segundos entre disparos
  w.recoilT = fx.recoilTime;
  w.flashT = fx.flashTime;
  player.stats.shots++;
  playSound(w.id); // cada arma tiene su receta en audio.js

  if (def.kind === 'projectile') fireRocket(def, st, player, level);
  else if (def.kind === 'beam') fireBeam(w, st, player, level, cfg);
  else fireHitscan(def, st, player, level, cfg);

  return { x: player.x, y: player.y };
}

// Bala(s) instantánea(s). Con pellets > 1 (escopeta), cada perdigón tiene
// su propia dispersión: de cerca casi todos aciertan, de lejos se abren.
function fireHitscan(def, st, player, level, cfg) {
  let anyHit = false;
  for (let i = 0; i < def.pellets; i++) {
    // Dirección con dispersión aleatoria en [-spread, +spread]
    const angle = player.angle + (Math.random() * 2 - 1) * def.spread;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    // 1) ¿Dónde choca con la pared?
    const wall = castRay(level.map, player.x, player.y, dx, dy, def.range);
    // 2) ¿Hay algún enemigo en la línea ANTES de esa pared?
    const target = hitscanEnemy(level, player.x, player.y, dx, dy, wall.dist);

    if (target) {
      damageEnemy(target.enemy, st.damage, player, cfg);
      anyHit = true;
      // Sangre entre el enemigo y el jugador para que se dibuje delante de él
      const d = target.dist - target.enemy.radius;
      spawnEffect(level, 'sangre', player.x + dx * d, player.y + dy * d, cfg.fx.sparkLife);
    } else if (wall.hit) {
      // Chispa un poco ANTES de la pared, para que no quede oculta en el z-buffer
      spawnEffect(level, 'chispa', wall.x - dx * 0.05, wall.y - dy * 0.05, cfg.fx.sparkLife);
    }
  }
  // Para la precisión cuenta como acierto si al menos un perdigón dio
  if (anyHit) player.stats.hits++;
}

// Cohete: lo creamos un poco delante del jugador y lo mueve updateProjectiles.
// La mejora de daño sube tanto el impacto directo como la explosión.
function fireRocket(def, st, player, level) {
  const dmgMult = st.damage / def.damage;
  const dx = Math.cos(player.angle);
  const dy = Math.sin(player.angle);
  level.projectiles.push({
    type: 'cohete',
    owner: 'player',
    x: player.x + dx * 0.3,
    y: player.y + dy * 0.3,
    dx, dy,
    speed: def.projectileSpeed,
    damage: st.damage,
    radius: 0.12,
    splash: { radius: def.splashRadius, damage: def.splashDamage * dmgMult, self: def.selfDamage },
  });
}

// Rayo que atraviesa: dañamos a todos los enemigos en la línea hasta la pared.
function fireBeam(w, st, player, level, cfg) {
  const def = w.def;
  const dx = Math.cos(player.angle);
  const dy = Math.sin(player.angle);
  const wall = castRay(level.map, player.x, player.y, dx, dy, def.range);
  const targets = hitscanAllEnemies(level, player.x, player.y, dx, dy, wall.dist);
  for (const { enemy, dist } of targets) {
    damageEnemy(enemy, st.damage, player, cfg);
    const d = dist - enemy.radius;
    spawnEffect(level, 'sangre', player.x + dx * d, player.y + dy * d, cfg.fx.sparkLife);
  }
  if (targets.length) player.stats.hits++;
  if (wall.hit) spawnEffect(level, 'chispa', wall.x - dx * 0.05, wall.y - dy * 0.05, cfg.fx.sparkLife);
  w.beamT = cfg.fx.beamTime;
}

// -------------------------------------------------------------
// OBJETOS RECOGIBLES (armas, cajas de munición y monedas)
// Devuelve un texto para mostrar en pantalla, o null.
// -------------------------------------------------------------
export function updatePickups(level, player, arsenal, cfg) {
  let message = null;
  for (const s of level.sprites) {
    if (!s.pickup || s.taken) continue;
    if (Math.hypot(s.x - player.x, s.y - player.y) > cfg.fx.pickupRadius) continue;

    if (s.pickup.weapon) {
      const id = s.pickup.weapon;
      const isNew = giveWeapon(arsenal, id, cfg);
      message = isNew ? `¡${cfg.weapons[id].name}! (tecla ${cfg.weapons[id].slot})` : `+ munición: ${cfg.weapons[id].name}`;
      if (isNew) switchTo(arsenal, id, cfg); // la sacas al recogerla
      playSound('municion');
    } else if (s.pickup.health) {
      if (player.health >= cfg.player.maxHealth) continue; // lleno: se queda en el suelo
      player.health = Math.min(cfg.player.maxHealth, player.health + s.pickup.health);
      message = `+${s.pickup.health} SALUD`;
      playSound('salud');
    } else if (s.pickup.armor) {
      if (player.armor >= cfg.player.maxArmor) continue;
      player.armor = Math.min(cfg.player.maxArmor, player.armor + s.pickup.armor);
      message = `+${s.pickup.armor} ARMADURA`;
      playSound('salud');
    } else if (s.pickup.money) {
      player.money += s.pickup.money;
      player.stats.coins += s.pickup.money;
      message = `+${s.pickup.money} ORO`;
      playSound('moneda');
    } else if (s.pickup.ammo) {
      for (const w of Object.values(arsenal.weapons)) {
        w.reserve += Math.ceil(w.def.startReserve * cfg.ammoBoxFraction);
      }
      message = '+ MUNICIÓN';
      playSound('municion');
    }
    s.taken = true;
  }
  level.sprites = level.sprites.filter((s) => !s.taken);
  return message;
}

// Efectos temporales (chispas, sangre, explosiones): avanzan su animación y desaparecen.
export function updateEffects(level, dt, frameCount = 3) {
  for (const s of level.sprites) {
    if (s.life === undefined) continue;
    s.life -= dt;
    const frames = s.type === 'explosion' ? 4 : frameCount;
    const progress = 1 - s.life / s.maxLife; // 0 -> 1
    s.frame = Math.min(frames - 1, Math.floor(progress * frames));
  }
  level.sprites = level.sprites.filter((s) => s.life === undefined || s.life > 0);
}
