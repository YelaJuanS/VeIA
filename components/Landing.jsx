"use client";

import { useEffect, useRef, useState } from "react";
import MapMockup from "./MapMockup";

// Respaldo por correo vía FormSubmit (el dato principal queda en Vercel KV).
const MAIL_ENDPOINT = "https://formsubmit.co/ajax/juansebastianyela@gmail.com";

function post(url, data) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {});
}

// Lee el canal desde ?canal=... o ?utm_source=... y lo recuerda en la sesión.
function resolveCanal() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("canal") || params.get("utm_source");
  if (fromUrl) {
    sessionStorage.setItem("veia_canal", fromUrl);
    return fromUrl;
  }
  return sessionStorage.getItem("veia_canal") || "directo";
}

const PLACE_TYPES = [
  { icon: "🧊", label: "Negocio con frío", value: "Negocio con cadena de frío" },
  { icon: "🍽️", label: "Comercio", value: "Restaurante / comercio" },
  { icon: "🏠", label: "Hogar", value: "Hogar" },
  { icon: "🫀", label: "Carga crítica", value: "Carga crítica (salud / producción)" },
];

const FAULT_TYPES = [
  { icon: "⚡", label: "Se fue la luz por completo", value: "Se fue la luz por completo" },
  { icon: "💡", label: "La luz va y viene / parpadea", value: "La luz va y viene / parpadea" },
  { icon: "📉", label: "Bajón de voltaje — los equipos andan a medias", value: "Bajón de voltaje" },
];

function IA() {
  return <span className="ia-inline">IA</span>;
}

