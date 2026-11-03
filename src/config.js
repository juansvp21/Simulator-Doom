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
    lavaSpeed: 12,   // texels por segundo que "fluye" la lava de las paredes
    spriteFps: 8,    // velocidad de animación de sprites (braseros)
  },

  // Niebla roja del inframundo: lo lejano se funde con este color.
  fog: {
    color: [28, 4, 4],
    density: 0.16,     // más alto = niebla más espesa
    emissiveMin: 0.85, // brillo mínimo de lo que emite luz (lava, fuego, cristales)
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
    sideShade: 0.65, // multiplicador para las caras norte/sur (más oscuras)
  },

  // Propiedades de cada tipo de sprite decorativo.
  // solid = bloquea el paso; radius = tamaño de su colisión (en casillas).
  sprites: {
    brasero: { solid: true, radius: 0.3 },
    estaca: { solid: true, radius: 0.15 },
    cristal: { solid: false, radius: 0 },
  },
};
