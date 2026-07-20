"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LiveMap from "../../components/LiveMap";
import { BRAND, SCENARIO } from "../../lib/mvp-config";
import tracker from "../../lib/tracker";

// MVP interactivo (S7): flujo entrada → reporte 1-tap → mapa en vivo →
// detalle. Todo lo que se muestra es una simulación guiada por
// lib/mvp-config.js (no hay datos reales). La página no da instrucciones:
// el participante debe llegar al momento de valor por sí solo.

const DETECTED = `${SCENARIO.detectedAddress} · ${SCENARIO.sector}`;

function statusFor(etaMin) {
  const s = SCENARIO.statuses.find((x) => etaMin >= x.minEta);
  return s ? s.label : SCENARIO.statuses[SCENARIO.statuses.length - 1].label;
}

export default function MvpPage() {
  const router = useRouter();
  const rootRef = useRef(null);
  const [screen, setScreen] = useState("inicio");
  const [confirming, setConfirming] = useState(false);
  // Datos que el propio participante registra en la pantalla de reporte.
  const [nombre, setNombre] = useState("");
  const [alcance, setAlcance] = useState("");
  const [formError, setFormError] = useState("");
  // AARRR: retención y referencia. Ambas viven DESPUÉS del momento de valor
  // (pantalla de detalle) para no contaminar el camino que mide el test.
  const [notify, setNotify] = useState(false);
  const [shared, setShared] = useState(false);
  // La ubicación no se pide escrita: la app la "detecta" (simulada) y esa es
  // la vía rápida. Pero es cambiable, porque la falla no siempre está donde
  // uno está: la casa de un familiar, el negocio, un cable caído en la vía.
  const [lugar, setLugar] = useState(DETECTED);
  const [locSource, setLocSource] = useState("detectada");
  const [changingLoc, setChangingLoc] = useState(false);
  const [customLoc, setCustomLoc] = useState("");
  // Milisegundos transcurridos del trayecto simulado. Un solo reloj alimenta
  // la posición de la camioneta (continua) y el ETA en pantalla (en minutos).
  const [travelMs, setTravelMs] = useState(0);
  const [simOn, setSimOn] = useState(false);

  // Sesión + taps + botón "atrás" del navegador/teléfono.
  useEffect(() => {
    tracker.initSession();
    tracker.enterScreen("inicio");
    const unbindTaps = tracker.bindTapListener(rootRef.current);
    history.replaceState({ screen: "inicio" }, "");
    const onPop = (e) => {
      const target = e.state?.screen || "inicio";
      setScreen(target);
      setConfirming(false);
      tracker.enterScreen(target, "browser");
    };
    window.addEventListener("popstate", onPop);
    return () => {
      unbindTaps();
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  // La simulación del ETA arranca la primera vez que se llega al mapa y no
  // se reinicia al navegar mapa↔detalle (continuidad = confianza).
  useEffect(() => {
    if (screen === "mapa" && !simOn) setSimOn(true);
  }, [screen, simOn]);

  // Reloj del trayecto: avanza en pasos cortos (mapTickMs) para que la
  // camioneta se mueva de forma continua y su llegada sea perceptible, en vez
  // de saltar una vez por minuto simulado.
  useEffect(() => {
    if (!simOn) return;
    const startedAt = Date.now();
    const t = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setTravelMs(Math.min(elapsed, SCENARIO.travelDurationMs));
      if (elapsed >= SCENARIO.travelDurationMs) clearInterval(t);
    }, SCENARIO.mapTickMs);
    return () => clearInterval(t);
  }, [simOn]);

  function goTo(name, via = "ui") {
    setScreen(name);
    setConfirming(false);
    tracker.enterScreen(name, via);
    history.pushState({ screen: name }, "");
  }

  // El participante registra su nombre y dónde está la falla. Ambos quedan en
  // el evento report_submitted, así el panel puede cruzar el comportamiento
  // con lo que la persona efectivamente escribió.
  function confirmReport() {
    const n = nombre.trim();
    if (!n || !alcance) {
      setFormError(
        !n ? "Falta tu nombre." : "Cuéntanos si el corte es solo tuyo o del sector."
      );
      return;
    }
    setFormError("");
    tracker.track("report_submitted", {
      nombre: n.slice(0, 80),
      lugar: lugar.slice(0, 120),
      origenUbicacion: locSource,
      alcance,
    });
    setConfirming(true);
    setTimeout(() => goTo("mapa"), 1200);
  }

  const firstName = nombre.trim().split(/\s+/)[0] || "";
  const alcanceLabel =
    SCENARIO.faultScopes.find((s) => s.value === alcance)?.label || "";

  // Elegir otra zona. Se registra como evento propio: saber cuántos
  // participantes necesitaron reportar fuera de su ubicación es justamente el
  // dato que motivó esta pantalla.
  function pickLocation(value, source) {
    setLugar(value);
    setLocSource(source);
    setChangingLoc(false);
    setFormError("");
    tracker.track("location_changed", { lugar: value.slice(0, 120), origen: source });
  }

  function confirmCustomLocation() {
    const c = customLoc.trim();
    if (!c) {
      setFormError("Escribe la dirección o el barrio de la falla.");
      return;
    }
    pickLocation(c, "manual");
  }

  // AARRR/Retención: intención de volver. Simulado — no se envía ningún aviso.
  function toggleNotify() {
    const next = !notify;
    setNotify(next);
    tracker.track("notify_opt_in", { active: next, etaMin });
  }

  // AARRR/Referencia: intención de compartir. Simulado — no se envía nada a
  // nadie; solo se registra que el participante quiso hacerlo.
  function shareWithNeighbor() {
    if (shared) return;
    setShared(true);
    tracker.track("share_intent", { etaMin, screen: "detalle" });
  }

  function finish() {
    tracker.complete();
    router.push("/feedback");
  }

  // Avance continuo del trayecto (0→1) y ETA derivado de él.
  const progress = Math.min(Math.max(travelMs / SCENARIO.travelDurationMs, 0), 1);
  const etaExact =
    SCENARIO.etaInitialMin -
    progress * (SCENARIO.etaInitialMin - SCENARIO.arrivalHoldMin);
  const etaMin = Math.max(Math.ceil(etaExact), SCENARIO.arrivalHoldMin);
  const arrived = progress >= 1;
  const minsToSite = Math.max(etaMin - SCENARIO.arrivalHoldMin, 0);
  const status = statusFor(arrived ? SCENARIO.arrivalHoldMin : etaMin);
  const etaLabel =
    etaMin >= 60
      ? `${Math.floor(etaMin / 60)}h ${String(etaMin % 60).padStart(2, "0")}min`
      : `${etaMin} min`;

  return (
    <main className="mvp-page reparapp-theme" ref={rootRef}>
      <div className="mvp-shell">
        <header className="mvp-topbar">
          <span className="mvp-logo">
            {BRAND.namePrefix}
            <span className="brand-accent">{BRAND.nameSuffix}</span>
          </span>
          <span
            className="mvp-bell"
            data-track-id="icono-notificaciones"
            aria-hidden="true"
          >
            🔔<i className="mvp-bell-dot"></i>
          </span>
        </header>

        {screen === "inicio" && (
          <section className="mvp-screen">
            <p className="mvp-greeting">Hola 👋</p>
            <h1 className="mvp-title">{BRAND.tagline}</h1>

            <div className="mvp-alert" data-track-id="tarjeta-alerta">
              <p className="mvp-alert-head">
                <span className="mvp-alert-dot" aria-hidden="true"></span>
                Interrupción detectada en tu sector
              </p>
              <p className="mvp-alert-sub">{SCENARIO.sector}</p>
              <button
                className="btn btn-primary btn-block"
                data-track-id="btn-no-luz"
                data-interactive="true"
                onClick={() => goTo("reporte")}
              >
                No tengo luz
              </button>
            </div>

            {/* Tarjetas decorativas realistas (no interactivas): sirven para
                detectar dead_taps sin sesgar la tarea. */}
            <div className="mvp-cards">
              <div className="mvp-card" data-track-id="tarjeta-consumo">
                <p className="mvp-card-label">Mi consumo</p>
                <div className="mvp-mini-chart" aria-hidden="true">
                  <i style={{ height: "40%" }}></i>
                  <i style={{ height: "65%" }}></i>
                  <i style={{ height: "50%" }}></i>
                  <i style={{ height: "80%" }}></i>
                  <i style={{ height: "58%" }}></i>
                  <i style={{ height: "72%" }}></i>
                  <i style={{ height: "35%" }}></i>
                </div>
                <p className="mvp-card-meta">128 kWh este mes</p>
              </div>
              <div className="mvp-card" data-track-id="tarjeta-historial">
                <p className="mvp-card-label">Historial</p>
                <p className="mvp-card-big">3</p>
                <p className="mvp-card-meta">cortes este año</p>
              </div>
            </div>
          </section>
        )}

        {screen === "reporte" && (
          <section className="mvp-screen">
            {!confirming ? (
              <>
                <h1 className="mvp-title">Reporta tu falla</h1>
                <div className="mvp-report-card" data-track-id="tarjeta-reporte">
                  <p className="mvp-report-row">
                    <span className="mvp-report-icon" aria-hidden="true">⚡</span>
                    Falla detectada en la red de tu zona
                  </p>
                  <p className="mvp-report-neighbors">
                    {SCENARIO.neighborsReporting} vecinos ya reportaron este corte
                  </p>
                </div>

                <div className="mvp-field">
                  <label htmlFor="rep-nombre">¿Cómo te llamas?</label>
                  <input
                    id="rep-nombre"
                    type="text"
                    autoComplete="off"
                    placeholder="Tu nombre"
                    value={nombre}
                    data-track-id="campo-nombre"
                    data-interactive="true"
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>

                {/* La dirección no se escribe: la app la detecta (simulada),
                    pero se puede cambiar si la falla es en otra zona. */}
                {!changingLoc ? (
                  <div className="mvp-geo-card" data-track-id="ubicacion-detectada">
                    <span className="mvp-geo-icon" aria-hidden="true">📍</span>
                    <div className="mvp-geo-body">
                      {locSource === "detectada" ? (
                        <>
                          <p className="mvp-geo-address">{SCENARIO.detectedAddress}</p>
                          <p className="mvp-geo-sector">{SCENARIO.sector}</p>
                        </>
                      ) : (
                        <>
                          <p className="mvp-geo-address">{lugar}</p>
                          <p className="mvp-geo-sector">Zona indicada por ti</p>
                        </>
                      )}
                    </div>
                    <div className="mvp-geo-side">
                      {locSource === "detectada" && (
                        <span className="mvp-geo-badge">
                          <span className="dot-live" aria-hidden="true"></span> detectada
                        </span>
                      )}
                      <button
                        className="mvp-geo-change"
                        data-track-id="btn-cambiar-zona"
                        data-interactive="true"
                        onClick={() => setChangingLoc(true)}
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mvp-loc-picker" data-track-id="selector-zona">
                    <p className="mvp-field-label">¿Dónde está la falla?</p>
                    <div className="option-list">
                      <button
                        className="option"
                        data-track-id="opt-zona-detectada"
                        data-interactive="true"
                        onClick={() => pickLocation(DETECTED, "detectada")}
                      >
                        📍 Mi ubicación actual · {SCENARIO.sector}
                      </button>
                      {SCENARIO.otherSectors.map((s) => (
                        <button
                          key={s}
                          className="option"
                          data-track-id="opt-zona-lista"
                          data-interactive="true"
                          onClick={() => pickLocation(s, "lista")}
                        >
                          🗺️ {s}
                        </button>
                      ))}
                    </div>

                    <label className="mvp-loc-other" htmlFor="rep-otra">
                      O escribe otra dirección
                    </label>
                    <div className="mvp-loc-row">
                      <input
                        id="rep-otra"
                        type="text"
                        autoComplete="off"
                        placeholder="Dirección o barrio"
                        value={customLoc}
                        data-track-id="campo-otra-zona"
                        data-interactive="true"
                        onChange={(e) => setCustomLoc(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && confirmCustomLocation()}
                      />
                      <button
                        className="btn btn-primary mvp-loc-ok"
                        data-track-id="btn-confirmar-zona"
                        data-interactive="true"
                        onClick={confirmCustomLocation}
                      >
                        Usar
                      </button>
                    </div>
                  </div>
                )}

                <div className="mvp-field">
                  <label id="lbl-alcance">{SCENARIO.scopeQuestion}</label>
                  <p className="mvp-field-hint">{SCENARIO.scopeHint}</p>
                  <div className="chip-group" role="group" aria-labelledby="lbl-alcance">
                    {SCENARIO.faultScopes.map((s) => (
                      <button
                        key={s.value}
                        className={alcance === s.value ? "chip selected" : "chip"}
                        aria-pressed={alcance === s.value}
                        data-track-id={`chip-alcance-${s.value}`}
                        data-interactive="true"
                        onClick={() => {
                          setAlcance(s.value);
                          setFormError("");
                        }}
                      >
                        <span aria-hidden="true">{s.icon}</span> {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {formError && <p className="form-error">{formError}</p>}

                <button
                  className="btn btn-primary btn-block"
                  data-track-id="btn-confirmar"
                  data-interactive="true"
                  onClick={confirmReport}
                >
                  Enviar reporte
                </button>
              </>
            ) : (
              <div className="mvp-confirming" aria-live="polite">
                <div className="mvp-confirm-check" aria-hidden="true">✓</div>
                <h1 className="mvp-title">
                  {firstName ? `Gracias, ${firstName}. ` : ""}Reporte #
                  {SCENARIO.reportId} confirmado
                </h1>
                <p className="mvp-sub">Conectando con la brigada…</p>
              </div>
            )}
          </section>
        )}

        {screen === "mapa" && (
          <section className="mvp-screen">
            <div className="mvp-status-head">
              <h1 className="mvp-title mvp-title-sm">{status}</h1>
              <p className="mvp-fault-line">
                <span aria-hidden="true">⚡</span> {SCENARIO.faultShort} ·{" "}
                {arrived ? "brigada en el sitio" : `a ${minsToSite} min del sitio`}
              </p>
              {lugar && (
                <p className="mvp-reported-place">
                  <span aria-hidden="true">📍</span> {lugar}
                </p>
              )}
            </div>
            <LiveMap
              progress={progress}
              etaMin={etaMin}
              statusLabel={status}
              arrived={arrived}
            />

            {/* Quién atiende: ponerle nombre a la cuadrilla es parte del valor
                (pasa de "alguien vendrá" a "Andrés viene en camino"). */}
            <div className="mvp-crew-card" data-track-id="tarjeta-cuadrilla">
              <span className="mvp-crew-avatar" aria-hidden="true">
                {SCENARIO.brigadeLeadInitials}
              </span>
              <div className="mvp-crew-info">
                <p className="mvp-crew-name">{SCENARIO.brigadeLead}</p>
                <p className="mvp-crew-role">
                  {SCENARIO.brigadeLeadRole} · {SCENARIO.brigadeName}
                </p>
              </div>
              <span className="mvp-crew-plate">{SCENARIO.brigadeVehicle}</span>
            </div>

            {/* Qué pasó: la causa se muestra aquí mismo, no escondida en otra
                pantalla — es la mitad de la respuesta que vino a buscar. */}
            <div className="cause-card mvp-cause">
              <p className="cause-label">
                <span aria-hidden="true">⚡</span> ¿Qué pasó?
              </p>
              <p className="cause-text">{SCENARIO.causeText}</p>
            </div>

            <button
              className="btn btn-ghost btn-block mvp-detail-btn"
              data-track-id="btn-detalle"
              data-interactive="true"
              onClick={() => goTo("detalle")}
            >
              Ver detalle de la reparación
            </button>
          </section>
        )}

        {screen === "detalle" && (
          <section className="mvp-screen">
            <button
              className="mvp-back"
              data-track-id="btn-volver-mapa"
              data-interactive="true"
              onClick={() => goTo("mapa")}
            >
              ‹ Mapa
            </button>

            <div className="mvp-eta-row">
              <div>
                <p className="eta-label">Restablecimiento estimado</p>
                <p className="eta-time">{etaLabel}</p>
              </div>
              <span className="mvp-eta-live">
                <span className="dot-live" aria-hidden="true"></span> en vivo
              </span>
            </div>

            <div className="cause-card">
              <p className="cause-label">
                <span aria-hidden="true">⚡</span> ¿Qué pasó?
              </p>
              <p className="cause-text">{SCENARIO.causeText}</p>
            </div>

            <div className="mvp-brigade" data-track-id="tarjeta-brigada">
              <span className="mvp-crew-avatar" aria-hidden="true">
                {SCENARIO.brigadeLeadInitials}
              </span>
              <div>
                <p className="mvp-brigade-name">{SCENARIO.brigadeLead}</p>
                <p className="mvp-brigade-meta">
                  {SCENARIO.brigadeLeadRole} · {SCENARIO.brigadeName} ·{" "}
                  {SCENARIO.brigadeCrewSize} técnicos
                </p>
                <p className="mvp-brigade-meta">{SCENARIO.brigadeLeadMeta}</p>
              </div>
            </div>

            <ol className="steps" aria-label="Estado de la reparación, paso a paso">
              <li className="step done">
                <span className="step-marker" aria-hidden="true">✓</span>
                <div className="step-body">
                  <p className="step-title">Reporte recibido y confirmado</p>
                  <p className="step-meta">
                    Radicado #{SCENARIO.reportId}
                    {firstName ? ` · reportado por ${firstName}` : ""}
                  </p>
                  {lugar && <p className="step-meta">{lugar}</p>}
                  {alcanceLabel && (
                    <p className="step-meta">Reportaste: {alcanceLabel.toLowerCase()}</p>
                  )}
                </div>
              </li>
              <li className="step done">
                <span className="step-marker" aria-hidden="true">✓</span>
                <div className="step-body">
                  <p className="step-title">Brigada asignada</p>
                  <p className="step-meta">
                    {SCENARIO.brigadeLead} · {SCENARIO.brigadeName}
                  </p>
                </div>
              </li>
              <li className={arrived ? "step done" : "step active"}>
                <span className="step-marker" aria-hidden="true">
                  {arrived ? "✓" : <span className="step-pulse"></span>}
                </span>
                <div className="step-body">
                  <p className="step-title">
                    En camino al punto de falla
                    {!arrived && (
                      <span className="typing-dots" aria-hidden="true">
                        <i></i><i></i><i></i>
                      </span>
                    )}
                  </p>
                  <p className="step-meta">
                    {arrived ? "Llegó al sitio" : `A ${minsToSite} min del sitio`}
                  </p>
                </div>
              </li>
              <li className={arrived ? "step active" : "step"}>
                <span className="step-marker" aria-hidden="true">
                  {arrived && <span className="step-pulse"></span>}
                </span>
                <div className="step-body">
                  <p className="step-title">
                    Diagnóstico y reparación
                    {arrived && (
                      <span className="typing-dots" aria-hidden="true">
                        <i></i><i></i><i></i>
                      </span>
                    )}
                  </p>
                </div>
              </li>
              <li className="step">
                <span className="step-marker" aria-hidden="true"></span>
                <div className="step-body">
                  <p className="step-title">
                    Energía restablecida <span aria-hidden="true">⚡</span>
                  </p>
                </div>
              </li>
            </ol>

            {/* Acciones post-valor (AARRR: retención y referencia). Ambas son
                simuladas: no se envía ningún aviso ni se comparte nada. */}
            <div className="mvp-actions">
              <button
                className={notify ? "mvp-action mvp-action-on" : "mvp-action"}
                aria-pressed={notify}
                data-track-id="btn-avisos"
                data-interactive="true"
                onClick={toggleNotify}
              >
                <span className="mvp-action-icon" aria-hidden="true">
                  {notify ? "✓" : "🔔"}
                </span>
                <span className="mvp-action-text">
                  {notify ? "Te avisaremos cuando vuelva" : "Avísame cuando vuelva la luz"}
                </span>
              </button>

              <button
                className={shared ? "mvp-action mvp-action-on" : "mvp-action"}
                data-track-id="btn-compartir"
                data-interactive="true"
                onClick={shareWithNeighbor}
              >
                <span className="mvp-action-icon" aria-hidden="true">
                  {shared ? "✓" : "📣"}
                </span>
                <span className="mvp-action-text">
                  {shared ? "Estado compartido con tus vecinos" : "Avisar a un vecino"}
                </span>
              </button>
            </div>

            <button
              className="btn btn-ghost btn-block mvp-finish"
              data-track-id="btn-finalizar"
              data-interactive="true"
              onClick={finish}
            >
              Finalizar seguimiento
            </button>
          </section>
        )}
      </div>
    </main>
  );
}
