---
name: Toma
description: De una idea a un video. Pliego de pegatinas troqueladas sobre un fondo claro con retícula de puntos.
colors:
  pink: "#ff3d8b"
  pink-deep: "#c21f63"
  pink-soft: "#ffe2ee"
  cobalt: "#2d5bff"
  cobalt-soft: "#e4eaff"
  lime: "#b6f03c"
  lime-soft: "#ecfad0"
  lime-ink: "#3f5a0d"
  tang: "#ff8a1f"
  liner: "#eceef6"
  liner-dot: "#d3d7e6"
  sheet: "#ffffff"
  ink: "#15131a"
  ink-2: "#47444f"
  ink-3: "#636070"
  line: "#e2e4ee"
  line-2: "#c7cad9"
  danger: "#d8343f"
  ok: "#1f8a4c"
typography:
  display:
    fontFamily: "Gabarito, Onest, sans-serif"
    fontSize: "clamp(40px, 4.6vw, 68px)"
    fontWeight: 900
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Gabarito, Onest, sans-serif"
    fontSize: "36px"
    fontWeight: 900
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Gabarito, Onest, sans-serif"
    fontSize: "22px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  title-sm:
    fontFamily: "Gabarito, Onest, sans-serif"
    fontSize: "17px"
    fontWeight: 800
  action:
    fontFamily: "Gabarito, Onest, sans-serif"
    fontSize: "23px"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  body-lg:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 700
  small:
    fontFamily: "Onest, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
rounded:
  r-sheet: "28px"
  r-sticker: "18px"
  r-ctl: "14px"
  sm: "10px"
  md: "12px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "22px"
  xl: "32px"
  2xl: "48px"
components:
  button-toma:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.sheet}"
    typography: "{typography.action}"
    rounded: "20px"
    padding: "14px 30px 15px"
  button-toma-md:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.r-ctl}"
    padding: "7px 18px 8px"
  button-ink:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.r-ctl}"
    padding: "0 18px"
    height: "42px"
  button-ink-hover:
    backgroundColor: "#2b2833"
  button-soft:
    backgroundColor: "{colors.liner}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r-ctl}"
    padding: "0 18px"
    height: "42px"
  button-soft-hover:
    backgroundColor: "{colors.line}"
  button-ghost:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.r-ctl}"
    padding: "0 18px"
    height: "42px"
  chip:
    backgroundColor: "{colors.liner}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 12px 0 14px"
    height: "38px"
  chip-hover:
    backgroundColor: "{colors.line}"
  tab:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "38px"
  tab-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
  selected:
    backgroundColor: "{colors.cobalt-soft}"
    textColor: "{colors.cobalt}"
  input-idea:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    typography: "{typography.body-lg}"
    rounded: "22px"
    padding: "20px 22px"
  text-input:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r-ctl}"
    padding: "10px 12px"
  sheet:
    backgroundColor: "{colors.sheet}"
    rounded: "{rounded.r-sheet}"
    padding: "44px 48px 40px"
  sticker-tag:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.r-sticker}"
    padding: "0 14px 4px"
  sticker-count:
    backgroundColor: "{colors.tang}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 7px 2px"
    height: "26px"
---

# Design System: Toma

## Overview

**Creative North Star: "El pliego de pegatinas"**

Toda la interfaz es una sola capa física: pegatinas planas de color, troqueladas con un borde blanco grueso, pegadas sobre un pliego claro con retícula de puntos de corte. Cada video es una pegatina 9:16; crear es ver cómo se pegan al pliego; descargar es despegarla. La metáfora no es decoración: decide la forma (borde blanco, esquinas generosas, leve giro), la profundidad (una sombra corta y baja, nunca capas apiladas) y el movimiento (el golpe de «pegar» y la esquina que se levanta).

La densidad es baja y amable: hojas blancas grandes, titulares Gabarito muy negros y apretados, controles redondos con valores por defecto a un toque. El color plano se reparte con disciplina: rosa para actuar, cobalto para lo seleccionado, lima para los logros, mandarina para contar. El resto es tinta sobre blanco y pliego.

Rechazos confirmados por la dirección: la herramienta de IA oscura con caja de prompt y brillo violeta; degradados y brillos decorativos en la interfaz.

