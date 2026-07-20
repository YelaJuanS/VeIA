// ═══════════════════════════════════════════════════════════════════════
// Configuración única del MVP interactivo (S7).
//
// HONESTIDAD: todo lo que se muestra en /mvp es una SIMULACIÓN client-side
// definida aquí — la brigada, la falla, el ETA y el "reconocimiento" del
// sector no provienen de ningún sistema real. Ver README.
//
// Cambiar umbrales del test o el guion del escenario = editar este archivo.
// ═══════════════════════════════════════════════════════════════════════

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
  brigadeName: "Brigada 7",
  brigadeVehicle: "Móvil VLL-214",
  brigadeLead: "Téc. Andrés Mora",

  // Geometría del mapa en coordenadas del viewBox 640×400 (igual a MapMockup).
  fault: { x: 450, y: 128 },
  crewRoute: "M 60 350 L 210 350 L 210 260 L 330 260 L 330 170 L 450 170 L 450 128",

  // Simulación del ETA: arranca en `etaInitialMin` y baja 1 minuto cada
  // `etaTickMs`. La camioneta llega a la falla cuando el ETA toca
  // `arrivalHoldMin` (ahí el estado pasa a diagnóstico y el ETA se detiene:
  // el restablecimiento total sigue pendiente, como en la realidad).
  etaInitialMin: 42,
  etaTickMs: 5000,
  arrivalHoldMin: 30,

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
