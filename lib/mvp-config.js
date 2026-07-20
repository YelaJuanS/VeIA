// ═══════════════════════════════════════════════════════════════════════
// Configuración única del MVP interactivo (S7).
//
// HONESTIDAD: todo lo que se muestra en /mvp es una SIMULACIÓN client-side
// definida aquí — la brigada, la falla, el ETA y el "reconocimiento" del
// sector no provienen de ningún sistema real. Ver README.
//
// Cambiar umbrales del test o el guion del escenario = editar este archivo.
// ═══════════════════════════════════════════════════════════════════════

// Marca del prototipo. El MVP se presenta como "ReparApp" (identidad propia,
// paleta naranja tipo Celsia) mientras que la landing de S6 sigue siendo VeIA.
export const BRAND = {
  name: "ReparApp",
  namePrefix: "Repar",
  nameSuffix: "App",
  tagline: "Tu energía, en tiempo real",
};

// ─────────────────────────────────────────────────────────────────────
// Embudo AARRR aplicado a ReparApp.
//
// ADVERTENCIA METODOLÓGICA: un test moderado con 5–6 personas en una sola
// sesión no puede medir retención, ingreso ni referencia REALES — para eso
// hace falta uso repetido en el tiempo y usuarios no observados. Lo que este
// prototipo captura en esas tres etapas es INTENCIÓN DECLARADA (el
// participante dice que quiere avisos, o pulsa compartir), que es una señal
// mucho más débil. Tratarla como retención sería justo la métrica vanidosa
// que Lean Startup advierte evitar. El panel las etiqueta como intención.
//
// Lo único que este test mide como comportamiento real es Adquisición
// (de qué canal llegó) y Activación (si alcanzó el momento de valor).
// ─────────────────────────────────────────────────────────────────────
export const AARRR = {
  acquisition: {
    label: "Adquisición",
    metric: "Sesiones por canal de origen (?canal= o ?utm_source=)",
    kind: "comportamiento",
  },
  activation: {
    label: "Activación",
    metric: "Llegó al momento de valor (mapa vivo) y lo reconoció",
    kind: "comportamiento",
  },
  retention: {
    label: "Retención",
    metric: "Activó avisos de restablecimiento",
    kind: "intención",
  },
  revenue: {
    label: "Ingreso",
    metric: "No medible aquí: el modelo es B2B2C (lo paga el operador de red)",
    kind: "no-medible",
  },
  referral: {
    label: "Referencia",
    metric: "Compartió el estado con un vecino",
    kind: "intención",
  },
};

// Ubicación real del navegador (GPS/wifi) en vez de la simulada.
//
// ENCENDIDO. Tener en cuenta al leer los resultados: el navegador muestra su
// propio diálogo de permisos al entrar a la pantalla de reporte, y ese cuadro
// es ajeno al producto — el tiempo que el participante tarde en responderlo se
// suma al time-to-value y puede aparecer como `hesitation` en la pantalla de
// reporte sin que la culpa sea de la interfaz. El evento `geo_result` registra
// el desenlace (granted/denied/timeout) para poder separar esos casos.
//
// Si un participante deniega el permiso, el flujo no se rompe: conserva la
// ubicación simulada y el selector manual de zona.
export const LOCATION = {
  useRealLocation: true,
  timeoutMs: 8000,
};

// Umbrales de la instrumentación (test de usabilidad)
export const TRACKING = {
  // Segundos que el participante debe permanecer en la pantalla del mapa
  // para considerar que llegó y reconoció el momento de valor.
  valueMomentSeconds: 8,

  // Segundos en una misma pantalla sin avanzar para registrar "hesitation"
  // (proxy de fricción).
  hesitationSeconds: 15,

  // dead_tap: `count` taps sobre el mismo elemento NO interactivo dentro de
  // una ventana de `windowMs` milisegundos.
  deadTap: { count: 2, windowMs: 1500 },

  // Cadencia de envío del lote de eventos a /api/track.
  flushIntervalMs: 4000,

  // true → imprime cada evento en la consola del navegador (útil en dev).
  debug: false,
};

