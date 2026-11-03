# Shooter retro (años 90)

Shooter en primera persona con raycasting, hecho en JavaScript puro.

## Cómo jugar

Usa módulos ES, así que **no funciona abriendo `index.html` con doble clic**
(el navegador bloquea los módulos en `file://`). Levanta un servidor local:

```bash
npx serve
```

y abre la dirección que muestra (normalmente http://localhost:3000).

## Controles (Fase 1)

- **WASD**: moverse (A/D = paso lateral)
- **Ratón** o **← →**: girar
- **Clic**: capturar el ratón · **Esc**: soltarlo

## Estado

- [x] Fase 1: raycaster básico, paredes de colores, movimiento y colisiones
- [x] Fase 2: texturas infernales, suelo/techo, niebla roja y sprites
- [ ] Fase 3: pistola y HUD
- [ ] Fase 4: enemigos con IA
- [ ] Fase 5: resto de armas
- [ ] Fase 6: dinero, tienda y mejoras
- [ ] Fase 7: niveles, jefe, sonido y guardado
- [ ] Fase 8: pulido
