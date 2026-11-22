---
name: Bloques
description: Tipografía cinética y formas planas de color: palabras enormes que empujan, giran y se apilan al ritmo de la voz.
---

# Bloques: tipografía cinética

Para ganchos, listas y anuncios con energía. La palabra es el personaje.

## Guion

1. **Golpe** (primera escena): una o dos palabras enormes.
2. **Lista o argumento**: una idea por escena, con una palabra clave y un número si lo hay.
3. **Llamada** (última escena): la acción que se pide, sobre el color más vivo.

- `headline`: 1 a 4 palabras, se usan como la pieza gigante de la escena.
- `narration`: frases cortas con ritmo.
- `visualPrompt`: qué palabra entra, por dónde, y qué forma la acompaña ("AHORRA entra desde abajo ocupando todo el ancho; un círculo amarillo rueda de izquierda a derecha detrás").

## Lenguaje visual

- **Fondo**: un color plano por escena, alternando entre `#ff3d8b`, `#2d5bff`, `#15131a`, `#b6f03c` y `#ff8a1f`. Nunca degradados.
- **Texto**: negrita máxima (`900 ${px}px system-ui, "Segoe UI", sans-serif`), en mayúsculas, ajustado para ocupar el 86 % del ancho (mide con `measureText` y escala). Blanco sobre rosa, azul y negro; negro `#15131a` sobre lima y mandarina.
- **Formas**: círculos, barras y cuartos de círculo planos, en otro color de la paleta, grandes y cortados por el borde.
- **Composición**: una palabra principal por escena; la secundaria, mucho más pequeña, pegada a ella.

## Movimiento

- Entradas rápidas (0,25-0,35 s) con `h.easeOutBack`: desde fuera del lienzo, o escalando desde 0.
- Las palabras de varias líneas entran una línea tras otra, cada 0,15 s.
- Tras entrar, un vaivén corto (rotación ±1,5°) o un latido de escala al 3 %.
- El cambio de color de fondo es un barrido: una barra del nuevo color cruza la pantalla.

## Piezas

```js
const u = Math.min(W, H) / 100;
// texto ajustado al ancho, centrado en (x, y)
function fit(text, x, y, maxW, k = 1) { let px = u * 30; ctx.font = `900 ${px}px system-ui, "Segoe UI", sans-serif`; px *= Math.min(1, maxW / ctx.measureText(text).width); ctx.font = `900 ${px * k}px system-ui, "Segoe UI", sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, x, y); return px; }
```

## Evita

- Texto pequeño, minúsculas largas, sombras, contornos.
- Más de tres colores en una escena.
- Movimiento lento o lineal.
