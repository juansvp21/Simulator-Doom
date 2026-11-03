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

// ---------- Punto de entrada ----------

export function buildAssets() {
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
    },
  };
}
