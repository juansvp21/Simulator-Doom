// =============================================================
// textures.js — Todo el arte se genera por código (sin imágenes externas).
//
// Una textura es un cuadrado de TEX x TEX píxeles guardado como
// Uint8ClampedArray en formato RGBA (4 bytes por píxel), igual que ImageData.
//   índice del píxel (x, y) = (y * TEX + x) * 4
// =============================================================

export const TEX = 64; // potencia de 2: permite usar "& (TEX - 1)" como módulo rápido

// ---------- Utilidades ----------

// Generador aleatorio con semilla: siempre produce las mismas texturas.
function mulberry32(seed) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ruido de valor "repetible" (tileable): una cuadrícula de valores aleatorios
// interpolados suavemente. Al envolver los índices con módulo, el borde derecho
// encaja con el izquierdo y la textura se repite sin costuras.
function makeNoise(rand, cells) {
  const grid = Array.from({ length: cells * cells }, () => rand());
  const at = (i, j) => grid[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
  return (x, y) => {
    const fx = (x / TEX) * cells;
    const fy = (y / TEX) * cells;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    // smoothstep: curva en S para que no se noten los bordes de la cuadrícula
    const sx = (fx - x0) * (fx - x0) * (3 - 2 * (fx - x0));
    const sy = (fy - y0) * (fy - y0) * (3 - 2 * (fy - y0));
    const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  };
}

// fBm: suma de ruidos a distintas escalas -> detalle grande + detalle fino.
function makeFbm(seed) {
  const rand = mulberry32(seed);
  const n1 = makeNoise(rand, 4), n2 = makeNoise(rand, 8), n3 = makeNoise(rand, 16);
  return (x, y) => n1(x, y) * 0.5 + n2(x, y) * 0.3 + n3(x, y) * 0.2;
}

// Hash simple para dar un valor "aleatorio" fijo a cada ladrillo/baldosa.
const hash = (i, j) => {
  const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const clamp = (v) => Math.max(0, Math.min(255, v));

// Crea una textura llamando a fn(x, y) -> [r, g, b] para cada píxel.
// emissive = "brilla con luz propia" (la niebla y la sombra le afectan menos).
function makeTexture(fn, emissive = false) {
  const data = new Uint8ClampedArray(TEX * TEX * 4);
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * TEX + x) * 4;
      data[i] = clamp(r);
      data[i + 1] = clamp(g);
      data[i + 2] = clamp(b);
      data[i + 3] = 255;
    }
  }
  return { data, emissive };
}

// ---------- Paredes ----------

// 1: Roca volcánica en bloques, con grietas de lava.
function volcanicStone() {
  const n = makeFbm(11);
  const crack = makeFbm(12);
  return makeTexture((x, y) => {
    const row = Math.floor(y / 16);
    const bx = (x + (row % 2) * 16) % 32;
    const by = y % 16;
    if (bx === 0 || by === 0) return [10, 6, 8]; // junta entre bloques
    // Grieta: los puntos donde el ruido vale casi exactamente 0.5 forman
    // una línea serpenteante (una "curva de nivel").
    if (Math.abs(crack(x, y) - 0.5) < 0.02) return [210, 60, 15];
    let k = 26 + n(x, y) * 40;
    if (bx === 1 || by === 1) k += 14;   // borde iluminado
    if (bx === 31 || by === 15) k -= 10; // borde en sombra
    return [k + 6, k, k + 8];
  });
}

// 2: Ladrillo infernal rojo oscuro.
function hellBrick() {
  const n = makeFbm(21);
  return makeTexture((x, y) => {
    const row = Math.floor(y / 8);
    const col = Math.floor((x + (row % 2) * 8) / 16);
    const bx = (x + (row % 2) * 8) % 16;
    const by = y % 8;
    if (bx === 0 || by === 0) return [22, 8, 6];
    const tint = 0.7 + hash(col, row) * 0.5; // cada ladrillo con tono distinto
    const k = tint * (0.75 + n(x, y) * 0.5);
    return [105 * k, 24 * k, 18 * k];
  });
}