**Key Characteristics:**
- Pliego claro (`liner`) con retícula de puntos de 24px como fondo de toda la app.
- Pegatina = borde blanco de 5px + radio de 18px + sombra `lift`; es la unidad del sistema.
- Una sola capa: pegatina sobre pliego u hoja; nada de cajas dentro de cajas.
- Color plano de pegatina con roles fijos; cero degradados decorativos.
- Movimiento con resorte: «pegar» (slap) al aparecer, «despegar» (peel) al descargar.

## Colors

Cuatro colores de pegatina, planos y saturados, sobre una base fría de pliego, blanco y tinta violácea casi negra.

### Primary
- **Rosa ¡Toma!** (pink): la acción principal y solo ella. Botón ¡Toma!, botón de reproducir, interruptor encendido, barra de progreso, cursor de texto, acento de los deslizadores.
- **Rosa profundo** (pink-deep): texto rosa legible sobre claro (mensajes de «falta la idea», estado «creando» en el lote, hueco ocupado mientras se crea).
- **Rosa suave** (pink-soft): fondo del panel «Pídele a la IA», selección de texto, halo del campo cuando pide la idea.

### Secondary
- **Cobalto de paso** (cobalt): reservado para lo actual: opción elegida en un menú, escena activa, pestaña activa del panel, miniatura seleccionada, zona de soltar al pasar por encima, y el anillo de foco. También el enlace externo «Abrir».
- **Cobalto suave** (cobalt-soft): fondo de cualquier elemento seleccionado y halo del campo con foco.

### Tertiary
- **Lima de logro** (lima): pegatinas de celebración y avance: «Sale un video.», el sello del resultado, «¡Copiado!», aviso de éxito, casillas del medidor de material.
- **Lima suave / tinta lima** (lime-soft, lime-ink): estado «esta escena ya tiene material propio» en la línea de tiempo y en la ficha del medio importado.
- **Mandarina de conteo** (tang): solo contadores y la etiqueta «despegar» que asoma en la esquina. Nunca acción.

### Neutral
- **Pliego** (liner): fondo de la app; también relleno de botones suaves, chips, segmentos y hover de filas.
- **Punto de corte** (liner-dot): los puntos de la retícula del pliego.
- **Hoja** (sheet): hojas, pegatinas de video (su borde), modales, campos.
- **Tinta** (ink): texto principal, botón secundario «Retocar», pestaña activa de la barra, fondo de los lienzos de video.
- **Tinta 2 / Tinta 3** (ink-2, ink-3): texto secundario y terciario (pistas, metadatos, marcadores de posición).
- **Línea / Línea 2** (line, line-2): bordes de campos y separadores; línea 2 para bordes en hover y para los huecos punteados.
- **Peligro / Bien** (danger, ok): errores y confirmaciones de estado en texto.

### Named Rules
**The Un Color, Un Trabajo Rule.** Rosa actúa, cobalto señala lo actual, lima celebra, mandarina cuenta. Un color de pegatina nunca cambia de trabajo en otra pantalla.

**The Cobalto Reservado Rule.** El cobalto no decora ni llama a la acción: aparece solo donde algo está elegido, enfocado o recibiendo un arrastre.

## Typography

**Display Font:** Gabarito (con Onest de respaldo)
**Body Font:** Onest (con system-ui)

**Character:** Gabarito en 800-900 con tracking negativo da titulares gordos, de rótulo de pegatina; Onest pone la interfaz limpia y legible detrás.

### Hierarchy
- **Display** (900, clamp(40px, 4.6vw, 68px), 0.98): el titular de Crear y de En lote, máximo ~13ch, con `text-wrap: balance`. Una frase puede llevar su remate dentro de una pegatina lima.
- **Headline** (900, 36px, 1.02): título editable del video en Resultado.
- **Title** (800, 22px): títulos de sección («Tu pliego»), de modal y de cola; 17-20px en paneles y en la barra del editor.
- **Action** (800, 23px): el texto del botón ¡Toma! (17px en su versión media).
- **Body** (400, 15px, 1.5): interfaz general. El campo de idea sube a 21px para que escribir se sienta grande.
- **Label** (700, 13px): etiquetas de campo en `ink-2`; números de escena y estados en 12-13px con cifras tabulares.

### Named Rules
**The Rótulo Rule.** Gabarito solo para titulares, títulos, cifras-pegatina y el botón ¡Toma!; todo lo que se lee de corrido o se rellena va en Onest. Sin mayúsculas sostenidas ni tracking positivo.

