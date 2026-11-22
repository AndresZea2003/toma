# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React + TypeScript, ejecutado en local (`npm run dev`). La IA se llama desde un middleware del propio servidor de Vite (`server/`), así la clave de la API nunca llega al navegador. Elegido por el asistente (delegado): el usuario pidió la herramienta sin fijar stack.

## Users

Creadores de contenido que publican historias y reels a menudo (Instagram, TikTok, YouTube Shorts) y necesitan producir rápido, sin saber editar video. Trabajan con prisa, a menudo con varias ideas a la vez, y quieren ver un resultado publicable en minutos.

## Product Purpose

Convertir una idea escrita en una frase en un video animado listo para publicar: la IA escribe el guion y dirige las escenas, el creador ajusta lo que quiera y exporta. El éxito es que el creador pase de idea a archivo descargado en pocos minutos, sienta que el resultado es suyo y vuelva a crear otro.

## Positioning

Idea → video animado sin plantillas ni línea de tiempo profesional: el guion y la dirección de escena los hace la IA, y la animación es generativa (fondos ilustrados, personajes emoji animados, música generada), así que no requiere banco de imágenes, licencias de música ni conocimientos de edición. Sirve igual para historias narrativas (cuentos con personajes) y para contenido de redes (ganchos, consejos, listas, anuncios).

## Operating Context

- Se usa en el navegador de escritorio, en local.
- Flujo principal: escribir idea → elegir formato/duración/tono → la IA genera escenas → revisar y retocar → exportar MP4/WebM.
- Automatización: varias ideas (una por línea) se convierten en varios videos y se exportan en cadena.
- Los proyectos se guardan en el navegador (localStorage).

## Capabilities and Constraints

- Guion con Claude (`claude-opus-5-5`) mediante salidas estructuradas; sin clave funciona un "modo demo" con un generador local.
- Formatos: 9:16 (historia), 1:1, 16:9. Duraciones 15–60 s.
- Edición por escena: texto, narración/subtítulos, duración, fondo ilustrado o imagen propia, personajes emoji con movimiento, cámara, transición; y cambios pedidos en lenguaje natural a la IA.
- Exportación en tiempo real con MediaRecorder: el video incluye música y subtítulos; la voz del navegador solo suena en la vista previa (no se puede grabar).
- Abierto: generación de imágenes con IA y voz grabable (requieren otro proveedor).

## Brand Commitments

- Nombre: **Toma** (confirmado por el usuario). Juega con "toma" de rodaje y con la exclamación "¡toma!" de logro.
- Idioma de la interfaz: español.
- Sensación buscada (pedida por el usuario): lo más simple y fácil posible, nunca abrumadora, que dé dopamina, satisfacción y sensación de control.

## Outside Generators (confirmed by the user)

Toma no depende solo de claves de API. Debe aprovechar las herramientas de generación que el creador ya usa con sus cupos gratuitos o incluidos (Google Flow para clips de video, generación de imágenes de ChatGPT/Codex, y similares):

- Toma escribe, por escena, prompts listos para copiar y pegar en cada herramienta (formato, relación de aspecto, estilo y personaje coherentes).
- El creador trae de vuelta lo generado (imagen o clip) arrastrándolo a la escena; Toma lo integra en el video.
- Es recursivo: lo importado (por ejemplo, la hoja de personaje) pasa a ser referencia para los siguientes prompts, para mantener coherencia entre escenas.
- La API de Claude es opcional: sin clave, el guion y los prompts salen del generador local.
- **Piloto automático (confirmado por el usuario, aceptando el riesgo de condiciones de uso):** Toma controla una ventana de Chrome con perfil propio para generar en Flow (clips e imágenes) y en ChatGPT (imágenes), descargar el resultado y pegarlo en la escena. El creador inicia sesión él mismo; Toma nunca escribe contraseñas ni resuelve verificaciones. Si la web cambia, pasa a modo asistido.
- **Audio:** pista de música propia (p. ej. de Flow Music), voz en off por escena (grabada, subida o generada) y sonido de los clips; todo se mezcla en la vista previa y en el video exportado, bajando la música cuando habla la voz.

## Confirmed Flow Decisions

- Crear = un solo campo de idea y un botón; formato, duración y tono tienen valores por defecto y se cambian con un toque.
- Tras generar, lo primero es el video reproduciéndose en grande con dos salidas claras: descargar o retocar. El editor detallado solo aparece al entrar a retocar.

## Evidence on Hand

No hay testimonios, clientes, métricas ni ejemplos publicados. No inventarlos.

## Product Principles

1. **Una sola decisión obligatoria:** escribir la idea. Todo lo demás tiene un buen valor por defecto y se puede cambiar después.
2. **Resultado visible cuanto antes:** el creador ve su video moviéndose antes de tener que configurar nada.
3. **El creador manda:** la IA propone, el creador decide; todo cambio se ve al instante y se puede deshacer o pedir de otra forma.
4. **Recompensar el avance:** cada paso terminado (guion listo, escena retocada, video exportado) se siente como un logro.
5. **Mostrar poco, revelar al pedirlo:** los controles avanzados aparecen solo cuando el creador entra en ellos.
