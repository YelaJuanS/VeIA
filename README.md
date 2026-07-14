# VeIA — Prototipo de marketing (Lean Startup)

Landing de **VeIA** (seguimiento en tiempo real de fallas eléctricas) construida en
**Next.js** con captura de datos en **Vercel KV / Upstash Redis**. Mide interés real:
visitas por canal, clics en el CTA, contactos, y un test cualitativo de comprensión.

## Rutas

| Ruta | Qué es |
|---|---|
| `/` | La landing. Acepta `?canal=...` o `?utm_source=...` para atribuir el tráfico. |
| `/test` | **Ruta oculta** para el test de comprensión: muestra el prototipo 8 segundos (con temporizador visible), lo oculta y hace 3 preguntas abiertas. |
| `/resultados` | Panel protegido con contraseña: visitas, clics, tasa de conversión global y por canal, contactos, respuestas del test, y descarga JSON/CSV. |
| `/api/*` | Funciones serverless: `visit`, `cta`, `lead`, `test-response`, `results`. |

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

El clic en el CTA se registra **antes** de mostrar el formulario: si no lo completan,
el clic ya quedó contado. La métrica clave (`CTA_CLICKS / VISITAS`) se calcula sola
en `/resultados`, global y por canal.

> Respaldo: cada contacto también se envía por correo vía FormSubmit (ver
> `MAIL_ENDPOINT` en `components/Landing.jsx`; el primer envío requiere hacer clic
> en el correo de activación de FormSubmit).

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
8 segundos de prototipo con temporizador → 3 preguntas abiertas → guardado en KV.

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