## Layout

El fondo es el pliego entero, con retícula de puntos de 24px. Encima, el contenido se reparte en hojas blancas (`r-sheet`) o directamente sobre el pliego, nunca en cajas anidadas.

- **Crear:** dos columnas, hoja de composición `minmax(0, 1fr)` y «Tu pliego» de 320-440px, separadas 36px, contenedor máximo 1400px, márgenes laterales de 32px.
- **Tu pliego:** retícula de 3 columnas (2 en móvil) de pegatinas 9:16 con 18px de separación, cada una con un leve giro distinto (entre -2.5° y 2.5°) y un hueco punteado para el próximo video.
- **Resultado:** el video al ancho que pide su formato, centrado, y una columna lateral de 380px (320px por debajo de 1180px) con título, metadatos, acciones y material.
- **Retocar:** pantalla completa de alto fijo en tres columnas (236px escenas, centro flexible, 380px panel), separación de 16px; por debajo de 980px se apila con el reproductor primero y la lista de escenas en horizontal.
- **Ritmo:** pasos de 4, 8, 14, 22, 32 y 48px; la barra superior mide 72px (68px en el editor) con 32px de margen (16px en móvil).
- **Cortes:** 1180px, 980px y 640px.

## Elevation & Depth

Una sola capa. La profundidad es la de una pegatina sobre papel: una sombra corta y baja, compuesta por un fino canto de 2px y una caída difusa con desplazamiento negativo, que nunca sugiere flotar lejos. Las hojas usan la versión baja; las pegatinas, la media; lo que se acaba de pegar o se levanta (hover de pegatina de video, menús, modales, avisos), la alta. Al despegar, la sombra pasa a `drop-shadow` para que siga la silueta recortada de la esquina.

### Shadow Vocabulary
- **Lift bajo** (`--lift-lo`): hojas, miniaturas, contadores, controles blancos sobre pliego.
- **Lift** (`--lift`): pegatinas en reposo (videos, etiqueta lima, lienzo del editor).
- **Lift alto** (`--lift-hi`): pegatina levantada o recién pegada; menús y modales (más un anillo de 1px `line`).
- **Canto de tecla** (`0 4px 0 var(--pink-deep)` en ¡Toma!, `0 3px 0` en reproducir): única excepción a la sombra suave. Es el grosor del botón que se aprieta: al pulsar baja 3px y el canto casi desaparece. Solo en las dos acciones rosas; nunca en tarjetas ni pegatinas.
- **Foco** (`0 0 0 3px #fff, 0 0 0 5.5px cobalt`): anillo troquelado: blanco y luego cobalto.

### Named Rules
**The Una Capa Rule.** Nada se apila sobre algo que ya está apilado: dentro de una hoja o panel, las subsecciones se separan con una línea superior de 2px (`line`), no con otra caja con fondo.

## Shapes

Esquinas generosas y troquel blanco. Hoja 28px, pegatina 18px, control 14px; elementos pequeños 10-12px; chips, pestañas y metadatos en píldora (999px). El borde blanco es la firma: 5px en pegatinas, 6-7px en el lienzo del video, 3-4px en miniaturas, contadores y avisos. Las pegatinas pueden girar unos grados (-6° a 8°); los controles nunca. Los huecos por llenar (próximo video, zona de soltar, sugerencias de idea) son contornos discontinuos de 1.5-2.5px en `line-2`.

**The Esquina que se Despega Rule.** Lo que se puede llevar (un video) se marca levantando su esquina inferior derecha: la pegatina se recorta en diagonal y una solapa blanca, sombreada hacia el pliegue, se dobla encima. Es el único sombreado en degradado admitido en la interfaz.

## Components

### Buttons
Pegatinas que se aprietan; jerarquía clara, una sola acción rosa por vista.
- **Shape:** control de 14px (11px en pequeño), alto 42px (34px pequeño).
- **¡Toma! (primario):** rosa, texto blanco Gabarito 800 a 23px, borde troquelado blanco, radio 20px. Hover: sube 1px y gira -1°. Activo: se hunde 3px. Versión media (17px, radio 14px, borde 3px) en la barra del editor y en exportar. Siempre activo: si falta la idea, el campo tiembla y lo pide en rosa profundo.
- **Tinta:** fondo tinta, texto blanco; la segunda salida («Retocar», «Copiar prompt»). Hover `#2b2833`.
- **Suave:** relleno pliego, hover línea. **Fantasma:** texto `ink-2`, hover relleno pliego.
- **Icono:** 38px (30px pequeño), radio 12px, `ink-2`, hover relleno pliego; la variante de borrar se vuelve roja al pasar.

