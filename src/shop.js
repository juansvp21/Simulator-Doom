// =============================================================
// shop.js — Pantallas entre niveles: resumen del nivel y tienda.
//
// Separamos dos cosas:
//  1) LA LÓGICA de compra (funciones puras que cambian player/arsenal y
//     devuelven true/false). No saben nada de HTML, así se pueden probar
//     y reutilizar.
//  2) LA INTERFAZ (HTML generado con template strings). Cada botón lleva
//     un data-action; un único listener (delegación de eventos) decide qué
//     compra hacer y vuelve a dibujar la tienda.
// =============================================================

import { giveWeapon, weaponStats } from './weapons.js';

// ---------------------------------------------------------
// 1) LÓGICA DE COMPRA
// ---------------------------------------------------------

export function upgradePrice(w, key, cfg) {
  const level = w.upgrades[key];
  const prices = cfg.upgrades[key].prices;
  if (level >= prices.length) return null; // ya está al máximo
  return Math.round(prices[level] * cfg.upgradeCost[w.id]);
}

function pay(player, price) {
  if (price == null || player.money < price) return false;
  player.money -= price;
  return true;
}

export function buyWeapon(player, arsenal, id, cfg) {
  if (arsenal.weapons[id]) return false;
  if (!pay(player, cfg.shop.weaponPrices[id])) return false;
  giveWeapon(arsenal, id, cfg);
  return true;
}

export function buyUpgrade(player, arsenal, id, key, cfg) {
  const w = arsenal.weapons[id];
  if (!w || !pay(player, upgradePrice(w, key, cfg))) return false;
  w.upgrades[key]++;
  return true;
}

export function buyAmmo(player, arsenal, id, cfg) {
  const w = arsenal.weapons[id];
  const pack = cfg.shop.ammo[id];
  if (!w || !pay(player, pack.price)) return false;
  w.reserve += pack.amount;
  return true;
}

export function buyMedkit(player, cfg) {
  if (player.health >= cfg.player.maxHealth) return false; // no gastes oro si estás lleno
  if (!pay(player, cfg.shop.medkit.price)) return false;
  player.health = Math.min(cfg.player.maxHealth, player.health + cfg.shop.medkit.amount);
  return true;
}

export function buyArmor(player, cfg) {
  if (player.armor >= cfg.player.maxArmor) return false;
  if (!pay(player, cfg.shop.armor.price)) return false;
  player.armor = Math.min(cfg.player.maxArmor, player.armor + cfg.shop.armor.amount);
  return true;
}

// ---------------------------------------------------------
// BONO DE FIN DE NIVEL
// ---------------------------------------------------------
export function computeLevelSummary(player, level, cfg) {
  const st = player.stats;
  const b = cfg.levelBonus;
  const accuracy = st.shots > 0 ? st.hits / st.shots : 0;
  const timeBonus = Math.max(0, Math.round((b.parTime - st.time) * b.timePerSecond));
  const accuracyBonus = Math.round(accuracy * b.accuracyMax);
  return {
    time: st.time,
    kills: st.kills,
    totalEnemies: level.enemies.length,
    accuracy,
    coins: st.coins,
    timeBonus,
    accuracyBonus,
  };
}

// ---------------------------------------------------------
// 2) INTERFAZ
// ---------------------------------------------------------

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function showSummary(panel, summary, levelNumber, onContinue) {
  panel.innerHTML = `
    <div class="screen summary">
      <h1>CÍRCULO ${levelNumber} SUPERADO</h1>
      <table>
        <tr><td>Tiempo</td><td>${fmtTime(summary.time)}</td></tr>
        <tr><td>Bajas</td><td>${summary.kills} / ${summary.totalEnemies}</td></tr>
        <tr><td>Precisión</td><td>${Math.round(summary.accuracy * 100)} %</td></tr>
        <tr><td>Oro recogido</td><td>${summary.coins}</td></tr>
        <tr class="bonus"><td>Bono por tiempo</td><td>+${summary.timeBonus}</td></tr>
        <tr class="bonus"><td>Bono por precisión</td><td>+${summary.accuracyBonus}</td></tr>
      </table>
      <button class="primary" data-action="continue">IR CON EL MERCADER ▶</button>
    </div>`;
  panel.classList.remove('hidden');
  panel.onclick = (e) => {
    if (e.target.closest('[data-action="continue"]')) onContinue();
  };
}

// Pips de nivel de mejora: ●●○
const pips = (level, max) => '●'.repeat(level) + '○'.repeat(max - level);

