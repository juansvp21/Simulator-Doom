# Proyecto: shooter retro estilo años 90 (zombies y demonios)

## Qué es
Shooter en primera persona estilo "boomer shooter" de los 90: pasillos, oleadas de zombies y demonios,
armas mejorables y una tienda entre niveles. Personajes, nombres y arte 100 % originales
(nada de nombres, logos ni sprites de juegos existentes).

## Tecnología
- HTML + CSS + JavaScript puro (módulos ES), sin frameworks ni motores.
- Render con raycasting 2.5D sobre <canvas> (paredes por columnas, enemigos como sprites).
- Sprites y texturas generados por código o assets libres con licencia CC0 (indicar la fuente en ASSETS.md).
- Sonido con Web Audio API.
- Se juega abriendo index.html o con un servidor local simple (npx serve).

## Estructura
```
index.html
style.css
src/
  main.js        # arranque y bucle del juego (requestAnimationFrame + delta time)
  input.js       # teclado y ratón (Pointer Lock)
  map.js         # mapas como matrices de números
  raycaster.js   # render de paredes, suelo/techo y sprites
  player.js      # movimiento, colisiones, vida, armadura
  enemies.js     # tipos de enemigo y su IA
  weapons.js     # armas, munición y mejoras
  shop.js        # tienda entre niveles
  hud.js         # vida, munición, dinero, arma actual
  audio.js
  save.js        # progreso en localStorage
```

## Mecánicas
- Controles: WASD para moverse, ratón para apuntar, clic para disparar, 1-5 para cambiar de arma,
  R para recargar, E para interactuar.
- Enemigos: zombie lento, zombie rápido, demonio que lanza bolas de fuego y un jefe al final de cada mundo.
  IA con estados (patrullar → perseguir → atacar → morir) y línea de visión con raycasting.
- Armas: pistola, escopeta, ametralladora, lanzacohetes y una arma especial. Cada una tiene daño,
  cadencia, cargador y dispersión.
- Mejoras por arma (3 niveles cada una): daño, cadencia, cargador y recarga.
- Economía: los enemigos sueltan monedas y al final del nivel hay un bono por tiempo y precisión.
- Tienda entre niveles: comprar armas nuevas, mejoras, munición, botiquines y armadura.
- Progreso guardado (dinero, armas, mejoras, nivel alcanzado).

## Forma de trabajar
- Soy estudiante y quiero aprender: comenta las partes clave (sobre todo la matemática del raycasting)
  y al terminar cada fase explica en pocas líneas qué hiciste y por qué.
- Trabaja por fases. Antes de cada fase muestra el plan y espera mi visto bueno.
- Al cerrar cada fase haz un commit con un mensaje claro en español.
- Valores de balance (daño, precios, vida) en un solo archivo de configuración (src/config.js)
  para poder ajustarlos sin tocar la lógica.
- Si algo no funciona o no estás seguro, dilo en vez de inventarlo.

## Fases
1. Raycaster básico: mapa, paredes con colores, movimiento y colisiones.
2. Texturas, suelo/techo y sprites.
3. Una arma (pistola) con disparo, retroceso y HUD.
4. Enemigos con IA, daño y muerte.
5. Resto de armas y cambio de arma.
6. Dinero, tienda y sistema de mejoras.
7. Niveles, jefe, sonido y guardado.
8. Pulido: menú, pausa, opciones de sensibilidad, balance.
