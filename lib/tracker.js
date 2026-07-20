// ═══════════════════════════════════════════════════════════════════════
// Tracker client-side del test de usabilidad (S7).
//
// Módulo singleton: /mvp y /feedback comparten esta instancia mientras la
// navegación sea client-side. Una recarga dura de /mvp = sesión nueva
// (sessionId nuevo) = participante nuevo.
//
// Nunca lanza errores hacia la UI: si no hay red o KV, el prototipo sigue
// funcionando igual y los eventos simplemente se pierden en silencio.
// ═══════════════════════════════════════════════════════════════════════

import { TRACKING, SCREENS, VALUE_SCREEN } from "./mvp-config";

const SS_KEY = "veia:mvp:session";
const ENDPOINT = "/api/track";

let sessionId = null;
let taskStartAt = 0; // performance.now() del task_start
let queue = [];
let flushTimer = null;
let inFlight = false;

let currentScreen = null;
let screenEnteredAt = 0;
let hiddenAt = 0; // performance.now() al ocultarse la página (0 = visible)
let hiddenAccum = 0; // ms ocultos acumulados en la pantalla actual

let hesitationTimer = null;
let valueTimer = null;
let valueEmitted = false;
let completed = false;
let abandoned = false;

let tapBursts = new Map(); // targetId → [timestamps] (solo no-interactivos)
let globalUnbinds = [];

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

// AARRR/Adquisición: de qué canal llegó la sesión. Misma convención que la
// landing de S6 (?canal= o ?utm_source=, recordado en sessionStorage), para
// que un mismo enlace atribuido sirva a las dos etapas del embudo.
function resolveCanal() {
  try {
    const q = new URLSearchParams(location.search);
    const fromUrl = q.get("canal") || q.get("utm_source");
    if (fromUrl) {
      const clean =
        fromUrl.trim().toLowerCase().replace(/[^\w\-áéíóúñ]/gi, "-").slice(0, 64) ||
        "directo";
      sessionStorage.setItem("veia_canal", clean);
      return clean;
    }
    return sessionStorage.getItem("veia_canal") || "directo";
  } catch {
    return "directo";
  }
}

function uuid() {
  try {
    return crypto.randomUUID();
  } catch {
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }
}

// Timer que se puede pausar mientras la página está oculta, para que el
// tiempo con la app en segundo plano no cuente como hesitación ni como
// permanencia en el momento de valor.
function pausableTimer(fn, ms) {
  let remaining = ms;
  let timer = null;
  let startedAt = 0;
  let done = false;
  function arm() {
    if (done || timer) return;
    startedAt = now();
    timer = setTimeout(() => {
      done = true;
      timer = null;
      fn();
    }, remaining);
  }
  function pause() {
    if (done || !timer) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (now() - startedAt));
  }
  function cancel() {
    done = true;
    if (timer) clearTimeout(timer);
    timer = null;
  }
  arm();
  return { pause, resume: arm, cancel };
}

function emit(type, data = {}, screenOverride) {
  const ev = {
    id: uuid(),
    sessionId,
    type,
    ts: new Date().toISOString(),
    t: taskStartAt ? Math.round(now() - taskStartAt) : 0,
    screen: screenOverride ?? currentScreen ?? "",
    data,
  };
  queue.push(ev);
  if (TRACKING.debug) console.log("[tracker]", type, ev);
  if (queue.length >= 20) flush();
}

function flush(useBeacon = false) {
  if (!queue.length || !sessionId) return Promise.resolve();
  if (useBeacon && typeof navigator !== "undefined" && navigator.sendBeacon) {
    const events = queue.splice(0, 50);
    const blob = new Blob([JSON.stringify({ sessionId, events })], {
      type: "application/json",
    });
    const ok = navigator.sendBeacon(ENDPOINT, blob);
    if (!ok) queue.unshift(...events);
    return Promise.resolve();
  }
  if (inFlight) return Promise.resolve();
  inFlight = true;
  const events = queue.splice(0, 50);
  return fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, events }),
    keepalive: true,
  })
    .catch(() => {
      // Reintento en el siguiente flush; los ids únicos hacen el reenvío
      // idempotente (el panel dedupea por id).
      queue.unshift(...events);
    })
    .finally(() => {
      inFlight = false;
    });
}

function screenIndex(name) {
  const i = SCREENS.indexOf(name);
  return i === -1 ? null : i;
}

function elapsedVisibleMs() {
  const hiddenNow = hiddenAt ? now() - hiddenAt : 0;
  return Math.max(0, Math.round(now() - screenEnteredAt - hiddenAccum - hiddenNow));
}

// Cierra la pantalla actual emitiendo su screen_view con permanencia.
function closeScreen(to) {
  if (!currentScreen) return;
  emit("screen_view", {
    screen: currentScreen,
    durationMs: elapsedVisibleMs(),
    to,
  });
  if (hesitationTimer) hesitationTimer.cancel();
  if (valueTimer) valueTimer.cancel();
  hesitationTimer = null;
  valueTimer = null;
}

