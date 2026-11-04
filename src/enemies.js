// =============================================================
// enemies.js — Enemigos: IA por estados, movimiento, ataques y muerte.
//
// MÁQUINA DE ESTADOS
// Cada enemigo está SIEMPRE en uno de estos estados y solo cambia de uno
// a otro cuando se cumple una condición:
//
//   patrol ──(te ve / oye un disparo / recibe daño)──> chase
//   chase  ──(estás a su alcance y puede atacar)─────> attack
//   attack ──(termina el golpe o el lanzamiento)─────> chase
//   chase  ──(lleva un rato sin verte)───────────────> patrol
//   cualquiera ──(vida <= 0)─────────────────────────> dead
//
// Separar la lógica así evita un montón de "if" mezclados y hace fácil
// añadir comportamientos nuevos (jefes, ángeles...) en fases futuras.
// =============================================================

import { castRay, getTile, isWall } from './map.js';
import { ENEMY_FRAME } from './textures.js';

export function createEnemy(type, x, y, cfg) {
  const def = cfg.enemies[type];
  return {
    type, def, x, y,
    homeX: x, homeY: y,            // punto de inicio (centro de su patrulla)
    radius: def.radius,
    health: def.health,
    state: 'patrol',
    solid: true,
    cooldown: 0,                   // tiempo hasta poder volver a atacar
    attackT: 0,                    // cuenta atrás del "aviso" del ataque
    painT: 0,                      // > 0 mientras está aturdido
    deathT: 0,
    lostT: 0,                      // segundos sin ver al jugador
    patrolX: x, patrolY: y, patrolT: 0,
    lastSeenX: x, lastSeenY: y,
    animT: Math.random(),          // desfase para que no caminen sincronizados
    moving: false,
    frame: ENEMY_FRAME.WALK1,
  };
}

// -------------------------------------------------------------
// LÍNEA DE VISIÓN
// Lanzamos un rayo del enemigo al jugador. Si no choca con ninguna pared
// antes de llegar, el enemigo te ve. castRay devuelve hit:false cuando la
// primera pared está más lejos que maxDist (la distancia al jugador).
// -------------------------------------------------------------
export function canSee(map, from, to, range) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d < 0.01) return true;
  return !castRay(map, from.x, from.y, dx / d, dy / d, d).hit;
}

// ¿Puede ir en LÍNEA RECTA hasta el jugador sin chocar?
// Ver al jugador no basta: el rayo del centro puede pasar rozando el borde
// de una puerta mientras su cuerpo (que tiene radio) choca con la pared.
// Por eso lanzamos dos rayos más, desplazados a izquierda y derecha.
function clearPath(map, e, player) {
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.01) return true;
  const ux = dx / d, uy = dy / d;
  const ox = -uy * e.radius, oy = ux * e.radius; // perpendicular, largo = radio
  return !castRay(map, e.x + ox, e.y + oy, ux, uy, d).hit &&
         !castRay(map, e.x - ox, e.y - oy, ux, uy, d).hit;
}

// -------------------------------------------------------------
// FLOW FIELD (mapa de rutas) con BFS
// Desde la casilla del jugador hacemos una búsqueda en anchura: cada casilla
// libre guarda cuántos pasos hay hasta el jugador. Para perseguirte, un
// enemigo solo tiene que moverse a la casilla vecina con el número más bajo.
// Así rodean paredes sin quedarse atascados, y un solo cálculo sirve para
// todos los enemigos a la vez.
// -------------------------------------------------------------
function computeFlow(map, player) {
  const { width, height } = map;
  const dist = new Int16Array(width * height).fill(-1); // -1 = sin visitar
  const start = Math.floor(player.y) * width + Math.floor(player.x);
  const queue = [start];
  dist[start] = 0;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % width;
    const y = (i / width) | 0;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const ni = ny * width + nx;
      if (dist[ni] !== -1 || map.grid[ny][nx] !== 0) continue;
      dist[ni] = dist[i] + 1;
      queue.push(ni);
    }
  }
  return { dist, width };
}

// Devuelve el centro de la casilla vecina más cercana al jugador según el flow field.
function flowTarget(flow, e) {
  const cx = Math.floor(e.x);
  const cy = Math.floor(e.y);
  let best = null;
  let bestD = flow.dist[cy * flow.width + cx];
  if (bestD < 0) bestD = Infinity;
  for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
    const d = flow.dist[ny * flow.width + nx];
    if (d >= 0 && d < bestD) { bestD = d; best = [nx + 0.5, ny + 0.5]; }
  }
  return best;
}