export function openShop(panel, player, arsenal, cfg, nextLevel, onContinue) {
  // Arma seleccionada en la columna de mejoras
  let selected = arsenal.current;
  let notice = '';

  function render() {
    const owned = Object.keys(cfg.weapons).filter((id) => arsenal.weapons[id]);
    if (!arsenal.weapons[selected]) selected = owned[0];
    const money = player.money;
    const btn = (action, price, label = `${price} ORO`, extra = '') =>
      `<button data-action="${action}" ${extra} ${price == null || money < price ? 'disabled' : ''}>${label}</button>`;

    // --- Armas ---
    const weaponRows = Object.entries(cfg.weapons).filter(([id]) => id !== 'pistola').map(([id, def]) => `
      <div class="row">
        <span class="name">${def.slot}. ${def.name}</span>
        ${arsenal.weapons[id]
          ? '<span class="owned">EN TU ARSENAL</span>'
          : btn(`weapon:${id}`, cfg.shop.weaponPrices[id])}
      </div>`).join('');

    // --- Mejoras del arma seleccionada ---
    const w = arsenal.weapons[selected];
    const now = weaponStats(w, cfg);
    const tabs = owned.map((id) =>
      `<button class="tab ${id === selected ? 'active' : ''}" data-action="select:${id}">${cfg.weapons[id].slot}</button>`).join('');
    const fmt = (key, v) => key === 'fireRate' ? `${v.toFixed(1)}/s` : key === 'reloadTime' ? `${v.toFixed(2)} s` : `${Math.round(v * 10) / 10}`;
    const upgradeRows = Object.entries(cfg.upgrades).map(([key, up]) => {
      const level = w.upgrades[key];
      const max = up.prices.length;
      const price = upgradePrice(w, key, cfg);
      // Vista previa: valor actual -> valor con el siguiente nivel
      let preview = fmt(key, now[key]);
      if (price != null) {
        w.upgrades[key]++;
        preview += ` → ${fmt(key, weaponStats(w, cfg)[key])}`;
        w.upgrades[key]--;
      }
      return `
        <div class="row">
          <span class="name">${up.label} <span class="pips">${pips(level, max)}</span><br><small>${preview}</small></span>
          ${price == null ? '<span class="owned">MÁXIMO</span>' : btn(`upgrade:${key}`, price)}
        </div>`;
    }).join('');

    // --- Suministros ---
    const ammoRows = owned.map((id) => {
      const pack = cfg.shop.ammo[id];
      return `
        <div class="row">
          <span class="name">Munición ${cfg.weapons[id].name.split(' ')[0]} +${pack.amount}<br><small>reserva: ${arsenal.weapons[id].reserve}</small></span>
          ${btn(`ammo:${id}`, pack.price)}
        </div>`;
    }).join('');
    const fullHealth = player.health >= cfg.player.maxHealth;
    const fullArmor = player.armor >= cfg.player.maxArmor;

    panel.innerHTML = `
      <div class="screen shop">
        <header>
          <h1>MERCADER DE ALMAS</h1>
          <div class="gold">ORO: ${money}</div>
        </header>
        <div class="cols">
          <section>
            <h2>ARMAS</h2>
            ${weaponRows}
          </section>
          <section>
            <h2>MEJORAS</h2>
            <div class="tabs">${tabs}</div>
            <div class="sub">${w.def.name}</div>
            ${upgradeRows}
          </section>
          <section>
            <h2>SUMINISTROS</h2>
            <div class="row">
              <span class="name">Botiquín +${cfg.shop.medkit.amount}<br><small>salud: ${Math.ceil(player.health)}/${cfg.player.maxHealth}</small></span>
              ${fullHealth ? '<span class="owned">LLENO</span>' : btn('medkit', cfg.shop.medkit.price)}
            </div>
            <div class="row">
              <span class="name">Armadura +${cfg.shop.armor.amount}<br><small>armadura: ${Math.ceil(player.armor)}/${cfg.player.maxArmor}</small></span>
              ${fullArmor ? '<span class="owned">LLENO</span>' : btn('armor', cfg.shop.armor.price)}
            </div>
            ${ammoRows}
          </section>
        </div>
        <footer>
          <span class="notice">${notice}</span>
          <button class="primary" data-action="continue">DESCENDER AL CÍRCULO ${nextLevel} ▶</button>
        </footer>
      </div>`;
  }

  // Un solo listener para todos los botones (delegación de eventos):
  // leemos data-action="tipo:argumento" del botón pulsado.
  panel.onclick = (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button || button.disabled) return;
    const [type, arg] = button.dataset.action.split(':');
    let ok = true;
    switch (type) {
      case 'weapon': ok = buyWeapon(player, arsenal, arg, cfg); notice = ok ? `¡${cfg.weapons[arg].name} comprada!` : ''; break;
      case 'upgrade': ok = buyUpgrade(player, arsenal, selected, arg, cfg); notice = ok ? `${cfg.upgrades[arg].label} mejorado` : ''; break;
      case 'ammo': ok = buyAmmo(player, arsenal, arg, cfg); notice = ok ? 'Munición comprada' : ''; break;
      case 'medkit': ok = buyMedkit(player, cfg); notice = ok ? 'Salud restaurada' : ''; break;
      case 'armor': ok = buyArmor(player, cfg); notice = ok ? 'Armadura reforzada' : ''; break;
      case 'select': selected = arg; break;
      case 'continue': onContinue(); return;
    }
    if (!ok) notice = 'No te alcanza el oro';
    render();
  };

  render();
  panel.classList.remove('hidden');
}

export function closePanel(panel) {
  panel.classList.add('hidden');
  panel.innerHTML = '';
  panel.onclick = null;
}
