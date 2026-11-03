// =============================================================
// input.js — Teclado y ratón.
// Usamos event.code (posición física de la tecla) en vez de event.key,
// así WASD funciona igual en teclados español, inglés, AZERTY...
// =============================================================

const keys = new Set();   // teclas pulsadas ahora mismo
let mouseDX = 0;          // movimiento horizontal acumulado del ratón
let locked = false;       // ¿el ratón está capturado (Pointer Lock)?

export function initInput(canvas, overlay) {
  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    // Evita que las flechas hagan scroll en la página
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  // Si la ventana pierde el foco, soltamos todo (si no, la tecla queda "pegada")
  window.addEventListener('blur', () => keys.clear());

  // Pointer Lock: oculta el cursor y nos da movimiento relativo infinito.
  // El navegador solo lo permite tras un clic del usuario.
  overlay.addEventListener('click', () => canvas.requestPointerLock());
  canvas.addEventListener('click', () => {
    if (!locked) canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
    overlay.classList.toggle('hidden', locked);
  });

  document.addEventListener('mousemove', (e) => {
    if (locked) mouseDX += e.movementX;
  });
}

export function isDown(code) {
  return keys.has(code);
}

// Devuelve el movimiento del ratón desde la última llamada y lo reinicia.
export function consumeMouseDX() {
  const dx = mouseDX;
  mouseDX = 0;
  return dx;
}
