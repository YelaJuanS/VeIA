# VeIA — Prototipo de marketing (Lean Startup)

Landing de **VeIA** (seguimiento en tiempo real de fallas eléctricas) construida en
**Next.js** con captura de datos en **Vercel KV / Upstash Redis**. Mide interés real:
visitas por canal, clics en el CTA, contactos, y un test cualitativo de comprensión.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | La landing. Acepta `?canal=...` o `?utm_source=...` para atribuir el tráfico. |
| `/test` | **Ruta oculta** para el test de comprensión: muestra el prototipo 16 segundos (con temporizador visible), lo oculta y hace 3 preguntas abiertas. |
| `/mvp` | **Ruta oculta** del MVP interactivo (S7): flujo navegable de 4 pantallas hasta el momento de valor. Ver sección dedicada abajo. |
| `/feedback` | 3 preguntas cualitativas tras completar `/mvp`, ligadas a la sesión del participante. |
| `/resultados` | Panel protegido con contraseña: visitas, clics, tasa de conversión global y por canal, contactos, respuestas del test, **sección MVP S7** (tabla por participante, embudo, feedback), y descarga JSON/CSV. |
| `/api/*` | Funciones serverless: `visit`, `cta`, `lead`, `test-response`, `track`, `results`. |

**Contraseña de `/resultados`: `veia2026`** (cámbiala con la variable de entorno
`RESULTS_PASSWORD` en Vercel, sin tocar código).

## Qué se captura y dónde

Todo queda en Redis (Vercel KV):

| Clave | Contenido |
|---|---|
| `stats:visits:total` / `stats:visits:by_canal` | Contadores de visitas (1 por sesión de navegador) |
| `stats:cta:total` / `stats:cta:by_canal` | Contadores de clics en "Quiero probar VeIA" |
| `log:visits`, `log:cta` | Eventos crudos con timestamp y canal |
| `log:leads` | Contactos: nombre, WhatsApp/correo, sector, tipo de lugar, tipo de falla, canal |
| `log:test` | Respuestas del test cualitativo con timestamp |
| `log:mvp:events` | Eventos crudos del MVP interactivo (S7) — ver sección abajo |
| `stats:mvp:sessions` | Set con los sessionId que iniciaron el flujo `/mvp` |

El clic en el CTA se registra **antes** de mostrar el formulario: si no lo completan,
el clic ya quedó contado. La métrica clave (`CTA_CLICKS / VISITAS`) se calcula sola
en `/resultados`, global y por canal.

> Respaldo: cada contacto también se envía por correo vía FormSubmit (ver
> `MAIL_ENDPOINT` en `components/Landing.jsx`; el primer envío requiere hacer clic
> en el correo de activación de FormSubmit).

## MVP interactivo (S7) — test de usabilidad

S6 validó que el usuario **quiere** el concepto. S7 pregunta algo distinto: ¿puede el
usuario **acceder de verdad** al valor prometido navegando la interfaz solo, sin
instrucciones? `/mvp` es un prototipo de 4 pantallas que lleva del punto de entrada
al momento de valor:

1. **Entrada** — el usuario detecta que no tiene luz y abre la app.
2. **Reporte** — el sistema "reconoce" la falla en su sector; confirmación de 1 tap,
   sin formularios.
3. **Momento de valor** — mapa en vivo: la brigada se mueve hacia la falla, el ETA
   decrece, se muestra el estado ("Cuadrilla en camino" → "Diagnóstico en sitio") y
   la naturaleza del daño.
4. **Detalle** — qué pasó, quién atiende, ETA actualizado, timeline paso a paso.

No hay texto en pantalla que explique la tarea ni botones "siguiente" fuera del
flujo natural: el objetivo es observar si la persona llega sola.

### Qué está simulado (honestidad)

**Todo** el contenido de `/mvp` es una simulación client-side — no hay brigadas,
GPS ni fallas reales detrás. La geometría de la ruta, la posición de la falla, el
ETA inicial y su velocidad de decremento, el guion de texto (sector, causa,
brigada) y el "reconocimiento" del reporte están definidos en
[`lib/mvp-config.js`](lib/mvp-config.js) y no en ningún backend. La camioneta del
mapa (`components/LiveMap.jsx`) se mueve interpolando su posición sobre una ruta
SVG fija en función del ETA restante — es una animación conducida por estado de
React, no una fuente de datos real.

