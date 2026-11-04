// =============================================================
// hud.js — Todo lo que se dibuja ENCIMA de la escena 3D:
// el arma en primera persona, la mira y la barra inferior.
// Se dibuja con la API normal de canvas 2D después de putImageData.
// =============================================================

import { weaponStats } from './weapons.js';

// ---------------------------------------------------------
// ARMA EN PRIMERA PERSONA
// Su posición combina tres movimientos:
//  - Balanceo al caminar: x = cos(fase), y = |sin(fase)|  -> dibuja un "∪"
//  - Retroceso: sube de golpe al disparar y baja suavemente
//  - Recarga: baja fuera de la pantalla y vuelve (curva seno de 0 a π)
// ---------------------------------------------------------
//  - Cambio de arma: baja la vieja y sube la nueva (forma de "V" en el tiempo)
export function drawWeapon(ctx, arsenal, player, assets, cfg) {
  const W = cfg.render.width;
  const H = cfg.render.height;
  const fx = cfg.fx;
  const weapon = arsenal.weapons[arsenal.current];
  const art = assets.viewModels[weapon.id];
  const img = weapon.flashT > 0 ? art.flash : art.idle;

  const bob = player.moving ? fx.bobAmount : 0;
  const bobX = Math.cos(player.walkPhase) * bob;
  const bobY = Math.abs(Math.sin(player.walkPhase)) * bob;

  const recoil = (weapon.recoilT / fx.recoilTime) * fx.recoilKick; // 1 -> 0
  let reloadDrop = 0;
  if (weapon.reloadT > 0) {
    const progress = 1 - weapon.reloadT / weaponStats(weapon, cfg).reloadTime; // 0 -> 1
    reloadDrop = Math.sin(progress * Math.PI) * 90;
  }
  if (arsenal.switchT > 0) {
    // 1 -> 0 -> 1 a lo largo del cambio: |2t - 1| invertido
    const t = arsenal.switchT / fx.switchTime;
    reloadDrop += (1 - Math.abs(2 * t - 1)) * 160;
  }

  // El arte se agranda sin suavizar para mantener los píxeles nítidos
  const scale = cfg.fx.weaponScale;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = Math.round(W / 2 - w / 2 + 40 + bobX);
  const y = Math.round(H - cfg.hud.height - h + 50 + bobY - recoil + reloadDrop);
  ctx.imageSmoothingEnabled = false;

  // Rayo del Cetro del Abismo: del orbe al centro de la pantalla, se desvanece
  if (weapon.beamT > 0) {
    const a = weapon.beamT / fx.beamTime;
    const fromX = x + w / 2;
    const fromY = y + 30 * scale;
    const toX = W / 2;
    const toY = H / 2;
    ctx.lineCap = 'round';
    for (const [width, color] of [[14, `rgba(150, 40, 220, ${0.5 * a})`], [6, `rgba(210, 130, 255, ${a})`], [2, `rgba(255, 255, 255, ${a})`]]) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width * a + 1;
      ctx.beginPath(); ctx.moveTo(fromX, fromY); ctx.lineTo(toX, toY); ctx.stroke();
    }
  }
  ctx.drawImage(img, x, y, w, h);
}

// Aviso temporal en la parte superior (p. ej. al recoger un arma)
export function drawMessage(ctx, text, alpha, cfg) {
  if (!text || alpha <= 0) return;
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = `rgba(0, 0, 0, ${0.6 * alpha})`;
  ctx.fillText(text, cfg.render.width / 2 + 1, 41);
  ctx.fillStyle = `rgba(255, 216, 74, ${alpha})`;
  ctx.fillText(text, cfg.render.width / 2, 40);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------
// MIRA: se abre un poco durante el retroceso.
// ---------------------------------------------------------
export function drawCrosshair(ctx, weapon, cfg) {
  const cx = cfg.render.width / 2;
  const cy = cfg.render.height / 2;
  const gap = 3 + (weapon.recoilT / cfg.fx.recoilTime) * 5;
  const len = 4;
  const bar = (x, y, w, h) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#f0e0c0';
    ctx.fillRect(x, y, w, h);
  };
  bar(cx - gap - len, cy, len, 1);
  bar(cx + gap + 1, cy, len, 1);
  bar(cx, cy - gap - len, 1, len);
  bar(cx, cy + gap + 1, 1, len);
  ctx.fillStyle = '#ff3010';
  ctx.fillRect(cx, cy, 1, 1);
}