export default function Landing() {
  const canalRef = useRef("directo");

  // Registro de la VISITA (una vez por sesión) con su canal.
  useEffect(() => {
    canalRef.current = resolveCanal();
    if (!sessionStorage.getItem("veia_visit_sent")) {
      sessionStorage.setItem("veia_visit_sent", "1");
      post("/api/visit", { canal: canalRef.current });
    }
  }, []);

  /* ── Estado del demo interactivo ── */
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [place, setPlace] = useState("");
  const [placeType, setPlaceType] = useState("");
  const [faultType, setFaultType] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error1, setError1] = useState(false);
  const [error3, setError3] = useState(false);
  const [ticket, setTicket] = useState("#4821");
  const [simPhase, setSimPhase] = useState(0); // 0..3 pasos encendidos, 4 = ETA visible
  const timersRef = useRef([]);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function openDemo(location) {
    // El CTA_CLICK queda registrado aunque no completen el formulario.
    post("/api/cta", { canal: canalRef.current, location });
    setPlace(""); setPlaceType(""); setFaultType("");
    setName(""); setContact("");
    setError1(false); setError3(false);
    setSimPhase(0);
    setStep(1);
    setOpen(true);
  }

  function closeDemo() {
    clearTimers();
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") closeDemo(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function next1() {
    if (!place.trim() || !placeType) { setError1(true); return; }
    setError1(false);
    setStep(2);
  }

  function pickFault(value) {
    setFaultType(value);
    timersRef.current.push(setTimeout(() => setStep(3), 250));
  }

  function submitLead() {
    const n = name.trim();
    const c = contact.trim();
    if (!n || !c) { setError3(true); return; }
    setError3(false);

    const lead = {
      canal: canalRef.current,
      nombre: n,
      contacto: c,
      sector: place.trim(),
      tipoLugar: placeType,
      tipoFalla: faultType,
    };
    // Guarda el contacto en Vercel KV…
    post("/api/lead", lead);
    // …y de respaldo lo envía por correo (sin bloquear la experiencia).
    fetch(MAIL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        ...lead,
        _subject: "Nuevo lead VeIA 🚀 — " + placeType,
        _template: "table",
        _captcha: "false",
      }),
    }).catch(() => {});

    setTicket("#" + (4000 + Math.floor(Math.random() * 900)));
    setStep(4);
    // La simulación se va "encendiendo" en secuencia, como en la app real.
    timersRef.current.push(setTimeout(() => setSimPhase(1), 400));
    timersRef.current.push(setTimeout(() => setSimPhase(2), 1500));
    timersRef.current.push(setTimeout(() => setSimPhase(3), 2500));
    timersRef.current.push(setTimeout(() => setSimPhase(4), 3200));
  }

  const ctaLabel = <>Quiero probar Ve<IA /></>;

  return (
    <>
      {/* ══ NAV ══ */}
      <header className="nav">
        <div className="container nav-inner">
          <a className="logo" href="#" aria-label="VeIA — inicio">Ve<span className="ia">IA</span></a>
          <button className="btn btn-ghost btn-nav" onClick={() => openDemo("nav")}>{ctaLabel}</button>
        </div>
      </header>

      {/* ══ VIDEO (lo primero que se ve) ══ */}
      <section className="demo demo-top">
        <div className="container demo-inner">
          <div className="video-wrap">
            <iframe
              src="https://www.youtube-nocookie.com/embed/JGwPxOTjNJg"
              title="VeIA — demo: seguimiento en tiempo real de fallas eléctricas"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* ══ 1. HERO ══ */}
      <section className="hero">
        <div className="hero-glow" aria-hidden="true"></div>
        <div className="container hero-inner">
          <p className="hero-eyebrow">
            <span className="dot-live" aria-hidden="true"></span> Seguimiento en vivo de fallas eléctricas
          </p>
          <h1>
            Se fue la luz.<br />
            <span className="accent">¿Y ahora quién te dice cuándo vuelve?</span>
          </h1>
          <p className="hero-sub">
            Con Ve<IA /> dejas de esperar a ciegas: ves en un mapa dónde está la falla,
            cómo avanza la reparación y la hora estimada en que vuelve tu energía.
            Como ver el carro que pediste acercándose — pero con tu electricidad.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => openDemo("hero")}>{ctaLabel}</button>
          <p className="hero-note">Sin instalaciones. Funciona desde tu celular.</p>
        </div>
      </section>

      {/* ══ 2. EL PROBLEMA ══ */}
      <section className="problem">
        <div className="container">
          <p className="section-eyebrow">El problema</p>
          <h2>Esperar sin información también cuesta. Y cuesta mucho.</h2>
          <div className="stories">
            <article className="story">
              <div className="story-icon" aria-hidden="true">🍦</div>
              <h3>La heladería que no sabía si aguantar</h3>
              <p>
                Son las 2 de la tarde y se va la luz. Doña Marta llama al operador: nadie da razón.
                Sus congeladores aguantan unas tres horas… pero, ¿la luz vuelve en una hora o en seis?
                Si lo supiera, decidiría a tiempo si alquila una planta o traslada el producto.
                No lo sabe. A las 7 p.m. bota semanas de inventario.
              </p>
            </article>
            <article className="story">
              <div className="story-icon" aria-hidden="true">🥩</div>
              <h3>La carnicería con el cuarto frío en cuenta regresiva</h3>
              <p>
                En la carnicería de don Jorge, el cuarto frío mantiene la cadena de frío de millones
                de pesos en carne. Con cada corte empieza la misma angustia: llamar, esperar, volver
                a llamar. La diferencia entre perderlo todo y salvarlo es una sola cosa que hoy nadie
                le da: <strong>saber cuánto falta</strong>.
              </p>
            </article>
            <article className="story">
              <div className="story-icon" aria-hidden="true">🫀</div>
              <h3>Cuando la carga no es negocio, es una vida</h3>
              <p>
                En casa de la familia Ruiz hay un concentrador de oxígeno. La batería de respaldo dura
                4 horas. Cuando se va la luz, la pregunta no es de plata: es si deben salir ya para una
                clínica o si pueden esperar. Hoy esa decisión se toma a ciegas. No debería.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ══ 3. CÓMO FUNCIONA ══ */}
      <section className="how">
        <div className="container">
          <p className="section-eyebrow">Cómo funciona</p>
          <h2>Ve la reparación acercándose, minuto a minuto</h2>
          <p className="how-sub">
            Cuando hay un corte, Ve<IA /> te explica <strong>qué pasó</strong> en palabras claras,
            te muestra la camioneta de la brigada acercándose en el mapa —como cuando esperas tu
            Uber— y te acompaña paso a paso hasta que vuelve la energía, como el "cocinando tu
            pedido" de Rappi.
          </p>

          <ol className="flow">
            <li className="flow-step">
              <span className="flow-num" aria-hidden="true">1</span>
              <h4>Se va la luz</h4>
              <p>Ve<IA /> registra el corte al instante y confirma tu reporte con un número de radicado.</p>
            </li>
            <li className="flow-step">
              <span className="flow-num" aria-hidden="true">2</span>
              <h4>Ves todo en el mapa</h4>
              <p>Qué pasó explicado en palabras sencillas, dónde está la falla y la camioneta de la brigada acercándose.</p>
            </li>
            <li className="flow-step">
              <span className="flow-num" aria-hidden="true">3</span>
              <h4>Decides con datos</h4>
              <p>El tiempo estimado se actualiza en vivo: tú decides si esperas, alquilas una planta o mueves tu producto.</p>
            </li>
          </ol>

          <MapMockup />

          <p className="mockup-caption">
            Así se vive un corte con Ve<IA />: sabes <strong>qué pasó</strong>,{" "}
            <strong>quién viene en camino</strong> y <strong>cuánto falta</strong>. Sin llamadas,
            sin incertidumbre.
          </p>

          <div className="how-secondary">
            <div className="how-item">
              <h4>Un estimado que mejora solo</h4>
              <p>
                El tiempo de restablecimiento se recalcula con cada avance de la cuadrilla. Entre
                más cerca del arreglo, más preciso — para que decidas con datos, no con esperanza.
              </p>
            </div>
            <div className="how-item">
              <h4>Tu reporte queda registrado, siempre</h4>
              <p>
                Cada corte que reportas queda confirmado con número de radicado y trazabilidad
                completa. Se acabó el "vuelva a llamar más tarde".
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 4. PARA OPERADORES DE RED ══ */}
      <section className="operators">
        <div className="container operators-inner">
          <p className="section-eyebrow">Para Operadores de Red</p>
          <h2>Ve<IA /> trabaja con tu operador, no contra él</h2>
          <p>
            Somos la capa de inteligencia que le falta a la red: convertimos la información operativa
            del OR en transparencia para el usuario. El resultado para el operador es directo —{" "}
            <strong>
              menos llamadas y PQRs durante los cortes, mejores indicadores de percepción y usuarios
              que entienden que la reparación está en marcha
            </strong>
            . Un usuario informado no colapsa las líneas: espera con datos.
          </p>
        </div>
      </section>

      {/* ══ 5. CTA FINAL ══ */}
      <section className="final-cta">
        <div className="container final-cta-inner">
          <h2>
            La próxima vez que se vaya la luz,<br />
            <span className="accent">que no se vaya la información.</span>
          </h2>
          <button className="btn btn-primary btn-lg" onClick={() => openDemo("final")}>{ctaLabel}</button>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <p>Ve<IA /> · Seguimiento en tiempo real de fallas eléctricas · © 2026</p>
        </div>
      </footer>

      {/* ══ MODAL: DEMO INTERACTIVO ══ */}
      {open && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeDemo(); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <button className="modal-close" onClick={closeDemo} aria-label="Cerrar">×</button>

            {step <= 3 && (
              <div className="demo-progress">
                <span className="progress-label">Paso {step} de 3</span>
                <div className="progress-track">
                  <span className="progress-fill" style={{ width: `${(step / 3) * 100}%` }}></span>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="wizard-step">
                <h3 id="modal-title">Registra tu falla</h3>
                <p className="modal-sub">Vive la app tal como funciona. Empecemos: ¿dónde estás?</p>
                <label htmlFor="demo-place">Barrio o sector</label>
                <input
                  type="text"
                  id="demo-place"
                  placeholder="Ej: Centro, Pasto"
                  autoComplete="address-level2"
                  value={place}
                  onChange={(e) => setPlace(e.target.value)}
                  autoFocus
                />
                <p className="field-label">¿Qué tipo de lugar es?</p>
                <div className="chip-group" role="group" aria-label="Tipo de lugar">
                  {PLACE_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={"chip" + (placeType === t.value ? " selected" : "")}
                      onClick={() => setPlaceType(t.value)}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                {error1 && <p className="form-error">Escribe tu sector y elige el tipo de lugar.</p>}
                <button className="btn btn-primary btn-block" onClick={next1}>Continuar</button>
              </div>
            )}

            {step === 2 && (
              <div className="wizard-step">
                <h3>¿Qué está pasando?</h3>
                <p className="modal-sub">Elige lo que mejor describe tu falla.</p>
                <div className="option-list" role="group" aria-label="Tipo de falla">
                  {FAULT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      className={"option" + (faultType === t.value ? " selected" : "")}
                      onClick={() => pickFault(t.value)}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="wizard-step">
                <h3>¿A dónde te avisamos cada avance?</h3>
                <p className="modal-sub">
                  Como en la app real: te notificamos la brigada asignada, en camino y la energía de vuelta.
                </p>
                <label htmlFor="lead-name">Tu nombre</label>
                <input
                  type="text"
                  id="lead-name"
                  placeholder="Ej: Marta González"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <label htmlFor="lead-contact">WhatsApp o correo</label>
                <input
                  type="text"
                  id="lead-contact"
                  placeholder="Ej: 300 123 4567 o marta@correo.com"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
                {error3 && <p className="form-error">Completa los dos campos para registrar tu falla.</p>}
                <button className="btn btn-primary btn-block" onClick={submitLead}>
                  Registrar mi falla ⚡
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="wizard-step">
                <p className="confirm-head">
                  <span className="dot-live" aria-hidden="true"></span> Reporte <strong>{ticket}</strong> confirmado
                </p>
                <ol className="steps steps-demo">
                  <li className={"step" + (simPhase >= 1 ? " done revealed" : "")}>
                    <span className="step-marker" aria-hidden="true">✓</span>
                    <div className="step-body">
                      <p className="step-title">Reporte recibido y confirmado</p>
                      <p className="step-meta">{place.trim()} · {faultType}</p>
                    </div>
                  </li>
                  <li className={"step" + (simPhase >= 2 ? " done revealed" : "")}>
                    <span className="step-marker" aria-hidden="true">✓</span>
                    <div className="step-body">
                      <p className="step-title">Brigada asignada</p>
                      <p className="step-meta">Brigada 7 · a 12 min de tu sector</p>
                    </div>
                  </li>
                  <li className={"step" + (simPhase >= 3 ? " active revealed" : "")}>
                    <span className="step-marker" aria-hidden="true">
                      <span className="step-pulse"></span>
                    </span>
                    <div className="step-body">
                      <p className="step-title">
                        En camino al punto de falla
                        <span className="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
                      </p>
                    </div>
                  </li>
                </ol>
                {simPhase >= 4 && (
                  <div className="eta-card eta-inline">
                    <p className="eta-label">Restablecimiento estimado</p>
                    <p className="eta-time">1h 40min</p>
                    <div className="eta-bar"><span className="eta-bar-fill"></span></div>
                  </div>
                )}
                <p className="demo-note">
                  Esto es una simulación de la app. <strong>¡Gracias, te contactaremos</strong> para
                  que vivas Ve<IA /> con tu energía real!
                </p>
                <button className="btn btn-ghost btn-block" onClick={closeDemo}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