### Instrumentación — qué se mide

El módulo [`lib/tracker.js`](lib/tracker.js) genera un `sessionId` (UUID) por
carga de `/mvp` y envía eventos en lote a `POST /api/track`, persistidos en
`log:mvp:events`:

| Evento | Cuándo se dispara | Qué mide |
|---|---|---|
| `task_start` | Al entrar a `/mvp` | Arranque de la sesión/tarea |
| `screen_view` | Al salir de cada pantalla | Tiempo de permanencia (`durationMs`), para ver dónde se atasca |
| `tap` | Cada clic/tap | Elemento objetivo e interactividad — taps en zonas no interactivas delatan confusión |
| `value_moment_reached` | Al permanecer en el mapa más de `valueMomentSeconds` | Que reconoció el momento de valor; incluye `timeToValueMs` desde `task_start` |
| `hesitation` | Al superar `hesitationSeconds` en una pantalla sin avanzar | Fricción / duda |
| `backtrack` | Al retroceder (botón "‹ Mapa" o atrás del navegador) | Flujo no intuitivo |
| `dead_tap` | Al tocar repetidamente algo no interactivo | Expectativa de interactividad no cumplida |
| `report_submitted` | Al enviar el reporte | Nombre, ubicación, origen de esa ubicación y alcance del corte |
| `location_changed` | Al reportar una falla fuera de la ubicación detectada | Cuántos necesitan reportar otra zona (casa de un familiar, el negocio, un cable en la vía) |
| `notify_opt_in` | Al activar/desactivar los avisos | AARRR/Retención: intención de volver |
| `share_intent` | Al pulsar "Avisar a un vecino" | AARRR/Referencia: intención de compartir |
| `task_complete` / `task_abandon` | Botón "Finalizar seguimiento" / cierre de pestaña antes de terminar | Si llegó al valor o se rindió |
| `feedback` | Envío del formulario en `/feedback` | Las 3 respuestas cualitativas, ligadas al `sessionId` |

Todos los umbrales (segundos para `value_moment_reached`, segundos de
`hesitation`, cantidad/ventana de taps para `dead_tap`) están centralizados en
`TRACKING` dentro de `lib/mvp-config.js` — cambiarlos no requiere tocar la lógica
del tracker ni de las pantallas.

### Embudo AARRR — qué mide y qué no

El prototipo instrumenta las cinco etapas del embudo pirata, pero **un test
moderado con 5–6 personas en una sola sesión no puede medir las cinco con el
mismo rigor**. Presentarlas como si fueran equivalentes sería exactamente la
métrica vanidosa que Lean Startup advierte evitar, así que el panel las separa
por tipo de señal:

| Etapa | Qué mide en este prototipo | Tipo de señal |
|---|---|---|
| **Adquisición** | Canal de origen de la sesión (`?canal=` / `?utm_source=`, misma convención que la landing) | Comportamiento real |
| **Activación** | Alcanzó el momento de valor: llegó al mapa vivo y permaneció más del umbral | Comportamiento real |
| **Retención** | Activó "Avísame cuando vuelva la luz" | Intención declarada |
| **Ingreso** | No medible aquí: el modelo es B2B2C, lo paga el operador de red, no el usuario final | No medible |
| **Referencia** | Pulsó "Avisar a un vecino" | Intención declarada |

Solo las dos primeras son comportamiento observado. Retención y Referencia
registran que el participante *quiso* hacerlo estando observado, lo que sirve
para comparar entre participantes pero **no es una tasa proyectable**: medir
retención real exige uso repetido en el tiempo con usuarios no observados.

Las acciones de retención y referencia viven en la pantalla de **detalle**, es
decir **después** del momento de valor, deliberadamente: colocarlas antes
habría contaminado el time-to-value y el conteo de taps muertos del
experimento principal, que es la hipótesis de valor.

Ambas acciones son **simuladas**: no se envía ningún aviso ni se comparte nada
con nadie; solo se registra la intención.