// 3: Muro de calaveras.
function skullWall() {
  const n = makeFbm(31);
  return makeTexture((x, y) => {
    const row = Math.floor(y / 32);
    const u = ((x + row * 16) % 32) - 16; // coordenadas locales centradas
    const v = (y % 32) - 15;
    const shade = 0.75 + n(x, y) * 0.4;
    const bone = [190 * shade, 172 * shade, 135 * shade];
    const inCircle = (cx, cy, r) => (u - cx) ** 2 + (v - cy) ** 2 < r * r;

    // Cuencas de los ojos (con un punto rojo dentro)
    if (inCircle(-5, -1, 1.3) || inCircle(5, -1, 1.3)) return [220, 40, 10];
    if (inCircle(-5, -1, 3.3) || inCircle(5, -1, 3.3)) return [14, 6, 6];
    // Nariz: triangulito
    if (v >= 3 && v <= 6 && Math.abs(u) < (v - 2) * 0.6) return [14, 6, 6];
    // Dientes
    if (v >= 8 && v <= 11 && Math.abs(u) < 7) return (u + 16) % 3 === 0 ? [30, 20, 15] : bone;
    // Cráneo y mandíbula
    if (inCircle(0, -2, 11) || (v >= 6 && v <= 12 && Math.abs(u) < 7)) {
      const dark = v > 4 ? 0.85 : 1; // parte de abajo un poco más oscura
      return bone.map((c) => c * dark);
    }
    // Fondo: huesos amontonados en penumbra
    const k = 25 + n(x * 2, y * 2) * 45;
    return [k * 1.2, k, k * 0.8];
  });
}

// 4: Placa de hierro con un sello rúnico que brilla.
function runeMetal() {
  const n = makeFbm(41);
  return makeTexture((x, y) => {
    const dx = x - 31.5, dy = y - 31.5;
    const d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    // Remaches en las esquinas
    for (const [rx, ry] of [[6, 6], [57, 6], [6, 57], [57, 57]]) {
      if ((x - rx) ** 2 + (y - ry) ** 2 < 6.5) return [115, 100, 95];
    }
    // Anillo brillante y 3 rayos (a 90°, 210° y 330°)
    const glow = [235, 95, 20];
    if (Math.abs(d - 17) < 1.5) return glow;
    for (const s of [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6]) {
      if (d < 15 && Math.cos(a - s) > 0 && d * Math.abs(Math.sin(a - s)) < 1) return glow;
    }
    // Halo alrededor del anillo
    const halo = Math.max(0, 1 - Math.abs(d - 17) / 5);
    let k = 45 + n(x, y) * 30;
    if (x < 3 || y < 3) k += 30;
    if (x > 60 || y > 60) k -= 20;
    return [k + halo * 90, k * 0.95 + halo * 25, k];
  });
}

// 5: Lava (brilla y se anima desplazándola en el render).
function lava() {
  const n = makeFbm(51);
  return makeTexture((x, y) => {
    const v = n(x, y);
    if (v < 0.42) return [45 + v * 60, 8, 5]; // costra oscura
    const k = (v - 0.42) / 0.58;
    return [200 + 55 * k, 50 + 170 * k * k, 10 + 60 * k * k * k];
  }, true);
}

// ---------- Suelo y techo ----------

function basaltFloor() {
  const n = makeFbm(61);
  // Ruido suave (sin octava fina) -> grietas largas y continuas, no "puntitos"
  const crack = makeNoise(mulberry32(62), 4);
  return makeTexture((x, y) => {
    if (x % 32 === 0 || y % 32 === 0) return [14, 10, 10];
    if (Math.abs(crack(x, y) - 0.5) < 0.012) return [200, 55, 12];
    const k = 32 + n(x, y) * 35;
    return [k + 8, k, k - 2];
  });
}

function rockCeiling() {
  const n = makeFbm(71);
  return makeTexture((x, y) => {
    const k = 14 + n(x, y) * 30;
    return [k + 6, k * 0.7, k];
  });
}

// ---------- Sprites (dibujados con la API de canvas 2D) ----------

// Dibuja en un canvas pequeño y lo convierte a nuestro formato RGBA.
// Píxeles semitransparentes del antialiasing -> totalmente opacos o vacíos,
// para mantener el borde pixelado de los 90.
function drawSprite(draw, emissive = false) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  const g = c.getContext('2d');
  draw(g);
  const data = g.getImageData(0, 0, TEX, TEX).data;
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 100 ? 255 : 0;
  return { data, emissive };
}

