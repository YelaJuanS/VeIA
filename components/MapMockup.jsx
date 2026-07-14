// Mockup de la app: mapa con la camioneta de brigada + panel de seguimiento.
// Es una simulación visual (no un mapa funcional real).
export default function MapMockup({ compact = false }) {
  return (
    <div className="app-mockup">
      <div
        className="map-panel"
        role="img"
        aria-label="Mapa mostrando una camioneta de brigada con herramientas acercándose a la falla eléctrica, con restablecimiento estimado en 1 hora 40 minutos"
      >
        <div className="map-topbar">
          <span className="map-status">
            <span className="dot-live" aria-hidden="true"></span> Brigada en camino
          </span>
          <span className="map-report">Reporte #4823</span>
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
          <path
            id="crew-route"
            className="route"
            d="M 60 350 L 210 350 L 210 260 L 330 260 L 330 170 L 450 170 L 450 128"
          />
          <g className="fault" transform="translate(450,128)">
            <circle className="fault-pulse" r="14" />
            <circle className="fault-core" r="7" />
          </g>
          {/* Camioneta de brigada (vista superior, estilo Uber). Apunta a +x;
              rotate="auto" la orienta sola siguiendo la ruta. */}
          <g className="crew">
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
            <animateMotion
              dur="14s"
              repeatCount="indefinite"
              rotate="auto"
              keyPoints="0;1;1"
              keyTimes="0;0.85;1"
              calcMode="linear"
            >
              <mpath href="#crew-route" />
            </animateMotion>
          </g>
        </svg>
        <div className="eta-card">
          <p className="eta-label">Restablecimiento estimado</p>
          <p className="eta-time">1h 40min</p>
          <div className="eta-bar">
            <span className="eta-bar-fill"></span>
          </div>
          <p className="eta-update">Actualizado hace 2 min</p>
        </div>
      </div>

      {!compact && (
        <aside className="status-panel">
          <div className="cause-card">
            <p className="cause-label">
              <span aria-hidden="true">⚡</span> ¿Qué pasó?
            </p>
            <p className="cause-text">
              Una rama cayó sobre el cable que alimenta tu sector y dañó la línea. La brigada va
              a retirarla y a reemplazar el tramo afectado.
            </p>
          </div>

          <ol className="steps" aria-label="Estado de la reparación, paso a paso">
            <li className="step done">
              <span className="step-marker" aria-hidden="true">✓</span>
              <div className="step-body">
                <p className="step-title">Reporte recibido y confirmado</p>
                <p className="step-meta">3:42 p.m. · Radicado #4823</p>
              </div>
            </li>
            <li className="step done">
              <span className="step-marker" aria-hidden="true">✓</span>
              <div className="step-body">
                <p className="step-title">Brigada asignada</p>
                <p className="step-meta">Brigada 7 · 3:51 p.m.</p>
              </div>
            </li>
            <li className="step active">
              <span className="step-marker" aria-hidden="true">
                <span className="step-pulse"></span>
              </span>
              <div className="step-body">
                <p className="step-title">
                  En camino al punto de falla
                  <span className="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                </p>
                <p className="step-meta">A 12 min del sitio</p>
              </div>
            </li>
            <li className="step">
              <span className="step-marker" aria-hidden="true"></span>
              <div className="step-body">
                <p className="step-title">Reparando la falla</p>
              </div>
            </li>
            <li className="step">
              <span className="step-marker" aria-hidden="true"></span>
              <div className="step-body">
                <p className="step-title">Energía restablecida <span aria-hidden="true">⚡</span></p>
              </div>
            </li>
          </ol>
        </aside>
      )}
    </div>
  );
}
