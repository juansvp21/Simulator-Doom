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
    maxHealth: 100,
    startHealth: 100,
    maxArmor: 100,
    startArmor: 0,
    startMoney: 0,
    armorAbsorb: 0.33, // fracción del daño que absorbe la armadura (mientras quede)
    hurtFlash: 0.35,   // segundos que dura el destello rojo al recibir daño
  },

  // Enemigos. speed en casillas/s, radius = tamaño de colisión,
  // attackRange = distancia desde la que ataca, attackWindup = segundos
  // que "avisa" antes de golpear (da tiempo a reaccionar),
  // attackCooldown = segundos entre ataques, sightRange = hasta dónde ve.
  enemies: {
    zombie: {
      name: 'Condenado', health: 45, speed: 1.1, radius: 0.28,
      damage: 10, attackRange: 0.85, attackWindup: 0.35, attackCooldown: 1.1,
      sightRange: 9, ranged: false,
    },
    zombieRapido: {
      name: 'Poseído', health: 25, speed: 2.4, radius: 0.25,
      damage: 6, attackRange: 0.8, attackWindup: 0.2, attackCooldown: 0.7,
      sightRange: 11, ranged: false,
    },
    demonio: {
      name: 'Demonio ígneo', health: 70, speed: 1.2, radius: 0.32,
      damage: 14, attackRange: 7, attackWindup: 0.5, attackCooldown: 2.2,
      sightRange: 12, ranged: true,
      preferDist: 3.5,      // se queda a esta distancia para disparar
      projectileSpeed: 5,   // casillas/s de la bola de fuego
    },
  },

  // Comportamiento general de la IA
  ai: {
    patrolSpeed: 0.45,    // fracción de la velocidad al patrullar
    patrolRadius: 3,      // casillas alrededor de su punto de inicio
    loseSightTime: 4,     // segundos sin verte antes de rendirse
    painTime: 0.18,       // segundos que se queda aturdido al recibir un disparo
    hearRange: 9,         // los disparos alertan a enemigos a esta distancia
    flowInterval: 0.3,    // cada cuánto se recalcula el mapa de rutas (s)
    deathFrameTime: 0.15, // duración de cada fotograma de la muerte
  },

  // Armas. slot = tecla para elegirla (1-5)
  //   kind: 'hitscan' (bala instantánea), 'projectile' (cohete que viaja),
  //         'beam' (rayo que atraviesa a todos los enemigos en línea)
  //   damage = daño por impacto (por perdigón en la escopeta)
  //   pellets = proyectiles por disparo, fireRate = disparos por segundo,
  //   magSize = balas por cargador, reloadTime = segundos,
  //   spread = desviación máxima en radianes (0 = puntería perfecta),
  //   startReserve = reserva al conseguirla, auto = dispara manteniendo el clic.
  weapons: {
    pistola: {
      name: 'PISTOLA RÚNICA', slot: 1, kind: 'hitscan',
      damage: 15, pellets: 1, fireRate: 4, magSize: 12, reloadTime: 1.1,
      spread: 0.012, range: 40, startReserve: 48, auto: false,
    },
    escopeta: {
      name: 'ESCOPETA DE AZUFRE', slot: 2, kind: 'hitscan',
      damage: 9, pellets: 7, fireRate: 1.2, magSize: 6, reloadTime: 1.6,
      spread: 0.09, range: 20, startReserve: 18, auto: false,
    },
    ametralladora: {
      name: 'AMETRALLADORA INFERNAL', slot: 3, kind: 'hitscan',
      damage: 9, pellets: 1, fireRate: 10, magSize: 40, reloadTime: 2.0,
      spread: 0.045, range: 40, startReserve: 80, auto: true,
    },
    lanzacohetes: {
      name: 'LANZACOHETES DE BRASA', slot: 4, kind: 'projectile',
      damage: 60, pellets: 1, fireRate: 1.1, magSize: 4, reloadTime: 2.2,
      spread: 0, range: 40, startReserve: 8, auto: false,
      projectileSpeed: 9,   // casillas/s
      splashRadius: 1.8,    // radio de la explosión (casillas)
      splashDamage: 70,     // daño en el centro; baja a 0 en el borde
      selfDamage: 0.5,      // fracción del daño de explosión que te haces tú
    },
    especial: {
      name: 'CETRO DEL ABISMO', slot: 5, kind: 'beam',
      damage: 45, pellets: 1, fireRate: 1.5, magSize: 5, reloadTime: 2.5,
      spread: 0, range: 40, startReserve: 10, auto: false,
    },
  },

  // Cajas de munición: dan esta fracción de startReserve a cada arma que tengas
  ammoBoxFraction: 0.5,

  // ---------------------------------------------------------
  // ECONOMÍA
  // ---------------------------------------------------------
  // Oro que suelta cada enemigo al morir
  coins: { zombie: 15, zombieRapido: 20, demonio: 40 },

  // Bono al terminar un nivel:
  //  tiempo:    timePerSecond de oro por cada segundo por debajo de parTime
  //  precisión: accuracyMax * (aciertos / disparos)
  levelBonus: { parTime: 180, timePerSecond: 1, accuracyMax: 150 },

  // Tienda: precio de cada arma
  shop: {
    weaponPrices: { escopeta: 250, ametralladora: 450, lanzacohetes: 700, especial: 1100 },
    // Paquetes de munición: amount balas por price de oro
    ammo: {
      pistola: { amount: 24, price: 15 },
      escopeta: { amount: 12, price: 30 },
      ametralladora: { amount: 60, price: 40 },
      lanzacohetes: { amount: 4, price: 60 },
      especial: { amount: 5, price: 80 },
    },
    medkit: { amount: 50, price: 60 },  // botiquín: +50 de vida
    armor: { amount: 50, price: 80 },   // armadura: +50
  },

  // Mejoras por arma: 3 niveles de cada estadística.
  //   perLevel = cuánto cambia por nivel (0.25 = +25 %)
  //   prices   = precio de los niveles 1, 2 y 3
  // Cada arma multiplica esos precios por su upgradeCost (las potentes cuestan más).
  upgrades: {
    damage:     { label: 'Daño',     perLevel: 0.25,  prices: [100, 200, 350] },
    fireRate:   { label: 'Cadencia', perLevel: 0.2,   prices: [100, 200, 350] },
    magSize:    { label: 'Cargador', perLevel: 0.25,  prices: [80, 160, 280] },
    reloadTime: { label: 'Recarga',  perLevel: -0.15, prices: [80, 160, 280] },
  },
  upgradeCost: { pistola: 1, escopeta: 1.2, ametralladora: 1.3, lanzacohetes: 1.6, especial: 2 },

  // Efectos visuales del arma
  fx: {
    flashTime: 0.06,     // duración del fogonazo (s)
    flashLight: 0.55,    // cuánto ilumina el fogonazo la escena (0..1)
    recoilTime: 0.18,    // duración del retroceso (s)
    recoilKick: 22,      // píxeles que sube el arma al disparar
    bobAmount: 6,        // balanceo del arma al caminar (px)
    bobSpeed: 9,         // velocidad del balanceo
    sparkLife: 0.25,     // duración de la chispa de impacto (s)
    weaponScale: 1.6,    // tamaño del arma en pantalla
    switchTime: 0.35,    // segundos para cambiar de arma (bajar + subir)
    beamTime: 0.15,      // duración visible del rayo del cetro
    explosionLife: 0.45, // duración de la animación de explosión
    explosionLight: 0.8, // cuánto ilumina una explosión
    pickupRadius: 0.6,   // distancia para recoger objetos
    messageTime: 2,      // segundos que se muestra un aviso ("¡ESCOPETA!")
    interactRadius: 1.2, // distancia para usar el portal con E
  },

  hud: {
    height: 44,          // alto de la barra inferior (px de resolución interna)
    lowHealth: 25,       // por debajo de esto la vida parpadea en rojo
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
    chispa: { solid: false, radius: 0 }, // impacto de bala (temporal)
    sangre: { solid: false, radius: 0 }, // impacto en enemigo (temporal)
    explosion: { solid: false, radius: 0 },
    // Objetos que se recogen al pasar por encima
    arma_escopeta: { solid: false, radius: 0, pickup: { weapon: 'escopeta' } },
    arma_ametralladora: { solid: false, radius: 0, pickup: { weapon: 'ametralladora' } },
    arma_lanzacohetes: { solid: false, radius: 0, pickup: { weapon: 'lanzacohetes' } },
    arma_especial: { solid: false, radius: 0, pickup: { weapon: 'especial' } },
    caja_municion: { solid: false, radius: 0, pickup: { ammo: true } },
    moneda: { solid: false, radius: 0 },  // el valor lo lleva cada moneda (pickup.money)
    portal: { solid: false, radius: 0, exit: true },
  },
};
