// =============================================================
// input.js — Teclado y ratón.
// Usamos event.code (posición física de la tecla) en vez de event.key,
// así WASD funciona igual en teclados español, inglés, AZERTY...
//
// Dos formas de preguntar por una tecla:
//  - isDown(code):     ¿está pulsada AHORA? (para moverse, armas automáticas)
//  - wasPressed(code): ¿se pulsó en ESTE frame? (para disparar una vez, recargar)
// Los botones del ratón se tratan como teclas: 'Mouse0' = clic izquierdo.
// =============================================================

const keys = new Set();    // teclas pulsadas ahora mismo
const pressed = new Set(); // teclas que se pulsaron desde el último frame
let mouseDX = 0;           // movimiento horizontal acumulado del ratón
let wheel = 0;             // giros de la rueda del ratón (+1 abajo, -1 arriba)
let locked = false;        // ¿el ratón está capturado (Pointer Lock)?
let overlayEnabled = true; // en la tienda/resumen no mostramos "Haz clic para jugar"
let overlayEl = null;

function press(code) {
  if (!keys.has(code)) pressed.add(code); // ignora la auto-repetición del teclado
  keys.add(code);
}

export function initInput(canvas, overlay) {
  overlayEl = overlay;
  window.addEventListener('keydown', (e) => {
    press(e.code);
    // Evita que las flechas y el espacio hagan scroll en la página
    if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  // Si la ventana pierde el foco, soltamos todo (si no, la tecla queda "pegada")
  window.addEventListener('blur', () => keys.clear());

  // Pointer Lock: oculta el cursor y nos da movimiento relativo infinito.
  // El navegador solo lo permite tras un clic del usuario.
  // Mientras se elige en el menú inicial (clase "choosing"), un clic en el
  // fondo no debe empezar a jugar: solo los botones del menú lo hacen.
  overlay.addEventListener('click', () => {
    if (!overlay.classList.contains('choosing')) canvas.requestPointerLock();
  });

  document.addEventListener('mousedown', (e) => {
    if (!locked) {
      if (e.target === canvas) canvas.requestPointerLock();
      return; // el clic que captura el ratón no dispara
    }
    press(`Mouse${e.button}`);
  });
  document.addEventListener('mouseup', (e) => keys.delete(`Mouse${e.button}`));

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    overlay.classList.toggle('hidden', locked || !overlayEnabled);
    if (!locked) keys.clear();
  });

  document.addEventListener('mousemove', (e) => {
    if (locked) mouseDX += e.movementX;
  });

  document.addEventListener('wheel', (e) => {
    if (locked) wheel += Math.sign(e.deltaY);
  });
}

export function isDown(code) {
  return keys.has(code);
}

export function wasPressed(code) {
  return pressed.has(code);
}

// Se llama al final de cada frame: lo "recién pulsado" deja de serlo.
export function endFrame() {
  pressed.clear();
}

// Devuelve el movimiento del ratón desde la última llamada y lo reinicia.
export function consumeMouseDX() {
  const dx = mouseDX;
  mouseDX = 0;
  return dx;
}

// Devuelve los giros de la rueda desde la última llamada y los reinicia.
export function consumeWheel() {
  const w = wheel;
  wheel = 0;
  return w;
}

// La tienda y el resumen sueltan el ratón a propósito: ahí no queremos
// el aviso de "Haz clic para jugar".
export function setOverlayEnabled(enabled) {
  overlayEnabled = enabled;
  if (overlayEl) overlayEl.classList.toggle('hidden', locked || !enabled);
}

export function isPointerLocked() {
  return locked;
}
