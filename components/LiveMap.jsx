"use client";

import { useEffect, useRef } from "react";
import { SCENARIO } from "../lib/mvp-config";

// Mapa "en vivo" del MVP: mismo vocabulario visual que MapMockup, pero la
// camioneta NO usa animateMotion — su posición sobre la ruta se calcula desde
// el estado React (progress 0→1, derivado del ETA simulado en /mvp). Es una
// simulación: no hay GPS ni datos reales detrás.
export default function LiveMap({ progress = 0, etaMin, statusLabel }) {
  const pathRef = useRef(null);
  const crewRef = useRef(null);

  useEffect(() => {
    const path = pathRef.current;
    const crew = crewRef.current;
    if (!path || !crew) return;
    const total = path.getTotalLength();
    const p = Math.min(Math.max(progress, 0), 1);
    const pt = path.getPointAtLength(p * total);
    // Ángulo con un punto justo detrás (estable incluso al llegar al final).
    const back = path.getPointAtLength(Math.max(p * total - 1, 0));
    const dx = pt.x - back.x;
    const dy = pt.y - back.y;
    const angle = dx || dy ? (Math.atan2(dy, dx) * 180) / Math.PI : 0;
    crew.setAttribute("transform", `translate(${pt.x},${pt.y}) rotate(${angle})`);
  }, [progress]);

  const etaLabel =
    etaMin >= 60
      ? `${Math.floor(etaMin / 60)}h ${String(etaMin % 60).padStart(2, "0")}min`
      : `${etaMin} min`;
  const barPct = Math.round(
    Math.min(Math.max((SCENARIO.etaInitialMin - etaMin) / SCENARIO.etaInitialMin, 0.04), 1) * 100
  );

  return (
    <div
      className="map-panel livemap"
      role="img"
      aria-label={`Mapa mostrando la brigada acercándose a la falla. ${statusLabel}. Restablecimiento estimado en ${etaLabel}.`}
    >
      <div className="map-topbar">
        <span className="map-status">
          <span className="dot-live" aria-hidden="true"></span> {statusLabel}
        </span>
        <span className="map-report">Reporte #{SCENARIO.reportId}</span>
      </div>
      <svg
        className="map-svg"
        viewBox="0 0 640 400"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <g className="streets">
          <line x1="0" y1="80" x2="640" y2="80" />
          <line x1="0" y1="170" x2="640" y2="170" />
          <line x1="0" y1="260" x2="640" y2="260" />
          <line x1="0" y1="350" x2="640" y2="350" />
          <line x1="90" y1="0" x2="90" y2="400" />
          <line x1="210" y1="0" x2="210" y2="400" />
          <line x1="330" y1="0" x2="330" y2="400" />
          <line x1="450" y1="0" x2="450" y2="400" />
          <line x1="560" y1="0" x2="560" y2="400" />
        </g>
        <g className="blocks">
          <rect x="340" y="90" width="100" height="70" rx="6" />
          <rect x="460" y="90" width="90" height="70" rx="6" />
          <rect x="340" y="180" width="100" height="70" rx="6" />
          <rect x="460" y="180" width="90" height="70" rx="6" />
          <rect x="100" y="90" width="100" height="70" rx="6" className="block-on" />
          <rect x="220" y="180" width="100" height="70" rx="6" className="block-on" />
          <rect x="100" y="270" width="100" height="70" rx="6" className="block-on" />
        </g>
        <path ref={pathRef} className="route" d={SCENARIO.crewRoute} />
        <g
          className="fault"
          transform={`translate(${SCENARIO.fault.x},${SCENARIO.fault.y})`}
        >
          <circle className="fault-pulse" r="14" />
          <circle className="fault-core" r="7" />
        </g>
        {/* Camioneta de brigada (vista superior, estilo Uber). Apunta a +x;
            el rotate del transform la orienta según la ruta. */}
        <g ref={crewRef} className="crew crew-live">
          <circle className="crew-halo" r="26" />
          <g className="truck">
            <rect className="truck-shadow" x="-18.5" y="-9.5" width="38" height="19" rx="5.5" />
            <rect className="truck-body" x="-17.5" y="-8.5" width="36" height="17" rx="4.5" />
            <rect className="truck-bed" x="-15.5" y="-6.5" width="18" height="13" rx="2" />
            <rect className="toolbox" x="-15" y="-5.5" width="4" height="11" rx="1" />
            <line className="ladder-rail" x1="-9.5" y1="-3.6" x2="1.2" y2="-3.6" />
            <line className="ladder-rail" x1="-9.5" y1="3.6" x2="1.2" y2="3.6" />
            <line className="ladder-rung" x1="-7.5" y1="-3.6" x2="-7.5" y2="3.6" />
            <line className="ladder-rung" x1="-4.2" y1="-3.6" x2="-4.2" y2="3.6" />
            <line className="ladder-rung" x1="-0.9" y1="-3.6" x2="-0.9" y2="3.6" />
            <rect className="truck-cab" x="4.5" y="-7.5" width="13" height="15" rx="3.5" />
            <rect className="truck-glass" x="6.5" y="-5.3" width="4" height="10.6" rx="1.6" />
            <circle className="beacon" cx="13.5" cy="0" r="2.4" />
            <circle className="headlight" cx="18" cy="-4.6" r="1.5" />
            <circle className="headlight" cx="18" cy="4.6" r="1.5" />
          </g>
        </g>
      </svg>
      <div className="eta-card">
        <p className="eta-label">Restablecimiento estimado</p>
        <p className="eta-time">{etaLabel}</p>
        <div className="eta-bar">
          <span className="eta-bar-fill eta-bar-live" style={{ width: `${barPct}%` }}></span>
        </div>
        <p className="eta-update">
          <span className="dot-live" aria-hidden="true"></span> Actualizando en vivo
        </p>
      </div>
    </div>
  );
}
