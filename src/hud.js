// =============================================================
// hud.js — Todo lo que se dibuja ENCIMA de la escena 3D:
// el arma en primera persona, la mira y la barra inferior.
// Se dibuja con la API normal de canvas 2D después de putImageData.
// =============================================================

// ---------------------------------------------------------
// ARMA EN PRIMERA PERSONA
// Su posición combina tres movimientos:
//  - Balanceo al caminar: x = cos(fase), y = |sin(fase)|  -> dibuja un "∪"
//  - Retroceso: sube de golpe al disparar y baja suavemente
//  - Recarga: baja fuera de la pantalla y vuelve (curva seno de 0 a π)
// ---------------------------------------------------------
export function drawWeapon(ctx, weapon, player, assets, cfg) {
  const W = cfg.render.width;
  const H = cfg.render.height;
  const fx = cfg.fx;
  const art = assets.viewModels[weapon.id];
  const img = weapon.flashT > 0 ? art.flash : art.idle;

  const bob = player.moving ? fx.bobAmount : 0;
  const bobX = Math.cos(player.walkPhase) * bob;
  const bobY = Math.abs(Math.sin(player.walkPhase)) * bob;

  const recoil = (weapon.recoilT / fx.recoilTime) * fx.recoilKick; // 1 -> 0
  let reloadDrop = 0;
  if (weapon.reloadT > 0) {
    const progress = 1 - weapon.reloadT / weapon.def.reloadTime; // 0 -> 1
    reloadDrop = Math.sin(progress * Math.PI) * 90;
  }

  // El arte se agranda sin suavizar para mantener los píxeles nítidos
  const scale = cfg.fx.weaponScale;
  const w = img.width * scale;
  const h = img.height * scale;
  const x = Math.round(W / 2 - w / 2 + 40 + bobX);
  const y = Math.round(H - cfg.hud.height - h + 50 + bobY - recoil + reloadDrop);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, y, w, h);
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
export function drawEnemyCounter(ctx, level, cfg) {
  const alive = level.enemies.filter((e) => e.state !== 'dead').length;
  ctx.textAlign = 'right';
  ctx.font = 'bold 12px monospace';
  ctx.fillStyle = alive ? '#ffcc66' : '#7aff7a';
  ctx.fillText(alive ? `ENEMIGOS ${alive}/${level.enemies.length}` : 'ZONA LIMPIA', cfg.render.width - 8, 16);
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------
// BARRA INFERIOR
// ---------------------------------------------------------
export function drawHUD(ctx, player, weapon, cfg, time) {
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

  // El nombre del arma es largo: fuente más pequeña
  ctx.fillStyle = '#ffcc66';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(weapon.def.name, (sections[2] + sections[3]) / 2, top + 34);

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
