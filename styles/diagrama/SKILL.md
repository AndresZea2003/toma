---
name: Diagrama
description: Explicativo en blanco sobre negro, con pictogramas de línea, personas tipo silueta y diagramas que se dibujan solos.
---

# Diagrama: explicativo monocromo

Un video de ideas (dinero, hábitos, psicología, negocios) contado como un diagrama vivo. Todo es blanco sobre negro. Nada decora: cada trazo explica algo.

## Guion

Cada video sigue cuatro tiempos, y las escenas se reparten entre ellos:

1. **Gancho** (primera escena, corta): una afirmación o contraste que no cuadra. Un solo objeto en pantalla y una cifra o etiqueta.
2. **Ejemplo**: una persona concreta en una situación concreta. Se presenta el personaje (la silueta) y lo que tiene o le falta.
3. **Números**: la idea se demuestra con una cifra que cambia, una comparación de dos cosas o una curva.
4. **Cierre en bucle** (última escena): una frase que resuelve y deja la misma imagen del inicio, para que el video pueda repetirse.

Reglas del texto:
- `headline`: 2 a 5 palabras, se usa como etiqueta dentro del diagrama, no como titular gigante.
- `narration`: frases cortas, habladas, de segunda persona. Una idea por escena.
- `visualPrompt`: describe el diagrama de la escena: qué objetos hay, dónde, qué se mueve y en qué orden. Ejemplo: "silueta con birrete a la izquierda sobre el suelo; a la derecha aparece una cartera de línea con la etiqueta $0; un signo ? late entre los dos".
- El mismo personaje (silueta con el mismo accesorio) aparece en todas las escenas donde hay persona.

## Lenguaje visual

- **Fondo**: negro puro `#000`, con un resplandor radial muy tenue (blanco al 5-7 %) detrás del elemento principal.
- **Tinta**: solo blanco y grises. Blanco `#fff` para lo principal, `rgba(255,255,255,0.55)` para lo secundario, `rgba(255,255,255,0.25)` para guías y lo que ya pasó. Ningún color.
- **Trazo**: línea fina y uniforme, `lineWidth = u * 0.35`, extremos y uniones redondos. Los iconos (cerebro, cartera, reloj, cohete, trofeo, documento) son de contorno, nunca rellenos.
- **Personas**: silueta sólida blanca: círculo de cabeza y torso de hombros redondeados, sin cara ni piernas. Un accesorio la identifica (birrete, corbata, auriculares). Los secundarios van en gris.
- **Suelo**: una línea horizontal punteada tenue a ~62 % de la altura en vertical (~70 % en horizontal); las personas se apoyan en ella.
- **Etiquetas**: píldora pequeña de borde fino con texto en mayúsculas, muy espaciado (`letterSpacing`), tamaño `u * 1.6`. Flotan encima del objeto al que nombran.
- **Cifras**: grandes y en negrita (`800`, tamaño `u * 6` a `u * 9`), debajo o al lado de su objeto. Cuando cambian, cuentan (interpolan) hasta su valor.
- **Brillo**: `shadowColor = "#fff"`, `shadowBlur = u * 3` solo en el protagonista de la escena.
- **Composición**: mucho negro. Como máximo 4 elementos a la vez. En vertical, el diagrama vive entre el 12 % y el 72 % de la altura; por debajo va el subtítulo.

## Movimiento

- Nada aparece de golpe: cada elemento entra en 0,4-0,6 s con `h.ease`, escalonado 0,25-0,4 s respecto al anterior.
- Las líneas y contornos **se dibujan**: usa `setLineDash([len, len])` con `lineDashOffset = len * (1 - p)`.
- Las siluetas entran subiendo un poco desde el suelo con `h.easeOutBack`.
- Siempre hay algo vivo después de la entrada: un `?` que late, un cursor que parpadea, una respiración de ±1 % en la silueta, el resplandor que oscila.
- Lo que deja de importar se atenúa a gris, no desaparece.
- Las flechas y conexiones son curvas punteadas que avanzan.

## Piezas

```js
// unidad y fuente
const u = Math.min(W, H) / 100;
const font = (px, w = 600) => `${w} ${px}px system-ui, "Segoe UI", sans-serif`;
const gy = H * (H > W ? 0.62 : 0.7); // suelo

// fondo con resplandor
ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
const g = ctx.createRadialGradient(W / 2, H * 0.4, 0, W / 2, H * 0.4, Math.max(W, H) * 0.6);
g.addColorStop(0, "rgba(255,255,255,0.07)"); g.addColorStop(1, "rgba(255,255,255,0)");
ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

// suelo punteado
ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = u * 0.2; ctx.setLineDash([u * 0.5, u * 0.9]);
ctx.beginPath(); ctx.moveTo(W * 0.06, gy); ctx.lineTo(W * 0.94, gy); ctx.stroke(); ctx.setLineDash([]);

// silueta apoyada en el suelo (x centro, s tamaño, a opacidad, cap = birrete)
function person(x, s, a, cap) {
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = "#fff";
  ctx.beginPath(); ctx.arc(x, gy - s * 1.55, s * 0.42, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(x - s * 0.62, gy - s * 1.02, s * 1.24, s * 1.02, [s * 0.5, s * 0.5, s * 0.08, s * 0.08]); ctx.fill();
  if (cap) { ctx.beginPath(); ctx.moveTo(x - s * 0.7, gy - s * 2.02); ctx.lineTo(x, gy - s * 2.3); ctx.lineTo(x + s * 0.7, gy - s * 2.02); ctx.lineTo(x, gy - s * 1.78); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}

// etiqueta en píldora centrada en (x, y)
function pill(text, x, y, a) {
  ctx.save(); ctx.globalAlpha = a; ctx.font = font(u * 1.6, 700); ctx.letterSpacing = `${u * 0.25}px`;
  const w = ctx.measureText(text.toUpperCase()).width + u * 2.4, hh = u * 3.2;
  ctx.strokeStyle = "rgba(255,255,255,0.7)"; ctx.lineWidth = u * 0.18;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - hh / 2, w, hh, hh / 2); ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text.toUpperCase(), x, y + u * 0.1);
  ctx.restore();
}

// trazo que se dibuja: p de 0 a 1
function drawn(path, len, p) {
  ctx.save(); ctx.strokeStyle = "#fff"; ctx.lineWidth = u * 0.35; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.setLineDash([len, len]); ctx.lineDashOffset = len * (1 - p); ctx.stroke(path); ctx.restore();
}

// cifra que cuenta
const count = (from, to, p) => Math.round(from + (to - from) * h.easeInOut(p)).toLocaleString("es");
```

## Evita

- Color, degradados de color, emojis, fotos o texturas.
- Rellenar los iconos o usar más de un grosor de línea.
- Párrafos en pantalla: como mucho una etiqueta y una cifra por objeto.
- Elementos pegados al borde o por debajo del 74 % de la altura en vertical.
- Movimiento continuo de todo a la vez: uno se mueve, el resto espera.
