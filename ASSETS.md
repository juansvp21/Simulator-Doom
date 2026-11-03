# Assets

Todo el arte del juego se genera por código en `src/textures.js`. No se usan imágenes, sonidos ni fuentes externas.

| Asset | Tipo | Cómo se genera |
|---|---|---|
| Roca volcánica (pared 1) | Textura 64×64 | Bloques + ruido fBm + grietas por curva de nivel del ruido |
| Ladrillo infernal (pared 2) | Textura 64×64 | Ladrillos desplazados por fila, tono aleatorio por ladrillo |
| Muro de calaveras (pared 3) | Textura 64×64 | Figuras geométricas (círculos, triángulo) evaluadas píxel a píxel |
| Hierro rúnico (pared 4) | Textura 64×64 | Placa con remaches, anillo y rayos brillantes en coordenadas polares |
| Lava (pared 5) | Textura 64×64, animada | Ruido fBm mapeado a un degradado negro → rojo → amarillo |
| Suelo de basalto / techo de roca | Texturas 64×64 | Baldosas + ruido + grietas |
| Brasero (4 fotogramas), estaca con calavera, cristal de alma | Sprites 64×64 | Dibujados con la API de canvas 2D y convertidos a píxeles |

Si en el futuro se añaden assets externos, deben tener licencia **CC0** y su fuente se anotará en esta tabla.
