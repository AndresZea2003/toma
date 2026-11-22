# Toma

De una idea a un video animado, en un minuto. Toma escribe el guion, dirige las escenas y genera la música; tú retocas lo que quieras y descargas el video.

## Arrancar

```powershell
npm install
npm run dev
```

Abre http://localhost:5173.

### App de escritorio (Windows)

```powershell
npm run desktop
```
abre Toma en su propia ventana. Para generar el instalador:

```powershell
npm run dist
```
deja `release/Toma Setup <versión>.exe`. La app guarda sus datos (perfil de Chrome del piloto, `.env` con la clave de IA) en `%APPDATA%\Toma`.

**Actualizaciones:** la app instalada busca una versión nueva al abrir, la descarga y la instala al cerrar. Para activarlo hay que publicar las versiones en un repositorio de GitHub: añadir `"publish": { "provider": "github", "owner": "...", "repo": "..." }` en `build` de `package.json`, subir el número de `version` y ejecutar `npx electron-builder --win --publish always` con un `GH_TOKEN`.

### Biblioteca de estilos

El chip **Estilo** elige cómo se ve el video:

- **Ilustrado**: fondos y emojis animados de Toma (no necesita IA).
- **Estilos animados por IA** (Diagrama, Pizarra, Bloques y los tuyos): cada estilo es una *skill* en `styles/<id>/SKILL.md` que enseña al modelo a guionizar y a animar. La IA escribe el código de animación de cada escena y Toma lo ejecuta aislado, sin acceso a red ni a tus datos.
- **Crear estilo…**: describes el estilo y la IA escribe su skill. Las tuyas se guardan en la carpeta de datos de Toma (`styles/`), y puedes editarlas a mano.

Cada animación se prueba al llegar; si falla, la IA la corrige sola. En la pestaña Visual puedes rehacerla o pedir un cambio.

### Quién escribe los guiones

El chip de IA de la barra superior elige proveedor, modelo y esfuerzo:

- **Claude Code** o **Codex**: usan la herramienta instalada en tu equipo con tu sesión, sin clave de API.
- **API de Claude**: con `ANTHROPIC_API_KEY` en `.env`; sin clave, modo demo.

### Con IA (opcional)

Copia `.env.example` como `.env` y pon tu `ANTHROPIC_API_KEY`. Sin clave, Toma funciona en **modo demo** con un generador local (guion de plantilla, mismos fondos, música y exportación).

La clave solo vive en el servidor local (middleware de Vite en `server/`); nunca llega al navegador.

## Cómo se usa

1. **Crear**: escribe la idea y pulsa **¡Toma!**. Formato, duración, tono, estilo e idioma tienen valores por defecto; cámbialos con un toque si quieres.
2. **Resultado**: el video arranca solo. **Descargar video** o **Retocar**.
3. **Retocar**: escena a escena, en tres pestañas:
   - **Texto**: pídele cambios a la IA en lenguaje natural, o edita titular, narración y duración.
   - **Visual**: fondo ilustrado, personajes emoji y su movimiento, cámara y transición.
   - **Material**: prompts listos para **Google Flow** (clips) y **ChatGPT** (imágenes). Cópialos, genera con tus usos gratis y arrastra el resultado de vuelta a la escena (o directamente sobre la vista previa).
4. **En lote**: una idea por línea → varios videos → grabar y descargar todos seguidos.

### El ciclo con Flow / ChatGPT

1. En **Material → Personaje y estilo**, copia el prompt de la hoja de personaje y genérala en ChatGPT.
2. Suelta esa imagen como referencia: desde ahí, todos los prompts piden adjuntarla para que el personaje salga igual en cada escena.
3. Por cada escena, copia el prompt de Flow o ChatGPT, genera y arrastra el clip o imagen a la escena.
4. **Copiar todos los prompts** (en la pantalla de resultado) te da el kit completo del video en un solo texto.

## Piloto automático (Flow y ChatGPT)

Toma puede hacer el trabajo por ti en las webs de Flow y ChatGPT:

- **Generar todo con Flow** (pantalla de resultado) o **Que Toma lo genere** (pestaña Material de cada escena).
- Toma abre una ventana de Chrome con un perfil propio (`.toma-browser/`), pega el prompt, pulsa generar, espera el resultado, lo descarga y lo pega en la escena. Va escena por escena, con ritmo humano.
- **La primera vez inicias sesión tú** en esa ventana (Google para Flow, OpenAI para ChatGPT). Toma nunca escribe contraseñas ni resuelve verificaciones; la sesión queda guardada en ese perfil.
- **Modo asistido:** si la web cambió y Toma no encuentra un botón, te lo pide; tú pulsas generar en la ventana y Toma recoge el resultado igualmente.
- Aviso: automatizar estas webs puede ir contra sus condiciones de uso, y abusar puede limitar tu cuenta. Úsalo con moderación.
- **Voces con Gemini:** «Que Gemini lea la narración» (pestaña Texto) o «Voces con Gemini» para todo el video. Toma usa el generador de voz de Google AI Studio con tu cuenta de Google. Si la voz dura más que la escena, la escena se alarga sola.
- **Música con Flow Music:** «Flow Music» en Ajustes del video o «Música» en la pantalla de resultado. Flow Music (flowmusic.app) pide iniciar sesión aparte la primera vez.
- Opcional en `.env`: `FLOW_URL`, `CHATGPT_URL`, `AISTUDIO_URL`, `FLOWMUSIC_URL`, `CHROME_PATH`.

## Audio

- Voz en off por escena: generarla con Gemini, **grabarla con tu micrófono** o subir un audio.
- Música: la generada por Toma, una pista de Flow Music o tu propio archivo, con control de volumen.
- Clips de Flow: activa «Usar el sonido del clip» para conservar su audio.
- Todo se mezcla en la vista previa y en el video exportado; la música baja sola cuando habla la voz.

## Exportación

Se graba en el navegador en tiempo real (MP4 en Chrome/Edge recientes, si no WebM) con música y subtítulos. La voz del navegador solo suena en la vista previa. Los clips importados se reproducen mudos dentro del video.

## Estructura

- `server/`: llamadas a Claude con salidas estructuradas (`claude-opus-5-5`, con respaldo automático si se rechaza).
- `src/engine/`: motor de render en canvas, fondos procedurales, música generativa, exportación.
- `src/lib/`: prompts para generadores externos, almacén de medios (IndexedDB), generador demo.
- `src/components/`: interfaz (Crear, Resultado, Retocar, Lote).
- `PRODUCT.md` y `.impeccable/`: contexto de producto y dirección de diseño.
