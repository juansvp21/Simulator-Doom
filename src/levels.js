// =============================================================
// levels.js — Los 7 círculos del inframundo.
//
// Los mapas se escriben como TEXTO: cada carácter es una casilla. Es mucho
// más fácil de leer y editar que una matriz de números, y parseLevel() lo
// convierte al formato que usa el motor (grid de números + listas de
// sprites y enemigos).
//
// LEYENDA
//   Paredes:   #  roca volcánica   B  ladrillo     S  calaveras
//              R  hierro rúnico    L  lava
//   Suelo:     .  vacío
//   Jugador:   P  punto de inicio (startAngle = hacia dónde mira)
//   Enemigos:  z  Condenado        r  Poseído      d  Demonio ígneo
//   Objetos:   a  munición         h  botiquín     v  armadura
//              X  portal de salida
//   Decorado:  f  brasero          k  estaca       c  cristal
//   Jefe:      o  lugar del jefe del círculo (se usa en la Fase 7B)
// =============================================================

const WALLS = { '#': 1, B: 2, S: 3, R: 4, L: 5 };
const ENEMIES = { z: 'zombie', r: 'zombieRapido', d: 'demonio' };
const SPRITES = {
  a: 'caja_municion', h: 'botiquin', v: 'escudo', X: 'portal',
  f: 'brasero', k: 'estaca', c: 'cristal',
};