function armScreenTimers(name) {
  hesitationTimer = pausableTimer(() => {
    emit("hesitation", { screen: name, thresholdMs: TRACKING.hesitationSeconds * 1000 });
  }, TRACKING.hesitationSeconds * 1000);

  if (name === VALUE_SCREEN && !valueEmitted) {
    valueTimer = pausableTimer(() => {
      valueEmitted = true;
      emit("value_moment_reached", {
        timeToValueMs: Math.round(now() - taskStartAt),
      });
      flush();
    }, TRACKING.valueMomentSeconds * 1000);
  }
}

function onVisibilityChange() {
  if (document.visibilityState === "hidden") {
    hiddenAt = now();
    if (hesitationTimer) hesitationTimer.pause();
    if (valueTimer) valueTimer.pause();
    flush(true);
  } else {
    if (hiddenAt) hiddenAccum += now() - hiddenAt;
    hiddenAt = 0;
    if (hesitationTimer) hesitationTimer.resume();
    if (valueTimer) valueTimer.resume();
  }
}

function onPageHide() {
  if (!sessionId || completed || abandoned) {
    flush(true);
    return;
  }
  abandoned = true;
  const screen = currentScreen;
  closeScreen("__exit__");
  emit("task_abandon", {
    screen,
    totalMs: Math.round(now() - taskStartAt),
    reason: "pagehide",
  });
  flush(true);
}

const tracker = {
  // Idempotente: solo la primera llamada tras una carga de página crea la
  // sesión y emite task_start (protege contra el doble effect de React
  // StrictMode en dev; una recarga dura siempre es sesión nueva).
  initSession() {
    if (typeof window === "undefined") return null;
    if (sessionId) return sessionId;
    sessionId = uuid();
    taskStartAt = now();
    try {
      sessionStorage.setItem(SS_KEY, sessionId);
    } catch {}
    emit("task_start", {
      canal: resolveCanal(),
      ua: (navigator.userAgent || "").slice(0, 120),
      vw: window.innerWidth,
      vh: window.innerHeight,
    });
    flush();

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", onPageHide);
    flushTimer = setInterval(() => flush(), TRACKING.flushIntervalMs);
    globalUnbinds.push(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      clearInterval(flushTimer);
    });
    return sessionId;
  },

  getSessionId() {
    if (sessionId) return sessionId;
    try {
      return sessionStorage.getItem(SS_KEY);
    } catch {
      return null;
    }
  },

  // Transición de pantalla. Emite el screen_view de la pantalla que se
  // abandona, detecta backtrack por orden de índices y arma los timers de
  // hesitación / momento de valor de la nueva pantalla.
  enterScreen(name, via = "ui") {
    if (!sessionId || name === currentScreen) return;
    const fromIdx = screenIndex(currentScreen);
    const toIdx = screenIndex(name);
    if (fromIdx !== null && toIdx !== null && toIdx < fromIdx) {
      emit("backtrack", { from: currentScreen, to: name, via });
    }
    closeScreen(name);
    currentScreen = name;
    screenEnteredAt = now();
    hiddenAccum = 0;
    armScreenTimers(name);
  },

  track(type, data) {
    if (!sessionId) return;
    emit(type, data);
  },

  // Delegación de taps sobre el contenedor del flujo. Cada tap se registra
  // con su targetId (data-track-id del ancestro más cercano); los taps
  // repetidos sobre elementos no interactivos generan dead_tap.
  bindTapListener(rootEl) {
    if (!rootEl || typeof window === "undefined") return () => {};
    const onClick = (e) => {
      if (!sessionId) return;
      const tracked = e.target.closest("[data-track-id]");
      const targetId =
        tracked?.dataset.trackId || (e.target.tagName || "?").toLowerCase();
      const interactive =
        tracked?.dataset.interactive === "true" ||
        !!e.target.closest("button, a, input, textarea, select, [role='button']");
      emit("tap", {
        targetId,
        interactive,
        x: Math.round(e.clientX),
        y: Math.round(e.clientY),
      });
      if (interactive) return;
      const t = now();
      const burst = (tapBursts.get(targetId) || []).filter(
        (x) => t - x < TRACKING.deadTap.windowMs
      );
      burst.push(t);
      if (burst.length >= TRACKING.deadTap.count) {
        emit("dead_tap", {
          targetId,
          count: burst.length,
          windowMs: TRACKING.deadTap.windowMs,
        });
        tapBursts.delete(targetId);
      } else {
        tapBursts.set(targetId, burst);
      }
    };
    rootEl.addEventListener("click", onClick);
    return () => rootEl.removeEventListener("click", onClick);
  },

  // El participante llegó al final del flujo por sus propios medios.
  complete() {
    if (!sessionId || completed || abandoned) return;
    completed = true;
    const screen = currentScreen;
    closeScreen("__complete__");
    currentScreen = null;
    emit("task_complete", { totalMs: Math.round(now() - taskStartAt) }, screen);
    return flush();
  },

  // Respuestas cualitativas de /feedback, ligadas al sessionId de la sesión
  // (o a uno de emergencia si /feedback se abrió sin pasar por /mvp).
  feedback(answers) {
    if (!sessionId) {
      sessionId = tracker.getSessionId() || "nofeed-" + uuid();
    }
    emit("feedback", answers, "feedback");
    return flush();
  },
};

export default tracker;