// ---------------------------------------------------------
// DAÑO Y MUERTE
// Destello rojo que se desvanece cuando te golpean, y pantalla de muerte.
// ---------------------------------------------------------
export function drawDamage(ctx, player, cfg) {
  const W = cfg.render.width;
  const H = cfg.render.height;
  if (player.hurtT > 0) {
    ctx.fillStyle = `rgba(200, 0, 0, ${(player.hurtT / cfg.player.hurtFlash) * 0.45})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (player.dead) {
    ctx.fillStyle = 'rgba(60, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff3a1a';
    ctx.font = 'bold 40px monospace';
    ctx.fillText('HAS CAÍDO', W / 2, H / 2 - 20);
    ctx.fillStyle = '#ffcc66';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Pulsa R para volver a intentarlo', W / 2, H / 2 + 14);
    ctx.textAlign = 'left';
  }
}

// Contador de enemigos en la esquina superior derecha
export function drawEnemyCounter(ctx, level, levelNumber, cfg) {
  const alive = level.enemies.filter((e) => e.state !== 'dead').length;
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = '#c0503a';
  ctx.fillText(`CÍRCULO ${levelNumber}`, cfg.render.width - 8, 16);
  ctx.fillStyle = alive ? '#ffcc66' : '#7aff7a';
  ctx.fillText(alive ? `ENEMIGOS ${alive}/${level.enemies.length}` : 'PORTAL ABIERTO', cfg.render.width - 8, 30);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------
// BARRA INFERIOR
// ---------------------------------------------------------
export function drawHUD(ctx, player, arsenal, cfg, time) {
  const weapon = arsenal.weapons[arsenal.current];
  const W = cfg.render.width;
  const H = cfg.render.height;
  const h = cfg.hud.height;
  const top = H - h;

  // Fondo: piedra oscura con borde rojo
  const grad = ctx.createLinearGradient(0, top, 0, H);
  grad.addColorStop(0, '#2a1310');
  grad.addColorStop(1, '#120806');
  ctx.fillStyle = grad;
  ctx.fillRect(0, top, W, h);
  ctx.fillStyle = '#8a1e12';
  ctx.fillRect(0, top, W, 2);

  // Separadores entre secciones
  const sections = [0, 120, 250, 410, 540, W];
  ctx.fillStyle = '#4a1a12';
  for (const sx of sections.slice(1, -1)) ctx.fillRect(sx, top + 6, 2, h - 10);

  const box = (i, label, value, color = '#ffcc66') => {
    const cx = (sections[i] + sections[i + 1]) / 2;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c0503a';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(label, cx, top + 15);
    ctx.fillStyle = color;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(value, cx, top + 37);
  };

  // La vida parpadea en rojo cuando está baja
  const low = player.health <= cfg.hud.lowHealth;
  const healthColor = low && Math.floor(time * 4) % 2 ? '#ff2a10' : '#ffcc66';
  box(0, 'SALUD', `${Math.ceil(player.health)}%`, healthColor);
  box(1, 'ARMADURA', `${Math.ceil(player.armor)}%`);
  box(2, 'ARMA', '', '#ffcc66');
  box(3, 'MUNICIÓN', `${weapon.mag} / ${weapon.reserve}`, weapon.mag === 0 ? '#ff2a10' : '#ffcc66');
  box(4, 'ORO', `${player.money}`, '#ffd84a');

  // Nombre del arma (fuente pequeña: algunos nombres son largos)
  const armaX = (sections[2] + sections[3]) / 2;
  ctx.fillStyle = '#ffcc66';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(weapon.def.name, armaX, top + 27);

  // Ranuras 1-5: actual en rojo, las que tienes en amarillo, las demás apagadas
  ctx.font = 'bold 10px monospace';
  for (const [id, def] of Object.entries(cfg.weapons)) {
    const sx = armaX + (def.slot - 3) * 16;
    const owned = Boolean(arsenal.weapons[id]);
    const isCurrent = arsenal.current === id;
    if (isCurrent) {
      ctx.fillStyle = '#8a1e12';
      ctx.fillRect(sx - 6, top + 31, 12, 11);
    }
    ctx.fillStyle = isCurrent ? '#fff2c0' : owned ? '#ffcc66' : '#4a2a20';
    ctx.fillText(String(def.slot), sx, top + 40);
  }

  // Mensajes sobre la barra
  ctx.font = 'bold 14px monospace';
  if (weapon.reloadT > 0) {
    ctx.fillStyle = '#ffcc66';
    ctx.fillText('RECARGANDO...', W / 2, top - 12);
  } else if (weapon.messageT > 0) {
    ctx.fillStyle = '#ff2a10';
    ctx.fillText('SIN BALAS', W / 2, top - 12);
  }
  ctx.textAlign = 'left';
}
