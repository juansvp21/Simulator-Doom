# Shooter retro (años 90)

Shooter en primera persona con raycasting, hecho en JavaScript puro.

## Cómo jugar

Usa módulos ES, así que **no funciona abriendo `index.html` con doble clic**
(el navegador bloquea los módulos en `file://`). Levanta un servidor local:

```bash
npx serve
```

y abre la dirección que muestra (normalmente http://localhost:3000).

## Controles

- **WASD**: moverse (A/D = paso lateral)
- **Ratón** o **← →**: girar
- **Clic**: capturar el ratón (primer clic) y disparar
- **R**: recargar (y reintentar al morir)
- **1-5** o **rueda del ratón**: cambiar de arma
- **E**: cruzar el portal de salida (se abre al eliminar a todos los enemigos)
- **Esc**: soltar el ratón

## Estado

- [x] Fase 1: raycaster básico, paredes de colores, movimiento y colisiones
- [x] Fase 2: texturas infernales, suelo/techo, niebla roja y sprites
- [x] Fase 3: pistola rúnica, disparo hitscan, recarga y HUD
- [x] Fase 4: enemigos con IA (Condenado, Poseído, Demonio ígneo), daño y muerte
- [x] Fase 5: escopeta, ametralladora, lanzacohetes, Cetro del Abismo y cambio de arma
- [x] Fase 6: monedas, portal de salida, bonos, tienda del Mercader de Almas y mejoras
- [ ] Fase 7: niveles, jefe, sonido y guardado
- [ ] Fase 8: pulido