// Guion del escenario simulado que ve el participante
export const SCENARIO = {
  reportId: "4823",
  sector: "Sector El Prado — Circuito 12",
  neighborsReporting: 23,
  faultType: "Rama caída sobre la línea de media tensión",
  faultShort: "Rama caída sobre la línea",
  causeText:
    "Una rama cayó sobre el cable que alimenta tu sector y dañó la línea. " +
    "La brigada va a retirarla y a reemplazar el tramo afectado.",
  // Cuadrilla — ponerle nombre y cara a quien atiende es parte del valor:
  // convierte "alguien vendrá" en "Andrés viene en camino".
  brigadeName: "Brigada 7",
  brigadeVehicle: "Móvil VLL-214",
  brigadeLead: "Andrés Mora",
  brigadeLeadInitials: "AM",
  brigadeLeadRole: "Líder de cuadrilla",
  brigadeLeadMeta: "Técnico electricista · 9 años en red de media tensión",
  brigadeCrewSize: 3,

  // Dirección que la app "detecta" sola (simulada). Se muestra en vez de pedir
  // que el usuario la escriba: menos fricción justo antes del momento de valor.
  detectedAddress: "Cra 54 #68-120",

  // Pero la falla no siempre está donde uno está: la casa de un familiar, el
  // negocio, o un cable caído que se ve en la vía. La ubicación detectada es
  // el camino rápido, no una imposición — estas son las alternativas que se
  // ofrecen al cambiarla, además de escribir una dirección libre.
  otherSectors: [
    "Barrio San Fernando — Circuito 7",
    "Barrio Granada — Circuito 4",
    "Zona Industrial Acopi — Circuito 21",
  ],

  // Una sola pregunta hace dos trabajos: acota el alcance del corte y, con la
  // ubicación ya detectada, ubica el punto de la falla. Distinguir un problema
  // interno del domiciliario de una falla en la red es lo que decide a qué
  // punto debe ir la brigada.
  scopeQuestion: "¿El corte es solo en tu casa o en todo el sector?",
  scopeHint: "Ya tenemos tu ubicación; con esto ubicamos el punto exacto de la falla.",
  faultScopes: [
    { value: "casa", icon: "🏠", label: "Solo mi casa" },
    { value: "cuadra", icon: "🏘️", label: "Toda la cuadra" },
    { value: "sector", icon: "🌆", label: "Todo el sector" },
    { value: "poste", icon: "⚡", label: "Veo un poste o cable dañado" },
  ],

  // Geometría del mapa en coordenadas del viewBox 640×400 (igual a MapMockup).
  fault: { x: 450, y: 128 },
  crewRoute: "M 60 350 L 210 350 L 210 260 L 330 260 L 330 170 L 450 170 L 450 128",

  // Simulación del ETA y del viaje de la brigada.
  //
  // La camioneta recorre la ruta completa en `travelDurationMs` y el ETA baja
  // proporcionalmente de `etaInitialMin` a `arrivalHoldMin` durante ese mismo
  // tramo — un solo parámetro controla ambas cosas, así nunca se desincronizan.
  // Al llegar, el ETA se detiene en `arrivalHoldMin`: la brigada está en el
  // sitio pero el restablecimiento total sigue pendiente, como en la realidad.
  //
  // La posición se recalcula cada `mapTickMs` (movimiento continuo), mientras
  // que el número de minutos en pantalla solo cambia cuando cruza un entero.
  etaInitialMin: 42,
  arrivalHoldMin: 30,
  travelDurationMs: 45000,
  mapTickMs: 250,

  // Estado mostrado según el ETA restante (evaluados en orden).
  statuses: [
    { minEta: 31, label: "Cuadrilla en camino" },
    { minEta: 0, label: "Diagnóstico en sitio" },
  ],
};

// Orden canónico de las pantallas del flujo — se usa para detectar
// retrocesos (backtrack) y para el embudo del panel.
export const SCREENS = ["inicio", "reporte", "mapa", "detalle"];

// Pantalla que constituye el momento de valor.
export const VALUE_SCREEN = "mapa";
