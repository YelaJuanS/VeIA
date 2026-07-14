# VeIA — Landing page

Landing de una sola página para **VeIA**: seguimiento en tiempo real de fallas eléctricas.
HTML + CSS + JavaScript vanilla, **sin build step** — despliega directo en Vercel.

## Estructura

```
├── index.html   # Página completa (hero, problema, cómo funciona, OR, CTA final, modal)
├── styles.css   # Estilos (dark, responsive, mobile-first)
├── script.js    # Modal + tracking de eventos (cta_click, lead_submit)
└── README.md
```

## Analítica (medición de CLICS / VISITANTES ÚNICOS)

La página integra **dos** sistemas — con uno basta, pero se complementan:

| Sistema | Qué mide | Requisitos |
|---|---|---|
| **GoatCounter** (recomendado) | Visitantes únicos **y** el evento `cta_click` con visitantes únicos por evento | Cuenta gratis |
| **Vercel Web Analytics** | Visitantes únicos y pageviews (eventos personalizados requieren plan Pro) | Activarlo en el dashboard de Vercel |

### Configurar GoatCounter (2 minutos)

1. Crea una cuenta gratis en <https://www.goatcounter.com/signup> y elige un código de sitio (ej: `veia`).
2. En `index.html`, reemplaza `TU-CODIGO` por tu código:
   ```html
   <script data-goatcounter="https://veia.goatcounter.com/count"
           async src="//gc.zgo.at/count.js"></script>
   ```
3. Listo. En tu panel de GoatCounter verás:
   - **Visitantes únicos** → pageviews de `/`
   - **Clics en el CTA** → el "path" `cta_click` (marcado como evento)

> **Tasa de clic = únicos de `cta_click` ÷ visitantes únicos de la página.**
> GoatCounter muestra ambos números en el mismo panel, columna "visits".

Nota: GoatCounter no cuenta visitas desde `localhost`, así que tus pruebas locales no ensucian los datos.

### Activar Vercel Web Analytics (opcional)

1. En el dashboard de Vercel → tu proyecto → pestaña **Analytics** → **Enable**.
2. El script `/_vercel/insights/script.js` ya está incluido en `index.html`; empieza a contar solo.
3. El evento `cta_click` también se envía por esta vía, pero Vercel solo muestra eventos personalizados en el plan **Pro**. En plan Hobby úsalo solo para visitantes únicos.

## Eventos que se registran

| Evento | Cuándo |
|---|---|
| `cta_click` | Cada clic en cualquier botón "Quiero probar VeIA" (nav, hero, CTA final). Abre el demo interactivo. Incluye la ubicación del botón. |
| `lead_submit` | Cuando alguien completa el registro de la falla en el demo (nombre + contacto). Los datos personales **no** se envían a la analítica. |

### El demo interactivo

El CTA abre un flujo que simula la app real, en 3 pasos: **sector + tipo de lugar**
→ **tipo de falla** → **contacto** ("¿a dónde te avisamos cada avance?"). Ahí se
capturan los datos, y al final el usuario ve la pantalla de confirmación simulada:
radicado, brigada asignada encendiéndose paso a paso y el ETA de restablecimiento.
El lead que llega a tu correo incluye sector, tipo de lugar y tipo de falla —
contexto valioso para priorizar a quién contactar primero.

## ¿Dónde veo los datos del formulario (leads)?

Los leads llegan **a tu correo** vía [FormSubmit](https://formsubmit.co) (gratis, sin cuenta):

1. El primer envío del formulario en producción dispara un correo de **activación**
   a `juansebastianyela@gmail.com` — abre ese correo y haz clic en **Activate**.
2. Desde ahí, cada lead llega a tu bandeja como un correo con asunto
   "Nuevo lead VeIA 🚀" con el nombre y el contacto en una tabla.
3. **Recomendado**: tras activar, FormSubmit te da un *alias aleatorio*
   (ej. `formsubmit.co/ajax/a1b2c3d4...`). Reemplaza el correo por ese alias en
   `script.js` (constante `LEAD_ENDPOINT`) para no exponer tu email en el repo público.

Además, cada envío queda contado en GoatCounter como evento `lead_submit`
(solo el conteo — el dato de contacto nunca se envía a la analítica).

## Video demo

La sección "Míralo en acción" (justo después del hero) embebe el video de YouTube
<https://www.youtube.com/watch?v=JGwPxOTjNJg> vía `youtube-nocookie.com` con
`loading="lazy"` (no frena la carga de la página). Para cambiar el video, solo
reemplaza el ID en el `src` del iframe en `index.html`.

## Desplegar en Vercel paso a paso

### 1. Subir a GitHub

```bash
git init
git add .
git commit -m "Landing VeIA"
# Crea el repo en github.com (o con GitHub CLI):
gh repo create veia-landing --public --source=. --push
# — o manualmente —
git remote add origin https://github.com/TU-USUARIO/veia-landing.git
git branch -M main
git push -u origin main
```

### 2. Conectar a Vercel

1. Entra a <https://vercel.com> e inicia sesión (puedes usar tu cuenta de GitHub).
2. **Add New… → Project** → importa el repo `veia-landing`.
3. Framework Preset: **Other** (Vercel lo detecta como sitio estático). No cambies nada — sin build command, sin output directory.
4. Clic en **Deploy**. En ~20 segundos tienes la URL `https://veia-landing.vercel.app`.

### 3. Después del deploy

- Activa **Analytics** en el dashboard del proyecto (pestaña Analytics → Enable).
- Verifica que reemplazaste `TU-CODIGO` de GoatCounter (paso de arriba). Si lo cambias después, solo haz commit + push: Vercel redespliega automáticamente con cada push a `main`.
- Prueba desde el celular: abre la URL, haz clic en el CTA y confirma que el evento aparece en GoatCounter (tarda ~1 min).

### Alternativa: deploy directo por CLI (sin GitHub)

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # producción
```

## Probar en local

No necesita servidor, pero para evitar rarezas de rutas:

```bash
npx serve .
# o simplemente abre index.html en el navegador
```