### Protocolo del facilitador

1. Enviar `https://TU-DOMINIO.vercel.app/mvp` al participante (no está enlazado
   desde la landing) y dejarlo navegar sin guiarlo. La consigna verbal es una
   sola frase: *"Se acaba de ir la luz en tu casa. Averigua qué está pasando y
   cuándo volverá."* Para atribuir la adquisición, añade el canal al enlace:
   `/mvp?canal=whatsapp-vecinos`.
2. Al terminar (botón "Finalizar seguimiento"), el participante llega solo a
   `/feedback` y responde 3 preguntas abiertas.
3. Para el siguiente participante: botón **"Siguiente participante"** en
   `/feedback`, o simplemente recargar `/mvp` — cada carga genera un `sessionId`
   nuevo automáticamente, no hace falta borrar nada.
4. Revisar resultados en `/resultados`, sección **"MVP S7"**: tabla por
   participante (time-to-value, ¿llegó al valor?, completada/abandonada,
   backtracks, dead taps, pantalla con más permanencia), embudo agregado,
   feedback cualitativo, y botón para exportar el CSV crudo de eventos.

## Despliegue paso a paso

### 1. Subir a GitHub

```bash
git init                       # (omite si ya es un repo)
git add .
git commit -m "VeIA prototipo de marketing"
git remote add origin https://github.com/TU-USUARIO/VeIA.git
git branch -M main
git push -u origin main
```

### 2. Importar en Vercel

1. [vercel.com](https://vercel.com) → **Add New… → Project** → importa el repo.
2. Vercel detecta **Next.js** automáticamente (además `vercel.json` lo fija). No cambies nada.
3. **Deploy**.

> Si el proyecto ya existía como sitio estático: entra a **Settings → Build & Development
> Settings** y verifica que Framework Preset diga **Next.js** (el `vercel.json` del repo
> ya lo fuerza, así que normalmente no hay que tocar nada).

### 3. Activar Vercel KV (Upstash Redis)

Vercel KV hoy se provisiona como **Upstash for Redis** desde el Marketplace:

1. En el dashboard del proyecto → pestaña **Storage** → **Create Database** (o *Browse Marketplace*).
2. Elige **Upstash** → **Redis** → plan **Free** → región cercana (us-east-1 sirve).
3. En "Connect Project", selecciona este proyecto (ambientes Production/Preview/Development).
4. Vercel inyecta las variables automáticamente (`KV_REST_API_URL` + `KV_REST_API_TOKEN`
   o `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` — el código soporta ambas).
5. **Redespliega** (Deployments → ⋯ → Redeploy) para que el nuevo deploy lea las variables.

Sin KV la página funciona igual (no se rompe), solo que no guarda datos y
`/resultados` te avisará "KV no configurado".

### 4. Generar los enlaces con UTM por canal

Comparte la landing con un parámetro distinto por canal/grupo:

```
https://TU-DOMINIO.vercel.app/?canal=whatsapp-pymes
https://TU-DOMINIO.vercel.app/?canal=grupo-comerciantes
https://TU-DOMINIO.vercel.app/?canal=instagram
```

También funciona `?utm_source=...`. Sin parámetro, la visita se atribuye a `directo`.
El canal se recuerda durante la sesión del navegador, así el clic en el CTA queda
atribuido al canal correcto aunque el usuario navegue por la página.

### 5. Test cualitativo (5–8 personas)

Envíale a cada persona el enlace `https://TU-DOMINIO.vercel.app/test`
(no está enlazado desde la landing — es una ruta oculta). El flujo es automático:
16 segundos de prototipo con temporizador → 3 preguntas abiertas → guardado en KV.

## Desarrollo local

```bash
npm install
npm run dev        # http://localhost:3000
```

Para que el guardado funcione en local, trae las variables de KV:
`npm i -g vercel && vercel link && vercel env pull .env.development.local`

## Analítica secundaria

`@vercel/analytics` está incluido: activa **Analytics** en el dashboard del proyecto
para tener pageviews/visitantes únicos como fuente de contraste. La fuente principal
de la tasa de conversión es el propio KV (por canal).
