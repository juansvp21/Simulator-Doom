// =============================================================
// save.js — Progreso guardado en localStorage.
//
// localStorage solo guarda TEXTO, así que convertimos el objeto a JSON
// (JSON.stringify) al guardar y de vuelta (JSON.parse) al cargar.
// Guardamos al EMPEZAR cada círculo: si cierras el navegador a mitad de
// un nivel, "Continuar" te lleva al inicio de ese nivel con lo que tenías.
//
// Todo va en try/catch: en modo incógnito o con el almacenamiento lleno
// o bloqueado, localStorage puede lanzar errores. El juego debe seguir
// funcionando aunque no se pueda guardar.
// =============================================================

const KEY = 'simulator-doom-partida';
const VERSION = 1; // si cambia el formato, las partidas viejas se ignoran

// data = { levelIndex, money, health, armor, arsenal }
export function saveGame(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: Date.now(), ...data }));
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Validación mínima: si falta algo importante, mejor empezar de cero
    if (data.version !== VERSION || typeof data.levelIndex !== 'number' || !data.arsenal) return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada que hacer
  }
}