// Brasero: 4 fotogramas con llamas distintas (animación).
function brazierFrames() {
  return [0, 1, 2, 3].map((frame) =>
    drawSprite((g) => {
      const rand = mulberry32(100 + frame);
      // Patas
      g.strokeStyle = '#2a2224';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(24, 64); g.lineTo(28, 46);
      g.moveTo(40, 64); g.lineTo(36, 46);
      g.stroke();
      // Cuenco
      g.fillStyle = '#3b3033';
      g.beginPath(); g.ellipse(32, 44, 14, 7, 0, 0, Math.PI); g.fill();
      g.fillStyle = '#5a4a4a';
      g.fillRect(18, 42, 28, 3);
      g.fillStyle = '#a01808';
      g.fillRect(20, 40, 24, 2);
      // Llamas: capa naranja y capa amarilla encima
      for (const [color, spread, maxH] of [['#ff5a10', 18, 26], ['#ffc030', 10, 15]]) {
        g.fillStyle = color;
        for (let i = 0; i < 8; i++) {
          const fx = 32 + (rand() - 0.5) * spread;
          const h = 6 + rand() * maxH;
          g.beginPath();
          g.ellipse(fx, 41 - h / 2, 2.5 + rand() * 2, h / 2, 0, 0, Math.PI * 2);
          g.fill();
        }
      }
    }, true)
  );
}

// Estaca con calavera.
function skullPike() {
  return [
    drawSprite((g) => {
      g.fillStyle = '#4a3020';
      g.fillRect(30, 22, 4, 42);
      g.fillStyle = '#d8ccb0';
      g.beginPath(); g.arc(32, 15, 9, 0, Math.PI * 2); g.fill();
      g.fillRect(27, 19, 10, 7);
      g.fillStyle = '#120808';
      g.beginPath(); g.arc(28.5, 14, 2.6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(35.5, 14, 2.6, 0, Math.PI * 2); g.fill();
      g.fillRect(31, 18, 2, 2);
      for (let tx = 28; tx < 37; tx += 3) g.fillRect(tx, 22, 1, 4);
    }),
  ];
}

// Cristal de alma flotante.
function soulCrystal() {
  return [
    drawSprite((g) => {
      const poly = (pts, color) => {
        g.fillStyle = color;
        g.beginPath();
        pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
        g.closePath();
        g.fill();
      };
      poly([[32, 14], [42, 32], [32, 52], [22, 32]], '#c0102a');
      poly([[32, 14], [42, 32], [32, 32]], '#ff4a66');
      poly([[32, 32], [32, 52], [22, 32]], '#6a0818');
    }, true),
  ];
}

// Chispa de impacto: 3 fotogramas (estallido -> brasas -> casi nada).
// Se dibuja en el CENTRO del sprite porque el impacto ocurre a la altura
// de los ojos (el rayo del disparo es horizontal).
function sparkFrames() {
  return [
    [7, '#ffe070', '#ff7020'],
    [4, '#ffa040', '#c03010'],
    [2, '#c04010', '#601008'],
  ].map(([radius, inner, outer]) =>
    drawSprite((g) => {
      g.fillStyle = outer;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + radius;
        g.fillRect(32 + Math.cos(a) * radius * 1.4 - 1, 32 + Math.sin(a) * radius * 1.4 - 1, 2, 2);
      }
      g.beginPath(); g.arc(32, 32, radius, 0, Math.PI * 2); g.fill();
      g.fillStyle = inner;
      g.beginPath(); g.arc(32, 32, radius * 0.55, 0, Math.PI * 2); g.fill();
    }, true)
  );
}

// Salpicadura de sangre al impactar a un enemigo (3 fotogramas).
function bloodFrames() {
  // Pequeña a propósito: la escopeta crea 7 a la vez y de cerca se ven enormes
  return [4, 3, 1.5].map((radius) =>
    drawSprite((g) => {
      const rand = mulberry32(300 + radius);
      g.fillStyle = '#8a0c08';
      for (let i = 0; i < 7; i++) {
        const a = rand() * Math.PI * 2;
        const d = rand() * radius * 1.8;
        g.fillRect(32 + Math.cos(a) * d - 1, 32 + Math.sin(a) * d - 1, 3, 3);
      }
      g.fillStyle = '#c01810';
      g.beginPath(); g.arc(32, 32, radius * 0.7, 0, Math.PI * 2); g.fill();
    })
  );
}

