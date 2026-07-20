"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LiveMap from "../../components/LiveMap";
import { SCENARIO } from "../../lib/mvp-config";
import tracker from "../../lib/tracker";

// MVP interactivo (S7): flujo entrada → reporte 1-tap → mapa en vivo →
// detalle. Todo lo que se muestra es una simulación guiada por
// lib/mvp-config.js (no hay datos reales). La página no da instrucciones:
// el participante debe llegar al momento de valor por sí solo.

function statusFor(etaMin) {
  const s = SCENARIO.statuses.find((x) => etaMin >= x.minEta);
  return s ? s.label : SCENARIO.statuses[SCENARIO.statuses.length - 1].label;
}

export default function MvpPage() {
  const router = useRouter();
  const rootRef = useRef(null);
  const [screen, setScreen] = useState("inicio");
  const [confirming, setConfirming] = useState(false);
  const [etaMin, setEtaMin] = useState(SCENARIO.etaInitialMin);
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

  useEffect(() => {
    if (!simOn) return;
    const t = setInterval(() => {
      setEtaMin((m) => (m > SCENARIO.arrivalHoldMin ? m - 1 : m));
    }, SCENARIO.etaTickMs);
    return () => clearInterval(t);
  }, [simOn]);

  function goTo(name, via = "ui") {
    setScreen(name);
    setConfirming(false);
    tracker.enterScreen(name, via);
    history.pushState({ screen: name }, "");
  }

  function confirmReport() {
    setConfirming(true);
    setTimeout(() => goTo("mapa"), 1200);
  }

  function finish() {
    tracker.complete();
    router.push("/feedback");
  }

  const arrived = etaMin <= SCENARIO.arrivalHoldMin;
  const minsToSite = etaMin - SCENARIO.arrivalHoldMin;
  const progress = Math.min(
    Math.max(
      (SCENARIO.etaInitialMin - etaMin) /
        (SCENARIO.etaInitialMin - SCENARIO.arrivalHoldMin),
      0
    ),
    1
  );
  const status = statusFor(etaMin);
  const etaLabel =
    etaMin >= 60
      ? `${Math.floor(etaMin / 60)}h ${String(etaMin % 60).padStart(2, "0")}min`
      : `${etaMin} min`;

  return (
    <main className="mvp-page" ref={rootRef}>
      <div className="mvp-shell">
        <header className="mvp-topbar">
          <span className="mvp-logo">
            Ve<span className="ia-inline">IA</span>
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
            <h1 className="mvp-title">Tu energía, en tiempo real</h1>

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
                <h1 className="mvp-title">Reconocimos tu ubicación</h1>
                <div className="mvp-report-card" data-track-id="tarjeta-reporte">
                  <p className="mvp-report-row">
                    <span className="mvp-report-icon" aria-hidden="true">📍</span>
                    {SCENARIO.sector}
                  </p>
                  <p className="mvp-report-row">
                    <span className="mvp-report-icon" aria-hidden="true">⚡</span>
                    Falla detectada en la red de tu zona
                  </p>
                  <p className="mvp-report-neighbors">
                    {SCENARIO.neighborsReporting} vecinos ya reportaron este corte
                  </p>
                </div>
                <button
                  className="btn btn-primary btn-block"
                  data-track-id="btn-confirmar"
                  data-interactive="true"
                  onClick={confirmReport}
                >
                  Confirmar: no tengo luz
                </button>
                <p className="mvp-fineprint" data-track-id="texto-direccion">
                  Cra 54 #68-120 · {SCENARIO.sector}
                </p>
              </>
            ) : (
              <div className="mvp-confirming" aria-live="polite">
                <div className="mvp-confirm-check" aria-hidden="true">✓</div>
                <h1 className="mvp-title">
                  Reporte #{SCENARIO.reportId} confirmado
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
            </div>
            <LiveMap progress={progress} etaMin={etaMin} statusLabel={status} />
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
              <span className="mvp-brigade-icon" aria-hidden="true">🛠️</span>
              <div>
                <p className="mvp-brigade-name">
                  {SCENARIO.brigadeName} · {SCENARIO.brigadeVehicle}
                </p>
                <p className="mvp-brigade-meta">{SCENARIO.brigadeLead}</p>
              </div>
            </div>

            <ol className="steps" aria-label="Estado de la reparación, paso a paso">
              <li className="step done">
                <span className="step-marker" aria-hidden="true">✓</span>
                <div className="step-body">
                  <p className="step-title">Reporte recibido y confirmado</p>
                  <p className="step-meta">Radicado #{SCENARIO.reportId}</p>
                </div>
              </li>
              <li className="step done">
                <span className="step-marker" aria-hidden="true">✓</span>
                <div className="step-body">
                  <p className="step-title">Brigada asignada</p>
                  <p className="step-meta">{SCENARIO.brigadeName}</p>
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
