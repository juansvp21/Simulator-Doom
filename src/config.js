// =============================================================
// config.js — TODOS los valores ajustables del juego.
// Cambia números aquí sin tocar la lógica.
// =============================================================

export const CONFIG = {
  render: {
    width: 640,   // resolución interna (luego CSS la agranda con píxeles nítidos)
    height: 400,
    fov: 66,      // campo de visión horizontal en grados
    maxRaySteps: 64, // seguridad: máximo de casillas que recorre un rayo
  },

  player: {
    startX: 2.5,       // posición inicial (en casillas; .5 = centro de la casilla)
    startY: 2.5,
    startAngle: 0,     // radianes. 0 = mirando al este (+x)
    moveSpeed: 3.0,    // casillas por segundo
    turnSpeed: 2.5,    // radianes por segundo (flechas)
    mouseSensitivity: 0.0025, // radianes por píxel de ratón
    radius: 0.2,       // "grosor" del jugador para las colisiones (debe ser < 0.5)
  },

  // Delta time máximo: si el juego se congela (cambio de pestaña),
  // evitamos un salto enorme que atravesaría paredes.
  maxDeltaTime: 0.1,

  colors: {
    ceiling: [40, 36, 48],
    floor: [70, 58, 46],
    // Color de cada tipo de pared según su número en el mapa
    walls: {
      1: [150, 150, 150], // piedra gris
      2: [160, 50, 40],   // ladrillo rojo
      3: [60, 110, 60],   // musgo verde
      4: [70, 80, 160],   // metal azul
    },
    sideShade: 0.65, // multiplicador para las caras norte/sur (más oscuras)
  },
};