### Chips
- **Style:** píldora de 38px en pliego, etiqueta `ink-2` y valor en negrita `ink`, con flecha. Abren un menú blanco (radio 16px, lift alto) cuyas opciones elegidas van en cobalto sobre cobalto suave.
- **Sugerencias:** píldoras o pastillas con contorno discontinuo `line-2`; hover oscurece el borde y gira -1°.

### Cards / Containers
- **Hoja:** blanca, radio 28px, `lift-lo`; acoge la composición, los paneles del editor y la cola del lote.
- **Paneles internos:** no son tarjetas; se separan con línea superior de 2px.
- **Zona de soltar:** contorno discontinuo de 2.5px, radio 18px; al arrastrar encima, cobalto sobre cobalto suave y escala 1.02.

### Inputs / Fields
- **Campo de idea:** borde tinta de 2.5px, radio 22px, Onest 21px. Foco: halo de 5px cobalto suave. Falta idea: borde rosa profundo, halo rosa suave y sacudida lateral.
- **Campos del editor:** borde `line` de 2px, radio 14px; hover `line-2`; foco borde cobalto y halo de 4px cobalto suave.
- **Segmentos:** carril pliego, opción elegida en blanco con `lift-lo`. **Interruptor:** pista `line-2`, encendido rosa.

### Navigation
- **Barra superior:** logo-pegatina rosa girado -6° (endereza y crece en hover) junto a «Toma» en Gabarito 900; pestañas en píldora `ink-2`, la activa en tinta con texto blanco. En el editor, la barra lleva volver, título editable y la acción ¡Toma! media a la derecha.
- **Escenas:** lista vertical de filas de radio 16px con miniatura troquelada; la activa en cobalto suave con número cobalto.

### Pegatina de video (signature)
Lienzo 9:16 con borde blanco de 5px, radio 18px, fondo tinta, giro propio. Al aparecer, «slap»: cae desde 1.35× girada y rebota a su sitio, escalonada 70ms por pegatina. En hover se endereza y sube. La primera del pliego muestra la esquina levantada (26px); en hover la esquina sube a 38px y asoma la etiqueta mandarina «despegar». Los sellos lima («¡Toma!», «¡Copiado!») y el contador mandarina son pegatinas pequeñas del mismo troquel.

### Reproductor
Transporte en barra blanca de radio 18px: botón de reproducir rosa cuadrado de 44px, tiempo en cifras tabulares, línea de tiempo segmentada por escenas en pliego (activa en cobalto suave, con material en lima suave) y cabezal de 3px en tinta.

## Do's and Don'ts

### Do:
- **Do** usar el borde blanco troquelado (`--edge`, 5px) y `r-sticker` (18px) en todo lo que sea una pegatina: videos, sellos, contadores, etiquetas.
- **Do** reservar el rosa para la acción principal: una sola acción rosa visible por vista.
- **Do** marcar lo seleccionado, enfocado o recibiendo un arrastre en cobalto sobre cobalto suave, y nada más en cobalto.
- **Do** celebrar con pegatinas lima que entran con «slap» (0.45-0.55s, `--spring`).
- **Do** separar subsecciones dentro de una hoja con una línea superior de 2px `line`.
- **Do** respetar `prefers-reduced-motion`: animaciones y transiciones a 0.01ms.

### Don't:
- **Don't** usar degradados, brillos o resplandores decorativos en la interfaz; el único degradado es el sombreado de la solapa al despegar (y la retícula de puntos del pliego).
- **Don't** volver a la herramienta de IA oscura: nada de fondos negros de pantalla completa ni brillo violeta.
- **Don't** meter cajas dentro de cajas: una pegatina va sobre pliego u hoja, nunca sobre otra tarjeta con fondo.
- **Don't** girar controles ni texto de lectura; el giro es de las pegatinas.
- **Don't** usar mandarina para acciones ni lima para errores.