// -------------------------------------------------------------
// MOVIMIENTO CON COLISIONES (igual que el jugador: eje por eje)
// -------------------------------------------------------------
function canEnemyStand(level, player, e, x, y) {
  const r = e.radius;
  const map = level.map;
  if (isWall(map, x - r, y - r) || isWall(map, x + r, y - r) ||
      isWall(map, x - r, y + r) || isWall(map, x + r, y + r)) return false;
  for (const s of level.sprites) {
    if (s.solid && Math.hypot(x - s.x, y - s.y) < r + s.radius) return false;
  }
  // No se mete dentro del jugador
  if (Math.hypot(x - player.x, y - player.y) < r + player.radius) return false;
  return true;
}

// Intenta avanzar hacia (tx, ty). Devuelve true si se movió algo.
function moveToward(level, player, e, tx, ty, speed, dt) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.05) return false;
  const step = Math.min(d, speed * dt);
  const mx = (dx / d) * step;
  const my = (dy / d) * step;
  let moved = false;
  if (canEnemyStand(level, player, e, e.x + mx, e.y)) { e.x += mx; moved = true; }
  if (canEnemyStand(level, player, e, e.x, e.y + my)) { e.y += my; moved = true; }
  return moved;
}

// Empuja a los enemigos que se solapan para que no se amontonen en un punto.
function separate(level, player) {
  const alive = level.enemies.filter((e) => e.state !== 'dead');
  for (let i = 0; i < alive.length; i++) {
    for (let j = i + 1; j < alive.length; j++) {
      const a = alive[i], b = alive[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 0.001;
      const overlap = a.radius + b.radius - d;
      if (overlap <= 0) continue;
      const px = (dx / d) * overlap * 0.5;
      const py = (dy / d) * overlap * 0.5;
      if (canEnemyStand(level, player, a, a.x - px, a.y - py)) { a.x -= px; a.y -= py; }
      if (canEnemyStand(level, player, b, b.x + px, b.y + py)) { b.x += px; b.y += py; }
    }
  }
}

// Elige un punto libre al azar cerca de su casa para patrullar.
function pickPatrolTarget(map, e, cfg) {
  for (let tries = 0; tries < 8; tries++) {
    const r = cfg.ai.patrolRadius;
    const x = Math.floor(e.homeX + (Math.random() * 2 - 1) * r) + 0.5;
    const y = Math.floor(e.homeY + (Math.random() * 2 - 1) * r) + 0.5;
    if (getTile(map, x, y) === 0) {
      e.patrolX = x; e.patrolY = y;
      break;
    }
  }
  e.patrolT = 2 + Math.random() * 3;
}

// -------------------------------------------------------------
// DAÑO
// -------------------------------------------------------------
export function damageEnemy(e, amount, player, cfg) {
  if (e.state === 'dead') return;
  e.health -= amount;
  e.painT = cfg.ai.painTime;
  e.attackT = 0; // el dolor interrumpe el ataque que estaba preparando
  if (e.state === 'attack') e.state = 'chase';
  if (e.health <= 0) {
    e.state = 'dead';
    e.solid = false;
    e.deathT = 0;
    player.stats.kills++;
    return;
  }
  // Si le disparan mientras patrulla, va a por el jugador
  if (e.state === 'patrol') e.state = 'chase';
  e.lastSeenX = player.x; e.lastSeenY = player.y; e.lostT = 0;
}

export function damagePlayer(player, amount, cfg) {
  if (player.dead) return;
  // La armadura absorbe una parte del daño mientras le quede
  const absorbed = Math.min(player.armor, amount * cfg.player.armorAbsorb);
  player.armor -= absorbed;
  player.health -= amount - absorbed;
  player.hurtT = cfg.player.hurtFlash;
  if (player.health <= 0) {
    player.health = 0;
    player.dead = true;
  }
}

// Los disparos hacen ruido: alertan a los enemigos cercanos aunque no te vean.
export function alertEnemies(level, player, cfg) {
  for (const e of level.enemies) {
    if (e.state !== 'patrol') continue;
    if (Math.hypot(e.x - player.x, e.y - player.y) < cfg.ai.hearRange) {
      e.state = 'chase';
      e.lastSeenX = player.x; e.lastSeenY = player.y; e.lostT = 0;
    }
  }
}

// -------------------------------------------------------------
// HITSCAN CONTRA ENEMIGOS
// Para cada enemigo vivo, proyectamos su posición sobre la línea del disparo:
//   t    = producto escalar  (rel · dir)  -> qué tan adelante está
//   perp = producto cruzado  |rel × dir|  -> qué tan lejos de la línea está
// Le damos si está delante (t > 0), antes que la pared (t < maxDist) y la
// línea pasa a menos de su radio (perp < radius). Gana el más cercano.
// -------------------------------------------------------------
export function hitscanEnemy(level, x, y, dx, dy, maxDist) {
  let best = null;
  let bestT = maxDist;
  for (const e of level.enemies) {
    if (e.state === 'dead') continue;
    const rx = e.x - x;
    const ry = e.y - y;
    const t = rx * dx + ry * dy;
    if (t <= 0 || t >= bestT) continue;
    const perp = Math.abs(rx * dy - ry * dx);
    if (perp < e.radius) { best = e; bestT = t; }
  }
  return best ? { enemy: best, dist: bestT } : null;
}

// Igual que hitscanEnemy pero devuelve TODOS los enemigos en la línea
// (para el rayo del Cetro del Abismo, que los atraviesa).
export function hitscanAllEnemies(level, x, y, dx, dy, maxDist) {
  const hits = [];
  for (const e of level.enemies) {
    if (e.state === 'dead') continue;
    const rx = e.x - x;
    const ry = e.y - y;
    const t = rx * dx + ry * dy;
    if (t <= 0 || t >= maxDist) continue;
    if (Math.abs(rx * dy - ry * dx) < e.radius) hits.push({ enemy: e, dist: t });
  }
  return hits;
}

// -------------------------------------------------------------
// EXPLOSIÓN (cohetes)
// Daño en área con caída lineal: máximo en el centro y 0 en el borde.
//   daño = splash * (1 - distancia / radio)
// Las paredes protegen: si hay una pared entre la explosión y el objetivo
// (lo comprobamos con castRay), no le llega.
// -------------------------------------------------------------
export function explode(level, player, x, y, splash, cfg) {
  spawnEffect(level, 'explosion', x, y, cfg.fx.explosionLife);
  level.lightT = cfg.fx.explosionLife; // la explosión ilumina la escena

  const reaches = (tx, ty) => {
    const d = Math.hypot(tx - x, ty - y);
    if (d >= splash.radius) return 0;
    if (d > 0.01 && castRay(level.map, x, y, (tx - x) / d, (ty - y) / d, d).hit) return 0;
    return splash.damage * (1 - d / splash.radius);
  };

  for (const e of level.enemies) {
    if (e.state === 'dead') continue;
    const dmg = reaches(e.x, e.y);
    if (dmg > 0) damageEnemy(e, dmg, player, cfg);
  }
  const selfDmg = reaches(player.x, player.y) * splash.self;
  if (selfDmg > 0) damagePlayer(player, selfDmg, cfg);
}

// -------------------------------------------------------------
// ACTUALIZACIÓN POR FRAME
// -------------------------------------------------------------
export function updateEnemies(level, player, dt, cfg) {
  // El mapa de rutas se recalcula cada poco, no en cada frame (ahorra CPU)
  level.flowT = (level.flowT ?? 0) - dt;
  if (level.flowT <= 0 || !level.flow) {
    level.flow = computeFlow(level.map, player);
    level.flowT = cfg.ai.flowInterval;
  }

  for (const e of level.enemies) {
    if (e.state === 'dead') {
      // Al morir suelta su oro (una sola vez)
      if (!e.dropped) {
        e.dropped = true;
        const value = cfg.coins[e.type] ?? 0;
        if (value > 0) {
          level.sprites.push({ type: 'moneda', x: e.x, y: e.y, solid: false, radius: 0, pickup: { money: value } });
        }
      }
      e.deathT += dt;
      const step = Math.floor(e.deathT / cfg.ai.deathFrameTime);
      e.frame = Math.min(ENEMY_FRAME.CORPSE, ENEMY_FRAME.DEATH1 + step);
      continue;
    }
    updateEnemy(level, player, e, dt, cfg);
  }
  separate(level, player);
}

function updateEnemy(level, player, e, dt, cfg) {
  const def = e.def;
  e.cooldown = Math.max(0, e.cooldown - dt);
  e.painT = Math.max(0, e.painT - dt);
  e.moving = false;

  const dist = Math.hypot(player.x - e.x, player.y - e.y);
  const sees = !player.dead && canSee(level.map, e, player, def.sightRange);
  if (sees) {
    e.lastSeenX = player.x; e.lastSeenY = player.y; e.lostT = 0;
  } else {
    e.lostT += dt;
  }

  // Aturdido por el dolor: no hace nada este frame
  if (e.painT > 0) {
    e.frame = ENEMY_FRAME.PAIN;
    return;
  }

  switch (e.state) {
    case 'patrol': {
      if (sees) { e.state = 'chase'; break; }
      e.patrolT -= dt;
      const arrived = Math.hypot(e.patrolX - e.x, e.patrolY - e.y) < 0.1;
      if (arrived || e.patrolT <= 0) pickPatrolTarget(level.map, e, cfg);
      e.moving = moveToward(level, player, e, e.patrolX, e.patrolY, def.speed * cfg.ai.patrolSpeed, dt);
      break;
    }

    case 'chase': {
      if (player.dead || e.lostT > cfg.ai.loseSightTime) {
        e.state = 'patrol';
        e.homeX = e.x; e.homeY = e.y; // patrulla donde se quedó
        pickPatrolTarget(level.map, e, cfg);
        break;
      }
      // ¿Puede atacar?
      if (sees && dist <= def.attackRange && e.cooldown <= 0) {
        e.state = 'attack';
        e.attackT = def.attackWindup;
        break;
      }
      // El demonio no necesita acercarse tanto: se queda a distancia de tiro
      const stopDist = def.ranged ? def.preferDist : 0;
      if (sees && dist <= stopDist) break;

      if (sees && clearPath(level.map, e, player)) {
        // Camino libre: va directo hacia ti
        e.moving = moveToward(level, player, e, player.x, player.y, def.speed, dt);
      } else {
        // Hay paredes de por medio: sigue el flow field (las rodea)
        const t = flowTarget(level.flow, e);
        if (t) e.moving = moveToward(level, player, e, t[0], t[1], def.speed, dt);
      }
      break;
    }

    case 'attack': {
      e.attackT -= dt;
      if (e.attackT > 0) break; // todavía "avisando"
      if (def.ranged) {
        if (sees) shootFireball(level, e, player, cfg);
      } else if (sees && dist <= def.attackRange * 1.3) {
        // Golpe cuerpo a cuerpo: un poco de margen por si te alejaste un pelín
        damagePlayer(player, def.damage, cfg);
      }
      e.cooldown = def.attackCooldown;
      e.state = 'chase';
      break;
    }
  }

  // Fotograma según lo que está haciendo
  if (e.state === 'attack') e.frame = ENEMY_FRAME.ATTACK;
  else if (e.moving) {
    e.animT += dt;
    e.frame = Math.floor(e.animT * 4) % 2 ? ENEMY_FRAME.WALK2 : ENEMY_FRAME.WALK1;
  } else e.frame = ENEMY_FRAME.WALK1;
}

// -------------------------------------------------------------
// PROYECTILES (bolas de fuego)
// A diferencia de las balas del jugador, estas SÍ viajan: se ven venir y
// se pueden esquivar.
// -------------------------------------------------------------
function shootFireball(level, e, player, cfg) {
  const dx = player.x - e.x;
  const dy = player.y - e.y;
  const d = Math.hypot(dx, dy) || 1;
  level.projectiles.push({
    type: 'bolaFuego',
    x: e.x + (dx / d) * (e.radius + 0.1),
    y: e.y + (dy / d) * (e.radius + 0.1),
    dx: dx / d,
    dy: dy / d,
    speed: e.def.projectileSpeed,
    damage: e.def.damage,
    radius: 0.15,
  });
}

// Bolas de fuego (enemigos) y cohetes (jugador).
// Cada proyectil solo choca con el "otro bando": las bolas de fuego con el
// jugador y los cohetes con los enemigos. Ambos chocan con paredes.
export function updateProjectiles(level, player, dt, cfg) {
  for (const p of level.projectiles) {
    // Avanzamos en sub-pasos cortos para que un proyectil rápido no
    // "salte" por encima de una pared delgada o de un enemigo en un frame.
    const dist = p.speed * dt;
    const steps = Math.max(1, Math.ceil(dist / 0.1));
    for (let i = 0; i < steps && !p.done; i++) {
      p.x += (p.dx * dist) / steps;
      p.y += (p.dy * dist) / steps;
      projectileHit(level, player, p, cfg);
    }
  }
  level.projectiles = level.projectiles.filter((p) => !p.done);
}

function projectileHit(level, player, p, cfg) {
  const backX = p.x - p.dx * 0.1; // punto un poco antes del impacto
  const backY = p.y - p.dy * 0.1;
  let hitEnemy = null;
  if (p.owner === 'player') {
    hitEnemy = level.enemies.find((e) => e.state !== 'dead' && Math.hypot(p.x - e.x, p.y - e.y) < p.radius + e.radius);
  }
  const hitWall = isWall(level.map, p.x, p.y);
  const hitPlayer = p.owner !== 'player' && !player.dead &&
    Math.hypot(p.x - player.x, p.y - player.y) < p.radius + player.radius;
  if (!hitWall && !hitEnemy && !hitPlayer) return;

  p.done = true;
  if (p.owner === 'player') {
    if (hitEnemy) { damageEnemy(hitEnemy, p.damage, player, cfg); player.stats.hits++; }
    explode(level, player, backX, backY, p.splash, cfg);
  } else if (hitPlayer) {
    damagePlayer(player, p.damage, cfg);
  } else {
    spawnEffect(level, 'chispa', backX, backY, cfg.fx.sparkLife);
  }
}

// Efecto temporal (chispa, sangre). updateEffects en weapons.js lo anima y lo borra.
export function spawnEffect(level, type, x, y, life) {
  level.sprites.push({ type, x, y, solid: false, radius: 0, life, maxLife: life, frame: 0 });
}