export const LEVELS = [
  {
    name: 'Círculo I: Soberbia',
    sin: 'Soberbia',
    description: 'El orgullo se alza sobre muros de hierro rúnico.',
    fog: { color: [24, 8, 30], density: 0.15 },
    ambient: 55,          // nota base (Hz) del zumbido ambiental
    startAngle: 0,
    map: [
      '########################',
      '#P.....#.....c.....#...#',
      '#......#...........#.a.#',
      '#..f...R...z...z...#...#',
      '#......#...........R...#',
      '###..###...RRRRR...#.z.#',
      '#......#...R...R.......#',
      '#.k....#...R.c.R.......#',
      '#......#...R...R...RRRR#',
      '#..z.......RR.RR...R...#',
      '#....................h.#',
      '####..######..######...#',
      '#......f#..........#...#',
      '#.a.....#...d......#.d.#',
      '#.......R..........R...#',
      '#...z...#....o.....#..X#',
      '#f......#..f....f..#...#',
      '########################',
    ],
  },
  {
    name: 'Círculo II: Avaricia',
    sin: 'Avaricia',
    description: 'Bóvedas de ladrillo donde el oro pesa más que el alma.',
    fog: { color: [30, 20, 4], density: 0.15 },
    ambient: 49,          // nota base (Hz) del zumbido ambiental
    startAngle: 0,
    map: [
      '########################',
      '#P..B.......B.........d#',
      '#...B..z....B..........#',
      '#...B.......B...BBBB...#',
      '#.......a.......B..B...#',
      '#...B.......B...B..B.r.#',
      '#...B.......B......B...#',
      'BBBBB...BBBBBB..BBBB...#',
      '#.......B....B.........#',
      '#..z....B.c..B...z.....#',
      '#.......B....B.......h.#',
      '#...f...BB..BB...BBBBBBB',
      '#..........r...........#',
      'BBB.BBBBBB..BBBBBB.BBBB#',
      '#...B...............B..#',
      '#.r.B..d.....o......B.X#',
      '#...B..f........f...a..#',
      '########################',
    ],
  },
  {
    name: 'Círculo III: Lujuria',
    sin: 'Lujuria',
    description: 'Ríos de lava y una niebla carmesí que confunde.',
    fog: { color: [40, 4, 16], density: 0.15 },
    ambient: 52,          // nota base (Hz) del zumbido ambiental
    startAngle: 0,
    map: [
      '########################',
      '#P.....LLLL......LLLL..#',
      '#..............z.......#',
      '#..f....r.....LL....r..#',
      '#.......LLL...LL.......#',
      '#..a....L.......c...LL.#',
      'LLLL....L...z.......LL.#',
      '#..........LLLLLL......#',
      '#..r.......L....L...d..#',
      '#......d...L.h..L......#',
      '#..........L....L......#',
      '#.LLLLL....LL..LL..LLLL#',
      '#.....L............L...#',
      '#..z..L...f....f...L.a.#',
      '#.....L....r.......L...#',
      '#.k.......o..........X.#',
      '#.....L............L...#',
      '########################',
    ],
  },
  {
    name: 'Círculo IV: Ira',
    sin: 'Ira',
    description: 'Cámaras ardientes llenas de almas furiosas.',
    fog: { color: [45, 6, 2], density: 0.13 },
    ambient: 46,          // nota base (Hz) del zumbido ambiental
    startAngle: Math.PI / 2,
    map: [
      '########################',
      '#P..#....r....#....r...#',
      '#...#.........#........#',
      '#...#..LL.LL..#..LL....#',
      '#.f.....L..L.......L.a.#',
      '#...#..LL.LL..#..LL....#',
      '#...#.........#........#',
      '##.###########.####.####',
      '#.......r.......r......#',
      '#..d.................d.#',
      '#.......#..h...#.......#',
      '####.####......####.####',
      '#....#..............#..#',
      '#.r..#..z...o....z.....#',
      '#....#..............#..#',
      '#.a..L..f........f..L.X#',
      '#....#....r.........#..#',
      '########################',
    ],
  },
  {
    name: 'Círculo V: Gula',
    sin: 'Gula',
    description: 'Osarios interminables; nada aquí se sacia.',
    fog: { color: [14, 22, 6], density: 0.16 },
    ambient: 44,          // nota base (Hz) del zumbido ambiental
    startAngle: 0,
    map: [
      '########################',
      '#P....SSSS.....SSSS....#',
      '#.........z.........z..#',
      '#..f...........a.......#',
      '#....SS....SSSS....SS..#',
      '#....SS..z.S..S.z..SS..#',
      '#..........S.cS........#',
      '#..z.......S..S.....z..#',
      'SSSSSS.SSSSS..SSSSS.SSSS',
      '#......S..........S....#',
      '#..d...S...h..r...S..d.#',
      '#......S..........S....#',
      '#......SSSS.SSSS..S....#',
      '#.z....................#',
      '#...SS....z..o.......z.#',
      '#.a.SS..f.......f....X.#',
      '#..........v...........#',
      '########################',
    ],
  },
  {
    name: 'Círculo VI: Envidia',
    sin: 'Envidia',
    description: 'Laberintos rúnicos que te observan.',
    fog: { color: [4, 22, 20], density: 0.15 },
    ambient: 58,          // nota base (Hz) del zumbido ambiental
    startAngle: 0,
    map: [
      'RRRRRRRRRRRRRRRRRRRRRRRR',
      'R.P....R.....r.....R...R',
      'R......R...........R.a.R',
      'R..f...R..RRR.RRR..R...R',
      'R.........R.....R......R',
      'R..d...R..R..c..R..R.d.R',
      'R......R..R.....R..R...R',
      'RRR.RRRR..RRR.RRR..RR.RR',
      'R...........z..........R',
      'R..r...RR.......RR..r..R',
      'R......RR...h...RR.....R',
      'RRRR.RRRR.RRRRR.RRR.RRRR',
      'R....R.............R...R',
      'R.z..R..d...o...d..R.v.R',
      'R....R.............R...R',
      'R.a.......f...f.....z.XR',
      'R....R....r........R...R',
      'RRRRRRRRRRRRRRRRRRRRRRRR',
    ],
  },
  {
    name: 'Círculo VII: Pereza',
    sin: 'Pereza',
    description: 'Una bruma gris y espesa que pesa en cada paso.',
    fog: { color: [16, 16, 22], density: 0.2 },
    ambient: 41,          // nota base (Hz) del zumbido ambiental
    startAngle: 0,
    map: [
      '########################',
      '#P.......#.......#.....#',
      '#........#...d...#..r..#',
      '#..f.....#.......#.....#',
      '#........##.###.##..a..#',
      '#....z.................#',
      '####.#######.#######.###',
      '#.......#.......#......#',
      '#..d....#...h...#...d..#',
      '#.......#.......#......#',
      '#.c.....#..z....#..c...#',
      '###.#####.#####.####.###',
      '#......#.........#.....#',
      '#..r...#..d..o...#..d..#',
      '#......#.........#.....#',
      '#.v....L...f...f.L...X.#',
      '#..a...#.........#..z..#',
      '########################',
    ],
  }
,
];

// Convierte un nivel en texto a: grid de números, sprites, enemigos e inicio.
// Cada casilla se coloca en su centro (+0.5).
export function parseLevel(def) {
  const grid = [];
  const sprites = [];
  const enemies = [];
  let start = { x: 1.5, y: 1.5 };
  let bossSpawn = null;

  def.map.forEach((row, y) => {
    grid.push([...row].map((ch, x) => {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (ch in WALLS) return WALLS[ch];
      if (ch in ENEMIES) enemies.push({ type: ENEMIES[ch], x: cx, y: cy });
      else if (ch in SPRITES) sprites.push({ type: SPRITES[ch], x: cx, y: cy });
      else if (ch === 'P') start = { x: cx, y: cy };
      else if (ch === 'o') bossSpawn = { x: cx, y: cy };
      return 0; // todo lo que no es pared es suelo
    }));
  });

  return { ...def, grid, sprites, enemies, start: { ...start, angle: def.startAngle }, bossSpawn };
}
