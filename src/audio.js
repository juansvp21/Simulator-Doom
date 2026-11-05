// =============================================================
// audio.js — Sonido sintetizado con Web Audio API (sin archivos).
//
// IDEAS CLAVE
// - Un sonido es un "grafo" de nodos: fuente -> filtro -> volumen -> salida.
//   Fuentes: OscillatorNode (tono: sine, square, sawtooth, triangle) y un
//   buffer de ruido blanco (para disparos y explosiones).
// - La "envolvente" es cómo cambia el volumen en el tiempo: sube rápido
//   (ataque) y cae (decaimiento). Con eso un ruido se vuelve un disparo.
// - Sonido 3D básico: el volumen baja con la distancia y el panoramizado
//   (izquierda/derecha) sale del producto escalar entre la dirección al
//   sonido y el vector "derecha" del jugador.
// - Los navegadores no dejan reproducir audio hasta que el usuario hace
//   clic o pulsa una tecla: por eso initAudio() se llama en ese momento.
// =============================================================

let ctx = null;
let master, sfxBus, ambientBus;
let noiseBuffer = null;
let muted = false;
let cfgAudio = null;
const listener = { x: 0, y: 0, dirX: 1, dirY: 0 };
const lastPlayed = {}; // para no repetir el mismo sonido 20 veces en un frame
let ambient = null;

export function initAudio(cfg) {
  cfgAudio = cfg.audio;
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return; // navegador sin Web Audio: el juego sigue sin sonido
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = cfgAudio.master;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = cfgAudio.sfx;
  sfxBus.connect(master);
  ambientBus = ctx.createGain();
  ambientBus.gain.value = cfgAudio.ambient;
  ambientBus.connect(master);

  // 1 segundo de ruido blanco (valores aleatorios entre -1 y 1), reutilizable
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  if (pendingAmbient) startAmbient(pendingAmbient);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : cfgAudio.master;
  return muted;
}

export function isMuted() {
  return muted;
}

// La posición y orientación del jugador (las "orejas")
export function setListener(player) {
  listener.x = player.x;
  listener.y = player.y;
  listener.dirX = player.dirX;
  listener.dirY = player.dirY;
}

// ---------------------------------------------------------
// PIEZAS BÁSICAS
// ---------------------------------------------------------

// Envolvente: volumen 0 -> peak en `attack` segundos -> casi 0 al final.
// Usamos exponentialRamp porque el oído percibe el volumen de forma
// logarítmica: una caída exponencial suena "natural".
function envelope(gainNode, t, peak, attack, duration) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + duration);
}