// Bola de fuego del demonio (2 fotogramas que se alternan).
function fireballFrames() {
  return [0, 1].map((f) =>
    drawSprite((g) => {
      const rand = mulberry32(400 + f);
      g.fillStyle = '#c02a08';
      for (let i = 0; i < 8; i++) {
        const a = rand() * Math.PI * 2;
        g.beginPath(); g.arc(32 + Math.cos(a) * 5, 32 + Math.sin(a) * 5, 3 + rand() * 2, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#ff7a1a';
      g.beginPath(); g.arc(32, 32, 6, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe680';
      g.beginPath(); g.arc(32 - f, 32 - f, 3, 0, Math.PI * 2); g.fill();
    }, true)
  );
}

// ---------- Enemigos ----------
// Todos los enemigos humanoides se dibujan con la misma función, cambiando
// colores y proporciones. Cada enemigo tiene 7 fotogramas:
export const ENEMY_FRAME = { WALK1: 0, WALK2: 1, ATTACK: 2, PAIN: 3, DEATH1: 4, DEATH2: 5, CORPSE: 6 };

const ENEMY_LOOKS = {
  // Condenado: alma en pena lenta, piel gris verdosa y harapos
  zombie: { skin: '#7d8a6a', skinDark: '#56604a', cloth: '#4a3a2e', eye: '#ffde3a', width: 1, horns: false },
  // Poseído: delgado, piel rojiza, ojos blancos
  zombieRapido: { skin: '#a8645a', skinDark: '#7a443c', cloth: '#2e2626', eye: '#ffffff', width: 0.8, horns: false },
  // Demonio ígneo: corpulento, rojo, con cuernos
  demonio: { skin: '#b02a1a', skinDark: '#7a1a10', cloth: '#3a1410', eye: '#ffd040', width: 1.2, horns: true },
};

// pose: { legs: -1..1, arms: 'reach' | 'up', pain: bool, death: 0..3, fireball: bool }
function drawHumanoid(g, look, pose) {
  const w = look.width;
  const cx = 32;

  if (pose.death >= 3) {
    // Charco de sangre debajo del cadáver
    g.fillStyle = '#4a0606';
    g.beginPath(); g.ellipse(32, 60, 22, 3.5, 0, 0, Math.PI * 2); g.fill();
  }
  g.save();
  if (pose.death === 1) {
    // Cayendo de rodillas: más bajo y aplastado
    g.translate(0, 64); g.scale(1, 0.78); g.translate(0, -64);
  } else if (pose.death >= 2) {
    // Tumbado: rotamos casi 90° alrededor de los pies y lo encogemos
    g.translate(46, 61); g.rotate(-Math.PI / 2 * 0.95); g.scale(0.62, 0.62); g.translate(-32, -63);
  }

  // Piernas (se alternan al caminar)
  g.fillStyle = look.skinDark;
  const legW = 5 * w;
  g.fillRect(cx - 6 * w + pose.legs * 3 - legW / 2, 40, legW, 23);
  g.fillRect(cx + 6 * w - pose.legs * 3 - legW / 2, 40, legW, 23);

  // Torso con harapos
  g.fillStyle = look.cloth;
  g.fillRect(cx - 10 * w, 22, 20 * w, 20);
  g.fillStyle = look.skin;
  g.fillRect(cx - 3 * w, 22, 6 * w, 9); // piel visible en el pecho
  g.fillStyle = look.cloth;
  for (let i = 0; i < 5; i++) g.fillRect(cx - 10 * w + i * 4 * w, 42, 3 * w, 2 + (i % 2) * 3); // bordes rotos

  // Brazos
  g.fillStyle = look.skin;
  if (pose.arms === 'up') {
    g.fillRect(cx - 15 * w, 6, 5 * w, 18);
    g.fillRect(cx + 10 * w, 6, 5 * w, 18);
    g.beginPath(); g.arc(cx - 12.5 * w, 6, 3.5 * w, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 12.5 * w, 6, 3.5 * w, 0, Math.PI * 2); g.fill();
  } else {
    // Brazos estirados hacia el jugador: cortos (perspectiva) con manos grandes
    g.fillRect(cx - 15 * w, 23, 5 * w, 12);
    g.fillRect(cx + 10 * w, 23, 5 * w, 12);
    g.beginPath(); g.arc(cx - 12.5 * w, 35, 4 * w, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(cx + 12.5 * w, 35, 4 * w, 0, Math.PI * 2); g.fill();
  }

  // Cabeza, cuernos y ojos brillantes
  if (look.horns) {
    g.fillStyle = '#d8c8a0';
    poly(g, [[cx - 6, 10], [cx - 11, 0], [cx - 3, 8]], '#d8c8a0');
    poly(g, [[cx + 6, 10], [cx + 11, 0], [cx + 3, 8]], '#d8c8a0');
  }
  g.fillStyle = look.skin;
  g.beginPath(); g.arc(cx, 15, 7 * Math.max(1, w * 0.9), 0, Math.PI * 2); g.fill();
  g.fillStyle = look.skinDark;
  g.fillRect(cx - 4, 18, 8, 2); // boca
  if (pose.death === 0) {
    g.fillStyle = look.eye;
    g.fillRect(cx - 4, 13, 2, 2);
    g.fillRect(cx + 2, 13, 2, 2);
  }

  // Bola de fuego en las manos (demonio atacando)
  if (pose.fireball) {
    g.fillStyle = '#ff7a1a';
    g.beginPath(); g.arc(cx, 4, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffe680';
    g.beginPath(); g.arc(cx, 4, 3, 0, Math.PI * 2); g.fill();
  }
  g.restore();

  // Dolor: tinte blanco encima de lo ya dibujado (source-atop = solo donde hay píxeles)
  if (pose.pain) {
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(255, 230, 220, 0.45)';
    g.fillRect(0, 0, 64, 64);
    g.globalCompositeOperation = 'source-over';
  }
}

function enemyFrames(type) {
  const look = ENEMY_LOOKS[type];
  const ranged = type === 'demonio';
  const poses = [
    { legs: -1, arms: 'reach', death: 0 },                       // WALK1
    { legs: 1, arms: 'reach', death: 0 },                        // WALK2
    { legs: 0, arms: 'up', death: 0, fireball: ranged },         // ATTACK
    { legs: 0, arms: 'reach', death: 0, pain: true },            // PAIN
    { legs: 0, arms: 'up', death: 1, pain: true },               // DEATH1
    { legs: 0, arms: 'up', death: 2 },                           // DEATH2
    { legs: 0, arms: 'up', death: 3 },                           // CORPSE
  ];
  return poses.map((pose) => drawSprite((g) => drawHumanoid(g, look, pose)));
}

// ---------- Armas en primera persona ("view model") ----------
// Se dibujan encima de la escena con drawImage. Cada arma tiene dos
// imágenes: normal y con fogonazo.

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  draw(g);
  return c;
}

function poly(g, pts, color) {
  g.fillStyle = color;
  g.beginPath();
  pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
  g.closePath();
  g.fill();
}

// Pistola rúnica vista desde atrás, sujeta por una mano con guante de cuero.
function drawPistol(g, withFlash) {
  if (withFlash) {
    // Fogonazo: estrella de puntas irregulares encima del cañón
    const rand = mulberry32(7);
    const pts = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const r = i % 2 ? 10 + rand() * 6 : 22 + rand() * 12;
      pts.push([80 + Math.cos(a) * r, 22 + Math.sin(a) * r * 0.8]);
    }
    poly(g, pts, '#ff7a1a');
    g.fillStyle = '#ffe680';
    g.beginPath(); g.ellipse(80, 22, 11, 9, 0, 0, Math.PI * 2); g.fill();
  }
  // Antebrazo y mano (guante de cuero)
  poly(g, [[38, 140], [122, 140], [108, 92], [52, 92]], '#3a2418');
  poly(g, [[46, 140], [62, 140], [60, 96], [54, 96]], '#5a3826');
  // Empuñadura
  g.fillStyle = '#231c1e';
  g.fillRect(64, 58, 32, 44);
  // Cuerpo / corredera (trapecio: más ancho abajo por la perspectiva)
  poly(g, [[60, 30], [100, 30], [106, 64], [54, 64]], '#4a4448');
  poly(g, [[60, 30], [100, 30], [101, 35], [59, 35]], '#6e676c'); // brillo superior
  poly(g, [[54, 60], [106, 60], [106, 64], [54, 64]], '#2c2629'); // sombra inferior
  // Alza (mira trasera)
  g.fillStyle = '#1c1618';
  g.fillRect(66, 22, 9, 9);
  g.fillRect(85, 22, 9, 9);
  // Runas que brillan a los lados
  g.fillStyle = withFlash ? '#ffd060' : '#ff5a18';
  g.fillRect(61, 40, 3, 14);
  g.fillRect(96, 40, 3, 14);
  g.fillRect(78, 42, 4, 4);
  // Dedos rodeando la empuñadura
  for (const fy of [72, 82, 92]) {
    g.fillStyle = '#3a2418';
    g.fillRect(58, fy, 44, 8);
    g.fillStyle = '#5a3826';
    g.fillRect(58, fy, 44, 2);
  }
}

// Fogonazo genérico: estrella irregular centrada en (cx, cy)
function muzzleFlash(g, cx, cy, size, colors = ['#ff7a1a', '#ffe680']) {
  const rand = mulberry32(Math.round(cx * 7 + size));
  const pts = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = i % 2 ? size * 0.4 + rand() * size * 0.2 : size + rand() * size * 0.5;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8]);
  }
  poly(g, pts, colors[0]);
  g.fillStyle = colors[1];
  g.beginPath(); g.ellipse(cx, cy, size * 0.45, size * 0.38, 0, 0, Math.PI * 2); g.fill();
}

