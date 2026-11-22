---
name: Pizarra
description: Clase dibujada con tiza sobre pizarra verde oscura: trazos a mano, flechas, subrayados y esquemas que se escriben solos.
---

# Pizarra: explicación a tiza

Un profesor invisible dibuja la idea mientras la cuenta. Sirve para enseñar: procesos, comparaciones, listas de pasos.

## Guion

1. **Pregunta** (primera escena): la duda escrita en la pizarra, subrayada.
2. **Desarrollo**: un paso o concepto por escena, cada uno con su dibujo simple (caja, flecha, círculo, cara sencilla).
3. **Resumen** (última escena): el esquema completo con las piezas de antes, y una palabra rodeada con un círculo.

- `headline`: 2 a 5 palabras, es lo que se "escribe" en la pizarra.
- `narration`: tono de profe cercano, una idea por escena.
- `visualPrompt`: qué se dibuja y en qué orden ("se escribe AHORRO arriba; debajo, tres cajas unidas por flechas; la tercera se rodea con un círculo").

## Lenguaje visual

- **Fondo**: verde pizarra `#1f3b33` con viñeta más oscura en los bordes y un velo de polvo de tiza: manchas claras muy tenues (`rgba(255,255,255,0.03)`), en posiciones fijas con `h.rand`.
- **Tiza**: blanco roto `#f3efe4` para casi todo; un amarillo `#f6d96b` y un rosa `#f29ca3` solo para resaltar una cosa por escena.
- **Trazo a mano**: `lineWidth = u * 0.55`, extremos redondos, y un temblor leve: desplaza cada punto ±`u * 0.15` con `h.rand(indice)` (fijo, no cambia entre fotogramas). Repasa las líneas importantes dos veces con otro temblor.
- **Letra**: `600 ${u * 5}px "Segoe Print", "Comic Sans MS", system-ui, sans-serif`, ligeramente inclinada (rotación de -2° a 2°).
- **Recursos**: subrayado doble, flechas con punta abierta, círculos imperfectos, asteriscos, llaves.

## Movimiento

- Todo se **escribe**: el texto aparece letra a letra (`text.slice(0, n)`), las líneas con `lineDashOffset`.
- Orden de arriba abajo y de izquierda a derecha, como escribe una persona.
- Tras escribir, un detalle sigue vivo: el subrayado se repasa, una flecha late, cae polvo de tiza.

## Piezas

```js
const u = Math.min(W, H) / 100;
const chalk = "#f3efe4";
// línea temblorosa de (x1,y1) a (x2,y2), p de 0 a 1
function hand(x1, y1, x2, y2, p, seed) {
  const n = 14; ctx.beginPath();
  for (let i = 0; i <= n * p; i++) { const k = i / n; const jx = (h.rand(seed + i) - 0.5) * u * 0.3, jy = (h.rand(seed + i + 50) - 0.5) * u * 0.3; const x = h.lerp(x1, x2, k) + jx, y = h.lerp(y1, y2, k) + jy; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.strokeStyle = chalk; ctx.lineWidth = u * 0.55; ctx.lineCap = "round"; ctx.stroke();
}
// texto que se escribe
function write(text, x, y, p, size) { ctx.font = `600 ${size}px "Segoe Print", "Comic Sans MS", system-ui, sans-serif`; ctx.fillStyle = chalk; ctx.textAlign = "center"; ctx.fillText(text.slice(0, Math.round(text.length * p)), x, y); }
```

## Evita

- Líneas perfectas, tipografía de imprenta, sombras, brillos.
- Más de dos colores de resalte en una escena.
- Borrar y redibujar todo entre escenas sin motivo.