// Tono con barrido de frecuencia (from -> to Hz)
function tone(out, t, { type = 'sine', from, to = from, duration, gain = 0.3, attack = 0.005 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + duration);
  const g = ctx.createGain();
  envelope(g, t, gain, attack, duration);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

// Ruido filtrado: el filtro decide el "color" (grave = explosión, agudo = chasquido)
function noise(out, t, { duration, filter = 'lowpass', from = 1000, to = from, q = 1, gain = 0.4, attack = 0.002 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = duration > 1;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + duration);
  const g = ctx.createGain();
  envelope(g, t, gain, attack, duration);
  src.connect(f).connect(g).connect(out);
  src.start(t);
  src.stop(t + duration + 0.05);
}

// ---------------------------------------------------------
// RECETAS DE SONIDO
// Cada una recibe la salida (con volumen y paneo ya aplicados) y el instante.
// ---------------------------------------------------------
const RECIPES = {
  // Armas
  pistola: (o, t) => { noise(o, t, { duration: 0.14, filter: 'bandpass', from: 1800, to: 600, gain: 0.5 }); tone(o, t, { type: 'square', from: 220, to: 70, duration: 0.08, gain: 0.15 }); },
  escopeta: (o, t) => { noise(o, t, { duration: 0.4, from: 1500, to: 150, gain: 0.8 }); tone(o, t, { type: 'sine', from: 120, to: 40, duration: 0.25, gain: 0.5 }); },
  ametralladora: (o, t) => { noise(o, t, { duration: 0.07, filter: 'bandpass', from: 2600, to: 1200, gain: 0.35 }); },
  lanzacohetes: (o, t) => { noise(o, t, { duration: 0.5, filter: 'bandpass', from: 300, to: 2200, q: 2, gain: 0.5 }); tone(o, t, { type: 'sawtooth', from: 90, to: 50, duration: 0.3, gain: 0.15 }); },
  especial: (o, t) => { tone(o, t, { type: 'sine', from: 1000, to: 180, duration: 0.45, gain: 0.35 }); tone(o, t, { type: 'square', from: 1900, to: 380, duration: 0.3, gain: 0.08 }); },
  recarga: (o, t) => { noise(o, t, { duration: 0.03, filter: 'highpass', from: 3000, gain: 0.3 }); noise(o, t + 0.18, { duration: 0.04, filter: 'highpass', from: 2200, gain: 0.35 }); },
  vacio: (o, t) => { noise(o, t, { duration: 0.025, filter: 'highpass', from: 4000, gain: 0.25 }); },
  cambio_arma: (o, t) => { noise(o, t, { duration: 0.05, filter: 'bandpass', from: 1200, gain: 0.25 }); },
  explosion: (o, t) => { noise(o, t, { duration: 1.1, from: 1200, to: 60, gain: 1 }); tone(o, t, { type: 'sine', from: 70, to: 25, duration: 0.8, gain: 0.7 }); },

  // Objetos
  moneda: (o, t) => { tone(o, t, { type: 'square', from: 988, duration: 0.07, gain: 0.12 }); tone(o, t + 0.07, { type: 'square', from: 1319, duration: 0.18, gain: 0.12 }); },
  municion: (o, t) => { tone(o, t, { type: 'triangle', from: 440, to: 660, duration: 0.15, gain: 0.25 }); },
  salud: (o, t) => { tone(o, t, { type: 'sine', from: 523, to: 784, duration: 0.25, gain: 0.3 }); },
  compra: (o, t) => { tone(o, t, { type: 'square', from: 1319, duration: 0.06, gain: 0.1 }); tone(o, t + 0.06, { type: 'square', from: 1760, duration: 0.2, gain: 0.1 }); },
  portal: (o, t) => { [392, 523, 659, 784].forEach((f, i) => tone(o, t + i * 0.09, { type: 'sine', from: f, duration: 0.5, gain: 0.2 })); },

  // Jugador
  dolor_jugador: (o, t) => { tone(o, t, { type: 'sawtooth', from: 190, to: 90, duration: 0.22, gain: 0.25 }); },
  golpe: (o, t) => { noise(o, t, { duration: 0.15, from: 500, to: 100, gain: 0.6 }); },

  // Enemigos (gruñidos: diente de sierra grave con un filtro que lo apaga)
  alerta_zombie: (o, t) => { tone(o, t, { type: 'sawtooth', from: 95, to: 70, duration: 0.7, gain: 0.25, attack: 0.08 }); },
  alerta_zombieRapido: (o, t) => { tone(o, t, { type: 'sawtooth', from: 240, to: 160, duration: 0.35, gain: 0.2, attack: 0.02 }); },
  alerta_demonio: (o, t) => { tone(o, t, { type: 'sawtooth', from: 70, to: 45, duration: 0.9, gain: 0.3, attack: 0.1 }); noise(o, t, { duration: 0.8, from: 400, to: 150, gain: 0.2, attack: 0.1 }); },
  enemigo_dolor: (o, t) => { tone(o, t, { type: 'sawtooth', from: 170, to: 120, duration: 0.12, gain: 0.2 }); },
  enemigo_muerte: (o, t) => { tone(o, t, { type: 'sawtooth', from: 150, to: 35, duration: 0.6, gain: 0.25 }); noise(o, t, { duration: 0.3, from: 800, to: 200, gain: 0.15 }); },
  bola_fuego: (o, t) => { noise(o, t, { duration: 0.5, filter: 'bandpass', from: 500, to: 900, q: 3, gain: 0.4 }); },
};

// Intervalo mínimo entre dos reproducciones del mismo sonido (segundos)
const MIN_GAP = 0.03;

// Reproduce un sonido. Si pos = {x, y}, se oye "en el mundo" (3D básico).
export function playSound(name, pos = null) {
  if (!ctx || muted || !RECIPES[name]) return;
  const t = ctx.currentTime;
  if (lastPlayed[name] !== undefined && t - lastPlayed[name] < MIN_GAP) return;
  lastPlayed[name] = t;

  let out = sfxBus;
  if (pos) {
    const dx = pos.x - listener.x;
    const dy = pos.y - listener.y;
    const dist = Math.hypot(dx, dy);
    // Volumen: 1 al lado, 0 a hearDistance (caída lineal)
    const volume = Math.max(0, 1 - dist / cfgAudio.hearDistance);
    if (volume <= 0) return;
    // Panoramizado: producto escalar con el vector "derecha" (-dirY, dirX).
    // +1 = totalmente a la derecha, -1 = a la izquierda, 0 = delante o detrás.
    const pan = dist > 0.01 ? ((dx / dist) * -listener.dirY + (dy / dist) * listener.dirX) : 0;
    const g = ctx.createGain();
    g.gain.value = volume;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) {
      panner.pan.value = Math.max(-1, Math.min(1, pan * 0.8));
      g.connect(panner).connect(sfxBus);
    } else {
      g.connect(sfxBus);
    }
    out = g;
  }
  RECIPES[name](out, t);
}

// ---------------------------------------------------------
// AMBIENTE: un zumbido grave distinto en cada círculo.
// Dos dientes de sierra casi iguales (base y base * 1.006) "baten" entre sí
// y producen una ondulación lenta; un filtro paso bajo que sube y baja con
// un LFO (oscilador muy lento) le da movimiento.
// ---------------------------------------------------------
let pendingAmbient = null;

export function startAmbient(baseFreq) {
  pendingAmbient = baseFreq;
  if (!ctx) return; // se arrancará en initAudio
  stopAmbient();
  const t = ctx.currentTime;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  filter.Q.value = 4;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.6, t + 2); // entra suave
  filter.connect(g).connect(ambientBus);

  const oscs = [baseFreq, baseFreq * 1.006, baseFreq / 2].map((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? 'sine' : 'sawtooth';
    o.frequency.value = f;
    o.connect(filter);
    o.start(t);
    return o;
  });
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 120; // el filtro oscila entre ~100 y ~340 Hz
  lfo.connect(lfoGain).connect(filter.frequency);
  lfo.start(t);

  ambient = { oscs: [...oscs, lfo], gain: g };
}

export function stopAmbient() {
  if (!ambient || !ctx) return;
  const t = ctx.currentTime;
  ambient.gain.gain.cancelScheduledValues(t);
  ambient.gain.gain.setValueAtTime(ambient.gain.gain.value, t);
  ambient.gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  ambient.oscs.forEach((o) => o.stop(t + 0.6));
  ambient = null;
}