// Antebrazo con guante de cuero (compartido por todas las armas)
function drawArm(g, x = 0) {
  poly(g, [[38 + x, 140], [122 + x, 140], [108 + x, 96], [52 + x, 96]], '#3a2418');
  poly(g, [[46 + x, 140], [62 + x, 140], [60 + x, 100], [54 + x, 100]], '#5a3826');
}

// Escopeta de Azufre: dos cañones vistos desde atrás + guardamanos de madera
function drawShotgun(g, withFlash) {
  if (withFlash) muzzleFlash(g, 80, 16, 30);
  drawArm(g);
  poly(g, [[56, 78], [78, 78], [76, 20], [66, 20]], '#3a3a40');
  poly(g, [[82, 78], [104, 78], [94, 20], [84, 20]], '#3a3a40');
  poly(g, [[58, 78], [62, 78], [67, 20], [66, 20]], '#6a6a72'); // brillo izq.
  poly(g, [[84, 78], [88, 78], [86, 20], [84, 20]], '#6a6a72'); // brillo der.
  g.fillStyle = '#c8a040';
  g.fillRect(58, 56, 44, 4); // anillo de latón
  poly(g, [[50, 78], [110, 78], [114, 108], [46, 108]], '#5a3418'); // madera
  g.fillStyle = '#3e220e';
  for (let y = 84; y < 106; y += 6) g.fillRect(52, y, 56, 1); // vetas
  g.fillStyle = withFlash ? '#ffe060' : '#ffb020';
  g.fillRect(77, 64, 6, 6); // runa de azufre
}

// Ametralladora Infernal: cuerpo cuadrado, cañón con agujeros y tambor lateral
function drawMachineGun(g, withFlash) {
  if (withFlash) muzzleFlash(g, 80, 8, 22);
  drawArm(g, 6);
  g.fillStyle = '#2a2628';
  g.fillRect(70, 8, 20, 40); // cañón con funda
  g.fillStyle = '#0e0c0c';
  for (let y = 14; y < 44; y += 8) { g.fillRect(74, y, 4, 4); g.fillRect(82, y, 4, 4); }
  g.fillStyle = '#3e3a3c';
  g.fillRect(56, 44, 48, 42); // cuerpo
  g.fillStyle = '#5e585a';
  g.fillRect(56, 44, 48, 4);
  g.fillStyle = '#ff4a18';
  for (let x = 62; x < 100; x += 8) g.fillRect(x, 64, 4, 10); // rejillas que brillan
  // Tambor de munición
  g.fillStyle = '#5a2a20';
  g.beginPath(); g.arc(46, 78, 18, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#7a4a30';
  g.beginPath(); g.arc(46, 78, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2a1410';
  g.beginPath(); g.arc(46, 78, 4, 0, Math.PI * 2); g.fill();
}

// Lanzacohetes de Brasa: tubo grande con la boca visible arriba
function drawRocketLauncher(g, withFlash) {
  drawArm(g, -10);
  poly(g, [[64, 26], [112, 26], [128, 140], [48, 140]], '#5a4a38'); // tubo
  poly(g, [[66, 26], [74, 26], [62, 140], [52, 140]], '#7a6a52');   // brillo
  g.fillStyle = '#b08a40';
  g.fillRect(58, 60, 62, 6);  // anillos de latón
  g.fillRect(53, 100, 72, 6);
  g.fillStyle = '#7a5a30';
  g.beginPath(); g.ellipse(88, 26, 25, 11, 0, 0, Math.PI * 2); g.fill(); // borde de la boca
  g.fillStyle = '#140a08';
  g.beginPath(); g.ellipse(88, 26, 19, 8, 0, 0, Math.PI * 2); g.fill(); // interior
  g.fillStyle = '#ff6a1a';
  g.beginPath(); g.arc(88, 27, 4, 0, Math.PI * 2); g.fill();             // brasa del cohete
  if (withFlash) muzzleFlash(g, 88, 18, 32);
}

// Cetro del Abismo: bastón con un orbe violeta entre garras
function drawScepter(g, withFlash) {
  if (withFlash) {
    g.fillStyle = 'rgba(200, 100, 255, 0.5)';
    g.beginPath(); g.arc(80, 30, 30, 0, Math.PI * 2); g.fill();
  }
  poly(g, [[74, 140], [86, 140], [84, 44], [76, 44]], '#3a2a3a'); // vara
  g.fillStyle = '#5a4a5a';
  g.fillRect(77, 44, 2, 96);
  drawArm(g, 0);
  // Garras que sujetan el orbe
  poly(g, [[66, 48], [72, 46], [66, 22], [62, 30]], '#8a7a9a');
  poly(g, [[94, 48], [88, 46], [94, 22], [98, 30]], '#8a7a9a');
  // Orbe
  g.fillStyle = '#5a1490';
  g.beginPath(); g.arc(80, 30, 14, 0, Math.PI * 2); g.fill();
  g.fillStyle = withFlash ? '#f0c0ff' : '#c060ff';
  g.beginPath(); g.arc(80, 30, 8, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  g.beginPath(); g.arc(77, 27, 3, 0, Math.PI * 2); g.fill();
}

function buildViewModels() {
  const pair = (draw) => ({
    idle: makeCanvas(160, 140, (g) => draw(g, false)),
    flash: makeCanvas(160, 140, (g) => draw(g, true)),
  });
  return {
    pistola: pair(drawPistol),
    escopeta: pair(drawShotgun),
    ametralladora: pair(drawMachineGun),
    lanzacohetes: pair(drawRocketLauncher),
    especial: pair(drawScepter),
  };
}

// Cohete en vuelo (visto desde atrás: ojiva + llama)
function rocketFrames() {
  return [0, 1].map((f) =>
    drawSprite((g) => {
      g.fillStyle = '#ff7a1a';
      g.beginPath(); g.arc(32, 32, 5 + f, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffe680';
      g.beginPath(); g.arc(32, 32, 2.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#6a5a48';
      g.fillRect(29, 24, 6, 3); // aleta
    }, true)
  );
}

// Explosión: 4 fotogramas que crecen y se apagan. Ocupa todo el sprite
// (1 casilla de alto), centrada a la altura de los ojos.
function explosionFrames() {
  return [
    [12, '#ffe680', '#ff9a2a'],
    [22, '#ffb040', '#e04a10'],
    [28, '#e05a10', '#801808'],
    [30, '#701808', '#301008'],
  ].map(([radius, inner, outer], f) =>
    drawSprite((g) => {
      const rand = mulberry32(500 + f);
      g.fillStyle = outer;
      for (let i = 0; i < 10; i++) {
        const a = rand() * Math.PI * 2;
        const d = rand() * radius * 0.5;
        g.beginPath(); g.arc(32 + Math.cos(a) * d, 32 + Math.sin(a) * d, radius * 0.55, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = inner;
      g.beginPath(); g.arc(32, 32, radius * 0.5, 0, Math.PI * 2); g.fill();
    }, true)
  );
}

// Objetos del suelo: el arma en miniatura apoyada en el piso.
function weaponPickup(viewModel) {
  return [drawSprite((g) => g.drawImage(viewModel.idle, 0, 0, 160, 140, 14, 34, 36, 31))];
}

function ammoBox() {
  return [
    drawSprite((g) => {
      g.fillStyle = '#6a4a28';
      g.fillRect(18, 46, 28, 18);
      g.fillStyle = '#3e2a14';
      g.fillRect(18, 46, 28, 2);
      g.fillRect(18, 54, 28, 2);
      g.fillStyle = '#d8b040';
      for (let x = 21; x < 44; x += 5) g.fillRect(x, 41, 3, 6); // balas asomando
      g.fillStyle = '#ff5a18';
      g.fillRect(30, 57, 4, 4);
    }),
  ];
}

// Moneda de oro que gira: 4 fotogramas estrechando la elipse
// (ancho = cos del ángulo de giro, el truco clásico de la "moneda 2D").
function coinFrames() {
  return [1, 0.65, 0.2, 0.65].map((w, f) =>
    drawSprite((g) => {
      const rx = Math.max(1, 7 * w);
      g.fillStyle = '#a06a10';
      g.beginPath(); g.ellipse(32, 54, rx, 7, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = f === 2 ? '#c89020' : '#ffd84a';
      g.beginPath(); g.ellipse(32, 54, Math.max(0.5, rx - 1.5), 5.5, 0, 0, Math.PI * 2); g.fill();
      if (w > 0.5) {
        g.fillStyle = '#a06a10';
        g.fillRect(31, 51, 2, 6); // marca central
      }
    }, true)
  );
}

// Portal de salida: anillo que gira (fotogramas 0-3) y versión apagada (4).
function portalFrames() {
  const ring = (g, phase, open) => {
    // Base de piedra
    g.fillStyle = '#2a2224';
    g.fillRect(14, 58, 36, 6);
    // Interior
    g.fillStyle = open ? '#3a0a40' : '#120a10';
    g.beginPath(); g.ellipse(32, 34, 13, 22, 0, 0, Math.PI * 2); g.fill();
    if (open) {
      // Remolino: arcos que rotan con la fase
      g.strokeStyle = '#c060ff';
      g.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const a = phase + (i * Math.PI * 2) / 3;
        g.beginPath(); g.ellipse(32, 34, 9 - i * 2.5, 16 - i * 4, 0, a, a + 2); g.stroke();
      }
    }
    // Marco
    g.strokeStyle = open ? '#ff6a1a' : '#4a3a3a';
    g.lineWidth = 3;
    g.beginPath(); g.ellipse(32, 34, 15, 24, 0, 0, Math.PI * 2); g.stroke();
  };
  const open = [0, 1, 2, 3].map((f) => drawSprite((g) => ring(g, (f * Math.PI) / 2, true), true));
  const locked = drawSprite((g) => ring(g, 0, false));
  return [...open, locked];
}

// ---------- Punto de entrada ----------

export function buildAssets() {
  const viewModels = buildViewModels();
  return {
    // El índice coincide con el número de la pared en el mapa
    walls: {
      1: volcanicStone(),
      2: hellBrick(),
      3: skullWall(),
      4: runeMetal(),
      5: lava(),
    },
    floor: basaltFloor(),
    ceiling: rockCeiling(),
    // Cada sprite es una lista de fotogramas (1 = estático)
    sprites: {
      brasero: brazierFrames(),
      estaca: skullPike(),
      cristal: soulCrystal(),
      chispa: sparkFrames(),
      sangre: bloodFrames(),
      bolaFuego: fireballFrames(),
      zombie: enemyFrames('zombie'),
      zombieRapido: enemyFrames('zombieRapido'),
      demonio: enemyFrames('demonio'),
      cohete: rocketFrames(),
      explosion: explosionFrames(),
      arma_escopeta: weaponPickup(viewModels.escopeta),
      arma_ametralladora: weaponPickup(viewModels.ametralladora),
      arma_lanzacohetes: weaponPickup(viewModels.lanzacohetes),
      arma_especial: weaponPickup(viewModels.especial),
      caja_municion: ammoBox(),
      moneda: coinFrames(),
      portal: portalFrames(),
    },
    viewModels,
  };
}
